-- Migration: run_all_migrations.sql
-- 既存のスキーマから新しいマイグレーション構成への移行用スクリプト

-- このスクリプトは既存のテーブルがある状態で実行できます
-- 必要な差分だけを適用します

-- 1. usersテーブルからemailカラムを削除（存在する場合）
DO $$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'users' 
               AND column_name = 'email') THEN
      ALTER TABLE users DROP COLUMN email;
      RAISE NOTICE 'emailカラムを削除しました';
    ELSE
      RAISE NOTICE 'emailカラムは既に存在しません';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'emailカラムの削除をスキップしました: %', SQLERRM;
  END;
END $$;

-- 2. マテリアライズドビューのインデックスが不足している場合は追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_statistics_event_date_time 
ON event_vote_statistics(event_id, event_date_id, event_time_id);

-- 2. 不足している関数とトリガーを追加（冪等性を保つためCREATE OR REPLACEを使用）

-- マテリアライズドビューの自動更新関数
CREATE OR REPLACE FUNCTION refresh_vote_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- CONCURRENTLYオプションを削除（Supabase対応）
  REFRESH MATERIALIZED VIEW event_vote_statistics;
  -- INSERT/UPDATE の場合はNEWを、DELETEの場合はOLDを返す
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 新規認証ユーザーの自動連携関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'ユーザー')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 認証ユーザー削除時の連携関数
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- 認証ユーザーが削除された場合、auth_user_idをNULLに設定（レコードは保持）
  UPDATE public.users 
  SET auth_user_id = NULL
  WHERE auth_user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーを追加（存在しない場合のみ）
DO $$
BEGIN
  -- 投票データ変更時のトリガー
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_refresh_vote_statistics') THEN
    CREATE TRIGGER trigger_refresh_vote_statistics
      AFTER INSERT OR UPDATE OR DELETE ON votes
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_vote_statistics();
  END IF;

  -- 認証ユーザー作成時のトリガー（自動でusersテーブルにレコード作成）
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;

  -- 認証ユーザー削除時のトリガー
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_deleted') THEN
    CREATE TRIGGER on_auth_user_deleted
      AFTER DELETE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_user_delete();
  END IF;
END $$;

-- 4. RLSポリシーの確認と更新
-- 既存のポリシーがある場合は削除して再作成

-- イベント候補日のポリシー更新
DROP POLICY IF EXISTS "Anyone can manage event dates" ON event_dates;
DROP POLICY IF EXISTS "Event creators can manage event dates" ON event_dates;

-- 現在のスキーマに合わせたポリシーを作成
CREATE POLICY "Anyone can manage event dates" ON event_dates
  FOR ALL USING (
    -- イベント作成者（認証ユーザー）の場合
    (auth.uid() = (
      SELECT u.auth_user_id 
      FROM events e 
      JOIN users u ON e.creator_id = u.id 
      WHERE e.id = event_id
    ))
    OR
    -- ゲストイベント（creator_idがnull）の場合は誰でも編集可能
    (EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_id AND e.creator_id IS NULL
    ))
    OR
    -- 認証されていないユーザー（ゲスト）も作成可能
    (auth.role() = 'anon')
  );

-- イベント候補時刻のポリシー更新  
DROP POLICY IF EXISTS "Anyone can manage event times" ON event_times;
DROP POLICY IF EXISTS "Event creators can manage event times" ON event_times;

CREATE POLICY "Anyone can manage event times" ON event_times
  FOR ALL USING (
    -- イベント作成者（認証ユーザー）の場合
    (auth.uid() = (
      SELECT u.auth_user_id 
      FROM events e 
      JOIN users u ON e.creator_id = u.id 
      WHERE e.id = event_id
    ))
    OR
    -- ゲストイベント（creator_idがnull）の場合は誰でも編集可能
    (EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_id AND e.creator_id IS NULL
    ))
    OR
    -- 認証されていないユーザー（ゲスト）も作成可能
    (auth.role() = 'anon')
  );

-- 5. マイグレーション完了の確認
SELECT 'Migration completed successfully' as status;

-- Migration: 004_create_functions_triggers.sql
-- 関数とトリガーの作成

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

-- 投票データ変更時のトリガー
CREATE TRIGGER trigger_refresh_vote_statistics
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_vote_statistics();

-- 認証ユーザー作成時のトリガー（自動でusersテーブルにレコード作成）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 認証ユーザー削除時のトリガー
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_delete();

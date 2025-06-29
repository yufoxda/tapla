-- Migration: 006_update_rls_policies_to_match_current.sql
-- 現在のスキーマファイルに合わせてRLSポリシーを更新

-- 既存のポリシーを削除して再作成
-- イベント候補日のポリシー更新
DROP POLICY IF EXISTS "Anyone can manage event dates" ON event_dates;

CREATE POLICY "Event creators can manage event dates" ON event_dates
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_user_id 
      FROM events e 
      JOIN users u ON e.creator_id = u.id 
      WHERE e.id = event_id
    )
  );

-- イベント候補時刻のポリシー更新  
DROP POLICY IF EXISTS "Anyone can manage event times" ON event_times;

CREATE POLICY "Event creators can manage event times" ON event_times
  FOR ALL USING (
    auth.uid() = (
      SELECT u.auth_user_id 
      FROM events e 
      JOIN users u ON e.creator_id = u.id 
      WHERE e.id = event_id
    )
  );

-- Migration: 005_create_rls_policies.sql
-- Row Level Security (RLS) ポリシーの設定

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability_patterns ENABLE ROW LEVEL SECURITY;

-- ユーザーテーブルのポリシー
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true); -- 投票者名表示のため全ユーザー閲覧可能

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "System can insert users" ON users
  FOR INSERT WITH CHECK (true); -- トリガーでの自動作成のため

-- イベントテーブルのポリシー
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true); -- 日程調整は基本的に公開

CREATE POLICY "Anyone can create events" ON events
  FOR INSERT WITH CHECK (true); -- すべてのユーザーがイベント作成可能

CREATE POLICY "Event creators can update their events" ON events
  FOR UPDATE USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = creator_id)
  );

CREATE POLICY "Event creators can delete their events" ON events
  FOR DELETE USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = creator_id)
  );

-- イベント候補日のポリシー
CREATE POLICY "Anyone can view event dates" ON event_dates
  FOR SELECT USING (true);

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

-- イベント候補時刻のポリシー
CREATE POLICY "Anyone can view event times" ON event_times
  FOR SELECT USING (true);

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

-- 投票テーブルのポリシー
CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT USING (true); -- 投票結果は公開

CREATE POLICY "Users can vote on events" ON votes
  FOR INSERT WITH CHECK (
    -- 認証ユーザーは自分のIDで投票
    (auth.role() = 'authenticated' AND auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
    OR
    -- 非認証ユーザーも投票可能（ゲスト投票）
    (auth.role() = 'anon')
  );

CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- ユーザーの可用性パターンのポリシー
CREATE POLICY "Users can view own patterns" ON user_availability_patterns
  FOR SELECT USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

CREATE POLICY "Users can manage own patterns" ON user_availability_patterns
  FOR ALL USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

-- 管理者用のバイパスポリシー（必要に応じて）
CREATE POLICY "Admins have full access to users" ON users
  FOR ALL USING (
    auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "Admins have full access to events" ON events
  FOR ALL USING (
    auth.jwt()->>'role' = 'admin'
  );

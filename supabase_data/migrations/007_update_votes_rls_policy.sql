-- 非認証ユーザーの投票を許可するためのRLSポリシー更新

-- 既存の投票ポリシーを削除
DROP POLICY IF EXISTS "Users can vote on events" ON votes;

-- 新しいポリシーを作成（非認証ユーザーの投票を許可）
CREATE POLICY "Users can vote on events" ON votes
  FOR INSERT WITH CHECK (
    -- 認証ユーザーは自分のIDで投票
    (auth.role() = 'authenticated' AND auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
    OR
    -- 非認証ユーザーも投票可能（user.auth_user_id が NULL の場合）
    (auth.role() = 'anon' AND user_id IN (SELECT id FROM users WHERE auth_user_id IS NULL))
  );

-- 非認証ユーザーが users テーブルにレコードを挿入できるようにする
DROP POLICY IF EXISTS "System can insert users" ON users;

CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (
    -- 認証ユーザーは自分のauth_user_idを設定
    (auth.role() = 'authenticated' AND auth_user_id = auth.uid())
    OR
    -- 非認証ユーザーはauth_user_id = NULLで挿入可能
    (auth.role() = 'anon' AND auth_user_id IS NULL)
  );

-- 開発環境用: より緩いRLSポリシー（本番環境では使用注意）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can vote on events" ON votes;
DROP POLICY IF EXISTS "System can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;

-- 開発用: より緩い投票ポリシー
CREATE POLICY "Development: Allow all vote insertions" ON votes
  FOR INSERT WITH CHECK (true);

-- 開発用: より緩いユーザー挿入ポリシー  
CREATE POLICY "Development: Allow all user insertions" ON users
  FOR INSERT WITH CHECK (true);

-- 注意: 本番環境では適切なRLSポリシーに戻すこと

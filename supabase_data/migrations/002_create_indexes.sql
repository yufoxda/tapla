-- Migration: 002_create_indexes.sql
-- パフォーマンス最適化インデックス

CREATE INDEX idx_users_auth_user_id ON users(auth_user_id); -- 認証ユーザーID用インデックス
CREATE INDEX idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX idx_event_dates_order ON event_dates(event_id, column_order);
CREATE INDEX idx_event_times_event_id ON event_times(event_id);
CREATE INDEX idx_event_times_order ON event_times(event_id, row_order);
CREATE INDEX idx_votes_event_id ON votes(event_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_date_time ON votes(event_date_id, event_time_id);
CREATE INDEX idx_votes_event_user ON votes(event_id, user_id); -- 集計クエリ用
CREATE INDEX idx_user_patterns_user ON user_availability_patterns(user_id);

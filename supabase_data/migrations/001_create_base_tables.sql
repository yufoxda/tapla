-- Migration: 001_create_base_tables.sql
-- 基本テーブルの作成

-- ユーザーアカウント（Supabase認証と連携）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id), -- Supabase認証テーブルとの連携
  name VARCHAR NOT NULL, -- 表示名（非認証：投票時入力、認証：変更可能）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- イベント
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  creator_id UUID REFERENCES users(id)
);

-- イベントの候補日（列ヘッダー）
CREATE TABLE event_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date_label VARCHAR NOT NULL, -- "12/25", "クリスマス", "第1回目" など自由入力
  column_order INTEGER NOT NULL DEFAULT 0, -- 列の並び順
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, column_order)
);

-- イベントの候補時刻（行ヘッダー）
CREATE TABLE event_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  time_label VARCHAR NOT NULL, -- "18:00~渋谷1", "20:15~渋谷2", "22:45~明大前3" など自由入力
  row_order INTEGER NOT NULL DEFAULT 0, -- 行の並び順
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, row_order)
);

-- 投票（ユーザーの可用性）
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_date_id UUID NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
  event_time_id UUID NOT NULL REFERENCES event_times(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_date_id, event_time_id) -- 同じスロットに重複投票を防ぐ
);

-- ユーザーの過去の投票パターン（自動入力のため）
CREATE TABLE user_availability_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  UNIQUE(user_id, start_time, end_time)
);

-- Migration: 003_create_views.sql
-- ビューとマテリアライズドビューの作成

-- 候補日時スロット（日付×時刻の組み合わせ）- ビューとして実装
CREATE VIEW time_slots AS
SELECT 
  ed.event_id,
  ed.id as event_date_id,
  et.id as event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  CONCAT(ed.id, '-', et.id) as slot_key -- 一意識別子
FROM event_dates ed
CROSS JOIN event_times et
WHERE ed.event_id = et.event_id;

-- 集計用マテリアライズドビュー（高速な投票結果表示）
CREATE MATERIALIZED VIEW event_vote_statistics AS
SELECT 
  v.event_id,
  v.event_date_id,
  v.event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN v.is_available = true THEN 1 END) as available_votes,
  COUNT(CASE WHEN v.is_available = false THEN 1 END) as unavailable_votes,
  ROUND(
    COUNT(CASE WHEN v.is_available = true THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as availability_percentage
FROM votes v
JOIN event_dates ed ON v.event_date_id = ed.id
JOIN event_times et ON v.event_time_id = et.id
GROUP BY v.event_id, v.event_date_id, v.event_time_id, ed.date_label, ed.column_order, et.time_label, et.row_order;

-- 表形式表示用のビュー（UIでの表描画用）
CREATE VIEW event_table_grid AS
SELECT 
  ed.event_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  ed.id as event_date_id,
  et.id as event_time_id,
  ts.slot_key, -- 一意識別子
  -- 投票統計も含める（リアルタイム表示用）
  COALESCE(evs.total_votes, 0) as total_votes,
  COALESCE(evs.available_votes, 0) as available_votes,
  COALESCE(evs.unavailable_votes, 0) as unavailable_votes,
  COALESCE(evs.availability_percentage, 0) as availability_percentage
FROM event_dates ed
CROSS JOIN event_times et
LEFT JOIN time_slots ts ON 
  ts.event_id = ed.event_id 
  AND ts.event_date_id = ed.id 
  AND ts.event_time_id = et.id
LEFT JOIN event_vote_statistics evs ON 
  evs.event_date_id = ed.id AND evs.event_time_id = et.id
WHERE ed.event_id = et.event_id
ORDER BY ed.column_order, et.row_order;

-- 候補日時スロット（日付×時刻の組み合わせ）- ビューとして実装
CREATE VIEW time_slots AS
SELECT 
  ed.event_id,
  ed.id as event_date_id,
  et.id as event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  CONCAT(ed.id, '-', et.id) as slot_key -- 一意識別子
FROM event_dates ed
CROSS JOIN event_times et
WHERE ed.event_id = et.event_id;

-- 集計用マテリアライズドビュー（高速な投票結果表示）
-- Note: Supabaseでマテリアライズドビューが制限されている場合は通常のビューに変更
CREATE VIEW event_vote_statistics AS
SELECT 
  v.event_id,
  v.event_date_id,
  v.event_time_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN v.is_available = true THEN 1 END) as available_votes,
  COUNT(CASE WHEN v.is_available = false THEN 1 END) as unavailable_votes,
  ROUND(
    COUNT(CASE WHEN v.is_available = true THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as availability_percentage
FROM votes v
JOIN event_dates ed ON v.event_date_id = ed.id
JOIN event_times et ON v.event_time_id = et.id
GROUP BY v.event_id, v.event_date_id, v.event_time_id, ed.date_label, ed.column_order, et.time_label, et.row_order;

-- 表形式表示用のビュー（UIでの表描画用）
CREATE VIEW event_table_grid AS
SELECT 
  ed.event_id,
  ed.date_label,
  ed.column_order,
  et.time_label,
  et.row_order,
  ed.id as event_date_id,
  et.id as event_time_id,
  ts.slot_key, -- 一意識別子
  -- 投票統計も含める（リアルタイム表示用）
  COALESCE(evs.total_votes, 0) as total_votes,
  COALESCE(evs.available_votes, 0) as available_votes,
  COALESCE(evs.unavailable_votes, 0) as unavailable_votes,
  COALESCE(evs.availability_percentage, 0) as availability_percentage
FROM event_dates ed
CROSS JOIN event_times et
LEFT JOIN time_slots ts ON 
  ts.event_id = ed.event_id 
  AND ts.event_date_id = ed.id 
  AND ts.event_time_id = et.id
LEFT JOIN event_vote_statistics evs ON 
  evs.event_date_id = ed.id AND evs.event_time_id = et.id
WHERE ed.event_id = et.event_id
ORDER BY ed.column_order, et.row_order;

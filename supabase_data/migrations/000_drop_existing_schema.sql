-- Migration: 000_drop_existing_schema.sql
-- 既存のスキーマを削除して新しいマイグレーション構成に移行

-- 警告: このスクリプトは既存のデータをすべて削除します
-- 本番環境では実行前にバックアップを取得してください

-- トリガーを削除
DROP TRIGGER IF EXISTS trigger_refresh_vote_statistics ON votes;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 関数を削除
DROP FUNCTION IF EXISTS refresh_vote_statistics();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_user_delete();

-- ビューとマテリアライズドビューを削除
DROP MATERIALIZED VIEW IF EXISTS event_vote_statistics;
DROP VIEW IF EXISTS event_table_grid;
DROP VIEW IF EXISTS time_slots;

-- テーブルを削除（依存関係の順序で）
DROP TABLE IF EXISTS user_availability_patterns;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS event_times;
DROP TABLE IF EXISTS event_dates;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

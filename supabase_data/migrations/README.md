# Supabase マイグレーションファイル

このディレクトリには、日程調整アプリのデータベーススキーマを構築するためのマイグレーションファイルが含まれています。

## 🚀 クイックスタート（既存スキーマから移行）

既存のスキーマファイル（`supabase_sckema.sql`）でテーブルを作成済みの場合：

```sql
-- Supabase ダッシュボードの SQL Editor で実行
\i 'run_all_migrations.sql'
```

または、ファイル内容をコピーして SQL Editor で直接実行してください。

## 📋 新規セットアップの実行順序

新規にデータベースを構築する場合は、以下の順序でマイグレーションを実行してください：

1. **001_create_base_tables.sql** - 基本テーブルの作成
   - users（ユーザー）
   - events（イベント）
   - event_dates（候補日）
   - event_times（候補時刻）
   - votes（投票）
   - user_availability_patterns（ユーザー可用性パターン）

2. **002_create_indexes.sql** - パフォーマンス最適化インデックスの作成
   - 各テーブルに対するクエリ最適化インデックス

3. **003_create_views.sql** - ビューとマテリアライズドビューの作成
   - time_slots（時間スロットビュー）
   - event_vote_statistics（投票統計マテリアライズドビュー）
   - event_table_grid（表形式表示ビュー）

4. **004_create_functions_triggers.sql** - 関数とトリガーの作成
   - refresh_vote_statistics（統計更新関数）
   - handle_new_user（新規ユーザー処理関数）
   - handle_user_delete（ユーザー削除処理関数）
   - 各種トリガー

5. **005_create_rls_policies.sql** - Row Level Security (RLS) ポリシーの設定
   - 認証ユーザー・ゲストユーザー両方に対応したセキュリティポリシー

6. **006_update_rls_policies_to_match_current.sql** - RLSポリシーの更新
   - 現在のスキーマに合わせたポリシーの調整

## 📁 追加ファイル

- **000_drop_existing_schema.sql** - 既存スキーマの完全削除（⚠️ 注意：全データ削除）
- **run_all_migrations.sql** - 既存スキーマからの移行用統合スクリプト

## 使用方法

### Supabase CLI を使用する場合
```bash
# プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーションを適用
supabase db push
```

### SQL直接実行の場合
Supabase ダッシュボードの SQL Editor で、上記の順序でファイル内容を実行してください。

## 注意事項

- 001から順番に実行する必要があります（依存関係があるため）
- 004のトリガー作成では、003のマテリアライズドビューが必要です
- RLSポリシー（005）は最後に適用してください

## 特徴

- **認証ユーザー・ゲスト両対応**: Supabase認証ユーザーとゲストユーザーの両方が利用可能
- **Row Level Security**: セキュアなアクセス制御
- **パフォーマンス最適化**: インデックスとマテリアライズドビューによる高速化
- **自動ユーザー連携**: 認証ユーザーの自動usersテーブル連携

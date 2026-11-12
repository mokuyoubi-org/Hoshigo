# db-schema用のメモ

### 作った覚えのないテーブルについて
# d1_migrations: 
wranglerが生成。実行済みのマイグレーションファイルを1行ずつ記録する表

# sqlite_sequence: 
SQLiteが生成。d1_migrationsのidを「14番まで使った」と記録している表（マイグレーションを流すと勝手にできる）


### メモ
# インデックスを貼る時
({ ... }) ではなく [ ... ]　で書こう。前者でも動くが、非推奨ということで、vscodeにstrikethrough(横線)が入れられてしまう。
import Database from 'better-sqlite3';
export class AppDatabase {
  readonly db: Database.Database;
  constructor(path=process.env.DATABASE_PATH ?? './data/amazon-bot.sqlite') { this.db=new Database(path); this.db.pragma('journal_mode = WAL'); this.migrate(); }
  private migrate(){ this.db.exec(`
    CREATE TABLE IF NOT EXISTS guild_configs (guild_id TEXT PRIMARY KEY, disclosure TEXT NOT NULL DEFAULT 'Affiliate link – we may earn a commission from qualifying purchases.', link_mode TEXT NOT NULL DEFAULT 'OFF', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS marketplace_configs (guild_id TEXT NOT NULL, marketplace TEXT NOT NULL, affiliate_tag TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, onelink_enabled INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(guild_id, marketplace));
    CREATE TABLE IF NOT EXISTS link_channels (guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(guild_id, channel_id));
    CREATE TABLE IF NOT EXISTS product_watches (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, marketplace TEXT NOT NULL, asin TEXT NOT NULL, canonical_url TEXT NOT NULL, watch_type TEXT NOT NULL, threshold_value REAL, last_known_price REAL, last_known_discount REAL, last_alerted_price REAL, last_alerted_discount REAL, last_checked_at TEXT, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deal_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, marketplace TEXT NOT NULL, asin TEXT NOT NULL, price REAL, discount REAL, posted_at TEXT NOT NULL);
  `)}
  close(){this.db.close()}
}

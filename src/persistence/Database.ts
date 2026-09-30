import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class AppDatabase {
  readonly db: Database.Database;
  constructor(path=process.env.DATABASE_PATH ?? './data/amazon-bot.sqlite') { if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true }); this.db=new Database(path); this.db.pragma('journal_mode = WAL'); this.migrate(); }
  private migrate(){ this.db.exec(`
    CREATE TABLE IF NOT EXISTS guild_configs (guild_id TEXT PRIMARY KEY, disclosure TEXT NOT NULL DEFAULT 'Affiliate link – we may earn a commission from qualifying purchases.', link_mode TEXT NOT NULL DEFAULT 'OFF', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS marketplace_configs (guild_id TEXT NOT NULL, marketplace TEXT NOT NULL, affiliate_tag TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, onelink_enabled INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(guild_id, marketplace));
    CREATE TABLE IF NOT EXISTS link_channels (guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(guild_id, channel_id));
    CREATE TABLE IF NOT EXISTS product_watches (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, marketplace TEXT NOT NULL, asin TEXT NOT NULL, canonical_url TEXT NOT NULL, watch_type TEXT NOT NULL, threshold_value REAL, last_known_price REAL, last_known_discount REAL, last_alerted_price REAL, last_alerted_discount REAL, last_checked_at TEXT, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deal_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, marketplace TEXT NOT NULL, asin TEXT NOT NULL, price REAL, discount REAL, posted_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS amazon_program_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      program_key TEXT NOT NULL,
      channel_id TEXT,
      body TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS amazon_program_templates_guild_enabled
      ON amazon_program_templates(guild_id, enabled, updated_at);
    CREATE TABLE IF NOT EXISTS link_deliveries (
      guild_id TEXT NOT NULL, event_id TEXT NOT NULL, channel_id TEXT NOT NULL,
      product_key TEXT NOT NULL, state TEXT NOT NULL, message_id TEXT, created_at INTEGER NOT NULL,
      PRIMARY KEY(guild_id, event_id)
    );
    CREATE INDEX IF NOT EXISTS link_deliveries_recent ON link_deliveries(guild_id, channel_id, product_key, created_at);
  `);
  this.db.transaction(() => {
    const columns = (this.db.prepare('PRAGMA table_info(guild_configs)').all() as {name: string}[]).map(c => c.name);
    // Existing installations remain Affiliate. New guild inserts explicitly choose Basic.
    if (!columns.includes('product_mode')) this.db.exec("ALTER TABLE guild_configs ADD COLUMN product_mode TEXT NOT NULL DEFAULT 'AFFILIATE'");
    if (!columns.includes('revision')) this.db.exec('ALTER TABLE guild_configs ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
  })();
  }
  close(){this.db.close()}
}

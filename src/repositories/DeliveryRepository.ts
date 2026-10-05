import { AppDatabase } from '../persistence/Database.js';
/** At-most-one attempt per source event. Unknown outcomes are NOT automatically resent. */
export class DeliveryRepository {
  constructor(private database: AppDatabase, private now = () => Date.now()) {}
  reserve(guildId: string, eventId: string, channelId: string, productKey: string, cooldownMs = 0): boolean {
    return this.database.db.transaction(() => {
      const db = this.database.db;
      if (db.prepare('SELECT 1 FROM link_deliveries WHERE guild_id=? AND event_id=?').get(guildId, eventId)) return false;
      if (cooldownMs > 0 && db.prepare('SELECT 1 FROM link_deliveries WHERE guild_id=? AND channel_id=? AND product_key=? AND created_at>? LIMIT 1').get(guildId, channelId, productKey, this.now() - cooldownMs)) return false;
      db.prepare("INSERT INTO link_deliveries(guild_id,event_id,channel_id,product_key,state,created_at) VALUES(?,?,?,?,'RESERVED',?)").run(guildId, eventId, channelId, productKey, this.now());
      return true;
    })();
  }
  sent(guildId: string, eventId: string, messageId: string) { this.database.db.prepare("UPDATE link_deliveries SET state='SENT',message_id=? WHERE guild_id=? AND event_id=?").run(messageId, guildId, eventId); }
  unknown(guildId: string, eventId: string) { this.database.db.prepare("UPDATE link_deliveries SET state='UNKNOWN' WHERE guild_id=? AND event_id=?").run(guildId, eventId); }
  unresolved(guildId: string) { return (this.database.db.prepare("SELECT count(*) AS n FROM link_deliveries WHERE guild_id=? AND state!='SENT'").get(guildId) as {n: number}).n; }
}

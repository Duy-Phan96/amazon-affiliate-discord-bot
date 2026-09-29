import type { MarketplaceCode } from '../domain/amazon.js';
import type { LinkMode } from '../domain/config.js';
import type { AffiliateTagRepository } from '../services/AmazonAffiliateService.js';
import { AppDatabase } from '../persistence/Database.js';
export class ConfigRepository implements AffiliateTagRepository {
 constructor(private database:AppDatabase){}
 ensureGuild(guildId:string){const now=new Date().toISOString();this.database.db.prepare(`INSERT INTO guild_configs(guild_id,created_at,updated_at) VALUES(?,?,?) ON CONFLICT(guild_id) DO NOTHING`).run(guildId,now,now)}
 setMarketplace(guildId:string, marketplace:MarketplaceCode, affiliateTag:string, oneLinkEnabled=false){this.ensureGuild(guildId);this.database.db.prepare(`INSERT INTO marketplace_configs(guild_id,marketplace,affiliate_tag,enabled,onelink_enabled) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,marketplace) DO UPDATE SET affiliate_tag=excluded.affiliate_tag,enabled=excluded.enabled,onelink_enabled=excluded.onelink_enabled`).run(guildId,marketplace,affiliateTag.trim(),1,oneLinkEnabled?1:0)}
 getTag(guildId:string,m:MarketplaceCode){const r=this.database.db.prepare(`SELECT affiliate_tag FROM marketplace_configs WHERE guild_id=? AND marketplace=? AND enabled=1`).get(guildId,m) as {affiliate_tag:string}|undefined;return r?.affiliate_tag??null}
 setLinkMode(guildId:string, mode:LinkMode){this.ensureGuild(guildId);this.database.db.prepare(`UPDATE guild_configs SET link_mode=?,updated_at=? WHERE guild_id=?`).run(mode,new Date().toISOString(),guildId)}
 setDisclosure(guildId:string, disclosure:string){this.ensureGuild(guildId);this.database.db.prepare(`UPDATE guild_configs SET disclosure=?,updated_at=? WHERE guild_id=?`).run(disclosure,new Date().toISOString(),guildId)}
 setLinkChannel(guildId:string,channelId:string,enabled=true){this.ensureGuild(guildId);this.database.db.prepare(`INSERT INTO link_channels(guild_id,channel_id,enabled) VALUES(?,?,?) ON CONFLICT(guild_id,channel_id) DO UPDATE SET enabled=excluded.enabled`).run(guildId,channelId,enabled?1:0)}
 isLinkChannel(guildId:string,channelId:string){return !!this.database.db.prepare(`SELECT 1 FROM link_channels WHERE guild_id=? AND channel_id=? AND enabled=1`).get(guildId,channelId)}
 getGuild(guildId:string){this.ensureGuild(guildId);return this.database.db.prepare(`SELECT * FROM guild_configs WHERE guild_id=?`).get(guildId) as any}
 listMarketplaces(guildId:string){return this.database.db.prepare(`SELECT marketplace,affiliate_tag,enabled,onelink_enabled FROM marketplace_configs WHERE guild_id=? ORDER BY marketplace`).all(guildId) as any[]}
 listLinkChannels(guildId:string){return this.database.db.prepare(`SELECT channel_id FROM link_channels WHERE guild_id=? AND enabled=1`).all(guildId) as {channel_id:string}[]}
}

import type { MarketplaceCode } from '../domain/amazon.js';
import type { GuildRow, LinkMode, MarketplaceRow, SetupConfig } from '../domain/config.js';
import type { AffiliateTagRepository } from '../services/AmazonAffiliateService.js';
import type { ProductLinkConfig } from '../services/ProductLinkService.js';
import { UserInputError, validateSetup } from '../services/SetupValidation.js';
import { AppDatabase } from '../persistence/Database.js';
export class ConfigRepository implements AffiliateTagRepository, ProductLinkConfig {
  constructor(private database: AppDatabase) {}
  ensureGuild(guildId: string) {
    const now = new Date().toISOString();
    this.database.db.prepare("INSERT INTO guild_configs(guild_id,product_mode,created_at,updated_at) VALUES(?,'BASIC',?,?) ON CONFLICT(guild_id) DO NOTHING").run(guildId, now, now);
  }
  private changed(guildId: string) { this.database.db.prepare('UPDATE guild_configs SET revision=revision+1,updated_at=? WHERE guild_id=?').run(new Date().toISOString(), guildId); }
  setMarketplace(guildId: string, marketplace: MarketplaceCode, affiliateTag: string, oneLinkEnabled = false) {
    this.ensureGuild(guildId);
    this.database.db.prepare('INSERT INTO marketplace_configs(guild_id,marketplace,affiliate_tag,enabled,onelink_enabled) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,marketplace) DO UPDATE SET affiliate_tag=excluded.affiliate_tag,enabled=excluded.enabled,onelink_enabled=excluded.onelink_enabled').run(guildId, marketplace, affiliateTag.trim(), 1, oneLinkEnabled ? 1 : 0);
    this.changed(guildId);
  }
  getTag(guildId: string, marketplace: MarketplaceCode) {
    const row = this.database.db.prepare('SELECT affiliate_tag FROM marketplace_configs WHERE guild_id=? AND marketplace=? AND enabled=1').get(guildId, marketplace) as { affiliate_tag: string } | undefined;
    return row?.affiliate_tag || null;
  }
  getProductMode(guildId: string) { return this.getGuild(guildId).product_mode; }
  getPrimaryMarketplace(guildId: string): MarketplaceCode | null {
    const value = this.getGuild(guildId).primary_marketplace;
    return value === 'SOURCE' ? null : value;
  }
  setPrimaryMarketplace(guildId: string, marketplace: MarketplaceCode | null) {
    this.ensureGuild(guildId);
    if (marketplace && !this.isMarketplaceEnabled(guildId, marketplace)) throw new UserInputError('Enable this marketplace and save its tracking ID before making it primary.');
    this.database.db.prepare('UPDATE guild_configs SET primary_marketplace=? WHERE guild_id=?').run(marketplace ?? 'SOURCE', guildId);
    this.changed(guildId);
  }
  isMarketplaceEnabled(guildId: string, marketplace: MarketplaceCode) { return this.listMarketplaces(guildId).some(m => m.marketplace === marketplace && m.enabled === 1); }
  setLinkMode(guildId: string, mode: LinkMode) { this.ensureGuild(guildId); this.database.db.prepare('UPDATE guild_configs SET link_mode=? WHERE guild_id=?').run(mode, guildId); this.changed(guildId); }
  setDisclosure(guildId: string, disclosure: string) { this.ensureGuild(guildId); this.database.db.prepare('UPDATE guild_configs SET disclosure=? WHERE guild_id=?').run(disclosure, guildId); this.changed(guildId); }
  setLinkChannel(guildId: string, channelId: string, enabled = true) {
    this.ensureGuild(guildId);
    this.database.db.prepare('INSERT INTO link_channels(guild_id,channel_id,enabled) VALUES(?,?,?) ON CONFLICT(guild_id,channel_id) DO UPDATE SET enabled=excluded.enabled').run(guildId, channelId, enabled ? 1 : 0);
    this.changed(guildId);
  }
  isLinkChannel(guildId: string, channelId: string) { return !!this.database.db.prepare('SELECT 1 FROM link_channels WHERE guild_id=? AND channel_id=? AND enabled=1').get(guildId, channelId); }
  getGuild(guildId: string): GuildRow { this.ensureGuild(guildId); return this.database.db.prepare('SELECT * FROM guild_configs WHERE guild_id=?').get(guildId) as GuildRow; }
  listMarketplaces(guildId: string) { return this.database.db.prepare('SELECT marketplace,affiliate_tag,enabled,onelink_enabled FROM marketplace_configs WHERE guild_id=? ORDER BY marketplace').all(guildId) as MarketplaceRow[]; }
  listLinkChannels(guildId: string) { return this.database.db.prepare('SELECT channel_id FROM link_channels WHERE guild_id=? AND enabled=1').all(guildId) as { channel_id: string }[]; }
  saveSetup(guildId: string, config: SetupConfig, expectedRevision: number) {
    validateSetup(config);
    this.database.db.transaction(() => {
      if (this.getGuild(guildId).revision !== expectedRevision) throw new UserInputError('Settings changed while this form was open. Restart /amazon setup to avoid overwriting them.');
      this.database.db.prepare('UPDATE marketplace_configs SET enabled=0,onelink_enabled=0 WHERE guild_id=?').run(guildId);
      this.database.db.prepare('UPDATE link_channels SET enabled=0 WHERE guild_id=?').run(guildId);
      for (const m of config.marketplaces) this.setMarketplace(guildId, m, config.productMode === 'AFFILIATE' ? config.tags[m]! : '', config.productMode === 'AFFILIATE' && config.oneLinkDeclared);
      for (const channel of config.channels) this.setLinkChannel(guildId, channel);
      this.database.db.prepare('UPDATE guild_configs SET product_mode=?,link_mode=? WHERE guild_id=?').run(config.productMode, config.linkMode, guildId);
      this.changed(guildId);
    })();
  }
}

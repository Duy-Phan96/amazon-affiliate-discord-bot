import type { MarketplaceCode } from './amazon.js';
export type LinkMode = 'OFF' | 'REPLY' | 'BUTTON';
export type ProductMode = 'BASIC' | 'AFFILIATE';
export interface SetupConfig {
  productMode: ProductMode;
  marketplaces: MarketplaceCode[];
  tags: Partial<Record<MarketplaceCode, string>>;
  oneLinkDeclared: boolean;
  channels: string[];
  linkMode: LinkMode;
}
export interface GuildRow {
  guild_id: string; disclosure: string; link_mode: LinkMode;
  product_mode: ProductMode; revision: number; created_at: string; updated_at: string;
}
export interface MarketplaceRow {
  marketplace: MarketplaceCode; affiliate_tag: string; enabled: number; onelink_enabled: number;
}
// Retained public domain types for future adapters.
export interface MarketplaceConfig { guildId: string; marketplace: MarketplaceCode; affiliateTag: string; enabled: boolean; oneLinkEnabled: boolean }
export interface GuildConfig { guildId: string; disclosure: string; linkMode: LinkMode; createdAt: string; updatedAt: string }

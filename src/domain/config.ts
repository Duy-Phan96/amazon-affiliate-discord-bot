import type { MarketplaceCode } from './amazon.js';
export type LinkMode = 'OFF'|'REPLY'|'BUTTON';
export interface MarketplaceConfig { guildId:string; marketplace:MarketplaceCode; affiliateTag:string; enabled:boolean; oneLinkEnabled:boolean }
export interface GuildConfig { guildId:string; disclosure:string; linkMode:LinkMode; createdAt:string; updatedAt:string }

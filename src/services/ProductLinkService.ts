import { MARKETPLACES, type MarketplaceCode } from '../domain/amazon.js';
import type { ProductMode } from '../domain/config.js';
import { AmazonUrlParser } from './AmazonUrlParser.js';
import { UserInputError } from './SetupValidation.js';
export interface ProductLinkConfig {
  getProductMode(guildId: string): ProductMode;
  isMarketplaceEnabled(guildId: string, marketplace: MarketplaceCode): boolean;
  getTag(guildId: string, marketplace: MarketplaceCode): string | null;
  getPrimaryMarketplace?(guildId: string): MarketplaceCode | null;
}
/** No network, no product data and no OneLink/domain rewriting. */
export class ProductLinkService {
  constructor(private config: ProductLinkConfig, private parser = new AmazonUrlParser()) {}
  generate(guildId: string, input: string) {
    const parsed = this.parser.parse(input);
    const affiliate = this.config.getProductMode(guildId) === 'AFFILIATE';
    const primary = affiliate ? (this.config.getPrimaryMarketplace?.(guildId) ?? null) : null;
    const marketplace = primary ?? parsed.marketplace;
    if (!this.config.isMarketplaceEnabled(guildId, marketplace)) throw new UserInputError('This marketplace is not enabled. Update /amazon setup first.');

    const canonicalUrl = `https://www.${MARKETPLACES[marketplace].domain}/dp/${parsed.asin}`;
    let url = canonicalUrl;
    if (affiliate) {
      const tag = this.config.getTag(guildId, marketplace);
      if (!tag) throw new UserInputError('This marketplace has no tracking ID. Configure its real ID; OneLink does not invent one.');
      const target = new URL(canonicalUrl);
      target.searchParams.set('tag', tag);
      url = target.toString();
    }

    return {
      ...parsed,
      sourceMarketplace: parsed.marketplace,
      marketplace,
      canonicalUrl,
      url,
      affiliate,
      marketplaceOverridden: marketplace !== parsed.marketplace,
    };
  }
}

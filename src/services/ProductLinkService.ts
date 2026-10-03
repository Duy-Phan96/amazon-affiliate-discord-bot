import type { MarketplaceCode } from '../domain/amazon.js';
import type { ProductMode } from '../domain/config.js';
import { AmazonUrlParser } from './AmazonUrlParser.js';
import { UserInputError } from './SetupValidation.js';
export interface ProductLinkConfig {
  getProductMode(guildId: string): ProductMode;
  isMarketplaceEnabled(guildId: string, marketplace: MarketplaceCode): boolean;
  getTag(guildId: string, marketplace: MarketplaceCode): string | null;
}
/** No network, no product data and no OneLink/domain rewriting. */
export class ProductLinkService {
  constructor(private config: ProductLinkConfig, private parser = new AmazonUrlParser()) {}
  generate(guildId: string, input: string) {
    const parsed = this.parser.parse(input);
    if (!this.config.isMarketplaceEnabled(guildId, parsed.marketplace)) throw new UserInputError('This marketplace is not enabled. Update /amazon setup first.');
    const affiliate = this.config.getProductMode(guildId) === 'AFFILIATE';
    let url = parsed.canonicalUrl;
    if (affiliate) {
      const tag = this.config.getTag(guildId, parsed.marketplace);
      if (!tag) throw new UserInputError('This marketplace has no tracking ID. Configure its real ID; OneLink does not invent one.');
      const target = new URL(parsed.canonicalUrl);
      target.searchParams.set('tag', tag);
      url = target.toString();
    }
    return { ...parsed, url, affiliate };
  }}

import type { ProductMode } from '../domain/config.js';
import type { MarketplaceCode } from '../domain/amazon.js';
import { buildAmazonProgramAffiliateUrl, getAmazonProgram, type AmazonProgramKey } from '../programs/AmazonProgramCatalog.js';
import { UserInputError } from './SetupValidation.js';

export interface AmazonProgramLinkConfig {
  getProductMode(guildId: string): ProductMode;
  isMarketplaceEnabled(guildId: string, marketplace: MarketplaceCode): boolean;
  getTag(guildId: string, marketplace: MarketplaceCode): string | null;
}

export interface AmazonProgramLinkResult {
  programKey: AmazonProgramKey;
  programName: string;
  marketplace: MarketplaceCode;
  affiliateUrl: string;
  officialInfoUrl: string;
}

/** Generates current program links from saved guild configuration. No Discord, network, OneLink or API dependency. */
export class AmazonProgramLinkService {
  constructor(private config: AmazonProgramLinkConfig) {}

  generate(guildId: string, programKey: AmazonProgramKey): AmazonProgramLinkResult {
    const program = getAmazonProgram(programKey);
    const marketplace = program.marketplace as MarketplaceCode;
    if (this.config.getProductMode(guildId) !== 'AFFILIATE') {
      throw new UserInputError('Amazon Programs require Affiliate mode. Open /amazon setup first.');
    }
    if (!this.config.isMarketplaceEnabled(guildId, marketplace)) {
      throw new UserInputError('Amazon.de is not enabled. Open /amazon setup and configure it first.');
    }
    const tag = this.config.getTag(guildId, marketplace);
    if (!tag) throw new UserInputError('Amazon.de has no tracking ID. Open /amazon setup and configure it first.');
    let affiliateUrl: string;
    try { affiliateUrl = buildAmazonProgramAffiliateUrl(programKey, tag); }
    catch { throw new UserInputError('Amazon.de tracking ID is invalid. Open /amazon setup and correct it.'); }
    return {
      programKey,
      programName: program.title,
      marketplace,
      affiliateUrl,
      officialInfoUrl: program.officialInfoUrl,
    };
  }
}

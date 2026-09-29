import { MARKETPLACES, type MarketplaceCode, type ParsedAmazonUrl } from '../domain/amazon.js';
import { UserInputError } from './SetupValidation.js';
export class AmazonUrlParser {
  parse(input: string): ParsedAmazonUrl {
    let url: URL;
    try { url = new URL(input.trim()); } catch { throw new UserInputError('Enter a full Amazon product URL starting with https://.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) throw new UserInputError('Use a normal HTTPS Amazon product link without login details or a custom port.');
    const host = url.hostname.toLowerCase();
    if (host === 'amzn.to' || host === 'amzn.eu') throw new UserInputError('Open the short link yourself and paste the full Amazon product URL. Short-link resolution is not available yet.');
    const marketplace = (Object.entries(MARKETPLACES).find(([, m]) => [m.domain, `www.${m.domain}`, `smile.${m.domain}`, `m.${m.domain}`].includes(host))?.[0]) as MarketplaceCode | undefined;
    if (!marketplace) throw new UserInputError('This version supports Amazon.de, Amazon.com and Amazon.co.uk product links.');
    const asin = /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:\/|$)/i.exec(url.pathname)?.[1]?.toUpperCase();
    if (!asin) throw new UserInputError('No product ASIN was found. Paste a product detail link, not a search, program or category link.');
    return { marketplace, asin, canonicalUrl: `https://www.${MARKETPLACES[marketplace].domain}/dp/${asin}` };
  }
}

export type MarketplaceCode="DE"|"US"|"UK";
export const MARKETPLACES={DE:{domain:"amazon.de",currency:"EUR"},US:{domain:"amazon.com",currency:"USD"},UK:{domain:"amazon.co.uk",currency:"GBP"}} as const;
export interface ParsedAmazonUrl{marketplace:MarketplaceCode;asin:string;canonicalUrl:string}
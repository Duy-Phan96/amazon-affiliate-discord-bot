import type{MarketplaceCode}from'../domain/amazon.js';import{AmazonUrlParser}from'./AmazonUrlParser.js';
export interface AffiliateTagRepository{getTag(guildId:string,m:MarketplaceCode):string|null}
export class AmazonAffiliateService{
 constructor(private tags:AffiliateTagRepository,private parser=new AmazonUrlParser()){}
 generate(guildId:string,input:string){const p=this.parser.parse(input),tag=this.tags.getTag(guildId,p.marketplace);if(!tag)throw new Error(`Marketplace ${p.marketplace} not configured: configure a valid tag for this marketplace; never derive one by changing the suffix.`);const u=new URL(p.canonicalUrl);u.searchParams.set('tag',tag);return{...p,affiliateUrl:u.toString()}}
}

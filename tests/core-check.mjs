import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AmazonUrlParser } from '../.core-test-dist/services/AmazonUrlParser.js';
import { ProductLinkService } from '../.core-test-dist/services/ProductLinkService.js';
import { AmazonAffiliateService } from '../.core-test-dist/services/AmazonAffiliateService.js';
import { DraftStore } from '../.core-test-dist/services/DraftStore.js';
import { validateSetup } from '../.core-test-dist/services/SetupValidation.js';
const parser = new AmazonUrlParser();
for (const [host, market] of [['amazon.de','DE'],['www.amazon.com','US'],['amazon.co.uk','UK'],['smile.amazon.de','DE'],['m.amazon.com','US']]) {
  test(`parse explicit host ${host}`, () => assert.equal(parser.parse(`https://${host}/dp/B0ABCDEF12`).marketplace, market));
}
for (const path of ['dp', 'gp/product', 'gp/aw/d', 'product']) test(`parse ${path}`, () => assert.equal(parser.parse(`https://amazon.de/${path}/b0abcdef12?tag=old-21`).asin, 'B0ABCDEF12'));
for (const url of ['ftp://amazon.de/dp/B0ABCDEF12','https://user:pass@amazon.de/dp/B0ABCDEF12','https://amazon.de.evil.test/dp/B0ABCDEF12','https://evil.amazon.de/dp/B0ABCDEF12','https://amazon.de:444/dp/B0ABCDEF12','https://amazon.de/dp/B0ABCDEF123','https://amzn.to/test','https://amazon.de/s?k=mouse','not-a-url']) {
  test(`reject unsafe/unsupported input: ${url}`, () => assert.throws(() => parser.parse(url)));
}
const config = (mode = 'BASIC', tag = 'example-21', enabled = true) => ({ getProductMode: () => mode, getTag: () => tag, isMarketplaceEnabled: () => enabled });
test('Basic removes existing tags and query strings', () => {
  const result = new ProductLinkService(config()).generate('g', 'https://amazon.de/name/dp/B0ABCDEF12?tag=other-21&ref_=x');
  assert.equal(result.url, 'https://www.amazon.de/dp/B0ABCDEF12'); assert.equal(result.affiliate, false);
});
test('Basic never needs or accesses tracking credentials', () => {
  const c = config(); c.getTag = () => { throw new Error('must not read tag'); };
  assert.equal(new ProductLinkService(c).generate('g','https://amazon.de/dp/B0ABCDEF12').affiliate, false);
});
test('Affiliate inserts exactly one real configured tag', () => {
  const result = new ProductLinkService(config('AFFILIATE')).generate('g', 'https://amazon.de/dp/B0ABCDEF12?tag=other-21&tag=duplicate-21');
  assert.deepEqual(new URL(result.url).searchParams.getAll('tag'), ['example-21']); assert.equal(result.affiliate, true);
});
test('missing tag does not fall back to another marketplace', () => assert.throws(() => new ProductLinkService(config('AFFILIATE',null)).generate('g','https://amazon.com/dp/B0ABCDEF12'), /no tracking ID/));
test('disabled marketplace cannot generate a post', () => assert.throws(() => new ProductLinkService(config('BASIC',null,false)).generate('g','https://amazon.de/dp/B0ABCDEF12'), /not enabled/));
test('legacy affiliate service retains marketplace isolation', () => {
  const service = new AmazonAffiliateService({ getTag: (_, m) => m === 'DE' ? 'example-21' : null });
  assert.throws(() => service.generate('g','https://amazon.com/dp/B0ABCDEF12'), /US not configured/);
});
const setup = () => ({ productMode:'BASIC',marketplaces:['DE'],tags:{},oneLinkDeclared:false,channels:['123456789012345678'],linkMode:'OFF' });
test('Basic setup accepts no partner ID', () => assert.doesNotThrow(() => validateSetup(setup())));
test('Affiliate setup requires real-looking IDs', () => assert.throws(() => validateSetup({...setup(),productMode:'AFFILIATE'})));
test('OneLink is not used in Basic', () => assert.throws(() => validateSetup({...setup(),oneLinkDeclared:true})));
test('duplicate marketplaces rejected', () => assert.throws(() => validateSetup({...setup(),marketplaces:['DE','DE']})));
test('malformed channel IDs rejected', () => assert.throws(() => validateSetup({...setup(),channels:['other-guild']})));
test('unknown link mode rejected', () => assert.throws(() => validateSetup({...setup(),linkMode:'INVALID'})));
test('draft bound to guild and actor', () => {
  const store = new DraftStore(); store.create('id','g','u','mode',{});
  assert.throws(() => store.get('id','g','other')); assert.throws(() => store.get('id','other','u'));
  assert.equal(store.get('id','g','u').step,'mode');
});
test('cancel removes draft without any save operation', () => { const store = new DraftStore(); store.create('id','g','u','mode',{});store.remove('id');assert.throws(() => store.get('id','g','u')); });
test('expired draft cannot be submitted', () => { let now=0;const store=new DraftStore(()=>now,100);store.create('id','g','u','mode',{});now=100;assert.throws(()=>store.get('id','g','u')); });
test('new setup invalidates previous actor draft', () => { const store=new DraftStore();store.create('old','g','u','mode',{});store.create('new','g','u','mode',{});assert.throws(()=>store.get('old','g','u')); });
test('stale controls cannot change a later step', () => { const store=new DraftStore();const draft=store.create('id','g','u','review',{});assert.throws(()=>store.requireStep(draft,'mode'));assert.doesNotThrow(()=>store.requireStep(draft,'review')); });

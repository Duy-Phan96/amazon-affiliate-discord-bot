import 'dotenv/config';
import Database from 'better-sqlite3';
import { CreatorsApiAuthClient } from '../dist/amazon/creators-api/CreatorsApiAuthClient.js';
import { CreatorsApiClient } from '../dist/amazon/creators-api/CreatorsApiClient.js';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const clientId = process.env.AMAZON_CREATORS_CLIENT_ID?.trim();
const clientSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET?.trim();
const version = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION?.trim() || '3.2';
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const databasePath = process.env.DATABASE_PATH?.trim();

console.log('Amazon Creators API Access Test');
console.log('Marketplace: Amazon.de');
console.log('Credential version:', version);
console.log('Credentials: configured locally (values hidden)');

if (!clientId || !clientSecret || !guildId || !databasePath) {
  fail('Missing local configuration. Required: AMAZON_CREATORS_CLIENT_ID, AMAZON_CREATORS_CLIENT_SECRET, DISCORD_GUILD_ID, DATABASE_PATH.');
} else {
  const db = new Database(databasePath, { readonly: true });
  const row = db.prepare('SELECT affiliate_tag FROM marketplace_configs WHERE guild_id=? AND marketplace=? AND enabled=1').get(guildId, 'DE');
  db.close();
  const partnerTag = typeof row?.affiliate_tag === 'string' ? row.affiliate_tag.trim() : '';
  if (!partnerTag) {
    fail('No enabled Amazon.de tracking ID is stored for this server. Complete /amazon setup first.');
  } else {
    const auth = new CreatorsApiAuthClient(clientId, clientSecret, version);
    const result = await new CreatorsApiClient(auth).testSearchItems(partnerTag);
    console.log('Authentication:', result.authenticationOk ? 'OK' : 'FAILED');
    console.log('Status:', result.status);
    if (result.detail) console.log('Detail:', result.detail);
    if (result.status === 'ACCESS_OK') {
      console.log('Product API Access: OK');
      for (const [index, product] of (result.products ?? []).entries()) {
        console.log(`${index + 1}. ${product.title ?? '(title not returned)'}`);
        console.log(`   ASIN: ${product.asin}`);
        if (product.price !== undefined) console.log(`   Price: ${product.price} ${product.currency ?? ''}`.trimEnd());
      }
    } else if (result.status === 'ASSOCIATE_NOT_ELIGIBLE') {
      console.log('Product API Access: NOT ELIGIBLE');
    }
    if (result.status !== 'ACCESS_OK' && result.status !== 'ASSOCIATE_NOT_ELIGIBLE') process.exitCode = 1;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentChecks, readTestConfig, supportedNode, inviteUrl, registerGuildCommand } from '../scripts/test-support.mjs';
const env = { DISCORD_TOKEN: 'fake-test-token-not-real', DISCORD_CLIENT_ID: '111111111111111111', DISCORD_GUILD_ID: '222222222222222222' };
test('valid local test configuration is accepted', () => assert.equal(environmentChecks(env).every(c => c.ok), true));
test('no Amazon credentials are required', () => assert.equal(readTestConfig(env).guildId, env.DISCORD_GUILD_ID));
test('missing guild never falls back to global commands', () => assert.throws(() => readTestConfig({ ...env, DISCORD_GUILD_ID: '' })));
test('diagnostics do not expose supplied token or invalid input', () => {
  const unsafe = { ...env, DISCORD_TOKEN: 'secret with whitespace', DISCORD_CLIENT_ID: 'do-not-print-this' };
  assert.ok(!JSON.stringify(environmentChecks(unsafe)).includes('secret'));
  assert.throws(() => readTestConfig(unsafe), e => !e.message.includes('do-not-print-this') && !e.message.includes('secret with whitespace'));
});
test('placeholder credentials rejected', () => assert.equal(environmentChecks({ ...env, DISCORD_TOKEN: 'YOUR_DISCORD_TOKEN' })[0].ok, false));
test('supported Node versions checked', () => { assert.equal(supportedNode('22.12.0'), true); assert.equal(supportedNode('24.0.0'), true); assert.equal(supportedNode('22.11.0'), false); assert.equal(supportedNode('20.19.0'), false); });
test('invite uses test server and least-privilege permissions without token', () => {
  const url = new URL(inviteUrl(readTestConfig(env)));
  assert.equal(url.searchParams.get('permissions'), '84992');
  assert.equal(url.searchParams.get('guild_id'), env.DISCORD_GUILD_ID);
  assert.equal(url.searchParams.get('disable_guild_select'), 'true');
  assert.ok(!url.toString().includes(env.DISCORD_TOKEN));
});
test('invite rejects malformed IDs', () => assert.throws(() => inviteUrl({ clientId: 'bad', guildId: env.DISCORD_GUILD_ID })));
test('register uses one guild POST and checks application ownership first', async () => {
  const calls = [];
  const rest = { get: async path => { calls.push(['get', path]); return { id: env.DISCORD_CLIENT_ID }; }, post: async (path, body) => { calls.push(['post', path, body]); } };
  await registerGuildCommand(rest, readTestConfig(env), { name: 'amazon' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1], `/applications/${env.DISCORD_CLIENT_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`);
});
test('wrong token/application cannot register', async () => {
  let posts = 0;
  await assert.rejects(registerGuildCommand({ get: async () => ({ id: '333333333333333333' }), post: async () => { posts++; } }, readTestConfig(env), { name: 'amazon' }));
  assert.equal(posts, 0);
});
test('missing server and unrelated command never contact Discord', async () => {
  const rest = { get: async () => { throw new Error('must not contact'); } };
  await assert.rejects(registerGuildCommand(rest, { clientId: env.DISCORD_CLIENT_ID, guildId: '' }, { name: 'amazon' }), /test server/);
  await assert.rejects(registerGuildCommand(rest, readTestConfig(env), { name: 'unrelated' }), /Only the amazon/);
});

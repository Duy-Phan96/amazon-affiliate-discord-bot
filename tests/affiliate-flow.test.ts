import { describe, it, expect, vi } from 'vitest';
import { AmazonDiscordController } from '../src/discord/AmazonDiscordController.js';
import { amazonCommand } from '../src/discord/commands.js';
import { hasAffiliateTag } from '../src/services/MessageLinkPolicy.js';
import { inferProductTitleFromAmazonUrl } from '../src/services/ProductUrlPresentation.js';

const GUILD = '222222222222222222';
const CHANNEL = '333333333333333333';
const PRODUCT = 'https://www.amazon.de/dp/B0ABCDEF12';
function fixture(productMode = 'AFFILIATE', behavior = 'BUTTON') {
  const repo = {
    getProductMode: vi.fn(() => productMode), isMarketplaceEnabled: vi.fn(() => true), getTag: vi.fn(() => 'test-21'),
    getGuild: vi.fn(() => ({ product_mode: productMode, link_mode: behavior, revision: 1, disclosure: '' })),
    listMarketplaces: vi.fn(() => [{ marketplace: 'DE', enabled: 1, onelink_enabled: 1 }]),
    isLinkChannel: vi.fn((_g, c) => c === CHANNEL),
  };
  const reserved = new Set<string>();
  const deliveries = { reserve: vi.fn((_g, key) => { if (reserved.has(key)) return false; reserved.add(key); return true; }), sent: vi.fn(), unknown: vi.fn() };
  const controller = new AmazonDiscordController({} as any, repo as any, deliveries as any, GUILD) as any;
  controller.targetChannel = vi.fn(async () => ({ id: CHANNEL }));
  return { controller, repo, deliveries };
}
function interaction(url = PRODUCT) {
  return { commandName: 'amazon', guildId: GUILD, id: '555555555555555555', user: { id: '444444444444444444' },
    memberPermissions: { has: () => true }, isChatInputCommand: () => true, isMessageComponent: () => false, isModalSubmit: () => false,
    options: { getSubcommand: () => 'link', getString: () => url }, deferred: false, replied: false, reply: vi.fn(async () => undefined) };
}
function message(content = PRODUCT) {
  return { id: '666666666666666666', guildId: GUILD, channelId: CHANNEL, author: { bot: false }, webhookId: null, content,
    reply: vi.fn(async () => ({ id: '777777777777777777' })) };
}
describe('private affiliate link command', () => {
  it('keeps the public slash-command surface focused on the main workflows', () => {
    const cmd = amazonCommand.toJSON();
    const names = cmd.options?.map(o => o.name) ?? [];
    expect(names).toEqual(['post','queue','programs','settings','setup']);
    const queue = cmd.options?.find(o => o.name === 'queue') as any;
    expect(queue.options?.map((o:any) => o.name)).toEqual(['manage']);
  });
  it('generates disclosed affiliate link privately from DB configuration', async () => {
    const { controller, deliveries } = fixture(); const i = interaction(); await controller.handle(i);
    const payload = i.reply.mock.calls[0][0] as any;
    expect(payload.ephemeral).toBe(true); expect(payload.content).toContain('?tag=test-21');
    expect(payload.content).toContain('#ad · Affiliate link'); expect(payload.content).toContain('not verified');
    expect(deliveries.reserve).not.toHaveBeenCalled(); expect(payload.allowedMentions.parse).toEqual([]);
  });
  it('Basic remains available without accessing any tag', async () => {
    const { controller, repo } = fixture('BASIC'); const i = interaction(PRODUCT + '?tag=old-21'); await controller.handle(i);
    expect((i.reply.mock.calls[0][0] as any).content).not.toContain('?tag='); expect(repo.getTag).not.toHaveBeenCalled();
  });
  it('rejects missing marketplace ID without generating a replacement', async () => {
    const { controller, repo } = fixture(); repo.getTag.mockReturnValue(null as any);
    const i = interaction(); await controller.handle(i); expect((i.reply.mock.calls[0][0] as any).content).toContain('no tracking ID');
  });
  it('requires management permission', async () => {
    const { controller, repo } = fixture(); const i = interaction(); i.memberPermissions.has = () => false;
    await controller.handle(i); expect(repo.getTag).not.toHaveBeenCalled(); expect((i.reply.mock.calls[0][0] as any).content).toContain('Manage Server');
  });
  it('ignores another server even if it has configuration', async () => {
    const { controller, repo } = fixture(); const i = interaction(); i.guildId = '888888888888888888';
    await controller.handle(i); expect(i.reply).not.toHaveBeenCalled(); expect(repo.getTag).not.toHaveBeenCalled();
  });
});
describe('automatic replies', () => {
  it('replies to an ordinary member with the configured tag and disclosure', async () => {
    const { controller, deliveries } = fixture(); const m = message(); await controller.onMessage(m);
    const payload = m.reply.mock.calls[0][0] as any;
    expect(payload.content).toContain('Affiliate link');
    expect(payload.components[0].toJSON().components[0].url).toBe(PRODUCT + '?tag=test-21');
    expect(payload.allowedMentions).toEqual({ parse: [], repliedUser: false }); expect(deliveries.sent).toHaveBeenCalled();
  });
  it('reply mode shows a copyable URL instead of requiring a button', async () => {
    const { controller } = fixture('AFFILIATE', 'REPLY'); const m = message(); await controller.onMessage(m);
    expect((m.reply.mock.calls[0][0] as any).content).toContain(PRODUCT + '?tag=test-21');
  });
  it('Off and unconfigured channels never post', async () => {
    const off = fixture('AFFILIATE', 'OFF'); const m = message(); await off.controller.onMessage(m); expect(m.reply).not.toHaveBeenCalled();
    const normal = fixture(); m.channelId = '999999999999999999'; await normal.controller.onMessage(m); expect(m.reply).not.toHaveBeenCalled();
  });
  it('does not automatically replace an existing affiliate tag', async () => {
    const { controller, deliveries } = fixture(); const m = message(PRODUCT + '?tag=someone-21'); await controller.onMessage(m);
    expect(m.reply).not.toHaveBeenCalled(); expect(deliveries.reserve).not.toHaveBeenCalled();
  });
  it('skips bots, webhooks and other servers', async () => {
    const { controller } = fixture();
    for (const change of [{ author: { bot: true } }, { webhookId: 'webhook' }, { guildId: '888888888888888888' }]) {
      const m = { ...message(), ...change }; await controller.onMessage(m); expect(m.reply).not.toHaveBeenCalled();
    }
  });
  it('makes no duplicate send for the same source event', async () => {
    const { controller } = fixture(); const m = message(); await controller.onMessage(m); await controller.onMessage(m); expect(m.reply).toHaveBeenCalledTimes(1);
  });
  it('rechecks Off after async permission lookup', async () => {
    const { controller, repo } = fixture(); controller.targetChannel.mockImplementation(async () => { repo.getGuild.mockReturnValue({ product_mode: 'AFFILIATE', link_mode: 'OFF', revision: 2, disclosure: '' }); return { id: CHANNEL }; });
    const m = message(); await controller.onMessage(m); expect(m.reply).not.toHaveBeenCalled();
  });
  it('unsupported short links are not fetched or published', async () => {
    const { controller } = fixture(); const m = message('https://amzn.to/fake-test'); await controller.onMessage(m); expect(m.reply).not.toHaveBeenCalled();
  });
});
it('tag detection handles encoding, case and empty values conservatively', () => {
  expect(hasAffiliateTag(PRODUCT + '?t%61g=someone-21')).toBe(true);
  expect(hasAffiliateTag(PRODUCT + '?TAG=test-21')).toBe(true);
  expect(hasAffiliateTag(PRODUCT + '?tag=')).toBe(false);
  expect(hasAffiliateTag('not a URL')).toBe(false);
});


describe('quick public affiliate post command', () => {
  it('registers /amazon post with URL and optional presentation fields', () => {
    const cmd = amazonCommand.toJSON();
    const sub = cmd.options?.find(o => o.name === 'post') as any;
    expect(sub).toBeTruthy();
    expect(sub.options?.find((o:any) => o.name === 'url')?.required).toBe(true);
    expect(sub.options?.some((o:any) => o.name === 'title')).toBe(true);
    expect(sub.options?.some((o:any) => o.name === 'text')).toBe(true);
    expect(sub.options?.some((o:any) => o.name === 'style')).toBe(true);
  });

  it('publishes one affiliate button post in the current configured channel', async () => {
    const { controller, deliveries } = fixture();
    const sent = vi.fn(async () => ({ id: '999999999999999998' }));
    controller.targetChannel = vi.fn(async () => ({ id: CHANNEL, send: sent }));
    const values: Record<string,string> = { url: PRODUCT, style: 'BUTTON' };
    const i:any = {
      commandName:'amazon', guildId:GUILD, channelId:CHANNEL, id:'555555555555555556',
      user:{id:'444444444444444444'}, memberPermissions:{has:()=>true},
      isChatInputCommand:()=>true, isMessageComponent:()=>false, isModalSubmit:()=>false,
      options:{ getSubcommand:()=> 'post', getString:(name:string, required?:boolean)=> values[name] ?? (required ? PRODUCT : null) },
      deferred:false,replied:false,reply:vi.fn(async()=>undefined)
    };
    await controller.handle(i);
    expect(sent).toHaveBeenCalledTimes(1);
    const payload = sent.mock.calls[0][0] as any;
    expect(payload.content).toContain('#ad · Affiliate link');
    expect(payload.components[0].toJSON().components[0].url).toBe(PRODUCT + '?tag=test-21');
    expect(deliveries.sent).toHaveBeenCalled();
  });

  it('infers only a safe title from URL slugs and does not invent product facts', () => {
    expect(inferProductTitleFromAmazonUrl('https://www.amazon.de/Logitech-G502-X-Gaming-Maus/dp/B0ABCDEF12'))
      .toBe('Logitech G502 X Gaming Maus');
    expect(inferProductTitleFromAmazonUrl(PRODUCT)).toBeUndefined();
  });
});


describe('quick post native Amazon preview', () => {
  it('AUTO includes the affiliate URL in message content so Discord can unfurl it', async () => {
    const { controller } = fixture();
    const sent = vi.fn(async () => ({ id: '999999999999999997' }));
    controller.targetChannel = vi.fn(async () => ({ id: CHANNEL, send: sent }));
    const values: Record<string,string> = { url: PRODUCT, style: 'AUTO' };
    const i:any = {
      commandName:'amazon', guildId:GUILD, channelId:CHANNEL, id:'555555555555555557',
      user:{id:'444444444444444444'}, memberPermissions:{has:()=>true},
      isChatInputCommand:()=>true, isMessageComponent:()=>false, isModalSubmit:()=>false,
      options:{ getSubcommandGroup:()=>null, getSubcommand:()=> 'post', getString:(name:string, required?:boolean)=> values[name] ?? (required ? PRODUCT : null) },
      deferred:false,replied:false,reply:vi.fn(async()=>undefined)
    };
    await controller.handle(i);
    const payload = sent.mock.calls[0][0] as any;
    expect(payload.content).toContain(PRODUCT + '?tag=test-21');
    expect(payload.content).toContain('#ad · Affiliate link');
    expect(payload.embeds).toBeUndefined();
  });
});


describe('queue manager command surface', () => {
  it('registers /amazon queue manage as the primary queue dashboard entry point', () => {
    const cmd = amazonCommand.toJSON();
    const group = cmd.options?.find(o => o.name === 'queue') as any;
    expect(group).toBeTruthy();
    expect(group.options?.some((o:any) => o.name === 'manage')).toBe(true);
  });
});

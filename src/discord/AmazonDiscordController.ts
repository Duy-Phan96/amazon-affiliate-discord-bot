import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType,
  Client, EmbedBuilder, Events, PermissionFlagsBits, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, escapeMarkdown,
  type Interaction, type ChatInputCommandInteraction, type MessageComponentInteraction,
  type ModalSubmitInteraction, type Message, type MessageActionRowComponentBuilder,
} from 'discord.js';
import { ConfigRepository } from '../repositories/ConfigRepository.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { MARKETPLACES, type MarketplaceCode } from '../domain/amazon.js';
import type { SetupConfig, LinkMode, ProductMode } from '../domain/config.js';
import { DraftStore, type Draft } from '../services/DraftStore.js';
import { ProductLinkService } from '../services/ProductLinkService.js';
import { UserInputError, validateSetup } from '../services/SetupValidation.js';

type UI = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;
type SetupData = { config: SetupConfig; revision: number };
type ProductData = { url: string; title: string; note: string; channel?: string; revision: number };
const LABELS = { DE: 'Amazon.de', US: 'Amazon.com', UK: 'Amazon.co.uk' };
const ONE_LINK = 'https://partnernet.amazon.de/help/node/topic/GKHRXG4YEJBTCAFC';
const DISCLOSURE_GUIDE = 'https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98';
const DISCLOSURE = 'Anzeige / Ad · Affiliate link\nAs an Amazon Associate I earn from qualifying purchases.\nAls Amazon-Partner verdiene ich an qualifizierten Verkäufen.';
const NO_MENTIONS = { parse: [] as never[], repliedUser: false };
const buttons = (...items: ButtonBuilder[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(...items);
const button = (id: string, text: string, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(text).setStyle(style);
const link = (url: string, text: string) => new ButtonBuilder().setURL(url).setLabel(text).setStyle(ButtonStyle.Link);

export class AmazonDiscordController {
  private setup = new DraftStore<SetupData>();
  private products = new DraftStore<ProductData>();
  private links: ProductLinkService;
  constructor(private client: Client, private repo: ConfigRepository, private deliveries: DeliveryRepository) { this.links = new ProductLinkService(repo); }
  register() {
    this.client.on(Events.InteractionCreate, i => { void this.handle(i).catch(() => console.warn(JSON.stringify({ event: 'interaction_response_failed' }))); });
    this.client.on(Events.MessageCreate, m => { void this.onMessage(m).catch(() => console.warn(JSON.stringify({ event: 'automatic_link_failed' }))); });
  }
  private async show(i: UI, content: string, components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [], embeds: EmbedBuilder[] = []) {
    const payload = { content, components, embeds, allowedMentions: NO_MENTIONS };
    if (i.deferred || i.replied) await i.editReply(payload);
    else if (i.isMessageComponent()) await i.update(payload);
    else await i.reply({ ...payload, ephemeral: true });
  }
  private async handle(i: Interaction) {
    if (!(i.isChatInputCommand() || i.isMessageComponent() || i.isModalSubmit())) return;
    if (i.isChatInputCommand() ? i.commandName !== 'amazon' : !i.customId.startsWith('amazon:')) return;
    try {
      if (!i.guildId || !i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new UserInputError('Use this in a server where you have Manage Server permission.');
      if (i.isChatInputCommand()) return await this.command(i);
      const [, kind, id, action] = i.customId.split(':');
      if (kind === 'setup') await this.setupAction(i, id, action);
      else if (kind === 'product') await this.productAction(i, id, action);
      else throw new UserInputError('This is an old control. Run /amazon setup again.');
    } catch (error) {
      const content = error instanceof UserInputError ? error.message : 'The action could not be completed. Check the bot permissions and start the command again.';
      // Never dump an exception: Discord errors can contain request bodies/tokens.
      if (!(error instanceof UserInputError)) console.warn(JSON.stringify({ event: 'amazon_action_failed', guildId: i.guildId }));
      if (i.deferred || i.replied) await i.editReply({ content, components: [], embeds: [], allowedMentions: NO_MENTIONS });
      else await i.reply({ content, ephemeral: true, allowedMentions: NO_MENTIONS });
    }
  }
  private async command(i: ChatInputCommandInteraction) {
    const guildId = i.guildId!;
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      const current = this.repo.getGuild(guildId);
      const active = this.repo.listMarketplaces(guildId).filter(m => m.enabled);
      const draft = this.setup.create(i.id, guildId, i.user.id, 'mode', {
        revision: current.revision,
        config: { productMode: current.product_mode, marketplaces: active.map(m => m.marketplace),
          tags: Object.fromEntries(active.map(m => [m.marketplace, m.affiliate_tag])),
          oneLinkDeclared: active.some(m => !!m.onelink_enabled),
          channels: this.repo.listLinkChannels(guildId).map(c => c.channel_id), linkMode: current.link_mode },
      });
      return this.setupView(i, i.id, draft);
    }
    if (sub === 'product') {
      this.products.create(i.id, guildId, i.user.id, 'details', { url: '', title: '', note: '', revision: this.repo.getGuild(guildId).revision });
      return i.showModal(this.productModal(i.id));
    }
    if (sub === 'guide') return this.show(i, '**API-free setup**\nBasic: normal product links, no partner account needed.\nAffiliate: your own real tracking IDs, per marketplace.\nOneLink is optional and set up with Amazon, not by this bot. A saved declaration does not verify Discord redirection or account approval.\n\nUse /amazon setup, then /amazon product for a preview before posting. Use your own title/note; no live prices, pictures or deal discovery are fetched.\n\nAffiliate users must check that their actual Discord/site usage is accepted by Amazon and disclose their commercial links. Basic mode is not a blanket exemption from advertising rules.', [buttons(link(ONE_LINK, 'Amazon OneLink guide'), link(DISCLOSURE_GUIDE, 'Why disclose affiliate links?'))]);
    const g = this.repo.getGuild(guildId);
    const markets = this.repo.listMarketplaces(guildId).filter(m => m.enabled);
    const channels = this.repo.listLinkChannels(guildId);
    const content = `**Amazon ${sub === 'status' ? 'Status' : 'Settings'}**\nMode: ${g.product_mode}\nLink behavior: ${g.link_mode}\nMarketplaces: ${markets.map(m => LABELS[m.marketplace]).join(', ') || 'Not configured'}\nChannels: ${channels.map(c => `<#${c.channel_id}>`).join(', ') || 'Not configured'}\nOneLink: ${markets.some(m => m.onelink_enabled) ? 'Declared by operator; not verified' : 'Not declared / not used'}\n\nAPI access is not required for this version.\nUnresolved delivery attempts: ${this.deliveries.unresolved(guildId)}\nUse /amazon setup to edit and /amazon product to compose a post.`;
    return this.show(i, content, [buttons(link(ONE_LINK, 'OneLink setup'), link(DISCLOSURE_GUIDE, 'Disclosure guide'))]);
  }
  private async setupView(i: UI, id: string, draft: Draft<SetupData>) {
    const c = draft.data.config;
    const key = (action: string) => `amazon:setup:${id}:${action}`;
    const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    let content = '';
    if (draft.step === 'mode') {
      content = '**Step 1 / 6 — What do you need?**\nBasic: share products without affiliate tracking or an Associates account.\nAffiliate: add your own marketplace tracking IDs. No product API is needed.\nNothing changes until you review and save.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('mode')).setPlaceholder('Choose Basic or Affiliate').addOptions({ label: 'Basic — no partner account', value: 'BASIC' }, { label: 'Affiliate — my tracking IDs', value: 'AFFILIATE' })));
    } else if (draft.step === 'marketplaces') {
      content = '**Step 2 / 6 — Choose marketplaces**\nOnly select the stores you intend to use. Product domains are never swapped. This release supports DE, US and UK.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('marketplaces')).setPlaceholder('Select marketplaces').setMinValues(1).setMaxValues(3).addOptions(...Object.keys(MARKETPLACES).map(code => ({ label: LABELS[code as MarketplaceCode], value: code, default: c.marketplaces.includes(code as MarketplaceCode) })))));
    } else if (draft.step === 'tags') {
      content = '**Step 2 / 6 — Your tracking IDs**\nEnter the actual ID for each chosen store. Never change an ID suffix to invent a foreign ID. Do not enter API credentials.';
      rows.push(buttons(button(key('open_tags'), 'Enter tracking IDs', ButtonStyle.Primary)));
    } else if (draft.step === 'onelink') {
      content = '**Step 3 / 6 — OneLink (optional)**\nComplete OneLink with Amazon first. The bot records your declaration only; it does not activate or verify it. Redirection depends on Amazon, your account and the actual link. Individual marketplace IDs work without OneLink.';
      rows.push(buttons(button(key('onelink_yes'), 'I configured OneLink'), button(key('onelink_no'), 'Use individual IDs'), link(ONE_LINK, 'Amazon setup guide')));
    } else if (draft.step === 'channels') {
      content = '**Step 4 / 6 — Product channels**\nChoose 1–5 text channels for manual posts and optional automatic link replies. Saving replaces the previous enabled channel selection.';
      rows.push(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId(key('channels')).setPlaceholder('Choose product channels').setChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(5)));
    } else if (draft.step === 'behavior') {
      content = '**Step 5 / 6 — Automatic link replies**\nButtons or replies operate only in your selected channels. Off still allows reviewed manual product posts. Original member messages stay untouched.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('behavior')).setPlaceholder('Choose behavior').addOptions({ label: 'Off — manual posts only', value: 'OFF' }, { label: 'Compact Amazon button', value: 'BUTTON' }, { label: 'Reply with product link', value: 'REPLY' })));
    } else if (draft.step === 'review') {
      content = `**Step 6 / 6 — Review before saving**\nMode: ${c.productMode}\n${c.marketplaces.map(m => `${LABELS[m]}: ${c.productMode === 'AFFILIATE' ? c.tags[m] : 'No affiliate tag'}`).join('\n')}\nOneLink: ${c.oneLinkDeclared ? 'Operator declaration only' : 'Not used'}\nChannels: ${c.channels.map(v => `<#${v}>`).join(', ')}\nAutomatic replies: ${c.linkMode}\n\n${c.productMode === 'AFFILIATE' ? '**Every affiliate post includes:**\n' + DISCLOSURE + '\n\nBy saving, you confirm you checked the applicable Amazon site/Discord usage and disclosure requirements. This is not verification or approval by Amazon.' : 'No affiliate tracking or commission statement is added. Commercial promotions can still need advertising disclosure.'}\n\nUnselected old channels/marketplaces will be disabled. No Discord channels or member messages are deleted.`;
      rows.push(buttons(button(key('save'), 'Save configuration', ButtonStyle.Success), link(DISCLOSURE_GUIDE, 'Disclosure requirements')));
    }
    const nav = [button(key('cancel'), 'Cancel', ButtonStyle.Danger)];
    if (draft.step !== 'mode') nav.unshift(button(key(`back_${draft.step}`), 'Back'));
    rows.push(buttons(...nav));
    await this.show(i, content, rows);
  }
  private async setupAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    const draft = this.setup.get(id, i.guildId!, i.user.id);
    const c = draft.data.config;
    if (draft.step === 'saving') throw new UserInputError('Saving has already started.');
    if (action === 'cancel') { this.setup.remove(id); return this.show(i, 'Cancelled. Your saved settings were not changed.'); }
    if (action.startsWith('back_')) {
      this.setup.requireStep(draft, action.slice(5));
      const back: Record<string, string> = { marketplaces: 'mode', tags: 'marketplaces', onelink: 'tags', channels: c.productMode === 'BASIC' ? 'marketplaces' : 'onelink', behavior: 'channels', review: 'behavior' };
      draft.step = back[draft.step];
    } else if (action === 'mode' && i.isStringSelectMenu()) {
      this.setup.requireStep(draft, 'mode');
      if (!['BASIC', 'AFFILIATE'].includes(i.values[0])) throw new UserInputError('Select a valid mode.');
      c.productMode = i.values[0] as ProductMode;
      if (c.productMode === 'BASIC') { c.tags = {}; c.oneLinkDeclared = false; }
      draft.step = 'marketplaces';
    } else if (action === 'marketplaces' && i.isStringSelectMenu()) {
      this.setup.requireStep(draft, 'marketplaces');
      if (!i.values.length || i.values.length > 3 || i.values.some(m => !Object.hasOwn(MARKETPLACES, m))) throw new UserInputError('Choose supported marketplaces.');
      c.marketplaces = i.values as MarketplaceCode[];
      draft.step = c.productMode === 'AFFILIATE' ? 'tags' : 'channels';
    } else if (action === 'open_tags' && i.isButton()) {
      this.setup.requireStep(draft, 'tags');
      return i.showModal(new ModalBuilder().setCustomId(`amazon:setup:${id}:tags`).setTitle('Marketplace tracking IDs').addComponents(...c.marketplaces.map(m => new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(m).setLabel(`${LABELS[m]} tracking ID`).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)))));
    } else if (action === 'tags' && i.isModalSubmit()) {
      this.setup.requireStep(draft, 'tags');
      const tags = Object.fromEntries(c.marketplaces.map(m => [m, i.fields.getTextInputValue(m).trim()]));
      if (Object.values(tags).some(tag => !/^[A-Za-z0-9][A-Za-z0-9-]{0,96}-\d{2}$/.test(tag))) throw new UserInputError('Enter tracking IDs, such as example-21, not credentials. Restart /amazon setup to try again.');
      c.tags = tags;
      draft.step = 'onelink';
    } else if (['onelink_yes', 'onelink_no'].includes(action) && i.isButton()) {
      this.setup.requireStep(draft, 'onelink'); c.oneLinkDeclared = action === 'onelink_yes'; draft.step = 'channels';
    } else if (action === 'channels' && i.isChannelSelectMenu()) {
      this.setup.requireStep(draft, 'channels'); c.channels = i.values; draft.step = 'behavior';
    } else if (action === 'behavior' && i.isStringSelectMenu()) {
      this.setup.requireStep(draft, 'behavior');
      if (!['OFF', 'REPLY', 'BUTTON'].includes(i.values[0])) throw new UserInputError('Choose a valid link behavior.');
      c.linkMode = i.values[0] as LinkMode; validateSetup(c); draft.step = 'review';
    } else if (action === 'save' && i.isButton()) {
      this.setup.requireStep(draft, 'review'); draft.step = 'saving'; await i.deferUpdate();
      try {
        for (const channel of c.channels) await this.targetChannel(i.guildId!, channel, i.user.id);
        this.repo.saveSetup(i.guildId!, c, draft.data.revision);
        await this.show(i, 'Configuration saved. Use /amazon product to preview a product post, or /amazon settings to inspect your configuration.');
      } finally { this.setup.remove(id); }
      return;
    } else throw new UserInputError('This control is no longer current. Start /amazon setup again.');
    await this.setupView(i, id, draft);
  }
  private productModal(id: string) {
    return new ModalBuilder().setCustomId(`amazon:product:${id}:details`).setTitle('Create a product recommendation').addComponents(...[
      ['url', 'Full Amazon product URL', true, TextInputStyle.Short, 1500],
      ['title', 'Your own title (no live price)', false, TextInputStyle.Short, 120],
      ['note', 'Your own recommendation / disclosure', false, TextInputStyle.Paragraph, 350],
    ].map(([key, label, required, style, max]) => new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(key as string).setLabel(label as string).setRequired(required as boolean).setStyle(style as TextInputStyle).setMaxLength(max as number))));
  }
  private productPayload(guildId: string, data: ProductData) {
    const product = this.links.generate(guildId, data.url);
    const embed = new EmbedBuilder().setTitle(escapeMarkdown(data.title || `Amazon product ${product.asin}`)).setURL(product.url)
      .setDescription(escapeMarkdown(data.note || 'Open Amazon for current product details.'))
      .setFooter({ text: `${LABELS[product.marketplace]} · ASIN ${product.asin} · Community-written, not API-verified` });
    const extra = this.repo.getGuild(guildId).disclosure;
    const content = product.affiliate ? `${DISCLOSURE}${extra ? '\n' + escapeMarkdown(extra.slice(0, 400)) : ''}` : 'Product recommendation · No affiliate tag added by this bot.';
    return { product, payload: { content, embeds: [embed], components: [buttons(link(product.url, 'View on Amazon'))], allowedMentions: NO_MENTIONS } };
  }
  private async productAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    const draft = this.products.get(id, i.guildId!, i.user.id);
    if (draft.step === 'posting') throw new UserInputError('This post is already being sent. Check the selected channel before retrying.');
    if (action === 'cancel') { this.products.remove(id); return this.show(i, 'Cancelled. No product was posted.'); }
    if (action === 'details' && i.isModalSubmit()) {
      this.products.requireStep(draft, 'details');
      draft.data.url = i.fields.getTextInputValue('url').trim(); draft.data.title = i.fields.getTextInputValue('title').trim(); draft.data.note = i.fields.getTextInputValue('note').trim();
      this.links.generate(i.guildId!, draft.data.url);
      draft.step = 'channel';
      return this.show(i, '**Choose a configured product channel**\nYour post will be previewed before anything is published.', [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId(`amazon:product:${id}:channel`).setChannelTypes(ChannelType.GuildText).setPlaceholder('Select a configured channel')), buttons(button(`amazon:product:${id}:cancel`, 'Cancel', ButtonStyle.Danger))]);
    }
    if (action === 'channel' && i.isChannelSelectMenu()) {
      this.products.requireStep(draft, 'channel');
      if (!this.repo.isLinkChannel(i.guildId!, i.values[0])) throw new UserInputError('This channel is not configured. Run /amazon setup first.');
      draft.step = 'checking'; await i.deferUpdate();
      await this.targetChannel(i.guildId!, i.values[0], i.user.id);
      draft.data.channel = i.values[0];
      const { payload } = this.productPayload(i.guildId!, draft.data);
      draft.step = 'review';
      return this.show(i, `**Preview — not published**\nTarget: <#${draft.data.channel}>\n\n${payload.content}`, [...payload.components, buttons(button(`amazon:product:${id}:post`, 'Publish product', ButtonStyle.Success), button(`amazon:product:${id}:cancel`, 'Cancel', ButtonStyle.Danger))], payload.embeds);
    }
    if (action === 'post' && i.isButton()) {
      this.products.requireStep(draft, 'review'); draft.step = 'posting'; await i.deferUpdate();
      try {
        const channel = await this.targetChannel(i.guildId!, draft.data.channel!, i.user.id);
        if (this.repo.getGuild(i.guildId!).revision !== draft.data.revision || !this.repo.isLinkChannel(i.guildId!, channel.id)) throw new UserInputError('Settings changed. Start /amazon product again to review the updated link.');
        const { product, payload } = this.productPayload(i.guildId!, draft.data);
        if (!this.deliveries.reserve(i.guildId!, `manual:${id}`, channel.id, product.canonicalUrl)) throw new UserInputError('This post already has a delivery attempt. Check the channel before retrying.');
        try {
          const message = await channel.send(payload);
          this.deliveries.sent(i.guildId!, `manual:${id}`, message.id);
        } catch {
          this.deliveries.unknown(i.guildId!, `manual:${id}`);
          throw new UserInputError('Delivery could not be confirmed. Check the target channel before trying again; the bot will not automatically resend.');
        }
        await this.show(i, `Product published in <#${channel.id}>.`);
      } finally { this.products.remove(id); }
      return;
    }
    throw new UserInputError('This control is no longer current. Run /amazon product again.');
  }
  private async targetChannel(guildId: string, channelId: string, userId?: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) throw new UserInputError('Choose a text channel in this server.');
    const me = await channel.guild.members.fetchMe();
    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory])) throw new UserInputError('The bot needs View Channel, Send Messages, Embed Links and Read Message History in the target channel.');
    if (userId) {
      const member = await channel.guild.members.fetch(userId);
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) || !channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new UserInputError('You need Manage Server and access to write in this channel.');
    }
    return channel;
  }
  private async onMessage(m: Message) {
    if (m.author.bot || m.webhookId || !m.guildId || !this.repo.isLinkChannel(m.guildId, m.channelId)) return;
    const mode = this.repo.getGuild(m.guildId).link_mode;
    if (mode === 'OFF') return;
    for (const raw of (m.content.match(/https?:\/\/[^\s<>]+/g) ?? []).slice(0, 10)) {
      let result: ReturnType<ProductLinkService['generate']>;
      try { result = this.links.generate(m.guildId, raw.replace(/[),.!?;]+$/, '')); } catch (e) { if (e instanceof UserInputError) continue; throw e; }
      await this.targetChannel(m.guildId, m.channelId);
      // Settings may change during permission fetching; re-read before publication.
      if (!this.repo.isLinkChannel(m.guildId, m.channelId) || this.repo.getGuild(m.guildId).link_mode !== mode) return;
      result = this.links.generate(m.guildId, raw.replace(/[),.!?;]+$/, ''));
      if (!this.deliveries.reserve(m.guildId, `auto:${m.id}`, m.channelId, result.canonicalUrl, 60_000)) return;
      try {
        const content = `${result.affiliate ? DISCLOSURE : 'Amazon product link · No affiliate tag added.'}${mode === 'REPLY' ? `\n<${result.url}>` : ''}`;
        const reply = await m.reply({ content, components: mode === 'BUTTON' ? [buttons(link(result.url, 'View on Amazon'))] : [], allowedMentions: NO_MENTIONS });
        this.deliveries.sent(m.guildId, `auto:${m.id}`, reply.id);
      } catch { this.deliveries.unknown(m.guildId, `auto:${m.id}`); console.warn(JSON.stringify({ event: 'link_delivery_unknown', guildId: m.guildId, channelId: m.channelId })); }
      return; // At most one bot reply per source message.
    }
  }
}

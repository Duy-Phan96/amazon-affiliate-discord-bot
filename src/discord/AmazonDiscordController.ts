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
import { hasAffiliateTag } from '../services/MessageLinkPolicy.js';
import { UserInputError, validateSetup } from '../services/SetupValidation.js';
import { listAmazonPrograms, getAmazonProgram, type AmazonProgramKey } from '../programs/AmazonProgramCatalog.js';
import { AmazonProgramLinkService } from '../services/AmazonProgramLinkService.js';
import { ProgramTemplateRenderer } from '../services/ProgramTemplateRenderer.js';
import { AmazonProgramTemplateRepository, type AmazonProgramTemplateRow } from '../repositories/AmazonProgramTemplateRepository.js';

type UI = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;
type SetupData = { config: SetupConfig; revision: number };
type ProductData = { url: string; title: string; note: string; channel?: string; revision: number };
type ProgramPostData = { programKey: AmazonProgramKey; body: string; templateName: string; channel?: string; revision: number; templateId?: number };
const LABELS = { DE: 'Amazon.de', US: 'Amazon.com', UK: 'Amazon.co.uk' };
const ONE_LINK = 'https://affiliate-program.amazon.com/help/node/topic/GKHRXG4YEJBTCAFC';
const DISCLOSURE_GUIDE = 'https://partnernet.amazon.de/help/node/topic/GHQNZAU6669EZS98';
const DISCLOSURE = 'Anzeige / Ad · Affiliate link\nAs an Amazon Associate I earn from qualifying purchases.\nAls Amazon-Partner verdiene ich an qualifizierten Verkäufen.';
const NO_MENTIONS = { parse: [] as never[], repliedUser: false };
const buttons = (...items: ButtonBuilder[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(...items);
const button = (id: string, text: string, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(text).setStyle(style);
const link = (url: string, text: string) => new ButtonBuilder().setURL(url).setLabel(text).setStyle(ButtonStyle.Link);

export class AmazonDiscordController {
  private setup = new DraftStore<SetupData>();
  private products = new DraftStore<ProductData>();
  private programPosts = new DraftStore<ProgramPostData>();
  private links: ProductLinkService;
  private programLinks: AmazonProgramLinkService;
  private programRenderer = new ProgramTemplateRenderer();
  constructor(
    private client: Client,
    private repo: ConfigRepository,
    private deliveries: DeliveryRepository,
    private allowedGuildId?: string,
    private templates?: AmazonProgramTemplateRepository,
  ) {
    this.links = new ProductLinkService(repo);
    this.programLinks = new AmazonProgramLinkService(repo);
  }
  register() {
    this.client.on(Events.InteractionCreate, i => { void this.handle(i).catch(() => console.warn(JSON.stringify({ event: 'interaction_response_failed' }))); });
    this.client.on(Events.MessageCreate, m => { void this.onMessage(m).catch(() => console.warn(JSON.stringify({ event: 'automatic_link_failed' }))); });
  }
  private async show(i: UI, content: string, components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [], embeds: EmbedBuilder[] = []) {
    const payload = { content, components, embeds, allowedMentions: NO_MENTIONS };
    if (i.deferred || i.replied) await i.editReply(payload);
    else if (i.isMessageComponent()) await i.update(payload);
    else if (i.isModalSubmit() && i.isFromMessage()) await i.update(payload);
    else await i.reply({ ...payload, ephemeral: true });
  }
  private async handle(i: Interaction) {
    if (!(i.isChatInputCommand() || i.isMessageComponent() || i.isModalSubmit())) return;
    if (i.isChatInputCommand() ? i.commandName !== 'amazon' : !i.customId.startsWith('amazon:')) return;
    if (this.allowedGuildId && i.guildId !== this.allowedGuildId) return;
    try {
      if (!i.guildId || !i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new UserInputError('Use this in a server where you have Manage Server permission.');
      if (i.isChatInputCommand()) return await this.command(i);
      const [, kind, id, action] = i.customId.split(':');
      if (kind === 'setup') await this.setupAction(i, id, action);
      else if (kind === 'product') await this.productAction(i, id, action);
      else if (kind === 'programs') await this.programsAction(i, id, action);
      else if (kind === 'programpost') await this.programPostAction(i, id, action);
      else if (kind === 'template') await this.templateAction(i, id, action);
      else if (kind === 'templateedit') await this.templateEditAction(i, id, action);
      else throw new UserInputError('This is an old control. Start the relevant /amazon command again.');
    } catch (error) {
      const content = error instanceof UserInputError ? error.message : 'The action could not be completed. Check the bot permissions and start the command again.';
      // Never dump an exception: Discord errors can contain request bodies/tokens.
      if (!(error instanceof UserInputError)) console.warn(JSON.stringify({ event: 'amazon_action_failed', guildId: i.guildId }));
      if (i.deferred || i.replied) await i.editReply({ content, components: [], embeds: [], allowedMentions: NO_MENTIONS });
      else if (i.isModalSubmit() && i.isFromMessage()) await i.update({ content, components: [], embeds: [], allowedMentions: NO_MENTIONS });
      else await i.reply({ content, ephemeral: true, allowedMentions: NO_MENTIONS });
    }
  }
  private async command(i: ChatInputCommandInteraction) {
    const guildId = i.guildId!;
    const sub = i.options.getSubcommand();
    if (sub === 'link') {
      const result = this.links.generate(guildId, i.options.getString('url', true).trim());
      const oneLink = this.repo.listMarketplaces(guildId).some(m => m.marketplace === result.marketplace && m.enabled && m.onelink_enabled);
      const content = `**${result.affiliate ? 'Your affiliate link' : 'Your product link'} — only visible to you**\n<${result.url}>\n\n${result.affiliate ? DISCLOSURE : 'Basic mode: no affiliate tag added.'}\n\nSource: ${LABELS[result.marketplace]} · ASIN ${result.asin}\n${oneLink && result.affiliate ? 'OneLink: declared by you; redirection and commission are not verified.' : 'OneLink is not required to generate this link.'}\n\nCopy the link together with its disclosure, or use /amazon product for a reviewed channel post. No public message was sent.`;
      return this.show(i, content, [buttons(link(result.url, 'Open on Amazon'), link(ONE_LINK, 'OneLink guide'))]);
    }
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
    if (sub === 'programs') return this.programsHome(i);
    if (sub === 'guide') return this.show(i, '**Affiliate links — no product API needed**\nUse /amazon link url:<full product URL> to get your link privately. Use /amazon product for a preview before a public post. With BUTTON or REPLY enabled, new untagged Amazon links in configured channels receive a bot reply automatically. Already-tagged links are skipped automatically.\n\nAffiliate mode uses your real ID for each original marketplace. Basic mode remains available without a partner account. Only full DE/US/UK product URLs are supported; expand amzn.to / amzn.eu links yourself. A product name alone is not a product lookup.\n\nOneLink is optional and configured with Amazon. A saved declaration does not verify Discord redirection or account approval. No live prices, pictures or deals are fetched. Check that your actual Discord/site usage is accepted by Amazon and provide the separate account/site disclosure.', [buttons(link(ONE_LINK, 'Amazon OneLink guide'), link(DISCLOSURE_GUIDE, 'Why disclose affiliate links?'))]);
    const g = this.repo.getGuild(guildId);
    const markets = this.repo.listMarketplaces(guildId).filter(m => m.enabled);
    const channels = this.repo.listLinkChannels(guildId);
    const programReady = (() => { try { this.programLinks.generate(guildId, 'amazon_visa'); return true; } catch { return false; } })();
    const activeTemplates = this.templates?.activeCount(guildId) ?? 0;
    const content = `**Amazon ${sub === 'status' ? 'Status' : 'Settings'}**\nMode: ${g.product_mode}\nLink behavior: ${g.link_mode}\nMarketplaces: ${markets.map(m => LABELS[m.marketplace]).join(', ') || 'Not configured'}\nChannels: ${channels.map(c => `<#${c.channel_id}>`).join(', ') || 'Not configured'}\nOneLink: ${markets.some(m => m.onelink_enabled) ? 'Optional Amazon-side setup declared by operator' : 'Optional · not configured'}\nAmazon Programs: ${programReady ? '3 available' : 'Requires Amazon.de Affiliate tracking ID'}\nProgram templates: ${activeTemplates} active\nServer scope: ${this.allowedGuildId ? 'Restricted to this test server' : 'Configured servers'}\n\nAPI access is not required for this version.\nUnresolved delivery attempts: ${this.deliveries.unresolved(guildId)}\nUse /amazon setup to edit, /amazon link for a private product link, /amazon product for a product post, or /amazon programs for Amazon program posts.`;
    return this.show(i, content, [buttons(link(ONE_LINK, 'OneLink setup'), link(DISCLOSURE_GUIDE, 'Disclosure guide'))]);
  }
  private async setupView(i: UI, id: string, draft: Draft<SetupData>) {
    const c = draft.data.config;
    const key = (action: string) => `amazon:setup:${id}:${action}`;
    const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    let content = '';
    if (draft.step === 'mode') {
      content = '**Step 1 / 6 — What do you need?**\nAffiliate: turn product URLs into your own affiliate links. No product API is needed.\nBasic: share products without tracking or an Associates account.\nNothing changes until you review and save.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('mode')).setPlaceholder('Choose Affiliate or Basic').addOptions({ label: 'Affiliate — my tracking IDs', value: 'AFFILIATE' }, { label: 'Basic — no partner account', value: 'BASIC' })));
    } else if (draft.step === 'marketplaces') {
      content = '**Step 2 / 6 — Choose marketplaces**\nOnly select the stores you intend to use. Product domains are never swapped. This release supports DE, US and UK.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('marketplaces')).setPlaceholder('Select marketplaces').setMinValues(1).setMaxValues(3).addOptions(...Object.keys(MARKETPLACES).map(code => ({ label: LABELS[code as MarketplaceCode], value: code, default: c.marketplaces.includes(code as MarketplaceCode) })))));
    } else if (draft.step === 'tags') {
      content = '**Step 2 / 6 — Your tracking IDs**\nEnter the actual ID for each chosen store. Never change an ID suffix to invent a foreign ID. Do not enter API credentials.';
      rows.push(buttons(button(key('open_tags'), 'Enter tracking IDs', ButtonStyle.Primary)));
    } else if (draft.step === 'onelink') {
      content = '**Step 3 / 6 — OneLink (optional information)**\nOneLink is configured in Amazon PartnerNet, not in this bot. It is not required for product or program links. You can use individual marketplace tracking IDs without it.';
      rows.push(buttons(button(key('onelink_yes'), 'I use OneLink (optional)'), button(key('onelink_no'), 'Skip OneLink'), link(ONE_LINK, 'Open OneLink guide')));
    } else if (draft.step === 'channels') {
      content = '**Step 4 / 6 — Product channels**\nChoose 1–5 text channels for manual posts and optional automatic link replies. Discord shows channels in one flat picker here, without category headers such as MARKETPLACE. If you started setup inside the channel you want, use **Use this channel**.';
      rows.push(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId(key('channels')).setPlaceholder('Choose product channels').setChannelTypes(ChannelType.GuildText).setMinValues(1).setMaxValues(5)));
      rows.push(buttons(button(key('current_channel'), 'Use this channel', ButtonStyle.Primary)));
    } else if (draft.step === 'behavior') {
      content = '**Step 5 / 6 — Automatic link replies**\nButtons or replies operate only in your selected channels. Off still allows private link generation and reviewed manual posts. Already-tagged links are skipped automatically. Original member messages stay untouched.';
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(key('behavior')).setPlaceholder('Choose behavior').addOptions({ label: 'Off — manual posts only', value: 'OFF' }, { label: 'Compact Amazon button', value: 'BUTTON' }, { label: 'Reply with affiliate / product link', value: 'REPLY' })));
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
    } else if (action === 'current_channel' && i.isButton()) {
      this.setup.requireStep(draft, 'channels');
      if (!i.channelId) throw new UserInputError('Run /amazon setup inside the text channel you want to use, or choose a channel from the picker.');
      await this.targetChannel(i.guildId!, i.channelId, i.user.id);
      c.channels = [i.channelId];
      draft.step = 'behavior';
    } else if (action === 'behavior' && i.isStringSelectMenu()) {
      this.setup.requireStep(draft, 'behavior');
      if (!['OFF', 'REPLY', 'BUTTON'].includes(i.values[0])) throw new UserInputError('Choose a valid link behavior.');
      c.linkMode = i.values[0] as LinkMode; validateSetup(c); draft.step = 'review';
    } else if (action === 'save' && i.isButton()) {
      this.setup.requireStep(draft, 'review'); draft.step = 'saving'; await i.deferUpdate();
      try {
        for (const channel of c.channels) await this.targetChannel(i.guildId!, channel, i.user.id);
        this.repo.saveSetup(i.guildId!, c, draft.data.revision);
        await this.show(i, 'Configuration saved. Use /amazon link to generate your link, /amazon product to preview a public post, or /amazon settings to inspect your configuration.');
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

  private requireTemplates(): AmazonProgramTemplateRepository {
    if (!this.templates) throw new UserInputError('Program templates are not available in this runtime.');
    return this.templates;
  }

  private async programsHome(i: UI) {
    const rows = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('amazon:programs:catalog:select')
        .setPlaceholder('Choose an Amazon program')
        .addOptions(...listAmazonPrograms().map(program => ({
          label: program.title,
          value: program.key,
          description: 'Amazon.de affiliate program',
        })))
    );
    const templates = this.templates?.activeCount(i.guildId!) ?? 0;
    return this.show(i,
      `**Amazon Programs**\nChoose a saved Amazon promotion. Program links use your current Amazon.de tracking ID. No Creators API is required.\n\nTemplates: ${templates} active\nOneLink is optional and separate from program-link generation.`,
      [rows, buttons(link(ONE_LINK, 'Optional OneLink guide'))],
    );
  }

  private async programView(i: UI, key: AmazonProgramKey) {
    const program = getAmazonProgram(key);
    let status = '⚠ Missing Affiliate setup';
    try { this.programLinks.generate(i.guildId!, key); status = '✅ Ready'; } catch { /* display status only */ }
    return this.show(i,
      `**${program.title}**\nMarketplace: Amazon.de\nTracking ID: ${status}\nAffiliate link: ${status}\n\nPayouts and eligibility are controlled by Amazon and are intentionally not stored as fixed bot data.`,
      [
        buttons(
          button(`amazon:programs:${key}:create`, 'Create Post', ButtonStyle.Primary),
          button(`amazon:programs:${key}:link`, 'Show Affiliate Link'),
          link(program.officialInfoUrl, 'Official Amazon Info'),
        ),
        buttons(
          button(`amazon:programs:${key}:templates`, 'Templates'),
          button('amazon:programs:catalog:home', 'Back'),
        ),
      ],
    );
  }

  private async programsAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    if (id === 'catalog' && action === 'home') return this.programsHome(i);
    if (id === 'catalog' && action === 'select' && i.isStringSelectMenu()) {
      return this.programView(i, i.values[0] as AmazonProgramKey);
    }
    if (id === 'templates' && action === 'select' && i.isStringSelectMenu()) {
      const row = this.requireTemplates().get(i.guildId!, Number(i.values[0]));
      return this.templateView(i, row);
    }
    if (!Object.hasOwn(Object.fromEntries(listAmazonPrograms().map(p => [p.key, true])), id)) throw new UserInputError('Unknown Amazon program.');
    const key = id as AmazonProgramKey;
    if (action === 'link') {
      const result = this.programLinks.generate(i.guildId!, key);
      return this.show(i,
        `**${result.programName} Affiliate Link — only visible to you**\n<${result.affiliateUrl}>\n\nThis uses the current saved Amazon.de tracking ID. OneLink is not required.`,
        [buttons(link(result.affiliateUrl, 'Open Amazon'), link(result.officialInfoUrl, 'Official Amazon Info'), button(`amazon:programs:${key}:back`, 'Back'))],
      );
    }
    if (action === 'back') return this.programView(i, key);
    if (action === 'create' && i.isButton()) {
      const draftId = i.id;
      this.programPosts.create(draftId, i.guildId!, i.user.id, 'details', {
        programKey: key, body: '', templateName: '', revision: this.repo.getGuild(i.guildId!).revision,
      });
      return i.showModal(this.programPostModal(draftId, key));
    }
    if (action === 'templates') return this.programTemplatesView(i);
    throw new UserInputError('This program control is no longer current.');
  }

  private programPostModal(id: string, key: AmazonProgramKey, body = '', name = '') {
    const program = getAmazonProgram(key);
    const bodyInput = new TextInputBuilder()
      .setCustomId('body').setLabel('Post text · {affiliate_link} / {program_name}')
      .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500)
      .setPlaceholder('**{program_name}**\n\n👉 {affiliate_link}\n\n#Anzeige');
    if (body) bodyInput.setValue(body.slice(0, 1500));
    const nameInput = new TextInputBuilder()
      .setCustomId('name').setLabel('Template name (optional)')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80);
    if (name) nameInput.setValue(name.slice(0, 80));
    return new ModalBuilder().setCustomId(`amazon:programpost:${id}:details`).setTitle(program.title)
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(bodyInput), new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
  }

  private async programChannelView(i: UI, id: string) {
    return this.show(i, '**Choose a configured Amazon channel**\nThe program post will be previewed before publication.', [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder().setCustomId(`amazon:programpost:${id}:channel`).setChannelTypes(ChannelType.GuildText).setPlaceholder('Select configured channel')
      ),
      buttons(button(`amazon:programpost:${id}:edit`, 'Edit Post'), button(`amazon:programpost:${id}:cancel`, 'Cancel', ButtonStyle.Danger)),
    ]);
  }

  private renderProgramDraft(guildId: string, data: ProgramPostData) {
    const linkResult = this.programLinks.generate(guildId, data.programKey);
    return {
      linkResult,
      content: this.programRenderer.render(data.body, { affiliateLink: linkResult.affiliateUrl, programName: linkResult.programName }),
    };
  }

  private async programPreview(i: UI, id: string, prefix = '') {
    const draft = this.programPosts.get(id, i.guildId!, i.user.id);
    if (this.repo.getGuild(i.guildId!).revision !== draft.data.revision) {
      throw new UserInputError('Settings changed. Start the program post again so the current tracking ID and channel can be reviewed.');
    }
    const rendered = this.renderProgramDraft(i.guildId!, draft.data);
    const rows = [
      buttons(
        button(`amazon:programpost:${id}:publish`, 'Publish', ButtonStyle.Success),
        button(`amazon:programpost:${id}:save`, 'Save Template'),
        button(`amazon:programpost:${id}:edit`, 'Edit Post'),
      ),
      buttons(button(`amazon:programpost:${id}:back`, 'Back'), button(`amazon:programpost:${id}:cancel`, 'Cancel', ButtonStyle.Danger)),
    ];
    return this.show(i, `${prefix}**Preview — not published**\nProgram: ${rendered.linkResult.programName}\nTarget: <#${draft.data.channel}>\n\n${rendered.content}`, rows);
  }

  private async programPostAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    const draft = this.programPosts.get(id, i.guildId!, i.user.id);
    if (draft.step === 'posting') throw new UserInputError('This post is already being sent. Check the selected channel before retrying.');
    if (action === 'cancel') { this.programPosts.remove(id); return this.show(i, 'Cancelled. No program post was published.'); }
    if (action === 'details' && i.isModalSubmit()) {
      draft.data.body = i.fields.getTextInputValue('body').trim();
      draft.data.templateName = i.fields.getTextInputValue('name').trim();
      this.programRenderer.validate(draft.data.body);
      draft.step = 'channel';
      return this.programChannelView(i, id);
    }
    if (action === 'edit' && i.isButton()) return i.showModal(this.programPostModal(id, draft.data.programKey, draft.data.body, draft.data.templateName));
    if (action === 'back' && i.isButton()) { draft.step = 'channel'; return this.programChannelView(i, id); }
    if (action === 'channel' && i.isChannelSelectMenu()) {
      if (!this.repo.isLinkChannel(i.guildId!, i.values[0])) throw new UserInputError('This channel is not configured. Run /amazon setup first.');
      await i.deferUpdate();
      await this.targetChannel(i.guildId!, i.values[0], i.user.id);
      draft.data.channel = i.values[0];
      draft.step = 'review';
      return this.programPreview(i, id);
    }
    if (action === 'save' && i.isButton()) {
      if (draft.step !== 'review') throw new UserInputError('Review the post before saving a template.');
      const repo = this.requireTemplates();
      const name = draft.data.templateName || `${getAmazonProgram(draft.data.programKey).title} template`;
      if (draft.data.templateId) repo.update(i.guildId!, draft.data.templateId, { name, body: draft.data.body, channelId: draft.data.channel });
      else {
        const saved = repo.create(i.guildId!, { name, programKey: draft.data.programKey, channelId: draft.data.channel, body: draft.data.body, createdBy: i.user.id });
        draft.data.templateId = saved.id;
      }
      return this.programPreview(i, id, '✅ Template saved.\n\n');
    }
    if (action === 'publish' && i.isButton()) {
      if (draft.step !== 'review') throw new UserInputError('Review the post before publishing.');
      draft.step = 'posting';
      await i.deferUpdate();
      try {
        const channel = await this.targetChannel(i.guildId!, draft.data.channel!, i.user.id);
        if (this.repo.getGuild(i.guildId!).revision !== draft.data.revision || !this.repo.isLinkChannel(i.guildId!, channel.id)) {
          throw new UserInputError('Settings changed. Start the program post again so the link and channel can be reviewed.');
        }
        const rendered = this.renderProgramDraft(i.guildId!, draft.data);
        const eventId = `program:${id}`;
        if (!this.deliveries.reserve(i.guildId!, eventId, channel.id, `program:${draft.data.programKey}`)) {
          throw new UserInputError('This program post already has a delivery attempt. Check the channel before retrying.');
        }
        try {
          const message = await channel.send({ content: rendered.content, allowedMentions: NO_MENTIONS });
          this.deliveries.sent(i.guildId!, eventId, message.id);
        } catch {
          this.deliveries.unknown(i.guildId!, eventId);
          throw new UserInputError('Delivery could not be confirmed. Check the target channel; the bot will not automatically resend.');
        }
        await this.show(i, `${rendered.linkResult.programName} published in <#${channel.id}>.`);
      } finally { this.programPosts.remove(id); }
      return;
    }
    throw new UserInputError('This program post control is no longer current.');
  }

  private async programTemplatesView(i: UI) {
    const rows = this.requireTemplates().list(i.guildId!);
    if (!rows.length) return this.show(i, '**Amazon Program Templates**\nNo templates saved yet.', [buttons(button('amazon:programs:catalog:home', 'Back'))]);
    const select = new StringSelectMenuBuilder().setCustomId('amazon:programs:templates:select').setPlaceholder('Choose template')
      .addOptions(...rows.slice(0, 25).map(row => ({ label: row.name.slice(0, 100), value: String(row.id), description: `${getAmazonProgram(row.program_key as AmazonProgramKey).title} · ${row.enabled ? 'Enabled' : 'Disabled'}` })));
    return this.show(i, `**Amazon Program Templates**\n${rows.length} saved. Select one to use or manage it.`, [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      buttons(button('amazon:programs:catalog:home', 'Back')),
    ]);
  }

  private async templateView(i: UI, row: AmazonProgramTemplateRow) {
    const program = getAmazonProgram(row.program_key as AmazonProgramKey);
    return this.show(i,
      `**${row.name}**\nProgram: ${program.title}\nChannel: ${row.channel_id ? `<#${row.channel_id}>` : 'Choose when used'}\nStatus: ${row.enabled ? 'Enabled' : 'Disabled'}\n\nStored templates keep placeholders, not generated affiliate URLs.`,
      [
        buttons(
          button(`amazon:template:${row.id}:use`, 'Use', ButtonStyle.Primary),
          button(`amazon:template:${row.id}:edit`, 'Edit'),
          button(`amazon:template:${row.id}:toggle`, row.enabled ? 'Disable' : 'Enable'),
        ),
        buttons(button(`amazon:template:${row.id}:delete`, 'Delete', ButtonStyle.Danger), button('amazon:programs:catalog:home', 'Back')),
      ],
    );
  }

  private async templateAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    const repo = this.requireTemplates();
    const templateId = Number(id);
    if (!Number.isSafeInteger(templateId) || templateId <= 0) throw new UserInputError('Invalid template.');
    const row = repo.get(i.guildId!, templateId);
    if (action === 'use') {
      if (!row.enabled) throw new UserInputError('Enable this template before using it.');
      const draftId = i.id;
      const draft = this.programPosts.create(draftId, i.guildId!, i.user.id, 'channel', {
        programKey: row.program_key as AmazonProgramKey, body: row.body, templateName: row.name,
        channel: row.channel_id ?? undefined, revision: this.repo.getGuild(i.guildId!).revision, templateId: row.id,
      });
      if (draft.data.channel && this.repo.isLinkChannel(i.guildId!, draft.data.channel)) {
        await this.targetChannel(i.guildId!, draft.data.channel, i.user.id);
        draft.step = 'review';
        return this.programPreview(i, draftId);
      }
      return this.programChannelView(i, draftId);
    }
    if (action === 'edit' && i.isButton()) {
      const body = new TextInputBuilder().setCustomId('body').setLabel('Template text').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500).setValue(row.body.slice(0,1500));
      const name = new TextInputBuilder().setCustomId('name').setLabel('Template name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setValue(row.name.slice(0,80));
      return i.showModal(new ModalBuilder().setCustomId(`amazon:templateedit:${row.id}:save`).setTitle('Edit program template')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(body), new ActionRowBuilder<TextInputBuilder>().addComponents(name)));
    }
    if (action === 'toggle') {
      return this.templateView(i, repo.setEnabled(i.guildId!, row.id, !row.enabled));
    }
    if (action === 'delete') {
      return this.show(i, `**Delete template “${escapeMarkdown(row.name)}”?**\nThis removes the saved template only. It does not delete previously posted Discord messages.`, [
        buttons(button(`amazon:template:${row.id}:confirmdelete`, 'Delete permanently', ButtonStyle.Danger), button(`amazon:template:${row.id}:back`, 'Cancel')),
      ]);
    }
    if (action === 'confirmdelete') {
      repo.delete(i.guildId!, row.id);
      return this.show(i, 'Template deleted.', [buttons(button('amazon:programs:catalog:home', 'Back to Programs'))]);
    }
    if (action === 'back') return this.templateView(i, row);
    throw new UserInputError('This template control is no longer current.');
  }

  private async templateEditAction(i: MessageComponentInteraction | ModalSubmitInteraction, id: string, action: string) {
    if (action !== 'save' || !i.isModalSubmit()) throw new UserInputError('This template edit is no longer current.');
    const repo = this.requireTemplates();
    const templateId = Number(id);
    const body = i.fields.getTextInputValue('body').trim();
    const name = i.fields.getTextInputValue('name').trim();
    this.programRenderer.validate(body);
    const current = repo.get(i.guildId!, templateId);
    return this.templateView(i, repo.update(i.guildId!, templateId, { name, body, channelId: current.channel_id }));
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
    if (this.allowedGuildId && m.guildId !== this.allowedGuildId) return;
    if (m.author.bot || m.webhookId || !m.guildId || !this.repo.isLinkChannel(m.guildId, m.channelId)) return;
    const mode = this.repo.getGuild(m.guildId).link_mode;
    if (mode === 'OFF') return;
    for (const raw of (m.content.match(/https?:\/\/[^\s<>]+/g) ?? []).slice(0, 10)) {
      const input = raw.replace(/[),.!?;]+$/, '');
      // Do not automatically take over another publisher's attribution or repost our own tagged links.
      if (hasAffiliateTag(input)) continue;
      let result: ReturnType<ProductLinkService['generate']>;
      try { result = this.links.generate(m.guildId, input); } catch (e) { if (e instanceof UserInputError) continue; throw e; }
      await this.targetChannel(m.guildId, m.channelId);
      // Settings may change during permission fetching; re-read before publication.
      if (!this.repo.isLinkChannel(m.guildId, m.channelId) || this.repo.getGuild(m.guildId).link_mode !== mode) return;
      result = this.links.generate(m.guildId, input);
      if (!this.deliveries.reserve(m.guildId, `auto:${m.id}`, m.channelId, result.canonicalUrl, 60_000)) return;
      try {
        const content = `${result.affiliate ? '**Amazon affiliate link**\n' + DISCLOSURE : 'Amazon product link · No affiliate tag added.'}${mode === 'REPLY' ? `\n<${result.url}>` : ''}`;
        const reply = await m.reply({ content, components: mode === 'BUTTON' ? [buttons(link(result.url, 'View on Amazon'))] : [], allowedMentions: NO_MENTIONS });
        this.deliveries.sent(m.guildId, `auto:${m.id}`, reply.id);
      } catch { this.deliveries.unknown(m.guildId, `auto:${m.id}`); console.warn(JSON.stringify({ event: 'link_delivery_unknown', guildId: m.guildId, channelId: m.channelId })); }
      return;
    }
  }
}

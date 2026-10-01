import {
  ChannelType, PermissionFlagsBits, type Client,
} from 'discord.js';
import { AmazonPostQueueRepository, type AmazonQueueItemRow } from '../repositories/AmazonPostQueueRepository.js';
import { ConfigRepository } from '../repositories/ConfigRepository.js';
import { DeliveryRepository } from '../repositories/DeliveryRepository.js';
import { ProductLinkService } from './ProductLinkService.js';
import { buildQuickProductPresentation } from './ProductUrlPresentation.js';

const DISCLOSURE = 'Anzeige / Ad · Affiliate link\nAs an Amazon Associate I earn from qualifying purchases.\nAls Amazon-Partner verdiene ich an qualifizierten Verkäufen.';
const NO_MENTIONS = { parse: [] as never[], repliedUser: false };

export class AmazonQueueScheduler {
  private timer?: NodeJS.Timeout;
  private running = false;
  private links: ProductLinkService;

  constructor(
    private client: Client,
    private config: ConfigRepository,
    private queues: AmazonPostQueueRepository,
    private deliveries: DeliveryRepository,
    private now = () => Date.now(),
  ) {
    this.links = new ProductLinkService(config);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick(); }, 60_000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const queue of this.queues.dueQueues(this.now())) {
        await this.runQueue(queue.guild_id, false);
      }
    } finally {
      this.running = false;
    }
  }

  async runNow(guildId: string): Promise<'SENT' | 'EMPTY' | 'UNKNOWN'> {
    return this.runQueue(guildId, true);
  }

  private async runQueue(guildId: string, manual: boolean): Promise<'SENT' | 'EMPTY' | 'UNKNOWN'> {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.channel_id) return 'EMPTY';
    const item = this.queues.nextPendingByQueueId(queue.id);
    if (!item) {
      this.queues.scheduleNext(queue.id, null, false);
      return 'EMPTY';
    }

    const channel = await this.client.channels.fetch(queue.channel_id);
    if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) {
      this.queues.markUnknown(item.id);
      this.queues.scheduleNext(queue.id, null, false);
      return 'UNKNOWN';
    }
    const me = await channel.guild.members.fetchMe();
    if (!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      this.queues.markUnknown(item.id);
      this.queues.scheduleNext(queue.id, null, false);
      return 'UNKNOWN';
    }

    let result: ReturnType<ProductLinkService['generate']>;
    try { result = this.links.generate(guildId, item.url); }
    catch {
      this.queues.markUnknown(item.id);
      this.queues.scheduleNext(queue.id, null, false);
      return 'UNKNOWN';
    }

    const eventId = `queue:${item.id}`;
    if (!this.deliveries.reserve(guildId, eventId, channel.id, result.canonicalUrl)) {
      this.queues.markUnknown(item.id);
      this.queues.scheduleNext(queue.id, null, false);
      return 'UNKNOWN';
    }

    const presentation = buildQuickProductPresentation(item.url, item.title, item.body);
    const useEmbed = item.style === 'EMBED' || (item.style === 'AUTO' && (presentation.title !== `Amazon product ${result.asin}` || !!item.body));
    const payload: any = useEmbed
      ? {
          content: result.affiliate ? DISCLOSURE : 'Amazon product link · No affiliate tag added.',
          embeds: [{
            title: presentation.title,
            url: result.url,
            description: presentation.description,
            footer: { text: `ASIN ${result.asin} · No live product data fetched` },
          }],
          components: [{
            type: 1,
            components: [{ type: 2, style: 5, label: 'Open on Amazon', url: result.url }],
          }],
          allowedMentions: NO_MENTIONS,
        }
      : {
          content: `${result.affiliate ? DISCLOSURE : 'Amazon product link · No affiliate tag added.'}\n${presentation.title !== `Amazon product ${result.asin}` ? `**${presentation.title}**\n` : ''}`,
          components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open on Amazon', url: result.url }] }],
          allowedMentions: NO_MENTIONS,
        };

    try {
      const message = await channel.send(payload);
      this.deliveries.sent(guildId, eventId, message.id);
      this.queues.markSent(item.id);
    } catch {
      this.deliveries.unknown(guildId, eventId);
      this.queues.markUnknown(item.id);
      this.queues.scheduleNext(queue.id, null, false);
      return 'UNKNOWN';
    }

    const hasMore = !!this.queues.nextPendingByQueueId(queue.id);
    const stillEnabled = hasMore && queue.enabled === 1;
    const nextRunAt = stillEnabled ? this.now() + queue.interval_hours * 60 * 60 * 1000 : null;
    this.queues.scheduleNext(queue.id, nextRunAt, stillEnabled);
    return 'SENT';
  }
}

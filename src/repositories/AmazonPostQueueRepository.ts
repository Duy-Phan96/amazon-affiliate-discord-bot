import { AppDatabase } from '../persistence/Database.js';
import { UserInputError } from '../services/SetupValidation.js';

export type QueueItemStyle = 'AUTO' | 'BUTTON' | 'EMBED';
export type QueueItemState = 'PENDING' | 'SENT' | 'SKIPPED' | 'UNKNOWN';

export interface AmazonQueueRow {
  id: number;
  guild_id: string;
  channel_id: string | null;
  interval_hours: number;
  enabled: number;
  next_run_at: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AmazonQueueItemRow {
  id: number;
  queue_id: number;
  position: number;
  url: string;
  title: string | null;
  body: string | null;
  style: QueueItemStyle;
  state: QueueItemState;
  created_at: string;
  sent_at: string | null;
}

export class AmazonPostQueueRepository {
  constructor(private database: AppDatabase) {}

  getOrCreate(guildId: string, createdBy: string): AmazonQueueRow {
    const existing = this.database.db.prepare('SELECT * FROM amazon_post_queues WHERE guild_id=?').get(guildId) as AmazonQueueRow | undefined;
    if (existing) return existing;
    const now = new Date().toISOString();
    const result = this.database.db.prepare(
      'INSERT INTO amazon_post_queues(guild_id,channel_id,interval_hours,enabled,next_run_at,created_by,created_at,updated_at) VALUES(?,NULL,24,0,NULL,?,?,?)'
    ).run(guildId, createdBy, now, now);
    return this.getById(Number(result.lastInsertRowid));
  }

  get(guildId: string): AmazonQueueRow | null {
    return (this.database.db.prepare('SELECT * FROM amazon_post_queues WHERE guild_id=?').get(guildId) as AmazonQueueRow | undefined) ?? null;
  }

  private getById(id: number): AmazonQueueRow {
    const row = this.database.db.prepare('SELECT * FROM amazon_post_queues WHERE id=?').get(id) as AmazonQueueRow | undefined;
    if (!row) throw new Error('Queue not found');
    return row;
  }

  configure(guildId: string, createdBy: string, channelId: string, intervalHours: 12 | 24, startAt: number): AmazonQueueRow {
    const queue = this.getOrCreate(guildId, createdBy);
    this.database.db.prepare(
      'UPDATE amazon_post_queues SET channel_id=?,interval_hours=?,enabled=1,next_run_at=?,updated_at=? WHERE id=?'
    ).run(channelId, intervalHours, startAt, new Date().toISOString(), queue.id);
    return this.getById(queue.id);
  }

  pause(guildId: string): AmazonQueueRow {
    const queue = this.get(guildId);
    if (!queue) throw new UserInputError('No Amazon queue exists yet.');
    this.database.db.prepare('UPDATE amazon_post_queues SET enabled=0,updated_at=? WHERE id=?')
      .run(new Date().toISOString(), queue.id);
    return this.getById(queue.id);
  }

  resume(guildId: string, nextRunAt: number): AmazonQueueRow {
    const queue = this.get(guildId);
    if (!queue || !queue.channel_id) throw new UserInputError('Configure the queue with /amazon queue start first.');
    this.database.db.prepare('UPDATE amazon_post_queues SET enabled=1,next_run_at=?,updated_at=? WHERE id=?')
      .run(nextRunAt, new Date().toISOString(), queue.id);
    return this.getById(queue.id);
  }

  scheduleNext(queueId: number, nextRunAt: number | null, enabled: boolean): void {
    this.database.db.prepare('UPDATE amazon_post_queues SET next_run_at=?,enabled=?,updated_at=? WHERE id=?')
      .run(nextRunAt, enabled ? 1 : 0, new Date().toISOString(), queueId);
  }

  add(guildId: string, createdBy: string, input: { url: string; title?: string | null; body?: string | null; style?: QueueItemStyle }): AmazonQueueItemRow {
    const queue = this.getOrCreate(guildId, createdBy);
    const count = (this.database.db.prepare("SELECT count(*) n FROM amazon_post_queue_items WHERE queue_id=? AND state='PENDING'").get(queue.id) as {n:number}).n;
    if (count >= 50) throw new UserInputError('The Amazon queue can hold at most 50 pending posts.');
    const position = ((this.database.db.prepare('SELECT coalesce(max(position),0) p FROM amazon_post_queue_items WHERE queue_id=?').get(queue.id) as {p:number}).p ?? 0) + 1;
    const now = new Date().toISOString();
    const result = this.database.db.prepare(
      "INSERT INTO amazon_post_queue_items(queue_id,position,url,title,body,style,state,created_at,sent_at) VALUES(?,?,?,?,?,?,'PENDING',?,NULL)"
    ).run(queue.id, position, input.url, input.title?.trim() || null, input.body?.trim() || null, input.style ?? 'AUTO', now);
    return this.getItem(guildId, Number(result.lastInsertRowid));
  }

  list(guildId: string): AmazonQueueItemRow[] {
    const queue = this.get(guildId);
    if (!queue) return [];
    return this.database.db.prepare('SELECT * FROM amazon_post_queue_items WHERE queue_id=? ORDER BY position,id').all(queue.id) as AmazonQueueItemRow[];
  }

  pending(guildId: string): AmazonQueueItemRow[] {
    return this.list(guildId).filter(row => row.state === 'PENDING');
  }

  nextPendingByQueueId(queueId: number): AmazonQueueItemRow | null {
    return (this.database.db.prepare("SELECT * FROM amazon_post_queue_items WHERE queue_id=? AND state='PENDING' ORDER BY position,id LIMIT 1").get(queueId) as AmazonQueueItemRow | undefined) ?? null;
  }

  dueQueues(now: number): AmazonQueueRow[] {
    return this.database.db.prepare('SELECT * FROM amazon_post_queues WHERE enabled=1 AND next_run_at IS NOT NULL AND next_run_at<=? ORDER BY next_run_at,id').all(now) as AmazonQueueRow[];
  }

  markSent(itemId: number): void {
    this.database.db.prepare("UPDATE amazon_post_queue_items SET state='SENT',sent_at=? WHERE id=?").run(new Date().toISOString(), itemId);
  }

  markUnknown(itemId: number): void {
    this.database.db.prepare("UPDATE amazon_post_queue_items SET state='UNKNOWN' WHERE id=?").run(itemId);
  }

  skip(guildId: string, itemId: number): void {
    const item = this.getItem(guildId, itemId);
    if (item.state !== 'PENDING') throw new UserInputError('Only pending queue items can be skipped.');
    this.database.db.prepare("UPDATE amazon_post_queue_items SET state='SKIPPED' WHERE id=?").run(item.id);
  }

  remove(guildId: string, itemId: number): void {
    const item = this.getItem(guildId, itemId);
    if (item.state !== 'PENDING') throw new UserInputError('Only pending queue items can be removed.');
    this.database.db.prepare('DELETE FROM amazon_post_queue_items WHERE id=?').run(item.id);
  }

  getItem(guildId: string, itemId: number): AmazonQueueItemRow {
    const row = this.database.db.prepare(
      'SELECT i.* FROM amazon_post_queue_items i JOIN amazon_post_queues q ON q.id=i.queue_id WHERE q.guild_id=? AND i.id=?'
    ).get(guildId, itemId) as AmazonQueueItemRow | undefined;
    if (!row) throw new UserInputError('Queue item not found.');
    return row;
  }
}

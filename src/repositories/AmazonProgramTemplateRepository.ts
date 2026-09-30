import { AppDatabase } from '../persistence/Database.js';
import { UserInputError } from '../services/SetupValidation.js';

export interface AmazonProgramTemplateRow {
  id: number;
  guild_id: string;
  name: string;
  program_key: string;
  channel_id: string | null;
  body: string;
  enabled: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramTemplate {
  name: string;
  programKey: string;
  channelId?: string | null;
  body: string;
  createdBy: string;
}

export class AmazonProgramTemplateRepository {
  constructor(private database: AppDatabase) {}

  list(guildId: string, enabledOnly = false): AmazonProgramTemplateRow[] {
    return this.database.db.prepare(
      `SELECT * FROM amazon_program_templates WHERE guild_id=?${enabledOnly ? ' AND enabled=1' : ''} ORDER BY updated_at DESC,id DESC`
    ).all(guildId) as AmazonProgramTemplateRow[];
  }

  get(guildId: string, id: number): AmazonProgramTemplateRow {
    const row = this.database.db.prepare('SELECT * FROM amazon_program_templates WHERE guild_id=? AND id=?').get(guildId, id) as AmazonProgramTemplateRow | undefined;
    if (!row) throw new UserInputError('Template not found.');
    return row;
  }

  create(guildId: string, input: CreateProgramTemplate): AmazonProgramTemplateRow {
    const now = new Date().toISOString();
    const name = input.name.trim();
    if (!name || name.length > 80) throw new UserInputError('Template name must be 1–80 characters.');
    const result = this.database.db.prepare(
      'INSERT INTO amazon_program_templates(guild_id,name,program_key,channel_id,body,enabled,created_by,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)'
    ).run(guildId, name, input.programKey, input.channelId ?? null, input.body, input.createdBy, now, now);
    return this.get(guildId, Number(result.lastInsertRowid));
  }

  update(guildId: string, id: number, input: { name: string; body: string; channelId?: string | null }): AmazonProgramTemplateRow {
    this.get(guildId, id);
    const name = input.name.trim();
    if (!name || name.length > 80) throw new UserInputError('Template name must be 1–80 characters.');
    this.database.db.prepare(
      'UPDATE amazon_program_templates SET name=?,body=?,channel_id=?,updated_at=? WHERE guild_id=? AND id=?'
    ).run(name, input.body, input.channelId ?? null, new Date().toISOString(), guildId, id);
    return this.get(guildId, id);
  }

  setEnabled(guildId: string, id: number, enabled: boolean): AmazonProgramTemplateRow {
    this.get(guildId, id);
    this.database.db.prepare('UPDATE amazon_program_templates SET enabled=?,updated_at=? WHERE guild_id=? AND id=?')
      .run(enabled ? 1 : 0, new Date().toISOString(), guildId, id);
    return this.get(guildId, id);
  }

  delete(guildId: string, id: number): void {
    this.get(guildId, id);
    this.database.db.prepare('DELETE FROM amazon_program_templates WHERE guild_id=? AND id=?').run(guildId, id);
  }

  activeCount(guildId: string): number {
    return (this.database.db.prepare('SELECT count(*) n FROM amazon_program_templates WHERE guild_id=? AND enabled=1').get(guildId) as { n: number }).n;
  }
}

import { UserInputError } from './SetupValidation.js';
export interface Draft<T> { guildId: string; userId: string; expiresAt: number; step: string; data: T }
/** Ephemeral application drafts only. Restart/expiry cancels a draft, never saves it. */
export class DraftStore<T> {
  private entries = new Map<string, Draft<T>>();
  constructor(private now = () => Date.now(), private ttlMs = 15 * 60_000) {}
  create(id: string, guildId: string, userId: string, step: string, data: T) {
    this.sweep();
    for (const [key, draft] of this.entries) if (draft.guildId === guildId && draft.userId === userId) this.entries.delete(key);
    this.entries.set(id, { guildId, userId, step, data, expiresAt: this.now() + this.ttlMs });
    return this.get(id, guildId, userId);
  }
  get(id: string, guildId: string, userId: string): Draft<T> {
    this.sweep();
    const draft = this.entries.get(id);
    if (!draft || draft.guildId !== guildId || draft.userId !== userId) throw new UserInputError('This form expired or belongs to another user. Start the command again.');
    return draft;
  }
  requireStep(draft: Draft<T>, step: string) {
    if (draft.step !== step) throw new UserInputError('This control is no longer current. Use the latest form or start again.');
  }
  remove(id: string) { this.entries.delete(id); }
  private sweep() { for (const [id, draft] of this.entries) if (draft.expiresAt <= this.now()) this.entries.delete(id); }
}

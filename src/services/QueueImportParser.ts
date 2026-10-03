import { UserInputError } from './SetupValidation.js';

export interface QueueImportPost {
  url: string;
  name?: string;
  markdown: string;
}
export interface QueueImportDocument {
  version: 1;
  interval_hours?: 12 | 24;
  posts: QueueImportPost[];
}

export function parseQueueImportJson(raw: string): QueueImportDocument {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new UserInputError('The uploaded file is not valid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UserInputError('JSON must be an object with a posts array.');
  const obj = value as Record<string, unknown>;
  if (obj.version !== undefined && obj.version !== 1) throw new UserInputError('Unsupported queue JSON version. Use version 1.');
  if (!Array.isArray(obj.posts) || obj.posts.length < 1) throw new UserInputError('JSON must contain at least one post.');
  if (obj.posts.length > 50) throw new UserInputError('A single import can contain at most 50 posts.');
  if (obj.interval_hours !== undefined && obj.interval_hours !== 12 && obj.interval_hours !== 24) {
    throw new UserInputError('interval_hours must be 12 or 24.');
  }
  const posts = obj.posts.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new UserInputError(`Post #${index + 1} is invalid.`);
    const post = entry as Record<string, unknown>;
    const url = typeof post.url === 'string' ? post.url.trim() : '';
    const markdown = typeof post.markdown === 'string' ? post.markdown.trim() : '';
    const name = typeof post.name === 'string' ? post.name.trim() : undefined;
    if (!url || url.length > 1500) throw new UserInputError(`Post #${index + 1} needs a valid url.`);
    if (!markdown || markdown.length > 1600) throw new UserInputError(`Post #${index + 1} needs markdown up to 1600 characters.`);
    if (name && name.length > 80) throw new UserInputError(`Post #${index + 1} name is too long.`);
    return { url, markdown, ...(name ? { name } : {}) };
  });
  return { version: 1, ...(obj.interval_hours ? { interval_hours: obj.interval_hours as 12 | 24 } : {}), posts };
}

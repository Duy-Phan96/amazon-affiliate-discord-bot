import { describe, expect, it } from 'vitest';
import { parseQueueImportJson } from '../src/services/QueueImportParser.js';

describe('queue JSON import', () => {
  it('parses version 1 posts and optional 12h rhythm', () => {
    const doc = parseQueueImportJson(JSON.stringify({
      version: 1,
      interval_hours: 12,
      posts: [
        {
          url: 'https://www.amazon.de/dp/B0ABCDEF12',
          name: 'Gaming Mouse',
          markdown: '**Gaming Mouse**\n👉 {affiliate_link}'
        }
      ]
    }));
    expect(doc.interval_hours).toBe(12);
    expect(doc.posts[0].name).toBe('Gaming Mouse');
  });

  it('rejects invalid rhythm and empty posts', () => {
    expect(() => parseQueueImportJson('{"version":1,"interval_hours":6,"posts":[]}')).toThrow();
  });
});

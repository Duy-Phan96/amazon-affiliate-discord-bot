import { describe, expect, it } from 'vitest';
import { parseQueueImportJson } from '../src/services/QueueImportParser.js';

describe('queue JSON import', () => {
  it('parses version 1 posts and a custom hourly rhythm', () => {
    const doc = parseQueueImportJson(JSON.stringify({
      version: 1,
      interval_hours: 3,
      posts: [
        {
          url: 'https://www.amazon.de/dp/B0ABCDEF12',
          name: 'Gaming Mouse',
          markdown: '**Gaming Mouse**\n👉 {affiliate_link}'
        }
      ]
    }));
    expect(doc.interval_hours).toBe(3);
    expect(doc.posts[0].name).toBe('Gaming Mouse');
  });

  it('rejects invalid rhythms and empty posts', () => {
    expect(() => parseQueueImportJson('{"version":1,"interval_hours":0,"posts":[{"url":"https://www.amazon.de/dp/B0ABCDEF12","markdown":"x"}]}')).toThrow(/1 to 168/);
    expect(() => parseQueueImportJson('{"version":1,"interval_hours":2.5,"posts":[{"url":"https://www.amazon.de/dp/B0ABCDEF12","markdown":"x"}]}')).toThrow(/whole number/);
    expect(() => parseQueueImportJson('{"version":1,"interval_hours":3,"posts":[]}')).toThrow(/at least one post/);
  });
});


it('accepts a 100-post bulk import and rejects 101 posts', () => {
  const post = (index: number) => ({
    url: `https://www.amazon.com/dp/B0${String(index).padStart(8,'0')}`,
    name: `Post ${index}`,
    markdown: `**Post ${index}**\n👉 {affiliate_link}`
  });
  expect(parseQueueImportJson(JSON.stringify({version:1,interval_hours:3,posts:Array.from({length:100},(_,i)=>post(i))})).posts).toHaveLength(100);
  expect(() => parseQueueImportJson(JSON.stringify({version:1,posts:Array.from({length:101},(_,i)=>post(i))}))).toThrow(/100 posts/);
});

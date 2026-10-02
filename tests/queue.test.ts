import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../src/persistence/Database.js';
import { AmazonPostQueueRepository } from '../src/repositories/AmazonPostQueueRepository.js';

describe('Amazon post queue persistence', () => {
  it('keeps ordered pending items and survives repository recreation', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF12'});
      repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF13',style:'BUTTON'});
      expect(repo.pending('g').map(x=>x.position)).toEqual([1,2]);
      const second = new AmazonPostQueueRepository(db);
      expect(second.pending('g')).toHaveLength(2);
    } finally { db.close(); }
  });

  it('supports 12h/24h configuration and restart-safe next_run_at', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      const q = repo.configure('g','admin','123456789012345678',12,123456789);
      expect(q.interval_hours).toBe(12);
      expect(q.next_run_at).toBe(123456789);
      expect(repo.get('g')?.enabled).toBe(1);
    } finally { db.close(); }
  });

  it('remove/skip only affect pending queue items', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      const a=repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF12'});
      const b=repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF13'});
      repo.skip('g',a.id);
      repo.remove('g',b.id);
      expect(repo.list('g').map(x=>x.state)).toEqual(['SKIPPED']);
    } finally { db.close(); }
  });
});


  it('edits title, description and style of pending items', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      const item = repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF12'});
      const updated = repo.update('g', item.id, { title:'Gaming Mouse', body:'My queue description', style:'EMBED' });
      expect(updated.title).toBe('Gaming Mouse');
      expect(updated.body).toBe('My queue description');
      expect(updated.style).toBe('EMBED');
    } finally { db.close(); }
  });

  it('does not allow editing already handled items', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      const item = repo.add('g','admin',{url:'https://www.amazon.de/dp/B0ABCDEF12'});
      repo.skip('g', item.id);
      expect(() => repo.update('g', item.id, { title:'Too late' })).toThrow(/Only pending/);
    } finally { db.close(); }
  });


it('stores custom Markdown queue posts and allows URL edits while pending', () => {
  const db = new AppDatabase(':memory:');
  try {
    const repo = new AmazonPostQueueRepository(db);
    const item = repo.add('g','admin',{
      url:'https://www.amazon.de/dp/B0ABCDEF12',
      title:'Mouse post',
      body:'**Gaming Mouse**\n\n👉 {affiliate_link}',
      style:'MARKDOWN'
    });
    expect(item.style).toBe('MARKDOWN');
    expect(item.body).toContain('{affiliate_link}');
    const updated = repo.update('g', item.id, { url:'https://www.amazon.de/dp/B0ABCDEF13' });
    expect(updated.url).toContain('B0ABCDEF13');
  } finally { db.close(); }
});

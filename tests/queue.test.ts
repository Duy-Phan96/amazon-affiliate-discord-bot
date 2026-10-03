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

  it('supports custom hourly configuration and restart-safe next_run_at', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonPostQueueRepository(db);
      const q = repo.configure('g','admin','123456789012345678',3,123456789);
      expect(q.interval_hours).toBe(3);
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


it('imports multiple pending queue posts atomically through addMany', () => {
  const db = new AppDatabase(':memory:');
  try {
    const repo = new AmazonPostQueueRepository(db);
    const rows = repo.addMany('g','admin',[
      {url:'https://www.amazon.de/dp/B0ABCDEF12',body:'**One** {affiliate_link}',style:'MARKDOWN'},
      {url:'https://www.amazon.de/dp/B0ABCDEF13',body:'**Two** {affiliate_link}',style:'MARKDOWN'}
    ]);
    expect(rows).toHaveLength(2);
    expect(repo.pending('g')).toHaveLength(2);
  } finally { db.close(); }
});


it('accepts custom whole-hour intervals from 1 to 168 and rejects invalid values', () => {
  const db = new AppDatabase(':memory:');
  try {
    const repo = new AmazonPostQueueRepository(db);
    expect(repo.updateSettings('g','admin',null,1).interval_hours).toBe(1);
    expect(repo.updateSettings('g','admin',null,3).interval_hours).toBe(3);
    expect(repo.updateSettings('g','admin',null,168).interval_hours).toBe(168);
    expect(() => repo.updateSettings('g','admin',null,0)).toThrow(/1 to 168/);
    expect(() => repo.updateSettings('g','admin',null,2.5)).toThrow(/whole number/);
    expect(() => repo.updateSettings('g','admin',null,169)).toThrow(/1 to 168/);
  } finally { db.close(); }
});

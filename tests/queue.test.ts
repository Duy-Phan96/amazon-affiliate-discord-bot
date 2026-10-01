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

import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { AppDatabase } from '../src/persistence/Database.js';
import { ConfigRepository } from '../src/repositories/ConfigRepository.js';
import { DeliveryRepository } from '../src/repositories/DeliveryRepository.js';
import { ProductLinkService } from '../src/services/ProductLinkService.js';
import type { SetupConfig } from '../src/domain/config.js';
const a = '123456789012345678'; const b = '123456789012345679';
const config = (): SetupConfig => ({ productMode:'AFFILIATE',marketplaces:['DE'],tags:{DE:'example-21'},oneLinkDeclared:false,channels:[a],linkMode:'BUTTON' });
describe('API-free configuration and deliveries', () => {
  it('new guild defaults to Basic with automatic replies off', () => {
    const db=new AppDatabase(':memory:');try { const repo=new ConfigRepository(db);expect(repo.getGuild('g').product_mode).toBe('BASIC');expect(repo.getGuild('g').link_mode).toBe('OFF'); } finally { db.close(); }
  });
  it('save replaces selection and Basic stops adding tags', () => {
    const db=new AppDatabase(':memory:');try { const repo=new ConfigRepository(db);repo.saveSetup('g',config(),0);
      repo.saveSetup('g',{...config(),productMode:'BASIC',marketplaces:['US'],tags:{},channels:[b]},repo.getGuild('g').revision);
      expect(repo.isMarketplaceEnabled('g','DE')).toBe(false);expect(repo.isMarketplaceEnabled('g','US')).toBe(true);
      expect(repo.getTag('g','US')).toBe(null);expect(repo.isLinkChannel('g',a)).toBe(false);expect(repo.isLinkChannel('g',b)).toBe(true);
    } finally { db.close(); }
  });
  it('stale configuration cannot overwrite a newer save', () => {
    const db=new AppDatabase(':memory:');try { const repo=new ConfigRepository(db);repo.saveSetup('g',config(),0);const before=repo.getGuild('g');
      expect(()=>repo.saveSetup('g',{...config(),channels:[b]},0)).toThrow(/Settings changed/);expect(repo.getGuild('g')).toEqual(before);expect(repo.isLinkChannel('g',a)).toBe(true);
    } finally { db.close(); }
  });
  it('failed write rolls back channel, marketplace and revision changes', () => {
    const db=new AppDatabase(':memory:');try { const repo=new ConfigRepository(db);repo.saveSetup('g',config(),0);const before=repo.getGuild('g');
      const spy=vi.spyOn(repo,'setLinkChannel').mockImplementationOnce(()=>{throw new Error('simulated DB failure')});
      expect(()=>repo.saveSetup('g',{...config(),marketplaces:['US'],tags:{US:'example-20'},channels:[b]},before.revision)).toThrow();spy.mockRestore();
      expect(repo.getGuild('g')).toEqual(before);expect(repo.isMarketplaceEnabled('g','DE')).toBe(true);expect(repo.isLinkChannel('g',a)).toBe(true);
    } finally { db.close(); }
  });
  it('deduplicates an event and applies per-product cooldown', () => {
    const db=new AppDatabase(':memory:');try { let now=1000;const repo=new DeliveryRepository(db,()=>now);
      expect(repo.reserve('g','one',a,'DE/product',60_000)).toBe(true);expect(repo.reserve('g','one',a,'DE/product')).toBe(false);
      expect(repo.reserve('g','two',a,'DE/product',60_000)).toBe(false);expect(repo.reserve('other','one',a,'DE/product',60_000)).toBe(true);
      now+=60_001;expect(repo.reserve('g','two',a,'DE/product',60_000)).toBe(true);
    } finally { db.close(); }
  });
  it('restart retains uncertain attempts instead of resending', () => {
    const directory=mkdtempSync(join(tmpdir(),'amazon-bot-'));const file=join(directory,'state.sqlite');
    try { const first=new AppDatabase(file);new DeliveryRepository(first).reserve('g','event',a,'p');new DeliveryRepository(first).unknown('g','event');first.close();
      const second=new AppDatabase(file);try { const repo=new DeliveryRepository(second);expect(repo.reserve('g','event',a,'p')).toBe(false);expect(repo.unresolved('g')).toBe(1); } finally {second.close();}
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
  it('legacy migration preserves Affiliate mode and can run twice', () => {
    const directory=mkdtempSync(join(tmpdir(),'amazon-legacy-'));const file=join(directory,'state.sqlite');
    try { const legacy=new Database(file);legacy.exec("CREATE TABLE guild_configs(guild_id TEXT PRIMARY KEY,disclosure TEXT NOT NULL DEFAULT '',link_mode TEXT NOT NULL DEFAULT 'OFF',created_at TEXT NOT NULL,updated_at TEXT NOT NULL); INSERT INTO guild_configs(guild_id,created_at,updated_at) VALUES('old','date','date');");legacy.close();
      for(let n=0;n<2;n++){const db=new AppDatabase(file);try {expect(new ConfigRepository(db).getGuild('old').product_mode).toBe('AFFILIATE');}finally{db.close();}}
    } finally {rmSync(directory,{recursive:true,force:true});}
  });
});


describe('primary marketplace links', () => {
  it('defaults to the marketplace from the pasted URL', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', {
        productMode:'AFFILIATE',
        marketplaces:['DE','US'],
        tags:{DE:'gamer-de-21',US:'gamer-us-20'},
        oneLinkDeclared:true,
        channels:[a],
        linkMode:'BUTTON'
      }, 0);
      const result = new ProductLinkService(repo).generate('g','https://www.amazon.de/dp/B0ABCDEF12');
      expect(result.url).toBe('https://www.amazon.de/dp/B0ABCDEF12?tag=gamer-de-21');
      expect(repo.getGuild('g').primary_marketplace).toBe('SOURCE');
    } finally { db.close(); }
  });

  it('can use Amazon.com and the saved US tracking ID as the primary outbound marketplace', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', {
        productMode:'AFFILIATE',
        marketplaces:['DE','US'],
        tags:{DE:'gamer-de-21',US:'gamer-us-20'},
        oneLinkDeclared:true,
        channels:[a],
        linkMode:'BUTTON'
      }, 0);
      repo.setPrimaryMarketplace('g','US');
      const result = new ProductLinkService(repo).generate('g','https://www.amazon.de/dp/B0ABCDEF12');
      expect(result.sourceMarketplace).toBe('DE');
      expect(result.marketplace).toBe('US');
      expect(result.marketplaceOverridden).toBe(true);
      expect(result.url).toBe('https://www.amazon.com/dp/B0ABCDEF12?tag=gamer-us-20');
    } finally { db.close(); }
  });

  it('does not allow a disabled marketplace to become primary', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', config(), 0);
      expect(() => repo.setPrimaryMarketplace('g','US')).toThrow(/Enable this marketplace/);
    } finally { db.close(); }
  });
});

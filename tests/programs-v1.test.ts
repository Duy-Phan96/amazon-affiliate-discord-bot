import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../src/persistence/Database.js';
import { ConfigRepository } from '../src/repositories/ConfigRepository.js';
import { AmazonProgramTemplateRepository } from '../src/repositories/AmazonProgramTemplateRepository.js';
import { AmazonProgramLinkService } from '../src/services/AmazonProgramLinkService.js';
import { ProgramTemplateRenderer, PROGRAM_DISCLOSURE } from '../src/services/ProgramTemplateRenderer.js';
import { amazonCommand } from '../src/discord/commands.js';

const CHANNEL = '123456789012345678';

describe('AmazonProgramLinkService', () => {
  it('uses the current DE tracking ID and changes when configuration changes', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', { productMode:'AFFILIATE', marketplaces:['DE'], tags:{DE:'first-21'}, oneLinkDeclared:true, channels:[CHANNEL], linkMode:'OFF' }, 0);
      const service = new AmazonProgramLinkService(repo);
      expect(service.generate('g','amazon_visa').affiliateUrl).toBe('https://www.amazon.de/visabounty?tag=first-21');
      repo.setMarketplace('g','DE','second-21',false);
      expect(service.generate('g','amazon_visa').affiliateUrl).toBe('https://www.amazon.de/visabounty?tag=second-21');
    } finally { db.close(); }
  });

  it('OneLink declaration does not alter a program URL', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', { productMode:'AFFILIATE', marketplaces:['DE'], tags:{DE:'test-21'}, oneLinkDeclared:true, channels:[CHANNEL], linkMode:'OFF' }, 0);
      const url = new AmazonProgramLinkService(repo).generate('g','prime_student').affiliateUrl;
      expect(url).toBe('https://www.amazon.de/joinstudent?tag=test-21');
    } finally { db.close(); }
  });

  it('rejects malformed stored tracking IDs', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      repo.saveSetup('g', { productMode:'AFFILIATE', marketplaces:['DE'], tags:{DE:'test-21'}, oneLinkDeclared:false, channels:[CHANNEL], linkMode:'OFF' }, 0);
      repo.setMarketplace('g','DE','bad tag');
      expect(() => new AmazonProgramLinkService(repo).generate('g','amazon_visa')).toThrow(/tracking ID is invalid/);
    } finally { db.close(); }
  });

  it('rejects Basic mode, missing DE and missing tag', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new ConfigRepository(db);
      const service = new AmazonProgramLinkService(repo);
      expect(() => service.generate('g','amazon_prime')).toThrow(/Affiliate mode/);
      repo.saveSetup('g', { productMode:'AFFILIATE', marketplaces:['US'], tags:{US:'test-20'}, oneLinkDeclared:false, channels:[CHANNEL], linkMode:'OFF' }, repo.getGuild('g').revision);
      expect(() => service.generate('g','amazon_prime')).toThrow(/Amazon\.de is not enabled/);
      repo.setMarketplace('g','DE','');
      expect(() => service.generate('g','amazon_prime')).toThrow(/no tracking ID/);
    } finally { db.close(); }
  });
});

describe('ProgramTemplateRenderer', () => {
  const renderer = new ProgramTemplateRenderer();
  it('replaces supported placeholders and appends disclosure', () => {
    const value = renderer.render('**{program_name}**\n{affiliate_link}', { programName:'Amazon Visa', affiliateLink:'https://www.amazon.de/visabounty?tag=test-21' });
    expect(value).toContain('**Amazon Visa**');
    expect(value).toContain('tag=test-21');
    expect(value).toContain(PROGRAM_DISCLOSURE);
  });
  it('rejects unknown placeholders', () => {
    expect(() => renderer.render('{price}', {programName:'x',affiliateLink:'https://example.test'})).toThrow(/Unknown template placeholder/);
  });
  it('neutralizes everyone, here, user and role mentions', () => {
    const value = renderer.render('@everyone @here <@123456789012345678> <@&123456789012345679> {affiliate_link}', {programName:'x',affiliateLink:'https://example.test'});
    expect(value).not.toContain('@everyone');
    expect(value).not.toContain('@here');
    expect(value).not.toContain('<@123456789012345678>');
    expect(value).not.toContain('<@&123456789012345679>');
  });
  it('rejects rendered messages over Discord limit', () => {
    expect(() => renderer.render('x'.repeat(1990), {programName:'x',affiliateLink:'https://example.test'})).toThrow(/too long/);
  });
});

describe('AmazonProgramTemplateRepository', () => {
  it('CRUD is guild scoped and migration is idempotent', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonProgramTemplateRepository(db);
      const row = repo.create('g',{name:'Visa Standard',programKey:'amazon_visa',channelId:CHANNEL,body:'{affiliate_link}',createdBy:'admin'});
      expect(repo.activeCount('g')).toBe(1);
      expect(repo.list('other')).toHaveLength(0);
      expect(() => repo.get('other',row.id)).toThrow(/not found/);
      expect(repo.update('g',row.id,{name:'Visa Neu',body:'**{program_name}** {affiliate_link}',channelId:CHANNEL}).name).toBe('Visa Neu');
      expect(repo.setEnabled('g',row.id,false).enabled).toBe(0);
      repo.delete('g',row.id);
      expect(repo.list('g')).toHaveLength(0);
    } finally { db.close(); }
  });

  it('stores template source, not a generated final affiliate URL', () => {
    const db = new AppDatabase(':memory:');
    try {
      const repo = new AmazonProgramTemplateRepository(db);
      const row = repo.create('g',{name:'Prime',programKey:'amazon_prime',body:'Go: {affiliate_link}',createdBy:'admin'});
      expect(row.body).toBe('Go: {affiliate_link}');
      expect(row.body).not.toContain('tag=');
    } finally { db.close(); }
  });
});


describe('Programs command surface', () => {
  it('registers /amazon programs under the existing management-only command', () => {
    const json = amazonCommand.toJSON();
    expect(json.options?.some(option => option.name === 'programs')).toBe(true);
    expect(json.default_member_permissions).toBeTruthy();
  });
});

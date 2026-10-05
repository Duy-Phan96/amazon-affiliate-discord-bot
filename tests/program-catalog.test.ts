import { describe, expect, it } from 'vitest';
import {
  AMAZON_PROGRAMS,
  buildAmazonProgramAffiliateUrl,
  listAmazonPrograms,
} from '../src/programs/AmazonProgramCatalog.js';

describe('AmazonProgramCatalog', () => {
  it('contains the initial DE program set without bounty amounts', () => {
    expect(listAmazonPrograms().map(p => p.key)).toEqual([
      'amazon_visa',
      'amazon_prime',
      'prime_student',
    ]);

    for (const program of listAmazonPrograms()) {
      expect(program.marketplace).toBe('DE');
      expect(program.trackingParam).toBe('tag');
      expect(program).not.toHaveProperty('bounty');
      expect(program).not.toHaveProperty('commission');
    }
  });

  it('builds the official Amazon Visa landing page with the configured tag', () => {
    expect(buildAmazonProgramAffiliateUrl('amazon_visa', 'example-21'))
      .toBe('https://www.amazon.de/visabounty?tag=example-21');
  });

  it('builds the Amazon Prime landing page with the configured tag', () => {
    expect(buildAmazonProgramAffiliateUrl('amazon_prime', 'example-21'))
      .toBe('https://www.amazon.de/primegratistesten?tag=example-21');
  });

  it('builds the Prime Student landing page with the configured tag', () => {
    expect(buildAmazonProgramAffiliateUrl('prime_student', 'example-21'))
      .toBe('https://www.amazon.de/joinstudent?tag=example-21');
  });

  it('trims the configured tracking ID', () => {
    expect(buildAmazonProgramAffiliateUrl('amazon_visa', '  example-21  '))
      .toContain('tag=example-21');
  });

  it('rejects malformed tracking IDs', () => {
    expect(() => buildAmazonProgramAffiliateUrl('amazon_visa', 'not a tag')).toThrow();
  });

  it('keeps official PartnerNet source URLs on every definition', () => {
    expect(AMAZON_PROGRAMS.amazon_visa.officialInfoUrl).toContain('partnernet.amazon.de');
    expect(AMAZON_PROGRAMS.amazon_prime.officialInfoUrl).toContain('partnernet.amazon.de');
    expect(AMAZON_PROGRAMS.prime_student.officialInfoUrl).toContain('partnernet.amazon.de');
  });
});

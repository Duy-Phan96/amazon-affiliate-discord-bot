import { describe, expect, it } from 'vitest';
import { AffiliateMarkdownRenderer, AFFILIATE_DISCLOSURE } from '../src/services/AffiliateMarkdownRenderer.js';

describe('AffiliateMarkdownRenderer', () => {
  const renderer = new AffiliateMarkdownRenderer();

  it('replaces affiliate link and adds disclosure', () => {
    const result = renderer.render('**Gaming Mouse**\n\n👉 {affiliate_link}', 'https://www.amazon.de/dp/B0ABCDEF12?tag=test-21');
    expect(result).toContain('?tag=test-21');
    expect(result).toContain(AFFILIATE_DISCLOSURE);
    expect(result).not.toContain('{affiliate_link}');
  });

  it('appends the affiliate link when placeholder is omitted', () => {
    const result = renderer.render('**Gaming Mouse**', 'https://example.test/product');
    expect(result).toContain('https://example.test/product');
  });

  it('rejects unknown placeholders', () => {
    expect(() => renderer.render('{price}', 'https://example.test')).toThrow(/Unknown placeholder/);
  });

  it('neutralizes mass mentions', () => {
    const result = renderer.render('@everyone @here {affiliate_link}', 'https://example.test');
    expect(result).not.toContain('@everyone');
    expect(result).not.toContain('@here');
  });
});

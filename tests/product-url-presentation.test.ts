import { describe, expect, it } from 'vitest';
import { buildQuickProductPresentation, buildSmartAutoCopy, inferProductIcon, inferProductTitleFromAmazonUrl } from '../src/services/ProductUrlPresentation.js';

describe('product URL presentation', () => {
  it('derives a readable title from a normal Amazon slug', () => {
    expect(inferProductTitleFromAmazonUrl('https://www.amazon.de/Logitech-G502-X-Gaming-Maus/dp/B0ABCDEF12'))
      .toBe('Logitech G502 X Gaming Maus');
  });
  it('does not invent a title when URL contains no useful slug', () => {
    expect(inferProductTitleFromAmazonUrl('https://www.amazon.de/dp/B0ABCDEF12')).toBeUndefined();
  });
  it('uses explicit admin text over inferred values', () => {
    const result = buildQuickProductPresentation(
      'https://www.amazon.de/Logitech-G502-X/dp/B0ABCDEF12',
      'Mein Titel',
      'Meine Beschreibung'
    );
    expect(result.title).toBe('Mein Titel');
    expect(result.description).toBe('Meine Beschreibung');
  });
});


describe('smart auto product copy', () => {
  it('chooses a product icon from inferred product type', () => {
    expect(inferProductIcon('Logitech G305 Gaming Maus')).toBe('🖱️');
    expect(inferProductIcon('Wireless Gaming Headset')).toBe('🎧');
    expect(inferProductIcon('Unknown product')).toBe('🛒');
  });

  it('builds a neutral English auto layout without inventing deal facts', () => {
    const text = buildSmartAutoCopy('Logitech G305 Gaming Mouse', 'https://www.amazon.de/dp/B0ABCDEF12?tag=test-21', true);
    expect(text).toContain('🖱️ **Logitech G305 Gaming Mouse**');
    expect(text).toContain('Check current price & availability on Amazon.');
    expect(text).toContain('#ad · Affiliate link');
    expect(text).toContain('?tag=test-21');
    expect(text.toLowerCase()).not.toContain('discount');
    expect(text.toLowerCase()).not.toContain('deal');
  });
});

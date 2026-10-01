import { describe, expect, it } from 'vitest';
import { buildQuickProductPresentation, inferProductTitleFromAmazonUrl } from '../src/services/ProductUrlPresentation.js';

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

import { AmazonUrlParser } from './AmazonUrlParser.js';

const GENERIC_SEGMENTS = new Set(['dp','product','gp','aw','d']);

export function inferProductTitleFromAmazonUrl(input: string): string | undefined {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return undefined; }
  const parts = url.pathname.split('/').filter(Boolean);
  const asinIndex = parts.findIndex((part, index) =>
    ['dp','product','d'].includes(part.toLowerCase()) &&
    /^[A-Z0-9]{10}$/i.test(parts[index + 1] ?? '')
  );
  if (asinIndex <= 0) return undefined;
  const raw = parts[asinIndex - 1];
  if (!raw || GENERIC_SEGMENTS.has(raw.toLowerCase()) || /^[A-Z0-9]{10}$/i.test(raw)) return undefined;
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { decoded = raw; }
  const cleaned = decoded
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 4 || cleaned.length > 120 || !/[A-Za-zÀ-ÿ0-9]/.test(cleaned)) return undefined;
  return cleaned;
}

export function buildQuickProductPresentation(input: string, explicitTitle?: string | null, explicitText?: string | null) {
  const parser = new AmazonUrlParser();
  const parsed = parser.parse(input);
  const title = explicitTitle?.trim() || inferProductTitleFromAmazonUrl(input) || `Amazon product ${parsed.asin}`;
  const description = explicitText?.trim() || 'Open Amazon for current product details.';
  return { title: title.slice(0, 120), description: description.slice(0, 500), parsed };
}


export function inferProductIcon(input: string): string {
  const text = input.toLowerCase();
  if (/mouse|maus/.test(text)) return '🖱️';
  if (/headset|headphone|kopfhörer|earbud/.test(text)) return '🎧';
  if (/keyboard|tastatur/.test(text)) return '⌨️';
  if (/monitor|display/.test(text)) return '🖥️';
  if (/controller|gamepad/.test(text)) return '🎮';
  if (/microphone|mic|mikrofon/.test(text)) return '🎙️';
  if (/ssd|hard drive|festplatte|storage/.test(text)) return '💾';
  if (/laptop|notebook/.test(text)) return '💻';
  if (/chair|stuhl/.test(text)) return '🪑';
  if (/router|wifi|wi-fi/.test(text)) return '📶';
  return '🛒';
}

export function buildSmartAutoCopy(title: string, affiliateUrl: string, affiliate = true): string {
  const icon = inferProductIcon(title);
  const heading = title.startsWith('Amazon product ') ? 'Amazon Product' : title;
  const disclosure = affiliate ? '#ad · Affiliate link' : 'Amazon product link';
  return `${icon} **${heading}**\nCheck current price & availability on Amazon.\n\n${disclosure}\n${affiliateUrl}`;
}

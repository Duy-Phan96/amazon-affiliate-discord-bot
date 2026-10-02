import { UserInputError } from './SetupValidation.js';

const PLACEHOLDER = /\{([^{}\s]+)\}/g;
const ALLOWED = new Set(['affiliate_link']);
export const AFFILIATE_DISCLOSURE = '#ad · Affiliate link';

function neutralizeMentions(input: string): string {
  return input
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere')
    .replace(/<@([!&]?\d+)>/g, '<@\u200b$1>');
}

export class AffiliateMarkdownRenderer {
  validate(source: string): void {
    if (!source.trim()) throw new UserInputError('Post message cannot be empty.');
    const unknown = [...source.matchAll(PLACEHOLDER)]
      .map(match => match[1])
      .filter(name => !ALLOWED.has(name));
    if (unknown.length) throw new UserInputError(`Unknown placeholder: {${unknown[0]}}. Use {affiliate_link} only.`);
  }

  render(source: string, affiliateLink: string): string {
    this.validate(source);
    let rendered = source.trim();
    if (rendered.includes('{affiliate_link}')) {
      rendered = rendered.replaceAll('{affiliate_link}', affiliateLink);
    } else {
      rendered = `${rendered}\n\n${affiliateLink}`;
    }
    rendered = neutralizeMentions(rendered);
    if (!rendered.toLowerCase().includes('#ad') && !rendered.toLowerCase().includes('affiliate link')) {
      rendered = `${rendered}\n\n${AFFILIATE_DISCLOSURE}`;
    } else if (!rendered.includes(AFFILIATE_DISCLOSURE)) {
      rendered = `${rendered}\n\n${AFFILIATE_DISCLOSURE}`;
    }
    if (rendered.length > 2000) throw new UserInputError('Rendered post is too long for one Discord message. Shorten the Markdown text.');
    return rendered;
  }
}

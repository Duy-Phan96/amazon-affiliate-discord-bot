import { UserInputError } from './SetupValidation.js';

const ALLOWED = new Set(['affiliate_link', 'program_name']);
const PLACEHOLDER = /\{([^{}\s]+)\}/g;
export const PROGRAM_DISCLOSURE = '#ad · Affiliate link';

function neutralizeMentions(input: string): string {
  return input
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere')
    .replace(/<@([!&]?\d+)>/g, '<@\u200b$1>');
}

export interface ProgramTemplateValues {
  affiliateLink: string;
  programName: string;
}

export class ProgramTemplateRenderer {
  validate(body: string): void {
    if (!body.trim()) throw new UserInputError('Post text cannot be empty.');
    const unknown = [...body.matchAll(PLACEHOLDER)]
      .map(match => match[1])
      .filter(name => !ALLOWED.has(name));
    if (unknown.length) throw new UserInputError(`Unknown template placeholder: {${unknown[0]}}`);
  }

  render(body: string, values: ProgramTemplateValues): string {
    this.validate(body);
    let rendered = body
      .replaceAll('{affiliate_link}', values.affiliateLink)
      .replaceAll('{program_name}', values.programName);
    rendered = neutralizeMentions(rendered.trim());
    const final = `${rendered}\n\n${PROGRAM_DISCLOSURE}`;
    if (final.length > 2000) throw new UserInputError('Rendered post is too long for one Discord message. Shorten the template.');
    return final;
  }
}

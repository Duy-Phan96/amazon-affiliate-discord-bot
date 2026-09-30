export type AmazonProgramKey = 'amazon_visa' | 'amazon_prime' | 'prime_student';

export interface AmazonProgramDefinition {
  key: AmazonProgramKey;
  title: string;
  marketplace: 'DE';
  landingPage: string;
  officialInfoUrl: string;
  trackingParam: 'tag';
  verifiedAt: string;
}

/**
 * API-free catalog of Amazon.de programs with stable landing-page patterns.
 *
 * Important:
 * - Do not store bounty amounts here; they can change.
 * - Do not infer eligibility or approval from this catalog.
 * - Landing pages must be re-verified against current official PartnerNet docs before release.
 */
export const AMAZON_PROGRAMS: Readonly<Record<AmazonProgramKey, AmazonProgramDefinition>> = Object.freeze({
  amazon_visa: Object.freeze({
    key: 'amazon_visa',
    title: 'Amazon Visa',
    marketplace: 'DE',
    landingPage: 'https://www.amazon.de/visabounty',
    officialInfoUrl: 'https://partnernet.amazon.de/promotion/visabounty',
    trackingParam: 'tag',
    verifiedAt: '2026-09-30',
  }),
  amazon_prime: Object.freeze({
    key: 'amazon_prime',
    title: 'Amazon Prime',
    marketplace: 'DE',
    landingPage: 'https://www.amazon.de/primegratistesten',
    officialInfoUrl: 'https://partnernet.amazon.de/promotion/prime',
    trackingParam: 'tag',
    verifiedAt: '2026-09-30',
  }),
  prime_student: Object.freeze({
    key: 'prime_student',
    title: 'Prime Student',
    marketplace: 'DE',
    landingPage: 'https://www.amazon.de/joinstudent',
    officialInfoUrl: 'https://partnernet.amazon.de/promotion/student',
    trackingParam: 'tag',
    verifiedAt: '2026-09-30',
  }),
});

const TRACKING_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,96}-\d{2}$/;

export function listAmazonPrograms(): AmazonProgramDefinition[] {
  return Object.values(AMAZON_PROGRAMS);
}

export function getAmazonProgram(key: AmazonProgramKey): AmazonProgramDefinition {
  return AMAZON_PROGRAMS[key];
}

export function buildAmazonProgramAffiliateUrl(key: AmazonProgramKey, trackingId: string): string {
  const normalized = trackingId.trim();
  if (!TRACKING_ID.test(normalized)) {
    throw new Error('Invalid Amazon tracking ID');
  }
  const program = getAmazonProgram(key);
  const url = new URL(program.landingPage);
  url.searchParams.set(program.trackingParam, normalized);
  return url.toString();
}

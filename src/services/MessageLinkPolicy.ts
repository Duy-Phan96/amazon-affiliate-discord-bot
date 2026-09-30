/** Conservative policy for automatic replies only. Explicit operator commands remain separate. */
export function hasAffiliateTag(input: string): boolean {
  try {
    const url = new URL(input);
    return [...url.searchParams].some(([name, value]) => name.toLowerCase() === 'tag' && value.trim().length > 0);
  } catch { return false; }
}

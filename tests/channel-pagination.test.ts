import { describe, expect, it } from 'vitest';
import { paginateChannelChoices } from '../src/services/ChannelPagination.js';

describe('channel pagination', () => {
  const channels = Array.from({ length: 53 }, (_, i) => ({
    id: String(i + 1),
    name: `channel-${String(i + 1).padStart(2, '0')}`,
    category: i < 30 ? 'MARKETPLACE' : 'OTHER',
    position: i,
  }));

  it('paginates more than Discord select limits without hiding channels', () => {
    expect(paginateChannelChoices(channels, 0, 20).items).toHaveLength(20);
    expect(paginateChannelChoices(channels, 1, 20).items).toHaveLength(20);
    expect(paginateChannelChoices(channels, 2, 20).items).toHaveLength(13);
    expect(paginateChannelChoices(channels, 0, 20).totalPages).toBe(3);
  });

  it('clamps invalid pages', () => {
    expect(paginateChannelChoices(channels, -10, 20).page).toBe(0);
    expect(paginateChannelChoices(channels, 99, 20).page).toBe(2);
  });

  it('preserves category metadata for display', () => {
    expect(paginateChannelChoices(channels, 0, 20).items[0].category).toBe('MARKETPLACE');
  });
});

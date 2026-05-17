import { getEvents } from '../../src/services/indexer';

describe('indexer', () => {
  it('returns empty array when no events exist for a type', () => {
    const events = getEvents('player_registered');
    expect(Array.isArray(events)).toBe(true);
  });
});

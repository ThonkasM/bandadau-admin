import { mediaItem, postItem, report } from '../../../testing/fixtures';
import { buildEntries, isConflict, matchesFilters } from './entries';
import { DEFAULT_FILTERS } from './moderation.models';

describe('entries', () => {
  it('joins queue items with open reports and appends comment reports', () => {
    const entries = buildEntries(
      [mediaItem('m-1'), postItem('p-1', 2)],
      [report('r-1', 'p-1'), report('r-2', 'p-1', { reason: 'HARASSMENT' }), report('r-3', 'c-1', { targetType: 'COMMENT' })],
      { includeComments: true },
    );
    expect(entries.map((e) => [e.key, e.type, e.reportCount])).toEqual([
      ['m-1', 'MEDIA', 0],
      ['p-1', 'POST', 2],
      ['comment:c-1', 'COMMENT', 1],
    ]);
    expect(entries[1]!.reasons).toEqual(['SPAM', 'HARASSMENT']);
  });

  it('omits comments when the type filter excludes them', () => {
    const entries = buildEntries([], [report('r-3', 'c-1', { targetType: 'COMMENT' })], { includeComments: false });
    expect(entries).toEqual([]);
  });

  it('filters by type, media kind and reason (client side)', () => {
    const [media, post] = buildEntries([mediaItem('m-1'), postItem('p-1')], [report('r-1', 'p-1')], { includeComments: false });
    expect(matchesFilters(media!, { ...DEFAULT_FILTERS, type: 'POST' })).toBe(false);
    expect(matchesFilters(post!, { ...DEFAULT_FILTERS, type: 'POST' })).toBe(true);
    expect(matchesFilters(media!, { ...DEFAULT_FILTERS, kind: 'VIDEO' })).toBe(false);
    expect(matchesFilters(post!, { ...DEFAULT_FILTERS, reason: 'SPAM' })).toBe(true);
    expect(matchesFilters(post!, { ...DEFAULT_FILTERS, reason: 'NSFW' })).toBe(false);
    // los medios coinciden por etiqueta del modelo
    expect(matchesFilters(media!, { ...DEFAULT_FILTERS, reason: 'NSFW' })).toBe(true);
  });

  it('recognises conflict codes', () => {
    expect(isConflict('ALREADY_MODERATED')).toBe(true);
    expect(isConflict('MEDIA_NOT_FLAGGED')).toBe(true);
    expect(isConflict('FORBIDDEN')).toBe(false);
  });
});

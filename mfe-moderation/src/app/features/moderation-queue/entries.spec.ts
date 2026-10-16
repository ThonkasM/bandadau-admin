import { mediaItem, post, postItem, report } from '../../../testing/fixtures';
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

  it('attaches comment reports to the queue item of their post instead of listing them twice', () => {
    const entries = buildEntries([postItem('p-1', 1)], [report('r-9', 'c-9', { targetType: 'COMMENT', post: post('p-1') })], { includeComments: true });
    expect(entries.map((e) => e.key)).toEqual(['p-1']);
    expect(entries[0]!.reports.map((r) => r.id)).toEqual(['r-9']);
  });

  it('carries the reported comment and uses its author on comment entries', () => {
    const author = { id: 'u-9', email: 'autor@umsa.edu.bo', status: 'ACTIVE' as const };
    const comment = { id: 'c-1', postId: 'p-7', text: 'texto denunciado', status: 'VISIBLE', createdAt: '2026-10-14T14:00:00Z', author };
    const [entry] = buildEntries([], [report('r-3', 'c-1', { targetType: 'COMMENT', comment })], { includeComments: true });
    expect(entry?.comment).toEqual(comment);
    expect(entry?.author).toEqual(author);
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

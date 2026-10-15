import { ItemView, QueueEntry, QueueFilters, ReportReason, ReportView } from './moderation.models';

/** Códigos que indican que otro moderador ya resolvió el elemento (UC-18 curso 10a). */
export const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'ALREADY_MODERATED',
  'MEDIA_NOT_FLAGGED',
  'REPORT_ALREADY_RESOLVED',
  'CONFLICT',
]);

export function isConflict(code: string): boolean {
  return CONFLICT_CODES.has(code);
}

function mediaOf(item: ItemView) {
  return item.media ?? item.post?.media[0] ?? null;
}

/** Une los ítems de `moderationQueue` con las denuncias abiertas y agrega las de comentarios. */
export function buildEntries(
  items: readonly ItemView[],
  reports: readonly ReportView[],
  options: { includeComments: boolean; newKeys?: ReadonlySet<string> },
): QueueEntry[] {
  const byTarget = new Map<string, ReportView[]>();
  for (const report of reports) {
    const list = byTarget.get(report.targetId) ?? [];
    list.push(report);
    byTarget.set(report.targetId, list);
  }
  const isNew = (key: string) => options.newKeys?.has(key) ?? false;

  const entries: QueueEntry[] = items.map((item): QueueEntry => {
    const isMedia = item.source === 'AI' && item.media !== null;
    const own = byTarget.get(item.id) ?? (item.post ? (byTarget.get(item.post.id) ?? []) : []);
    const media = mediaOf(item);
    const reasons = [...new Set(own.map((r) => r.reason))];
    return {
      key: item.id,
      type: isMedia ? 'MEDIA' : 'POST',
      itemId: item.id,
      media,
      post: item.post,
      author: item.post?.author ?? item.media?.owner ?? null,
      reports: own,
      reportCount: Math.max(item.openReports, own.length),
      reasons,
      enqueuedAt: item.enqueuedAt,
      maxScore: media?.moderation?.maxScore ?? null,
      isNew: isNew(item.id),
    };
  });

  if (options.includeComments) {
    const comments = new Map<string, ReportView[]>();
    for (const report of reports) {
      if (report.targetType !== 'COMMENT') continue;
      const list = comments.get(report.targetId) ?? [];
      list.push(report);
      comments.set(report.targetId, list);
    }
    for (const [targetId, list] of comments) {
      const first = list[0]!;
      const key = `comment:${targetId}`;
      entries.push({
        key,
        type: 'COMMENT',
        itemId: null,
        media: null,
        post: first.post,
        author: first.post?.author ?? null,
        reports: list,
        reportCount: list.length,
        reasons: [...new Set(list.map((r) => r.reason as ReportReason))],
        enqueuedAt: list.map((r) => r.createdAt).sort()[0] ?? first.createdAt,
        maxScore: null,
        isNew: isNew(key),
      });
    }
  }
  return entries;
}

/** Filtros que el contrato no resuelve en el servidor (tipo comentario y motivo). */
export function matchesFilters(entry: QueueEntry, filters: QueueFilters): boolean {
  if (filters.type !== 'ALL' && entry.type !== filters.type) return false;
  if (filters.kind !== 'ALL' && entry.media && entry.media.kind !== filters.kind) return false;
  if (filters.reason !== 'ALL') {
    const label = filters.reason.toLowerCase();
    const byReport = entry.reasons.includes(filters.reason);
    const byLabel = (entry.media?.moderation?.labels ?? []).some((l) => l.toLowerCase() === label);
    if (!byReport && !byLabel) return false;
  }
  return true;
}

export function sortedScores(entry: QueueEntry): Array<{ label: string; score: number }> {
  const scores = entry.media?.moderation?.scores ?? {};
  return Object.entries(scores)
    .map(([label, score]) => ({ label, score: Number(score) }))
    .filter((s) => Number.isFinite(s.score))
    .sort((a, b) => b.score - a.score);
}

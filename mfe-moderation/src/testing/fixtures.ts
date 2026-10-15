import { signal } from '@angular/core';

import {
  ItemView,
  MediaView,
  Outcome,
  PostView,
  QueueChange,
  QueuePage,
  ReportView,
  UserRef,
} from '../app/features/moderation-queue/moderation.models';
import { ModerationService } from '../app/features/moderation-queue/moderation.service';

export const author: UserRef = { id: 'u-1', email: 'juanp@umsa.edu.bo', status: 'ACTIVE' };

export function media(id: string, overrides: Partial<MediaView> = {}): MediaView {
  return {
    id,
    kind: 'IMAGE',
    status: 'FLAGGED',
    previewUrl: `https://cdn.test/${id}.png`,
    thumbnailUrl: null,
    tags: ['meme'],
    ocrText: null,
    createdAt: '2026-10-14T15:00:00Z',
    owner: author,
    moderation: {
      decision: 'REVIEW',
      labels: ['nsfw'],
      scores: { nsfw: 0.91, violence: 0.04 },
      maxScore: 0.91,
      modelVersion: 'nsfw-classifier v1.0.0',
    },
    ...overrides,
  };
}

export function mediaItem(id: string, overrides: Partial<ItemView> = {}): ItemView {
  return {
    id,
    source: 'AI',
    media: media(id),
    post: null,
    openReports: 0,
    enqueuedAt: '2026-10-14T15:00:00Z',
    ...overrides,
  };
}

export function post(id: string, overrides: Partial<PostView> = {}): PostView {
  return {
    id,
    text: 'Texto del post',
    hashtags: [],
    status: 'HIDDEN',
    createdAt: '2026-10-14T14:00:00Z',
    author,
    media: [],
    ...overrides,
  };
}

export function postItem(id: string, openReports = 2): ItemView {
  return { id, source: 'REPORTS', media: null, post: post(id), openReports, enqueuedAt: '2026-10-14T14:30:00Z' };
}

export function report(id: string, targetId: string, overrides: Partial<ReportView> = {}): ReportView {
  return {
    id,
    targetType: 'POST',
    targetId,
    reason: 'SPAM',
    details: null,
    createdAt: '2026-10-14T14:10:00Z',
    reporter: { id: 'u-2', email: 'lucia@umsa.edu.bo', status: 'ACTIVE' },
    post: post(targetId),
    ...overrides,
  };
}

export class FakeModerationService {
  items: ItemView[] = [mediaItem('m-1'), mediaItem('m-2'), postItem('p-1')];
  reports: ReportView[] = [report('r-1', 'p-1'), report('r-2', 'p-1', { reason: 'HARASSMENT' })];
  roles: Array<'STUDENT' | 'ORGANIZER' | 'MODERATOR' | 'ADMIN'> = ['MODERATOR'];
  moderateResult: Outcome = { ok: true };
  resolveResult: Outcome = { ok: true };
  suspendResult: Outcome = { ok: true };
  failLoad: string | null = null;

  calls: Array<{ op: string; args: unknown[] }> = [];
  emitChange: (change: QueueChange) => void = () => undefined;
  emitReconnect: () => void = () => undefined;
  watching = signal(0);

  loadQueue = vi.fn(async (filter: unknown, after: string | null, first: number): Promise<QueuePage> => {
    this.calls.push({ op: 'loadQueue', args: [filter, after, first] });
    if (this.failLoad) {
      const { GqlError } = await import('../app/core/graphql-client');
      throw new GqlError(this.failLoad);
    }
    return {
      items: this.items,
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: this.items.length,
      partialError: null,
    };
  });
  loadReports = vi.fn(async () => this.reports);
  loadMe = vi.fn(async () => ({ id: 'me-1', roles: this.roles }));
  moderateMedia = vi.fn(async (...args: unknown[]) => {
    this.calls.push({ op: 'moderateMedia', args });
    return this.moderateResult;
  });
  resolveReport = vi.fn(async (...args: unknown[]) => {
    this.calls.push({ op: 'resolveReport', args });
    return this.resolveResult;
  });
  suspendUser = vi.fn(async (...args: unknown[]) => {
    this.calls.push({ op: 'suspendUser', args });
    return this.suspendResult;
  });
  watchChanges = vi.fn((handlers: { next: (c: QueueChange) => void; reconnected?: () => void }) => {
    this.emitChange = handlers.next;
    this.emitReconnect = handlers.reconnected ?? (() => undefined);
    this.watching.update((n) => n + 1);
    return () => this.watching.update((n) => n - 1);
  });
}

export function fakeRealtime() {
  return { state: signal<'idle' | 'connecting' | 'live' | 'offline'>('live'), reset: vi.fn(), subscribe: vi.fn() };
}

export { ModerationService };

import { Injectable, inject } from '@angular/core';

import { GqlError, GqlErrorItem, GraphqlClient } from '../../core/graphql-client';
import { RealtimeClient } from '../../core/realtime';
import {
  ItemView,
  MediaKind,
  MediaReviewDecision,
  MediaView,
  ModerationSource,
  Outcome,
  PostView,
  QueueChange,
  QueuePage,
  ReportResolution,
  ReportView,
  Role,
} from './moderation.models';
import {
  CONTENT_REPORTS,
  MODERATE_MEDIA,
  MODERATION_QUEUE,
  ME,
  QUEUE_CHANGED,
  RESOLVE_CONTENT_REPORT,
  SUSPEND_USER,
} from './moderation.queries';

export interface ServerFilter {
  source?: ModerationSource;
  kind?: MediaKind;
}

interface UserErrorShape {
  code: string;
  message: string;
}

interface MutationPayload {
  errors?: UserErrorShape[] | null;
}

/** Operaciones de UC-18 / UC-10 sobre el gateway. Sin estado: lo guarda el store. */
@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly gql = inject(GraphqlClient);
  private readonly realtime = inject(RealtimeClient);

  async loadQueue(filter: ServerFilter, after: string | null, first: number): Promise<QueuePage> {
    const { data, errors } = await this.gql.request<{
      moderationQueue: {
        totalCount: number;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: ItemView }>;
      } | null;
    }>(MODERATION_QUEUE, {
      filter: Object.keys(filter).length > 0 ? filter : null,
      after,
      first,
    });
    const conn = data?.moderationQueue;
    if (!conn) throw this.toError(errors);
    return {
      items: conn.edges.map((e) => normalizeItem(e.node)),
      pageInfo: conn.pageInfo,
      totalCount: conn.totalCount,
      partialError: errors[0]?.code ?? null,
    };
  }

  /** Denuncias abiertas (UC-10). El contrato no expone ids de denuncia en `ModerationItem`. */
  async loadReports(first = 50): Promise<ReportView[]> {
    const { data, errors } = await this.gql.request<{ contentReports: ReportView[] | null }>(
      CONTENT_REPORTS,
      { first },
    );
    if (!data?.contentReports) throw this.toError(errors);
    return data.contentReports.map((r) => ({ ...r, post: r.post ? normalizePost(r.post) : null }));
  }

  async loadMe(): Promise<{ id: string; roles: Role[] }> {
    const { data, errors } = await this.gql.request<{ me: { id: string; roles: Role[] } | null }>(ME);
    if (!data?.me) throw this.toError(errors);
    return data.me;
  }

  moderateMedia(id: string, decision: MediaReviewDecision, note: string): Promise<Outcome> {
    return this.mutate<{ moderateMedia: MutationPayload | null }>(
      MODERATE_MEDIA,
      { id, decision, note: note || null },
      (d) => d.moderateMedia,
    );
  }

  resolveReport(reportId: string, resolution: ReportResolution, note: string): Promise<Outcome> {
    return this.mutate<{ resolveContentReport: MutationPayload | null }>(
      RESOLVE_CONTENT_REPORT,
      { input: { reportId, resolution, note: note || null } },
      (d) => d.resolveContentReport,
    );
  }

  suspendUser(userId: string, reason: string): Promise<Outcome> {
    return this.mutate<{ suspendUser: MutationPayload | null }>(
      SUSPEND_USER,
      { input: { userId, reason, until: null } },
      (d) => d.suspendUser,
    );
  }

  /** Subscription `moderationQueueChanged`. Devuelve la función para cancelar. */
  watchChanges(handlers: {
    next: (change: QueueChange) => void;
    error?: (error: unknown) => void;
    reconnected?: () => void;
  }): () => void {
    return this.realtime.subscribe<{ moderationQueueChanged: QueueChange }>(QUEUE_CHANGED, {
      next: (data) => {
        const change = data.moderationQueueChanged;
        handlers.next({ ...change, item: normalizeItem(change.item) });
      },
      ...(handlers.error ? { error: handlers.error } : {}),
      ...(handlers.reconnected ? { reconnected: handlers.reconnected } : {}),
    });
  }

  /**
   * Una mutación = una intención = una `Idempotency-Key`. Los errores de negocio llegan en
   * `payload.errors[]` (contrato) pero también se aceptan como error GraphQL con `extensions.code`
   * (UC-18 curso 10a describe `ALREADY_MODERATED` así).
   */
  private async mutate<T>(
    query: string,
    variables: Record<string, unknown>,
    pick: (data: T) => MutationPayload | null,
  ): Promise<Outcome> {
    try {
      const { data, errors } = await this.gql.request<T>(query, variables, {
        idempotencyKey: crypto.randomUUID(),
      });
      const payload = data ? pick(data) : null;
      const userError = payload?.errors?.[0];
      if (userError) return { ok: false, code: userError.code };
      if (!payload) return { ok: false, code: errors[0]?.code ?? 'INTERNAL_ERROR' };
      return { ok: true };
    } catch (e) {
      if (e instanceof GqlError) return { ok: false, code: e.code };
      throw e;
    }
  }

  private toError(errors: GqlErrorItem[]): GqlError {
    return new GqlError(errors[0]?.code ?? 'INTERNAL_SERVER_ERROR', errors[0]?.message, errors);
  }
}

/** `scores` es JSON: acepta objeto o cadena JSON, según cómo lo serialice el gateway. */
function fixScores(m: MediaView): MediaView;
function fixScores(m: MediaView | null): MediaView | null;
function fixScores(m: MediaView | null): MediaView | null {
  if (!m?.moderation) return m;
  let scores: unknown = m.moderation.scores;
  if (typeof scores === 'string') {
    try {
      scores = JSON.parse(scores);
    } catch {
      scores = {};
    }
  }
  return { ...m, moderation: { ...m.moderation, scores: (scores ?? {}) as Record<string, number> } };
}

function normalizePost(post: PostView): PostView {
  return { ...post, media: post.media.map((m) => fixScores(m)) };
}

function normalizeItem(item: ItemView): ItemView {
  return { ...item, media: fixScores(item.media), post: item.post ? normalizePost(item.post) : null };
}

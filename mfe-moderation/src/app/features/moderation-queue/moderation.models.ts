import type {
  ContentReportTargetType,
  MediaKind,
  MediaReviewDecision,
  MediaStatus,
  ModerationDecision,
  ModerationQueueChangeType,
  ModerationSource,
  PostStatus,
  ReportReason,
  ReportResolution,
  Role,
  UserStatus,
} from '@bandada/contracts-ts/graphql/admin';

export type {
  ContentReportTargetType,
  MediaKind,
  MediaReviewDecision,
  ModerationSource,
  ReportReason,
  ReportResolution,
  Role,
};

/** Vistas parciales de los tipos del contrato (solo los campos que pide el MFE). */
export interface UserRef {
  id: string;
  email: string;
  status: UserStatus;
}

export interface ModerationResultView {
  decision: ModerationDecision;
  labels: string[];
  scores: Record<string, number>;
  maxScore: number;
  modelVersion: string;
}

export interface MediaView {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  ocrText: string | null;
  createdAt: string;
  owner: UserRef | null;
  moderation: ModerationResultView | null;
}

export interface PostView {
  id: string;
  text: string | null;
  hashtags: string[];
  status: PostStatus;
  createdAt: string;
  author: UserRef | null;
  media: MediaView[];
}

export interface ItemView {
  id: string;
  source: ModerationSource;
  media: MediaView | null;
  post: PostView | null;
  openReports: number;
  enqueuedAt: string;
}

export interface ReportView {
  id: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  createdAt: string;
  reporter: UserRef | null;
  post: PostView | null;
}

export interface PageInfoView {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface QueuePage {
  items: ItemView[];
  pageInfo: PageInfoView;
  totalCount: number;
  /** Código de un error parcial (p. ej. `UPSTREAM_UNAVAILABLE`) si el gateway devolvió datos + errores. */
  partialError: string | null;
}

export interface QueueChange {
  type: ModerationQueueChangeType;
  totalCount: number;
  item: ItemView;
}

export type EntryType = 'MEDIA' | 'POST' | 'COMMENT';

/** Elemento de la lista tal como lo ve el moderador (unifica medios, posts y comentarios). */
export interface QueueEntry {
  key: string;
  type: EntryType;
  itemId: string | null;
  media: MediaView | null;
  post: PostView | null;
  author: UserRef | null;
  reports: ReportView[];
  reportCount: number;
  reasons: ReportReason[];
  enqueuedAt: string;
  maxScore: number | null;
  isNew: boolean;
}

export type ActionKind = 'APPROVE' | 'REJECT' | 'KEEP' | 'REMOVE' | 'SUSPEND';

export interface ActionRequest {
  kind: ActionKind;
  entry: QueueEntry;
}

export interface ActionInput {
  note: string;
  alsoSuspend: boolean;
}

export interface QueueFilters {
  type: 'ALL' | EntryType;
  kind: 'ALL' | MediaKind;
  reason: 'ALL' | ReportReason;
}

export const DEFAULT_FILTERS: QueueFilters = { type: 'ALL', kind: 'ALL', reason: 'ALL' };

export type Outcome = { ok: true } | { ok: false; code: string };

import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { GqlError } from '../../core/graphql-client';
import { HostConfig } from '../../core/host-config';
import { RealtimeClient } from '../../core/realtime';
import { ShellBridge } from '../../core/shell-bridge';
import { buildEntries, isConflict, matchesFilters } from './entries';
import {
  ActionInput,
  ActionRequest,
  DEFAULT_FILTERS,
  ItemView,
  Outcome,
  PageInfoView,
  QueueChange,
  QueueEntry,
  QueueFilters,
  ReportView,
  Role,
} from './moderation.models';
import { ModerationService, ServerFilter } from './moderation.service';

export const PAGE_SIZE = 20;
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export interface Notice {
  kind: 'success' | 'error' | 'info';
  message: string;
}

/** Estado de la cola de moderación (signals; el MFE es zoneless). */
@Injectable({ providedIn: 'root' })
export class ModerationStore {
  private readonly service = inject(ModerationService);
  private readonly config = inject(HostConfig);
  private readonly bridge = inject(ShellBridge);
  private readonly realtime = inject(RealtimeClient);
  private readonly i18n = inject(TranslocoService);

  readonly filters = signal<QueueFilters>(DEFAULT_FILTERS);
  readonly items = signal<ItemView[]>([]);
  readonly reports = signal<ReportView[]>([]);
  readonly pageInfo = signal<PageInfoView>({ hasNextPage: false, endCursor: null });
  readonly totalCount = signal(0);
  readonly status = signal<LoadStatus>('idle');
  readonly errorCode = signal<string | null>(null);
  readonly partialError = signal<string | null>(null);
  readonly loadingMore = signal(false);
  readonly selectedKey = signal<string | null>(null);
  readonly newKeys = signal<ReadonlySet<string>>(new Set());
  readonly suspendedUsers = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly notice = signal<Notice | null>(null);
  readonly roles = signal<Role[] | null>(null);
  readonly meId = signal<string | null>(null);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly liveState = this.realtime.state;

  private generation = 0;
  private unwatch: (() => void) | null = null;
  private lastToken: string | null = null;
  private readonly onOnline = () => {
    this.online.set(true);
    void this.reload({ quiet: true });
  };
  private readonly onOffline = () => this.online.set(false);

  readonly entries = computed<QueueEntry[]>(() => {
    const filters = this.filters();
    const suspended = this.suspendedUsers();
    return buildEntries(this.items(), this.reports(), {
      includeComments: filters.type === 'ALL' || filters.type === 'COMMENT',
      newKeys: this.newKeys(),
    })
      .map((e) =>
        e.author && suspended.has(e.author.id)
          ? { ...e, author: { ...e.author, status: 'SUSPENDED' as const } }
          : e,
      )
      .filter((e) => matchesFilters(e, filters));
  });

  readonly selected = computed<QueueEntry | null>(() => {
    const key = this.selectedKey();
    return this.entries().find((e) => e.key === key) ?? null;
  });

  /** `suspendUser` exige MODERATOR o ADMIN (contrato); no se ofrece sobre uno mismo ni sobre suspendidos. */
  readonly canSuspend = computed(() => {
    const roles = this.roles();
    return roles !== null && (roles.includes('MODERATOR') || roles.includes('ADMIN'));
  });

  canSuspendAuthor(entry: QueueEntry | null): boolean {
    const author = entry?.author;
    return (
      this.canSuspend() && !!author && author.status !== 'SUSPENDED' && author.id !== this.meId()
    );
  }

  /** Arranca (o reinicia, p. ej. por token nuevo) la carga y la suscripción en vivo. */
  start(): void {
    const token = this.config.accessToken();
    if (this.unwatch && token !== this.lastToken) this.realtime.reset();
    this.lastToken = token;
    this.unwatch?.();
    this.generation += 1;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }
    void this.service
      .loadMe()
      .then((me) => {
        this.roles.set(me.roles);
        this.meId.set(me.id);
      })
      .catch(() => this.roles.set(null));
    void this.reload();
    this.unwatch = this.service.watchChanges({
      next: (change) => this.applyChange(change),
      reconnected: () => void this.reload({ quiet: true }),
    });
  }

  stop(): void {
    this.generation += 1;
    this.unwatch?.();
    this.unwatch = null;
    this.realtime.reset();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
  }

  setFilters(patch: Partial<QueueFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    void this.reload();
  }

  select(key: string | null): void {
    this.selectedKey.set(key);
    if (key && this.newKeys().has(key)) {
      this.newKeys.update((s) => new Set([...s].filter((k) => k !== key)));
    }
  }

  moveSelection(delta: 1 | -1): void {
    const list = this.entries();
    if (list.length === 0) return;
    const index = list.findIndex((e) => e.key === this.selectedKey());
    const next = index < 0 ? (delta > 0 ? 0 : list.length - 1) : Math.min(Math.max(index + delta, 0), list.length - 1);
    this.select(list[next]!.key);
  }

  async reload(opts: { quiet?: boolean } = {}): Promise<void> {
    const generation = this.generation;
    if (!this.config.graphqlUrl()) {
      this.fail('CONTRACT_VIOLATION');
      return;
    }
    if (!opts.quiet) this.status.set('loading');
    try {
      const filters = this.filters();
      const wantsQueue = filters.type !== 'COMMENT';
      const wantsReports = filters.type !== 'MEDIA';
      const [page, reports] = await Promise.all([
        wantsQueue
          ? this.service.loadQueue(this.serverFilter(filters), null, PAGE_SIZE)
          : Promise.resolve(null),
        wantsReports ? this.service.loadReports() : Promise.resolve<ReportView[]>([]),
      ]);
      if (generation !== this.generation) return;
      this.items.set(page?.items ?? []);
      this.pageInfo.set(page?.pageInfo ?? { hasNextPage: false, endCursor: null });
      this.totalCount.set(page?.totalCount ?? reports.length);
      this.reports.set(reports);
      this.partialError.set(page?.partialError ?? null);
      this.errorCode.set(null);
      this.status.set('ready');
      this.ensureSelection();
    } catch (e) {
      if (generation !== this.generation) return;
      this.fail(e instanceof GqlError ? e.code : 'INTERNAL_ERROR', opts.quiet);
    }
  }

  async loadMore(): Promise<void> {
    const after = this.pageInfo().endCursor;
    if (!this.pageInfo().hasNextPage || this.loadingMore()) return;
    const generation = this.generation;
    this.loadingMore.set(true);
    try {
      const page = await this.service.loadQueue(this.serverFilter(this.filters()), after, PAGE_SIZE);
      if (generation !== this.generation) return;
      const known = new Set(this.items().map((i) => i.id));
      this.items.update((list) => [...list, ...page.items.filter((i) => !known.has(i.id))]);
      this.pageInfo.set(page.pageInfo);
      this.totalCount.set(page.totalCount);
    } catch (e) {
      this.setNotice('error', this.errorMessage(e instanceof GqlError ? e.code : 'INTERNAL_ERROR'));
    } finally {
      this.loadingMore.set(false);
    }
  }

  /** Ejecuta la acción confirmada por el moderador (aprobar, rechazar, mantener, retirar, suspender). */
  async perform(request: ActionRequest, input: ActionInput): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    const { entry, kind } = request;
    try {
      let outcome: Outcome;
      if (kind === 'SUSPEND') {
        outcome = await this.suspend(entry, input.note);
      } else if (kind === 'APPROVE' || kind === 'REJECT') {
        outcome = entry.media
          ? await this.service.moderateMedia(entry.media.id, kind, input.note)
          : { ok: false, code: 'MEDIA_NOT_FOUND' };
      } else {
        outcome = await this.resolveReports(entry, kind === 'KEEP' ? 'KEEP' : 'REMOVE', input.note);
      }

      if (outcome.ok) {
        this.bridgeToast('success', `moderation.toast.${kind}`);
        if (kind === 'SUSPEND') this.markSuspended(entry);
        else {
          this.removeKey(entry.key);
          if (input.alsoSuspend && (kind === 'REJECT' || kind === 'REMOVE')) {
            const second = await this.suspend(entry, input.note);
            if (second.ok) {
              this.markSuspended(entry);
              this.bridgeToast('success', 'moderation.toast.SUSPEND');
            } else this.bridgeToast('error', this.errorKey(second.code));
          }
        }
        return true;
      }
      if (isConflict(outcome.code)) {
        this.bridgeToast('info', 'moderation.errors.ALREADY_MODERATED');
        this.removeKey(entry.key);
        void this.reload({ quiet: true });
        return false;
      }
      this.bridgeToast('error', this.errorKey(outcome.code));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  /** Falta una entrada obligatoria del contrato shell ↔ MFE (`graphql-url`). */
  contractViolation(): void {
    this.fail('CONTRACT_VIOLATION');
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  errorMessage(code: string): string {
    return this.i18n.translate(this.errorKey(code));
  }

  private errorKey(code: string): string {
    for (const key of [`errors.${code}`, `moderation.errors.${code}`]) {
      if (this.i18n.translate(key) !== key) return key;
    }
    return 'moderation.errors.generic';
  }

  private async suspend(entry: QueueEntry, reason: string): Promise<Outcome> {
    const userId = entry.author?.id;
    if (!userId) return { ok: false, code: 'USER_NOT_FOUND' };
    return this.service.suspendUser(userId, reason || this.i18n.translate('moderation.dialog.defaultSuspendReason'));
  }

  private async resolveReports(
    entry: QueueEntry,
    resolution: 'KEEP' | 'REMOVE',
    note: string,
  ): Promise<Outcome> {
    if (entry.reports.length === 0) return { ok: false, code: 'REPORT_NOT_FOUND' };
    for (const report of entry.reports) {
      const outcome = await this.service.resolveReport(report.id, resolution, note);
      if (!outcome.ok) return outcome;
    }
    return { ok: true };
  }

  private markSuspended(entry: QueueEntry): void {
    const id = entry.author?.id;
    if (id) this.suspendedUsers.update((s) => new Set([...s, id]));
  }

  private bridgeToast(kind: 'success' | 'error' | 'info', key: string): void {
    const message = this.bridge.toast(kind, key);
    this.setNotice(kind, message);
  }

  private setNotice(kind: Notice['kind'], message: string): void {
    this.notice.set({ kind, message });
  }

  private fail(code: string, quiet = false): void {
    this.errorCode.set(code);
    if (quiet && this.status() === 'ready') {
      this.setNotice('error', this.errorMessage(code));
      return;
    }
    this.status.set('error');
  }

  private serverFilter(filters: QueueFilters): ServerFilter {
    const filter: ServerFilter = {};
    if (filters.type === 'MEDIA') filter.source = 'AI';
    if (filters.type === 'POST') filter.source = 'REPORTS';
    if (filters.kind !== 'ALL') filter.kind = filters.kind;
    return filter;
  }

  private matchesServerFilter(item: ItemView): boolean {
    const f = this.serverFilter(this.filters());
    if (this.filters().type === 'COMMENT') return false;
    if (f.source && item.source !== f.source) return false;
    const kind = item.media?.kind ?? item.post?.media[0]?.kind;
    if (f.kind && kind !== f.kind) return false;
    return true;
  }

  private applyChange(change: QueueChange): void {
    const { item } = change;
    if (change.type === 'ADDED') {
      if (!this.matchesServerFilter(item)) {
        this.totalCount.set(change.totalCount);
        return;
      }
      this.items.update((list) => [item, ...list.filter((i) => i.id !== item.id)]);
      this.newKeys.update((s) => new Set([...s, item.id]));
      this.totalCount.set(change.totalCount);
      if (item.source === 'REPORTS' || item.openReports > 0) void this.refreshReports();
      this.ensureSelection();
    } else {
      this.removeKey(item.id);
      this.totalCount.set(change.totalCount);
    }
  }

  private async refreshReports(): Promise<void> {
    if (this.filters().type === 'MEDIA') return;
    const generation = this.generation;
    try {
      const reports = await this.service.loadReports();
      if (generation === this.generation) this.reports.set(reports);
    } catch {
      /* la próxima recarga lo corrige */
    }
  }

  /** Quita un elemento (por clave de lista o id de ítem) y mueve la selección al vecino. */
  private removeKey(key: string): void {
    const before = this.entries();
    const index = before.findIndex((e) => e.key === key || e.itemId === key);
    const removed = index >= 0 ? before[index] : undefined;
    const itemId = removed?.itemId ?? (key.startsWith('comment:') ? null : key);
    const reportIds = new Set(removed?.reports.map((r) => r.id) ?? []);
    const targetId = key.replace(/^comment:/, '');
    this.items.update((list) => list.filter((i) => i.id !== itemId));
    this.reports.update((list) =>
      list.filter((r) => !reportIds.has(r.id) && (removed ? true : r.targetId !== targetId)),
    );
    this.newKeys.update((s) => new Set([...s].filter((k) => k !== key)));
    this.totalCount.update((n) => Math.max(0, n - (removed?.itemId ? 1 : 0)));
    if (this.selectedKey() === key || this.selectedKey() === removed?.key) {
      const after = this.entries();
      this.selectedKey.set(after[Math.min(Math.max(index, 0), after.length - 1)]?.key ?? null);
    }
  }

  private ensureSelection(): void {
    const list = this.entries();
    if (list.length === 0) {
      this.selectedKey.set(null);
    } else if (!list.some((e) => e.key === this.selectedKey())) {
      this.selectedKey.set(list[0]!.key);
    }
  }
}

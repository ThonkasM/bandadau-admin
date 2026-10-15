import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { formatNumber } from '@bandada/i18n/format';

import { HostConfig } from '../../core/host-config';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { DetailPanelComponent } from './detail-panel.component';
import { ActionInput, ActionKind, ActionRequest, EntryType, MediaKind, QueueFilters, ReportReason } from './moderation.models';
import { ModerationStore } from './moderation.store';
import { QueueListComponent } from './queue-list.component';

const TYPES: Array<QueueFilters['type']> = ['ALL', 'MEDIA', 'POST', 'COMMENT'];
const KINDS: Array<QueueFilters['kind']> = ['ALL', 'IMAGE', 'VIDEO'];
const REASONS: Array<QueueFilters['reason']> = ['ALL', 'SPAM', 'HARASSMENT', 'NSFW', 'VIOLENCE', 'MISINFORMATION', 'OTHER'];

/**
 * Pantalla P-ADM-05: filtros + lista (izquierda) y detalle con acciones (derecha).
 * Atajos: j/k mover · a aprobar/mantener · r rechazar/retirar · s suspender autor.
 */
@Component({
  selector: 'bmod-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, QueueListComponent, DetailPanelComponent, ConfirmDialogComponent],
  template: `
    <section class="bmod" role="region" [attr.aria-label]="'moderation.queue.title' | transloco" (keydown)="onKeydown($event)">
      <header class="bmod-toolbar">
        <h1 class="bmod-title">{{ 'moderation.queue.title' | transloco }}</h1>

        <div class="bmod-filters" role="group" [attr.aria-label]="'moderation.filters.label' | transloco">
          <label class="bmod-select">
            <span>{{ 'moderation.filters.type' | transloco }}</span>
            <select (change)="onFilter('type', $any($event.target).value)">
              @for (t of types; track t) {
                <option [value]="t" [selected]="store.filters().type === t">
                  {{ (t === 'ALL' ? 'moderation.filters.all' : 'moderation.type.' + t) | transloco }}
                </option>
              }
            </select>
          </label>
          <label class="bmod-select">
            <span>{{ 'moderation.filters.kind' | transloco }}</span>
            <select (change)="onFilter('kind', $any($event.target).value)">
              @for (k of kinds; track k) {
                <option [value]="k" [selected]="store.filters().kind === k">
                  {{ (k === 'ALL' ? 'moderation.filters.all' : 'enums.MediaKind.' + k) | transloco }}
                </option>
              }
            </select>
          </label>
          <label class="bmod-select">
            <span>{{ 'moderation.filters.reason' | transloco }}</span>
            <select (change)="onFilter('reason', $any($event.target).value)">
              @for (r of reasons; track r) {
                <option [value]="r" [selected]="store.filters().reason === r">
                  {{ (r === 'ALL' ? 'moderation.filters.all' : 'enums.ReportReason.' + r) | transloco }}
                </option>
              }
            </select>
          </label>
        </div>

        <p class="bmod-live" [attr.data-state]="live()" role="status">
          <span aria-hidden="true">●</span>
          {{ ('moderation.live.' + live()) | transloco }}
          @if (store.status() === 'ready') {
            <span class="bmod-muted">({{ total() }})</span>
          }
        </p>
      </header>

      @if (!store.online()) {
        <p class="bmod-banner bmod-banner--warning" role="status">{{ 'common.network.offline' | transloco }}</p>
      }
      @if (store.partialError(); as code) {
        <p class="bmod-banner bmod-banner--warning" role="status">
          {{ 'moderation.states.partial' | transloco: { reason: store.errorMessage(code) } }}
        </p>
      }
      @if (store.notice(); as n) {
        <p class="bmod-banner" [class]="'bmod-banner--' + n.kind" [attr.role]="n.kind === 'error' ? 'alert' : 'status'">
          <span>{{ n.message }}</span>
          <button type="button" class="bmod-link" (click)="store.dismissNotice()">{{ 'common.actions.dismiss' | transloco }}</button>
        </p>
      }

      @switch (store.status()) {
        @case ('error') {
          <div class="bmod-state" role="alert">
            <p class="bmod-state-title">{{ 'moderation.states.error' | transloco }}</p>
            <p class="bmod-muted">{{ store.errorMessage(store.errorCode() ?? 'INTERNAL_ERROR') }}</p>
            <button type="button" class="bmod-btn bmod-btn--primary" (click)="store.reload()">
              {{ 'common.actions.retry' | transloco }}
            </button>
          </div>
        }
        @case ('ready') {
          @if (store.entries().length === 0) {
            <div class="bmod-state">
              <p class="bmod-state-title">{{ 'moderation.states.empty' | transloco }}</p>
              <p class="bmod-muted">{{ 'moderation.states.emptyHint' | transloco }}</p>
            </div>
          } @else {
            <div class="bmod-split">
              <div class="bmod-left">
                <bmod-queue-list
                  [entries]="store.entries()"
                  [selectedKey]="store.selectedKey()"
                  [locale]="config.locale()"
                  (selectKey)="store.select($event)"
                />
                @if (store.pageInfo().hasNextPage) {
                  <button type="button" class="bmod-btn bmod-btn--secondary bmod-more" [disabled]="store.loadingMore()" (click)="store.loadMore()">
                    {{ (store.loadingMore() ? 'common.states.loading' : 'common.actions.loadMore') | transloco }}
                  </button>
                }
              </div>
              <bmod-detail-panel
                [entry]="store.selected()"
                [locale]="config.locale()"
                [busy]="store.busy()"
                [canSuspend]="store.canSuspendAuthor(store.selected())"
                (action)="open($event)"
                (refreshPreview)="store.reload({ quiet: true })"
              />
            </div>
            <p class="bmod-hint">{{ 'moderation.shortcuts.hint' | transloco }}</p>
          }
        }
        @default {
          <div class="bmod-state" role="status" aria-busy="true">
            <div class="bmod-skeleton" aria-hidden="true"></div>
            <div class="bmod-skeleton" aria-hidden="true"></div>
            <div class="bmod-skeleton" aria-hidden="true"></div>
            <p class="bmod-muted">{{ (waitingForToken() ? 'moderation.states.waitingSession' : 'common.states.loading') | transloco }}</p>
          </div>
        }
      }

      <bmod-confirm-dialog
        [request]="request()"
        [busy]="store.busy()"
        [showSuspendOption]="store.canSuspendAuthor(request()?.entry ?? null)"
        (confirmed)="confirm($event)"
        (cancelled)="close()"
      />
    </section>
  `,
})
export class ModerationPageComponent {
  protected readonly store = inject(ModerationStore);
  protected readonly config = inject(HostConfig);

  protected readonly types = TYPES;
  protected readonly kinds = KINDS;
  protected readonly reasons = REASONS;
  protected readonly request = signal<ActionRequest | null>(null);

  private readonly list = viewChild(QueueListComponent);

  protected readonly live = computed(() => (this.store.online() ? this.store.liveState() : 'offline'));
  protected readonly total = computed(() =>
    // `totalCount` cuenta la cola del gateway; los comentarios denunciados llegan por `contentReports`.
    formatNumber(
      this.store.totalCount() + this.store.entries().filter((e) => e.type === 'COMMENT').length,
      this.config.locale(),
    ),
  );
  protected readonly waitingForToken = computed(() => !this.config.accessToken());

  protected onFilter(key: keyof QueueFilters, value: string): void {
    this.store.setFilters({
      [key]: value as EntryType | MediaKind | ReportReason | 'ALL',
    } as Partial<QueueFilters>);
  }

  protected open(kind: ActionKind): void {
    const entry = this.store.selected();
    if (!entry || this.store.busy()) return;
    if (kind === 'SUSPEND' && !this.store.canSuspendAuthor(entry)) return;
    this.request.set({ kind, entry });
  }

  protected async confirm(input: ActionInput): Promise<void> {
    const request = this.request();
    if (!request) return;
    // Éxito, error o conflicto (otro moderador): el store informa y el diálogo se cierra siempre.
    await this.store.perform(request, input);
    this.close();
  }

  protected close(): void {
    this.request.set(null);
    queueMicrotask(() => this.list()?.focus());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const origin = event.composedPath()[0] as HTMLElement | undefined;
    const tag = origin?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || this.request()) return;
    const entry = this.store.selected();
    switch (event.key) {
      case 'j':
        this.store.moveSelection(1);
        break;
      case 'k':
        this.store.moveSelection(-1);
        break;
      case 'a':
        if (entry) this.open(entry.type === 'MEDIA' ? 'APPROVE' : 'KEEP');
        break;
      case 'r':
        if (entry) this.open(entry.type === 'MEDIA' ? 'REJECT' : 'REMOVE');
        break;
      case 's':
        this.open('SUSPEND');
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}

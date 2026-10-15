import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { formatDateTime, formatNumber } from '@bandada/i18n/format';

import { LocaleName } from '../../core/host-config';
import { sortedScores } from './entries';
import { ActionKind, QueueEntry } from './moderation.models';

/** Panel de detalle: vista previa (URL prefirmada, difuminada hasta "Mostrar"), texto, autor, motivo y acciones. */
@Component({
  selector: 'bmod-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    @if (entry(); as e) {
      <article class="bmod-detail" [attr.aria-labelledby]="'bmod-detail-title'">
        <header class="bmod-detail-head">
          <h2 id="bmod-detail-title" class="bmod-detail-title">
            {{ (e.type === 'MEDIA' ? 'moderation.detail.titleMedia' : 'moderation.detail.titleReport') | transloco }}
          </h2>
          <span class="bmod-badge bmod-badge--neutral">{{ 'moderation.type.' + e.type | transloco }}</span>
        </header>

        @if (e.media) {
          <section class="bmod-preview-box" [attr.aria-label]="'moderation.detail.preview' | transloco">
            @if (previewFailed()) {
              <div class="bmod-callout bmod-callout--warning" role="status">
                <p>{{ 'moderation.detail.previewExpired' | transloco }}</p>
                <button type="button" class="bmod-btn bmod-btn--secondary" (click)="refreshPreview.emit()">
                  {{ 'moderation.detail.refreshPreview' | transloco }}
                </button>
              </div>
            } @else if (e.media.previewUrl) {
              @if (e.media.kind === 'VIDEO') {
                <video
                  class="bmod-preview"
                  [class.is-blurred]="!revealed()"
                  [src]="e.media.previewUrl"
                  [controls]="revealed()"
                  preload="metadata"
                  (error)="failedKey.set(e.key)"
                ></video>
              } @else {
                <img
                  class="bmod-preview"
                  [class.is-blurred]="!revealed()"
                  [src]="e.media.previewUrl"
                  [alt]="'moderation.detail.previewAlt' | transloco: { tags: altText(e) }"
                  (error)="failedKey.set(e.key)"
                />
              }
              <button type="button" class="bmod-btn bmod-btn--secondary bmod-reveal" (click)="toggleReveal(e.key)">
                {{ (revealed() ? 'moderation.detail.hide' : 'moderation.detail.show') | transloco }}
              </button>
            } @else {
              <p class="bmod-muted">{{ 'moderation.detail.noPreview' | transloco }}</p>
            }
          </section>
        }

        @if (e.post?.text || e.media?.ocrText) {
          <section class="bmod-section">
            <h3 class="bmod-h3">{{ 'moderation.detail.text' | transloco }}</h3>
            @if (e.post?.text) {
              <p class="bmod-user-text">{{ e.post!.text }}</p>
            }
            @if (e.media?.ocrText) {
              <p class="bmod-muted">{{ 'moderation.detail.ocr' | transloco }}: {{ e.media!.ocrText }}</p>
            }
            @if (e.post && e.post.hashtags.length > 0) {
              <p class="bmod-muted">{{ hashtags(e) }}</p>
            }
          </section>
        }

        @if (e.media?.moderation; as m) {
          <section class="bmod-section">
            <h3 class="bmod-h3">{{ 'moderation.detail.model' | transloco }}</h3>
            <p class="bmod-muted">
              {{ 'moderation.detail.modelVersion' | transloco: { version: m.modelVersion } }}
              · {{ 'enums.ModerationDecision.' + m.decision | transloco }}
            </p>
            <ul class="bmod-scores">
              @for (s of scores(e); track s.label) {
                <li>{{ s.label }} <strong>{{ num(s.score) }}</strong></li>
              }
            </ul>
            @if (e.media!.tags.length > 0) {
              <p class="bmod-muted">{{ 'moderation.detail.tags' | transloco }}: {{ e.media!.tags.join(', ') }}</p>
            }
          </section>
        }

        @if (e.reportCount > 0) {
          <section class="bmod-section">
            <h3 class="bmod-h3">
              {{ 'moderation.detail.reports' | transloco: { count: e.reportCount } }}
            </h3>
            @if (e.reports.length > 0) {
              <ul class="bmod-reports">
                @for (r of e.reports; track r.id) {
                  <li>
                    <strong>{{ 'enums.ReportReason.' + r.reason | transloco }}</strong>
                    <span class="bmod-muted"> · {{ r.reporter?.email ?? '—' }} · {{ dt(r.createdAt) }}</span>
                    @if (r.details) {
                      <p class="bmod-user-text">{{ r.details }}</p>
                    }
                  </li>
                }
              </ul>
            } @else {
              <p class="bmod-muted">{{ 'moderation.detail.reportsNotLoaded' | transloco }}</p>
            }
          </section>
        }

        <section class="bmod-section">
          <h3 class="bmod-h3">{{ 'moderation.detail.author' | transloco }}</h3>
          @if (e.author; as a) {
            <p>
              {{ a.email }}
              <span class="bmod-badge" [class]="a.status === 'SUSPENDED' ? 'bmod-badge--danger' : 'bmod-badge--neutral'">
                {{ 'enums.UserStatus.' + a.status | transloco }}
              </span>
            </p>
          } @else {
            <p class="bmod-muted">—</p>
          }
        </section>

        <footer class="bmod-actions" role="group" [attr.aria-label]="'moderation.detail.actions' | transloco">
          @if (e.type === 'MEDIA') {
            <button type="button" class="bmod-btn bmod-btn--primary" aria-keyshortcuts="a" [disabled]="busy()" (click)="action.emit('APPROVE')">
              {{ 'moderation.actions.APPROVE' | transloco }} <kbd class="bmod-kbd">a</kbd>
            </button>
            <button type="button" class="bmod-btn bmod-btn--danger" aria-keyshortcuts="r" [disabled]="busy()" (click)="action.emit('REJECT')">
              {{ 'moderation.actions.REJECT' | transloco }} <kbd class="bmod-kbd">r</kbd>
            </button>
          } @else {
            <button type="button" class="bmod-btn bmod-btn--primary" aria-keyshortcuts="a" [disabled]="busy()" (click)="action.emit('KEEP')">
              {{ 'moderation.actions.KEEP' | transloco }} <kbd class="bmod-kbd">a</kbd>
            </button>
            <button type="button" class="bmod-btn bmod-btn--danger" aria-keyshortcuts="r" [disabled]="busy()" (click)="action.emit('REMOVE')">
              {{ 'moderation.actions.REMOVE' | transloco }} <kbd class="bmod-kbd">r</kbd>
            </button>
          }
          @if (canSuspend()) {
            <button type="button" class="bmod-btn bmod-btn--secondary" aria-keyshortcuts="s" [disabled]="busy()" (click)="action.emit('SUSPEND')">
              {{ 'moderation.actions.SUSPEND' | transloco }} <kbd class="bmod-kbd">s</kbd>
            </button>
          }
        </footer>
      </article>
    } @else {
      <div class="bmod-empty-detail">
        <p class="bmod-muted">{{ 'moderation.detail.empty' | transloco }}</p>
      </div>
    }
  `,
})
export class DetailPanelComponent {
  readonly entry = input<QueueEntry | null>(null);
  readonly locale = input<LocaleName>('es');
  readonly busy = input(false);
  readonly canSuspend = input(false);
  readonly action = output<ActionKind>();
  readonly refreshPreview = output<void>();

  protected readonly revealedKey = signal<string | null>(null);
  protected readonly failedKey = signal<string | null>(null);
  protected readonly revealed = computed(() => this.revealedKey() === this.entry()?.key);
  protected readonly previewFailed = computed(() => this.failedKey() === this.entry()?.key);

  protected toggleReveal(key: string): void {
    this.revealedKey.update((k) => (k === key ? null : key));
  }

  protected scores = sortedScores;

  protected num(value: number): string {
    return formatNumber(value, this.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  protected dt(iso: string): string {
    return formatDateTime(iso, this.locale(), 'short');
  }

  protected hashtags(e: QueueEntry): string {
    return (e.post?.hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  }

  protected altText(e: QueueEntry): string {
    return e.media && e.media.tags.length > 0 ? e.media.tags.join(', ') : '—';
  }
}

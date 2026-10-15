import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { formatNumber, formatRelative } from '@bandada/i18n/format';

import { LocaleName } from '../../core/host-config';
import { QueueEntry } from './moderation.models';

/** Score a partir del cual el modelo bloquearía automáticamente (D7): se resalta como peligro. */
const BLOCK_SCORE = 0.85;

/**
 * Lista de la cola (listbox accesible). Sin miniaturas: el contenido marcado puede ser sensible y
 * solo se muestra, difuminado, en el panel de detalle.
 */
@Component({
  selector: 'bmod-queue-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <ul
      #list
      class="bmod-list"
      role="listbox"
      tabindex="0"
      [attr.aria-label]="'moderation.queue.listLabel' | transloco"
      [attr.aria-activedescendant]="selectedKey() ? optionId(selectedKey()!) : null"
      (keydown)="onKeydown($event)"
    >
      @for (entry of entries(); track entry.key) {
        <li
          role="option"
          class="bmod-item"
          [id]="optionId(entry.key)"
          [class.is-selected]="entry.key === selectedKey()"
          [attr.aria-selected]="entry.key === selectedKey()"
          (click)="selectKey.emit(entry.key)"
        >
          <div class="bmod-item-head">
            <span class="bmod-badge bmod-badge--neutral">{{ typeLabelKey(entry) | transloco }}</span>
            @if (entry.maxScore !== null) {
              <span class="bmod-badge" [class]="scoreClass(entry)">
                {{ 'moderation.item.score' | transloco: { score: score(entry) } }}
              </span>
            }
            @if (entry.reportCount > 0) {
              <span class="bmod-badge bmod-badge--info">
                {{ 'moderation.item.reports' | transloco: { count: entry.reportCount } }}
              </span>
            }
            @if (entry.isNew) {
              <span class="bmod-badge bmod-badge--success">{{ 'moderation.item.new' | transloco }}</span>
            }
          </div>
          <p class="bmod-item-text">{{ preview(entry) }}</p>
          <p class="bmod-item-meta">
            {{ 'moderation.item.author' | transloco: { author: entry.author?.email ?? '—' } }}
            · {{ relative(entry.enqueuedAt) }}
          </p>
        </li>
      }
    </ul>
  `,
})
export class QueueListComponent {
  readonly entries = input.required<QueueEntry[]>();
  readonly selectedKey = input<string | null>(null);
  readonly locale = input<LocaleName>('es');
  readonly selectKey = output<string>();

  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  focus(): void {
    this.listEl()?.nativeElement.focus();
  }

  optionId(key: string): string {
    return `bmod-opt-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  typeLabelKey(entry: QueueEntry): string {
    if (entry.type === 'MEDIA' && entry.media) return `enums.MediaKind.${entry.media.kind}`;
    return `moderation.type.${entry.type}`;
  }

  score(entry: QueueEntry): string {
    return formatNumber(entry.maxScore ?? 0, this.locale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }

  scoreClass(entry: QueueEntry): string {
    return (entry.maxScore ?? 0) >= BLOCK_SCORE ? 'bmod-badge--danger' : 'bmod-badge--warning';
  }

  preview(entry: QueueEntry): string {
    const text = entry.post?.text ?? entry.media?.ocrText ?? '';
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }

  relative(iso: string): string {
    return formatRelative(iso, this.locale());
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.entries();
    if (list.length === 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = list.findIndex((e) => e.key === this.selectedKey());
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(index + 1, list.length - 1);
    else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else return;
    event.preventDefault();
    if (next >= 0 && next !== index) this.selectKey.emit(list[next]!.key);
  }
}

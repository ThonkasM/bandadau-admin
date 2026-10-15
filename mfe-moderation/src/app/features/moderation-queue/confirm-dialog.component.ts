import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ActionInput, ActionRequest } from './moderation.models';

/**
 * Confirmación con nota. Usa `<dialog>` nativo dentro del shadow root (los overlays del CDK
 * quedarían fuera del Shadow DOM y sin estilos; microfrontends.md §8). `showModal()` da el
 * *focus trap*, el cierre con Esc y la restauración del foco.
 */
@Component({
  selector: 'bmod-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <dialog
      #dlg
      class="bmod-dialog"
      aria-labelledby="bmod-dialog-title"
      aria-describedby="bmod-dialog-desc"
      (cancel)="onCancel($event)"
    >
      @if (request(); as req) {
        <form (submit)="onSubmit($event)" class="bmod-dialog-body">
          <h2 id="bmod-dialog-title" class="bmod-dialog-title">{{ titleKey() | transloco }}</h2>
          <p id="bmod-dialog-desc" class="bmod-muted">{{ descriptionKey() | transloco }}</p>

          <label class="bmod-field">
            <span>
              {{ (req.kind === 'SUSPEND' ? 'moderation.dialog.reasonLabel' : 'moderation.dialog.noteLabel') | transloco }}
              @if (noteRequired()) {
                <span class="bmod-required">({{ 'common.a11y.required' | transloco }})</span>
              }
            </span>
            <textarea
              #noteField
              class="bmod-textarea"
              rows="3"
              maxlength="500"
              [attr.aria-required]="noteRequired()"
              [attr.aria-invalid]="touched() && noteMissing()"
              [value]="note()"
              (input)="note.set($any($event.target).value)"
            ></textarea>
          </label>
          @if (touched() && noteMissing()) {
            <p class="bmod-field-error" role="alert">{{ 'moderation.dialog.noteRequired' | transloco }}</p>
          }

          @if (showSuspendOption() && (req.kind === 'REJECT' || req.kind === 'REMOVE')) {
            <label class="bmod-check">
              <input type="checkbox" [checked]="alsoSuspend()" (change)="alsoSuspend.set($any($event.target).checked)" />
              <span>{{ 'moderation.dialog.alsoSuspend' | transloco }}</span>
            </label>
          }

          <div class="bmod-dialog-actions">
            <button type="button" class="bmod-btn bmod-btn--secondary" (click)="cancelled.emit()">
              {{ 'common.actions.cancel' | transloco }}
            </button>
            <button
              type="submit"
              class="bmod-btn"
              [class.bmod-btn--danger]="destructive()"
              [class.bmod-btn--primary]="!destructive()"
              [disabled]="busy()"
            >
              {{ confirmKey() | transloco }}
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly request = input<ActionRequest | null>(null);
  readonly busy = input(false);
  readonly showSuspendOption = input(false);
  readonly confirmed = output<ActionInput>();
  readonly cancelled = output<void>();

  protected readonly note = signal('');
  protected readonly alsoSuspend = signal(false);
  protected readonly touched = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly noteField = viewChild<ElementRef<HTMLTextAreaElement>>('noteField');

  protected readonly noteRequired = computed(() => this.request()?.kind === 'SUSPEND');
  protected readonly noteMissing = computed(() => this.noteRequired() && this.note().trim() === '');
  protected readonly destructive = computed(() => {
    const kind = this.request()?.kind;
    return kind === 'REJECT' || kind === 'REMOVE' || kind === 'SUSPEND';
  });

  constructor() {
    effect(() => {
      const request = this.request();
      const dlg = this.dialog().nativeElement;
      untracked(() => {
        if (request && !dlg.open) {
          this.note.set('');
          this.alsoSuspend.set(false);
          this.touched.set(false);
          if (typeof dlg.showModal === 'function') dlg.showModal();
          else dlg.setAttribute('open', '');
          queueMicrotask(() => this.noteField()?.nativeElement.focus());
        } else if (!request && dlg.open) {
          if (typeof dlg.close === 'function') dlg.close();
          else dlg.removeAttribute('open');
        }
      });
    });
  }

  protected titleKey(): string {
    return `moderation.dialog.title.${this.request()?.kind ?? 'APPROVE'}`;
  }

  protected descriptionKey(): string {
    return `moderation.dialog.description.${this.request()?.kind ?? 'APPROVE'}`;
  }

  protected confirmKey(): string {
    return `moderation.actions.${this.request()?.kind ?? 'APPROVE'}`;
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.touched.set(true);
    if (this.noteMissing() || this.busy()) return;
    this.confirmed.emit({ note: this.note().trim(), alsoSuspend: this.alsoSuspend() });
  }
}

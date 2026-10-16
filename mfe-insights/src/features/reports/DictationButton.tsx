import { useTranslation } from 'react-i18next';

import type { SpeechDictation } from './useSpeechDictation';

export const DICTATION_SHORTCUT = 'Alt+V';

const MIC_PROPS = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const;

/**
 * Botón de micrófono (alternancia con `aria-pressed`). Inactivo → escuchando (pulso; sin movimiento con
 * `prefers-reduced-motion`) → transcribiendo. Sin soporte: deshabilitado con la explicación como tooltip.
 */
export function DictationButton({ dictation, disabled = false }: { dictation: SpeechDictation; disabled?: boolean }) {
  const { t } = useTranslation();
  const { supported, unsupportedReason, status } = dictation;
  const active = status !== 'idle';
  const label = !supported
    ? t(`reports.dictation.unsupported.${unsupportedReason ?? 'browser'}`)
    : t('reports.dictation.start'); // etiqueta fija: el estado lo comunica `aria-pressed`
  return (
    <span className="bi-mic-wrap" title={!supported ? label : undefined}>
      <button
        type="button"
        className={`bi-mic${active ? ' bi-mic--active' : ''}${status === 'listening' ? ' bi-mic--listening' : ''}`}
        aria-pressed={supported ? active : undefined}
        aria-label={label}
        aria-keyshortcuts={supported ? DICTATION_SHORTCUT : undefined}
        title={label}
        disabled={!supported || disabled}
        onClick={dictation.toggle}
      >
        {active ? (
          <svg {...MIC_PROPS}>
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg {...MIC_PROPS}>
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            {supported ? null : <path d="M3 3l18 18" />}
          </svg>
        )}
      </button>
    </span>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getSpeechRecognitionCtor,
  isSecureForSpeech,
  recognitionLanguages,
  type SpeechRecognitionLike,
} from '../../lib/speech-recognition';

export type DictationStatus = 'idle' | 'listening' | 'transcribing';
/** Códigos de error normalizados (los de la Web Speech API más `start-failed`). */
export type DictationError = 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'aborted' | 'language-not-supported' | 'start-failed' | 'unknown';
export type UnsupportedReason = 'browser' | 'insecure' | null;

const KNOWN_ERRORS: Record<string, DictationError> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'no-speech': 'no-speech',
  'audio-capture': 'audio-capture',
  network: 'network',
  aborted: 'aborted',
  'language-not-supported': 'language-not-supported',
};

export interface SpeechDictation {
  supported: boolean;
  unsupportedReason: UnsupportedReason;
  status: DictationStatus;
  /** Texto reconocido hasta ahora (confirmado + provisional) mientras se habla. */
  interim: string;
  error: DictationError | null;
  start: () => void;
  /** Termina de escuchar y entrega lo reconocido (resultado final). */
  stop: () => void;
  /** Descarta todo sin entregar texto. */
  cancel: () => void;
  toggle: () => void;
  clearError: () => void;
}

/**
 * Dictado por voz con la Web Speech API (sin servidor). Un solo reconocimiento activo (evita dobles inicios),
 * idioma según `locale` con respaldo (`es-BO` → `es-419` → `es-ES`), limpieza al desmontar o al cambiar de idioma.
 * `onFinal` recibe el texto confirmado al terminar el habla.
 */
export function useSpeechDictation({ locale, onFinal }: { locale: string; onFinal: (text: string) => void }): SpeechDictation {
  const ctor = getSpeechRecognitionCtor();
  const secure = isSecureForSpeech();
  const unsupportedReason: UnsupportedReason = !ctor ? 'browser' : !secure ? 'insecure' : null;

  const [status, setStatus] = useState<DictationStatus>('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<DictationError | null>(null);
  const active = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const detach = useCallback((abort: boolean) => {
    const rec = active.current;
    active.current = null; // los eventos tardíos de este reconocimiento se ignoran
    if (!rec) return;
    rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
    if (abort) {
      try {
        rec.abort();
      } catch {
        /* ya terminado */
      }
    }
  }, []);

  const launch = useCallback(
    (languages: string[], index: number) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;
      const rec = new Ctor();
      rec.lang = languages[index] ?? 'es-ES';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      active.current = rec;
      let confirmed = '';
      let failure: DictationError | null = null;
      let retry = false;

      rec.onstart = () => setStatus('listening');
      rec.onresult = (event) => {
        let finalText = '';
        let provisional = '';
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const piece = result?.[0]?.transcript ?? '';
          if (result?.isFinal) finalText += piece;
          else provisional += piece;
        }
        confirmed = finalText.trim();
        setInterim(`${finalText}${provisional}`.trim());
        setStatus('transcribing');
      };
      rec.onerror = (event) => {
        const code = KNOWN_ERRORS[event.error] ?? 'unknown';
        if (code === 'language-not-supported' && index + 1 < languages.length) {
          retry = true; // se reintenta con el siguiente idioma al terminar
          return;
        }
        failure = code;
        setError(code);
      };
      rec.onend = () => {
        if (active.current !== rec) return;
        active.current = null;
        if (retry) {
          launch(languages, index + 1);
          return;
        }
        setStatus('idle');
        setInterim('');
        if (confirmed) onFinalRef.current(confirmed);
        else if (!failure) setError('no-speech');
      };

      try {
        rec.start();
      } catch {
        detach(false);
        setStatus('idle');
        setError('start-failed');
      }
    },
    [detach],
  );

  const start = useCallback(() => {
    if (active.current || !getSpeechRecognitionCtor() || !isSecureForSpeech()) return;
    setError(null);
    setInterim('');
    launch(recognitionLanguages(locale), 0);
  }, [launch, locale]);

  const stop = useCallback(() => {
    // `stop()` conserva lo ya reconocido y dispara `end` (resultado final).
    try {
      active.current?.stop();
    } catch {
      detach(true);
      setStatus('idle');
    }
  }, [detach]);

  const cancel = useCallback(() => {
    detach(true);
    setStatus('idle');
    setInterim('');
  }, [detach]);

  const toggle = useCallback(() => {
    if (active.current) stop();
    else start();
  }, [start, stop]);

  // Cambiar el idioma del panel invalida el reconocimiento en curso (el idioma se fija al iniciarlo).
  useEffect(() => cancel, [locale, cancel]);
  // Al desmontar/ocultar el componente se libera el micrófono.
  useEffect(() => () => detach(true), [detach]);

  return { supported: unsupportedReason === null, unsupportedReason, status, interim, error, start, stop, cancel, toggle, clearError: () => setError(null) };
}

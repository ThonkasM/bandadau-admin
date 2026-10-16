// Web Speech API (SpeechRecognition): tipos mínimos (TypeScript no los incluye) y utilidades. UC-19 flujo alterno «dictado».

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}
export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}
export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: SpeechRecognitionResultLike };
}
export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor; isSecureContext?: boolean };

/** Constructor del navegador (Chrome/Safari: `webkitSpeechRecognition`), o `null` si no hay soporte. */
export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** El reconocimiento exige contexto seguro (HTTPS o `localhost`/`*.localhost`). */
export function isSecureForSpeech(): boolean {
  return typeof window === 'undefined' || (window as unknown as SpeechWindow).isSecureContext !== false;
}

/** Idiomas de reconocimiento por idioma del panel, en orden de preferencia (el primero que el motor acepte). */
export function recognitionLanguages(locale: string): string[] {
  return locale === 'en' ? ['en-US'] : ['es-BO', 'es-419', 'es-ES'];
}

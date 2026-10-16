import { vi } from 'vitest';

import type { SpeechRecognitionEventLike, SpeechRecognitionLike } from '../lib/speech-recognition';

/** `SpeechRecognition` simulada: las pruebas emiten eventos a mano sobre la última instancia. */
export class FakeSpeechRecognition implements SpeechRecognitionLike {
  static instances: FakeSpeechRecognition[] = [];
  static startError: Error | null = null;
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onstart: SpeechRecognitionLike['onstart'] = null;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  start = vi.fn(() => {
    if (FakeSpeechRecognition.startError) throw FakeSpeechRecognition.startError;
    this.onstart?.(new Event('start'));
  });
  stop = vi.fn(() => this.onend?.(new Event('end')));
  abort = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  static get last(): FakeSpeechRecognition {
    const instance = FakeSpeechRecognition.instances.at(-1);
    if (!instance) throw new Error('no recognition created');
    return instance;
  }
  static reset(): void {
    FakeSpeechRecognition.instances = [];
    FakeSpeechRecognition.startError = null;
  }
  static install(): void {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeSpeechRecognition;
  }
  static uninstall(): void {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  }

  /** Emite resultados: cada segmento es `[texto, esFinal]`. */
  emitResults(...segments: Array<[string, boolean]>): void {
    const results = segments.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));
    this.onresult?.({ resultIndex: 0, results } as unknown as SpeechRecognitionEventLike);
  }
  emitError(error: string): void {
    this.onerror?.({ error });
  }
  end(): void {
    this.onend?.(new Event('end'));
  }
}

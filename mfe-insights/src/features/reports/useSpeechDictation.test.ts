import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeSpeechRecognition as Fake } from '../../testing/fake-speech';
import { useSpeechDictation } from './useSpeechDictation';

beforeEach(() => {
  Fake.reset();
  Fake.install();
});
afterEach(() => Fake.uninstall());

const setup = (locale = 'es') => {
  const onFinal = vi.fn();
  const hook = renderHook(({ lng }) => useSpeechDictation({ locale: lng, onFinal }), { initialProps: { lng: locale } });
  return { onFinal, ...hook };
};

describe('useSpeechDictation', () => {
  it('goes idle → listening → transcribing (interim) → final text', () => {
    const { result, onFinal } = setup();
    expect(result.current.supported).toBe(true);
    expect(result.current.status).toBe('idle');
    act(() => result.current.start());
    expect(result.current.status).toBe('listening');
    expect(Fake.last.interimResults).toBe(true);
    act(() => Fake.last.emitResults(['cuántos usuarios', false]));
    expect(result.current.status).toBe('transcribing');
    expect(result.current.interim).toBe('cuántos usuarios');
    act(() => Fake.last.emitResults(['cuántos usuarios nuevos hubo hoy', true]));
    act(() => Fake.last.end());
    expect(result.current.status).toBe('idle');
    expect(result.current.interim).toBe('');
    expect(onFinal).toHaveBeenCalledExactlyOnceWith('cuántos usuarios nuevos hubo hoy');
  });

  it('stop() asks the engine to finish and delivers what was heard', () => {
    const { result, onFinal } = setup();
    act(() => result.current.start());
    act(() => Fake.last.emitResults(['hola reporte', false]));
    // Chrome convierte lo provisional en final al hacer stop(): el motor emite el resultado y `end`.
    Fake.last.stop.mockImplementationOnce(() => {
      Fake.last.emitResults(['hola reporte', true]);
      Fake.last.end();
    });
    act(() => result.current.stop());
    expect(onFinal).toHaveBeenCalledWith('hola reporte');
  });

  it('avoids double starts', () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => result.current.start());
    act(() => result.current.toggle()); // toggle estando activo = detener, no crear otro
    expect(Fake.instances).toHaveLength(1);
  });

  it('uses es-BO, falls back to es-419 and es-ES when the language is unsupported; en uses en-US', () => {
    const { result } = setup('es');
    act(() => result.current.start());
    expect(Fake.last.lang).toBe('es-BO');
    act(() => Fake.last.emitError('language-not-supported'));
    act(() => Fake.last.end());
    expect(Fake.last.lang).toBe('es-419');
    act(() => Fake.last.emitError('language-not-supported'));
    act(() => Fake.last.end());
    expect(Fake.last.lang).toBe('es-ES');
    expect(result.current.error).toBeNull();
    act(() => Fake.last.emitError('language-not-supported'));
    act(() => Fake.last.end());
    expect(result.current.error).toBe('language-not-supported');

    Fake.reset();
    const en = setup('en');
    act(() => en.result.current.start());
    expect(Fake.last.lang).toBe('en-US');
  });

  it('cancels the running recognition when the panel language changes', () => {
    const { result, rerender, onFinal } = setup('es');
    act(() => result.current.start());
    const first = Fake.last;
    rerender({ lng: 'en' });
    expect(first.abort).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    act(() => first.emitResults(['tarde', true]));
    act(() => first.end());
    expect(onFinal).not.toHaveBeenCalled();
    act(() => result.current.start());
    expect(Fake.last.lang).toBe('en-US');
  });

  it.each([
    ['not-allowed', 'not-allowed'],
    ['service-not-allowed', 'not-allowed'],
    ['no-speech', 'no-speech'],
    ['audio-capture', 'audio-capture'],
    ['network', 'network'],
    ['aborted', 'aborted'],
    ['weird', 'unknown'],
  ])('maps the %s error to %s and leaves the box usable', (raw, expected) => {
    const { result, onFinal } = setup();
    act(() => result.current.start());
    act(() => Fake.last.emitError(raw));
    act(() => Fake.last.end());
    expect(result.current.error).toBe(expected);
    expect(result.current.status).toBe('idle');
    expect(onFinal).not.toHaveBeenCalled();
    act(() => result.current.start()); // se puede reintentar
    expect(result.current.error).toBeNull();
    expect(Fake.instances).toHaveLength(2);
  });

  it('reports no-speech when it ends without any result', () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => Fake.last.end());
    expect(result.current.error).toBe('no-speech');
  });

  it('reports start-failed if the engine throws on start', () => {
    Fake.startError = new Error('InvalidStateError');
    const { result } = setup();
    act(() => result.current.start());
    expect(result.current.error).toBe('start-failed');
    expect(result.current.status).toBe('idle');
  });

  it('reports lack of support without throwing', () => {
    Fake.uninstall();
    const { result } = setup();
    expect(result.current).toMatchObject({ supported: false, unsupportedReason: 'browser' });
    act(() => result.current.start());
    expect(Fake.instances).toHaveLength(0);
  });

  it('supports the webkit-prefixed constructor (Safari)', () => {
    Fake.uninstall();
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = Fake;
    const { result } = setup();
    expect(result.current.supported).toBe(true);
  });

  it('requires a secure context', () => {
    vi.stubGlobal('isSecureContext', false);
    try {
      const { result } = setup();
      expect(result.current).toMatchObject({ supported: false, unsupportedReason: 'insecure' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('aborts and ignores late events on unmount', () => {
    const { result, unmount, onFinal } = setup();
    act(() => result.current.start());
    const rec = Fake.last;
    unmount();
    expect(rec.abort).toHaveBeenCalled();
    expect(rec.onend).toBeNull();
    expect(onFinal).not.toHaveBeenCalled();
  });

  it('cancel() discards without delivering text', () => {
    const { result, onFinal } = setup();
    act(() => result.current.start());
    act(() => Fake.last.emitResults(['algo', true]));
    act(() => result.current.cancel());
    expect(result.current.status).toBe('idle');
    expect(result.current.interim).toBe('');
    expect(onFinal).not.toHaveBeenCalled();
  });
});

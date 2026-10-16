import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createServices, ServicesProvider } from '../../app/services';
import { HostConfig } from '../../lib/host-config';
import { createI18n } from '../../lib/i18n';
import type { InsightsService } from '../../lib/insights-service';
import { ShellBridge } from '../../lib/shell-bridge';
import { FakeSpeechRecognition as Fake } from '../../testing/fake-speech';
import { pendingReport } from '../../testing/fixtures';
import { RequestReportForm } from './RequestReportForm';

function setup(locale: 'es' | 'en' = 'es') {
  const requestReport = vi.fn(async (_q: string, _l: string, _k: string, _e?: string) => pendingReport);
  const listReportEngines = vi.fn(async () => [
      { engine: 'OPENCODE', label: 'OpenCode Go', model: 'deepseek-v4.1-flash', available: false, external: true, mode: 'AGENT' },
      { engine: 'OLLAMA', label: 'Ollama local', model: 'qwen2.5:3b', available: true, external: false, mode: 'HYBRID' },
      { engine: 'STUB', label: 'Determinista', model: null, available: true, external: false, mode: 'DETERMINISTIC' },
    ]);
  const config = new HostConfig();
  config.update({ locale });
  const i18n = createI18n(locale);
  const services = createServices(config, new ShellBridge((key) => key), i18n, { service: { requestReport, listReportEngines } as unknown as InsightsService });
  const onRequested = vi.fn();
  const view = render(
    <ServicesProvider services={services}>
      <RequestReportForm onRequested={onRequested} />
    </ServicesProvider>,
  );
  return { requestReport, listReportEngines, onRequested, config, ...view };
}

const speak = (...segments: Array<[string, boolean]>) => act(() => Fake.last.emitResults(...segments));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  Fake.reset();
  Fake.install();
});
afterEach(() => {
  vi.useRealTimers();
  Fake.uninstall();
});

const micButton = () => screen.getByRole('button', { name: /Dictar la pregunta por voz|Dictate the question by voice/ });

describe('RequestReportForm — dictado por voz', () => {
  it('shows provisional text dimmed, announces states, counts down and sends automatically', async () => {
    const { requestReport, onRequested } = setup();
    fireEvent.click(micButton());
    expect(screen.getByTestId('dictation-state')).toHaveTextContent('Escuchando…');
    expect(screen.getByTestId('dictation-live')).toHaveTextContent('Escuchando. Habla ahora.');
    expect(micButton()).toHaveAttribute('aria-pressed', 'true');

    speak(['cuántos créditos se vendieron', false]);
    const box = screen.getByRole('textbox');
    expect(box).toHaveValue('cuántos créditos se vendieron');
    expect(box).toHaveClass('bi-input--interim');
    expect(screen.getByTestId('dictation-live')).toHaveTextContent('Transcribiendo');

    speak(['cuántos créditos se vendieron hoy', true]);
    act(() => Fake.last.end());
    expect(box).toHaveValue('cuántos créditos se vendieron hoy');
    expect(box).not.toHaveClass('bi-input--interim');
    expect(screen.getByTestId('dictation-countdown')).toHaveTextContent('Generando reporte en 2 s…');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(requestReport).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByTestId('dictation-countdown')).toHaveTextContent('1 s');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByTestId('dictation-countdown')).toHaveTextContent('0 s');
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(requestReport).toHaveBeenCalledExactlyOnceWith('cuántos créditos se vendieron hoy', 'es', expect.any(String), 'AUTO');
    expect(onRequested).toHaveBeenCalledWith(pendingReport);
    expect(screen.queryByTestId('dictation-countdown')).toBeNull();
  });

  it('Cancel stops the automatic send and keeps the text', async () => {
    const { requestReport } = setup();
    fireEvent.click(micButton());
    speak(['dame el último comprador', true]);
    act(() => Fake.last.end());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(requestReport).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('dame el último comprador');
  });

  it('Edit cancels the send and focuses the text box', async () => {
    const { requestReport } = setup();
    fireEvent.click(micButton());
    speak(['dame el último comprador', true]);
    act(() => Fake.last.end());
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('textbox')).toHaveFocus();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(requestReport).not.toHaveBeenCalled();
  });

  it('typing in the box cancels the countdown', async () => {
    const { requestReport } = setup();
    fireEvent.click(micButton());
    speak(['dame el último comprador', true]);
    act(() => Fake.last.end());
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'dame el último comprador hoy' } });
    expect(screen.queryByTestId('dictation-countdown')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(requestReport).not.toHaveBeenCalled();
  });

  it('does not auto-send a too-short dictation', async () => {
    const { requestReport } = setup();
    fireEvent.click(micButton());
    speak(['hola', true]);
    act(() => Fake.last.end());
    expect(screen.queryByTestId('dictation-countdown')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(requestReport).not.toHaveBeenCalled();
  });

  it('shows an i18n error and keeps the box usable (permission denied)', () => {
    setup();
    fireEvent.click(micButton());
    act(() => Fake.last.emitError('not-allowed'));
    act(() => Fake.last.end());
    expect(screen.getByRole('alert')).toHaveTextContent('Permiso de micrófono denegado');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'una pregunta escrita' } });
    expect(screen.getByRole('textbox')).toHaveValue('una pregunta escrita');
  });

  it('works in English with en-US and English messages', () => {
    setup('en');
    fireEvent.click(micButton());
    expect(Fake.last.lang).toBe('en-US');
    expect(screen.getByTestId('dictation-state')).toHaveTextContent('Listening…');
    act(() => Fake.last.emitError('network'));
    act(() => Fake.last.end());
    expect(screen.getByRole('alert')).toHaveTextContent('No connection to the speech recognition service');
  });

  it('Alt+V toggles dictation from the form without typing a character', () => {
    setup();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'v', code: 'KeyV', altKey: true });
    expect(Fake.instances).toHaveLength(1);
    expect(micButton()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'v', code: 'KeyV' }); // sin Alt: tecleo normal
    expect(Fake.instances).toHaveLength(1);
  });

  it('releases the microphone when unmounted mid-dictation', () => {
    const { unmount } = setup();
    fireEvent.click(micButton());
    const rec = Fake.last;
    unmount();
    expect(rec.abort).toHaveBeenCalled();
  });

  it('shows the button disabled with the browser hint when unsupported', () => {
    Fake.uninstall();
    setup();
    const button = screen.getByRole('button', { name: /no soporta el dictado/ });
    expect(button).toBeDisabled();
    expect(screen.getAllByText(/usa Chrome o Safari/).length).toBeGreaterThan(0);
    expect(screen.getByRole('textbox')).toBeEnabled();
  });

  it('shows the privacy note (Google in Chrome) and the shortcut when supported', () => {
    setup();
    expect(screen.getByText(/servicio de reconocimiento de Google/)).toHaveTextContent('Alt+V');
  });
});

describe('selector de motor (ADR-0022)', () => {
  beforeEach(() => vi.useRealTimers());

  it('lista Automático/OpenCode/Ollama/Determinista, deshabilita los no disponibles y avisa de que un motor externo seudonimiza', async () => {
    setup();
    const select = (await screen.findByLabelText('Motor')) as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).toEqual(['AUTO', 'OPENCODE', 'OLLAMA', 'STUB']);
    expect(options.find((o) => o.value === 'OPENCODE')?.disabled).toBe(true);
    expect(options.find((o) => o.value === 'OLLAMA')?.disabled).toBe(false);
    expect(screen.getByTestId('engine-note').textContent).toMatch(/Automático/);
    fireEvent.change(select, { target: { value: 'OLLAMA' } });
    expect(screen.getByTestId('engine-note').textContent).toMatch(/local/i);
  });

  it('envía el motor elegido a requestReport', async () => {
    const { requestReport } = setup();
    const select = await screen.findByLabelText('Motor');
    fireEvent.change(select, { target: { value: 'STUB' } });
    fireEvent.change(screen.getByLabelText('Pregunta en lenguaje natural'), { target: { value: '¿Quién compró el último ticket?' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Pedir reporte' }).closest('form') as HTMLFormElement);
    await vi.waitFor(() => expect(requestReport).toHaveBeenCalledTimes(1));
    expect(requestReport.mock.calls[0]?.[3]).toBe('STUB');
  });

  it('catálogo de preguntas por tema: 6 pestañas accesibles con 4–6 ejemplos y navegación con flechas', async () => {
    setup();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Usuarios', 'Créditos', 'Eventos', 'Tickets', 'Contenido', 'Sistema']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
    fireEvent.keyDown(tabs[0] as HTMLElement, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Créditos' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: '¿Cuál es el usuario con más créditos?' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Créditos' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Sistema' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '¿Cómo están los servicios?' }));
    expect((screen.getByLabelText('Pregunta en lenguaje natural') as HTMLTextAreaElement).value).toBe('¿Cómo están los servicios?');
  });

  it('incluye las preguntas originales y las de cada tema en español e inglés', async () => {
    const { rerender, ...view } = setup('en');
    void rerender;
    void view;
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Users', 'Credits', 'Events', 'Tickets', 'Content', 'System']);
    fireEvent.click(screen.getByRole('tab', { name: 'Credits' }));
    expect(screen.getByRole('button', { name: 'Which user has the most credits?' })).toBeTruthy();
  });
});

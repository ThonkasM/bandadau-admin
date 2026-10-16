import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../lib/i18n';
import { DictationButton } from './DictationButton';
import type { SpeechDictation } from './useSpeechDictation';

const base: SpeechDictation = {
  supported: true,
  unsupportedReason: null,
  status: 'idle',
  interim: '',
  error: null,
  start: vi.fn(),
  stop: vi.fn(),
  cancel: vi.fn(),
  toggle: vi.fn(),
  clearError: vi.fn(),
};

const show = (patch: Partial<SpeechDictation>, lng: 'es' | 'en' = 'es') =>
  render(
    <I18nextProvider i18n={createI18n(lng)}>
      <DictationButton dictation={{ ...base, ...patch }} />
    </I18nextProvider>,
  );

describe('<DictationButton>', () => {
  it('is a toggle with a fixed label, aria-pressed and shortcut', () => {
    const toggle = vi.fn();
    const view = show({ toggle });
    const button = screen.getByRole('button', { name: 'Dictar la pregunta por voz' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Alt+V');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledTimes(1);
    view.unmount();
    show({ status: 'listening' });
    const pressed = screen.getByRole('button', { name: 'Dictar la pregunta por voz' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
    expect(pressed).toHaveClass('bi-mic--listening');
  });

  it('is disabled with an explanatory tooltip when unsupported', () => {
    show({ supported: false, unsupportedReason: 'browser' });
    const button = screen.getByRole('button', { name: /no soporta el dictado; usa Chrome o Safari/ });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(button).toHaveAttribute('title', expect.stringContaining('Chrome o Safari'));
  });

  it('is translated to English', () => {
    show({}, 'en');
    expect(screen.getByRole('button', { name: 'Dictate the question by voice' })).toBeInTheDocument();
  });
});

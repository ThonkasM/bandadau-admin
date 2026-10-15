import { describe, expect, it } from 'vitest';

import { buildLocaleDefinitions, buildVegaConfig } from './chart-theme';
import { datasetToCsv, datasetToObjects, normalizeDataset } from './dataset';
import { renderMarkdown } from './markdown';

describe('renderMarkdown (sanitizado)', () => {
  it('renders markdown but strips scripts, images and event handlers', () => {
    const html = renderMarkdown('## Hola\n\n**negrita** <script>alert(1)</script><img src=x onerror=alert(1)> [x](javascript:alert(1)) [ok](https://example.com)');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>negrita</strong>');
    expect(html).not.toMatch(/<script|<img|onerror|javascript:/i);
  });

  it('forces rel=noopener noreferrer on links', () => {
    const html = renderMarkdown('[panel](https://example.com)');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('dataset', () => {
  const raw = { columns: [{ name: 'a' }, 'b'], rows: [[1, 'x,y'], { a: 2, b: 'z' }] };
  it('normalizes columns and rows (arrays or objects)', () => {
    expect(normalizeDataset(raw)).toEqual({ columns: ['a', 'b'], rows: [[1, 'x,y'], [2, 'z']] });
    expect(normalizeDataset(null)).toBeNull();
    expect(normalizeDataset({ columns: [], rows: [] })).toBeNull();
  });
  it('exports CSV with quoting and row objects', () => {
    const ds = normalizeDataset(raw)!;
    expect(datasetToCsv(ds)).toBe('a,b\n1,"x,y"\n2,z');
    expect(datasetToObjects(ds)[0]).toEqual({ a: 1, b: 'x,y' });
  });
});

describe('chart theme (tokens -> Vega config)', () => {
  const css = (name: string) => ({ '--bd-color-chart-series-1': 'S1', '--bd-color-chart-series-2': 'S2', '--bd-color-bg-surface': 'BG', '--bd-color-chart-grid': 'GRID', '--bd-color-chart-axis': 'AXIS', '--bd-color-text-primary': 'TXT', '--bd-color-text-muted': 'MUTED' })[name] ?? '';
  it('takes background, axes and categorical range from the active theme tokens', () => {
    const config = buildVegaConfig(css) as { background?: string; range: { category: string[] }; axis: Record<string, string> };
    expect(config.background).toBe('BG');
    expect(config.range.category).toEqual(['S1', 'S2']);
    expect(config.axis.gridColor).toBe('GRID');
    expect(config.axis.domainColor).toBe('AXIS');
    expect(config.axis.labelColor).toBe('MUTED');
  });
  it('omits keys when the token is missing (no hard-coded fallbacks)', () => {
    expect(buildVegaConfig(() => '')).not.toHaveProperty('background');
  });
  it('builds number/date locale definitions from Intl per language', () => {
    const es = buildLocaleDefinitions('es');
    const en = buildLocaleDefinitions('en');
    expect(es.formatLocale.decimal).toBe(',');
    expect(en.formatLocale.decimal).toBe('.');
    expect(es.timeFormatLocale.months[0]).toBe('Enero');
    expect(en.timeFormatLocale.months[0]).toBe('January');
    expect(es.timeFormatLocale.date).toBe('%d/%m/%Y');
  });
});

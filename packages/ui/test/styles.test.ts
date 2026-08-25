import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.resetModules();

const { CSS, injectStyles } = await import('../src/styles.js');

describe('CSS', () => {
  it('is a non-empty string', () => {
    expect(typeof CSS).toBe('string');
    expect(CSS.length).toBeGreaterThan(0);
  });

  it('contains .slyxup-root', () => {
    expect(CSS).toContain('.slyxup-root');
  });

  it('contains --slx-accent', () => {
    expect(CSS).toContain('--slx-accent');
  });

  it('contains dark mode media query', () => {
    expect(CSS).toContain('prefers-color-scheme: dark');
  });

  it('contains @keyframes slx-shake', () => {
    expect(CSS).toContain('@keyframes slx-shake');
  });

  it('contains @keyframes slx-spin', () => {
    expect(CSS).toContain('@keyframes slx-spin');
  });

  it('contains prefers-reduced-motion', () => {
    expect(CSS).toContain('prefers-reduced-motion');
  });
});

describe('injectStyles', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.resetModules();
  });

  it('adds a style element to document head', async () => {
    const { injectStyles: inject } = await import('../src/styles.js');
    inject();
    const style = document.getElementById('slyxup-styles');
    expect(style).toBeTruthy();
    expect(style?.tagName).toBe('STYLE');
  });

  it('does not add duplicate styles', async () => {
    const { injectStyles: inject } = await import('../src/styles.js');
    inject();
    inject();
    expect(document.querySelectorAll('#slyxup-styles').length).toBe(1);
  });
});

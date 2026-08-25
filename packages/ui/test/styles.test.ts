import { describe, it, expect } from 'vitest';
import { CSS, injectStyles } from '../src/styles';

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

  it('contains card styles', () => {
    expect(CSS).toContain('.slx-card');
  });

  it('contains button styles', () => {
    expect(CSS).toContain('.slx-btn');
  });
});

describe('injectStyles', () => {
  it('is a function', () => {
    expect(typeof injectStyles).toBe('function');
  });
});

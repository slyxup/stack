import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { KeyholeMark, GoogleIcon, GitHubIcon, CheckIcon } from '../src/icons';

describe('KeyholeMark', () => {
  it('renders an SVG', () => {
    const { container } = render(<KeyholeMark />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('GoogleIcon', () => {
  it('renders an SVG', () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('GitHubIcon', () => {
  it('renders an SVG', () => {
    const { container } = render(<GitHubIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('CheckIcon', () => {
  it('renders an SVG', () => {
    const { container } = render(<CheckIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

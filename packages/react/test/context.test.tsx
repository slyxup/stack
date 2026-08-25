import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useAuthContext } from '../src/context/auth-context';

describe('useAuthContext', () => {
  it('should throw when used outside provider', () => {
    expect(() => renderHook(() => useAuthContext())).toThrow(
      'SlyxUp hooks must be used inside <SlyxUpProvider>'
    );
  });
});

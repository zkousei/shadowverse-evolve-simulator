import { describe, expect, it, vi } from 'vitest';
import { uuid } from './helpers';

describe('helpers', () => {
  it('creates a stable 9-character base36 id fragment from Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(uuid()).toHaveLength(9);
    expect(uuid()).toMatch(/^[a-z0-9]{9}$/);
  });
});

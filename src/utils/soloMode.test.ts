import { describe, expect, it } from 'vitest';
import { getPlayerLabel, getZoneOwner } from './soloMode';

describe('soloMode helpers', () => {
  it('detects zone owners from zone ids', () => {
    expect(getZoneOwner('hand-host')).toBe('host');
    expect(getZoneOwner('field-guest')).toBe('guest');
    expect(getZoneOwner('center')).toBeNull();
  });

  it('returns solo labels as player numbers', () => {
    expect(getPlayerLabel('host', true, 'My', 'Opponent', 'host')).toBe('Player 1');
    expect(getPlayerLabel('guest', true, 'My', 'Opponent', 'host')).toBe('Player 2');
  });

  it('returns p2p labels relative to the current role', () => {
    expect(getPlayerLabel('host', false, 'My', 'Opponent', 'host')).toBe('My');
    expect(getPlayerLabel('guest', false, 'My', 'Opponent', 'host')).toBe('Opponent');
  });
});

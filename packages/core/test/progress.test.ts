import { describe, expect, it } from 'vitest';
import { formatClock, formatRuntime, secondsToTicks, ticksToSeconds } from '../src/index';

describe('time helpers', () => {
  it('round-trips ticks', () => {
    expect(ticksToSeconds(secondsToTicks(12.4))).toBeCloseTo(12.4, 5);
  });

  it('formats a clock with hours', () => {
    expect(formatClock(2 * 3600 + 18 * 60)).toBe('2:18:00');
  });

  it('formats board-style runtimes', () => {
    expect(formatRuntime(2 * 3600 + 18 * 60)).toBe('2h 18m');
    expect(formatRuntime(54 * 60)).toBe('54m');
    expect(formatRuntime(6)).toBe('6s');
  });
});

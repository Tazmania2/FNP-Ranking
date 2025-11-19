import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFadeAnimation } from '../useFadeAnimation';

describe('useFadeAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should start with opacity 1', () => {
    const { result } = renderHook(() => useFadeAnimation());
    expect(result.current.opacity).toBe(1);
  });

  it('should remain at opacity 1 during visible phase (0-45s)', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Check at various points during visible phase
    act(() => {
      vi.advanceTimersByTime(10000); // 10s
    });
    expect(result.current.opacity).toBe(1);

    act(() => {
      vi.advanceTimersByTime(20000); // 30s total
    });
    expect(result.current.opacity).toBe(1);

    act(() => {
      vi.advanceTimersByTime(14000); // 44s total
    });
    expect(result.current.opacity).toBe(1);
  });

  it('should fade out during fade-out phase (45-60s)', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Move to start of fade-out phase (need to add a bit more to trigger the interval)
    act(() => {
      vi.advanceTimersByTime(45100); // 45.1s
    });

    // Should start fading out
    expect(result.current.opacity).toBeLessThan(1);
    expect(result.current.opacity).toBeGreaterThan(0);

    // Halfway through fade-out
    act(() => {
      vi.advanceTimersByTime(7500); // 52.6s total
    });
    expect(result.current.opacity).toBeCloseTo(0.5, 1);

    // End of fade-out
    act(() => {
      vi.advanceTimersByTime(7500); // 60.1s total
    });
    expect(result.current.opacity).toBeCloseTo(0, 1);
  });

  it('should fade in during fade-in phase (60-75s)', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Move to start of fade-in phase
    act(() => {
      vi.advanceTimersByTime(60000); // 60s
    });

    // Should start fading in
    expect(result.current.opacity).toBeGreaterThanOrEqual(0);
    expect(result.current.opacity).toBeLessThan(1);

    // Halfway through fade-in
    act(() => {
      vi.advanceTimersByTime(7500); // 67.5s total
    });
    expect(result.current.opacity).toBeCloseTo(0.5, 1);

    // End of fade-in (should be back to 1)
    act(() => {
      vi.advanceTimersByTime(7500); // 75s total
    });
    expect(result.current.opacity).toBeCloseTo(1, 1);
  });

  it('should repeat the cycle after 75 seconds', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Complete one full cycle
    act(() => {
      vi.advanceTimersByTime(75100); // 75.1s
    });
    expect(result.current.opacity).toBeCloseTo(1, 1);

    // Should be back at visible phase
    act(() => {
      vi.advanceTimersByTime(10000); // 85.1s total (10s into next cycle)
    });
    expect(result.current.opacity).toBe(1);

    // Move to fade-out in second cycle
    act(() => {
      vi.advanceTimersByTime(35000); // 120.1s total (45s into second cycle)
    });
    expect(result.current.opacity).toBeLessThan(1);
  });

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useFadeAnimation());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should update opacity smoothly with 100ms intervals', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Move to fade-out phase
    act(() => {
      vi.advanceTimersByTime(45000);
    });

    const opacity1 = result.current.opacity;

    // Advance by 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const opacity2 = result.current.opacity;

    // Opacity should have changed slightly
    expect(opacity2).not.toBe(opacity1);
    expect(Math.abs(opacity2 - opacity1)).toBeLessThan(0.1);
  });

  it('should handle multiple cycles correctly', () => {
    const { result } = renderHook(() => useFadeAnimation());

    // Visible phase - start
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current.opacity).toBe(1);

    // Fade-out phase - middle
    act(() => {
      vi.advanceTimersByTime(32500); // 52.5s total (middle of fade-out)
    });
    expect(result.current.opacity).toBeCloseTo(0.5, 1);

    // Fade-in phase - middle
    act(() => {
      vi.advanceTimersByTime(15000); // 67.5s total (middle of fade-in)
    });
    expect(result.current.opacity).toBeCloseTo(0.5, 1);

    // Back to visible - complete first cycle
    act(() => {
      vi.advanceTimersByTime(7600); // 75.1s total
    });
    expect(result.current.opacity).toBeCloseTo(1, 1);

    // Second cycle - visible phase
    act(() => {
      vi.advanceTimersByTime(20000); // 95.1s total
    });
    expect(result.current.opacity).toBe(1);
  });
});

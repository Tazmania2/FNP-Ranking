import { useState, useEffect, useRef } from 'react';

const VISIBLE_DURATION = 45000; // 45 seconds visible
const FADE_DURATION = 15000; // 15 seconds fade transition

interface UseFadeAnimationReturn {
  opacity: number;
}

/**
 * Hook to manage fade in/out animation cycle
 * Cycles: 45s visible (opacity 1) → 15s fade out → 15s fade in → repeat
 */
export const useFadeAnimation = (): UseFadeAnimationReturn => {
  const [opacity, setOpacity] = useState<number>(1);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateOpacity = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      
      // Total cycle: 45s visible + 15s fade out + 15s fade in = 75s
      const TOTAL_CYCLE = VISIBLE_DURATION + FADE_DURATION + FADE_DURATION;
      const cyclePosition = elapsed % TOTAL_CYCLE;

      if (cyclePosition < VISIBLE_DURATION) {
        // Phase 1: Visible (0-45s)
        setOpacity(1);
      } else if (cyclePosition < VISIBLE_DURATION + FADE_DURATION) {
        // Phase 2: Fading out (45-60s)
        const fadeOutProgress = (cyclePosition - VISIBLE_DURATION) / FADE_DURATION;
        setOpacity(1 - fadeOutProgress);
      } else {
        // Phase 3: Fading in (60-75s)
        const fadeInProgress = (cyclePosition - VISIBLE_DURATION - FADE_DURATION) / FADE_DURATION;
        setOpacity(fadeInProgress);
      }
    };

    // Update opacity immediately
    updateOpacity();

    // Update every 100ms for smooth animation
    intervalRef.current = window.setInterval(updateOpacity, 100);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { opacity };
};

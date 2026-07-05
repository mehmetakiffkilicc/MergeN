import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for animating counter numbers.
 * Smoothly animates from 0 to final value over specified duration.
 */
export function useCountAnimation(finalValue, duration = 3000) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const startValue = 0;
    const startTime = performance.now();
    startTimeRef.current = startTime;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Easeout quadratic
      const eased = 1 - Math.pow(1 - progress, 2);
      const currentValue = Math.round(startValue + (finalValue - startValue) * eased);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [finalValue, duration]);

  return displayValue;
}

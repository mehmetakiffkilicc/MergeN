import { useEffect, useRef } from 'react';

/**
 * Custom hook for focus trap functionality in modals and overlays.
 * Ensures keyboard navigation stays within the modal and Escape closes it.
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Get all focusable elements
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    if (firstElement) {
      firstElement.focus();
    }

    // Handle Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }

      // Tab handling - cycle through focusable elements
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift+Tab - go backward
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab - go forward
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);

    // Save previous focus to restore later
    const previousActiveElement = document.activeElement;

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus
      if (previousActiveElement && previousActiveElement.focus) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose]);

  return containerRef;
}

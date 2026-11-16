"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) return;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

    const initialFocusable = getFocusable();
    if (initialFocusable[0]) {
      initialFocusable[0].focus();
    } else {
      container.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }

      const focusables = getFocusable();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey) {
        if (document.activeElement === first || !container?.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container?.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, containerRef, onClose]);
}

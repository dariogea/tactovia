import { useEffect } from "react";

export function useDialogAccessibility() {
  useEffect(() => {
    let modal = null,
      opener = null;
    const visibleControls = () =>
      modal
        ? [
            ...modal.querySelectorAll(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
            ),
          ].filter((element) => element.getClientRects().length)
        : [];
    const sync = () => {
      const next =
        [...document.querySelectorAll('[role="dialog"]')].at(-1) || null;
      if (next === modal) return;
      if (!modal && next) opener = document.activeElement;
      modal = next;
      if (modal) {
        const first = visibleControls()[0];
        if (!modal.contains(document.activeElement)) first?.focus();
      } else if (opener?.isConnected) opener.focus();
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    function keydown(event) {
      if (!modal || event.defaultPrevented) return;
      if (event.key === "Escape") {
        const close = [...modal.querySelectorAll("button")].find(
          (button) =>
            button.getAttribute("aria-label") === "Cerrar" ||
            button.textContent.trim() === "Cancelar",
        );
        if (close) {
          event.preventDefault();
          event.stopPropagation();
          close.click();
        }
      }
      if (event.key === "Tab") {
        const controls = visibleControls();
        if (!controls.length) return;
        const first = controls[0],
          last = controls.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !modal.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !modal.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keydown);
    };
  }, []);
}

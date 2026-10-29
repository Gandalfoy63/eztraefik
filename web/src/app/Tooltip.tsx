// Docs: docs/05 - UI-UX/Components.md
// One tooltip for the whole app: any element with data-tooltip shows it on hover or keyboard focus.
// Nav items only show it when the sidebar is collapsed (their label is visible otherwise).
import { useEffect, useRef } from "react";

export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer = 0;
    let current: HTMLElement | null = null;
    const hide = () => {
      clearTimeout(timer);
      current = null;
      ref.current?.classList.remove("is-visible");
    };
    const show = (el: HTMLElement) => {
      const app = document.querySelector(".app") as HTMLElement | null;
      const isNav = el.classList.contains("nav-item") || el.classList.contains("sidebar-foot");
      if (isNav && (app?.dataset.sidebar !== "collapsed" || window.matchMedia("(max-width: 860px)").matches)) return;
      clearTimeout(timer);
      current = el;
      timer = window.setTimeout(() => {
        const tip = ref.current;
        if (!tip || current !== el || !el.isConnected) return;
        tip.textContent = el.dataset.tooltip || "";
        const r = el.getBoundingClientRect();
        const side = el.dataset.tooltipSide || "right";
        tip.dataset.side = side;
        if (side === "bottom") {
          tip.style.left = `${Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2))}px`;
          tip.style.top = `${r.bottom + 8}px`;
        } else {
          tip.style.left = `${r.right + 10}px`;
          tip.style.top = `${r.top + r.height / 2 - tip.offsetHeight / 2}px`;
        }
        tip.classList.add("is-visible");
      }, 250);
    };
    const over = (e: Event) => {
      const el = (e.target as HTMLElement).closest?.("[data-tooltip]") as HTMLElement | null;
      if (el && el !== current) show(el);
      if (!el && current) hide();
    };
    const focus = (e: Event) => {
      const el = (e.target as HTMLElement).closest?.("[data-tooltip]") as HTMLElement | null;
      if (el && el.matches(":focus-visible")) show(el);
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("click", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);
  return <div className="tooltip" ref={ref} role="tooltip" aria-hidden="true" />;
}

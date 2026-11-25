import { injectGlobalStyles, escapeAttr } from "../../core/index.js";

export interface ToastOptions {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  closable?: boolean;
  placement?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  closeLabel?: string;
}

const ICONS: Record<string, string> = {
  success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2"/><path d="M8 5v4M8 11h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 14L8 2l7 12H1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 7v3M8 12h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2"/><path d="M8 7v4M8 5h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

const CLOSE_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>`;

const CONTAINERS = new Map<string, HTMLDivElement>();
function injectStyles(): void {
  injectGlobalStyles("z-toast", `
    .z-toast-container {
      position: fixed;
      z-index: var(--z-z-toast);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      pointer-events: none;
      max-width: 380px;
    }
    .z-toast-container--top-right { top: 0; right: 0; }
    .z-toast-container--top-left { top: 0; left: 0; }
    .z-toast-container--bottom-right { bottom: 0; right: 0; }
    .z-toast-container--bottom-left { bottom: 0; left: 0; }
    .z-toast-container--top-center { top: 0; left: 50%; transform: translateX(-50%); }
    .z-toast-container--bottom-center { bottom: 0; left: 50%; transform: translateX(-50%); }

    .z-toast-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      color: var(--z-color-text);
      line-height: var(--z-line-height);
      pointer-events: auto;
      /* motion-check-ignore: 300ms 落在 quick(200) 与 slow(350) 之间，最近档差 17%，
         属可感知变更；本轮硬约束是零视觉回归，待视觉评审后归位（REQ-039 D4）。 */
      animation: z-toast-in 300ms ease-out;
      word-break: break-word;
    }
    .z-toast-item--removing {
      animation: z-toast-out var(--z-duration-quick) var(--z-ease-exit) forwards;
    }
    .z-toast-item__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      margin-top: 1px;
      /* [WHY] 图标是内联 SVG（stroke=currentColor），语义色由 type 修饰类下发，
         不再在 SVG 里写死 hex —— 否则暗色与换肤都跟不上（2026-10-25）。 */
      color: var(--toast-accent, var(--z-color-text-secondary));
    }
    .z-toast-item--success { --toast-accent: var(--z-color-success); }
    .z-toast-item--error { --toast-accent: var(--z-color-danger); }
    .z-toast-item--warning { --toast-accent: var(--z-color-warning); }
    .z-toast-item--info { --toast-accent: var(--z-color-info); }
    .z-toast-item__message {
      flex: 1;
      min-width: 0;
    }
    .z-toast-item__close {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      background: none;
      color: var(--z-color-text-secondary);
      cursor: pointer;
      border-radius: var(--z-radius-sm);
      padding: 0;
      margin-top: 1px;
      transition: background var(--z-transition-fast);
    }
    .z-toast-item__close:hover {
      background: var(--z-color-gray-100);
    }
    @keyframes z-toast-in {
      from { opacity: 0; transform: translateX(16px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes z-toast-out {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(16px); }
    }
  `);
}

function getContainer(placement: string): HTMLDivElement {
  let container = CONTAINERS.get(placement);
  if (!container) {
    container = document.createElement("div");
    container.className = `z-toast-container z-toast-container--${placement}`;
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
    CONTAINERS.set(placement, container);
  }
  return container;
}


let toastId = 0;

export class ZToast {
  static show(options: ToastOptions): { dismiss: () => void } {
    const {
      message,
      type = "info",
      duration = 3000,
      closable = true,
      placement = "top-right",
      closeLabel = "Close",
    } = options;

    injectStyles();

    const id = ++toastId;
    const icon = ICONS[type] ?? ICONS.info;
    const el = document.createElement("div");
    el.className = `z-toast-item z-toast-item--${type}`;
    el.setAttribute("data-toast-id", String(id));
    el.innerHTML = `
      <span class="z-toast-item__icon">${icon}</span>
      <span class="z-toast-item__message">${escapeAttr(message)}</span>
      ${closable ? `<button type="button" class="z-toast-item__close" aria-label="${escapeAttr(closeLabel)}">${CLOSE_ICON}</button>` : ""}
    `;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const dismiss = (): void => {
      if (el.classList.contains("z-toast-item--removing")) return;
      if (timer) { clearTimeout(timer); timer = null; }
      el.classList.add("z-toast-item--removing");
      el.addEventListener("animationend", () => {
        el.remove();
        // Clean up empty containers
        const container = getContainer(placement);
        if (container.children.length === 0) {
          container.remove();
          CONTAINERS.delete(placement);
        }
      }, { once: true });
    };

    // Close button
    if (closable) {
      const closeBtn = el.querySelector(".z-toast-item__close");
      closeBtn?.addEventListener("click", dismiss);
    }

    // Auto dismiss
    if (duration > 0) {
      timer = setTimeout(dismiss, duration);
    }

    // Pause timer on hover
    el.addEventListener("mouseenter", () => {
      if (timer) { clearTimeout(timer); timer = null; }
    });
    el.addEventListener("mouseleave", () => {
      if (duration > 0 && !timer) {
        timer = setTimeout(dismiss, duration);
      }
    });

    const container = getContainer(placement);
    container.appendChild(el);

    return { dismiss };
  }

  static success(message: string, duration?: number): { dismiss: () => void } {
    return ZToast.show({ message, type: "success", duration });
  }

  static error(message: string, duration?: number): { dismiss: () => void } {
    return ZToast.show({ message, type: "error", duration: duration ?? 5000 });
  }

  static warning(message: string, duration?: number): { dismiss: () => void } {
    return ZToast.show({ message, type: "warning", duration });
  }

  static info(message: string, duration?: number): { dismiss: () => void } {
    return ZToast.show({ message, type: "info", duration });
  }

  static dismissAll(placement?: string): void {
    if (placement) {
      const container = CONTAINERS.get(placement);
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.remove();
        CONTAINERS.delete(placement);
      }
    } else {
      CONTAINERS.forEach((container, key) => {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.remove();
        CONTAINERS.delete(key);
      });
    }
  }
}

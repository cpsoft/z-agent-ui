import tokensCss from "./tokens.css?raw";

const STORAGE_KEY = "zui-theme";
const TOKEN_STYLE_ID = "zui-theme-tokens";

export type Theme = "light" | "dark";

function isValidTheme(v: string): v is Theme {
  return v === "light" || v === "dark";
}

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && isValidTheme(v) ? v : null;
  } catch {
    return null;
  }
}

// [WHY] 外部项目只 import 组件时缺少 --z-* 设计 token, 组件 CSS 全部依赖 var() 会整体失效;
// init() 将 tokens.css 注入 document.head, 组件库开箱即用, 见 [[bug-20260810-external-css-tokens]]
function injectTokens(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(TOKEN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = TOKEN_STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

export class ThemeController {
  private _theme: Theme;
  private _initialized = false;

  constructor() {
    this._theme = getStoredTheme() ?? getSystemTheme();
  }

  get theme(): Theme {
    return this._theme;
  }

  set(value: Theme): void {
    if (this._theme === value) return;
    this._theme = value;
    this.apply(value);
    this.persist(value);
    document.dispatchEvent(new CustomEvent("z-theme-change", { detail: value }));
  }

  init(): void {
    // [WHY] 2026-09-26: 幂等保护 — demo shell 的 mountBackHome 会兜底调用, 页面可能已自行 init,
    // 重复初始化会重复注册 matchMedia 监听
    if (this._initialized) return;
    this._initialized = true;
    injectTokens();
    this.apply(this._theme);
    if (typeof window !== "undefined" && window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        // Only follow system if user hasn't manually set
        if (!getStoredTheme()) {
          this.set(e.matches ? "dark" : "light");
        }
      });
    }
  }

  toggle(): void {
    this.set(this._theme === "light" ? "dark" : "light");
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme);
  }

  private persist(theme: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // noop
    }
  }
}

export const themeController = new ThemeController();

/**
 * 零依赖自动按需加载器（Autoloader）。
 *
 * 扫描 DOM（含动态插入节点）中未注册的 `z-*` / `m-*` 自定义元素，
 * 自动解析到对应的组件子路径并触发动态 `import()`，实现「写标签即按需加载」。
 */

export type TagLoader = () => Promise<unknown> | unknown;

export interface AutoloaderOptions {
  /** 观察与扫描的根节点，默认 `document.body || document.documentElement`。 */
  root?: ParentNode;
  /**
   * 产物根 URL（例如 CDN 地址或静态目录 `/assets/z-agent-ui`）。
   * 不传时默认基于 `import.meta.url` 相对解析到同包 `dist/<subpath>.js`。
   */
  baseUrl?: string;
  /** 自定义加载函数（适合配合 Vite/Webpack 打包器或测试替身）。 */
  load?: (tagName: string, subpath: string) => Promise<unknown> | unknown;
  /** 允许的标签前缀，默认 `["z-", "m-"]`。 */
  prefixes?: readonly string[];
  /** 加载失败时的错误回调（默认静默吞错以免打断宿主渲染）。 */
  onError?: (tagName: string, error: unknown) => void;
}

export interface AutoloaderHandle {
  /** 手动触发一次全量扫描，返回本轮新发现标签全部加载完成的 Promise。 */
  discover(root?: ParentNode): Promise<void>;
  /** 停止 MutationObserver 监听。 */
  stop(): void;
}

/** 非 `components/<name>` 规则的标签 → 导出子路径映射表。 */
const SPECIAL_TAG_SUBPATHS: Readonly<Record<string, string>> = {
  // L1 同目录子组件
  "z-descriptions-item": "components/descriptions",
  "z-grid-col": "components/grid",
  "m-radio-group": "components/m-radio",
  // L0 primitives
  "z-portal": "primitives/portal",
  "z-position": "primitives/position",
  // L2 app
  "z-app-nav": "app/app-nav",
  "z-app-shell": "app/app-shell",
  "z-app-switcher": "app/app-switcher",
  "z-detail-form": "app/detail-form",
  "z-login": "app/login",
  "z-print": "app/print",
  // L2 content
  "z-code-editor": "content/code-editor",
  "z-json-viewer": "content/json-viewer",
  "z-markdown": "content/markdown",
  "z-rich-text": "content/rich-text",
  // L2 doc
  "z-doc-preview": "doc/preview",
  "z-doc-template-editor": "doc/editor",
  "z-doc-template-manager": "doc/manager",
  // L2 flow
  "z-flow": "flow",
  "z-flow-controls": "flow",
  "z-flow-handle": "flow",
  "z-flow-minimap": "flow",
  "z-flow-node": "flow",
  // L2 property
  "z-property-group": "property/group",
  "z-property-panel": "property/panel",
  "z-property-row": "property/row",
  // L2 report
  "z-chart": "report/chart",
  "z-chart-axis": "report/chart",
  "z-chart-series": "report/chart",
  "z-column-selector": "report/column-selector",
  "z-data-list": "report/data-list",
  "z-gantt": "report/gantt",
  "z-report-card": "report/card",
  "z-report-group-table": "report/elements",
  "z-report-table": "report/table",
};

const customLoaders = new Map<string, TagLoader>();
const inFlight = new Map<string, Promise<void>>();
const DEFAULT_PREFIXES: readonly string[] = ["z-", "m-"];

/** 注册自定义标签加载器（可用于业务自定义组件或覆盖内置路径）。 */
export function registerTagLoader(tagName: string, loader: TagLoader): void {
  customLoaders.set(tagName.toLowerCase(), loader);
}

/** 注销自定义标签加载器。 */
export function unregisterTagLoader(tagName: string): boolean {
  return customLoaders.delete(tagName.toLowerCase());
}

/**
 * 将标签名解析为包内导出子路径（不含 `.js` 后缀）。
 * 例：`z-button` → `components/button`、`m-card` → `components/m-card`、`z-report-table` → `report/table`。
 */
export function resolveTagSubpath(tagName: string): string | null {
  const tag = tagName.toLowerCase();
  if (!tag.includes("-")) return null;
  const special = SPECIAL_TAG_SUBPATHS[tag];
  if (special) return special;
  if (tag.startsWith("m-")) return `components/${tag}`;
  if (tag.startsWith("z-")) return `components/${tag.slice(2)}`;
  return null;
}

function defaultImportUrl(subpath: string, baseUrl?: string): string {
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/${subpath}.js`;
  }
  return new URL(`../${subpath}.js`, import.meta.url).href;
}

function collectUndefinedTags(
  root: ParentNode,
  prefixes: readonly string[],
  out: Set<string>,
): void {
  if (root instanceof Element) {
    const tag = root.tagName.toLowerCase();
    if (prefixes.some((p) => tag.startsWith(p)) && !customElements.get(tag)) {
      out.add(tag);
    }
    if (root.shadowRoot) {
      collectUndefinedTags(root.shadowRoot, prefixes, out);
    }
  }
  const elements = root.querySelectorAll("*");
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tag = el.tagName.toLowerCase();
    if (prefixes.some((p) => tag.startsWith(p)) && !customElements.get(tag)) {
      out.add(tag);
    }
    if (el.shadowRoot) {
      collectUndefinedTags(el.shadowRoot, prefixes, out);
    }
  }
}

function loadTag(tag: string, options: AutoloaderOptions): Promise<void> {
  if (customElements.get(tag)) return Promise.resolve();
  const existing = inFlight.get(tag);
  if (existing) return existing;

  const custom = customLoaders.get(tag);
  const subpath = resolveTagSubpath(tag);
  if (!custom && !subpath) return Promise.resolve();

  const task = Promise.resolve()
    .then(() => {
      if (custom) return custom();
      if (options.load) return options.load(tag, subpath!);
      const url = defaultImportUrl(subpath!, options.baseUrl);
      return import(/* @vite-ignore */ url);
    })
    .then(() => undefined)
    .catch((err) => {
      options.onError?.(tag, err);
    })
    .finally(() => {
      inFlight.delete(tag);
    });

  inFlight.set(tag, task);
  return task;
}

/** 扫描指定子树下所有未注册的 `z-*` / `m-*` 标签并并行按需加载。 */
export async function discover(
  root?: ParentNode,
  options: AutoloaderOptions = {},
): Promise<void> {
  const target = root ?? options.root ?? document.body ?? document.documentElement;
  if (!target) return;
  const prefixes = options.prefixes ?? DEFAULT_PREFIXES;
  const tags = new Set<string>();
  collectUndefinedTags(target, prefixes, tags);
  if (tags.size === 0) return;
  await Promise.all(Array.from(tags, (tag) => loadTag(tag, options)));
}

/**
 * 启动自动按需加载器：立即扫描当前 DOM，并通过 `MutationObserver` 持续监听后续插入的新标签。
 */
export function startAutoloader(options: AutoloaderOptions = {}): AutoloaderHandle {
  const root = options.root ?? document.body ?? document.documentElement;
  const prefixes = options.prefixes ?? DEFAULT_PREFIXES;

  const observer = new MutationObserver((mutations) => {
    const tags = new Set<string>();
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (node instanceof Element || node instanceof DocumentFragment) {
          collectUndefinedTags(node, prefixes, tags);
        }
      }
    }
    for (const tag of tags) {
      void loadTag(tag, options);
    }
  });

  if (root) {
    observer.observe(root, { childList: true, subtree: true });
    void discover(root, options);
  }

  return {
    discover: (r?: ParentNode) => discover(r ?? root, options),
    stop: () => observer.disconnect(),
  };
}

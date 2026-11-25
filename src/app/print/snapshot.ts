// 把「已经渲染完的 DOM」拍成一张可打印的静态快照。
//
// [WHY 需要扁平化而不是直接打印原页面] 组件的内容在 shadow root 里，而 shadow 里的样式
// 外部改不了 —— 想让表格不印出分页器、让冻结列归位，只有两条路：
//   ① 每个组件各写一份 `@media print`（打印知识散到 N 个组件里，新组件必忘）
//   ② 把这个组件子树展开成一份独立文档，由 z-print 一份样式统一排版
// 这里走 ②。扁平化的代价是 `:host` 与 `::slotted` 失去意义，所以要把它们改写；
// 换来的是组件**完全不需要知道打印存在**。
//
// 快照是静态的：没有 hover、没有 focus、没有事件。这正是"打印"该有的语义。
import { escapeAttr, escapeHtml } from "../../core/index.js";

/** 这些标签不进快照：页面源不是内容，脚本与样式已经另外收集。 */
const SKIP = new Set(["script", "style", "link", "meta", "template", "noscript", "title"]);

/** 空元素（不能有闭合标签，否则浏览器会多造一个同名节点）。 */
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * 把组件 CSS 里只对 shadow 有意义的选择器改写成扁平化后仍能命中的形式。
 *
 * - `:host([full])` → `z-modal[full]`
 * - `:host(.wide)`  → `z-button.wide`
 * - `:host`         → `z-button`
 * - `::slotted(span)` → `span`（槽内容已经平铺成普通后代）
 * - `:host-context(...)` → 一个永不匹配的类：它在快照里没有对应语义，
 *   宁可让那条规则失效，也不要让它「总是命中」（暗色专用规则一旦总命中，纸面会印成黑的）
 */
export function rewriteHost(css: string, tag: string): string {
  return css
    .replace(/:host-context\([^)]*\)/g, ".__z-print-never__")
    .replace(/:host\(([^()]*)\)/g, (_m, inner: string) => `${tag}${inner.trim()}`)
    .replace(/:host\b/g, tag)
    .replace(/::slotted\(([^()]*)\)/g, "$1");
}

/**
 * 收集浅色主题的 `--z-*` 令牌声明。
 *
 * [WHY 从样式表读而不是写死] 写死一份浅色值等于在 z-print 里复制半张令牌表 ——
 * 令牌改名/调色之后，纸面会悄悄用旧值（不报错、只是颜色不对）。读样式表则自动跟随。
 * [WHY 排除 dark] 宿主此刻可能正是暗色主题，但纸永远是白的：拿暗色值印出来就是一整页墨。
 */
export function collectLightTokens(): string {
  const decls: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    for (const r of Array.from(rules)) {
      const rule = r as CSSRule & {
        cssRules?: CSSRuleList;
        selectorText?: string;
        style?: CSSStyleDeclaration;
      };
      if (rule.selectorText && rule.style) {
        const sel = rule.selectorText;
        if (/light/.test(sel) && !/dark/.test(sel)) {
          for (const prop of Array.from(rule.style)) {
            if (prop.startsWith("--z-")) decls.push(`${prop}: ${rule.style.getPropertyValue(prop).trim()};`);
          }
        }
      } else if (rule.cssRules) {
        walk(rule.cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // 跨域样式表读不到 cssRules：跳过即可，令牌会缺一部分（页面仍能印，只是配色不全）
    }
  }
  return decls.length ? `:root{\n${decls.join("\n")}\n}` : "";
}

export interface SnapshotOptions {
  /** `@page` 规则（含页眉页脚与页码的 margin box） */
  pageRule: string;
  /** 隐藏 button/input/select 这类纸上无意义的控件 */
  hideInteractive: boolean;
}

export interface Snapshot {
  /** 完整 iframe 文档（含 doctype） */
  html: string;
}

/** 扁平化期间收集到的组件样式（按标签去重）。 */
function nodeToHtml(
  node: Node,
  css: string[],
  seen: Set<string>,
): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return ""; // 注释、处理指令一律丢掉

  const el = node as Element;
  const tag = el.localName;

  // 槽：用真正分配到这里的节点替换。必须在**原树**上调用 assignedNodes ——
  // 快照里的节点是字符串，早就没有分配关系了。
  if (tag === "slot") {
    const assigned = (el as HTMLSlotElement).assignedNodes({ flatten: true });
    return assigned.map((n) => nodeToHtml(n, css, seen)).join("");
  }

  if (SKIP.has(tag)) return "";

  // 组件样式：`static styles` 就是最终拼接好的 CSS 文本，直接拿
  const ctor = customElements.get(tag) as
    | (CustomElementConstructor & { styles?: string })
    | undefined;
  if (ctor?.styles && !seen.has(tag)) {
    seen.add(tag);
    css.push(rewriteHost(ctor.styles, tag));
  }

  let attrs = "";
  for (const a of Array.from(el.attributes)) {
    // slot 属性在扁平化后没有意义；style 稍后合并重写
    if (a.name === "slot" || a.name === "style") continue;
    attrs += ` ${a.name}="${escapeAttr(a.value)}"`;
  }

  // [WHY 把 computed display 固化进内联 style] 扁平化后 `<z-report-table>` 成了**未知元素**，
  // 而未知元素默认 `display: inline`。组件原本靠 `:host { display: block }`（已被改写成
  // 标签选择器）—— 但凡没写这一条的组件都会退回 inline，整块布局塌掉。
  // 直接读原树的 computed display 落到内联 style，与它屏幕上的实际表现一致。
  // 拿不到值（无布局环境）就不写，绝不产出 `display:;` 这种无效声明把原值顶掉。
  const computedDisplay = getComputedStyle(el).display;
  const inline = el.getAttribute("style")?.trim().replace(/;$/, "") ?? "";
  const style = [inline, computedDisplay ? `display:${computedDisplay}` : ""]
    .filter(Boolean)
    .join(";");
  if (style) attrs += ` style="${escapeAttr(style)}"`;

  const shadow = el.shadowRoot;
  const inner = shadow
    ? Array.from(shadow.childNodes).map((n) => nodeToHtml(n, css, seen)).join("")
    : Array.from(el.childNodes).map((n) => nodeToHtml(n, css, seen)).join("");

  const open = `<${tag}${attrs}>`;
  return VOID.has(tag) ? open : `${open}${inner}</${tag}>`;
}

/** 取这段子树的打印快照（CSS 与 HTML 都齐了，可以直接写进 iframe）。 */
export function buildSnapshot(root: HTMLElement, opts: SnapshotOptions): Snapshot {
  const css: string[] = [];
  const seen = new Set<string>();

  const body = Array.from(root.childNodes)
    .map((n) => nodeToHtml(n, css, seen))
    .join("");

  const base = `
/* 纸面复位：纸张没有滚动条，任何滚动容器都会把超宽内容裁掉而不是分页 */
body * { overflow: visible !important; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  color: #111;
  font: 12px/1.5 -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* 页眉页脚不在这里 —— 它们由 @page 的 margin box 画（见 Print.ts 的 _pageRule）。
   [WHY 不用 position: fixed] 实测（Chrome 142）：打印时 fixed 元素相对**页面内容区**而不是纸张，
   于是页眉必然盖住正文第一块内容 —— 表现为「表头凭空消失」，而屏幕上一切正常。
   margin box 画在纸张边距里，天然不侵入内容区，且每页重复、页码可递增。 */

/* 表格的通用纸面规则 —— 与组件无关，按标签生效。
   [WHY 放在 z-print 而不是各组件] 这是「纸张」的物理约束（分页、断行），不是组件的业务样式。
   任何组件只要渲染出真 <table>，就自动获得「表头每页重复」。 */
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
tr, li { break-inside: avoid; }

/* [WHY !important] 组件给表头写的是 position: sticky + top: 0 + z-index: 3（specificity 0,2,0），
   按标签的选择器（0,0,2）打不过它。而打印时的 sticky 是有害的：分页上下文里没有滚动容器，
   top: 0 会把表头钉在**纸张顶部**，正好钻到页眉底下 —— 纸上表现为「表头不见了」。
   这里必须靠 !important 盖掉，而且只能用标签选择器（z-print 不该知道组件的类名）。 */
thead th, thead td { position: static !important; top: auto !important; z-index: auto !important; }

table { border-color: #999; }
td, th { word-break: break-word; }
img, svg, canvas { max-width: 100%; }

${opts.hideInteractive ? "button, input, select, textarea { display: none !important; }" : ""}
`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${collectLightTokens()}
${css.join("\n")}
${base}
${opts.pageRule}
</style>
</head><body>
${body}
</body></html>`;

  return { html };
}

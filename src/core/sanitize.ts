// [WHY] 数据驱动的 HTML 只有一条可靠出路：解析成 DOM 再删危险节点/属性。
// 正则永远追不上 HTML 的语法变体（单引号/无引号/大小写/实体编码/控制字符分隔协议）。
// 见 [[bug-20261025-xss-injection]]
//
// 使用方：markdown（渲染 marked 产物）、rich-text（回填富文本 value）。
// 注意：本模块依赖 DOMParser，只能在浏览器/DOM 环境调用（组件运行时满足）。

export interface SanitizeOptions {
  /** 追加要整棵摘除的标签（小写）。默认集已覆盖脚本/框架/表单/样式外联。 */
  extraDropTags?: string[];
  /** 追加要删除的属性名（小写）。 */
  extraDropAttrs?: string[];
  /** 是否允许 data:image/*（base64 内联图）。默认 true。 */
  allowDataImage?: boolean;
}

/** 整棵摘除的标签：脚本执行、外联加载、表单提交、样式注入 */
const DROP_TAGS = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet",
  "link", "meta", "base", "form", "template",
]);

/** 可注入 URL 或可执行内容的属性，一律删除，不尝试「修正」 */
const DROP_ATTRS = new Set([
  "srcdoc", "formaction", "xlink:href", "action", "background", "poster", "srcset",
]);

/** 承载 URL 的属性：协议不安全时归一为 # */
const URL_ATTRS = new Set(["href", "src", "cite", "data", "longdesc", "usemap"]);

/**
 * 值本身就是 URL、但浏览器只在**动作发生时才解析**的属性（SVG 的 SMIL 动画）。
 *
 * [WHY 单独列] `<animate attributeName="href" values="javascript:alert(1)">` 里
 * 那个可执行协议不在 `href` 上，而在 `values` 上 —— URL_ATTRS 覆盖不到，
 * 而它确实能在点击时执行。处理方式是整条属性删掉（改写成 # 没有意义）。
 */
const SCRIPTABLE_VALUE_ATTRS = new Set(["values", "to", "from", "by"]);

const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|bmp);/i;
const DANGEROUS_SCHEME = /^(?:javascript|vbscript|data|file|blob|filesystem):/i;

/** 剔除控制字符与空白后判定协议 —— `java\tscript:` 是浏览器可执行、前缀检查却匹配不到的形式 */
function stripControl(s: string): string {
  return s.replace(/[\u0000-\u0020\u007f]/g, "");
}

/** 返回安全 URL；不安全时退化为 "#" */
function safeUrl(raw: string, allowDataImage: boolean): string {
  const probe = stripControl(raw).toLowerCase();
  if (!DANGEROUS_SCHEME.test(probe)) return raw;
  if (allowDataImage && probe.startsWith("data:") && SAFE_DATA_IMAGE.test(probe)) return raw;
  return "#";
}

/**
 * `url(...)` 调用。
 *
 * [WHY 三种分支] 值可以带单引号、双引号或不带引号，而**带引号时里面允许出现括号**
 * （`url('javascript:alert(1)')`）。用「到右括号为止」的单一字符类会在这里断掉 ——
 * 实测这条正则的第一版就漏了带引号的形式。
 */
const CSS_URL_CALL = /url\s*\(\s*(?:'([^']*)'|"([^"]*)"|([^'")]*))\s*\)/gi;

/**
 * 只清洗 `style` 里的 `url(...)`，不动其余内容。
 *
 * [WHY 不用 safeUrl 处理整个 style 值] 2026-11-14（D-L0-4）：原实现对「非 URL 属性」
 * 做了兜底 —— 只要**值的开头**命中危险协议，就把整个属性值换成 `#`。后果是普通文本
 * 被静默损坏：`title="file: not found"` → `title="#"`、`alt="data: chart"` → `"#"`。
 * 而它想防的其实只有一种形态：`style="background:url(javascript:…)"` ——
 * 协议藏在函数调用里、前面是 `url(`，靠「值开头」根本判不出来。
 *
 * 所以这里换成「按 url() 逐个判协议、逐个替换」：既保住 `url(data:image/png;base64,…)`
 * 这类合法的内联图（原实现会因整值被替换而一起干掉），也不再碰普通文本属性。
 */
function sanitizeCssUrls(css: string, allowDataImage: boolean): string {
  return css.replace(CSS_URL_CALL, (whole, sq?: string, dq?: string, bare?: string) => {
    const raw = sq ?? dq ?? bare ?? "";
    const probe = stripControl(raw).toLowerCase();
    if (!DANGEROUS_SCHEME.test(probe)) return whole;
    if (allowDataImage && SAFE_DATA_IMAGE.test(probe)) return whole;
    return "url(#)";
  });
}

/**
 * 清理一段 HTML，返回安全的等价 HTML。
 *
 * 策略：危险标签整个摘除；其余元素逐个删事件属性与可注入 URL 的属性。
 * 不做全量标签白名单 —— markdown / 富文本合法结构里有 `<details>` `<kbd>` `<blockquote>`，
 * 误杀成本高于收益；危险标签数量固定且可枚举，黑名单足够覆盖实际攻击面。
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html) return "";

  const dropTags = options.extraDropTags?.length
    ? new Set([...DROP_TAGS, ...options.extraDropTags.map((t) => t.toLowerCase())])
    : DROP_TAGS;
  const dropAttrs = options.extraDropAttrs?.length
    ? new Set([...DROP_ATTRS, ...options.extraDropAttrs.map((a) => a.toLowerCase())])
    : DROP_ATTRS;
  const allowDataImage = options.allowDataImage !== false;

  // DOMParser 产出的文档是惰性的：其中的 <script> 不会执行、<img onerror> 不会触发
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;

  for (const el of Array.from(body.querySelectorAll("*"))) {
    if (dropTags.has(el.tagName.toLowerCase())) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || dropAttrs.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRS.has(name)) {
        const fixed = safeUrl(attr.value, allowDataImage);
        if (fixed !== attr.value) el.setAttribute(attr.name, fixed);
        continue;
      }
      if (name === "style" && attr.value && /url\s*\(/i.test(attr.value)) {
        const fixed = sanitizeCssUrls(attr.value, allowDataImage);
        if (fixed !== attr.value) el.setAttribute(attr.name, fixed);
        continue;
      }
      // SVG 的 SMIL：可执行协议藏在 values/to/from/by 里，整条属性删掉
      if (SCRIPTABLE_VALUE_ATTRS.has(name) && attr.value && DANGEROUS_SCHEME.test(stripControl(attr.value))) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return body.innerHTML;
}

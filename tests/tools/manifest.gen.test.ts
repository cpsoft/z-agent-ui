// @vitest-environment happy-dom
//
// 组件契约清单**生成器**（显式动作，**不在** `npm test` 里跑）：
//   npm run manifest          生成/覆盖 registry/component-manifest.json
//   npm run manifest:check    生成到临时文件并与提交版逐字节比对（不一致退出码 1）
//
// [WHY 必须从 `npm test` 里挪出来] 这个文件直接 `fs.writeFileSync` 覆盖产物且没有任何断言。
// 挂进 `npm test` 会掩盖漂移：生成器先跑（写盘）→ 守卫后跑（读刚被写过的文件）→ 恒绿。
// 源码改了却没重新生成，本该红的那条从此永远绿（issue IKTJVR）。
// 现在由 `vitest.gen.config.ts` 单独收集，主配置 exclude `tests/tools/`。
//
// [WHY 需要这份清单] 本库的定位是「面向 AI 的页面/表单生成系统」——AI 不能靠读 83 个 .ts 猜
// 每个组件接受什么属性、取值域是什么、发什么事件。契约必须是一份**机器可读、可校验**的文件：
// 人写文档会漂移，从源码反射出来的不会。
//
// 守卫分两层（覆盖范围不同，别混）：
//   tests/unit/component-manifest-guard.test.ts   轻量、无反射：tag / source / stats 自洽
//   npm run manifest:check                        精确、重跑反射：全字段逐字节
//
// [WHY 必须挂在 DOM 上才能取元数据] `__zui_propertyMeta` 由 connectedCallback 里的
// applyPropertyMeta 写入，构造期不存在。所以这里 createElement + appendChild 再读。
//
// 本文件只能通过 vitest 运行（需要 TS 转译 + happy-dom）。写完即退出。

import { it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** 输出路径。`manifest:check` 通过环境变量指到临时文件，从而实现「生成不落盘」。 */
const OUT = process.env.MANIFEST_OUT ?? "registry/component-manifest.json";

/**
 * 组件源码的根目录。
 *
 * [WHY 不只扫 `src/components`] `primitives/` 与 `report/` 同样 `define`
 * 自定义元素。只扫 components 会静默漏掉 4 个（`z-portal` / `z-position` /
 * `z-report-card` / `z-report-group-table`）—— 清单少几行不报错、测试也不红，
 * 但 AI 读清单时会以为这些组件根本不存在，于是宁可用 div 拼一遍。
 * 与 vite.config.ts 的 `scanEntries` 同一个教训：**入口要按目录扫，不要手工枚举**。
 *
 * [WHY 2026-11-14 把 `src/report/elements` 换成 `src/report`] 报表域的四个组件族
 * （chart / gantt / table / data-list）从 `src/components/` 迁到 `src/report/` 之后，
 * 若只写 `src/report/elements` 就只剩一张卡，另外 4 个族**静默消失**。
 * **注意不能两个都留**：`scanDirs()` 会把 `src/report/elements` 收两次（一次来自
 * 根的遍历、一次来自它自己的 root），于是每个 tag 进清单两遍 —— 重复的标签比
 * 缺标签更难发现，因为数量看起来是对的。
 */
// [2026-11-15] 新增 src/doc / src/content / src/property：文档模板、内容渲染器、
// 属性面板从 editor/ 迁出（L2 复合件不该挂在 L3 的编辑器域下）。**九个根，每个只出现一次** ——
// 同时写 `src/report` 与 `src/report/elements` 会让 scanDirs() 把每个 tag 收两遍，
// 而「重复标签」比「缺标签」更难发现（数量看起来是对的）。
const ROOTS = [
  "src/components",
  "src/primitives",
  "src/report",
  "src/flow",
  "src/doc",
  "src/content",
  "src/property",
  "src/app",
];

/**
 * 扫描单元 = 带 `index.ts` 的目录。
 *
 * [WHY 递归 + 「组件边界就停」 2026-11-14] 组件按域分组后出现三级布局
 * （`src/editor/content/markdown`）。只扫一层会让**整批组件静默消失** ——
 * 清单少十几行、测试不红、退出码 0，只有标签数能看出来。
 *
 * 但无限深入也不行：`src/editor/page-editor/styles/index.ts` 是私有子模块，
 * 进去会把它当组件目录读一遍（顶层没有 define，白跑）。所以「有 index.ts 就停」。
 *
 * [WHY `isRoot` 例外] 域根本身也有 `index.ts`（`src/report/index.ts` 是域 barrel），
 * 但它下面还有组件 —— 根必须继续深入。只有**子目录**才能当组件边界。
 */
function scanDirs(): string[] {
  const out: string[] = [];
  const walk = (dir: string, isRoot: boolean) => {
    if (!fs.existsSync(dir)) return;
    const hasIndex = fs.existsSync(path.join(dir, "index.ts"));
    if (hasIndex) out.push(dir);
    if (hasIndex && !isRoot) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), false);
    }
  };
  for (const root of ROOTS) walk(root, true);
  return out;
}

/** 从源码里抠出属性的取值域：先认内联联合，再认类型别名（`type X = "a" | "b"`） */
/**
 * 跨文件「导出类型别名」索引：`size: ControlSize` 这种写法的取值域从哪来。
 *
 * [WHY 需要它] 只解析同文件别名时，`size: ControlSize` 会得到 `values: null`。
 * 于是清单里这一条只说「有个叫 size 的属性」，**不说能填什么** —— 而读清单的 AI
 * 只能猜，猜出来的值不报错、只是渲染成默认档（静默降级，本库最贵的一类缺陷）。
 * 只扫 `src/core`：跨组件的公共词表（ControlSize / Tone / Size）都在那里；
 * 组件私有的联合类型本来就写在同文件里，不需要跨文件解析。
 */
let ALIASES: Map<string, string[]> | null = null;
function aliasIndex(): Map<string, string[]> {
  if (ALIASES) return ALIASES;
  const map = new Map<string, string[]>();
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!p.endsWith(".ts") || p.endsWith(".d.ts")) continue;
      const src = fs.readFileSync(p, "utf8");
      // 同文件的 `const X = [...] as const`：`type Y = (typeof X)[number]` 要从这里取成员
      const arrays = new Map<string, string[]>();
      for (const a of src.matchAll(
        /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]\s*as\s+const/g,
      )) {
        arrays.set(a[1], [...a[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
      }
      for (const m of src.matchAll(/(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g)) {
        // 只收「纯字面量联合」——`type X = Record<...>` 这类不是取值域
        let members = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
        // `type ControlSize = (typeof CONTROL_SIZES)[number]` —— 本仓声明词表的惯用写法：
        // 数组管运行时（要遍历），类型由数组派生（不能两处各写一份，否则迟早漂）
        if (members.length < 2) {
          const t = /^\(\s*typeof\s+([A-Za-z_$][\w$]*)\s*\)\s*\[\s*number\s*\]$/.exec(m[2].trim());
          if (t) members = arrays.get(t[1]) ?? [];
        }
        if (members.length >= 2) map.set(m[1], members);
      }
    }
  };
  walk("src/core");
  ALIASES = map;
  return map;
}

function unionValuesOf(src: string, key: string): string[] | null {
  // 1) 该属性的类型注解
  const decl = new RegExp(`(?:@property\\([^)]*\\)\\s*)${key}\\s*:\\s*([^=;]+?)\\s*[=;]`, "m").exec(src);
  if (!decl) return null;
  const typeRef = decl[1].trim();

  // 2) 内联联合
  const inline = [...typeRef.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  if (inline.length >= 2) return inline;

  // 3) 类型别名（同文件内）—— 只处理纯标识符，否则 typeRef 里的 `|` 会被当成正则分支
  if (!/^[A-Za-z_$][\w$]*$/.test(typeRef)) return null;
  const alias = new RegExp(`(?:export\\s+)?type\\s+${typeRef}\\s*=\\s*([^;]+);`, "m").exec(src);
  if (!alias) {
    // 4) 跨文件共享词表（core）
    return aliasIndex().get(typeRef) ?? null;
  }
  const members = [...alias[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  return members.length >= 2 ? members : null;
}

/**
 * 层号 ← 顶层目录。**目录是唯一真源**（同 `tests/unit/l2-l3-boundary-guard.test.ts` 的 LAYER）。
 *
 * [WHY 要有这个字段] 清单是给 AI 与文档站读的。没有层号时 `z-chart` 与 `z-button` 在清单里
 * 长得一样：都是「一个有 30 个属性的标签」。读清单的模型会以为它们可以互换 —— 于是拿
 * `z-button` 的用法去套 `z-chart`（或反过来给按钮传 `series`）。层号是这一层**唯一的
 * 结构性事实**：base 只依赖 L0，composite 自带领域模型，page 认识 PageScript。
 *
 * [WHY 用 base/composite/page 而不是 L1/L2/L3] 清单是**对外契约**，消费者不关心编号，
 * 关心「这一类能不能独立用」。编号会随架构文档改（比如以后加 L4），名字不会。
 * L0 的两件（z-position / z-portal）叫 foundation —— 它们是机制不是控件。
 */
function layerOf(source: string): "foundation" | "base" | "composite" | "page" {
  const top = source.split("/")[1];
  if (top === "primitives") return "foundation";
  if (top === "components") return "base";
  if (top === "page" || top === "editor") return "page";
  // report / flow / doc / content / property / app —— 自带领域模型的复合件
  return "composite";
}

/** 从源码里抠出组件的一句摘要：跳过 [WHY] 记录，取第一个「像说明」的注释。
 *
 *  [WHY 块注释必须锚定在 class 之前] 本仓多数组件把说明写成文件头的 `//` 行，但
 *  `primitives/` 下几个老组件是 JSDoc 块（`/** <z-portal> renders ... *\/`）。
 *  只认 `//` 时它们的 summary 是空串 —— 清单少一句说明不会报错，读清单的 AI 只能靠 tag 名猜。
 *
 *  [WHY 不能「全文随便找一个 /**」] 那样 z-select 会拿到「组件默认占位文案。」、
 *  z-login 拿到「Get current form values.」—— 都是**属性/方法的注释**。填错比留空更糟：
 *  读清单的 AI 会把 z-select 当成一个「占位文案」组件。所以只认紧贴 `class ... extends`
 *  上方的那一块。
 */
function summaryOf(src: string): string {
  for (const line of src.split("\n").slice(0, 40)) {
    const m = /^\/\/\s*(.+)$/.exec(line);
    if (!m) continue;
    const text = m[1].trim();
    if (text.startsWith("[WHY") || text.startsWith("See:") || text.startsWith("[20")) continue;
    // [WHY 跳过装饰线] 本仓文件头常见 `// ═══════` 分隔线。它「像说明」—— 非空、不以 [WHY 开头，
    // 于是被当成摘要。2026-11-15 实测：37 个组件的摘要是 `═══…` 或空串，demo 卡片上直接显示成一排横线。
    // 判据：一行里既没有中文也没有拉丁字母，就只有装饰字符和空白 ⇒ 不是句子。
    if (!/[\u4e00-\u9fa5A-Za-z]/.test(text)) continue;
    return text.slice(0, 120);
  }

  const cls = /\b(?:export\s+)?class\s+[A-Za-z_$][\w$]*\s+extends\s+BaseElement/.exec(src);
  if (!cls) return "";
  const head = src.slice(0, cls.index).replace(/\s+$/, "");
  if (!head.endsWith("*/")) return "";
  const start = head.lastIndexOf("/**");
  if (start < 0) return "";
  for (const raw of head.slice(start + 3, head.length - 2).split("\n")) {
    const text = raw.replace(/^\s*\*?\s?/, "").trim();
    if (!text || text.startsWith("@") || text.startsWith("[WHY")) continue;
    return text.slice(0, 120);
  }
  return "";
}

/**
 * 组件「自己」的源码文件集合：定义 tag 的那个文件 + 同目录下**没有自己定义 tag** 的 .ts。
 *
 * [WHY 要沿目录递归] 组件的渲染逻辑常常拆在子目录里：`report/table` 的交互在
 * `table-interactions.ts`、`editor/page-view` 的在 `controllers/`。只看定义文件会漏掉
 * 大半事件 —— 而清单少一个事件不会报错，读清单的 AI 只会以为这个组件不发那个事件。
 *
 * [WHY 必须排除「同目录的其它组件」] `src/doc` 一个目录里塞了三个组件
 * （DocTemplateManager / DocTemplateEditor / DocPreview）。不排除的话，三个组件会拿到
 * 同一份合并后的事件集 —— **看起来完整，实际是把 A 的事件挂到了 B 上**，
 * 比漏掉更糟：照着清单写代码会监听一个永远不触发的事件。
 */
function ownSources(file: string, tagFiles: Set<string>): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!p.endsWith(".ts") || p.endsWith("index.ts")) continue;
      if (tagFiles.has(p) && p !== file) continue;
      out.push(p);
    }
  };
  walk(path.dirname(file));
  return out;
}

/**
 * 事件：`this.emit("z-x")` 与 `dispatchEvent(new CustomEvent("z-x"))` 两种形态。
 *
 * [WHY 两个都要] 全仓 254 处事件声明里，`emit()` 占绝大多数，但 `--z-theme-change`
 * 这类跨组件的广播走 `document.dispatchEvent(new CustomEvent(...))`。只认 emit 会漏掉
 * 一批「全局事件」，而它们恰恰是宿主最常监听的那几个。
 *
 * [WHY 动态名转成 `前缀-*`] 只有一处：`flow/FlowControls.ts` 的
 * ``emit(`z-control-${action}`)``。跳过它等于让清单说谎（Flow 确实会发 z-control-zoom 等）；
 * 原样写进清单又会让消费者以为有个叫 `${action}` 的事件。折成 `z-control-*` 表示「一族」。
 */
function eventsOf(files: string[]): string[] {
  const set = new Set<string>();
  const norm = (v: string) => v.replace(/\$\{[^}]*\}/g, "*");
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/\.emit\(\s*[`"']([^`"']+)[`"']/g)) set.add(norm(m[1]));
    for (const m of src.matchAll(/dispatchEvent\(\s*new\s+CustomEvent\(\s*[`"']([^`"']+)[`"']/g))
      set.add(norm(m[1]));
  }
  return [...set].sort();
}

/**
 * 插槽：`<slot>` 与 `<slot name="x">`。无名插槽记为 `default`。
 *
 * [为什么用 `default` 而不是空串] 清单是给人和 AI 读的，空串在一串名字里看不出来。
 * 仓里没有组件把插槽真的命名为 `default`（已核对），所以不会撞。
 */
function slotsOf(files: string[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/<slot([^>]*)>/g)) {
      const name = /name="([^"]*)"/.exec(m[1]);
      if (!name) {
        set.add("default");
        continue;
      }
      set.add(name[1].replace(/\$\{[^}]*\}/g, "*"));
    }
  }
  return [...set].sort();
}

it("生成 registry/component-manifest.json", async () => {
  const dirs = scanDirs();

  // 1) 抓全部 customElements.define 的 tag
  const tagRe = /customElements\.define\(\s*"([a-z0-9-]+)"\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  const entries: Array<{ tag: string; file: string }> = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".ts"))) {
      const file = `${d}/${f}`;
      const src = fs.readFileSync(file, "utf8");
      tagRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(src))) entries.push({ tag: m[1], file });
    }
  }

  // 全仓「定义了 tag 的文件」—— 用来把同目录的其它组件排除在 ownSources 之外
  const tagFiles = new Set(entries.map((e) => e.file));

  // 2) 全量 import 触发注册
  for (const d of dirs) {
    await import(path.resolve(`${d}/index.ts`)).catch((e) =>
      console.error("IMPORT_FAIL", d, String(e).slice(0, 120)),
    );
  }

  // 3) 逐个反射
  const components: any[] = [];
  const warnings: string[] = [];

  for (const { tag, file } of entries) {
    const ctor = customElements.get(tag) as any;
    if (!ctor) {
      warnings.push(`${tag}: 未能从 customElements 取到构造器`);
      continue;
    }

    let inst: any = null;
    try {
      inst = document.createElement(tag);
      document.body.appendChild(inst);
    } catch (e) {
      warnings.push(`${tag}: 挂载失败（${String(e).slice(0, 60)}）`);
    }

    const meta = (ctor.__zui_propertyMeta ?? []) as any[];
    const src = fs.readFileSync(file, "utf8");

    const properties = meta.map((m) => {
      const raw = inst ? inst[`__zui_prop_${m.key}`] : undefined;
      let def: unknown = raw;
      if (typeof raw === "function") def = "[function]";
      else if (raw && typeof raw === "object") def = Array.isArray(raw) ? [] : null;
      else if (raw === undefined) def = null;

      // 别名：kebab 是规范名；非显式 attribute 的还接受历史扁平名
      const aliasList = m.attribute === false
        ? []
        : m.attributeExplicit
          ? [m.attribute]
          : [m.attribute, m.key.toLowerCase()].filter((v, i, a) => v && a.indexOf(v) === i);

      return {
        name: m.key,
        attribute: m.attribute,
        aliases: aliasList,
        type: m.type?.name ?? "String",
        default: def,
        values: unionValuesOf(src, m.key),
      };
    });

    const own = ownSources(file, tagFiles);
    components.push({
      tag,
      source: file,
      layer: layerOf(file),
      summary: summaryOf(src),
      events: eventsOf(own),
      slots: slotsOf(own),
      properties,
    });

    inst?.remove();
  }

  components.sort((a, b) => a.tag.localeCompare(b.tag));

  const manifest = {
    $comment:
      "自动生成，勿手改。由 npm run manifest 从源码反射；改组件后没重新生成时，npm run manifest:check 会精确拦下（tag 级由 component-manifest-guard 在 npm test 里拦）。",
    library: "z-agent-ui",
    version: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
    stats: {
      components: components.length,
      byLayer: components.reduce<Record<string, number>>((acc, c: any) => {
        acc[c.layer] = (acc[c.layer] ?? 0) + 1;
        return acc;
      }, {}),
      properties: components.reduce((s, c) => s + c.properties.length, 0),
      events: components.reduce((s, c) => s + c.events.length, 0),
      // 有事件 / 有具名插槽的组件数 —— 两个「覆盖率」比总数更能说明契约完整度
      componentsWithEvents: components.filter((c) => c.events.length > 0).length,
      componentsWithNamedSlots: components.filter((c) => c.slots.some((x) => x !== "default"))
        .length,
      propertiesWithValues: components.reduce(
        (s, c) => s + c.properties.filter((p: any) => p.values).length,
        0,
      ),
      attributesOnly: components.reduce(
        (s, c) => s + c.properties.filter((p: any) => p.attribute === false).length,
        0,
      ),
    },
    components,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");

  console.log("MANIFEST_STATS", JSON.stringify(manifest.stats));
  if (warnings.length) console.log("WARNINGS", JSON.stringify(warnings, null, 2));
}, 180000);

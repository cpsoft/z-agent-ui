// demo 文案表的键对齐守卫。
//
// [背景] demo/i18n.ts 原来把 en / zh 两张表写在同一个文件里（996 行），
// 2026-10-25 审计按语言拆成 i18n/messages-{en,zh}.ts。拆开后两边各自演进，
// **少一条键不会报任何错**：`t()` 取不到时就返回键名本身，
// 表现是中文界面里孤零零冒出一句 "components.button.loading"。
// 这类缺失只在切到某种语言、恰好翻到那一页时才看得见，所以必须机器守。

import { readFileSync, readdirSync } from "node:fs";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { messagesEn } from "../../demo/i18n/messages-en.js";
import { messagesZh } from "../../demo/i18n/messages-zh.js";

type Tree = { [key: string]: string | Tree };

/** 把嵌套文案表压成 "a.b.c" 的扁平路径集合。 */
function flatten(obj: Tree, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(path);
    else out.push(...flatten(v, path));
  }
  return out.sort();
}

const enKeys = flatten(messagesEn as Tree);
const zhKeys = flatten(messagesZh as Tree);

describe("demo 文案表：en / zh 键结构一致", () => {
  it("两张表都不是空的（正则/结构改动导致空表时这条会先红）", () => {
    expect(enKeys.length).toBeGreaterThan(300);
    expect(zhKeys.length).toBeGreaterThan(300);
  });

  // [WHY components.* 只在 en 侧存在] 组件内置文案的默认值**本身就是中文**
  // （`src/core/copy.ts`，2026-11-15 文案收口）。中文侧若再写一遍同样的中文，
  // 等于维护第二份中文：库改一个用词，demo 不知道，界面上会出现两种说法 ——
  // 所以中文表里这个块被整块删掉了，切回中文时 `demo/i18n.ts` 走「写回元素初值」那条路。
  // 英文侧仍然需要它（英文界面要把组件内部也换成英文），于是两张表在这一块**刻意不对称**。
  const EN_ONLY_PREFIX = "components.";

  it("中文表覆盖英文表的每一个键（components.* 例外，见上方说明）", () => {
    const missing = enKeys.filter((k) => !zhKeys.includes(k) && !k.startsWith(EN_ONLY_PREFIX));
    expect(missing, `messages-zh.ts 缺这些键：\n${missing.join("\n")}`).toEqual([]);
    // 豁免必须仍然是「在用」的：en 的 components 块空了就该把这条豁免一起删掉，
    // 否则它会默默允许以后所有 components.* 键只写英文
    const enOnly = enKeys.filter((k) => k.startsWith(EN_ONLY_PREFIX));
    expect(enOnly.length, "messages-en.ts 的 components 块不见了，删掉上面那条豁免").toBeGreaterThan(10);
  });

  it("英文表覆盖中文表的每一个键（防止只加中文的键）", () => {
    const extra = zhKeys.filter((k) => !enKeys.includes(k));
    expect(extra, `messages-en.ts 缺这些键：\n${extra.join("\n")}`).toEqual([]);
  });

  it("没有空字符串文案（空值会渲染成一片空白，比缺键更难发现）", () => {    const empties: string[] = [];
    const walk = (obj: Tree, prefix = ""): void => {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          if (v.trim() === "") empties.push(path);
        } else walk(v, path);
      }
    };
    walk(messagesEn as Tree);
    walk(messagesZh as Tree);
    expect(empties).toEqual([]);
  });

  // [WHY] 这条比上面三条更要紧：重复键在**运行时对象里已经消失**（后者覆盖前者），
  // 所以任何「读对象去比对」的断言都看不见它。必须回头看源码文本。
  // 真例（2026-10-25 拆分时发现）：i18n.ts 里有两个根级 `reportTable: {`，
  // 第一个只有 desc，第二个是完整的 40+ 键 —— 第二个把第一个整块覆盖掉，
  // 于是 data-i18n="reportTable.desc"（index.html 目录页在用）渲染出的是键名本身。
  // 用 esbuild 的重复键告警做判据，和 vitest 转译时看到的是同一份事实。
  it("源码里没有重复键（被覆盖的键会成为死键，界面上直接显示键名）", () => {
    const bad: string[] = [];
    for (const f of ["demo/i18n/messages-en.ts", "demo/i18n/messages-zh.ts"]) {
      const res = transformSync(readFileSync(f, "utf8"), { loader: "ts", logLevel: "silent" });
      for (const w of res.warnings) {
        if (/Duplicate key/.test(w.text)) bad.push(`${f}:${w.location?.line} ${w.text}`);
      }
    }
    expect(bad, `重复键（后者会覆盖前者）：\n${bad.join("\n")}`).toEqual([]);
  });
});

// [WHY] 上面的键对齐只保证「两张表互相一致」，不保证「页面引用的键真的在表里」。
// `t()` 取不到时返回键名本身，于是页面上冒出一句 `reportTable.foo` —— 而它出现在
// 一个 13px 灰色说明位里，谁也不会当 bug 报。2026-10-27 体检时用正则扫了 5 条「缺失」，
// 其中 3 条是 `"form-basics"` 这类带引号的键、2 条是跨行写法，全都是**扫描器**的错觉。
// 所以这条断言必须读真正的对象（本文件顶部 import 的那两张表），不能读源码文本。
describe("demo 文案：页面引用的每个键都存在", () => {
  const byPath = (obj: Tree, path: string): string | undefined => {
    let cur: string | Tree | undefined = obj;
    for (const part of path.split(".")) {
      if (typeof cur !== "object" || cur === null) return undefined;
      cur = cur[part];
    }
    return typeof cur === "string" ? cur : undefined;
  };

  const htmlFiles = readdirSync("demo").filter((f) => f.endsWith(".html"));

  it("data-i18n / data-i18n-html / data-i18n-attr 的键都能在两张表里取到", () => {
    const missing: string[] = [];
    for (const f of htmlFiles) {
      const src = readFileSync(`demo/${f}`, "utf8");
      const keys = new Set<string>();
      for (const m of src.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) keys.add(m[1]);
      // data-i18n-attr 的格式是 "attr,key"（见 demo/i18n.ts 的 spec.split(",")）
      for (const m of src.matchAll(/data-i18n-attr="([^"]+)"/g)) {
        const key = m[1].split(",")[1]?.trim();
        if (key) keys.add(key);
      }
      for (const key of keys) {
        if (byPath(messagesEn as Tree, key) === undefined) missing.push(`${f}: ${key} (en 缺)`);
        if (byPath(messagesZh as Tree, key) === undefined) missing.push(`${f}: ${key} (zh 缺)`);
      }
    }
    expect(missing, `页面引用了表里没有的键，界面会直接显示键名：\n${missing.join("\n")}`).toEqual([]);
  });
});

// [WHY] 2026-10-27 博士反馈「demo 废话太多」：目录页 72 条说明句共 4730 字，
// 每条都是一整句自我推销（"Every visual decision in zAgentUI is…"、"Uses FloatingPosition
// + FocusTrap primitives"），扫描成本高于信息量。收敛后 2446 字、每条一行。
// 但文案是最容易「顺手补一句」回涨的东西，没有预算就会被下一轮功能说明重新灌满，
// 所以把「一条说明 = 能力清单，不是段落」写成断言。
// 判据用**显示宽度**而非字符数：中文按 2 计，才能让中英两条预算等价（12 汉字 ≈ 24 列）。
describe("demo 文案：说明性句子有长度预算", () => {
  const width = (s: string): number =>
    [...s].reduce((n, c) => n + (/[\u4e00-\u9fa5\uff00-\uffef]/.test(c) ? 2 : 1), 0);

  // 页面级导语（一句话说明这个页面是什么）比条目说明允许长一些
  const INTRO = new Set(["hero.desc", "pageDef.desc", "chart.subtitle", "reportTable.subtitle", "complexPage.subtitle"]);
  const BUDGET = { intro: 110, item: 64 };

  const get = (tree: Tree, path: string): string => {
    let cur: string | Tree | undefined = tree;
    for (const p of path.split(".")) if (typeof cur === "object" && cur) cur = cur[p];
    return typeof cur === "string" ? cur : "";
  };

  it("desc / subtitle / catalogDesc 不超预算（导语 110 列，条目 64 列）", () => {
    const over: string[] = [];
    for (const key of enKeys) {
      if (!/\.(desc|subtitle|catalogDesc)$/.test(key)) continue;
      const limit = INTRO.has(key) ? BUDGET.intro : BUDGET.item;
      for (const [lang, tree] of [["en", messagesEn], ["zh", messagesZh]] as const) {
        const value = get(tree as Tree, key);
        if (width(value) > limit) over.push(`${key} [${lang}] ${width(value)} > ${limit}: ${value}`);
      }
    }
    expect(over, `说明句超出预算，请压成能力清单而非段落：\n${over.join("\n")}`).toEqual([]);
  });
});


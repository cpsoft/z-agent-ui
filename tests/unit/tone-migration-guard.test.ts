// Test: L1 收口 —— `variant` 拆成 `tone`（语义色）与 `shape`（形状）之后，
// **旧名必须还能读，新名必须写得出，写错不能静默生效**。
//
// [WHY 三条都要判] 收口的风险不在「改名」，在改名之后的三种静默：
//   ① 旧页面继续写 `variant="danger"` → 若兼容读没挂上，属性被当成普通字段，
//      读得回自己写的值、界面上毫无变化、**零报错**（最难查的一类）；
//   ② 新代码写 `tone="danger"` → 若清单里没有这个属性，AI 生成器根本不知道该用它；
//   ③ 值拼错（`tone="dagner"`）→ 若实现「退回默认值」，拼写错误会被永久藏起来。
//
// 判据来源：`src/core/vocabulary.ts` 的 TONES + `resolveTone()`，
// 以及 `registry/component-manifest.json`（生成器从源码产出，防手改）。

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { resolveTone, TONE_ALIASES, TONES } from "../../src/core/vocabulary";

// 注册这 7 个元素（兼容读在 define 之前登记，见各文件末尾）
import "../../src/components/badge/index.js";
import "../../src/components/tag/index.js";
import "../../src/components/alert/index.js";
import "../../src/components/progress/index.js";
import "../../src/components/m-chip/index.js";
import "../../src/components/skeleton/index.js";
import "../../src/components/spinner/index.js";
import "../../src/components/button/index.js";
import "../../src/components/tabs/index.js";
import "../../src/components/drawer/index.js";
import "../../src/components/modal/index.js";
import "../../src/report/table/index.js";

interface Case {
  tag: string;
  /** 规范维度：语义色还是形状 */
  dimension: "tone" | "shape";
  /** 默认值（旧值清空后应当回到它） */
  fallback: string;
  /** 旧名 → 新值。空对象表示「旧值与新值同形」 */
  legacy: Record<string, string>;
}

const CASES: Case[] = [
  { tag: "z-badge", dimension: "tone", fallback: "default", legacy: { danger: "danger", error: "danger", secondary: "default" } },
  { tag: "z-tag", dimension: "tone", fallback: "default", legacy: { danger: "danger", error: "danger" } },
  { tag: "z-alert", dimension: "tone", fallback: "info", legacy: { error: "danger", info: "info", success: "success" } },
  { tag: "z-progress", dimension: "tone", fallback: "default", legacy: { danger: "danger", error: "danger" } },
  { tag: "m-chip", dimension: "tone", fallback: "default", legacy: { danger: "danger", error: "danger" } },
  { tag: "z-skeleton", dimension: "shape", fallback: "text", legacy: { circle: "circle", rect: "rect" } },
  { tag: "z-spinner", dimension: "shape", fallback: "border", legacy: { dots: "dots", grow: "grow" } },
];

const MANIFEST = JSON.parse(fs.readFileSync("registry/component-manifest.json", "utf8")) as {
  components: Array<{ tag: string; summary: string; properties: Array<{ name: string }> }>;
};

const byTag = new Map(MANIFEST.components.map((c) => [c.tag, c]));

describe("L1 收口：variant → tone / shape", () => {
  it("扫描面是活的（清单读不到这些 tag 时，下面的判据会全变哑巴）", () => {
    for (const c of CASES) expect(byTag.has(c.tag), `${c.tag} 不在清单里`).toBe(true);
    expect(CASES.length).toBe(7);
  });

  it("清单里只有新维度，没有 variant（新代码写不出旧名）", () => {
    const bad: string[] = [];
    for (const c of CASES) {
      const props = byTag.get(c.tag)!.properties.map((p) => p.name);
      if (!props.includes(c.dimension)) bad.push(`${c.tag}: 缺 ${c.dimension}`);
      if (props.includes("variant")) bad.push(`${c.tag}: 仍声明 variant`);
    }
    expect(bad, `这些组件的清单维度不对：\n${bad.join("\n")}`).toEqual([]);
  });

  it("旧 attribute 仍然驱动新属性（attribute 入口的兼容读）", () => {
    const bad: string[] = [];
    for (const c of CASES) {
      for (const [legacyValue, expected] of Object.entries(c.legacy)) {
        const el = document.createElement(c.tag) as HTMLElement & Record<string, unknown>;
        document.body.append(el);
        el.setAttribute("variant", legacyValue);
        const actual = el[c.dimension];
        if (actual !== expected) bad.push(`${c.tag} variant="${legacyValue}" → ${String(actual)}，应为 ${expected}`);
        // [WHY 还要看 attribute] 值对了但 attribute 没写出来时，JS 读起来完全正常，
        // 而 CSS 的 `:host([tone=…])` 匹配不到 → 渲染成默认样式。按钮收口时真的发生了
        // （applyPropertyMeta 在 connectedCallback 才装访问器，升级期的赋值不会反射）。
        if (el.getAttribute(c.dimension) !== expected) {
          bad.push(`${c.tag} variant="${legacyValue}"：属性值是 ${expected}，但 ${c.dimension} attribute 是 ${el.getAttribute(c.dimension)}`);
        }
        el.remove();
      }
    }
    expect(
      bad,
      `兼容读没生效。旧页面写 variant 会「看起来设置了、实际没渲染」：\n${bad.join("\n")}`,
    ).toEqual([]);
  });

  it("旧 JS 属性也走同一条映射（property 入口的兼容读）", () => {
    const bad: string[] = [];
    for (const c of CASES) {
      for (const [legacyValue, expected] of Object.entries(c.legacy)) {
        const el = document.createElement(c.tag) as HTMLElement & Record<string, unknown>;
        document.body.append(el);
        el.variant = legacyValue; // 老代码最常见的写法
        const actual = el[c.dimension];
        if (actual !== expected) bad.push(`${c.tag} .variant="${legacyValue}" → ${String(actual)}，应为 ${expected}`);
        if (el.getAttribute(c.dimension) !== expected) {
          bad.push(`${c.tag} .variant="${legacyValue}"：${c.dimension} attribute 没跟着写出来（CSS 会匹配不到）`);
        }
        el.remove();
      }
    }
    expect(
      bad,
      `属性入口没走映射：\`el.variant = x\` 会变成给实例加普通字段，界面不变且零报错。\n${bad.join("\n")}`,
    ).toEqual([]);
  });

  it("新名就是规范名（tone / shape 直接生效，不经过映射）", () => {
    const bad: string[] = [];
    for (const c of CASES) {
      const value = c.dimension === "tone" ? "warning" : c.fallback;
      const el = document.createElement(c.tag) as HTMLElement & Record<string, unknown>;
      document.body.append(el);
      el.setAttribute(c.dimension, value);
      if (el[c.dimension] !== value) bad.push(`${c.tag} ${c.dimension}="${value}" → ${String(el[c.dimension])}`);
      el.remove();
    }
    expect(bad).toEqual([]);
  });

  it("拼错的值不生效，也不会被当成合法默认值（避免把拼写错误藏起来）", () => {
    const bad: string[] = [];
    for (const c of CASES) {
      const el = document.createElement(c.tag) as HTMLElement & Record<string, unknown>;
      document.body.append(el);
      el.setAttribute("variant", "dagner"); // 故意拼错
      if (el[c.dimension] !== c.fallback) bad.push(`${c.tag}: 拼错的值被接受了 → ${String(el[c.dimension])}`);
      el.remove();
    }
    expect(bad, `拼错的历史值不该改变状态：\n${bad.join("\n")}`).toEqual([]);
  });

  it("z-button 的 variant 拆成 tone + appearance 两维，且两个 attribute 都写出来", async () => {
    const cases: Array<[string, string, string]> = [
      ["primary", "primary", "solid"],
      ["secondary", "default", "solid"],
      ["outline", "primary", "outline"],
      ["ghost", "primary", "ghost"],
      ["danger", "danger", "solid"],
    ];
    const bad: string[] = [];
    for (const [legacy, tone, appearance] of cases) {
      const el = document.createElement("z-button") as HTMLElement & Record<string, any>;
      document.body.append(el);
      el.setAttribute("variant", legacy);
      if (el.tone !== tone || el.appearance !== appearance) {
        bad.push(`${legacy} → (${el.tone}, ${el.appearance})，应为 (${tone}, ${appearance})`);
      }
      if (el.getAttribute("tone") !== tone || el.getAttribute("appearance") !== appearance) {
        bad.push(`${legacy} → attribute (${el.getAttribute("tone")}, ${el.getAttribute("appearance")})，CSS 会匹配不到`);
      }
      el.remove();
    }
    expect(bad, `按钮的两维映射不对：\n${bad.join("\n")}`).toEqual([]);
  });

  it("z-tabs / z-report-table / z-drawer / z-modal 的旧名也仍然生效", async () => {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const bad: string[] = [];

    // tabs：旧名此前是**死属性**（声明了但从未参与渲染），这次改名顺手接线
    const tabs = document.createElement("z-tabs") as HTMLElement & Record<string, any>;
    document.body.append(tabs);
    tabs.setAttribute("variant", "pills");
    await tick();
    if (tabs.tabStyle !== "pills") bad.push(`z-tabs variant="pills" → tabStyle=${tabs.tabStyle}`);
    if (tabs.getAttribute("tab-style") !== "pills") bad.push("z-tabs 没写出 tab-style attribute（CSS 会匹配不到）");
    if (!tabs.shadowRoot?.innerHTML.includes("z-tabs__tablist--pills")) {
      bad.push("z-tabs 的 pills 样式类没进模板 —— 旧名仍是死属性");
    }
    tabs.remove();

    // report-table：两值 variant → 布尔
    const rt = document.createElement("z-report-table") as HTMLElement & Record<string, any>;
    document.body.append(rt);
    rt.setAttribute("variant", "lines");
    await tick();
    if (rt.lines !== true) bad.push(`z-report-table variant="lines" → lines=${rt.lines}`);
    rt.setAttribute("variant", "default");
    await tick();
    if (rt.lines !== false) bad.push("z-report-table variant=\"default\" 没把 lines 关掉");
    rt.remove();

    // drawer / modal：size="full" → full 布尔
    for (const tag of ["z-drawer", "z-modal"]) {
      const el = document.createElement(tag) as HTMLElement & Record<string, any>;
      document.body.append(el);
      el.setAttribute("size", "full");
      await tick();
      if (el.full !== true) bad.push(`${tag} size="full" → full=${el.full}`);
      if (el.size === "full") bad.push(`${tag} 把 full 当成了尺寸档（应只剩 sm/md/lg）`);
      el.setAttribute("size", "lg");
      await tick();
      if (el.full !== false) bad.push(`${tag} 改成具体档位后 full 没关掉`);
      el.remove();
    }

    expect(bad, `这些旧写法失效了（不报错，只是样子不对）：\n${bad.join("\n")}`).toEqual([]);
  });

  it("resolveTone 覆盖别名表，且不把未知值当默认值", () => {
    expect(resolveTone("error")).toBe("danger");
    expect(resolveTone("secondary")).toBe("default");
    expect(resolveTone("info")).toBe("info"); // info 已升级为正式语义色，不再映射到 default
    expect(resolveTone("dagner")).toBeNull();
    expect(resolveTone(null)).toBeNull();
    // 别名表的每个值都必须是合法 tone，否则映射会产出词表外的值
    for (const [from, to] of Object.entries(TONE_ALIASES)) {
      expect(TONES, `${from} → ${to} 不在 TONES 里`).toContain(to);
    }
  });
});

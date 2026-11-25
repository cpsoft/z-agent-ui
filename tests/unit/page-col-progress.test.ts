// Test: `format=progress` 的条与数字在**同一列内必须对齐**（was: 轨道左端随文字宽度漂移）
// Date: 2026-11-11
//
// 为什么值得测：几何错位不会报错，只会「看起来像没渲染完」。
// 线上实测（督导配送日页，2026-11-11）：同一列九行，轨道左端的 x 坐标最大差 20px ——
// 因为整块 `justify-content: flex-end`，轨道的**右端**被右侧文字推着走，而
// 「0 / 3」比「19 / 29」窄 5 个字符。用户的原话是「已订货的 progress 也没对齐，差距那么大」。
//
// 判据不是「CSS 里写着 flex-start」，而是**轨道左端不依赖文字宽度**：
//   · 整块必须左对齐（`flex-start` / `start` / `normal`）—— 右对齐时轨道被文字宽度反向推动
//   · 轨道必须定宽 —— 百分比宽会让同一列各行的条长度随内容变
//   · 文字必须定宽 —— 否则数字各自为政，一列数字看着像没对齐
//
// [WHY 读 CSS 源码而不是跑 getComputedStyle] jsdom 不做布局，`width` 一律回 ""；
// 想拿真实几何只能上浏览器（那属于 e2e，不在单测里）。这里退一步钉住**三条声明**，
// 它们恰好就是「左端会漂移」的三个充分条件。
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(
  resolve(__dirname, "../../src/report/table/cell-semantic.css"),
  "utf8",
);

/** 取出一个选择器的声明块（第一个匹配）。 */
function blockOf(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`cell-semantic.css 里没有 ${selector}`);
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("}", open);
  return CSS.slice(open + 1, close);
}

/** 取一条声明的值（去注释、去空白）。声明不存在返回 undefined。 */
function decl(block: string, prop: string): string | undefined {
  const noComment = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(noComment);
  return m?.[1].trim();
}

describe("format=progress 的几何对齐", () => {
  it("整块左对齐（右对齐会让轨道左端随文字宽度漂移）", () => {
    const just = decl(blockOf(".zpg-progress"), "justify-content");
    expect(just, "必须显式左对齐").toBeDefined();
    // 只拦「会反向推动」的那几个值，允许 start / flex-start / normal
    expect(["flex-start", "start", "normal"]).toContain(just);
  });

  it("轨道定宽（百分比宽 → 同一列各行的条长度随内容变）", () => {
    const w = decl(blockOf(".zpg-progress__track"), "width");
    expect(w, "轨道必须有 width").toBeDefined();
    const px = /^(\d+)px$/.exec(w!);
    expect(px, `轨道宽度必须是像素定值，现在是 ${w}`).not.toBeNull();
    // 56px 是旧值：10% 的差别只有 5px，读不出「谁更缺」，所以这条下限挡住回退
    expect(Number(px![1])).toBeGreaterThanOrEqual(60);
  });

  it("文字定宽（否则数字各占各的宽度）", () => {
    const min = decl(blockOf(".zpg-progress__text"), "min-width");
    expect(min, "文字必须有 min-width").toBeDefined();
  });

  it("0% 时轨道可见（只剩空轨，不能与卡片底色同值）", () => {
    const track = blockOf(".zpg-progress__track");
    // 要么给可见描边，要么换底色 —— 二者都没有就是「这格没画条」
    const visible = decl(track, "box-shadow") ?? decl(track, "border");
    expect(visible, "空轨必须有一条可见的边").toBeDefined();
  });
});

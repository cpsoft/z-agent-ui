// Test: z-chart 自适应高度的 chrome 扣除 —— 画布不得溢出宿主（横轴标签被裁的回归闸门）
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-10-25
// Author: AI
//
// [为什么这个用例要自己造布局] happy-dom 没有排版引擎：clientHeight / getBoundingClientRect
// 全返回 0，于是任何 DOM 断言都恒绿 —— 而这条缺陷的全部内容就是「谁被减掉了」。
// 所以这里给「宿主 → 画布」的垂直关系建一个最小模型（图例填了内容，画布才下移），
// 断言的是 svg 的 height 属性。三个变异点都会让它变红：
//   1. 去掉 _chromeH 缓存、改用当轮实测 → 该轮图例还是空的 → chrome=0 → svg=宿主高
//   2. chrome 用 offsetHeight 相加 → happy-dom 里恒 0 → 漏掉 margin → svg 多 29
//   3. resolveSize 不再减 chrome → svg=宿主高

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../../../src/report/chart/index";

const HOST_H = 232;
const HOST_W = 1200;
/** 图例填上内容后，画布顶相对宿主顶的下移量（title 0 + legend 21 + legend margin-top 8）。 */
const CHROME = 29;

const proto = HTMLElement.prototype as any;
let restoreRect: (() => void) | null = null;

/** 装一个「图例有内容才把画布推下去」的最小排版模型。 */
function installLayoutModel(): void {
  const orig = proto.getBoundingClientRect;
  const origCH = Object.getOwnPropertyDescriptor(proto, "clientHeight");
  const origCW = Object.getOwnPropertyDescriptor(proto, "clientWidth");

  proto.getBoundingClientRect = function (this: HTMLElement) {
    const isPlot = this.classList?.contains("z-chart__plot");
    if (!isPlot) {
      return { top: 0, bottom: HOST_H, left: 0, right: HOST_W, width: HOST_W, height: HOST_H, x: 0, y: 0, toJSON() {} };
    }
    // 图例空着 ⇒ 画布就贴在宿主顶上；填了内容 ⇒ 下移 CHROME
    const legend = (this.getRootNode() as ShadowRoot)?.querySelector?.(".z-chart__legend");
    const filled = (legend?.childElementCount ?? 0) > 0;
    const top = filled ? CHROME : 0;
    return { top, bottom: top + 100, left: 0, right: HOST_W, width: HOST_W, height: 100, x: 0, y: top, toJSON() {} };
  };
  Object.defineProperty(proto, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName?.toLowerCase() === "z-chart" ? HOST_H : 0;
    },
  });
  Object.defineProperty(proto, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName?.toLowerCase() === "z-chart" ? HOST_W : 0;
    },
  });

  restoreRect = () => {
    proto.getBoundingClientRect = orig;
    if (origCH) Object.defineProperty(proto, "clientHeight", origCH);
    if (origCW) Object.defineProperty(proto, "clientWidth", origCW);
  };
}

async function flush(n = 6): Promise<void> {
  for (let i = 0; i < n; i += 1) await new Promise((r) => setTimeout(r, 0));
}

function svgHeight(el: any): number {
  const svg = el.shadowRoot?.querySelector(".z-chart__svg");
  return Number(svg?.getAttribute("height"));
}

describe("z-chart 自适应高度", () => {
  beforeEach(() => installLayoutModel());
  afterEach(() => {
    restoreRect?.();
    restoreRect = null;
    document.body.innerHTML = "";
  });

  it("height=auto 时 svg 高度 = 宿主高 - chrome（图例不把画布挤出宿主）", async () => {
    const el = document.createElement("z-chart") as any;
    el.type = "bar";
    el.animation = false;
    el.innerHTML = `<z-chart-series name="S" type="bar" data="10,20,30"></z-chart-series>`;
    document.body.appendChild(el);
    await flush();

    // 每侧都必须有真实数值：两版都为 0 也算「相等」的那种假绿不要
    expect(svgHeight(el)).toBeGreaterThan(0);
    expect(el.shadowRoot.querySelector(".z-chart__legend")?.childElementCount ?? 0).toBeGreaterThan(0);
    expect(svgHeight(el)).toBe(HOST_H - CHROME);
  });

  it("宿主高度变化后重新收敛（不是只在首帧算对）", async () => {
    const el = document.createElement("z-chart") as any;
    el.type = "bar";
    el.animation = false;
    el.innerHTML = `<z-chart-series name="S" type="bar" data="10,20,30"></z-chart-series>`;
    document.body.appendChild(el);
    await flush();
    expect(svgHeight(el)).toBe(HOST_H - CHROME);

    // 宿主换高：手动 requestUpdate（真机上由 ResizeObserver 触发，同一入口）
    Object.defineProperty(proto, "clientHeight", {
      configurable: true,
      get: () => 300,
    });
    el.requestUpdate();
    await flush();
    expect(svgHeight(el)).toBe(300 - CHROME);
  });
});

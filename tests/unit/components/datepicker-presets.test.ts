// Test: z-datepicker 的快捷区间（presets 属性，issue IKUE1G）
// Related: [[IKUE1G]]
// Wiki: wiki/reference/pagedef-filters.md
// Date: 2026-11-11
//
// 组件这一层的验收只有三条，但每条都能独立坏掉：
//   1. `presets=` 里的名字变成面板上的一排按钮（不认识的不画）；
//   2. 点一下写入 start / end 两个值、发 `z-change {start,end}`、关面板（一次点击结束）；
//   3. 只有**完全等于**某个预设时才高亮 —— 手选的自定义区间不许点亮预设。
//
// 期望日期全部手写字面量；「今天」用只 fake Date 的假时钟固定（不 fake setTimeout，
// 否则面板定位/关闭动画的 flush 永远等不到）。

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/datepicker/Datepicker";

const NOW = new Date(2026, 9, 27, 10, 0, 0); // 2026-10-27 本地

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function create(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-datepicker") as any;
  el.innerHTML = '<input slot="trigger" readonly>';
  document.body.appendChild(el);
  Object.assign(el, props);
  return el;
}

function presetsInPanel(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".z-datepicker__preset"));
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("z-datepicker 快捷区间", () => {
  it("range + presets：面板上出现对应按钮（不认识的名字不画）", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const el = create({ mode: "range", presets: "今天,近7天,瞎写的" });
    await flush();
    el.show();
    await flush();

    const labels = presetsInPanel().map((b) => b.textContent);
    expect(labels).toEqual(["今天", "近7天"]);
  });

  it("single 模式不吃 presets（单选日历没有区间可快选）", async () => {
    const el = create({ presets: "今天,近7天" });
    await flush();
    el.show();
    await flush();
    expect(presetsInPanel()).toHaveLength(0);
  });

  it("点「近30天」：写入起止两个值、发 z-change、关面板", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const el = create({ mode: "range", presets: "近30天" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);
    el.show();
    await flush();

    presetsInPanel()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(el.start).toBe("2026-09-28");
    expect(el.end).toBe("2026-10-27");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ start: "2026-09-28", end: "2026-10-27" });
    // 快捷键的价值就是「一次点击结束」：选完还留着一个开着的日历等于让人再点一下
    expect(el.open).toBe(false);
  });

  it("完全匹配时高亮", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const el = create({ mode: "range", presets: "近30天", start: "2026-09-28", end: "2026-10-27" });
    await flush();
    el.show();
    await flush();
    expect(presetsInPanel()[0].classList.contains("is-active")).toBe(true);
    expect(presetsInPanel()[0].getAttribute("aria-pressed")).toBe("true");
  });

  it("手选的区间不点亮预设", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    // 差一天的自定义区间：区间带看起来几乎一样，但预设不该亮
    const el = create({ mode: "range", presets: "近30天", start: "2026-09-29", end: "2026-10-27" });
    await flush();
    el.show();
    await flush();
    expect(presetsInPanel()[0].classList.contains("is-active")).toBe(false);
    expect(presetsInPanel()[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("区间整段落在 min 之外：按钮置灰（点下去没反应的东西不该可点）", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const el = create({ mode: "range", presets: "上月", min: "2026-10-01" });
    await flush();
    el.show();
    await flush();

    expect(presetsInPanel()[0].disabled).toBe(true);
  });

  it("min / max 与预设冲突时夹到边界内", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const el = create({ mode: "range", presets: "近30天", min: "2026-10-05" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);
    el.show();
    await flush();

    presetsInPanel()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    // 预设是 09-28 ~ 10-27，下界抬到 10-05
    expect(spy.mock.calls[0][0].detail).toEqual({ start: "2026-10-05", end: "2026-10-27" });
  });
});

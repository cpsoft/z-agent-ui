// Test: z-datepicker 的清除入口（筛选用）
//
// [WHY 单独一个文件] 清除是**运行时**行为（点一下就退回不筛），和「选日期」是两条路径：
// 选的路径在 datepicker.test.ts 里覆盖，清空还要管「不打开面板」和「区间半截也能退」。
//
// 判据（验收标准）：点了 × 之后，宿主收到的值必须是空串，而不是回到某个默认值 ——
// 渲染层用 `filterOr()` 按「键在不在」取值，空串是「用户主动清了」的唯一表达。

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/datepicker/Datepicker";

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

function clearBtn(el: any): HTMLElement | null {
  return el.shadowRoot?.querySelector(".z-datepicker__clear") ?? null;
}

function clickClear(el: any): void {
  clearBtn(el)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("z-datepicker 清除入口", () => {
  it("clearable 缺省关闭：有值也不出清除钮（表单里清空只会造出非法态）", async () => {
    const el = create({ value: "2026-09-15" });
    await flush();
    expect(clearBtn(el)).toBeNull();
    document.body.removeChild(el);
  });

  it("没有值时不显示清除钮", async () => {
    const el = create({ clearable: true });
    await flush();
    expect(clearBtn(el)).toBeNull();
    document.body.removeChild(el);
  });

  it("单选有值时点 ×：值变空串、通知宿主，且不打开面板", async () => {
    const el = create({ clearable: true, value: "2026-09-15" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);

    clickClear(el);
    await flush();

    expect(el.value).toBe("");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: "" });
    // 清空时顺手弹出日历，用户会以为「没点中 / 想重新选」
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("区间只选了起点也算有值：半截区间同样能退回去", async () => {
    const el = create({ clearable: true, mode: "range", start: "2026-09-01" });
    await flush();
    expect(clearBtn(el)).not.toBeNull();
    document.body.removeChild(el);
  });

  it("区间清空：两端的值一起归零，通知里 start / end 都是空串", async () => {
    const el = create({ clearable: true, mode: "range", start: "2026-09-01", end: "2026-09-30" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);

    clickClear(el);
    await flush();

    expect(el.start).toBe("");
    expect(el.end).toBe("");
    expect(spy.mock.calls[0][0].detail).toEqual({ start: "", end: "" });
    document.body.removeChild(el);
  });

  it("面板开着时点 ×：清空并关闭（值空了面板还留着像个空壳）", async () => {
    const el = create({ clearable: true, value: "2026-09-15" });
    await flush();
    el.show();
    await flush();
    expect(el.open).toBe(true);

    clickClear(el);
    await flush();

    expect(el.value).toBe("");
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });
});

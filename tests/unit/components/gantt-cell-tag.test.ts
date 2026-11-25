// Test: 甘特左列内容槽 —— columns[].cellTag 在左列挂成真元素（含滚动切片后仍挂）
// Related: architecture/l2-decompose-plan.html §5.5（甘特内容槽）
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-11-23
//
// [WHY 这条要有] 甘特有**两个**写 DOM 的地方：整棵重建与虚拟滚动的切片替换。
// 只挂一处的话，滚动一下窗口里的自定义元素就退回兜底文本 —— 界面上只是「滚动后变朴素」，
// 不会报任何错。这条把两侧一起钉住：初次渲染挂上，换窗口后还在。

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../../src/report/gantt/Gantt";
import type { ZGantt } from "../../../src/report/gantt/Gantt";
import { resetCellTagWarnings } from "../../../src/report/gantt/left-cell-mount";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

class ZGanttTestCell extends HTMLElement {
  value: unknown;
  row: Record<string, unknown> | null = null;
  index = -1;
  selected = false;
  connectedCallback(): void {
    this.textContent = `${String(this.value)}@${this.index}`;
  }
}
if (!customElements.get("z-gantt-test-cell")) {
  customElements.define("z-gantt-test-cell", ZGanttTestCell);
}

let gantt: ZGantt;

beforeEach(async () => {
  resetCellTagWarnings();
  gantt = document.createElement("z-gantt") as ZGantt;
  gantt.today = "2026-09-15";
  gantt.data = {
    tasks: Array.from({ length: 30 }, (_, i) => ({
      id: `r${i}`,
      name: `Task ${i}`,
      start_date: "2026-09-01",
      end_date: "2026-09-03",
      progress: i * 3,
    })),
    dependencies: [],
  } as any;
  gantt.columns = [
    { key: "name", title: "任务", width: 160 },
    { key: "progress", title: "进度", width: 80, cellTag: "z-gantt-test-cell" },
  ] as any;
  document.body.appendChild(gantt);
  await wait();
});

afterEach(() => {
  document.body.removeChild(gantt);
});

const cells = (): ZGanttTestCell[] =>
  Array.from(gantt.shadowRoot!.querySelectorAll<ZGanttTestCell>("z-gantt-test-cell"));

describe("甘特左列内容槽", () => {
  it("挂成真元素，注入 value 与 index", async () => {
    expect(cells().length, "每行都该挂一个").toBeGreaterThan(0);
    const first = cells()[0];
    expect(first.value).toBe(0);
    expect(first.index).toBe(0);
    expect(first.textContent).toBe("0@0");
  });

  it("首列不配 cellTag 时保留展开钮结构（树控件不能被内容槽顶掉）", async () => {
    const firstTd = gantt.shadowRoot!.querySelector(".z-gantt__tr .z-gantt__td");
    expect(firstTd!.querySelector(".z-gantt__expander"), "展开钮是容器的控制件").not.toBeNull();
    expect(firstTd!.querySelector(".z-gantt__name")!.textContent).toContain("Task 0");
  });

  it("未注册标签降级为文本，且只警告一次", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const g2 = document.createElement("z-gantt") as ZGantt;
    g2.today = "2026-09-15";
    g2.data = {
      tasks: [
        { id: "a", name: "A", start_date: "2026-09-01", end_date: "2026-09-03" },
        { id: "b", name: "B", start_date: "2026-09-01", end_date: "2026-09-03" },
      ],
    } as any;
    g2.columns = [
      { key: "name", title: "任务", width: 160 },
      { key: "name", title: "别名", width: 80, cellTag: "z-nope-cell" },
    ] as any;
    document.body.appendChild(g2);
    await wait();

    const fallback = g2.shadowRoot!.querySelectorAll(".z-cell-fallback");
    expect(fallback.length, "降级后文本必须还在").toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(1);
    g2.remove();
    warn.mockRestore();
  });
});

describe("甘特条内内容槽", () => {
  class ZBarCell extends HTMLElement {
    value: unknown;
    row: Record<string, unknown> | null = null;
    index = -1;
    selected = false;
    connectedCallback(): void {
      this.textContent = `bar:${String(this.value)}`;
    }
  }
  if (!customElements.get("z-gantt-bar-cell")) {
    customElements.define("z-gantt-bar-cell", ZBarCell);
  }

  it("task.barTag 配了就把条上的默认标签换成本元素", async () => {
    const g = document.createElement("z-gantt") as ZGantt;
    g.today = "2026-09-15";
    g.data = {
      tasks: [
        { id: "a", name: "A", start_date: "2026-09-01", end_date: "2026-09-05", barTag: "z-gantt-bar-cell" },
        { id: "b", name: "B", start_date: "2026-09-02", end_date: "2026-09-06" },
      ],
    } as any;
    document.body.appendChild(g);
    await wait();

    const mounted = g.shadowRoot!.querySelectorAll<ZBarCell>(".z-gantt__bar z-gantt-bar-cell");
    expect(mounted.length, "只有配了 barTag 的那一条该换").toBe(1);
    expect(mounted[0].value).toBe("A");
    expect((mounted[0].row as any).id).toBe("a");
    // 没配的那条必须还是原来的文本标签
    const plain = Array.from(g.shadowRoot!.querySelectorAll(".z-gantt__bar-label")).find(
      (el) => !el.hasAttribute("data-cell-tag"),
    );
    expect(plain!.textContent).toContain("B");
    g.remove();
  });

  it("几何与手势不受内容槽影响（条仍带 data-mode=move）", async () => {
    const g = document.createElement("z-gantt") as ZGantt;
    g.today = "2026-09-15";
    g.data = {
      tasks: [{ id: "a", name: "A", start_date: "2026-09-01", end_date: "2026-09-05", barTag: "z-gantt-bar-cell" }],
    } as any;
    document.body.appendChild(g);
    await wait();

    const bar = g.shadowRoot!.querySelector(".z-gantt__bar") as HTMLElement;
    expect(bar.getAttribute("data-mode")).toBe("move");
    expect(bar.style.left.endsWith("px")).toBe(true);
    g.remove();
  });
});

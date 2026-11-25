// Test: 表格内容槽 —— columns[].cellTag 真正挂载成元素，未注册标签降级回文本
// Related: architecture/l2-decompose-plan.html §7（cell 契约 / ViewHolder 等价物）
// Wiki: architecture/l2-decompose-plan.html
// Date: 2026-11-23
//
// [WHY 这条要有] 内容槽的价值全在「格子里能放任意组件」，而它落地的方式是
// **两步**：字符串模板先渲染文本兜底，DOM 落地后再 createElement 替换。
// 这个接缝有两个只在真机上才暴露的失败模式：
//   ① 少 import 一行注册代码 → 未注册元素不报错，格子看起来「样式没加载」；
//   ② 挂载成功但注入的上下文没到位（value/row/index/selected 全 undefined），
//      自定义元素自己画了个空白，看起来像「组件坏了」。
// 单测必须同时钉住这两侧，否则它会一直绿。

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTable, rendered } from "./components/report-table-helpers.js";
import { resetCellTagWarnings } from "../../src/report/table/table-cell-mount.js";
import { BaseElement, html, property } from "../../src/core/index.js";

class ZTestCell extends HTMLElement {
  value: unknown;
  row: Record<string, unknown> | null = null;
  index = -1;
  selected = false;
  tone = "";
  connectedCallback(): void {
    this.textContent = `${String(this.value)}|${this.index}|${this.selected}|${this.tone}`;
  }
}

if (!customElements.get("z-test-cell")) customElements.define("z-test-cell", ZTestCell);

function tableWithCellTag(extra: Record<string, unknown> = {}): any {
  const el = createTable();
  el.columns = [
    { key: "name", title: "Name", width: "120px", cellTag: "z-test-cell", cellProps: { tone: "warn" } },
    { key: "amount", title: "Amount", width: "100px" },
  ];
  Object.assign(el, extra);
  return el;
}

beforeEach(() => {
  resetCellTagWarnings();
});

describe("cellTag 挂载", () => {
  it("格子里是真元素，且 value / index 注入到位", async () => {
    const el = tableWithCellTag();
    await rendered(el);

    const cells = el.shadowRoot.querySelectorAll("td[data-cell-tag] z-test-cell");
    expect(cells.length, "每行都该挂上一个").toBe(3);
    expect(cells[0].textContent, "value|index|selected|tone").toBe("Alpha|0|false|warn");
    expect(cells[2].textContent).toBe("Gamma|2|false|warn");
  });

  it("挂载成功后兜底文本被清掉（不留两份内容叠着）", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    const td = el.shadowRoot.querySelector("td[data-cell-tag]");
    expect(td.querySelector(".z-cell-fallback"), "fallback 应被替换掉").toBeNull();
    expect(td.children.length).toBe(1);
  });

  it("没有 cellTag 的列保持原样（纯文本、无 data 属性）", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    expect(el.shadowRoot.querySelectorAll("td[data-cell-tag]").length).toBe(3);
    const amountTd = el.shadowRoot.querySelectorAll(".z-rpt__row")[0].querySelectorAll("td")[1];
    expect(amountTd.hasAttribute("data-cell-tag")).toBe(false);
    expect(amountTd.textContent.trim()).toBe("300");
  });

  it("cellProps 作为列级常量注入，且不覆盖逐格上下文", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    const cell = el.shadowRoot.querySelector("z-test-cell") as ZTestCell;
    expect(cell.tone).toBe("warn");
    expect(cell.value).toBe("Alpha");
  });
});

describe("cellTag 降级", () => {
  it("标签没注册：保留文本兜底、不抛错、每个标签只警告一次", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = createTable();
    el.columns = [{ key: "name", title: "Name", width: "120px", cellTag: "z-not-registered" }];
    await rendered(el);

    const tds = el.shadowRoot.querySelectorAll("td[data-cell-tag]");
    expect(tds.length).toBe(3);
    expect(tds[0].textContent.trim(), "降级后必须还是原来那段文本").toBe("Alpha");
    expect(tds[0].querySelector("span.z-cell-fallback")).not.toBeNull();
    expect(warn, "三行只报一次，否则一张表 200 行会把控制台淹掉").toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("z-not-registered");
    warn.mockRestore();
  });
});

// ── 重渲染下的格内元素身份 ────────────────────────────────
//
// [WHY 这一组必须有] 挂载器每次 `updated()` 都跑一遍。如果它每次都
// `createElement` 重建，那么格子里凡是「组件自己的局部状态」——展开态、
// 输入框里的半句搜索词、popover 的打开标记、滑块的拖动中位置 —— 会在
// **任何一次重渲染**后归零：切一列显隐、点一下排序、改一行 data 都会。
// 而全量重建在视觉上几乎看不出来（格子还是那个样子），只有用户发现
// 「我刚打的字没了」。这类「外观正常但不生效」的退化，只能靠断言节点身份钉住。
describe("cellTag 重渲染行为", () => {
  it("数据无关的重渲染不得替换节点实例（否则格内局部状态全丢）", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    const before = el.shadowRoot.querySelector("z-test-cell") as HTMLElement & { __local?: string };
    // 模拟用户在格内产生的局部状态（真实场景是展开态 / 输入中的文字 / 焦点）
    before.__local = "typed-by-user";

    el.striped = true; // 纯样式属性：值没变、行结构没变，只是触发一次重渲染
    await rendered(el);

    const after = el.shadowRoot.querySelector("z-test-cell") as HTMLElement & { __local?: string };
    expect(after.isSameNode(before), "同一格换了节点实例 ⇒ 用户刚输入的内容消失").toBe(true);
    expect(after.__local).toBe("typed-by-user");
  });

  it("值变了必须把新值注入到同一个节点（复用最危险的失败模式是显示旧值）", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    const before = el.shadowRoot.querySelector("z-test-cell") as ZTestCell;

    el.data = [{ name: "Alpha2", amount: 300, note: "first row" }];
    await rendered(el);

    const after = el.shadowRoot.querySelector("z-test-cell") as ZTestCell;
    expect(after.isSameNode(before), "行还是那一行，就不该换节点").toBe(true);
    expect(after.value, "复用不等于冻结：值必须跟着数据走").toBe("Alpha2");
    expect(after.textContent).toContain("Alpha2");
  });

  it("行数变少时多出来的格内元素必须被清掉（不留下旧行残影）", async () => {
    const el = tableWithCellTag();
    await rendered(el);
    expect(el.shadowRoot.querySelectorAll("z-test-cell").length).toBe(3);

    el.data = [{ name: "Alpha", amount: 300, note: "first row" }];
    await rendered(el);

    expect(el.shadowRoot.querySelectorAll("z-test-cell").length).toBe(1);
  });
});

describe("cellTag 跨行序复用", () => {
  // [WHY 这一条是复用成立与否的分水岭] 上面「数据无关重渲染」只证明行序不变时能保状态；
  // 排序/翻页会让同一行换位置，那才是内容槽真正会被踩的场景。表格默认 `rowKey=""` 时
  // 行 key 退化为**排序后索引**（`dataViewRows`），排序后 key 全变 ⇒ 池命中不了 ⇒ 新建。
  // 配了 `rowKey` 才有稳定标识 —— 所以这条同时钉住了「复用的前提」。
  it("配了 rowKey：排序后同一行拿回自己那个元素，状态不丢", async () => {
    const el = tableWithCellTag();
    el.rowKey = "name";
    await rendered(el);

    const cellsOf = () => Array.from(el.shadowRoot.querySelectorAll("z-test-cell")) as (ZTestCell & { __local?: string })[];
    const alphaBefore = cellsOf().find((c) => c.value === "Alpha")!;
    alphaBefore.__local = "kept-after-sort";

    el.sortState = [{ key: "name", dir: "desc" }];
    await rendered(el);

    const alphaAfter = cellsOf().find((c) => c.value === "Alpha")!;
    expect(alphaAfter, "Alpha 排到最后去了，元素必须跟着走").toBeTruthy();
    expect(alphaAfter.isSameNode(alphaBefore)).toBe(true);
    expect(alphaAfter.__local).toBe("kept-after-sort");
    // 顺序确实换了：RTL 之外还得确认这不是「排序没生效」的假绿
    expect(cellsOf().map((c) => c.value)).toEqual(["Gamma", "Beta", "Alpha"]);
  });
});

describe("cellTag 与行数据的对应关系", () => {
  // [WHY 逐行核对而不是抽查一行] 排序后错行的症状是「界面完全正常、值是别人的」——
  // 抽查一行有可能恰好抽中对的那一行。判据用 `data-row-key` 逐行对：行的身份是它自己的，
  // 格子显示的值必须等于这个身份。任何一处错配立刻红。
  it("排序后每一格的注入值都等于本行的 data-row-key（不错行）", async () => {
    const el = tableWithCellTag();
    el.rowKey = "name";
    await rendered(el);
    el.sortState = [{ key: "amount", dir: "asc" }];
    await rendered(el);

    const pairs = Array.from(el.shadowRoot.querySelectorAll("tr.z-rpt__row")).map((tr) => {
      const key = (tr as HTMLElement).getAttribute("data-row-key");
      const cell = tr.querySelector("z-test-cell") as ZTestCell | null;
      return [key, cell?.value];
    });
    expect(pairs).toEqual([
      ["Beta", "Beta"],
      ["Gamma", "Gamma"],
      ["Alpha", "Alpha"],
    ]);
  });
});

describe("cell 契约：赋值即重绘", () => {
  // [WHY 用 BaseElement 而不是裸 HTMLElement 来测] 这是**推荐写法**的验证，也是复用能成立的前提。
  // 裸元素靠 `connectedCallback` 画一次：元素被搬进新宿主时会重连、顺带重画，于是
  // 「值没更新」这个缺陷被这个副作用盖住了 —— 一旦宿主改成不搬动节点，它立刻现形。
  // 响应式属性没有这个依赖：赋值就重绘，与节点是否搬动无关。
  class ZReactiveCell extends BaseElement {
    @property({ attribute: false }) value: unknown = "";
    @property({ attribute: false }) row: Record<string, unknown> | null = null;
    @property({ attribute: false }) index = -1;
    @property({ attribute: false }) selected = false;
    render(): string {
      return html`<i>${String(this.value)}</i>`;
    }
  }
  if (!customElements.get("z-reactive-cell")) customElements.define("z-reactive-cell", ZReactiveCell);

  it("排序后同一个实例的渲染内容跟着新值走", async () => {
    const el = createTable();
    el.rowKey = "name";
    el.columns = [{ key: "name", title: "Name", width: "120px", cellTag: "z-reactive-cell" }];
    await rendered(el);

    const cellOf = (name: string) =>
      Array.from(el.shadowRoot.querySelectorAll("z-reactive-cell")).find(
        (c: any) => c.value === name,
      ) as any;
    const alphaBefore = cellOf("Alpha");
    expect(alphaBefore.shadowRoot!.querySelector("i")!.textContent).toBe("Alpha");

    el.sortState = [{ key: "name", dir: "desc" }];
    await rendered(el);

    const alphaAfter = cellOf("Alpha");
    expect(alphaAfter.isSameNode(alphaBefore), "同一行应拿回同一个实例").toBe(true);
    expect(alphaAfter.shadowRoot!.querySelector("i")!.textContent, "复用后必须重绘成当前值").toBe("Alpha");
    // 值真的被改过一次：把 Alpha 的数据改掉，同一实例要跟着变
    el.data = [
      { name: "Alpha", amount: 300, note: "renamed" },
      { name: "Beta", amount: 100, note: "second row" },
      { name: "Gamma", amount: 200, note: "third row" },
    ];
    el.sortState = [];
    await rendered(el);
    const alphaNow = cellOf("Alpha");
    expect(alphaNow.isSameNode(alphaBefore)).toBe(true);
    expect(alphaNow.shadowRoot!.textContent).toContain("Alpha");
  });
});

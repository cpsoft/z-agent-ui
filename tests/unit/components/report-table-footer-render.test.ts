// Test: 合计行的自定义渲染（col.footerRender）
//
// 背景（2026-11-25 反馈）：数据行能靠 col.render 输出 `<span class="is-danger">`，
// 合计行却只能出纯文本 —— 「超预算的合计」和「没超预算的合计」长得一样。
// 契约有两条，缺一不可：
//   1. `footerRender` 的 HTML 必须原样落地（不转义）；
//   2. `footer` 的纯文本路径必须继续转义 —— 它是「不可信值」的通道，不能因为
//      加了兄弟字段就顺带放开。

import { describe, it, expect } from "vitest";
import { rendered } from "./report-table-helpers.js";

function makeTable(columns: any[]): any {
  const el = document.createElement("z-report-table") as any;
  el.showFooter = true;
  el.columns = columns;
  el.data = [
    { a: 10, b: -5 },
    { a: 20, b: -7 },
  ];
  document.body.appendChild(el);
  return el;
}

describe("z-report-table · 合计行渲染", () => {
  it("footerRender 的 HTML 原样落地（语义色能生效）", async () => {
    const el = makeTable([
      { key: "a", title: "A", numeric: true, footerRender: (rows: any[]) => `<span class="is-danger">${rows.reduce((s, r) => s + r.a, 0)}</span>` },
      { key: "b", title: "B", numeric: true, footer: "—" },
    ]);
    await rendered(el);

    const foot = el.shadowRoot.querySelector("tfoot");
    const marked = foot.querySelector(".is-danger");
    expect(marked).toBeTruthy();
    expect(marked.textContent).toBe("30");
    // 另一列的纯文本合计不受影响
    expect(foot.textContent).toContain("—");
    document.body.removeChild(el);
  });

  it("footerRender 优先于 footer（两个都写时用渲染函数）", async () => {
    const el = makeTable([
      {
        key: "a",
        title: "A",
        footer: "旧的纯文本",
        footerRender: () => `<span class="is-up">新模板</span>`,
      },
    ]);
    await rendered(el);
    const foot = el.shadowRoot.querySelector("tfoot")!;
    expect(foot.querySelector(".is-up")?.textContent).toBe("新模板");
    expect(foot.textContent).not.toContain("旧的纯文本");
    document.body.removeChild(el);
  });

  it("footer 的纯文本仍然转义（不能借新字段放开这条通道）", async () => {
    const el = makeTable([{ key: "a", title: "A", footer: "<b>x</b>" }]);
    await rendered(el);
    const cell = el.shadowRoot.querySelector("tfoot th")!;
    expect(cell.querySelector("b")).toBeNull();
    expect(cell.textContent).toContain("<b>x</b>");
    document.body.removeChild(el);
  });

  it("showFooter 关掉时 footerRender 不被调用", async () => {
    let called = 0;
    const el = makeTable([
      { key: "a", title: "A", footerRender: () => { called++; return "x"; } },
    ]);
    el.showFooter = false;
    await rendered(el);
    expect(called).toBe(0);
    document.body.removeChild(el);
  });
});

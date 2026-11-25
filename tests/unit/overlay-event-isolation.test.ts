// Test: 弹层事件不污染容器 —— z-open/z-close 的命名空间化
// Related: Gitee IKRAOR
// Wiki: wiki/bugs/bug-20261028-overlay-event-namespace.md
// Date: 2026-10-28
//
// 这条 test 是 IKRAOR 的唯一验收判据：组件级断言（"z-select-open 被派发"）只能证明改过名，
// 证明不了"宿主不再被误关"。所以这里直接搭真实嵌套结构 —— 容器里放下拉，看容器会不会被关掉。

import { describe, expect, it } from "vitest";
import "../../src/components/modal/Modal";
import "../../src/components/select/Select";
import "../../src/components/datepicker/Datepicker";
import "../../src/components/alert/Alert";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function mountModal(): any {
  const el = document.createElement("z-modal") as any;
  document.body.appendChild(el);
  return el;
}

describe("弹层事件命名空间化（IKRAOR）", () => {
  it("下拉开合不会关掉外层对话框", async () => {
    const modal = mountModal();
    const select = document.createElement("z-select") as any;
    document.createElement("z-option");
    modal.appendChild(select);
    await tick();

    modal.open = true;
    await tick();

    let modalClosed = 0;
    modal.addEventListener("z-close", () => modalClosed++);

    // [WHY 直接调 _openDropdown/_closeDropdown 而不是赋 open] `open` 只是个状态字段，
    // 赋值不会派发事件（emit 在 _openDropdown/_closeDropdown 里）。
    // 早先写成 `select.open = true` 时本用例在变异性下依然是绿的 —— 它压根没走到被测路径。
    select._openDropdown();
    await tick();
    select._closeDropdown();
    await tick();

    // [WHY] 旧实现里 z-select 发的是通用名 z-open/z-close 且冒泡（BaseElement.emit 默认
    // bubbles:true, composed:true），modal 的 z-close 监听器把下拉的收起当成自己该关。
    // 变异判据：把 Select 的事件名改回 "z-open"/"z-close" ⇒ 本用例红。
    expect(modalClosed).toBe(0);
    expect(modal.open).toBe(true);
    modal.remove();
  });

  it("日期面板开合不会关掉外层对话框", async () => {
    const modal = mountModal();
    const dp = document.createElement("z-datepicker") as any;
    dp.innerHTML = '<button slot="trigger">Pick</button>';
    modal.appendChild(dp);
    await tick();

    modal.open = true;
    await tick();

    let modalClosed = 0;
    modal.addEventListener("z-close", () => modalClosed++);

    dp.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    dp.close?.();
    await tick();

    expect(modalClosed).toBe(0);
    modal.remove();
  });

  it("alert 关闭不会关掉外层对话框", async () => {
    const modal = mountModal();
    const alert = document.createElement("z-alert") as any;
    modal.appendChild(alert);
    await tick();

    modal.open = true;
    await tick();

    let modalClosed = 0;
    modal.addEventListener("z-close", () => modalClosed++);

    // alert 的 z-close 语义是「请把我移除」，与容器的「对话框关闭」完全无关
    alert.hide?.();
    await tick();

    expect(modalClosed).toBe(0);
    modal.remove();
  });

  it("容器自己的 z-close 仍然正常派发", async () => {
    const modal = mountModal();
    const select = document.createElement("z-select") as any;
    modal.appendChild(select);
    await tick();

    modal.open = true;
    await tick();

    let modalClosed = 0;
    modal.addEventListener("z-close", () => modalClosed++);

    modal.close();
    await tick();

    // [WHY] 命名空间化不能把容器自己的事件一起弄没 —— 那只是把一个 bug 换成另一个
    expect(modalClosed).toBe(1);
    modal.remove();
  });
});

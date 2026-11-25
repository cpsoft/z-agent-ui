// Test: detail-form 组件渲染产生的分组首帧不得把展开高度写死为 20px（内容截断）
// Related: [[bug-20260811-group-first-render-truncation]]
// Wiki: wiki/bugs/bug-20260811-group-first-render-truncation.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../src/app/detail-form/DetailForm";

const flush = () => new Promise((r) => setTimeout(r, 0));

// [WHY] 复现场景：detail-form 在自身 render 中经 innerHTML 创建 z-property-group，
// 分组 connectedCallback 触发的首帧 update 早于插槽子元素（z-property-row）完成
// 渲染/布局。旧代码在首帧把 `scrollHeight + 20` 写进内联 maxHeight，此时
// scrollHeight=0 → maxHeight=20px 永久卡死，展开内容被截断；随后 span 反射
// 触发的第二次重渲染在动画分支再次测量（同样为 0），把 CSS 变量也写死为 20px。
// 修复后：首帧不写内联 maxHeight（CSS 规则 var(--_z-property-content-height, 2000px)
// 兜底），span 反射移至 connectedCallback 并由 attributeChangedCallback 守卫，
// 不再产生第二次重渲染。
describe("regression: bug-20260811 group first-render truncation", () => {
  it("detail-form create 模式：分组默认展开且内联 maxHeight 未被写死", async () => {
    const form = document.createElement("z-detail-form") as any;
    form.fields = [
      { name: "a", label: "字段 A", type: "text" },
      { name: "b", label: "字段 B", type: "text", group: "扩展" },
      { name: "c", label: "备注", type: "textarea", group: "扩展" },
    ];
    document.body.appendChild(form);
    await flush();

    const group = form.shadowRoot!.querySelector("z-property-group") as any;
    expect(group).not.toBeNull();
    expect(group.open).toBe(true);

    const content = group.shadowRoot!.querySelector<HTMLElement>(".z-property-group__content")!;
    expect(content.style.maxHeight).toBe("");

    const root = group.shadowRoot!.querySelector(".z-property-group")!;
    expect(root.classList.contains("z-property-group--open")).toBe(true);

    // span 默认反射在 connectedCallback 完成（:host([span]) grid-column 生效）
    expect(group.hasAttribute("span")).toBe(true);
    document.body.removeChild(form);
  });

  it("用户点击展开后再收起：内容高度捕获基于真实布局，可正常往返", async () => {
    const form = document.createElement("z-detail-form") as any;
    form.fields = [
      { name: "a", label: "字段 A", type: "text", group: "扩展" },
      { name: "b", label: "字段 B", type: "text", group: "扩展" },
    ];
    document.body.appendChild(form);
    await flush();

    const group = form.shadowRoot!.querySelector("z-property-group") as any;
    const header = group.shadowRoot!.querySelector<HTMLElement>(".z-property-group__header")!;

    // 收起
    header.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(group.open).toBe(false);
    expect(
      group.shadowRoot!.querySelector(".z-property-group")!.classList.contains("z-property-group--open"),
    ).toBe(false);

    // 重新展开：动画分支写入精确高度（transitionend 后清理内联值）
    const header2 = group.shadowRoot!.querySelector<HTMLElement>(".z-property-group__header")!;
    header2.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(group.open).toBe(true);
    expect(
      group.shadowRoot!.querySelector(".z-property-group")!.classList.contains("z-property-group--open"),
    ).toBe(true);
    document.body.removeChild(form);
  });
});

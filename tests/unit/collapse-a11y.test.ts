// 折叠容器的「收起即不可达」：三处实现，一个缺陷。
//
// [WHY 单独一个文件、而不是塞进各组件自己的测试] 这条判据跨 L1（accordion-item /
// m-collapse）与 L2（property-group），而且它的失效方式与组件功能无关 ——
// 收起动画、展开高度、z-toggle 全都照常工作，只有键盘与读屏用户进不去。
// 2026-11-16 真机实测三处一致：
//
//   accordion-item : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
//   m-collapse     : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
//   property-group : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
//
// 也就是说：收起后里面的 `<input>` 照样能被 Tab 聚焦，而且还在无障碍树里。
// 用户看到的现象是「按 Tab 焦点消失了」—— 其实焦点正停在一个高 0 像素的输入框里。
import { describe, expect, it } from "vitest";
import "../../src/components/accordion/Accordion";
import "../../src/components/accordion-item/AccordionItem";
import "../../src/components/m-collapse/MCollapse";
import "../../src/property/panel/PropertyPanel";
import "../../src/property/group/PropertyGroup";
import "../../src/property/row/PropertyRow";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

const contentOf = (host: any, sel: string): HTMLElement => host.shadowRoot!.querySelector(sel)!;

describe("折叠容器：收起时内容必须退出 Tab 序列与无障碍树", () => {
  it("C1 accordion-item 收起 ⇒ aria-hidden + inert；展开 ⇒ 移除", async () => {
    const el = document.createElement("z-accordion-item") as any;
    el.title = "详细";
    el.innerHTML = `<input id="c1-input" />`;
    document.body.appendChild(el);
    await wait();

    const content = contentOf(el, ".z-accordion-item__content");
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(content.hasAttribute("inert"), "没有 inert ⇒ 里面的输入框照样能 Tab 进去").toBe(true);

    el.open = true;
    await wait();
    // [WHY 重新查一次] `open` 变化会触发本组件重新渲染（render 返回完整模板），
    // 影子树里的 content / header 都是**新节点**；抓着旧引用断言会读到上一个节点
    // 上的残留属性，于是这条会「永远绿」或「永远红」，与真实行为无关。
    const opened = contentOf(el, ".z-accordion-item__content");
    expect(opened.hasAttribute("aria-hidden"), "展开后必须放回来，否则读屏念不到").toBe(false);
    expect(opened.hasAttribute("inert")).toBe(false);
    document.body.removeChild(el);
  });

  it("C2 m-collapse 首屏就是收起态，也必须一开始就挡住", async () => {
    const el = document.createElement("m-collapse") as any;
    el.title = "面板";
    el.innerHTML = `<input id="c2-input" />`;
    document.body.appendChild(el);
    await wait();

    const content = contentOf(el, ".m-collapse__content");
    // [WHY 这条要单列] 若只在「expanded 从 true 变 false」时设，首屏就会漏 ——
    // 而首屏收起正是它最常见的状态。
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(content.hasAttribute("inert")).toBe(true);

    el.expanded = true;
    await wait();
    expect(contentOf(el, ".m-collapse__content").hasAttribute("inert")).toBe(false);
    document.body.removeChild(el);
  });

  it("C3 ★ property-group 首帧（_skipAnim 分支）也要挡住", async () => {
    const el = document.createElement("z-property-group") as any;
    el.title = "分组";
    el.open = false;
    el.innerHTML = `<input id="c3-input" />`;
    document.body.appendChild(el);
    await wait();

    const content = contentOf(el, ".z-property-group__content");
    // updated() 里首帧走 `_skipAnim` 分支并 early return —— 把 setContentCollapsed
    // 放在动画分支之后，这条就红。属性面板的分组默认收起，所以这是最常见的初态。
    expect(content.getAttribute("aria-hidden"), "首帧早退把可达性也一起跳过了").toBe("true");
    expect(content.hasAttribute("inert")).toBe(true);
    document.body.removeChild(el);
  });

  it("C4 收起时焦点在内容里 ⇒ 交还表头（否则浏览器会拒绝这条 aria-hidden）", async () => {
    const el = document.createElement("z-accordion-item") as any;
    el.title = "详细";
    el.open = true;
    el.innerHTML = `<input id="c4-input" />`;
    document.body.appendChild(el);
    await wait();

    const input = el.querySelector("#c4-input") as HTMLElement;
    input.focus();
    expect(document.activeElement, "前置：焦点确实在内容里").toBe(input);

    el.open = false;
    await wait();

    // [WHY 断言 shadowRoot.activeElement 而不是 document.activeElement] 焦点落在
    // shadow 里的按钮上时，`document.activeElement` 返回的是**宿主**（<z-accordion-item>）
    // —— 用它断言会得到「焦点停在组件上」，看不出是被搬到了表头还是原地不动。
    const activeDeep = el.shadowRoot!.activeElement;
    // [WHY 必须断言焦点去了哪] Chrome 对「aria-hidden 的子树里还留着焦点」这个组合会
    // 直接拒绝应用 aria-hidden（控制台警告，界面无感）。也就是说「设了属性」与
    // 「属性真的生效」在这里会分叉，而 setContentCollapsed 的职责是把焦点先搬走。
    expect(activeDeep, "收起后焦点应回到表头，而不是留在隐藏内容里").toBe(
      contentOf(el, ".z-accordion-item__header"),
    );
  });

  it("C5 取消 collapsible 时 content 常显，不该被挡住", async () => {
    const el = document.createElement("z-property-group") as any;
    el.title = "常显";
    el.collapsible = false;
    el.open = false; // 被忽略
    el.innerHTML = `<input id="c5-input" />`;
    document.body.appendChild(el);
    await wait();

    const content = contentOf(el, ".z-property-group__content");
    // collapsible=false 时 open 被 _effectiveOpen 忽略 ⇒ 内容始终可见，
    // 若这里也加了 inert，用户就彻底点不到它了（比原缺陷更糟）
    expect(content.hasAttribute("inert")).toBe(false);
    expect(content.hasAttribute("aria-hidden")).toBe(false);
    document.body.removeChild(el);
  });
});

// ── 属性面板的字段名（与 z-form-item 同源，2026-11-16）──────────────────────
//
// [WHY 放在这里] 与上面五条同属「L2 属性面板的可达性」。z-property-row 的 label
// 只是 shadow 里的一个 <span>，与槽里的控件零关联 —— 属性面板整屏输入框在读屏里
// 都没有名称，只会念「编辑框」。修法与 z-form-item 一致（core/a11y.ts 的 bindFieldName）：
// 由容器把文字送进控件的内部可聚焦件。
describe("z-property-row：label 要变成控件的名字", () => {
  it("P1 label 送到控件的可聚焦件上，并留下「注入」标记", async () => {
    const { fieldOf, NAME_MARK } = await import("../../src/core/a11y.js");
    await import("../../src/components/input/Input");
    const row = document.createElement("z-property-row") as any;
    row.label = "门店名";
    row.innerHTML = `<z-input></z-input>`;
    document.body.appendChild(row);
    await wait();

    const control = row.querySelector("z-input")!;
    const field = fieldOf(control);
    expect(field, "没找到控件内部的可聚焦件").toBeTruthy();
    expect(field!.getAttribute("aria-label"), "输入框在读屏里没有名字").toBe("门店名");
    expect(field!.getAttribute(NAME_MARK)).toBe("");
    document.body.removeChild(row);
  });

  it("P2 控件重渲染后名字要被补回去", async () => {
    const { fieldOf } = await import("../../src/core/a11y.js");
    const row = document.createElement("z-property-row") as any;
    row.label = "数量";
    row.innerHTML = `<z-input></z-input>`;
    document.body.appendChild(row);
    await wait();

    const control = row.querySelector("z-input") as any;
    const before = fieldOf(control);
    control.value = "abc"; // 触发控件重渲染，影子树里的字段节点被换掉
    await wait();
    // [WHY 先证明真的换了节点] 否则「名字还在」可能只是因为节点压根没重建
    expect(fieldOf(control), "控件没重渲染，这条没验到东西").not.toBe(before);
    expect(fieldOf(control)!.getAttribute("aria-label"), "重渲染后注入的名字丢了").toBe("数量");
    document.body.removeChild(row);
  });

  it("P3 label 改了，名字跟着改", async () => {
    const { fieldOf } = await import("../../src/core/a11y.js");
    const row = document.createElement("z-property-row") as any;
    row.label = "旧名";
    row.innerHTML = `<z-input></z-input>`;
    document.body.appendChild(row);
    await wait();

    row.label = "新名";
    await wait();
    expect(fieldOf(row.querySelector("z-input"))!.getAttribute("aria-label")).toBe("新名");
    document.body.removeChild(row);
  });
});

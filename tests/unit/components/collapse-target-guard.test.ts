// 折叠收尾的 target 校验（issue IKWNJN）。
//
// [WHY 单开一个文件] 这组用例守的**不是**「展开/收起能跑」—— 那是各组件自己的测试在守，
// 而且它们全绿的时候 bug 照样在。这里守的是「不该收尾的时候没收尾」：
// 子树里任何一层过渡结束，都不能把外层正在跑的 `max-height` 清成自适应。
//
// 现象是「偶发、刷不出来、换个数据就好了」，因为它取决于子树里恰好有没有元素在过渡。
// 在有内容插入的容器里必然出现（树节点展开时子节点自己也在过渡、属性面板里嵌着下拉动画）。
import { afterEach, describe, expect, it } from "vitest";
import "../../../src/components/accordion-item/AccordionItem";
import "../../../src/components/m-collapse/MCollapse";

const mounted: HTMLElement[] = [];

afterEach(() => {
  for (const el of mounted.splice(0)) el.remove();
});

function mount(tag: "z-accordion-item" | "m-collapse"): any {
  const el = document.createElement(tag) as any;
  el.innerHTML = "<span>内容</span>";
  document.body.append(el);
  mounted.push(el);
  return el;
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/** 派一个过渡结束事件，`target` 决定 `e.target` 是谁。 */
function fire(el: Element, target: Element = el, property = "max-height"): void {
  const e = new Event("transitionend", { bubbles: true });
  Object.defineProperty(e, "propertyName", { value: property });
  target.dispatchEvent(e);
}

describe("z-accordion-item：子树过渡不触发收尾", () => {
  it("子元素上的 transitionend 不会把展开中的 maxHeight 提前清成自适应", async () => {
    const el = mount("z-accordion-item");
    el.open = true;
    await tick();

    const content = el.shadowRoot!.querySelector(".z-accordion-item__content") as HTMLElement;
    // 展开动画还在跑：maxHeight 是明确的目标 px 值，不是 ""
    expect(content.style.maxHeight).toMatch(/px$/);

    // [WHY 用 shadow 内的 body 而不是 slot 里的那个 span] slot 里的元素派发事件时，
    // 浏览器会把它重定向到 shadow 内的 `<slot>`，jsdom 这条路径不完整 —— 事件根本到不了
    // content 上的监听器，用例就恒绿（变异掉 target 校验也不红，我第一版就踩了）。
    // body 是 content 的真实后代，冒泡一定经过它，且 `e.target !== content`。
    const inner = el.shadowRoot!.querySelector(".z-accordion-item__body")!;
    fire(el, inner); // 子树里某个元素自己过渡结束
    await tick();
    // 没被误判成「外层演完了」—— 它仍是 px，说明收尾没有提前跑
    expect(content.style.maxHeight).toMatch(/px$/);
  });

  it("自己那一下才算：过渡结束收尾把 maxHeight 清成自适应", async () => {
    const el = mount("z-accordion-item");
    el.open = true;
    await tick();
    const content = el.shadowRoot!.querySelector(".z-accordion-item__content") as HTMLElement;
    fire(content);
    await tick();
    // 清成 "" 让内容自适应（内容再变长才不会被裁）
    expect(content.style.maxHeight).toBe("");
  });

  it("别的属性先结束也不算（同名元素上的 opacity / padding）", async () => {
    const el = mount("z-accordion-item");
    el.open = true;
    await tick();
    const content = el.shadowRoot!.querySelector(".z-accordion-item__content") as HTMLElement;
    fire(content, content, "opacity");
    await tick();
    expect(content.style.maxHeight).toMatch(/px$/);
  });
});

describe("m-collapse：同一份判定（此前两份是逐字近似的手抄）", () => {
  it("子元素上的 transitionend 不会提前清 maxHeight", async () => {
    const el = mount("m-collapse");
    el.expanded = true;
    await tick();

    const content = el.shadowRoot!.querySelector(".m-collapse__content") as HTMLElement;
    expect(content.style.maxHeight).toMatch(/px$/);

    const inner = el.shadowRoot!.querySelector(".m-collapse__body")!;
    fire(el, inner);
    await tick();
    expect(content.style.maxHeight).toMatch(/px$/);
  });

  it("收起时归零，且不会因为上一轮的收尾又跳回自适应", async () => {
    const el = mount("m-collapse");
    el.expanded = true;
    await tick();

    // 展开动画还没演完就收起（连点两下的真实情形）
    el.expanded = false;
    await tick();
    // [WHY 重新查一次] 重渲染把内容 DOM 换掉了 —— 守着收起前那个引用，读到的
    // 是**已被替换的旧节点**上残留的 "0px"，断言会以最像通过的方式失败。
    const content = el.shadowRoot!.querySelector(".m-collapse__content") as HTMLElement;
    expect(content.style.maxHeight).toBe("0");

    // 展开那一轮的 transitionend 此刻才到：它已作废，不该把 0 清成 ""
    fire(content);
    await tick();
    expect(content.style.maxHeight).toBe("0");
  });
});

// Test: z-select 多选标签（方案 B）与整框清除钮
// Related: [[req-20261027-filter-clearable]] 筛选控件必须支持选择与取消选择
// Wiki: wiki/reference/pagedef-filters.md
// Date: 2026-10-27

import { describe, it, expect } from "vitest";
import "../../../src/components/option/Option";
import "../../../src/components/select/Select";

type El = HTMLElement & {
  value: string;
  multiple: boolean;
  clearable: boolean;
  maxTags: number;
  open: boolean;
};

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function create(multiple = false): El {
  const el = document.createElement("z-select") as El;
  el.multiple = multiple;
  document.body.appendChild(el);
  return el;
}

function addOption(select: HTMLElement, value: string, label: string): void {
  const opt = document.createElement("z-option") as HTMLElement & { value: string };
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function click(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
}

describe("z-select 多选标签 / 清除", () => {
  it("多选有值时渲染标签，不再显示「已选 N 项」", async () => {
    const el = create(true);
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    el.value = "a,b";
    await tick();

    expect(el.shadowRoot!.querySelectorAll(".z-select__tag").length).toBe(2);
    const text = el.shadowRoot!.textContent ?? "";
    expect(text).toContain("原料");
    expect(text).toContain("包材");
    // 旧形态（折叠成计数）必须彻底消失：两种形态并存时用户看到的会是「已选 2 项」而在别处又找标签
    expect(text).not.toContain("已选");
    document.body.removeChild(el);
  });

  it("超过 maxTags 折叠成 +N，title 给出被折叠的那几项", async () => {
    const el = create(true);
    el.maxTags = 2;
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    addOption(el, "c", "耗材");
    addOption(el, "d", "设备");
    el.value = "a,b,c,d";
    await tick();

    // 2 个标签 + 1 个「+2」
    expect(el.shadowRoot!.querySelectorAll(".z-select__tag").length).toBe(3);
    const more = el.shadowRoot!.querySelector(".z-select__tag--more")!;
    expect(more.textContent).toBe("+2");
    // 期望值是手写字面量：拿 slice(2) 再算一遍等于用被测实现自己验证自己
    expect(more.getAttribute("title")).toBe("耗材、设备");
    document.body.removeChild(el);
  });

  it("点标签上的 × 只移除该项，发出 z-change(values)，且不把下拉弹开", async () => {
    const el = create(true);
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    addOption(el, "c", "耗材");
    el.value = "a,b,c";
    await tick();

    const details: Array<{ values?: string[]; value?: string }> = [];
    el.addEventListener("z-change", (e) => details.push((e as CustomEvent).detail));
    click(el.shadowRoot!.querySelector('.z-select__tag-x[data-value="b"]')!);
    await tick();

    expect(el.value).toBe("a,c");
    expect(details.length).toBe(1);
    expect(details[0].values).toEqual(["a", "c"]);
    // [WHY 断言 open] click 监听在 host 上，× 的点击会冒泡到这里；没拦住就变成「一次点击既删值又弹面板」
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("删除最后一项后回到空态文案（空值选项的标签优先于 placeholder）", async () => {
    const el = create(true);
    addOption(el, "", "全部分类");
    addOption(el, "a", "原料");
    el.value = "a";
    await tick();

    click(el.shadowRoot!.querySelector('.z-select__tag-x[data-value="a"]')!);
    await tick();

    expect(el.value).toBe("");
    expect(el.shadowRoot!.querySelectorAll(".z-select__tag").length).toBe(0);
    expect(el.shadowRoot!.querySelector(".z-select__placeholder")!.textContent).toBe("全部分类");
    document.body.removeChild(el);
  });

  it("clearable：有值时出整框清除钮，点击清空并发 z-change(value:'')", async () => {
    const el = create(false);
    el.clearable = true;
    addOption(el, "a", "Alpha");
    el.value = "a";
    await tick();

    const btn = el.shadowRoot!.querySelector(".z-select__clear")!;
    const details: Array<{ value?: string }> = [];
    el.addEventListener("z-change", (e) => details.push((e as CustomEvent).detail));
    click(btn);
    await tick();

    expect(el.value).toBe("");
    expect(details).toEqual([{ value: "" }]);
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("多选不出整框清除钮：全清走下拉里的「全部」项", async () => {
    // [WHY] 168px 的筛选格里「标签× 标签× 整框×」三个叉挨着，点错就清掉整个筛选；
    // 而且它挤掉折叠的「+N」—— 实测去掉它之前，168px 下「+3」直接被裁掉。
    const el = create(true);
    el.clearable = true;
    addOption(el, "a", "原料");
    el.value = "a";
    await tick();
    expect(el.shadowRoot!.querySelector(".z-select__clear")).toBeNull();
    document.body.removeChild(el);
  });

  it("clearable 缺省关闭：普通下拉外观不变，未选时也不出清除钮", async () => {
    const el = create(false);
    addOption(el, "a", "Alpha");
    el.value = "a";
    await tick();
    // 缺省关 —— 存量调用方（表单里的下拉）不该因为这次改动多出一个叉
    expect(el.shadowRoot!.querySelector(".z-select__clear")).toBeNull();
    document.body.removeChild(el);

    const on = create(false);
    on.clearable = true;
    addOption(on, "a", "Alpha");
    await tick();
    // 开着但没选值：仍然不出现（常显的叉会让人点它并期待发生什么）
    expect(on.shadowRoot!.querySelector(".z-select__clear")).toBeNull();
    document.body.removeChild(on);
  });
});

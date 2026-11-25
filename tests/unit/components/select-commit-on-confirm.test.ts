// Test: z-select 多选「先勾选、点确定才提交」（commit-on-confirm）
// Related: 用户「多选筛选框不要选一个就刷新，应该允许同时多选，比如加确认按钮」
// Wiki: wiki/reference/pagedef-filters.md
// Date: 2026-11-02
//
// 三条命题：
//   1. 勾选期间 `value` 与 `z-change` 都不动 —— 宿主因此不会一条一条取数
//   2. 「确定」把整批勾选一次性提交（只发一次事件），值没变则不发
//   3. 关闭面板（点外部 / Esc）= 丢弃草稿；表单场景（不传该属性）行为一个字不变

import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/option/Option";
import "../../../src/components/select/Select";

type El = HTMLElement & {
  value: string;
  multiple: boolean;
  commitOnConfirm: boolean;
  open: boolean;
  maxTags: number;
};

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function create(multiple = true, commitOnConfirm = true): El {
  const el = document.createElement("z-select") as El;
  el.multiple = multiple;
  el.commitOnConfirm = commitOnConfirm;
  document.body.appendChild(el);
  return el;
}

function addOption(select: HTMLElement, value: string, label: string): void {
  const opt = document.createElement("z-option") as HTMLElement & { value: string };
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function click(el: Element | null | undefined): void {
  el?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
}

function openPanel(el: El): HTMLElement {
  click(el.shadowRoot!.querySelector(".z-select__trigger"));
  // 取**最后一个**：关闭是带动画的，上一块面板可能还没从 DOM 摘掉
  // （取第一个会在「关→开」的用例里读到上一块的旧勾选态，误判成草稿没丢）
  const panels = document.querySelectorAll<HTMLElement>(".z-select__dropdown");
  const panel = panels[panels.length - 1];
  if (!panel) throw new Error("下拉没打开");
  return panel;
}

function optionOf(panel: HTMLElement, value: string): HTMLElement | null {
  return panel.querySelector<HTMLElement>(`.z-select__option[data-value="${value}"]`);
}

/** 勾选态：看那个 14px 的方框有没有打勾（`--on` 类）。 */
function isChecked(panel: HTMLElement, value: string): boolean {
  return !!optionOf(panel, value)?.querySelector(".z-select__box--on");
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-select commit-on-confirm：多选先勾选、确定才提交", () => {
  it("连续勾三项：value 不变、不发 z-change（宿主不会为此取三次数）", async () => {
    const el = create();
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    addOption(el, "c", "耗材");
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    const panel = openPanel(el);
    click(optionOf(panel, "a"));
    click(optionOf(panel, "b"));
    click(optionOf(panel, "c"));
    await tick();

    expect(onChange, "勾选阶段一次事件都不能有").not.toHaveBeenCalled();
    expect(el.value, "确定之前 value 必须原样不动").toBe("");
    // 面板里必须立刻看见勾（否则用户以为点了没反应）
    expect(isChecked(panel, "a")).toBe(true);
    expect(isChecked(panel, "c")).toBe(true);
  });

  it("点「确定」：一次性提交全部勾选，只发一次事件", async () => {
    const el = create();
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    addOption(el, "c", "耗材");
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    const panel = openPanel(el);
    click(optionOf(panel, "a"));
    click(optionOf(panel, "c"));
    click(panel.querySelector('[data-act="confirm"]'));
    await tick();

    expect(onChange).toHaveBeenCalledTimes(1);
    const detail = onChange.mock.calls[0][0].detail;
    expect(detail.values).toEqual(["a", "c"]);
    expect(el.value).toBe("a,c");
    expect(el.open, "提交后面板要收起来").toBe(false);
  });

  it("订阅者收到事件时面板已经关掉（宿主重渲染会摘掉这个元素）", async () => {
    // 顺序错了（先 emit 再 close）在真机上表现为：筛选栏重渲染后浮层残留在屏幕上，
    // 或者对已脱离文档的节点做 DOM 操作直接抛错。用「订阅时 open 已是 false」钉住。
    const el = create();
    addOption(el, "a", "原料");
    await tick();

    let openAtEmit: boolean | null = null;
    el.addEventListener("z-change", () => {
      openAtEmit = el.open;
    });
    const panel = openPanel(el);
    click(optionOf(panel, "a"));
    click(panel.querySelector('[data-act="confirm"]'));
    await tick();

    expect(openAtEmit).toBe(false);
  });

  it("值没变就点「确定」：不发事件（否则打开即确定也触发一次全量查询）", async () => {
    const el = create();
    addOption(el, "a", "原料");
    el.value = "a";
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    const panel = openPanel(el);
    click(panel.querySelector('[data-act="confirm"]'));
    await tick();

    expect(onChange).not.toHaveBeenCalled();
    expect(el.open).toBe(false);
  });

  it("关闭面板 = 丢弃草稿：再打开时勾选回到已提交值", async () => {
    const el = create();
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    el.value = "a";
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    let panel = openPanel(el);
    click(optionOf(panel, "b"));
    expect(isChecked(panel, "b"), "草稿里勾上了").toBe(true);
    // Esc 走 _onDropdownKey -> _closeDropdown
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();

    expect(el.open, "Esc 必须关面板").toBe(false);
    expect(el.value, "取消后仍是原值").toBe("a");
    expect(onChange).not.toHaveBeenCalled();

    panel = openPanel(el);
    expect(isChecked(panel, "b"), "上次没确定的勾必须消失").toBe(false);
    expect(isChecked(panel, "a")).toBe(true);
  });

  it("「清空」只清草稿：仍需点确定才生效", async () => {
    const el = create();
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    el.value = "a,b";
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    const panel = openPanel(el);
    click(panel.querySelector('[data-act="reset"]'));
    await tick();

    expect(el.value).toBe("a,b");
    expect(onChange).not.toHaveBeenCalled();
    expect(isChecked(panel, "a")).toBe(false);

    click(panel.querySelector('[data-act="confirm"]'));
    await tick();
    expect(el.value).toBe("");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("底部计数跟着草稿走（这是「还没提交」的唯一可见提示）", async () => {
    const el = create();
    addOption(el, "a", "原料");
    addOption(el, "b", "包材");
    await tick();

    const panel = openPanel(el);
    const count = (): string => panel.querySelector(".z-select__count")?.textContent ?? "";
    expect(count()).toBe("未选择");
    click(optionOf(panel, "a"));
    expect(count()).toBe("已选 1 项");
    click(optionOf(panel, "a"));
    expect(count()).toBe("未选择");
  });

  it("表单场景（不传 commit-on-confirm）仍是逐项提交：勾了就有值", async () => {
    // [WHY 必须钉] 若默认改成暂存，表单会静默丢勾选（用户以为选了、提交却是空）。
    const el = create(true, false);
    addOption(el, "a", "原料");
    await tick();

    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);
    const panel = openPanel(el);
    click(optionOf(panel, "a"));
    await tick();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(el.value).toBe("a");
    expect(panel.querySelector(".z-select__footer"), "这种模式不该有确认条").toBe(null);
  });
});

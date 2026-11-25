// Test: z-command 命令面板（打开/过滤/键盘导航/选择/分组/Esc/清理）
// Related: [[2026-08-11-W18-enterprise]]
// Wiki: wiki/planning/TASKS/2026-08-11-W18-enterprise/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/command/Command.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

const ITEMS = [
  { id: "open", label: "打开文件", keywords: ["open", "file"], group: "文件", shortcut: "⌘O" },
  { id: "save", label: "保存", keywords: ["save"], group: "文件", shortcut: "⌘S" },
  { id: "preview", label: "预览", keywords: ["preview"], group: "视图" },
  { id: "admin", label: "管理员模式", keywords: ["admin"], group: "系统", disabled: true },
  { id: "undo", label: "撤销", keywords: ["undo"] },
];

function createCommand(items: Record<string, unknown>[] = ITEMS): any {
  const el = document.createElement("z-command") as any;
  el.items = items;
  document.body.appendChild(el);
  return el;
}

function rows(el: any): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll(".z-command__item"));
}

describe("z-command", () => {
  it("closed by default, no panel", async () => {
    const el = createCommand();
    await flush();
    expect(el.shadowRoot!.querySelector(".z-command__panel")).toBeNull();
    document.body.removeChild(el);
  });

  it("show() opens panel and locks scroll", async () => {
    const el = createCommand();
    await flush();
    el.show();
    await flush();
    expect(el.shadowRoot!.querySelector(".z-command__panel")).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    document.body.removeChild(el);
  });

  it("renders all items with groups and shortcuts", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const list = el.shadowRoot!.querySelector(".z-command__list")!;
    expect(rows(el)).toHaveLength(5);
    expect(list.textContent).toContain("文件");
    expect(list.textContent).toContain("视图");
    expect(list.querySelector(".z-command__shortcut")!.textContent).toBe("⌘O");
    document.body.removeChild(el);
  });

  it("filter by label and keywords", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const input = el.shadowRoot!.querySelector(".z-command__input")!;
    input.value = "save";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(rows(el)).toHaveLength(1);
    expect(rows(el)[0].textContent).toContain("保存");
    // keywords 命中
    input.value = "file";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(rows(el)).toHaveLength(1);
    expect(rows(el)[0].textContent).toContain("打开文件");
    document.body.removeChild(el);
  });

  it("no match shows empty state", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const input = el.shadowRoot!.querySelector(".z-command__input")!;
    input.value = "zzz-nothing";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-command__empty")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("arrow keys navigate active item", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const input = el.shadowRoot!.querySelector(".z-command__input")!;
    // 打开即默认高亮第一项
    expect(rows(el)[0].classList.contains("z-command__item--active")).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(rows(el)[1].classList.contains("z-command__item--active")).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(rows(el)[2].classList.contains("z-command__item--active")).toBe(true);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(rows(el)[1].classList.contains("z-command__item--active")).toBe(true);
    document.body.removeChild(el);
  });

  it("disabled items skipped in navigation", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const input = el.shadowRoot!.querySelector(".z-command__input")!;
    // 初始 active=open; 3 次 ArrowDown: open→save→preview→(跳过 admin)→undo
    for (let i = 0; i < 3; i++) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    }
    expect(rows(el)[4].classList.contains("z-command__item--active")).toBe(true);
    document.body.removeChild(el);
  });

  it("Enter selects active item and closes", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-select", handler);
    const input = el.shadowRoot!.querySelector(".z-command__input")!;
    // 初始 active=open → ArrowDown → save → Enter
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.item.id).toBe("save");
    expect(el.open).toBe(false);
    expect(document.body.style.overflow).not.toBe("hidden");
    document.body.removeChild(el);
  });

  it("click row selects", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-select", handler);
    rows(el)[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(handler.mock.calls[0][0].detail.item.id).toBe("save");
    document.body.removeChild(el);
  });

  it("disabled row click ignored", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-select", handler);
    rows(el)[3].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(handler).not.toHaveBeenCalled();
    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("backdrop click closes", async () => {
    const el = createCommand();
    el.show();
    await flush();
    const overlay = el.shadowRoot!.querySelector(".z-command__overlay")!;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("Esc via overlayManager closes", async () => {
    const el = createCommand();
    el.show();
    await flush();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-command__overlay")).toBeNull();
    document.body.removeChild(el);
  });

  it("toggle() flips open state", async () => {
    const el = createCommand();
    await flush();
    el.toggle();
    await flush();
    expect(el.open).toBe(true);
    el.toggle();
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("disconnect while open cleans overlay stack", async () => {
    const el = createCommand();
    el.show();
    await flush();
    document.body.removeChild(el);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

// ── 键盘与无障碍表达 ─────────────────────────────────────────────────────────
//
// [为什么单开一组] 上面十四条里方向键只有两条（↓↑ 移动、跳禁用项），而
// **表达层一条都没有**：列表是裸 `<div>`、每一项也是裸 div，没有任何 role；
// 输入框只有 `aria-label`。读屏用户打字时能听到自己的输入，却完全不知道
// 下面有一个列表、更不知道高亮停在哪 —— 而界面上高亮一直在跳。
// 这与 `z-code-editor` 的补全浮层是同一条规范（那一轮只修了代码编辑器）。

describe("z-command 键盘与表达", () => {
  const inputOf = (el: any): HTMLInputElement => el.shadowRoot!.querySelector(".z-command__input");
  const listOf = (el: any): HTMLElement => el.shadowRoot!.querySelector(".z-command__list");
  const activeRow = (el: any): HTMLElement | null =>
    el.shadowRoot!.querySelector(".z-command__item--active");

  function press(el: any, key: string): boolean {
    return inputOf(el).dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  }

  async function open(items: Record<string, unknown>[] = ITEMS): Promise<any> {
    const el = createCommand(items);
    await flush();
    el.show();
    await flush();
    return el;
  }

  it("C1 ★ Home / End 直达首尾（原先只认 ↑↓）", async () => {
    // [WHY] 命令面板动辄几十条，缺 Home/End 就只能一路按下去。
    // 这两键由 `resolveIndex` 直接给出 —— 手写取模那版没有它们，也没人会为此开 case。
    const el = await open([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
      { id: "e", label: "E" },
    ]);
    expect(activeRow(el)!.dataset.id).toBe("a");

    expect(press(el, "End"), "End 必须 preventDefault，否则光标跳到输入框末尾").toBe(false);
    expect(activeRow(el)!.dataset.id).toBe("e");

    press(el, "Home");
    expect(activeRow(el)!.dataset.id).toBe("a");

    // 末项再 ↓ 绕回（面板是循环列表，与菜单一致）
    press(el, "ArrowUp");
    expect(activeRow(el)!.dataset.id).toBe("e");
    document.body.removeChild(el);
  });

  it("C2 ★ 列表是 listbox、每项是 option，且只有当前项 aria-selected", async () => {
    const el = await open();
    const list = listOf(el);
    expect(list.getAttribute("role"), "裸 div 列表 ⇒ 读屏不知道这里是一个选项列表").toBe("listbox");
    expect(list.getAttribute("aria-label")).toBeTruthy();

    const opts = rows(el);
    expect(opts.every((o) => o.getAttribute("role") === "option")).toBe(true);
    expect(opts.map((o) => o.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);

    // 分组标题不能是 listbox 的直接可读子元素（会打断选项序列）
    const group = listOf(el).querySelector(".z-command__group")!;
    expect(group.getAttribute("role")).toBe("presentation");
    document.body.removeChild(el);
  });

  it("C3 ★ aria-activedescendant 指向**真实存在**的那个选项，且与视觉高亮同一项", async () => {
    // [WHY 这条最容易假绿] 列表是 `innerHTML` 直写的，选项 id 每次重建都新生成。
    // 若只在首次写入 activedescendant，之后它就指向一个已经被替换掉的节点 ——
    // `getAttribute` 读得到值、看着「有属性」，但那个 id 在文档里查不到，
    // 读屏退化成一个一个念「列表项」。所以断言必须**同时在文档里查得到**。
    const el = await open();
    const input = inputOf(el);

    const check = (): void => {
      const id = input.getAttribute("aria-activedescendant");
      expect(id, "当前项没有 activedescendant").toBeTruthy();
      const target = el.shadowRoot!.querySelector(`[id="${id}"]`);
      expect(target, `activedescendant 指向的 #${id} 在树里不存在`).not.toBeNull();
      expect(target).toBe(activeRow(el));
    };

    check();
    press(el, "ArrowDown");
    check();
    press(el, "End");
    check();
    document.body.removeChild(el);
  });

  it("C4 输入框声明 combobox 契约（自动补全来自列表）", async () => {
    const el = await open();
    const input = inputOf(el);
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    // controls 指向的必须是**本实例**的那个 listbox
    expect(input.getAttribute("aria-controls")).toBe(listOf(el).id);
    document.body.removeChild(el);
  });

  it("C5 无匹配结果时撤掉 activedescendant（留着会让读屏念一个不存在的项）", async () => {
    const el = await open();
    expect(inputOf(el).hasAttribute("aria-activedescendant")).toBe(true);

    const input = inputOf(el);
    input.value = "zzz-nothing";
    input.dispatchEvent(new Event("input"));
    await flush();

    expect(el.shadowRoot!.querySelector(".z-command__empty")).not.toBeNull();
    expect(inputOf(el).hasAttribute("aria-activedescendant")).toBe(false);
    document.body.removeChild(el);
  });

  it("C6 ★ 同页两个面板的 id 不撞（否则 IDREF 指到别人家的选项）", async () => {
    const a = await open([{ id: "x", label: "X" }, { id: "y", label: "Y" }]);
    const b = await open([{ id: "x", label: "X" }, { id: "y", label: "Y" }]);

    const idA = inputOf(a).getAttribute("aria-activedescendant");
    const idB = inputOf(b).getAttribute("aria-activedescendant");
    expect(idA).not.toBe(idB);

    // 各自指向自己 shadow 里的那个节点
    expect(a.shadowRoot!.querySelector(`[id="${idA}"]`)).toBe(activeRow(a));
    expect(b.shadowRoot!.querySelector(`[id="${idB}"]`)).toBe(activeRow(b));

    document.body.removeChild(a);
    document.body.removeChild(b);
  });

  it("C7 全部禁用时不产生高亮，也不写 activedescendant", async () => {
    const el = await open([
      { id: "a", label: "A", disabled: true },
      { id: "b", label: "B", disabled: true },
    ]);
    expect(activeRow(el)).toBeNull();
    expect(inputOf(el).hasAttribute("aria-activedescendant")).toBe(false);
    document.body.removeChild(el);
  });
});

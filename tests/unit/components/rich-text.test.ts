// Test: z-rich-text 富文本编辑器（编辑区持久化/toolbar/exec/事件/readonly）
// Related: [[2026-08-11-W19-rich-text]]
// Wiki: wiki/planning/TASKS/2026-08-11-W19-rich-text/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "../../../src/content/rich-text/RichText.js";

// [WHY] happy-dom 无 document.execCommand → mock（真实浏览器路径由冒烟覆盖）
let execMock: ReturnType<typeof vi.fn>;

async function flushMicro(): Promise<void> {
  // [WHY] 只冲微任务: requestUpdate 用 queueMicrotask,防抖测试里 setTimeout 被 fake
  await Promise.resolve();
  await Promise.resolve();
}

function createRich(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-rich-text") as any;
  for (const [k, v] of Object.entries(props)) el[k] = v;
  document.body.appendChild(el);
  return el;
}

function editor(el: any): HTMLDivElement {
  return el.shadowRoot!.querySelector(".z-rt__editor");
}

describe("z-rich-text", () => {
  beforeEach(() => {
    execMock = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: execMock, configurable: true, writable: true });
  });

  afterEach(() => {
    delete (document as any).execCommand;
    vi.useRealTimers();
  });

  it("renders editor + default toolbar", async () => {
    const el = createRich();
    await flushMicro();
    expect(editor(el)).not.toBeNull();
    const btns = el.shadowRoot!.querySelectorAll(".z-rt__btn");
    expect(btns.length).toBeGreaterThan(3);
    expect(el.shadowRoot!.querySelector('[data-id="bold"]')!.getAttribute("title")).toBe("粗体");
    document.body.removeChild(el);
  });

  it("custom toolbar prop renders given buttons", async () => {
    const el = createRich({ toolbar: [{ id: "a", label: "A", command: "bold" }, { id: "b", label: "B" }] });
    await flushMicro();
    const btns = el.shadowRoot!.querySelectorAll(".z-rt__btn");
    expect(btns).toHaveLength(2);
    expect(btns[0].getAttribute("data-command")).toBe("bold");
    document.body.removeChild(el);
  });

  it("empty toolbar hides toolbar", async () => {
    const el = createRich({ toolbar: [] });
    await flushMicro();
    expect(el.shadowRoot!.querySelector(".z-rt__toolbar")).toBeNull();
    document.body.removeChild(el);
  });

  it("initial value renders into editor", async () => {
    const el = createRich({ value: "<b>hello</b>" });
    await flushMicro();
    expect(editor(el).innerHTML).toBe("<b>hello</b>");
    document.body.removeChild(el);
  });

  it("placeholder sets data-placeholder", async () => {
    const el = createRich({ placeholder: "写点什么..." });
    await flushMicro();
    expect(editor(el).dataset.placeholder).toBe("写点什么...");
    document.body.removeChild(el);
  });

  it("input emits z-change {value} after 150ms debounce", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const el = createRich();
    await flushMicro();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    editor(el).innerHTML = "<b>x</b>";
    editor(el).dispatchEvent(new Event("input"));
    vi.advanceTimersByTime(100);
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: "<b>x</b>" });
    expect(el.value).toBe("<b>x</b>");
    document.body.removeChild(el);
  });

  it("rapid inputs collapse to one z-change", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const el = createRich();
    await flushMicro();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    for (const html of ["a", "ab", "abc"]) {
      editor(el).innerHTML = html;
      editor(el).dispatchEvent(new Event("input"));
    }
    vi.advanceTimersByTime(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.value).toBe("abc");
    document.body.removeChild(el);
  });

  it("editor node persists across re-render (content preserved)", async () => {
    const el = createRich();
    await flushMicro();
    const ed1 = editor(el);
    ed1.innerHTML = "<b>keep me</b>";
    ed1.dispatchEvent(new Event("input"));
    await flushMicro();
    el.readonly = true; // 触发渲染
    await flushMicro();
    const ed2 = editor(el);
    expect(ed2).toBe(ed1); // [WHY] 持久节点: 同一 DOM 节点,未被替换
    expect(ed2.innerHTML).toBe("<b>keep me</b>");
    document.body.removeChild(el);
  });

  it("external value set overwrites editor content", async () => {
    const el = createRich({ value: "old" });
    await flushMicro();
    el.value = "<i>new</i>";
    await flushMicro();
    expect(editor(el).innerHTML).toBe("<i>new</i>");
    document.body.removeChild(el);
  });

  it("readonly toggles contentEditable without losing content", async () => {
    const el = createRich();
    await flushMicro();
    const ed = editor(el);
    ed.innerHTML = "text";
    ed.dispatchEvent(new Event("input"));
    el.readonly = true;
    await flushMicro();
    expect(ed.contentEditable).toBe("false");
    el.readonly = false;
    await flushMicro();
    expect(ed.contentEditable).toBe("true");
    expect(ed.innerHTML).toBe("text");
    document.body.removeChild(el);
  });

  it("disabled disables editor and toolbar buttons", async () => {
    const el = createRich();
    await flushMicro();
    el.disabled = true;
    await flushMicro();
    expect(editor(el).contentEditable).toBe("false");
    for (const b of el.shadowRoot!.querySelectorAll(".z-rt__btn")) {
      expect(b.hasAttribute("disabled")).toBe(true);
    }
    document.body.removeChild(el);
  });

  it("exec() calls document.execCommand and emits z-change immediately", async () => {
    const el = createRich({ value: "sel" });
    await flushMicro();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    el.exec("bold");
    expect(execMock).toHaveBeenCalledWith("bold", false, undefined);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("exec with value passes it through", async () => {
    const el = createRich();
    await flushMicro();
    el.exec("formatBlock", "blockquote");
    expect(execMock).toHaveBeenCalledWith("formatBlock", false, "blockquote");
    document.body.removeChild(el);
  });

  it("readonly blocks exec", async () => {
    const el = createRich({ readonly: true });
    await flushMicro();
    el.exec("bold");
    expect(execMock).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("toolbar button click runs command", async () => {
    const el = createRich();
    await flushMicro();
    el.shadowRoot!.querySelector('[data-id="bold"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(execMock).toHaveBeenCalledWith("bold", false, undefined);
    document.body.removeChild(el);
  });

  it("custom toolbar item emits z-command {id}", async () => {
    const el = createRich({ toolbar: [{ id: "date", label: "插入日期" }] });
    await flushMicro();
    const handler = vi.fn();
    el.addEventListener("z-command", handler);
    el.shadowRoot!.querySelector(".z-rt__btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ id: "date" });
    expect(execMock).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("getHTML / getText", async () => {
    const el = createRich({ value: "<p>hi <b>there</b></p>" });
    await flushMicro();
    expect(el.getHTML()).toBe("<p>hi <b>there</b></p>");
    expect(el.getText()).toContain("hi");
    document.body.removeChild(el);
  });

  it("emits z-focus and z-blur", async () => {
    const el = createRich();
    await flushMicro();
    const focus = vi.fn();
    const blur = vi.fn();
    el.addEventListener("z-focus", focus);
    el.addEventListener("z-blur", blur);
    editor(el).dispatchEvent(new Event("focus"));
    editor(el).dispatchEvent(new Event("blur"));
    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("cleared content normalizes to empty for placeholder", async () => {
    const el = createRich();
    await flushMicro();
    const ed = editor(el);
    ed.innerHTML = "<br>";
    ed.dispatchEvent(new Event("input"));
    expect(ed.innerHTML).toBe("");
    document.body.removeChild(el);
  });
});

// ── 可访问性：字段契约 + 工具条语义（2026-11-16）────────────────────────────
//
// [WHY 这一段单独一组] 这三件都不是「看着对不对」能发现的：
//   · 编辑区是否公布 `part~=field` —— 决定 `z-form-item` 能不能把 label 写成它的名字；
//   · 工具条的按钮名 —— 默认文本是 "B"/"I"/"U"，读屏念出来就是「B 按钮」；
//   · `aria-pressed` —— 加粗有没有生效，视觉上只能盯着字重猜。
describe("z-rich-text 可访问性", () => {
  it("A1 编辑区公布字段契约（part 含 field），否则外层 label 永远送不进来", async () => {
    const el = createRich();
    await flushMicro();
    const ed = editor(el);
    expect(ed.getAttribute("part")?.split(/\s+/), "没有 field 令牌 ⇒ fieldOf() 返回 null").toContain("field");
    // 既有的 ::part(editor) 外部样式入口不能被顶掉
    expect(ed.getAttribute("part")?.split(/\s+/)).toContain("editor");
    document.body.removeChild(el);
  });

  it("A2 空编辑区把占位符写进无障碍树（视觉占位符读屏看不到）", async () => {
    const el = createRich({ placeholder: "说说这次活动" });
    await flushMicro();
    expect(editor(el).getAttribute("aria-placeholder"), "读屏进空编辑区会只说「多行编辑框」").toBe("说说这次活动");

    el.placeholder = "";
    await flushMicro();
    expect(editor(el).getAttribute("aria-placeholder"), "空串是「有但为空」，会盖掉继承").toBeNull();
    document.body.removeChild(el);
  });

  it("A3 工具条是 toolbar 且有名字；图标按钮的名字取 title 而不是文本", async () => {
    const el = createRich();
    await flushMicro();
    const tb = el.shadowRoot.querySelector(".z-rt__toolbar")!;
    expect(tb.getAttribute("role")).toBe("toolbar");
    expect(tb.getAttribute("aria-label")).toBe("文本格式");

    const btns = [...tb.querySelectorAll(".z-rt__btn")];
    expect(btns[0].textContent!.trim()).toBe("B"); // 前提：文本确实是缩写
    expect(btns[0].getAttribute("aria-label"), "读屏会把它念成「B 按钮」").toBe("粗体");
    expect(btns[1].getAttribute("aria-label")).toBe("斜体");

    // 名字可被宿主改（英文界面必须能换）
    el.toolbarLabel = "Formatting";
    await flushMicro();
    expect(el.shadowRoot.querySelector(".z-rt__toolbar")!.getAttribute("aria-label")).toBe("Formatting");
    document.body.removeChild(el);
  });

  it("A4 开关型命令跟选区状态同步 aria-pressed；动作型命令不写", async () => {
    // happy-dom 没有 queryCommandState，先按「读不到」验一遍默认行为
    const el = createRich();
    await flushMicro();
    const btn = (id: string) => el.shadowRoot.querySelector(`.z-rt__btn[data-id="${id}"]`)!;
    expect(btn("bold").getAttribute("aria-pressed")).toBe("false");
    expect(btn("clear").getAttribute("aria-pressed"), "「清除格式」是一次性动作，写成开关等于说谎").toBeNull();
    document.body.removeChild(el);

    // 再装一个假的状态源，验「真的会跟着变」
    let boldOn = false;
    Object.defineProperty(document, "queryCommandState", {
      value: (cmd: string) => (cmd === "bold" ? boldOn : false),
      configurable: true,
      writable: true,
    });
    try {
      const el2 = createRich();
      await flushMicro();
      const bold = () => el2.shadowRoot.querySelector('.z-rt__btn[data-id="bold"]')!;
      expect(bold().getAttribute("aria-pressed")).toBe("false");

      // [WHY 走 selectionchange 这条真实路径，而不是直接调私有方法] 直接调只会证明
      // 「这个函数算得对」，证明不了「有人会在该算的时候叫它」。把调用点删掉时，
      // 前者仍然全绿 —— 那正是「断言照抄了它本该防的那个缺陷」的第二类假绿。
      const ed = editor(el2);
      ed.innerHTML = "abc";
      const range = document.createRange();
      range.selectNodeContents(ed);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      boldOn = true;
      document.dispatchEvent(new Event("selectionchange"));
      await flushMicro();
      expect(bold().getAttribute("aria-pressed"), "光标移进一段加粗文字里，按钮还说「没按下」").toBe("true");

      // exec 路径也要立刻同步：命令刚执行完，selectionchange 未必已经派发
      boldOn = false;
      (el2 as any).exec("bold");
      expect(bold().getAttribute("aria-pressed"), "按了加粗，按钮状态没跟上").toBe("false");
      document.body.removeChild(el2);
    } finally {
      delete (document as any).queryCommandState;
    }
  });

  it("A5 工具条整体只有一个 Tab 停靠点，方向键在条内走", async () => {
    const el = createRich();
    await flushMicro();
    const btns = [...el.shadowRoot.querySelectorAll<HTMLButtonElement>(".z-rt__btn")];
    const stops = btns.filter((b) => b.getAttribute("tabindex") === "0");
    expect(stops.length, "七个按钮七个停靠点 ⇒ 想跳过工具条要按七次 Tab").toBe(1);
    expect(stops[0]).toBe(btns[0]);

    btns[0].focus();
    btns[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flushMicro();
    expect(el.shadowRoot.activeElement, "ArrowRight 没把焦点移走").toBe(btns[1]);
    expect(btns[1].getAttribute("tabindex")).toBe("0");
    expect(btns[0].getAttribute("tabindex")).toBe("-1");

    // Home / End 到两端；再按一次 Right 从末项绕回首项
    btns[1].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(el.shadowRoot.activeElement).toBe(btns[btns.length - 1]);
    btns[btns.length - 1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(el.shadowRoot.activeElement, "末项再往右应绕回首项").toBe(btns[0]);
    document.body.removeChild(el);
  });
});

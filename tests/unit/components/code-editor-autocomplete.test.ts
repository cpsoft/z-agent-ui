// Test: z-code-editor 自动补全与参数提示（数据源/过滤/应用/调用上下文 + 浮层交互）
// Related: [[REQ-017-code-editor]]
// Wiki: wiki/requirements/REQ-017-code-editor.md
// Date: 2026-09-25
// Author: night-hawk (AI)
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/content/code-editor/CodeEditor.js";
import { extractWords, getWordPrefix, filterItems, applyCompletion, findCallContext, defaultItems } from "../../../src/content/code-editor/autocomplete.js";
import { getKeywords } from "../../../src/content/code-editor/highlight.js";

function createEditor(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-code-editor") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function ta(el: any): HTMLTextAreaElement {
  return el.shadowRoot.querySelector(".z-ce__textarea");
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function type(el: any, value: string, caret = value.length): void {
  const field = ta(el);
  field.value = value;
  field.selectionStart = caret;
  field.selectionEnd = caret;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function press(el: any, init: KeyboardInit): boolean {
  return ta(el).dispatchEvent(new KeyboardEvent("keydown", { cancelable: true, ...init }));
}

type KeyboardInit = { key: string; ctrlKey?: boolean };

afterEach(() => {
  document.body.innerHTML = "";
});

describe("补全纯函数", () => {
  it("extractWords 去重保序限量", () => {
    expect(extractWords("a b a abc b", 10)).toEqual(["a", "b", "abc"]);
    expect(extractWords("x y z", 2)).toEqual(["x", "y"]);
  });

  it("getWordPrefix 取光标前 \\\\w$ 连续段", () => {
    expect(getWordPrefix("foo.bar(", 8)).toBe("");
    expect(getWordPrefix("hello world", 9)).toBe("wor");
    expect(getWordPrefix("$x1", 3)).toBe("$x1");
  });

  it("filterItems：startsWith 优先 / includes 兜底 / 完全相同跳过 / 去重", () => {
    const items = [{ label: "print" }, { label: "println" }, { label: "printf" }, { label: "print" }, { label: "sprintf" }];
    const out = filterItems(items, "print");
    expect(out.map((i) => i.label)).toEqual(["println", "printf", "sprintf"]);
    // 已输入完整词 → 不推荐
    expect(filterItems(items, "println")).toEqual([]);
    expect(filterItems(items, "")).toHaveLength(4);
  });

  it("applyCompletion：替换前缀；函数项插 () 光标落括号内", () => {
    const kw = applyCompletion("lo x", 2, { label: "local" });
    expect(kw.text).toBe("local x");
    expect(kw.selStart).toBe(5);
    const fn = applyCompletion("pr", 2, { label: "print", params: ["v"] });
    expect(fn.text).toBe("print()");
    expect(fn.selStart).toBe(6);
  });

  it("findCallContext：命名/成员/嵌套/逗号计数/字符串隔离/无括号", () => {
    expect(findCallContext("print(a, b", 10)).toEqual({ name: "print", paramIndex: 1 });
    expect(findCallContext("obj:method(x, y", 15)).toEqual({ name: "method", paramIndex: 1 });
    expect(findCallContext("foo(bar(1, 2), 3", 16)).toEqual({ name: "foo", paramIndex: 1 });
    // 字符串内的括号/逗号不参与
    expect(findCallContext('print("),", x', 13)).toEqual({ name: "print", paramIndex: 1 });
    expect(findCallContext("no call here", 12)).toBeNull();
    expect(findCallContext("done(1)", 7)).toBeNull();
  });

  it("defaultItems：关键字 + 文档单词；getKeywords 按语言提取", () => {
    const kw = getKeywords("lua");
    expect(kw).toContain("local");
    expect(kw).toContain("elseif");
    expect(kw).toContain("nil");
    expect(getKeywords("json")).toContain("null");
    expect(getKeywords("plain")).toEqual([]);
    const items = defaultItems("local value = 1", "lua");
    const labels = items.map((i) => i.label);
    expect(labels).toContain("local");
    expect(labels).toContain("value");
  });
});

describe("补全浮层交互", () => {
  it("输入触发补全，Enter 接受且函数项弹参数提示", async () => {
    const el = createEditor();
    await flush();
    el.functions = [{ label: "print", params: ["v"], desc: "输出", detail: "builtin" }];
    type(el, "pr");
    const popup = el.shadowRoot.querySelector(".z-ce__popup");
    expect(popup.style.display).toBe("block");
    expect(popup.querySelectorAll(".z-ce__item").length).toBe(1);
    expect(popup.querySelector(".z-ce__item-label").textContent).toBe("print");
    press(el, { key: "Enter" });
    expect(ta(el).value).toBe("print()");
    expect(ta(el).selectionStart).toBe(6);
    // 括号内 → 参数提示模式
    expect(popup.classList.contains("z-ce__popup--sig")).toBe(true);
    expect(popup.querySelector(".z-ce__sig-name").textContent).toBe("print");
    expect(popup.querySelector(".z-ce__sig-param--active").textContent).toBe("v");
  });

  it("逗号推进参数高亮，Esc 关闭", async () => {
    const el = createEditor();
    await flush();
    el.functions = [{ label: "fmt", params: ["a", "b"], desc: "格式化" }];
    type(el, "fmt(a");
    const popup = el.shadowRoot.querySelector(".z-ce__popup");
    expect(popup.classList.contains("z-ce__popup--sig")).toBe(true);
    expect(popup.querySelector(".z-ce__sig-param--active").textContent).toBe("a");
    type(el, "fmt(a, b", 8);
    expect(popup.querySelector(".z-ce__sig-param--active").textContent).toBe("b");
    press(el, { key: "Escape" });
    expect(popup.style.display).toBe("none");
  });

  it("Ctrl+Space 强制弹出（空前缀列全量），上下键导航", async () => {
    const el = createEditor();
    await flush();
    el.functions = [{ label: "alpha" }, { label: "beta" }];
    press(el, { key: " ", ctrlKey: true });
    const popup = el.shadowRoot.querySelector(".z-ce__popup");
    expect(popup.style.display).toBe("block");
    expect(popup.querySelectorAll(".z-ce__item").length).toBe(2);
    press(el, { key: "ArrowDown" });
    expect(popup.querySelectorAll(".z-ce__item")[1].classList.contains("z-ce__item--active")).toBe(true);
    // 接受 beta：补全无 params 不加括号
    press(el, { key: "Tab" });
    expect(ta(el).value).toBe("beta");
  });

  it("文档单词进入默认源；completions 回调完全接管", async () => {
    const el = createEditor();
    await flush();
    // [WHY] 默认源取自当前文档内容：文档含 myVar，再输入前缀 myV 应命中
    type(el, "local myVar = 1\nmyV");
    const popup = el.shadowRoot.querySelector(".z-ce__popup");
    const labels = [...popup.querySelectorAll(".z-ce__item-label")].map((n) => n.textContent);
    expect(labels).toContain("myVar");
    // 回调接管：默认源不再出现
    el.completions = () => [{ label: "customFn", params: ["x"] }];
    type(el, "cu", 2);
    const labels2 = [...el.shadowRoot.querySelectorAll(".z-ce__item-label")].map((n) => n.textContent);
    expect(labels2).toEqual(["customFn"]);
  });

  it("readonly 不弹浮层", async () => {
    const el = createEditor({ readonly: "" });
    await flush();
    el.functions = [{ label: "print" }];
    type(el, "pr");
    expect(el.shadowRoot.querySelector(".z-ce__popup").style.display).not.toBe("block");
  });

  it("接受补全发 z-input 且外部可监听", async () => {
    const el = createEditor();
    await flush();
    el.functions = [{ label: "print" }];
    const handler = vi.fn();
    el.addEventListener("z-input", handler);
    type(el, "pr");
    press(el, { key: "Enter" });
    expect(handler.mock.calls.length).toBeGreaterThan(0);
    expect(el.value).toBe("print");
  });
});

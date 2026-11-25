// Test: z-code-editor 双层高亮编辑器（shell/持久化 textarea/键盘纯函数/readonly/wrap）
// Related: [[REQ-017-code-editor]]
// Wiki: wiki/requirements/REQ-017-code-editor.md
// Date: 2026-09-25
// Author: night-hawk (AI)
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/content/code-editor/CodeEditor.js";
import { indentSelection, applyBracketPair, deletePairBackward, autoIndent } from "../../../src/content/code-editor/CodeEditor.js";

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

/** 等待 rAF 高亮刷新完成 */
async function raf(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
}

function type(el: any, value: string): void {
  const field = ta(el);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-code-editor 渲染与同步", () => {
  it("构建静态 shell 与持久化 textarea", async () => {
    const el = createEditor();
    await flush();
    expect(el.shadowRoot.querySelector(".z-ce")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-ce__gutter")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-ce__highlight")).toBeTruthy();
    expect(ta(el)).toBeTruthy();
  });

  it("外部赋值 value 同步 textarea 与高亮层", async () => {
    const el = createEditor({ language: "js" });
    await flush();
    el.value = "const a = 1;";
    await flush();
    expect(ta(el).value).toBe("const a = 1;");
    expect(el.shadowRoot.querySelector(".z-ce__highlight code").innerHTML).toContain("tok-keyword");
  });

  it("内部输入直写 store：el.value 读到新值且发 z-input", async () => {
    const el = createEditor({ language: "plain" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-input", handler);
    type(el, "abc");
    expect(el.value).toBe("abc");
    expect(handler.mock.calls[0][0].detail.value).toBe("abc");
  });

  it("z-change 在失焦时提交一次", async () => {
    const el = createEditor();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    type(el, "x");
    ta(el).dispatchEvent(new Event("blur"));
    expect(handler.mock.calls.length).toBe(1);
    expect(handler.mock.calls[0][0].detail.value).toBe("x");
    // 未再输入，再失焦不发
    ta(el).dispatchEvent(new Event("blur"));
    expect(handler.mock.calls.length).toBe(1);
  });

  it("auto 模式按内容检测语言着色", async () => {
    const el = createEditor();
    await flush();
    type(el, '{"k": 1}');
    await raf();
    expect(el.shadowRoot.querySelector(".z-ce__highlight code").innerHTML).toContain("tok-attr");
  });

  it("highlight 回调属性覆盖默认 tokenizer", async () => {
    const el = createEditor({ language: "js" });
    await flush();
    el.highlight = () => "<b>custom</b>";
    el.value = "anything";
    await flush();
    expect(el.shadowRoot.querySelector(".z-ce__highlight code").innerHTML).toBe("<b>custom</b>\n");
  });

  it("gutter 行数与 value 行数一致", async () => {
    const el = createEditor();
    await flush();
    type(el, "a\nb\nc");
    await raf();
    expect(el.shadowRoot.querySelector(".z-ce__gutter").childElementCount).toBe(3);
  });
});

describe("z-code-editor 状态属性", () => {
  it("readonly：同步 readOnly 且键盘逻辑失效", async () => {
    const el = createEditor({ readonly: "" });
    await flush();
    expect(ta(el).readOnly).toBe(true);
    expect(el.shadowRoot.querySelector(".z-ce").classList.contains("z-ce--readonly")).toBe(true);
    const before = ta(el).value;
    ta(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    expect(ta(el).value).toBe(before);
  });

  it("wrap：root 加 --wrap 类且 textarea wrap=soft", async () => {
    const el = createEditor({ wrap: "" });
    await flush();
    expect(el.shadowRoot.querySelector(".z-ce").classList.contains("z-ce--wrap")).toBe(true);
    expect(ta(el).getAttribute("wrap")).toBe("soft");
  });

  it("placeholder 反映到 textarea", async () => {
    const el = createEditor({ placeholder: "写点代码" });
    await flush();
    expect(ta(el).getAttribute("placeholder")).toBe("写点代码");
  });
});

describe("z-code-editor 键盘集成", () => {
  it("Tab 插入两空格", async () => {
    const el = createEditor({ language: "plain" });
    await flush();
    const field = ta(el);
    field.value = "abc";
    field.selectionStart = 0;
    field.selectionEnd = 0;
    const ok = field.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    expect(ok).toBe(false);
    expect(field.value).toBe("  abc");
  });

  it("括号自动配对", async () => {
    const el = createEditor();
    await flush();
    const field = ta(el);
    field.value = "";
    field.selectionStart = 0;
    field.selectionEnd = 0;
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "(", cancelable: true }));
    expect(field.value).toBe("()");
    expect(field.selectionStart).toBe(1);
  });

  it("空对中间 Backspace 双删", async () => {
    const el = createEditor();
    await flush();
    const field = ta(el);
    field.value = "{}";
    field.selectionStart = 1;
    field.selectionEnd = 1;
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", cancelable: true }));
    expect(field.value).toBe("");
  });

  it("空对中间回车产出三行结构", async () => {
    const el = createEditor();
    await flush();
    const field = ta(el);
    field.value = "{}";
    field.selectionStart = 1;
    field.selectionEnd = 1;
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    expect(field.value).toBe("{\n  \n}");
    expect(field.selectionStart).toBe(4);
  });
});

describe("键盘纯函数", () => {
  it("indentSelection：多行缩进/反缩进与选区修正", () => {
    const src = "a\nb\nc";
    const indented = indentSelection(src, 0, src.length, false);
    expect(indented!.text).toBe("  a\n  b\n  c");
    expect(indented!.selStart).toBe(2);
    expect(indented!.selEnd).toBe(src.length + 6);
    const outdented = indentSelection(indented!.text, 0, indented!.text.length, true);
    expect(outdented!.text).toBe(src);
  });

  it("indentSelection：选区以换行结尾不波及下一行", () => {
    const res = indentSelection("a\nb", 0, 2, false);
    expect(res!.text).toBe("  a\nb");
  });

  it("indentSelection：无缩进可删时返回 null", () => {
    expect(indentSelection("ab", 0, 0, true)).toBeNull();
  });

  it("applyBracketPair：包裹选区 / 词字符后不配对 / 闭符号跳过", () => {
    const wrap = applyBracketPair("ab", 0, 2, "(");
    expect(wrap!.text).toBe("(ab)");
    expect(wrap!.selStart).toBe(1);
    expect(wrap!.selEnd).toBe(3);
    // 光标后是词字符 → 不自动配对
    expect(applyBracketPair("ab", 0, 0, "(")).toBeNull();
    // 光标后恰为同符号 → 跳过
    const skip = applyBracketPair("()", 1, 1, ")");
    expect(skip!.text).toBe("()");
    expect(skip!.selStart).toBe(2);
  });

  it("deletePairBackward：仅空对中间双删", () => {
    const res = deletePairBackward("{}", 1, 1);
    expect(res!.text).toBe("");
    expect(res!.selStart).toBe(0);
    expect(deletePairBackward("{x}", 2, 2)).toBeNull();
    expect(deletePairBackward("ab", 1, 1)).toBeNull();
  });

  it("autoIndent：继承行首空白与括号内三行结构", () => {
    // 括号内（前后恰为一对括号）→ 三行结构
    const res = autoIndent("{}", 1, 1);
    expect(res!.text).toBe("{\n  \n}");
    expect(res!.selStart).toBe(4);
    // 行尾回车 → 继承行首空白
    const src = "  x";
    const res2 = autoIndent(src, 3, 3);
    expect(res2!.text).toBe("  x\n  ");
    expect(res2!.selStart).toBe(src.length + 3);
  });
});

// ── 可访问性：字段契约 + 补全列表语义（2026-11-16）────────────────────────────
//
// [WHY] 补全浮层原先是一堆裸 `div`：打字时它冒出来、方向键在里头跳，
// 视觉上一切正常，读屏全程一个字都不说。判据不能只查「属性写没写」——
// `aria-activedescendant` 是 IDREF，只在**同一棵树**里解析（见 D-L1-7）。
describe("z-code-editor 可访问性", () => {
  const FUNCS = [
    { label: "formatDate", params: ["d"], desc: "格式化日期" },
    { label: "formatMoney", params: ["n"], desc: "格式化金额" },
    { label: "fetchData", params: ["url"], desc: "取数" },
  ];

  function editor(el: any): HTMLTextAreaElement {
    return ta(el);
  }
  function popup(el: any): HTMLElement {
    return el.shadowRoot.querySelector(".z-ce__popup");
  }
  function options(el: any): HTMLElement[] {
    return [...popup(el).querySelectorAll(".z-ce__item")] as HTMLElement[];
  }
  /** 打开补全：挂函数表 → 输入前缀 → 等一拍 */
  async function openAc(el: any, text = "for"): Promise<void> {
    el.functions = FUNCS;
    await flush();
    const field = editor(el);
    field.value = text;
    field.setSelectionRange(text.length, text.length);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
  }

  it("A1 文本域公布字段契约（part 含 field），否则外层 label 送不进来", async () => {
    const el = createEditor();
    await flush();
    const parts = ta(el).getAttribute("part")?.split(/\s+/) ?? [];
    expect(parts, "没有 field 令牌 ⇒ fieldOf() 返回 null").toContain("field");
    expect(parts, "既有的 ::part(textarea) 不能被顶掉").toContain("textarea");
  });

  it("A2 声明自动补全：aria-autocomplete 与 aria-controls 都指向真实存在的列表", async () => {
    const el = createEditor();
    await flush();
    const field = ta(el);
    expect(field.getAttribute("aria-autocomplete")).toBe("list");
    const id = field.getAttribute("aria-controls");
    expect(id, "没有 aria-controls ⇒ 读屏不知道建议列表在哪").toBeTruthy();
    // 关系型判据：IDREF 必须在**同一个根节点**里查得到
    const target = (field.getRootNode() as ParentNode).querySelector(`#${CSS.escape(id!)}`);
    expect(target, "aria-controls 指向的 id 不在承载者所在的树里（跨 shadow 一律无效）").toBe(popup(el));
  });

  it("A3 补全列表是 listbox，每项是带 id 的 option", async () => {
    const el = createEditor();
    await openAc(el);
    const box = popup(el);
    expect(options(el).length, "前置：补全没打开，这条没验到东西").toBeGreaterThan(0);
    expect(box.getAttribute("role")).toBe("listbox");
    expect(box.getAttribute("aria-label")).toBe("补全建议");
    expect(box.id).toBeTruthy();

    for (const [i, o] of options(el).entries()) {
      expect(o.getAttribute("role"), `第 ${i} 项不是 option`).toBe("option");
      expect(o.id, `第 ${i} 项没有 id ⇒ 无法被 activedescendant 指向`).toBeTruthy();
    }
    // 第一项标 selected，其余不标
    expect(options(el)[0].getAttribute("aria-selected")).toBe("true");
    expect(options(el)[1].getAttribute("aria-selected")).toBe("false");
  });

  it("A4 activedescendant 随方向键移动，且始终解析得到那一项", async () => {
    const el = createEditor();
    await openAc(el);
    const field = ta(el);
    const opts = options(el);

    const first = field.getAttribute("aria-activedescendant");
    expect(first).toBe(opts[0].id);
    // 关系型判据：拿 id 在同一棵树里找回节点，而不是「值非空就算过」
    const root = field.getRootNode() as ParentNode;
    expect(root.querySelector(`#${CSS.escape(first!)}`)).toBe(opts[0]);

    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    const second = field.getAttribute("aria-activedescendant");
    expect(second, "方向键换了高亮，但读屏那边还停在上一条").toBe(opts[1].id);
    expect(opts[1].getAttribute("aria-selected")).toBe("true");
    expect(opts[0].getAttribute("aria-selected")).toBe("false");
  });

  it("A5 列表关掉后必须撤掉 activedescendant（否则读屏念一条看不见的建议）", async () => {
    const el = createEditor();
    await openAc(el);
    expect(ta(el).getAttribute("aria-activedescendant")).toBeTruthy();

    ta(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(popup(el).style.display).toBe("none");
    expect(ta(el).getAttribute("aria-activedescendant")).toBeNull();
  });

  it("A6 参数提示是 tooltip 而不是 listbox（按方向键什么都不会选中）", async () => {
    const el = createEditor();
    el.functions = FUNCS;
    await flush();
    const field = ta(el);
    field.value = "formatDate(";
    field.setSelectionRange(field.value.length, field.value.length);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    const box = popup(el);
    expect(box.style.display, "前置：参数提示没出来，这条没验到东西").toBe("block");
    expect(box.getAttribute("role")).toBe("tooltip");
    expect(box.getAttribute("aria-label"), "列表名残留会让人以为这是个可选列表").toBeNull();
    expect(field.getAttribute("aria-activedescendant"), "参数提示没有「当前项」这回事").toBeNull();
  });
});

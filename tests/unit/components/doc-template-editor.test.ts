// Test: z-doc-template-editor
// Related: [[REQ-016-doc-template]]
// [WHY] 2026-10-25 系统审计：从 doc-template.test.ts（1279 行）按被测对象拆出。

import { describe, it, expect, vi } from "vitest";
import {
  extractPlaceholderKeys,
  DEFAULT_FORMAT_CONFIG,
} from "../../../src/doc/index";
import type { DocBlock } from "../../../src/doc/index";
import {
  rendered,
  createEditor,
  THREE_BLOCKS,
  TABLE_PH,
  TABLE_TEMPLATE,
} from "./doc-template-helpers.js";

describe("z-doc-template-editor", () => {
  it("loadTemplate 载入块 DSL：画布渲染块并高亮占位符（编辑即预览）", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.loadTemplate({ content: THREE_BLOCKS, formatConfig: "" });
    await rendered(editor);

    const canvas = editor.shadowRoot.querySelector(".z-dte__canvas");
    expect(canvas.querySelectorAll(".z-dte__block").length).toBe(3);
    expect(canvas.querySelector(".z-doc-ph").dataset.ph).toBe("partyA");
    expect(editor.getBlocks().map((b: DocBlock) => b.type)).toEqual(["heading", "paragraph", "signature"]);
    document.body.removeChild(editor);
  });

  it("画布占位符芯片显示字段名而非 {{key}}（宿主注入定义表）, 模型仍存 {{key}}", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = [{ key: "partyA", label: "甲方名称" }];
    editor.loadTemplate({ content: THREE_BLOCKS, formatConfig: "" });
    await rendered(editor);

    const chip = editor.shadowRoot.querySelector(".z-doc-ph");
    expect(chip.dataset.ph).toBe("partyA");
    expect(chip.textContent).toBe("甲方名称");
    // 模型不受显示影响：content 反序列化仍是 {{partyA}} 原文
    expect(editor.getContent()).toContain("{{partyA}}");
    document.body.removeChild(editor);
  });

  it("addBlock 按块型给出可用默认结构 / moveBlock 排序 / removeBlock 删除", async () => {
    const editor = createEditor();
    await rendered(editor);
    const changeSpy = vi.fn();
    editor.addEventListener("z-change", changeSpy);

    expect(editor.addBlock("table").columns.length).toBe(2);
    expect(editor.addBlock("list").items).toEqual([""]);
    expect(editor.addBlock("signature").left).toContain("甲方");
    expect(editor.addBlock("heading").level).toBe(1);
    await rendered(editor);
    expect(editor.getBlocks().map((b: DocBlock) => b.type)).toEqual(["table", "list", "signature", "heading"]);

    const headingId = editor.getBlocks()[3].id;
    editor.moveBlock(headingId, -2);
    await rendered(editor);
    expect(editor.getBlocks().map((b: DocBlock) => b.type)).toEqual(["table", "heading", "list", "signature"]);

    editor.removeBlock(headingId);
    await rendered(editor);
    expect(editor.getBlocks().map((b: DocBlock) => b.type)).toEqual(["table", "list", "signature"]);

    expect(changeSpy).toHaveBeenCalled();
    const last = changeSpy.mock.calls.at(-1)![0].detail;
    expect(JSON.parse(last.content)).toHaveLength(3);
    expect(typeof last.formatConfig).toBe("string");
    document.body.removeChild(editor);
  });

  it("工具条按钮驱动块增删/上下移（画布与模型同步）", async () => {
    const editor = createEditor();
    await rendered(editor);
    const add = (op: string): void =>
      (editor.shadowRoot.querySelector(`[data-op="${op}"]`) as HTMLElement).click();

    add("add-paragraph");
    add("add-paragraph");
    await rendered(editor);
    expect(editor.getBlocks()).toHaveLength(2);

    const first = editor.getBlocks()[0].id;
    editor.shadowRoot
      .querySelector(`[data-block-id="${first}"] [data-op="down"]`)!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[1].id).toBe(first);

    editor.shadowRoot
      .querySelector(`[data-block-id="${first}"] [data-op="remove"]`)!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()).toHaveLength(1);
    document.body.removeChild(editor);
  });

  it("extractPlaceholderKeys / getUndefinedPlaceholderKeys 提示宿主补定义", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = [
      { key: "partyA", label: "甲方" },
      { key: "amount", label: "金额", type: "number", sample: "100" },
    ];
    editor.loadTemplate({
      content: JSON.stringify([{ id: "b1", type: "paragraph", text: "{{partyA}} 应付 {{amount}} 元" }]),
      formatConfig: "",
    });
    await rendered(editor);

    expect(editor.extractPlaceholderKeys()).toEqual(["partyA", "amount"]);
    expect(editor.getUndefinedPlaceholderKeys()).toEqual([]);
    expect(editor.getContent()).toContain("partyA");
    document.body.removeChild(editor);
  });

  it("占位符插入：未选中块时落为新段落块, 占位符面板列出宿主定义", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = [{ key: "partyA", label: "甲方" }];
    await rendered(editor);

    (editor.shadowRoot.querySelector('[data-tab="placeholders"]') as HTMLElement).click();
    await rendered(editor);
    expect(editor.shadowRoot.querySelector(".z-dte__ph-key").textContent).toBe("{{partyA}}");

    (editor.shadowRoot.querySelector('[data-op="insert-ph"]') as HTMLElement).click();
    await rendered(editor);
    expect(editor.getBlocks()[0].text).toBe("{{partyA}}");
    document.body.removeChild(editor);
  });

  it("排版面板修改经 CSS 变量下发画布并 immediate emit（预览/打印/导出同源）", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.loadTemplate({ content: THREE_BLOCKS, formatConfig: "" });
    await rendered(editor);
    const changeSpy = vi.fn();
    editor.addEventListener("z-change", changeSpy);

    (editor.shadowRoot.querySelector('[data-tab="typography"]') as HTMLElement).click();
    await rendered(editor);

    const lineHeight = editor.shadowRoot.querySelector('select[data-cfg="lineHeight"]') as HTMLSelectElement;
    lineHeight.value = "2";
    lineHeight.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);

    const bodySize = editor.shadowRoot.querySelector('select[data-cfg="bodyFontSize"]') as HTMLSelectElement;
    bodySize.value = "小三";
    bodySize.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);

    const cfg = editor.getFormatConfig();
    expect(cfg.lineHeight).toBe(2);
    expect(cfg.bodyFontSize).toBe("小三");
    const style = editor.shadowRoot.querySelector(".z-dte__canvas").getAttribute("style");
    expect(style).toContain("--z-doc-line-height:2");
    expect(style).toContain("--z-doc-body-size:15pt");

    const detail = changeSpy.mock.calls.at(-1)![0].detail;
    expect(JSON.parse(detail.formatConfig)).toMatchObject({ lineHeight: 2, bodyFontSize: "小三" });
    document.body.removeChild(editor);
  });

  it("选中块后属性面板改字号/加粗落到块模型与画布行内样式", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.loadTemplate({ content: JSON.stringify([{ id: "b1", type: "paragraph", text: "正文" }]), formatConfig: "" });
    await rendered(editor);

    (editor.shadowRoot.querySelector('[data-block-id="b1"]') as HTMLElement).click();
    await rendered(editor);

    const sizeSelect = editor.shadowRoot.querySelector('select[data-prop="fontSize"]') as HTMLSelectElement;
    sizeSelect.value = "四号";
    sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const bold = editor.shadowRoot.querySelector('input[data-prop="bold"]') as HTMLInputElement;
    bold.checked = true;
    bold.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);

    const block = editor.getBlocks()[0];
    expect(block.fontSize).toBe("四号");
    expect(block.bold).toBe(true);
    expect(editor.shadowRoot.querySelector(".z-dte__canvas .z-doc-para").getAttribute("style")).toContain("font-size:14pt");
    document.body.removeChild(editor);
  });

  it("readonly 下禁用增删（removeBlock / insertPlaceholder 无副作用）", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.readonly = true;
    editor.loadTemplate({ content: THREE_BLOCKS, formatConfig: "" });
    await rendered(editor);
    expect(editor.shadowRoot.querySelector('[data-op="add-paragraph"]').hasAttribute("disabled")).toBe(true);

    const id = editor.getBlocks()[0].id;
    editor.removeBlock(id);
    editor.insertPlaceholder("partyA");
    await rendered(editor);
    expect(editor.getBlocks()).toHaveLength(3);
    document.body.removeChild(editor);
  });

  // ── 表格配置面板（编辑模板时配置表格数据源与展示字段） ──────

  it("表格配置面板：数据键候选取自 table 占位符, 字段下拉取自该表 fields", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = TABLE_PH;
    editor.loadTemplate({ content: TABLE_TEMPLATE, formatConfig: "" });
    await rendered(editor);
    (editor.shadowRoot.querySelector('[data-block-id="t1"]') as HTMLElement).click();
    await rendered(editor);

    const dataKey = editor.shadowRoot.querySelector('input[data-table="dataKey"]') as HTMLInputElement;
    expect(dataKey.value).toBe("items");

    const cands = Array.from(editor.shadowRoot.querySelectorAll("#z-dte-table-keys option")) as HTMLOptionElement[];
    expect(cands.map((o) => o.value)).toEqual(["items"]);
    expect(cands[0].textContent).toBe("标的明细表");

    expect(editor.shadowRoot.querySelectorAll(".z-dte__col-row").length).toBe(2);
    const keySel = editor.shadowRoot.querySelector(
      'select[data-table="columnKey"][data-col="0"]',
    ) as HTMLSelectElement;
    expect(Array.from(keySel.options).map((o) => o.value)).toEqual(["", "name", "qty", "price"]);
    expect(keySel.querySelector("option[selected]")!.getAttribute("value")).toBe("name");
    expect((editor.shadowRoot.querySelector('input[data-table="columnLabel"][data-col="0"]') as HTMLInputElement).value).toBe(
      "项目名称",
    );

    // [WHY] 接上 dataKey 后表体由数据驱动, rows 被渲染忽略 → 静态行操作隐藏（避免误导性入口）
    expect(editor.shadowRoot.querySelector('[data-op="add-row"]')).toBeNull();
    expect(editor.shadowRoot.querySelector('[data-op="add-column"]')).not.toBeNull();
    document.body.removeChild(editor);
  });

  it("表格配置：dataKey 输入回写模型并 emit；清空后退回静态表格模式", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = TABLE_PH;
    editor.loadTemplate({ content: TABLE_TEMPLATE, formatConfig: "" });
    await rendered(editor);
    const changeSpy = vi.fn();
    editor.addEventListener("z-change", changeSpy);
    (editor.shadowRoot.querySelector('[data-block-id="t1"]') as HTMLElement).click();
    await rendered(editor);

    // [WHY] 每次 change 都会重渲染面板（querySelector 需重取）
    const setVal = (v: string): void => {
      const el = editor.shadowRoot.querySelector('input[data-table="dataKey"]') as HTMLInputElement;
      el.value = v;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    setVal("orderItems");
    await rendered(editor);
    expect(editor.getBlocks()[0].dataKey).toBe("orderItems");
    expect(changeSpy).toHaveBeenCalled();
    expect(JSON.parse(changeSpy.mock.calls.at(-1)![0].detail.content)[0].dataKey).toBe("orderItems");
    // [WHY] 宿主靠 extractPlaceholderKeys 才知道要提供哪份表数据：面板改的 dataKey 必须能被采集到
    expect(editor.extractPlaceholderKeys()).toContain("orderItems");
    expect(editor.shadowRoot.querySelector('[data-op="add-row"]')).toBeNull();

    setVal("");
    await rendered(editor);
    expect(editor.getBlocks()[0].dataKey).toBeUndefined();
    expect(editor.shadowRoot.querySelector('[data-op="add-row"]')).not.toBeNull();
    document.body.removeChild(editor);
  });

  it("表格配置：字段下拉改 key 并自动补表头；候选外的 key 保留为「未定义」选项", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.placeholders = TABLE_PH;
    editor.loadTemplate({
      content: JSON.stringify([
        { id: "t1", type: "table", dataKey: "items", columns: [{ key: "legacyKey", label: "" }], rows: [[]] },
      ]),
      formatConfig: "",
    });
    await rendered(editor);
    (editor.shadowRoot.querySelector('[data-block-id="t1"]') as HTMLElement).click();
    await rendered(editor);

    // [WHY] 历史/宿主预置的列字段不在候选池里 → 必须保留并在 select 中选中, 否则 key 会被静默改成候选首项
    const sel = editor.shadowRoot.querySelector(
      'select[data-table="columnKey"][data-col="0"]',
    ) as HTMLSelectElement;
    const legacy = sel.querySelector("option[selected]") as HTMLOptionElement;
    expect(legacy.getAttribute("value")).toBe("legacyKey");
    expect(legacy.textContent).toContain("未定义");

    sel.value = "price";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);
    const col = editor.getBlocks()[0].columns[0];
    expect(col.key).toBe("price");
    expect(col.label).toBe("单价(元)");

    // 表头已被用户改过时, 换字段不覆盖手填文案
    const labelInput = editor.shadowRoot.querySelector(
      'input[data-table="columnLabel"][data-col="0"]',
    ) as HTMLInputElement;
    labelInput.value = "自定表头";
    labelInput.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);
    const sel2 = editor.shadowRoot.querySelector('select[data-table="columnKey"][data-col="0"]') as HTMLSelectElement;
    sel2.value = "qty";
    sel2.dispatchEvent(new Event("change", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[0].columns[0].label).toBe("自定表头");
    document.body.removeChild(editor);
  });

  it("表格增删列行：按钮走表格 op 分支, 列行下限为 1, 静态行同步对齐", async () => {
    const editor = createEditor();
    await rendered(editor);
    const table = editor.addBlock("table");
    await rendered(editor);
    expect(editor.getBlocks()[0].columns).toHaveLength(2);

    // [WHY] 回归：add-column 必须先于 add- 前缀分支判断, 否则会被当成 addBlock("column") 造出非法块
    (editor.shadowRoot.querySelector('[data-op="add-column"]') as HTMLElement).click();
    await rendered(editor);
    let blk = editor.getBlocks()[0];
    expect(blk.type).toBe("table");
    expect(blk.columns).toHaveLength(3);
    expect(blk.columns[2].key).toBe("col3");
    expect(blk.rows![0]).toHaveLength(3);

    editor.addTableRow(table.id);
    await rendered(editor);
    blk = editor.getBlocks()[0];
    expect(blk.rows).toHaveLength(2);
    expect(blk.rows![1]).toHaveLength(3);

    // 删列按钮带 data-col 定位目标列
    (
      editor.shadowRoot.querySelector('[data-op="remove-column"][data-col="2"]') as HTMLElement
    ).click();
    await rendered(editor);
    blk = editor.getBlocks()[0];
    expect(blk.columns).toHaveLength(2);
    expect(blk.rows![0]).toHaveLength(2);

    editor.removeTableColumn(table.id, 0);
    await rendered(editor);
    blk = editor.getBlocks()[0];
    expect(blk.columns).toHaveLength(1);
    expect(blk.rows![0]).toHaveLength(1);

    // 下限：至少保留 1 列 / 1 行（按钮与直调都不得越界）
    (
      editor.shadowRoot.querySelector('[data-op="remove-column"][data-col="0"]') as HTMLElement
    ).click();
    editor.removeTableColumn(table.id, -1);
    await rendered(editor);
    expect(editor.getBlocks()[0].columns).toHaveLength(1);

    editor.removeTableRow(table.id);
    await rendered(editor);
    expect(editor.getBlocks()[0].rows).toHaveLength(1);
    editor.removeTableRow(table.id);
    await rendered(editor);
    expect(editor.getBlocks()[0].rows).toHaveLength(1);
    document.body.removeChild(editor);
  });

  it("画布就地编辑：表头 th 回写 columns[i].label, 单元格 td 回写 rows[row][col]", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.loadTemplate({ content: TABLE_TEMPLATE, formatConfig: "" });
    await rendered(editor);

    const canvas = (): HTMLElement => editor.shadowRoot.querySelector(".z-dte__canvas");
    const ths = canvas().querySelectorAll("th");
    expect(ths[0].getAttribute("contenteditable")).toBe("true");
    expect(ths[0].dataset.editable).toBe("th");
    ths[0].innerHTML = "明细项目";
    ths[0].dispatchEvent(new Event("input", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[0].columns![0].label).toBe("明细项目");

    const tds = canvas().querySelectorAll("td");
    expect(tds[1].dataset.editable).toBe("td");
    tds[1].innerHTML = "3";
    tds[1].dispatchEvent(new Event("input", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[0].rows![0][1]).toBe("3");
    document.body.removeChild(editor);
  });

  it("画布就地编辑：列表项 li 与签名 span 输入回写模型（data-editable 缺失回归）", async () => {
    const editor = createEditor();
    await rendered(editor);
    editor.loadTemplate({
      content: JSON.stringify([{ id: "l1", type: "list", items: ["甲", "乙"], ordered: false }]),
      formatConfig: "",
    });
    editor.addBlock("signature");
    await rendered(editor);

    const lis = editor.shadowRoot.querySelector(".z-dte__canvas").querySelectorAll("li");
    // [WHY] 仅加 contenteditable 而无 data-editable 时 _onInput 会早退, 输入永不入模型
    expect(lis[0].dataset.editable).toBe("list-item");
    lis[1].innerHTML = "丙";
    lis[1].dispatchEvent(new Event("input", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[0].items).toEqual(["甲", "丙"]);

    const spans = editor.shadowRoot
      .querySelector(".z-dte__canvas")
      .querySelectorAll(".z-doc-signature > span");
    expect((spans[0] as HTMLElement).dataset.editable).toBe("signature");
    (spans[1] as HTMLElement).innerHTML = "买方（签章）：";
    spans[1].dispatchEvent(new Event("input", { bubbles: true }));
    await rendered(editor);
    expect(editor.getBlocks()[1].right).toBe("买方（签章）：");
    document.body.removeChild(editor);
  });

  it("画布手动缩放：transform 挂缩放包装层（不污染画布内联样式）；重置清 transform", async () => {
    // [WHY] 2026-09-26：画布不再 width:100% 随容器伸缩（页面缩放改变排版）,
    // 改 794px 固定宽 + 工具栏手动缩放（transform 等比, 不触发重排）
    const editor = createEditor();
    editor.content = THREE_BLOCKS;
    await rendered(editor);
    const scaleEl = () => editor.shadowRoot.querySelector<HTMLElement>(".z-dte__scale");
    expect(scaleEl()).not.toBeNull();
    expect(scaleEl().style.transform).toBe("");
    // 画布内联样式只含排版 CSS 变量（_syncCanvasStyle 覆写不冲突）
    expect(editor.shadowRoot.querySelector<HTMLElement>(".z-dte__canvas").getAttribute("style")).toContain("--z-doc");

    const click = (op: string) =>
      (editor.shadowRoot.querySelector(`[data-op="${op}"]`) as HTMLButtonElement).click();
    click("zoom-in");
    await rendered(editor);
    expect(editor.zoom).toBeCloseTo(1.1);
    expect(scaleEl().style.transform).toContain("scale(1.1)");
    expect(editor.shadowRoot.querySelector<HTMLElement>("[data-op='zoom-reset']").textContent).toContain("110%");

    click("zoom-out");
    click("zoom-out");
    await rendered(editor);
    expect(editor.zoom).toBeCloseTo(0.9);
    click("zoom-reset");
    await rendered(editor);
    expect(editor.zoom).toBe(1);
    expect(scaleEl().style.transform).toBe("");
    document.body.removeChild(editor);
  });

  it("逐页 A4 形态：每页是完整纸张壳（页眉/正文/页脚三段）, 页容量扣除页眉页脚", async () => {
    // [WHY] 2026-09-26 用户反馈：分页线方案没体现每页的页眉页脚与边距 →
    // 编辑视图改为 Word 式多张完整 A4（happy-dom 无布局引擎, 分派跳过保持单页,
    // 但单页壳结构 = 多页形态的每页结构, 三段式可静态断言）
    const editor = createEditor();
    editor.content = THREE_BLOCKS;
    editor.formatConfig = JSON.stringify({ ...DEFAULT_FORMAT_CONFIG, headerText: "购销合同", footerText: "第 {page} 页" });
    await rendered(editor);
    const page = editor.shadowRoot.querySelector<HTMLElement>(".z-dte__page");
    expect(page).not.toBeNull();
    // 完整纸张类名（794×1123 + 边距 padding + 三段 flex）与预览端同源
    expect(page.classList.contains("z-doc-paper")).toBe(true);
    expect(page.classList.contains("z-doc-paper--sized")).toBe(true);
    expect(page.classList.contains("z-doc-paper--hf")).toBe(true);
    const head = page.querySelector<HTMLElement>(".z-doc-page-head");
    const body = page.querySelector<HTMLElement>(".z-doc-page-body");
    const foot = page.querySelector<HTMLElement>(".z-doc-page-foot");
    expect(head?.textContent).toBe("购销合同");
    expect(foot?.textContent).toBe("第 {page} 页");
    // 块落在正文区（而非纸张直接子级）→ 多页分派时按同一容器搬移
    expect(body.querySelectorAll(".z-dte__block").length).toBe(3);
    // 页眉页脚留空 → 不渲染元素（与预览一致）
    const editor2 = createEditor();
    editor2.content = THREE_BLOCKS;
    await rendered(editor2);
    expect(editor2.shadowRoot.querySelector(".z-doc-page-head")).toBeNull();
    expect(editor2.shadowRoot.querySelector(".z-doc-page-foot")).toBeNull();
    document.body.removeChild(editor);
    document.body.removeChild(editor2);
  });
});

// ── 块操作按钮的可访问名（2026-11-16）──────────────────────────────────
//
// [WHY] 每块三个图标按钮（↑ ↓ ✕）原本只有 `title`。真机 CDP 实测：
// `name="↑" desc="上移"` —— 读屏把箭头念出来，听不出是「上移」还是「向上滚动」。
describe("z-doc-template-editor 块操作按钮的名字", () => {
  it("上移 / 下移 / 删除 的 aria-label 来自各自的文案属性", async () => {
    const ed = createEditor();
    await rendered(ed);
    ed.content = THREE_BLOCKS;
    await rendered(ed);

    const btn = (op: string) => ed.shadowRoot.querySelector(`[data-op="${op}"]`)!;
    expect(btn("up").getAttribute("aria-label"), "读屏会念「上箭头 按钮」").toBe("上移");
    expect(btn("down").getAttribute("aria-label")).toBe("下移");
    expect(btn("remove").getAttribute("aria-label")).toBe("删除");
    // 文字符号本身不变（视觉没改），改的只是名字
    expect(btn("up").textContent!.trim()).toBe("↑");

    // 缩放三键同理
    expect(btn("zoom-out").getAttribute("aria-label")).toBe("缩小");
    expect(btn("zoom-in").getAttribute("aria-label")).toBe("放大");
    expect(btn("zoom-reset").getAttribute("aria-label"), "名字取动作，不取当前百分比").toBe("重置缩放");

    // [WHY 这里**不**断言「改文案后名字跟着变」] 画布是持久节点（firstUpdated 建一次，
    // 只在结构变更时重建），文案属性变更不触发重建 —— 而为了一个文案去重建画布会
    // 毁掉 contenteditable 的选区与焦点，代价远大于收益。所以文案是**建画布前**生效的
    // 配置：宿主应在挂载前设好（i18n 就是这么做的）。预览组件那边每次全量重渲染，
    // 所以那边断言了「改文案名字跟着变」。
    document.body.removeChild(ed);
  });
});

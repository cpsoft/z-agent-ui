// Test: z-doc-template · 渲染内核（纯函数）
// Related: [[REQ-016-doc-template]]
// [WHY] 2026-10-25 系统审计：从 doc-template.test.ts（1279 行）按被测对象拆出。

import { describe, it, expect } from "vitest";
import {
  esc,
  fillPlaceholders,
  extractPlaceholderKeys,
  parseBlocks,
  normalizeContent,
  renderBlock,
  renderTableBlock,
  renderEditorDocument,
  generateDocument,
  createBlockId,
  highlightPlaceholders,
  readTextFromHtml,
  planPageBreak,
  resolveFontSize,
  resolveIndent,
  formatConfigToStyle,
  parseFormatConfig,
  DEFAULT_FORMAT_CONFIG,
  CN_FONT_SIZES,
  CN_FONT_SIZE_OPTIONS,
} from "../../../src/doc/index";
import type { DocBlock, DocData } from "../../../src/doc/index";
import documentCSS from "../../../src/doc/document.css?raw";
import {
  THREE_BLOCKS,
} from "./doc-template-helpers.js";

describe("z-doc-template · 渲染内核（纯函数）", () => {
  describe("中文排版换算", () => {
    it("中文字号查表转 pt；纯数值按 Word 半点换算；带单位原样；空值回退", () => {
      expect(CN_FONT_SIZES["小四"]).toBe(12);
      expect(CN_FONT_SIZE_OPTIONS).toContain("小四");
      expect(resolveFontSize("小四")).toBe("12pt");
      expect(resolveFontSize("三号")).toBe("16pt");
      expect(resolveFontSize("24")).toBe("12pt");
      expect(resolveFontSize("12pt")).toBe("12pt");
      expect(resolveFontSize("1.5em")).toBe("1.5em");
      expect(resolveFontSize("")).toBe("");
      expect(resolveFontSize(undefined, "12pt")).toBe("12pt");
    });

    it("缩进：字符单位原样, 纯数值视作 pt", () => {
      expect(resolveIndent("2ch")).toBe("2ch");
      expect(resolveIndent("24")).toBe("24pt");
      expect(resolveIndent("")).toBe("2ch");
    });

    it("formatConfigToStyle 产出三端共用 CSS 变量（标题逐级递减）", () => {
      const style = formatConfigToStyle(DEFAULT_FORMAT_CONFIG);
      expect(style).toContain("--z-doc-body-size:12pt");
      expect(style).toContain("--z-doc-heading-size-1:16pt");
      expect(style).toContain("--z-doc-heading-size-2:15pt");
      expect(style).toContain("--z-doc-heading-size-4:13pt");
      expect(style).toContain("--z-doc-line-height:1.8");
      expect(style).toContain("--z-doc-para-spacing:0pt");
      expect(style).toContain("--z-doc-indent:2ch");
      // [WHY] 边距换算成整数 px 下发（20mm→76px, 18mm→68px）：mm 是分数 px,
      // 浏览器缩放下亚像素取整抖动 → 折行漂移 → 排版随缩放改变
      expect(style).toContain("--z-doc-margin-top:76px");
      expect(style).toContain("--z-doc-margin-left:68px");
      expect(style).not.toContain("mm");
    });

    it("formatConfigToStyle 边距可配置（mm 录入 → 整数 px 渲染）", () => {
      const style = formatConfigToStyle({ ...DEFAULT_FORMAT_CONFIG, marginTop: 15, marginLeft: 25 });
      expect(style).toContain("--z-doc-margin-top:57px"); // 15mm → 56.69 → 57
      expect(style).toContain("--z-doc-margin-bottom:76px");
      expect(style).toContain("--z-doc-margin-left:94px"); // 25mm → 94.49 → 94
    });

    it("几何契约：纸张 794×1123 整数 px 锁定（A4@96dpi, 缩放不重排）", () => {
      // [WHY] 2026-09-26 实撞：mm 分数 px 在浏览器缩放下折行漂移 → 排版随缩放改变
      const paper = documentCSS.match(/\.z-doc-paper\s*\{[^}]*\}/)?.[0] ?? "";
      expect(paper).toContain("width: 794px");
      expect(paper).toContain("min-height: 1123px");
      expect(documentCSS).not.toContain("mm;");
      const sized = documentCSS.match(/\.z-doc-paper--sized\s*\{[^}]*\}/)?.[0] ?? "";
      expect(sized).toContain("height: 1123px");
      expect(sized).not.toContain("calc(");
    });

    it("parseFormatConfig 容错：非法 JSON 回退默认, 缺字段逐项合并", () => {
      expect(parseFormatConfig("not json").bodyFontSize).toBe(DEFAULT_FORMAT_CONFIG.bodyFontSize);
      expect(parseFormatConfig("").lineHeight).toBe(DEFAULT_FORMAT_CONFIG.lineHeight);
      const cfg = parseFormatConfig(JSON.stringify({ bodyFontSize: "小三", lineHeight: 2 }));
      expect(cfg.bodyFontSize).toBe("小三");
      expect(cfg.lineHeight).toBe(2);
      expect(cfg.headingFont).toBe(DEFAULT_FORMAT_CONFIG.headingFont);
    });
  });

  describe("内容归一化与占位符", () => {
    it("parseBlocks：数组 / {blocks:[]} 可解析, 非法 / 空数组 / 未知块型回退 null", () => {
      expect(parseBlocks(JSON.stringify([{ id: "b1", type: "paragraph", text: "x" }]))).toHaveLength(1);
      expect(parseBlocks(JSON.stringify({ blocks: [{ id: "b1", type: "table" }] }))).toHaveLength(1);
      expect(parseBlocks(JSON.stringify([]))).toBeNull();
      expect(parseBlocks("not json")).toBeNull();
      expect(parseBlocks("")).toBeNull();
      expect(parseBlocks(JSON.stringify([{ id: "b1", type: "video" }]))).toBeNull();
    });

    it("normalizeContent：块 DSL > HTML > Markdown 优先级", () => {
      expect(normalizeContent(THREE_BLOCKS).kind).toBe("blocks");
      expect(normalizeContent("<p>hi</p>").kind).toBe("html");
      expect(normalizeContent("<br/>").kind).toBe("html");
      expect(normalizeContent("# 标题").kind).toBe("markdown");
    });

    it("fillPlaceholders：命中替换, 未命中置空；keepUnresolved 保原文（编辑器态）", () => {
      expect(fillPlaceholders("甲方：{{partyA}}", { partyA: "甲公司" })).toBe("甲方：甲公司");
      expect(fillPlaceholders("甲方：{{partyA}}", {})).toBe("甲方：");
      expect(fillPlaceholders("甲方：{{partyA}}", {}, true)).toBe("甲方：{{partyA}}");
      // [WHY] 值为 null/undefined 视作未命中, 避免 "null" 落进导出文件
      expect(fillPlaceholders("{{a}}", { a: null })).toBe("");
    });

    it("fillPlaceholders：data-placeholder 元素整体替换（含子节点）", () => {
      const tpl = '<p>乙方：<span data-placeholder="partyB">占位文案</span></p>';
      expect(fillPlaceholders(tpl, { partyB: "乙公司" })).toBe("<p>乙方：乙公司</p>");
      expect(fillPlaceholders(tpl, {})).toBe("<p>乙方：</p>");
      expect(fillPlaceholders(tpl, {}, true)).toBe(tpl);
    });

    it("extractPlaceholderKeys：跨块/列表项/单元格/表头采集, 去重保序", () => {
      const blocks: DocBlock[] = [
        { id: "b1", type: "paragraph", text: "{{a}} 与 {{b}}" },
        { id: "b2", type: "list", items: ["{{b}}", "{{c}}"] },
        { id: "b3", type: "table", columns: [{ key: "k", label: "{{d}}" }], rows: [["{{e}}"]] },
      ];
      expect(extractPlaceholderKeys(blocks)).toEqual(["a", "b", "c", "d", "e"]);
      // [WHY] 表格接数据源时 dataKey 是宿主要提供的那份数据, 需一并采集（编辑器可改 dataKey）
      expect(
        extractPlaceholderKeys([
          { id: "b4", type: "table", dataKey: "items", columns: [{ key: "k", label: "名称" }], rows: [] },
        ]),
      ).toEqual(["items"]);
      expect(extractPlaceholderKeys(null, '<p>{{x}}</p><span data-placeholder="y">1</span>')).toEqual(["x", "y"]);
      expect(extractPlaceholderKeys(null, "")).toEqual([]);
    });
  });

  describe("块渲染与文档生成", () => {
    it("编辑器态（data=null）保留占位符并高亮为 data-ph 节点", () => {
      const out = renderBlock({ id: "b1", type: "paragraph", text: "甲方：{{partyA}}" }, null);
      expect(out).toContain('class="z-doc-ph"');
      expect(out).toContain('data-ph="partyA"');
      expect(out).toContain("{{partyA}}");
      expect(out).toContain('class="z-doc-para"');
    });

    it("编辑器态芯片显示字段名（labelOf 命中）, 未命中回退 {{key}} 原文", () => {
      const labelOf = (k: string) => ({ partyA: "甲方名称" } as Record<string, string>)[k];
      const out = renderBlock({ id: "b1", type: "paragraph", text: "甲方：{{partyA}} / {{unknown}}" }, null, labelOf);
      expect(out).toContain('data-ph="partyA"');
      expect(out).toContain(">甲方名称</span>");
      expect(out).not.toContain("{{partyA}}");
      expect(out).toContain('data-ph="unknown"');
      expect(out).toContain("{{unknown}}");
    });

    it("字段名芯片经 readTextFromHtml 往返仍回写 {{key}}；列表项/签名区同源包芯片", () => {
      const labelOf = (k: string) => ({ partyA: "甲方名称", partyB: "乙方名称" } as Record<string, string>)[k];
      expect(readTextFromHtml('<span class="z-doc-ph" data-ph="partyA">甲方名称</span>')).toBe("{{partyA}}");

      const list = renderBlock({ id: "b2", type: "list", items: ["甲方：{{partyA}}"] }, null, labelOf);
      expect(list).toContain("<li>");
      expect(list).toContain('data-ph="partyA"');
      expect(list).toContain("甲方名称");
      expect(list).not.toContain("{{partyA}}");

      const sig = renderBlock({ id: "b3", type: "signature", left: "", right: "{{partyB}}" }, null, labelOf);
      expect(sig).toContain('data-ph="partyB"');
      expect(sig).toContain("乙方名称");
      expect(sig).not.toContain("{{partyB}}");
    });

    it("块级覆盖样式：中文字号 / 加粗 / 对齐落到行内样式", () => {
      const out = renderBlock(
        { id: "b1", type: "heading", level: 2, text: "标题", fontSize: "小四", bold: true, align: "center" },
        {},
      );
      expect(out).toContain("<h2");
      expect(out).toContain("font-size:12pt");
      expect(out).toContain("font-weight:700");
      expect(out).toContain("text-align:center");
    });

    it("generateDocument：块 DSL 逐块填数据, 未命中的 {{key}} 不落进产物", () => {
      const html = generateDocument(
        JSON.stringify([
          { id: "b1", type: "heading", level: 1, text: "采购合同" },
          { id: "b2", type: "paragraph", text: "甲方：{{partyA}}，金额 {{amount}} 元。" },
          { id: "b3", type: "list", items: ["{{p1}}", "{{p2}}"], ordered: true },
          { id: "b4", type: "signature", left: "甲方：{{partyA}}", right: "乙方：{{partyB}}" },
        ]),
        { partyA: "甲公司", partyB: "乙公司", amount: 100, p1: "一", p2: "二" },
      );
      expect(html).toContain("甲方：甲公司，金额 100 元。");
      expect(html).toContain('<ol class="z-doc-list"');
      expect(html).toContain('class="z-doc-signature"');
      expect(html).not.toContain("{{");

      const missing = generateDocument(THREE_BLOCKS, {});
      expect(missing).toContain("甲方：");
      expect(missing).not.toContain("{{partyA}}");
    });

    it("generateDocument：Markdown 降级经 marked 渲染后填数据", () => {
      const html = generateDocument("# 通知\n\n甲方：{{partyA}}", { partyA: "甲公司" });
      expect(html).toContain("甲公司");
      expect(html).not.toContain("{{partyA}}");
    });

    it("generateDocument：HTML 降级按原样填数据", () => {
      const html = generateDocument('<p class="x">甲方：{{partyA}}</p>', { partyA: "甲公司" });
      expect(html).toBe('<p class="x">甲方：甲公司</p>');
    });

    it("段落整段为单个占位符且其值为表格 HTML 时整块替换（不塞进 <p> 转义）", () => {
      const content = JSON.stringify([{ id: "b1", type: "paragraph", text: "{{items}}" }]);
      const html = generateDocument(content, { items: "<table><tbody><tr><td>1</td></tr></tbody></table>" });
      expect(html.startsWith("<table>")).toBe(true);
      expect(html).not.toContain("&lt;table");
    });

    it("表格块：dataKey 结构行取数（对象行 / 数组行）, 列宽落 colgroup", () => {
      const block: DocBlock = {
        id: "t1",
        type: "table",
        dataKey: "items",
        columns: [
          { key: "name", label: "名称", width: 60 },
          { key: "qty", label: "数量" },
        ],
      };
      const html = renderTableBlock(block, { items: [{ name: "A", qty: 2 }, ["B", 3]] } as DocData);
      expect(html).toContain('<col style="width:100.00%" />');
      expect(html).toContain("<th>名称</th>");
      expect(html).toContain("<td>2</td>");
      expect(html).toContain("<td>B</td>");
    });

    it("表格块：列宽超 A4 内容宽时按比例归一为百分比, 不溢出纸张", () => {
      const block: DocBlock = {
        id: "t3",
        type: "table",
        columns: [
          { key: "item", label: "项目", width: 110 },
          { key: "a", label: "甲方", width: 230 },
          { key: "b", label: "乙方", width: 230 },
        ],
        rows: [["名称", "甲", "乙"]],
      };
      const html = renderTableBlock(block, {});
      // 110+230+230=570pt > 493pt(A4 内容宽)：输出比例 19.30/40.35/40.35 而非固定 pt
      expect(html).toContain('<col style="width:19.30%" />');
      expect(html).toContain('<col style="width:40.35%" />');
      expect(html).not.toContain("pt");
    });

    it("表格块：dataKey 命中 HTML 片段时整块替换；静态 rows 无 columns 自动推列数", () => {
      const block: DocBlock = { id: "t1", type: "table", dataKey: "items" };
      expect(renderTableBlock(block, { items: '<table id="x"></table>' })).toBe('<table id="x"></table>');

      const staticBlock: DocBlock = { id: "t2", type: "table", rows: [["a", "b"]] };
      const html = renderTableBlock(staticBlock, {});
      expect(html).toContain("<th></th>");
      expect(html).toContain("<td>a</td>");
      expect(html).toContain("<td>b</td>");
    });

    it("编辑器态表格保留静态行并带行列坐标（供单元格回写）", () => {
      const html = renderEditorDocument([
        { id: "t1", type: "table", columns: [{ key: "k", label: "列" }], rows: [["v"]] },
      ]);
      expect(html).toContain("z-doc-table--editable");
      expect(html).toContain('data-row="0"');
      expect(html).toContain('data-col="0"');
      expect(html).toContain("<td data-row=\"0\" data-col=\"0\">v</td>");
    });

    it("esc 转义 & < > \"；highlightPlaceholders 与 readTextFromHtml 可往返", () => {
      expect(esc('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
      expect(esc(null)).toBe("");
      const marked = highlightPlaceholders("甲方：{{partyA}}");
      expect(marked).toContain('data-ph="partyA"');
      expect(readTextFromHtml(marked)).toBe("甲方：{{partyA}}");
    });

    it("createBlockId 每次唯一", () => {
      expect(createBlockId()).not.toBe(createBlockId());
    });

    it("planPageBreak：跨页块返回下一页内容起点, 页内/压线/超页块不推", () => {
      // [WHY] 编辑视图分页布局的纯几何核（2026-09-26「画布超出 A4 长度」）
      const cap = 971; // 1123 - 76 - 76
      expect(planPageBreak(0, 500, cap)).toBeNull(); // 页内
      expect(planPageBreak(970, 1, cap)).toBeNull(); // 恰好压线（-0.5 容差）
      expect(planPageBreak(500, 600, cap)).toBe(cap); // 跨页 → 第 2 页内容起点
      expect(planPageBreak(cap + 100, 300, cap)).toBeNull(); // 起点已在第 2 页页内（页内容区够放）
      expect(planPageBreak(cap + 800, 300, cap)).toBe(2 * cap); // 第 2 页内跨到第 3 页 → 返回第 3 页起点
      expect(planPageBreak(100, cap + 50, cap)).toBeNull(); // 单块高于整页 → 允许跨页不推
      expect(planPageBreak(100, 0, cap)).toBeNull(); // 空块
    });
  });
});

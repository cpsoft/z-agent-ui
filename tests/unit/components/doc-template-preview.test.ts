// Test: z-doc-preview
// Related: [[REQ-016-doc-template]]
// [WHY] 2026-10-25 系统审计：从 doc-template.test.ts（1279 行）按被测对象拆出。

import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_FORMAT_CONFIG,
} from "../../../src/doc/index";
import {
  rendered,
  createPreview,
  THREE_BLOCKS,
} from "./doc-template-helpers.js";

describe("z-doc-preview", () => {
  it("注入内容与数据后渲染纸张正文；无布局引擎时降级单页并显示页码", async () => {
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.data = { partyA: "甲公司" };
    await rendered(pv);

    const pages = pv.shadowRoot.querySelectorAll(".z-docp__page");
    expect(pages.length).toBe(1);
    expect(pages[0].querySelector(".z-doc-paper").innerHTML).toContain("甲方：甲公司");
    expect(pv.shadowRoot.querySelector(".z-docp__page-no").textContent).toContain("第 1 页");
    expect(pv.getDocumentHtml()).toContain("甲方：甲公司");
    document.body.removeChild(pv);
  });

  it("formatConfig 配置 headerText/footerText 时每页渲染页眉页脚, 留空不渲染", async () => {
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.formatConfig = JSON.stringify({ headerText: "XX公司购销合同", footerText: "保密文件" });
    await rendered(pv);
    expect(pv.shadowRoot.querySelector(".z-doc-page-head").textContent).toBe("XX公司购销合同");
    expect(pv.shadowRoot.querySelector(".z-doc-page-foot").textContent).toBe("保密文件");
    expect(pv.shadowRoot.querySelector(".z-doc-paper").className).toContain("z-doc-paper--hf");

    const pv2 = createPreview();
    await rendered(pv2);
    pv2.content = THREE_BLOCKS;
    await rendered(pv2);
    expect(pv2.shadowRoot.querySelector(".z-doc-page-head")).toBeNull();
    expect(pv2.shadowRoot.querySelector(".z-doc-page-foot")).toBeNull();
    document.body.removeChild(pv);
    document.body.removeChild(pv2);
  });

  it("内容为空渲染空态；工具栏可隐藏", async () => {
    const pv = createPreview();
    pv.showToolbar = false;
    await rendered(pv);
    expect(pv.shadowRoot.querySelector(".z-docp__empty").textContent).toBe("暂无内容");
    expect(pv.shadowRoot.querySelector(".z-docp__toolbar")).toBeNull();
    document.body.removeChild(pv);
  });

  it("排版配置下发纸张：预览与导出输入同一份 CSS 变量（三端同源）", async () => {
    const pv = createPreview();
    await rendered(pv);
    pv.content = JSON.stringify([{ id: "b1", type: "paragraph", text: "正文" }]);
    pv.formatConfig = JSON.stringify({ ...DEFAULT_FORMAT_CONFIG, lineHeight: 2, bodyFontSize: "小三" });
    await rendered(pv);

    const paper = pv.shadowRoot.querySelector(".z-doc-paper");
    expect(paper.getAttribute("style")).toContain("--z-doc-line-height:2");
    expect(paper.getAttribute("style")).toContain("--z-doc-body-size:15pt");
    expect(pv.getDocumentHtml()).toContain("--z-doc-body-size:15pt");
    document.body.removeChild(pv);
  });

  it("手动缩放：transform 等比缩放不改纸张几何；重置回 100% 后清掉 transform", async () => {
    // [WHY] 2026-09-26 需求：A4 固定, 缩放必须手动且内部元素等比（transform 不触发重排）
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    await rendered(pv);
    const scaleEl = () => pv.shadowRoot.querySelector<HTMLElement>(".z-docp__scale");
    expect(scaleEl().style.transform).toBe("");

    const click = (op: string) =>
      (pv.shadowRoot.querySelector(`[data-op="${op}"]`) as HTMLButtonElement).click();
    click("zoom-in");
    await rendered(pv);
    expect(pv.zoom).toBeCloseTo(1.1);
    expect(scaleEl().style.transform).toContain("scale(1.1)");
    expect(scaleEl().querySelector(".z-doc-paper").getAttribute("style")).not.toContain("scale");
    expect(pv.shadowRoot.querySelector<HTMLElement>("[data-op='zoom-reset']").textContent).toContain("110%");

    click("zoom-in");
    click("zoom-in");
    await rendered(pv);
    expect(pv.zoom).toBeCloseTo(1.3);
    click("zoom-reset");
    await rendered(pv);
    expect(pv.zoom).toBe(1);
    expect(scaleEl().style.transform).toBe("");
    document.body.removeChild(pv);
  });

  it("generate() 双通道回调：onGenerate 函数属性 + z-generate 事件", async () => {
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.data = { partyA: "甲公司" };
    const onGenerate = vi.fn();
    pv.onGenerate = onGenerate;
    const spy = vi.fn();
    pv.addEventListener("z-generate", spy);
    await rendered(pv);

    pv.generate();
    await rendered(pv);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.data.partyA).toBe("甲公司");
    expect(onGenerate).toHaveBeenCalledTimes(1);
    document.body.removeChild(pv);
  });

  it("setData 更新数据并重算文档", async () => {
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    await rendered(pv);
    pv.setData({ partyA: "乙公司" });
    await rendered(pv);
    expect(pv.shadowRoot.querySelector(".z-doc-paper").innerHTML).toContain("甲方：乙公司");
    document.body.removeChild(pv);
  });

  it("未注入适配器导出：z-export 携带错误, 不产生下载", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    await rendered(pv);
    const spy = vi.fn();
    pv.addEventListener("z-export", spy);

    const blob = await pv.exportDocx();
    expect(blob).toBeNull();
    expect(spy.mock.calls[0][0].detail.error).toBe("未注入导出适配器");
    expect(pv.shadowRoot.querySelector(".z-docp__error").textContent).toContain("未注入导出适配器");
    expect(clickSpy).not.toHaveBeenCalled();
    clickSpy.mockRestore();
    document.body.removeChild(pv);
  });

  it("注入适配器导出：blob 经双通道回调并触发下载（入参为模板 + 数据）", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const blob = new Blob(["docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const renderDocx = vi.fn(async () => blob);
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.formatConfig = JSON.stringify(DEFAULT_FORMAT_CONFIG);
    pv.data = { partyA: "甲公司" };
    pv.template = { id: "t1", name: "采购合同", content: THREE_BLOCKS, formatConfig: "{}", isDefault: true };
    pv.renderAdapter = { renderDocx };
    const onExport = vi.fn();
    pv.onExport = onExport;
    const spy = vi.fn();
    pv.addEventListener("z-export", spy);
    await rendered(pv);

    const out = await pv.exportDocx();
    expect(out).toBe(blob);
    expect(renderDocx).toHaveBeenCalledTimes(1);
    expect(renderDocx.mock.calls[0][0].name).toBe("采购合同");
    expect(renderDocx.mock.calls[0][1].partyA).toBe("甲公司");
    expect(spy.mock.calls[0][0].detail.blob).toBe(blob);
    expect(onExport.mock.calls[0][0].blob).toBe(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
    document.body.removeChild(pv);
  });

  it("适配器抛错导出：z-export 带错误信息, exporting 状态复位", async () => {
    const renderDocx = vi.fn(async () => {
      throw new Error("server 500");
    });
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.template = { id: "t1", name: "采购合同", content: THREE_BLOCKS, formatConfig: "{}", isDefault: true };
    pv.renderAdapter = { renderDocx };
    await rendered(pv);

    const spy = vi.fn();
    pv.addEventListener("z-export", spy);
    const out = await pv.exportDocx();
    await rendered(pv);

    expect(out).toBeNull();
    expect(spy.mock.calls[0][0].detail.error).toBe("server 500");
    expect(pv.shadowRoot.querySelector(".z-docp__error").textContent).toContain("server 500");
    expect(pv.shadowRoot.querySelector('[data-op="export"]').hasAttribute("disabled")).toBe(false);
    document.body.removeChild(pv);
  });

  it("print() 输出同源 DOM + A4 @page 规则并 emit z-print", async () => {
    const written: string[] = [];
    const fakeWin = {
      document: { write: (s: string) => written.push(s), close: () => undefined },
      focus: () => undefined,
      print: () => undefined,
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);
    const pv = createPreview();
    await rendered(pv);
    pv.content = THREE_BLOCKS;
    pv.data = { partyA: "甲公司" };
    pv.template = { id: "t1", name: "采购合同", content: THREE_BLOCKS, formatConfig: "{}", isDefault: true };
    pv.formatConfig = JSON.stringify({ ...DEFAULT_FORMAT_CONFIG, bodyFontSize: "小三" });
    await rendered(pv);

    const spy = vi.fn();
    pv.addEventListener("z-print", spy);
    pv.print();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(written[0]).toContain("@page { size: A4; margin: 0; }");
    expect(written[0]).toContain("page-break-after: always");
    expect(written[0]).toContain("--z-doc-body-size:15pt");
    expect(written[0]).toContain("甲方：甲公司");
    expect(written[0]).toContain("<title>采购合同</title>");
    expect(spy).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
    document.body.removeChild(pv);
  });
});

// ── 缩放按钮的可访问名（2026-11-16）────────────────────────────────────
//
// [WHY] 这三个按钮的文本是 `−` / `＋` / 当前百分比，而 `title` 在**文本优先**的
// 命名算法里只退化成描述。真机 CDP 实测（改之前）：`name="−" desc="缩小"` ——
// 读屏念「减号 按钮」。静态守卫 A8 抓的是「漏写」，这里抓的是另一半：
// 名字必须来自属性，宿主能把它换掉（英文界面）。
describe("z-doc-preview 缩放按钮的名字", () => {
  it("三键的 aria-label 来自属性，而不是写死的符号或 title", async () => {
    const pv = createPreview();
    await rendered(pv);

    const btn = (op: string) => pv.shadowRoot.querySelector(`[data-op="${op}"]`)!;
    expect(btn("zoom-out").getAttribute("aria-label"), "读屏会念「减号 按钮」").toBe("缩小");
    expect(btn("zoom-in").getAttribute("aria-label")).toBe("放大");
    // 重置键显示的是**当前**缩放（100%），名字必须是动作而不是那个数字
    expect(btn("zoom-reset").getAttribute("aria-label"), "名字是状态不是动作").toBe("重置缩放");
    expect(btn("zoom-reset").textContent!.trim()).toBe("100%");

    // 宿主改了文案，名字要跟着改（英文宿主把「放大」换成 "Zoom in"）
    pv.zoomInText = "Zoom in";
    await rendered(pv);
    expect(pv.shadowRoot.querySelector('[data-op="zoom-in"]')!.getAttribute("aria-label")).toBe("Zoom in");
    document.body.removeChild(pv);
  });
});

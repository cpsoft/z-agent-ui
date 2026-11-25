// Test: z-report-table · 外观与固定列：页脚 / 对齐 / 变体 / i18n / 冻结列 / 公开 API
// Related: [[REQ-001]] [[REQ-014]]
// [WHY] 2026-10-25 系统审计：从 report-table.test.ts（872 行）按行为域拆出，
// 夹具见 ./report-table-helpers.ts。

import { describe, it, expect, vi } from "vitest";
// [WHY] 这个分册要读静态 styles（regression: 冻结表头特异性覆盖），因此必须值导入组件类。
import { ZReportTable } from "../../../src/report/table/ReportTable";
import { createTable, rendered, inColSel } from "./report-table-helpers.js";

describe("z-report-table · appearance", () => {
  it("renders footer with footer functions", async () => {
    const el = createTable();
    el.showFooter = true;
    el.columns[1].footer = (data: any[]) => "sum:" + data.reduce((s, r) => s + r.amount, 0);
    await rendered(el);
    const foot = el.shadowRoot!.querySelector(".z-rpt__foot")!;
    expect(foot.textContent).toContain("sum:600");
    document.body.removeChild(el);
  });

  it("shows footerLabel in first column when footer undefined (中文合计行)", async () => {
    const el = createTable();
    el.showFooter = true;
    el.columns[1].footer = (data: any[]) => "sum:" + data.reduce((s, r) => s + r.amount, 0);
    el.footerLabel = "合计";
    await rendered(el);
    const cells = el.shadowRoot!.querySelectorAll(".z-rpt__tf");
    expect(cells[0].textContent).toBe("合计");
    expect(cells[1].textContent).toBe("sum:600");
    document.body.removeChild(el);
  });

  it("hides footerLabel when set to empty string", async () => {
    const el = createTable();
    el.showFooter = true;
    el.footerLabel = "";
    await rendered(el);
    const cells = el.shadowRoot!.querySelectorAll(".z-rpt__tf");
    expect(cells[0].textContent).toBe("");
    document.body.removeChild(el);
  });

  it("centers headers by default and follows explicit align", async () => {
    const el = createTable();
    el.columns[2].align = "right";
    await rendered(el);
    const ths = el.shadowRoot!.querySelectorAll("th[data-key]");
    expect(ths[0].classList.contains("z-rpt__cell--left")).toBe(false);
    expect(ths[0].classList.contains("z-rpt__cell--right")).toBe(false);
    expect(ths[2].classList.contains("z-rpt__cell--right")).toBe(true);
    // 数据单元格不受影响, 仍默认左对齐
    const rows = el.shadowRoot!.querySelectorAll(".z-rpt__row");
    expect(rows[0].querySelectorAll("td")[0].classList.contains("z-rpt__cell--left")).toBe(true);
    document.body.removeChild(el);
  });

  it("applies three-line variant class", async () => {
    const el = createTable();
    el.variant = "lines";
    await rendered(el);
    expect(el.shadowRoot!.querySelector("table.z-rpt--lines")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("renders config dropdown tips from i18n properties (zh injection)", async () => {
    const el = createTable();
    el.editable = true;
    el.columnSettingsText = "列设置";
    el.alignLeftText = "左对齐";
    el.alignCenterText = "居中";
    el.alignRightText = "右对齐";
    el.pinNoneText = "不冻结";
    el.pinLeftText = "冻结到左侧";
    el.pinRightText = "冻结到右侧";
    await rendered(el);

    el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.click();
    await rendered(el);
    expect(el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.getAttribute("title")).toBe("列设置");
    expect((el.shadowRoot!.querySelector("[data-align='left']") as HTMLElement).getAttribute("title")).toBe("左对齐");
    expect((el.shadowRoot!.querySelector("[data-align='center']") as HTMLElement).getAttribute("title")).toBe("居中");
    expect((el.shadowRoot!.querySelector("[data-align='right']") as HTMLElement).getAttribute("title")).toBe("右对齐");
    expect((el.shadowRoot!.querySelector("[data-fix='none']") as HTMLElement).getAttribute("title")).toBe("不冻结");
    expect((el.shadowRoot!.querySelector("[data-fix='left']") as HTMLElement).getAttribute("title")).toBe("冻结到左侧");
    expect((el.shadowRoot!.querySelector("[data-fix='right']") as HTMLElement).getAttribute("title")).toBe("冻结到右侧");
    document.body.removeChild(el);
  });

  it("i18n 属性未设置时回落到库的默认文案（中文）", async () => {
    const el = createTable();
    el.editable = true;
    await rendered(el);
    // [WHY] 列选择器按钮文案来自内嵌 z-column-selector(columnsText 经属性透传), 见 [[REQ-015-column-selector]]
    // 2026-10-26 起触发器是纯图标钮：文案载体从可见文字改为 aria-label/title，
    // 断言必须跟着换 —— 图标按钮没有可访问名等于读屏用户用不了。
    //
    // [WHY 2026-11-15 把断言从英文改成中文] 这条用例原来叫
    // "falls back to English tips..."，断言的是「没传文案 → 英文」—— 它把缺陷本身
    // 写成了契约：不接 i18n 的宿主（最省事的那批）拿到的是中英混排。
    // 现在默认值就是中文（src/core/copy.ts），断言的语义也随之从
    // 「回落成英文」改成「回落成库默认文案」。
    expect(inColSel(el, ".z-colsel__trigger")!.getAttribute("aria-label")).toBe("列选择");
    el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.click();
    await rendered(el);
    expect((el.shadowRoot!.querySelector("[data-align='left']") as HTMLElement).getAttribute("title")).toBe("左对齐");
    expect((el.shadowRoot!.querySelector("[data-fix='left']") as HTMLElement).getAttribute("title")).toBe("冻结到左侧");
    expect(el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.getAttribute("title")).toBe("列设置");
    document.body.removeChild(el);
  });

  it("shows required-column tooltip from requiredColumnText property", async () => {
    const el = createTable();
    el.editable = true;
    el.columns[0].required = true;
    el.requiredColumnText = "必选字段";
    await rendered(el);
    inColSel(el, ".z-colsel__trigger")!.click();
    await rendered(el);
    const item = inColSel(el, ".z-colsel__item--required")!;
    expect(item.getAttribute("title")).toBe("必选字段");
    document.body.removeChild(el);
  });

  it("renders fixed-column footer cells with sticky classes and offsets", async () => {
    const el = createTable();
    // [2026-10-27 issue IKQUWH] 关掉表头工具列，这条测的才是「右冻结贴边 = right:0」本身。
    // 工具列存在时它会占最右 32px，右冻结列必须让位（right:32px）——
    // 那段语义由 report-table-tools-column.test.ts 单独锁（两条断言都在，改坏任一处都会红）。
    el.showColumnSelector = false;
    el.showFooter = true;
    el.columns[0].fixed = "left";
    el.columns[2].fixed = "right";
    el.columns[0].footer = "L";
    await rendered(el);
    const cells = el.shadowRoot!.querySelectorAll(".z-rpt__tf");
    expect(cells[0].classList.contains("z-rpt__tf--fixed-left")).toBe(true);
    expect(cells[0].getAttribute("style")).toContain("left:0px");
    expect(cells[1].classList.contains("z-rpt__tf--fixed-left")).toBe(false);
    expect(cells[1].getAttribute("style")).toBeNull();
    expect(cells[2].classList.contains("z-rpt__tf--fixed-right")).toBe(true);
    expect(cells[2].getAttribute("style")).toContain("right:0px");
    document.body.removeChild(el);
  });

  it("renders checkbox footer cell as fixed-left when selectable", async () => {
    const el = createTable();
    el.showFooter = true;
    el.selectable = true;
    await rendered(el);
    const first = el.shadowRoot!.querySelector(".z-rpt__tf")!;
    expect(first.classList.contains("z-rpt__tf--checkbox")).toBe(true);
    expect(first.classList.contains("z-rpt__tf--fixed-left")).toBe(true);
    document.body.removeChild(el);
  });

  it("regression: frozen header cells outrank plain headers via specificity override", () => {
    // [WHY] happy-dom 不解析 CSS 级联(无法验证 z-index 生效), 以 raw CSS 断言特异性规则存在。
    // .z-rpt__head .z-rpt__th(0,2,0) 的 z-index:3 会覆盖 (0,1,0) 的 z-index:4,
    // 必须由 (0,3,0) 规则提权, 见 [[bug-20260810-rpt-header-overlap]]
    const css = (ZReportTable as any).styles as string;
    const block = css.match(/\.z-rpt__head \.z-rpt__th--fixed-left,\s*\.z-rpt__head \.z-rpt__th--fixed-right\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).toContain("z-index: 4");
  });

  it("applies max-height + vertical scroll to wrapper for frozen header", async () => {
    const el = createTable();
    el.maxHeight = "320px";
    await rendered(el);
    const wrapper = el.shadowRoot!.querySelector(".z-rpt__wrapper") as HTMLElement;
    expect(wrapper.style.maxHeight).toBe("320px");
    expect(wrapper.style.overflowY).toBe("auto");
    document.body.removeChild(el);
  });

  it("leaves wrapper unstyled when maxHeight empty", async () => {
    const el = createTable();
    await rendered(el);
    const wrapper = el.shadowRoot!.querySelector(".z-rpt__wrapper") as HTMLElement;
    expect(wrapper.getAttribute("style")).toBeNull();
    document.body.removeChild(el);
  });

  it("pins and unpins a column via edit-mode header dropdown freeze buttons", async () => {
    const el = createTable();
    el.editable = true;
    const cfgSpy = vi.fn();
    el.addEventListener("z-column-config-change", cfgSpy);
    await rendered(el);

    el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.click();
    await rendered(el);
    const menu = el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-menu")!;
    expect(menu.querySelector("[data-fix='none']")).toBeTruthy();
    expect(menu.querySelector("[data-fix='left']")).toBeTruthy();
    expect(menu.querySelector("[data-fix='right']")).toBeTruthy();

    // [WHY] 点击 pin-left 后列固定, 表头/表体同步加 fixed-left class, 偏移随之计算
    (el.shadowRoot!.querySelector("[data-fix='left']") as HTMLElement)!.click();
    await rendered(el);
    expect(el.columns[0].fixed).toBe("left");
    expect(cfgSpy.mock.calls[0][0].detail).toMatchObject({ key: "name", fixed: "left" });
    expect(el.shadowRoot!.querySelector("th[data-key='name']")!.classList.contains("z-rpt__th--fixed-left")).toBe(true);
    expect(el.shadowRoot!.querySelector(".z-rpt__row td")!.classList.contains("z-rpt__td--fixed-left")).toBe(true);

    // [WHY] 再点 pin-left 还原为不冻结, 交互与对齐按钮"再点还原默认"一致
    el.shadowRoot!.querySelector("th[data-key='name'] .z-rpt__th-config-btn")!.click();
    await rendered(el);
    (el.shadowRoot!.querySelector("[data-fix='left']") as HTMLElement)!.click();
    await rendered(el);
    expect(el.columns[0].fixed).toBeUndefined();
    expect(cfgSpy.mock.calls[1][0].detail).toMatchObject({ key: "name", fixed: null });
    expect(el.shadowRoot!.querySelector("th[data-key='name']")!.classList.contains("z-rpt__th--fixed-left")).toBe(false);
    document.body.removeChild(el);
  });

  it("exports and restores fixed state via config snapshot (old snapshot unfixes)", async () => {
    const el = createTable();
    el.columns[0].fixed = "left";
    el.columns[2].fixed = "right";
    await rendered(el);

    const cfg = el.getConfig();
    expect(cfg.columns[0].fixed).toBe("left");
    expect(cfg.columns[2].fixed).toBe("right");
    expect(cfg.columns[1].fixed).toBeNull();

    // [WHY] 快照为权威: 无 fixed 字段的旧快照解冻对应列
    const legacy = JSON.parse(JSON.stringify(cfg));
    delete legacy.columns[0].fixed;
    delete legacy.columns[2].fixed;
    el.columns[0].fixed = undefined;
    el.columns[2].fixed = undefined;
    el.applyConfig(legacy);
    await rendered(el);
    expect(el.columns[0].fixed).toBeUndefined();
    expect(el.columns[2].fixed).toBeUndefined();

    el.applyConfig(cfg);
    await rendered(el);
    expect(el.columns[0].fixed).toBe("left");
    expect(el.columns[2].fixed).toBe("right");
    document.body.removeChild(el);
  });

  it("marks fixed columns sticky and toggles scroll shadow classes", async () => {
    const el = createTable();
    el.columns[0].fixed = "left";
    await rendered(el);
    const th = el.shadowRoot!.querySelector("th[data-key='name']")!;
    expect(th.classList.contains("z-rpt__th--fixed-left")).toBe(true);

    const wrapper = el.shadowRoot!.querySelector(".z-rpt__wrapper")!;
    wrapper.scrollLeft = 40;
    wrapper.dispatchEvent(new Event("scroll"));
    expect(wrapper.classList.contains("z-rpt__wrapper--scrolled-left")).toBe(true);

    wrapper.scrollLeft = 0;
    wrapper.dispatchEvent(new Event("scroll"));
    expect(wrapper.classList.contains("z-rpt__wrapper--scrolled-left")).toBe(false);
    document.body.removeChild(el);
  });

  it("clears selection via public API", async () => {
    const el = createTable();
    el.selectable = true;
    await rendered(el);
    el.selectAll();
    await rendered(el);
    expect(el.selectedKeys.length).toBe(3);
    el.clearSelection();
    expect(el.selectedKeys.length).toBe(0);
    document.body.removeChild(el);
  });

  // [WHY 补这一条] 列冻结（`ReportColumn.fixed`）一直只有「列设置面板能切」「快照能还原」
  // 两条路径被测过，**从 columns 直接声明**这条路没人测 —— 而页面脚本走的正是它（issue IKQUK9）。
  // 缺这条时，脚本层的 fixed 透传是否真的被组件消费，只能靠「面板里点一下有效」推断。
  it("fixed 列渲染出冻结类（left / right 各自独立）", async () => {
    const el = createTable();
    el.columns = [
      { key: "name", title: "Name", width: "120px", fixed: "left" },
      { key: "amount", title: "Amount", width: "100px", align: "right" },
      { key: "note", title: "Note", width: "200px", fixed: "right" },
    ];
    await rendered(el);
    const ths = el.shadowRoot!.querySelectorAll("th[scope='col']");
    expect(ths[0].classList.contains("z-rpt__th--fixed-left")).toBe(true);
    expect(ths[1].classList.contains("z-rpt__th--fixed-left")).toBe(false);
    expect(ths[1].classList.contains("z-rpt__th--fixed-right")).toBe(false);
    expect(ths[2].classList.contains("z-rpt__th--fixed-right")).toBe(true);
    document.body.removeChild(el);
  });
});

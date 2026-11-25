// Test: z-column-selector 独立列选择器(内嵌自动/for/target 三态绑定, 事件契约, 外部点击语义)
// Related: [[REQ-015-column-selector]]
// Wiki: wiki/requirements/REQ-015-column-selector.md
// Date: 2026-09-04
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
// [WHY] ReportTable 顶层 import 组件, 只导入 table 即可同时注册两者
import "../../../src/report/table/ReportTable";

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

async function rendered(el: any): Promise<void> {
  await tick();
  await tick();
}

function createTable(): any {
  const el = document.createElement("z-report-table") as any;
  el.id = "src-table";
  el.columns = [
    { key: "name", title: "Name", sortable: true },
    { key: "amount", title: "Amount", required: true },
    { key: "note", title: "Note" },
  ];
  el.data = [
    { name: "Alpha", amount: 300, note: "first" },
    { name: "Beta", amount: 100, note: "second" },
  ];
  document.body.appendChild(el);
  return el;
}

// [WHY] 属性须在 appendChild 之后设置(setAttribute-before-connectedCallback lesson)
async function createStandalone(mode: "for" | "target" | "none", table?: any): Promise<any> {
  const sel = document.createElement("z-column-selector") as any;
  document.body.appendChild(sel);
  await rendered(sel);
  if (mode === "for") sel.for = table.id;
  if (mode === "target") sel.target = table;
  await rendered(sel);
  return sel;
}

function triggerOf(sel: any): HTMLElement {
  return sel.shadowRoot.querySelector(".z-colsel__trigger");
}

function checkboxOf(sel: any, key: string): HTMLInputElement {
  return sel.shadowRoot.querySelector(`.z-colsel__checkbox[data-key="${key}"]`);
}

async function open(sel: any): Promise<void> {
  triggerOf(sel).click();
  await rendered(sel);
}

describe("z-column-selector", () => {
  describe("数据源绑定三态", () => {
    it("for=\"表格id\" 绑定: 读取列清单并可勾选显隐", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      expect(triggerOf(sel)).toBeTruthy();
      // [WHY 断言可见文字改成断言无障碍名] 触发器已改为纯图标按钮（2026-10-26），
      // 文案从可见文字变成 aria-label/title。图标按钮**必须**有可访问名，
      // 所以这条断言不能删，只是换了载体 —— 断言 textContent 会变成永远失败的死断言，
      // 而删掉它则会放过"图标按钮没有名字"这种读屏用户完全无法使用的情况。
      expect(triggerOf(sel).getAttribute("aria-label")).toBe("列选择");
      expect(triggerOf(sel).getAttribute("title")).toBe("列选择");

      await open(sel);
      const boxes = sel.shadowRoot.querySelectorAll<HTMLInputElement>(".z-colsel__checkbox");
      expect(boxes.length).toBe(3);
      const labels = Array.from(sel.shadowRoot.querySelectorAll(".z-colsel__label")).map((n) => n.textContent);
      expect(labels).toEqual(["Name", "Amount", "Note"]);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("target 属性绑定(无 id 场景等价): 勾选驱动源表格列 hidden", async () => {
      const table = createTable();
      const sel = await createStandalone("target", table);

      const cfgSpy = vi.fn();
      table.addEventListener("z-config-change", cfgSpy);
      const visSpy = vi.fn();
      // [WHY] 外部摆放时组件与表格是兄弟节点, 事件不会沿表格元素冒泡, 页面级监听才收得到
      document.addEventListener("z-column-visibility-change", visSpy as EventListener);

      await open(sel);
      checkboxOf(sel, "note").click();
      await rendered(sel);

      expect(table.columns[2].hidden).toBe(true);
      expect(cfgSpy).toHaveBeenCalledTimes(1);
      expect(cfgSpy.mock.calls[0][0].detail.config.columns[2].hidden).toBe(true);
      expect(visSpy).toHaveBeenCalledTimes(1);
      const ev = visSpy.mock.calls[0][0] as CustomEvent;
      expect(ev.detail).toEqual({ key: "note", visible: false });
      // [WHY] 勾选后 dropdown 保持打开(支持一次开多个字段), 复选框反映最新 hidden
      expect(sel.open).toBe(true);
      expect(checkboxOf(sel, "note").checked).toBe(false);
      document.removeEventListener("z-column-visibility-change", visSpy as EventListener);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("required 列在外部绑定下同样锁定(disabled + 锁图标)", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      await open(sel);
      const cb = checkboxOf(sel, "amount");
      expect(cb.disabled).toBe(true);
      expect(cb.checked).toBe(true);
      expect(sel.shadowRoot.querySelector(".z-colsel__item--required")).toBeTruthy();
      expect(sel.shadowRoot.querySelector(".z-colsel__lock")).toBeTruthy();
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("无绑定且 for 未命中时渲染为空(不残留触发器)", async () => {
      const sel = await createStandalone("none");
      expect(sel.shadowRoot.querySelector(".z-colsel__trigger")).toBeNull();
      sel.for = "no-such-table";
      await rendered(sel);
      expect(sel.shadowRoot.querySelector(".z-colsel__trigger")).toBeNull();
      document.body.removeChild(sel);
    });

    it("for 命中已挂载表格但 columns 后置赋值: 触发器先现, 配置后打开即见列清单", async () => {
      // [WHY] 演示/框架先 appendChild 后设属性的真实时序: target 元素先于 source 就绪,
      // 触发器以目标元素为条件渲染, 见 [[REQ-015-column-selector]]
      const table = document.createElement("z-report-table") as any;
      table.id = "late-columns";
      document.body.appendChild(table);
      await rendered(table);

      const sel = document.createElement("z-column-selector") as any;
      sel.for = "late-columns";
      document.body.appendChild(sel);
      await rendered(sel);
      expect(triggerOf(sel)).toBeTruthy();

      table.columns = [
        { key: "name", title: "Name" },
        { key: "amount", title: "Amount" },
        { key: "note", title: "Note" },
      ];
      table.data = [];
      await open(sel);
      expect(sel.shadowRoot.querySelectorAll(".z-colsel__checkbox").length).toBe(3);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("for 指向的表格尚未挂载: 低频重试后自愈出现触发器", async () => {
      // [WHY] 真实时序: 选择器先于表格进入 DOM; for 已声明但目标未命中时组件
      // 低频(250ms)重试解析, 表格挂载后触发器自愈出现
      vi.useFakeTimers();
      try {
        const sel = document.createElement("z-column-selector") as any;
        sel.for = "late-table";
        document.body.appendChild(sel);
        // [WHY] 假时钟下 rendered()(setTimeout 0)不推进, 手动冲微任务
        await Promise.resolve();
        await Promise.resolve();
        expect(sel.shadowRoot.querySelector(".z-colsel__trigger")).toBeNull();

        const table = document.createElement("z-report-table") as any;
        table.id = "late-table";
        table.columns = [{ key: "name", title: "Name" }];
        table.data = [];
        document.body.appendChild(table);

        await vi.advanceTimersByTimeAsync(300);
        expect(triggerOf(sel)).toBeTruthy();
        document.body.removeChild(sel);
        document.body.removeChild(table);
      } finally {
        // [WHY] 泄漏假时钟会冻结后续用例的 setTimeout(tick 永不触发)
        vi.useRealTimers();
      }
    });
  });

  describe("开关与事件契约", () => {
    it("trigger 点击翻转 open: aria-expanded + open 属性 + z-column-selector-open/z-column-selector-close", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      const openSpy = vi.fn();
      const closeSpy = vi.fn();
      sel.addEventListener("z-column-selector-open", openSpy);
      sel.addEventListener("z-column-selector-close", closeSpy);

      triggerOf(sel).click();
      await rendered(sel);
      expect(sel.open).toBe(true);
      expect(sel.hasAttribute("open")).toBe(true);
      expect(triggerOf(sel).getAttribute("aria-expanded")).toBe("true");
      expect(sel.shadowRoot.querySelector(".z-colsel__dropdown")).toBeTruthy();
      expect(openSpy).toHaveBeenCalledTimes(1);

      triggerOf(sel).click();
      await rendered(sel);
      expect(sel.open).toBe(false);
      expect(triggerOf(sel).getAttribute("aria-expanded")).toBe("false");
      expect(closeSpy).toHaveBeenCalledTimes(1);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("程序化 open 赋值不 emit(仅用户操作翻转发事件, 宿主重建开局不噪声)", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      const openSpy = vi.fn();
      sel.addEventListener("z-column-selector-open", openSpy);
      sel.open = true;
      await rendered(sel);
      expect(sel.shadowRoot.querySelector(".z-colsel__dropdown")).toBeTruthy();
      expect(openSpy).not.toHaveBeenCalled();
      sel.open = false;
      await rendered(sel);
      expect(openSpy).not.toHaveBeenCalled();
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("Escape 关闭并 emit z-column-selector-close(document 级监听)", async () => {
      // [WHY] keydown 监听在 document 而非 shadow: 真实浏览器中勾选重渲染后 focus
      // 落回 body, shadow 级收不到 Escape; composed 模拟跨 shadow 边界的真实按键
      const table = createTable();
      const sel = await createStandalone("for", table);
      const closeSpy = vi.fn();
      sel.addEventListener("z-column-selector-close", closeSpy);
      await open(sel);
      const cb = checkboxOf(sel, "note");
      cb.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
      await rendered(sel);
      expect(sel.open).toBe(false);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("Escape 且焦点在组件外(body)同样关闭 — 勾选重渲染丢焦场景回归", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      await open(sel);
      // [WHY] 模拟 checkbox 勾选后的真实状态: focus 不在组件 shadow 内
      checkboxOf(sel, "note").click();
      await rendered(sel);
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await rendered(sel);
      expect(sel.open).toBe(false);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });
  });

  describe("外部点击关闭语义", () => {
    it("外部摆放: 点击表格区域算外部 → 关闭", async () => {
      const table = createTable();
      await rendered(table);
      const sel = await createStandalone("for", table);
      const closeSpy = vi.fn();
      sel.addEventListener("z-column-selector-close", closeSpy);
      await open(sel);

      const cell = table.shadowRoot.querySelector(".z-rpt__row td") as HTMLElement;
      cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
      await rendered(sel);
      expect(sel.open).toBe(false);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("外部摆放: 点击无关页面区域 → 关闭", async () => {
      const table = createTable();
      const sel = await createStandalone("for", table);
      await open(sel);
      const pad = document.createElement("div");
      document.body.appendChild(pad);
      pad.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
      await rendered(sel);
      expect(sel.open).toBe(false);
      document.body.removeChild(pad);
      document.body.removeChild(sel);
      document.body.removeChild(table);
    });

    it("内嵌表格工具栏: 点击表格其它区域不关闭(现状语义), 表格重建后 open 镜像保持", async () => {
      const el = createTable() as any;
      const visSpy = vi.fn();
      el.addEventListener("z-column-visibility-change", visSpy);
      await rendered(el);
      const colSel = el.shadowRoot.querySelector("z-column-selector")!;

      triggerOf(colSel).click();
      await rendered(el);
      expect(colSel.open).toBe(true);

      // 排序表头(表格重建 shadow, 内嵌实例被替换) → 重建后仍 open(columnSelectorOpen 镜像)
      el.shadowRoot.querySelector("th[data-key='name']")!.click();
      await rendered(el);
      const colSel2 = el.shadowRoot.querySelector("z-column-selector")!;
      expect(colSel2.open).toBe(true);
      expect(colSel2.hasAttribute("open")).toBe(true);

      // 内嵌语义: 表格内 mousedown(行区域)不误关
      const cell = el.shadowRoot.querySelector(".z-rpt__row td") as HTMLElement;
      cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
      await rendered(el);
      expect(el.shadowRoot.querySelector("z-column-selector").open).toBe(true);
      document.body.removeChild(el);
    });
  });
});

// [WHY 单独一组] 2026-10-26 学员反馈「列选择的按钮太大太难看了，一个图标按钮就够了」。
// 触发器从「带边框的胶囊 + Columns 文字」改成 24px 纯图标钮。这类改动最容易在
// 后续「顺手加个文字更清楚」的念头里回退，所以把形态写成断言。
describe("触发器形态（图标钮）", () => {
  it("默认是纯图标：有 .z-colsel__icon，没有可见文字，文案落在 aria-label", async () => {
    // [WHY 必须绑表] 没有数据源时不渲染触发器（既有语义，见上面"三态"用例）
    const table = createTable();
    const sel = await createStandalone("for", table);
    const trigger = triggerOf(sel);
    expect(trigger.querySelector(".z-colsel__icon")).toBeTruthy();
    expect(trigger.querySelector(".z-colsel__text")).toBeNull();
    // 空白由模板缩进产生，严格判据是"不含文案"
    expect(trigger.textContent?.includes("列选择")).toBe(false);
    expect(trigger.getAttribute("aria-label")).toBe("列选择");
    document.body.removeChild(sel);
    document.body.removeChild(table);
  });

  it("showlabel 才显示文字（老宿主可复原成带文字的按钮）", async () => {
    const table = createTable();
    const sel = await createStandalone("for", table);
    sel.showLabel = true;
    await rendered(sel);
    const trigger = triggerOf(sel);
    expect(trigger.querySelector(".z-colsel__text")?.textContent).toBe("列选择");
    // 文字模式下图标仍在（图标 + 文字，而不是退回纯文字）
    expect(trigger.querySelector(".z-colsel__icon")).toBeTruthy();
    document.body.removeChild(sel);
    document.body.removeChild(table);
  });

  it("columnsText 改了，图标钮的无障碍名跟着改（不是写死 Columns）", async () => {
    const table = createTable();
    const sel = await createStandalone("for", table);
    sel.columnsText = "列";
    await rendered(sel);
    expect(triggerOf(sel).getAttribute("aria-label")).toBe("列");
    expect(triggerOf(sel).getAttribute("title")).toBe("列");
    document.body.removeChild(sel);
    document.body.removeChild(table);
  });

  // ── 勾选后的焦点归属（2026-11-16）─────────────────────────────
  //
  // [WHY 这一段单独存在] 勾选会调宿主的 `toggleColumn`，两边一起重渲染，**复选框节点
  // 被整个换掉** —— 焦点掉到 body。鼠标用户看不出（手还在原位），键盘用户勾一列就要
  // 重新 Tab 回选择器。而「连续勾几列」正是这个组件的典型用法。
  it("F1 勾选后焦点留在同一个复选框上（重渲染不吞焦点）", async () => {
    const table = createTable();
    const sel = await createStandalone("for", table);
    await open(sel);

    const cb = checkboxOf(sel, "note");
    cb.focus();
    expect(sel.shadowRoot.activeElement, "前置：焦点在复选框上").toBe(cb);

    cb.click();
    await rendered(sel);

    // [WHY 断言「同一个 key」而不是「同一个节点」] 重渲染必然换节点，旧引用已经脱离文档；
    // 断言节点相等会永远红，断言「shadowRoot.activeElement 非空」又太松
    // （可能落在触发器上也算过）。key 是这里唯一稳定的身份。
    const active = sel.shadowRoot.activeElement as HTMLInputElement | null;
    expect(active?.dataset?.key, "焦点应回到刚勾的那一列").toBe("note");
    expect(active, "恢复的必须是新渲染出来的节点").toBe(checkboxOf(sel, "note"));
    document.body.removeChild(sel);
    document.body.removeChild(table);
  });

  it("F2 下拉是一个带名字的分组（否则读屏只听到一串无名复选框）", async () => {
    const table = createTable();
    const sel = await createStandalone("for", table);
    await open(sel);

    const dd = sel.shadowRoot.querySelector(".z-colsel__dropdown")!;
    expect(dd.getAttribute("role")).toBe("group");
    expect(dd.getAttribute("aria-label"), "分组名应取 columnsText").toBe("列选择");
    document.body.removeChild(sel);
    document.body.removeChild(table);
  });
});

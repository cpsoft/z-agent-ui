// <z-print> —— 打印由它统一承接：把**已经渲染完的 DOM** 拍成快照，在独立 iframe 里印出来。
//
// [WHY 是这个形态] 组件一律不感知打印：不写 `@media print`、不加 class、不做打印专用属性。
// 它们照常渲染，z-print 在打印那一刻把结果整棵子树展开成一份独立文档，
// 用自己的排版规则印出来。这样新增组件不需要记得「补打印样式」，也不会出现
// 「这个组件印得好、那个组件把分页器也印出来」的漂移。
//
// 三条设计约束，都来自「不能靠 @media print」这个前提：
//   ① 独立文档：iframe 里没有屏幕上其它元素，天然只印这一块 ——
//      宿主不必写 `body > :not(z-print) { display: none }`
//   ② 快照而非实时：展开 shadow、收齐组件样式、固化浅色令牌（纸永远是白的，与当前主题无关）
//   ③ 通用纸面规则按**标签**生效（thead / tfoot / tr），不认组件内部类名 ——
//      z-print 不该知道 `z-rpt__pager` 这种名字
import { BaseElement, html, property } from "../../core/index.js";
import printCSS from "./print.css?raw";
import { buildSnapshot } from "./snapshot.js";

/** 页码档位：`page-of-total` 印「1 / 3」，`page` 只印「1」，`none` 不印。 */
export type PrintPageFormat = "page-of-total" | "page" | "none";

export class ZPrint extends BaseElement {
  static styles = printCSS;

  /** 页眉主标题（只在纸面上出现；屏幕上不产出这段 DOM）。 */
  @property({ type: String }) title = "";
  /** 页眉右侧副标题，适合放期间、门店、筛选条件。 */
  @property({ type: String }) subtitle = "";
  /** 页脚左侧文案，适合放「内部资料」「数据截至 …」。 */
  @property({ type: String }) footer = "";
  /** 页码档位，见 {@link PrintPageFormat}。 */
  @property({ type: String, attribute: "page-format" }) pageFormat: PrintPageFormat = "page-of-total";
  /**
   * 隐藏 `button / input / select / textarea`（默认开）。
   *
   * 这四类在纸上点了没用 —— 表格的复选框列、分页器按钮、工具栏都属此类。
   * 判据只用**标签名**，不认组件内部类名：z-print 不该知道别人怎么起类名。
   * 万一要印一个「长得像按钮的内容」，把它关掉。
   */
  @property({ type: Boolean, attribute: "hide-interactive" }) hideInteractive = true;

  /** 屏幕上就是内容本身：不产出页眉页脚，不多包一层。 */
  render(): string {
    return html`<slot></slot>`;
  }

  /**
   * 导出这份快照的完整 HTML（一份独立文档，样式已内联）。
   *
   * [WHY 公开] 两个用途：宿主若已有自己的打印通道（服务端出 PDF、Electron、小程序端），
   * 可以只取这份 HTML 而不走 `window.print()`；同时它让「快照是否完整」可被自动化验证 ——
   * 否则只能靠人工点打印对话框看结果。
   */
  snapshot(): string {
    return buildSnapshot(this, {
      pageRule: this._pageRule(),
      hideInteractive: this.hideInteractive,
    }).html;
  }

  /**
   * 打印。
   *
   * 顺序：先问宿主（`z-before-print`，可取消）→ 拍快照 → 写进 iframe → 等资源 → `print()`。
   * 快照是在这一步**同步拍**的（打印那一刻的样子）：宿主若要在打印前改数据，
   * 在 `z-before-print` 里改完再放行即可。
   */
  async print(): Promise<void> {
    const ev = this.emit("z-before-print", { title: this.title }, { cancelable: true });
    if (ev.defaultPrevented) return;

    const frame = await this._openFrame();
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      throw new Error("z-print: 打印文档不可用（iframe 被策略拦截？）");
    }

    // 标题只影响「另存为 PDF」的默认文件名，不参与排版。
    // 结束后必须还原：页面标题被永久改掉，是比打印失败更难发现的问题。
    const prev = document.title;
    const next = this.title.trim();
    if (next) document.title = next;
    win.addEventListener(
      "afterprint",
      () => {
        document.title = prev;
      },
      { once: true },
    );

    try {
      win.focus();
      win.print();
      this.emit("z-print", { title: this.title });
    } catch (err) {
      // 沙箱 / 无头环境里 print() 可能不可用：标题与 iframe 都要还原，否则留下脏状态
      document.title = prev;
      frame.remove();
      throw err;
    }
  }

  /** 建 iframe、写快照、等字体与图片，返回可打印的 frame。 */
  private async _openFrame(): Promise<HTMLIFrameElement> {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    // 屏幕外但保持 A4 内容宽度：让表格在快照里按接近纸面的宽度布局，
    // 打印时浏览器会再按实际纸张重排一次。
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden;";
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      throw new Error("z-print: 无法创建打印文档");
    }
    doc.open();
    doc.write(this.snapshot());
    doc.close();

    await this._waitAssets(doc);

    // [WHY 打印结束后才移除] 移除太早会让打印任务拿到空文档（Chrome 里 print() 会阻塞到
    // 对话框关闭，但 Firefox / Safari 不一定）。afterprint 是唯一跨浏览器的完成信号；
    // 再加一个长兜底，防止某些嵌入环境从不触发它 —— 那样 iframe 会永久留在 DOM 里。
    const cleanup = () => {
      if (frame.isConnected) frame.remove();
    };
    frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 120_000);

    return frame;
  }

  /** 等字体与图片就位，否则纸上会缺字或缺图。 */
  private async _waitAssets(doc: Document): Promise<void> {
    try {
      await doc.fonts?.ready;
    } catch {
      // 某些环境没有 FontFaceSet：字体缺失只是字形回退，不该让打印失败
    }
    const pending = Array.from(doc.images ?? []).filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  }

  /**
   * `@page` 规则：页边距 + 页眉页脚 + 页码，全部走 margin box。
   *
   * [WHY margin box 而不是 fixed 定位的页眉] 实测两轮才定下来：
   *   · `position: fixed` 的页眉在打印时相对**页面内容区**，必然盖住正文第一块内容
   *     （表现为「表头凭空消失」），而屏幕上一切正常 —— 这类问题只有在真纸面上才暴露；
   *   · margin box 画在纸张边距里，天然不侵入内容区，每页重复，且 `counter(page)`
   *     只有在这里才读得到（普通元素里的页码计数器恒为空）。
   *
   * [代价：页眉页脚只能是文本] margin box 放不了 logo、多列布局、自定义线条位置。
   * 需要富页眉时，宿主应在 `z-before-print` 里另做一份专用文档 —— 本组件不假装能做到。
   *
   * 实测（Chrome 142，A4）：中文页眉、右侧副标题、页脚、页码 1/2 与 2/2 全部正确，
   * 表头每页重复且不被遮挡。
   */
  private _pageRule(): string {
    // CSS 字符串字面量：JSON.stringify 会转义引号与反斜杠，中文原样输出
    const str = (v: string) => JSON.stringify(v);
    const boxes: string[] = [];

    if (this.title) {
      boxes.push(`@top-left { content: ${str(this.title)}; font-size: 11pt; font-weight: 600; border-bottom: 0.5pt solid #999; padding-bottom: 2mm; }`);
    }
    if (this.subtitle) {
      boxes.push(`@top-right { content: ${str(this.subtitle)}; font-size: 9pt; color: #444; }`);
    }
    if (this.footer) {
      boxes.push(`@bottom-left { content: ${str(this.footer)}; font-size: 9pt; color: #444; }`);
    }
    if (this.pageFormat !== "none") {
      const c = this.pageFormat === "page" ? "counter(page)" : 'counter(page) " / " counter(pages)';
      boxes.push(`@bottom-right { content: ${c}; font-size: 9pt; color: #555; }`);
    }

    return `@page {
  /* 上 22mm：页眉（11pt 标题 + 分隔线）要装得下；下 20mm：页脚 + 页码 */
  margin: 22mm 12mm 20mm;
  ${boxes.join("\n  ")}
}`;
  }
}

customElements.define("z-print", ZPrint);

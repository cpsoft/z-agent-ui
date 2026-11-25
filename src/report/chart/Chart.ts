// <z-chart> 图表：type 定图形、values 给数据，tooltip / legend / markline 按需开关，交互各发事件。
import { BaseElement, COPY, property, html, escapeAttr } from "../../core/index.js";
import { PointerDragSession, type PointerDragDelta } from "../../primitives/index.js";

import chartCSS from "./chart.css?raw";
import { resolveRenderer } from "./renderer/renderer.js";
import { renderSvg, buildOverlaySvg } from "./renderer/svg.js";
import { drawCanvas } from "./renderer/canvas.js";
import { buildGeometry, type BuildContext } from "./geometry/build.js";
import { computeDomains, computeFrame, computeWaterfallDomains, estimateTextWidth, insetFrame, type AxisSlots, type ComputedFrame, type Domains } from "./layout/layout.js";
import { makeFormatter } from "./format/format.js";
import { normalizeSeries, detectXKind } from "./data/normalize.js";
import { resolveSeriesColors } from "./palette.js";
import { prefersReducedMotion, Animator } from "./animator/animator.js";
import { TooltipManager } from "./interaction/tooltip.js";
import { nextTargetIndex, type NavDir } from "./interaction/hit.js";
import { ZChartSeries } from "./ChartSeries.js";
import { ZChartAxis } from "./ChartAxis.js";
import type { ChartType, GeometryModel, MapRegion, MapValue, RendererName, ResolvedTheme, SeriesModel, StackMode, TooltipTarget } from "./types.js";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 320;
/** 图表实例序号（见 `_uid`）。 */
let CHART_SEQ = 0;
const SPARKLINE_HEIGHT = 48;
/** 缩放条总高（轨道 22 + 与绘图区的间距）。作图区高度要扣掉它，否则底部轴标签被推出容器。 */
const ZOOM_HEIGHT = 40;
/** 分类数少于这个值不显示缩放条：三五个分类还缩放，拖到头也只看得到两根柱。 */
const MIN_ZOOM_CATEGORIES = 6;
/** 缩放区间的最小跨度（占全长比例）：再小就一个分类都不剩，看着像渲染挂了。 */
const MIN_ZOOM_SPAN = 0.02;
// [框选与点击的分界] 归 primitives/pointer-drag（欧氏 3px），这里原是自己定 4px 分轴


// [WHY] 宿主监听器收到的事件 target 会被 retarget 成 host（shadow 边界），
// 不能用 e.target.closest()；composedPath() 才包含 shadow 内部元素
function findInEventPath(e: Event, selector: string): Element | null {
  for (const p of e.composedPath()) {
    if (p instanceof Element && p.matches(selector)) return p;
  }
  return null;
}

function parseColor(color: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseGeoJson(geojson: unknown, idKey: string, nameKey: string): MapRegion[] {
  if (!geojson || typeof geojson !== "object") return [];
  const raw = geojson as any;
  const features: any[] = Array.isArray(raw) ? raw : Array.isArray(raw.features) ? raw.features : [];
  const regions: MapRegion[] = [];
  for (const f of features) {
    const geom = f?.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) continue;
    const props = f?.properties ?? {};
    const id = String(props[idKey] ?? f?.id ?? "");
    const name = String(props[nameKey] ?? id);
    const rings: number[][][] = geom.type === "Polygon"
      ? geom.coordinates
      : geom.coordinates.flat();
    if (rings.length > 0) regions.push({ id, name, rings });
  }
  return regions;
}

export class ZChart extends BaseElement {
  static styles = chartCSS;

  @property({ type: String }) type: ChartType | string = "bar";
  /**
   * 柱图方向（2026-11-17）：`vertical`（缺省）/ `horizontal`（条形图，分类在左轴、值在底轴）。
   *
   * 只对 `type=bar` 生效 —— 折线/面积横向没有语义（时间不会横着流），静默忽略而不是报错。
   * 与 `stack` **正交可共存**（横向堆积条是排行榜的常见形态），所以没有像
   * stack/overlay 那样做互斥清理。
   */
  @property({ type: String }) direction = "vertical";
  /**
   * 热力色阶的固定上下限，形如 `heatmap-clamp="100,500"`（只对 `type=heatmap` 生效）。
   *
   * [WHY 需要这个而不是只做拖拽] 同一个指标做成多张热力图时（各时段一张、各区域一张），
   * 每张各自按自己的 min/max 取色会导致**深浅不可比**：A 图的浅蓝与 B 图的深蓝可能
   * 是同一个值。固定上下限才让并排的几张图能直接对照。
   *
   * 只给一侧时另一侧仍取本图极值。上下限给反了当没给（画出来会全同色，
   * 看着像「数据都一样」，那是比报错更糟的误导）。
   */
  @property({ type: String, attribute: "heatmap-clamp" }) heatmapClamp = "";
  /**
   * 显示底部缩放条（滑块 + 左右手柄），用于「先看全量趋势，再放大某一段」。
   *
   * [WHY 不是 dataZoom 那套三四种类型] ECharts 有 slider / inside / select 等多种缩放器，
   * 但报表看板里真正会用的只有一种：**看得见、拖得动、键盘也能调**的底部滑块。
   * 滚轮式（inside）会和外层页面的滚动打架，框选式（select）和 tooltip 的悬停互相干扰。
   *
   * 分类数不足 MIN_ZOOM_CATEGORIES 时自动不显示（两三个分类还缩放没有意义）。
   */
  @property({ type: Boolean }) zoomable = false;
  /**
   * 初始可视区间，形如 `zoom="0.2,0.8"`（0..1 的比例，左闭右开）。
   *
   * 只给**初值**：用户拖动后由组件内部状态接管，属性不再覆盖 —— 否则宿主一次无关的
   * 重渲染就会把用户刚拖到的位置弹回原处。
   */
  @property({ type: String }) zoom = "";
  /**
   * 在绘图区拖出一个矩形来框选数据点，松开后上报 `z-brush`。
   *
   * [WHY 在上一版里「frame 式 select」被排除，这一版又加回来] `zoomable` 的注释里写过
   * 「框选式和 tooltip 的悬停互相干扰」，那说的是 ECharts 把框选当成**缩放器**（拖完
   * 直接把视野换成选区）。这里做的是**两个不同的能力**：缩放器负责「改变视野」，
   * 框选负责「选一段交给宿主」。既然不改变视野，就只需要仲裁指针，不需要二选一。
   *
   * 仲裁规则（三条，缺一条就会出现「想点一下却选中一片」）：
   *   1. 位移 < BRUSH_THRESHOLD 视为点击 —— 走原来的 `z-marker-click`，不产生选区；
   *   2. 框选期间隐藏 tooltip —— 否则框跟着指针跑、tooltip 也跟，两个浮层叠在一起；
   *   3. 缩放条在自己区域里（`[data-handle]`），按下时优先给缩放条。
   *
   * [WHY 默认关] 开着会让「点一下柱子」变成「可能画出一个小框」，对不需要框选的
   * 存量页面是退化。显式写了 `brushable` 的页面才进入这套交互。
   */
  @property({ type: Boolean }) brushable = false;
  /** 堆积方式（本地补丁 2026-10-22）：none=并排（默认，行为与加此属性前逐像素一致）
   *  / stacked=堆到合计 / percent=按分类归一到 100%。仅对 bar 系列生效。 */
  @property({ type: String }) stack: StackMode | string = "none";
  @property({ type: String }) renderer = "svg";
  @property({ type: String }) width = "auto";
  @property({ type: String }) height = "auto";
  // [WHY] title 是 HTMLElement 反射属性：`= ""` 字段初始化器在构造期触发原生
  // setter → setAttribute("title") → 违反 CE 构造约束，createElement 抛
  // "The result must not have attributes"。用 `!` 声明不初始化，
  // 默认 "" 由 applyPropertyMeta 读取原生 getter（无属性时返回 ""）取得
  // See: wiki/bugs/bug-20260810-title-ctor-attr.md
  // [2026-08-10] night-hawk: 修复构造期属性污染
  @property({ type: String }) title!: string;
  @property({ type: Boolean }) legend = true;
  @property({ type: Boolean }) tooltip = true;
  @property({ type: Boolean }) animation = true;
  @property({ type: Boolean, attribute: "show-grid" }) showGrid = true;
  @property({ type: String }) locale = "en-US";
  @property({ type: String }) projection: "auto" | "equirectangular" | "mercator" | "none" = "auto";
  @property({ type: String, attribute: "map-id-key" }) mapIdKey = "id";
  @property({ type: String, attribute: "map-name-key" }) mapNameKey = "name";
  // ── 图表标注（issue IKTM1J）──
  /** 横向参考线（数值，挂左轴）：`markline="7600"`。非法值当没写 —— 与 stack 的
   *  「未知回落」策略一致：少一个视觉效果，不让整张图消失。 */
  @property({ type: String }) markline = "";
  @property({ type: String, attribute: "markline-label" }) marklineLabel = "";
  /** 强调某一根柱/点：first / last / max / min，其余值当没写。 */
  @property({ type: String }) markpoint = "";
  /** 缺数断线：折线系列的 null/空值断开成缺口并标注，不按 0 画。 */
  @property({ type: Boolean }) markgap = false;
  /** 柱顶数值标注（labels）：每根可见柱顶上方画格式化后的值；堆积/过密时不画。 */
  @property({ type: Boolean }) labels = false;
  @property({ type: Array, attribute: false }) colors: string[] | null = null;
  @property({ type: Object, attribute: false }) geojson: unknown = null;
  @property({ type: Array, attribute: false }) values: MapValue[] | Record<string, number> | null = null;

  private _engine: RendererName = "svg";
  private _engineKey = "";
  private _model: GeometryModel | null = null;  private _theme: ResolvedTheme = {
    // [WHY] 默认主题对齐 slate 色板（REQ-010）
    text: "#0f172a", textSecondary: "#64748b", grid: "#e2e8f0", bg: "#ffffff",
    dark: false, fontFamily: "sans-serif", labelFontSize: "12px", titleFontSize: "16px",
  };
  private _lastKey = "";
  private _lastSizeKey = "";
  private _chromeH = -1;
  /** 决定 chrome 结构的开关快照（legend/title 有无），变化时作废 _chromeH。 */
  private _chromeKey = "";
  private _readyEmitted = false;
  private _suppressAnim = false;
  private _animator = new Animator();
  private _tooltip: TooltipManager | null = null;
  private _activeTarget = -1;
  /** 实例序号：hint / live 两个节点的 id 要唯一（同页多张图）。 */
  private _uid = `z-chart-${++CHART_SEQ}`;
  private _columns = 1;
  /** 用户拖动后的可视区间（0..1）。null = 还没拖过，按 `zoom` 属性初值。 */
  private _zoom: [number, number] | null = null;
  /** 切片后第一个数据点的原始下标：事件上报要还原成全量语义。 */
  private _zoomOffset = 0;
  /** 正在拖拽的缩放部件（null = 没在拖）。 */
  private _drag: { handle: string; startX: number; start: [number, number] } | null = null;
  /** 键盘调过缩放后要还回焦点的部件名（重绘会丢焦点，见 zoomKey）。 */
  private _zoomFocus: string | null = null;
  private _session: PointerDragSession | null = null;
  /** 框选状态。`active` 由会话的 `moved` 置起（阈值归 primitives/pointer-drag）。 */
  private _brush: {
    active: boolean;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null = null;
  /**
   * 键盘框选的锚点与端点（数据点下标）。`null` = 没在选。
   *
   * [WHY 需要一条键盘等价而不是「框选只支持指针」] 框选是**唯一**能把「一段数据交给
   * 宿主」的操作。只有指针意味着键盘用户与读屏用户完全用不了下钻/联动 —— 那不是
   * 体验差一点，是功能对他们不存在。
   *
   * 交互设计（ECharts 没有先例，这套是自己定的）：`Shift + 方向键` 以当前聚焦点为
   * 锚点扩展选区，`Enter` 提交、`Esc` 取消。不自动提交是因为键盘没有「松开鼠标」
   * 那一刻 —— 每按一次方向键就提交一次，宿主会收到一串半成品选区。
   */
  private _kbdSel: { anchor: number; end: number } | null = null;
  private _ro: ResizeObserver | null = null;
  private _mo: MutationObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("tabindex", "0");
    this.addEventListener("pointermove", this.onPointerMove);
    this.addEventListener("pointerdown", this.onPointerDown);
    this.addEventListener("pointerup", this.onPointerUp);
    this.addEventListener("pointercancel", this.onPointerUp);
    this.addEventListener("pointerleave", this.onPointerLeave);
    this.addEventListener("click", this.onClick);
    this.addEventListener("keydown", this.onKeyDown);
    this.addEventListener("z-series-change", this.onSeriesChange);
    this._mo = new MutationObserver(() => this.requestUpdate());
    this._mo.observe(this, { childList: true });
    if (typeof ResizeObserver !== "undefined") {
      this._ro = new ResizeObserver(() => {
        this._suppressAnim = true;
        this.requestUpdate();
      });
      this._ro.observe(this);
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointermove", this.onPointerMove);
    this.removeEventListener("pointerdown", this.onPointerDown);
    this.removeEventListener("pointerup", this.onPointerUp);
    this.removeEventListener("pointercancel", this.onPointerUp);
    this.removeEventListener("pointerleave", this.onPointerLeave);
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("keydown", this.onKeyDown);
    this.removeEventListener("z-series-change", this.onSeriesChange);
    this._mo?.disconnect();
    this._ro?.disconnect();
    this._animator.cancel();
    this._tooltip?.destroy();
    this._tooltip = null;
    super.disconnectedCallback();
  }

  willUpdate(): void {
    this._engine = this.resolveEngine();
    // 图例/标题的有无决定 chrome 结构 —— 变了就不能沿用上一轮测得的缓存值
    const chromeKey = `${this.legend ? 1 : 0}|${this.title ? 1 : 0}`;
    if (chromeKey !== this._chromeKey) {
      this._chromeKey = chromeKey;
      this._chromeH = -1;
    }
  }

  render(): string | null {
    const aria = this.title || `${this.type} chart`;
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", aria);
    // [WHY] legend 容器不能依赖 _model：首次 render 时模型尚未生成，否则容器永不出现
    const legend = this.legend ? `<div class="z-chart__legend" part="legend"></div>` : "";
    return html`
      ${this.title ? `<div class="z-chart__title" part="title">${escapeAttr(this.title)}</div>` : ""}
      ${legend}
      <div class="z-chart__plot" part="plot" role="img" aria-label="${escapeAttr(aria)}"
           aria-describedby="${this._uid}-hint">
        ${this._engine === "svg"
          ? `<svg class="z-chart__svg" aria-hidden="true"></svg>`
          : `<canvas class="z-chart__canvas" aria-hidden="true"></canvas>`}
        <svg class="z-chart__overlay" aria-hidden="true"></svg>
        <div class="z-chart__brush" part="brush" hidden></div>
        <div class="z-chart__focus-ring" hidden></div>
      </div>
      ${this.zoomVisible() ? `<div class="z-chart__zoom" part="zoom"></div>` : ""}
      <span class="z-chart__sr-only" id="${this._uid}-hint">${escapeAttr(COPY.chartKeyboardHint)}</span>
      <span class="z-chart__sr-only" role="status" id="${this._uid}-live"></span>
    `;
  }

  updated(): void {
    const size = this.resolveSize();
    const sizeKey = `${size.w}x${size.h}`;
    if (sizeKey !== this._lastSizeKey) {
      if (this._lastSizeKey !== "") this.emit("z-resize", { width: size.w, height: size.h });
      this._lastSizeKey = sizeKey;
    }
    const key = this.drawKey(size);
    if (key !== this._lastKey) {
      this._lastKey = key;
      if (!this._suppressAnim && this.animation && !prefersReducedMotion()) {
        this._animator.play(400, (t) => this.draw(t, size));
        return;
      }
    }
    this._suppressAnim = false;
    this._animator.cancel();
    this.draw(1, size);
  }

  /** 属性值来自 attribute，可能是任意字符串。非法值一律当 none —— 与 type 的
   *  「未知就回落」策略一致：渲染层不抛错，宁可少一个视觉效果，也不让整张图消失。 */
  private stackMode(): StackMode {
    const s = this.stack;
    return s === "stacked" || s === "percent" ? s : "none";
  }

  /**
   * 是否为条形图（横向）。
   *
   * [WHY 只认显式 horizontal] 与 stack 同一策略：属性来自 attribute，可能是任意字符串。
   * 拼错的 `direction=horizonal` 回落竖向 —— 图照常画出来，只是方向没变，比空白图好排查。
   */
  private horizontalMode(): boolean {
    return this.direction === "horizontal";
  }

  /** 解析 `heatmap-clamp`。非法或上下限颠倒时返回空对象（= 按本图极值，与没写一样）。 */
  private clampRange(): { clampMin?: number; clampMax?: number } {
    const raw = this.heatmapClamp;
    if (!raw) return {};
    const [a, b] = raw.split(",").map((s) => Number(s.trim()));
    const out: { clampMin?: number; clampMax?: number } = {};
    if (Number.isFinite(a)) out.clampMin = a;
    if (Number.isFinite(b)) out.clampMax = b;
    if (out.clampMin !== undefined && out.clampMax !== undefined && out.clampMax <= out.clampMin) {
      return {};
    }
    return out;
  }

  /**
   * 归一化的可视区间（0..1）。null = 全量。
   *
   * [WHY 内部状态优先于属性] `zoom` 只是初值：用户拖过之后 `_zoom` 接管。
   * 反过来（每次 draw 都从属性重新解析）的症状是「拖到一半弹回去」——
   * 任何一次无关的重渲染都会重置，而且看起来像拖拽失灵。
   *
   * 非法输入（"abc" / "0.5" / "0.8,0.2"）一律回 null 走全量：与 stack 的
   * 「未知回落」同策略，宁可少一个交互，不让整张图消失。
   */
  private zoomNorm(): [number, number] | null {
    if (this._zoom) return this._zoom;
    const raw = (this.zoom ?? "").trim();
    if (!raw) return null;
    const parts = raw.split(",").map((x) => Number(x.trim()));
    if (parts.length !== 2 || !parts.every((n) => Number.isFinite(n))) return null;
    const a = Math.min(Math.max(parts[0], 0), 1);
    const b = Math.min(Math.max(parts[1], 0), 1);
    return b > a ? [a, b] : null;
  }

  /** 是否显示缩放条：显式开启且分类足够多。 */
  private zoomVisible(): boolean {
    if (!this.zoomable) return false;
    const first = this.seriesConfigs()[0];
    const n = Array.isArray(first?.data) ? first.data.length : 0;
    return n >= MIN_ZOOM_CATEGORIES;
  }

  /**
   * 按可视区间切片分类轴数据。
   *
   * [WHY 切片而不是「只画区间内的柱」] 柱宽、轴刻度、并排槽位都是按**分类数**算的。
   * 若保留全量数据只在几何里跳过区间外的下标，画出来是「柱子挤在左边一小条、右边全是
   * 空轴」—— 图看着像数据缺了一大半。切片后分类数变小，柱宽与刻度自动铺满，这才是缩放。
   *
   * 代价是 `dataIndex` 变成本地下标，所以记下 `_zoomOffset`，事件上报时还原。
   *
   * [WHY 只对分类轴生效] 时间/数值轴的区间裁剪要同时改值域并过滤出界点（否则点被画到
   * 轴外），是另一套几何。当前先收口在分类轴 —— 报表里的维度列（日期、门店、渠道）
   * 落到 `z-chart` 时基本都是分类。
   */
  private applyZoom(series: SeriesModel[], axisSlots: AxisSlots): SeriesModel[] {
    this._zoomOffset = 0;
    const zn = this.zoomNorm();
    if (!zn) return series;
    const kind = detectXKind(
      series.map((s) => s.data),
      axisSlots.x?.type ?? "auto",
    );
    if (kind !== "category") return series;
    const n = Math.max(...series.map((s) => s.data.length), 1);
    const lo = Math.min(Math.max(Math.floor(zn[0] * n), 0), n - 1);
    const hi = Math.min(n - 1, Math.max(lo + 1, Math.ceil(zn[1] * n) - 1));
    this._zoomOffset = lo;
    return series.map((s) => ({ ...s, data: s.data.slice(lo, hi + 1) }));
  }

  /**
   * 数值 / 时间轴缩放：按 `zoom` 比例收窄 x 值域（原地改 domains）。
   *
   * [WHY 不能像分类轴那样切片] 这正是 `applyZoom` 注释里留下的那个缺口。分类轴切的是
   * **点**，切完分类数变少、柱宽与刻度自动铺满，所以要记 `_zoomOffset` 把 `dataIndex`
   * 还原。数值轴切的是**值** —— 被排除的点数量与位置都不规则，数组下标一旦错位，
   * tooltip 与点选就会指到相邻的另一行数据，而且看不出错。所以这里反过来做：
   * 数据一根不动，只把值域收窄，域外的点由几何层跳过（`build.ts` 的 `xInDomain`）。
   *
   * [WHY 收窄后不必重算 ticks] `computeFrame` 是按 `domains.xDomain` 算刻度的 ——
   * 改在它之前，轴刻度自然跟着变，不会出现「柱子缩了、刻度还是全量」的错位。
   *
   * 横向柱不受影响：它要求 xKind 是 category（值走 leftDomain、映射到水平方向），
   * 在这条判断的第一行就返回了。
   */
  private narrowValueDomain(domains: Domains): void {
    if (domains.xKind !== "value" && domains.xKind !== "time") return;
    const zn = this.zoomNorm();
    if (!zn) return;
    const [d0, d1] = domains.xDomain;
    const span = d1 - d0;
    if (!Number.isFinite(span) || span <= 0) return;
    domains.xDomain = [d0 + span * zn[0], d0 + span * zn[1]];
  }

  private resolveEngine(): RendererName {
    const key = `${this.type}|${this.renderer}`;
    if (key !== this._engineKey) {
      this._engineKey = key;
      this._engine = resolveRenderer(this.type as ChartType, this.renderer as RendererName);
    }
    return this._engine;
  }

  private resolveSize(): { w: number; h: number } {
    const w = this.width !== "auto" ? parseFloat(this.width) || 0 : this.clientWidth || 0;
    const ownH = this.clientHeight || 0;
    const hRaw = this.height !== "auto" ? parseFloat(this.height) || 0 : ownH;
    // [WHY] 高度自适应时须扣除 legend/title 的占位高度，否则 SVG 总高超出 host 导致横轴标签溢出容器
    // [WHY 固定高度也要扣 chrome] host 给 260px 时，shadow 内 title/legend 仍占 ~52px，
    // svg 用全高会画出 host、叠到后续区块上（OKR 看板实测）。auto 与固定高度同一口径。
    // [WHY 用 resolvedChromeH 而不是 chromeHeight] render() 每轮重建 shadow，legend 刚建出来
    // 是空的 ⇒ updated() 里当场实测恒为 0；必须读上一轮 draw 后记下的 _chromeH
    // （首轮为 -1 时回落实测值，draw 末尾对比 _chromeH 触发一次重算即收敛）。
    // 两条修复合并：上游解决「测不到」（resolvedChromeH），本地解决「固定高度不扣」。
    const chrome = this.resolvedChromeH();
    // 缩放条在绘图区**下方**，同样要从总高里扣掉：不扣的话作图区吃掉它的 34px，
    // 底部横轴标签被推出容器（与上面 legend 那条是同一类账，方向相反）。
    const zoomH = this.zoomVisible() ? ZOOM_HEIGHT : 0;
    const h = Math.max(0, hRaw - chrome - zoomH);
    const defH = this.type === "sparkline" ? SPARKLINE_HEIGHT : DEFAULT_HEIGHT;
    return {
      w: w > 0 ? w : DEFAULT_WIDTH,
      h: h > 0 ? h : defH,
    };
  }

  /**
   * chrome = 画布之上的一切：title / legend 以及它们的 margin。
   * [为什么用矩形差而不是 offsetHeight 相加] offsetHeight 不含 margin：本组件 legend 有
   * `margin-top: 8px`、title 有 `margin-bottom: 8px`，相加只有 21，实际占位 29 ——
   * 少算 8px 就把画布往下推 8px，底部横轴标签仍然被裁（改了等于没改）。
   * 直接量「宿主顶 → 画布顶」的距离，以后 CSS 怎么加间距都不会再漏。
   */
  private chromeHeight(): number {
    const shadow = this.shadowRoot;
    if (!shadow) return 0;
    const plot = shadow.querySelector<HTMLElement>(".z-chart__plot");
    if (!plot) return 0;
    const hostTop = this.getBoundingClientRect().top;
    const plotTop = plot.getBoundingClientRect().top;
    return Math.max(0, Math.round(plotTop - hostTop));
  }

  /**
   * [WHY] 不能直接用 chromeHeight()：render() 每次都把 shadow 整体重建（BaseElement
   * 用 `shadow.innerHTML = styles + rendered`），legend 节点刚建出来是空的 —— 于是
   * **每一轮 updated() 里实测到的 chrome 都是 0**，`_chromeH` 记下的真值从来没人读回来。
   * 症状：SVG 高度恒等于宿主高度，再叠上图例 ⇒ 总高溢出宿主一个图例高，
   * 卡片高度固定时底部横轴标签被 overflow:hidden 裁掉（卡面底部多出一条空白）。
   * 只有 draw() 填完 legend 之后测得的值才是真值，优先用它。
   */
  private resolvedChromeH(): number {
    return this._chromeH >= 0 ? this._chromeH : this.chromeHeight();
  }

  /** markline 属性来自 attribute（任意字符串），只在是有限数字时生效。 */
  private marklineValue(): number | undefined {
    if (!this.markline && this.markline !== "0") return undefined;
    const n = Number(this.markline);
    return Number.isFinite(n) ? n : undefined;
  }

  private drawKey(size: { w: number; h: number }): string {
    const series = this.seriesConfigs();
    const axes = this.axisConfigs();
    return JSON.stringify({
      type: this.type,
      stack: this.stack,
      // 方向必须进 key：否则改 direction 后图不重画，属性面板改了半天「没反应」
      direction: this.direction,
      // 色阶上下限同理：不进 key 就是「改了 clamp 图不变色」
      heatmapClamp: this.heatmapClamp,
      // 缩放区间同理：不进 key 就是「拖了滑块柱子不动」
      zoom: this._zoom ? this._zoom.join(",") : this.zoom,
      zoomable: this.zoomable,
      engine: this._engine,
      w: size.w,
      h: size.h,
      colors: this.colors,
      showGrid: this.showGrid,
      locale: this.locale,
      projection: this.projection,
      mapIdKey: this.mapIdKey,
      mapNameKey: this.mapNameKey,
      geojson: this.geojson,
      values: this.values,
      // 标注属性进 drawKey：改 markline/markpoint/markgap 必须重画，
      // 不进 key 的后果是「改了属性、图不动」（与改 stack 不重画同病）
      markline: this.marklineValue(),
      marklineLabel: this.marklineLabel,
      markpoint: this.markpoint,
      markgap: this.markgap,
      labels: this.labels,
      series: series.map((s) => ({ name: s.name, type: s.type, color: s.color, yAxis: s.yAxis, format: s.format, data: s.data })),
      axes,
    });
  }

  private seriesConfigs(): ZChartSeries[] {
    return Array.from(this.querySelectorAll("z-chart-series"));
  }

  private axisConfigs(): ZChartAxis[] {
    return Array.from(this.querySelectorAll("z-chart-axis"));
  }

  private resolveTheme(): ResolvedTheme {
    const cs = typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement) : null;
    const get = (name: string, fallback: string) => cs?.getPropertyValue(name).trim() || fallback;
    const bg = get("--z-color-bg", "#ffffff");
    const rgb = parseColor(bg);
    return {
      text: get("--z-color-text", "#0f172a"),
      textSecondary: get("--z-chart-label-color", get("--z-color-text-secondary", "#64748b")),
      grid: get("--z-chart-grid-color", get("--z-color-border", "#e2e8f0")),
      bg,
      dark: rgb ? luminance(rgb) < 0.35 : false,
      fontFamily: get("--z-chart-font-family", get("--z-font-sans", "sans-serif")),
      labelFontSize: get("--z-chart-label-font-size", "12px"),
      titleFontSize: get("--z-chart-title-font-size", "16px"),
    };
  }

  private draw(progress: number, size: { w: number; h: number }): void {
    this._theme = this.resolveTheme();
    const t = this.type as ChartType;
    const seriesEls = this.seriesConfigs();
    const axesEls = this.axisConfigs();
    // [WHY 饼图按「数据点」而不是「系列数」取色] 饼图只有一根系列，切片却是数据点
    // （`series.data = [{label,value}…]`）。按系列数取色时 palette 只有 1 个颜色，
    // 四片扇区全画成同一个蓝 —— 视觉上就是一个整圆，看不出占比，而且完全不报错。
    // [WHY 这几类按「数据点」取色] pie / donut / funnel / treemap / sankey 都是
    // 「一个数据点一色」的图，只有一根系列。按系列数取色的话 palette 只返回 1 个色，
    // 所有扇区/阶段/流带会画成同一个颜色 —— 视觉上是一个整体，且完全不报错。
    const sliceColored =
      t === "pie" || t === "donut" || t === "funnel" || t === "treemap" || t === "sankey";
    const colorCount = sliceColored
      ? Math.max(1, ...seriesEls.map((el) => (Array.isArray(el.data) ? el.data.length : 0)))
      : seriesEls.length;
    const palette = resolveSeriesColors(colorCount, this.colors);
    const markline = this.marklineValue();
    const allSeries = normalizeSeries(
      seriesEls.map((el, i) => ({
        name: el.name,
        type: el.type,
        data: el.data,
        color: el.color || palette[i % palette.length],
        yAxis: el.yAxis as "left" | "right",
        format: el.format,
        visible: el.visible,
        index: i,
        // 气泡第三维的标题：tooltip 里要写「圆的大小 = 这个名字」
        ...(el.sizeTitle ? { sizeTitle: el.sizeTitle } : {}),
      })),
      t,
      { markgap: this.markgap },
    );

    const axisSlots = this.buildAxisSlots(axesEls);
    // 缩放：分类轴按可视区间切片（轴刻度与柱宽随之重算，见 applyZoom 的注释）
    const seriesModels = this.applyZoom(allSeries, axisSlots);
    const locale = this.locale;
    const fontSize = parseFloat(this._theme.labelFontSize) || 12;
    const ctx: BuildContext = {
      showGrid: this.showGrid,
      stack: this.stackMode(),
      markline,
      marklineLabel: this.marklineLabel || undefined,
      markpoint: this.markpoint || undefined,
      markgap: this.markgap,
      labels: this.labels,
      sliceColors: palette,
      regions: [],
      values: this.normalizeValues(),
      mapIdKey: this.mapIdKey,
      mapNameKey: this.mapNameKey,
      projection: this.projection,
      locale,
      // 仪表盘量程：作者用 `z-chart-axis position=left min=0 max=100` 配。
      // 没有轴配置时 gauge 自己按「读数 ×1.25」兜一个上限（见 extra.ts）。
      gaugeMin: axisSlots.left?.min,
      gaugeMax: axisSlots.left?.max,
      // 热力色阶的固定上下限（`heatmap-clamp="100,500"`）：多张图共用一套色阶才可比
      ...this.clampRange(),
    };

    // 方向只对柱图生效（见 horizontalMode 的注释）
    const horizontal = this.horizontalMode() && t === "bar";
    // 横向柱的数值标注画在柱右端**外侧**：最长的那根正好顶到 plot 右边界，
    // 不留白就会被 SVG 裁掉最后一位（8,200 变 8,20）。按格式化后的峰值文本估宽。
    let rightPad = 0;
    if (horizontal && this.labels) {
      const fmt = makeFormatter(seriesModels[0]?.format ?? "auto", locale);
      const peak = Math.max(
        0,
        ...seriesModels.flatMap((s) => s.data.map((d) => (Number.isFinite(d.value) ? d.value : 0))),
      );
      rightPad = estimateTextWidth(fmt(peak), fontSize) + 12;
    }
    let frame: ComputedFrame;
    let domains: Domains | null = null;
    if (t === "pie" || t === "donut") {
      frame = insetFrame(size.w, size.h, 8);
    } else if (t === "sparkline") {
      frame = insetFrame(size.w, size.h, 4);
    } else if (t === "radar") {
      // 雷达没有笛卡尔轴：inset 只给轴标签留外圈余量
      frame = insetFrame(size.w, size.h, 30);
    } else if (t === "waterfall") {
      // 瀑布的左轴是累计量极值（见 computeWaterfallDomains 的注释），
      // 轴槽照常走 computeFrame —— 底部分类轴 + 左值轴与柱图同一套布局
      domains = computeWaterfallDomains(seriesModels);
      frame = computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize);
    } else if (t === "map") {
      frame = insetFrame(size.w, size.h, 8);
      ctx.regions = parseGeoJson(this.geojson, this.mapIdKey, this.mapNameKey);
    } else if (t === "funnel" || t === "treemap" || t === "sankey" || t === "heatmap" || t === "gauge") {
      // 整图族：无笛卡尔轴，各几何自己按百分比留标签位（见 extra.ts）。
      // 统一给 10px 外框，避免漏斗/树图贴着卡片边缘。
      frame = insetFrame(size.w, size.h, t === "gauge" ? 12 : 10);
    } else {
      domains = computeDomains(seriesModels, axisSlots, this.stackMode(), markline, {
        horizontal,
        // 散点的 label 只是 tooltip 文案，不构成分类轴 —— 不强制的话所有点会等距排在
        // 一条线上，看着像「只有一个维度」。
        xKind: t === "scatter" ? "value" : undefined,
      });
      // 数值/时间轴缩放：收窄值域（分类轴已在 applyZoom 里切片，见 narrowValueDomain）
      this.narrowValueDomain(domains);
      // ── 气泡：给半径留出画布边距（2026-11-17）──
      //
      // [WHY 要扩值域而不是夹圆心] 圆心必须落在**真实值**的位置上，把圆心往里夹会
      // 让点与刻度对不上（读出来的 x/y 是假的）。所以扩值域：先按当前域试算一帧拿到
      // plot 尺寸，再把「22px 半径」换算成数据单位向外扩，然后正式算帧。
      // 不扩的后果是最大的气泡被绘图区边缘切掉一角 —— 真机截图一眼可见，
      // 而这在数据层完全正常（点坐标、值域、刻度都对）。
      let bubblePad: number | null = null;
      if (t === "scatter" && seriesModels.some((s) => s.data.some((p) => p.r !== undefined))) {
        bubblePad = 22;
      }
      if (bubblePad !== null) {
        const probe = computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize, {
          topPad: 0,
          rightPad,
        });
        const padY = (bubblePad / Math.max(probe.plot.height, 1)) * (domains.leftDomain[1] - domains.leftDomain[0]);
        const padX = (bubblePad / Math.max(probe.plot.width, 1)) * (domains.xDomain[1] - domains.xDomain[0]);
        domains.leftDomain = [domains.leftDomain[0] - padY, domains.leftDomain[1] + padY];
        if (domains.hasRight) {
          domains.rightDomain = [domains.rightDomain[0] - padY, domains.rightDomain[1] + padY];
        }
        domains.xDomain = [domains.xDomain[0] - padX, domains.xDomain[1] + padX];
      }
      frame = computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize, {
        // 横向参考线的标签画在绘图区上方，需要额外上边距（见 FrameOptions.topPad）
        topPad: horizontal && markline !== undefined ? 14 : 0,
        rightPad,
      });
    }

    this._model = buildGeometry(t, seriesModels, frame, domains, this._theme, progress, ctx);
    this._columns = this.computeColumns();

    const shadow = this.shadowRoot!;
    const svgEl = shadow.querySelector<SVGSVGElement>(".z-chart__svg");
    if (svgEl) {
      svgEl.setAttribute("width", String(size.w));
      svgEl.setAttribute("height", String(size.h));
      svgEl.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
      svgEl.innerHTML = renderSvg(this._model, frame, this._theme);
    }
    const canvasEl = shadow.querySelector<HTMLCanvasElement>(".z-chart__canvas");
    if (canvasEl) {
      const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
      canvasEl.width = size.w * dpr;
      canvasEl.height = size.h * dpr;
      canvasEl.style.width = `${size.w}px`;
      canvasEl.style.height = `${size.h}px`;
      const gctx = canvasEl.getContext("2d");
      // [WHY] happy-dom/部分 webview 的 getContext 返回 null，缺失时静默跳过（no-op 不抛错）
      if (gctx) {
        gctx.scale(dpr, dpr);
        drawCanvas(gctx, this._model, frame, this._theme);
      }
    }
    const overlayEl = shadow.querySelector<SVGSVGElement>(".z-chart__overlay");
    if (overlayEl) {
      overlayEl.setAttribute("width", String(size.w));
      overlayEl.setAttribute("height", String(size.h));
      overlayEl.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
      overlayEl.innerHTML = buildOverlaySvg(this._model);
    }
    const legendEl = shadow.querySelector<HTMLElement>(".z-chart__legend");
    if (legendEl) legendEl.innerHTML = this.legendHtml(this._model);
    // 缩放条与主图分开建：它不在绘图区里，位置在 .z-chart__plot 之下
    this.renderZoom(size);

    // [WHY] legend 填充后实测 chrome 高度，与上一轮不一致则触发重算收敛（防首帧 0 高度残留）
    const chrome = this.chromeHeight();
    if (chrome !== this._chromeH) {
      this._chromeH = chrome;
      this.requestUpdate();
    }

    if (!this._readyEmitted) {
      this._readyEmitted = true;
      this.emit("z-ready", { type: this.type, width: size.w, height: size.h });
    }
  }

  private buildAxisSlots(els: ZChartAxis[]): AxisSlots {
    const slots: AxisSlots = {};
    for (const el of els) {
      const position = el.position as "bottom" | "top" | "left" | "right";
      const slot: AxisSlots["left"] = {
        position,
        type: el.type as "auto" | "category" | "value" | "time",
        title: el.title,
        format: el.format,
        min: el.minValue,
        max: el.maxValue,
        tickCount: el.tickCount,
        grid: el.gridOverride,
        ...(el.scale === "log" ? { scale: "log" as const } : {}),
      };
      if ((position === "bottom" || position === "top") && !slots.x) slots.x = slot;
      else if (position === "left" && !slots.left) slots.left = slot;
      else if (position === "right" && !slots.right) slots.right = slot;
    }
    return slots;
  }

  private normalizeValues(): MapValue[] | null {
    const v = this.values;
    if (!v) return null;
    if (Array.isArray(v)) {
      return v.map((x) => ({ id: String((x as any).id), value: Number((x as any).value) }));
    }
    return Object.entries(v).map(([id, value]) => ({ id, value: Number(value) }));
  }

  private computeColumns(): number {
    const targets = this._model?.tooltipTargets ?? [];
    const cols = new Set(targets.map((t) => t.dataIndex)).size;
    return Math.max(1, cols);
  }

  private legendHtml(model: GeometryModel): string {
    return model.legend
      .map(
        (item) => `<button type="button" class="z-chart__legend-item${item.visible ? "" : " z-chart__legend-item--hidden"}" data-legend-index="${item.index}" part="legend-item">
          <span class="z-chart__legend-swatch" style="background:${item.color}"></span>
          <span>${escapeAttr(item.name)}</span>
        </button>`,
      )
      .join("");
  }

  /**
   * 画底部缩放条：缩略趋势 + 两个可聚焦手柄 + 可拖窗口。
   *
   * [WHY 手柄用 div 而不是 SVG rect] 手柄要能 Tab 聚焦、要用 `role="slider"` 播报当前
   * 百分比。SVG 图形做这两件事要靠 foreignObject 兜，shadow 内兼容性差。缩略趋势本身
   * 是纯装饰（aria-hidden），才用 SVG。
   *
   * [WHY 必须有缩略趋势] 只有两个手柄的话，用户看不出「现在看的是整段里的哪一截」——
   * 手柄位置是相对全长的，而全长的形状不在视野里。缩略线是这两个手柄的唯一参照物。
   */
  private renderZoom(size: { w: number; h: number }): void {
    const host = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__zoom");
    if (!host) return;
    const first = this.seriesConfigs()[0];
    const data: unknown[] = Array.isArray(first?.data) ? first.data : [];
    const n = data.length;
    const zn = this.zoomNorm() ?? [0, 1];
    // 宽度对齐实际盒子而不是 size.w：盒子可能带 1-2px 余量，用 size.w 画而按 clientWidth
    // 换算拖拽比例，会让手柄位置和指针差那么一点（用户感觉「拖了但它自己滑」）。
    const W = Math.max(Math.round(host.clientWidth || size.w), 40);
    const H = 22;
    const left = Math.round(zn[0] * W);
    const right = Math.round(zn[1] * W);

    // 缩略趋势：全量数据归一化成一条折线
    const vals = data.map((p) => Number((p as { value?: unknown })?.value));
    const finite = vals.filter((v) => Number.isFinite(v));
    const vMin = finite.length ? Math.min(...finite) : 0;
    const vMax = finite.length ? Math.max(...finite) : 1;
    const span = vMax - vMin || 1;
    let d = "";
    vals.forEach((v, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const y = H - 3 - (((Number.isFinite(v) ? v : vMin) - vMin) / span) * (H - 6);
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    const pct = (v: number) => Math.round(v * 100);
    host.innerHTML = `
      <svg class="z-chart__zoom-svg" width="${W}" height="${H}" aria-hidden="true">
        <path d="${d}" fill="none" stroke-width="1.5" class="z-chart__zoom-track"/>
        <rect class="z-chart__zoom-mask" x="0" y="0" width="${left}" height="${H}"/>
        <rect class="z-chart__zoom-mask" x="${right}" y="0" width="${Math.max(W - right, 0)}" height="${H}"/>
      </svg>
      <div class="z-chart__zoom-window" data-handle="window" role="slider" tabindex="0"
           aria-label="${escapeAttr(COPY.chartZoomWindow)}"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[0])}"
           style="left:${left}px;width:${Math.max(right - left, 8)}px"></div>
      <div class="z-chart__zoom-handle" data-handle="start" role="slider" tabindex="0"
           aria-label="${escapeAttr(COPY.chartZoomStart)}"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[0])}"
           style="left:${left - 4}px"></div>
      <div class="z-chart__zoom-handle" data-handle="end" role="slider" tabindex="0"
           aria-label="${escapeAttr(COPY.chartZoomEnd)}"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[1])}"
           style="left:${right - 4}px"></div>
    `;

    // 键盘调过缩放：重绘把手柄节点换掉了，把焦点还回去，否则第二下按键无人接收
    if (this._zoomFocus) {
      const el = host.querySelector<HTMLElement>(`[data-handle="${this._zoomFocus}"]`);
      el?.focus();
      this._zoomFocus = null;
    }
  }

  private tooltipHtml(t: TooltipTarget): string {
    const rows = t.values
      .map(
        (v) => `<div class="z-chart__tooltip-row">
          <span class="z-chart__tooltip-swatch" style="background:${v.color}"></span>
          <span class="z-chart__tooltip-label">${escapeAttr(v.name)}</span>
          <span class="z-chart__tooltip-value">${escapeAttr(v.formatted)}</span>
        </div>`,
      )
      .join("");
    return `<div class="z-chart__tooltip-title">${escapeAttr(t.label)}</div>${rows}`;
  }

  private onSeriesChange = (): void => {
    this.requestUpdate();
  };

  private onPointerMove = (e: PointerEvent): void => {
    // 正在拖：推进归手势会话（它才知道算不算拖动），这里直接返回避免同帧算两次
    if (this._drag || this._brush) return;
    const ghost = findInEventPath(e, "[data-m]");
    if (!ghost) {
      this.hideTooltip();
      return;
    }
    const idx = Number(ghost.getAttribute("data-m"));
    this.showTarget(idx, ghost);
  };

  /**
   * 按下缩放条的某个部件，开始拖拽。
   *
   * 用 host 级委托而不是给每个手柄单独绑：`render()` 每轮重建 shadow，
   * 手柄节点会被替换，逐个绑的监听器会连同节点一起消失（症状：第一帧能拖、之后不能）。
   */
  private onPointerDown = (e: PointerEvent): void => {
    const handle = findInEventPath(e, "[data-handle]");
    if (handle) {
      const zn = this.zoomNorm() ?? [0, 1];
      this._drag = {
        handle: handle.getAttribute("data-handle") ?? "window",
        startX: e.clientX,
        start: [zn[0], zn[1]],
      };
      // 按住手柄就该动：阈值 0（拖滑块，不是「拖 vs 点」的判定）
      this._beginSession(e, 0);
      return;
    }
    if (!this.brushable) return;
    const plot = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__plot");
    if (!plot) return;
    const r = plot.getBoundingClientRect();
    // 画布外的按下（标题、图例、容器留白）不进入框选
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    // 开始新一次框选：先把上一次的选区显示清掉，否则旧框会一直留在图上，
    // 读者会以为它还在生效。
    const prev = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (prev) prev.hidden = true;
    this._brush = {
      active: false,
      x0: e.clientX - r.left,
      y0: e.clientY - r.top,
      x1: 0,
      y1: 0,
    };
    // 默认 3px 阈值（原语给）：没有阈值的话每次点柱子都会先闪一个小方框
    this._beginSession(e);
  };

  /**
   * 建手势会话：起手 / 阈值 / cancel / Esc / user-select / 吞 click 归 `primitives/pointer-drag`；
   * 捕获显式打开（原语默认不捕获），保证拖到图表外松手也收得到 up。
   */
  private _beginSession(e: PointerEvent, threshold?: number): void {
    this._session?.dispose();
    this._session = new PointerDragSession(
      {
        onMove: (d) => this._onDragMove(d),
        onEnd: () => this.onPointerUp(),
        // 触屏按住后一滚页面：复位，不提交框选
        onCancel: () => {
          this._drag = null;
          this._brush = null;
          this.clearBrush();
        },
      },
      threshold === undefined
        ? { captureTarget: e.target as Element | null }
        : { captureTarget: e.target as Element | null, threshold },
    );
    this._session.begin(e);
    e.preventDefault();
  }

  private _onDragMove(d: PointerDragDelta): void {
    if (this._drag) {
      this.dragTo(d.x);
      return;
    }
    const b = this._brush;
    if (!b) return;
    if (!b.active) {
      if (!d.moved) return;
      b.active = true;
      // 仲裁：框选期间隐藏 tooltip。否则框跟着指针、tooltip 也跟，两个浮层叠在一起，
      // 而此刻读者要看的是「框到哪儿了」，不是某个点的值。
      this.hideTooltip();
    }
    this.brushTo(d.x, d.y);
  }

  /**
   * 把指针位置换算成选区并重画那圈框。
   *
   * 框只在**超过阈值**后才出现 —— 见 BRUSH_THRESHOLD 的注释。选区元素的样式直接改，
   * 不走 `requestUpdate`：那是整图重绘（几何 + 动画），每帧一次会明显卡。
   */
  /**
   * 把指针位置换算成选区并重画那圈框（只在已越过阈值后调用）。
   *
   * 选区元素的样式直接改，不走 `requestUpdate`：那是整图重绘（几何 + 动画），
   * 每帧一次会明显卡。
   */
  private brushTo(clientX: number, clientY: number): void {
    const b = this._brush;
    const plot = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__plot");
    if (!b || !plot) return;
    const r = plot.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    b.x1 = x;
    b.y1 = y;
    this.paintBrush();
  }

  private paintBrush(): void {
    const el = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    const b = this._brush;
    if (!el) return;
    if (!b?.active) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.left = `${Math.min(b.x0, b.x1)}px`;
    el.style.top = `${Math.min(b.y0, b.y1)}px`;
    el.style.width = `${Math.abs(b.x1 - b.x0)}px`;
    el.style.height = `${Math.abs(b.y1 - b.y0)}px`;
  }

  /**
   * 框选结束：算出选区内的数据点并上报。
   *
   * 命中判据用**中心点**落在框内，不是矩形相交 —— 用相交时擦到边也算选中，
   * 框一条窄带会把整排柱都收进来，而读者明明是照着中间那几个点框的。
   */
  private commitBrush(b: { x0: number; y0: number; x1: number; y1: number }): void {
    const x = Math.min(b.x0, b.x1);
    const y = Math.min(b.y0, b.y1);
    const w = Math.abs(b.x1 - b.x0);
    const h = Math.abs(b.y1 - b.y0);
    const targets = this._model?.tooltipTargets ?? [];
    const hits = targets.filter((t) => {
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
    });
    // `dataIndex` 要还原成全量语义 —— 与 z-marker-click 同一个理由（缩放切片后
    // model 里是本地下标，宿主拿它去查原始行会安静地错位一段）。
    const points = hits.map((t) => ({
      seriesIndex: t.seriesIndex,
      dataIndex: t.dataIndex + this._zoomOffset,
      label: t.label,
    }));
    this.emitBrush(points, { x, y, w, h });
  }

  /**
   * 上报 `z-brush` 并播报结果。指针路径与键盘路径共用。
   *
   * [WHY 抽出来] 两条路径的**选区来源不同**（一个来自拖拽矩形，一个来自下标区间），
   * 但上报的载荷结构、`_zoomOffset` 还原、读屏播报三件事必须逐字一致。各写一遍
   * 必然漂移 —— 而漂移的表现是「键盘选的点和鼠标选的点差了一段」，只有真用键盘才发现。
   */
  private emitBrush(
    points: Array<{ seriesIndex: number; dataIndex: number; label: string }>,
    box: { x: number; y: number; w: number; h: number },
  ): void {
    const indices = points.map((p) => p.dataIndex);
    this.emit("z-brush", {
      ...box,
      points,
      /** 分类下标的区间（含端点）；无命中时为 null —— 别给 `[0,0]` 让人误以为选了第一个。 */
      indexRange: indices.length ? [Math.min(...indices), Math.max(...indices)] : null,
    });
    // 屏幕阅读器读不到那圈半透明框，所以把结果播报出来（复用键盘提示那个 live 区）
    const live = this.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
    if (live) live.textContent = points.length ? `已选 ${points.length} 个数据点` : "未选到数据点";
  }

  private clearBrush(): void {
    this._brush = null;
    const el = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (el) el.hidden = true;
  }

  /**
   * `Shift + 方向键`：以当前聚焦点为锚点扩展键盘选区。返回 true 表示这个按键已被消费。
   *
   * 不自动提交（见 `_kbdSel` 的注释）：键盘没有「松开鼠标」那一刻，每按一次方向键
   * 就发一次 `z-brush` 会让宿主收到一串半成品选区。
   */
  private kbdBrushKey(e: KeyboardEvent): boolean {
    const dirs: Partial<Record<string, NavDir>> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const dir = dirs[e.key];
    if (!dir) return false;
    const total = this._model?.tooltipTargets.length ?? 0;
    if (total <= 0) return false;
    e.preventDefault();
    if (!this._kbdSel) {
      // 锚点 = 当前聚焦的数据点；还没聚焦过就从第一个开始（与方向键的初值一致）。
      // 设锚点后**继续往下扩展一步** —— 第一次按 Shift+方向键就原地不动会让人以为没生效。
      const a = this._activeTarget >= 0 && this._activeTarget < total ? this._activeTarget : 0;
      this._kbdSel = { anchor: a, end: a };
    }
    this._kbdSel.end = nextTargetIndex(this._kbdSel.end, dir, total, this._columns);
    this.paintKbdSel();
    return true;
  }

  /** 键盘选区当前覆盖的数据点（含端点）。 */
  private kbdSelHits(): TooltipTarget[] {
    const s = this._kbdSel;
    const targets = this._model?.tooltipTargets ?? [];
    if (!s || !targets.length) return [];
    const lo = Math.max(0, Math.min(s.anchor, s.end));
    const hi = Math.min(targets.length - 1, Math.max(s.anchor, s.end));
    return targets.slice(lo, hi + 1);
  }

  /** 画出键盘选区的包围盒、挪动焦点环、播报。 */
  private paintKbdSel(): void {
    const hits = this.kbdSelHits();
    const s = this._kbdSel;
    if (!hits.length || !s) return;
    const x0 = Math.min(...hits.map((t) => t.x));
    const y0 = Math.min(...hits.map((t) => t.y));
    const x1 = Math.max(...hits.map((t) => t.x + t.w));
    const y1 = Math.max(...hits.map((t) => t.y + t.h));
    this.paintBrushRect({ x0, y0, x1, y1 });
    // 焦点环跟到端点：读者才知道下一次按方向键会从哪儿继续
    this.moveTarget(s.end);
    const endLabel = hits[hits.length - 1]?.label ?? "";
    const live = this.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
    if (live) {
      live.textContent = `键盘框选 ${hits.length} 个数据点（到「${endLabel}」），Enter 提交，Esc 取消`;
    }
  }

  /** `Enter`：提交键盘选区，载荷与鼠标框选逐字一致（见 emitBrush 的注释）。 */
  private commitKbdSel(): void {
    const hits = this.kbdSelHits();
    this._kbdSel = null;
    if (!hits.length) {
      this.clearBrush();
      return;
    }
    const x = Math.min(...hits.map((t) => t.x));
    const y = Math.min(...hits.map((t) => t.y));
    const w = Math.max(...hits.map((t) => t.x + t.w)) - x;
    const h = Math.max(...hits.map((t) => t.y + t.h)) - y;
    this.emitBrush(
      hits.map((t) => ({
        seriesIndex: t.seriesIndex,
        dataIndex: t.dataIndex + this._zoomOffset,
        label: t.label,
      })),
      { x, y, w, h },
    );
  }

  private onPointerUp = (): void => {
    this._session = null;
    this._drag = null;
    const b = this._brush;
    this._brush = null;
    if (b?.active) {
      // 「框选后那次 click 必须吞掉」由原语接管（不吞会多报一次 z-marker-click）
      this.commitBrush(b);
      // 选区保留显示（读者要确认框到的是哪几个点），下一次按下时清除
      this.paintBrushRect(b);
    } else {
      // 按下了但没超过阈值 = 点击，交回 onClick 处理
      this.clearBrush();
    }
  };

  /** 把已提交的选区画出来（`paintBrush` 读的是 `_brush`，提交后它已被置空）。 */
  private paintBrushRect(b: { x0: number; y0: number; x1: number; y1: number }): void {
    this._brush = null;
    const el = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (!el) return;
    el.hidden = false;
    el.style.left = `${Math.min(b.x0, b.x1)}px`;
    el.style.top = `${Math.min(b.y0, b.y1)}px`;
    el.style.width = `${Math.abs(b.x1 - b.x0)}px`;
    el.style.height = `${Math.abs(b.y1 - b.y0)}px`;
  }

  /**
   * 把指针位移换算成新的可视区间。
   *
   * 拖起点只动左边界、拖终点只动右边界、拖窗口整体平移（跨度不变）。
   * 左右边界之间保留 MIN_ZOOM_SPAN，否则两个手柄重合后区间变成 0 宽，
   * 图里一个分类都不剩 —— 用户会以为是渲染挂了。
   */
  private dragTo(clientX: number): void {
    const d = this._drag;
    if (!d) return;
    const host = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__zoom");
    const W = host?.clientWidth ?? 0;
    if (W <= 0) return;
    const dx = (clientX - d.startX) / W;
    const [s0, e0] = d.start;
    let s = s0;
    let en = e0;
    if (d.handle === "start") {
      s = Math.min(Math.max(s0 + dx, 0), e0 - MIN_ZOOM_SPAN);
    } else if (d.handle === "end") {
      en = Math.max(Math.min(e0 + dx, 1), s0 + MIN_ZOOM_SPAN);
    } else {
      const span = e0 - s0;
      s = Math.min(Math.max(s0 + dx, 0), 1 - span);
      en = s + span;
    }
    this._zoom = [s, en];
    // 拖拽是连续操作：重绘不要走 400ms 入场动画，否则每帧都在重新淡入
    this._suppressAnim = true;
    this.requestUpdate();
  };

  private onPointerLeave = (): void => {
    this.hideTooltip();
  };

  private onClick = (e: MouseEvent): void => {
    // 框选后那次 click 已在捕获阶段被原语吞掉，到这里只可能是真的点了一下
    const ghost = findInEventPath(e, "[data-m]");
    if (ghost) {
      const idx = Number(ghost.getAttribute("data-m"));
      const t = this._model?.tooltipTargets[idx];
      if (t) {
        const v = t.values[0];
        this.emit("z-marker-click", {
          seriesIndex: t.seriesIndex,
          // 缩放切片后 model 里的 dataIndex 是本地下标，上报要还原成全量下标，
          // 否则宿主拿着这个值去查原始行会错位一段（且错得很安静）。
          dataIndex: t.dataIndex + this._zoomOffset,
          value: v?.value,
          formatted: v?.formatted,
        });
      }
      return;
    }
    const legendBtn = findInEventPath(e, "[data-legend-index]");
    if (legendBtn) {
      const index = Number(legendBtn.getAttribute("data-legend-index"));
      const series = this.seriesConfigs()[index];
      if (!series) return;
      series.visible = !series.visible;
      // [WHY] hidden 需映射回原始 series 索引（filter 后下标会漂移）
      this.emit("z-series-toggle", {
        index,
        name: series.name,
        visible: series.visible,
        hidden: this.seriesConfigs().map((s, i) => ({ s, i })).filter(({ s }) => !s.visible).map(({ i }) => i),
      });
    }
  };

  /**
   * 缩放条的键盘操作。返回 true = 这个键已处理，调用方不要再当数据点导航用。
   *
   * 步长：方向键 1%，Shift + 方向键 10%。三个部件的语义与鼠标拖拽一致
   * （起点只动左边界、终点只动右边界、窗口整体平移）。
   */
  private zoomKey(e: KeyboardEvent): boolean {
    const handle = findInEventPath(e, "[data-handle]")?.getAttribute("data-handle") ?? "";
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return false;
    const step = (e.shiftKey ? 0.1 : 0.01) * dir;
    const [s0, e0] = this.zoomNorm() ?? [0, 1];
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    let s = s0;
    let en = e0;
    if (handle === "start") {
      s = clamp(s0 + step, 0, e0 - MIN_ZOOM_SPAN);
    } else if (handle === "end") {
      en = clamp(e0 + step, s0 + MIN_ZOOM_SPAN, 1);
    } else {
      const span = e0 - s0;
      s = clamp(s0 + step, 0, 1 - span);
      en = s + span;
    }
    e.preventDefault();
    this._zoom = [s, en];
    this._suppressAnim = true;
    // [WHY 要记住是哪个部件] 重绘会重建整个 shadow，手柄节点被替换 ⇒ 焦点丢到 body，
    // 按第二下方向键就没人接了。重绘后把焦点还给同一个部件。
    this._zoomFocus = handle || "window";
    this.requestUpdate();
    return true;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // 焦点在缩放条上时，方向键归缩放条：否则按左右键会去挪数据点焦点，
    // 而用户明明是把光标停在手柄上的（两个功能抢同一组按键）。
    if (findInEventPath(e, "[data-handle]")) {
      if (this.zoomKey(e)) return;
    }
    if (e.key === "Escape") {
      this.hideTooltip();
      // 键盘框选中按 Esc 同时撤销选区，而不是只关 tooltip 把人留在半选状态
      if (this._kbdSel) {
        this._kbdSel = null;
        this.clearBrush();
      }
      return;
    }
    // 键盘框选：Enter 提交（见 _kbdSel 的注释）
    if (e.key === "Enter" && this._kbdSel) {
      e.preventDefault();
      this.commitKbdSel();
      return;
    }
    // Shift + 方向键扩展键盘选区；不按 Shift 时方向键仍是「逐个看数据点」
    if (e.shiftKey && this.brushable && this.kbdBrushKey(e)) return;
    const total = this._model?.tooltipTargets.length ?? 0;
    // [WHY 单列 Home / End] 一屏几十上百个数据点时，逐个按方向键挪到第一个/最后一个
    // 是不现实的；APG 的复合控件模式里 Home / End 是标配。
    if (e.key === "Home" || e.key === "End") {
      if (total <= 0) return;
      e.preventDefault();
      this.moveTarget(e.key === "Home" ? 0 : total - 1);
      return;
    }
    const dirs: Partial<Record<string, NavDir>> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = nextTargetIndex(this._activeTarget, dir, total, this._columns);
    if (next >= 0) this.moveTarget(next);
  };

  /** 把「当前数据点」挪到 idx：焦点环 + tooltip + 读屏播报，三件事一起做。 */
  private moveTarget(idx: number): void {
    const total = this._model?.tooltipTargets.length ?? 0;
    if (idx < 0 || idx >= total) return;
    this._activeTarget = idx;
    const anchor = this.shadowRoot?.querySelector(`[data-m="${idx}"]`);
    this.showTarget(idx, anchor ?? this);
  }

  private showTarget(idx: number, anchor: Element): void {
    const t = this._model?.tooltipTargets[idx];
    if (!t) return;
    this._activeTarget = idx;
    if (this.tooltip) {
      if (!this._tooltip) this._tooltip = new TooltipManager();
      this._tooltip.show(anchor, this.tooltipHtml(t));
    }
    this.setFocusRing(t);
    this.announce(t);
    this.emit("z-tooltip-change", {
      visible: true,
      seriesIndex: t.seriesIndex,
      // 同 z-marker-click：还原成全量下标（见 applyZoom 的注释）
      dataIndex: t.dataIndex + this._zoomOffset,
      label: t.label,
      values: t.values,
    });
  }

  /**
   * 把当前数据点念出来。
   *
   * [WHY 光有焦点环不够] 方向键的成功判据原先只有 `.z-chart__focus-ring` 的显隐 ——
   * 那是**纯视觉**的。2026-11-16 实测：按方向键后 shadow 里
   * `[aria-live]`/`[role=status]` 数量为 0，读屏用户按十下屏幕对他一动不动。
   * tooltip 本身也不进无障碍树（`TooltipManager` 用的是 fixed 定位的浮层），
   * 所以播报必须自己发。
   */
  private announce(t: TooltipTarget): void {
    const live = this.shadowRoot?.querySelector<HTMLElement>(`#${this._uid}-live`);
    if (!live) return;
    const vals = t.values.map((v) => `${v.name} ${v.formatted}`).join("，");
    live.textContent = vals ? `${t.label}：${vals}` : t.label;
  }

  private hideTooltip(): void {
    this._activeTarget = -1;
    this._tooltip?.hide();
    const ring = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__focus-ring");
    if (ring) ring.hidden = true;
    // 清掉播报，避免「再按一次方向键回到同一个点」时读屏认为内容没变而不念
    const live = this.shadowRoot?.querySelector<HTMLElement>(`#${this._uid}-live`);
    if (live) live.textContent = "";
    this.emit("z-tooltip-change", { visible: false });
  }

  private setFocusRing(t: TooltipTarget): void {
    const ring = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__focus-ring");
    if (!ring) return;
    ring.hidden = false;
    ring.style.left = `${t.x}px`;
    ring.style.top = `${t.y}px`;
    ring.style.width = `${t.w}px`;
    ring.style.height = `${t.h}px`;
  }
}

customElements.define("z-chart", ZChart);
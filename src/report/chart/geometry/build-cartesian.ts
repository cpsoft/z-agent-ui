// 笛卡尔族（bar / line / area / scatter）：坐标映射、mark 生成、markline/markpoint。
import type { GeometryModel, Mark, ResolvedTheme, SeriesModel, TooltipTarget, TooltipValue } from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { valueToT } from "../layout/layout.js";
import { makeFormatter } from "../format/format.js";
import { stackBars } from "../data/stack.js";
import { staggered } from "./shared.js";
import { cartesianAxes, gridLines, seriesLegend } from "./build-axes.js";

export function buildCartesianGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  if (!domains) return { marks: [], gridLines: [], axes: [], legend: [], tooltipTargets: [], noData: true };

  const { plot } = frame;
  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const barSeries = series.filter((s) => s.kind === "bar" && s.visible);
  // 堆积至少要有两根柱子：单根时「堆积」与「并排」几何完全等价，而 percent 会退化成
  // 每根柱子都是 100%（一堆等高条）——那是错图。所以这里要求 >= 2，与 layout 侧一致。
  // [WHY 白名单而不是「非 none」] 老调用方（以及不关心堆叠的调用方）根本不传 stack，
  // 那时值是 undefined；写成 `!== "none"` 会把 undefined 误判成堆积 ⇒ 多系列柱图
  // 全叠进同一个槽位，视觉上像「少画了几个系列」，且不报错。
  // 只认显式的两种堆叠模式。
  const stacked = (ctx.stack === "stacked" || ctx.stack === "percent") && barSeries.length >= 2;
  const barsOn = (side: "left" | "right") => barSeries.filter((s) => s.yAxis === side);
  // 并排：每个系列一个槽；堆积：同一 y 轴上共用一个槽（左右各一个）
  const slotCount = stacked
    ? Math.max(1, (barsOn("left").length > 0 ? 1 : 0) + (barsOn("right").length > 0 ? 1 : 0))
    : Math.max(1, barSeries.length);
  const barSlotIndex = new Map<number, number>();
  barSeries.forEach((s, i) => {
    barSlotIndex.set(
      s.index,
      stacked ? (s.yAxis === "right" && barsOn("left").length > 0 ? 1 : 0) : i,
    );
  });
  // 每侧的堆积分段只算一次（左右轴各有自己的累积，不能混算）
  const stackSpans = stacked
    ? { left: stackBars(barsOn("left"), ctx.stack).spans, right: stackBars(barsOn("right"), ctx.stack).spans }
    : null;
  const stackOfSide = (s: SeriesModel) => (stackSpans ? (s.yAxis === "right" ? stackSpans.right : stackSpans.left) : null);

  /**
   * 横向（`direction=horizontal`）：分类在左轴、值在底轴。
   *
   * [WHY 只抽一层 `valPos` 而不写两套几何] 横竖差异只有「值轴是 x 还是 y」这一件事。
   * 若两套几何并存，柱子转了而参考线/标注/描边没转的**半改完状态**就必然出现，
   * 且这种状态外观完全正常（只是参考线横穿过去）。
   */
  const isH = domains.horizontal === true;

  /**
   * 对数映射（v → 像素）。
   *
   * [WHY 非正值要 clamp 到域下限] `log(0)` 是 -∞、负数无定义。域下限本身已经是
   * 「最小正值的一半」（见 computeDomains 的 logLeft），所以 clamp 到下限等于
   * 「贴在最底部」—— 调用方会在画之前跳过非正值，这里的 clamp 只是兜底，
   * 保证不会产出 NaN 坐标（NaN 会让整条 path 失效，那是整张图空白，不是少一个点）。
   */
  const logPos = (v: number, domain: [number, number], horizontal: boolean) => {
    const c = valueToT(v, domain, true);
    return horizontal ? plot.x + c * plot.width : plot.y + plot.height - c * plot.height;
  };

  /** 值 → 像素。竖向从底往上，横向从左往右。`log` 打开时走对数映射（左轴专用）。 */
  const valPos = (v: number, domain: [number, number], log = false) => {
    if (log) return logPos(v, domain, isH);
    const span = domain[1] - domain[0] || 1;
    return isH
      ? plot.x + ((v - domain[0]) / span) * plot.width
      : plot.y + plot.height - ((v - domain[0]) / span) * plot.height;
  };
  const baselineY = (domain: [number, number]) => {
    const zero = 0 >= domain[0] && 0 <= domain[1] ? 0 : domain[0];
    const span = domain[1] - domain[0] || 1;
    return plot.y + plot.height - ((zero - domain[0]) / span) * plot.height;
  };
  const baseYLeft = baselineY(domains.leftDomain);
  const baseYRight = baselineY(domains.rightDomain);

  /**
   * 分类槽起点（横向走 y、竖向走 x）。
   *
   * `extent` 在这个方向上可用长度：竖向是 plot.width，横向是 plot.height。
   * 槽位宽/高按 0.8 留缝（柱间空隙），再除以同分类内的并排系列数。
   */
  const catSlot = (idx: number, n: number, offset: number, slot: number, extent: number) => {
    const step = extent / n;
    const origin = isH ? plot.y : plot.x;
    return origin + step * idx + step / 2 - slot / 2 + offset;
  };
  const slotSize = (n: number, slotCount: number, extent: number) => (extent / n) * 0.8 / slotCount;
  const xForValue = (v: number) => {
    const [d0, d1] = domains!.xDomain;
    const span = d1 - d0 || 1;
    return plot.x + ((v - d0) / span) * plot.width;
  };
  const yFor = (v: number, domain: [number, number], log = false) => {
    if (log) return logPos(v, domain, false);
    const span = domain[1] - domain[0] || 1;
    return plot.y + plot.height - ((v - domain[0]) / span) * plot.height;
  };
  const catCount = Math.max(1, domains.xLabels.length);
  const extent = isH ? plot.height : plot.width;

  /**
   * 数值/时间轴缩放后，这个点是否还落在可视值域内。
   *
   * [WHY 不能复用 gap] gap 的语义是「这里没有数」—— 折线会在该分类下方画一个叉，
   * 因为「断在这里」本身是结论。而缩放到某个值域之外的意思是「有数，但当前视野
   * 看不到」，画叉等于报了一个错的结论。所以两件事分开判断：域外点**静默不画**。
   *
   * 分类轴恒返回 true：那里的 xDomain 是 `[0, n-1]`，缩放已经在 `Chart.applyZoom`
   * 里切成子数组了（下标真的变了，所以那边有 `_zoomOffset`；这边下标不动）。
   */
  const isValueX = domains.xKind === "value" || domains.xKind === "time";
  const xInDomain = (p: { x?: number }, i: number): boolean => {
    if (!isValueX) return true;
    const x = p.x ?? i;
    return x >= domains.xDomain[0] && x <= domains.xDomain[1];
  };

  for (const s of series) {
    if (s.kind === "pie" || !s.visible) continue;
    const yDomain = s.yAxis === "right" ? domains.rightDomain : domains.leftDomain;
    const baseY = s.yAxis === "right" ? baseYRight : baseYLeft;
    const fmt = makeFormatter(s.format, ctx.locale);
    // 这个系列的值是否走对数映射（只有左轴能是 log，见 Domains.logLeft）
    const logY = domains.logLeft === true && s.yAxis !== "right";
    /** log 轴上 0 与负数**没有位置**：跳过而不是 clamp 到域下限 —— 画一根贴底的柱子
     *  等于宣称「它很小」，而事实是「它在这个坐标系里不存在」。 */
    const isPlottable = (v: number) => !logY || (Number.isFinite(v) && v > 0);

    if (s.kind === "bar") {
      // 槽尺寸：分类轴方向上的厚度（竖向=宽、横向=高）
      const slot = domains.xKind === "category" ? slotSize(catCount, slotCount, extent) : 12;
      // value-x 轴上组内围绕数据点居中排布，避免多系列重叠
      const offset = domains.xKind === "category"
        ? barSlotIndex.get(s.index)! * slot
        : (barSlotIndex.get(s.index)! - (slotCount - 1) / 2) * slot;
      const spans = stackOfSide(s)?.get(s.index);
      // 值轴上的基线像素：竖向是 y(0)、横向是 x(0)。负值柱从这里往反方向长。
      const basePos = isH
        ? valPos(0 >= yDomain[0] && 0 <= yDomain[1] ? 0 : yDomain[0], yDomain, logY)
        : baseY;

      /**
       * 命中区外扩量：不得越过**最近邻柱的中心线**。
       *
       * [WHY 必须逐图算] 缺省 4px 外扩是为小圆点设计的。柱图密集到一定程度后它变成错的：
       * 534 根柱在 280px 里槽距 0.52px、柱厚 0.42px，外扩 4px 后每根命中区 8.4px ⇒
       * 覆盖相邻 16 根的中心，指针落在哪儿都只命中最后绘制的那几根。症状是
       * 「tooltip 的店名跟鼠标下的柱子无关」—— 不报错、不缺数据，只有真机点得出来。
       *
       * 判据：(最近邻中心距 - 柱厚) / 2 是两根柱之间空隙的一半。与缺省 4 取小。
       * 并排多系列时同分类内两柱紧挨（空隙 0）⇒ 结果 0，命中区正好等于柱子本身 ——
       * 那是精确的，不是退化：柱宽 18px 本来就够点。
       *
       * value-x 轴不传（柱厚固定 12、间距按值分布，最近邻判据不成立），走缺省 4。
       */
      // 最近邻中心距：并排多系列时是**同分类内**的间距（=slot，两柱紧挨），
      // 单系列时是**跨分类**的间距（=step，柱间留 20% 空隙）。
      const step = extent / catCount;
      const nearestCenter = slotCount > 1 ? slot : step;
      const hitPad = domains.xKind === "category"
        ? Math.max(0, Math.min(4, (nearestCenter - slot) / 2))
        : undefined;

      s.data.forEach((p, i) => {
        // 数值轴缩到某个区间后，域外的柱不画（见 xInDomain 的注释）。
        // 分类轴的柱永远在域内，这条判断对它恒为 false。
        if (!xInDomain(p, i)) return;
        // log 轴上 0 与负数没有位置（见 isPlottable 的注释）
        if (!isPlottable(p.value)) return;
        // 分类槽沿分类轴的位置（竖向算 x、横向算 y）
        const slotStart = domains.xKind === "category"
          ? catSlot(p.x ?? i, catCount, offset, slot, extent)
          : isH
            ? plot.y
            : xForValue(p.x ?? i) + offset;
        const local = staggered(progress, i);
        // [WHY 统一用「起点 + 朝目标方向长 len」而不是分别写 x/y] 竖向柱从基线 upward、
        // 横向柱从基线 rightward，公式完全同构：矩形起点 = 目标像素在负方向时退一个 len。
        // 分别写两遍的后果是「负值柱长到基线另一侧」这类错误只在横向出现。
        const span = spans?.get(i);
        const originPos = span ? valPos(span.from, yDomain, logY) : basePos;
        const targetPos = span ? valPos(span.to, yDomain, logY) : valPos(p.value, yDomain, logY);
        const len = Math.max(Math.abs(targetPos - originPos) * local, 0);
        const pos = targetPos >= originPos ? originPos : originPos - len;

        marks.push(
          isH
            ? {
                kind: "rect", seriesIndex: s.index, dataIndex: i,
                x: pos, y: slotStart, width: len, height: slot,
                color: s.color, visible: true,
              }
            : {
                kind: "rect", seriesIndex: s.index, dataIndex: i,
                x: slotStart, y: pos, width: slot, height: len,
                color: s.color, visible: true,
              },
        );
        // 数值标注（labels=yes）：竖向画在柱顶上方，横向画在柱右端。
        // [WHY 只认分类轴] value-x 轴柱厚固定 12px，标注必然互相压字 —— 直接不画。
        // [WHY 密度护栏按分类轴方向取] 竖向看槽宽、横向看槽高：同一份数据换成横向后，
        // 挤压是按高度发生的，沿用槽宽会把「已经压字」判成「放得下」。
        const catRoom = extent / catCount;
        if (ctx.labels && !stacked && domains.xKind === "category" && catRoom >= 30) {
          marks.push({
            kind: "text", seriesIndex: s.index, dataIndex: i,
            cx: isH ? pos + len + 5 : slotStart + slot / 2,
            cy: isH ? slotStart + slot / 2 : pos - 5,
            color: theme.text, label: fmt(p.value),
            textAnchor: isH ? "start" : "middle",
            fontSize: 10, opacity: progress, visible: true,
          });
        }
        tooltipTargets.push({
          seriesIndex: s.index, dataIndex: i,
          label: p.label ?? String(i + 1),
          values: tooltipValues(s, p.value, fmt),
          ...(isH
            ? { x: pos, y: slotStart, w: len, h: slot }
            : { x: slotStart, y: pos, w: slot, h: len }),
          ...(hitPad === undefined ? {} : { pad: hitPad }),
        });
      });
    } else if (s.kind === "scatter") {
      // 散点：x 是数值（xKind 由调用方强制 value），y 取值；有 `r` 时是气泡。
      //
      // [WHY 半径按**面积**映射而不是线性] 圆的视觉量感跟面积走。线性映射半径会让
      // 「值翻倍」看起来像「大了四倍」—— 读者对面积的估计是相当准的（Stevens 幂律），
      // 所以线性半径是本仓明确要避免的失真。这里先开方再插值。
      //
      // [WHY 缺 r 时退回固定 4] 存量散点没有 r，一字不变。同一个系列里部分点缺 r 时，
      // 那些点也走固定半径 —— 混着画两种大小而不说明，比全部固定更误导。
      const radii: number[] = [];
      for (const p of s.data) if (Number.isFinite(p.r) && (p.r as number) > 0) radii.push(p.r as number);
      const rMin = radii.length ? Math.min(...radii) : 0;
      const rMax = radii.length ? Math.max(...radii) : 0;
      const R_MIN_PX = 4;
      const R_MAX_PX = 22;
      /** r → 像素半径。域退化（只有一个值或全等）时给中间档，而不是 0 或满格。 */
      const radiusOf = (r: number | undefined): number => {
        if (!radii.length || r === undefined || !Number.isFinite(r) || r <= 0) return R_MIN_PX;
        const lo = Math.sqrt(Math.max(rMin, 1e-9));
        const hi = Math.sqrt(Math.max(rMax, 1e-9));
        if (hi - lo < 1e-9) return (R_MIN_PX + R_MAX_PX) / 2;
        const t = (Math.sqrt(r) - lo) / (hi - lo);
        return R_MIN_PX + Math.max(0, Math.min(1, t)) * (R_MAX_PX - R_MIN_PX);
      };

      s.data.forEach((p, i) => {
        if (p.gap) return;
        // 数值轴缩放：域外的点不画，也不进 tooltip（否则能在画布外"点到"一个点）
        if (!xInDomain(p, i)) return;
        if (!isPlottable(p.value)) return;
        const cx = xForValue(p.x ?? i);
        const cy = yFor(p.value, yDomain, logY);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
        const rr = radiusOf(p.r);
        marks.push({
          kind: "circle", seriesIndex: s.index, dataIndex: i,
          // [WHY 半透明] 气泡一大就大面积挡底下的点，实心色会把重叠区域糊成一块。
          cx, cy, r: rr, color: s.color, opacity: progress * (radii.length ? 0.72 : 1),
          visible: true,
        });
        // 圆半径本身就是「第三维」，必须进 tooltip —— 否则读者只能猜大小代表什么
        const vals = tooltipValues(s, p.value, fmt);
        if (s.sizeTitle && p.r !== undefined && Number.isFinite(p.r)) {
          // color 跟系列色：第三维和 y 值是同一个点的两个属性，用不同颜色会让人以为
          // 是两条系列
          vals.push({ name: s.sizeTitle, value: p.r, formatted: fmt(p.r), color: s.color });
        }
        tooltipTargets.push({
          seriesIndex: s.index, dataIndex: i,
          label: p.label ?? formattedX(p.x ?? i, domains!, ctx.locale),
          values: vals,
          x: cx - rr, y: cy - rr, w: rr * 2, h: rr * 2,
        });
      });
    } else {
      const xScale = (p: { x?: number }, i: number) => {
        if (domains!.xKind === "category") {
          const n = Math.max(1, domains!.xLabels.length);
          return plot.x + (plot.width / n) * (p.x ?? i) + plot.width / n / 2;
        }
        return xForValue(p.x ?? i);
      };
      // gap 点的 y 是 NaN：它没有值，只有「这个分类上没有数」这个事实。
      // 面积系列不会有 gap 点（normalize 只对 line 产出），所以下面的填充分支不受影响。
      //
      // [2026-11-17 数值轴缩放] 域外点给 NaN 的 y：折线在此断开，但**不**走 gap 那条
      // 「缺数标叉」分支 —— 那个结论是错的（见 xInDomain 的注释）。
      const pts = s.data.map(
        (p, i) =>
          [xScale(p, i), p.gap || !xInDomain(p, i) || !isPlottable(p.value) ? NaN : yFor(p.value, yDomain, logY)] as [number, number],
      );
      const drawN = Math.max(1, Math.ceil(pts.length * progress));
      if (s.kind === "area") {
        // 域外点的 y 是 NaN，直接连会产出一条含 NaN 的 d（整块面积不显示）。
        // 域外点只可能落在两端（xDomain 是连续区间），所以过滤后仍是连续段。
        const visiblePts = pts.slice(0, drawN).filter(([, y]) => Number.isFinite(y));
        if (visiblePts.length > 0) {
          let d = `M ${visiblePts[0][0]} ${visiblePts[0][1]}`;
          for (let k = 1; k < visiblePts.length; k++) {
            d += ` L ${visiblePts[k][0]} ${visiblePts[k][1]}`;
          }
          const last = visiblePts[visiblePts.length - 1];
          d += ` L ${last[0]} ${baseY} L ${visiblePts[0][0]} ${baseY} Z`;
          marks.push({
            kind: "path", seriesIndex: s.index, dataIndex: 0, d,
            color: s.color, fillOpacity: 0.15, strokeWidth: 2, opacity: progress,
            visible: true,
          });
        }
      } else {
        // [WHY 断段而不是丢点] 分类轴对齐靠「每个分类一个点」：丢点会让后面的标签左移，
        // 线与轴错位。gap 点把路径切成若干连续段，各自一条 path；孤立点只剩圆点。
        let run: Array<[number, number]> = [];
        const flush = () => {
          if (run.length > 1) {
            let d = `M ${run[0][0]} ${run[0][1]}`;
            for (let k = 1; k < run.length; k++) d += ` L ${run[k][0]} ${run[k][1]}`;
            marks.push({
              kind: "path", seriesIndex: s.index, dataIndex: 0, d,
              color: s.color, strokeWidth: 2, opacity: progress, visible: true,
            });
          }
          run = [];
        };
        for (let k = 0; k < drawN; k++) {
          if (s.data[k]?.gap) {
            flush();
            // 缺口标注：在画布底部该分类的位置画一个小叉 ——「这里没数」是结论的一部分，
            // 只断线不标注的话，读者分不清「线断了」是缺数还是绘图错误。
            marks.push({
              kind: "text", seriesIndex: s.index, dataIndex: k,
              cx: pts[k][0], cy: plot.y + plot.height - 4,
              color: theme.textSecondary, label: "×", textAnchor: "middle",
              fontSize: 10, opacity: progress, visible: true,
            });
            continue;
          }
          run.push(pts[k]);
        }
        flush();
      }
      if (pts.length <= 60) {
        s.data.forEach((p, i) => {
          // 缺数点不画圆点：它没有位置（y=NaN），画出来就是 SVG 里的 NaN 坐标
          if (p.gap) return;
          // 数值轴缩放的域外点同理（y 也是 NaN，见 pts 的注释）
          if (!xInDomain(p, i)) return;
          const [cx, cy] = pts[i];
          marks.push({
            kind: "circle", seriesIndex: s.index, dataIndex: i,
            cx, cy, r: 3, color: s.color, opacity: progress, visible: true,
          });
        });
      }
      s.data.forEach((p, i) => {
        // 域外点不生成 tooltip 命中区：否则画布边缘会留一块「看不见但能点到」的热区
        if (!xInDomain(p, i)) return;
        const [cx, cy] = pts[i];
        tooltipTargets.push({
          seriesIndex: s.index, dataIndex: i,
          label: p.label ?? formattedX(p.x ?? i, domains!, ctx.locale),
          // 缺数点的 tooltip 必须说「没有数据」而不是 NaN/0 —— 0 和「没数」是两种结论
          values: p.gap
            ? [{ name: s.name, value: NaN, formatted: "没有数据", color: s.color }]
            : tooltipValues(s, p.value, fmt),
          x: cx - 4, y: (Number.isNaN(cy) ? baseY : cy) - 4, w: 8, h: 8,
        });
      });
    }
  }

  // ── markline：横向参考线（issue IKTM1J）──
  //
  // [WHY 挂左轴] 参考线几乎总是与主指标同量纲（日目标/均值），主系列缺省也在左轴。
  // 双轴图的右轴参考线等真有第二个用例再扩。
  const refVal = ctx.markline;
  if (refVal !== undefined && Number.isFinite(refVal)) {
    // 横向时参考线是**竖线**（值在底轴）。跟着柱子转过去，否则它会横穿整张横向柱图，
    // 读者会以为那是某个分类的分隔线。
    const refPos = isH
      ? valPos(refVal, domains.leftDomain, domains.logLeft === true)
      : yFor(refVal, domains.leftDomain, domains.logLeft === true);
    const inRange = isH
      ? refPos >= plot.x - 0.5 && refPos <= plot.x + plot.width + 0.5
      : refPos >= plot.y - 0.5 && refPos <= plot.y + plot.height + 0.5;
    // [WHY 出界不画也不钳] 显式设了轴 max 时线值可能超出值域；钳进画布会画出一条
    // 「不在它声明的值上」的线，比不画更骗人。值域扩展已由 computeDomains 的 refLine
    // 处理，这里只剩「作者同时手设了 max」的罕见组合。
    if (inRange) {
      marks.push({
        kind: "path", seriesIndex: -1, dataIndex: -1,
        d: isH
          ? `M ${refPos} ${plot.y} L ${refPos} ${plot.y + plot.height}`
          : `M ${plot.x} ${refPos} L ${plot.x + plot.width} ${refPos}`,
        color: theme.text, strokeWidth: 1, dash: true, opacity: progress, visible: true,
      });
      const refFmt = makeFormatter("auto", ctx.locale);
      const label = `${ctx.marklineLabel ? `${ctx.marklineLabel} ` : ""}${refFmt(refVal)}`;
      marks.push({
        kind: "text", seriesIndex: -1, dataIndex: -1,
        cx: isH ? refPos : plot.x + plot.width,
        // 横向的标签移出绘图区（落在 topPad 腾出的上边距里）。画在绘图区内的话，
        // 竖线两侧必然有柱穿过，标签会被柱子盖掉一半。
        cy: isH ? plot.y - 6 : refPos - 5,
        color: theme.text, label,
        textAnchor: isH ? "middle" : "end",
        fontSize: 11, fontWeight: 500, opacity: progress, visible: true,
      });
    }
  }

  // ── markpoint：强调某一根柱/点（issue IKTM1J）──
  //
  // 取**第一个可见**的柱/线系列；装饰性标记（描边/光晕）不新增 tooltip 命中区，
  // 悬停行为与数据完全不变。
  const mp = ctx.markpoint;
  if (mp === "first" || mp === "last" || mp === "max" || mp === "min") {
    const s = series.find(
      (x) => x.visible && (x.kind === "bar" || x.kind === "line" || x.kind === "scatter") && x.data.length > 0,
    );
    if (s) {
      let idx = -1;
      if (mp === "first") idx = 0;
      else if (mp === "last") idx = s.data.length - 1;
      else {
        let best = NaN;
        s.data.forEach((p, i) => {
          if (p.gap || !Number.isFinite(p.value)) return;
          if (Number.isNaN(best) || (mp === "max" ? p.value > best : p.value < best)) {
            best = p.value;
            idx = i;
          }
        });
      }
      if (idx >= 0) {
        if (s.kind === "bar") {
          const m = marks.find(
            (mk) => mk.kind === "rect" && mk.seriesIndex === s.index && mk.dataIndex === idx,
          );
          // 柱宽为 0 的退化情形（画布被挤到没有槽位）不描边 —— 画出来是一根竖线
          if (m && (m.width ?? 0) > 1 && (m.height ?? 0) > 0) {
            marks.push({
              kind: "path", seriesIndex: s.index, dataIndex: idx,
              d:
                `M ${m.x! - 2} ${m.y! - 2} L ${m.x! + m.width! + 2} ${m.y! - 2}` +
                ` L ${m.x! + m.width! + 2} ${m.y! + m.height! + 2} L ${m.x! - 2} ${m.y! + m.height! + 2} Z`,
              color: theme.text, strokeWidth: 1.5, opacity: progress, visible: true,
            });
          }
        } else {
          const c = marks.find(
            (mk) => mk.kind === "circle" && mk.seriesIndex === s.index && mk.dataIndex === idx,
          );
          // 半透明大圆叠在原点上做光晕；progress<1 时跟着一起淡入
          if (c) {
            marks.push({
              kind: "circle", seriesIndex: s.index, dataIndex: idx,
              cx: c.cx, cy: c.cy, r: (c.r ?? 3) + 3.5,
              color: s.color, opacity: 0.35 * progress, visible: true,
            });
          }
        }
      }
    }
  }

  const axes = cartesianAxes(frame, domains, theme, "bottom");
  const lines = gridLines(frame, domains, theme, ctx.showGrid, domains.hasLeft, domains.hasRight);
  const legend = seriesLegend(series);

  return {
    marks,
    gridLines: lines,
    axes,
    legend,
    tooltipTargets,
    noData: series.every((s) => s.kind === "pie" || s.data.length === 0),
  };
}

function tooltipValues(s: SeriesModel, value: number, fmt: (v: number) => string): TooltipValue[] {
  return [{ name: s.name, value, formatted: fmt(value), color: s.color }];
}

function formattedX(x: number, domains: Domains, locale: string): string {
  if (domains.xKind === "time") {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(x);
  }
  return String(x);
}

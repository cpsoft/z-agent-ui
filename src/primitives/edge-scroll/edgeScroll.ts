// 指针靠到容器边缘时按帧自动滚动。拖拽时「把块拖到视口外」的唯一出路 ——
// 没有它，用户在长画布/长表格里只能先松手、滚一下、再接着拖。
//
// [WHY 抽成原语] 2026-11-20（issue IKWNJL / IKWNJP 的第二部分）。此前只有编辑器有
// （`editor/page-editor/controllers/drag.ts` 里内联的 36px / 14px 帧循环），
// 甘特拖任务条到视口外就停住。参数各写一套、行为只有一处有，正是这套原语要收的东西。
// 现在两个调用方（编辑器、甘特）参数一致，以后第三处直接调。
//
// [WHY 每帧问一次指针位置，而不是监听 move] 指针**不动**时画布自己滚了，落点也会变；
// 只在 move 里算就会漏掉这一类。滚动循环本来就要按帧跑，顺手在里面问坐标最省。

/** 边缘带宽 px：指针进入这个带就开始滚。 */
export const EDGE_SCROLL_RANGE = 36;
/** 每帧基础步长 px（贴边时按进入深度线性取 0~step，只在正中间满速）。 */
export const EDGE_SCROLL_STEP = 14;

export interface EdgeScrollOptions {
  /** 每帧问一次指针位置（视口坐标）。 */
  point(): { x: number; y: number };
  /** 要滚的容器：读 `scrollTop` / 写 `scrollTop`。 */
  el: HTMLElement;
  /** 边缘带宽，默认 36px。 */
  edge?: number;
  /** 每帧基础步长，默认 14px。 */
  step?: number;
  /**
   * 指针离开容器多远之内仍算数，默认 `edge * 2`。
   *
   * [WHY 要限制] 指针跑到顶栏、左栏时纵坐标仍小于上边界，无限制地滚会把画布一路滚到顶
   * （用户还以为鼠标卡住了）。
   */
  overshoot?: number;
  /** 真的滚动了才回调（调用方在这里重算落点、重绘预览）。 */
  onScroll?(): void;
  /**
   * 滚动轴：`"y"`（默认）只滚纵向，`"xy"` 两轴都滚。
   *
   * [WHY 要有两档而不是一律两轴] 栅格画布横向是「列固定」，指针横向移动是在选落点，
   * 横向自动滚会把块送到看不见的地方；而甘特的时间轴**横向才是主方向** ——
   * 拖任务条到右边缘不横向滚，就等于没法改远处的日期。
   */
  axis?: "y" | "xy";
}

/**
 * 启动边缘滚动，返回 `{ stop }`。
 */
export function startEdgeScroll(o: EdgeScrollOptions): { stop(): void } {
  const edge = o.edge ?? EDGE_SCROLL_RANGE;
  const step = o.step ?? EDGE_SCROLL_STEP;
  const overshoot = o.overshoot ?? edge * 2;
  const both = o.axis === "xy";
  let raf = 0;
  let stopped = false;

  /** 某个轴上的滚动量：贴边满速，刚进边带接近 0（一根像素的抖动不该触发跳动）。 */
  const stepOn = (v: number, lo: number, hi: number): number => {
    if (v < lo + edge) return -step * Math.min(1, (lo + edge - v) / edge);
    if (v > hi - edge) return step * Math.min(1, (v - (hi - edge)) / edge);
    return 0;
  };

  const frame = (): void => {
    if (stopped) return;
    const { x, y } = o.point();
    const r = o.el.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (both) {
      // 两轴各自判越界容忍：指针跑到容器外太远就停，否则会一直滚下去
      const inX = x >= r.left - overshoot && x <= r.right + overshoot;
      const inY = y >= r.top - overshoot && y <= r.bottom + overshoot;
      if (inX) dx = stepOn(x, r.left, r.right);
      if (inY) dy = stepOn(y, r.top, r.bottom);
    } else {
      // 只在横向还留在容器里时滚纵向：指针跑到左栏/顶栏时不滚中间那栏
      if (x >= r.left && x <= r.right && y >= r.top - overshoot && y <= r.bottom + overshoot) {
        dy = stepOn(y, r.top, r.bottom);
      }
    }
    if (dx || dy) {
      const top = o.el.scrollTop;
      const left = o.el.scrollLeft;
      // [WHY 自己 clamp 到 0] 真实浏览器会把 scrollTop 夹在 [0, max]，但测试环境
      // （happy-dom）不夹 —— 贴着顶边滚会写出负数，于是「没滚动」被误判成滚了。
      // 另一侧不需要手动夹：那里浏览器一定会夹住，而我们只关心「值有没有变」。
      o.el.scrollTop = Math.max(0, top + dy);
      o.el.scrollLeft = Math.max(0, left + dx);
      // 已经到顶/到底：值没变则不回调 —— 否则调用方会白算一帧落点
      if (o.el.scrollTop !== top || o.el.scrollLeft !== left) o.onScroll?.();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

// [WHY] 2026-10-25 系统审计：从 Flow.ts（947 行）按职责拆出
// 职责：把视图状态刷进 DOM（视口 transform/背景网格、框选矩形、临时边、minimap 数据）；不做事件绑定、不做几何计算。
import { parsePosition, type ZViewport } from "./shared.js";

export interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 应用视口变换。
 *
 * [WHY] 平移量取整（2026-10-20）：小数像素平移 + 非整数缩放会让整层文字落在半像素上，
 * 浏览器重采样后笔划发灰（[[bug-20261020-canvas-text-blur]]）。取整只损失 <1px 精度。
 * [WHY] 背景层在视口外部（不受 transform 影响），手动设 background-position/size
 * 模拟 pan/zoom：position 跟随视口偏移，size 随 zoom 缩放，使网格始终覆盖完整可见区域
 */
export function applyViewportStyles(
  viewportEl: HTMLElement | null,
  bgEl: HTMLElement | null,
  viewport: ZViewport,
  background: "dots" | "lines" | "none",
  snapSize: number,
): void {
  if (!viewportEl) return;
  viewportEl.style.transform = `translate(${Math.round(viewport.x)}px, ${Math.round(viewport.y)}px) scale(${viewport.zoom})`;
  if (bgEl && background !== "none") {
    const gridSize = snapSize || 20;
    const scaled = gridSize * viewport.zoom;
    bgEl.style.backgroundPosition = `${viewport.x}px ${viewport.y}px`;
    bgEl.style.backgroundSize = `${scaled}px ${scaled}px`;
  }
}

/** 框选矩形的 DOM 写入（首次惰性创建，兼容 shadow 树被重建的情况）。 */
export function writeBoxSelect(root: ShadowRoot | null | undefined, box: BoxRect): HTMLElement {
  let el = root?.querySelector(".z-flow__box-select") as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = "z-flow__box-select";
    root?.appendChild(el);
  }
  el.style.left = `${box.left}px`;
  el.style.top = `${box.top}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  el.removeAttribute("hidden");
  return el;
}

export function hideBoxSelect(root: ShadowRoot | null | undefined): void {
  const box = root?.querySelector(".z-flow__box-select");
  if (box) box.setAttribute("hidden", "");
}

/** 临时连线：可见时写 d 并显示，否则隐藏。 */
export function applyTempEdgeDom(
  root: ShadowRoot | null | undefined,
  d: string | null,
  visible: boolean,
): void {
  const t = root?.querySelector(".z-flow__temp-edge");
  if (!t) return;
  if (visible && d) {
    t.removeAttribute("hidden");
    t.setAttribute("d", d);
  } else {
    t.setAttribute("hidden", "");
  }
}

/** 小地图数据同步：节点 flow 矩形 + 含画布尺寸的视口。 */
export function syncMinimap(
  host: HTMLElement,
  nodes: Element[],
  viewport: ZViewport,
): void {
  const minimaps = host.querySelectorAll("z-flow-minimap");
  if (!minimaps.length) return;
  const rects = nodes.map((n) => {
    const el = n as HTMLElement & { id: string; position: string; offsetWidth: number; offsetHeight: number };
    const pos = parsePosition(el.position) ?? { x: 0, y: 0 };
    return { id: el.id, x: pos.x, y: pos.y, w: el.offsetWidth || 0, h: el.offsetHeight || 0 };
  });
  const vp = {
    ...viewport,
    width: host.clientWidth,
    height: host.clientHeight,
  };
  minimaps.forEach((mm) => {
    (mm as unknown as { data: unknown }).data = rects;
    (mm as unknown as { viewport: unknown }).viewport = vp;
  });
}

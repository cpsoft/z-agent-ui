// 报表布局自动重排（L1 布局编辑拖拽避让）
// 语义与 react-grid-layout 的 compact vertical + 碰撞推挤一致：
// 1) 碰撞推挤：与任何其他项重叠的项整体下移到障碍底边之下（迭代收敛）；
// 2) 垂直压缩：其余项尽量上移收紧，保持无重叠（被拖拽项位置由用户控制，不参与压缩）。
import type { ReportCellLayout } from "./types.js";

/** 两个 cell 布局是否相交（冲突检测；x 水平不交则视为可并排，不推挤） */
export function layoutOverlap(a: ReportCellLayout, b: ReportCellLayout): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 拖拽移动时的自动动态布局：将被移动项（idx）置于 target 后，
 * 其余图表自动避让（碰撞推挤）并垂直收紧（压缩）。
 * 返回新的布局数组，不改动入参。
 */
export function autoReflowLayout(
  layouts: ReportCellLayout[],
  idx: number,
  target: ReportCellLayout,
): ReportCellLayout[] {
  const next = layouts.map((l) => ({ ...l }));
  next[idx] = { ...target };
  const n = next.length;

  const yOrder = () =>
    next
      .map((_, i) => i)
      .sort((a, b) => next[a].y - next[b].y || next[a].x - next[b].x);

  // 1) 碰撞推挤：y 升序处理，与任意其他项重叠则下移到最大底边之下
  let changed = true;
  while (changed) {
    changed = false;
    for (const i of yOrder()) {
      if (i === idx) continue;
      const l = next[i];
      let bottom = l.y;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        if (layoutOverlap(l, next[j])) bottom = Math.max(bottom, next[j].y + next[j].h);
      }
      if (bottom > l.y) {
        next[i] = { ...l, y: bottom };
        changed = true;
      }
    }
  }

  // 2) 垂直压缩：y 升序，尽量上移（仅在保持无重叠的前提下移动）
  changed = true;
  while (changed) {
    changed = false;
    for (const i of yOrder()) {
      if (i === idx) continue;
      const l = next[i];
      let ny = l.y;
      while (ny > 0) {
        const cand = { ...l, y: ny - 1 };
        let blocked = false;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          if (layoutOverlap(cand, next[j])) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
        ny--;
      }
      if (ny !== l.y) {
        next[i] = { ...l, y: ny };
        changed = true;
      }
    }
  }

  return next;
}

/** 两个布局的**数值**是否相同（含所属容器 / 标签页）。
 *
 *  [WHY 要单独比数值] autoReflowLayout 出于「不改动入参」的约定，每次都会把整组布局
 *  深拷贝一遍 —— 于是即使一张卡根本没被推动，它拿到的也是一个新对象。上层拿这个新对象
 *  写回 charts，整张卡的预览就被判定为 props 变了。拖一次动的是全组，重画的就是全组。 */
export function sameLayout(a?: ReportCellLayout, b?: ReportCellLayout): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
    && (a.parentId ?? null) === (b.parentId ?? null)
    && (a.tabId ?? null) === (b.tabId ?? null);
}

/** 按 id 把布局写回一组卡片：**只替换数值真的变了的项**，其余原引用返回。
 *
 *  返回原数组本身（引用相等）= 一件都没变 ⇒ 调用方的 setState 直接 bail out，
 *  连一次重渲染都不会发生。这是「拖动时只有被影响的卡在动」唯一能证明的判据：
 *  值相等骗得了人（恰好没变），引用相等骗不了。 */
export function applyLayouts<T extends { id: string; layout?: ReportCellLayout }>(
  items: T[],
  byId: Map<string, ReportCellLayout>,
): T[] {
  let changed = false;
  const out = items.map((it) => {
    const l = byId.get(it.id);
    if (!l || sameLayout(it.layout, l)) return it;
    changed = true;
    return { ...it, layout: l };
  });
  return changed ? out : items;
}

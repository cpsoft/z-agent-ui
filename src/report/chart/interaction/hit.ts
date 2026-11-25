import type { TooltipTarget } from "../types.js";

export type NavDir = "up" | "down" | "left" | "right";

// 键盘导航：grid 布局中按行列移动；columns 不足时退化为线性循环
export function nextTargetIndex(
  current: number,
  dir: NavDir,
  total: number,
  columns: number,
): number {
  if (total <= 0) return -1;
  if (current < 0 || current >= total) return 0;
  if (columns <= 1 || columns >= total - 1) {
    const delta = dir === "up" || dir === "left" ? -1 : 1;
    return (current + delta + total) % total;
  }
  const col = current % columns;
  const row = Math.floor(current / columns);
  let next: number;
  switch (dir) {
    case "left":
      next = col > 0 ? current - 1 : current;
      break;
    case "right":
      next = col < columns - 1 ? current + 1 : current;
      break;
    case "up":
      next = row > 0 ? current - columns : current;
      break;
    case "down":
      next = row + 1 < Math.ceil(total / columns) ? current + columns : current;
      break;
  }
  return Math.min(next, total - 1);
}

export function targetCenter(t: TooltipTarget): { x: number; y: number } {
  return { x: t.x + t.w / 2, y: t.y + t.h / 2 };
}

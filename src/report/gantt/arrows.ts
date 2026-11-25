// [WHY] 依赖箭头几何纯函数：四类型锚点 + 同 pair 平行边错位 + bezier 弯曲。
// 出口方向按类型固定（FS/FF 右缘向右出、SS/SF 左缘向左出），进入恒从 succ
// 左缘向右（cp2 恒在 tx 左侧）——对齐参考仓库 dependencyArrows.ts：
// 方向若按 dist 符号决定，SS/SF 会从左缘出发却向右弯、曲线穿过条形本体。
// 弯曲量 dist = max(|dx|, |dy|*0.6)，上下行时弯更大更舒展。
// See: wiki/requirements/REQ-018-gantt.md; E:/Temp/z-gantt-ref/src/lib/dependencyArrows.ts
import type { ZGanttDependency, ZGanttDependencyType } from "./types.js";

/** 条形几何（chart 坐标 px；里程碑传外接框） */
export interface BarGeometry {
  x: number;
  width: number;
  centerY: number;
}

export interface ArrowPath {
  predecessorId: string;
  successorId: string;
  type: ZGanttDependencyType;
  d: string;
}

/** 最小弯曲控制偏移 px */
const MIN_BEND = 28;
/** 同 pair 平行边间隔 px */
const PARALLEL_GAP = 6;

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * 计算依赖箭头 path。geomOf 对缺失任务（折叠/无日期/不存在）返回 null，
 * 对应边被跳过 —— 折叠父级时子任务边自然消失。
 */
export function computeArrowPaths(
  deps: ZGanttDependency[],
  geomOf: (id: string) => BarGeometry | null,
): ArrowPath[] {
  // 同 predecessor→successor 的多条边分组错位，避免完全重叠
  const pairCount = new Map<string, number>();
  for (const dep of deps) {
    const k = `${dep.predecessor_id}\u0000${dep.successor_id}`;
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
  const pairIdx = new Map<string, number>();
  const out: ArrowPath[] = [];
  for (const dep of deps) {
    const from = geomOf(dep.predecessor_id);
    const to = geomOf(dep.successor_id);
    if (!from || !to) continue;
    const k = `${dep.predecessor_id}\u0000${dep.successor_id}`;
    const idx = pairIdx.get(k) ?? 0;
    pairIdx.set(k, idx + 1);
    const yo = (idx - ((pairCount.get(k) ?? 1) - 1) / 2) * PARALLEL_GAP;

    // source 锚与出口方向均按类型固定（对齐参考实现）：FS/FF 右缘向右出
    // （finish 对齐语义），SS/SF 左缘向左出（start 对齐）——不随 succ 方位变化
    const exitRight = dep.type === "FS" || dep.type === "FF";
    const sx = exitRight ? from.x + from.width : from.x;
    // succ 恒左缘入（cp2 恒在 tx 左侧，曲线终段从左向右进入）
    const tx = to.x;
    const sy = from.centerY + yo;
    const ty = to.centerY + yo;
    const dx = Math.abs(tx - sx);
    const dy = Math.abs(ty - sy);
    const bend = Math.max(Math.max(dx, dy * 0.6) * 0.35, MIN_BEND);
    const sign = exitRight ? 1 : -1;
    const d =
      `M ${round1(sx)} ${round1(sy)} ` +
      `C ${round1(sx + bend * sign)} ${round1(sy)}, ${round1(tx - bend)} ${round1(ty)}, ${round1(tx)} ${round1(ty)}`;
    out.push({ predecessorId: dep.predecessor_id, successorId: dep.successor_id, type: dep.type, d });
  }
  return out;
}

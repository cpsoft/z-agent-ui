// [WHY] 关键路径（全量 CPM）纯函数：正推 ES/EF、逆推 LS/LF，总浮时 float =
// LF - EF。约束公式与 cascadeSchedule 严格一致（FS end+1+lag、SS start+lag、
// FF/SF 由 end 反推保持工期；milestone 工期 1 且只受 FS/SS 约束）。
// 显式日期违反约束时正推按约束顺延（与 auto-schedule 行为一致），float 因此恒 >= 0。
// 仅参与依赖图（至少一条两端 id 有效边）且有日期的任务计入；环上任务无法拓扑
// 排序，整体排除（与 cascadeSchedule 环安全同策略）。
// See: wiki/requirements/REQ-018-gantt.md
import { addDays, diffDays, parseDate } from "./date.js";
import type { ZGanttDependency, ZGanttTask } from "./types.js";

/** 近关键阈值：总浮时不超过该天数视为近关键 */
export const NEAR_CRITICAL_FLOAT = 2;

export interface CriticalPathResult {
  critical: Set<string>;
  nearCritical: Set<string>;
  /** 任务 id → 总浮时（天） */
  floats: Map<string, number>;
}

interface CpmNode {
  id: string;
  dur: number;
  milestone: boolean;
  es: Date;
  ef: Date;
  lf: Date;
}

export function computeCriticalPath(
  tasks: ZGanttTask[],
  deps: ZGanttDependency[],
  opts?: { nearThresholdDays?: number },
): CriticalPathResult {
  const nearLimit = opts?.nearThresholdDays ?? NEAR_CRITICAL_FLOAT;
  const empty: CriticalPathResult = { critical: new Set(), nearCritical: new Set(), floats: new Map() };

  const byId = new Map<string, ZGanttTask>();
  tasks.forEach((t) => {
    if (t && t.id != null && !byId.has(t.id)) byId.set(t.id, t);
  });

  // 参与图：至少一条两端 id 都有效的边（与 v1 语义一致，孤立任务不计入）
  const involved = new Set<string>();
  for (const d of deps) {
    if (d.predecessor_id === d.successor_id) continue;
    if (!byId.has(d.predecessor_id) || !byId.has(d.successor_id)) continue;
    involved.add(d.predecessor_id);
    involved.add(d.successor_id);
  }
  if (!involved.size) return empty;

  // 节点：有日期区间（milestone end = start，dur >= 1）
  const nodes = new Map<string, CpmNode>();
  for (const id of involved) {
    const t = byId.get(id)!;
    const s = parseDate(t.start_date);
    if (!s) continue;
    const e = t.is_milestone ? s : parseDate(t.end_date) ?? s;
    nodes.set(id, {
      id,
      dur: Math.max(diffDays(s, e) + 1, 1),
      milestone: !!t.is_milestone,
      es: s,
      ef: e,
      lf: e,
    });
  }
  if (!nodes.size) return empty;

  // 边只在「两端均有日期」的节点间生效（无日期任务不阻断前驱的拓扑入度）
  const succEdges = new Map<string, ZGanttDependency[]>();
  const indeg = new Map<string, number>();
  for (const d of deps) {
    if (d.predecessor_id === d.successor_id) continue;
    const u = nodes.get(d.predecessor_id);
    const v = nodes.get(d.successor_id);
    if (!u || !v) continue;
    const list = succEdges.get(u.id);
    if (list) list.push(d);
    else succEdges.set(u.id, [d]);
    indeg.set(v.id, (indeg.get(v.id) ?? 0) + 1);
  }
  for (const id of nodes.keys()) {
    if (!indeg.has(id)) indeg.set(id, 0);
  }

  // Kahn 正拓扑序（环上节点不入序 → 自动排除）
  const topo: string[] = [];
  const queue: string[] = [];
  for (const [id, n] of indeg) {
    if (n === 0) queue.push(id);
  }
  while (queue.length) {
    const id = queue.shift()!;
    topo.push(id);
    for (const d of succEdges.get(id) ?? []) {
      const n = (indeg.get(d.successor_id) ?? 1) - 1;
      indeg.set(d.successor_id, n);
      if (n === 0) queue.push(d.successor_id);
    }
  }
  if (!topo.length) return empty;

  // ── 正推：ES 取「自身 start」与全部前驱约束的较大者，EF = ES + dur - 1 ──
  // 约束即 cascadeSchedule 的顺延公式：约束要求更晚时按约束顺延
  for (const id of topo) {
    const u = nodes.get(id)!;
    for (const d of succEdges.get(id) ?? []) {
      const v = nodes.get(d.successor_id);
      if (!v) continue;
      const lag = d.lag_days ?? 0;
      let bound: Date | null = null;
      // milestone 只受 FS/SS 约束（FF/SF 跳过，同 cascadeSchedule）
      if (d.type === "FS") {
        bound = addDays(u.ef, 1 + lag);
      } else if (d.type === "SS") {
        bound = addDays(u.es, lag);
      } else if (!v.milestone && d.type === "FF") {
        // v.end >= u.end + lag → v.start >= u.end + lag - (dur-1)
        bound = addDays(u.ef, lag - (v.dur - 1));
      } else if (!v.milestone && d.type === "SF") {
        // v.end >= u.start + lag
        bound = addDays(u.es, lag - (v.dur - 1));
      }
      if (bound && bound > v.es) {
        v.es = bound;
        v.ef = addDays(bound, v.dur - 1);
      }
    }
  }

  // 项目终点 = 参与图节点的最晚 EF
  let projectEnd: Date = topo[0] ? nodes.get(topo[0])!.ef : new Date();
  for (const id of topo) {
    const ef = nodes.get(id)!.ef;
    if (ef > projectEnd) projectEnd = ef;
  }

  // ── 逆推（倒拓扑序，后继先定稿）：LF = min(项目终点, 后继约束允许的最晚完成) ──
  for (let i = topo.length - 1; i >= 0; i--) {
    const u = nodes.get(topo[i])!;
    let lf = projectEnd;
    for (const d of succEdges.get(u.id) ?? []) {
      const v = nodes.get(d.successor_id);
      if (!v) continue;
      const lag = d.lag_days ?? 0;
      // v.ls = v.lf - v.dur + 1（milestone dur=1 → ls = lf）；FS/SS 受后继
      // 「最晚开始」约束，FF/SF 受后继「最晚完成」约束
      const vLs = addDays(v.lf, -(v.dur - 1));
      let bound: Date | null = null;
      if (d.type === "FS") {
        // u.lf <= v.ls - 1 - lag
        bound = addDays(vLs, -(1 + lag));
      } else if (d.type === "SS") {
        // u.ls <= v.ls - lag → u.lf <= v.ls - lag + (u.dur - 1)
        bound = addDays(vLs, lag + (u.dur - 1));
      } else if (d.type === "FF") {
        // u.lf <= v.lf - lag
        bound = addDays(v.lf, -lag);
      } else if (d.type === "SF") {
        // u.ls <= v.lf - lag → u.lf <= v.lf - lag + (u.dur - 1)
        bound = addDays(v.lf, lag + (u.dur - 1));
      }
      if (bound && bound < lf) lf = bound;
    }
    u.lf = lf;
  }

  const result: CriticalPathResult = { critical: new Set(), nearCritical: new Set(), floats: new Map() };
  for (const id of topo) {
    const u = nodes.get(id)!;
    const floatDays = diffDays(u.ef, u.lf);
    result.floats.set(id, floatDays);
    if (floatDays <= 0) result.critical.add(id);
    else if (floatDays <= nearLimit) result.nearCritical.add(id);
  }
  return result;
}

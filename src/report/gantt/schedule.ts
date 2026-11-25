// [WHY] 自动排程（cascade）纯函数：依赖关系约束传播，FS end+1+lag、SS start+lag、
// FF/SF 由 end 反推 start（保持工期），milestone 只有起点（仅 FS/SS 生效）。
// Kahn 拓扑序单遍传播：环上任务不参与（跳过），重复调用幂等。
// 就地替换传入数组槽位（浅拷贝），不原地改用户任务对象。
// See: wiki/requirements/REQ-018-gantt.md
import { addDays, diffDays, formatDate, parseDate } from "./date.js";
import type { ZGanttDependency, ZGanttTask } from "./types.js";

function durationOf(t: ZGanttTask): number {
  const s = parseDate(t.start_date);
  const e = parseDate(t.end_date);
  if (!s || !e) return 1;
  return Math.max(diffDays(s, e) + 1, 1);
}

function setStart(t: ZGanttTask, s: Date, dur: number): boolean {
  const iso = formatDate(s);
  if (t.start_date === iso) return false;
  t.start_date = iso;
  // 非里程碑保持原工期（end = start + dur - 1，含尾日）
  if (!t.is_milestone) t.end_date = formatDate(addDays(s, dur - 1));
  return true;
}

function setEnd(t: ZGanttTask, e: Date, dur: number): boolean {
  const iso = formatDate(e);
  if (t.end_date === iso) return false;
  t.end_date = iso;
  t.start_date = formatDate(addDays(e, -(dur - 1)));
  return true;
}

/**
 * 按 dependencies 约束顺延任务日期，返回被改动的任务 id 集合。
 * - 传播在浅拷贝副本上进行，结束时替换 tasks 数组对应槽位（未变槽位保持原引用）
 * - pred 缺日期、succ 缺 id、类型不适用（milestone × FF/SF）均跳过
 */
export function cascadeSchedule(tasks: ZGanttTask[], deps: ZGanttDependency[]): string[] {
  const byId = new Map<string, ZGanttTask>();
  tasks.forEach((t) => {
    if (t && t.id != null && !byId.has(t.id)) byId.set(t.id, t);
  });
  // [WHY] 副本懒创建：传播写 draft、读也走 draft，保证拓扑序内读到最新日期
  const copies = new Map<ZGanttTask, ZGanttTask>();
  const draftOf = (t: ZGanttTask): ZGanttTask => {
    let d = copies.get(t);
    if (!d) {
      d = { ...t };
      copies.set(t, d);
    }
    return d;
  };

  // Kahn：入度表 + 出边表（重复 id 以首个生效）
  const indeg = new Map<string, number>();
  const outEdges = new Map<string, ZGanttDependency[]>();
  for (const t of tasks) {
    if (t?.id != null) indeg.set(t.id, 0);
  }
  for (const d of deps) {
    if (!byId.has(d.predecessor_id) || !byId.has(d.successor_id)) continue;
    indeg.set(d.successor_id, (indeg.get(d.successor_id) ?? 0) + 1);
    const list = outEdges.get(d.predecessor_id);
    if (list) list.push(d);
    else outEdges.set(d.predecessor_id, [d]);
  }
  const queue: string[] = [];
  for (const [id, n] of indeg) {
    if (n === 0) queue.push(id);
  }

  const changed = new Set<string>();
  while (queue.length) {
    const pid = queue.shift()!;
    const pred = draftOf(byId.get(pid)!);
    const ps = parseDate(pred.start_date);
    const pe = parseDate(pred.end_date) ?? ps;
    for (const dep of outEdges.get(pid) ?? []) {
      const succ = draftOf(byId.get(dep.successor_id)!);
      const lag = dep.lag_days ?? 0;
      let touched = false;
      if (succ.is_milestone) {
        if (dep.type === "FS" && pe) touched = setStart(succ, addDays(pe, 1 + lag), 1);
        else if (dep.type === "SS" && ps) touched = setStart(succ, addDays(ps, lag), 1);
      } else {
        const dur = durationOf(succ);
        if (dep.type === "FS" && pe) touched = setStart(succ, addDays(pe, 1 + lag), dur);
        else if (dep.type === "SS" && ps) touched = setStart(succ, addDays(ps, lag), dur);
        else if (dep.type === "FF" && pe) touched = setEnd(succ, addDays(pe, lag), dur);
        else if (dep.type === "SF" && ps) touched = setEnd(succ, addDays(ps, lag), dur);
      }
      if (touched) changed.add(succ.id);
      const n = (indeg.get(succ.id) ?? 1) - 1;
      indeg.set(succ.id, n);
      if (n === 0) queue.push(succ.id);
    }
  }

  // 槽位写回：仅替换真正被改动的任务（只读传播产生的相同内容副本不写回）
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const copy = t && t.id != null && changed.has(t.id) ? copies.get(t) : undefined;
    if (copy) tasks[i] = copy;
  }
  return [...changed];
}

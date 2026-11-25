// 分组表 / 树状表格：层级归组 + 小计/总计（含报表级计算字段在「小计环境」里的求值）。
//
// [为什么这一整套必须只有一个实现] 小计是**算出来的数**，不是后端返回的行。它有三类消费者：
// ① React 版 GroupTable（查看态）、② `<z-report-card>`（元素版）、③ 导出 CSV。
// 三处各写一遍的症状不是报错，而是「屏幕上 4800、导出 4300」—— 没有任何断言会红。
// 2026-10-25 从 zEtl 的 Reports.tsx 上移。
//
// [为什么不做「后端算小计」] 后端只按最细粒度的 GROUP BY 返回叶子行。粗粒度组的小计要
// 么再发一次聚合请求（组数 × 一次请求），要么在前端把叶子的小计值按聚合种类汇总。
// 后者一次查询就够，代价是 avg / countDistinct 这类**无法从子级小计重算**的聚合只能显示
// 「—」（见 subtotalOf 的注释）—— 显示一个错的平均值比显示「—」危害大得多。

import { aggKindOf, evalDatasetExpr, exprHasAggCall, extractFieldRefs } from "./report-funcs.js";
import { measureKeyOf } from "./report-kpi.js";
import { cleanFloat } from "../../core/index.js";
import type { ReportChart, ReportComputedField, ReportMeasure } from "./types.js";

/** 分组表渲染行：`group`=父级小计行 / `leaf`=叶子行 / `total`=总计行。 */
export interface GroupRenderRow {
  kind: "group" | "leaf" | "total";
  /** group: 0..rows.length-1；leaf: rows.length；total: -1（不缩进）。 */
  depth: number;
  /** 唯一行 key（含组键链）。 */
  rowKey: string;
  /** 所在组 key（树状折叠状态用；叶子用自身 key）。 */
  groupKey: string;
  /** group 行是否含子级（决定要不要画折叠按钮）。 */
  hasChildren: boolean;
  /**
   * 叶子行在**入参 resultRows** 里的下标；group / total 为 -1。
   *
   * [WHY 要带出来] 表格侧的行点击按「这条 tr 对应哪条数据」回调宿主（`z-row-click`）。
   * 视图行插进小计/总计后，tr 的序号与数据行序号不再一一对应；靠 `values` 反查
   * （indexOf / JSON 比对）在有重复行的报表上会**指到第一条**，且不报错。
   * 建树时顺手记下原始下标是唯一无歧义的来源。
   */
  sourceIndex: number;
  /** 列值：key = 维度条目（chart.rows 里的原串）/ 指标别名（measureKeyOf）/ 计算字段 key。 */
  values: Record<string, unknown>;
}

export interface GroupRowsOptions {
  /** 已折叠的组 key 集合。折叠组跳过其后代（组行本身仍保留）。 */
  collapsed?: ReadonlySet<string>;
  /** 是否输出父级小计行（缺省 true，对应 chart.showSubtotal）。 */
  subtotal?: boolean;
  /** 是否输出总计行（缺省 true，对应 chart.showGrandTotal）。 */
  grandTotal?: boolean;
}

/**
 * 分组渲染需要的**最小**定义 —— 不依赖 `ReportChart`。
 *
 * [WHY 要有这一层] 小计是**算出来的数**，它必须只有一个实现：报表查看、导出 CSV、
 * page 卡（`card kind=group-table`）三处消费者。原先这三处只有前两处能复用
 * `buildGroupRows`（它吃 `ReportChart`），page 卡那一侧干脆没有分组能力 ——
 * 同一份数据在「报表页」有分组小计、在「页面卡」只有平表，对账时才发现。
 * 抽象出 spec 后：`ReportChart` 经 `groupSpecOfChart()` 适配，page 卡直接构造 spec，
 * 落到的都是 `buildGroupRowsBySpec()` 这一份代码。
 *
 * [WHY agg 用 string 而不是 ReportMeasure["agg"] 联合] page 脚本里的聚合名与报表侧
 * 不是同一套字面量（`distinct` vs `countDistinct`），用窄联合只会逼调用方在边界上强转，
 * 强转的地方就是**口径漂移**开始的地方。归一只在 `normAgg()` 一处做。
 */
export interface GroupSpec {
  /** 分组维度字段名，按层级顺序（第 1 级在前）。 */
  dims: string[];
  /** 指标：结果行的键 + 聚合种类（小计怎么算由它决定）。 */
  measures: Array<{ key: string; agg?: string }>;
  /** 报表级计算字段（page 卡没有这个概念，留空）。 */
  computedFields?: ReportComputedField[];
  showSubtotal?: boolean;
  showGrandTotal?: boolean;
}

/** 报表图表配置 → GroupSpec。报表侧与 page 卡侧的**唯一**接缝。 */
export function groupSpecOfChart(chart: ReportChart): GroupSpec {
  return {
    dims: [...chart.rows],
    measures: (chart.measures ?? []).map((m) => ({ key: measureKeyOf(m), agg: m.agg })),
    computedFields: chart.computedFields,
    showSubtotal: chart.showSubtotal,
    showGrandTotal: chart.showGrandTotal,
  };
}

/**
 * 聚合种类归一：page 脚本写 `distinct`、报表侧写 `countDistinct`，是同一件事。
 * 认不出来的一律按 `sum`（与 page 侧 `aggregateRows` 的缺省一致）。
 */
function normAgg(agg: string | undefined): ReportMeasure["agg"] {
  const a = (agg ?? "sum").trim();
  if (a === "distinct") return "countDistinct";
  return a as ReportMeasure["agg"];
}

/** 组内小计：sum/count 累加、min/max 取极值。
 *
 *  [为什么 avg / countDistinct 返回 null] 它们**不能**从子级小计重算：
 *  avg 要的是 (Σ值 / Σ行数)，而子级交上来的已经是平均值，再平均一次会得到
 *  「各城市平均气温再平均」—— 门店数不同的组会明显偏。countDistinct 更是要原始集合。
 *  返回 null 由渲染层显示「—」：诚实占位 > 一个看起来合理的错数。 */
function subtotalOf(agg: ReportMeasure["agg"], vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  switch (agg) {
    case "sum":
    case "count": {
      const total = nums.reduce((a, b) => a + b, 0);
      // [WHY sum 要清理] 逐级累加是浮点尾巴的产生地（`1194.0000000000002`）。
      // 清理放在产生地而不是呈现层 —— 呈现层分不清真精度与噪声（issue IKQM8I）。
      return agg === "sum" ? cleanFloat(total) : total;
    }
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      return null;
  }
}

/** 计算字段的小计：含聚合调用（`SUM([x])`）无法在标量小计环境重算，改按 aggKindOf 汇总子级小计值。 */
function cfSubtotalOf(cf: ReportComputedField, childVals: (number | null)[]): number | null {
  const kind = aggKindOf(cf.expr);
  if (!kind) return null;
  return subtotalOf(kind, childVals);
}

const numOrNull = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface GroupTreeNode {
  /** 组键（维度值链，`\u0000` 分隔，防值内字符与分隔符冲突）。 */
  key: string;
  /** 1..rows.length（1 = 第一级维度）。 */
  depth: number;
  value: string | number | null;
  /** 叶子完整行（depth == rows.length 时才有）。 */
  leaf?: Record<string, unknown>;
  /** 叶子行在 resultRows 里的下标（渲染行带出去，见 GroupRenderRow.sourceIndex）。 */
  leafIndex?: number;
  children: GroupTreeNode[];
  /** 该组小计（指标别名 / 计算字段 key → 值；叶子 = 行值）。 */
  subtotal: Record<string, number | null>;
}

/** 构建分组树：按 result 行逐级归组，叶子存整行；自底向上算小计。 */
function buildGroupTree(spec: GroupSpec, resultRows: Record<string, unknown>[]): GroupTreeNode {
  const rows = spec.dims;
  const root: GroupTreeNode = { key: "", depth: 0, value: null, children: [], subtotal: {} };

  const postOrder = (node: GroupTreeNode): void => {
    if (node.depth === rows.length) {
      for (const m of spec.measures) node.subtotal[m.key] = numOrNull(node.leaf?.[m.key]);
      for (const cf of spec.computedFields ?? []) node.subtotal[cf.key] = numOrNull(node.leaf?.[cf.key]);
      return;
    }
    for (const c of node.children) postOrder(c);
    for (const m of spec.measures) {
      node.subtotal[m.key] = subtotalOf(normAgg(m.agg), node.children.map((c) => c.subtotal[m.key]));
    }
    for (const cf of spec.computedFields ?? []) {
      // 含聚合 → 子级小计值按聚合种类汇总；否则在小计环境里运行时求值
      if (cf.expr.includes("[") && exprHasAggCall(cf.expr)) {
        node.subtotal[cf.key] = cfSubtotalOf(cf, node.children.map((c) => c.subtotal[cf.key]));
      } else {
        node.subtotal[cf.key] = evalReportCf(cf, node.subtotal);
      }
    }
  };

  for (let ri = 0; ri < resultRows.length; ri++) {
    const r = resultRows[ri];
    let node = root;
    for (let d = 0; d < rows.length; d++) {
      // 只有 string/number 可作分组键：聚合 API 的 JSON 反序列化可能给出 null/对象
      const raw = r[rows[d]];
      const v: string | number | null = typeof raw === "string" || typeof raw === "number" ? raw : null;
      let child = node.children.find((c) => c.value === v);
      if (!child) {
        const key = node.key ? `${node.key}\u0000${String(v)}` : String(v);
        child = { key, depth: d + 1, value: v, children: [], subtotal: {} };
        node.children.push(child);
      }
      node = child;
    }
    node.leaf = r;
    node.leafIndex = ri;
  }

  postOrder(root);
  return root;
}

/** 展开分组树为渲染行：父级小计行 → 子级… → 总计行；折叠组跳过其后代。
 *
 *  [为什么 subtotal/grandTotal 也在这里] 这三行过滤原本散在 React 组件和导出两处，
 *  各写一份的后果是「导出比屏幕多一行总计」—— 用户对账时才发现，且无法判断哪边对。
 *  关掉小计行时总计行仍然要算（它来自根节点），所以「先都算出来再过滤」是对的。 */
export function buildGroupRows(
  chart: ReportChart,
  resultRows: Record<string, unknown>[],
  opts: GroupRowsOptions = {},
): GroupRenderRow[] {
  return buildGroupRowsBySpec(groupSpecOfChart(chart), resultRows, opts);
}

/**
 * 同 `buildGroupRows`，但吃 `GroupSpec` —— page 卡（`card kind=group-table`）走这个入口。
 *
 * [WHY 保留两个入口而不是改签名] `buildGroupRows(chart, …)` 已被报表查看、导出、
 * 25 个测试文件引用；改签名会让调用方各写一句 `groupSpecOfChart()`，而**适配写在哪，
 * 口径就漂在哪**。所以 chart 版留成薄壳，唯一实现在这里。
 */
export function buildGroupRowsBySpec(
  spec: GroupSpec,
  resultRows: Record<string, unknown>[],
  opts: GroupRowsOptions = {},
): GroupRenderRow[] {
  const rows = spec.dims;
  if (rows.length === 0 || resultRows.length === 0) return [];
  const collapsed = opts.collapsed ?? new Set<string>();
  const wantSubtotal = opts.subtotal ?? spec.showSubtotal ?? true;
  const wantTotal = opts.grandTotal ?? spec.showGrandTotal ?? true;
  const tree = buildGroupTree(spec, resultRows);

  const out: GroupRenderRow[] = [];
  const dimValsOf = (node: GroupTreeNode): Record<string, unknown> => {
    const vals: Record<string, unknown> = {};
    for (let d = 0; d < rows.length; d++) vals[rows[d]] = "";
    // 祖先值沿 key 链回溯：组行重复祖先值，单看一行也知道自己在哪个分支下
    const chain = node.key.split("\u0000");
    for (let d = 0; d < chain.length && d < rows.length; d++) vals[rows[d]] = chain[d];
    return vals;
  };

  const flatten = (node: GroupTreeNode): void => {
    if (node.depth === rows.length) {
      out.push({
        kind: "leaf",
        depth: node.depth,
        rowKey: `L:${node.key}`,
        groupKey: node.key,
        hasChildren: false,
        sourceIndex: node.leafIndex ?? -1,
        values: { ...(node.leaf ?? {}) },
      });
      return;
    }
    if (wantSubtotal) {
      out.push({
        kind: "group",
        depth: node.depth,
        rowKey: `G:${node.key}`,
        groupKey: node.key,
        hasChildren: node.children.length > 0,
        sourceIndex: -1,
        values: { ...dimValsOf(node), ...node.subtotal },
      });
    }
    if (collapsed.has(node.key)) return;
    for (const c of node.children) flatten(c);
  };

  for (const c of tree.children) flatten(c);

  if (wantTotal) {
    const totalVals: Record<string, unknown> = {};
    for (let d = 0; d < rows.length; d++) totalVals[rows[d]] = d === 0 ? "总计" : "";
    const total: Record<string, number | null> = {};
    for (const m of spec.measures) {
      total[m.key] = subtotalOf(normAgg(m.agg), tree.children.map((c) => c.subtotal[m.key]));
    }
    for (const cf of spec.computedFields ?? []) {
      if (cf.expr.includes("[") && exprHasAggCall(cf.expr)) {
        total[cf.key] = cfSubtotalOf(cf, tree.children.map((c) => c.subtotal[cf.key]));
      } else {
        total[cf.key] = evalReportCf(cf, total);
      }
    }
    out.push({
      kind: "total",
      depth: -1,
      rowKey: "TOTAL",
      groupKey: "TOTAL",
      hasChildren: false,
      sourceIndex: -1,
      values: { ...totalVals, ...total },
    });
  }

  return out;
}

// ---- 报表级计算字段在小计环境里的求值 ----

// 旧四则表达式的词法单元：标识符（聚合别名）/ 数字 / 运算符 / 其它（跳过）
const LEGACY_TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|[+\-*/()]|\s|./g;
const LEGACY_OPS = new Set(["+", "-", "*", "/", "(", ")"]);

/** 旧四则计算字段求值（受限语法：聚合别名 + 数字 + `+ - * /` 括号）。
 *
 *  未知标识符 / 除零 / 语法错 → null。**不做任何兜底求值**：小计里出现一个
 *  「大概对」的数字比显示「—」糟得多 —— 前者会被拿去汇报。 */
export function evalComputedExpr(expr: string, env: Record<string, number | null>): number | null {
  const toks: (number | string)[] = [];
  let m: RegExpExecArray | null;
  LEGACY_TOKEN_RE.lastIndex = 0;
  while ((m = LEGACY_TOKEN_RE.exec(expr))) {
    const t = m[0];
    if (/^\s$/.test(t)) continue;
    if (LEGACY_OPS.has(t)) toks.push(t);
    else if (/^[0-9]/.test(t)) toks.push(Number(t));
    else if (/^[A-Za-z_]/.test(t)) {
      const v = env[t];
      if (typeof v !== "number") return null; // 引用了不在小计环境的键 → 无法求值
      toks.push(v);
    }
    // 其余非法 token（编辑期已校验，这里保守跳过）
  }
  if (toks.length === 0) return null;

  let i = 0;
  const peek = () => toks[i];
  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = peek() as string;
      i++;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = peek() as string;
      i++;
      const r = parseFactor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const parseFactor = (): number => {
    const t = peek();
    if (t === "(") {
      i++;
      const v = parseExpr();
      if (peek() !== ")") throw new Error("syntax");
      i++;
      return v;
    }
    if (typeof t === "number") {
      i++;
      return t;
    }
    throw new Error("syntax");
  };
  try {
    const v = parseExpr();
    if (i !== toks.length) return null; // 有剩余 token = 表达式没被读完，语法不对
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** 报表级计算字段的小计/总计求值（小计环境 = 指标 key → 小计值）：
 *  - 旧四则（无 `[`）→ 按小计值求值（evalComputedExpr）；
 *  - 函数式：含聚合调用（无法从小计标量重算，与 avg/countDistinct 同类）或
 *    引用字段不在小计环境（如维度/行级字段）→ null；否则运行时求值 evalDatasetExpr。
 *
 *  注：调用方（buildGroupRows）已把含聚合 cf 分流到 cfSubtotalOf（按 aggKindOf 汇总
 *  子级小计值）；此处兜底语义供未分流场景与单测使用。 */
export function evalReportCf(cf: ReportComputedField, env: Record<string, number | null>): number | null {
  if (!cf.expr.includes("[")) return evalComputedExpr(cf.expr, env);
  if (exprHasAggCall(cf.expr)) return null;
  for (const r of extractFieldRefs(cf.expr)) {
    if (!Object.prototype.hasOwnProperty.call(env, r)) return null;
  }
  const v = evalDatasetExpr(cf.expr, env);
  return typeof v === "number" ? v : null;
}

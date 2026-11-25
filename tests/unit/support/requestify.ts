// 测试专用：把「卡片自带 dim/metric 定义 + `dataset=<数据集>`」的旧式 AST 提升成
// **请求模型**（`request` + 卡片只做选择）。
//
// [WHY 测试需要它，生产不需要] 2026-10-28 起卡片必须绑请求（ADR-005），但很多单测的
// 关注点不是语法，而是「order 有没有透出」「聚合签名是否区分」这类契约。让它们各自
// 手抄一遍 request 声明，等于把同一份脚手架复制二十遍 —— 抄错一处就变成「测试在测
// 另一件事」。所以这里做一次机械提升：定义搬进 request，卡片只留选择。
//
// [边界] 只搬运、不改语义：
//   · 卡片上的 `dim` / `metric` 子节点原样进 request（保留展示名与 agg），卡片侧换成
//     `dim <字段>` / `metric <指标名>` 的选择形态；
//   · `order` / `having` / `col` 留在卡片上（它们是卡片自己的展示意图）；
//   · 同一个数据集上的多张卡合并到同一条 request（同名指标口径不同则**抛错**，
//     因为那在真脚本里也是歧义）。
//
// 它不是兼容层：解析器、lint、loader 都不认识旧写法，只有测试构造 AST 时用它。

import { argStr, propStr, valueText, type PageNode, type PageValue, type PageRow } from "../../../src/page/syntax/ast.js";
import { createQueryPorts } from "../../../src/page/data/request-model.js";

const raw = (s: string): PageValue => ({ kind: "raw", str: s });
const str = (s: string): PageValue => ({ kind: "string", str: s });

/** `dim 日期 date` 的字段名（与 request-model.dimsOf 同一规则：有第二参数就取第二个）。 */
function dimField(n: PageNode): string {
  return argStr(n, 1) ?? argStr(n, 0) ?? "";
}

function metricKeyOf(n: PageNode): string {
  return argStr(n, 0) ?? "";
}

/** 指标口径指纹（用于发现「同名不同口径」）。 */
function metricSig(n: PageNode): string {
  return [argStr(n, 0), argStr(n, 1) ?? "", argStr(n, 2) ?? "", propStr(n, "expr") ?? ""].join("|");
}

function withProps(node: PageNode, patch: Record<string, PageValue | undefined>): PageNode {
  const entries = [...(node.props?.kind === "object" ? node.props.entries : [])].filter(
    (e) => !(e.key in patch),
  );
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) entries.push({ key, value });
  }
  return { ...node, props: { kind: "object", entries } };
}

/**
 * 就地（返回新树）把一页的卡片定义提升成 `request`。
 *
 * 返回的页面在**最前面**插入 request 声明（顺序按卡片出现顺序的首次出现），
 * 其余节点顺序不变 —— 版面断言（`col/row` 落点、tab 合并）不受影响。
 */
export function requestify(page: PageNode): PageNode {
  type Group = {
    name: string;
    address: string;
    dims: PageNode[];
    metrics: Map<string, PageNode>;
    filters: PageNode[];
  };
  const groups = new Map<string, Group>();
  const groupOfCard = new Map<PageNode, string>();

  const walkCards = (node: PageNode, fn: (n: PageNode) => void): void => {
    if (node.type === "card") fn(node);
    for (const c of node.children ?? []) walkCards(c, fn);
  };

  walkCards(page, (card) => {
    const ds = datasetTextOf(card);
    if (!ds) return;
    let g = groups.get(ds);
    if (!g) {
      g = { name: `r${groups.size + 1}`, address: ds, dims: [], metrics: new Map(), filters: [] };
      groups.set(ds, g);
    }
    groupOfCard.set(card, ds);
    for (const child of card.children ?? []) {
      if (child.type === "dim") {
        const field = dimField(child);
        if (field && !g.dims.some((d) => dimField(d) === field)) g.dims.push(child);
      } else if (child.type === "filter") {
        // 卡片上的 `filter` 是**已删除**的写法（静态条件属于请求）。测试里仍有几处用它
        // 验证「条件怎么翻译」，这里把它搬到请求上 —— 语义不变，位置合规。
        g.filters.push(child);
      } else if (child.type === "metric") {
        const key = metricKeyOf(child);
        if (!key) continue;
        const prev = g.metrics.get(key);
        if (prev && metricSig(prev) !== metricSig(child)) {
          throw new Error(`requestify: 指标 "${key}" 在同一份数据里有两种口径（${metricSig(prev)} / ${metricSig(child)}）`);
        }
        g.metrics.set(key, child);
      }
    }
  });

  if (!groups.size) return page;

  const rewrite = (node: PageNode): PageNode => {
    const ds = node.type === "card" ? datasetTextOf(node) : "";
    const g = ds ? groups.get(ds) : undefined;
    const children = (node.children ?? []).map(rewrite);
    if (!g || node.type !== "card") return { ...node, children };

    // 卡片只留「选择」：dim / metric 一个参数，order / having / col 原样；filter 已搬进请求
    const selected = children
      .filter((c) => c.type !== "filter")
      .map((c) => {
        if (c.type === "dim") return { ...c, args: [raw(dimField(c))], props: undefined } as PageNode;
        if (c.type === "metric") return { ...c, args: [str(metricKeyOf(c))], props: undefined } as PageNode;
        return c;
      });
    return withProps({ ...node, children: selected }, { dataset: raw(`$${g.name}`) });
  };

  const requests: PageNode[] = [];
  let line = 2;
  for (const g of groups.values()) {
    requests.push({
      type: "request",
      args: [raw(g.name)],
      children: [
        { type: "dataset", args: [raw(g.address)], children: [], line: line++ },
        ...g.filters.map((f) => ({ ...f })),
        ...g.dims.map((d) => ({ ...d })),
        ...[...g.metrics.values()].map((m) => ({ ...m })),
      ],
      line: line++,
    });
  }

  return { ...page, children: [...requests, ...(page.children ?? []).map(rewrite)] };
}

/** 卡片的 `dataset=` 原文（数字 id 也要读出来）。 */
function datasetTextOf(node: PageNode): string {
  const props = node.props?.kind === "object" ? node.props.entries : [];
  const hit = props.find((e) => e.key === "dataset") ?? props.find((e) => e.key === "from");
  if (!hit) return "";
  return valueText(hit.value);
}

// ─────────────────────────────────────────────────────────────
// 渲染上下文：按**请求名**给行，内部换算成取数键
// ─────────────────────────────────────────────────────────────

/**
 * 造一份渲染上下文：`rows` 按**请求名**给（`{ materialDetail: [row] }`），
 * 内部用真实的 `createQueryPorts` 换算成取数键。
 *
 * [WHY 不让测试自己写键] 键是请求指纹（`dataset:342#|销售额:sum:amount|0|f|...`），
 * 手写等于把被测实现抄一遍 —— 实现变了测试跟着变，永远是绿的。按请求名给行、
 * 由端口换算，测试才在验「渲染层能不能按同一个键查到行」。
 *
 * 同时把三个端口（`requestKeyOf` / `partsOf` / `requestKeyOfName`）一起塞进 ctx：
 * 渲染层缺端口时会自己补一份，但补的那份不知道测试注入的行是按请求名给的。
 */
export function ctxForRender(
  page: PageNode,
  rows: Record<string, import("../../../src/page/syntax/ast.js").PageRow[]>,
  extra: Record<string, unknown> = {},
): import("../../../src/page/render/render.js").PageRenderContext {
  const ports = createQueryPorts(page);
  const sources = new Map<string, { rows: import("../../../src/page/syntax/ast.js").PageRow[] }>();
  const put = (key: string, name: string): void => {
    const picked = rows[name];
    if (key && picked) sources.set(key, { rows: picked });
  };
  const nameOf = (node: PageNode): string => {
    const ds = datasetTextOf(node);
    return ds.startsWith("$") ? ds.slice(1) : "";
  };
  const visit = (node: PageNode): void => {
    if (node.type === "card") put(ports.requestKeyOf(node), nameOf(node));
    // 容器（head / props）用的是请求的全投影键
    else if (node.type === "head" || node.type === "props") put(ports.requestKeyOfName(nameOf(node)), nameOf(node));
    for (const c of node.children ?? []) visit(c);
  };
  visit(page);
  // 另按请求名再放一份：`rowsByName` 的退路仍然可用（编辑器的 setSources 就是这种形态）
  for (const [name, picked] of Object.entries(rows)) sources.set(name, { rows: picked });
  return {
    sources,
    requestKeyOf: ports.requestKeyOf,
    partsOf: ports.partsOf,
    requestKeyOfName: ports.requestKeyOfName,
    ...extra,
  } as import("../../../src/page/render/render.js").PageRenderContext;
}

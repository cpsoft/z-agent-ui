// 报表卡与分组表的示例接线（report.html 的「卡片」与「分组表」两段）。
// `<z-report-card>` 自己取数，这里实现四个必填方法的内存版：数据是常量，聚合本地算。
import "../../src/report/elements/index.js";
import "../../src/report/table/index.js";

/** 明细行：门店 × 品类的日销。 */
const ROWS = [
  { store: "上海静安嘉里", category: "现制茶饮", sales: 4820.5, orders: 61 },
  { store: "上海静安嘉里", category: "烘焙", sales: 1960.0, orders: 27 },
  { store: "杭州湖滨银泰", category: "现制茶饮", sales: 4155.0, orders: 54 },
  { store: "杭州湖滨银泰", category: "烘焙", sales: 1645.0, orders: 22 },
  { store: "南京德基", category: "现制茶饮", sales: 3602.5, orders: 47 },
];

/**
 * 聚合请求体。字段名是 `dimensions` 而不是 `rows` —— 用错名字不会报错，
 * 只会得到「一个分组、一行数据」，看起来像「表格卡只显示合计」。
 * （2026-11-15 实测踩过：写 `body.rows` 时表格卡只剩一行总数。）
 */
interface AggBody {
  dimensions?: string[];
  measures?: Array<{ field: string; agg: string; alias?: string }>;
}

/** 指标键：与 core/report-kpi 的 measureKeyOf 同一条规则（alias 优先）。 */
function keyOf(m: { field: string; agg: string; alias?: string }): string {
  return m.alias || `${m.agg}_${m.field}`;
}

const dataSource = {
  async getDatasetMeta() {
    // 列元数据用的是 `Column`（name + dataType + 语义类型），
    // 不是「name + kind」。少了 dataType 的维度列会被当成不可渲染列直接丢掉 ——
    // 表现是「表格卡只有指标列，维度列不见了」，而没有任何报错。
    return [
      { name: "store", alias: "门店", dataType: "varchar", semanticType: "text" },
      { name: "category", alias: "品类", dataType: "varchar", semanticType: "text" },
      { name: "sales", alias: "销售额", dataType: "decimal", semanticType: "number" },
      { name: "orders", alias: "订单数", dataType: "int", semanticType: "number" },
    ];
  },

  async aggregateDataset(_datasetId: number, body: AggBody) {
    const dims = body.dimensions ?? [];
    const measures = body.measures ?? [];
    const groups = new Map<string, Record<string, unknown>>();

    for (const r of ROWS as Array<Record<string, unknown>>) {
      const key = dims.map((d) => String(r[d])).join("\u0000");
      const bucket = groups.get(key) ?? Object.fromEntries(dims.map((d) => [d, r[d]]));
      for (const m of measures) {
        const k = keyOf(m);
        bucket[k] = ((bucket[k] as number) ?? 0) + Number(r[m.field] ?? 0);
      }
      groups.set(key, bucket);
    }

    return {
      // 列上同时给 name（维度名 / 指标键）与 kind —— 表格卡靠它决定哪列右对齐
      columns: [
        ...dims.map((d) => ({ name: d, kind: "dimension" as const })),
        ...measures.map((m) => ({ name: keyOf(m), kind: "measure" as const, agg: m.agg, field: m.field })),
      ],
      rows: [...groups.values()],
      total: groups.size,
    };
  },

  async fetchDatasetDetail() {
    return { rows: ROWS as Array<Record<string, unknown>>, total: ROWS.length };
  },

  async searchDatasetValues(_id: number, field: string, q: string) {
    const values = [...new Set(ROWS.map((r) => String((r as Record<string, unknown>)[field] ?? "")))];
    return { field, q, values: values.filter((v) => !q || v.includes(q)) };
  },
};

/** 一张卡的最小配置：报表配置是 `chart` 对象（属性，不是 attribute）。 */
function chart(patch: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "c1",
    title: "",
    datasetId: 1,
    rows: [],
    measures: [],
    filters: [],
    chartType: "table",
    limit: 1000,
    ...patch,
  };
}

const host = document.getElementById("report-cards");
if (host) {
  const cards = [
    chart({
      id: "c-kpi",
      chartType: "kpi",
      title: "销售额（今日）",
      measures: [{ field: "sales", agg: "sum", alias: "销售额" }],
    }),
    chart({
      id: "c-table",
      chartType: "table",
      title: "门店 × 品类",
      rows: ["store", "category"],
      measures: [
        { field: "sales", agg: "sum", alias: "销售额" },
        { field: "orders", agg: "sum", alias: "订单数" },
      ],
    }),
    chart({
      id: "c-detail",
      chartType: "detail-table",
      title: "明细（前 5 行）",
      // 明细卡的展示列 = rows + measures（不聚合，逐行）。rows 为空时只剩指标列。
      rows: ["store", "category"],
      measures: [
        { field: "sales", agg: "sum", alias: "销售额" },
        { field: "orders", agg: "sum", alias: "订单数" },
      ],
    }),
  ];

  for (const [i, c] of cards.entries()) {
    const el = document.createElement("z-report-card");
    // 明细卡列多，占满一行
    if (i === 2) el.className = "ex-card-wide";
    // chart 是 Object 属性（attribute: false）：
    // 配置里有函数式表达式与嵌套结构，塞进 attribute 只能变成 "[object Object]"。
    (el as unknown as { chart: unknown }).chart = c;
    (el as unknown as { dataSource: unknown }).dataSource = dataSource;
    el.setAttribute("show-title", "");
    host.appendChild(el);
  }
}

// ── 分组表（@deprecated，但宿主还在用）──────────────────────
//
// 这个元素 2026-10-26 起标了 @deprecated（能力并入 `<z-report-table group>`），
// 但已发布的 React 包装与宿主页面里仍有手写标签。**不演示 ≠ 它不存在**：把它藏起来，
// 那些还写着 `<z-report-group-table>` 的人就找不到「它长什么样、和我现在看到的是不是一回事」。
// 页面上同时给出新写法（report-table 的 group 属性），迁移方向是明确的。
const groupHost = document.getElementById("report-group-host");
if (groupHost) {
  const el = document.createElement("z-report-group-table");
  const gchart = chart({
    id: "g1",
    chartType: "group-table",
    rows: ["store"],
    measures: [
      { field: "sales", agg: "sum", alias: "销售额" },
      { field: "orders", agg: "sum", alias: "订单数" },
    ],
    showSubtotal: true,
    showGrandTotal: true,
  });
  (el as unknown as { chart: unknown }).chart = gchart;
  // 分组表的列是宿主给的（`ReportTableColumn[]`），它不从 chart 推。
  // 不给 columns 时渲染的是空态文案 —— 页面看起来「加载失败」，其实只是少了一个属性。
  (el as unknown as { columns: unknown }).columns = [
    { key: "store", title: "门店", isDim: true },
    { key: "销售额", title: "销售额", numeric: true, align: "right" },
    { key: "订单数", title: "订单数", numeric: true, align: "right" },
  ];
  (el as unknown as { rows: unknown }).rows = [
    { store: "上海静安嘉里", 销售额: 6780.5, 订单数: 88 },
    { store: "杭州湖滨银泰", 销售额: 5800, 订单数: 76 },
    { store: "南京德基", 销售额: 3602.5, 订单数: 47 },
  ];
  groupHost.appendChild(el);
}

// print.html 的接线：报表数据 + 打印动作 + 页码档位。
//
// 这个页面的验收标准是「A4 上分成 2 页、每页都有表头」——
// 行数必须稳定，否则每次刷新页数都变，抽查结论不可复现。

import "../../src/app/print/index.js";
import "../../src/report/table/index.js";
import "../../src/components/button/index.js";

type PrintEl = HTMLElement & {
  print(): void;
  pageFormat: "page-of-total" | "page" | "none";
};

const CITIES = ["杭州", "宁波", "苏州", "南京", "合肥", "上海"];
const STORES = [
  "湖滨银泰", "武林广场", "钱江新城", "西溪印象", "滨江天街",
  "鄞州万达", "海曙天一", "江北来福士", "园区印象城", "姑苏观前",
  "吴中万达", "江宁百家湖", "建邺金鹰", "蜀山万象", "包河万达",
  "静安嘉里", "徐汇日月光", "陆家嘴中心", "五角场合生汇", "虹桥天地",
];

const rows = Array.from({ length: 46 }, (_, i) => {
  const base = 180000 + ((i * 7919) % 24) * 12500;
  const orders = 620 + ((i * 37) % 480);
  return {
    store: `${CITIES[i % CITIES.length]}·${STORES[i % STORES.length]}${i >= 20 ? "二店" : ""}`,
    city: CITIES[i % CITIES.length],
    sales: base,
    orders,
    avg: Math.round(base / orders),
    rate: Number((0.78 + ((i * 13) % 21) / 100).toFixed(3)),
  };
});

const table = document.getElementById("p-table") as HTMLElement & {
  columns: unknown[];
  data: unknown[];
  pageSize: number;
};

table.columns = [
  { key: "store", title: "门店", width: "200px", fixed: "left", sortable: true, required: true },
  { key: "city", title: "城市", width: "90px" },
  { key: "sales", title: "销售额", width: "120px", align: "right", sortable: true,
    render: (v: number) => "¥" + v.toLocaleString(),
    footer: (data: Array<{ sales: number }>) => "¥" + data.reduce((s, r) => s + r.sales, 0).toLocaleString() },
  { key: "orders", title: "订单数", width: "100px", align: "right", sortable: true,
    footer: (data: Array<{ orders: number }>) => data.reduce((s, r) => s + r.orders, 0).toLocaleString() },
  { key: "avg", title: "客单价", width: "100px", align: "right",
    render: (v: number) => "¥" + v.toLocaleString() },
  { key: "rate", title: "完成率", width: "100px", align: "right",
    render: (v: number) => (v * 100).toFixed(1) + "%" },
];
table.data = rows;
// 打印要一次出全量：分页器在纸面上是脏东西，而「只印 20 条」会变成纸面上的既成事实
table.pageSize = 0;

const demo = document.getElementById("p-demo") as PrintEl;
const status = document.getElementById("p-status")!;

document.getElementById("p-print")!.addEventListener("z-click", () => {
  demo.print();
});

const formats: Array<[string, PrintEl["pageFormat"], string]> = [
  ["p-fmt-page", "page", "页码：仅当前页"],
  ["p-fmt-none", "none", "页码：不要"],
  ["p-fmt-all", "page-of-total", "页码：1 / 3"],
];
for (const [id, fmt, text] of formats) {
  document.getElementById(id)!.addEventListener("z-click", () => {
    demo.pageFormat = fmt;
    status.textContent = text;
  });
}

// 打印前把「本次要印多少行」告诉用户 —— 页面上看不到纸面分页，先给个预期
demo.addEventListener("z-before-print", () => {
  status.textContent = `正在打印：${rows.length} 行 · 页眉页脚每页重复`;
});

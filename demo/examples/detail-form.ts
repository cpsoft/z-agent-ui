// 详情表单与属性面板的示例接线（app.html）。
//
// 这两个域都靠 JS 属性传结构（`fields` / 子节点都是 `attribute: false`），
// 写在 HTML 里只会得到 `[object Object]` —— 所以接线放在这里。
//
// 它们原先只在「页面脚本渲染成表单」那一页出现，而那一页属于页面引擎仓库。
// 组件库自己也得有它们的例子：`z-detail-form` 是 L2 应用件里唯一「一屏就是一个表单」的组件。
import "../../src/app/detail-form/index.js";
import "../../src/property/index.js";
import type { ZDetailFormField } from "../../src/app/detail-form/index.js";

const FIELDS: ZDetailFormField[] = [
  { name: "storeName", label: "门店名称", required: true, placeholder: "如：西湖店" },
  {
    name: "city",
    label: "城市",
    type: "select",
    options: [
      { value: "hz", label: "杭州" },
      { value: "sh", label: "上海" },
      { value: "nj", label: "南京" },
    ],
  },
  { name: "contact", label: "联系人", group: "联系信息" },
  { name: "phone", label: "联系电话", group: "联系信息", hint: "手机或座机" },
  { name: "remark", label: "备注", group: "联系信息", span: true, placeholder: "选填" },
];

const form = document.getElementById("detail-form") as
  | (HTMLElement & { fields: ZDetailFormField[]; value: Record<string, unknown> })
  | null;
const log = document.getElementById("detail-form-log");

if (form) {
  form.fields = FIELDS;
  form.value = { storeName: "西湖店", city: "hz" };
  form.addEventListener("z-change", (e) => {
    const detail = (e as CustomEvent<{ name?: string; value?: unknown }>).detail;
    if (log) log.textContent = `z-change：${detail?.name} = ${JSON.stringify(detail?.value)}`;
  });
  form.addEventListener("z-submit", (e) => {
    const detail = (e as CustomEvent<{ value?: Record<string, unknown> }>).detail;
    if (log) log.textContent = `z-submit：${JSON.stringify(detail?.value)}`;
  });
}

// 属性面板：`z-property-panel` 是壳，`z-property-group` 分组，`z-property-row` 是一行
// 「标签 + 控件」。控件由使用者放进 row 的默认 slot —— 面板不猜编辑什么。
const panel = document.getElementById("property-panel-demo");
if (panel) {
  const rows: Array<[string, string]> = [
    ["宽度", "320"],
    ["高度", "auto"],
    ["圆角", "8"],
  ];
  for (const [label, val] of rows) {
    const row = document.createElement("z-property-row");
    row.setAttribute("label", label);
    const input = document.createElement("input");
    input.className = "demo-prop-input";
    input.value = val;
    input.setAttribute("aria-label", label);
    row.appendChild(input);
    panel.querySelector("z-property-group")?.appendChild(row);
  }
}

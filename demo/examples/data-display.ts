// 从旧分类页 data-display 搬来的示例与接线。
// 五页的接线各自用了同名变量
// （selectEl / radioGroup / ...），并到一个模块里就是重名错误；拆成模块则天然隔离。
// 每个模块只管「把自己那几个示例接上」，壳（侧栏/主题/语言）由页面统一 initShell。

  // Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/components/table/index.js";
  import "../../src/components/badge/index.js";
  import "../../src/components/card/index.js";
  import "../../src/components/tag/index.js";
  import "../../src/components/avatar/index.js";
  import "../../src/components/divider/index.js";
  import "../../src/components/embed/index.js";
  import "../../src/components/tree/index.js";
  import "../../src/components/tree-node/index.js";
  import { ZToast } from "../../src/components/toast/index.js";
  import { t } from "../i18n.js";

  // ── Table ─────────────────────────────────────────────

  const tableEl = document.getElementById("table-demo");
  tableEl.columns = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "role", header: "Role", sortable: true, align: "center" },
    { key: "status", header: "Status", align: "center" },
    {
      key: "ops",
      header: t("table.actions"),
      align: "center",
      // 操作列: render 返回 HTML 不转义, 事件经 shadow 冒泡, 监听 z-click 即可, 见 [[REQ-001]]
      render: (_v, row) =>
        `<span class="z-table__btn-group">` +
        `<z-button size="sm" variant="outline" data-action="edit" data-id="${row.name}">${t("table.edit")}</z-button>` +
        `<z-button size="sm" variant="danger" data-action="delete" data-id="${row.name}">${t("table.delete")}</z-button>` +
        `<z-button size="sm" variant="ghost" data-action="view" data-id="${row.name}" title="View">` +
        `<span slot="prefix"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>` +
        `</z-button>` +
        `</span>`,
    },
  ];
  tableEl.data = [
    { name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active" },
    { name: "Bob Smith", email: "bob@example.com", role: "Editor", status: "Active" },
    { name: "Carol White", email: "carol@example.com", role: "Viewer", status: "Inactive" },
    { name: "Dave Brown", email: "dave@example.com", role: "Editor", status: "Active" },
    { name: "Eve Davis", email: "eve@example.com", role: "Viewer", status: "Active" },
  ];

  // 操作列按钮事件: z-button 的 z-click 经 shadow 冒泡到 z-table, 再冒泡到页面
  tableEl.addEventListener("z-click", (e) => {
    const tgt = e.target;
    const action = tgt.getAttribute("data-action");
    const id = tgt.getAttribute("data-id");
    if (!action) return;
    ZToast.show({ type: "info", message: `${action}: ${id}` });
  });

  document.getElementById("table-striped").addEventListener("z-click", () => {
    tableEl.striped = !tableEl.striped;
  });
  document.getElementById("table-bordered").addEventListener("z-click", () => {
    tableEl.bordered = !tableEl.bordered;
  });
  document.getElementById("table-size").addEventListener("z-click", () => {
    tableEl.size = tableEl.size === "sm" ? "md" : "sm";
  });

  // ── Tag ────────────────────────────────────────────────

  const tagCloseVal = document.getElementById("tag-value");
  document.getElementById("tag-closable-demo").addEventListener("z-close", () => {
    tagCloseVal.textContent = "Tag closed!";
  });

  // ── Tree ────────────────────────────────────────────────

  const treeDemo = document.getElementById("tree-demo");
  const treeVal = document.getElementById("tree-value");

  treeDemo.addEventListener("z-change", (e) => {
    const d = e.detail;
    const labels = d.selected.map((n) => n.label).join(", ");
    treeVal.textContent = labels ? `Selected: ${labels}` : "Selected: (none)";
  });

  treeDemo.addEventListener("z-expand", (e) => {
    const d = e.detail;
    console.log(`Node "${d.node.label}" ${d.open ? "expanded" : "collapsed"}`);
  });

  document.getElementById("tree-multi").addEventListener("z-click", () => {
    treeDemo.multiple = !treeDemo.multiple;
    document.getElementById("tree-multi").textContent =
      treeDemo.multiple ? "单选模式" : "多选模式";
  });

  document.getElementById("tree-cascade").addEventListener("z-click", () => {
    treeDemo.cascade = !treeDemo.cascade;
    document.getElementById("tree-cascade").textContent =
      treeDemo.cascade ? "取消级联" : "级联选择";
  });

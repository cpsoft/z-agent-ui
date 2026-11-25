// 从 report-table.html 原样搬来的接线（原为独立页，D3 起作为 report.html 的一段）。
// 壳（语言/主题切换、返回按钮）由页面统一提供，这里原本自己绑的那些已经剥掉 ——
// 两边都绑会出现「点一次切两次」= 看起来没反应。
// 内联脚本有两个坑：(1) 浏览器按 JS 解析，写 TS 语法（`: void`）会整段拒绝执行，
// 表现为整页无侧边栏（shell 没跑起来）且只有 pageerror、console 一片安静；
// (2) 无法被 tsc / eslint 覆盖。抽成 .ts 后两者都解决。

  import "../../src/theme/index.js";
  import "../../src/components/button/index.js";
  import "../../src/components/badge/index.js";
  import "../../src/report/table/index.js";
  // 内容槽的两个示例元素（同一份定义甘特段也用）
  import "./cells.js";
  import { themeController } from "../../src/theme/index.js";
  // cell 元素在 ./cells.ts（继承 BaseCell，只写 render）
  import { getLang, setLang, updatePage, t } from "../i18n.js";


  // Track dynamic state for language switching
  let selEnabled = false;
  let lastSortState = [];
  let lastSelCount = 0;
  let lastColVisMsg = "";
  let lastRowMsg = "";
  let editEnabled = false;
  let serverSort = false;
  let serverTimer = null;

  function updateDynamicTexts() {
    updatePage();
    const selBtn = document.getElementById("rpt-sel-toggle");
    if (selBtn) selBtn.textContent = selEnabled ? t("reportTable.disableSelection") : t("reportTable.enableSelection");
    const editBtn = document.getElementById("rpt-edit-toggle");
    if (editBtn) editBtn.textContent = editEnabled ? t("reportTable.disableEdit") : t("reportTable.enableEdit");
    const sortModeBtn = document.getElementById("rpt-sort-mode");
    if (sortModeBtn) sortModeBtn.textContent = serverSort ? t("reportTable.clientSort") : t("reportTable.serverSort");
    applySortInfo();
    if (lastSelCount > 0) {
      rptSelInfo.textContent = t("reportTable.selected") + ": " + lastSelCount + " row(s)";
    }
    if (lastColVisMsg) {
      rptColInfo.textContent = lastColVisMsg;
    }
    if (lastRowMsg) {
      rptRowInfo.textContent = lastRowMsg;
    }
  }

  function applySortInfo() {
    if (lastSortState.length === 0) {
      rptSortInfo.textContent = t("reportTable.sortNone");
    } else {
      const parts = lastSortState.map((s, i) => {
        const prefix = lastSortState.length > 1 ? "[" + (i + 1) + "] " : "";
        return prefix + s.key + " " + (s.dir === "asc" ? "↑" : "↓");
      });
      rptSortInfo.textContent = "Sort: " + parts.join(", ");
    }
  }

  // ── Full Sales Report Demo ──
  const rpt = document.getElementById("rpt-sales");
  const rptSortInfo = document.getElementById("rpt-sort-info");
  const rptSelInfo = document.getElementById("rpt-sel-info");
  const rptColInfo = document.getElementById("rpt-col-info");
  const rptRowInfo = document.getElementById("rpt-row-info");

  rpt.columns = [
    // required: 产品列必选, 列选择器中不可取消勾选
    { key: "product", title: "Product", fixed: "left", width: "150px", sortable: true, required: true },
    { key: "category", title: "Category", sortable: true, width: "110px" },
    { key: "q1_units", title: "Q1 Units", sortable: true, width: "100px", align: "right" },
    { key: "q1_rev", title: "Q1 Revenue", sortable: true, width: "130px", align: "right",
      render: (v) => "$" + v.toLocaleString(),
      footer: (data) => "$" + data.reduce((s, r) => s + Number(r.q1_rev), 0).toLocaleString() },
    { key: "q2_units", title: "Q2 Units", sortable: true, width: "100px", align: "right" },
    { key: "q2_rev", title: "Q2 Revenue", sortable: true, width: "130px", align: "right",
      render: (v) => "$" + v.toLocaleString(),
      footer: (data) => "$" + data.reduce((s, r) => s + Number(r.q2_rev), 0).toLocaleString() },
    { key: "q3_units", title: "Q3 Units", sortable: true, width: "100px", align: "right" },
    { key: "q3_rev", title: "Q3 Revenue", sortable: true, width: "130px", align: "right",
      render: (v) => "$" + v.toLocaleString(),
      footer: (data) => "$" + data.reduce((s, r) => s + Number(r.q3_rev), 0).toLocaleString() },
    { key: "q4_units", title: "Q4 Units", sortable: true, width: "100px", align: "right" },
    { key: "q4_rev", title: "Q4 Revenue", sortable: true, width: "130px", align: "right",
      render: (v) => "$" + v.toLocaleString(),
      footer: (data) => "$" + data.reduce((s, r) => s + Number(r.q4_rev), 0).toLocaleString() },
  ];
  rpt.data = [
    { product: "Widget A", category: "Widgets", q1_units: 1234, q1_rev: 24680, q2_units: 1456, q2_rev: 29120, q3_units: 1100, q3_rev: 22000, q4_units: 980, q4_rev: 19600 },
    { product: "Widget B", category: "Widgets", q1_units: 987, q1_rev: 19740, q2_units: 1102, q2_rev: 22040, q3_units: 890, q3_rev: 17800, q4_units: 1200, q4_rev: 24000 },
    { product: "Widget C", category: "Widgets", q1_units: 654, q1_rev: 32700, q2_units: 789, q2_rev: 39450, q3_units: 567, q3_rev: 28350, q4_units: 432, q4_rev: 21600 },
    { product: "Gadget X", category: "Gadgets", q1_units: 2100, q1_rev: 10500, q2_units: 1890, q2_rev: 9450, q3_units: 2300, q3_rev: 11500, q4_units: 1980, q4_rev: 9900 },
    { product: "Gadget Y", category: "Gadgets", q1_units: 543, q1_rev: 27150, q2_units: 621, q2_rev: 31050, q3_units: 498, q3_rev: 24900, q4_units: 556, q4_rev: 27800 },
    { product: "Tool Pro", category: "Tools", q1_units: 321, q1_rev: 48150, q2_units: 298, q2_rev: 44700, q3_units: 345, q3_rev: 51750, q4_units: 289, q4_rev: 43350 },
    { product: "Tool Lite", category: "Tools", q1_units: 876, q1_rev: 17520, q2_units: 920, q2_rev: 18400, q3_units: 789, q3_rev: 15780, q4_units: 654, q4_rev: 13080 },
    // 演示行数: maxHeight=320px 下表体纵向滚动, 表头冻结可见
    { product: "Widget D", category: "Widgets", q1_units: 745, q1_rev: 14900, q2_units: 810, q2_rev: 16200, q3_units: 690, q3_rev: 13800, q4_units: 720, q4_rev: 14400 },
    { product: "Widget E", category: "Widgets", q1_units: 1120, q1_rev: 22400, q2_units: 980, q2_rev: 19600, q3_units: 1050, q3_rev: 21000, q4_units: 890, q4_rev: 17800 },
    { product: "Gadget Z", category: "Gadgets", q1_units: 1567, q1_rev: 78350, q2_units: 1420, q2_rev: 71000, q3_units: 1610, q3_rev: 80500, q4_units: 1490, q4_rev: 74500 },
    { product: "Tool Max", category: "Tools", q1_units: 468, q1_rev: 70200, q2_units: 510, q2_rev: 76500, q3_units: 440, q3_rev: 66000, q4_units: 495, q4_rev: 74250 },
    { product: "Tool Mini", category: "Tools", q1_units: 1230, q1_rev: 24600, q2_units: 1150, q2_rev: 23000, q3_units: 1280, q3_rev: 25600, q4_units: 1190, q4_rev: 23800 },
  ];

  // ── 外部配置持久化演示: 存 localStorage, 存服务器同理(监听 z-config-change 提交接口) ──
  // v2: 快照新增 fixed 字段, 升级键避免旧快照(无 fixed)解冻 product 列
  const CFG_KEY = "rpt-sales-config-v2";
  const saveCfg = () => localStorage.setItem(CFG_KEY, JSON.stringify(rpt.getConfig()));
  const savedCfg = localStorage.getItem(CFG_KEY);
  if (savedCfg) {
    try { rpt.applyConfig(JSON.parse(savedCfg)); } catch (e) { console.warn("invalid saved config", e); }
  }
  // 组件内 UI 变更(列配置/排序)经 z-config-change 保存; 外观切换在组件外, 由切换按钮调 saveCfg
  rpt.addEventListener("z-config-change", (e) => {
    localStorage.setItem(CFG_KEY, JSON.stringify(e.detail.config));
  });
  document.getElementById("rpt-reset-config").addEventListener("z-click", () => {
    localStorage.removeItem(CFG_KEY);
    location.reload();
  });

  rpt.addEventListener("z-sort", (e) => {
    lastSortState = e.detail.sortState;
    applySortInfo();
    // server 模式演示: 模拟后端请求, 延迟返回排序后的数据; client 模式由组件自行排序
    if (serverSort) {
      rptSortInfo.textContent = t("reportTable.sortingServer");
      if (serverTimer) clearTimeout(serverTimer);
      serverTimer = setTimeout(() => {
        const st = e.detail.sortState;
        let rows = [...rpt.data];
        if (st.length) {
          rows.sort((a, b) => {
            for (const { key, dir } of st) {
              const av = a[key], bv = b[key];
              if (av == null && bv == null) continue;
              if (av == null) return 1;
              if (bv == null) return -1;
              const cmp = av < bv ? -1 : av > bv ? 1 : 0;
              if (cmp) return dir === "desc" ? -cmp : cmp;
            }
            return 0;
          });
        }
        rpt.data = rows;
        applySortInfo();
      }, 400);
    }
  });
  rpt.addEventListener("z-selection-change", (e) => {
    const keys = e.detail.selectedKeys;
    lastSelCount = keys.length;
    rptSelInfo.textContent = keys.length ? "Selected: " + keys.length + " row(s)" : "";
  });
  rpt.addEventListener("z-column-visibility-change", (e) => {
    const { key, visible } = e.detail;
    lastColVisMsg = visible ? '"' + key + '" shown' : '"' + key + '" hidden';
    rptColInfo.textContent = lastColVisMsg;
    setTimeout(() => { rptColInfo.textContent = ""; lastColVisMsg = ""; }, 2000);
  });
  // 行点击演示: 模拟列表页"点行打开详情"; 行内交互元素(z-* 组件等)不触发, 见 issue IKD6L8
  rpt.addEventListener("z-row-click", (e) => {
    lastRowMsg = "Row #" + e.detail.index + ": " + e.detail.row.product + " clicked";
    rptRowInfo.textContent = lastRowMsg;
    setTimeout(() => { rptRowInfo.textContent = ""; lastRowMsg = ""; }, 2000);
  });

  document.getElementById("rpt-edit-toggle").addEventListener("z-click", function () {
    rpt.editable = !rpt.editable;
    editEnabled = rpt.editable;
    this.textContent = editEnabled ? t("reportTable.disableEdit") : t("reportTable.enableEdit");
  });
  rpt.addEventListener("z-column-order-change", (e) => {
    rptColInfo.textContent = "Order: " + e.detail.keys.join(" → ");
    setTimeout(() => { rptColInfo.textContent = ""; }, 2000);
  });

  document.getElementById("rpt-sort-mode").addEventListener("z-click", function () {
    serverSort = !serverSort;
    rpt.sortMode = serverSort ? "server" : "client";
    this.textContent = serverSort ? t("reportTable.clientSort") : t("reportTable.serverSort");
  });

  document.getElementById("rpt-sel-toggle").addEventListener("z-click", function () {
    rpt.selectable = !rpt.selectable;
    selEnabled = rpt.selectable;
    this.textContent = selEnabled ? t("reportTable.disableSelection") : t("reportTable.enableSelection");
  });
  document.getElementById("rpt-striped").addEventListener("z-click", () => { rpt.striped = !rpt.striped; saveCfg(); });
  document.getElementById("rpt-bordered").addEventListener("z-click", () => { rpt.bordered = !rpt.bordered; saveCfg(); });
  document.getElementById("rpt-size").addEventListener("z-click", () => { rpt.size = rpt.size === "sm" ? "md" : "sm"; saveCfg(); });

  // ── Chinese Financial Report Demo ──
  const rptCn = document.getElementById("rpt-cn");
  rptCn.columns = [
    { key: "seq", title: "序号", width: "56px", align: "center", render: (_v, _r, i) => String(i + 1) },
    { key: "product", title: "产品", fixed: "left", width: "120px", sortable: true },
    { key: "category", title: "类别", width: "90px", sortable: true },
    { key: "q1", title: "一季度金额", sortable: true, width: "110px", align: "right",
      render: (v) => "¥" + v.toLocaleString(),
      footer: (data) => "¥" + data.reduce((s, r) => s + Number(r.q1), 0).toLocaleString() },
    { key: "q2", title: "二季度金额", sortable: true, width: "110px", align: "right",
      render: (v) => "¥" + v.toLocaleString(),
      footer: (data) => "¥" + data.reduce((s, r) => s + Number(r.q2), 0).toLocaleString() },
    { key: "q3", title: "三季度金额", sortable: true, width: "110px", align: "right",
      render: (v) => "¥" + v.toLocaleString(),
      footer: (data) => "¥" + data.reduce((s, r) => s + Number(r.q3), 0).toLocaleString() },
    { key: "q4", title: "四季度金额", sortable: true, width: "110px", align: "right",
      render: (v) => "¥" + v.toLocaleString(),
      footer: (data) => "¥" + data.reduce((s, r) => s + Number(r.q4), 0).toLocaleString() },
    { key: "total", title: "全年合计", sortable: true, width: "120px", align: "right",
      render: (v) => "¥" + v.toLocaleString(),
      footer: (data) => "¥" + data.reduce((s, r) => s + Number(r.total), 0).toLocaleString() },
  ];
  rptCn.data = [
    { product: "甲产品", category: "A 类", q1: 246800, q2: 291200, q3: 220000, q4: 196000, total: 954000 },
    { product: "乙产品", category: "A 类", q1: 197400, q2: 220400, q3: 178000, q4: 240000, total: 835800 },
    { product: "丙产品", category: "B 类", q1: 327000, q2: 394500, q3: 283500, q4: 216000, total: 1221000 },
    { product: "丁产品", category: "B 类", q1: 105000, q2: 94500, q3: 115000, q4: 99000, total: 413500 },
    { product: "戊产品", category: "C 类", q1: 481500, q2: 447000, q3: 517500, q4: 433500, total: 1879500 },
  ];

  // ── Fixed Columns Demo ──
  const rptFixed = document.getElementById("rpt-fixed");
  rptFixed.showColumnSelector = false;
  rptFixed.columns = [
    { key: "name", title: "Name", fixed: "left", width: "150px", sortable: true },
    { key: "dept", title: "Department", fixed: "left", width: "130px", sortable: true },
    { key: "role", title: "Role", sortable: true, width: "120px" },
    { key: "salary", title: "Salary", sortable: true, width: "120px", align: "right",
      render: (v) => "$" + v.toLocaleString() },
    { key: "bonus", title: "Bonus", sortable: true, width: "120px", align: "right",
      render: (v) => "$" + v.toLocaleString() },
    { key: "location", title: "Location", sortable: true, width: "130px" },
    { key: "startDate", title: "Start Date", width: "120px" },
    { key: "status", title: "Status", fixed: "right", width: "100px", align: "center",
      render: (v) => '<z-badge variant="' + (v === 'Active' ? 'success' : 'warning') + '" size="sm">' + v + '</z-badge>' },
  ];
  rptFixed.data = [
    { name: "Alice Johnson", dept: "Engineering", role: "Senior Dev", salary: 145000, bonus: 15000, location: "New York", startDate: "2019-03-15", status: "Active" },
    { name: "Bob Smith", dept: "Design", role: "Lead Designer", salary: 135000, bonus: 12000, location: "London", startDate: "2020-07-01", status: "Active" },
    { name: "Carol White", dept: "Marketing", role: "Manager", salary: 125000, bonus: 10000, location: "Tokyo", startDate: "2018-01-10", status: "Inactive" },
    { name: "Dave Brown", dept: "Engineering", role: "Junior Dev", salary: 95000, bonus: 5000, location: "Berlin", startDate: "2022-11-20", status: "Active" },
    { name: "Eve Davis", dept: "Design", role: "UX Designer", salary: 115000, bonus: 8000, location: "Paris", startDate: "2021-06-14", status: "Active" },
    // 演示行数: maxHeight=320px 下表体纵向滚动, 表头冻结 + 固定列同时可见
    { name: "Frank Moore", dept: "Engineering", role: "Tech Lead", salary: 165000, bonus: 18000, location: "Austin", startDate: "2017-09-01", status: "Active" },
    { name: "Grace Lee", dept: "Marketing", role: "Analyst", salary: 88000, bonus: 4000, location: "Seoul", startDate: "2023-02-13", status: "Active" },
    { name: "Henry Wilson", dept: "Sales", role: "Account Exec", salary: 102000, bonus: 14000, location: "Chicago", startDate: "2020-05-25", status: "Inactive" },
    { name: "Ivy Martinez", dept: "Design", role: "Product Designer", salary: 118000, bonus: 9000, location: "Madrid", startDate: "2021-10-04", status: "Active" },
    { name: "Jack Taylor", dept: "Engineering", role: "QA Engineer", salary: 92000, bonus: 6000, location: "Toronto", startDate: "2022-04-18", status: "Active" },
    { name: "Kim Anderson", dept: "Sales", role: "Sales Manager", salary: 138000, bonus: 20000, location: "Sydney", startDate: "2018-08-27", status: "Active" },
    { name: "Leo Garcia", dept: "Marketing", role: "Content Lead", salary: 96000, bonus: 7000, location: "Mexico City", startDate: "2021-01-11", status: "Inactive" },
    { name: "Mia Chen", dept: "Engineering", role: "Backend Dev", salary: 128000, bonus: 11000, location: "Singapore", startDate: "2019-12-02", status: "Active" },
  ];

  // ── Cell Slot Demo ──
  // 两个 cell 元素在 `./cells.ts` 定义（甘特段也 import 同一份 —— 内容是内容、容器是容器）。
  const rptSlots = document.getElementById("rpt-slots");
  if (rptSlots) {
    rptSlots.showColumnSelector = false;
    // `rowKey` 不是可选的：不配时行 key 退化为**排序后序号**，排序一开池就命中不了，
    // 格内元素会被重建（复用失效）。内容槽要保状态，必须给宿主一个稳定标识。
    rptSlots.rowKey = "name";
    rptSlots.columns = [
      { key: "name", title: "Task", width: "170px", sortable: true },
      { key: "status", title: "Status", width: "110px", cellTag: "demo-status-cell" },
      { key: "progress", title: "Progress", width: "200px", cellTag: "demo-progress-cell" },
      { key: "owner", title: "Owner", width: "110px" },
    ];
    rptSlots.data = [
      { name: "需求评审", status: "已完成", progress: 100, owner: "陈" },
      { name: "接口联调", status: "进行中", progress: 62, owner: "李" },
      { name: "回归测试", status: "进行中", progress: 24, owner: "王" },
      { name: "灰度发布", status: "未开始", progress: 0, owner: "赵" },
      { name: "数据迁移", status: "已完成", progress: 100, owner: "周" },
    ];
  }

  // 外部 z-column-selector 与表格是兄弟节点, 其事件不经过表格元素, 直接在
  // 选择器元素上监听(emit 源即选择器自身); 演示独立组件的事件契约, 见 [[REQ-015-column-selector]]
  const rptExtColInfo = document.getElementById("rpt-ext-col-info");
  document.querySelector('z-column-selector[for="rpt-fixed"]').addEventListener("z-column-visibility-change", (e) => {
    const { key, visible } = e.detail;
    rptExtColInfo.textContent =
      (visible ? '"' + key + '" shown' : '"' + key + '" hidden') + " (external z-column-selector)";
    setTimeout(() => { rptExtColInfo.textContent = ""; }, 2000);
  });

  // 语言切换由外壳统一广播（它重画自己的标题后通知各段）
  document.addEventListener("z-demo-lang", updateDynamicTexts);

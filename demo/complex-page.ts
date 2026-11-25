// complex.html 的模块入口。写在 .ts 里而非内联 <script>：内联脚本按 JS 解析，写 TS 语法
// （`: void`）会整段拒绝执行（表现为整页无侧边栏、只有 pageerror），且无法被 tsc / eslint 覆盖。
//
// 左侧分类菜单 = shell.ts Complex 组的 section 锚点；组件显式注册。
  import { initShell } from "./shell.js";
  import "../src/content/markdown/index.js";
  import "../src/content/code-editor/index.js";
  import "../src/app/login/index.js";
  import "../src/components/textarea/index.js";
  import "../src/components/number-input/index.js";
  import "../src/components/slider/index.js";
  import "../src/components/rate/index.js";
  import "../src/components/input/index.js";
  import "../src/components/checkbox/index.js";
  import "../src/components/form/index.js";
  import "../src/components/calendar/index.js";
  import "../src/components/date-range/index.js";
  import "../src/components/time-picker/index.js";
  import "../src/components/drawer/index.js";
  import "../src/components/steps/index.js";
  import "../src/components/anchor/index.js";
  import "../src/components/timeline/index.js";
  import "../src/components/statistic/index.js";
  import "../src/components/empty/index.js";
  import "../src/components/result/index.js";
  import "../src/components/image/index.js";
  import "../src/components/watermark/index.js";
  import "../src/components/command/index.js";
  import "../src/components/virtual-list/index.js";
  import "../src/content/json-viewer/index.js";
  import "../src/content/rich-text/index.js";
  import "../src/report/data-list/index.js";
  import "../src/components/upload/index.js";
  import { ZDrawer } from "../src/components/drawer/index.js";
  import { t } from "./i18n.js";

  const $ = (id) => document.getElementById(id);
  const makeAppend = (logId) => {
    const log = $(logId);
    return (msg) => {
      log.textContent = log.textContent === "—" ? msg : log.textContent + "\n" + msg;
    };
  };

  // ── Markdown：Live Editor ──
  // 原 textarea 换为 z-code-editor（markdown 高亮）；输入事件为组件 z-input（detail.value）
  const input = $("md-input");
  const output = $("md-output");

  input.value = [
    "# Welcome to z-markdown",
    "",
    "## A Web Component Markdown Renderer",
    "",
    "Type **Markdown** on this side and see the *rendered* HTML on the other.",
    "",
    "### Features",
    "",
    "- GFM tables",
    "- Task lists",
    "- Code blocks with syntax highlighting",
    "- Safe by default (XSS sanitized)",
    "",
    "### Code Example",
    "",
    "```ts",
    'import { ZMarkdown } from "z-agent-ui/components/markdown";',
    "",
    'const md = document.querySelector("z-markdown");',
    'md.content = "## Hello World";',
    "```",
    "",
    "### Table",
    "",
    "| Feature    | Status   | Notes          |",
    "|------------|----------|----------------|",
    "| Headings   | Done     | h1 -- h6       |",
    "| Lists      | Done     | ul, ol, tasks  |",
    "| Tables     | Done     | GFM style      |",
    "| Code       | Done     | inline & block |",
    "| Images     | Done     | responsive     |",
    "> **Tip**: Click the theme toggle in the header to see Dark Mode support.",
    "",
    "- [x] Markdown parsing",
    "- [x] GFM support",
    "- [x] Sanitization",
    "- [ ] Custom containers",
    "- [ ] Mermaid diagrams",
  ].join("\n");

  const liveMd = document.createElement("z-markdown");
  output.appendChild(liveMd);
  liveMd.content = input.value;

  input.addEventListener("z-input", (e) => {
    liveMd.content = e.detail.value;
  });

  // ── Login ──
  const loginDemo = $("login-demo");
  const loginResult = $("login-result");

  function syncLoginLabels() {
    loginDemo.title = t("complexPage.loginTitle");
    loginDemo.subtitle = t("complexPage.loginSubtitle");
    loginDemo.usernameLabel = t("complexPage.loginUsernameLabel");
    loginDemo.usernamePlaceholder = t("complexPage.loginUsernamePlaceholder");
    loginDemo.passwordLabel = t("complexPage.loginPasswordLabel");
    loginDemo.passwordPlaceholder = t("complexPage.loginPasswordPlaceholder");
    loginDemo.rememberLabel = t("complexPage.loginRememberLabel");
    loginDemo.forgotLabel = t("complexPage.loginForgotLabel");
    loginDemo.submitLabel = t("complexPage.loginSubmitLabel");
    loginDemo.signUpPrompt = t("complexPage.loginSignUpPrompt");
    loginDemo.signUpLabel = t("complexPage.loginSignUpLabel");
  }

  syncLoginLabels();

  loginDemo.addEventListener("z-login", (e) => {
    const { username, password, remember } = e.detail;
    console.log("[z-login]", { username, password, remember });
    loginResult.textContent = t("complexPage.loginSuccess");
    setTimeout(() => { loginResult.textContent = ""; }, 3000);
    loginDemo.loading = true;
    setTimeout(() => { loginDemo.loading = false; }, 1500);
  });

  // ── Form Basics ──
  const fbAppend = makeAppend("fb-log");
  const show = (label, detail) => fbAppend(`${label}: ${JSON.stringify(detail)}`);
  document.querySelectorAll("#form-basics z-textarea").forEach((el) => {
    el.addEventListener("z-input", (e) => show("textarea z-input", e.detail));
    el.addEventListener("z-change", (e) => show("textarea z-change", e.detail));
  });
  document.querySelectorAll("#form-basics z-number-input").forEach((el) => {
    el.addEventListener("z-change", (e) => show("number-input z-change", e.detail));
  });
  document.querySelectorAll("#form-basics z-slider").forEach((el) => {
    el.addEventListener("z-input", (e) => show("slider z-input", e.detail));
    el.addEventListener("z-change", (e) => show("slider z-change", e.detail));
  });
  document.querySelectorAll("#form-basics z-rate").forEach((el) => {
    el.addEventListener("z-change", (e) => show("rate z-change", e.detail));
  });

  // ── Form ──
  const formAppend = makeAppend("form-log");
  const form = $("f1");
  // z-button 拦截原生 click 只发 z-click（Button.ts:50 stopPropagation）
  $("btn-submit").addEventListener("z-click", () => form.submit());
  $("btn-reset").addEventListener("z-click", () => form.reset());
  form.addEventListener("z-submit", (e) => formAppend("z-submit valid=true values=" + JSON.stringify(e.detail.values)));
  form.addEventListener("z-invalid", (e) => formAppend("z-invalid errors=" + JSON.stringify(e.detail.errors)));
  form.addEventListener("z-change", (e) => {
    if (e.detail.values) formAppend("z-change field=" + e.detail.field + " values=" + JSON.stringify(e.detail.values));
  });

  // ── Date ──
  const dateAppend = makeAppend("date-log");
  const cal = $("cal");
  cal.addEventListener("z-change", (e) => dateAppend("calendar z-change value=" + e.detail.value));
  cal.addEventListener("z-month-change", (e) => dateAppend("calendar z-month-change " + e.detail.year + "-" + (e.detail.month + 1)));
  const range = $("range");
  range.addEventListener("z-change", (e) => dateAppend("range z-change start=" + e.detail.start + " end=" + e.detail.end));
  $("tp24").addEventListener("z-change", (e) => dateAppend("time24 z-change value=" + e.detail.value));
  $("tp12").addEventListener("z-change", (e) => dateAppend("time12 z-change value=" + e.detail.value));

  // ── Nav ──
  const navAppend = makeAppend("nav-log");

  // drawer
  const dl = $("dr-left");
  const dr = $("dr-right");
  const dt = $("dr-top");
  const db = $("dr-bottom");
  $("btn-left").addEventListener("click", () => dl.show());
  $("btn-right").addEventListener("click", () => dr.show());
  $("btn-top").addEventListener("click", () => dt.show());
  $("btn-bottom").addEventListener("click", () => db.show());
  $("dr-left-close").addEventListener("click", () => dl.close());
  $("dr-right-cancel").addEventListener("click", () => dr.close());
  $("dr-right-ok").addEventListener("click", () => dr.close());
  [dl, dr, dt, db].forEach((d) => {
    d.addEventListener("z-open", () => navAppend("drawer z-open " + d.placement));
    d.addEventListener("z-close", () => navAppend("drawer z-close " + d.placement));
  });
  $("btn-prog").addEventListener("click", () => {
    const { close, element } = ZDrawer.open({
      title: "编程式抽屉",
      placement: "left",
      width: "420px",
      closeLabel: "关闭",
    });
    element.addEventListener("z-close", () => navAppend("programmatic drawer closed"));
    setTimeout(() => close(), 1200);
  });

  // steps
  const steps = $("steps");
  steps.items = [
    { title: "需求分析", description: "输入输出与边界" },
    { title: "方案设计", description: "组件 API 与交互" },
    { title: "编码实现", description: "实现 + 单测" },
    { title: "验收发布", description: "回归 + 冒烟 + 收口" },
  ];
  steps.addEventListener("z-change", (e) => {
    steps.current = e.detail.index;
    navAppend("steps z-change index=" + e.detail.index);
  });
  $("prev").addEventListener("click", () => { if (steps.current > 0) steps.current--; });
  $("next").addEventListener("click", () => { if (steps.current < steps.items.length - 1) steps.current++; });
  $("set-err").addEventListener("click", () => { steps.status = "error"; });
  $("reset-steps").addEventListener("click", () => { steps.current = 0; steps.status = "process"; });

  // anchor
  const anchor = $("anchor");
  anchor.items = [
    { href: "#sec-a", label: "项目概览" },
    { href: "#sec-b", label: "技术方案" },
    { href: "#sec-c", label: "里程碑" },
    { href: "#sec-d", label: "风险清单" },
  ];
  anchor.addEventListener("z-change", (e) => navAppend("anchor z-change active=" + e.detail.active));

  // ── Data ──
  const dataAppend = makeAppend("data-log");
  $("timeline").items = [
    { title: "需求评审", time: "08-01 10:00", content: "确认范围与验收标准", status: "success" },
    { title: "方案设计", time: "08-05 14:30", content: "组件 API 冻结", status: "success" },
    { title: "编码实现", time: "08-09 09:00", content: "W13-W16 完成", status: "success" },
    { title: "验收发布", time: "08-11 18:00", content: "全量回归 + 冒烟", status: "process" },
  ];
  $("stat2").addEventListener("z-change", (e) => dataAppend("statistic count-up done value=" + e.detail.value));
  $("img1").addEventListener("z-click", (e) => dataAppend("image z-click " + e.detail.src));

  // ── Enterprise ──
  const entAppend = makeAppend("ent-log");
  // watermark（属性为 JS 拥有,演示动态调整）
  const wm = $("wm1");
  wm.content = "机密 · zAgentUI";
  wm.fontSize = 18;
  $("wm-rotate").addEventListener("z-click", () => { wm.rotate = 45; });
  $("wm-gap").addEventListener("z-click", () => { wm.gap = 160; });
  $("wm-color").addEventListener("z-click", () => { wm.color = "rgba(239, 68, 68, 0.12)"; });

  // command（Ctrl+K wiring 为应用职责）
  const cmd = $("cmd");
  cmd.items = [
    { id: "home", label: "回到首页", keywords: ["home", "首页"], group: "导航", icon: "🏠", shortcut: "G H" },
    { id: "search", label: "全局搜索", keywords: ["search", "搜索"], group: "导航", icon: "🔍", shortcut: "G S" },
    { id: "settings", label: "打开设置", keywords: ["settings", "设置"], group: "操作", icon: "⚙️", shortcut: "G ," },
    { id: "new-doc", label: "新建文档", keywords: ["new", "新建", "doc"], group: "操作", icon: "📄", shortcut: "N" },
    { id: "export", label: "导出报表", keywords: ["export", "导出"], group: "操作", icon: "📤" },
    { id: "admin", label: "管理员模式", keywords: ["admin"], group: "系统", icon: "🔒", disabled: true },
    { id: "dark", label: "切换暗色模式", keywords: ["dark", "theme", "暗色"], group: "视图", icon: "🌙" },
  ];
  cmd.addEventListener("z-select", (e) => entAppend("command select " + e.detail.item.id));
  const openCmd = () => cmd.show();
  $("cmd-open").addEventListener("z-click", openCmd);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCmd();
    }
  });

  // virtual-list
  const vl = $("vl1");
  vl.items = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: "记录-" + i, note: i % 3 === 0 ? "已审核" : "" }));
  vl.renderItem = (item) =>
    `<div class="vlist-row"><span class="idx">${item.id}</span><span>${item.name}</span><span style="margin-left:12px;color:var(--z-color-text-secondary);font-size:12px;">${item.note}</span></div>`;
  $("vl-top").addEventListener("z-click", () => vl.scrollToIndex(0));
  $("vl-5000").addEventListener("z-click", () => vl.scrollToIndex(5000));

  // json-viewer
  const jv = $("jv1");
  jv.data = {
    name: "zAgentUI",
    version: "1.2.0",
    license: "MIT",
    stats: { stars: 1284, issues: { open: 3, closed: 47 }, contributors: ["alice", "bob", "carol"] },
    flags: { stable: true, archived: false, deprecated: null },
    nested: { deep: { deeper: { deepest: [1, 2, 3, { leaf: "end" }] } } },
  };
  jv.addEventListener("z-copy", (e) => entAppend("json copy " + e.detail.path + " = " + JSON.stringify(e.detail.value)));
  $("jv-expand").addEventListener("z-click", () => jv.expandAll());
  $("jv-collapse").addEventListener("z-click", () => jv.collapseAll());
  $("jv-lines").addEventListener("z-change", (e) => { jv.showLineNumbers = e.detail.checked; });

  // ── Rich Text ──
  const rtAppend = makeAppend("rt-log");
  // rt1: 默认工具栏
  const rt1 = $("rt1");
  rt1.value = "<p>这是 <b>富文本</b> 初始内容,选中文字后点击工具栏按钮试试。</p>";
  rt1.addEventListener("z-change", (e) => rtAppend("rt1 z-change: " + String(e.detail.value).slice(0, 60) + "..."));
  rt1.addEventListener("z-focus", () => rtAppend("rt1 z-focus"));
  rt1.addEventListener("z-blur", () => rtAppend("rt1 z-blur"));
  $("rt-set").addEventListener("z-click", () => {
    rt1.value = "<h3>外部赋值</h3><p>通过 <code>value</code> 属性整体覆盖内容。</p>";
  });
  $("rt-html").addEventListener("z-click", () => rtAppend("getHTML(): " + rt1.getHTML()));
  $("rt-text").addEventListener("z-click", () => rtAppend("getText(): " + rt1.getText()));
  $("rt-readonly").addEventListener("z-change", (e) => { rt1.readonly = e.detail.checked; });
  $("rt-disabled").addEventListener("z-change", (e) => { rt1.disabled = e.detail.checked; });

  // rt2: 自定义工具栏 + z-command
  const rt2 = $("rt2");
  rt2.toolbar = [
    { id: "bold", label: "B", command: "bold", title: "粗体" },
    { id: "h2", label: "H2", command: "formatBlock", value: "h2", title: "二级标题" },
    { id: "date", label: "插入日期", title: "触发 z-command,由应用插入日期" },
  ];
  rt2.addEventListener("z-command", (e) => {
    if (e.detail.id === "date") {
      const now = new Date().toLocaleDateString("zh-CN");
      // 自定义动作经 z-command 交给应用;应用再调 exec 插入
      rt2.exec("insertText", now);
      rtAppend("rt2 z-command date → exec insertText " + now);
    }
  });
  rt2.addEventListener("z-change", (e) => rtAppend("rt2 z-change: " + String(e.detail.value).slice(0, 60) + "..."));

  // ── Data List ──
  const dlAppend = (msg) => {
    const log = $("dl-log");
    const lines = log.textContent === "—" ? [] : log.textContent.split("\n");
    lines.push(msg);
    if (lines.length > 60) lines.shift();
    log.textContent = lines.join("\n");
  };
  // 80 条 mock 用户
  const NAMES = ["Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi"];
  const ROLES = ["admin", "user", "editor"];
  const DEPTS = ["前端组", "后端组", "设计组", "测试组"];
  const USERS = Array.from({ length: 80 }, (_, i) => {
    const name = NAMES[i % NAMES.length] + "-" + String(i + 1).padStart(2, "0");
    return {
      id: "u" + (i + 1),
      name,
      email: name.toLowerCase() + "@example.com",
      role: ROLES[i % ROLES.length],
      status: i % 2 === 0,
      department: DEPTS[i % DEPTS.length],
      age: 20 + (i % 40),
      createdAt: "2026-0" + (1 + (i % 9)) + "-" + String(1 + ((i * 3) % 27)).padStart(2, "0") + "T08:30:00.000Z",
    };
  });
  // 列定义（email 不参与筛选，演示 filterable:false）
  const FIELDS = [
    { key: "name", label: "姓名", type: "text", sortable: true },
    { key: "email", label: "邮箱", type: "text", filterable: false },
    { key: "role", label: "角色", type: "select", options: [
      { value: "admin", label: "管理员" },
      { value: "user", label: "普通用户" },
      { value: "editor", label: "编辑" },
    ], sortable: true },
    { key: "status", label: "状态", type: "boolean" },
    { key: "department", label: "部门", type: "select", options: DEPTS.map((d) => ({ value: d, label: d })) },
    { key: "age", label: "年龄", type: "number", sortable: true },
    { key: "createdAt", label: "创建时间", type: "date", sortable: true },
  ];
  const zdl = $("dl");
  zdl.fields = FIELDS;
  zdl.items = USERS;
  zdl.totalRecords = USERS.length;

  zdl.addEventListener("z-filter-change", (e) => dlAppend("z-filter-change: " + JSON.stringify(e.detail.filters)));
  zdl.addEventListener("z-page-change", (e) =>
    dlAppend("z-page-change: page=" + e.detail.page + " pageSize=" + e.detail.pageSize + " totalRecords=" + e.detail.totalRecords));
  zdl.addEventListener("z-sort", (e) => dlAppend("z-sort: " + JSON.stringify(e.detail.sortState)));
  zdl.addEventListener("z-selection-change", (e) => dlAppend("z-selection-change: " + e.detail.selectedKeys.length + " 行"));
  zdl.addEventListener("z-config-change", (e) => {
    // 列显隐/宽度/排序随 z-config-change 快照持久化到 localStorage
    try { localStorage.setItem("z-data-list-config", JSON.stringify(e.detail.config)); } catch { /* 隐私模式忽略 */ }
    dlAppend("z-config-change: 已保存列配置");
  });

  const savedCfg = (() => {
    try { return JSON.parse(localStorage.getItem("z-data-list-config") || ""); } catch { return null; }
  })();
  if (savedCfg) {
    zdl.applyConfig(savedCfg);
    dlAppend("已从 localStorage 恢复列配置");
  }

  // 模式切换
  const clientBtn = $("mode-client");
  const serverBtn = $("mode-server");
  const setMode = (mode) => {
    zdl.mode = mode;
    clientBtn.tone = mode === "client" ? "primary" : "default";
    clientBtn.appearance = mode === "client" ? "solid" : "outline";
    serverBtn.tone = mode === "server" ? "primary" : "default";
    serverBtn.appearance = mode === "server" ? "solid" : "outline";
    dlAppend("mode → " + mode);
  };
  clientBtn.addEventListener("z-click", () => setMode("client"));
  serverBtn.addEventListener("z-click", () => setMode("server"));

  // server 模式模拟：延迟 300ms 后按筛选条件返回切片
  let serverTimer = 0;
  const applyFilters = (row, f) => {
    for (const key of Object.keys(f)) {
      const v = f[key];
      if (v === "" || v == null) continue;
      const field = FIELDS.find((x) => x.key === key);
      if (!field) continue;
      const rv = row[key];
      if (field.type === "text") {
        if (!String(rv ?? "").toLowerCase().includes(String(v).toLowerCase())) return false;
      } else if (field.type === "select") {
        if (rv !== v) return false;
      } else if (field.type === "boolean") {
        const truthy = rv === true || rv === "true" || rv === 1 || rv === "1";
        if ((v === "true" && !truthy) || (v === "false" && truthy)) return false;
      } else if (field.type === "number") {
        if (v.min !== "" && v.min != null && Number(rv) < Number(v.min)) return false;
        if (v.max !== "" && v.max != null && Number(rv) > Number(v.max)) return false;
      } else if (field.type === "date") {
        const d = String(rv).slice(0, 10);
        if (v.start && d < v.start) return false;
        if (v.end && d > v.end) return false;
      }
    }
    return true;
  };
  // server 模式下 z-data-list 不切片不过滤，应用负责按事件参数取数。
  // 注意: 取数期间不要置 loading=true —— loading 走 @property setter 会全量重渲染
  // 重建筛选栏打断输入; demo 只演示事件契约, 300ms 延迟期间沿用旧数据
  zdl.addEventListener("z-filter-change", (e) => {
    if (zdl.mode !== "server") return;
    clearTimeout(serverTimer);
    serverTimer = setTimeout(() => {
      const filtered = USERS.filter((row) => applyFilters(row, e.detail.filters));
      zdl.items = filtered.slice((zdl.page - 1) * zdl.pageSize, zdl.page * zdl.pageSize);
      zdl.totalRecords = filtered.length;
      dlAppend("server 取数: " + filtered.length + " 条命中");
    }, 300);
  });
  zdl.addEventListener("z-page-change", (e) => {
    if (zdl.mode !== "server") return;
    clearTimeout(serverTimer);
    serverTimer = setTimeout(() => {
      const filtered = USERS.filter((row) => applyFilters(row, zdl.filters));
      zdl.items = filtered.slice((e.detail.page - 1) * e.detail.pageSize, e.detail.page * e.detail.pageSize);
      zdl.totalRecords = filtered.length;
      dlAppend("server 翻页: page=" + e.detail.page);
    }, 300);
  });

  // 工具按钮
  $("dl-reset").addEventListener("z-click", () => {
    zdl.resetFilters();
    dlAppend("resetFilters()");
  });
  $("dl-clear-cfg").addEventListener("z-click", () => {
    try { localStorage.removeItem("z-data-list-config"); } catch { /* ignore */ }
    location.reload();
  });

  dlAppend("初始化: " + USERS.length + " 条 · client 模式");

  // ── Upload ──
  const upAppend = makeAppend("up-log");
  const up = $("up1");
  up.addEventListener("z-change", (e) => upAppend("z-change files=" + e.detail.files.map((f) => f.name + "(" + f.size + "B)").join(", ")));
  up.addEventListener("z-progress", (e) => upAppend("z-progress " + e.detail.id + " " + e.detail.progress + "%"));
  up.addEventListener("z-success", (e) => upAppend("z-success " + e.detail.id + " url=" + e.detail.url));
  up.addEventListener("z-error", (e) => upAppend("z-error " + e.detail.id + " " + e.detail.error));
  up.addEventListener("z-remove", (e) => upAppend("z-remove " + e.detail.id));

  initShell();

  // 语言切换后重设 z-login 文案（initShell 的 wireHeader 与此处各自监听 z-click）
  $("lang-toggle").addEventListener("z-click", () => {
    setTimeout(syncLoginLabels, 0);
  });

// 从 gantt.html 搬来的甘特演示与接线（D3 内联化）。
// 原本自己 mountBackHome()，剥掉 —— 壳由 report.html 统一提供。
import "../../src/theme/index.js";
  import "../../src/report/gantt/index.js";
  import "../../src/components/button/index.js";
  import "../../src/components/checkbox/index.js";
  // 与表格段共用同一份 cell 元素定义（内容与容器解耦，换个宿主不用改元素）
  import "./cells.js";

  const gantt = document.getElementById("gantt");

  // ── 示例项目计划 ──
  gantt.data = {
    tasks: [
      { id: "p1", name: "设计阶段", is_summary: true },
      { id: "t1", name: "需求调研", parent_id: "p1", start_date: "2026-09-01", end_date: "2026-09-03", progress: 100, real_start_date: "2026-09-01", real_end_date: "2026-09-03" },
      { id: "t2", name: "原型设计", parent_id: "p1", start_date: "2026-09-04", end_date: "2026-09-08", progress: 60, real_start_date: "2026-09-04", real_end_date: "2026-09-07" },
      { id: "m1", name: "设计评审", is_milestone: true, start_date: "2026-09-09" },
      { id: "p2", name: "开发阶段", is_summary: true },
      { id: "t3", name: "前端开发", parent_id: "p2", start_date: "2026-09-10", end_date: "2026-09-18", progress: 30 },
      { id: "t4", name: "后端开发", parent_id: "p2", start_date: "2026-09-10", end_date: "2026-09-16", progress: 45 },
      { id: "t5", name: "联调测试", parent_id: "p2", start_date: "2026-09-19", end_date: "2026-09-22" },
      { id: "t6", name: "上线部署", start_date: "2026-09-23", end_date: "2026-09-24" },
      { id: "t7", name: "旧版本停用", start_date: "2026-09-21", end_date: "2026-09-23" },
    ],
    dependencies: [
      { predecessor_id: "t1", successor_id: "t2", type: "FS" },
      { predecessor_id: "t2", successor_id: "m1", type: "FS" },
      { predecessor_id: "m1", successor_id: "t3", type: "FS" },
      // SS：前后端同日启动（同起点）；SF：上线部署开始之时旧版本停用完成
      //（四类型几何均有单测，demo 供视觉验收）
      { predecessor_id: "t3", successor_id: "t4", type: "SS" },
      { predecessor_id: "t4", successor_id: "t5", type: "FF", lag_days: 1 },
      { predecessor_id: "t3", successor_id: "t5", type: "FS" },
      { predecessor_id: "t5", successor_id: "t6", type: "FS" },
      { predecessor_id: "t6", successor_id: "t7", type: "SF" },
    ],
  };

  // ── 左列内容槽 ──
  // 第一列由容器自己画（缩进 + 展开钮 + 树 aria 都在里面），
  // 其余列可挂任意元素；这里把「%」列换成与表格段同一个 demo-progress-cell。
  gantt.columns = [
    { key: "name", title: "Task", width: 200 },
    { key: "start_date", title: "Start", width: 90, align: "center" },
    { key: "progress", title: "%", width: 96, cellTag: "demo-progress-cell" },
  ];

  // ── 事件日志 ──
  const logEl = document.getElementById("event-log");
  const LOG_EVENTS = ["z-gantt-select", "z-gantt-change", "z-gantt-connect", "z-gantt-expand", "z-gantt-view-change", "z-gantt-menu", "z-gantt-menu-pick"];
  function log(name, detail) {
    const line = document.createElement("div");
    line.className = "demo-log__line";
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const d = detail == null ? "" : ` ${JSON.stringify(detail)}`;
    line.textContent = `${time} ${name}${d.length > 120 ? d.slice(0, 120) + "..." : d}`;
    logEl.appendChild(line);
    while (logEl.children.length > 100) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }
  LOG_EVENTS.forEach((name) => gantt.addEventListener(name, (e) => log(name, e.detail)));
  // 连线事件展示 detail 且不取消
  gantt.addEventListener("z-gantt-connect", () => {});

  // ── 视图切换 ──
  const viewBtns = [["v-day", "day"], ["v-week", "week"], ["v-month", "month"], ["v-quarter", "quarter"]];
  function setActiveView(mode) {
    for (const [id, m] of viewBtns) {
      document.getElementById(id).setAttribute("appearance", m === mode ? "solid" : "outline");
    }
  }
  viewBtns.forEach(([id, mode]) => {
    document.getElementById(id).addEventListener("click", () => {
      gantt.viewMode = mode;
      setActiveView(mode);
    });
  });
  setActiveView("day");

  // ── 缩放/定位 ──
  document.getElementById("zoom-in").addEventListener("click", () => gantt.zoomIn());
  document.getElementById("zoom-out").addEventListener("click", () => gantt.zoomOut());
  document.getElementById("fit").addEventListener("click", () => gantt.fit());
  document.getElementById("today").addEventListener("click", () => gantt.scrollToToday());

  // ── 选项开关 ──
  document.getElementById("opt-critical").addEventListener("z-change", (e) => {
    gantt.showCriticalPath = e.detail.checked;
  });
  document.getElementById("opt-auto").addEventListener("z-change", (e) => {
    gantt.autoSchedule = e.detail.checked;
  });
  document.getElementById("opt-weekends").addEventListener("z-change", (e) => {
    gantt.showWeekends = e.detail.checked;
  });
  document.getElementById("opt-readonly").addEventListener("z-change", (e) => {
    gantt.readonly = e.detail.checked;
  });

  // ── 数据导出 ──
  const jsonOut = document.getElementById("json-out");
  function renderJson() {
    jsonOut.textContent = JSON.stringify(gantt.getData(), null, 2);
  }
  gantt.addEventListener("z-gantt-change", renderJson);
  gantt.addEventListener("z-gantt-connect", renderJson);
  renderJson();

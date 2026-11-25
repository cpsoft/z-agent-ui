// z-app-nav 示例接线（[[REQ-040-app-nav]]）
//
// 刻意**只在宿主侧**做三件事：给清单、给当前地址、把 z-navigate 接回「改地址」。
// 组件自己不碰 history —— 这个示例如果写成 location.hash = ...，就等于在教宿主把
// 路由逻辑塞进菜单点击里，而那正是「代码导航与后退行为分叉」的来源。
import "../../src/app/app-nav/index.js";
// 类型走目录 barrel：`demo-imports-guard` 只认 `../src/**/index.js`，
// 深引实现文件在组件目录搬迁时会连带断掉（而它不会立刻报错）。
import type { ZAppNav } from "../../src/app/app-nav/index.js";

const el = document.getElementById("app-nav") as ZAppNav | null;
const log = document.getElementById("nav-log");

/** 清单：真实宿主这里给的是 `registry.list(can)` 的映射结果。 */
const ITEMS = [
  { path: "/", title: "工作台", icon: "home" },
  { path: "/datasources", title: "数据源", icon: "database", group: "数据接入" },
  { path: "/datasets", title: "数据集", icon: "layers", group: "数据准备", order: 10 },
  { path: "/rules", title: "数据处理", icon: "flow", group: "数据准备", order: 30 },
  { path: "/tasks", title: "任务", icon: "task", group: "数据准备", order: 40, badge: 2 },
  { path: "/pages", title: "页面报表", icon: "chart", group: "数据分析" },
  { path: "/permissions", title: "权限总览", icon: "shield", group: "管理", disabled: true },
  { path: "/unknown", title: "未知图标", group: "管理" },
];

if (el) {
  el.items = ITEMS;
  el.active = "/datasets";
  el.addEventListener("z-navigate", (e) => {
    const { path } = (e as CustomEvent).detail;
    // 宿主负责「改地址 + 回灌 active」：组件不自己记选中态，所以这两步是必须的
    el.active = path;
    if (log) log.textContent = `z-navigate → ${path}（宿主改地址并把 active 传回来）`;
  });

  const toggle = document.getElementById("app-nav-collapse") as HTMLElement | null;
  toggle?.addEventListener("click", () => {
    el.collapsed = !el.collapsed;
    toggle.textContent = el.collapsed ? "展开" : "收起";
  });
}

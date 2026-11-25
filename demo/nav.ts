// demo 站导航的单一数据源：层 → 家族 → 页 → 组件，全部只在这里声明；
// shell.ts 与 index.html 只负责渲染。
//
// 家族是阅读分组，与清单 `layer=base` 的集合双向相等。本文件零依赖、零副作用。
// 判据见 tests/unit/demo-nav-guard.test.ts。

/** 六层。`engine` / `platform` 是机制层：没有控件，但有页面（分别演示路由与注册表）。 */
export type LayerId = "foundation" | "base" | "composite";

export interface LayerRow {
  id: LayerId;
  /** 对外不用编号，用名字（见 ADR 的层号约定） */
  name: string;
  /** 中文短名，给侧栏与地图用 */
  title: string;
  titleEn: string;
  /** src 下的一级目录 —— 层与目录 1:1，这是整个导航的锚点 */
  dirs: readonly string[];
  /** 一句话说明这层「凭什么存在」 */
  note: string;
}

/**
 * 层栈，**自下而上**：索引 0 是地基。
 *
 * 2026-11-15 定规：分层图 L0 压在最底、其它层往上叠，与「谁支撑谁」一致。
 * 渲染时倒序输出即可（HTML 里第一行是最外层），读屏顺序与视觉顺序因此一致。
 * 侧栏是「目录」，仍按本数组顺序 L0 → L3 列 —— 目录是阅读顺序，地图是叠放关系，不强行统一。
 */
export const LAYER_STACK: readonly LayerRow[] = [
  {
    id: "foundation",
    name: "foundation",
    title: "L0 地基", titleEn: "L0 Foundation",
    dirs: ["core", "primitives", "theme"],
    note: "模板、转义、令牌桥、浮层定位、焦点陷阱。不含任何控件外观。",
  },
  {
    id: "base",
    name: "base",
    title: "L1 控件", titleEn: "L1 Controls",
    dirs: ["components"],
    note: "单一职责的输入与展示件。能在一屏内讲清它做什么，不取数、不管路由。",
  },
  {
    id: "composite",
    name: "composite",
    title: "L2 复合", titleEn: "L2 Composite",
    dirs: ["report", "flow", "doc", "content", "property", "app"],
    note: "带领域模型的复合件：有自己的数据契约与状态机，仍然不取数、不管路由。",
  },
  // 层栈到此为止：L3 页面引擎 / L4 驱动 / L5 平台不在这个仓库里。
  // 它们依赖本包的组件，依赖方向是单向的 —— 所以这里只有地基到复合件三层。
];

export interface FamilyDef {
  id: string;
  title: string;
  /** 归属的域页（demo/<file>.html） */
  page: string;
  /**
   * 该家族示例在这页的锚点（`page` 上的 `#id`）。
   *
   * 存显式字符串，不按「`ex-` + id」拼：锚点是页面里真实存在的
   * `<h2 class="ex-family" id="ex-form">`，与家族 id 只是暂时一致；拼出来的规则改名后
   * 会变成「链接跳到页首」，而守卫无法核对。
   */
  section: string;
  members: readonly string[];
}

/**
 * L1 的 8 个家族，83 个组件每个只出现一次。
 *
 * 分家原则：先按「用户想干什么」分（录入 / 点一下 / 排版 / 看 / 翻 / 提示 / 手机上用），
 * 不按实现（浮层、表单、容器是实现细节，用户不这么找东西）。
 */
export const FAMILIES: readonly FamilyDef[] = [
  {
    id: "form",
    title: "表单录入",
    page: "components.html",
    section: "ex-form",
    members: [
      "z-input", "z-textarea", "z-select", "z-option", "z-checkbox", "z-radio", "z-radio-group",
      "z-search-bar", "z-switch", "z-slider", "z-rate", "z-number-input", "z-datepicker", "z-time-picker",
      "z-date-range", "z-upload", "z-form", "z-form-item",
    ],
  },
  {
    id: "action",
    title: "按钮与命令",
    page: "components.html",
    section: "ex-action",
    members: ["z-button", "z-command"],
  },
  {
    id: "layout",
    title: "布局",
    page: "components.html",
    section: "ex-layout",
    members: ["z-space", "z-flex", "z-grid", "z-grid-col", "z-divider", "z-sticky"],
  },
  {
    id: "display",
    title: "展示",
    page: "components.html",
    section: "ex-display",
    members: [
      "z-typography", "z-descriptions", "z-descriptions-item", "z-card", "z-tag", "z-badge",
      "z-avatar", "z-image", "z-statistic", "z-progress", "z-skeleton", "z-empty", "z-result",
      "z-timeline", "z-watermark", "z-accordion", "z-accordion-item", "z-calendar", "z-embed",
    ],
  },
  {
    id: "data",
    title: "数据",
    page: "components.html",
    section: "ex-data",
    members: ["z-table", "z-tree", "z-tree-node", "z-virtual-list"],
  },
  {
    id: "nav",
    title: "导航",
    page: "components.html",
    section: "ex-nav",
    members: [
      "z-tabs", "z-tab-panel", "z-segmented", "z-breadcrumb", "z-pagination", "z-menu", "z-menu-item",
      "z-context-menu", "z-steps", "z-anchor", "z-sidebar",
    ],
  },
  {
    id: "feedback",
    title: "反馈",
    page: "components.html",
    section: "ex-feedback",
    members: ["z-alert", "z-modal", "z-drawer", "z-popconfirm", "z-popover", "z-tooltip", "z-spinner"],
  },
  {
    id: "mobile",
    title: "移动端",
    page: "components.html",
    section: "ex-mobile",
    members: [
      "m-action-bar", "m-action-sheet", "m-card", "m-cell", "m-cell-group", "m-chip",
      "m-collapse", "m-empty", "m-floating-button", "m-grid", "m-grid-item", "m-list",
      "m-navbar", "m-notice-bar", "m-picker", "m-pull-refresh", "m-search", "m-stepper",
      "m-tabbar", "m-uploader",
      // 2026-11-16 §8.3 手势三件套
      "m-swipe-cell", "m-index-bar", "m-number-keyboard",
      // 2026-11-24 商城件：价格 / 勾选 / 单选 / 页签条 / 商品卡 / 结算栏
      "m-price", "m-checkbox", "m-radio", "m-radio-group", "m-tabs",
      "m-goods-card", "m-checkout-bar",
      // 2026-11-24 商城件第二批：轮播与规格弹层
      "m-swiper", "m-sku-picker",
      // 2026-11-24 商城件第三批：大图查看与倒计时
      "m-image-preview", "m-countdown",
      // 2026-11-24 商城件第四批：优惠券
      "m-coupon",
    ],
  },
];

/** 页在导航里的组。overview 单独一组，start 是「先读懂概念」，layer 是「按层查」。 */
export type PageGroup = "overview" | "start" | "layer" | "internal";

export interface PageDef {
  id: string;
  /** 相对 demo/ 的文件名；internal 页含子目录 */
  file: string;
  title: string;
  /** 英文名（语言切换用；缺省回落到 title） */
  titleEn?: string;
  /** 默认进侧栏；详情模板这类「靠参数进入」的页设 false */
  inNav?: boolean;
  group: PageGroup;
  /** 归属层；起步页与内部页没有层 */
  layer?: LayerId;
  /**
   * live = 文件已就绪且进侧栏；planned = 已定名但还没建（守卫允许它不存在）。
   * 判据先立、页面后建，否则「导航指向不存在的文件」和
   * 「文件建了但没人链」两件事都没人管。D4 收口时 planned 必须归零。
   */
  status: "live" | "planned";
}

/** 目标信息架构：13 个导航页 + 1 个详情模板 + 5 个内部页 = 19 个文件（现 25 个）。 */
export const PAGES: readonly PageDef[] = [
  { id: "index", file: "index.html", title: "Overview", group: "overview", status: "live" },

  { id: "start", file: "start.html", title: "安装与入口", titleEn: "Install & Entries", group: "start", status: "live" },
  { id: "react", file: "react.html", title: "在 React 里用", titleEn: "Using in React", group: "start", status: "live" },
  { id: "theming", file: "theming.html", title: "令牌与主题", titleEn: "Tokens & Theming", group: "start", status: "live" },
  { id: "density", file: "density.html", title: "密度与尺寸", titleEn: "Density & Size", group: "start", status: "live" },

  { id: "foundation", file: "foundation.html", title: "L0 地基", titleEn: "L0 Foundation", group: "layer", layer: "foundation", status: "live" },
  { id: "components", file: "components.html", title: "L1 控件", titleEn: "L1 Controls", group: "layer", layer: "base", status: "live" },
  // 详情模板：不在侧栏，靠 ?tag= 进入，117 个组件共用
  { id: "component", file: "component.html", title: "组件详情", titleEn: "Component", group: "layer", layer: "base", inNav: false, status: "live" },
  { id: "report", file: "report.html", title: "L2 报表", titleEn: "L2 Report", group: "layer", layer: "composite", status: "live" },
  { id: "flow", file: "flow.html", title: "L2 流程", titleEn: "L2 Flow", group: "layer", layer: "composite", status: "live" },
  { id: "doc", file: "doc.html", title: "L2 文档", titleEn: "L2 Document", group: "layer", layer: "composite", status: "live" },
  { id: "app", file: "app.html", title: "L2 应用件", titleEn: "L2 App Shell", group: "layer", layer: "composite", status: "live" },
  // 打印跨 report / doc / app 三域（谁都能包），单开一页 —— 它是「纸面上才算数」的一层，
  // 塞进任何一域都会让另外两域的人找不到
  { id: "print", file: "print.html", title: "打印", titleEn: "Print", group: "layer", layer: "composite", status: "live" },
  // 内容件 / 属性件（content、property）不单独开页：它们只以组合身份出现，
  // 挂到 report 与 app 页的「用到了谁」区块，避免为了 7 个组件再开两页。
  // 移动端控件（m-*）属 L1，与 PC 控件同一层 —— 它是画法不同，不是层不同
  { id: "h5", file: "h5.html", title: "移动端控件", titleEn: "Mobile Controls", group: "layer", layer: "base", status: "live" },

  { id: "visual", file: "internal/visual.html", title: "视觉对照", titleEn: "Visual Diff", group: "internal", status: "live" },
  { id: "theme-host", file: "internal/theme-host.html", title: "主题宿主", titleEn: "Theme Host", group: "internal", status: "live" },
  { id: "density-probe", file: "internal/density-probe.html", title: "密度探针", titleEn: "Density Probe", group: "internal", status: "live" },
  { id: "login-test", file: "internal/login-test.html", title: "登录页样本", titleEn: "Login Sample", group: "internal", status: "live" },
];

/**
 * 旧分类页：内容并入新页后删除。
 *
 * 「旧页还在、内容还没搬完」这个中间态必须被守卫看见 ——
 * 否则会出现「两边都有一点」，而没人知道哪边是准的。D2 结束时本数组必须为空。
 */
export const LEGACY_PAGES: readonly string[] = [
  // 已清空：分类页并入 components（D2-1）、验收页归 internal（D2-2）、
  // 数据类内联（D3-1/2）、整页 demo 改画框（D3-3）。留着这个名单是因为守卫要它存在：
  // 「还剩几个旧页」必须是可数的数字，而不是某人记得的状态。
];

/**
 * 搬迁计划：现存的「单一页面」并入哪个新页。
 *
 * 搬迁期最容易出的事不是「忘记建新页」，是**内容搬到一半两边都在**。
 * 写明 target 之后，D2 每删一个文件就是删一行；漏搬的页在名单里还挂着，看得见。
 * 判据：磁盘上每个 html 必须落在 PAGES / LEGACY_PAGES / MERGING 三者之一，不许有第四种状态。
 */
export interface MergePlan {
  file: string;
  /** 目标页的 PageDef.id */
  into: string;
}

export const MERGING: readonly MergePlan[] = [
];


/**
 * 画框预览：**刻意不删**的整页 demo。
 *
 * MERGING 的语义是「内容搬走、文件删除」；
 * 这 8 个页面的价值恰恰是「一整页长什么样」，删了就没得看。它们在文档页里以 iframe
 * 出现（一份代码两处用），因此必须被守卫单独认账，否则会和「谁都不管」的旧页混为一谈。
 */
export interface FramedDemo {
  /** 源文件（demo/ 下） */
  file: string;
  /** 被哪一页框住（PageDef.id） */
  framedBy: string;
  /** 画框标题 */
  title: string;
  /** 画框高度（px）——给「整页感」留够空间，又不至于一屏全是框。`fit` 为真时只当占位 */
  height: number;
  /**
   * 高度跟着内容走。
   *
   * 有的页在画框里就是「一屏全貌」（高度可量、内容固定），
   * 有的页是「一个可操作的画布」（后台布局、编辑器），它们要的是固定视口 + 框内滚动 ——
   * 拉成内容高度会让侧栏/画布失去「整页」的感觉。这条开关是逐页判断，不是统一风格。
   */
  fit?: boolean;
}

export const FRAMED_DEMOS: readonly FramedDemo[] = [
  { file: "admin-layout.html", framedBy: "app", title: "后台布局（整页）", height: 620 },
  { file: "complex.html", framedBy: "app", title: "11 个场景组合（整页）", height: 640 },
  { file: "flow-editor.html", framedBy: "flow", title: "流程编辑器（整页）", height: 620 },
  // 套件页的内容高度是固定的（手机壳 720px + 说明），量出来就能一屏看完；
  // 固定高度只会两头不讨好：框高了留白，框矮了在框里再滚一次。
  { file: "h5-kit.html", framedBy: "h5", title: "H5 控件实验台（整页）", height: 820, fit: true },
  { file: "doc-template.html", framedBy: "doc", title: "文档模板编辑器（整页）", height: 620 },
  // 图表两条：此前是「磁盘上有、四份名单里都没有」的孤儿页（`demo-nav-guard` ⑥ 一直红）。
  // 它们不是待删的旧页 —— 价值正是「一屏看完全部图表长相」，所以进画框，而不是进 LEGACY。
  { file: "chart-types.html", framedBy: "report", title: "图表类型全集（整页）", height: 720 },
  // 两阶段确认（`form preview=`）的唯一完整闭环：三态是**交互状态**，截图看不出来，
  // 所以它必须是一页能点的 demo，而不是文档里的示意图。
  // 跨域写入的两道门（issue IKW576 #7）：四个按钮 = 同源 / 未声明 / 已声明 / 被收窄。
  // 内容高度固定（四张卡片 + 两段说明），量出来一屏看完；固定高度只会留白。
];

/** 侧栏分组标题（顺序即渲染顺序）。 */
export const GROUP_TITLES: Readonly<Record<PageGroup, string>> = {
  overview: "概览",
  start: "起步",
  layer: "层",
  internal: "内部",
};

export const GROUP_TITLES_EN: Readonly<Record<PageGroup, string>> = {
  overview: "Overview",
  start: "Getting Started",
  layer: "Layers",
  internal: "Internal",
};

/** 详情页 URL：一页承接 117 个组件。 */
export function componentHref(tag: string): string {
  return `./component.html?tag=${encodeURIComponent(tag)}`;
}

/** 某层的家族（地图与侧栏 L1 分组都用它，避免两处各写一遍过滤条件）。 */
export function familiesOf(page: string): readonly FamilyDef[] {
  return FAMILIES.filter((f) => f.page === page);
}

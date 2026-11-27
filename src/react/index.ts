export { createReactWrapper } from "./createReactWrapper.js";

import { createReactWrapper } from "./createReactWrapper.js";

export const ZBadgeReact = createReactWrapper("z-badge");
export const ZButtonReact = createReactWrapper("z-button");
export const ZCheckboxReact = createReactWrapper("z-checkbox");
export const ZDividerReact = createReactWrapper("z-divider");
// 布局原语（2026-11-15 新增）：AI 生成布局的积木，React 宿主没有包装就只能手搓 div + style
export const ZSpaceReact = createReactWrapper("z-space");
export const ZFlexReact = createReactWrapper("z-flex");
export const ZGridReact = createReactWrapper("z-grid");
export const ZGridColReact = createReactWrapper("z-grid-col");
export const ZTypographyReact = createReactWrapper("z-typography");
export const ZStickyReact = createReactWrapper("z-sticky");
export const ZMActionBarReact = createReactWrapper("m-action-bar");
export const ZPopconfirmReact = createReactWrapper("z-popconfirm");
export const ZDescriptionsReact = createReactWrapper("z-descriptions");
export const ZDescriptionsItemReact = createReactWrapper("z-descriptions-item");
export const ZInputReact = createReactWrapper("z-input");
export const ZMenuReact = createReactWrapper("z-menu");
export const ZContextMenuReact = createReactWrapper("z-context-menu");
export const ZSearchBarReact = createReactWrapper("z-search-bar");
export const ZMenuItemReact = createReactWrapper("z-menu-item");
export const ZModalReact = createReactWrapper("z-modal");
export const ZOptionReact = createReactWrapper("z-option");
export const ZRadioReact = createReactWrapper("z-radio");
export const ZRadioGroupReact = createReactWrapper("z-radio-group");
export const ZSelectReact = createReactWrapper("z-select");
export const ZSwitchReact = createReactWrapper("z-switch");
export const ZTabPanelReact = createReactWrapper("z-tab-panel");
export const ZTableReact = createReactWrapper("z-table");
export const ZTabsReact = createReactWrapper("z-tabs");
export const ZSegmentedReact = createReactWrapper("z-segmented");
export const ZTooltipReact = createReactWrapper("z-tooltip");

export const ZSpinnerReact = createReactWrapper("z-spinner");
export const ZCardReact = createReactWrapper("z-card");
export const ZTagReact = createReactWrapper("z-tag");
export const ZAvatarReact = createReactWrapper("z-avatar");
export const ZSkeletonReact = createReactWrapper("z-skeleton");
export const ZAlertReact = createReactWrapper("z-alert");
export const ZProgressReact = createReactWrapper("z-progress");
export const ZPaginationReact = createReactWrapper("z-pagination");
export const ZAccordionReact = createReactWrapper("z-accordion");
export const ZAccordionItemReact = createReactWrapper("z-accordion-item");
export const ZPopoverReact = createReactWrapper("z-popover");
export const ZReportTableReact = createReactWrapper("z-report-table");
export const ZColumnSelectorReact = createReactWrapper("z-column-selector");
export const ZChartReact = createReactWrapper("z-chart");
export const ZChartSeriesReact = createReactWrapper("z-chart-series");
export const ZChartAxisReact = createReactWrapper("z-chart-axis");
export const ZAppShellReact = createReactWrapper("z-app-shell");
export const ZSidebarReact = createReactWrapper("z-sidebar");
export const ZBreadcrumbReact = createReactWrapper("z-breadcrumb");
// [2026-11-05] 跨应用切换器：四个宿主共用（Vue 宿主写原生标签，zEtl 走这个包装）。
// 它派发的 `z-switch` 只带 detail，不自己导航 —— 所以 React 侧也只需绑定事件。
export const ZAppSwitcherReact = createReactWrapper("z-app-switcher");

export const ZFlowReact = createReactWrapper("z-flow");
export const ZFlowNodeReact = createReactWrapper("z-flow-node");
export const ZFlowHandleReact = createReactWrapper("z-flow-handle");
export const ZFlowMinimapReact = createReactWrapper("z-flow-minimap");
export const ZFlowControlsReact = createReactWrapper("z-flow-controls");

export const ZTextareaReact = createReactWrapper("z-textarea");
export const ZNumberInputReact = createReactWrapper("z-number-input");
export const ZSliderReact = createReactWrapper("z-slider");
export const ZRateReact = createReactWrapper("z-rate");
export const ZFormItemReact = createReactWrapper("z-form-item");
export const ZFormReact = createReactWrapper("z-form");
export const ZUploadReact = createReactWrapper("z-upload");
export const ZCalendarReact = createReactWrapper("z-calendar");
export const ZDateRangeReact = createReactWrapper("z-date-range");
export const ZTimePickerReact = createReactWrapper("z-time-picker");
export const ZDrawerReact = createReactWrapper("z-drawer");
export const ZStepsReact = createReactWrapper("z-steps");
export const ZAnchorReact = createReactWrapper("z-anchor");
export const ZTimelineReact = createReactWrapper("z-timeline");
export const ZStatisticReact = createReactWrapper("z-statistic");
export const ZEmptyReact = createReactWrapper("z-empty");
export const ZResultReact = createReactWrapper("z-result");
export const ZImageReact = createReactWrapper("z-image");
// [2026-11-20] 嵌入 HTML 页面。漏了包装的表现和 z-print 同类：宿主里那块位置是空白，
// 不报错 —— z-embed 不 import 就没有自定义元素，React 照常渲染一个空标签。
export const ZEmbedReact = createReactWrapper("z-embed");

export const ZWatermarkReact = createReactWrapper("z-watermark");
export const ZCommandReact = createReactWrapper("z-command");
export const ZVirtualListReact = createReactWrapper("z-virtual-list");
export const ZJsonViewerReact = createReactWrapper("z-json-viewer");
export const ZRichTextReact = createReactWrapper("z-rich-text");
export const ZDataListReact = createReactWrapper("z-data-list");
export const ZCodeEditorReact = createReactWrapper("z-code-editor");

// [WHY] 文档模板模块（issue IKICYW）：Vue3 宿主按需引入原生组件，React 宿主走下列包装
export const ZDocTemplateManagerReact = createReactWrapper("z-doc-template-manager");
export const ZDocTemplateEditorReact = createReactWrapper("z-doc-template-editor");
export const ZDocPreviewReact = createReactWrapper("z-doc-preview");


// [WHY] 2026-10-25 系统审计：以下 6 个元素早已注册（customElements.define）却一直没有
// React 包装 —— React 宿主只能拿 dangerouslySetInnerHTML 或裸 ref 硬凑。
// 覆盖率靠 tests/unit/react-wrapper-coverage.test.ts 守住：新增组件忘包装即红。
export const ZTreeReact = createReactWrapper("z-tree");
export const ZTreeNodeReact = createReactWrapper("z-tree-node");
export const ZGanttReact = createReactWrapper("z-gantt");
export const ZMarkdownReact = createReactWrapper("z-markdown");
export const ZReportCardReact = createReactWrapper("z-report-card");
export const ZReportGroupTableReact = createReactWrapper("z-report-group-table");

// [NOTE] z-portal / z-position 不提供 React 包装：它们是 primitives 层的内部原语
// （负责把子节点投递到 body / 计算锚点坐标），没有面向应用的属性契约，
// 应用侧应当只在需要逃逸 overflow 或定位时直接写原生标签。
// 守卫测试的白名单里显式列出它们，避免「漏包装」与「刻意不包装」混淆。

// [2026-10-24] 补齐 React 包装：上游 react 入口缺这几个组件的 wrapper，
// 而消费方（zEtl 报表页 / 规则编辑器）在源码消费模式下需要它们。
export const ZDatepickerReact = createReactWrapper("z-datepicker");
export const ZLoginReact = createReactWrapper("z-login"); // login 组件源码已有但未纳入 dist 构建入口；zEtl 登录页使用
export const ZDetailFormReact = createReactWrapper("z-detail-form"); // schema 驱动详情表单
export const ZPropertyPanelReact = createReactWrapper("z-property-panel");
export const ZPropertyGroupReact = createReactWrapper("z-property-group");
export const ZPropertyRowReact = createReactWrapper("z-property-row");

// [2026-10-25] 补齐移动端 m-* 组件的 React 包装：上游「收纳 10 个移动端组件」只加了
// 元素与子入口，没加 react 层；`react-wrapper-coverage` 守卫把缺口列成可直接粘贴的清单。
// 命名沿用 Z + 元素名（去掉连字符），与既有 ZReportGroupTableReact 一类保持一致。
export const ZMActionSheetReact = createReactWrapper("m-action-sheet");
export const ZMCardReact = createReactWrapper("m-card");
export const ZMChipReact = createReactWrapper("m-chip");
export const ZMCollapseReact = createReactWrapper("m-collapse");
export const ZMEmptyReact = createReactWrapper("m-empty");
export const ZMFloatingButtonReact = createReactWrapper("m-floating-button");
export const ZMListReact = createReactWrapper("m-list");
export const ZMNavbarReact = createReactWrapper("m-navbar");
export const ZMPullRefreshReact = createReactWrapper("m-pull-refresh");
export const ZMTabbarReact = createReactWrapper("m-tabbar");

// [2026-11-08] REQ-027 新增的 H5 组件。与上面同一套路数；`z-page-m-view` 是 H5 页面宿主，
// 对应 PC 的 `z-page-view` —— 两个页面渲染器各有自己的包装，不共用一个。
export const ZMCellReact = createReactWrapper("m-cell");
export const ZMCellGroupReact = createReactWrapper("m-cell-group");
export const ZMGridReact = createReactWrapper("m-grid");
export const ZMGridItemReact = createReactWrapper("m-grid-item");
export const ZMNoticeBarReact = createReactWrapper("m-notice-bar");
export const ZMPickerReact = createReactWrapper("m-picker");
export const ZMSearchReact = createReactWrapper("m-search");
export const ZMStepperReact = createReactWrapper("m-stepper");
export const ZMUploaderReact = createReactWrapper("m-uploader");
export const ZPageMViewReact = createReactWrapper("z-page-m-view");

// [2026-11-16] §8.3 手势三件套。三者都是「界面正常但操作入口对键盘/读屏关闭」的高危区，
// 所以它们各自带了键盘等价路径（左滑行 = 内容区 Enter；索引条 = 真按钮；数字键 = 真按钮）。
export const ZMSwipeCellReact = createReactWrapper("m-swipe-cell");
export const ZMIndexBarReact = createReactWrapper("m-index-bar");
export const ZMNumberKeyboardReact = createReactWrapper("m-number-keyboard");

// [2026-11-24] 商城六件（REQ-051）。`m-radio-group` 也是独立元素（组负责互斥，见组件注释）。
export const ZMPriceReact = createReactWrapper("m-price");
export const ZMCheckboxReact = createReactWrapper("m-checkbox");
export const ZMRadioReact = createReactWrapper("m-radio");
export const ZMRadioGroupReact = createReactWrapper("m-radio-group");
export const ZMTabsReact = createReactWrapper("m-tabs");
export const ZMGoodsCardReact = createReactWrapper("m-goods-card");
export const ZMCheckoutBarReact = createReactWrapper("m-checkout-bar");
export const ZMSwiperReact = createReactWrapper("m-swiper");
export const ZMSkuPickerReact = createReactWrapper("m-sku-picker");
export const ZMImagePreviewReact = createReactWrapper("m-image-preview");
export const ZMCountdownReact = createReactWrapper("m-countdown");
export const ZMCouponReact = createReactWrapper("m-coupon");

// [2026-10-25] PageDef 渲染器：页面定义（脚本 + AST）的宿主对应物。
// zEtl 与 zWorker 都引这一个元素 —— 页面长什么样由同一份 AST 决定，
// 不各自实现一遍版式（两份实现的漂移表现为「同一个页面两边长得不一样」，且不报错）。
export const ZPageViewReact = createReactWrapper("z-page-view");
// 页面定义编辑器。属性只有一个入口 `setDocument(ast, script, sources)`，
// 命令式方法（setDatasets / 取回脚本）由 ref 拿到元素后调用 —— 与 z-page-view 同一套路数。
export const ZPageEditorReact = createReactWrapper("z-page-editor");
// H5 编辑器是**另一套外壳**（顺序流 + 手机画布），与 PC 编辑器并列，不共用包装。
export const ZPageEditorH5React = createReactWrapper("z-page-editor-h5");
// [2026-11-15] 打印。React 宿主里最容易漏的一个：它不参与布局、界面上「没有东西」，
// 忘了包装也不会有人发现（`<ZPrintReact ref>` 拿到 undefined → 打印按钮点了没反应，零报错）。
export const ZPrintReact = createReactWrapper("z-print");
// [2026-11-17] 侧栏导航（[[REQ-040-app-nav]]）。与 z-print 同类：宿主很容易「只 import 了
// z-app-shell 就以为菜单也有了」—— 骨架里那个槽位没内容，界面上是一块空白。
export const ZAppNavReact = createReactWrapper("z-app-nav");
// 浮层与定位原语（与 component-manifest.json 对齐，由 react-wrapper-guard 守住）
export const ZPortalReact = createReactWrapper("z-portal");
export const ZPositionReact = createReactWrapper("z-position");

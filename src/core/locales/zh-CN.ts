// 简体中文语言包 —— **默认语言**，也是所有语言的最终回退。
//
// [WHY 它是默认] 2026-11-27 定：库的定位是多语言业务组件库，但存量宿主几乎都是中文界面、
// 而且大多「直接引组件、不配任何文案」。把默认改成英文会让这批宿主一夜之间中英混排。
// 所以默认装载 zh-CN，其它语言由宿主 `setLocale(locale, pack)` 切换。
//
// [「默认中文」≠「组件里可以写中文」] 本文件与 `en-US.ts` 地位相同，只是被默认装载。
// 组件里出现的任何自然语言文字都必须来自语言包（经 `t()` 或 `COPY.*`），
// 由 `bin/text-guard.mjs` 守住（只减不增）。
//
// [键的约定] 只收**跨组件复用的概念**（与原 `COPY` 词表同一份清单、同一条判据）。
// 组件专属文案暂由组件属性默认值承担，按目录逐步迁入（见架构评审报告第 5 节）。
//
// [WHY `satisfies` 而不是 `as const`] `as const` 会把值收成字面量类型，`closeLabel = COPY.close`
// 的属性类型就成了 `"关闭"` 而不是 `string`，宿主赋别的值会编译报错。`satisfies` 只校验形状。

export const zhCN = {
  // ── 状态 ──
  /** 列表/表格/树没有数据。 */
  empty: "暂无数据",
  /** 正在加载。用单个省略号字符 `…` 而不是三个点 —— 三个点在等宽字体下会被拆行。 */
  loading: "加载中…",

  // ── 通用动作（按钮 / aria 名称） ──
  confirm: "确定",
  cancel: "取消",
  close: "关闭",
  /** 清除已选值（日期、下拉）。 */
  clear: "清除",
  /** 输入框的清除按钮：比 `clear` 多一层宾语，因为输入框周围可能还有别的"清除"。 */
  clearInput: "清除输入",
  reset: "重置",
  remove: "移除",
  /** 关闭一条提示条（aria）。比 `close` 具体，读屏时能听出关的是什么东西。 */
  closeAlert: "关闭提示",
  /**
   * 列表行左滑露出的那组操作（`m-swipe-cell` 的操作区名称）。
   * 读屏进到操作区会念「分组，<名字>」；没有名字时用户分不清是行操作还是整页工具栏。
   */
  rowActions: "行操作",
  /**
   * 数字键盘上的退格键（图标按钮的可访问名称）。
   * 不能沿用 `remove` / `clear`：退格只删一个字符，与「清空整个值」后果相差一个数量级。
   */
  backspace: "退格删除",

  // ── 选择 ──
  all: "全部",
  yes: "是",
  no: "否",

  // ── 分页 ──
  /** 分页导航区的 aria 名称（`<nav aria-label>`）。 */
  pagination: "分页",
  prevPage: "上一页",
  nextPage: "下一页",
  /** 每页条数后缀，拼成「10 条/页」。 */
  pageSizeSuffix: "条/页",

  // ── 日历 ──
  prevMonth: "上个月",
  nextMonth: "下个月",

  // ── 表格 / 列设置 ──
  /** 列选择入口的按钮文案。 */
  columns: "列选择",
  columnSettings: "列设置",
  requiredField: "必选字段",
  /** 列选择器里拖拽手柄的提示（悬停可见）：说明这个把手能把列挪位。 */
  reorderColumn: "拖动调整顺序",
  alignLeft: "左对齐",
  alignCenter: "居中",
  alignRight: "右对齐",
  pinNone: "不冻结",
  pinLeft: "冻结到左侧",
  pinRight: "冻结到右侧",
  /** 合计行的行首标签。 */
  total: "合计",
  /**
   * Markdown 表格外层横向滚动容器的名称（`role="region"` 的名字）。
   * 可滚动容器会进 Tab 序，没有名字时键盘用户 Tab 到一个「什么都不说」的东西上。
   */
  tableRegion: "表格",

  // ── 图表 / 甘特 ──
  /** 图表键盘导航的提示语：读屏用户得先知道「这里能用方向键」才会去试。 */
  chartKeyboardHint: "方向键逐个查看数据点，Home / End 跳到首尾，Esc 关闭；开了框选时 Shift 加方向键选一段、Enter 提交",
  /** 缩放条三个可聚焦部件的可读名：三个同名滑块等于没有标签。 */
  chartZoomStart: "缩放起点",
  chartZoomEnd: "缩放终点",
  chartZoomWindow: "缩放区间（左右拖动平移）",
  /** 甘特图键盘导航的提示语。 */
  ganttKeyboardHint:
    "上下方向键切换任务，右方向键展开、左方向键收起，Shift 加左右方向键横向滚动时间轴，Home / End 首尾，Esc 取消选中",
  /** 甘特图的编辑键位（仅在可编辑时拼进提示；只读的甘特不该念编辑键位）。 */
  ganttEditHint:
    "Alt 加左右方向键整体平移一天，Alt 加 Shift 加左右方向键改结束日期，Alt 加上下方向键改进度，Alt 加回车建立前置依赖，回车确认，Esc 取消",
  /**
   * 连线待定的播报（`Alt + Enter` 之后立刻念一次）。中间那一步界面上没有任何变化，
   * 不播报的话用户不知道自己在「连线模式」里。占位符 `{task}` / `{from}` / `{to}` 由 Gantt 填充。
   */
  ganttLinkArmed: "已把「{task}」设为前置任务，用上下方向键选择后继任务，回车建立依赖，Esc 取消",
  ganttLinkDone: "已建立依赖：{from} → {to}",
  ganttLinkCancelled: "已取消连线",
  /** 拒绝原因要念出来：静默失败和「产品没实现」在用户那里是同一件事。 */
  ganttLinkRejectedSelf: "不能把任务连到它自己",
  ganttLinkRejectedDuplicate: "这两个任务之间已经有依赖了",
  ganttLinkNoSelection: "先选中一条任务",
  /** 甘特图的区域名称。 */
  gantt: "甘特图",

  // ── 数值控件 ──
  increment: "增加",
  decrement: "减少",

  // ── 编辑器类 ──
  /**
   * 富文本工具条的 aria 名称（`role="toolbar"` 的名字）。不叫「格式」：报表表格里
   * 「格式」指数字/日期格式，两个概念撞同一个字面量会被 `copy-guard` C4 拦下。
   */
  formatToolbar: "文本格式",
  // ── 视图缩放 ──
  /** 缩放按钮的名字：按钮文本是 `−` / `＋`，没有名字时读屏念「减号 按钮」。 */
  zoomOut: "缩小",
  zoomIn: "放大",
  /** 把视图缩放重置回 100%。名字说动作而不是结果（按钮上显示的是当前缩放）。 */
  zoomReset: "重置缩放",
  /** 数字键盘上的小数点键：只有 `.` 时读屏念「句点」。 */
  decimalPoint: "小数点",

  // ── 应用切换器 ──
  /** 应用切换面板的名字（`role="menu"` 的 `aria-label`）。 */
  switchApp: "切换应用",
  /** 标记「当前所在的应用」：同时是视觉徽标文字与可访问名的一部分。 */
  currentApp: "当前",

  /** 侧栏导航的 `<nav>` 名称：页面上通常有两个 navigation 地标，靠名字区分。 */
  mainNav: "主导航",

  /** 代码编辑器补全列表的 aria 名称（`role="listbox"` 的名字）。 */
  suggestions: "补全建议",

  // ── L1 控件补充 ──
  search: "搜索",
  copy: "复制",
  clearAll: "清空",
  removeItem: "移除 {label}",
  selectedCount: "已选 {count} 项",
  noneSelected: "未选择",
  commandPlaceholder: "输入命令…",
  commandPalette: "命令面板",
  commandSearch: "搜索命令",
  commandResults: "命令结果",
  noMatches: "无匹配结果",
  dateRangePicker: "日期范围选择器",
  dateOutOfRange: "超出可选日期范围",
  quickRanges: "快捷区间",
  timeLabel: "时间",
  timeStart: "起",
  timeEnd: "止",
  timeHour: "{label}时",
  timeMinute: "{label}分",
  confirmAction: "确认执行此操作？",

  // ── 登录 / 移动端控件 ──
  username: "用户名",
  password: "密码",
  rememberMe: "记住我",
  forgotPassword: "忘记密码？",
  signIn: "登录",
  signUp: "注册",
  loginRequired: "请填写用户名和密码",
  back: "返回",
  viewFullImage: "查看大图",
  quickJump: "快速定位",
  retryLoad: "点击重试",
  loadingDots: "加载中...",
  noMore: "没有更多了",
  refreshing: "刷新中...",
  releaseToRefresh: "释放刷新",
  pullToRefresh: "下拉刷新",
  soldOut: "已售罄",
  addToCart: "加入购物车",
  daysUnit: "{count} 天",
  checkout: "去结算",
  selectAll: "全选",
  checkoutBar: "结算",
  itemCount: "共 {count} 件",
  imageCarousel: "图片轮播",
  slideNumber: "第 {index} 张",
  carouselRole: "轮播",

  // ── 嵌入 / 优惠券 / 上传 / 规格选择 ──
  embedLazy: "进入视口后加载",
  embedTitle: "嵌入页面",
  embedTimeout: "加载超时",
  embedLoading: "加载中",
  retry: "重试",
  embedNoSource: "未配置 src 或 html",
  couponUsed: "已使用",
  couponExpired: "已过期",
  freeShipping: "免运费",
  discountUnit: "折",
  noThreshold: "无门槛",
  couponCondition: "满 {amount} 可用",
  couponLabel: "优惠券",
  couponDiscountText: "{value} 折",
  couponAmountText: "满 {threshold} 减 {value}",
  upload: "上传",
  selectedFallback: "已选择",
  videoPrefix: "视频：{name}",
  deleteItem: "删除",
  recordVideo: "录像",
  takePhoto: "拍照",
  album: "相册",
  selectSpecs: "选择规格",
  pleaseSelect: "请选择 {fields}",
  selectedValue: "已选：{value}",
  stockCount: "库存 {count} 件",
  quantity: "数量",
  selectSpecsPrompt: "请选择规格",

  // ── L2 内容 / 流程 / 报表交互 ──
  rootNode: "根",
  expand: "展开",
  collapse: "折叠",
  itemsShort: "{count} 项",
  copyPath: "复制 {path}",
  flowChart: "流程图",
  flowNodes: "画布节点",
  fitView: "适应视图",
  chartPointsSelected: "已选 {count} 个数据点",
  chartNoPointsSelected: "未选到数据点",
  chartKeyboardBrush: "键盘框选 {count} 个数据点（到「{label}」），Enter 提交，Esc 取消",
  exportAction: "导出",
  refreshAction: "刷新",
  viewDetail: "查看明细",
  editAction: "编辑",
  noChart: "未绑定图表",
  waitingConfig: "等待配置",
  updating: "正在更新…",
  queryDone: "查询完成",
  updateFailedFallback: "更新失败，以下保留上次结果",
  updateFailed: "更新失败",
  collapsePanel: "收起",
  queryFailed: "查询失败",
  formatLabel: "格式",
  numberFormat: "数值",
  percentFormat: "百分数",
  decimalPlaces: "小数位",
  thousandsSep: "千分位",
  autoOption: "自动",
  pagerTotal: "共 {n} 条",
  pagerPage: "第 {p} / {c} 页",
  pagerSize: "每页 {n} 行",
  pagerSizeLabel: "每页行数",

  // ── 富文本 / 文档模板 ──
  bold: "粗体",
  italic: "斜体",
  underline: "下划线",
  bulletListLabel: "• 列表",
  unorderedList: "无序列表",
  numberedListLabel: "1. 列表",
  orderedList: "有序列表",
  quoteLabel: "❝ 引用",
  blockquote: "引用块",
  clearFormatting: "清除格式",
  inputPlaceholder: "输入内容...",
  docPreview: "文档预览",
  printAction: "打印",
  exportDocx: "导出 docx",
  generateDoc: "生成文档",
  emptyContent: "暂无内容",
  exporting: "导出中...",
  exportFailed: "导出失败",
  noExportAdapter: "未注入导出适配器",
  docPageInfo: "第 {page} 页 / 共 {total} 页",
  docTemplates: "文档模板",
  searchTemplatePlaceholder: "搜索模板名称",
  newTemplate: "新建模板",
  allCategories: "全部分类",
  templateName: "模板名称",
  category: "分类",
  description: "描述",
  updatedAt: "更新时间",
  defaultBadge: "默认",
  actionsColumn: "操作",
  emptyTemplates: "暂无模板",
  totalCount: "共 {total} 条",
  confirmDeleteTemplate: "确定删除该模板？",
  columnN: "列{n}",
  partyASignature: "甲方（签章）：",
  partyBSignature: "乙方（签章）：",

  // ── 文档模板编辑器面板 ──
  docHeading: "标题",
  docParagraph: "段落",
  docList: "列表",
  docSignature: "签名区",
  moveUp: "上移",
  moveDown: "下移",
  multiSelect: "多选",
  propertiesTab: "属性",
  placeholdersTab: "占位符",
  typographyTab: "排版",
  insertAction: "插入",
  noPlaceholderDef: "宿主未注入占位符定义",
  emptyDocCanvas: "点击上方按钮添加区块",
  alignLabel: "对齐",
  alignLeftShort: "左",
  alignCenterShort: "中",
  alignRightShort: "右",
  fontFamily: "字体",
  fontSize: "字号",
  colorLabel: "颜色",
  boldAction: "加粗",
  firstLineIndent: "首行缩进",
  removeIndent: "取消缩进",
  columnWidthPt: "列宽 (pt)",
  tableConfig: "表格配置",
  dataKeyLabel: "数据键 (dataKey)",
  dataKeyHint: "留空 = 静态表格（手填行数据）",
  fieldColumn: "字段",
  headerColumn: "表头",
  addColumn: "加列",
  removeColumn: "删列",
  undefinedField: "未定义",
  noTableFieldDef: "宿主未注入 table 类型占位符定义",
  staticRows: "静态行",
  addRow: "加行",
  removeLastRow: "删末行",
  bodyFont: "正文字体",
  headingFont: "标题字体",
  bodySize: "正文字号",
  headingSize: "标题字号",
  lineHeight: "行距",
  paraSpacingPt: "段间距 (pt)",
  firstIndentDetail: "首行缩进 (2ch / 24pt)",
  pageMarginMm: "页边距 (mm)",
  pageHeader: "页眉",
  pageFooter: "页脚",
  pageBreakLabel: "第 {page} 页",
  marginTopShort: "上",
  marginBottomShort: "下",
  headerPlaceholder: "每页顶部, 留空不显示",
  footerPlaceholder: "每页底部, 留空不显示",
} satisfies Record<string, string>;

/** 语言包的键（所有语言包必须给出同一组键，由 `locale-pack-guard` 守住）。 */
export type MessageKey = keyof typeof zhCN;

export default zhCN;

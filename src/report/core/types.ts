// 报表域类型定义 —— **本文件是唯一真源**。
//
// 来源：2026-10-24 从 zEtl 的「平台类型总表」整段切出（那份把数据集/规则/本体/连接器
// 全塞在一个文件里，宿主想嵌一个看板要牵进几百个无关类型）。切出时实测该段对宿主类型
// 零依赖，所以能整段独立。
//
// [WHY 放本库而不是业务仓] 本库是框架无关的 Web Components 库，报表的
// 「配置形状」和「怎么渲染」是两个仓库的公共契约：zEtl（React）与 zWorker（Vue）
// 各自要产生、消费同一份报表配置。类型留在任一业务仓，另一侧就只能抄一份，
// 而抄的那份迟早和真源不一致 —— 症状是同一份配置在两边校验通过/失败不同。
//
// 回写约定：**新增报表类型只加在本文件**。业务仓若需要旧的 `import type { Report } from "./types"`
// 写法，在那边做反向再导出，不要在本文件迁就宿主。

/**
 * 报表列的最小形状（structural typing）。
 *
 * [WHY 不直接复用宿主 Column] 宿主的 Column（zetl-rule-editor）带着 dataType /
 * isPrimary / selected 等规则编辑器专用字段。报表实际只用到「展示名从哪来」
 * 这几个字段，声明最小形状后，任何宿主的列类型只要含这些字段就自动兼容，
 * 包不必去依赖宿主类型包（否则又会把两个仓库的版本绑死）。
 * 与 column-label.ts 的 LabeledColumn 保持同形。
 */
export interface Column {
  name: string;
  /** 物理类型（varchar / decimal / datetime…）。报表用它做默认格式化与「是不是日期列」判断 */
  dataType: string;
  alias?: string;
  comment?: string;
  /** 计算字段（数据集虚拟列，无物理表对应） */
  computed?: boolean;
  /** 语义类型标注（date/datetime/number/text；空 = 未标注）。语义优先于物理类型 */
  semanticType?: string;
}

/** 数据集字段（带语义标注）。与宿主 SemanticColumn 结构兼容。 */
export interface SemanticColumn extends Column {
  semanticType?: string;
  computed?: boolean;
  nullable?: boolean;
  isPrimary?: boolean;
}

/**
 * 字段清单的**宽松形态**：只保证有 name。
 *
 * [WHY 不用 SemanticColumn] 宿主的 etl_dataset.fields 是 DatasetFieldConfig
 * （名字/别名/描述/是否选中），**没有 dataType** —— 它描述的是「数据集配了哪些字段」，
 * 不是「物理表返回了什么类型」。报表要在这种清单上做下拉，就不能要求 dataType。
 * 真正需要类型的地方（格式化、日期判定）一律走 getDatasetMeta 拿列元数据。
 */
export interface DatasetBriefField {
  name: string;
  alias?: string;
  comment?: string;
  dataType?: string;
  semanticType?: string;
  computed?: boolean;
  selected?: boolean;
}

/**
 * 数据集的最小形状：报表只用它做「选数据集」下拉与字段来源。
 *
 * [WHY 不复用宿主 Dataset] 宿主那个带着同步声明 / 固化标记 / 数据源绑定等
 * 十几项管理面字段，报表一项都不用。声明最小形状后 zWorker 传自己的
 * 数据集结构也能对上（它没有 etl_dataset 那一套）。
 */
export interface Dataset {
  id: number;
  name: string;
  tableName?: string;
  /** 「最近更新」展示用 */
  updatedAt?: string;
  fields?: DatasetBriefField[];
}

// ---- BI 报表（可编辑报表页：字段井 + 分组汇总 + 图表，参考 Tableau/Power BI 布局） ----

/** 报表指标（聚合度量） */
export interface ReportMeasure {
  field: string; // 物理列名（数据集字段白名单）或数据集计算字段 key
  agg: "sum" | "avg" | "min" | "max" | "count" | "countDistinct" | "sumIf" | "countIf" | "avgIf" | "countGroup" | "";
  alias?: string; // 展示别名（空 = 自动 agg_field）
  /** 数据集计算字段度量：true 时 Field=计算字段 key；agg 空 = 表达式已含聚合（如 SUM([销量])*1.13），非空 = 外包聚合（如 SUM(单价*数量)） */
  computed?: boolean;
  /** 仅 countGroup：内层分组键（如 [customer_id]；复购按支付单求和判定） */
  groupBy?: string[];
  /** 仅 countGroup：内层计数/求和阈值（默认 1；复购 = 支付单 >= 2） */
  havingMin?: number;
  /** 仅 countGroup：内层求和字段（空 = COUNT(*) 行数；复购用 pay_count 支付单数） */
  aggField?: string;
  /** 仅 sumIf/countIf/avgIf：条件过滤 */
  condition?: ReportFilter;
}

/** 报表筛选条件 */
export interface ReportFilter {
  field: string;
  op: "=" | "!=" | ">" | ">=" | "<" | "<=" | "like" | "in" | "notIn" | "between" | "isNull" | "isNotNull";
  value?: unknown;
}

/** 计算字段（报表级，不写回数据集）：函数式表达式 [字段名]/FUNC(...)，与数据集计算字段同语法。
 * 旧数据兼容：expr 引用聚合别名（如 sum_received_amount / sum_total_amount * 100）时为聚合后四则求值。 */
export interface ReportComputedField {
  key: string; // 唯一 key（列 key，^[A-Za-z_][A-Za-z0-9_]*$）
  name: string; // 展示名（列标题）
  expr: string; // 函数式表达式（引用字段 [字段名]，支持 SUM/AVG 等函数）；旧数据可为聚合别名四则
  /** 字段类型：number/text/date/datetime（决定伪列物理类型映射与报表分区） */
  semanticType?: string;
}

/** 卡片种类（编辑器/渲染范式）：判据是「编辑器表单与渲染代码实际分叉的位置」，不是语义分类。
 *  chart=画图（ZChartReact）/ table=表格（含分组、树状）/ detail=明细（逐行不聚合）/ kpi=单值指标。
 *  text=文本卡 / image=图片卡 —— 这两类**不查数据**，是看板上的说明与配图。
 *  **不含筛选器卡**：它不产出数据、只改变别的卡查什么，因此不是 charts[] 的一员，
 *  而是 config.filterCards 这个独立结构（见 ReportFilterCard）。
 *  加新形态（堆积柱、面积图）只扩 chartType，不动本字段 ⇒ 那些散落 20+ 处的判断无需再改。 */
export type CardKind = "chart" | "table" | "detail" | "kpi" | "text" | "image";

/** 堆积方式（M10）。缺省 none = 并排，与加这个字段之前的渲染完全一致。
 *  percent = 百分比堆积：每个分类内各系列归一到 100%，轴变成 0–100。 */
export type ReportStack = "none" | "stacked" | "percent";

/** 叠加画法（M10）：柱图的第 2 个指标起改用折线/面积绘制，即「柱 + 折线」组合图。
 *  缺省 none = 所有指标都按主类型画。 */
export type ReportOverlay = "none" | "line" | "area";

/** X 轴（首个维度）标签的显示格式（M12）。
 *
 *  [为什么是「格式化显示文本」而不是给 vendor 加日期格式化 API]
 *  维度值是数据集里的原始字符串（`2026-10-16`），既可能来自 DATETIME 也可能来自
 *  VARCHAR 里手写的「第 3 周」。让底层去猜日期类型就会把「第 3 周」也拿去 Date.parse，
 *  猜错的后果是标签变成 Invalid Date。这里只在**看得出是日期/时间**时才改写法，
 *  其余一律原样；且改完若会让两个分类撞成同一个标签，整个格式**不生效**（见
 *  report-axis.ts 的 formatXLabels）—— 宁可显示长标签，也不能悄悄少画一个分类。
 *
 *  缺省 auto = 原样，与加这个字段之前完全一致。 */
export type ReportXLabelFormat = "auto" | "md" | "slash" | "time";

/** 报表布局配置（与后端 ReportConfig 对齐）。表格细分：table=表格（平铺聚合行）/ group-table=分组表（层级+小计总计）/ tree-table=树状表格（层级可折叠）/ detail-table=明细表（逐行不聚合）/ kpi=指标卡（单值，rows 恒空）/ text=文本卡 / image=图片卡（后两者无数据集查询） */
export type ReportChartType =
  | "table"
  | "group-table"
  | "tree-table"
  | "detail-table"
  | "text"
  | "image"
  | "bar"
  | "line"
  | "pie"
  | "radar"
  | "waterfall"
  | "kpi";

/** 日期层级维度粒度（时间层级：年/季/月/周/星期/日/时/分/秒，维度编码 datefmt:<field>:<gran>，与后端 dateGranularities 对齐） */
export type ReportDateGranularity =
  | "year"
  | "quarter"
  | "month"
  | "week"
  | "dayofweek"
  | "day"
  | "hour"
  | "minute"
  | "second";

/** 图表 cell 布局：报表栅格中的位置与大小（与后端 ReportCellLayout 对齐）
 *
 *  [x/w 的语义是「第几列 / 占几列」，不是像素] 所以报表切换栅格密度
 *  （12 ↔ 24 列）时存量数据一个字节都不用改，只需按 config.gridCols 解释。 */
export interface ReportCellLayout {
  x: number; // 起始列（0 起；上限 = gridCols-1）
  y: number; // 起始行（≥0）
  w: number; // 列跨度（≥1，≤ gridCols）
  h: number; // 行跨度（≥1）
  /** 所属容器 id。缺省 = 页面根层（存量报表全部如此，零迁移）。
   *  指向不存在的容器时按根层渲染，防删容器后卡片整块消失。 */
  parentId?: string;
  /** 所属标签页 id（仅父容器 variant="tabs" 时有意义；沿用会被回落到第一个 tab） */
  tabId?: string;
}

/** 容器的三种形态：卡片（有边框）/ 分组（只有标题）/ 标签页 */
export type ReportContainerVariant = "card" | "plain" | "tabs";

export interface ReportContainerTab {
  id: string;
  title: string;
}

/** 报表容器：把若干卡片圈成一块（分组 / 标签页）。
 *
 *  [为什么容器不能装容器] 嵌套深度上限 2 层（根层 + 容器内容区）。再深一层，
 *  跨层拖拽要算三级原点，而收益只是「分组套分组」这种极少见的组织方式；
 *  限制在 2 层可以让 toLocal 只需要一个矩形参数。 */
export interface ReportContainer {
  id: string;
  variant: ReportContainerVariant;
  /** 标题（card / plain 必填；tabs 用各 tab 的标题） */
  title?: string;
  /** 仅 variant="tabs" */
  tabs?: ReportContainerTab[];
  /** 容器自身在**根层**坐标系中的位置（容器不参与容器的嵌套） */
  layout: ReportCellLayout;
}

/** 报表级全局筛选：绑定数据集（仅合并到同数据集图表的查询，防字段白名单拒绝） */
export interface ReportGlobalFilter {
  datasetId: number;
  field: string;
  op: ReportFilter["op"];
  value?: unknown;
}

/** 报表筛选组件：查看模式顶部筛选条上的可编辑筛选项（用户可动态添加/修改/删除） */
export interface ReportWidgetFilter {
  id: string; // 组件唯一 id（新增时生成）
  datasetId: number; // 绑定数据集（决定作用于哪些图表）
  field: string; // 筛选字段（物理列名）
  op: ReportFilter["op"]; // 运算符
  value?: unknown; // 当前值（用户编辑）
}

/** 报表级全局设置（作用于整张报表的所有图表） */
export interface ReportSettings {
  theme?: "default" | "compact" | "dark"; // 主题（默认 default）
  refreshSeconds?: number; // 0 = 不自动刷新（查看模式轮询间隔）
  globalFilters?: ReportGlobalFilter[]; // 全局筛选（按数据集合并进图表查询）
  filters?: ReportWidgetFilter[]; // 筛选组件（查看模式用户可编辑，按数据集合并进图表查询）
}

/** 图表排序规则（field 可为维度列名或聚合别名如 sum_total_num） */
export interface ReportOrderBy {
  field: string;
  dir: "asc" | "desc";
}

/** 列格式与展示配置（表格单元格，key=列 key：维度物理名 / 聚合别名如 sum_total_num / 计算字段 key） */
export interface ReportColFormat {
  decimalPlaces?: number; // 小数位位数 0-4（缺省=保持原始值）。设了它就是「固定位数」：不足补零、超出四舍五入
  maxDecimalPlaces?: number; // 小数位**上限**（最少 0 位、最多 N 位，整数不补零）。与 decimalPlaces 互斥，前者优先
  thousands?: boolean; // 千分位分隔
  formatType?: "number" | "percent"; // 格式类型：数值/百分数（缺省=数值；百分数=值×100 加 %，Excel 语义）
  align?: "left" | "center" | "right"; // 单元格对齐（缺省=指标右对齐 / 维度左对齐）
  alias?: string; // 展示别名（覆盖默认列名：数据集别名/聚合标签；空=用默认）
  width?: string; // 列宽（如 "140px"；缺省=默认宽度）
}

/** 聚合后过滤（HAVING）：expr 引用聚合别名做四则运算（如 sum_real_amount+sum_order_amount > 0），
 * OR 语义用加法表达；由后端 compileComputedExpr 编译为 HAVING 片段 */
export interface ReportHaving {
  expr: string;
  op: ">" | ">=" | "<" | "<=" | "=" | "!=";
  value: number;
}

/** 报表中的一个图表：绑定一个数据集 + 自己的查询布局（报表 = 多图表仪表板） */
export interface ReportChart {
  id: string; // 图表 ID（chart-1 / chart-xxx）
  title: string; // 图表标题（默认「图表N」）
  datasetId: number; // 数据集 ID
  rows: string[]; // 行维度（分组键，顺序敏感）
  measures: ReportMeasure[]; // 指标（聚合）
  computedFields?: ReportComputedField[]; // 计算字段（函数式表达式，不写回数据集；旧数据兼容聚合后四则）
  filters: ReportFilter[];
  having?: ReportHaving[]; // 聚合后过滤（HAVING，作用于本图表查询；不参与字段井编辑）
  chartType: ReportChartType;
  /** 卡片种类（缺省由 cardKind(chart) 从 chartType 派生，存量数据无需迁移）。
   *  显式写入后，切 chartType 不再改变种类，可表达「同为 chart 种、只换形态」。 */
  kind?: CardKind;

  // ---- 切换卡种时的暂存槽（M5） ----
  // [为什么是暂存而不是删除] 切到装不下的卡种时（2 指标折线 → 饼图、3 维度表格 → 柱图），
  // 多余配置如果直接丢掉，用户切回去会发现「指标/维度没了」，且没有任何提示——
  // 这是一种静默丢数据。暂存槽把装不下的部分保留下来，切回能装下的卡种时自动并回。
  // 两个字段都 omitempty：不切卡种的存量报表不会多出这两个键，零迁移。
  /** 当前卡种装不下的指标（顺序即原顺序，并回时追加在 measures 之后） */
  stashedMeasures?: ReportMeasure[];
  /** 当前卡种装不下的维度（同上） */
  rowsStash?: string[];
  /** 当前卡种执行不了的排序条件（排序键落在被暂存的维度/指标上时）。
   *  后端对 ORDER BY 是白名单硬校验（不在可用字段中就报错，不是忽略），
   *  所以这些条件必须移出 orderBy，否则整张卡查询失败。切回能装下时并回。 */
  orderByStash?: ReportOrderBy[];
  /** 堆积方式（M10，仅柱图有意义）。缺省 none；与 overlay 互斥（见 report-chart-style）。 */
  stack?: ReportStack;
  /** 叠加画法（M10，仅柱图有意义）：第 2 个指标起改折线/面积 ⇒ 柱线组合图。
   *  缺省 none；与 stack 互斥（叠加后只剩一根柱，「堆积」无从谈起）。 */
  overlay?: ReportOverlay;
  /** X 轴标签显示格式（M12，仅图表卡有意义）。缺省 auto = 原样显示维度值。
   *  只改**显示文本**，不改查询、不改联动：点击联动用的始终是行里的原始值。 */
  xLabelFormat?: ReportXLabelFormat;
  limit: number; // 查询行数上限（默认 1000）
  orderBy?: ReportOrderBy[]; // 排序（排行榜核心：按指标降序取 Top-N；字段井排序投放区多条件）
  // 分组表/树状表格：层级 = rows 顺序（总监→督导→门店），小计/总计开关（缺省均显示）
  showSubtotal?: boolean;
  showGrandTotal?: boolean;
  layout?: ReportCellLayout; // cell 布局（缺省由后端自动排布）
  colFormats?: Record<string, ReportColFormat>; // 列格式（表格：小数位/千分位，key=列 key）
  /** 指标卡专属配置（kind = "kpi" 时生效；其余种类忽略）。 */
  kpi?: ReportKpiConfig;
  /** 文本卡专属配置（kind = "text" 时生效）。 */
  text?: ReportTextConfig;
  /** 图片卡专属配置（kind = "image" 时生效）。 */
  image?: ReportImageConfig;
}

/** 文本卡配置（看板上的说明块：标题、口径备注、上线公告）。
 *
 *  [为什么 content 是纯文本 + 受限标记，而不是富文本 HTML]
 *  富文本要「让用户写 HTML 再 sanitize」，而本项目没有任何 HTML sanitizer 依赖
 *  （package.json 只有 react / react-dom / z-agent-ui）。自己写 sanitize 是安全领域里最不该
 *  自己写的东西之一 —— 一个漏网属性（`onerror`、`javascript:`、SVG 里的 `<use>`）就是 XSS。
 *  这里换成反向策略：只解析少数几个行内标记（**粗体** / *斜体* / `等宽` / 换行），
 *  输出 React 节点数组，**全程不产生 innerHTML**。不认识的写法原样当文本显示，
 *  所以「越权的 HTML」在页面上就是可见的一串字符，而不是被执行。 */
export interface ReportTextConfig {
  /** 文本内容（支持 **粗体** / *斜体* / `等宽` / 换行；不支持任何 HTML） */
  content: string;
  /** 水平对齐（缺省 left） */
  align?: "left" | "center" | "right";
  /** 字号档位（缺省 md） */
  size?: "sm" | "md" | "lg";
}

/** 图片卡配置。
 *
 *  [为什么先只做外链 URL] 系统里没有通用图片上传端点（只有数据集 Excel 导入，
 *  且限 admin、50MB、写入的是数据集不是静态资源）。为一个卡片新建上传链路要连带
 *  存储目录、静态路由、清理策略、鉴权，是独立一件事。先按外链上线：
 *  配 URL 即可用，不需要新接口，也不需要为「谁有权删这张图」设计权限。
 *  代价是纯内网环境下外链图加载不出来 —— 用 caption/alt 兜底，未加载时显示占位框。 */
export interface ReportImageConfig {
  /** 图片地址（http/https 或站内相对路径；javascript:/data: 一律视为无效） */
  url: string;
  /** 填充模式（缺省 cover：铺满裁切） */
  fit?: "cover" | "contain" | "fill";
  /** 替代文本（加载失败时显示；同时作为无障碍标签） */
  alt?: string;
  /** 图注（显示在图片下方，缺省不显示） */
  caption?: string;
}

/** 看板筛选器卡：独立于 charts 的画布元素，通过 targets 绑定到具体卡片。
 *
 *  [为什么独立结构，而不是 charts[] 里的一种卡]
 *  charts[] 每张卡都绑一个数据集并**产出数据**；筛选器卡不产出数据，只改变别的卡查什么。
 *  塞进 charts[] 会立刻带来三个额外代价：
 *    · 「不绑定、作用于全部」这件事没有表达位置，只能靠「同数据集自动生效」隐式推导，
 *      而那个语义恰好是作者想覆盖掉的（见下面的绑定理由）；
 *    · 卡种切换（report-switch 的容量表）、字段容量、字段井都要为它开特例；
 *    · 删卡片 / 复制卡片 / 统计卡片数的每一处代码都要先判「这张是真卡吗」。
 *  独立之后它就是一份「筛选控件 + 作用对象」的配置，与布局、草稿、发布都没有耦合。
 *
 *  [为什么绑定用卡片 id，而不是数据集]
 *  同一数据集常有多张卡（当期销售 / 历史快照 / 只看某区域的卡）。作者完全可能只想让
 *  筛选影响其中一张。按数据集绑会把「不想被筛的那张」也筛掉，而界面上两张卡长得一样，
 *  读者看不出差别 —— 只会认为数据错了，且没有报错、没有空态，无从归因。
 *
 *  [targets 为空数组 = 该数据集下的全部卡，含以后新增的]
 *  这是默认值，也是「筛选器卡替代页头筛选条」的等价形态（页头筛选就是按数据集生效的）。
 *  若把空理解成「不作用于任何卡」，作者新建一张筛选器卡、填好字段，结果什么都没发生，
 *  界面上也看不出哪里没配 —— 静默失效。反过来的风险（新增卡被既有筛选器影响）是可见的：
 *  卡上直接就是筛选后的数据，筛选条件就写在旁边。
 *
 *  [值的优先级]
 *    · 作者在 `value` 里配默认值（落库）
 *    · 读者在查看模式改的值放页面 state（按卡片 id 覆盖，不落库）
 *    · 查询合并只有一条路：卡 → 投影成 ReportFilter → 拼进 WHERE
 *  不再与页头筛选「同字段二选一」：页头那条若命中同一张卡的同一字段，按卡屏蔽
 *  （见 report-filter-card 的 headFiltersForChart），否则两条都被 AND 进去，结果恒空。 */
export interface ReportFilterCard {
  /** 卡片 id（前端生成，如 fc-1 / fc-xxx） */
  id: string;
  /** 字段所属数据集：字段白名单按它校验，也只有同数据集的卡会被影响 */
  datasetId: number;
  /** 筛选字段（物理列名；空 = 未配置，卡面显示引导语） */
  field: string;
  /** 运算符 */
  op: ReportFilter["op"];
  /** 作者配置的默认值（读者可临时改，不回写） */
  value?: unknown;
  /** 显示标题（缺省用字段别名，再缺省用字段名） */
  label?: string;
  /** 作用对象：卡片 id 列表。空数组 = 该数据集下全部卡（含以后新增） */
  targets: string[];
  /** 栅格位置（与报表图表共用同一套 12 列栅格；缺省由自动排布给位） */
  layout?: ReportCellLayout;
}

/** 指标卡配置。
 *
 *  [为什么 compare 与 thresholds 互斥] 卡面上只有一个颜色位置。环比要表达「涨/跌」，
 *  阈值要表达「达标/预警」，两者同时开启时颜色归属无法自洽 —— 红色到底是涨还是超限？
 *  编辑器里做成单选，运行时再兜一次（compare 优先，thresholds 不生效）。 */
export interface ReportKpiConfig {
  /** 环比：与上一个等长周期比较。缺省不显示。 */
  compare?: KpiCompareMode;
  /** 阈值色：按指标值着色。与 compare 互斥。 */
  thresholds?: KpiThresholds;
  /** 数值格式。缺省：千分位 + 0 位小数。 */
  format?: KpiFormat;
}

export interface KpiCompareMode {
  /** 目前只有「上一等长周期」。留字段是为了将来加「去年同期」时不必改结构。 */
  mode: "prev_period";
  /** length = 按当前筛选窗口的等长时间跨度前移；calendar = 按自然月/年对齐（未实现） */
  alignBy: "length";
}

export interface KpiThresholds {
  /** 警戒线（含）。 */
  warn: number;
  /** 危险线（含）。 */
  danger: number;
  /** 越大越差（成本、退货率）还是越小越差（营收、利润）—— 决定比较方向。 */
  direction: "higher_is_worse" | "lower_is_worse";
}

export interface KpiFormat {
  /** 小数位，缺省 0。 */
  decimals?: number;
  /** 单位后缀，如「元」「万」「%」。 */
  unit?: string;
  /** 千分位，缺省 true。 */
  thousands?: boolean;
}

/** 明细表查询请求体（POST /api/datasets/{id}/detail，逐行不聚合） */
export interface DatasetDetailRequest {
  fields: string[]; // 展示列（物理列名；明细表模式 rows 即展示列）
  filters: ReportFilter[];
  orderBy?: ReportOrderBy[];
  limit?: number;
  /** 报表级计算字段（行级求值，不写回数据集）。
   *  [为什么并入本类型而不是另立 DetailRequest] 渲染层与宿主必须用同一份字段名，
   *  两份近似类型必然漂移，漏写一处就是「计算字段列全空」。 */
  computed?: { key: string; name: string; expr: string }[];
}

/** 报表布局配置（多图表仪表板，与后端 ReportConfig 对齐）。
 *
 * [它不是「页面版面模型」，别再问能不能删] 2026-10 起两条线并存，服务**不同输入**：
 *   - `ReportConfig`（本类型）：一屏多图的**图表卡**配置。栅格密度 + 容器/页签 +
 *     筛选卡绑定 + 7 种卡形态（table / group-table / tree-table / detail-table /
 *     kpi / text / image）。
 *   - `PageAST`：整页版面。来源是 PageScript 脚本经 `src/page/parse.ts` 解析（2026-10-27
 *     起解析在前端，前后端只传脚本），见 `src/page/spec.ts` 与
 *     `wiki/reference/page-ast-contract.md`。
 * 废弃的只是「拿 ReportConfig 当整页版面模型」这一**用法**（已由 PageAST 取代），
 * 不是这个类型本身。混用的症状：页面缺 head / 属性网格 / 主从抽屉，且与 zEtl
 * 「脚本是单一真相」的约定冲突（存量 dashboard 由后端 mirror 成脚本落库）。
 *
 * [它是对外交付契约，改字段要跨仓同步] `registry/registry.json` 的 `report-core`
 * 模块把本文件连同同目录 28 个文件交付给宿主（`z-agent-ui add report-core`），
 * zWorker 就是这样拷走的 —— 其 `src/web/src/types.ts` 里本接口与这里**逐字段一致**，
 * 但那个文件已另外扩到 1400+ 行（塞了宿主业务类型）。删字段 / 改语义 = 下游编译不过。
 */
export interface ReportConfig {
  group?: string; // 报表分组（树状目录，空 = 未分组）
  charts: ReportChart[];
  /** 看板筛选器卡（独立于 charts，通过 targets 绑定到具体卡片）。
   *  omitempty：没有筛选器卡的存量报表不会多出这个键，零迁移。 */
  filterCards?: ReportFilterCard[];
  /** 容器 / 分组 / 标签页（M8）。卡片通过 layout.parentId 指进来。
   *  omitempty：没有容器的存量报表不会多出这个键，零迁移。 */
  containers?: ReportContainer[];
  /** 栅格密度（M9）。缺省 12 = 存量报表行为完全不变；24 = 跨度组合更细。
   *  只影响几何解释，不迁移数据。 */
  gridCols?: 12 | 24;
  settings?: ReportSettings;
}

/** 报表（API 响应） */
export interface Report {
  id: string;
  name: string;
  datasetId: number;
  config: ReportConfig;
  createdAt: string;
  updatedAt: string;
  /** ---- 草稿/线上双版本（M3）。字段缺省 = 单版本语义（列表接口不带）。 ---- */
  /** 服务端派生的可操作模式，前端不得自行猜测 */
  access?: ReportAccess;
  /** 仅 access.mode === "edit" 时返回；读者永远拿不到草稿内容 */
  draftConfig?: ReportConfig;
  /** 最近发布时间；缺省 = 从未发布 */
  publishedAt?: string;
  /** 是否已发布过。false = 新建后还没发布，只有作者可见（列表/详情都只回给作者） */
  published?: boolean;
  /** 内容版本，发布时回传用于乐观并发 */
  contentVersion?: number;
}

/** 报表草稿/线上双版本的可操作模式（服务端派生）。 */
export type ReportAccessMode = "view" | "edit" | "locked";

export interface ReportAccess {
  mode: ReportAccessMode;
  hasDraft: boolean;
  /** locked：持有者用户 ID */
  owner?: string;
  /** locked：持有者用户名快照（用于「谁在改」） */
  ownerName?: string;
  /** locked：最近心跳（RFC3339） */
  since?: string;
  /** 抢占过期租约时回填：你接手的草稿原主人 */
  formerOwner?: string;
  formerOwnerName?: string;
}

/** 认领/保存/发布接口的返回：草稿内容 + 派生出的权限 + 版本号。 */
export interface ReportDraftState {
  config: ReportConfig;
  access: ReportAccess;
  contentVersion: number;
  publishedAt?: string;
}

/** 聚合查询结果（POST /api/datasets/{id}/aggregate） */
export interface AggregateResult {
  columns: { name: string; kind: "dimension" | "measure"; agg?: string; field?: string }[];
  rows: Record<string, unknown>[];
  /** 命中总数（与 /detail 的 total 同义）。老后端只有「返回行数」语义，故读时仍需兜底。 */
  total: number;
  /** 本次返回行数（IKQ4Q3 新增：与 total 分开，才能判断是否被 limit 截断） */
  returned?: number;
  /** 是否还有更多（total > returned）。为 true 时界面必须提示截断，否则数字会误导。 */
  hasMore?: boolean;
}

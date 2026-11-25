// 报表渲染与宿主之间的**唯一**契约。
//
// [为什么契约在 core 而不在渲染元素里] 报表要同时接 zEtl 的 REST、zWorker 的接口、
// 或者一份静态 JSON。渲染元素只管「怎么画」，取数由宿主按本接口实现。契约放在 core
// 的好处是：任何宿主（React / Vue / 原生）引同一份类型，不需要为了拿类型而拖进渲染层。
//
// [契约稳定性] 新增能力一律在本接口**可选**添加（`?`），不要在既有方法上改签名 ——
// 宿主是独立仓库，改签名等于两边必须同时升版。

import type {
  AggregateResult,
  Column,
  DatasetBriefField,
  DatasetDetailRequest,
  Report,
  ReportConfig,
  ReportDraftState,
  ReportFilter,
  ReportMeasure,
} from "./types.js";

/** 数据集摘要（报表「选择数据集」下拉只需要这几项）。 */
export interface DatasetBrief {
  id: number;
  name: string;
  tableName?: string;
  /** 「最近更新」展示用 */
  updatedAt?: string;
  /** 字段清单；报表用它算可用维度/指标，缺省时由 getDatasetMeta 兜底 */
  fields?: DatasetBriefField[];
}

/** 聚合请求里的单个指标。
 *
 *  [为什么字段名是 alias 而不是 key] 与 zEtl 后端白名单/别名规则对齐；渲染侧取值也用
 *  同一个 key（见 report-kpi 的 measureKeyOf），两处必须一致 —— 不一致的症状是卡面
 *  永远「--」，且不会有任何报错。 */
export interface AggregateMeasureRequest {
  field: string;
  agg: ReportMeasure["agg"];
  alias?: string;
  computed?: boolean;
  groupBy?: string[];
  havingMin?: number;
  aggField?: string;
  where?: ReportFilter;
}

/** 聚合查询请求体（与 zEtl 后端对齐；宿主若不支持某字段可忽略）。 */
export interface AggregateRequest {
  dimensions: string[];
  measures: AggregateMeasureRequest[];
  computed?: { key: string; name: string; expr: string }[];
  having?: { expr: string; op: string; value: number }[];
  filters: ReportFilter[];
  orderBy?: { field: string; dir: string }[];
  limit?: number;
}

/** 明细请求体。
 *
 *  [为什么不另立一套字段] 与 types.ts 的 DatasetDetailRequest 是同一件事，
 *  渲染层多一个 `computed`（报表级计算字段，行级求值不写回数据集）。
 *  两份近似类型必然漂移，所以这里只做别名，`computed` 已并入 DatasetDetailRequest。 */
export type DetailRequest = DatasetDetailRequest;

/** 一次查询的结果：聚合或明细，由卡片种类路由。两者互斥，另一个为 null。 */
export interface ChartQueryData {
  result: AggregateResult | null;
  detail: { rows: Record<string, unknown>[]; total: number } | null;
}

/**
 * 宿主需要实现的数据源。
 *
 * 取数面四个方法**必填**（渲染一张卡至少要其中之一）；报表读写与草稿四个面全部可选
 * （只读看板不需要，缺省时编辑器入口不启用）。
 */
export interface ReportDataSource {
  // ---- 取数面（报表渲染必需） ----
  /** 数据集字段元数据：列名/别名/注释/语义类型 */
  getDatasetMeta(datasetId: number): Promise<Column[]>;
  /** 分组聚合查询：看板所有图表卡的数据来源 */
  aggregateDataset(datasetId: number, body: AggregateRequest): Promise<AggregateResult>;
  /** 明细行查询：明细表卡与「查看明细」钻取 */
  fetchDatasetDetail(
    datasetId: number,
    body: DetailRequest,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  /** 筛选值搜索（自动补全）：in / like 类筛选的可选值。
   *  宿主若不支持，返回空 values 即可（前端退化为手输）。 */
  searchDatasetValues(
    datasetId: number,
    field: string,
    q: string,
    limit?: number,
  ): Promise<{ field: string; q: string; values: string[] }>;

  /** 数据集清单：编辑器的「选择数据集」。缺省时编辑器不可用（只读看板不受影响） */
  listDatasets?(): Promise<DatasetBrief[]>;

  // ---- 报表读写（只读看板不需要，故全部可选） ----
  listReports?(): Promise<Report[]>;
  getReport?(id: string): Promise<Report>;
  createReport?(body: {
    id?: string;
    name: string;
    datasetId: number;
    config: ReportConfig;
  }): Promise<Report>;
  deleteReport?(id: string): Promise<void>;
  /** 只改分组（目录元数据），不整份回写 */
  setReportGroup?(id: string, group: string): Promise<{ ok: boolean }>;

  // ---- 草稿/线上双版本（编辑器必需，看板不需要） ----
  /** 进入编辑态；无草稿则服务端深拷贝线上版。被同事持有时应抛 code="locked" 的错误 */
  claimReportDraft?(id: string): Promise<ReportDraftState>;
  /** 保存草稿。name 空串 = 不改名 */
  saveReportDraft?(id: string, name: string, config: ReportConfig): Promise<ReportDraftState>;
  /** 续租（前端周期调用）；不实现则编辑器退化为无租约模式 */
  heartbeatReportDraft?(id: string): Promise<{ access: ReportDraftState["access"] }>;
  /** 发布：带 contentVersion 做乐观并发 */
  publishReportDraft?(id: string, version: number): Promise<ReportDraftState>;
  discardReportDraft?(id: string): Promise<void>;
}

/**
 * 宿主错误的最小形状。
 *
 * [为什么不要求宿主用某个错误类] 渲染层需要区分「草稿被同事持有（409 locked）」与
 * 「一般失败」才能给不同提示，但错误类属于宿主。这里只依赖**形状**：宿主的错误对象
 * 带 code 字段就自动兼容，不带则退化为普通 message。
 */
export interface ReportQueryError extends Error {
  code?: string;
  status?: number;
  /** 业务错误附带的明细（如草稿被同事持有时的 owner / ownerName / since）。 */
  detail?: Record<string, unknown>;
}

/** 把任意 thrown 值收敛成 ReportQueryError 形状（宿主可能 throw 字符串/普通对象）。 */
export function asQueryError(e: unknown): ReportQueryError {
  if (e instanceof Error) return e as ReportQueryError;
  const err = new Error(typeof e === "string" ? e : String(e)) as ReportQueryError;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.code === "string") err.code = o.code;
    if (typeof o.status === "number") err.status = o.status;
    if (o.detail && typeof o.detail === "object") err.detail = o.detail as Record<string, unknown>;
  }
  return err;
}

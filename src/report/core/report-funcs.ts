// 数据集计算字段：函数目录 + 表达式校验（与后端 src/api/computed_expr.go 逐字对齐）。
// [WHY] 前后端逐字对齐：前端即时校验给用户即时反馈，后端编译为 SQL 下推执行。
// 语法：[字段名] / FUNC(...) / 数字 / '字符串' / + - * / % > < = AND OR NOT () 逗号
// 设计：前端校验是后端编译的子集——前端做语法/白名单/参数个数/字段存在性检查，
//   后端做 SQL 编译（特判函数/模板/括号精简）。前端通过 = 后端必通过；前端报错 = 后端也报错。
//
// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限。
// 本文件仅作为 barrel 保留历史导入路径（"report-funcs.js" 的导出面与拆分前逐字一致）：
//   funcs-spec    函数白名单/目录
//   expr-parse    词法常量 + 字段引用提取 + 递归下降校验器
//   expr-agg      聚合词法扫描与计算字段聚合传播
//   expr-values   求值值类型与标量运算辅助
//   expr-builtins 内置函数求值实现
//   expr-eval     求值器与 evalDatasetExpr 入口
//
// 这里显式列举而非 export *：拆分后跨文件共享的内部辅助（CMP_OPS / isIdentStart /
// numOf / lookupFn 等）不应因此变成 report/core 的对外 API。

export type { FnSpec } from "./funcs-spec.js";
export { FUNC_SPECS, FUNC_CATEGORIES, funcsByCategory, searchFuncs } from "./funcs-spec.js";

export { CF_KEY_RE, genCfKey, extractFieldRefs, validateDatasetExpr } from "./expr-parse.js";

export { exprHasAggCall, aggKindOf, datasetComputedAggUsed } from "./expr-agg.js";

export type { EvalValue } from "./expr-values.js";

export { evalDatasetExpr } from "./expr-eval.js";

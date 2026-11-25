// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：函数白名单与目录（FnSpec、62 个函数定义、分类/搜索/查表）
// 依赖：无（表达式引擎最底层，不 import 其他 expr-* 文件）

export interface FnSpec {
  name: string;        // 函数名（大写）
  category: string;    // 分类
  minArgs: number;     // 最少参数
  maxArgs: number;     // 最多参数（-1 = 不限）
  agg: boolean;        // 聚合函数（仅度量上下文）
  unsupported: boolean; // 前端可见但后端不支持
  desc: string;        // 中文描述
}

export const FUNC_SPECS: Record<string, FnSpec> = {
  // ---- 聚合 ----
  AVG:            { name: "AVG",            category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "求平均值" },
  COLLECT_LIST:   { name: "COLLECT_LIST",   category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "收集为列表" },
  COLLECT_SET:    { name: "COLLECT_SET",    category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "去重收集为列表" },
  COUNT:          { name: "COUNT",          category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "计数（统计非空行数）" },
  COUNT_DISTINCT: { name: "COUNT_DISTINCT", category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "去重计数" },
  MAX:            { name: "MAX",             category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "最大值" },
  MIN:            { name: "MIN",             category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "最小值" },
  PERCENTILE:     { name: "PERCENTILE",     category: "聚合", minArgs: 2, maxArgs: 2, agg: true,  unsupported: true,  desc: "百分位（暂不支持 MySQL 后端执行）" },
  SUM:            { name: "SUM",             category: "聚合", minArgs: 1, maxArgs: 1, agg: true,  unsupported: false, desc: "求和" },
  XIRR:           { name: "XIRR",           category: "聚合", minArgs: 2, maxArgs: -1, agg: true, unsupported: true,  desc: "现金流内部收益率（暂不支持 MySQL 后端执行）" },

  // ---- 数学 ----
  ABS:      { name: "ABS",      category: "数学", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "绝对值" },
  CEIL:     { name: "CEIL",     category: "数学", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "向上取整" },
  FLOOR:    { name: "FLOOR",    category: "数学", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "向下取整" },
  GREATEST: { name: "GREATEST", category: "数学", minArgs: 2, maxArgs: -1, agg: false, unsupported: false, desc: "取最大值（多参数）" },
  LEAST:    { name: "LEAST",    category: "数学", minArgs: 2, maxArgs: -1, agg: false, unsupported: false, desc: "取最小值（多参数）" },
  LENGTH:   { name: "LENGTH",   category: "数学", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "字符串长度（字符数）" },
  LOG:      { name: "LOG",      category: "数学", minArgs: 1, maxArgs: 2,  agg: false, unsupported: false, desc: "对数（可带底数）" },
  POW:      { name: "POW",      category: "数学", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "幂运算" },
  RAND:     { name: "RAND",     category: "数学", minArgs: 0, maxArgs: 0,  agg: false, unsupported: false, desc: "随机数" },
  ROUND:    { name: "ROUND",    category: "数学", minArgs: 1, maxArgs: 2,  agg: false, unsupported: false, desc: "四舍五入（可带小数位）" },
  SQRT:     { name: "SQRT",     category: "数学", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "平方根" },

  // ---- 字符串 ----
  BASE64:         { name: "BASE64",         category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "Base64 编码" },
  CONCAT:         { name: "CONCAT",         category: "字符串", minArgs: 1, maxArgs: -1, agg: false, unsupported: false, desc: "拼接字符串" },
  CONCAT_WS:      { name: "CONCAT_WS",      category: "字符串", minArgs: 2, maxArgs: -1, agg: false, unsupported: false, desc: "带分隔符拼接（首参为分隔符）" },
  INSTR:          { name: "INSTR",          category: "字符串", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "子串首次出现位置" },
  LOWER:          { name: "LOWER",          category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "转小写" },
  REGEXP_EXTRACT: { name: "REGEXP_EXTRACT", category: "字符串", minArgs: 2, maxArgs: 3,  agg: false, unsupported: false, desc: "正则提取（可带组号）" },
  REGEXP_REPLACE: { name: "REGEXP_REPLACE", category: "字符串", minArgs: 3, maxArgs: 3,  agg: false, unsupported: false, desc: "正则替换" },
  REPEAT:         { name: "REPEAT",         category: "字符串", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "重复字符串" },
  REVERSE:        { name: "REVERSE",        category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "反转字符串" },
  SPLIT:          { name: "SPLIT",          category: "字符串", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "按分隔符分割为数组（JSON）" },
  SUBSTR:         { name: "SUBSTR",         category: "字符串", minArgs: 2, maxArgs: 3,  agg: false, unsupported: false, desc: "截取子串" },
  TRIM:           { name: "TRIM",           category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "去首尾空白" },
  UNBASE64:       { name: "UNBASE64",       category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "Base64 解码" },
  UPPER:          { name: "UPPER",          category: "字符串", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "转大写" },

  // ---- 日期时间 ----
  ADD_MONTHS:           { name: "ADD_MONTHS",           category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "加月数" },
  CURRENT_DATE:         { name: "CURRENT_DATE",         category: "日期时间", minArgs: 0, maxArgs: 0,  agg: false, unsupported: false, desc: "当前日期" },
  DATEDIFF:             { name: "DATEDIFF",             category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "日期差（天）" },
  DATE_ADD:             { name: "DATE_ADD",             category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "加天数" },
  DATE_SUB:             { name: "DATE_SUB",             category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "减天数" },
  DATE_TRUNC:           { name: "DATE_TRUNC",           category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "按粒度截断（gran, date）" },
  DAYOFMONTH:           { name: "DAYOFMONTH",           category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "日（1-31）" },
  DAYOFWEEK:            { name: "DAYOFWEEK",            category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "星期几（1=周日）" },
  FROM_UNIXTIME:        { name: "FROM_UNIXTIME",        category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "时间戳转日期时间" },
  HOUR:                 { name: "HOUR",                 category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "小时（0-23）" },
  LASTING_DAYS_TO_DATE: { name: "LASTING_DAYS_TO_DATE", category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "距今持续天数" },
  LAST_DAY:             { name: "LAST_DAY",             category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "月末日期" },
  MINUTEDIFF:           { name: "MINUTEDIFF",           category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "分钟差" },
  MONTH:                { name: "MONTH",                category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "月（1-12）" },
  MONTHS_BETWEEN:       { name: "MONTHS_BETWEEN",       category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "月差" },
  NOW:                  { name: "NOW",                  category: "日期时间", minArgs: 0, maxArgs: 0,  agg: false, unsupported: false, desc: "当前日期时间" },
  QUARTER:              { name: "QUARTER",              category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "季度（1-4）" },
  SECONDDIFF:           { name: "SECONDDIFF",           category: "日期时间", minArgs: 2, maxArgs: 2,  agg: false, unsupported: false, desc: "秒差" },
  TO_DATE:              { name: "TO_DATE",              category: "日期时间", minArgs: 1, maxArgs: 2,  agg: false, unsupported: false, desc: "转日期（可带格式）" },
  WEEKOFYEAR:           { name: "WEEKOFYEAR",           category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "周数（1-53）" },
  YEAR:                 { name: "YEAR",                 category: "日期时间", minArgs: 1, maxArgs: 1,  agg: false, unsupported: false, desc: "年" },

  // ---- 逻辑/条件 ----
  CASE_WHEN: { name: "CASE_WHEN", category: "逻辑", minArgs: 3, maxArgs: -1, agg: false, unsupported: false, desc: "条件分支（cond, then, ..., else）" },
  COALESCE:  { name: "COALESCE",  category: "逻辑", minArgs: 1, maxArgs: -1, agg: false, unsupported: false, desc: "取首个非空值" },
  IF:        { name: "IF",        category: "逻辑", minArgs: 3, maxArgs: 3,  agg: false, unsupported: false, desc: "条件判断（cond, 真值, 假值）" },

  // ---- 其他 ----
  EXPLODE:    { name: "EXPLODE",    category: "其他", minArgs: 1, maxArgs: 1,  agg: false, unsupported: true,  desc: "行转列（暂不支持 MySQL 后端执行）" },
  SEQUENCE:   { name: "SEQUENCE",   category: "其他", minArgs: 2, maxArgs: 3,  agg: false, unsupported: true,  desc: "生成序列（暂不支持 MySQL 后端执行）" },
  SORT_ARRAY: { name: "SORT_ARRAY", category: "其他", minArgs: 1, maxArgs: 1,  agg: false, unsupported: true,  desc: "数组排序（暂不支持 MySQL 后端执行）" },
};

// ---- 函数分类目录（左栏 tab） ----

export const FUNC_CATEGORIES = ["全部", "聚合", "数学", "字符串", "日期时间", "逻辑", "其他"] as const;

/** 按分类过滤函数列表（"全部" = 不限分类） */
export function funcsByCategory(cat: string): FnSpec[] {
  const list: FnSpec[] = [];
  for (const k of Object.keys(FUNC_SPECS)) {
    const f = FUNC_SPECS[k];
    if (cat === "全部" || f.category === cat) list.push(f);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/** 搜索函数（名称或描述包含关键词） */
export function searchFuncs(keyword: string): FnSpec[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  const list: FnSpec[] = [];
  for (const k of Object.keys(FUNC_SPECS)) {
    const f = FUNC_SPECS[k];
    if (f.name.toLowerCase().includes(kw) || f.desc.toLowerCase().includes(kw)) list.push(f);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/** 查函数白名单（大小写不敏感） */
export function lookupFn(name: string): FnSpec | undefined {
  return FUNC_SPECS[name.toUpperCase()];
}

/** 函数名列表（错误提示用） */
export function fnNames(): string[] {
  return Object.keys(FUNC_SPECS).sort();
}

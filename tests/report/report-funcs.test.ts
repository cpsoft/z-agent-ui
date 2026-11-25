// Test: 前端数据集计算字段函数目录 + 表达式校验（与后端 computed_expr_test.go 逐字对齐）
import { describe, expect, it } from "vitest";
import {
  CF_KEY_RE,
  FUNC_SPECS,
  aggKindOf,
  extractFieldRefs,
  exprHasAggCall,
  datasetComputedAggUsed,
  evalDatasetExpr,
  funcsByCategory,
  genCfKey,
  searchFuncs,
  validateDatasetExpr,
} from "../../src/report/core/report-funcs.js";

const FIELDS = new Set(["销量", "单价", "名称", "日期"]);

describe("FUNC_SPECS 完整性", () => {
  it("共 62 个函数", () => {
    expect(Object.keys(FUNC_SPECS).length).toBe(62);
  });

  it("每个函数字段齐全", () => {
    for (const k of Object.keys(FUNC_SPECS)) {
      const f = FUNC_SPECS[k];
      expect(f.name).toBe(k);
      expect(f.category.length).toBeGreaterThan(0);
      expect(f.desc.length).toBeGreaterThan(0);
      expect(f.minArgs).toBeGreaterThanOrEqual(0);
      expect(f.maxArgs).toBeGreaterThanOrEqual(-1);
    }
  });

  it("聚合函数标记正确", () => {
    const aggFuncs = ["AVG", "COLLECT_LIST", "COLLECT_SET", "COUNT", "COUNT_DISTINCT", "MAX", "MIN", "PERCENTILE", "SUM", "XIRR"];
    for (const n of aggFuncs) expect(FUNC_SPECS[n].agg).toBe(true);
    expect(FUNC_SPECS.ABS.agg).toBe(false);
    expect(FUNC_SPECS.CONCAT.agg).toBe(false);
  });
});

describe("funcsByCategory / searchFuncs", () => {
  it("按分类过滤", () => {
    const all = funcsByCategory("全部");
    expect(all.length).toBe(62);
    const agg = funcsByCategory("聚合");
    expect(agg.length).toBe(10);
    const str = funcsByCategory("字符串");
    expect(str.length).toBe(14);
  });

  it("搜索函数", () => {
    const r = searchFuncs("sum");
    expect(r.some((f) => f.name === "SUM")).toBe(true);
    const r2 = searchFuncs("绝对值");
    expect(r2.some((f) => f.name === "ABS")).toBe(true);
    expect(searchFuncs("")).toEqual([]);
  });
});

describe("CF_KEY_RE / genCfKey", () => {
  it("合法 key", () => {
    expect(CF_KEY_RE.test("tax_amount")).toBe(true);
    expect(CF_KEY_RE.test("_priv")).toBe(true);
    expect(CF_KEY_RE.test("a1b2")).toBe(true);
  });

  it("非法 key", () => {
    expect(CF_KEY_RE.test("1abc")).toBe(false);
    expect(CF_KEY_RE.test("含税金额")).toBe(false);
    expect(CF_KEY_RE.test("tax-amount")).toBe(false);
  });

  it("genCfKey 合法标识符原样返回", () => {
    expect(genCfKey("tax_amount")).toBe("tax_amount");
  });

  it("genCfKey 中文 → cf_ 前缀", () => {
    const k = genCfKey("含税金额");
    expect(k.startsWith("cf_")).toBe(true);
    expect(CF_KEY_RE.test(k)).toBe(true);
  });
});

describe("extractFieldRefs", () => {
  it("提取字段引用", () => {
    expect(extractFieldRefs("SUM([销量]) * 1.13").sort()).toEqual(["销量"]);
    expect(extractFieldRefs("[单价] * [销量]").sort()).toEqual(["单价", "销量"]);
  });

  it("去重保序", () => {
    expect(extractFieldRefs("[销量] + [销量] * [单价]")).toEqual(["销量", "单价"]);
  });

  it("跳过字符串内的方括号（与后端 cfFieldRefRe 一致的简单正则，不做语义过滤）", () => {
    // 后端 extractFieldRefs 用 cfFieldRefRe 简单扫描，字符串内 [test] 也会被提取；
    // 但 DAG 依赖查找有 cfByKey 守卫（非计算字段 key 直接忽略），过度匹配无害——前端逐字对齐
    expect(extractFieldRefs("CONCAT([名称], '[test]')")).toEqual(["名称", "test"]);
  });
});

describe("validateDatasetExpr 成功用例", () => {
  it("聚合四则（度量）", () => {
    expect(validateDatasetExpr("SUM([销量]) * 1.13", FIELDS, true)).toBe("");
  });

  it("行级四则", () => {
    expect(validateDatasetExpr("[单价] * [销量]", FIELDS, false)).toBe("");
  });

  it("字符串函数", () => {
    expect(validateDatasetExpr("CONCAT([名称], '-', '新品')", FIELDS, false)).toBe("");
  });

  it("条件函数+比较", () => {
    expect(validateDatasetExpr("IF([销量] > 100, '高', '低')", FIELDS, false)).toBe("");
  });

  it("逻辑与括号", () => {
    expect(validateDatasetExpr("([销量] >= 10) AND ([销量] <= 100)", FIELDS, false)).toBe("");
  });

  it("NOT 逻辑", () => {
    expect(validateDatasetExpr("NOT [销量] = 0", FIELDS, false)).toBe("");
  });

  it("双引号字符串+百分号", () => {
    expect(validateDatasetExpr('CONCAT([名称], "50%")', FIELDS, false)).toBe("");
  });

  it("单引号转义", () => {
    expect(validateDatasetExpr("'it''s'", FIELDS, false)).toBe("");
  });

  it("科学计数", () => {
    expect(validateDatasetExpr("[销量] * 1e3", FIELDS, false)).toBe("");
  });

  it("DATE_TRUNC", () => {
    expect(validateDatasetExpr("DATE_TRUNC('month', [日期])", FIELDS, false)).toBe("");
  });

  it("CASE_WHEN 奇数参数（cond, then, ..., else）", () => {
    expect(validateDatasetExpr("CASE_WHEN([销量] > 100, '高', '低')", FIELDS, false)).toBe("");
    expect(validateDatasetExpr("CASE_WHEN([销量] > 100, '高', [销量] < 10, '低', '中')", FIELDS, false)).toBe("");
  });

  it("TO_DATE 单参", () => {
    expect(validateDatasetExpr("TO_DATE([日期])", FIELDS, false)).toBe("");
  });

  it("TO_DATE 双参", () => {
    expect(validateDatasetExpr("TO_DATE([日期], '%Y-%m-%d')", FIELDS, false)).toBe("");
  });

  it("变参函数 CONCAT", () => {
    expect(validateDatasetExpr("CONCAT([名称], [销量], [单价])", FIELDS, false)).toBe("");
  });

  it("嵌套函数", () => {
    expect(validateDatasetExpr("ROUND(SUM([销量]) / SUM([单价]), 2)", FIELDS, true)).toBe("");
  });

  it("零参函数 NOW", () => {
    expect(validateDatasetExpr("NOW()", FIELDS, false)).toBe("");
  });

  it("CURRENT_DATE", () => {
    expect(validateDatasetExpr("CURRENT_DATE()", FIELDS, false)).toBe("");
  });

  it("一元负号", () => {
    expect(validateDatasetExpr("-[销量]", FIELDS, false)).toBe("");
  });

  it("取模", () => {
    expect(validateDatasetExpr("[销量] % 100", FIELDS, false)).toBe("");
  });

  it("不等号", () => {
    expect(validateDatasetExpr("[销量] != 0", FIELDS, false)).toBe("");
    expect(validateDatasetExpr("[销量] <> 0", FIELDS, false)).toBe("");
  });
});

describe("validateDatasetExpr 错误用例", () => {
  it("空表达式", () => {
    expect(validateDatasetExpr("   ", FIELDS, false)).toContain("表达式为空");
  });

  it("字段不存在", () => {
    const err = validateDatasetExpr("[不存在]", FIELDS, false);
    expect(err).toContain("不存在");
    expect(err).toContain("不存在");
  });

  it("字段引用缺右括号", () => {
    expect(validateDatasetExpr("[销量", FIELDS, false)).toContain("右括号");
  });

  it("非函数标识符", () => {
    const err = validateDatasetExpr("abc", FIELDS, false);
    expect(err).toContain("不是函数");
  });

  it("未知函数", () => {
    expect(validateDatasetExpr("FOOBAR([销量])", FIELDS, false)).toContain("不在白名单");
  });

  it("参数过多", () => {
    expect(validateDatasetExpr("ABS([销量], [单价])", FIELDS, false)).toContain("参数个数错误");
  });

  it("参数过少", () => {
    expect(validateDatasetExpr("POW([销量])", FIELDS, false)).toContain("参数个数错误");
  });

  it("聚合函数用于行级上下文", () => {
    const err = validateDatasetExpr("SUM([销量])", FIELDS, false);
    expect(err).toContain("聚合函数");
    expect(err).toContain("不能用于当前上下文");
  });

  it("不支持函数", () => {
    expect(validateDatasetExpr("EXPLODE([销量])", FIELDS, false)).toContain("暂不支持");
  });

  it("字符串未闭合", () => {
    expect(validateDatasetExpr("'abc", FIELDS, false)).toContain("未闭合");
  });

  it("括号不匹配", () => {
    expect(validateDatasetExpr("([销量]", FIELDS, false)).toContain("右括号");
  });

  it("非法字符", () => {
    expect(validateDatasetExpr("[销量] @ 1", FIELDS, false)).toContain("无法解析");
  });

  it("参数间缺逗号", () => {
    expect(validateDatasetExpr("CONCAT([销量] [单价])", FIELDS, false)).toContain("逗号");
  });

  it("CASE_WHEN 偶数参数", () => {
    expect(validateDatasetExpr("CASE_WHEN([销量] > 0, '高', '中', '低')", FIELDS, false)).toContain("参数个数错误");
  });

  it("DATE_TRUNC 参数不足", () => {
    expect(validateDatasetExpr("DATE_TRUNC('month')", FIELDS, false)).toContain("参数个数错误");
  });
});

describe("exprHasAggCall", () => {
  it("直接调用聚合函数", () => {
    expect(exprHasAggCall("SUM([销量]) * 1.13")).toBe(true);
    expect(exprHasAggCall("AVG([单价])")).toBe(true);
    expect(exprHasAggCall("COUNT([销量])")).toBe(true);
  });

  it("不含聚合函数", () => {
    expect(exprHasAggCall("[单价] * [销量]")).toBe(false);
    expect(exprHasAggCall("CONCAT([名称], 'x')")).toBe(false);
    expect(exprHasAggCall("ROUND([销量], 2)")).toBe(false);
  });

  it("字符串内的 SUM 不误判", () => {
    expect(exprHasAggCall("'SUM(x)'")).toBe(false);
    expect(exprHasAggCall("CONCAT([名称], 'SUM(x)')")).toBe(false);
  });

  it("[字段] 内含 SUM 不误判", () => {
    expect(exprHasAggCall("[SUM字段]")).toBe(false);
  });
});

describe("aggKindOf（含聚合计算字段的小计/总计汇总分类）", () => {
  it("仅 SUM/COUNT → sum", () => {
    expect(aggKindOf("SUM([销量]) * 1.13")).toBe("sum");
    expect(aggKindOf("COUNT([订单号])")).toBe("sum");
    expect(aggKindOf("SUM([a]) + SUM([b])")).toBe("sum");
  });

  it("仅 MIN → min；仅 MAX → max", () => {
    expect(aggKindOf("MIN([单价])")).toBe("min");
    expect(aggKindOf("MAX([单价]) - MIN([单价])")).toBeNull(); // 混合不可汇总
    expect(aggKindOf("MAX([单价]) * 2")).toBe("max");
  });

  it("AVG/COUNT_DISTINCT 等不可从子级重算 → null", () => {
    expect(aggKindOf("AVG([单价])")).toBeNull();
    expect(aggKindOf("COUNT_DISTINCT([门店])")).toBeNull();
    expect(aggKindOf("PERCENTILE([销量], 0.5)")).toBeNull();
  });

  it("无聚合 / 字符串内 / [字段] 内 → null", () => {
    expect(aggKindOf("[单价] * [销量]")).toBeNull();
    expect(aggKindOf("'SUM(x)'")).toBeNull();
    expect(aggKindOf("[SUM字段]")).toBeNull();
  });
});

describe("datasetComputedAggUsed", () => {
  it("直接含聚合", () => {
    const fields = [
      { name: "tax", computed: true, expr: "SUM([销量]) * 1.13" },
      { name: "row_amt", computed: true, expr: "[单价] * [销量]" },
    ];
    const m = datasetComputedAggUsed(fields);
    expect(m.get("tax")).toBe(true);
    expect(m.get("row_amt")).toBe(false);
  });

  it("DAG 传播", () => {
    const fields = [
      { name: "base", computed: true, expr: "SUM([销量])" },
      { name: "derived", computed: true, expr: "[base] * 1.13" },
    ];
    const m = datasetComputedAggUsed(fields);
    expect(m.get("base")).toBe(true);
    expect(m.get("derived")).toBe(true);
  });

  it("不含聚合的 DAG", () => {
    const fields = [
      { name: "a", computed: true, expr: "[单价] * 2" },
      { name: "b", computed: true, expr: "[a] + [销量]" },
    ];
    const m = datasetComputedAggUsed(fields);
    expect(m.get("a")).toBe(false);
    expect(m.get("b")).toBe(false);
  });
});

describe("evalDatasetExpr（运行时求值，小计/总计上下文）", () => {
  const ENV = { sum_amount: 200, sum_num: 50, rate: 0.13, name: "奶茶" };

  it("算术 + 字段引用", () => {
    expect(evalDatasetExpr("[sum_amount] * 1.13", ENV)).toBeCloseTo(226);
    expect(evalDatasetExpr("[sum_amount] / [sum_num]", ENV)).toBe(4);
    expect(evalDatasetExpr("[sum_amount] + [sum_num] * 2", ENV)).toBe(300);
    expect(evalDatasetExpr("([sum_amount] - [sum_num]) / 3", ENV)).toBe(50);
    expect(evalDatasetExpr("- [sum_amount] + 10", ENV)).toBe(-190);
  });

  it("NULL 传播：缺字段 / 除零 / 非数字", () => {
    expect(evalDatasetExpr("[missing] + 1", ENV)).toBeNull();
    expect(evalDatasetExpr("[sum_amount] / 0", ENV)).toBeNull();
    expect(evalDatasetExpr("[sum_amount] % 0", ENV)).toBeNull();
    expect(evalDatasetExpr("[name] + 1", ENV)).toBeNull(); // 字符串 + 数字 → null
  });

  it("比较 → 1/0；null 比较 → null", () => {
    expect(evalDatasetExpr("[sum_amount] > 100", ENV)).toBe(1);
    expect(evalDatasetExpr("[sum_amount] <= 100", ENV)).toBe(0);
    expect(evalDatasetExpr("[sum_amount] != [sum_num]", ENV)).toBe(1);
    expect(evalDatasetExpr("[missing] > 1", ENV)).toBeNull();
  });

  it("逻辑 AND/OR/NOT（三值）", () => {
    expect(evalDatasetExpr("[sum_amount] > 100 AND [sum_num] < 100", ENV)).toBe(1);
    expect(evalDatasetExpr("[sum_amount] > 100 OR [sum_num] > 100", ENV)).toBe(1);
    expect(evalDatasetExpr("[sum_amount] > 100 AND [sum_num] > 100", ENV)).toBe(0);
    expect(evalDatasetExpr("NOT [sum_amount] > 100", ENV)).toBe(0);
    expect(evalDatasetExpr("[missing] > 1 AND [sum_amount] > 100", ENV)).toBeNull();
    expect(evalDatasetExpr("[sum_amount] > 100 OR [missing] > 1", ENV)).toBe(1); // 明确真短路
  });

  it("IF / COALESCE / CASE_WHEN", () => {
    expect(evalDatasetExpr("IF([sum_amount] > 100, [sum_amount], 0)", ENV)).toBe(200);
    expect(evalDatasetExpr("IF([missing] > 1, 1, 2)", ENV)).toBe(2); // null 条件 → false 分支
    expect(evalDatasetExpr("COALESCE([missing], [sum_num], 0)", ENV)).toBe(50);
    expect(evalDatasetExpr("CASE_WHEN([sum_amount] > 100, '高', [sum_num] > 10, '中', '低')", ENV)).toBe("高");
    expect(evalDatasetExpr("CASE_WHEN([sum_amount] > 999, '高', [sum_num] > 10, '中', '低')", ENV)).toBe("中");
  });

  it("数学函数（ROUND/ABS/SQRT/POW/GREATEST）", () => {
    expect(evalDatasetExpr("ROUND([sum_amount] / 3, 1)", ENV)).toBe(66.7);
    expect(evalDatasetExpr("ABS(-[sum_num])", ENV)).toBe(50);
    expect(evalDatasetExpr("SQRT(16)", ENV)).toBe(4);
    expect(evalDatasetExpr("POW(2, 3)", ENV)).toBe(8);
    expect(evalDatasetExpr("GREATEST([sum_amount], [sum_num])", ENV)).toBe(200);
    expect(evalDatasetExpr("LEAST([sum_amount], [sum_num])", ENV)).toBe(50);
  });

  it("字符串函数", () => {
    expect(evalDatasetExpr("CONCAT([name], '（', [sum_num], '杯）')", ENV)).toBe("奶茶（50杯）");
    expect(evalDatasetExpr("UPPER([name])", ENV)).toBe("奶茶");
    expect(evalDatasetExpr("LENGTH([name])", ENV)).toBe(2);
    expect(evalDatasetExpr("SUBSTR('hello', 2, 3)", ENV)).toBe("ell");
  });

  it("日期函数（字符串日期）", () => {
    expect(evalDatasetExpr("YEAR('2026-08-20')", ENV)).toBe(2026);
    expect(evalDatasetExpr("MONTH('2026-08-20')", ENV)).toBe(8);
    expect(evalDatasetExpr("QUARTER('2026-08-20')", ENV)).toBe(3);
    expect(evalDatasetExpr("DATEDIFF('2026-08-21', '2026-08-20')", ENV)).toBe(1);
  });

  it("语法错误 / 非法 → null", () => {
    expect(evalDatasetExpr("sum_amount + 1", ENV)).toBeNull(); // 裸标识符须 [x]
    expect(evalDatasetExpr("[sum_amount] +", ENV)).toBeNull(); // 尾随操作符
    expect(evalDatasetExpr("ROUND([sum_amount]) junk", ENV)).toBeNull(); // 未消费完
    expect(evalDatasetExpr("NOPE([sum_amount])", ENV)).toBeNull(); // 未知函数
    expect(evalDatasetExpr("", ENV)).toBeNull();
  });

  it("聚合函数调用直接恒等（兜底；小计上下文已由 exprHasAggCall 前置拦截）", () => {
    expect(evalDatasetExpr("SUM([sum_amount])", ENV)).toBe(200);
    expect(evalDatasetExpr("COUNT([sum_amount])", ENV)).toBe(1);
  });
});

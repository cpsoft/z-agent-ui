// z-report-table 点表头排序：数值串必须按数排（2026-11-08）。
//
// [WHY 这条测试值得单独一个文件] 数据集的 DECIMAL/数值列经 Go 驱动 []byte→string
// 出来是**字符串**，早先 sortRows 用原生 `<` 比较 —— 字典序下 "9" > "10"，
// 页面上点「营业额」排序就是乱的，而且数据越大越假。修复后与
// page/render-data.ts 的 compareCell 同一套语义，这里用手写字面量锁住，
// 两侧实现各自独立，谁漂移谁红。
import { describe, expect, it } from "vitest";
import { sortRows } from "../../src/report/table/table-render";

type Row = Record<string, unknown>;

const orders = (key: string, dir: "asc" | "desc") => [{ key, dir }];

describe("sortRows 数值串按数排", () => {
  it("字典序陷阱：字符串 '9' 与 '10'（修复前 '9' > '10'）", () => {
    const rows: Row[] = [{ n: "10" }, { n: "9" }, { n: "2" }];
    const out = sortRows(rows, orders("n", "asc"), "client");
    expect(out.map((r) => r.n)).toEqual(["2", "9", "10"]);
  });

  it("DECIMAL 串带小数按数值排", () => {
    const rows: Row[] = [{ amt: "1234.50" }, { amt: "999.00" }, { amt: "1200.00" }];
    const out = sortRows(rows, orders("amt", "desc"), "client");
    expect(out.map((r) => r.amt)).toEqual(["1234.50", "1200.00", "999.00"]);
  });

  it("number 与数字串混合同排", () => {
    const rows: Row[] = [{ v: 10 }, { v: "9" }, { v: "11.5" }, { v: 2 }];
    const out = sortRows(rows, orders("v", "asc"), "client");
    expect(out.map((r) => r.v)).toEqual([2, "9", 10, "11.5"]);
  });

  it("desc 反向", () => {
    const rows: Row[] = [{ n: "2" }, { n: "10" }, { n: "9" }];
    const out = sortRows(rows, orders("n", "desc"), "client");
    expect(out.map((r) => r.n)).toEqual(["10", "9", "2"]);
  });

  it("文本列仍字典序（Number 转不了的值）", () => {
    const rows: Row[] = [{ s: "上架" }, { s: "下架" }];
    const out = sortRows(rows, orders("s", "asc"), "client");
    expect(out.map((r) => r.s)).toEqual(["上架", "下架"]);
  });

  it("ISO 日期串字典序 = 时间序（不受影响）", () => {
    const rows: Row[] = [{ d: "2026-11-08" }, { d: "2026-10-24" }, { d: "2026-11-07" }];
    const out = sortRows(rows, orders("d", "asc"), "client");
    expect(out.map((r) => r.d)).toEqual(["2026-10-24", "2026-11-07", "2026-11-08"]);
  });

  it("空值取 SQL 的 NULL 序：asc 前、desc 后", () => {
    const rows: Row[] = [{ n: "10" }, { n: null }, { n: "9" }];
    expect(sortRows(rows, orders("n", "asc"), "client").map((r) => r.n)).toEqual([null, "9", "10"]);
    expect(sortRows(rows, orders("n", "desc"), "client").map((r) => r.n)).toEqual(["10", "9", null]);
  });

  it("server 模式不动数据", () => {
    const rows: Row[] = [{ n: "10" }, { n: "9" }];
    expect(sortRows(rows, orders("n", "asc"), "server")).toEqual(rows);
  });
});

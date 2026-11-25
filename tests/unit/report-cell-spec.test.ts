// Test: 列 / 单元格公共契约 —— 默认宽度只有一处、align 不猜业务语义、cellTag 缺省走文本
// Related: src/report/core/cell-spec.ts、architecture/l2-decompose-plan.html §6.1 §8
// Wiki: architecture/l2-decompose-plan.html
// Date: 2026-11-23
//
// [WHY 这条要有] 拆前默认宽度 120 在 4 处各写一遍（gantt/left-list.ts 三处 + table/table-render.ts 一处）。
// 改默认值漏改一处**不会报错**：构建通过、测试全绿，只表现为「两个表格宽度不一样」——
// 与项目里踩过的 silently-degradation 是同一类。所以这里的重点不是「函数能跑」，
// 而是把「默认值只允许存在于一处」变成一条会红的断言。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELL_DEFAULTS, normalizeCell, parsePx, type CellSpec } from "../../src/report/core/cell-spec.js";

describe("parsePx", () => {
  it("认 number 与带单位的 px 字符串", () => {
    expect(parsePx(120)).toBe(120);
    expect(parsePx("120px")).toBe(120);
    expect(parsePx("0.5px")).toBe(0.5);
  });

  it("认不出来的一律返回 0，由调用方回落（不抛错）", () => {
    // [WHY 不抛] 列宽来自配置 JSON，脏值抛在 render 里会让整张表消失 —— 比宽度不生效严重得多
    expect(parsePx("120")).toBe(0);
    expect(parsePx("auto")).toBe(0);
    expect(parsePx(undefined)).toBe(0);
    expect(parsePx(null)).toBe(0);
    expect(parsePx("")).toBe(0);
    expect(parsePx(Number.NaN)).toBe(0);
    expect(parsePx(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("normalizeCell", () => {
  const base: CellSpec = { key: "amount", title: "金额" };

  it("没给宽度时用 CELL_DEFAULTS.width", () => {
    expect(normalizeCell(base).widthPx).toBe(CELL_DEFAULTS.width);
  });

  it("0 与认不出的宽度也回落默认", () => {
    // [WHY 0 也要回落] 0 宽的表头仍留着可点区域，用户会以为「这列被我拖没了」；
    // 上界挡住被改坏的 localStorage（1e9 会把表格撑成横向长城）—— 两条都见 ReportTable 的 MIN/MAX_COL_WIDTH
    expect(normalizeCell({ ...base, width: 0 }).widthPx).toBe(CELL_DEFAULTS.width);
    expect(normalizeCell({ ...base, width: "auto" }).widthPx).toBe(CELL_DEFAULTS.width);
  });

  it("合法宽度原样生效，number 与 px 字符串等价", () => {
    expect(normalizeCell({ ...base, width: 200 }).widthPx).toBe(200);
    expect(normalizeCell({ ...base, width: "200px" }).widthPx).toBe(200);
  });

  it("align 原样透传 —— 不按宽度/格式推断", () => {
    // [WHY] 表格的默认对齐是「指标 right / 维度 left」，由调用方按列语义给；
    // 通用层按格式猜会盖掉那个更准的来源，且猜错不报错（只是看着别扭）
    expect(normalizeCell(base).align).toBeUndefined();
    expect(normalizeCell({ ...base, align: "right" }).align).toBe("right");
  });

  it("cellTag 缺省 = 文本渲染", () => {
    expect(normalizeCell(base).renderer).toEqual({ kind: "text" });
    expect(normalizeCell({ ...base, cellTag: "my-cell" }).renderer).toEqual({ kind: "tag", tag: "my-cell" });
  });
});

// ── 守卫：默认值只允许存在于契约文件 ─────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** 去掉注释行再扫，否则「原 width ?? 120」这类说明性注释会误报。 */
function code(text: string): string {
  return text
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
}

describe("默认值守卫", () => {
  it("src/report 下除 cell-spec.ts 外不再出现写死的 120 默认宽度", () => {
    const offenders = walk("src/report")
      .filter((f) => !f.endsWith("cell-spec.ts"))
      .filter((f) => /\?\?\s*120\b|\|\|\s*120\b/.test(code(readFileSync(f, "utf8"))));
    expect(offenders).toEqual([]);
  });
});

// ── 与旧实现差分（证明「本批不改渲染输出」不是口头承诺）──────────────
describe("等价性：表格路径与旧表达式逐项一致", () => {
  /** 迁移前 `table/table-render.ts:getColPixelWidth` 的写法，逐字保留。 */
  const legacyTableWidth = (w: string | number | undefined | null) => parsePx(w) || 120;

  it("所有宽度输入下 normalizeCell 与旧表达式给出同一个像素值", () => {
    const inputs: (string | number | undefined | null)[] = [
      undefined, null, "", "auto", "abc", "120px", "0px", "0.5px", 200, 0, Number.NaN,
    ];
    for (const w of inputs) {
      expect(normalizeCell({ key: "k", title: "t", width: w }).widthPx).toBe(legacyTableWidth(w));
    }
  });
});

describe("等价性：甘特路径的两处有意修正", () => {
  /** 旧写法 `c.width ?? 120` —— `??` 只对 null/undefined 生效。 */
  const legacyGanttWidth = (w: number | undefined) => w ?? 120;

  it("undefined / 正常值：与旧写法一致", () => {
    expect(normalizeCell({ key: "k", title: "t" }).widthPx).toBe(legacyGanttWidth(undefined));
    expect(normalizeCell({ key: "k", title: "t", width: 200 }).widthPx).toBe(legacyGanttWidth(200));
  });

  it("width: 0 与 \"\" 收敛为默认宽度（旧写法会产出不可见列 / 非法 CSS）", () => {
    // 旧：0 ?? 120 = 0 ⇒ 列宽 0，用户看不到这一列（且没有任何报错）
    // 旧："" ?? 120 = "" ⇒ style="width:px"，非法 CSS ⇒ 浏览器忽略
    // 新：两者都回落 120。这是修正，不是回归 —— 0 宽列在甘特左列上没有任何业务含义。
    expect(legacyGanttWidth(0)).toBe(0);
    expect(normalizeCell({ key: "k", title: "t", width: 0 }).widthPx).toBe(CELL_DEFAULTS.width);
    expect(normalizeCell({ key: "k", title: "t", width: "" }).widthPx).toBe(CELL_DEFAULTS.width);
  });
});

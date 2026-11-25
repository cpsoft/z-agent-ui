// X 轴标签格式（M12）：纯函数，期望值全部手写 —— 不拿 formatOneLabel 的结果当另一条的期望。
import { describe, expect, it } from "vitest";
import { LABEL_FORMAT_OPTIONS, formatOneLabel, formatXLabels } from "../../src/report/core/report-axis.js";

describe("formatOneLabel：只在看得出是日期/时间时才改写", () => {
  it("月-日：补零，改完是 5 个字符", () => {
    expect(formatOneLabel("2026-10-16", "md")).toBe("10-16");
    expect(formatOneLabel("2026-1-3", "md")).toBe("01-03");
    // 万一是「日期 + 时分」，也只取日期部分
    expect(formatOneLabel("2026-10-16 10:16:00", "md")).toBe("10-16");
  });

  it("月/日：换分隔符，不换数字", () => {
    expect(formatOneLabel("2026/10/16", "slash")).toBe("10/16");
    expect(formatOneLabel("2026.10.16", "slash")).toBe("10/16");
  });

  it("时:分：取时间部分；纯日期没有时间就原样", () => {
    expect(formatOneLabel("2026-10-16 08:05:00", "time")).toBe("08:05");
    expect(formatOneLabel("08:05", "time")).toBe("08:05");
    expect(formatOneLabel("2026-10-16", "time")).toBe("2026-10-16");
  });

  it("看不出是日期的一律原样（不猜类型、不抛错）", () => {
    expect(formatOneLabel("第三周", "md")).toBe("第三周");
    expect(formatOneLabel("甲店", "slash")).toBe("甲店");
    expect(formatOneLabel("", "md")).toBe("");
    // 非法月/日不硬改：把 2026-13-01 改写成 13-01 只会让人以为数据是对的
    expect(formatOneLabel("2026-13-01", "md")).toBe("2026-13-01");
    expect(formatOneLabel("2026-10-45", "slash")).toBe("2026-10-45");
    expect(formatOneLabel("2026-10-16 25:00", "time")).toBe("2026-10-16 25:00");
  });

  it("auto = 原样", () => {
    expect(formatOneLabel("2026-10-16", "auto")).toBe("2026-10-16");
  });
});

describe("formatXLabels：会把两个分类撞成一个时，整体不生效", () => {
  it("跨年同月同日 → 退回原样，并标记 collapsed", () => {
    const out = formatXLabels(["2025-10-16", "2026-10-16"], "md");
    expect(out.labels).toEqual(["2025-10-16", "2026-10-16"]);
    expect(out.collapsed).toBe(true);
  });

  it("同一天出现两行（本来就重复）不算冲突", () => {
    const out = formatXLabels(["2026-10-16", "2026-10-16"], "md");
    expect(out.labels).toEqual(["10-16", "10-16"]);
    expect(out.collapsed).toBe(false);
  });

  it("不冲突时按行下标等长返回，顺序不变", () => {
    const out = formatXLabels(["2026-10-17", "2026-10-16"], "md");
    expect(out.labels).toEqual(["10-17", "10-16"]);
    expect(out.collapsed).toBe(false);
  });

  it("auto / 空列 / 缺省配置都不改写", () => {
    expect(formatXLabels(["2026-10-16"], "auto")).toEqual({ labels: ["2026-10-16"], collapsed: false });
    expect(formatXLabels([], "md")).toEqual({ labels: [], collapsed: false });
    expect(formatXLabels(["2026-10-16"], undefined).labels).toEqual(["2026-10-16"]);
  });
});

describe("下拉选项", () => {
  it("第一项必须是 auto：它是「不配」的形态，存量报表读到的就是它", () => {
    expect(LABEL_FORMAT_OPTIONS[0].value).toBe("auto");
    expect(LABEL_FORMAT_OPTIONS.map((o) => o.value)).toEqual(["auto", "md", "slash", "time"]);
  });
});

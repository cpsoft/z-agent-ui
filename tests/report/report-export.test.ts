// 导出（CSV）的纯计算部分。
//
// [为什么不测「有没有下载成功」] 那是浏览器的行为。这里测的是**内容**：
// 列序、表头、转义、空值、格式化 —— 导出内容错了没人会当成 bug 报，只会说「数据不准」。

import { describe, expect, it, vi } from "vitest";
import { cellText, downloadText, exportCSV, toCSV } from "../../src/report/core/report-export.js";

const cols = [
  { key: "store", title: "门店" },
  { key: "amount", title: "金额" },
];

describe("cellText", () => {
  it("null / undefined / 非有限数 → 空串", () => {
    expect(cellText(null)).toBe("");
    expect(cellText(undefined)).toBe("");
    expect(cellText(Number.NaN)).toBe("");
    expect(cellText(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("数字保持原样，不补千分位（Excel 要能继续当数值算）", () => {
    expect(cellText(1234567.891)).toBe("1234567.891");
    expect(cellText(0)).toBe("0");
  });

  it("字符串原样", () => {
    expect(cellText("甲店")).toBe("甲店");
    expect(cellText(false)).toBe("false");
  });
});

describe("toCSV", () => {
  it("带 BOM + 表头 + 逐行，行尾用 LF", () => {
    const s = toCSV(cols, [
      { store: "甲店", amount: 100 },
      { store: "乙店", amount: 200 },
    ]);
    expect(s.startsWith("\uFEFF")).toBe(true);
    expect(s.slice(1)).toBe("门店,金额\n甲店,100\n乙店,200");
  });

  it("列序由 columns 决定，不跟对象的键序走", () => {
    const s = toCSV(cols, [{ amount: 1, store: "甲店" }]);
    expect(s.slice(1).split("\n")[1]).toBe("甲店,1");
  });

  it("缺列/多列：按 columns 取值，行里多出来的键不导出", () => {
    const s = toCSV(cols, [{ store: "甲店", amount: 1, extra: "多余" }]);
    expect(s.slice(1).split("\n")[1]).toBe("甲店,1");
  });

  it("逗号 / 双引号 / 换行都要转义（否则整份 CSV 列错位）", () => {
    const s = toCSV(cols, [
      { store: '华东,一店', amount: 1 },
      { store: '带"引号"的店', amount: 2 },
      { store: "两行\n店名", amount: 3 },
    ]);
    const lines = s.slice(1).split("\n");
    expect(lines[1]).toBe('"华东,一店",1');
    expect(lines[2]).toBe('"带""引号""的店",2');
    // 含换行的字段被引号包住：Excel 会把它当同一行处理
    expect(s).toContain('"两行\n店名",3');
  });

  it("表头本身也转义", () => {
    const s = toCSV([{ key: "a", title: '金额,"合计"' }], [{ a: 1 }]);
    expect(s.slice(1).split("\n")[0]).toBe('"金额,""合计"""');
  });

  it("空行集只留表头", () => {
    expect(toCSV(cols, []).slice(1)).toBe("门店,金额");
  });

  it("format 钩子按列 key 格式化，且拿到的是原始值", () => {
    const seen: [string, unknown][] = [];
    const s = toCSV(cols, [{ store: "甲店", amount: 1200 }], (key, v) => {
      seen.push([key, v]);
      return key === "amount" ? `${v}.00` : String(v);
    });
    expect(s.slice(1).split("\n")[1]).toBe("甲店,1200.00");
    // 钩子必须拿到**原始数字**，否则「按列配小数位」就得自己再 parseInt 一遍
    expect(seen).toEqual([
      ["store", "甲店"],
      ["amount", 1200],
    ]);
  });
});

describe("downloadText / exportCSV", () => {
  it("补 .csv 后缀，已带后缀不重复加", () => {
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const cr = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    const rv = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    exportCSV("销售日报", cols, [{ store: "甲店", amount: 1 }]);
    exportCSV("销售日报.csv", cols, [{ store: "甲店", amount: 1 }]);
    expect(names).toEqual(["销售日报.csv", "销售日报.csv"]);

    click.mockRestore();
    cr.mockRestore();
    rv.mockRestore();
  });

  it("非浏览器环境明确抛错，不静默什么都不做", () => {
    const u = URL as unknown as { createObjectURL?: unknown };
    const saved = u.createObjectURL;
    // 模拟 SSR / 未打桩环境
    u.createObjectURL = undefined;
    try {
      expect(() => downloadText("x", "y")).toThrow(/不支持文件下载/);
    } finally {
      u.createObjectURL = saved;
    }
  });
});

// Test: chart format 迷你语言 — auto/percent/currency/template/date, locale
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import { makeFormatter, makeDateFormatter } from "../../../src/report/chart/format/format";

describe("makeFormatter", () => {
  it("auto formats plain numbers with 2 decimals", () => {
    const fmt = makeFormatter("auto", "en-US");
    expect(fmt(1234.5)).toBe("1,234.5");
    expect(fmt(0.5)).toBe("0.5");
  });

  it("auto uses compact notation for large magnitudes", () => {
    const fmt = makeFormatter("auto", "en-US");
    expect(fmt(2_500_000)).toBe("2.5M");
  });

  it("integer drops decimals", () => {
    expect(makeFormatter("integer", "en-US")(3.7)).toBe("4");
  });

  it("percent formats as percentage", () => {
    expect(makeFormatter("percent", "en-US")(0.45)).toBe("45%");
  });

  it("currency formats with code or default", () => {
    expect(makeFormatter("currency", "en-US")(12)).toBe("$12.00");
    expect(makeFormatter("currency:CNY", "zh-CN")(12)).toBe("¥12.00");
  });

  it("template replaces {value} placeholder", () => {
    expect(makeFormatter("¥{value} 件", "en-US")(42)).toBe("¥42 件");
  });

  it("respects locale", () => {
    expect(makeFormatter("auto", "de-DE")(1234.5)).toContain("1.234,5");
  });
});

describe("makeDateFormatter", () => {
  it("auto shows short month + day", () => {
    const t = Date.UTC(2026, 0, 5);
    const out = makeDateFormatter("auto", "en-US")(t);
    expect(out).toContain("5");
  });

  it("year option renders year only", () => {
    const out = makeDateFormatter("year", "en-US")(Date.UTC(2026, 5, 15));
    expect(out).toContain("2026");
  });

  it("unknown spec falls back to auto", () => {
    const t = Date.UTC(2026, 0, 5);
    expect(makeDateFormatter("bogus", "en-US")(t)).toBe(makeDateFormatter("auto", "en-US")(t));
  });
});

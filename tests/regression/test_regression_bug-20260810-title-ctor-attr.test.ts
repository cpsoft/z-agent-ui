// Test: 构造期不得产生属性（title 反射属性与字段初始化器冲突）
// Related: [[bug-20260810-title-ctor-attr]]
// Wiki: wiki/bugs/bug-20260810-title-ctor-attr.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../src/components/accordion-item/AccordionItem";
import "../../src/property/group/PropertyGroup";
import "../../src/components/alert/Alert";
import "../../src/report/chart/Chart";
import "../../src/report/chart/ChartAxis";

const flush = () => new Promise((r) => setTimeout(r, 0));

// [WHY] title 是 HTMLElement 反射属性：`title = ""` 字段初始化器会在构造期
// setAttribute("title")，浏览器 createElement 抛 "The result must not have attributes"
const CASES = [
  ["z-accordion-item", "accordion-item"],
  ["z-property-group", "property-group"],
  ["z-alert", "alert"],
  ["z-chart", "chart"],
  ["z-chart-axis", "chart-axis"],
] as const;

describe("regression: title ctor attr", () => {
  it("happy-dom reflects title to attribute (sanity: test is meaningful)", () => {
    const d = document.createElement("div");
    d.title = "x";
    expect(d.getAttribute("title")).toBe("x");
  });

  for (const [tag, name] of CASES) {
    it(`${name}: construction sets no attributes`, () => {
      const el = document.createElement(tag);
      expect(el.getAttributeNames()).toEqual([]);
    });

    it(`${name}: construction completes (shadow root attached)`, () => {
      const el = document.createElement(tag);
      expect(el.shadowRoot).toBeTruthy();
    });

    it(`${name}: title default is preserved and attribute path still works`, async () => {
      const el = document.createElement(tag) as any;
      document.body.appendChild(el);
      await flush();
      expect(el.title).toBe("");

      el.setAttribute("title", "hello");
      await flush();
      expect(el.title).toBe("hello");

      el.title = "prop";
      await flush();
      expect(el.getAttribute("title")).toBe("prop");
      document.body.removeChild(el);
    });
  }
});

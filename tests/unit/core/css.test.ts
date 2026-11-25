// Test: Core css template helper
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import { css } from "../../../src/core/css";

describe("css template tag", () => {
  it("returns a string", () => {
    const result = css`
      .foo {
        color: red;
      }
    `;
    expect(typeof result).toBe("string");
    expect(result).toContain(".foo");
    expect(result).toContain("color: red");
  });

  it("interpolates values", () => {
    const color = "blue";
    const result = css`
      .bar {
        color: ${color};
      }
    `;
    expect(result).toContain("color: blue");
  });

  it("handles null/undefined values as empty string", () => {
    const result = css`
      .x {
        color: ${null};
        bg: ${undefined};
      }
    `;
    expect(result).toContain("color: ;");
  });
});

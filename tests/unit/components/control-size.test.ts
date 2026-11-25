// Test: 四个表单控件的 size 档位 —— 同一个 size 必须是同一个高度表达式
//
// [WHY 单独一个测试文件，而不是每个组件各测一遍] 这条判据的价值在**横向一致**：
// `size="md"` 在输入框、选择框、数字框、分页上必须解析成同一个 CSS 变量，
// 否则「同一表单里两个 md 控件不等高」——那正是 B3b 要修的症状。
// 四个组件各自测自己的映射，恰好测不出「它们不一样」。
import { describe, it, expect } from "vitest";
import "../../../src/components/input/Input";
import "../../../src/components/select/Select";
import "../../../src/components/number-input/NumberInput";
import "../../../src/components/pagination/Pagination";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(tag: string, attrs: Record<string, string> = {}, props: Record<string, unknown> = {}) {
  const el = document.createElement(tag) as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  if (tag === "z-pagination") el.total = 30;
  document.body.appendChild(el);
  await tick();
  return el;
}

const height = (el: any) => el.style.getPropertyValue("--_h");
const TAGS = ["z-input", "z-select", "z-number-input", "z-pagination"];

describe("表单控件 size 档位", () => {
  it("默认 sm = 既有高度（--z-input-height），不是 md", async () => {
    for (const tag of TAGS) {
      const el = await make(tag);
      expect(height(el), tag).toBe("var(--z-input-height)");
      el.remove();
    }
  });

  it("四档在各组件上解析成同一个表达式（横向一致才是这条判据的意义）", async () => {
    const want = {
      xs: "var(--z-control-h-xs)",
      sm: "var(--z-input-height)",
      md: "var(--z-control-h)",
      lg: "var(--z-control-h-lg)",
    };
    for (const tag of TAGS) {
      for (const [size, expr] of Object.entries(want)) {
        const el = await make(tag, { size });
        expect(height(el), `${tag} size=${size}`).toBe(expr);
        el.remove();
      }
    }
  });

  it("JS 赋值与写属性走同一条路径（否则「写 HTML 生效、赋值不生效」）", async () => {
    for (const tag of TAGS) {
      const byAttr = await make(tag, { size: "lg" });
      const byProp = await make(tag, {}, { size: "lg" });
      expect(height(byProp), tag).toBe(height(byAttr));
      byAttr.remove();
      byProp.remove();
    }
  });

  it("未知档位兜底 sm（不能让控件塌成 0 高）", async () => {
    for (const tag of TAGS) {
      const el = await make(tag, { size: "huge" });
      expect(height(el), tag).toBe("var(--z-input-height)");
      el.remove();
    }
  });
});

// Test: z-descriptions / z-descriptions-item —— 只读键值展示
import { describe, it, expect } from "vitest";
import "../../../src/components/descriptions/Descriptions";
import "../../../src/components/descriptions/DescriptionsItem";

const tick = () => new Promise((r) => setTimeout(r, 0));
const v = (el: any, name: string) => el.style.getPropertyValue(name);

async function makeGrid(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-descriptions") as any;
  for (const [k, val] of Object.entries(attrs)) el.setAttribute(k, val);
  document.body.appendChild(el);
  await tick();
  return el;
}

async function makeItem(host: any, attrs: Record<string, string> = {}, text = "值") {
  const item = document.createElement("z-descriptions-item") as any;
  for (const [k, val] of Object.entries(attrs)) item.setAttribute(k, val);
  item.textContent = text;
  host.appendChild(item);
  await tick();
  return item;
}

describe("z-descriptions", () => {
  it("默认 3 列、无边框", async () => {
    const el = await makeGrid();
    expect(v(el, "--_col")).toBe("3");
    expect(v(el, "--_gap")).toBe("0");
    expect(v(el, "--_bg")).toBe("transparent");
    el.remove();
  });

  it("column 可改", async () => {
    const el = await makeGrid({ column: "4" });
    expect(v(el, "--_col")).toBe("4");
    el.remove();
  });

  it("非法 column 兜底 3（repeat(0) 会让整条声明被丢弃）", async () => {
    for (const bad of ["0", "-1", "abc"]) {
      const el = await makeGrid({ column: bad });
      expect(v(el, "--_col"), bad).toBe("3");
      el.remove();
    }
  });

  it("bordered 同时设 gap 与底色（只设一个会得到「无线」或「一整块实色」）", async () => {
    const el = await makeGrid({ bordered: "" });
    expect(v(el, "--_gap")).toBe("1px");
    expect(v(el, "--_bg")).toBe("var(--z-color-border)");
    el.remove();
  });

  it("compact 缩小纵向内边距", async () => {
    const normal = await makeGrid();
    expect(v(normal, "--_pad")).toContain("--z-space-2");
    normal.remove();

    const compact = await makeGrid({ compact: "" });
    expect(v(compact, "--_pad")).toContain("--z-space-1");
    compact.remove();
  });

  it("渲染出 slot 且无包裹层（子项必须是 grid 的直接子节点）", async () => {
    const el = await makeGrid();
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll("div").length).toBe(0);
    el.remove();
  });
});

describe("z-descriptions-item", () => {
  it("label 渲染到 shadow，内容走 slot", async () => {
    const grid = await makeGrid();
    const item = await makeItem(grid, { label: "门店编号" }, "A-1024");
    const label = item.shadowRoot!.querySelector(".z-descriptions-item__label")!;
    expect(label.textContent).toBe("门店编号");
    expect(item.shadowRoot!.querySelector("slot")).not.toBeNull();
    grid.remove();
  });

  it("label 会被转义（业务数据里的尖括号不能变成标签）", async () => {
    const grid = await makeGrid();
    const item = await makeItem(grid, { label: '<img src=x onerror="alert(1)">' });
    const label = item.shadowRoot!.querySelector(".z-descriptions-item__label")!;
    expect(label.innerHTML).not.toContain("<img");
    expect(label.textContent).toContain("<img");
    grid.remove();
  });

  it("span 默认 1，可跨列", async () => {
    const grid = await makeGrid();
    const a = await makeItem(grid, { label: "a" });
    expect(v(a, "--_span")).toBe("1");
    const b = await makeItem(grid, { label: "b", span: "2" });
    expect(v(b, "--_span")).toBe("2");
    // span=1 不设 span 变量（CSS 的默认值就是 1，多设一次只是噪音）
    grid.remove();
  });

  it("父容器不带边框时 label 与 value 竖排", async () => {
    const grid = await makeGrid();
    const item = await makeItem(grid, { label: "x" });
    expect(v(item, "--_dir")).toBe("column");
    expect(v(item, "--_align")).toBe("flex-start");
    grid.remove();
  });

  it("父容器带边框时横排，label 定宽", async () => {
    const grid = await makeGrid({ bordered: "" });
    const item = await makeItem(grid, { label: "x" });
    expect(v(item, "--_dir")).toBe("row");
    expect(v(item, "--_align")).toBe("center");
    expect(v(item, "--_label-flex")).toBe("0 0 96px");
    grid.remove();
  });

  it("不在 z-descriptions 里时按无边框渲染（不抛错）", async () => {
    const orphan = document.createElement("z-descriptions-item") as any;
    orphan.setAttribute("label", "孤儿");
    document.body.appendChild(orphan);
    await tick();
    expect(v(orphan, "--_dir")).toBe("column");
    orphan.remove();
  });
});

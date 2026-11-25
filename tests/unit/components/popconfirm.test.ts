// Test: z-popconfirm —— 气泡确认
//
// [为什么用 `_fillPanel(div)` 而不是走真实浮层] 浮动面板由 FloatingPanelController 挂到 body，
// happy-dom 下它的定位与生命周期不完整（popover 的测试同样只看 open 状态）。
// 而 popconfirm 独有的逻辑全在「面板里放什么 + 点按钮发什么事件」—— 那部分可以直接喂一个
// 空 div 进去验证，比等浮层可靠。
import { describe, it, expect } from "vitest";
import "../../../src/components/popconfirm/Popconfirm";
import "../../../src/components/popover/Popover";

const tick = () => new Promise((r) => setTimeout(r, 0));

function make(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-popconfirm") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  const btn = document.createElement("button");
  btn.textContent = "删除";
  el.appendChild(btn);
  document.body.appendChild(el);
  return el;
}

/** 直接调 protected 的 _fillPanel，拿到面板内容（不依赖浮层）。 */
function fill(el: any): HTMLElement {
  const panel = document.createElement("div");
  el._fillPanel(panel);
  document.body.appendChild(panel);
  return panel;
}

describe("z-popconfirm", () => {
  it("默认关闭，标题与按钮文案有默认值", async () => {
    const el = make();
    await tick();
    expect(el.open).toBe(false);
    expect(el.title).toBe("确认执行此操作？");
    expect(el.confirmText).toBe("确定");
    expect(el.cancelText).toBe("取消");
    expect(el.tone).toBe("primary");
    el.remove();
  });

  it("面板里渲染标题 + 两个按钮", async () => {
    const el = make({ title: "确定删除该门店？" });
    await tick();
    const p = fill(el);
    expect(p.querySelector(".z-popconfirm__title")!.textContent).toBe("确定删除该门店？");
    expect(p.querySelector(".z-popconfirm__confirm")).not.toBeNull();
    expect(p.querySelector(".z-popconfirm__cancel")).not.toBeNull();
    el.remove();
  });

  it("description 为空时不留空节点", async () => {
    const el = make();
    await tick();
    const p = fill(el);
    expect(p.querySelector(".z-popconfirm__desc")).toBeNull();
    el.remove();
  });

  it("description 有值才渲染", async () => {
    const el = make({ description: "删除后不可恢复" });
    await tick();
    const p = fill(el);
    expect(p.querySelector(".z-popconfirm__desc")!.textContent).toBe("删除后不可恢复");
    el.remove();
  });

  it("tone=danger 时确认按钮带危险样式类", async () => {
    const el = make({ tone: "danger" });
    await tick();
    const btn = fill(el).querySelector(".z-popconfirm__confirm")!;
    expect(btn.classList.contains("z-popconfirm__confirm--danger")).toBe(true);
    el.remove();
  });

  it("tone 非 danger 时一律用主色（不产生未知类名）", async () => {
    const el = make({ tone: "weird" });
    await tick();
    const btn = fill(el).querySelector(".z-popconfirm__confirm")!;
    expect(btn.classList.contains("z-popconfirm__confirm--primary")).toBe(true);
    el.remove();
  });

  it("自定义确认/取消文案", async () => {
    const el = make({ "confirm-text": "删除", "cancel-text": "算了" });
    await tick();
    const p = fill(el);
    expect(p.querySelector(".z-popconfirm__confirm")!.textContent!.trim()).toBe("删除");
    expect(p.querySelector(".z-popconfirm__cancel")!.textContent!.trim()).toBe("算了");
    el.remove();
  });

  it("点确认 → emit z-confirm 并关闭", async () => {
    const el = make();
    await tick();
    el.open = true;
    await tick();
    let fired = 0;
    el.addEventListener("z-confirm", () => fired++);
    const p = fill(el);
    (p.querySelector(".z-popconfirm__confirm") as HTMLButtonElement).click();
    await tick();
    expect(fired).toBe(1);
    expect(el.open).toBe(false);
    el.remove();
  });

  it("点取消 → emit z-cancel 并关闭（不发 z-confirm）", async () => {
    const el = make();
    await tick();
    el.open = true;
    await tick();
    let confirmed = 0;
    let cancelled = 0;
    el.addEventListener("z-confirm", () => confirmed++);
    el.addEventListener("z-cancel", () => cancelled++);
    const p = fill(el);
    (p.querySelector(".z-popconfirm__cancel") as HTMLButtonElement).click();
    await tick();
    expect(cancelled).toBe(1);
    expect(confirmed).toBe(0);
    expect(el.open).toBe(false);
    el.remove();
  });

  it("重复填充面板后点一次只发一次事件（onclick 是覆盖，不会累积监听）", async () => {
    const el = make();
    await tick();
    let fired = 0;
    el.addEventListener("z-confirm", () => fired++);
    // 同一个 panel 连填三次 —— 模拟浮层复用面板
    const panel = document.createElement("div");
    el._fillPanel(panel);
    el._fillPanel(panel);
    el._fillPanel(panel);
    document.body.appendChild(panel);
    (panel.querySelector(".z-popconfirm__confirm") as HTMLButtonElement).click();
    await tick();
    expect(fired).toBe(1);
    panel.remove();
    el.remove();
  });

  it("title 里的尖括号被转义（业务数据里出现引号/标签完全正常）", async () => {
    const el = make({ title: '删除 "A-1024" <script>x</script>?' });
    await tick();
    const p = fill(el);
    const title = p.querySelector(".z-popconfirm__title")!;
    expect(title.querySelector("script")).toBeNull();
    expect(title.textContent).toContain("<script>");
    el.remove();
  });

  it("点击触发器切换打开状态（继承 popover 的行为）", async () => {
    const el = make();
    await tick();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(el.open).toBe(true);
    el.remove();
  });

  it("面板 role 是 alertdialog（比 dialog 更强，屏幕阅读器会立即播报）", async () => {
    const el = make();
    await tick();
    expect(el._panelOptions().role).toBe("alertdialog");
    expect(el._panelOptions().panelClass).toContain("z-popover__popup");
    el.remove();
  });
});

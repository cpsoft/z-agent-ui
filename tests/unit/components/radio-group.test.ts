// Test: z-radio-group component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/radio/Radio";
import "../../../src/components/radio-group/RadioGroup";

// 两个 describe 共用的夹具（放在顶层：键盘那组在另一个 describe 里）
function createGroup(): HTMLElement & { value: string; disabled: boolean; orientation: string; name: string } {
  const el = document.createElement("z-radio-group") as any;
  document.body.appendChild(el);
  return el;
}

function addRadio(group: HTMLElement, value: string) {
  const radio = document.createElement("z-radio") as any;
  radio.value = value;
  (radio as any).name = "test";
  group.appendChild(radio);
  return radio;
}

describe("z-radio-group", () => {
  it("renders with vertical orientation by default", async () => {
    const el = createGroup();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-radio-group")!;
    expect(root.classList.contains("z-radio-group--vertical")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders with horizontal orientation", async () => {
    const el = createGroup();
    el.orientation = "horizontal";
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-radio-group--horizontal")).toBeDefined();
    document.body.removeChild(el);
  });

  it("syncs checked state on radios", async () => {
    const el = createGroup();
    const r1 = addRadio(el, "a");
    addRadio(el, "b");

    el.value = "a";
    await new Promise((r) => setTimeout(r, 0));

    expect(r1.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("updates value when radio changes", async () => {
    const el = createGroup();
    const r1 = addRadio(el, "x");
    addRadio(el, "y");
    await new Promise((r) => setTimeout(r, 0));

    r1.select();
    await new Promise((r) => setTimeout(r, 0));

    expect(el.value).toBe("x");
    document.body.removeChild(el);
  });

  it("emits z-change when radio selected", async () => {
    const el = createGroup();
    const r1 = addRadio(el, "one");
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    r1.select();
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    const calls = handler.mock.calls.filter(
      (c: any) => c[0].detail?.value === "one"
    );
    expect(calls.length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("disables all radios when group is disabled", async () => {
    const el = createGroup();
    const r1 = addRadio(el, "a");
    addRadio(el, "b");

    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    expect(r1.disabled).toBe(true);
    document.body.removeChild(el);
  });

  it("has role radiogroup", async () => {
    const el = createGroup();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-radio-group")!;
    expect(root.getAttribute("role")).toBe("radiogroup");
    document.body.removeChild(el);
  });
});

// ── 键盘导航 ─────────────────────────────────────────────────────────────────
//
// [为什么单开一组] 七条用例里**一条方向键都没有**，于是「Home/End 不存在」
// 与「横排组里 ↑↓ 也换选项」两种缺陷都能一直绿。2026-11-16 把方向轴交给
// L0 的 `listIntent({ axis })` 之后补上这组：它们锁的是「方向轴写反」这类错，
// 而那种错的症状是「用户想滚页面，选项却换了」—— 用户不会报 bug，只会觉得难用。

describe("z-radio-group 键盘", () => {
  function press(el: HTMLElement, key: string): boolean {
    return el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  }

  async function makeGroup(
    n: number,
    opts: { orientation?: "vertical" | "horizontal"; disabled?: number[]; value?: string } = {},
  ): Promise<{ el: any; radios: any[] }> {
    const el = createGroup();
    if (opts.orientation) el.orientation = opts.orientation;
    const radios: any[] = [];
    for (let i = 0; i < n; i++) {
      const r = addRadio(el, `v${i}`);
      if (opts.disabled?.includes(i)) r.disabled = true;
      radios.push(r);
    }
    if (opts.value) el.value = opts.value;
    await new Promise((r) => setTimeout(r, 0));
    return { el, radios };
  }

  it("G1 竖排：↓ / ↑ 换选项并绕回（移动即选中）", async () => {
    const { el } = await makeGroup(3, { value: "v0" });
    expect(el.value).toBe("v0");

    expect(press(el, "ArrowDown"), "↓ 必须 preventDefault，否则页面跟着滚").toBe(false);
    expect(el.value).toBe("v1");
    press(el, "ArrowDown");
    expect(el.value).toBe("v2");
    press(el, "ArrowDown");
    expect(el.value, "末项 ↓ 绕回首项").toBe("v0");
    press(el, "ArrowUp");
    expect(el.value, "首项 ↑ 绕到末项").toBe("v2");
    document.body.removeChild(el);
  });

  it("G2 ★ 横排：只认 ←→，↑↓ 留给页面滚动（方向轴不能四向全认）", async () => {
    // [WHY 这条最关键] 四向全认的话，横排组里按 ↑ 会换选项 —— 用户想的是往上滚一格。
    // 而界面看起来「正常工作」，只是很难用；这类缺陷只能靠「有没有 preventDefault」发现。
    const { el } = await makeGroup(3, { orientation: "horizontal", value: "v0" });

    expect(press(el, "ArrowUp"), "横排时 ↑ 不该被消费").toBe(true);
    expect(el.value).toBe("v0");
    expect(press(el, "ArrowDown")).toBe(true);
    expect(el.value).toBe("v0");

    expect(press(el, "ArrowRight")).toBe(false);
    expect(el.value).toBe("v1");
    press(el, "ArrowLeft");
    expect(el.value).toBe("v0");
    document.body.removeChild(el);
  });

  it("G3 ★ Home / End 直达首尾（2026-11-16 新补的能力）", async () => {
    const { el } = await makeGroup(5, { value: "v2" });

    expect(press(el, "End")).toBe(false);
    expect(el.value).toBe("v4");
    press(el, "Home");
    expect(el.value).toBe("v0");
    document.body.removeChild(el);
  });

  it("G4 跳过禁用项（禁用的 radio 本来也不该被选中）", async () => {
    const { el } = await makeGroup(4, { value: "v0", disabled: [1] });

    press(el, "ArrowDown");
    expect(el.value, "跳过 v1（禁用），落在 v2").toBe("v2");
    press(el, "Home");
    expect(el.value).toBe("v0");
    document.body.removeChild(el);
  });

  it("G5 一个都没选中时：↓ 落第一项、↑ 落末项", async () => {
    const down = await makeGroup(3);
    expect(down.el.value).toBe("");
    press(down.el, "ArrowDown");
    expect(down.el.value).toBe("v0");
    document.body.removeChild(down.el);

    const up = await makeGroup(3);
    press(up.el, "ArrowUp");
    expect(up.el.value).toBe("v2");
    document.body.removeChild(up.el);
  });

  it("G6 全部禁用时不改值、也不消费按键", async () => {
    const { el } = await makeGroup(2, { disabled: [0, 1] });
    expect(press(el, "ArrowDown")).toBe(true);
    expect(el.value).toBe("");
    document.body.removeChild(el);
  });

  it("G7 ★ 选中后焦点跟着走 —— 否则键盘用户只能选一次", async () => {
    // [WHY 这条是本轮冒烟抓到的真缺陷] `radios[next].select()` 只改 `checked`，
    // 而 `select()` 会让 `z-radio` 重渲染（`shadow.innerHTML` 整块替换）⇒
    // **光标所在的原生 input 被换掉**，焦点掉到 `<body>`。此后任何按键都不再冒泡到
    // 本组：真机实测「按 ↓ 选中第二项、再按 ↓ 什么都不发生」—— 界面上一切正常，
    // 用键盘的人只知道「它不灵了」。
    //
    // 断言方式刻意不派发到 group 上：那样无论焦点在哪都能到监听器，测不出这个问题。
    // 这里从**当前真实焦点**派发，让「焦点丢了」自然表现成「第二次按键没反应」。
    const { el } = await makeGroup(3, { value: "v0" });
    const radios = [...el.querySelectorAll("z-radio")] as any[];
    (radios[0].shadowRoot.querySelector("input") as HTMLElement).focus();

    const fireFromFocus = (key: string): boolean =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }),
      );

    expect(fireFromFocus("ArrowDown")).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value).toBe("v1");
    expect(
      radios[1].shadowRoot.activeElement,
      "焦点没送到第二个 radio 的原生 input 上",
    ).toBe(radios[1].shadowRoot.querySelector("input"));

    // ★ 真正的判据：第二次按键必须还能前进
    fireFromFocus("ArrowDown");
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value, "第二次 ↓ 没反应 ⇒ 焦点已经在重渲染时丢了").toBe("v2");

    document.body.removeChild(el);
  });
});

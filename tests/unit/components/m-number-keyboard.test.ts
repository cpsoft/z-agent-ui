// Test: m-number-keyboard —— 金额输入规则（纯函数）+ 键位事件 + 高度暴露
// Date: 2026-11-16
//
// [背景] 这个组件的价值全在**三条输入规则**上：只能一个小数点、小数最多两位、
// 「0」之后输数字要替换。用 `input[type=number]` 时这三条全靠宿主在 change 里修字符串，
// 改一处漏一处，漏掉的那处表现是「金额能填成 1.2.3」—— 前端不报错，提交到后端才炸。
//
// [WHY 规则单独测] `applyNumberKey` 是纯函数，不依赖 DOM。把它逐条钉住之后，
// 组件的 press() 只是「调用 + 发事件」，剩下的验证成本几乎为零。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-number-keyboard/MNumberKeyboard";
import { applyNumberKey } from "../../../src/components/m-number-keyboard/MNumberKeyboard";

const flush = (times = 2): Promise<void> => {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) p = p.then(() => new Promise<void>((r) => setTimeout(r, 0)));
  return p;
};

interface El extends HTMLElement {
  open: boolean;
  value: string;
  title: string;
  maxIntDigits: number;
  extraKey: boolean;
  extraKeyText: string;
  press(key: string): boolean;
}

describe("applyNumberKey（金额输入规则）", () => {
  it("N1 小数点只能有一个", () => {
    expect(applyNumberKey("1.2", ".")).toBe("1.2");
    expect(applyNumberKey("1", ".")).toBe("1.");
  });

  it("N2 空串按小数点要补前导 0（否则得到 \".5\"，后端按数字解析会失败）", () => {
    expect(applyNumberKey("", ".")).toBe("0.");
  });

  it("N3 小数最多两位；第三位整键忽略，而不是截断", () => {
    expect(applyNumberKey("1.23", "4"), "第三位小数不该进来").toBe("1.23");
    expect(applyNumberKey("1.2", "3")).toBe("1.23");
  });

  it("N4 「0」之后直接输数字是替换，不是拼接（避免 05 → 005）", () => {
    expect(applyNumberKey("0", "5")).toBe("5");
    // 但已经带小数点时不能替换，否则「0.5」输不出第二位
    expect(applyNumberKey("0.5", "3")).toBe("0.53");
  });

  it("N5 maxIntDigits 限整数位；0 表示不限", () => {
    expect(applyNumberKey("1234", "5", 4), "超过 4 位整数还让进").toBe("1234");
    expect(applyNumberKey("123", "4", 4)).toBe("1234");
    expect(applyNumberKey("1234567", "8", 0), "不限位数时不该拦").toBe("12345678");
    // 限制只作用于整数部分：小数位不受 maxIntDigits 影响
    expect(applyNumberKey("1234.", "5", 4)).toBe("1234.5");
  });

  it("N6 退格删一个字符；空串退格保持空", () => {
    expect(applyNumberKey("12.3", "backspace")).toBe("12.");
    expect(applyNumberKey("", "backspace")).toBe("");
  });

  it("N7 非数字非退格的键一律不改变值（键位表外的输入不许穿透）", () => {
    expect(applyNumberKey("12", "e")).toBe("12");
    expect(applyNumberKey("12", " ")).toBe("12");
  });
});

describe("m-number-keyboard", () => {
  const hosts: El[] = [];
  const track = (el: El): El => (hosts.push(el), el);

  function mount(props: Record<string, unknown> = {}): El {
    const el = document.createElement("m-number-keyboard") as El;
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
  }

  function collect(el: HTMLElement, name: string): any[] {
    const out: any[] = [];
    el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
    return out;
  }

  afterEach(() => {
    hosts.splice(0).forEach((h) => h.remove());
  });

  it("N8 点数字键：值变、发 z-input、第二次点同一个非法键不发事件", async () => {
    const el = track(mount());
    await flush();
    const inputs = collect(el, "z-input");
    const keys = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>("[data-key]"));

    const one = keys.find((k) => k.dataset.key === "1")!;
    one.click();
    await flush();
    expect(el.value).toBe("1");
    expect(inputs).toEqual([{ value: "1" }]);

    // 已经有两位小数，再按数字应当被规则忽略 —— 忽略时**不发事件**，
    // 否则宿主会为一次没有变化的输入重复取数
    el.value = "1.23";
    await flush();
    const before = inputs.length;
    keys.find((k) => k.dataset.key === "4")!.click();
    await flush();
    expect(inputs.length, "被规则拒绝的按键不该发 z-input").toBe(before);
  });

  it("N9 退格键：发 z-delete 而不是 z-input", async () => {
    const el = track(mount({ value: "12" }));
    await flush();
    const deletes = collect(el, "z-delete");
    const inputs = collect(el, "z-input");

    el.shadowRoot!.querySelector<HTMLElement>('[data-key="backspace"]')!.click();
    await flush();

    expect(el.value).toBe("1");
    expect(deletes).toEqual([{ value: "1" }]);
    expect(inputs.length, "退格不是输入，不该发 z-input").toBe(0);
  });

  it("N10 extra-key 才渲染底部按钮；点它发 z-extra 并带上当前值", async () => {
    const plain = track(mount({ value: "9.9" }));
    const withExtra = track(mount({ withExtra: true, extraKey: true, value: "9.9" }));
    await flush();

    expect(plain.shadowRoot!.querySelector("[data-act='extra']")).toBeFalsy();

    const extra = withExtra.shadowRoot!.querySelector<HTMLElement>("[data-act='extra']")!;
    expect(extra.textContent?.trim(), "extraKeyText 要生效").toBeTruthy();

    const hits = collect(withExtra, "z-extra");
    extra.click();
    await flush();
    expect(hits).toEqual([{ value: "9.9" }]);
  });

  it("N11 退格键有可访问名称：图标对读屏是空的，不写 label 就只剩「按钮」两个字", async () => {
    const el = track(mount());
    await flush();
    const del = el.shadowRoot!.querySelector<HTMLElement>('[data-key="backspace"]')!;
    expect(del.getAttribute("aria-label")).toBeTruthy();
    // 数字键反过来不该有 aria-label：文本已经是名字，再写一遍会念两次
    const one = el.shadowRoot!.querySelector<HTMLElement>('[data-key="1"]')!;
    expect(one.hasAttribute("aria-label")).toBe(false);
  });

  it("N12 标题可选：不给 title 就不渲染标题行", async () => {
    const bare = track(mount());
    const titled = track(mount({ title: "金额" }));
    await flush();
    expect(bare.shadowRoot!.querySelector(".z-m-kb__title")).toBeFalsy();
    expect(titled.shadowRoot!.querySelector(".z-m-kb__title")?.textContent?.trim()).toBe("金额");
  });

  it("N13 press() 直接调用与点键等价（宿主做「+1」这类外部输入时用得上）", async () => {
    const el = track(mount());
    await flush();
    expect(el.press("7")).toBe(true);
    expect(el.value).toBe("7");
    expect(el.press("7")).toBe(true);
    expect(el.value).toBe("77");
    expect(el.press(".")).toBe(true);
    expect(el.press("."), "第二个小数点应被拒绝，返回 false").toBe(false);
  });
});

// ── 键位按钮的可访问名（2026-11-16）──────────────────────────────────
//
// [WHY] 退格键早就写了 aria-label（图标对读屏是空的）；小数点键被落下了 ——
// 它的名字就是那段文本 `.`，读屏念「句点」，在一排数字键里分不清这是什么。
// 真机 CDP 实测：`role=button name="."`。
describe("m-number-keyboard 键位的可访问名", () => {
  it("小数点键有独立名字；数字键保留自己的数字", async () => {
    const el = document.createElement("m-number-keyboard") as unknown as El;
    el.open = true;
    document.body.appendChild(el);
    await flush();

    const key = (k: string) => el.shadowRoot!.querySelector(`[data-key="${k}"]`)!;
    expect(key(".").getAttribute("aria-label"), "读屏只会念「句点」").toBe("小数点");
    expect(key(".").textContent!.trim(), "视觉符号不变").toBe(".");
    expect(key("backspace").getAttribute("aria-label")).toBe("退格删除");
    // 数字键不需要 aria-label：文本「5」本身就是名字
    expect(key("5").getAttribute("aria-label")).toBeNull();

    // 名字来自属性 ⇒ 英文宿主能换掉它
    el.decimalPointText = "Decimal point";
    await flush();
    expect(key(".").getAttribute("aria-label")).toBe("Decimal point");
    document.body.removeChild(el);
  });
});

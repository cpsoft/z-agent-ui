// Test: z-app-switcher（跨应用切换器）
// Date: 2026-11-05
//
// 断言口径说明：这里刻意**不**断言 CSS 类名以外的观感，只钉行为契约
// （什么时候可点、点了派发什么、当前项能不能点、图标缺了会不会变空白）。
// 类名断言只用在「结构存在与否」上，避免样式微调就一片红。
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/app/app-switcher/AppSwitcher";
import type { ZAppSwitcher } from "../../../src/app/app-switcher/AppSwitcher";

const APPS = [
  { app: "zworker", name: "zWorker", icon: "grid", url: "http://w/" },
  { app: "zetl", name: "zEtl", icon: "compass", url: "http://e/" },
  { app: "zagent", name: "zAgent", icon: "robot", url: "http://a/" },
];

function mount(props: Partial<Pick<ZAppSwitcher, "label" | "current">> & { apps?: unknown } = {}): ZAppSwitcher {
  const el = document.createElement("z-app-switcher") as ZAppSwitcher;
  el.label = props.label ?? "zWorker";
  el.current = props.current ?? "";
  if (props.apps !== undefined) (el as any).apps = props.apps;
  document.body.appendChild(el);
  return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function trigger(el: ZAppSwitcher): HTMLButtonElement {
  return el.shadowRoot!.querySelector('[data-role="trigger"]') as HTMLButtonElement;
}
function items(el: ZAppSwitcher): HTMLButtonElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll('[data-role="item"]')) as HTMLButtonElement[];
}

describe("z-app-switcher", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("无可切应用时是纯标题：触发钮 disabled，点了不开面板", async () => {
    const el = mount({ apps: [] });
    await tick();

    expect(trigger(el).disabled).toBe(true);
    // 只有当前应用一项时同样属于「没得切」
    (el as any).apps = [{ app: "zworker", name: "zWorker", icon: "grid", url: "" }];
    el.current = "zworker";
    await tick();
    expect(trigger(el).disabled).toBe(true);

    trigger(el).click();
    await tick();
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeNull();
  });

  it("有可切应用时展开面板，项数与清单一致", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    expect(trigger(el).disabled).toBe(false);
    expect(trigger(el).getAttribute("aria-expanded")).toBe("false");

    trigger(el).click();
    await tick();
    expect(trigger(el).getAttribute("aria-expanded")).toBe("true");
    expect(items(el).length).toBe(3);
  });

  it("点非当前项派发 z-switch，detail 带齐四个字段并收起面板", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();

    const seen: any[] = [];
    el.addEventListener("z-switch", (e: Event) => seen.push((e as CustomEvent).detail));
    items(el)
      .find((b) => b.dataset.app === "zetl")!
      .click();
    await tick();

    expect(seen).toEqual([{ app: "zetl", name: "zEtl", icon: "compass", url: "http://e/" }]);
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeNull();
  });

  it("当前项置灰 + 标「当前」，且点击不派发", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();

    const cur = items(el).find((b) => b.dataset.app === "zworker")!;
    // [WHY 从 `disabled` 改成 `aria-disabled`] 这一条原来断言的是 `cur.disabled === true`
    // —— 那是**把缺陷当规格**：原生 `disabled` 的 menuitem 不进 Tab 序列、也被方向键
    // 过滤器跳过，于是「当前在哪个应用」这件事**键盘与读屏都获取不到**（2026-11-16
    // 真机实测：在项之间按方向键只在能切的那几项之间打转，当前项永远不被念）。
    // `aria-disabled` 保留「不可激活」的语义，但让它仍然可达可念：
    // 读屏念「zWorker 当前，菜单项，不可用」。
    expect(cur.disabled, "原生 disabled 会让它从键盘与方向键里消失").toBe(false);
    expect(cur.getAttribute("aria-disabled")).toBe("true");
    expect(cur.getAttribute("aria-current")).toBe("true");
    expect(cur.textContent).toContain("当前");

    const seen: any[] = [];
    el.addEventListener("z-switch", (e: Event) => seen.push((e as CustomEvent).detail));
    cur.click();
    await tick();
    expect(seen).toEqual([]);
  });

  it("apps 只认 property，attribute 不参与（关了 attribute 通道就不会被 `[object Object]` 覆盖）", async () => {
    const el = mount({ apps: APPS });
    await tick();
    // property → 正常渲染，且不得反射出 attribute（反射成字符串会反过来覆盖 property）
    expect(el.getAttribute("apps")).toBeNull();

    trigger(el).click();
    await tick();
    expect(items(el).length).toBe(3);

    // 反向锁：改 attribute 不影响渲染（这个属性不属于 attribute 面）
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    el.setAttribute("apps", JSON.stringify([APPS[1]]));
    await tick();
    trigger(el).click();
    await tick();
    expect(items(el).length).toBe(3);

    // 防御分支：有人直接把字符串赋给 property 时也要能解析出来（不是渲染成空下拉）
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    (el as any).apps = JSON.stringify([APPS[1]]);
    await tick();
    trigger(el).click();
    await tick();
    expect(items(el).length).toBe(1);
    expect(items(el)[0].dataset.app).toBe("zetl");
  });

  it("图标：已知键画 svg，未上报/未知键回退名称首字（不得空白）", async () => {
    const el = mount({
      apps: [
        { app: "zetl", name: "zEtl", icon: "compass", url: "http://e/" },
        { app: "waimai", name: "外卖", icon: "", url: "http://w/" },
        { app: "mystery", name: "Mystery", icon: "not-a-real-icon", url: "http://m/" },
      ],
    });
    await tick();
    trigger(el).click();
    await tick();

    const rowOf = (app: string) => items(el).find((b) => b.dataset.app === app)!;
    expect(rowOf("zetl").querySelector("svg")).not.toBeNull();
    // 中文取本字
    expect(rowOf("waimai").querySelector(".z-app-switcher__icon--text")!.textContent).toBe("外");
    // 未知键取西文首字母并大写
    expect(rowOf("mystery").querySelector(".z-app-switcher__icon--text")!.textContent).toBe("M");
    // 关键：不能出现「既没 svg 也没文字」的空图标位
    for (const b of items(el)) {
      expect(b.querySelector("svg, .z-app-switcher__icon--text")).not.toBeNull();
    }
  });

  it("Esc 关闭面板并把焦点还给触发钮", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();
    expect(items(el).length).toBe(3);

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(trigger(el));
  });

  // ── 键盘可达性与文案属性（2026-11-16）───────────────────────────────
  it("Tab 离开面板时收起（不 preventDefault，也不把焦点拽回来）", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeTruthy();

    // [WHY 必须 composed] 菜单项在组件的 shadow 里，而监听听在宿主上 ——
    // 事件不跨 shadow 边界就到不了。真机的 keydown 天然 composed=true；
    // 合成事件默认 false，漏掉这个参数会得到「按了没反应」的假红。
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true, composed: true });
    items(el)[1].dispatchEvent(ev);
    await tick();

    // [WHY 断言「没 preventDefault」] 面板不是模态，Tab 该去哪去哪；拦下来会让
    // 键盘用户困在组件里。原缺陷是反过来的：Tab 照常走，但**面板不关** ——
    // 焦点离开后浮层还挂着，`aria-expanded` 一直是 "true"。
    expect(ev.defaultPrevented).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeNull();
    expect(trigger(el).getAttribute("aria-expanded")).toBe("false");
  });

  it("当前项能被方向键走到（键盘用户也得知道「我在哪个应用」）", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();

    // 从最后一项开始按 ↓ 绕回，应当经过当前项
    const all = items(el);
    all[all.length - 1].focus();
    const visited: string[] = [];
    // [WHY 每轮都从「当前真正持有焦点的那个」派发] 对着固定元素派发时，
    // 焦点早就不在那里了 —— `_move` 按 activeElement 算，循环会原地打转
    // （第一版就这么写的，得到 ['zagent','zagent','zagent']）。
    for (let i = 0; i < all.length; i++) {
      const active = el.shadowRoot!.activeElement as HTMLElement | null;
      visited.push(active?.dataset.app ?? "?");
      active!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
      );
      await tick();
    }
    expect(visited, "方向键绕一圈必须经过每个应用，包括当前那个").toContain("zworker");
  });

  it("面板名与「当前」徽标可被宿主换成别的语言", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    el.menuLabel = "Switch app";
    el.currentLabel = "Current";
    await tick();
    trigger(el).click();
    await tick();

    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")!.getAttribute("aria-label")).toBe("Switch app");
    expect(items(el).find((b) => b.dataset.app === "zworker")!.textContent).toContain("Current");
  });

  it("点组件外部关闭面板", async () => {
    const el = mount({ apps: APPS, current: "zworker" });
    await tick();
    trigger(el).click();
    await tick();

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await tick();
    expect(el.shadowRoot!.querySelector(".z-app-switcher__menu")).toBeNull();
  });

  it("url 为空的应用仍然派发（不能静默吞掉点击）", async () => {
    const el = mount({ apps: [{ app: "zetl", name: "zEtl", icon: "compass", url: "" }] });
    await tick();
    trigger(el).click();
    await tick();

    const seen: any[] = [];
    el.addEventListener("z-switch", (e: Event) => seen.push((e as CustomEvent).detail));
    items(el)[0].click();
    await tick();
    expect(seen.length).toBe(1);
    expect(seen[0]).toMatchObject({ app: "zetl", url: "" });
  });

  it("缺 app 字段的脏数据被丢弃，不渲染成一行空白", async () => {
    const el = mount({ apps: [{ name: "没有 app 码", url: "http://x/" }, APPS[1]] as any });
    await tick();
    trigger(el).click();
    await tick();
    expect(items(el).length).toBe(1);
    expect(items(el)[0].dataset.app).toBe("zetl");
  });

  it("名称与 app 码里的尖括号被转义（文案来自注册表，不能当 HTML 直出）", async () => {
    const el = mount({
      label: '<img src=x onerror=alert(1)>',
      apps: [{ app: 'a"b', name: "<script>alert(1)</script>", icon: "grid", url: "http://x/" }],
    });
    await tick();
    // 触发钮上的品牌名
    expect(trigger(el).querySelector("img")).toBeNull();
    expect(trigger(el).textContent).toContain("<img src=x");

    trigger(el).click();
    await tick();
    // 菜单项名称与属性值
    expect(el.shadowRoot!.querySelector("script")).toBeNull();
    expect(items(el)[0].textContent).toContain("<script>alert(1)</script>");
    expect(items(el)[0].dataset.app).toBe('a"b');
  });
});

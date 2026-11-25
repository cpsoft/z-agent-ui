// aria 契约守卫：把「属性写了」和「读屏能读到」分开考。
//
// [WHY 需要这一族] 2026-11-15 一天里连查出两批同形缺陷，都长这样：
//   · 菜单：`aria-expanded` 写成 `""`（模板把 false 渲染成空串）⇒ 读屏说「未知」；
//     而且是 12 个组件一起这么写，静态看代码完全合理。
//   · 菜单：打开后焦点留在触发器上，面板上的 keydown 永远收不到 ⇒ 方向键与 Esc 全死，
//     界面上完全看不出来（点开正常、高亮也画得出来），只有用键盘的人发现按什么都没反应。
// 共同点：**DOM 上写着/画着，语义链断在半路**。所以这里的判据一律是关系型的：
//   值非空、IDREF 指得到、键按下去之后「状态」与「焦点」都真的动了。
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const ROOT = path.resolve(__dirname, "../..");

/** 等两轮宏任务：浮层/动画走 rAF 或 timeout，需要真的让出一轮事件循环。 */
async function flush(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0));
}

/**
 * 只让出微任务队列 —— 给 BaseElement 的首次 `update()` 用。
 *
 * [WHY 不是提速手段，先把这个误解放下] 实测（2026-11-16）：把它换成 `microtasks(0)`
 * —— 一次都不等 —— G1 的扫描结果**一模一样**（204 条、零问题）。也就是说原代码的
 * `flush(2)` 在这条用例里本来就是 242 次多余宏任务，等与不等都不影响渲染。
 *
 * 那为什么还改：这 242 次 `setTimeout(0)` 在整仓并行（4 358 例同抢 CPU）时会各自
 * 排队几十毫秒，把「本来 8.6s 的本体成本」往上抬 —— 它不产生正确性，只产生抖动。
 * 去掉它属于「删掉无用等待」，不属于「优化速度」，别指望它缩短耗时。
 */
async function microtasks(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

/** 收集一棵树里的所有 aria 属性（shadow 与 light 都走）。 */
function ariaAttrsIn(root: ParentNode): Array<{ tag: string; name: string; value: string }> {
  const out: Array<{ tag: string; name: string; value: string }> = [];
  const els = root.querySelectorAll("*");
  for (const el of Array.from(els)) {
    for (const attr of Array.from(el.attributes)) {
      if (!attr.name.startsWith("aria-")) continue;
      out.push({ tag: el.tagName.toLowerCase(), name: attr.name, value: attr.value });
    }
  }
  return out;
}

/** 写进 aria 的「布尔三态」—— 只允许这三个字面量，空串是最常见的错法。 */
const BOOL_ARIA = new Set(["aria-expanded", "aria-checked", "aria-selected", "aria-pressed", "aria-busy", "aria-disabled", "aria-modal", "aria-hidden"]);
const BOOL_TOKENS = new Set(["true", "false", "mixed", "undefined"]);

/**
 * G1 的时间预算：90s，比 `SCAN_TIMEOUT_MS`（30s）宽三倍。
 *
 * [WHY 单独放宽，而不是把 SCAN_TIMEOUT_MS 改成 90s] 这两个预算保护的不是一回事：
 *   · `SCAN_TIMEOUT_MS` 保护「读文件」型守卫（几百个文件全读一遍，2~12s）——
 *     它们的问题是**重复扫描**，所以该做的是缓存与合并，30s 是合理的上限。
 *   · 这条的成本是**首次执行 121 个组件模块**（8.6s，实测），与仓库规模线性、
 *     没有可合并的重复。整仓并行时被放大 3 倍以上，30s 必然撞。
 * 把全局常量改大，会连带放掉前者「真卡死」的探测能力 —— 所以只给这一条单独开口。
 *
 * 真卡死（死循环、模块互相等待）时它仍然会在 90s 内报错，不会把闸门变成装饰。
 */
const G1_BUDGET_MS = 90_000;

describe("aria 契约（值 / 关系 / 键按下去之后真的动）", () => {
  /**
   * G1：全库 118 个组件，任何 aria 值都不许是空串。
   *
   * [WHY 扫渲染结果而不是扫源码] `${this.open}` 与 `${this.label}` 在源码里长得一模一样，
   * 只有渲染出来才知道前者会退化成空串。这条是**唯一**能一次抓住「布尔插值」这一类的判据。
   */
  it("G1 渲染后所有 aria-* 的值非空，三态属性必须是合法字面量", async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "registry/component-manifest.json"), "utf8"));
    const problems: string[] = [];
    let scanned = 0;
    // [WHY 还要数条数] `scanned > 100` 只证明「组件数对」，不证明「读到的 aria 属性数对」。
    // 把等待从宏任务换成微任务之后，若某组件的 aria 是**首帧之后**才写进 DOM 的，
    // 它会悄悄从统计里消失而判据照样全绿。条数下界是这次提速的等价性证据。
    let ariaCount = 0;
    const host = document.createElement("div");
    document.body.appendChild(host);

    // ── 关于这 8.6 秒：它是本条的**本体成本**，不是可优化项 ──
    //
    // 2026-11-16 分段实测（单跑本文件）：121 次 `await import(path.join(ROOT, c.source))`
    // 花 8 621ms，「等渲染」只花 312ms。整仓并行（4 358 例同抢 CPU）时这 8.6s 被放大到
    // 30s 以上 ⇒ 报 "timed out"，而断言其实一条都没错 —— 典型的假红。
    //
    // 试过并放弃的两条路，写在这里省下一个人重试：
    //   · 把 `flush(2)` 换微任务：等待本来只占 0.31s，省不出东西（但**保留了这个改动**，
    //     因为 242 次 setTimeout 在并行下会抖动；见下面的 microtasks 说明）。
    //   · `import.meta.glob(..., {eager:true})` 一次性把九个域 barrel 全拉进来：
    //     总耗时反而从 8.6s 涨到 **11.9s**（transform 8.9s）—— 它没有减少工作量，
    //     只是把 121 次细粒度加载合并成一次巨型的，page/editor/report 全被拖进来了。
    //
    // 真正的成本动因是「首次执行 121 个组件模块」，与组件数线性、与机器忙闲无关。
    // 所以给它**单独**的宽预算（见文件末尾 `G1_BUDGET_MS`），而不是继续压它。
    for (const c of manifest.components) {
      try {
        await import(/* @vite-ignore */ path.join(ROOT, c.source));
      } catch {
        // 组件源码里有浏览器专有依赖时跳过，但它们会被下面的 scanned 计数兜住
        continue;
      }
      if (!customElements.get(c.tag)) continue;
      const el = document.createElement(c.tag);
      host.appendChild(el);
      await microtasks(2);
      scanned++;

      const attrs = ariaAttrsIn(el.shadowRoot ?? el);
      ariaCount += attrs.length;
      for (const a of attrs) {
        if (!a.value.trim()) problems.push(`${c.tag}: <${a.tag} ${a.name}=""> 空值`);
        else if (BOOL_ARIA.has(a.name) && !BOOL_TOKENS.has(a.value)) {
          problems.push(`${c.tag}: <${a.tag} ${a.name}="${a.value}"> 不是合法三态值`);
        }
      }
      el.remove();
    }
    host.remove();

    // 防假绿：路径写错会得到「零问题」
    expect(scanned, "没扫到组件，判据失效").toBeGreaterThan(100);
    // [WHY 还要卡条数] `scanned > 100` 只证明「组件数对」，不证明「读到的属性数对」。
    // 把等待从宏任务换成微任务就是一次风险：若某组件的 aria 是首帧之后才写进 DOM 的，
    // 它会从统计里消失而 problems 依然为空 —— 判据全绿、覆盖面缩水。
    // 实测基线 204 条（121 组件）；定 200 是给「删掉一两个 aria」留的正常余量。
    expect(ariaCount, `只扫到 ${ariaCount} 条 aria 属性，扫描面缩水（基线 204）`).toBeGreaterThanOrEqual(200);
    expect(problems, "aria 值不合法（空串 = 读屏读成「未知」）：").toEqual([]);
  }, G1_BUDGET_MS);

  /**
   * G2：菜单打开后，焦点进面板、aria-activedescendant 指得到、方向键与 Home/End 都动。
   *
   * [WHY 焦点这一条是根因] 面板上的 keydown 只在自己树内冒泡。焦点留在触发器上时，
   * 方向键事件根本不经过面板的监听器 —— 于是「菜单能点开、按什么键都没反应」。
   */
  it("G2 菜单：焦点进面板 + activedescendant 可解析 + 方向键与 Home/End 生效 + 跳过禁用项", async () => {
    await import("../../src/components/menu/Menu");
    await import("../../src/components/menu-item/MenuItem");

    const el = document.createElement("z-menu") as any;
    const trigger = document.createElement("z-button");
    trigger.setAttribute("slot", "trigger");
    trigger.textContent = "Open";
    el.appendChild(trigger);
    for (const [value, label, disabled] of [["x", "Xray", false], ["y", "Yankee", true], ["z", "Zulu", false]] as const) {
      const item = document.createElement("z-menu-item") as any;
      item.value = value;
      item.textContent = label;
      item.disabled = disabled;
      el.appendChild(item);
    }
    document.body.appendChild(el);
    // 先等首次渲染：`_isFromTrigger` 要靠 shadow 里的 `.z-menu__trigger`，
    // 未渲染时它还不存在，点击会被判成「点在别处」而直接返回（测试里表现为「菜单打不开」）。
    await flush(1);
    trigger.click();
    await flush();

    const panel = document.querySelector<HTMLElement>(".z-menu__dropdown");
    expect(panel, "菜单没有打开").toBeTruthy();
    expect(panel!.getAttribute("role")).toBe("menu");
    // [WHY 这条要写死] 上一版我写成 `panel.contains(active) || panel.shadowRoot === null` ——
    // 普通 div 的 shadowRoot 恒为 null，于是整条断言恒真：把 dd.focus() 删掉它照样绿。
    // 变异验证时才发现。判据必须落在「焦点真的在面板这棵树里」。
    expect(panel!.contains(document.activeElement), "打开后焦点没进面板：面板上的 keydown 就永远收不到").toBe(true);
    expect(document.activeElement, "焦点应落在面板自身（面板 tabindex=-1）").toBe(panel);

    const idOf = () => panel!.getAttribute("aria-activedescendant");
    const activeText = () => {
      const id = idOf();
      const node = id ? panel!.querySelector(`#${CSS.escape(id)}`) : null;
      return node?.textContent?.trim() ?? "(解析不到)";
    };
    expect(activeText(), "初始高亮项要能被 aria 指到").toBe("Xray");

    const press = async (key: string) => {
      panel!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await flush(1);
    };

    await press("ArrowDown");
    expect(activeText(), "方向键应跳过禁用项落到 Zulu").toBe("Zulu");
    await press("ArrowDown");
    expect(activeText(), "到底应环绕回第一项").toBe("Xray");
    await press("Home");
    expect(activeText(), "Home 回第一项").toBe("Xray");
    await press("End");
    expect(activeText(), "End 到最后一项（跳过禁用）").toBe("Zulu");
    await press("ArrowUp");
    expect(activeText(), "上键回退并跳过禁用项").toBe("Xray");

    el.remove();
    panel?.remove();
  });

  /**
   * G3：页签与面板之间的关系必须**双向**指得通，且切页签后 aria 与可见性同步。
   *
   * [WHY 双向] 只写 aria-controls 不看目标是否存在，就是上一轮那个「写了但指不到」的形态；
   * 只验证面板有 role 不看它被谁控制，同样漏掉一半。
   */
  it("G3 页签：aria-controls ↔ tabpanel 双向可解析；切页签后 selected/hidden 同步", async () => {
    await import("../../src/components/tabs/Tabs");
    await import("../../src/components/tab-panel/TabPanel");

    const el = document.createElement("z-tabs") as any;
    for (const label of ["One", "Two", "Three"]) {
      const panel = document.createElement("z-tab-panel") as any;
      panel.setAttribute("label", label);
      panel.textContent = label.toLowerCase();
      el.appendChild(panel);
    }
    document.body.appendChild(el);
    await flush();

    const tabs = Array.from(el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.length).toBe(3);

    for (const tab of tabs) {
      const controls = tab.getAttribute("aria-controls");
      expect(controls, `${tab.textContent} 没有 aria-controls`).toBeTruthy();
      const panel = el.querySelector<HTMLElement>(`#${CSS.escape(controls!)}`);
      expect(panel, `aria-controls=${controls} 指不到面板（跨树 IDREF 会静默失效）`).toBeTruthy();
      expect(panel!.getAttribute("role"), "面板缺 role=tabpanel").toBe("tabpanel");
      expect(panel!.getAttribute("aria-labelledby"), "面板没指回它的页签").toBe(tab.id);
    }

    // 方向键切换
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flush();
    const after = Array.from(el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(after[1].getAttribute("aria-selected")).toBe("true");
    expect(after[0].getAttribute("aria-selected")).toBe("false");
    const panels = Array.from(el.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels[1].hidden, "选中的面板应当可见").toBe(false);
    expect(panels[0].hidden, "未选中的面板应当隐藏").toBe(true);
  });

  /**
   * G4：表格的排序状态与二维导航。
   *
   * [WHY] `aria-sort` 是读屏唯一能知道「按哪列、升还是降」的通道；而方向键是表格
   * 作为二维数据的标准交互 —— Tab 只能单向走，挪不到「下一行同一列」。
   */
  it("G4 表格：aria-sort 三态 + 表头可聚焦 + 单元格 roving tabindex + 方向键移动", async () => {
    await import("../../src/components/table/Table");
    const el = document.createElement("z-table") as any;
    el.columns = [
      { key: "name", header: "Name" },
      { key: "age", header: "Age", sortable: true },
      { key: "city", header: "City" },
    ];
    el.data = [
      { name: "Alice", age: 30, city: "HZ" },
      { name: "Bob", age: 25, city: "SH" },
    ];
    document.body.appendChild(el);
    await flush();

    const ths = Array.from(el.shadowRoot.querySelectorAll<HTMLElement>("th"));
    const sortable = ths[1];
    expect(sortable.getAttribute("aria-sort"), "可排序表头应显式给 none").toBe("none");
    expect(sortable.getAttribute("tabindex"), "可排序表头必须能聚焦").toBe("0");
    expect(ths[0].getAttribute("aria-sort"), "不可排序列不要写 aria-sort").toBeNull();

    // 键盘排序：Enter 触发，且 aria-sort 跟着升/降切换
    sortable.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect(el.sortKey).toBe("age");
    expect(Array.from(el.shadowRoot.querySelectorAll("th"))[1].getAttribute("aria-sort")).toBe("ascending");
    Array.from(el.shadowRoot.querySelectorAll<HTMLElement>("th"))[1]
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect(Array.from(el.shadowRoot.querySelectorAll("th"))[1].getAttribute("aria-sort")).toBe("descending");

    // roving tabindex：整张表只有一个 Tab 停靠点
    const cells = Array.from(el.shadowRoot.querySelectorAll<HTMLElement>("td[data-row]"));
    expect(cells.length).toBe(6);
    expect(cells.filter((c) => c.getAttribute("tabindex") === "0").length, "只能有一个 Tab 停靠点").toBe(1);

    // 方向键：从 (0,0) 往右一格、(0,1) 往下一行
    const press = async (target: HTMLElement, key: string) => {
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await flush(1);
    };
    cells[0].focus();
    await press(cells[0], "ArrowRight");
    const afterRight = el.shadowRoot.activeElement as HTMLElement;
    expect(afterRight?.dataset.col, "右移到第 2 列").toBe("1");
    expect(afterRight.getAttribute("tabindex"), "roving 要跟着焦点走").toBe("0");
    await press(afterRight, "ArrowDown");
    const afterDown = el.shadowRoot.activeElement as HTMLElement;
    expect(afterDown?.dataset.row, "下移到第 2 行").toBe("1");
    expect(afterDown?.dataset.col, "列不变").toBe("1");
    el.remove();
  });

  /**
   * G5：焦点圈定的回焦目标必须穿透 shadow。
   *
   * [WHY] `document.activeElement` 对「焦点在自定义元素内部」返回的是**宿主**，
   * 而宿主默认不可聚焦 ⇒ 关闭对话框后焦点掉到 body，键盘用户要从页面开头重来。
   * 同时 Tab 的「首尾」判定也用它：末项是 z-button 时永不相等，焦点会漏出容器。
   */
  it("G5 FocusTrap：回焦穿透 shadow，且末项是自定义元素时 Tab 不漏出容器", async () => {
    await import("../../src/primitives/focus-trap/FocusTrap");
    await import("../../src/components/button/Button");
    const { FocusTrap } = await import("../../src/primitives/focus-trap/FocusTrap");

    const outside = document.createElement("z-button") as any;
    outside.textContent = "Trigger";
    document.body.appendChild(outside);
    await flush(1);
    const innerBtn = outside.shadowRoot!.querySelector("button")!;
    innerBtn.focus();
    expect(document.activeElement, "焦点应在自定义元素内部").toBe(outside);

    const container = document.createElement("div");
    const first = document.createElement("button");
    first.textContent = "first";
    const lastCustom = document.createElement("z-button") as any;
    lastCustom.textContent = "last";
    container.append(first, lastCustom);
    document.body.appendChild(container);
    await flush(1);

    const trap = new FocusTrap({ container });
    await flush(1);
    expect(document.activeElement, "打开后焦点应进容器").toBe(first);

    // 末尾是自定义元素：Tab 必须被拦住，而不是漏到容器外
    const lastInner = lastCustom.shadowRoot!.querySelector("button")!;
    lastInner.focus();
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    container.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented, "末项按 Tab 应被拦截（否则焦点漏出容器）").toBe(true);

    trap.destroy();
    await flush(1);
    // [WHY 断言落在「宿主 + 影子里的真实焦点」两层] `document.activeElement` 对
    // shadow 内的焦点返回**宿主**（浏览器标准行为），所以只断言宿主等于 z-button
    // 并不能区分「回焦到了正确位置」和「焦点根本没进去」。两层都断言才锁得住。
    expect(document.activeElement, "关闭后焦点应回到触发按钮，而不是 body").toBe(outside);
    expect(outside.shadowRoot!.activeElement, "回焦要落到按钮内部真的那个 <button> 上").toBe(innerBtn);

    container.remove();
    outside.remove();
  });

  /**
   * G6：`aria-activedescendant` 的**承载者**必须与目标同树。
   *
   * [WHY 这条比「写了没有」重要得多] 2026-11-15 的上一版把 activedescendant 写在触发器上，
   * `getAttribute` 读得回来、单测全绿，但触发器在 `z-select` 的 shadow 里、选项在 body ——
   * IDREF **只在同一棵树里解析**，用 CDP 无障碍树实测该属性根本不出现，读屏全程不吭声，
   * 而界面上高亮一格格跳得完全正常。所以判据必须是「承载者的根节点里找得到目标」，
   * 而不是「属性值非空」。
   *
   * 顺带把两种模式的**焦点归属**也钉住：搜索模式下焦点在面板输入框（它就是 combobox），
   * 非搜索模式下焦点进入 listbox 自身。任何一边漏了，activedescendant 都是空转。
   */
  it("G6 选择器：activedescendant 的承载者与选项同树（跨 shadow 一律无效）", async () => {
    await import("../../src/components/select/Select");
    await import("../../src/components/option/Option");

    /** 挂一个 z-select，按 ArrowDown 打开，返回打开后的三要素。 */
    const open = async (attrs: Record<string, string> = {}) => {
      const el = document.createElement("z-select") as any;
      el.setAttribute("placeholder", "pick");
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      el.innerHTML =
        '<z-option value="a">Alpha</z-option><z-option value="b">Beta</z-option><z-option value="c">Gamma</z-option>';
      document.body.appendChild(el);
      await flush(1);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await flush();

      const panel = document.querySelector<HTMLElement>(".z-select__dropdown");
      const listbox = panel?.querySelector<HTMLElement>(".z-select__options") ?? null;
      const input = panel?.querySelector<HTMLElement>(".z-select__search") ?? null;
      return { el, panel, listbox, input };
    };

    /** 关系型判据本体：承载者的根节点里必须找得到目标 id。 */
    const checkOwner = (owner: HTMLElement | null, label: string) => {
      expect(owner, `${label}：找不到承载 activedescendant 的元素`).toBeTruthy();
      const id = owner!.getAttribute("aria-activedescendant");
      expect(id, `${label}：没有写 activedescendant`).toBeTruthy();
      const root = owner!.getRootNode() as ParentNode;
      const target = root.querySelector(`#${CSS.escape(id!)}`);
      // 指到「同一棵树的别处」也算错：它必须是一个 role=option
      expect(target, `${label}：activedescendant 指向的 id 不在承载者所在的树里`).toBeTruthy();
      expect(target!.getAttribute("role"), `${label}：指向的不是 option`).toBe("option");
      return target!;
    };

    // ── 非搜索：焦点进 listbox ──
    const plain = await open();
    expect(plain.panel, "非搜索模式没打开").toBeTruthy();
    expect(plain.listbox!.getAttribute("role")).toBe("listbox");
    expect(document.activeElement, "非搜索模式：焦点应进入 listbox（否则 activedescendant 无处可写）").toBe(
      plain.listbox,
    );
    const first = checkOwner(plain.listbox, "非搜索");
    expect(first.textContent?.trim()).toBe("Alpha");

    // ── 判据自检 ──
    // [WHY 必须有这一段] 上面几条只能证明「属性写在 listbox 上」。如果把判据写成
    // 「属性值非空 + document.getElementById 查得到」，跨 shadow 的写法**照样绿**
    // （document 层面当然查得到，问题正是解析发生不到那里）。这里造一个反例：
    // 影子树里的元素持有同一个 id，`checkOwner` 必须失败。判据没有牙齿时，
    // 这条自检会红 —— 否则整组守卫只是换了种写法的「写了没有」。
    const decoyHost = document.createElement("div");
    document.body.appendChild(decoyHost);
    const decoyRoot = decoyHost.attachShadow({ mode: "open" });
    const decoy = document.createElement("div");
    decoy.setAttribute("aria-activedescendant", first.id);
    decoyRoot.appendChild(decoy);
    expect(() => checkOwner(decoy, "自检"), "判据失效：跨 shadow 的承载者竟然通过了").toThrow();
    decoyHost.remove();

    // 方向键要同时动两处：视觉高亮 + aria 指针。只动一处就是「看得见的人知道、看不见的人不知道」
    const press = async (key: string) => {
      plain.listbox!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await flush(1);
    };
    await press("ArrowDown");
    expect(checkOwner(plain.listbox, "非搜索").textContent?.trim(), "方向键后 activedescendant 没跟着走").toBe(
      "Beta",
    );
    plain.el.remove();
    plain.panel?.remove();

    // ── 搜索：焦点在输入框，它自己就是 combobox ──
    const search = await open({ searchable: "" });
    expect(search.input, "搜索模式没有输入框").toBeTruthy();
    expect(search.input!.getAttribute("role"), "搜索模式的输入框才是 combobox").toBe("combobox");
    expect(document.activeElement, "搜索模式：焦点应在输入框").toBe(search.input);
    const firstSearch = checkOwner(search.input, "搜索");
    expect(firstSearch.textContent?.trim()).toBe("Alpha");

    search.input!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush(1);
    expect(checkOwner(search.input, "搜索·方向键").textContent?.trim()).toBe("Beta");

    search.el.remove();
    search.panel?.remove();
  });
}, SCAN_TIMEOUT_MS);

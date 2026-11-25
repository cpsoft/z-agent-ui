// Test: 无障碍守卫 —— 表单字段必须有**能拿到的**名字，非法态必须落在可聚焦件上，
//       IDREF 必须在同一棵树里解析得到。
//
// Date: 2026-11-15
//
// [WHY 这一层之前一条判据都没有] 库里 `aria-*` 有 200 多处，看起来无障碍早就做完了。
// 2026-11-15 实测发现真正会被读屏拿到的东西是缺的，而且缺的方式**界面上完全看不出来**：
//
//   ① `<z-input label="邮箱">` 渲染了 `<label>` 文字，但既没有 `for`、字段也没有 `id`
//      —— 点 label 不聚焦，读屏认为字段无名称（placeholder 不算名称）；
//   ② `z-input` 恒输出 `aria-describedby=" "`（hint 与 error 都为空时），
//      而「hint + error 同时给」时 hint 根本不渲染 ⇒ 引用落空；
//   ③ `z-form-item` 校验失败时给控件设 `aria-describedby="z-form-item-error"`，
//      那个 id 在 form-item 自己的 shadow 里、控件在 light DOM —— **跨树 IDREF
//      永远解析不到**，还会把控件自己算好的关联顶掉；
//   ④ `<z-form-item label="邮箱"><z-input></z-input></z-form-item>` 这种推荐写法，
//      字段**没有任何名称**：label 是 form-item shadow 里的一个 `<span>`，
//      与槽里的控件之间不存在任何关联。
//
// 四条的共同点：不报错、不崩溃、界面正常，只有开读屏才知道。所以必须有机器判据。
//
// 判据：
//   A1 静态：`src/components` 里每个 `<label>` 必须「包住控件」或「for=id 在同一文件里有对应 id」
//   A2 运行时：控件自己渲染的 label 必须能指到同一 shadow 内的字段
//   A3 运行时：`aria-describedby` 只在目标真的存在时出现，且每个 IDREF 同树可解析
//   A4 运行时：七个表单控件 `invalid=true` ⇒ 内部可聚焦件 `aria-invalid="true"`
//   A5 运行时：z-form-item 的 label 送得到控件里，且控件重渲染后还在
//   A7 运行时：编辑器类控件（z-rich-text / z-code-editor）同样参与字段契约
//   A8 静态：图标按钮（文本只有一个符号）必须有 aria-label —— title 不参与命名
//   A9 静态：必填星号只是视觉记号，必须 aria-hidden（否则它进了字段名）
//   A10 静态：写了 `role="button"` 的非 button 元素必须有 tabindex —— 否则只是「自称按钮」
//
// [本守卫的范围] A1 只扫 `src/components`（118 个控件里的 82 个 L1 目录）。
// L3 的页面渲染器是另一套模板，要收口得单独一轮 —— 先把「控件层不再退化」钉住。

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FIELD_PART_SELECTOR, fieldOf, NAME_MARK } from "../../src/core/a11y";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

/**
 * 去掉注释再扫。
 *
 * [WHY 必须去] 静态守卫的判据都是「源码里出现了某个标签」，而**注释里也会出现标签** ——
 * A10 第一版就被自己的注释绊住：`_toggleHtml` 的说明里写着「原来是
 * `<span role="button">`」，扫描器把它当成真实代码报了出来。守卫误报的代价不是「多看一眼」，
 * 而是**训练人忽略它**，最后这个守卫就不存在了。
 *
 * 只剥两种：`/** ... *\/` 块注释，与**行首**的 `//` 行注释。
 * 不剥行尾的 `//`：字符串里的 `"https://…"` 会被误判成注释起点，把后半行代码吃掉 ⇒ 漏报。
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

import "../../src/components/input/index.js";
import "../../src/components/textarea/index.js";
import "../../src/components/select/index.js";
import "../../src/components/switch/index.js";
import "../../src/components/checkbox/index.js";
import "../../src/components/radio/index.js";
import "../../src/components/number-input/index.js";
import "../../src/components/form-item/index.js";
import "../../src/content/rich-text/index.js";
import "../../src/content/code-editor/index.js";

const ROOT = process.cwd();
const COMPONENTS = path.join(ROOT, "src", "components");

/** 等两轮宏任务：组件渲染是微任务，`invalid` 触发的重渲染 + MutationObserver 回填在其后。 */
const flush = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** 模板里出现 `<label>` 时，能否与某个表单控件建立关联（包裹 / for↔id 配对）。 */
const NATIVE_CONTROL = /<(input|textarea|select)\b/;

interface LabelHit {
  file: string;
  line: number;
  how: "wrapped" | "for" | "none";
  forId: string;
}

function scanLabels(text: string): Array<Omit<LabelHit, "file">> {
  const hits: Array<Omit<LabelHit, "file">> = [];
  for (const m of text.matchAll(/<label\b[^>]*>/g)) {
    const start = m.index ?? 0;
    const close = text.indexOf("</label>", start);
    // 没写闭合标签时把范围收到模板末尾：宁可漏判也不误判成「包裹」
    const body = text.slice(start, close === -1 ? Math.min(text.length, start + 2000) : close);
    const forId = /\bfor="([^"]*)"/.exec(m[0])?.[1] ?? "";
    const wraps = NATIVE_CONTROL.test(body);
    hits.push({
      line: text.slice(0, start).split("\n").length,
      how: wraps ? "wrapped" : forId ? "for" : "none",
      forId,
    });
  }
  return hits;
}

describe("无障碍：表单字段的名称与非法态", () => {
  it("A0 扫描面是活的（扫不到文件 / 控件没注册时，下面几条会全变哑巴）", () => {
    const files = walk(COMPONENTS);
    expect(files.length).toBeGreaterThan(80);
    for (const tag of ["z-input", "z-textarea", "z-select", "z-form-item"]) {
      expect(customElements.get(tag), `${tag} 没注册`).toBeTruthy();
    }
  });

  it("A1 每个 <label> 都必须与同一 shadow 内的控件关联（包裹或 for↔id）", () => {
    const problems: string[] = [];
    let labels = 0;

    for (const file of walk(COMPONENTS)) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      for (const hit of scanLabels(text)) {
        labels++;
        if (hit.how !== "none") {
          // for 的写法还要确认那个 id 真的存在，否则同样指不到东西
          if (hit.how === "for" && !text.includes(`id="${hit.forId}"`)) {
            problems.push(
              `${path.relative(ROOT, file)}:${hit.line}  label for="${hit.forId}"，但同文件里没有 id="${hit.forId}"`,
            );
          }
          continue;
        }
        problems.push(
          `${path.relative(ROOT, file)}:${hit.line}  <label> 既不包裹控件、也没有 for —— ` +
            `点它不聚焦字段，读屏也认为字段没有名称。要么把控件包进 label，` +
            `要么加 for="字段id" 并给字段写同名 id`,
        );
      }
    }

    expect(labels, "一个 label 都没扫到，判据失效").toBeGreaterThan(3);
    expect(problems, "label 未与控件关联：").toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("A2 控件自带的 label 必须指到同一 shadow 内的字段", async () => {
    const cases: Array<{ tag: string; labelProp: boolean }> = [
      { tag: "z-input", labelProp: true },
      { tag: "z-textarea", labelProp: true },
    ];

    for (const c of cases) {
      const el = document.createElement(c.tag) as any;
      el.setAttribute("label", "邮箱");
      document.body.appendChild(el);
      await flush();

      const label = el.shadowRoot.querySelector("label") as HTMLLabelElement | null;
      const field = fieldOf(el);
      expect(label, `${c.tag} 没有渲染 label`).toBeTruthy();
      expect(field, `${c.tag} 找不到主可聚焦件（part="field"）`).toBeTruthy();

      const forId = label!.getAttribute("for");
      expect(forId, `${c.tag} 的 label 没有 for`).toBeTruthy();
      expect(field!.id, `${c.tag} 的字段 id 与 label 的 for 不一致`).toBe(forId);
      // for 指到的元素必须真在同一棵影子树里（跨树 for 与跨树 IDREF 一样无效）
      expect(el.shadowRoot.querySelector(`#${forId}`), `${c.tag} 的 for 指到不存在的 id`).toBeTruthy();

      document.body.removeChild(el);
    }
  });

  it("A3 aria-describedby 只在目标存在时出现，且每个 IDREF 同树可解析", async () => {
    /** 每个用例：[hint, error]，期望的 IDREF 个数 */
    const cases: Array<{ hint: string; error: string; want: number }> = [
      { hint: "", error: "", want: 0 },
      { hint: "手机号用于登录", error: "", want: 1 },
      { hint: "", error: "格式不对", want: 1 },
      // hint 与 error 同时给时 hint 不渲染（error 顶掉它）⇒ 不能再引用 hint
      { hint: "手机号用于登录", error: "格式不对", want: 1 },
    ];

    for (const tag of ["z-input", "z-textarea"]) {
      for (const c of cases) {
        const el = document.createElement(tag) as any;
        if (c.hint) el.setAttribute("hint", c.hint);
        if (c.error) el.setAttribute("error", c.error);
        document.body.appendChild(el);
        await flush();

        const field = fieldOf(el)!;
        const raw = field.getAttribute("aria-describedby");
        const ids = (raw ?? "").split(/\s+/).filter(Boolean);

        expect(ids.length, `${tag} hint=${!!c.hint} error=${!!c.error} 的 IDREF 个数`).toBe(c.want);
        for (const id of ids) {
          expect(
            el.shadowRoot.querySelector(`#${id}`),
            `${tag} 的 aria-describedby 指向 "${id}"，但影子树里没有这个 id`,
          ).toBeTruthy();
        }

        document.body.removeChild(el);
      }
    }
  });

  it("A4 七个表单控件：invalid=true ⇒ 内部可聚焦件 aria-invalid=true", async () => {
    const tags = ["z-input", "z-textarea", "z-select", "z-switch", "z-checkbox", "z-radio", "z-number-input"];

    for (const tag of tags) {
      const el = document.createElement(tag) as any;
      document.body.appendChild(el);
      await flush();

      expect(el.shadowRoot.querySelector(FIELD_PART_SELECTOR), `${tag} 没有 part="field|native|trigger"`).toBeTruthy();
      expect(el.hasAttribute("invalid"), `${tag} 初始不该带 invalid 属性`).toBe(false);

      el.invalid = true;
      await flush();
      // 重新查一次：invalid 是 @property，写它会重渲染，旧节点引用作废
      const field = fieldOf(el)!;
      expect(field.getAttribute("aria-invalid"), `${tag} 校验失败但字段没说清（读屏读不到）`).toBe("true");
      // 反射到属性上，宿主自己的 CSS 也能用
      expect(el.hasAttribute("invalid"), `${tag} 的 invalid 没有反射成属性`).toBe(true);

      el.invalid = false;
      await flush();
      expect(fieldOf(el)!.getAttribute("aria-invalid"), `${tag} 恢复合法后仍标着非法`).not.toBe("true");

      document.body.removeChild(el);
    }
  });

  it("A5 z-form-item 的 label 送得到控件里，且控件重渲染后还在", async () => {
    const item = document.createElement("z-form-item") as any;
    item.setAttribute("name", "email");
    item.setAttribute("label", "邮箱");
    item.innerHTML = `<z-input></z-input>`;
    document.body.appendChild(item);
    await flush();

    const control = item.control as HTMLElement;
    expect(fieldOf(control)?.getAttribute("aria-label"), "字段没有名称（读屏只会念『编辑框』）").toBe("邮箱");
    expect(fieldOf(control)?.getAttribute(NAME_MARK), "没有留下『这个名字是注入的』标记").toBe("");

    // 控件重渲染会把影子树里的字段节点换掉 —— 注入的名字必须补回去，
    // 否则症状是「首屏有名字，改了一次值之后读屏又不念了」，界面上一切正常
    const before = fieldOf(control);
    (control as any).value = "changed@example.com";
    await flush();
    // [WHY 先证明真的重渲染了] 否则「名字还在」可能只是因为节点压根没换 ——
    // 这条断言是上面那条的前提，缺了它整段就是恒绿的假测试
    expect(fieldOf(control), "控件没有重渲染，本用例没验到任何东西").not.toBe(before);
    expect(fieldOf(control)?.getAttribute("aria-label"), "控件重渲染后注入的字段名丢了").toBe("邮箱");

    // label 改了，名字要跟着改（NAME_MARK 就是为这条：否则第二轮会被误判成「控件自己有名」）
    item.label = "工作邮箱";
    await flush();
    expect(fieldOf(control)?.getAttribute("aria-label")).toBe("工作邮箱");

    document.body.removeChild(item);
  });

  it("A6 控件自己已经有名称时，z-form-item 不许覆盖", async () => {
    // ① 控件自带 label：由控件自己渲染 <label for>，外层再注入就会两套名字打架
    const own = document.createElement("z-form-item") as any;
    own.setAttribute("label", "外层标签");
    own.innerHTML = `<z-input label="内层标签"></z-input>`;
    document.body.appendChild(own);
    await flush();
    expect(fieldOf(own.control)).toBeTruthy();
    expect(fieldOf(own.control)!.getAttribute("aria-label"), "覆盖了控件自己的 label").toBeNull();
    document.body.removeChild(own);

    // ② 槽里有可见文字（checkbox / radio / switch 的常见写法）：文字就是名称
    const slotted = document.createElement("z-form-item") as any;
    slotted.setAttribute("label", "外层标签");
    slotted.innerHTML = `<z-checkbox>我已阅读并同意</z-checkbox>`;
    document.body.appendChild(slotted);
    await flush();
    expect(fieldOf(slotted.control)!.getAttribute("aria-label"), "覆盖了 slot 文本给出的名称").toBeNull();
    document.body.removeChild(slotted);
  });

  /**
   * A7：编辑器类控件也是字段。
   *
   * [WHY 单独一条、而不是并进 A4] A4 判的是 `invalid` ⇒ `aria-invalid`，这两个控件
   * 没有 `invalid` 属性。但它们在**同一件事**上和七个表单控件一样：都是「用户往里打字、
   * 必须有个名字」的东西，而名字只能由容器送进来（IDREF 跨 shadow 不解析）。
   *
   * [为什么这条以前不存在] `FIELD_PART_SELECTOR` 原先用 `[part="field"]`（精确匹配），
   * 而这两个控件为了保住既有的 `::part(editor)` / `::part(textarea)` 只能写多令牌
   * ⇒ `fieldOf()` 永远返回 null，`z-form-item` 的 label 一句话都送不进去。
   * 2026-11-16 真机实测：AX 树里它们的名字是空串，读屏只念「多行编辑框」。
   */
  it("A7 编辑器类控件也参与字段契约（z-form-item 的 label 送得进去）", async () => {
    const tags = ["z-rich-text", "z-code-editor"];

    // ① 契约本身：影子树里的主可聚焦件必须能被 FIELD_PART_SELECTOR 选中
    for (const tag of tags) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      await flush();
      expect(el.shadowRoot!.querySelector(FIELD_PART_SELECTOR), `${tag} 的影子树里找不到主可聚焦件`).toBeTruthy();
      document.body.removeChild(el);
    }

    // ② 真实消费者：z-form-item 的名字真的进去了
    for (const tag of tags) {
      const item = document.createElement("z-form-item") as any;
      item.setAttribute("label", "正文");
      item.innerHTML = `<${tag}></${tag}>`;
      document.body.appendChild(item);
      await flush();

      const control = item.querySelector(tag)!;
      const field = fieldOf(control);
      expect(field, `${tag}：控件影子树还没起来，这条没验到东西`).toBeTruthy();
      expect(field!.getAttribute("aria-label"), `${tag} 里的字段没有名称（读屏只会念「编辑框」）`).toBe("正文");
      expect(field!.getAttribute(NAME_MARK)).toBe("");
      document.body.removeChild(item);
    }
  });

  /**
   * A8：图标按钮的名字不能只是个符号。
   *
   * [WHY 这条以前不存在] 库里有 9 个按钮的文本是 `−` `＋` `↑` `↓` `✕` `%`，
   * 名字全靠 `title="缩小"` —— 而**无障碍名的计算里文本优先，`title` 只退化成描述**。
   * 2026-11-16 CDP 实测（demo/doc-template.html）：
   *
   * ```
   * role=button name="−" desc="缩小"      ← 读屏念「减号 按钮」
   * role=button name="↑" desc="上移"
   * role=button name="100%" desc="重置 100%"   ← 名字是状态，不是动作
   * ```
   *
   * 视觉上一切正常：悬停有 tooltip、点了也有反应。只有用读屏的人听到一串标点。
   *
   * 判据只抓「**静态文本是纯符号**且没有 `aria-label`」这一种形态，因为它是唯一能在
   * 源码里判准的：内容全是 `${...}` 插值（名字由运行时决定）或 `<svg>` 图标的按钮，
   * 静态分析分不清「没名字」与「名字在运行时才有」—— 那类由真机冒烟
   * `smoke/smoke-btnname-w27.mjs` 兜（它读 CDP 无障碍树）。
   */
  it("A8 图标按钮必须有 aria-label（title 不是名字）", async () => {
    /** 静态文本里有没有能当名字的字符（字母 / 数字 / 汉字）。 */
    const NAME_CHAR = /[0-9A-Za-z\u4e00-\u9fff]/;

    /**
     * 扫一段源码，返回「文本是纯符号、又没有 aria-label」的按钮。
     * 抽成函数是为了下面能做**反例自检** —— 判据自己得先证明抓得住。
     */
    const scanSymbolButtons = (text: string): string[] => {
      const out: string[] = [];
      for (const m of text.matchAll(/<button\b[^>]*>/g)) {
        const tag = m[0];
        const end = text.indexOf("</button>", m.index! + tag.length);
        if (end < 0) continue;
        const inner = text.slice(m.index! + tag.length, end);
        // 跨了模板边界（反引号/单引号）或嵌套按钮：静态解析不可靠，跳过
        if (inner.includes("`") || inner.includes("'") || inner.includes("<button")) continue;
        const staticText = inner.replace(/\$\{[^}]*\}/g, "").replace(/<[^>]+>/g, "").trim();
        if (!staticText) continue; // 全插值 / 纯图标：判不了
        if (NAME_CHAR.test(staticText)) continue; // 有文字 ⇒ 有名字
        if (/aria-label|aria-labelledby/.test(tag)) continue;
        out.push(staticText);
      }
      return out;
    };

    // ① 反例自检：判据必须在**该红的地方红**
    expect(scanSymbolButtons('<button data-op="x" title="缩小">−</button>')).toEqual(["−"]);
    expect(scanSymbolButtons('<button data-op="x" title="缩小" aria-label="缩小">−</button>')).toEqual([]);
    expect(scanSymbolButtons('<button data-op="x">保存</button>')).toEqual([]);

    // ② 全库扫描
    const violations: string[] = [];
    let buttons = 0;
    for (const file of walk(path.join(ROOT, "src"))) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      const total = (text.match(/<button\b/g) ?? []).length;
      buttons += total;
      for (const glyph of scanSymbolButtons(text)) {
        violations.push(`${path.relative(ROOT, file)} 的按钮文本只有 ${JSON.stringify(glyph)}`);
      }
    }

    // 防假绿：路径写错会得到「零按钮、零违规」
    expect(buttons, "没扫到按钮，判据失效").toBeGreaterThan(100);
    expect(violations, "这些按钮在无障碍树里的名字只会是一串标点（补 aria-label）：").toEqual([]);
    // [WHY 要单独给扫描预算] 这条要遍历 src 下全部 .ts（~500 个文件）：单跑 1.1s，
    // 整仓并行（4400 例同抢 CPU）时会被拉到 5s 以上 ⇒ 撞 vitest 默认 5s 直接报
    // "Test timed out"，断言一条都没错。**这是假红，比假绿更伤** —— 它训练人
    // 「红了先重跑」。同 A1 / G1，用 tests/scan-budget.ts 的公共预算。
    }, SCAN_TIMEOUT_MS);

  /**
   * A9：必填的 `*` 是视觉记号，不能进可访问名。
   *
   * [WHY 这条以前不存在] `<z-input label="用户名" required>` 渲染的是
   * `<label for="z-input-field">用户名<span>*</span></label>` —— 而 `<label>` 正是
   * 这个字段的**可访问名来源**。2026-11-16 CDP 实测：`name="用户名*"`，
   * 读屏念「用户名 星号 编辑框」。而「必填」这件事早就由原生 `required` 属性
   * 带给无障碍树了（同一个节点的 AX `required=true`），星号纯属噪声。
   *
   * 判据只认「class 里带 `__required` 的元素」这一种写法 —— 库内三处必填标记
   * （`z-input` / `z-form-item` / `z-detail-form`）都是这个命名，新组件照抄时
   * 会被这条直接抓上来。换成别的 class 名就抓不到了，这是已知边界：
   * 真机冒烟 `smoke/smoke-appw28.mjs` 里另有一条「名字里不含 `*`」的实测兜底。
   */
  it("A9 必填星号必须 aria-hidden（它不该进字段名）", async () => {
    /** 扫一段源码，返回「必填标记没标 aria-hidden」的位置。 */
    const scanStarMarkers = (text: string): string[] => {
      const out: string[] = [];
      for (const m of text.matchAll(/<span\b[^>]*class="[^"]*__required[^"]*"[^>]*>/g)) {
        if (/aria-hidden/.test(m[0])) continue;
        out.push(m[0]);
      }
      return out;
    };

    // ① 反例自检：判据得先证明它抓得住
    expect(scanStarMarkers('<span class="z-input__required">*</span>')).toHaveLength(1);
    expect(scanStarMarkers('<span class="z-input__required" aria-hidden="true">*</span>')).toHaveLength(0);
    expect(scanStarMarkers('<span class="z-x__hint">*</span>')).toHaveLength(0);

    // ② 全库扫描
    const violations: string[] = [];
    let markers = 0;
    for (const file of walk(path.join(ROOT, "src"))) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      markers += (text.match(/class="[^"]*__required/g) ?? []).length;
      for (const tag of scanStarMarkers(text)) {
        violations.push(`${path.relative(ROOT, file)}：${tag}`);
      }
    }

    expect(markers, "没扫到必填标记，判据失效（类名改了？）").toBeGreaterThanOrEqual(3);
    expect(violations, "这些必填星号会被念进字段名（补 aria-hidden）：").toEqual([]);
  }, SCAN_TIMEOUT_MS);

  /**
   * A10：写了 `role="button"` 的元素，得先能被聚焦。
   *
   * [WHY 这条以前不存在] 2026-11-16 在 `z-json-viewer` 上盘到：
   * `<span class="z-jv__toggle" role="button" aria-expanded="false">▸</span>` ——
   * 它**自称按钮**，却连按钮最基本的能力都没有：没有 `tabindex` ⇒ 键盘永远聚焦不到，
   * 而 `aria-expanded` 写在一个不可达的节点上等于没写。鼠标点得动、视觉正常，
   * 用键盘的人只知道「这个箭头按不动」。这类形态的恶劣之处是**语义与能力不一致**：
   * 读屏会念「按钮」，用户自然会去按 Enter，而什么都不会发生。
   *
   * 判据只抓「**非 `<button>` 标签 + 字面量 `role="button"` + 完全没有 `tabindex`**」
   * 这一种。`tabindex="-1"` 的不在此列：那是「程序化可聚焦但不在 Tab 序」，
   * 有可能是刻意的（例如清空按钮由其它入口触发），要一个个看语义，不适合一刀切。
   * 动态拼接的 `role`（`role="${x}"`）也判不了 —— 那类交给真机冒烟。
   *
   * 正解通常是**换成原生 `<button>`**：可聚焦、Enter/Space、role 三件事一次到位，
   * 不用手写 `role` 与键盘分支，也就少了两处可能写错的地方（`z-json-viewer` 就是这么修的）。
   */
  it("A10 role=button 的元素必须能聚焦（否则只是「自称按钮」）", async () => {
    /** 扫一段源码，返回「自称按钮但没有 tabindex」的非 button 标签。 */
    const scanFakeButtons = (text: string): string[] => {
      const out: string[] = [];
      // 排除 <button>：它天然可聚焦，写不写 role 都成立
      for (const m of text.matchAll(/<(?!button\b)([a-z][a-z0-9-]*)\b([^>]*\brole="button"[^>]*)>/gi)) {
        if (/\btabindex=/.test(m[0])) continue;
        out.push(m[0]);
      }
      return out;
    };

    // ① 反例自检：该红的红、该绿的绿
    expect(scanFakeButtons('<span role="button">▸</span>')).toHaveLength(1);
    expect(scanFakeButtons('<span role="button" tabindex="0">▸</span>')).toHaveLength(0);
    expect(scanFakeButtons('<span role="button" tabindex="-1">▸</span>')).toHaveLength(0);
    expect(scanFakeButtons('<button role="button">确定</button>')).toHaveLength(0);
    expect(scanFakeButtons('<div class="x" role="option">a</div>')).toHaveLength(0);
    // 注释里的示例不算 —— 否则守卫会被自己的说明绊住（A10 第一版就是）
    expect(scanFakeButtons(stripComments('// 原来是 <span role="button">▸</span>\nconst a = 1;'))).toHaveLength(0);
    expect(scanFakeButtons(stripComments('/** 见 <span role="button"> */\nconst a = 1;'))).toHaveLength(0);

    // ② 全库扫描
    const violations: string[] = [];
    let roleButtons = 0;
    for (const file of walk(path.join(ROOT, "src"))) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      roleButtons += (text.match(/role="button"/g) ?? []).length;
      for (const tag of scanFakeButtons(text)) {
        violations.push(`${path.relative(ROOT, file)}：${tag}`);
      }
    }

    // 防假绿：路径或正则写错会得到「零命中、零违规」
    expect(roleButtons, "没扫到 role=button，判据失效").toBeGreaterThan(5);
    expect(violations, "这些元素自称按钮但键盘聚焦不到（改用原生 button）：").toEqual([]);
  }, SCAN_TIMEOUT_MS);

  /**
   * A11：`part="trigger"` 的**槽容器**上不得写 `aria-haspopup` / `aria-expanded`。
   *
   * [WHY 这条以前不存在] 2026-11-16 CDP 实测：库里六个浮层组件（popover / popconfirm /
   * menu / datepicker / time-picker / date-range）的触发器都是同一个形状 ——
   *
   * ```html
   * <span class="z-popover__trigger" part="trigger"
   *       aria-haspopup="true" aria-expanded="false"><slot name="trigger"></slot></span>
   * ```
   *
   * 而那个 `<span>` 不可聚焦、没有 role ⇒ 在无障碍树里**根本不出现**。塞进去的按钮
   * 只有 `role=button` 和名字，`hasPopup` / `expanded` 两个属性都不存在
   * —— 也就是说这六处的「有弹出层」「已展开」从来没被读屏念出来过。
   *
   * 同一个形态在本库已经出现过三次：`z-flow-node` 的 `aria-selected`（元素无 role ⇒
   * 属性被忽略）、`z-json-viewer` 的展开开关（`<span role="button">` 不可聚焦）、
   * 以及这六个触发器。共同点都是「**属性写在容器上，而容器的语义不被无障碍树承认**」。
   * 修法是 `core/a11y.ts` 的 `bindTriggerAria` —— 把属性送到槽里真正可聚焦的那个元素上。
   *
   * 判据：非 `<button>` 起始的标签 + `part` 里含 `trigger` + 写了这三个状态属性之一。
   * `<button part="trigger" aria-expanded>` 不在此列（`z-select` 就是这种，它是合法的：
   * 那一层自己就可聚焦）。动态拼接的属性名判不了，交给真机冒烟。
   */
  it("A11 part=trigger 的槽容器上不得写 aria-haspopup/expanded", async () => {
    /** 扫一段源码，返回「槽容器上写了触发器语义」的标签。 */
    const scanTriggerAria = (text: string): string[] => {
      const out: string[] = [];
      for (const m of text.matchAll(
        /<(?!button\b)([a-z][a-z0-9-]*)\b([^>]*\bpart="[^"]*\btrigger\b[^"]*"[^>]*)>/gi,
      )) {
        if (!/aria-(haspopup|expanded|disabled)=/.test(m[0])) continue;
        out.push(m[0]);
      }
      return out;
    };

    // ① 反例自检：该红的红、该绿的绿
    expect(scanTriggerAria('<span part="trigger" aria-haspopup="dialog">')).toHaveLength(1);
    expect(scanTriggerAria('<span part="trigger" aria-expanded="false">')).toHaveLength(1);
    expect(scanTriggerAria('<span part="trigger field" aria-disabled="true">')).toHaveLength(1);
    expect(scanTriggerAria('<span class="x" part="trigger">')).toHaveLength(0);
    // button 自己就可聚焦，写在它身上是**正确**的（z-select 就是这么做的）
    expect(scanTriggerAria('<button part="trigger" aria-expanded="false">')).toHaveLength(0);
    // 与 trigger 无关的元素不归这条管
    expect(scanTriggerAria('<span part="label" aria-haspopup="true">')).toHaveLength(0);

    // ② 全库扫描
    const violations: string[] = [];
    let triggerParts = 0;
    for (const file of walk(path.join(ROOT, "src"))) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      triggerParts += (text.match(/part="[^"]*\btrigger\b[^"]*"/g) ?? []).length;
      for (const tag of scanTriggerAria(text)) {
        violations.push(`${path.relative(ROOT, file)}：${tag}`);
      }
    }

    // 防假绿：正则写错会得到「零命中、零违规」
    expect(triggerParts, "没扫到 part=trigger，判据失效").toBeGreaterThanOrEqual(5);
    expect(
      violations,
      "这些属性写在不可聚焦的槽容器上，无障碍树不承认（改用 bindTriggerAria）：",
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS);
});

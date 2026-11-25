// <z-app-nav> 统一应用导航（[[REQ-040-app-nav]]）
//
// ============================ 为什么需要这个组件 ============================
//
// 三层都试过了，没有一层能给出「所有宿主看起来是一套系统」的侧栏：
//   · L5 `mountShell` 只产结构（`<details class="z-shell__group">` + `.z-shell__link`），
//     全库没有一条 `.z-shell*` 样式规则 ⇒ 接上得到一组无样式原生按钮；
//   · `z-sidebar` 只有 `collapsed` 与两个槽，不管菜单内容；
//   · `z-menu` 是下拉浮层，不是常驻导航。
// 于是每个宿主自己写一遍菜单（zEtl 那套是 56px 图标轨 + 240px 二级面板，60 行 JSX），
// 风格分歧不是谁写歪了，而是框架侧没有承载物。
//
// ============================ 职责边界（有意划死） ============================
//
//   · **不路由**：只派发 `z-navigate`，跳不跳、要不要 push 历史由宿主（L4 引擎）决定。
//     组件自己 `location.href=` 的话，「代码导航」与「用户点后退」立刻分成两套逻辑。
//   · **不判权限**：收到的 `items` 就是已经筛过的清单（`registry.list(can)` 的产物）。
//     在这里再判一次，权限模型就会被复制成两份，漂移时不报错、只表现为「菜单里多了个入口」。
//   · **不记选中态**：`active` 是只读输入，由宿主拿地址传进来。
//     组件自己记的话，浏览器后退/前进时高亮不动，而地址已经变了 —— 这类分叉只有真机点才看得见。
//   · **不取数**：不请求、不缓存、不重试。
//
// ============================ 用法 ============================
//
//   <z-app-nav .items=${registry.list(can).map(d => ({
//                  path: d.path, title: d.title, icon: d.meta?.icon, group: d.meta?.group,
//                }))}
//               active=${engine.current} collapsed
//               @z-navigate=${(e) => engine.go(e.detail.path)} />
//
// 不依赖 L5 的 `PageRegistryDef`：L2 反过来 import L5 会让本组件只能被「已经接了平台层」
// 的宿主用，而「我只想要一个侧栏」是最常见的起点（见 REQ-040 的分层判据）。
import { BaseElement, property, COPY } from "../../core/index.js";
import appNavCSS from "./app-nav.css?raw";
import { NAV_ICONS, initialOf } from "./nav-icons.js";

/**
 * 一条导航项。
 *
 * [WHY 扁平表 + `group` 字段，而不是 `{ group, items }[]` 嵌套] 宿主的来源本来就是扁平的
 * （注册表按登记顺序给一串），嵌套形态要求宿主先聚一次；而聚合写在宿主里，每个宿主都会
 * 各写一遍，且「组内排序」与「组的顺序」两套规则必然各家长得不一样 —— 那正是本组件要收掉的东西。
 */
export interface AppNavItem {
  /** 目标地址。空串或非字符串的条目会被丢弃（不是渲染成死按钮）。 */
  path: string;
  /** 菜单文字，同时是该条目的可访问名。 */
  title: string;
  /** 分组名。不填 = 平铺在最前（与 `mountShell` 的 loose 段同序）。 */
  group?: string;
  /** 组内排序，小的在前。缺省按传入顺序。 */
  order?: number;
  /** 图标名（见 nav-icons.ts）。未知名字回落标题首字。 */
  icon?: string;
  /** 右侧计数/标记。数字或短文本。 */
  badge?: string | number;
  /**
   * 灰掉但**仍然渲染**。
   *
   * [WHY 不用「不渲染」表达不可用] 一个人发现「我这里少了一项」时，第一反应是「系统坏了」；
   * 灰条 + `aria-disabled` 才能让他知道是「这一项现在不能用」。真正的权限裁剪归宿主（不传进来）。
   */
  disabled?: boolean;
}

/** 地址归一口径：只吃掉尾斜杠。`/` 自身保持 `/`。 */
function normPath(p: string): string {
  const s = (p || "").trim();
  if (!s) return "";
  const cut = s.replace(/\/+$/, "");
  return cut || "/";
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * 文本与属性共用一个转义实现。
 *
 * [WHY 不用 core 的 escapeHtml/escapeAttr] 与 `z-app-switcher` 同一处置：本组件要落到
 * 多家宿主的 vendored 副本上，而它们各自的 core 基线不同；`escapeAttr` 是上游 2026-10-26
 * 才加的，老副本里没有。依赖收敛到 `BaseElement / html / property / COPY` 这几样都有。
 */
function esc(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export class ZAppNav extends BaseElement {
  static styles = appNavCSS;

  /**
   * 导航项清单。一律用 property 传入（Vue 的 `:items`、React 的 ref、`.items=`）。
   *
   * [WHY `attribute: false`] 与库内 15 处数组属性同一口径：装饰器默认 reflect，数组反射成
   * attribute 就是 `[object Object]`，下一帧再把字符串写回 property，侧栏恒空。
   * 保留字符串解析是为了兜住「调用方直接赋 JSON 字符串」的情形（与 app-switcher 同）。
   */
  @property({ type: Array, attribute: false }) items: AppNavItem[] = [];
  /** 当前地址。只读输入，组件不自己改（后退/前进时高亮要跟着地址走）。 */
  @property({ type: String }) active = "";
  /** 收起成图标条。宽度由宿主容器与 `--z-app-shell-sidebar-collapsed-width` 决定。 */
  @property({ type: Boolean }) collapsed = false;
  /** `<nav>` 的可访问名。英文宿主可覆盖。 */
  @property({ type: String }) label = COPY.mainNav;

  connectedCallback(): void {
    super.connectedCallback();
    // 按钮在每次重建时被换掉，所以监听挂 shadowRoot 上（委托），不逐按钮绑
    this.shadowRoot?.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot?.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  /** 归一：丢非法项、补 order、按 order 稳定排序（组内顺序即最终顺序）。 */
  private _list(): AppNavItem[] {
    const raw = this.items as unknown;
    let list: unknown = raw;
    if (typeof raw === "string") {
      try {
        list = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(list)) return [];
    const out: AppNavItem[] = [];
    list.forEach((x, i) => {
      if (!x || typeof x !== "object") return;
      const it = x as AppNavItem;
      if (typeof it.path !== "string" || !it.path.trim()) return;
      if (typeof it.title !== "string" || !it.title.trim()) return;
      const order = Number(it.order);
      // [WHY 用下标兜底而不是 0] 全都没写 order 时要保住传入顺序 ——
      // 「注册表登记顺序」是唯一的排序线索，抹成同一个值就没了。
      // [WHY 兜底值是下标而不是 Infinity] 写下标的项与写 order 的项混排时才不会
      // 出现「没写的全跑到最前面」；真正的「没写 order」在下面按「组内排最后」处理。
      out.push({ ...it, order: Number.isFinite(order) ? order : i });
    });
    // 保持输入顺序：**组顺序由它决定**（见 _groups），组内顺序再看 order。
    return out;
  }

  /**
   * 按 `group` 分桶。
   *
   * [WHY 组顺序取「首次出现」而不是「组内最小 order」] 第一版是先全局按 order 排序再
   * 分桶，结果组的先后被 order 值顺手改写了：示例里 `数据接入`(未写 order) 与
   * `数据准备`(order 10) 混排后变成「数据接入 / 数据分析 / 管理 / 数据准备」——
   * 菜单看起来像随机排列，而登记表写得很有条理（2026-11-17 真机截图发现）。
   * 组的先后是**信息架构**（人写的），不该被「组内第几项」这个数字决定。
   *
   * [WHY 组内仍按 order] 组内排序是排版需求（谁先谁后），与组的先后是两件事。
   */
  private _groups(): { loose: AppNavItem[]; groups: Array<[string, AppNavItem[]]> } {
    const loose: AppNavItem[] = [];
    const groups: Array<[string, AppNavItem[]]> = [];
    const byOrder = (a: AppNavItem, b: AppNavItem) => (a.order as number) - (b.order as number);
    for (const it of this._list()) {
      const name = (it.group || "").trim();
      if (!name) {
        loose.push(it);
        continue;
      }
      const found = groups.find(([n]) => n === name);
      if (found) found[1].push(it);
      else groups.push([name, [it]]);
    }
    loose.sort(byOrder);
    for (const [, list] of groups) list.sort(byOrder);
    return { loose, groups };
  }

  private _iconHtml(item: AppNavItem): string {
    const body = item.icon ? NAV_ICONS[item.icon.trim()] : undefined;
    if (body) {
      return `<svg class="z-app-nav__svg" viewBox="0 0 20 20" fill="none" stroke="currentColor"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" focusable="false">${body}</svg>`;
    }
    // 未知/未给图标：标题首字。不画空方块（那读起来像「图标没加载完」）。
    return `<span class="z-app-nav__initial" aria-hidden="true">${esc(initialOf(item.title))}</span>`;
  }

  private _itemHtml(item: AppNavItem): string {
    const on = normPath(item.path) === normPath(this.active);
    const badge =
      item.badge === undefined || item.badge === null || item.badge === ""
        ? ""
        : `<span class="z-app-nav__badge">${esc(String(item.badge))}</span>`;
    return `<li class="z-app-nav__row">
      <button type="button" class="z-app-nav__item" data-path="${esc(item.path)}"
        data-icon="${esc((item.icon || "").trim())}"
        title="${esc(item.title)}" aria-label="${esc(item.title)}"
        ${on ? 'aria-current="page"' : ""}
        ${item.disabled ? 'aria-disabled="true"' : ""}>
        <span class="z-app-nav__icon">${this._iconHtml(item)}</span>
        <span class="z-app-nav__text">${esc(item.title)}</span>${badge}
      </button>
    </li>`;
  }

  render(): string {
    const { loose, groups } = this._groups();
    if (!loose.length && !groups.length) {
      // [WHY 不吐「暂无菜单」文案] 空清单几乎总是「还没拉到权限」或「传错了字段」，
      // 这个组件不该替宿主解释原因；给一个可断言的标记，让人去查传参。
      return `<nav class="z-app-nav" aria-label="${esc(this.label)}" data-empty></nav>`;
    }
    const looseHtml = loose.length ? `<ul class="z-app-nav__list">${loose.map((i) => this._itemHtml(i)).join("")}</ul>` : "";
    const groupHtml = groups
      .map(
        ([name, list]) => `<div class="z-app-nav__group" data-group="${esc(name)}">
        <div class="z-app-nav__group-title" title="${esc(name)}">${esc(name)}</div>
        <ul class="z-app-nav__list">${list.map((i) => this._itemHtml(i)).join("")}</ul>
      </div>`,
      )
      .join("");
    return `<nav class="z-app-nav" aria-label="${esc(this.label)}">${looseHtml}${groupHtml}</nav>`;
  }

  private _onClick = (e: Event): void => {
    const hit = (e.target as HTMLElement | null)?.closest?.("[data-path]") as HTMLElement | null;
    if (!hit) return;
    if (hit.getAttribute("aria-disabled") === "true") return;
    const path = hit.dataset.path || "";
    if (!path) return;
    const item = this._list().find((i) => i.path === path);
    // 只报意图：路由归 L4 引擎，组件不碰 history
    this.emit("z-navigate", { path, item });
  };
}

customElements.define("z-app-nav", ZAppNav);

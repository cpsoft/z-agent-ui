// <m-sku-picker> 规格选择弹层：规格组单选 + 数量 + 库存与价格联动。
//
// 商城详情页的核心交互。三件必须做对的事：
//   ① **没选全就不能加购** —— 只选颜色没选尺码时按钮要不可点，否则订单里会缺一个维度，
//      而下游仓库收到的是一条无法发货的单；
//   ② **不可组合的选项要置灰** —— 米白没有 M 码时，选中米白后 M 码必须点不动。
//      光在提交时校验等于让用户白点一次，而且他不知道是哪个选项出了问题；
//   ③ **库存跟着组合走** —— 同一个「米白」可能 500ml 有货、250ml 没货，库存必须取当前组合那一行，
//      取商品的库存总数会放行超卖。
//
// 数据两个来源，二选一：
//   · 只给 `groups`（`颜色:米白,岩灰|尺码:250ml,500ml`）+ `stock`：适合无 SKU 矩阵的简单商品；
//   · 给 `skus`（属性传数组）：每行一组规格 + 自己的价格与库存，①②③ 全部按矩阵算。
// `skus` 在时优先用它；`groups` 省略则从 `skus` 的规格键里反推。
import { BaseElement, COPY, escapeAttr, escapeHtml, html, property, t, defineElement } from "../../core/index.js";
import "../m-price/MPrice.js";
import "../m-stepper/MStepper.js";
import mSkuPickerCSS from "./m-sku-picker.css?raw";

export interface SkuOption {
  value: string;
  label?: string;
  /** 显式关掉（如「该规格已停产」），与「组合无货」是两件事。 */
  disabled?: boolean;
}

export interface SkuGroup {
  key: string;
  label?: string;
  options: Array<SkuOption | string>;
}

export interface SkuRow {
  /** 规格键 → 选项值，键与 `SkuGroup.key` 对齐。 */
  specs: Record<string, string>;
  price?: number | string;
  stock?: number;
  image?: string;
}

/** `颜色:米白,岩灰|尺码:250ml,500ml` → 规格组数组。 */
function parseGroups(raw: string | SkuGroup[]): SkuGroup[] {
  if (Array.isArray(raw)) return raw.filter((g) => g && g.key);
  return String(raw)
    .split("|")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const at = seg.indexOf(":");
      const key = (at < 0 ? seg : seg.slice(0, at)).trim();
      const rest = at < 0 ? "" : seg.slice(at + 1);
      const options = rest
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { key, label: key, options };
    });
}

/** `颜色=米白|尺码=500ml` → 选中记录。 */
function parseSelected(raw: string | Record<string, string>): Record<string, string> {
  if (raw && typeof raw === "object") return { ...raw };
  const out: Record<string, string> = {};
  for (const seg of String(raw).split("|")) {
    const at = seg.indexOf("=");
    if (at < 0) continue;
    const k = seg.slice(0, at).trim();
    const v = seg.slice(at + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}

function optionValue(o: SkuOption | string): string {
  return typeof o === "string" ? o : o.value;
}

function optionLabel(o: SkuOption | string): string {
  return typeof o === "string" ? o : (o.label ?? o.value);
}

export class MSkuPicker extends BaseElement {
  static styles = mSkuPickerCSS;

  @property({ type: Boolean }) visible = false;
  @property({ type: String }) title = COPY.selectSpecs;
  @property({ type: String }) image = "";
  /** 兜底价（无 `skus` 时用；有 `skus` 且选全了就按那一行）。 */
  @property({ type: String }) price: string | number = "";
  /** 划线原价，空表示不展示。 */
  @property({ type: String }) origin: string | number = "";
  /** 兜底库存（无 `skus` 时用）。 */
  @property({ type: Number }) stock = 0;
  // reflect: false —— 宿主也可以直接赋数组/对象。开着反射会把它 String() 成
  // "[object Object]" 写回 attribute，再被 attributeChangedCallback 读回来覆盖掉原值。
  @property({ type: String, attribute: "groups", reflect: false }) groups: string | SkuGroup[] = "";
  /** SKU 矩阵：属性传数组（`attribute: false`）。 */
  @property({ attribute: false }) skus: SkuRow[] = [];
  @property({ type: String, attribute: "selected", reflect: false }) selected: string | Record<string, string> = "";
  @property({ type: Number }) qty = 1;
  /** 主按钮文案。 */
  @property({ type: String }) confirmText = COPY.addToCart;
  /** 不显示数量行（如只选规格的场景）。 */
  @property({ type: Boolean }) hideQty = false;

  /** 上一次渲染时的可见态：用来判断「这一次是刚打开」，好把焦点送进去。 */
  private _wasVisible = false;

  private get _groups(): SkuGroup[] {
    if (this.groups) return parseGroups(this.groups);
    // 没给 groups 就从 skus 反推：规格键的登记顺序即展示顺序
    const seen: string[] = [];
    const values = new Map<string, string[]>();
    for (const sku of this.skus) {
      for (const [k, v] of Object.entries(sku.specs ?? {})) {
        if (!values.has(k)) {
          values.set(k, []);
          seen.push(k);
        }
        const arr = values.get(k)!;
        if (!arr.includes(v)) arr.push(v);
      }
    }
    return seen.map((k) => ({ key: k, label: k, options: values.get(k) ?? [] }));
  }

  private get _selectedMap(): Record<string, string> {
    return parseSelected(this.selected);
  }

  private get _complete(): boolean {
    const map = this._selectedMap;
    return this._groups.every((g) => !!(map[g.key] ?? "").trim());
  }

  private get _currentSku(): SkuRow | undefined {
    if (!this.skus.length || !this._complete) return undefined;
    const map = this._selectedMap;
    return this.skus.find((s) => Object.keys(map).every((k) => s.specs?.[k] === map[k]));
  }

  /** 当前展示价：选全了看那一行，否则看兜底价。 */
  private get _price(): string | number {
    const sku = this._currentSku;
    return sku?.price ?? this.price;
  }

  /** 当前可用库存：选全了看那一行（`stock` 未给视为 0），否则看兜底库存。 */
  private get _stock(): number {
    if (this.skus.length) {
      if (!this._complete) return -1; // -1 = 还不知道，界面不显示库存
      return Math.max(0, Math.trunc(this._currentSku?.stock ?? 0));
    }
    return Math.max(0, Math.trunc(this.stock));
  }

  /** 某组某选项能不能点：选中时恒可点（否则用户没法改），其余按矩阵算。 */
  private _usable(group: SkuGroup, value: string): boolean {
    const map = this._selectedMap;
    if (map[group.key] === value) return true;
    if (!this.skus.length) return true;
    const probe = { ...map, [group.key]: value };
    return this.skus.some((sku) => {
      if ((sku.stock ?? 0) <= 0) return false;
      return Object.entries(probe).every(([k, v]) => !v || sku.specs?.[k] === v);
    });
  }

  render(): string {
    if (!this.visible) return html`<div style="display:none" part="hidden"></div>`;

    const groups = this._groups;
    const map = this._selectedMap;
    const stock = this._stock;
    const max = stock >= 0 ? stock : undefined;
    const qty = Math.max(1, Math.min(this.qty, max ?? this.qty));
    const complete = this._complete;
    const picked = complete
      ? groups.map((g) => map[g.key]).join(" · ")
      : t("pleaseSelect", { fields: groups.filter((g) => !(map[g.key] ?? "").trim()).map((g) => g.label ?? g.key).join(" / ") });
    const img = this._currentSku?.image || this.image;
    const blocked = !complete || stock === 0;

    const sections = groups
      .map((g) => {
        const opts = g.options
          .map((raw) => {
            const v = optionValue(raw);
            const on = map[g.key] === v;
            const off = typeof raw === "object" && !!raw.disabled;
            const usable = !off && this._usable(g, v);
            return `<button type="button" class="m-sku__opt${on ? " is-active" : ""}"
              data-group="${escapeAttr(g.key)}" data-value="${escapeAttr(v)}"
              aria-pressed="${on ? "true" : "false"}" ${usable ? "" : "disabled"}
              part="option">${escapeAttr(optionLabel(raw))}</button>`;
          })
          .join("");
        return `<section class="m-sku__group">
          <h4 class="m-sku__name">${escapeAttr(g.label ?? g.key)}</h4>
          <div class="m-sku__opts">${opts}</div>
        </section>`;
      })
      .join("");

    return html`
      <div class="m-sku__overlay" part="overlay">
        <div class="m-sku__panel" part="panel" role="dialog" aria-modal="true"
          aria-label="${escapeAttr(this.title)}" tabindex="-1">
          <header class="m-sku__head">
            <div class="m-sku__media" part="media">
              ${img
                ? `<img class="m-sku__img" src="${escapeAttr(img)}" alt="" />`
                : `<span class="m-sku__img m-sku__img--empty" aria-hidden="true"></span>`}
            </div>
            <div class="m-sku__info">
              <m-price value="${escapeAttr(String(this._price))}" size="lg" part="price"></m-price>
              ${this.origin !== ""
                ? `<m-price value="${escapeAttr(String(this.origin))}" size="sm" strike></m-price>`
                : ""}
              <p class="m-sku__picked" part="picked">${complete ? escapeHtml(t("selectedValue", { value: picked })) : escapeAttr(picked)}</p>
              ${stock >= 0 ? `<p class="m-sku__stock">${escapeHtml(t("stockCount", { count: stock }))}</p>` : ""}
            </div>
            <button type="button" class="m-sku__close" part="close" aria-label="${COPY.close}">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </header>
          <div class="m-sku__body" part="body">${sections}</div>
          <footer class="m-sku__foot" part="foot">
            ${this.hideQty
              ? ""
              : `<div class="m-sku__qty">
                   <span class="m-sku__qty-label">${escapeHtml(t("quantity"))}</span>
                   <m-stepper value="${qty}" min="1" ${max !== undefined ? `max="${max}"` : ""}></m-stepper>
                 </div>`}
            <button type="button" class="m-sku__confirm" part="confirm" ${blocked ? "disabled" : ""}>
              ${escapeAttr(complete ? this.confirmText : t("selectSpecsPrompt"))}
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  updated(): void {
    const panel = this.shadowRoot!.querySelector<HTMLElement>(".m-sku__panel");
    const opened = this.visible && !this._wasVisible;
    this._wasVisible = this.visible;
    // 打开时把焦点送进弹层：不送的话读屏还停在页面上，而视觉上页面已经被盖住
    if (panel && opened) panel.focus({ preventScroll: true });
  }

  connectedCallback(): void {
    super.connectedCallback();
    const root = this.shadowRoot!;
    root.addEventListener("click", this._onClick);
    root.addEventListener("keydown", this._onKey);
    root.addEventListener("z-change", this._onStepper);
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot!;
    root.removeEventListener("click", this._onClick);
    root.removeEventListener("keydown", this._onKey);
    root.removeEventListener("z-change", this._onStepper);
    super.disconnectedCallback();
  }

  open(): void {
    if (this.visible) return;
    this.visible = true;
    this.emit("z-open", {});
  }

  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.emit("z-close", { selected: this._selectedMap, qty: this.qty });
  }

  /** 选一个选项（宿主也可调）：与点击同一条路径，事件只发一次。 */
  select(groupKey: string, value: string): void {
    const group = this._groups.find((g) => g.key === groupKey);
    if (!group) return;
    const map = this._selectedMap;
    if (map[groupKey] === value) return;
    map[groupKey] = value;
    this.selected = map;
    this._syncQty();
    this.emit("z-change", this._detail());
  }

  private _syncQty(): void {
    const res = this._resolve();
    this.qty = res.qty;
  }

  private _resolve(): {
    selected: Record<string, string>;
    qty: number;
    /** 选全了才知道库存；`null` = 还不知道（不是 0）。宿主别把 -1 这种内部哨兵显示出来。 */
    stock: number | null;
    price: string | number;
    complete: boolean;
    sku?: SkuRow;
  } {
    const stock = this._stock;
    const max = stock >= 0 ? stock : Number.POSITIVE_INFINITY;
    return {
      selected: this._selectedMap,
      qty: Math.max(1, Math.min(this.qty, max)),
      stock: stock < 0 ? null : stock,
      price: this._price,
      complete: this._complete,
      sku: this._currentSku,
    };
  }

  private _detail(): ReturnType<MSkuPicker["_resolve"]> {
    return this._resolve();
  }

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    // 点遮罩空白处关闭（点面板内不关）
    if (target.classList?.contains("m-sku__overlay")) {
      this.close();
      return;
    }
    if (target.closest("[part~='close']")) {
      this.close();
      return;
    }
    if (target.closest("[part~='confirm']")) {
      if (!this._complete || this._stock === 0) return;
      this.emit("z-confirm", this._detail());
      this.close();
      return;
    }
    const opt = target.closest("[data-group]") as HTMLElement | null;
    if (opt) {
      if ((opt as HTMLButtonElement).disabled) return;
      this.select(opt.dataset.group ?? "", opt.dataset.value ?? "");
    }
  };

  private _onStepper = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { value?: number } | undefined;
    const value = detail?.value;
    if (typeof value !== "number") return;
    if (value === this.qty) return;
    this.qty = value;
    this.emit("z-change", this._detail());
  };

  private _onKey = (e: Event): void => {
    if ((e as KeyboardEvent).key === "Escape") {
      e.preventDefault();
      this.close();
    }
  };
}

defineElement("m-sku-picker", MSkuPicker);

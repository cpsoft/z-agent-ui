// <z-form-item> 表单项：name 绑定字段、label 与 required 控制外观，rules 自定义校验，校验结果发事件。
// [WHY] z-form-item [[2026-08-11-W14-form]]:
// 表单字段容器（label + 控件 slot + error）。校验机制照搬 DetailForm 先例 —
// 从控件元素自身取值（z-switch/z-checkbox → .checked，其余 → .value），
// 不读控件 z-change detail（各控件形状不统一，DetailForm.ts:168-192）。
// 控件是 light DOM slot 内容，z-change 经 host 冒泡 → 在 host 绑定监听
// （DetailForm 控件在 shadow DOM 内绑 shadowRoot，监听点随控件所在树变化）。
// 转发聚合 z-change 前 stopPropagation：防控件原始事件与聚合事件双发（DetailForm.ts:182 先例）。
// See: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// [2026-08-11] night-hawk: 创建
import { BaseElement, html, property, escapeAttr, bindFieldName, slottedControl, type FieldNameBinder, defineElement } from "../../core/index.js";
import formItemCSS from "./form-item.css?raw";

export type ZFormTrigger = "change" | "blur" | "submit";

/** 自定义校验器：返回 true 通过，字符串为错误消息；支持异步 */
export type ZFormRule = (value: unknown) => string | true | Promise<string | true>;

export class ZFormItem extends BaseElement {
  static styles = formItemCSS;

  @property({ type: String }) name = "";
  @property({ type: String }) label = "";
  @property({ type: Boolean }) required = false;
  @property({ type: Number }) min: number | undefined;
  @property({ type: Number }) max: number | undefined;
  @property({ type: Number }) minlength: number | undefined;
  @property({ type: Number }) maxlength: number | undefined;
  @property({ type: String }) pattern = "";
  @property({ type: String }) message = "This field is invalid";
  // [WHY] 多词属性需显式 attribute 名（decorators 只做 toLowerCase，不做 kebab 转换，见 src/core/decorators.ts:22）
  @property({ type: String, attribute: "required-message" }) requiredMessage = "This field is required";
  @property({ type: String }) trigger: ZFormTrigger = "change";
  @property({ type: Array, attribute: false }) rules: ZFormRule[] = [];

  private _error = "";
  /** reset() 恢复目标：首次可查控件时缓存（undefined 哨兵防重查） */
  private _initialValue: unknown = undefined;
  /** 把 label 持续喂给槽内控件（重渲染后回填），实现见 core/a11y.ts 的 bindFieldName */
  private _fieldName: FieldNameBinder | null = null;

  /** 最近一次校验错误（无错误为空串）；z-form 聚合读取 */
  get error(): string {
    return this._error;
  }

  /** 当前关联控件（slot 首元素）；实时查询防 shadow 重建后引用失效 */
  /**
   * 槽里的控件。
   *
   * [WHY 走 slottedControl 而不是 `assignedElements()[0]`] 槽内容可能先是一个
   * `<slot>` 占位（包一层透传容器时很常见），那时「第一个元素」不是控件 ——
   * 名字会静默地写到一个没有影子树的占位符上。与 `z-property-row` 同一个判据，
   * 实现共用 core/a11y.ts 的 slottedControl（那边有完整的真机证据）。
   */
  get control(): Element | null {
    return slottedControl(this.shadowRoot?.querySelector<HTMLSlotElement>("slot"));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-change", this._onControlChange);
    this.addEventListener("z-blur", this._onControlBlur);
    this._fieldName = bindFieldName(() => this.control, () => this.label);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-change", this._onControlChange);
    this.removeEventListener("z-blur", this._onControlBlur);
    this._fieldName?.dispose();
    this._fieldName = null;
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] 首次渲染后缓存控件初始值供 reset() 恢复；取不到（控件未就绪）则留空
    if (this._initialValue === undefined) {
      const c = this.control;
      this._initialValue = c ? this._readControlValue(c) : "";
    }
    this._fieldName?.sync();
  }

  render(): string {
    const label = this.label
      ? html`
          <span class="z-form-item__label" part="label"
            >${escapeAttr(this.label)}${this.required ? `<span class="z-form-item__required" part="required" aria-hidden="true">*</span>` : ""}</span
          >
        `
      : "";
    // [WHY] error 行始终占位（隐藏用 visibility）：校验出现/消失不改变布局。
    // 否则 blur 校验触发 requestUpdate 重排，会把下方按钮推移，
    // 导致 mousedown/mouseup 跨元素 → click 丢失（浏览器标准竞态）
    const error = html`
      <div
        class="z-form-item__error ${this._error ? "" : "z-form-item__error--hidden"}"
        part="error"
        role="alert"
        id="z-form-item-error"
        aria-hidden="${this._error ? "false" : "true"}"
        >${escapeAttr(this._error)}</div
      >
    `;
    return html`
      <div class="z-form-item" part="root">
        ${label}
        <div class="z-form-item__control" part="control"><slot></slot></div>
        ${error}
      </div>
    `;
  }

  // ── 值 API ──

  getValue(): unknown {
    const c = this.control;
    return c ? this._readControlValue(c) : "";
  }

  /** 程序化设值（写控件属性，触发控件自身 z-change 走正常链路） */
  setValue(value: unknown): void {
    const c = this.control;
    if (!c) return;
    const tag = c.tagName.toLowerCase();
    if (tag === "z-switch" || tag === "z-checkbox") {
      (c as any).checked = Boolean(value);
    } else {
      (c as any).value = value;
    }
    this.validate();
  }

  /** 清除错误并恢复控件初始值 */
  reset(): void {
    const c = this.control;
    if (c) {
      const v = this._initialValue !== undefined ? this._initialValue : "";
      const tag = c.tagName.toLowerCase();
      if (tag === "z-switch" || tag === "z-checkbox") {
        (c as any).checked = Boolean(v);
      } else {
        (c as any).value = v;
      }
    }
    this._clearError();
    this.emit("z-reset", { name: this.name });
  }

  // ── 校验 ──

  /** 校验当前值；返回 boolean（含异步 rules 时为 Promise） */
  validate(): boolean | Promise<boolean> {
    const value = this.getValue();
    const builtin = this._checkBuiltin(value);
    if (builtin !== true) return this._setError(builtin);
    if (this.rules.length === 0) return this._clearError();
    const results = this.rules.map((r) => r(value));
    if (results.some((r) => r instanceof Promise)) {
      return Promise.all(results).then((rs) => {
        const err = rs.find((r) => r !== true);
        return err === undefined ? this._clearError() : this._setError(err);
      });
    }
    // [WHY] 同步分支: 上面已确认无 Promise, 结果必为 string | true;
    // 用类型谓词收窄（原代码 results.find 的返回值含 Promise 成员导致 TS 报错）
    const err = results
      .filter((r): r is string | true => !(r instanceof Promise))
      .find((r): r is string => r !== true);
    return err === undefined ? this._clearError() : this._setError(err);
  }

  private _checkBuiltin(value: unknown): string | true {
    // [WHY] required 语义：boolean false（未勾选的 checkbox/switch）视为空值，
    // 否则"同意条款"类必填字段永远通过
    const isEmpty =
      value === "" || value === null || value === undefined || (this.required && value === false);
    if (this.required && isEmpty) return this.requiredMessage;
    if (isEmpty) return true; // 非必填空值不再校验其余规则
    const num = Number(value);
    if (this.min !== undefined && !Number.isNaN(num) && num < this.min) return this.message;
    if (this.max !== undefined && !Number.isNaN(num) && num > this.max) return this.message;
    const len = String(value).length;
    if (this.minlength !== undefined && len < this.minlength) return this.message;
    if (this.maxlength !== undefined && len > this.maxlength) return this.message;
    if (this.pattern) {
      // [WHY] 非法正则直接跳过：使用者配置错误不应炸表单
      try {
        if (!new RegExp(this.pattern).test(String(value))) return this.message;
      } catch {
        /* noop */
      }
    }
    return true;
  }

  private _setError(msg: string): boolean {
    this._error = msg;
    const c = this.control;
    if (c) {
      // [WHY 不设 error 属性而设 invalid 属性：z-input/z-textarea 等控件在 error
      // 变化时会重渲染并在控件下方渲染自身错误行 → host 高度增高 → 布局下移。
      // blur 校验发生在 mousedown/mouseup 之间时按钮被推走 → 鼠标落点跨元素 →
      // click 丢失（浏览器标准竞态，demo/form.html 冒烟实测）。
      // `invalid` 只改语义（字段的 aria-invalid）与描边，不新增任何 DOM 行 ⇒ 高度不变。
      //
      // [WHY 不再写 aria-describedby] 旧代码在这里设 `aria-describedby="z-form-item-error"`，
      // 目标是本组件 shadow 内的错误行 —— **跨 shadow 的 IDREF 永远解析不到**，而且它
      // 还会顶掉控件自己算好的关联（z-input 的 hint / error 就这样被覆盖）。错误文案的
      // 播报由错误行的 `role="alert"` 承担，控件只需说清「我现在是非法的」。
      if ("invalid" in c) (c as any).invalid = true;
      // 宿主自写的控件没有 invalid 属性：退回 2026-08 的属性钩子，行为与之前一致
      else c.setAttribute("data-invalid", "");
    }
    this.requestUpdate();
    return false;
  }

  private _clearError(): boolean {
    if (!this._error) return true;
    this._error = "";
    const c = this.control;
    if (c) {
      if ("invalid" in c) (c as any).invalid = false;
      else c.removeAttribute("data-invalid");
    }
    this.requestUpdate();
    return true;
  }

  // ── 事件 ──

  private _onControlChange = (e: Event): void => {
    // [WHY] 跳过自身转发的 z-change：转发事件 dispatch 自 host（目标即自身），
    // 否则触发本监听器形成无限循环
    if (e.target === this) return;
    // [WHY] 拦截控件原始 z-change 并转发聚合事件（防双发，DetailForm.ts:182 先例）；
    // detail 带 item 引用供 z-form 区分"控件冒泡"与"字段转发"
    e.stopPropagation();
    if (this.trigger === "change" || this.trigger === "blur") this.validate();
    this.emit("z-change", { name: this.name, value: this.getValue(), item: this });
  };

  private _onControlBlur = (): void => {
    if (this.trigger === "blur") this.validate();
  };

  private _readControlValue(control: Element): unknown {
    const tag = control.tagName.toLowerCase();
    if (tag === "z-switch" || tag === "z-checkbox") {
      return (control as any).checked;
    }
    return (control as any).value;
  }

}

defineElement("z-form-item", ZFormItem);

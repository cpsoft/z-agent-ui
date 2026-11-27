// <z-form> 表单容器：values 汇总子项，validateOnChange / validateOnSubmit 控制校验时机，提交发 z-submit。
// [WHY] z-form [[2026-08-11-W14-form]]:
// 表单容器：聚合 z-form-item 的校验与值。事件链路：控件 z-change → form-item
// 拦截并转发（detail 带 item 标记，stopPropagation 防控件原始事件双发）
// → form host 收到转发 → 聚合 values + 再发 z-change {values,field,value}。
// form-item 转发的 z-change 与 form 聚合 z-change 都会在 form host 分发，
// 前者 detail 无 values（可辨识），后者是消费方准入口。
// values 属性为外部快照（只读语义）；真值来源是各 form-item 实时值。
// See: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// [2026-08-11] night-hawk: 创建

// [WHY] 组合组件依赖注册：validate() 调用 item.validate() 要求 z-form-item 已定义
import "../form-item/FormItem.js";

import { BaseElement, html, property, defineElement } from "../../core/index.js";
import formCSS from "./form.css?raw";
import type { ZFormItem } from "../form-item/FormItem.js";

export class ZForm extends BaseElement {
  static styles = formCSS;

  /** 外部值快照（只读语义）；程序化设值用 setValues() */
  @property({ type: Object, attribute: false }) values: Record<string, unknown> = {};
  // [WHY] 多词属性需显式 attribute 名（decorators 只做 toLowerCase，不做 kebab 转换，见 src/core/decorators.ts:22）
  @property({ type: Boolean, attribute: "validate-on-change" }) validateOnChange = false;
  @property({ type: Boolean, attribute: "validate-on-submit" }) validateOnSubmit = true;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-change", this._onFieldChange);
    this.addEventListener("z-reset", this._onFieldReset);
    this.shadowRoot!.addEventListener("submit", this._onSubmit);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-change", this._onFieldChange);
    this.removeEventListener("z-reset", this._onFieldReset);
    this.shadowRoot!.removeEventListener("submit", this._onSubmit);
    super.disconnectedCallback();
  }

  render(): string {
    return html`
      <form class="z-form" part="root" novalidate>
        <slot></slot>
      </form>
    `;
  }

  // ── 值 API ──

  /** 实时聚合全部 form-item 值（无名 item 跳过） */
  getValues(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const item of this._items) {
      if (!item.name) continue;
      out[item.name] = item.getValue();
    }
    return out;
  }

  /** 分发到各 form-item（仅覆盖存在的字段） */
  setValues(data: Record<string, unknown>): void {
    for (const item of this._items) {
      if (item.name && Object.prototype.hasOwnProperty.call(data, item.name)) {
        item.setValue(data[item.name]);
      }
    }
  }

  // ── 校验 / 提交 ──

  /** 聚合校验全部 form-item；含异步 rules 时为 Promise<boolean> */
  validate(): boolean | Promise<boolean> {
    const results = this._items.map((i) => i.validate());
    if (results.some((r) => r instanceof Promise)) {
      return Promise.all(results).then((rs) => rs.every(Boolean));
    }
    return results.every(Boolean);
  }

  /** 当前全部错误映射 {name: message}（仅校验后有意义） */
  get errors(): Record<string, string> {
    const errs: Record<string, string> = {};
    for (const item of this._items) {
      if (item.error) errs[item.name] = item.error;
    }
    return errs;
  }

  /** 校验 → valid 发 z-submit {valid,values} / invalid 发 z-invalid {valid,values,errors} */
  submit(): void {
    const result = this.validate();
    const finish = (valid: boolean): void => {
      const values = this.getValues();
      if (valid) {
        this.emit("z-submit", { valid: true, values });
      } else {
        this.emit("z-invalid", { valid: false, values, errors: this.errors });
      }
    };
    if (result instanceof Promise) result.then(finish);
    else finish(result);
  }

  /** 重置全部 form-item 到初始值 */
  reset(): void {
    for (const item of this._items) item.reset();
    this.emit("z-reset");
  }

  private get _items(): ZFormItem[] {
    return Array.from(this.querySelectorAll("z-form-item")) as ZFormItem[];
  }

  private _onSubmit = (e: Event): void => {
    e.preventDefault();
    this.submit();
  };

  private _onFieldChange = (e: Event): void => {
    const d = (e as CustomEvent).detail;
    // [WHY] 仅响应 form-item 转发的 z-change（detail.item 标记）；
    // 控件原始事件已被 form-item 拦截，此为双保险
    if (!d || !d.item) return;
    const field = String(d.name ?? "");
    e.stopPropagation();
    if (this.validateOnChange) this.validate();
    this.emit("z-change", { values: this.getValues(), field, value: d.value });
  };

  private _onFieldReset = (e: Event): void => {
    // [WHY] 拦截 item 级 z-reset 冒泡：表单级 z-reset 由 reset() 统一发出，
    // 避免用户收到 N+1 次 reset 事件；e.target 守卫防聚合事件自循环
    if (e.target === this) return;
    e.stopPropagation();
  };
}

defineElement("z-form", ZForm);

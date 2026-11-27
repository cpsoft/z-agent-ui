import { createContext, type ControlSize } from "../../core/index.js";

/** `<z-form>` 通过 W3C Context Protocol 向后代控件下发的共享表单状态。 */
export interface FormContextValue {
  disabled: boolean;
  readonly: boolean;
  controlSize: ControlSize;
}

/** 表单上下文键：任意深度的子孙组件（含 Shadow DOM 内）均可用 `ContextConsumer` 订阅。 */
export const FORM_CONTEXT = createContext<FormContextValue>("z-form-context");

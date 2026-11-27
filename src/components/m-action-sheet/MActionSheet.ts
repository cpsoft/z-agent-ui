// <m-action-sheet> 底部动作面板：visible 控制显隐，title 作标题，actions 给按钮列表，选择后发 z-select。
// [WHY] 底部操作面板：fixed 定位 + 滑入动画
// 关闭流程：visible=false 先 _closing 滑出，animationend 后 display:none
// 参考 Modal 的 _closing 状态机模式
// [2026-09-15] night-hawk: 创建移动端交互组件
import { BaseElement, html, property, t, escapeHtml, defineElement } from "../../core/index.js";
import mActionSheetCSS from "./m-action-sheet.css?raw";

export interface MActionSheetAction {
  label: string;
  value: string | number;
  danger?: boolean;
}

export class MActionSheet extends BaseElement {
  static styles = mActionSheetCSS;

  @property({ type: Boolean }) visible = false;
  // [WHY] title 是 HTMLElement 反射属性，必须 ! 声明无初始化器
  // 否则构造期触发原生 setAttribute 违反 CE 约束（参考 AccordionItem.title）
  @property({ type: String }) title!: string;
  // [WHY] actions 是对象数组，attribute 形式无法表达，仅作 property
  @property({ attribute: false }) actions: MActionSheetAction[] = [];

  private _wasVisible = false;
  // [WHY] 关闭动画状态：visible=false 期间带退场动画继续显示
  private _closing = false;

  render(): string {
    if (!this.visible && !this._closing) {
      return html`<div style="display:none" part="hidden"></div>`;
    }

    const overlayClosing = this._closing ? " m-action-sheet__overlay--closing" : "";
    const panelClosing = this._closing ? " m-action-sheet__panel--closing" : "";

    const items = this.actions
      .map(
        (action, i) => html`
        <button type="button"
                class="m-action-sheet__item${action.danger ? " m-action-sheet__item--danger" : ""}"
                part="item"
                data-index="${i}">
          ${escapeHtml(action.label)}
        </button>
      `,
      )
      .join("");

    return html`
      <div class="m-action-sheet__overlay${overlayClosing}" part="overlay">
        <div class="m-action-sheet__panel${panelClosing}" part="panel" role="dialog" aria-modal="true">
          ${this.title ? html`<div class="m-action-sheet__title" part="title">${escapeHtml(this.title)}</div>` : ""}
          <div class="m-action-sheet__list" part="list">${items}</div>
          <button type="button" class="m-action-sheet__cancel" part="cancel">${escapeHtml(t("cancel"))}</button>
        </div>
      </div>
    `;
  }

  updated(): void {
    const wasVisible = this._wasVisible;
    this._wasVisible = this.visible;

    // [WHY] render 重建 DOM，事件需按节点重绑（参考 Modal.updated）
    const overlay = this.shadowRoot!.querySelector(".m-action-sheet__overlay");
    if (overlay) overlay.addEventListener("click", this._onOverlayClick);

    const cancelBtn = this.shadowRoot!.querySelector(".m-action-sheet__cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", this._onCancelClick);

    const items = this.shadowRoot!.querySelectorAll(".m-action-sheet__item");
    items.forEach((btn) => {
      btn.addEventListener("click", this._onItemClick);
    });

    if (this.visible && !wasVisible) {
      this.emit("z-action-sheet-open");
    } else if (!this.visible && wasVisible) {
      // [WHY] 关闭动画：先 _closing 滑出，animationend 后清理状态隐藏
      this._closing = true;
      this.requestUpdate();
    }

    if (this._closing) {
      const panel = this.shadowRoot!.querySelector(".m-action-sheet__panel");
      if (panel) {
        // [WHY] 形参声明为 Event 而非 AnimationEvent：addEventListener 的字符串重载
        // 只接受 EventListener，用更窄的事件类型会 TS2769（本文件从 zworker 拷入时即此错）。
        const onEnd = (e: Event): void => {
          // [WHY] 目标校验：避免槽内容自身动画误触发
          if (e.target !== panel) return;
          panel.removeEventListener("animationend", onEnd);
          this._closing = false;
          this.requestUpdate();
        };
        panel.addEventListener("animationend", onEnd);
      }
    }
  }

  private _onOverlayClick = (e: Event): void => {
    if (!this.visible) return;
    // [WHY] 仅点击遮罩空白处才关闭（冒泡到 overlay 自身）
    if (e.target === e.currentTarget) {
      this._close();
    }
  };

  private _onCancelClick = (): void => {
    this._close();
  };

  private _onItemClick = (e: Event): void => {
    const btn = e.currentTarget as HTMLElement;
    const index = Number(btn.dataset.index);
    const action = this.actions[index];
    if (action) {
      this.emit("z-select", { value: action.value, action });
      this._close();
    }
  };

  private _close(): void {
    this.emit("z-action-sheet-close");
    this.visible = false;
  }

}

defineElement("m-action-sheet", MActionSheet);

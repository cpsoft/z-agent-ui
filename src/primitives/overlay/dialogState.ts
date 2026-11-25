// [WHY] 2026-10-25 系统审计：Modal 与 Drawer 的对话框状态机此前是「整体拷贝」
// （Drawer.ts 顶部注释自认「状态机整体拷贝 Modal.ts」），两份 80 行逻辑各自维护
// closing/wasOpen 快照/portal 重挂载/栈与滚动锁/FocusTrap/退场动画。
// 抽成本控制器后，两个组件只保留差异部分（class 名、事件绑定、布局）。
//
// 状态机契约（逐行等价于原 Modal/Drawer 实现，含踩过的坑）：
// - wasOpen 快照必须先于分支判断，否则 closing 重渲染会二次 emit/入栈/解锁（findings F1）
// - 已断开元素跳过副作用：show() 后未等微任务即移除时，排队更新不能入栈/锁滚动（isConnected 守卫）
// - disconnectedCallback 不重置 _wasOpen：宿主移动（portal 重挂载）也会触发 disconnect，
//   重置会让重连后把 open 分支当首次执行而二次入栈
// - 退场动画的 animationend 需校验 target，防槽内容自身动画误触发（findings F2）
// See: wiki/reference/component-implementation-standard.md
import { FocusTrap } from "../focus-trap/FocusTrap.js";
import { onAnimationEnd } from "../after-animation/index.js";
import { pushOverlay, removeOverlay, lockScroll, unlockScroll } from "./overlayManager.js";

/** 对话框宿主组件需要提供的契约（Modal / Drawer 均满足）。 */
export interface DialogHost extends HTMLElement {
  open: boolean;
  closeOnEscape: boolean;
  portal: boolean;
  /** 供 overlayManager 的 Esc 栈调用 */
  close(): void;
  requestUpdate(): void;
  readonly shadowRoot: ShadowRoot;
  emit<T = unknown>(name: string, detail?: T): void;
}

export interface DialogStateOptions {
  /** 遮罩层选择器（点击遮罩关闭的命中判定） */
  overlaySelector: string;
  /** 面板选择器（FocusTrap 容器 + 退场动画目标） */
  panelSelector: string;
  /** 栈序号写入的 CSS 变量名，如 "--z-modal-stack-index" */
  stackIndexVar: string;
}

/** 对话框开关状态机：由组件在 updated() / disconnectedCallback() 中驱入。 */
export class DialogStateController {
  private _host: DialogHost;
  private _opts: DialogStateOptions;
  private _wasOpen = false;
  private _closing = false;
  private _portalSaved: { parent: Node; next: Node | null } | null = null;
  private _focusTrap: FocusTrap | null = null;
  /** 每次退场递增：在飞的收尾看到 token 变了就闭嘴（期间又开过一次）。 */
  private _closeToken = 0;

  /** 程序化创建（static open/confirm/alert）时置 true：关闭动画结束后自移除。 */
  owned = false;
  /** 程序化实例关闭完成回调（动画结束后结算 Promise）。 */
  onCloseComplete: (() => void) | null = null;

  constructor(host: DialogHost, opts: DialogStateOptions) {
    this._host = host;
    this._opts = opts;
  }

  /** 是否处于退场动画中（render() 据此保留 DOM 并加 --closing 类）。 */
  get closing(): boolean {
    return this._closing;
  }

  /** 在宿主 updated() 中调用：推进状态机 + 绑定退场动画。 */
  afterUpdate(): void {
    const host = this._host;

    // [WHY] 快照必须先于分支：closing 重渲染若再走关闭分支会重复 emit/出栈/解锁（F1）
    const wasOpen = this._wasOpen;
    this._wasOpen = host.open;

    if (host.open && !wasOpen) {
      // [WHY] 已断开元素跳过副作用（show() 后未等微任务即被移除的场景）
      if (!host.isConnected) return;

      if (this._closing) {
        // 关闭动画中途重开：清 closing 并重渲染去掉退场类
        this._closing = false;
        host.requestUpdate();
      }

      // Portal: 整个宿主（含 shadow root 与 slot 分配）重挂载到 body,
      // 逃离 transform/overflow 祖先的包含块与堆叠上下文 (findings F3)
      if (host.portal && host.parentElement !== document.body && !this._portalSaved) {
        this._portalSaved = { parent: host.parentNode!, next: host.nextSibling };
        document.body.appendChild(host);
      }

      const stackIdx = pushOverlay(host);
      host.style.setProperty(this._opts.stackIndexVar, String(stackIdx));
      lockScroll();

      const panel = host.shadowRoot.querySelector(this._opts.panelSelector) as HTMLElement | null;
      if (panel) this._focusTrap = new FocusTrap({ container: panel });

      host.emit("z-open");
    } else if (!host.open && wasOpen) {
      host.emit("z-close");

      removeOverlay(host);
      unlockScroll();

      this._focusTrap?.destroy();
      this._focusTrap = null;

      if (this._portalSaved) {
        this._portalSaved.parent.insertBefore(host, this._portalSaved.next);
        this._portalSaved = null;
      }

      this._closing = true;
      host.requestUpdate();
    }

    // [WHY] 退场动画: 绑定到 closing 渲染的新 panel。目标校验（F2）与兜底都收在
    // L0 的 `afterAnimation` 里 —— 这段原来就是那条结论的唯一来源，四处折叠动画
    // 各抄了一遍却都没带上它（issue IKWNJN）。
    if (this._closing) {
      const panel = host.shadowRoot.querySelector<HTMLElement>(this._opts.panelSelector);
      if (panel) {
        const token = ++this._closeToken;
        onAnimationEnd(panel, () => {
          // 期间又开过一次：那次运行已经重置了 closing，这次收尾不该再跑
          if (token !== this._closeToken) return;
          this._closing = false;
          if (this.owned) {
            const done = this.onCloseComplete;
            host.remove();
            done?.();
          } else {
            host.requestUpdate();
          }
        }, { kind: "animation" });
      }
    }
  }

  /** 在宿主 disconnectedCallback() 中调用。 */
  handleDisconnect(): void {
    if (this._wasOpen) {
      removeOverlay(this._host);
      unlockScroll();
    }
    this._focusTrap?.destroy();
    this._focusTrap = null;
    // [WHY] 不重置 _wasOpen: happy-dom 在宿主移动（portal 重挂载）时也会触发 disconnect，
    // 重置会让重连后的 updated() 把 open 分支当首次执行而二次入栈
  }
}

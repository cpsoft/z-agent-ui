// 长按手势：按住不动到时长就算「触屏上的右键」，动了 / 抬起 / 被系统打断就不算。
//
// [WHY 提到 L0] 2026-11-20 审计（issue IKWNJO）：两处长按，判定语义不同。
// gantt 用欧氏距离（`dx²+dy² > 8²`）、MCard 用矩形（`|dx|>10 || |dy|>10`）——
// 同一台手机上按住同一个位置往斜着挪，两处的「还算不算长按」结论不同。
// 而 gantt 那份**本来就写成了可复用类**（纯状态机、不吃宿主引用、pointercancel 复位），
// 回收成本几乎为零 —— 这种「已经具备原语形状却留在 L2」的东西，留着就会长第二份。
//
// 两件比计时本身更容易出错的事：
//
// ① **`pointercancel` 而不是 `pointerup`**。触屏上按住后滑动列表，浏览器发的是
//    cancel —— 不接它，计时器会继续跑到时长，在滚动途中弹出上下文菜单。
// ② **长按期间要吃掉 `contextmenu`**。桌面端按住右键超过时长时，浏览器的原生菜单
//    会紧跟着冒出来，与自定义菜单叠成两个。两处实现都没有处理这一条（gantt 靠
//    「触屏才用这个类」回避掉了，而那个分工该由原语表达）。
//
// 不做的事：不判断「该不该长按」（命中什么元素、是否可交互）—— 那是宿主的领域规则。
// 这里只管「这一次按下是不是长按」，坐标原样回传，宿主自己去找命中元素。
// See: wiki/reference/component-implementation-standard.md

/** 与系统长按一致（iOS / Android 都是 500ms 左右）。 */
export const LONG_PRESS_DELAY_MS = 500;
/** 移动容忍（px，欧氏距离）。手指抖动一般 3~8px。 */
export const LONG_PRESS_MOVE_TOLERANCE = 8;

export interface LongPressOptions {
  /**
   * 判定时长，缺省 500（与系统一致）。
   *
   * [WHY 允许各场景不同] 「500 是长按」不等于「每个场景都该 500」。卡片上的长按会抢先于
   * 滚动与点击，MCard 用 800 是刻意的（`按住准备滚动` 不该被当成操作）。
   * 统一的是**判定语义**（欧氏距离、cancel、contextmenu），不是这一个数字。
   */
  delayMs?: number;
  /** 移动容忍（px），缺省 8，欧氏距离。 */
  moveTolerance?: number;
  /** 到时长且没移动：给的是按下时的坐标，宿主据此找命中元素。 */
  onLongPress: (x: number, y: number) => void;
  /** 被取消（移动 / 抬起 / pointercancel）。宿主若已进入「按下态」，在这里退回去。 */
  onCancel?: () => void;
}

export class LongPressController {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _pos: { x: number; y: number } | null = null;
  /** 三个 pointer 监听（移动 / 抬起 / 打断）是否已挂。 */
  private _boundPointer = false;
  /** `contextmenu` 监听是否已挂。它比 pointer 那三个活得久 —— 见 `destroy()`。 */
  private _boundContext = false;
  private _fired = false;
  private _opts: LongPressOptions;

  constructor(opts: LongPressOptions) {
    this._opts = opts;
  }

  /** 本轮是否已经触发过长按（`pointerup` 据此决定「这次不算点击」）。 */
  get fired(): boolean {
    return this._fired;
  }

  /** 指针按下：记录起点、开始计时。重复调用会先取消上一轮。 */
  arm(x: number, y: number): void {
    this.cancel();
    this._fired = false;
    this._pos = { x, y };
    if (!this._boundPointer) {
      this._boundPointer = true;
      // 挂在 window 上：手指移出元素后仍要能判定移动与抬起（元素上的监听会漏）
      window.addEventListener("pointermove", this._onMove);
      window.addEventListener("pointerup", this._onEnd);
      window.addEventListener("pointercancel", this._onEnd);
    }
    if (!this._boundContext) {
      this._boundContext = true;
      // capture 阶段：赶在宿主自己的 contextmenu 处理之前决定要不要吃掉。
      //
      // [WHY 它不能跟 pointer 那三个一起解绑] 桌面端的触发顺序是
      // `pointerdown → (按住到时长) → pointerup → contextmenu` —— 也就是说
      // 我们要拦的那个菜单在 `pointerup` **之后**才来。cancel() 在 pointerup 里被调用，
      // 顺手把它摘掉的话，「吃掉原生菜单」这条永远不生效（第一版就是这样，
      // 用例「长按已触发时吃掉 contextmenu」当场红）。
      // 它只由 `destroy()` 摘；判定看 `_fired`，下一轮 arm 会重置。
      window.addEventListener("contextmenu", this._onContextMenu, true);
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      this._fired = true;
      // 用 cancel 收尾（它不重置 fired）：解绑监听、清起点，之后这一轮不再响应移动
      this.cancel();
      this._opts.onLongPress(x, y);
    }, this._opts.delayMs ?? LONG_PRESS_DELAY_MS);
  }

  /**
   * 取消本轮（抬起 / 移动超阈值 / 元素卸载）。
   *
   * 幂等。**不重置 `fired`** —— 调用方常在 `pointerup` 里「先读 fired 再 cancel」，
   * 重置会让那次读取永远拿到 false（症状：长按之后仍然进详情页）。
   * 下一轮 `arm()` 会重置。
   */
  cancel(): void {
    if (this._timer != null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._pos = null;
    this._unbindPointer();
  }

  /** 彻底销毁：取消本轮、清掉 fired、摘掉全部监听。元素卸载时用。 */
  destroy(): void {
    this.cancel();
    this._fired = false;
    if (this._boundContext) {
      this._boundContext = false;
      window.removeEventListener("contextmenu", this._onContextMenu, true);
    }
  }

  private _unbindPointer(): void {
    if (!this._boundPointer) return;
    this._boundPointer = false;
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onEnd);
    window.removeEventListener("pointercancel", this._onEnd);
  }

  private readonly _onMove = (e: PointerEvent): void => {
    if (!this._pos) return;
    const dx = e.clientX - this._pos.x;
    const dy = e.clientY - this._pos.y;
    const limit = this._opts.moveTolerance ?? LONG_PRESS_MOVE_TOLERANCE;
    // 欧氏距离：斜着挪与横着挪是同一回事。矩形判据（|dx|>t || |dy|>t）在 45° 方向上
    // 只要挪到 (t, t) 就取消，而实际位移已经是 t√2 —— 两处实现当年就是在这里分的岔。
    if (dx * dx + dy * dy > limit * limit) {
      this.cancel();
      this._opts.onCancel?.();
    }
  };

  private readonly _onEnd = (): void => {
    const wasFiring = this._timer !== null;
    this.cancel();
    if (wasFiring) this._opts.onCancel?.();
  };

  /**
   * 长按已触发时吃掉**浏览器原生的**右键菜单。
   *
   * 两个判据缺一不可：
   * 1. `_fired` —— 只吃「触发过的那一次」。快速右键点击（按下就抬起）在 `arm` 后立刻被
   *    `_onEnd` 取消，`_fired` 仍是 false，原生菜单照常出现。
   * 2. `e.isTrusted` —— 只吃浏览器自己发的那个。**代码合成的不吃**：gantt 的长按实现是
   *    「长按 → 在命中元素上合成一个 contextmenu → 冒泡进主链路」，那个事件正是长按要的
   *    结果本身。第一版没有这条判据，于是在 window 的 capture 阶段把自己家合成的事件
   *    `stopPropagation` 掉了 —— 表现是「长按完全没反应」，而原语看起来工作正常。
   *
   * [测不到的那一半] jsdom / happy-dom 里 `isTrusted` 恒为 false（真实浏览器里原生事件才是
   * true），所以「吃原生菜单」这条只能真机验证；单测守的是「合成事件必须放行」。
   */
  private readonly _onContextMenu = (e: Event): void => {
    if (!this._fired) return;
    if (!e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
  };
}

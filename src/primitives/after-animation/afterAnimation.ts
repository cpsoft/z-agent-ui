// 「这段动效演完了」—— 一次性的动画结束等待，外加高度折叠的三态编排。
//
// [WHY 提到 L0] 2026-11-20 审计（issue IKWNJN）：同一件事在库里被写了五遍，而
// 其中**四处都没带上 L0 已经写下的那条结论**。`primitives/overlay/dialogState.ts`
// 文件头第 11 行早就记着「退场动画的 animationend 需校验 target，防槽内容自身动画误触发
// （findings F2）」，而 accordion-item / m-collapse / tree-node / property-group
// 这四处**都没有这一句**。
//
// 缺它的后果不是「动画不好看」，是数据看着不对：子树里任何一层过渡结束都会触发收尾，
// 于是 `maxHeight` 被提前清成 `""`（改为内容自适应），正在跑的展开/收起当场跳变。
// 表现是「偶发、刷不出来、换个数据就好了」—— 而这类 bug 在有内容插入的容器里**必然出现**
// （树节点展开时子节点自己也在过渡、属性面板里嵌着下拉动画）。
//
// 四件事收成一份（issue IKWNJN 的建议，逐条对应下面的实现）：
//   ① `targetOnly`（缺省开）：只在 `e.target === el` 时才回调；
//   ② `fallbackMs`：`prefers-reduced-motion` 把动画关掉、或元素在动画中途被移出文档时，
//      事件永远不会来 —— 必须兜底，否则收尾逻辑一次都不跑；
//   ③ `once` + 自动移除：五处现在都靠闭包里自移，写漏一行就是监听泄漏；
//   ④ 高度三态 `from → to → auto`，包含那次强制回流。
//
// [WHY 还要筛 `property`] 比 target 更细的一层。同一个元素上，`max-height` 与 `opacity`
// 可能时长不同（tree-node 就是两条一起走）；只按 target 筛，先结束的那个属性就会把
// `max-height` 清掉 —— 动画看着「跳到最后」。所以默认只认调用方指定的那个属性。
//
// [WHY 也听 cancel 事件] 过渡被打断时浏览器只发 `transitioncancel`，不发 `transitionend`。
// 不接它，这条等待永远不结算：调用方等不到收尾，`maxHeight` 停在 px 值上 ——
// 那一刻之后内容一变长就被裁。宁可「当作演完了」跑收尾，也不要挂住。

/** 等的是哪种动效结束。`MPicker` / `MActionSheet` / Toast 用 animation，其余用 transition。 */
export type AnimationKind = "transition" | "animation";

export interface AfterAnimationOptions {
  /** 缺省 `transition`。 */
  kind?: AnimationKind;
  /**
   * 只认元素自己的事件，缺省 **true**。
   *
   * 关掉只在「确实想等子树里某一个动画」时用，且那种场景通常该直接等那个子元素。
   */
  targetOnly?: boolean;
  /**
   * 只认这个属性（`max-height`）或这个动画名。
   *
   * 不写 = 任何一个先结束的都算 —— 只在「整段动效只有一个属性」时才对。
   */
  property?: string;
  /**
   * 兜底毫秒数，缺省 400。
   *
   * [WHY 400 而不是 250] 本库的 `--z-transition-normal` 是 250ms。兜底若等长或更短，
   * 它会先于 `transitionend` 触发，收尾抢在动画前面跑 —— 现象与「漏 target 校验」一样
   * （动画被提前掐断），但更难查：因为代码看起来「有兜底、很稳」。
   * 传 0 = 不兜底（只在确实不需要时用）。
   */
  fallbackMs?: number;
}

/** 强制回流：让 `transition: none → ""` 或 `0 → Npx` 的切换真正生效。 */
export function forceReflow(el: Element): void {
  // 读一次布局属性即可。`void` 是为了让 lint 知道这是有意的副作用。
  void (el as HTMLElement).offsetHeight;
}

/**
 * 这段动效演完时调用 `cb`，返回取消函数。
 *
 * [WHY 主形态是同步回调，而不是 Promise] 五个调用方全是「演完了就收尾」——
 * 没有一个是 await 的。做成 Promise 会把收尾排进微任务，于是
 * `animationend` 派发之后、收尾跑之前多了一个空档：模态框的 `closing` 仍为 true、
 * 折叠面板的 `maxHeight` 仍是 px 值。测试里同步断言当场失败（DialogState.test 就是），
 * 真机上则是「多等一个微任务」—— 没人需要这份延迟，所以不给。
 *
 * `afterAnimation` 那份 Promise 包装是给「确实要 await」的新场景留的，两者同源。
 *
 * `fired` 的语义：`true` = 真的事件抵达；`false` = 兜底触发 / 被打断 / 元素为空。
 */
export function onAnimationEnd(
  el: Element | null | undefined,
  cb: (fired: boolean) => void,
  opts: AfterAnimationOptions = {},
): () => void {
  const kind = opts.kind ?? "transition";
  const evt = kind === "animation" ? "animationend" : "transitionend";
  const cancelEvt = kind === "animation" ? "animationcancel" : "transitioncancel";
  const targetOnly = opts.targetOnly !== false;
  const fallbackMs = opts.fallbackMs ?? 400;
  if (!el) {
    cb(false);
    return () => {};
  }

  let done = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finish = (fired: boolean): void => {
    if (done) return;
    done = true;
    el.removeEventListener(evt, onEvent);
    el.removeEventListener(cancelEvt, onCancel);
    if (timer !== null) clearTimeout(timer);
    cb(fired);
  };

  const nameOf = (e: Event): string => {
    if (kind === "animation") return (e as AnimationEvent).animationName ?? "";
    return (e as TransitionEvent).propertyName ?? "";
  };

  function onEvent(e: Event): void {
    if (targetOnly && e.target !== el) return;
    if (opts.property && nameOf(e) !== opts.property) return;
    finish(true);
  }

  function onCancel(e: Event): void {
    if (targetOnly && e.target !== el) return;
    // 不筛 property：取消就是取消，不论哪个属性先被打断，这段动效都已经不在演了
    finish(false);
  }

  el.addEventListener(evt, onEvent);
  el.addEventListener(cancelEvt, onCancel);
  if (fallbackMs > 0) timer = setTimeout(() => finish(false), fallbackMs);

  /** 主动放弃等待（元素要销毁、或状态已被新一轮取代）。不会调用 `cb`。 */
  return () => {
    if (done) return;
    done = true;
    el.removeEventListener(evt, onEvent);
    el.removeEventListener(cancelEvt, onCancel);
    if (timer !== null) clearTimeout(timer);
  };
}

/**
 * `onAnimationEnd` 的 Promise 形态。给「确实要 await」的场景。
 *
 * 注意它**多一个微任务**：上面那段 [WHY] 说明了为什么默认形态不是它。
 */
export function afterAnimation(
  el: Element | null | undefined,
  opts: AfterAnimationOptions = {},
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    onAnimationEnd(el, resolve, opts);
  });
}

export interface CollapseTweenOptions {
  /** 兜底毫秒数，透传给 `afterAnimation`。 */
  fallbackMs?: number;
}

/**
 * 高度折叠的三态编排：`from → to → auto`。
 *
 * [WHY 是个实例而不是一个函数] 收起动画的起点**不是**当前的 `max-height` —— 展开结束后
 * 它被清成了 `""`（让内容自适应，否则内容变长会被裁）。所以起点只能靠「上一次展开到多少」
 * 记着。三处组件各自写过这个字段（`_prevOpen` / `_prevExpanded` / `_closeHeight`），
 * 且都要在 `willUpdate` 里抢在重渲染前量一次（重渲染会换掉内容 DOM，之后量不到）。
 *
 * 用法是固定的两段式：
 *
 * ```ts
 * willUpdate() { tween.willCollapse(this.open, () => body.scrollHeight + 20); }
 * updated()    { tween.apply(content, this.open, () => body.scrollHeight + 20, { … }); }
 * ```
 *
 * [WHY 元素按次传入，而不是构造时绑死] 这几个组件每次重渲染都会换掉内容 DOM
 * （`innerHTML` 替换）。构造时绑一个，第二次渲染之后就作用在已销毁的元素上 ——
 * 动画不会播，而 `style` 写进了一个不在文档里的节点，看起来「什么都没发生」。
 */
export class CollapseTween {
  private _fallbackMs: number;
  /** 上一次已知的展开高度（px）。收起动画从这里出发。 */
  private _openHeight = 0;
  /** 上一次同步后的展开态。 */
  private _open = false;
  /** 每次播放递增。在飞的收尾看到 token 变了就闭嘴 —— 见 `_bump`。 */
  private _token = 0;

  constructor(opts: CollapseTweenOptions = {}) {
    this._fallbackMs = opts.fallbackMs ?? 400;
  }

  /** 上一次同步后的展开态。 */
  get open(): boolean {
    return this._open;
  }

  /** 上一次已知的展开高度（px）；没展开过是 0。 */
  get openHeight(): number {
    return this._openHeight;
  }

  /**
   * 只记状态，**不碰 DOM**。
   *
   * 给「首帧跳过动画」的场景用（property-group）：那一帧的 `scrollHeight` 不可信
   * （插槽子元素还没布局），绝对写不得内联高度 —— 写了会把展开高度永久卡死，
   * 内容被裁。见 wiki/bugs/bug-20260811-group-first-render-truncation.md。
   *
   * 不必担心「高度没记下来，之后收起会没动画」：`willCollapse` 在收起前会重新量一次。
   */
  syncState(open: boolean): void {
    this._bump();
    this._open = open;
    this._openHeight = 0;
  }

  /**
   * 渲染**之前**调用：若这次渲染是从展开变收起，就把当前内容高度记下来。
   *
   * 必须在重渲染前量 —— 重渲染会替换内容 DOM，`scrollHeight` 归零，收起动画
   * 就成了「从 0 到 0」：面板瞬间消失，而代码看起来是在播动画。
   *
   * @returns 是否捕获到了高度（供调用方判断「这次是收起动画」）
   */
  willCollapse(nextOpen: boolean, measure: () => number): boolean {
    if (!this._open || nextOpen) return false;
    this._openHeight = measure();
    return true;
  }

  /**
   * 渲染**之后**调用：按目标态播放。
   *
   * `animate: false` 用于首帧与降级 —— 直接到终态，不播动画，但仍记下状态
   * （否则下一次收起会「从没展开过」处理，直接跳到 0）。
   */
  apply(
    content: HTMLElement,
    open: boolean,
    measure: () => number,
    opts: { animate?: boolean; onExpanded?: (px: number) => void } = {},
  ): void {
    const c = content;
    const had = this._open;
    this._open = open;

    if (opts.animate === false) {
      this._bump(); // 作废在飞的收尾：它会把下面写好的终态又清一次
      this._openHeight = open ? measure() : 0;
      c.style.transition = "";
      c.style.maxHeight = open ? "" : "0";
      return;
    }

    if (open) {
      const px = measure();
      this._openHeight = px;
      // 从 0 出发，才会有「展开」这个观感；直接写目标高度是瞬间出现
      c.style.maxHeight = "0";
      forceReflow(c);
      c.style.maxHeight = `${px}px`;
      const token = this._bump();
      onAnimationEnd(c, () => {
        // 期间又开/收过一次：那次调用负责收尾，这里再清一次会把它的终态抹掉
        if (token !== this._token) return;
        // 动画结束后清掉，让内容自适应 —— 不清的话内容变长（子表加行、备注变多行）会被裁
        c.style.maxHeight = "";
        opts.onExpanded?.(px);
      }, { property: "max-height", fallbackMs: this._fallbackMs });
      return;
    }

    if (!had) {
      // 本来就没展开：没有「收起」这回事，直接到终态
      this._bump();
      c.style.maxHeight = "0";
      return;
    }

    // 收起：起点是记录下来的高度，不是当前 max-height（它可能是 ""）
    const from = this._openHeight;
    c.style.transition = "none";
    c.style.maxHeight = from ? `${from}px` : "0";
    forceReflow(c);
    c.style.transition = "";
    c.style.maxHeight = "0";
    // [WHY 收起也要 bump] 展开的收尾可能还在飞（250ms 的过渡没跑完就点了收起）：
    // 它若照常跑，会把刚写的 `maxHeight = "0"` 清成 `""` —— 收起当场失效，面板又展开。
    this._bump();
  }

  private _bump(): number {
    this._token += 1;
    return this._token;
  }
}

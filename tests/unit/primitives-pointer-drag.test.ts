import { describe, expect, it, vi } from "vitest";
import {
  DRAG_THRESHOLD,
  PointerDragSession,
  type PointerDragDelta,
} from "../../src/primitives/pointer-drag/index.js";

// happy-dom 的 PointerEvent 构造会丢掉坐标与 pointerId，需 defineProperty 补
function pe(type: string, x = 0, y = 0, extra: Record<string, unknown> = {}): PointerEvent {
  const e = new PointerEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clientX", { value: x, configurable: true });
  Object.defineProperty(e, "clientY", { value: y, configurable: true });
  Object.defineProperty(e, "pointerId", { value: 1, configurable: true });
  for (const [k, v] of Object.entries(extra)) {
    Object.defineProperty(e, k, { value: v, configurable: true });
  }
  return e;
}

/** 建一个收集回调的会话；返回 { session, moves, ends, cancels }。 */
function make(opts: Parameters<typeof PointerDragSession.prototype.constructor>[1] = {}) {
  const moves: PointerDragDelta[] = [];
  const ends: PointerDragDelta[] = [];
  const cancels: number[] = [];
  const session = new PointerDragSession(
    {
      onMove: (d) => moves.push(d),
      onEnd: (d) => ends.push(d),
      onCancel: () => cancels.push(1),
    },
    opts,
  );
  return { session, moves, ends, cancels };
}

function down(x: number, y: number): PointerEvent {
  return pe("pointerdown", x, y);
}
function move(x: number, y: number): void {
  window.dispatchEvent(pe("pointermove", x, y));
}
function up(x: number, y: number): void {
  window.dispatchEvent(pe("pointerup", x, y));
}

describe("PointerDragSession", () => {
  it("阈值以内不算拖动，越过才算（欧氏距离）", () => {
    const { session, moves } = make();
    session.begin(down(0, 0));
    // (2,2) 的欧氏距离 2.83 < 3：斜着挪两个像素不该算拖
    move(2, 2);
    expect(moves.at(-1)?.moved).toBe(false);
    // 恰好等于阈值仍不算（口径是「超过」），越过一格才算
    move(3, 0);
    expect(moves.at(-1)?.moved).toBe(false);
    move(4, 0);
    expect(moves.at(-1)?.moved).toBe(true);
    session.abort();
  });

  // 变异：把 hypot 换成「分轴各自判 > 阈值」⇒ 上面 (2,2) 那条会变成 moved
  it("默认阈值是 3px", () => {
    expect(DRAG_THRESHOLD).toBe(3);
  });

  // 变异：把 hypot 换成「分轴各自判 > 阈值」⇒ 这条红。
  // 挑 (3,3) 是因为两种口径在这里分叉：欧氏 4.24 > 3 算拖，分轴 3 > 3 为假、不算拖。
  // 用 (2,2) 或 (4,0) 都区分不出来 —— 那两个点在两种口径下结论一样，测了等于没测。
  it("斜向位移按欧氏距离判，不按单轴", () => {
    const { session, moves } = make();
    session.begin(down(0, 0));
    move(3, 3);
    expect(moves.at(-1)?.moved).toBe(true);
    session.abort();
  });

  it("每次 move 都回调（未越阈值时也调，宿主用它做按住反馈）", () => {
    const { session, moves } = make();
    session.begin(down(0, 0));
    move(1, 0);
    move(1, 0);
    expect(moves).toHaveLength(2);
    move(20, 0);
    expect(moves).toHaveLength(3);
    expect(moves.at(-1)?.dx).toBe(20);
    session.abort();
  });

  it("松手走 onEnd，带上最终位移与 moved", () => {
    const { session, ends } = make();
    session.begin(down(100, 100));
    move(140, 120);
    up(140, 120);
    expect(ends).toHaveLength(1);
    expect(ends[0].dx).toBe(40);
    expect(ends[0].dy).toBe(20);
    expect(ends[0].moved).toBe(true);
  });

  it("没动就松手 = 点击（moved=false）", () => {
    const { session, ends } = make();
    session.begin(down(10, 10));
    up(10, 10);
    expect(ends[0].moved).toBe(false);
  });

  // 触屏按住后一滚列表，浏览器发 cancel 而不是 up
  it("pointercancel 走 onCancel，不调 onEnd", () => {
    const { session, ends, cancels } = make();
    session.begin(down(0, 0));
    move(50, 0);
    window.dispatchEvent(pe("pointercancel", 50, 0));
    expect(cancels).toHaveLength(1);
    expect(ends).toHaveLength(0);
    expect(session.active).toBe(false);
  });

  it("Esc 中止本次拖拽", () => {
    const { session, ends, cancels } = make();
    session.begin(down(0, 0));
    move(30, 0);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(cancels).toHaveLength(1);
    expect(ends).toHaveLength(0);
  });

  it("escCancel=false 时 Esc 不中止（宿主要自己用 Esc 做别的事）", () => {
    const { session, cancels } = make({ escCancel: false });
    session.begin(down(0, 0));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(cancels).toHaveLength(0);
    session.abort();
  });

  // 变异：_finish 里不摘 pointermove ⇒ 这条红（残留监听会把上一次的会话又推一遍）
  it("结束之后监听全部摘掉，后续 pointermove 不再回调", () => {
    const { session, moves } = make();
    session.begin(down(0, 0));
    up(0, 0);
    const before = moves.length;
    move(100, 100);
    expect(moves).toHaveLength(before);
  });

  // 变异：还原时写成 `= ""` ⇒ 这条红（把别人的 userSelect 冲掉）
  it("user-select 成对还原：回到按下前的值，不是置空", () => {
    document.body.style.userSelect = "text";
    const { session } = make();
    session.begin(down(0, 0));
    expect(document.body.style.userSelect).toBe("none");
    session.abort();
    expect(document.body.style.userSelect).toBe("text");
    document.body.style.userSelect = "";
  });

  it("lockSelection=false 时不动 user-select", () => {
    document.body.style.userSelect = "text";
    const { session } = make({ lockSelection: false });
    session.begin(down(0, 0));
    expect(document.body.style.userSelect).toBe("text");
    session.abort();
    document.body.style.userSelect = "";
  });

  // 浏览器顺序 pointerup → click：不吞的话「拖一行 = 顺手打开一次详情」
  it("真拖动后吞掉紧随的 click", () => {
    const { session } = make();
    session.begin(down(0, 0));
    move(40, 0);
    up(40, 0);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    window.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("只按一下（没拖动）不吞 click", () => {
    const { session } = make();
    session.begin(down(0, 0));
    up(0, 0);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    window.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it("suppressClick=false 时不拦 click", () => {
    const { session } = make({ suppressClick: false });
    session.begin(down(0, 0));
    move(40, 0);
    up(40, 0);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    window.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  // 拖到窗口外松手时浏览器不发 click，残留的 once 监听会吞掉下一次正常点击
  it("没有 click 跟进来时，吞 click 的监听会被清掉", () => {
    vi.useFakeTimers();
    const { session } = make();
    session.begin(down(0, 0));
    move(40, 0);
    up(40, 0);
    vi.runAllTimers();
    const later = new MouseEvent("click", { bubbles: true, cancelable: true });
    window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
    vi.useRealTimers();
  });

  it("传了 captureTarget 才捕获指针", () => {
    const el = document.createElement("div");
    const capture = vi.fn();
    const release = vi.fn();
    (el as unknown as { setPointerCapture: unknown }).setPointerCapture = capture;
    (el as unknown as { releasePointerCapture: unknown }).releasePointerCapture = release;
    const { session } = make({ captureTarget: el });
    session.begin(down(0, 0));
    expect(capture).toHaveBeenCalledWith(1);
    session.abort();
    expect(release).toHaveBeenCalledWith(1);
  });

  it("没传 captureTarget 就不碰指针捕获（避免改事件 target 破坏落点解析）", () => {
    const el = document.createElement("div");
    const capture = vi.fn();
    (el as unknown as { setPointerCapture: unknown }).setPointerCapture = capture;
    const { session } = make();
    const e = down(0, 0);
    Object.defineProperty(e, "target", { value: el, configurable: true });
    session.begin(e);
    expect(capture).not.toHaveBeenCalled();
    session.abort();
  });

  it("abort 幂等：重复调用只报一次 cancel", () => {
    const { session, cancels } = make();
    session.begin(down(0, 0));
    session.abort();
    session.abort();
    expect(cancels).toHaveLength(1);
  });
});

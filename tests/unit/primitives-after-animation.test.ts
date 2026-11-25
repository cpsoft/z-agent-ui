// L0「这段动效演完了」原语（issue IKWNJN）。
//
// [WHY 这组用例的重点不是「回调会跑」] 五处手写实现都能在正常路径上跑通 ——
// 出问题的是**不该跑的时候跑了**：子树里别的过渡结束、同一元素上另一个属性先结束、
// 连点两下时上一轮的收尾把这一轮的状态抹掉。这三条都不会报错，只表现为
// 「动画偶尔跳一下」。所以每条用例都成对写：该触发的必须触发，不该触发的必须不触发。
import { afterEach, describe, expect, it } from "vitest";
import {
  afterAnimation,
  CollapseTween,
  forceReflow,
} from "../../src/primitives/after-animation/index.js";

const mounted: HTMLElement[] = [];

function box(inner = ""): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = inner;
  document.body.append(el);
  mounted.push(el);
  return el;
}

afterEach(() => {
  for (const el of mounted.splice(0)) el.remove();
});

/** 派一个过渡结束事件。`target` 决定 `e.target` 是谁（子树场景靠它）。 */
function fire(el: Element, kind = "transitionend", property = "max-height", target?: Element): void {
  const e = new Event(kind, { bubbles: true });
  Object.defineProperty(e, "propertyName", { value: property });
  Object.defineProperty(e, "animationName", { value: property });
  (target ?? el).dispatchEvent(e);
}

/** 让微任务跑完（Promise.then 的回调排在微任务里）。 */
function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe("afterAnimation：只认自己那一下", () => {
  it("子树里的过渡结束不算（缺省 targetOnly）", async () => {
    const el = box(`<span></span>`);
    const child = el.firstElementChild!;
    let settled = false;
    const p = afterAnimation(el, { fallbackMs: 0 }).then((fired) => {
      settled = true;
      return fired;
    });
    fire(el, "transitionend", "max-height", child);
    await flush();
    expect(settled).toBe(false);
    // 自己那一下才算
    fire(el, "transitionend", "max-height");
    expect(await p).toBe(true);
  });

  it("targetOnly: false 时子树结束也算", async () => {
    const el = box(`<span></span>`);
    const child = el.firstElementChild!;
    const p = afterAnimation(el, { targetOnly: false, fallbackMs: 0 });
    fire(el, "transitionend", "max-height", child);
    expect(await p).toBe(true);
  });

  it("同名元素上的另一个属性结束不算", async () => {
    const el = box();
    let settled = false;
    const p = afterAnimation(el, { property: "max-height", fallbackMs: 0 }).then((fired) => {
      settled = true;
      return fired;
    });
    // opacity 先结束（真机上两条时长经常不一样）：高度还在跑，不能当作演完
    fire(el, "transitionend", "opacity");
    await flush();
    expect(settled).toBe(false);
    fire(el, "transitionend", "max-height");
    expect(await p).toBe(true);
  });

  it("不写 property 时任何一个属性结束都算", async () => {
    const el = box();
    const p = afterAnimation(el, { fallbackMs: 0 });
    fire(el, "transitionend", "opacity");
    expect(await p).toBe(true);
  });

  it("事件一直不来时按兜底结算，且返回 false（能区分「准时」与「兜底」）", async () => {
    const el = box();
    const t0 = Date.now();
    const fired = await afterAnimation(el, { fallbackMs: 30 });
    expect(fired).toBe(false);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(25);
  });

  it("过渡被打断（cancel）也结算 —— 否则调用方永远等不到收尾", async () => {
    const el = box();
    const p = afterAnimation(el, { fallbackMs: 0 });
    fire(el, "transitioncancel", "max-height");
    expect(await p).toBe(false);
  });

  it("kind=animation 听的是 animationend", async () => {
    const el = box();
    let settled = false;
    const p = afterAnimation(el, { kind: "animation", fallbackMs: 0 }).then((fired) => {
      settled = true;
      return fired;
    });
    // 过渡事件不该结算动画的那一条
    fire(el, "transitionend", "max-height");
    await flush();
    expect(settled).toBe(false);
    fire(el, "animationend", "z-modal-out");
    expect(await p).toBe(true);
  });

  it("元素为空时立即结算，不挂空监听", async () => {
    expect(await afterAnimation(null)).toBe(false);
  });

  it("结算后监听被摘掉（再来一次事件不会再触发一遍）", async () => {
    const el = box();
    let count = 0;
    void afterAnimation(el, { fallbackMs: 0 }).then(() => {
      count += 1;
    });
    fire(el, "transitionend", "max-height");
    await flush();
    fire(el, "transitionend", "max-height");
    await flush();
    expect(count).toBe(1);
  });

  it("forceReflow 读一次布局（有副作用但不改变样式）", () => {
    const el = box();
    el.style.maxHeight = "10px";
    forceReflow(el);
    expect(el.style.maxHeight).toBe("10px");
  });
});

describe("CollapseTween：高度三态 from → to → auto", () => {
  it("展开：0 → 目标高度 → 动画结束后清成自适应", async () => {
    const el = box();
    const t = new CollapseTween({ fallbackMs: 0 });
    t.apply(el, true, () => 120);
    // 起手是 0（不然看不出「展开」这个动作），然后到目标
    expect(el.style.maxHeight).toBe("120px");
    expect(t.open).toBe(true);
    fire(el, "transitionend", "max-height");
    await flush();
    // 清成 "" 让内容自适应：内容再变长（子表加行）才不会被裁
    expect(el.style.maxHeight).toBe("");
  });

  it("展开结束回调拿到实测高度（供写 CSS 变量）", async () => {
    const el = box();
    const got: number[] = [];
    const t = new CollapseTween({ fallbackMs: 0 });
    t.apply(el, true, () => 88, { onExpanded: (px) => got.push(px) });
    fire(el, "transitionend", "max-height");
    await flush();
    expect(got).toEqual([88]);
  });

  it("收起：记下过展开高度，终态归 0", async () => {
    const el = box();
    const t = new CollapseTween({ fallbackMs: 0 });
    t.apply(el, true, () => 150);
    fire(el, "transitionend", "max-height");
    await flush();
    expect(el.style.maxHeight).toBe(""); // 展开后已清空

    // [测不到的那一半] jsdom 里连续赋值 style 会被合并，看不到「先写 150px 再写 0」
    // 这个中间态 —— 也就是说「起点真的用了记录高度」无法在这里断言。
    // 可断言的是「记录下来了」：没这一步，收起的起点就是 0，视觉上「瞬间消失」。
    expect(t.openHeight).toBe(150);
    t.apply(el, false, () => 0);
    expect(t.open).toBe(false);
    expect(el.style.maxHeight).toBe("0");
  });

  it("收起前不记录高度 ⇒ 起点是 0（这一条证明上一条的记录不是白记）", () => {
    const el = box();
    const t = new CollapseTween();
    // 从没 apply 过展开：openHeight 是 0，收起没有可用的起点
    expect(t.openHeight).toBe(0);
    t.apply(el, false, () => 0);
    expect(el.style.maxHeight).toBe("0");
  });

  it("没展开过就收起：直接到 0，不播动画", () => {
    const el = box();
    const t = new CollapseTween();
    t.apply(el, false, () => 0);
    expect(el.style.maxHeight).toBe("0");
  });

  it("连续展开两次：第一轮在飞的收尾不会把第二轮的高度抹掉", async () => {
    const el = box();
    const t = new CollapseTween({ fallbackMs: 0 });
    t.apply(el, true, () => 100);
    // 第一轮还没结束就再来一次（数据刷新导致的重渲染）
    t.apply(el, true, () => 240);
    expect(el.style.maxHeight).toBe("240px");
    fire(el, "transitionend", "max-height");
    await flush();
    // 只应有一次收尾把它清成 "" —— 若两轮都跑，这里会看到「第一轮把第二轮清掉」
    expect(el.style.maxHeight).toBe("");
  });

  it("展开途中点收起：展开的收尾不会把 maxHeight=0 清成自适应", async () => {
    const el = box();
    const t = new CollapseTween({ fallbackMs: 0 });
    t.apply(el, true, () => 200);
    t.apply(el, false, () => 0); // 250ms 的展开还没跑完就点了收起
    expect(el.style.maxHeight).toBe("0");
    // 展开那一轮的 transitionend 此刻才到（它已经作废了）
    fire(el, "transitionend", "max-height");
    await flush();
    // 若作废逻辑失效，这里会变成 ""（面板又展开）—— 收起当场失效
    expect(el.style.maxHeight).toBe("0");
  });

  it("willCollapse：展开变收起时记下高度，其余情况不记", () => {
    const el = box();
    const t = new CollapseTween();
    // 从没展开过
    expect(t.willCollapse(false, () => 99)).toBe(false);
    t.apply(el, true, () => 77);
    // 展开 → 仍展开：不记
    expect(t.willCollapse(true, () => 5)).toBe(false);
    // 展开 → 收起：记
    expect(t.willCollapse(false, () => 88)).toBe(true);
    expect(t.openHeight).toBe(88);
  });

  it("animate:false 直接到终态（首帧 / 降级）", () => {
    const el = box();
    const t = new CollapseTween();
    t.apply(el, true, () => 60, { animate: false });
    expect(el.style.maxHeight).toBe("");
    expect(t.open).toBe(true);
    t.apply(el, false, () => 0, { animate: false });
    expect(el.style.maxHeight).toBe("0");
  });

  it("syncState 只记状态、不碰 DOM（首帧不许写内联高度）", () => {
    const el = box();
    const t = new CollapseTween();
    // [WHY 先置成「收起」再 sync(true)] 若先 apply(true)，`_open` 本来就是 true ——
    // 变异掉 syncState 的状态写入，断言依然绿（我第一版就是这样，变异验证才抓到）。
    // 必须让「改之前」与「改之后」不同，这条断言才有牙齿。
    t.apply(el, false, () => 0);
    expect(t.open).toBe(false);
    el.style.maxHeight = "11px"; // 假装 CSS 里已有兜底值

    t.syncState(true);
    expect(t.open).toBe(true);
    // 一个字节都没改 —— 首帧写内联会把高度永久卡死（bug-20260811）
    expect(el.style.maxHeight).toBe("11px");
  });
});

// 容器 / 分组 / 标签页（M8）纯逻辑测试。
//
// 断言纪律：坐标类期望一律写死数字（含 rect 的字面量），不用被测函数反推 rect。
import { describe, expect, it } from "vitest";
import type { ReportCellLayout, ReportContainer } from "../../src/report/core/types.js";
import {
  activeTabOf,
  autoHeight,
  canNestInto,
  childrenInTab,
  childrenOf,
  contentRectOf,
  contentRows,
  flowOrder,
  heightDrift,
  hitContainer,
  intoContainer,
  isRootItem,
  normalizeHeights,
  outOfContainer,
  planTabRemoval,
  releaseContainer,
  rootItems,
  tabOfItem,
  tabRemovalEffect,
  toLocal,
} from "../../src/report/core/report-container.js";

const L = (x: number, y: number, w: number, h: number, parentId?: string, tabId?: string): ReportCellLayout => ({
  x,
  y,
  w,
  h,
  ...(parentId ? { parentId } : {}),
  ...(tabId ? { tabId } : {}),
});

const CT = (id: string, variant: ReportContainer["variant"], layout: ReportCellLayout, tabs?: string[]): ReportContainer => ({
  id,
  variant,
  title: id,
  layout,
  ...(tabs ? { tabs: tabs.map((t) => ({ id: t, title: t.toUpperCase() })) } : {}),
});

describe("归属：parentId 与回落", () => {
  const containers = [CT("ct-1", "card", L(0, 10, 12, 6)), CT("ct-2", "card", L(0, 20, 12, 6))];
  const items = [
    { id: "a", layout: L(0, 0, 6, 3) },
    { id: "b", layout: L(0, 0, 6, 3, "ct-1") },
    { id: "c", layout: L(6, 0, 6, 3, "ct-1") },
    { id: "d", layout: L(0, 0, 6, 3, "ct-2") },
  ];

  it("子卡按 parentId 归到容器", () => {
    expect(childrenOf(items, containers, "ct-1").map((i) => i.id)).toEqual(["b", "c"]);
    expect(childrenOf(items, containers, "ct-2").map((i) => i.id)).toEqual(["d"]);
  });

  it("根层 = parentId 为空", () => {
    expect(rootItems(items, containers).map((i) => i.id)).toEqual(["a"]);
    expect(isRootItem(containers, items[0])).toBe(true);
    expect(isRootItem(containers, items[1])).toBe(false);
  });

  it("parentId 指向已删容器 → 回落根层，卡片不会消失", () => {
    const orphan = [{ id: "z", layout: L(2, 2, 4, 2, "ct-gone") }];
    expect(rootItems(orphan, containers).map((i) => i.id)).toEqual(["z"]);
    expect(childrenOf(orphan, containers, "ct-1")).toEqual([]);
  });

  it("没有容器时全部是根层（存量报表）", () => {
    expect(rootItems(items, undefined).map((i) => i.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("toLocal：屏幕坐标 → 容器内容区逻辑坐标", () => {
  // 内容区：left=100, top=200, width=1000
  // colW(1000,12) = 76，步长 84；行步长 56+8=64
  const rect = { left: 100, top: 200, width: 1000, height: 400 };

  it("左上角为 (0,0)", () => {
    expect(toLocal(rect, 100, 200, 12)).toEqual({ x: 0, y: 0 });
  });

  it("第一格内偏左仍是 0 列", () => {
    expect(toLocal(rect, 130, 200, 12)).toEqual({ x: 0, y: 0 });
  });

  it("跨过半步进下一列（round 吸附）", () => {
    expect(toLocal(rect, 100 + 45, 200, 12)).toEqual({ x: 1, y: 0 });
    expect(toLocal(rect, 100 + 84 * 3, 200, 12)).toEqual({ x: 3, y: 0 });
  });

  it("纵向按行步长 64 吸附", () => {
    expect(toLocal(rect, 100, 200 + 64 * 2, 12)).toEqual({ x: 0, y: 2 });
  });

  it("指针在内容区外时夹在界内（不产生负列/越界列/天外行号）", () => {
    expect(toLocal(rect, 0, 0, 12)).toEqual({ x: 0, y: 0 });
    // 内容区高 400、行步长 64：(400+8)/64 = 6.375 → 最多 6 行
    expect(toLocal(rect, 99999, 99999, 12)).toEqual({ x: 11, y: 6 });
  });

  it("24 列时同一像素位移算出不同列号（密度必须真的生效）", () => {
    // 24 列：colW = (1000-8*23)/24 = 34，步长 42
    expect(toLocal(rect, 100 + 42 * 5, 200, 24)).toEqual({ x: 5, y: 0 });
    // 同样 210px 在 12 列下是 (210/84)=2.5 → 3
    expect(toLocal(rect, 100 + 210, 200, 12)).toEqual({ x: 3, y: 0 });
  });
});

describe("contentRectOf / hitContainer", () => {
  it("内容区 = 外框减去标题一行 + 间距", () => {
    // 外框 top=100 高 300；标题 56 + 间距 8 → 内容区 top=164，高=100+300-164=236
    expect(contentRectOf({ left: 10, top: 100, width: 800, height: 300 })).toEqual({
      left: 10,
      top: 164,
      width: 800,
      height: 236,
    });
  });

  it("容器高度不足时内容区高度不小于 0", () => {
    expect(contentRectOf({ left: 0, top: 0, width: 800, height: 40 }).height).toBe(0);
  });

  it("命中：落在某个内容区内返回其 id", () => {
    const rects = [
      { id: "ct-1", rect: { left: 0, top: 100, width: 400, height: 200 } },
      { id: "ct-2", rect: { left: 500, top: 100, width: 400, height: 200 } },
    ];
    expect(hitContainer(rects, 200, 200)).toBe("ct-1");
    expect(hitContainer(rects, 600, 200)).toBe("ct-2");
    expect(hitContainer(rects, 450, 200)).toBe(null); // 两容器之间的空隙
  });

  it("嵌套时选面积最小的那个（内层优先）", () => {
    const rects = [
      { id: "outer", rect: { left: 0, top: 0, width: 1000, height: 800 } },
      { id: "inner", rect: { left: 100, top: 100, width: 200, height: 200 } },
    ];
    expect(hitContainer(rects, 150, 150)).toBe("inner");
  });
});

describe("高度：自动撑高而不是裁卡", () => {
  it("无子卡时保持存储高度（不小于 2 行）", () => {
    expect(autoHeight(0, 6)).toBe(6);
    expect(autoHeight(0, 1)).toBe(2);
  });

  it("子卡超出时撑高到「标题 1 行 + 子卡行数」", () => {
    expect(autoHeight(3, 3)).toBe(4);
    expect(autoHeight(7, 4)).toBe(8);
  });

  it("存的 h 已经够时不缩小（缩到不可撤销的裁卡前先提示）", () => {
    expect(autoHeight(2, 9)).toBe(9);
  });

  it("heightDrift 表示需要撑高几行", () => {
    expect(heightDrift(3, 4)).toBe(0);
    expect(heightDrift(6, 4)).toBe(3);
    expect(heightDrift(0, 6)).toBe(0);
  });

  it("contentRows 取子卡下边界最大值", () => {
    expect(contentRows([{ id: "a", layout: L(0, 0, 6, 3) }, { id: "b", layout: L(0, 2, 6, 4) }])).toBe(6);
    expect(contentRows([])).toBe(0);
  });
});

describe("嵌套深度上限 2 层", () => {
  it("卡片可以进容器", () => {
    expect(canNestInto(false, "ct-1")).toBe(true);
  });

  it("容器不能进容器（拒绝第 3 层）", () => {
    expect(canNestInto(true, "ct-1")).toBe(false);
  });

  it("任何项都可以回到根层", () => {
    expect(canNestInto(true, null)).toBe(true);
    expect(canNestInto(false, null)).toBe(true);
  });
});

describe("进出容器的坐标改写", () => {
  it("拖入容器：坐标变局部、夹在容器宽度内、带上 parentId", () => {
    const got = intoContainer(L(6, 4, 6, 3), "ct-1", { x: 5, y: 1 }, 12);
    expect(got).toEqual({ x: 5, y: 1, w: 6, h: 3, parentId: "ct-1", tabId: undefined });
  });

  it("拖入容器时 w 超容器宽要被收到容器宽", () => {
    const got = intoContainer(L(0, 0, 12, 3), "ct-1", { x: 0, y: 0 }, 8);
    expect(got.w).toBe(8);
  });

  it("拖入 tabs 容器带上 tabId", () => {
    const got = intoContainer(L(0, 0, 6, 3), "ct-1", { x: 0, y: 0 }, 12, "tab-b");
    expect(got.tabId).toBe("tab-b");
  });

  it("拖出容器：清掉 parentId 与 tabId，坐标换成根层坐标", () => {
    const got = outOfContainer(L(2, 1, 6, 3, "ct-1", "tab-a"), 3, 9);
    expect(got).toEqual({ x: 3, y: 9, w: 6, h: 3, parentId: undefined, tabId: undefined });
  });

  it("拖出容器时根层坐标为负要夹到 0", () => {
    expect(outOfContainer(L(0, 0, 6, 3, "ct-1"), -5, -2)).toEqual({
      x: 0,
      y: 0,
      w: 6,
      h: 3,
      parentId: undefined,
      tabId: undefined,
    });
  });
});

describe("标签页", () => {
  const tabs = CT("ct-t", "tabs", L(0, 0, 12, 8), ["tab-a", "tab-b"]);
  const card = CT("ct-c", "card", L(0, 10, 12, 6));

  it("非 tabs 容器没有标签页", () => {
    expect(activeTabOf(card, "tab-a")).toBe(undefined);
    expect(tabOfItem(card, L(0, 0, 6, 3), undefined)).toBe(undefined);
  });

  it("激活 tab：给了合法值就用它", () => {
    expect(activeTabOf(tabs, "tab-b")).toBe("tab-b");
  });

  it("激活 tab：值非法（tab 被删了）回落到第一个", () => {
    expect(activeTabOf(tabs, "tab-gone")).toBe("tab-a");
    expect(activeTabOf(tabs, undefined)).toBe("tab-a");
  });

  it("子卡 tabId 悬空时归到激活 tab（不会因为删 tab 而不渲染）", () => {
    expect(tabOfItem(tabs, L(0, 0, 6, 3, "ct-t", "tab-gone"), "tab-b")).toBe("tab-b");
    expect(tabOfItem(tabs, L(0, 0, 6, 3, "ct-t"), "tab-a")).toBe("tab-a");
  });

  it("按 tab 过滤子卡并排序", () => {
    const items = [
      { id: "a", layout: L(6, 0, 6, 3, "ct-t", "tab-a") },
      { id: "b", layout: L(0, 0, 6, 3, "ct-t", "tab-a") },
      { id: "c", layout: L(0, 0, 6, 3, "ct-t", "tab-b") },
    ];
    expect(childrenInTab(items, tabs, "tab-a").map((i) => i.id)).toEqual(["b", "a"]);
    expect(childrenInTab(items, tabs, "tab-b").map((i) => i.id)).toEqual(["c"]);
  });

  it("非 tabs 容器返回全部子卡（不受 tabId 影响）", () => {
    const items = [
      { id: "a", layout: L(0, 0, 6, 3, "ct-c", "tab-x") },
      { id: "b", layout: L(0, 0, 6, 3, "ct-c") },
    ];
    expect(childrenInTab(items, card, undefined).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("删 tab：算出受影响的卡与迁移目标，不在这里做决定", () => {
    const items = [
      { id: "a", layout: L(0, 0, 6, 3, "ct-t", "tab-a") },
      { id: "b", layout: L(0, 0, 6, 3, "ct-t", "tab-b") },
      { id: "c", layout: L(6, 0, 6, 3, "ct-t", "tab-b") },
    ];
    const plan = planTabRemoval(tabs, "tab-a", items);
    expect(plan).toEqual({ cards: ["a"], nextTabId: "tab-b" });
    // 删最后一个 tab 时没有迁移目标（需要用户选「一并删除卡片」）
    const last = planTabRemoval(tabs, "tab-b", items);
    expect(last).toEqual({ cards: ["b", "c"], nextTabId: "tab-a" });
  });
});

describe("逻辑顺序（导出 / 打印）", () => {
  const containers = [CT("ct-1", "card", L(0, 5, 12, 6))];

  it("容器内先出：容器所在位置连续输出其子卡，而不是按数组创建顺序", () => {
    const items = [
      { id: "top", layout: L(0, 0, 6, 3) },
      { id: "inside2", layout: L(6, 0, 6, 3, "ct-1") },
      { id: "bottom", layout: L(0, 20, 6, 3) },
      { id: "inside1", layout: L(0, 0, 6, 3, "ct-1") },
    ];
    // 数组顺序是 top/inside2/bottom/inside1；逻辑顺序必须是 top → 容器内(b 左→右) → bottom
    expect(flowOrder(items, containers)).toEqual(["top", "inside1", "inside2", "bottom"]);
  });

  it("根层按 (y,x) 排序", () => {
    const items = [
      { id: "r2", layout: L(0, 4, 6, 3) },
      { id: "r1", layout: L(6, 0, 6, 3) },
      { id: "r0", layout: L(0, 0, 6, 3) },
    ];
    expect(flowOrder(items, undefined)).toEqual(["r0", "r1", "r2"]);
  });

  it("容器不在根层（数据异常）时子卡也不丢，追加在末尾", () => {
    const items = [
      { id: "root", layout: L(0, 0, 6, 3) },
      { id: "orphanChild", layout: L(0, 0, 6, 3, "ct-1") },
    ];
    expect(flowOrder(items, containers)).toEqual(["root", "orphanChild"]);
  });
});

describe("删容器：子卡迁回根层，不静默删卡", () => {
  const containers = [CT("ct-1", "card", L(0, 5, 12, 6))];

  it("子卡下移到容器下方并清掉 parentId/tabId", () => {
    const items = [
      { id: "a", layout: L(0, 0, 6, 3, "ct-1", "tab-a") },
      { id: "b", layout: L(6, 2, 6, 3, "ct-1") },
    ];
    const { containers: next, layouts } = releaseContainer(containers, items, "ct-1");
    expect(next).toEqual([]);
    // 容器 y=5，标题占 1 行 → 子卡 y = 5 + 局部 y + 1
    expect(layouts.a).toEqual({ x: 0, y: 6, w: 6, h: 3, parentId: undefined, tabId: undefined });
    expect(layouts.b).toEqual({ x: 6, y: 8, w: 6, h: 3, parentId: undefined, tabId: undefined });
  });

  it("容器不存在时原样返回", () => {
    const got = releaseContainer(containers, [], "ct-gone");
    expect(got.containers).toEqual(containers);
    expect(got.layouts).toEqual({});
  });
});

describe("保存前归一化容器高度", () => {
  it("把渲染时的撑高结果写回，避免存的 h 与显示长期不一致", () => {
    const containers = [CT("ct-1", "card", L(0, 0, 12, 3))];
    const items = [{ id: "a", layout: L(0, 5, 6, 3, "ct-1") }];
    const got = normalizeHeights(containers, items);
    // 子卡下边界 8 行 + 标题 1 行 = 9
    expect(got[0].layout.h).toBe(9);
  });

  it("已经够高的容器不被缩小（缩容器会裁掉子卡）", () => {
    const containers = [CT("ct-1", "card", L(0, 0, 12, 20))];
    const items = [{ id: "a", layout: L(0, 0, 6, 3, "ct-1") }];
    expect(normalizeHeights(containers, items)[0].layout.h).toBe(20);
  });

  it("无子卡的容器保持原高度", () => {
    const containers = [CT("ct-1", "card", L(0, 0, 12, 6))];
    expect(normalizeHeights(containers, [])[0].layout.h).toBe(6);
  });
});

describe("删标签页的两个分支都真的生效", () => {
  const tabs = CT("ct-t", "tabs", L(0, 0, 12, 8), ["tab-a", "tab-b"]);
  const items = [
    { id: "a", layout: L(0, 0, 6, 3, "ct-t", "tab-a") },
    { id: "b", layout: L(0, 0, 6, 3, "ct-t", "tab-b") },
  ];
  const plan = planTabRemoval(tabs, "tab-a", items);

  it("选「一并删除」：卡片进删除名单", () => {
    const got = tabRemovalEffect(plan, true, items);
    expect(got.remove).toEqual(["a"]);
    expect(got.relayout).toEqual({});
  });

  it("选「保留并迁移」：卡片不删，tabId 改到相邻标签页", () => {
    const got = tabRemovalEffect(plan, false, items);
    expect(got.remove).toEqual([]);
    // 硬编码：迁到 tab-b，且坐标列不变
    expect(got.relayout.a).toEqual({ x: 0, y: 0, w: 6, h: 3, parentId: "ct-t", tabId: "tab-b" });
    // 不在该标签页的卡不受影响
    expect(got.relayout.b).toBeUndefined();
  });

  it("删最后一个标签页时没有迁移目标，迁成 undefined 而不是弹到根层", () => {
    const last = planTabRemoval(CT("ct-x", "tabs", L(0, 0, 12, 8), ["only"]), "only", [
      { id: "z", layout: L(0, 0, 6, 3, "ct-x", "only") },
    ]);
    const got = tabRemovalEffect(last, false, [{ id: "z", layout: L(0, 0, 6, 3, "ct-x", "only") }]);
    expect(got.remove).toEqual([]);
    expect(got.relayout.z.parentId).toBe("ct-x");
    expect(got.relayout.z.tabId).toBe(undefined);
  });
});

// Test: L0 键盘游标原语（`primitives/roving`）
//
// [WHY 这些用例只测「算得对」] 原语的全部价值在于它是**纯算术**：按键 → 意图 → 坐标
// → 落点。只要这里对，两个表格（`z-table` / `z-report-table`）、树、菜单、下拉、
// 单选组的键盘手感就一致；而「候选集是什么」由各控件自己决定，那部分在各自的用例里断言。
//
// 每条断言都想过「把它删掉，谁会红」：这里的每一个分支都对应一次真实的边界
// （表格到边停、工具条回绕、Ctrl+End 跨全表、下拉里跳过禁用项），所以不做
// 「跑一遍不报错」式的覆盖。
//
// [WHY 一维那组从 `nextIndex` 改成 `resolveIndex`] 2026-11-16 之前一维有两个入口：
// `nextIndex(len, cur, step)` 只做一步位移，`Home/End` 得调用方各写一遍
// 「取 0 / 取 len-1」。四处调用点里有两处把禁用项忘了（下拉跳高亮到禁用行、
// 单选组的 Home 落在一个点不动的位置）。合并成一个意图驱动的入口之后，
// 「跳禁用项」不再是可选参数而是同一条路径。

import { describe, expect, it } from "vitest";
import {
  gridIntent,
  listIntent,
  resolveCell,
  resolveIndex,
  roveByKey,
  roveTo,
  sameCell,
} from "../../src/primitives/roving/roving.js";

const BOUNDS = { rows: 3, cols: 4 };

describe("primitives/roving：二维 按键 → 意图", () => {
  it("R1 方向键各走一格，且只动一个轴", () => {
    expect(gridIntent("ArrowUp")).toEqual({ row: "prev", col: "same" });
    expect(gridIntent("ArrowDown")).toEqual({ row: "next", col: "same" });
    expect(gridIntent("ArrowLeft")).toEqual({ row: "same", col: "prev" });
    expect(gridIntent("ArrowRight")).toEqual({ row: "same", col: "next" });
  });

  it("R2 Home/End 默认只走**本行**；带 Ctrl/Cmd 才跨到全表首尾", () => {
    // 这一条是「两张表手感一致」的关键：不折进意图里，就得每个控件各写一遍分支，
    // 而 `z-table` 支持 Ctrl+End、`z-report-table` 曾经只支持 End。
    expect(gridIntent("Home")).toEqual({ row: "same", col: "first" });
    expect(gridIntent("End")).toEqual({ row: "same", col: "last" });
    expect(gridIntent("Home", { ctrlKey: true })).toEqual({ row: "first", col: "first" });
    expect(gridIntent("End", { metaKey: true })).toEqual({ row: "last", col: "last" });
  });

  it("R3 不认识的键返回 null（调用方据此放行默认行为）", () => {
    for (const key of ["Enter", " ", "a", "PageDown", "Escape", ""]) {
      expect(gridIntent(key), `${key} 不该被当成导航键`).toBeNull();
    }
  });
});

describe("primitives/roving：一维 按键 → 意图", () => {
  it("R4 默认只认 ↑↓，不吞 ←→（树的 ←→ 是展开收起、菜单的是子菜单）", () => {
    // [WHY 这条最重要] 把四向一律当移动，就会**静默吃掉**控件自己实现的键位：
    // 事件被 preventDefault 掉，用户按 ← 想在树里收起节点，结果只是焦点往上挪一格。
    // 而这种缺陷在代码里看不出来 —— 调用方以为自己那个 case 会被走到。
    expect(listIntent("ArrowUp")).toBe("prev");
    expect(listIntent("ArrowDown")).toBe("next");
    expect(listIntent("ArrowLeft")).toBeNull();
    expect(listIntent("ArrowRight")).toBeNull();
  });

  it("R5 `horizontal` 只认 ←→；`both` 四向全认", () => {
    expect(listIntent("ArrowLeft", { axis: "horizontal" })).toBe("prev");
    expect(listIntent("ArrowRight", { axis: "horizontal" })).toBe("next");
    expect(listIntent("ArrowUp", { axis: "horizontal" })).toBeNull();
    expect(listIntent("ArrowDown", { axis: "horizontal" })).toBeNull();

    expect(listIntent("ArrowUp", { axis: "both" })).toBe("prev");
    expect(listIntent("ArrowLeft", { axis: "both" })).toBe("prev");
    expect(listIntent("ArrowDown", { axis: "both" })).toBe("next");
    expect(listIntent("ArrowRight", { axis: "both" })).toBe("next");
  });

  it("R6 Home/End 不分轴都认（长列表里跳到首尾没有二义）", () => {
    for (const axis of ["vertical", "horizontal", "both"] as const) {
      expect(listIntent("Home", { axis }), `axis=${axis}`).toBe("first");
      expect(listIntent("End", { axis }), `axis=${axis}`).toBe("last");
    }
  });

  it("R7 非导航键返回 null", () => {
    for (const key of ["Enter", " ", "Tab", "Escape", "PageDown", "a"]) {
      expect(listIntent(key), `${key} 不该被当成一维导航键`).toBeNull();
    }
  });
});

describe("primitives/roving：二维坐标解析", () => {
  it("R8 默认到边就停（不环绕）", () => {
    const at = { row: 0, col: 0 };
    expect(resolveCell(at, { row: "prev", col: "same" }, BOUNDS)).toEqual({ row: 0, col: 0 });
    expect(resolveCell(at, { row: "same", col: "prev" }, BOUNDS)).toEqual({ row: 0, col: 0 });
    const last = { row: 2, col: 3 };
    expect(resolveCell(last, { row: "next", col: "same" }, BOUNDS)).toEqual({ row: 2, col: 3 });
    expect(resolveCell(last, { row: "same", col: "next" }, BOUNDS)).toEqual({ row: 2, col: 3 });
  });

  it("R9 wrap=true 时首尾相接（菜单/工具条要这个）", () => {
    expect(resolveCell({ row: 0, col: 0 }, { row: "prev", col: "same" }, BOUNDS, { wrap: true })).toEqual({
      row: 2,
      col: 0,
    });
    expect(resolveCell({ row: 0, col: 0 }, { row: "same", col: "prev" }, BOUNDS, { wrap: true })).toEqual({
      row: 0,
      col: 3,
    });
  });

  it("R10 first / last 与 same 的语义", () => {
    expect(resolveCell({ row: 1, col: 2 }, { row: "first", col: "first" }, BOUNDS)).toEqual({ row: 0, col: 0 });
    expect(resolveCell({ row: 1, col: 2 }, { row: "last", col: "last" }, BOUNDS)).toEqual({ row: 2, col: 3 });
    expect(resolveCell({ row: 1, col: 2 }, { row: "same", col: "same" }, BOUNDS)).toEqual({ row: 1, col: 2 });
  });

  it("R11 空网格不产生负坐标", () => {
    // [WHY] 空表时 rows=0：若 stepAxis 没先判 size<=0，`last = -1` 会让坐标变成 -1，
    // 后续 `rows[-1]` 取到 undefined，焦点静默不动 —— 看起来像「按键没反应」。
    expect(resolveCell({ row: 0, col: 0 }, { row: "last", col: "last" }, { rows: 0, cols: 0 })).toEqual({
      row: 0,
      col: 0,
    });
  });

  it("R12 sameCell 对 null 与不同坐标都返回 false", () => {
    expect(sameCell({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(true);
    expect(sameCell({ row: 1, col: 1 }, { row: 1, col: 2 })).toBe(false);
    expect(sameCell(null, { row: 0, col: 0 })).toBe(false);
    expect(sameCell({ row: 0, col: 0 }, null)).toBe(false);
  });
});

describe("primitives/roving：一维下标解析", () => {
  it("R13 默认回绕；wrap=false 时到端停在原地", () => {
    expect(resolveIndex(3, 2, "next")).toBe(0);
    expect(resolveIndex(3, 0, "prev")).toBe(2);
    // [WHY 是「当前项」而不是 -1] 到边返回 -1 会被调用方读成「这键不归我管」，
    // 于是放行默认行为 —— 在表头上按 → 会横向滚页面。这一键其实已经被消费了。
    expect(resolveIndex(3, 2, "next", { wrap: false })).toBe(2);
    expect(resolveIndex(3, 0, "prev", { wrap: false })).toBe(0);
  });

  it("R14 当前项不在范围内时按方向取端点，而不是从 0 硬算", () => {
    // [WHY] 焦点可能还没落在任何一项上（刚展开的菜单 / 一个都没选中的单选组，
    // current = -1）：往下走应当是**第一项**（0），往上走应当是**最后一项**。
    // 若从 0 硬算，往上会得到 -1 → 回绕成末项（对），往下会得到 1（错：跳过第一项）。
    expect(resolveIndex(3, -1, "next")).toBe(0);
    expect(resolveIndex(3, -1, "prev")).toBe(2);
  });

  it("R15 Home / End 直接给首尾", () => {
    expect(resolveIndex(5, 3, "first")).toBe(0);
    expect(resolveIndex(5, 1, "last")).toBe(4);
  });

  it("R16 空列表返回 -1（「没有落点」要能与「落在第 0 项」区分开）", () => {
    // [WHY 不是 0] 返回 0 时调用方拿 `items[0]` 得到 undefined，通常表现为
    // 「按键没反应」而不是报错 —— 又是一个静默失败。早先 `nextIndex` 返回 0，
    // 靠调用方先判空兜住，那是第二份真相。
    expect(resolveIndex(0, 0, "next")).toBe(-1);
    expect(resolveIndex(0, -1, "prev")).toBe(-1);
    expect(resolveIndex(0, -1, "first")).toBe(-1);
  });

  it("R17 ★ 跳过不可用项（下拉的候选集与下标空间不是同一份时）", () => {
    const disabled = (i: number): boolean => i === 1;
    // 0 → 2（跳过 1）
    expect(resolveIndex(4, 0, "next", { isDisabled: disabled })).toBe(2);
    // 2 → 0（跳过 1 的回绕路径）
    expect(resolveIndex(4, 2, "prev", { isDisabled: disabled })).toBe(0);
    // 连续两个禁用：0 → 3
    expect(resolveIndex(5, 0, "next", { isDisabled: (i) => i === 1 || i === 2 })).toBe(3);
  });

  it("R18 Home / End 也跳过不可用项（首项禁用时落在第一个能用的项上）", () => {
    const disabled = (i: number): boolean => i === 0 || i === 4;
    expect(resolveIndex(5, 3, "first", { isDisabled: disabled })).toBe(1);
    expect(resolveIndex(5, 3, "last", { isDisabled: disabled })).toBe(3);
  });

  it("R19 全部不可用时返回 -1（手写的 do…while 在这里会死循环）", () => {
    expect(resolveIndex(4, 0, "next", { isDisabled: () => true })).toBe(-1);
    expect(resolveIndex(4, 0, "prev", { isDisabled: () => true })).toBe(-1);
    expect(resolveIndex(4, 0, "first", { isDisabled: () => true })).toBe(-1);
    expect(resolveIndex(4, 0, "last", { isDisabled: () => true })).toBe(-1);
  });
});

describe("primitives/roving：落点与 roving 写入", () => {
  function group(n: number): HTMLElement[] {
    const box = document.createElement("div");
    document.body.appendChild(box);
    const els: HTMLElement[] = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.tabIndex = -1;
      box.appendChild(el);
      els.push(el);
    }
    return els;
  }

  it("R20 roveTo 只在目标上留一个 tabindex=0，其余（含原本没有属性的）置 -1", () => {
    const els = group(3);
    els[1].removeAttribute("tabindex"); // 原本完全没有属性 —— 也一样要降到 -1
    roveTo(els[2], els, { focus: false });

    expect(els.map((e) => e.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
    document.body.innerHTML = "";
  });

  it("R21 roveTo 传 null 时什么都不改（空候选集不该把现有停靠点抹掉）", () => {
    const els = group(2);
    roveTo(els[0], els, { focus: false });
    roveTo(null, els, { focus: false });
    expect(els.map((e) => e.getAttribute("tabindex"))).toEqual(["0", "-1"]);
    document.body.innerHTML = "";
  });

  it("R22 roveByKey 落点、搬 tabindex、并聚焦", () => {
    const els = group(3);
    const target = roveByKey(els, els[0], "ArrowDown");
    expect(target).toBe(els[1]);
    expect(document.activeElement).toBe(els[1]);
    expect(els.map((e) => e.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
    document.body.innerHTML = "";
  });

  it("R23 roveByKey 到边停住时返回**当前项**（这一键仍被消费）", () => {
    const els = group(2);
    expect(roveByKey(els, els[1], "ArrowDown", { wrap: false })).toBe(els[1]);
    expect(roveByKey(els, els[0], "ArrowUp", { wrap: false })).toBe(els[0]);
    document.body.innerHTML = "";
  });

  it("R24 ★ 非导航键返回 null（调用方据此放行默认行为）", () => {
    const els = group(2);
    expect(roveByKey(els, els[0], "Enter")).toBeNull();
    expect(roveByKey(els, els[0], "a")).toBeNull();
    // 垂直轴上 ←→ 不归 L0 管 —— 树的展开/收起要靠这个返回 null 才能自己接管
    expect(roveByKey(els, els[0], "ArrowLeft", { axis: "vertical" })).toBeNull();
    document.body.innerHTML = "";
  });

  it("R25 ★ 当前项不在候选集里时返回 null，而不是从端点重新进场", () => {
    // [WHY] 这一条防的是「焦点乱跳」：若把「不在组里的当前项」当成「无当前项」，
    // 按一下 → 焦点会从第一项重新开始。违约应当**可见地不生效**。
    const els = group(3);
    const outsider = document.createElement("div");
    document.body.appendChild(outsider);
    expect(roveByKey(els, outsider, "ArrowDown")).toBeNull();
    // 反过来：current 为 null（首次进场）时应当从端点起步
    expect(roveByKey(els, null, "ArrowDown")).toBe(els[0]);
    expect(roveByKey(els, null, "ArrowUp")).toBe(els[2]);
    document.body.innerHTML = "";
  });
});

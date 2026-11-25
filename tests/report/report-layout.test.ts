// Test: 报表布局自动重排（拖拽避让 + 垂直压缩）
import { describe, expect, it } from "vitest";
import { applyLayouts, autoReflowLayout, layoutOverlap, sameLayout } from "../../src/report/core/report-layout.js";
import type { ReportCellLayout } from "../../src/report/core/types.js";

const L = (x: number, y: number, w = 6, h = 3): ReportCellLayout => ({ x, y, w, h });

describe("layoutOverlap", () => {
  it("相交判定", () => {
    expect(layoutOverlap(L(0, 0), L(0, 0))).toBe(true);
    expect(layoutOverlap(L(0, 0), L(6, 0))).toBe(false); // 水平相邻不交
    expect(layoutOverlap(L(0, 0), L(0, 3))).toBe(false); // 垂直相邻不交
    expect(layoutOverlap(L(0, 0, 6, 3), L(4, 2))).toBe(true); // 部分重叠
  });
});

describe("autoReflowLayout 碰撞推挤", () => {
  it("拖入已占位置时被挡项下移避让", () => {
    const out = autoReflowLayout([L(0, 0), L(0, 3)], 0, L(0, 1));
    // A 移到 y=1..4；B(0,3..6) 重叠 → 推到 y=4；压缩回 y=3 仍重叠 → 停在 y=4
    expect(out[0]).toEqual(L(0, 1));
    expect(out[1]).toEqual(L(0, 4));
  });

  it("连锁推挤：被推项再撞下一项时继续下移", () => {
    const out = autoReflowLayout([L(0, 0), L(0, 3), L(0, 6)], 0, L(0, 2));
    // A(0,2..5)：B(0,3..6) 重叠 → y=5；C(0,6..9) 与 B(0,5..8) 重叠 → y=8
    expect(out[0]).toEqual(L(0, 2));
    expect(out[1]).toEqual(L(0, 5));
    expect(out[2]).toEqual(L(0, 8));
    // 收敛后无任何重叠
    expect(layoutOverlap(out[0], out[1])).toBe(false);
    expect(layoutOverlap(out[1], out[2])).toBe(false);
  });

  it("水平不交则并排不动（不同列不推挤）", () => {
    const out = autoReflowLayout([L(0, 0), L(6, 0)], 0, L(0, 1));
    expect(out[0]).toEqual(L(0, 1));
    expect(out[1]).toEqual(L(6, 0)); // 与 A 水平不交，原地不动
  });

  it("resize 扩大宽度侵占并排项时，右侧项下移到被拖拽项底边之下", () => {
    // A(0,0,6×5) 与 B(6,0,6×3) 水平并排；A 拖宽到 w=8 → 与 B 水平重叠 → B 推到 y=5
    const out = autoReflowLayout([L(0, 0, 6, 5), L(6, 0, 6, 3)], 0, L(0, 0, 8, 5));
    expect(out[0]).toEqual(L(0, 0, 8, 5));
    expect(out[1]).toEqual(L(6, 5, 6, 3));
    expect(layoutOverlap(out[0], out[1])).toBe(false);
  });

  it("resize 扩大宽度不触碰上下紧邻项（无水平重叠不动）", () => {
    // B 在 A 正下方紧贴（y=5 相接）；A 拖宽到 w=8 不横向侵入 B → B 原地不动
    const out = autoReflowLayout([L(0, 0, 6, 5), L(0, 5, 6, 3)], 0, L(0, 0, 8, 5));
    expect(out[0]).toEqual(L(0, 0, 8, 5));
    expect(out[1]).toEqual(L(0, 5, 6, 3));
  });

  it("resize 回缩宽度后，被推项压缩回原位（布局幂等还原）", () => {
    // 先扩宽推挤（B → y=5），再把 A 缩回 w=6 → B 压缩回 y=0
    const pushed = autoReflowLayout([L(0, 0, 6, 5), L(6, 0, 6, 3)], 0, L(0, 0, 8, 5));
    expect(pushed[1]).toEqual(L(6, 5, 6, 3));
    const back = autoReflowLayout(pushed, 0, L(0, 0, 6, 5));
    expect(back[1]).toEqual(L(6, 0, 6, 3));
    expect(layoutOverlap(back[0], back[1])).toBe(false);
  });
});

describe("autoReflowLayout 垂直压缩", () => {
  it("拖走后下方空洞自动上移收紧", () => {
    // A(0,0..3)、B(0,5..8) 存在空洞；把 A 拖到 (6,0)（水平错开）后 B 应一路顶格到 y=0
    const out = autoReflowLayout([L(0, 0), L(0, 5)], 0, L(6, 0));
    expect(out[0]).toEqual(L(6, 0));
    expect(out[1]).toEqual(L(0, 0));
  });

  it("被拖拽项不参与压缩（位置由用户控制）", () => {
    // 三列布局，把 C(6,6) 上拖到 (6,3)：A/B 不受影响，C 保持 target
    const out = autoReflowLayout([L(0, 0), L(6, 0), L(6, 6)], 2, L(6, 3));
    expect(out[2]).toEqual(L(6, 3));
    expect(out[0]).toEqual(L(0, 0));
    expect(out[1]).toEqual(L(6, 0));
  });

  it("宽项压缩遇窄项阻挡则停在可行位置", () => {
    // A(0,0,w6)、B(6,0,w6)、C(0,6,w6)：C 可上移到 y=3（与 A 相接）
    const out = autoReflowLayout([L(0, 0), L(6, 0), L(0, 6)], 1, L(6, 0));
    expect(out[0]).toEqual(L(0, 0));
    expect(out[1]).toEqual(L(6, 0));
    expect(out[2]).toEqual(L(0, 3));
  });
});

describe("autoReflowLayout 稳定性", () => {
  it("不动任何项（target 与原位一致）时仅做压缩，且多次调用结果一致", () => {
    const base = [L(0, 0), L(6, 0), L(0, 3), L(6, 3)];
    const once = autoReflowLayout(base, 2, L(0, 3));
    const twice = autoReflowLayout(once, 2, once[2]);
    expect(twice).toEqual(once);
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        expect(layoutOverlap(twice[i], twice[j])).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 写回布局时的「谁真的变了」——2026-10-23「松手后整页自己重排」的判据
//
// [为什么这几条必须用引用相等断言] 「别的卡没被动过」只有引用能证明：数值相等骗得了人
// （位置恰好没变），引用相等骗不了 —— 谁重建了对象，谁就会让那张卡的预览重画。
// ---------------------------------------------------------------------------

type Card = { id: string; layout?: ReportCellLayout; title: string };

describe("sameLayout", () => {
  it("数值相同即相等（不看对象引用）", () => {
    expect(sameLayout(L(0, 0), L(0, 0))).toBe(true);
    expect(sameLayout(L(0, 0), L(0, 1))).toBe(false);
    expect(sameLayout(L(0, 0), L(1, 0))).toBe(false);
    expect(sameLayout(L(0, 0, 6, 3), L(0, 0, 6, 4))).toBe(false);
  });

  it("所属容器 / 标签页也算不同（单纯移动容器不改坐标，但必须写回）", () => {
    expect(sameLayout({ ...L(0, 0), parentId: "c1" }, { ...L(0, 0), parentId: "c1" })).toBe(true);
    expect(sameLayout({ ...L(0, 0) }, { ...L(0, 0), parentId: "c1" })).toBe(false);
    expect(sameLayout({ ...L(0, 0), tabId: "t1" }, { ...L(0, 0), tabId: "t2" })).toBe(false);
  });

  it("缺省（没排过）与有值不等", () => {
    expect(sameLayout(undefined, L(0, 0))).toBe(false);
    expect(sameLayout(undefined, undefined)).toBe(true);
  });
});

describe("applyLayouts", () => {
  const cards = (): Card[] => [
    { id: "a", layout: L(0, 0), title: "A" },
    { id: "b", layout: L(6, 0), title: "B" },
    { id: "c", layout: L(0, 3), title: "C" },
  ];

  it("一件都没变 → 返回原数组（调用方 setState 直接 bail out，连重渲染都没有）", () => {
    const arr = cards();
    const out = applyLayouts(arr, new Map([["a", L(0, 0)], ["b", L(6, 0)], ["c", L(0, 3)]]));
    expect(out).toBe(arr);
  });

  it("只有变了的卡换对象，其它卡保持原引用", () => {
    const arr = cards();
    const out = applyLayouts(arr, new Map([["b", L(6, 9)]]));
    expect(out).not.toBe(arr);
    expect(out[0]).toBe(arr[0]);
    expect(out[2]).toBe(arr[2]);
    expect(out[1]).not.toBe(arr[1]);
    expect(out[1].layout).toEqual(L(6, 9));
    expect(out[1].title).toBe("B"); // 其余字段原样保留
  });

  it("被推动 0 行（数值恰好没变）不算改动 —— 这正是拖动时其余卡不该重画的判据", () => {
    const arr = cards();
    // 模拟 autoReflowLayout 的行为：返回的是深拷贝，数值相同
    const reflowed = new Map([["a", { ...L(0, 0) }], ["b", { ...L(6, 0) }]]);
    expect(applyLayouts(arr, reflowed)).toBe(arr);
  });

  it("未在 map 里的卡原样保留（筛选器卡与图表共用一张 map）", () => {
    const arr = cards();
    const out = applyLayouts(arr, new Map([["zzz", L(0, 0)]]));
    expect(out).toBe(arr);
  });
});

// 栅格几何与密度（M9）纯函数测试。
//
// 断言纪律：期望值一律硬编码数字，不用「再调一次被测函数」当期望 ——
// 那样换密度换算写错时，两侧一起错、恒等、测试永远绿。
import { describe, expect, it } from "vitest";
import {
  GRID_COLS_DEFAULT,
  GRID_GAP,
  ROW_H,
  clampLayout,
  colWidth,
  defaultContainerLayout,
  defaultFilterLayout,
  defaultLayout,
  gridColsOf,
  rescaleLayout,
  rescaleSpan,
  snapSpan,
  spanPx,
} from "../../src/report/core/report-grid.js";

describe("gridColsOf", () => {
  it("缺省 12（存量报表零迁移）", () => {
    expect(gridColsOf(undefined)).toBe(12);
    expect(gridColsOf(null)).toBe(12);
    expect(gridColsOf({})).toBe(12);
    expect(GRID_COLS_DEFAULT).toBe(12);
  });

  it("显式 24 生效", () => {
    expect(gridColsOf({ gridCols: 24 })).toBe(24);
  });

  it("非法密度回落 12（不做白名单报错，防一次灰度不同步就整表不渲染）", () => {
    // @ts-expect-error 故意传非法值：接口可能返回脏数据
    expect(gridColsOf({ gridCols: 18 })).toBe(12);
    // @ts-expect-error 同上
    expect(gridColsOf({ gridCols: 0 })).toBe(12);
  });
});

describe("几何换算", () => {
  it("单列宽扣掉间距后均分", () => {
    // 1000 宽 12 列、间距 8：(1000 - 8*11)/12 = 912/12 = 76
    expect(colWidth(1000, 12)).toBe(76);
    // 1000 宽 24 列：(1000 - 8*23)/24 = 816/24 = 34
    expect(colWidth(1000, 24)).toBe(34);
  });

  it("跨 n 列 = n 列宽 + (n-1) 个间距", () => {
    expect(spanPx(1, 76)).toBe(76);
    expect(spanPx(6, 76)).toBe(76 * 6 + 5 * 8);
    expect(spanPx(0, 76)).toBe(0);
  });

  it("像素位移四舍五入成列数", () => {
    // 步长 = 76 + 8 = 84
    expect(snapSpan(84, 76)).toBe(1);
    expect(snapSpan(41, 76)).toBe(0); // 41/84 = 0.49 → 0
    expect(snapSpan(43, 76)).toBe(1); // 43/84 = 0.51 → 1
    expect(snapSpan(-84, 76)).toBe(-1);
  });

  it("画布宽度为 0 或列数为 0 时不产生 NaN", () => {
    expect(colWidth(0, 12)).toBe(0);
    expect(colWidth(1000, 0)).toBe(0);
    expect(snapSpan(84, 0)).toBe(0);
  });
});

describe("默认布局：两种密度下比例一致", () => {
  it("12 列双列瀑布 6×3", () => {
    expect(defaultLayout(0, 12)).toEqual({ x: 0, y: 0, w: 6, h: 3 });
    expect(defaultLayout(1, 12)).toEqual({ x: 6, y: 0, w: 6, h: 3 });
    expect(defaultLayout(2, 12)).toEqual({ x: 0, y: 3, w: 6, h: 3 });
  });

  it("24 列仍是双列瀑布，宽 12（半幅）", () => {
    expect(defaultLayout(0, 24)).toEqual({ x: 0, y: 0, w: 12, h: 3 });
    expect(defaultLayout(1, 24)).toEqual({ x: 12, y: 0, w: 12, h: 3 });
  });

  it("筛选器卡：12 列 4 宽，24 列 8 宽（都是三分之一幅）", () => {
    expect(defaultFilterLayout(0, 0, 12)).toEqual({ x: 0, y: 0, w: 4, h: 1 });
    expect(defaultFilterLayout(0, 3, 12)).toEqual({ x: 0, y: 1, w: 4, h: 1 });
    expect(defaultFilterLayout(0, 0, 24)).toEqual({ x: 0, y: 0, w: 8, h: 1 });
  });

  it("容器整幅宽", () => {
    expect(defaultContainerLayout(5, 12)).toEqual({ x: 0, y: 5, w: 12, h: 6 });
    expect(defaultContainerLayout(5, 24)).toEqual({ x: 0, y: 5, w: 24, h: 6 });
  });

  it("行高与间距是全局常量（容器内子网格复用同一套，不能各自定义）", () => {
    expect(ROW_H).toBe(56);
    expect(GRID_GAP).toBe(8);
  });
});

describe("clampLayout", () => {
  it("夹进栅格内", () => {
    expect(clampLayout({ x: -3, y: -1, w: 6, h: 3 }, 12)).toEqual({ x: 0, y: 0, w: 6, h: 3 });
    // x=9 w=6 越界 → x 收到 6
    expect(clampLayout({ x: 9, y: 0, w: 6, h: 3 }, 12)).toEqual({ x: 6, y: 0, w: 6, h: 3 });
    // w 超过总列宽 → 收到总列宽
    expect(clampLayout({ x: 0, y: 0, w: 40, h: 3 }, 12)).toEqual({ x: 0, y: 0, w: 12, h: 3 });
    expect(clampLayout({ x: 0, y: 0, w: 0, h: 0 }, 12)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe("跨报表复制：密度换算", () => {
  it("12 → 24 时跨度翻倍", () => {
    expect(rescaleSpan(6, 12, 24)).toBe(12);
    expect(rescaleSpan(3, 12, 24)).toBe(6);
  });

  it("24 → 12 时减半并向上取整（不缩没）", () => {
    expect(rescaleSpan(6, 24, 12)).toBe(3);
    expect(rescaleSpan(5, 24, 12)).toBe(3); // 2.5 向上取整
    expect(rescaleSpan(1, 24, 12)).toBe(1); // 0.5 → 1，不能变 0
  });

  it("位置按比例换算且不越界", () => {
    expect(rescaleLayout({ x: 6, y: 2, w: 6, h: 3 }, 12, 24)).toEqual({ x: 12, y: 2, w: 12, h: 3 });
    expect(rescaleLayout({ x: 18, y: 0, w: 6, h: 3 }, 24, 12)).toEqual({ x: 9, y: 0, w: 3, h: 3 });
    // 贴右边的卡换算后 x+w 不能超界
    const edge = rescaleLayout({ x: 18, y: 0, w: 6, h: 3 }, 24, 12);
    expect(edge.x + edge.w).toBeLessThanOrEqual(12);
  });

  it("同密度时原样返回（不因浮点运算把 3 变成 3.0000001）", () => {
    expect(rescaleLayout({ x: 3, y: 1, w: 5, h: 2 }, 12, 12)).toEqual({ x: 3, y: 1, w: 5, h: 2 });
  });
});

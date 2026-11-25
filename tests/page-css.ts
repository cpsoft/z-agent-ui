// 页面样式的读取口（测试用）。
//
// [WHY 需要它] `page-view.css` / `page-m-view.css` 已按区块拆成多段（规范 §9 的 CSS 硬线
// 400 行）。测试要的是「整套样式里有没有这条规则」，拆之前是 `readFileSync` 一个文件，
// 拆之后必须读全部段并按**层叠顺序**拼接 —— 顺序错了，「后出现者覆盖前者」的规则会变，
// 而断言通常还绿（它们多半只查「有没有这条选择器」）。
//
// 所以顺序在这里写死一份，并由 `page-css-split-guard.test.ts` 与
// `page-styles.ts` / `page-m-styles.ts` 的 import 顺序做交叉校验：那边加段、这边忘了加，
// 会立刻红。
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** PC：顺序 = `src/editor/page-view/page-styles.ts` 的 import 顺序。 */
export const PAGE_VIEW_CSS_FILES = [
  "page-view-base.css",
  "page-view-block.css",
  "page-view-control.css",
  "page-view-card.css",
  "page-view-card-body.css",
  "page-view-form.css",
  "page-view-board.css",
  "page-view-record.css",
  "page-view-subtable.css",
  "page-view-misc.css",
] as const;

/** H5：顺序 = `src/editor/page-m-view/page-m-styles.ts` 的 import 顺序。 */
export const PAGE_M_VIEW_CSS_FILES = [
  "page-m-view-nav.css",
  "page-m-view-filter.css",
  "page-m-view-chip.css",
  "page-m-view-calendar.css",
  "page-m-view-card.css",
  "page-m-view-cell.css",
  "page-m-view-kpi.css",
  "page-m-view-form.css",
  "page-m-view-state.css",
  "page-m-view-subtable.css",
  // 下拉刷新的指示器（2026-11-20，issue IKWNI5）：由容器在渲染后插入，不在渲染产物里
  "page-m-view-pull.css",
  // 组织树（2026-11-24，REQ-045）：H5 补上 `tree` 分支之后才有的一段
  "page-m-view-tree.css",
  // 分组表 / 树状表（2026-11-24，REQ-046）
  "page-m-view-group-table.css",
  "page-m-view-commerce.css",
] as const;

const readAll = (dir: string, files: readonly string[]): string =>
  files.map((f) => readFileSync(join(ROOT, dir, f), "utf8")).join("");

/** 整套 PC 页面样式（等价于拆分前的 `page-view.css`）。 */
export const readPageViewCss = (): string => readAll("src/editor/page-view", PAGE_VIEW_CSS_FILES);

/** 整套 H5 页面样式（等价于拆分前的 `page-m-view.css`）。 */
export const readPageMViewCss = (): string => readAll("src/editor/page-m-view", PAGE_M_VIEW_CSS_FILES);

// 通用文案词表（动态视图：实时从 core/i18n 的当前语言包取值，默认 zh-CN）。
//
// ═══════════════════════════════════════════════════════════
// [WHY 保留 COPY 作为动态 getter 视图]
//
// 2026-11-15 引入词表时，全仓 94 处组件属性默认值与模板写成 `COPY.empty` / `COPY.close`。
// 2026-11-27 升级为多语言运行时（`core/i18n.ts`）后，中文词条迁入 `core/locales/zh-CN.ts`
// 作为默认语言包；`COPY` 本身改为 getter 代理，每次读取都走 `t(key)`：
//   · 现有 `COPY.xxx`、`Object.keys(COPY)`、`Object.values(COPY)` 全部零破坏兼容；
//   · 切换语言（`setLocale("en-US", enUS)`）后，模板里读 `COPY.xxx` 立即返回新语言，
//     `BaseElement` 也会自动刷新由 `COPY.*` 初始化的默认文案属性。
//
// [WHY 放在 core 而不是 components]
// 它被 L1（components）、L2（report / doc / content / app）同时消费；
// 放到任何一层都会让上层反向依赖下层。core 是唯一合法的位置（依赖只向下）。
// ═══════════════════════════════════════════════════════════

import { t } from "./i18n.js";
import { zhCN, type MessageKey } from "./locales/zh-CN.js";

/** 词表的键（与默认语言包 `zhCN` 的键完全一致）。 */
export type CopyKey = MessageKey;

/**
 * 通用文案（动态读取当前语言包，默认 zh-CN）。
 *
 * [WHY 类型为 `Record<CopyKey, string>` 而不是字面量]
 * 若收成字面量类型，`@property({ type: String }) closeLabel = COPY.close` 的属性类型
 * 会变成 `"关闭"` 而不是 `string`，宿主赋别的值会编译报错。
 */
const copyView = {} as Record<CopyKey, string>;
for (const key of Object.keys(zhCN) as CopyKey[]) {
  Object.defineProperty(copyView, key, {
    enumerable: true,
    configurable: false,
    get: () => t(key),
  });
}

export const COPY: Readonly<Record<CopyKey, string>> = copyView;

/**
 * 允许**不写中文**的文案属性（逐条给理由，不许空口豁免）。
 *
 * 守卫 `copy-guard` 会对照这张表：表里没有的 `*Text` / `*Label` 默认值必须含中文。
 */
export const COPY_EXEMPT: ReadonlyArray<{ tag: string; prop: string; why: string }> = [
  {
    tag: "z-time-picker",
    prop: "amLabel",
    why: "12 小时制的制式标记。中文界面同样写 AM/PM（与系统时间格式一致），译成「上午」反而对不上表盘",
  },
  {
    tag: "z-time-picker",
    prop: "pmLabel",
    why: "12 小时制的制式标记，与 amLabel 成对；中文界面同样写 AM/PM，译成「下午」对不上表盘",
  },
  {
    tag: "z-chart",
    prop: "marklineLabel",
    why: "默认空串 = 不显示标注线标签；空串不是一种语言，不该被要求含中文",
  },
  {
    tag: "m-price",
    prop: "emptyText",
    why: "价格是数值位：`--` 是财务表格的通用空值记号，比任何中文词都短；窄卡里「暂无数据」会换行并把价格行撑高",
  },
];

/**
 * 已登记的**合理差异**：同一个属性名在不同组件里给不同默认文案。
 */
export const COPY_DIVERGENCE: Record<string, { values: string[]; why: string }> = {
  confirmText: {
    values: ["确定", "加入购物车"],
    why: "`m-picker` / `z-popconfirm` 的按钮只说「确定了这一下」，动作由上下文给出；" +
      "`m-sku-picker` 的主按钮是这个弹层**唯一的出口**，写「确定」等于让用户猜点了会发生什么" +
      "（加入购物车 / 立即购买 / 换货，三种语义都在这一个按钮上）",
  },
  closeLabel: {
    values: ["关闭", "关闭提示"],
    why: "提示条要在读屏里听出「关的是什么」，所以多一层宾语；抽屉与弹窗本身就是容器，写「关闭」即可",
  },
  clearLabel: {
    values: ["清除", "清除输入"],
    why: "输入框清的是文本、日期区间清的是值 —— 宾语不同，读屏才知道会清掉什么",
  },
  emptyText: {
    values: ["暂无数据", "暂无内容", "暂无模板", "点击上方按钮添加区块", "--"],
    why:
      "前三种是场景化措辞（模板列表、预览区、报表行）；第四种（模板编辑器的空画布）其实不是空态而是操作指引，" +
      "属性名叫 emptyText 并不贴切，改名为 emptyHint 属于破坏性变更，先登记、不混进这一轮。" +
      "`--` 是价格位的数值占位（见 COPY_EXEMPT 里 m-price 那条）",
  },
  alignLeftText: {
    values: ["左对齐", "左"],
    why: "报表列设置里空间宽裕、写全称；模板编辑器的对齐是三个并排单字按钮，双字会把排版面板挤窄",
  },
  alignCenterText: {
    values: ["居中", "中"],
    why: "同上：左/中/右 三个单字才等宽，混进一个双字反而错位（原先是「左/居中/右」，本轮顺手改成单字）",
  },
  alignRightText: {
    values: ["右对齐", "右"],
    why: "报表列设置里写全称、模板编辑器里用单字，与 alignLeftText 的内在理由相同",
  },
};

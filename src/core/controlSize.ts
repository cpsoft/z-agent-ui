// 控件尺寸档位：`size` 在**表单族**里的唯一语义 —— 控件外壳的高度。
//
// [WHY 只定义「高度」，不定义「整体密度」]
// 密度（`data-density`）是**全局**的：它覆盖 `--z-control-h-*` 这一整组令牌，
// 页面上所有控件一起变紧或变松。`size` 是**单组件**的：这一行里我想让输入框比旁边高一点。
// 两者一旦都叫「密度」，就会有人问「compact 页面里放一个 lg 输入框谁赢」。
// 定成「size 只改高度」之后答案唯一：**size 改的是对令牌的引用，密度改的是令牌本身**，
// 所以局部永远赢，且密度仍是那一档的基线（compact 下 lg 从 40 变 36，而不是恒等于 36）。
//
// [WHY 没有把 --z-control-h 改名成 --z-control-h-md]
// 它是"中间那档"，但历史名字没有 -md 后缀。改名会让宿主写在样式表里的
// `--z-control-h: 30px` 一夜之间失效（覆盖不到，且不报错 —— 只是变回 32）。
// 所以这里保持 `md → var(--z-control-h)`，把这个不对称**写进映射表**而不是改令牌。
// 也不新增 `--z-control-h-md: var(--z-control-h)` 这种别名：自定义属性的 var() 在
// **声明它的那个元素**上就完成替换，一旦宿主把 data-density 放在子树而非 <html> 上，
// 别名会继承 :root 算好的旧值 —— 别名看起来等价，实际只在「密度挂在根上」时成立。
//
// [WHY sm 映射到 --z-input-height 而不是 --z-control-h-sm]
// 两者今天同值（28px），但 `--z-input-height` 是**宿主已经在用的覆写点**
// （`--z-input-height: 40px` 能让全站输入框变高）。直接写死 `--z-control-h-sm`
// 会把那个覆写悄悄废掉。代价是极端情况下的顺序倒挂（宿主把 --z-input-height 设成 40，
// 则 size="sm" 的 40 比 size="md" 的 32 还高）—— 但这恰恰符合「宿主显式指定优先」。
//
// [WHY 不是所有控件都有 size]
// 判据是「**自己画控件外壳**」：有边框/背景/内边距，且高度由自己决定。按这条：
//   · 有外壳 → input / select / number-input / pagination（见 SIZE_SUPPORTED）
//   · 无外壳 → checkbox / radio / radio-group / slider / rate：它们的 size 是**图形尺寸**
//     （12/16px 的方框、轨道粗细、星标大小），与「控件盒子 32px」不是一回事。
//     强行统一会让 `<z-checkbox size="lg">` 和 `<z-input size="lg">` 的"大"含义不同，
//     而文档里讲不清 —— 这比"没有 size"更糟。
//   · 高度由内容决定 → textarea（多行，高度是 rows/autosize 的事）
//   · 外壳来自内在控件 → datepicker / time-picker / date-range（它们是 wrapper，
//     触发框由消费方塞进去的 z-input 决定，size 写在内在控件上）
//   · 已有别的 size 语义 → button / switch / tag / avatar（padding 驱动或图形尺寸），
//     它们是各自领域的档位，不在「控件高度」这条线上。
// 这份判断不是"暂时没做"，是**语义边界**：名单外再加 size 之前先回答「它的 size 指什么」。

export const CONTROL_SIZES = ["xs", "sm", "md", "lg"] as const;
export type ControlSize = (typeof CONTROL_SIZES)[number];

/** 档位 → 高度表达式。**改档位只改这张表**，组件 CSS 里不再出现具体像素。 */
const HEIGHT: Record<ControlSize, string> = {
  xs: "var(--z-control-h-xs)",
  sm: "var(--z-input-height)",
  md: "var(--z-control-h)",
  lg: "var(--z-control-h-lg)",
};

/** 未知取值兜底 `sm`（= 既有默认高度）：不认识的 size 不该让控件塌成 0 高。 */
export function controlHeight(size: string): string {
  return HEIGHT[size as ControlSize] ?? HEIGHT.sm;
}

/**
 * 有权拥有「高度档位」语义的组件（冻结清单）。
 *
 * 加进来之前先确认它**自己画外壳**；不加之前先读上面的边界说明。
 * 守卫 `control-size-guard` 按这张表校验：名单内的组件必须有 `size` 属性、
 * 且 CSS 里控件盒的高度必须走 `var(--_h`。
 */
export const SIZE_SUPPORTED = ["z-input", "z-select", "z-number-input", "z-pagination", "z-segmented", "z-search-bar"] as const;
export type SizeSupported = (typeof SIZE_SUPPORTED)[number];

// 跨组件的**公共词汇表**（面向 AI 生成的表达规范）。
//
// [WHY 需要这个词表] 本库的目标是「由 AI 动态生成页面与表单」。AI 生成时唯一可靠的依据是
// 组件契约（registry/component-manifest.json）。若同一个词在不同组件里含义不同，
// 生成结果必然错，而且**不报错**——渲染出来只是"看着不对"。
//
// 实测（2026-10-25 契约清单，90 组件 / 635 属性 / 48 个带取值域）：
//   `variant` 一个词承载了 9 种取值集、三种互不相干的语义：
//     语义色  default|primary|success|warning|danger  (badge/tag/m-chip/progress)
//             info|success|warning|error              (alert，且用 error 而非 danger)
//     外观    primary|secondary|outline|ghost|danger  (button)
//             default|lines                           (report-table)
//             underline|pills|cards                   (tabs)
//     形状    text|circle|rect (skeleton) / border|grow|dots (spinner)
//   `size` 4 种取值集，且 `full` 其实是「填充方式」被塞进了尺寸维度。
//
// 结论：把承载多重语义的词**拆成正交维度**，而不是继续加值。
//
// 本文件只定义「跨组件通用的词」。组件局部概念（如 z-input 的 HTML `type`、
// z-flow-handle 的方位）不需要进全局表，但必须在自己组件里声明取值域。

/** 语义色。统一用 `error` 还是 `danger` 有分歧 → 取 `danger`（与 button/badge/tag 一致，多数派）。
 *
 *  [WHY 有 `info` 这一档] 2026-11-15 L1 收口时发现：`info` 不是 `primary` 的别名 ——
 *  `--z-color-info` 与 `--z-color-primary` 是两套色（提示蓝 vs 品牌紫）。此前 alert 的
 *  `variant="info"` 只能用「组件局部取值」解释，于是它被冻结进 LEGACY_EXEMPTIONS。
 *  把 `info` 收进词表后，alert 的四个语义值全部落在 TONES 里，豁免清单少一条。
 */
export const TONES = ["default", "primary", "info", "success", "warning", "danger"] as const;
export type Tone = (typeof TONES)[number];

/** 外观（与语义色正交：同一色调既可以实心也可以描边）。 */
export const APPEARANCES = ["solid", "outline", "ghost", "soft", "link"] as const;
export type Appearance = (typeof APPEARANCES)[number];

/** 尺寸。`full` 不属于尺寸维度（它是宽度策略），已排除。 */
export const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export type Size = (typeof SIZES)[number];

/**
 * 历史取值 → 规范取值的映射。
 *
 * [WHY 要映射而不是直接改] 存量业务代码与页面写的是旧值，一刀切会让它们静默退回默认值
 * （退默认值不报错，只是变丑/变错——正是 [[bug-20260902-ce-kebab-attr-miss]] 那一类）。
 * 所以：**读取时兼容旧值，写入/生成时只用新值**。
 *
 * [WHY 这张表必须被 `resolveTone()` 读，而不是躺在导出里] 2026-11-15 实测：它此前
 * 只被 `public.ts` 转发，全仓**零处读取** —— 注释承诺「读取时兼容旧值」，实际
 * `tone="error"` 会静默退回默认色。一条「实现了但没接线」的伪能力，比没写更危险：
 * 读代码的人会以为兼容层存在。
 */
export const TONE_ALIASES: Record<string, Tone> = {
  error: "danger",
  secondary: "default",
};

/**
 * 把任意历史取值归一成规范语义色；不是合法取值就返回 null。
 *
 * 两个调用点：
 *   · 组件的兼容读（`variant="error"` → `tone="danger"`，见 `core/legacyAttr.ts`）；
 *   · 生成侧（AI 写错值时的兜底）。
 *
 * [WHY 返回 null 而不是退回 "default"] 「拼错」和「合法默认值」必须能区分：
 * 前者应当被日志/守卫看见，后者是正常渲染。退回 default 会把拼写错误永久藏起来。
 */
export function resolveTone(value: string | null | undefined): Tone | null {
  if (!value) return null;
  if ((TONES as readonly string[]).includes(value)) return value as Tone;
  return TONE_ALIASES[value] ?? null;
}

/**
 * 冻结的历史分歧清单。
 *
 * 这份清单**只允许缩小，不允许扩大**：存量组件按现状豁免，
 * 新增组件若用了清单外的取值组合，vocabulary-guard 测试会直接红。
 * 收敛一项就从这里删一项 —— 清单本身就是"待还的债"。
 */
export const LEGACY_EXEMPTIONS: Record<string, Record<string, string[]>> = {
  // 组件 tag → 属性名 → 允许的历史取值
  //
  // 2026-11-15（L1 收口）清空：最后 13 条分别是
  //   badge / tag / progress / m-chip / alert / skeleton / spinner  → tone / shape
  //   button                                                      → tone + appearance
  //   tabs                                                        → tab-style（并修掉它一直是死属性）
  //   report-table                                                → lines（布尔）
  //   avatar                                                      → 取值本就是 SIZES 子集，无需豁免
  //   drawer / modal                                              → size 里的 full 拆成 full 布尔
  // 清单空着不是「没债」的终点，而是**新增一律不许越界**的起点：新组件写 variant 会直接红。
};

/** 该属性是否属于全局词汇表管辖（只有通用维度才管，组件局部概念不管）。 */
export function governedDimension(prop: string): readonly string[] | null {
  if (prop === "tone") return TONES;
  if (prop === "appearance") return APPEARANCES;
  if (prop === "size") return SIZES;
  // `variant` 是**待拆分**的遗留词：新组件不应再用它承载语义色或外观
  if (prop === "variant") return [...TONES, ...APPEARANCES];
  return null;
}

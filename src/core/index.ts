// core 的**内部出口**：L0 内部与上层取 core 符号的唯一入口。
//
// [本文件不再是对外面] 2026-11-14（D-L0-3）之前它同时干两件事 ——「对外承诺」与
// 「内部出口」。两者共用一份清单，导致 L0 的内部工具永远进不了出口：
// 想给 `cleanFloat` 一条正规路径，就得把它加进对外面（`l0-exports` 立刻红）。
// 现在对外承诺在 `public.ts`，这里可以随 L0 内部重构自由增删。
//
// [谁该进这里] 判据只有一条：**上层或 L0 内部真的要经由出口取它**。
// 不是「core 里有什么就导出什么」—— 那等于把内部实现细节变成路径承诺。
//
// [禁止] 本文件不许做任何加工（不改名、不包装、不写工厂），只做转发。
// 有加工就有第二处语义，`public.ts` 与这里会随时间分叉。

// 对外面的全部符号（内部与上层可以照常取）
export * from "./public.js";

// 金额拆分（2026-11-24）：`m-price` 与 `m-goods-card` 共用一份「整数 / 小数 / 千分位」，
// 商品卡自己再折一遍就会出现「列表 ¥9.9、详情 ¥9.90」这种同价不同字。
// 只给内部：对外面不承诺金额格式（宿主展示规范各家不同），`priceParts` 随时可改签名。
export * from "./price.js";

// 仅内部使用的工具
// [WHY 收 cleanFloat 而不再让上层深引] 它有两个真实消费方：
// `page/data/dataset.ts`（aggregateRows）与 `report/core/report-group.ts`（累加）。
// 在此之前两处都写 `from "../../core/number.js"` —— L0 改一次文件布局就一起红。
// 注意这里**只给内部**：主入口（`src/index.ts`）转发的是 public.ts，不会带上它。
export { cleanFloat } from "./number.js";

// 日期纯函数（2026-11-15 从 `components/datepicker/` 下沉）
// [WHY 下沉] 有两个以上使用方且跨层：L1 的 datepicker / date-range / calendar 三个控件，
// 加上 L3 的 `syntax/lint` / `data/date-token` / `render/render-m` / H5 外壳。
// 在此之前 L3 写的是 `from "../../components/datepicker/presets.js"` —— 上层深引下层的私有文件。
// 只给内部：主入口转发的是 public.ts，不会带上它们（同 `cleanFloat`）。
export * from "./date/calendar.js";
export * from "./date/presets.js";

// 控件尺寸档位（2026-11-15，B3b）
// [WHY 在 core 而不是各组件各写一份] `size` 是**跨组件公共维度**，四个控件必须给出
// 完全相同的四个高度，否则「同一表单里两个 size="md" 的控件不等高」——而那正是要修的问题。
// 映射表在这里只有一份，`SIZE_SUPPORTED` 同时是守卫的判据来源。
// 只给内部：它不是对外承诺（对外面 public.ts 未变）。
export * from "./controlSize.js";

// 旧 attribute 的兼容读（2026-11-15，L1 收口）
// [WHY 只给内部] 它是给**组件作者**用的（本库自己的组件在收口期需要它）。
// 对外承诺里没有它 —— 宿主若要写自己的组件，`attributeChangedCallback` 本来就能自己写。
export { observeLegacyAttribute, syncAlias } from "./legacyAttr.js";

// 语义色归一（2026-11-15，L1 收口）
// [WHY 不进对外面] 它服务于「组件读旧 attribute」，是库内基础设施；宿主拿 TONE_ALIASES 自己判即可。
// 加进 public.ts 等于把一个内部归一函数变成对外承诺，而它随时可能改名/合并。
export { resolveTone } from "./vocabulary.js";

// 通用文案词表（2026-11-15，L2 文案收口）
// [WHY 只给内部] 组件默认值引用它，是为了「同概念只有一份」；宿主若要改文案，
// 覆盖组件的 `emptyText` 这类属性即可，不需要拿到词表本身。
// 一旦进 public.ts，就等于承诺「这些键名与分组永远不变」—— 那会把
// 「调整一个用词」变成破坏性变更。
export { COPY, COPY_EXEMPT } from "./copy.js";
export type { CopyKey } from "./copy.js";

// 表单字段的名称 / 错误态桥接（2026-11-15，a11y 收口）
// [WHY 只给内部] 它是给**本库的表单容器与控件**用的：`z-form-item` 靠它把 label
// 送进控件内部可聚焦件。宿主不需要知道 `part="field"` 这套内部约定 ——
// 一旦进对外面，就等于承诺「所有控件的主可聚焦件永远叫这三个 part 之一」。
export {
  FIELD_PART_SELECTOR,
  NAME_MARK,
  TRIGGER_MARK,
  ariaBool,
  composedContains,
  deepActiveElement,
  focusableOf,
  isEditableElement,
  bindTriggerAria,
  setContentCollapsed,
  bindFieldName,
  slottedControl,
  fieldOf,
  hasOwnAccessibleName,
  syncFieldName,
  clearFieldName,
} from "./a11y.js";
export type { FieldNameBinder, TriggerAriaBinder, TriggerAriaState } from "./a11y.js";

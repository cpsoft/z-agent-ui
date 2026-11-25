// 五层的**唯一真源**：哪个目录属于哪一层、每层允许引谁、外部依赖白名单。
//
// [WHY 单独一个模块，而不是各守卫各写一份] 层映射现在有三份拷贝：
// `l0-boundary-guard` 写的是「L0 内部三个目录互引规则」、`l1-boundary-guard` 写死了
// `page|report|editor|app` 四个「上层」、`l2-l3-boundary-guard` 有一份完整的 `LAYER` 表。
// 三份各自演化 ⇒ 新增目录时只要有一份忘了加，那条守卫就**安静地少查一个目录**
// （`l2-l3` 的注释里已经写明这个风险：「落进未知分支被跳过，零违规、退出码 0、看起来全绿」）。
// 本轮加 L4/L5 时如果照旧复制第四、第五份，漂移就成定局 —— 所以先收真源。
//
// [WHY 目录而不是配置文件] 目录同时是编译单元。写成目录，`ls src` 就是架构图；
// 写成配置就有两份定义。C3 把 5 个目录搬出 `editor/` 就是为了让「一个目录一个层号」成立。
//
// 消费方：`bin/layer-guard.mjs`（CLI 闸门）、`tests/unit/l2-l3-boundary-guard.test.ts`。

/** 层号与名字。名字只用于报错信息，不参与判据。 */
// 本仓库只有三层：L3 页面引擎 / L4 驱动 / L5 平台依赖这里的组件，是另一个仓库。
// 层号定义留在这里而不是各守卫里，仍然只有一份。
export const LAYER_NAME = {
  L0: "契约基座",
  L1: "基础控件",
  L2: "复杂控件",
};

/**
 * 目录 → 层号。
 *
 * [判据] 只按**顶层目录**归属。子目录在层内怎么组织（`page/syntax`、`editor/page-editor`）
 * 是层内事务，由各自的守卫（page 五子域允许边）负责，不在层守卫里表达。
 */
export const DIR_LAYER = {
  // L0 契约基座：与视觉无关的机制、令牌、原语
  core: "L0",
  primitives: "L0",
  theme: "L0",
  // L1 基础控件：只做一件事，不知道数据从哪来
  components: "L1",
  // L2 复杂控件：有自己的领域模型（行 / 节点 / 时间轴 / 块）
  report: "L2",
  flow: "L2",
  doc: "L2",
  content: "L2",
  property: "L2",
  app: "L2",
};

/**
 * 不属于层栈的目录：**框架适配层**。
 *
 * [WHY 单独一类而不是给个层号] `src/react` 按**标签名**生成包装器，不 import 任何组件模块。
 * 给它层号会造出假的依赖边（「适配层与按钮同层」），比显式缺席更不诚实。
 */
export const ADAPTERS = new Set(["react"]);

/** 层号 → 序数。**越层判据只比这个数**：引用方层号必须 ≥ 目标层号。 */
export const rankOf = (layer) => Number(String(layer).slice(1));

/** 路径（相对 `src/`，或绝对路径的尾段）→ 层号。未知返回 null。 */
export function layerOfPath(relPath) {
  const top = String(relPath).replace(/^\.?\//, "").split("/")[0];
  return DIR_LAYER[top] ?? null;
}

/**
 * 外部（非相对）依赖白名单。
 *
 * [WHY 每条都要 expires] 豁免一旦没有到期日就会变成永久豁免，而「零运行时依赖」是
 * 这个库的卖点之一（`package.json` 的 `dependencies` 是空的）。到期不是自动放行，
 * 是**报错**，逼人回来做决定：要么清掉，要么续期并写明为什么还清不掉。
 *
 * 现状实测（2026-11-17）：`marked` 2 处、`react` 1 处，其余一律不许有。
 */
export const EXTERNAL_ALLOW = [
  {
    name: "marked",
    files: ["content/markdown/Markdown.ts", "doc/render.ts"],
    expires: "2027-06-30",
    replacement: "REQ-038 INV-6 的 A 方案：自研 markdown 子集，以现有输出为行为基线做对拍",
  },
  {
    name: "react",
    files: ["react/createReactWrapper.ts"],
    expires: "never",
    replacement: "等价的包装层无法自研（React 本身就是被适配的对象），适配层不算组件来源",
  },
];

/** 每层的「出口」约定：跨层引用只准落在这些文件上。`<dir>` 会被替换成目录名。 */
export const LAYER_ENTRY = {
  L0: ["<dir>/index.ts", "core/public.ts"],
  L1: ["<dir>/index.ts"],
  L2: ["<dir>/index.ts"],
};

/**
 * page 的五个子域与允许的出边（层内事务，`l2-l3-boundary-guard` 消费）。
 * 放在这里是为了「层内结构」也只有一份真源。
 */
export const PAGE_SUBDOMAINS = {
  syntax: [],
  data: ["syntax"],
  render: ["syntax", "data"],
  edit: ["syntax", "data"],
  behavior: ["syntax"],
};

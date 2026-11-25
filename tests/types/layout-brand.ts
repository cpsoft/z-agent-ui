// 编译期断言：**布局只认卡**。
//
// [WHY 单独一个文件而且只在 tsc 里跑] vitest 用 esbuild 转译，`@ts-expect-error` 那行
// **根本不会被检查** —— 断言写错了也永远绿。这类「守卫」如果只在运行时生效，就等于没有：
// 下一个想往栅格里塞 `param` 的人，只会得到一段凭空出现的空白，而不是一条报错。
// 所以它必须由真正的类型检查器跑，命令是 `npm run type:check`（`tests/unit/page-layout.test.ts`
// 里有一条用例会调它，防止有人删了文件还以为守卫生效）。
//
// 被守的两件事：
//   1. 裸 `PageNode[]` 进不了 `layoutGrid` —— 要么先 `cardsOf()`，要么别进栅格；
//   2. `cardsOf().cards` 的类型恰好是 `CardNode[]`，正向路径不需要断言。
import type { PageNode } from "../../src/page/syntax/ast.js";
import { cardsOf, layoutGrid, type CardNode } from "../../src/page/render/layout.js";

declare const nodes: readonly PageNode[];
declare const cards: readonly CardNode[];

// 1. 节点数组不能当卡数组用：这行必须报错，否则品牌没起作用
// @ts-expect-error PageNode[] 不是 CardNode[]（布局不接受声明类节点）
layoutGrid(nodes, 12);

// 2. 单个节点也不行
// @ts-expect-error PageNode 不是 CardNode
const bare: CardNode = nodes[0];
void bare;

// 3. 正向：桥分出来的卡与已经分好的卡都能进布局
layoutGrid(cardsOf(nodes).cards, 12);
layoutGrid(cards, 12);

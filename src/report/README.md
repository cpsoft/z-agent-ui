# z-agent-ui/report — 报表模块

> **这一层不是「自定义页面」的模型。** 页面定义（PageDef / PageScript）见
> `wiki/reference/page-ast-contract.md` 与 `src/page/` —— 依据
> `zEtl/wiki/planning/plan-20261024-page-def-v2.md` §0：**单一真相是脚本，
> `ReportConfig` 不再作为并行形态**（存量 dashboard 由后端镜像成脚本落库）。
> 本模块服务的是**存量报表**：一屏多个图表卡的配置与渲染（`<z-report-card>`）。
> 两者抽象层级不同：这里的表达单元是「图表卡」，页面需要的是「版面区域」
> （head / KPI / 页签 / 属性网格 / 主从抽屉）。

框架无关的报表能力，按需取用。分两层：

| 层 | 内容 | 框架依赖 |
|---|---|---|
| `core/` | 类型 + 纯计算：聚合/分组/格式化/布局/筛选表达式/下钻换算 + 取数语义 | **无**（不碰 DOM，不引任何框架） |
| `elements/` | `<z-report-card>` 等自定义元素 | 无（Web Components，基类是库内 `BaseElement`） |

> **不是 Lit。** 本库所有组件都基于 `src/core/BaseElement.ts`（111 行，`render()` 返回
> HTML 字符串、`updated()` 无参）。别按 lit 的 `html``` + `changed: Map` 心智写这里的代码 ——
> 签名不对会在运行时 TypeError，且 `tsc` 查不出来（钩子是可选属性）。

当前已交付 `core/` 与 `elements/report-card`。其余渲染元素按下方「规划」逐个补齐。

## 两种引入方式

### 1. npm 子路径（默认，推荐）

单一真源，上游修 bug 自动下发。

```ts
// 按需引单个文件 —— 只想要布局计算就只拉这一个（约 3KB），不会拖进表达式引擎
import { gridColsOf, snapSpan } from "z-agent-ui/report/core/report-grid";

// 类型
import type { ReportConfig, ReportChart } from "z-agent-ui/report/core/types";

// 整个内核（120 个符号）
import * as report from "z-agent-ui/report/core";
```

### 2. 拷源码（需要深度定制时）

文件归你，随手可改。代价是上游更新不会自动下发。

```bash
npx z-agent-ui list                              # 看有哪些模块
npx z-agent-ui add report-core                   # 拷到 ./z-agent-ui-report/core/
npx z-agent-ui add report-core --dest src/lib    # 拷到 ./src/lib/z-agent-ui-report/core/
npx z-agent-ui add report-core --force           # 覆盖（会丢掉你的改动）
```

拷完直接把 import 换成相对路径：

```ts
import { cardKind } from "./z-agent-ui-report/core/report-card";
```

拷出来的文件之间全用相对路径，不依赖 z-agent-ui 这个包，独立项目也能 `tsc` 编译。

## 构建与类型声明

report 跟着主流程走，没有单独的打包命令：

```bash
npm run build        # vite build（85 个 entry，含 report/core）+ tsc -p tsconfig.json
```

主 `tsconfig.json` 的 `include: ["src/**/*.ts"]` 已覆盖 `src/report/**`，
`declarationDir: ./dist/types` 直接产出 `dist/types/report/core/*.d.ts`。
因此 `npm run build` 之后 `z-agent-ui/report/core` 与每个单文件子路径都同时有 JS 与类型。

> 早期曾有一条 `tsconfig.report.json` 旁路，原因是上游 tsc 在既有组件里有 44 行错误。
> 那次 npm 发布改造清干净之后旁路已删除 —— 两条声明管线必然漂移，能一条就不要两条。

**已知产物形态**：`preserveModules` 会把「只做 re-export 的 index 模块」并入引用方丢弃，
所以 `dist/report/core/index.js` 不存在。这不影响契约：`z-agent-ui/report/core` 指向 barrel
`dist/report/core.js`，单文件子路径各有自己的产物。

## 模块粒度

`core/` 下每个文件是一个独立关注点，可以单独取用：

| 文件 | 职责 | 行数 |
|---|---|---|
| `types.ts` | 报表配置、卡片、筛选、容器、草稿等全部类型 | ~510 |
| `report-funcs.ts` | 计算字段表达式：解析、校验、求值、函数库 | ~1150 |
| `report-container.ts` | 容器/页签模型（L1 布局） | ~320 |
| `report-switch.ts` | 字段井切换：维度↔指标、暂存与恢复 | ~240 |
| `report-filter-card.ts` | 筛选卡：目标解析、级联、生效判定 | ~225 |
| `report-kpi.ts` | 指标卡：环比、阈值、格式化 | ~210 |
| `report-layout.ts` | 布局回流：碰撞避让、自动重排 | ~110 |
| `report-grid.ts` | 栅格换算：列宽、跨度、吸附、缩放 | ~90 |
| `report-card.ts` | 卡片类型判定与槽位 | ~95 |
| `report-chart-style.ts` | 图表系列样式、调色板映射 | ~85 |
| `report-axis.ts` | 轴标签格式化 | ~60 |
| `report-text.ts` | 富文本卡行解析 | ~65 |
| `report-image.ts` | 图片卡：适配、占位、URL 校验 | ~35 |
| `report-date.ts` | 日期维度标签编解码 | ~27 |
| `column-label.ts` | 列展示名口径（别名 > 注释 > 物理名） | ~43 |
| `exploration.ts` | 下钻：点击 → 筛选条件（日期粒度转半开区间） | ~75 |

**约定**：`column-label.ts` 与 `exploration.ts` 里的换算是「差一天就是错数据 / 同一列显示两个名字」的地方 —— 任何宿主都必须引这一份，不要各自实现。

## 渲染元素

```html
<z-report-card id="card"></z-report-card>
```

```ts
import "z-agent-ui/report/card";
import type { ReportDataSource } from "z-agent-ui/report/core/data-source";

const card = document.getElementById("card") as HTMLElement & Record<string, unknown>;
card.dataSource = myDataSource;   // ReportDataSource：4 个必填取数方法
card.chart = chartConfig;         // ReportChart：种类由 cardKind() 派生
card.filters = boardFilters;      // 看板级筛选（与卡内筛选自动合并）
```

按 `cardKind(chart)` 分派到指标 / 图表 / 表格 / 明细 / 文本 / 图片六种形态。
`dataSource` 的三件事由元素负责，宿主不必自己写：

1. **取数**（`report-query.ts` 的唯一实现）—— 相对日期窗口、kpi 单值收敛、明细列推导
2. **竞态**：快速改筛选时只有最后一次请求的结果落地
3. **状态机**：加载 / 空 / 错误三态，错误经 `z-card-error` 事件带出宿主错误原对象

| 事件 | detail |
|---|---|
| `z-card-loaded` | `{ chartId, result, detail }` |
| `z-card-error` | `{ chartId, error }`（`error.status` / `error.code` 原样透出） |

图表与表格组件是**动态导入**的：只用指标卡/文本卡的页面不会加载图表与表格代码。

## 宿主接入的两个坑（zEtl 2026-10-25 实测）

这两条都是「页面能打开、控制台不报错，但卡片是空的」，所以写在这里。

**1. 纯副作用 import 会被打包器整块摇掉。**
宿主写 `import "z-agent-ui/report/card"` 来注册元素时，只有当本包 `package.json` 的
`sideEffects` 覆盖到该文件才会保留。本包原先只列了 `dist/**`，源码消费方（vendor 副本 /
copy-in 之后再引）会被摇掉，`<z-report-card>` 退化成未知标签 —— 一排空框，零报错。
`sideEffects` 已补 `./src/report/**/*.ts`；宿主侧另有一条显式守卫（见 zEtl 的
`report-card-host.tsx`），未注册时直接显示原因而不是空白。

**2. 宿主已有 z-agent-ui 时不要在元素里再 define 一次。**
本库组件都是无条件 `customElements.define`。宿主应用通常已经从 `z-agent-ui/report/chart`
引过一份，元素再从源码 dynamic import 一份会抛 `z-chart already defined` ——
而抛点在一次异步加载里，症状同样是空白卡。所以元素的动态导入都带
`customElements.get()` 前置判断：**宿主已有就复用宿主那份**。

## 列头口径

表格列头（别名 > 源表注释 > 物理名、日期粒度、聚合标签、小数位/千分位/百分数）
全部在 `core/report-columns.ts`，元素与宿主页面共用同一份 —— 各写一份的症状是
「同一张报表在两种渲染器下列名不同」（zEtl 实测：元素版把 `d`/`city_name` 原样印成表头）。

## 规划

- [x] `core/` 内核（类型 + 纯计算 + 取数语义 + 数据源契约）
- [x] `<z-report-card>` 单卡渲染（指标 / 图表 / 表格 / 明细 / 文本 / 图片，按 `cardKind` 分派）
- [ ] `<z-report-filter>` 筛选栏（相对日期、区间、枚举搜索）
- [ ] `<z-report-board>` 看板容器（栅格布局 + 卡片编排 + 全局筛选 + 目录树）
- [ ] `<z-report-editor>` 编辑器（字段井 + 各设置弹窗），最后一个做

> 原来的 `<z-report-detail>` 不再单列：明细就是 `cardKind === "detail"` 的卡，
> 由 `<z-report-card>` 统一渲染（走 detail 接口、逐行不聚合、`.maxHeight` 限高）。
> 单独再造一个元素只会让「明细」这件事有两份实现。

每个元素独立成 registry item，可以只引入需要的那个。

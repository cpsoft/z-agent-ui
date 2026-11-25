// `z-report-table` 测试的共用夹具：默认三列表格与列选择器钻取助手。
//
// [WHY] 2026-10-25 系统审计：原 report-table.test.ts 单文件 872 行，超 600 行上限。
// 按「渲染 / 排序与行点击 / 列控制 / 外观与固定列」拆成 4 个文件，夹具集中到这里。
// [WHY] 这里必须是**副作用导入**（import "..."，没有绑定名），不能靠测试文件里的
// `import { ZReportTable } from ".../ReportTable"`：esbuild 在 .ts 里会**丢弃未使用的具名导入**
// （TS 认为它可能只是类型引用），连模块求值一起丢掉 ⇒ customElements 里没有 z-report-table，
// createElement 拿到未升级的 HTMLElement，报错长这样：`el.shadowRoot is null`。
// 四个分册都有这个陷阱，统一在这里注册一次。
import "../../../src/report/table/ReportTable";

// [WHY] 列选择器已抽为独立组件 z-column-selector：内嵌于表格工具栏自动绑定宿主，
// 查询/交互须钻取子组件 shadow；表格每次重建都会新建子组件实例，交互后必须重新查询。

export function createTable(): any {
  const el = document.createElement("z-report-table") as any;
  el.columns = [
    { key: "name", title: "Name", sortable: true, width: "120px" },
    { key: "amount", title: "Amount", sortable: true, align: "right", width: "100px" },
    { key: "note", title: "Note", width: "200px" },
  ];
  el.data = [
    { name: "Alpha", amount: 300, note: "first row" },
    { name: "Beta", amount: 100, note: "second row" },
    { name: "Gamma", amount: 200, note: "third row" },
  ];
  document.body.appendChild(el);
  return el;
}

export function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export async function rendered(el: any): Promise<void> {
  await tick();
  await tick();
}

// [WHY] 列选择器已抽为独立组件 z-column-selector([[REQ-015-column-selector]]):
// 内嵌于表格工具栏自动绑定宿主, 查询/交互须钻取子组件 shadow;
// 表格每次重建都会新建子组件实例, 交互后必须重新查询
export function colSel(el: any): any {
  return el.querySelector("z-column-selector");
}

export function inColSel(el: any, sel: string): any {
  return colSel(el).shadowRoot!.querySelector(sel);
}

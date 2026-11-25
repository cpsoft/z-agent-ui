// 布局族新增段（Space / Flex / Grid / Sticky / Typography / Descriptions / Popconfirm）的接线。
//
// 与 D2-1 拆模块同理由：同一页里的示例各自持有
// 自己的元素引用与状态，并进一个模块就会出现 `const el` 撞名，只能靠重命名掩盖。
//
// 只给 Popconfirm 接线：其余六段声明即生效（间距、栅格、吸顶、排版、键值表），
// 没有接线正说明它们不需要宿主配合。Popconfirm 的确认/取消要落地成结果。

// 组件在这里 import，不在 html 的 `<script>` 里：本页 html 段是「死标记」。
// 少了 import 不会报错，只会得到一堆行内块（`customElements.get("z-grid") === undefined`）。
import "../../src/components/button/index.js";
import "../../src/components/input/index.js";
import "../../src/components/tag/index.js";
import "../../src/components/space/index.js";
import "../../src/components/flex/index.js";
import "../../src/components/grid/index.js";
import "../../src/components/grid/index.js";
import "../../src/components/typography/index.js";
import "../../src/components/sticky/index.js";
import "../../src/components/descriptions/index.js";
import "../../src/components/descriptions/index.js";
import "../../src/components/popconfirm/index.js";

const log = document.getElementById("pc-log");

function report(text: string): void {
  if (log) log.textContent = text;
}

// 三个气泡共用一条日志：`z-confirm` / `z-cancel` 都带 `composed: true`，直接从 document 收。
document.addEventListener("z-confirm", (e) => {
  const host = (e.target as HTMLElement | null)?.closest?.("z-popconfirm");
  if (!host) return;
  report(`已确认：${host.getAttribute("title") ?? ""}（tone=${host.getAttribute("tone") ?? "primary"}）`);
});

document.addEventListener("z-cancel", (e) => {
  const host = (e.target as HTMLElement | null)?.closest?.("z-popconfirm");
  if (!host) return;
  report(`已取消：${host.getAttribute("title") ?? ""}`);
});

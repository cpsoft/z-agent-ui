// 从旧分类页 navigation 搬来的示例与接线。
// 五页的接线各自用了同名变量
// （selectEl / radioGroup / ...），并到一个模块里就是重名错误；拆成模块则天然隔离。
// 每个模块只管「把自己那几个示例接上」，壳（侧栏/主题/语言）由页面统一 initShell。

  // Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/components/tabs/index.js";
  import "../../src/components/segmented/index.js";
  import "../../src/components/context-menu/index.js";
  import "../../src/components/tab-panel/index.js";
  import "../../src/components/pagination/index.js";
  import "../../src/components/accordion/index.js";
  import "../../src/components/accordion-item/index.js";

  // ── Tabs ──────────────────────────────────────────────

  document.querySelectorAll("z-tabs").forEach((tabs) => {
    tabs.addEventListener("z-change", (e) => {
      console.log("tab changed:", e.detail);
    });
  });

  // ── Pagination（总记录数 + 信息区 + 页容量选择器） ────────

  const RECORD_COUNT = 256;
  const records = Array.from({ length: RECORD_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Item ${String(i + 1).padStart(3, "0")}`,
    status: i % 3 === 0 ? "active" : i % 3 === 1 ? "pending" : "done",
  }));

  const paginationEl = document.getElementById("pagination-demo");
  const paginationVal = document.getElementById("pagination-value");
  const paginationRecords = document.getElementById("pagination-records");

  function renderPaginationRecords() {
    const { current, pageSize } = paginationEl;
    const start = (current - 1) * pageSize;
    const slice = records.slice(start, start + pageSize);
    paginationRecords.innerHTML = slice
      .map(
        r =>
          `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 10px;border-bottom:1px solid var(--z-color-border);font-size:13px;">` +
          `<span>${r.name}</span>` +
          `<span style="color:var(--z-color-text-secondary)">${r.status}</span>` +
          `</div>`,
      )
      .join("");
  }

  paginationEl.addEventListener("z-change", (e) => {
    const d = e.detail;
    paginationVal.textContent = `Page: ${d.page} / ${d.total} (page size: ${d.pageSize}, total records: ${d.totalRecords})`;
    renderPaginationRecords();
  });
  renderPaginationRecords();

  // ── Accordion ──────────────────────────────────────────

  const accordionVal = document.getElementById("accordion-value");
  document.getElementById("accordion-demo").addEventListener("z-change", (e) => {
    const d = e.detail;
    accordionVal.textContent = `Open items: [${d.openItems.join(", ")}]`;
  });

  // ── Context Menu（光标锚点菜单） ────────────────────────

  const ctxMenu = document.getElementById("ctx-demo") as
    | (HTMLElement & { showAt(x: number, y: number): void })
    | null;
  const ctxArea = document.getElementById("ctx-area");
  const ctxValue = document.getElementById("ctx-value");

  ctxArea?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    ctxMenu?.showAt((e as MouseEvent).clientX, (e as MouseEvent).clientY);
  });

  ctxMenu?.addEventListener("z-pick", (e) => {
    if (ctxValue) ctxValue.textContent = `picked: ${(e as CustomEvent).detail.key}`;
  });

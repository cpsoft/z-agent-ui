// 从旧分类页 overlays 搬来的示例与接线。
// 五页的接线各自用了同名变量
// （selectEl / radioGroup / ...），并到一个模块里就是重名错误；拆成模块则天然隔离。
// 每个模块只管「把自己那几个示例接上」，壳（侧栏/主题/语言）由页面统一 initShell。

  // Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/components/modal/index.js";
  import "../../src/components/tooltip/index.js";
  import "../../src/components/menu/index.js";
  import "../../src/components/menu-item/index.js";
  import "../../src/components/popover/index.js";
  import "../../src/components/datepicker/index.js";

  // ── Menu ──────────────────────────────────────────────

  const menuEl = document.getElementById("menu-demo");
  const menuVal = document.getElementById("menu-value");
  menuEl.addEventListener("z-select", (e) => {
    menuVal.textContent = `Action: ${e.detail.value}`;
  });

  // ── Modal ─────────────────────────────────────────────

  const modal = document.getElementById("demo-modal");
  const modalVal = document.getElementById("modal-value");

  document.getElementById("open-modal").addEventListener("z-click", () => {
    modal.show();
  });

  modal.addEventListener("z-open", () => (modalVal.textContent = "Status: open"));
  modal.addEventListener("z-close", () => (modalVal.textContent = "Status: closed"));

  document.getElementById("modal-cancel").addEventListener("z-click", () => {
    modal.close();
  });
  document.getElementById("modal-confirm").addEventListener("z-click", () => {
    modal.close();
    modalVal.textContent = "Status: confirmed!";
  });

  // ── Popover ────────────────────────────────────────────

  const popoverVal = document.getElementById("popover-value");
  document.getElementById("popover-click-demo").addEventListener("z-open", () => {
    popoverVal.textContent = "Popover: open";
  });
  document.getElementById("popover-click-demo").addEventListener("z-close", () => {
    popoverVal.textContent = "Popover: closed";
  });

  // ── Datepicker ──────────────────────────────────────────

  const dpSingle = document.getElementById("datepicker-single");
  const dpRange = document.getElementById("datepicker-range");
  const dpVal = document.getElementById("datepicker-value");

  dpSingle.addEventListener("z-change", (e) => {
    const d = e.detail;
    dpVal.textContent = `Selected: ${d.value}`;
  });
  dpRange.addEventListener("z-change", (e) => {
    const d = e.detail;
    dpVal.textContent = `Range: ${d.start} → ${d.end}`;
  });

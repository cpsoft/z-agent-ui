// 从旧分类页 feedback 搬来的示例与接线。
// 五页的接线各自用了同名变量
// （selectEl / radioGroup / ...），并到一个模块里就是重名错误；拆成模块则天然隔离。
// 每个模块只管「把自己那几个示例接上」，壳（侧栏/主题/语言）由页面统一 initShell。

  // Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/components/alert/index.js";
  import "../../src/components/spinner/index.js";
  import "../../src/components/divider/index.js";
  import "../../src/components/skeleton/index.js";
  import "../../src/components/progress/index.js";
  import { ZToast } from "../../src/components/toast/index.js";

  // ── Toast ─────────────────────────────────────────────

  document.getElementById("toast-success").addEventListener("z-click", () => {
    ZToast.success("Saved successfully!");
  });
  document.getElementById("toast-error").addEventListener("z-click", () => {
    ZToast.error("Operation failed. Please retry.");
  });
  document.getElementById("toast-warning").addEventListener("z-click", () => {
    ZToast.warning("This action cannot be undone.", 5000);
  });
  document.getElementById("toast-info").addEventListener("z-click", () => {
    ZToast.info("New version available.");
  });
  document.getElementById("toast-dismiss-all").addEventListener("z-click", () => {
    ZToast.dismissAll();
  });

  // ── Alert ──────────────────────────────────────────────

  const alertCloseVal = document.getElementById("alert-close-value");
  ["alert-info-demo", "alert-error-demo"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("z-close", () => {
      alertCloseVal.textContent = `Alert "${id}" closed at ${new Date().toLocaleTimeString()}`;
    });
  });

  // ── Progress ───────────────────────────────────────────

  let progressVal = 60;
  document.getElementById("progress-simulate").addEventListener("z-click", () => {
    const el = document.getElementById("progress-demo");
    progressVal = (progressVal + 15) % 105;
    el.value = Math.min(100, progressVal);
  });

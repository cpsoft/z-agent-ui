// L0 两个机制件的可观察演示：portal 搬 DOM、position 算坐标 —— 输出都能用眼睛验证。
import "../../src/primitives/portal/index.js";
import "../../src/primitives/position/index.js";
import "../../src/components/button/index.js";

// ── position：改 placement，浮层跟着换边 ────────────────────
const posEl = document.getElementById("pos-demo") as
  | (HTMLElement & { placement: string })
  | null;
const posLog = document.getElementById("pos-log");

function report(): void {
  if (!posEl || !posLog) return;
  const anchor = document.getElementById("pos-anchor")?.getBoundingClientRect();
  const box = posEl.getBoundingClientRect();
  if (!anchor) return;

  // 间距按方向取轴：上下档看纵向、左右档看横向，再判断是否翻转到另一侧。
  const side = (posEl.placement || "bottom").split("-")[0];
  const vertical = side === "top" || side === "bottom";
  const forward = side === "bottom" || side === "right";
  const gap = vertical
    ? forward
      ? box.top - anchor.bottom
      : anchor.top - box.bottom
    : forward
      ? box.left - anchor.right
      : anchor.left - box.right;

  const where = (gap >= 0) === forward ? "贴在原定一侧" : "已翻转到另一侧（flip 生效）";
  posLog.textContent =
    `placement="${posEl.placement}" · 浮层 ${Math.round(box.width)}×${Math.round(box.height)}` +
    ` · ${vertical ? "纵向" : "横向"}间距 ${Math.round(gap)}px · ${where}`;
}

for (const btn of document.querySelectorAll<HTMLElement>("[data-placement]")) {
  btn.addEventListener("click", () => {
    if (!posEl) return;
    posEl.placement = btn.dataset.placement ?? "bottom-start";
    window.setTimeout(report, 50);
  });
}

// 滚动/改尺寸后浮层会重算（这是 FloatingPosition 的活儿），日志跟着更新
window.addEventListener("scroll", () => window.requestAnimationFrame(report), { passive: true });
window.addEventListener("resize", report);
window.setTimeout(report, 120);

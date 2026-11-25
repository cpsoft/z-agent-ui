// 密度矩阵：**现算**，不手抄。三档密度 × 四档 size 是 12 个数字，手抄的表格有两条
// 失效路径且都不报错：tokens 调档后数字还是旧的；size 映射改了，数字对但「引用哪个令牌」描述错了。
// 这里逐档切 `<html data-density>`，挂一个真的 `<z-input size=…>` 量 offsetHeight。
import "../../src/components/input/index.js";

const DENSITIES = [
  { attr: "", name: "default" },
  { attr: "compact", name: "compact" },
  { attr: "comfortable", name: "comfortable" },
] as const;

const SIZES = ["xs", "sm", "md", "lg"] as const;

const probe = document.getElementById("density-probe");
const table = document.getElementById("density-matrix");
const tbody = table?.querySelector("tbody");

/** 每个 size 引用的令牌名 —— 与 `src/core/controlSize.ts` 的映射表同一口径。 */
const TOKEN: Record<string, string> = {
  xs: "--z-control-h-xs",
  sm: "--z-input-height",
  md: "--z-control-h",
  lg: "--z-control-h-lg",
};

/** 等一帧：BaseElement 的首次渲染是**异步**的（requestUpdate → 微任务/帧），
 *  刚 append 就量高度会拿到 0，而这个 0 会被当成「这一档就是 0px」写进表格。 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function heightOf(size: string): Promise<number> {
  if (!probe) return 0;
  probe.innerHTML = "";
  const el = document.createElement("z-input");
  el.setAttribute("size", size);
  el.setAttribute("placeholder", "量高度");
  probe.appendChild(el);
  await nextFrame();
  return Math.round(el.getBoundingClientRect().height);
}

function tokenOf(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || "—";
}

const html = document.documentElement;
const original = html.getAttribute("data-density");

async function render(): Promise<void> {
  const rows: string[] = [];

  for (const d of DENSITIES) {
    // default 是「没有这个属性」的那个状态，不是 data-density="default"
    if (d.attr) html.setAttribute("data-density", d.attr);
    else html.removeAttribute("data-density");

    const cells: string[] = [];
    for (const size of SIZES) {
      const h = await heightOf(size);
      const tokenName = TOKEN[size];
      cells.push(`<td><b>${h}</b><span class="ex-tokenname">${tokenName} · ${tokenOf(tokenName)}</span></td>`);
    }
    rows.push(`<tr><td><b>${d.name}</b></td>${cells.join("")}</tr>`);
  }

  if (original) html.setAttribute("data-density", original);
  else html.removeAttribute("data-density");
  if (probe) probe.innerHTML = "";

  if (!tbody) return;
  tbody.innerHTML = rows.join("");

  // 结论写在表下面，且强调「量出来的」—— 这句话本身也是判据：
  // 万一哪天 size 不再只改高度，12 个数字会变得不成套，表上一眼能看出来。
  const caption = document.createElement("p");
  caption.className = "ex-note";
  caption.textContent =
    "↑ 12 个数字全部由 offsetHeight 量得（量的时候临时切了 <html data-density>，之后已还原）。" +
    "每格下面那行是它引用的令牌与当前值 —— size 改的是引用，密度改的是令牌本身。";
  table?.insertAdjacentElement("afterend", caption);
}

void render();

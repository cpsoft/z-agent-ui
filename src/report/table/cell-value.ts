// 行内控件「这一格改成了什么」—— PC 表格与 H5 共用的唯一一份判据。
//
// [WHY 必须只有一份] 这段逻辑原先在两处各写了一遍（`table-interactions.ts` 的
// `handleCellClick` 与 `PageMView._onCell`），而两份的 switch 真值判定**并不一样**：
// PC 认 `yes/on/y`，H5 只判 `0/空/false`。于是同一份脚本在桌面上「关 → 开」正确，
// 在手机上把 `'na'` 这类值也当成「开」—— 上报的永远是 0，用户点半天没反应。
// 加 `ui=text|number` 时这种分叉只会更多（数值归一、空值语义、边界处理），
// 所以先把它抽出来，两端一起用。

/** `col ui=` 的形态。`action` 不走这条（它没有 `data-cell`）。 */
export type CellUi = "switch" | "stepper" | "button" | "text" | "number";

/** `data-cellui` 的取值；认不出来当 `button`（存量行为）。 */
export function cellUiOf(cell: HTMLElement): CellUi {
  const v = cell.dataset.cellui ?? "";
  if (v === "switch" || v === "stepper" || v === "text" || v === "number" || v === "button") return v;
  // [WHY 还要看 class] 早期产物只带 class 不带 `data-cellui`（H5 的 `.zpm-switch` 与
  // 表格侧的 `.zp-cellctl--switch` 是两套外观家族）。纯按 class 判会把开关当成按钮，
  // 于是「关掉」也上报 1 —— 2026-11-19 在手机实测踩过。
  if (cell.classList.contains("zpm-switch") || cell.classList.contains("zp-cellctl--switch")) return "switch";
  if (cell.classList.contains("zpm-stepper") || cell.classList.contains("zp-cellctl--stepper")) return "stepper";
  return "button";
}

/** 这次操作的结果。`changed=false` 表示值没变，**不该上报**（宿主会白跑一次写入）。 */
export interface CellNext {
  next: string;
  changed: boolean;
}

export interface CellNextOpts {
  /** stepper 的步长与上下限（`col step/min/max`）。 */
  step?: number;
  min?: number;
  max?: number;
  /** 本格的当前值（从行对象取，不用 DOM —— DOM 上的 `data-value` 是渲染时的旧值）。 */
  old: unknown;
  /** stepper 的方向：点 `data-act=dec` 传 -1。 */
  dir?: -1 | 1;
  /**
   * `ui=text|number` 这次**输入框里**的值（失焦 / 回车时读 `input.value`）。
   * `undefined` 表示「不是输入提交」—— 那时返回 `null`，调用方直接结束。
   */
  typed?: string;
}

/**
 * 算这一格的新值。`null` = 这次不该上报（输入态被点击、或数值不合法）。
 *
 * 三种形态的语义差异写在这里，调用方不需要再判：
 * - `switch` 翻转；
 * - `stepper` 按步长加减并 clamp 在 `[min,max]`；
 * - `text|number` 取**输入框里的值**（不是 `old±1`）。
 *
 * [WHY number 不在输入时 clamp] 用户打「5」是想打「50」：在 `5` 这一刻就按 `min=10`
 * 往上顶成 10，第二个键就接到了 `0` 后面变成 `100` —— 边输边纠正的手感比不纠正更糟。
 * 边界交给 input 的 `min=` / `max=` 原生属性（提交时浏览器拦），这里只做**归一**。
 */
export function nextCellValue(ui: CellUi, opts: CellNextOpts): CellNext | null {
  const { old } = opts;
  if (ui === "switch") {
    // 与 `truthyText` 同一套真值：后端常见的 `1/0`、`true/false`、`yes/no`、`on/off` 都认。
    const s = old === null || old === undefined ? "" : String(old).trim().toLowerCase();
    const on = s === "1" || s === "true" || s === "yes" || s === "on" || s === "y";
    return { next: on ? "0" : "1", changed: true };
  }
  if (ui === "stepper") {
    const dir = opts.dir === -1 ? -1 : 1;
    const step = opts.step ?? 1;
    const min = opts.min ?? Number.NEGATIVE_INFINITY;
    const max = opts.max ?? Number.POSITIVE_INFINITY;
    const cur = Number(old ?? 0) || 0;
    const v = Math.min(max, Math.max(min, cur + dir * step));
    return { next: String(v), changed: v !== cur };
  }
  if (ui === "text" || ui === "number") {
    if (opts.typed === undefined) return null;
    const typed = opts.typed;
    if (ui === "text") return { next: typed, changed: String(old ?? "") !== typed };
    const before = old === null || old === undefined || old === "" ? null : Number(old);
    const t = typed.trim();
    if (t === "") return { next: "", changed: before !== null };
    const n = Number(t);
    // 不是数就不上报：让输入框停在用户打错的字上（他看得见、改得掉），
    // 而不是把它变成 `NaN` 写进数据、或者静默退回旧值。
    if (!Number.isFinite(n)) return null;
    return { next: String(n), changed: before === null || before !== n };
  }
  return { next: "1", changed: true };
}

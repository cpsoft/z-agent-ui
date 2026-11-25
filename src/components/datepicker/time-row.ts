// `z-datepicker` 的时间行（`precision="minute"`）：渲染 + 从 DOM 读回。
//
// [WHY 单独一个文件] 面板的行为（选日期、区间状态机、键盘）与「时间这一行」是两件事：
// 前者是控件的主干，后者是可选的精度扩展。挤在一起时，`Datepicker.ts` 会为了 26 行
// 越过行数基线（G2 只减不增），而拆出来之后两边各自都能再长。
//
// 两条约束写在这里，改的时候别再发明第三种：
//   ① 编辑器里这两个框是 `type=text` + `inputmode=numeric`：`type=number` 在 iOS 上
//      允许 `e` / `-`，读回来还是得校验；而它会把 `09` 显示成 `9`。
//   ② 非法值**不写入**、只标红：写进值里就会当成参数下推，后端把不认识的值当没写 ⇒
//      查询静默退回全量。

import { escapeAttr, escapeHtml } from "../../core/index.js";

export interface TimeRowOpts {
  mode: "single" | "range";
  /** 单日值 / 区间起点的当前时间（`HH:mm`）。 */
  time: string;
  /** 区间终点的当前时间；`mode=single` 时不渲染。 */
  timeTo: string;
}

/** 时间行的 HTML；`mode=range` 时两端各一对。 */
export function timeRowHtml(o: TimeRowOpts): string {
  const done = `<button type="button" class="z-datepicker__time-done" data-time-done>确定</button>`;
  if (o.mode === "range") {
    return (
      `<div class="z-datepicker__time" part="time">` +
      timeBox("start", "起", o.time) +
      timeBox("end", "止", o.timeTo) +
      done +
      `</div>`
    );
  }
  return `<div class="z-datepicker__time" part="time">` + timeBox("value", "时间", o.time) + done + `</div>`;
}

function timeBox(side: string, label: string, time: string): string {
  const [h, m] = time.split(":");
  const box = (part: string, value: string, max: number, aria: string): string =>
    `<input class="z-datepicker__time-field" type="text" inputmode="numeric" maxlength="2"` +
    ` data-time-side="${escapeAttr(side)}" data-time-part="${part}"` +
    ` value="${escapeAttr(value)}" aria-label="${escapeAttr(aria)}"` +
    ` title="0–${max}">`;
  return (
    `<span class="z-datepicker__time-label">${escapeHtml(label)}</span>` +
    box("h", h, 23, `${label}时`) +
    `<span class="z-datepicker__time-sep">:</span>` +
    box("m", m, 59, `${label}分`)
  );
}

/** 读一端的输入框：合法返回 `HH:mm`，非法返回 null 并把那两个框标红。 */
export function readTimeSide(panel: HTMLElement, side: string): string | null {
  const h = panel.querySelector<HTMLInputElement>(`[data-time-side="${side}"][data-time-part="h"]`);
  const m = panel.querySelector<HTMLInputElement>(`[data-time-side="${side}"][data-time-part="m"]`);
  if (!h || !m) return null;
  const num = (el: HTMLInputElement, max: number): number | null => {
    const raw = el.value.trim();
    if (!/^\d{1,2}$/.test(raw)) return null;
    const n = Number(raw);
    return n >= 0 && n <= max ? n : null;
  };
  const hh = num(h, 23);
  const mm = num(m, 59);
  h.classList.toggle("is-invalid", hh === null);
  m.classList.toggle("is-invalid", mm === null);
  if (hh === null || mm === null) return null;
  // 归一写回：用户打「9」→ 框里变「09」，否则下一次 change 读到的还是「9」
  h.value = String(hh).padStart(2, "0");
  m.value = String(mm).padStart(2, "0");
  return `${h.value}:${m.value}`;
}

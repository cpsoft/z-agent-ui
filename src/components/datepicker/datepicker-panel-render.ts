import {
  ariaBool,
  buildGrid,
  clampPresetRange,
  compareISO,
  dayOf,
  escapeAttr,
  escapeHtml,
  getFirstDayOfWeek,
  html,
  isISOInRange,
  presetIsActive,
  presetRangeOf,
  t,
  timeOf,
  todayISO,
  type CalendarCell,
  type ISOString,
} from "../../core/index.js";
import { getMonthLabel, renderGridTable } from "./calendar.js";
import { timeRowHtml } from "./time-row.js";

export interface DatepickerPanelRenderState {
  mode: "single" | "range";
  precision: "day" | "minute";
  value: string;
  start: string;
  end: string;
  min: string;
  max: string;
  locale: string;
  presets: string;
  prevMonthLabel: string;
  nextMonthLabel: string;
  viewYear: number;
  viewMonth: number;
  focusISO: ISOString | null;
  hoverISO: ISOString | null;
  pendingStart: ISOString | null;
  pendingTime: string;
  pendingTimeEnd: string;
}

export function resolveTimePart(raw: string, pending: string, fallback: string): string {
  return timeOf(raw) || pending || fallback;
}

export function renderDatepickerPresets(s: DatepickerPanelRenderState): string {
  if (s.mode !== "range" || !s.presets.trim()) return "";
  const now = new Date();
  const items = s.presets
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((name) => {
      const range = presetRangeOf(name, now);
      if (!range) return "";
      const usable = clampPresetRange(range, s.min, s.max) !== null;
      const active = presetIsActive(name, dayOf(s.start), dayOf(s.end), now, s.min, s.max);
      return (
        `<button type="button" class="z-datepicker__preset${active ? " is-active" : ""}"` +
        ` data-preset="${escapeAttr(name)}" aria-pressed="${active ? "true" : "false"}"` +
        (usable ? "" : ` disabled aria-disabled="true" title="${escapeAttr(t("dateOutOfRange"))}"`) +
        `>${escapeHtml(name)}</button>`
      );
    })
    .filter(Boolean)
    .join("");
  if (!items) return "";
  return (
    `<div class="z-datepicker__presets" part="presets" role="group" aria-label="${escapeAttr(t("quickRanges"))}">` +
    `${items}</div>`
  );
}

export function renderDatepickerCell(
  s: DatepickerPanelRenderState,
  cell: CalendarCell,
  today: ISOString,
): string {
  const { iso, day, inMonth } = cell;
  const rangeMode = s.mode === "range";
  const cls = ["z-datepicker__cell"];
  const disabled = !inMonth || !isISOInRange(iso, s.min, s.max);
  if (!inMonth) cls.push("z-datepicker__cell--out");
  else if (!isISOInRange(iso, s.min, s.max)) cls.push("z-datepicker__cell--disabled");
  if (iso === today) cls.push("z-datepicker__cell--today");

  let ariaSelected = "false";
  if (rangeMode) {
    if (s.start && iso === dayOf(s.start)) {
      cls.push("z-datepicker__cell--range-start");
      ariaSelected = "true";
    }
    if (s.end && iso === dayOf(s.end)) {
      cls.push("z-datepicker__cell--range-end");
      ariaSelected = "true";
    }
    const inCommitted = !!(
      s.start &&
      s.end &&
      compareISO(iso, dayOf(s.start)) > 0 &&
      compareISO(iso, dayOf(s.end)) < 0
    );
    const inHover = !!(
      s.pendingStart &&
      s.hoverISO &&
      compareISO(iso, s.pendingStart) >= 0 &&
      compareISO(iso, s.hoverISO) <= 0
    );
    if (inCommitted || inHover) cls.push("z-datepicker__cell--range-in");
  } else if (s.value && iso === dayOf(s.value)) {
    cls.push("z-datepicker__cell--selected");
    ariaSelected = "true";
  }

  const isFocus = iso === s.focusISO;
  if (isFocus) cls.push("z-datepicker__cell--focus");
  return html`<td
    class="${cls.join(" ")}"
    role="gridcell"
    data-iso="${iso}"
    tabindex="${isFocus ? 0 : -1}"
    aria-selected="${ariaSelected}"
    aria-disabled="${ariaBool(disabled)}"
    ${iso === today ? 'aria-current="date"' : ""}
    part="cell"
  >${day}</td>`;
}

export function renderDatepickerPanel(s: DatepickerPanelRenderState): string {
  const weekStart = getFirstDayOfWeek(s.locale);
  const cells = buildGrid(s.viewYear, s.viewMonth, weekStart);
  const today = todayISO();
  const monthLabel = getMonthLabel(s.locale, s.viewYear, s.viewMonth);
  const timeHtml =
    s.precision !== "minute"
      ? ""
      : s.mode === "range"
        ? timeRowHtml({
            mode: "range",
            time: resolveTimePart(s.start, s.pendingTime, "00:00"),
            timeTo: resolveTimePart(s.end, s.pendingTimeEnd, "23:59"),
          })
        : timeRowHtml({
            mode: "single",
            time: resolveTimePart(s.value, s.pendingTime, "00:00"),
            timeTo: "",
          });

  return html`
    ${renderDatepickerPresets(s)}
    <div class="z-datepicker__header" part="header">
      <button type="button" class="z-datepicker__nav" data-nav="prev" part="nav-prev" aria-label="${escapeAttr(s.prevMonthLabel)}">‹</button>
      <div class="z-datepicker__label" part="label">${monthLabel}</div>
      <button type="button" class="z-datepicker__nav" data-nav="next" part="nav-next" aria-label="${escapeAttr(s.nextMonthLabel)}">›</button>
    </div>
    ${renderGridTable({
      prefix: "z-datepicker",
      locale: s.locale,
      weekStart,
      cells,
      today,
      ariaLabel: monthLabel,
      cellHTML: (cell, tDay) => renderDatepickerCell(s, cell, tDay),
    })}
    ${timeHtml}
  `;
}

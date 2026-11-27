import { formatISO, getFirstDayOfWeek, parseISO, type ISOString } from "../../core/index.js";

export interface DatepickerKeyHost {
  getFocusISO(): ISOString | null;
  getLocale(): string;
  isSelectable(iso: ISOString): boolean;
  moveFocus(iso: ISOString | null, delta: number): void;
  navMonth(dir: number, keepFocus: boolean): void;
  navYear(dir: number): void;
  selectISO(iso: ISOString): void;
  closePanel(): void;
}

/** 计算焦点移动后的日期与年月；非法日期返回 null。 */
export function computeShiftedFocus(
  iso: ISOString | null,
  delta: number,
): { iso: ISOString; year: number; month: number } | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!d) return null;
  const target = new Date(d);
  target.setDate(target.getDate() + delta);
  const targetISO = formatISO(target);
  if (parseISO(targetISO) === null) return null;
  return { iso: targetISO, year: target.getFullYear(), month: target.getMonth() };
}

/** 计算焦点移动到本周起点或终点的天数偏移。 */
export function computeWeekBoundaryDelta(
  iso: ISOString | null,
  locale: string,
  toEnd: boolean,
): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (!d) return null;
  const weekStart = getFirstDayOfWeek(locale);
  const offset = (d.getDay() - weekStart + 7) % 7;
  return toEnd ? 6 - offset : -offset;
}

/** 分发日历面板内键盘导航事件。 */
export function handleDatepickerPanelKey(e: Event, host: DatepickerKeyHost): void {
  const ke = e as KeyboardEvent;
  const iso = host.getFocusISO();
  switch (ke.key) {
    case "ArrowLeft":
      e.preventDefault();
      host.moveFocus(iso, -1);
      break;
    case "ArrowRight":
      e.preventDefault();
      host.moveFocus(iso, 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      host.moveFocus(iso, -7);
      break;
    case "ArrowDown":
      e.preventDefault();
      host.moveFocus(iso, 7);
      break;
    case "Home":
    case "End": {
      e.preventDefault();
      const delta = computeWeekBoundaryDelta(iso, host.getLocale(), ke.key === "End");
      if (delta !== null) host.moveFocus(iso, delta);
      break;
    }
    case "PageUp":
      e.preventDefault();
      if (ke.shiftKey) host.navYear(-1);
      else host.navMonth(-1, true);
      break;
    case "PageDown":
      e.preventDefault();
      if (ke.shiftKey) host.navYear(1);
      else host.navMonth(1, true);
      break;
    case "Enter":
    case " ":
      e.preventDefault();
      if (iso && host.isSelectable(iso)) host.selectISO(iso);
      break;
    case "Escape":
      e.preventDefault();
      host.closePanel();
      break;
    case "Tab":
      host.closePanel();
      break;
  }
}

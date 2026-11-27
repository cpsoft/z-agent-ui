// 按当前语言格式化数字 / 日期。所有 `Intl.*Format` 的唯一入口。
//
// [WHY] 此前 `report-kpi` / `report-columns` 把 `"zh-CN"` 写死在 `Intl.NumberFormat` 里：
// 切到英文之后文案换了，千分位与小数点却还是中文习惯。locale 必须从 i18n 注册表取。
//
// [WHY 缓存] `Intl.NumberFormat` 的构造比 `format` 贵一到两个数量级，表格每格都 new 一个
// 会在千行级数据上肉眼可见。按「locale + 选项」缓存实例。

import { getLocale } from "./i18n.js";

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function cacheKey(locale: string, opts: object | undefined): string {
  return opts ? `${locale}|${JSON.stringify(opts)}` : locale;
}

/** 当前语言下的 `Intl.NumberFormat`（缓存）。 */
export function getNumberFormat(opts?: Intl.NumberFormatOptions, locale: string = getLocale()): Intl.NumberFormat {
  const key = cacheKey(locale, opts);
  let f = numberCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    numberCache.set(key, f);
  }
  return f;
}

/** 当前语言下的 `Intl.DateTimeFormat`（缓存）。 */
export function getDateTimeFormat(opts?: Intl.DateTimeFormatOptions, locale: string = getLocale()): Intl.DateTimeFormat {
  const key = cacheKey(locale, opts);
  let f = dateCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    dateCache.set(key, f);
  }
  return f;
}

/** 便捷格式化。 */
export const fmt = {
  number: (value: number, opts?: Intl.NumberFormatOptions): string => getNumberFormat(opts).format(value),
  percent: (ratio: number, opts?: Intl.NumberFormatOptions): string =>
    getNumberFormat({ ...opts, style: "percent" }).format(ratio),
  date: (value: Date | number, opts?: Intl.DateTimeFormatOptions): string => getDateTimeFormat(opts).format(value),
};

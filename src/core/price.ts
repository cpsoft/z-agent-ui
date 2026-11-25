// 金额拆分：一处算「符号 / 整数段 / 小数段」，价格组件与商品卡共用。
//
// [边界：只拆，不换算] 宿主传进来的 `value` 就是**最终的元**（`12.5` → ¥12.50）。
// 库不猜「传的是分还是元」—— 猜错一次，每一张商品卡上都印着 100 倍的错价，
// 而且看起来完全正常（`1250` 印成 ¥1,250.00）。
//
// [为什么千分位在这里而不是渲染层] 合计金额（¥12,800.00）与单价（¥9.90）是同一个
// 格式化问题；两处各写一遍，总有一处忘了加逗号或忘了负号。

export interface PriceParts {
  /** 是否为负（退款、优惠券抵扣）。负号由渲染层决定加在哪。 */
  negative: boolean;
  /** 千分位后的整数段，如 `12,800`。 */
  int: string;
  /** 小数段，按 `decimals` 补齐；`decimals=0` 时为空串。 */
  dec: string;
}

/**
 * 把金额拆成三段；不是有限数值时返回 `null`（空态文案由调用方给）。
 *
 * `decimals` 缺省 2 —— 商城价到分。传 0 表示「不带小数」（如「12 期」这种计数，
 * 但那种不要用价格组件）。
 */
export function priceParts(value: unknown, decimals = 2): PriceParts | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  // `Number("")` 是 0、`Number(" ")` 也是 0 —— 上面挡了空串，这里挡纯空白
  if (String(value).trim() === "" || !Number.isFinite(n)) return null;
  const digits = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const fixed = Math.abs(n).toFixed(digits);
  const [intRaw, dec = ""] = fixed.split(".");
  return {
    negative: n < 0,
    int: intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    dec,
  };
}

/** 纯文本形态（`-¥12.50` 里的数值部分用不到符号，但读屏与 title 需要完整串）。 */
export function priceText(value: unknown, decimals = 2, currency = "¥"): string {
  const p = priceParts(value, decimals);
  if (!p) return "";
  return `${p.negative ? "-" : ""}${currency}${p.int}${p.dec ? "." + p.dec : ""}`;
}

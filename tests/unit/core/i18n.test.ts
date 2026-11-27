import { describe, it, expect, afterEach } from "vitest";
import {
  BaseElement,
  COPY,
  DEFAULT_LOCALE,
  fmt,
  getLocale,
  hasMessage,
  html,
  onLocaleChange,
  property,
  registerMessages,
  setLocale,
  t,
} from "../../../src/core/index";
import { __resetI18nForTest } from "../../../src/core/i18n";
import enUS from "../../../src/core/locales/en-US";
import { formatKpi } from "../../../src/report/core/report-kpi";
import { formatCellValue } from "../../../src/report/core/report-columns";

class TestI18nEl extends BaseElement {
  @property({ type: String }) closeLabel = COPY.close;
  @property({ type: String }) emptyText = COPY.empty;

  render(): string {
    return html`<span class="close">${this.closeLabel}</span><span class="empty">${this.emptyText}</span><span class="direct">${COPY.loading}</span>`;
  }
}
if (!customElements.get("test-i18n-el")) {
  customElements.define("test-i18n-el", TestI18nEl);
}

const flush = () => new Promise((r) => queueMicrotask(() => r(undefined)));

describe("core/i18n 与 fmt", () => {
  afterEach(() => {
    __resetI18nForTest();
    document.body.innerHTML = "";
  });

  it("默认语言为 zh-CN，COPY 与 t() 返回中文", () => {
    expect(getLocale()).toBe(DEFAULT_LOCALE);
    expect(t("empty")).toBe("暂无数据");
    expect(COPY.close).toBe("关闭");
    expect(hasMessage("empty")).toBe(true);
    expect(hasMessage("nonexistent_key")).toBe(false);
    expect(t("nonexistent_key")).toBe("nonexistent_key");
  });

  it("setLocale 切换到 en-US 后 t() 与 COPY 实时返回英文", () => {
    setLocale("en-US", enUS);
    expect(getLocale()).toBe("en-US");
    expect(t("empty")).toBe("No data");
    expect(COPY.close).toBe("Close");
    expect(t("ganttLinkDone", { from: "A", to: "B" })).toBe("Dependency created: A → B");
  });

  it("回退链：en-GB → en → zh-CN", () => {
    registerMessages("en", { empty: "Nothing here" });
    setLocale("en-GB");
    expect(t("empty")).toBe("Nothing here");
    expect(t("close")).toBe("关闭"); // en 中未提供，回退到默认 zh-CN
  });

  it("支持 plural 复数插值", () => {
    registerMessages("en-US", {
      items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    });
    setLocale("en-US");
    expect(t("items", { count: 0 })).toBe("No items");
    expect(t("items", { count: 1 })).toBe("1 item");
    expect(t("items", { count: 1200 })).toBe("1,200 items");
  });

  it("BaseElement 订阅语言切换：默认 COPY 属性自动刷新，显式覆盖的属性保持不变", async () => {
    const el = document.createElement("test-i18n-el") as TestI18nEl;
    el.setAttribute("empty-text", "自定义空态");
    document.body.appendChild(el);
    await flush();

    expect(el.shadowRoot!.querySelector(".close")!.textContent).toBe("关闭");
    expect(el.shadowRoot!.querySelector(".empty")!.textContent).toBe("自定义空态");
    expect(el.shadowRoot!.querySelector(".direct")!.textContent).toBe("加载中…");

    setLocale("en-US", enUS);
    await flush();

    expect(el.closeLabel).toBe("Close");
    expect(el.shadowRoot!.querySelector(".close")!.textContent).toBe("Close");
    expect(el.shadowRoot!.querySelector(".empty")!.textContent).toBe("自定义空态");
    expect(el.shadowRoot!.querySelector(".direct")!.textContent).toBe("Loading…");

    // 显式通过 JS 属性赋值后，再次切换语言不再覆盖
    el.closeLabel = "Dismiss";
    await flush();
    setLocale("zh-CN");
    await flush();
    expect(el.closeLabel).toBe("Dismiss");
    expect(el.shadowRoot!.querySelector(".direct")!.textContent).toBe("加载中…");
  });

  it("断开连接后不再触发重绘，重新连接后同步最新语言", async () => {
    const el = document.createElement("test-i18n-el") as TestI18nEl;
    document.body.appendChild(el);
    await flush();

    let notified = 0;
    const unsub = onLocaleChange(() => notified++);
    el.remove();
    setLocale("en-US", enUS);
    await flush();
    expect(notified).toBe(1);
    unsub();

    // 重新挂载时同步到最新语言
    document.body.appendChild(el);
    await flush();
    expect(el.closeLabel).toBe("Close");
    expect(el.shadowRoot!.querySelector(".close")!.textContent).toBe("Close");
  });

  it("fmt 与报表格式化跟随当前 locale", () => {
    expect(fmt.number(1234.5)).toBe("1,234.5");
    setLocale("de-DE");
    expect(fmt.number(1234.5)).toBe("1.234,5");
    expect(formatKpi(1234.5, { decimals: 1 })).toBe("1.234,5");
    expect(formatCellValue(1234.5, { thousands: true, decimalPlaces: 1 })).toBe("1.234,5");
  });
});

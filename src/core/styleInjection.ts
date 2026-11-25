// [WHY] 2026-10-25 系统审计：仓库内曾有 10 处各自实现「document.head 注入一份全局样式」
// （Tooltip/Popover/Menu/Select/Datepicker/TimePicker/DateRange/Toast/Modal/ChartTooltip），
// 每处都自带 `let styleInjected = false` 模块级开关 + 自定义 data-* 标记，重复且易漏。
// 统一为本模块：按 id 幂等，重复调用零成本。
// See: wiki/reference/component-implementation-standard.md

const injected = new Set<string>();

/**
 * 注入一份全局样式（幂等）。
 *
 * 仅用于 **light DOM** 内容：shadow root 内的样式应走 `static styles`，
 * 打进 head 既污染全局又会与宿主页面冲突。
 *
 * @param id 唯一标识，同时写入 `data-z-style` 便于 DevTools 定位
 * @param cssText 样式文本
 */
export function injectGlobalStyles(id: string, cssText: string): void {
  if (injected.has(id)) return;
  injected.add(id);
  const style = document.createElement("style");
  style.setAttribute("data-z-style", id);
  style.textContent = cssText;
  document.head.appendChild(style);
}

/** 仅测试用：清空注入记录（不摘除已插入的 <style>，避免影响已挂载组件）。 */
export function __resetInjectedStylesForTest(): void {
  injected.clear();
}

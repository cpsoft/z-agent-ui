// 跨应用切换器的内置图标集（2026-11-05）
//
// [WHY 组件自带图标表，而不是让宿主传 SVG] 切换器要在四个宿主里长得一模一样，
// 而四个宿主各有各的图标库：zWorker 有一套 24×24 线性图标，zEtl 在 App.tsx 里
// 硬编码过一张 emoji 表（🧬🔐🧭），zagent 干脆没有图标。若组件把渲染交给宿主，
// 「统一」就只统一了外壳，图标仍然四套 —— 这正是本次要消灭的差异本身。
//
// 口径来自 zauth 迁移 011：`icon` 列存的是「应用自注册时上报的前端图标库键名」
// （compass / robot / lock / store …）。键名是约定的公共词汇，故在组件内落地一份。
//
// 规格与 zWorker 的 icons.js 同支线（画布 24×24、线宽 1.5、只用 stroke、颜色继承
// currentColor），保证与宿主自绘图标并排时不违和。
//
// [WHY 未知键不画空图标] 应用新增时若上报了一个这里没有的键，静默画空白等于
// 「这一行没有图标」，没人会去查。回退成名称首字，肉眼立刻可见，也提示来补表。

/** 画布规格：24×24、stroke 1.5、round 端点。改动请同步 app-switcher.css 的 .z-app-switcher__icon。 */
export const APP_ICONS: Record<string, string> = {
  // 品牌兜底（宿主未上报图标时触发钮用）
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  // zauth 迁移 011 已给存量应用写入的三个值
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z"/>',
  robot:
    '<rect x="4" y="7.5" width="16" height="12" rx="3"/><path d="M12 3.5v4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9.5 16.5h5"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  // 业务应用常用值
  store: '<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5L4.8 4h14.4L21 9.5z"/><path d="M10 20v-5.5h4V20"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/><path d="M4.5 11.5v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>',
};

/** 名称首字（兜底图标）：取第一个非空白字符，中文取本字、西文取大写。 */
export function initialOf(name: string): string {
  const s = (name || "").trim();
  if (!s) return "?";
  const first = Array.from(s)[0];
  return first.toUpperCase();
}

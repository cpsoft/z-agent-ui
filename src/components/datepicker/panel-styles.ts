// `z-datepicker` 浮动面板的全局样式。
//
// [WHY 从这里拆出去] 面板挂在 `<body>` 下（light DOM），shadow 样式作用不到，只能
// 全局注入 —— 于是这 170 行 CSS 与组件逻辑挤在一个文件里，而两者改动的理由完全不同：
// 一个是「视觉要调」，一个是「行为要改」。`Datepicker.ts` 844 行正好压在行数基线上，
// 本轮要加时间选择（F3），先让出这块空间。
//
// 拆的时候**一个字都没改**（金样与视觉回归因此可以当作证据：外观没动）。

export const DATEPICKER_PANEL_CSS = `
    .z-datepicker__panel {
      position: fixed;
      z-index: var(--z-z-dropdown);
      padding: var(--z-space-3);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: var(--z-line-height);
      color: var(--z-color-text);
      outline: none;
      user-select: none;
      animation: z-datepicker-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-datepicker__panel--hiding {
      animation: z-datepicker-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-datepicker-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-datepicker-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-datepicker__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--z-space-2);
    }
    .z-datepicker__nav {
      width: 28px;
      height: var(--z-control-h-sm);
      border: none;
      background: transparent;
      border-radius: var(--z-radius-sm);
      color: var(--z-color-text-secondary);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: background var(--z-transition-fast);
    }
    .z-datepicker__nav:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__label {
      font-weight: var(--z-font-weight-medium);
    }
    .z-datepicker__grid {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .z-datepicker__weekday {
      padding: var(--z-space-1) 0;
      /* [WHY] 紧凑商务风日历（REQ-010）：36 → 32 */
      width: 32px;
      text-align: center;
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      font-weight: var(--z-font-weight-medium);
    }
    .z-datepicker__cell {
      width: 32px;
      height: var(--z-control-h);
      text-align: center;
      vertical-align: middle;
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      font-size: var(--z-font-size-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-datepicker__cell:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__cell--out {
      opacity: 0.4;
    }
    .z-datepicker__cell--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-datepicker__cell--today {
      box-shadow: inset 0 0 0 1px var(--z-color-primary);
    }
    /* ── 区间带（先声明，端点在后覆盖）──
       [WHY] 2026-10-25 报障：原先 --range-in 直接引用原始色板 blue-50，
       亮色几乎看不出（1.14:1）、暗色不翻转成亮白块（日期隐形）。改走 tint 语义层。 */
    .z-datepicker__cell--range-in {
      background: var(--z-color-primary-tint);
      border-radius: 0;
    }
    /* 每行首尾收圆角 —— 跨行的区间在行末断开，读起来是「一条一条」而不是锯齿 */
    .z-datepicker__cell--range-in:first-child {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-datepicker__cell--range-in:last-child {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* [WHY] .z-datepicker__cell:hover 特异性 0,2,0 高于 0,1,0，会把区间底打回灰底 ——
       鼠标划过时选区闪断。用同等特异性（且在后）覆盖回来。 */
    .z-datepicker__cell--range-in:hover {
      background: var(--z-color-primary-tint-hover);
    }
    /* ── 端点（实心，压在区间带之上）──
       [WHY] 端点承载白字，必须走 solid 层：暗色下 --z-color-primary 是亮蓝 #3b82f6，
       白字只有 3.68:1（不达 AA）；solid 明暗同值、恒定 5.17:1。
       端点也可能同时带 --range-in（hover 预览时终点即区间末格），这里靠声明顺序取胜。 */
    .z-datepicker__cell--selected,
    .z-datepicker__cell--range-start,
    .z-datepicker__cell--range-end {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-datepicker__cell--range-start {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-datepicker__cell--range-end {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* 起点落在行末 / 终点落在行首时，同侧没有区间延续（要跨到下一行），
       此时去掉的内侧圆角会让色块直角贴边 → 恢复四角圆，读作「独立的端点」 */
    .z-datepicker__cell--range-start:last-child,
    .z-datepicker__cell--range-end:first-child {
      border-radius: var(--z-radius-sm);
    }
    .z-datepicker__cell--selected:hover,
    .z-datepicker__cell--range-start:hover,
    .z-datepicker__cell--range-end:hover {
      background: var(--z-color-primary-solid-hover);
    }
    .z-datepicker__cell--focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -2px;
    }
    /* ── 快捷区间（issue IKUE1G）──
       一排 chip 放在头区上方：它比日历更常用，放下面会被两行数字挡住。
       [WHY 用 tint 而不是实心] 选中态要与「日历上那个实心端点」区分开：两者同时亮时
       读者要知道「亮的这块是预设，不是我自己选的日期」。 */
    .z-datepicker__presets {
      display: flex;
      flex-wrap: wrap;
      gap: var(--z-space-1);
      margin-bottom: var(--z-space-2);
      padding-bottom: var(--z-space-2);
      border-bottom: 1px solid var(--z-color-border);
    }
    .z-datepicker__preset {
      border: 1px solid var(--z-color-border);
      background: transparent;
      color: var(--z-color-text);
      border-radius: var(--z-radius-full);
      padding: 2px 10px;
      font-size: var(--z-font-size-xs);
      line-height: 1.6;
      cursor: pointer;
      transition: background var(--z-transition-fast), border-color var(--z-transition-fast);
    }
    .z-datepicker__preset:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__preset.is-active {
      background: var(--z-color-primary-tint);
      border-color: var(--z-color-primary);
      /* 文字走 primary 而不是 primary-text（那是白字，配 tint 底看不见）；
         tint 是 10% 透明度的主色，一级主色压在上面仍满足可读性 */
      color: var(--z-color-primary);
    }
    .z-datepicker__preset:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background: transparent;
    }
    /* ── 时间行（precision=minute）──
       [WHY 放在日历下面而不是弹一个独立的时间轮] 「日期 + 时间」是一个值，两次弹层
       意味着中间有一个「日期已定、时间未定」的半截状态，而用户看不出还差一步。
       放在同一块面板里，他看见的是「上面选哪天、下面填几点」。
       [WHY 两个 number input 而不是原生 type=time] 原生控件的面板在 Safari 上
       是一个系统滚轮、Chrome 是另一套，与本页其余输入框不是一套语言；而且它把
       「现在几点」这类语义塞进了系统 UI，宿主无法覆盖。 */
    .z-datepicker__time {
      display: flex;
      align-items: center;
      gap: var(--z-space-2);
      margin-top: var(--z-space-2);
      padding-top: var(--z-space-2);
      border-top: 1px solid var(--z-color-border);
      font-size: var(--z-font-size-sm);
    }
    .z-datepicker__time-label {
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-xs);
    }
    .z-datepicker__time-field {
      width: 48px;
      height: var(--z-control-h-sm);
      padding: 0 var(--z-space-1);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      background: var(--z-color-bg);
      color: var(--z-color-text);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      text-align: center;
      /* 数字框的上下箭头在 48px 宽里会挤掉数字本身 */
      appearance: textfield;
      -moz-appearance: textfield;
    }
    .z-datepicker__time-field::-webkit-outer-spin-button,
    .z-datepicker__time-field::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
    .z-datepicker__time-field:focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -1px;
    }
    .z-datepicker__time-field.is-invalid {
      border-color: var(--z-color-danger);
    }
    .z-datepicker__time-sep {
      color: var(--z-color-text-secondary);
    }
    .z-datepicker__time-done {
      margin-left: auto;
    }
`;

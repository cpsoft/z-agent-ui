// z-select 下拉面板的全局样式。
//
// [WHY 单独一个文件] Select.ts 已顶着行数基线（只减不增），而面板布局还在长：
// 这次为「底栏常驻」加的三段 flex 就把它顶到了 1037（issue IKXGGI）。样式是纯字符串、
// 零依赖，搬出来不改任何行为。
//
// 注意：下面是**模板字面量**，注释里不能出现反引号，否则会提前闭合。
export const DROPDOWN_CSS = `
    .z-select__dropdown {
      position: fixed;
      z-index: var(--z-z-dropdown);
      max-height: 280px;
      /* [WHY 面板不再自己滚，改由选项区滚] 面板是「搜索框 + 选项 + 底栏」三段；
         让面板整体滚动会把底栏（暂存模式的「确定」，唯一提交口）推到滚动区之外
         （issue IKXGGI）。flex 列 + 选项区 flex:1 之后，底栏恒在面板底部，
         选项在剩余高度里滚，谁都不会压住谁。 */
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--z-color-popover);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      padding: var(--z-space-1);
      outline: none;
      animation: z-select-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-select__dropdown--hiding {
      animation: z-select-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-select-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-select-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.96); }
    }
    .z-select__search {
      display: block;
      box-sizing: border-box;
      width: 100%;
      margin-bottom: var(--z-space-1);
      height: var(--z-input-height);
      padding: 0 var(--z-input-padding-x);
      font-family: var(--z-font-sans);
      font-size: var(--z-input-font-size);
      color: var(--z-color-text);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      outline: none;
      transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
    }
    .z-select__search:focus {
      border-color: var(--z-color-primary);
      /* [WHY] 聚焦光环对齐主色 #2563eb（REQ-010） */
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .z-select__search::placeholder {
      color: var(--z-color-text-disabled);
    }
    /* [WHY 聚焦不画框] 非搜索模式下 listbox 自己持有焦点，但「当前停在第几项」已经由
       --active 的背景色表达。再叠一圈浏览器默认焦点框就是两个高亮打架 —— 而且那圈框
       会绕着整个列表（280px 高），看起来像「整块被选中了」。
       （注：这个字符串是 JS 模板字面量，注释里不能出现反引号，否则会提前闭合） */
    /* [WHY 选项区才是滚动容器] 见 z-select__dropdown 的注释：底栏必须常驻，
       所以把滚动下移一层。min-height 0 是 flex 子项能小于内容高度的前提，
       少了它选项区会把面板撑过 max-height。 */
    .z-select__options {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
    }
    .z-select__options:focus,
    .z-select__options:focus-visible {
      outline: none;
    }
    .z-select__option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      /* [WHY] 紧凑商务风下拉选项（REQ-010）：8/12 → 6/10 */
      padding: 6px 10px;
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      color: var(--z-color-text);
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background var(--z-transition-fast);
    }
    .z-select__option:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-select__option--active {
      /* [WHY] blue-50 不在暗色覆盖范围 → 暗色下激活项是一块亮白；改语义 soft */
      background: var(--z-color-primary-soft);
      color: var(--z-color-primary-strong);
    }
    .z-select__option--selected {
      font-weight: var(--z-font-weight-medium);
    }
    /* 多选选中态：只加中性底 + 左侧勾选框，不用蓝色高亮
       （蓝底读起来像"当前焦点行"，而多选里同时可以有多行"已选"） */
    .z-select__option--multi {
      background: var(--z-color-bg-secondary);
    }
    .z-select__box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      margin-right: var(--z-space-2);
      border: 1px solid var(--z-color-border);
      border-radius: 3px;
      background: var(--z-color-bg);
      color: #fff;
      flex-shrink: 0;
    }
    .z-select__box--on {
      border-color: var(--z-color-primary);
      background: var(--z-color-primary);
    }
    .z-select__option--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-select__check {
      display: flex;
      align-items: center;
      color: var(--z-color-primary);
      flex-shrink: 0;
      margin-left: var(--z-space-2);
    }
    .z-select__empty {
      padding: var(--z-space-3);
      text-align: center;
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-sm);
    }
    .z-select__loading {
      padding: var(--z-space-3);
      text-align: center;
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-sm);
    }
    /* 暂存模式（commit-on-confirm）的底部操作条：左计数、右「清空 / 确定」 */
    .z-select__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--z-space-2);
      margin-top: var(--z-space-1);
      padding: var(--z-space-2) var(--z-space-2) var(--z-space-1);
      border-top: 1px solid var(--z-color-border);
      /* 面板用的是「搜索框 / 选项 / 底栏」三段 flex：底栏不参与滚动，恒在面板底部
         （issue IKXGGI：8 个选项就把它挤出可视区，用户找不到「确定」）。 */
      flex: 0 0 auto;
    }
    .z-select__count {
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      white-space: nowrap;
    }
    .z-select__footer-actions {
      display: inline-flex;
      gap: var(--z-space-2);
      flex-shrink: 0;
    }
    .z-select__btn {
      height: 26px;
      padding: 0 10px;
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: 1;
      color: var(--z-color-text);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      transition: background var(--z-transition-fast);
    }
    .z-select__btn:hover:not(:disabled) {
      background: var(--z-color-bg-secondary);
    }
    .z-select__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .z-select__btn--primary {
      color: #fff;
      background: var(--z-color-primary);
      border-color: var(--z-color-primary);
    }
    .z-select__btn--primary:hover:not(:disabled) {
      background: var(--z-color-primary-strong);
    }
`;

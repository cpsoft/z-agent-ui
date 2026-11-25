const x=`/* ===== zAgentUI Design Tokens ===== */
/* [WHY] 紧凑商务风：色板/密度/暗色对齐参考页 https://ace-boy.cn/plm/bom（Tailwind v4 + shadcn）
   See: wiki/requirements/REQ-010-compact-business-theme.md
   [2026-08-11] night-hawk: gray→slate 冷灰系、danger/success/warning 对齐、控件 30px/字号 13px、暗色 slate */

:root,
[data-theme="light"] {
  /* [WHY color-scheme 必须声明] 有一整类像素**不是我们的 CSS 画的**，是浏览器自绘：
     滚动条、原生 \`<select>\` 弹层、日期面板、输入框自动填充底、文本选中高亮、caret 之外
     的系统部件。它们只认 \`color-scheme\`，改 \`--z-*\` token 一个像素都影响不到 ——
     症状就是「暗色下滚动条还是白的、下拉弹层是白的、选中文字是浅蓝」，
     而检查 DOM 与 CSS 全部正确，因为确实没错，只是没告诉浏览器现在是暗色。
     两个主题块各声明一次，值随主题走；\`.dark\` / \`[data-theme="dark"]\` 同理。 */
  color-scheme: light;
  /* ── Primitive Colors（slate 色板，变量名保留组件零改动） ── */
  --z-color-white: #ffffff;
  --z-color-black: #000000;
  --z-color-gray-50: #f8fafc;
  --z-color-gray-100: #f1f5f9;
  --z-color-gray-200: #e2e8f0;
  --z-color-gray-300: #cbd5e1;
  --z-color-gray-400: #94a3b8;
  --z-color-gray-500: #64748b;
  --z-color-gray-600: #475569;
  --z-color-gray-700: #334155;
  --z-color-gray-800: #1e293b;
  --z-color-gray-900: #0f172a;

  --z-color-blue-50: #eff6ff;
  --z-color-blue-100: #dbeafe;
  --z-color-blue-200: #bfdbfe;
  --z-color-blue-300: #93c5fd;
  --z-color-blue-400: #60a5fa;
  --z-color-blue-500: #3b82f6;
  --z-color-blue-600: #2563eb;
  --z-color-blue-700: #1d4ed8;
  --z-color-blue-800: #1e40af;
  --z-color-blue-900: #1e3a8a;

  --z-color-red-50: #fef2f2;
  --z-color-red-100: #fee2e2;
  --z-color-red-500: #ef4444;
  --z-color-red-600: #dc2626;
  --z-color-red-700: #b91c1c;

  --z-color-green-50: #f0fdf4;
  --z-color-green-100: #dcfce7;
  --z-color-green-500: #22c55e;
  --z-color-green-600: #16a34a;
  --z-color-green-700: #15803d;

  --z-color-yellow-50: #fefce8;
  --z-color-yellow-100: #fef9c3;
  --z-color-yellow-500: #eab308;
  --z-color-yellow-600: #ca8a04;
  --z-color-yellow-700: #a16207;

  --z-color-purple-500: #8b5cf6;

  /* [WHY] 2026-10-25 系统审计：alert/tag/flow 引用了 red/green/yellow 的 800 阶与 green-300,
     此前只在组件内以裸 hex fallback 存在 → 暗色主题下不跟随。补齐为显式阶梯。 */
  --z-color-red-800: #991b1b;
  --z-color-green-300: #86efac;
  --z-color-green-800: #166534;
  --z-color-yellow-800: #92400e;

  /* ── Semantic Colors（对齐参考页：danger #ef4444 / success #10b981 / warning #f59e0b） ──
   *
   * [WHY 每个语义色外面套一层 \`var(--宿主名, 现值)\`] issue IKIDAI 的验收是「宿主不改源码、
   * 只覆盖 CSS 变量就能把组件对齐到自有视觉体系」。而宿主（zwms / shadcn 系）的 token
   * 叫 \`--primary\` / \`--background\`，我们叫 \`--z-color-primary\` / \`--z-color-bg\` ——
   * 名字不同，宿主写一份 theme-overrides.css 对组件**毫无影响**，所谓「零侵入」不成立。
   *
   * 内层 fallback 保持原值，所以**没定义这些变量的宿主行为一字不变**（向后兼容）；
   * 定义了 \`--primary\` 的宿主则自动生效，不必知道我们内部的 \`--z-*\` 命名。
   *
   * ⚠️ 不要把宿主侧变量反向定义成 \`var(--z-color-primary)\`：那是循环引用，
   * 两个变量都会变成无效值（症状是「颜色全黑」）。
   */
  --z-color-primary: var(--primary, var(--z-color-blue-600));
  --z-color-primary-hover: var(--primary-hover, var(--z-color-blue-700));
  --z-color-primary-active: var(--primary-active, var(--z-color-blue-800));
  --z-color-primary-text: var(--primary-foreground, var(--z-color-white));

  --z-color-danger: var(--destructive, var(--z-color-red-500));
  --z-color-danger-hover: var(--z-color-red-600);
  --z-color-danger-active: var(--z-color-red-700);
  --z-color-danger-text: var(--destructive-foreground, var(--z-color-white));

  --z-color-success: var(--success, #10b981);
  --z-color-success-text: var(--success-foreground, var(--z-color-white));

  /* 警告保持黑字：白字 on #f59e0b 对比仅 2.1:1，不达 WCAG AA */
  --z-color-warning: var(--warning, #f59e0b);
  --z-color-warning-text: var(--warning-foreground, var(--z-color-black));

  /* [WHY] 2026-10-25 系统审计：info 语义缺口。result/timeline 此前以裸 hex fallback 引用
     (--z-color-info, #2563eb)，暗色不跟随；补齐后与 primary 同源但语义独立（可单独换色）。 */
  --z-color-info: var(--info, var(--z-color-blue-600));
  --z-color-info-text: var(--info-foreground, var(--z-color-white));

  /* ── 图表序列色（issue IKIDAI：--chart-1..5） ──
   *
   * [WHY 要单独一组] 图表是「一眼看配色是否属于这个系统」的地方：宿主换掉 primary 却留下
   * 默认的蓝/绿/橙，整块看板立刻不像自家产品。前 5 色之后由 \`chart/palette.ts\` 用内置
   * 序列补足（超出 5 个系列的场景极少，且此时更需要的是减少系列而不是继续加色）。
   */
  --z-chart-1: var(--chart-1, #2563eb);
  --z-chart-2: var(--chart-2, #10b981);
  --z-chart-3: var(--chart-3, #f59e0b);
  --z-chart-4: var(--chart-4, #8b5cf6);
  --z-chart-5: var(--chart-5, #ef4444);

  /* 「soft 底 + 深色文字」是固定搭配（badge / tag / login 错误条）：-strong / -border
     补齐后明暗两套只在这里维护，组件不再各写一遍亮色。 */
  --z-color-success-strong: #047857;
  --z-color-warning-strong: #b45309;
  --z-color-danger-strong: #b91c1c;
  --z-color-info-strong: #1d4ed8;
  --z-color-danger-border: #fecaca;

  /* 价格（2026-11-24）：与 danger 分开，宿主只换这两行；引用语义色，暗色自动跟随 */
  --z-color-price: var(--z-color-danger-strong);
  --z-color-price-muted: var(--z-color-text-secondary); /* 划线原价 / 弱化金额 */
  /* ── Soft / Subtle 底色（「浅色底 + 主色文字」类语义，替代组件内 rgba 散写） ── */
  /* primary-soft 只保留「浅底」语义；focus 光晕一律走 --z-focus-ring-*。 */
  /* [WHY soft 也要认宿主名] soft 是「语义色的 10% 浅底」（badge、提示块、选中行）。
     此前直接绑蓝色板 \`--z-color-blue-50\`，宿主把 \`--primary\` 换成品牌绿，badge 的浅底
     仍是蓝色 —— 主色换了、配套浅底没换，是「换肤换了一半」最刺眼的形态。
     宿主给 \`--primary-soft\` 就用宿主的；没给则回到原色板（观感不变）。
     若希望浅底自动跟随主色，宿主侧写一行即可（我们不在库里用 color-mix，见下方说明）：
       --primary-soft: color-mix(in srgb, var(--primary) 10%, var(--background)); */
  --z-color-primary-soft: var(--primary-soft, var(--z-color-blue-50));
  --z-color-danger-soft: var(--destructive-soft, var(--z-color-red-50));
  --z-color-success-soft: var(--success-soft, var(--z-color-green-50));
  --z-color-warning-soft: var(--warning-soft, var(--z-color-yellow-50));
  --z-color-info-soft: var(--info-soft, var(--z-color-blue-50));

  /* soft 底上的强调文字（与 -strong 同义，primary 单独一颗避免借道 info） */
  --z-color-primary-strong: var(--z-color-blue-700);

  /* ── 选区带（tint）：成片、持续存在的选中区域（日历区间 / 多选行） ──
     [WHY] 2026-10-25 学员报障「pick a range 亮色看不清、暗色变亮白」。
     日历的 --range-in 此前直接引用原始色板 --z-color-blue-50：
       · 亮色 #eff6ff 压在 #fff 上只差 1.14 —— 32px 格子里几乎看不出选区；用户原话「看不清」。
       · 暗色里 blue-* 不在暗色块覆盖范围，仍是 #eff6ff ⇒ 一片亮白；而格子文字继承
         --z-color-text（暗色近白）#f8fafc ⇒ 白字压白底 1.05:1，日期直接隐形。
     与 -soft 的分工：-soft 是「微量染色」（hover 行、badge 底，扫一眼就走，宁可淡）；
     -tint 是「要被注视的选区」，必须在两种主题下都明确可辨。 */
  --z-color-primary-tint: var(--z-color-blue-100); /* 亮：压 #fff ≈ 1.25 */
  --z-color-primary-tint-hover: var(--z-color-blue-200);

  /* ── 实心填充（solid fill）：只用于「白字压在语义色上」的表面 ──
     [WHY] 2026-10-25 可访问性审计：\`--z-color-primary\` / \`danger\` 此前同时承担两个角色，
     而这两个角色在暗色主题下的最优取值是相反的：
       · 作为**强调文字**：blue-500 #3b82f6 压暗底 = 4.85（AA ✓）；
         若换成 blue-600，压暗底只剩 2.66（不合格）。
       · 作为**白色文字的底**：blue-500 = 3.68（仅达大字 3:1）；
         blue-600 = 5.17（AA ✓）。danger 同理：red-500 = 3.76（不达 4.5），red-600 = 4.83。
     所以拆出 solid 层，专供实心表面使用，并且**两个主题共用同一值、不在暗色里覆盖**：
     按钮在明暗下都可读，也不会出现「深色下按钮比链接更暗」的割裂感。
     实测值见注释；\`tests/unit/theme-token-guard.test.ts\` 会重算并守住这些数。 */
  --z-color-primary-solid: var(--z-color-blue-600); /* 白字 5.17 */
  --z-color-primary-solid-hover: var(--z-color-blue-700); /* 白字 6.70 */
  --z-color-primary-solid-active: var(--z-color-blue-800); /* 白字 8.59 */
  --z-color-danger-solid: var(--z-color-red-600); /* 白字 4.83 */
  --z-color-danger-solid-hover: var(--z-color-red-700); /* 白字 6.47 */
  --z-color-success-solid: #047857; /* 白字 5.48（green-700 偏黄绿，取 emerald-700） */
  --z-color-info-solid: var(--z-color-blue-600); /* 白字 5.17 */

  /* [WHY] upload/badge 等旧文件引用 (--z-text-color, #1f2329) 与 (--z-bg-subtle, #fafafa)
     等 Anthropic 时期旧命名；既有 slate 语义 token 已覆盖同等语义，故只留别名兜底，
     组件样式在本次审计中已逐一迁移到 --z-color-text / --z-color-bg-secondary。 */
  --z-color-bg-subtle: var(--z-color-bg-secondary);
  --z-color-border-soft: var(--z-color-gray-300);
  --z-color-fill: rgba(0, 0, 0, 0.05);
  --z-color-fill-secondary: var(--z-color-bg-secondary);
  --z-color-fill-tertiary: var(--z-color-bg-secondary);

  /* ── Interaction: Focus Ring（统一 12 种散写写法） ── */
  --z-focus-ring-width: 3px;
  /* [WHY 认 \`--ring-soft\` 而不是 \`--ring\`] shadcn 的 \`--ring\` 是**实色**（#2563eb），
     直接拿它当光晕会得到一圈实心描边（0 0 0 3px 纯蓝）。光晕要的是低透明度同色，
     所以宿主需另给 \`--ring-soft\`；没给则用原值。 */
  --z-focus-ring-color: var(--ring-soft, rgba(37, 99, 235, 0.15));
  --z-focus-ring-danger: rgba(239, 68, 68, 0.15);
  /* 复合值：直接 \`box-shadow: var(--z-focus-ring)\`，不要再手拼 0 0 0 3px */
  --z-focus-ring: 0 0 0 var(--z-focus-ring-width) var(--z-focus-ring-color);
  --z-focus-ring-error: 0 0 0 var(--z-focus-ring-width) var(--z-focus-ring-danger);
  /* 高对比描边式光环（表单项聚焦）：色块 + 背景色双层，暗色下同样可见 */
  --z-focus-ring-contrast: 0 0 0 2px var(--z-color-bg), 0 0 0 4px var(--z-color-primary);
  /* outline 式聚焦（列表行/日历格/表格单元格等不便加阴影的容器） */
  --z-focus-ring-outline: 2px solid var(--z-color-primary);

  /* ── Layers（浮层 z-index 基线，替代组件内裸 1000/1050/9999） ── */
  --z-z-base: 0;
  --z-z-dropdown: 1000;
  --z-z-modal: 1100;
  --z-z-drawer: 1100;
  --z-z-popover: 1200;
  --z-z-tooltip: 1300;
  --z-z-toast: 1400;
  /* 顶级层：需要压过**一切**的临时接管层 —— 拖拽幽灵 / 落点指示线 / 卡片全屏查看。
     它们的共同点是「用户此刻正盯着它，其余内容都是背景」，被任何浮层（含 toast 1400）
     盖住都会让操作看起来卡死。
     [WHY 跳到 9000 而不是 1500] 留出 7600 的间隔，宿主往上叠自己的浮层时不必回头调库的档位；
     同时也表明它不在常规层叠序列里（1400 → 9000 的跳跃本身就在说「这不是同一套层级」）。 */
  --z-z-topmost: 9000;

  /* ── Surface Colors（slate：页底 #f8fafc、边框 #e2e8f0、文字 #0f172a）；
   * 套宿主名（IKIDAI）：宿主只写 shadcn 那五个基础名就能改整体观感 ── */
  --z-color-bg: var(--background, var(--z-color-white));
  --z-color-bg-secondary: var(--muted, var(--z-color-gray-50));
  /* 卡头底色（IKX4XE）：透明 —— 底色属于「框」，再铺一层就是卡中卡（暗色最明显） */
  --z-card-head-bg: transparent;
  --z-color-bg-overlay: rgba(0, 0, 0, 0.5);
  --z-color-border: var(--border, var(--z-color-gray-200));
  --z-color-border-hover: var(--border-hover, var(--z-color-gray-300));
  /* ── 控件边框：**可交互元素的本体轮廓**，单独一档（2026-11-15） ──
   *
   * [WHY 再分一档] 上面那句「边框是元素身份，应被看见」在 \`-border\` 上只做到了「画出来」：
   * gray-200 对白底只有 **1.23:1**，对 #f8fafc 更低。输入框、下拉、复选、分页按钮的轮廓
   * 在亮色主题下几乎看不见 —— 实测反馈是「控件对比度太低，很难识别」。这不是审美问题，
   * WCAG 1.4.11 对「用于识别控件的信息」要求 **3:1**。
   *
   * 三档的分工（数字都是算出来的，不是挑的）：
   *   --z-color-divider        gray-100  分隔线：数量多，不该被注意
   *   --z-color-border         gray-200  容器边框：卡片 / 弹层 / 表格，面与面的边界
   *   --z-color-border-control #848fa1   控件边框：3.12:1（对 #f8fafc）／3.27:1（对白底）
   *
   * [WHY 不是直接把 -border 调深] 那会让 144 处声明一起变（含表格网格线、抽屉、卡片），
   * 得到「满屏都是深框」—— 正是 2026-10-26 那次审校在修的毛病。控件的边界需要被看见，
   * 容器的边界不需要那么重。
   * 判据：\`tests/unit/contrast-guard.test.ts\` 直接算对比度，并检查「表单控件真的用了它」。
   */
  --z-color-border-control: var(--border-control, #848fa1);
  --z-color-border-control-hover: var(--border-control-hover, var(--z-color-gray-500));
  /* 分隔线：两个同层区域之间的缝，比元素边框（-border）淡一档。
     [WHY 单列 2026-10-26] 页面体系曾有 16 处用 \`--z-color-border-soft\` 当分隔线，
     而它 = gray-300，比 \`-border\` 的 gray-200 **深** —— 命名说「soft」，取值反了：
     编辑器的左栏竖线、顶栏底边、脚本抽屉顶边全部比它框住的内容更抢眼，界面看着"框多、毛躁"。
     判据：分隔线数量多、不该被注意；边框是元素身份，应被看见。
     See: wiki/audits/2026-10-26-pagedef-style-audit.md P0-1 */
  --z-color-divider: var(--z-color-gray-100);
  --z-color-text: var(--foreground, var(--z-color-gray-900));
  --z-color-text-secondary: var(--muted-foreground, var(--z-color-gray-500));
  --z-color-text-disabled: var(--z-color-gray-400);
  /* placeholder 是「用户要读的提示文字」，不是禁用态。
     [WHY 单独一档 2026-11-15] 它原来借用 \`-text-disabled\`（gray-400），对白底只有 **2.56:1** ——
     输入框里的提示基本读不清，而「读不清提示」和「输入框没内容」在视觉上是同一件事。
     现在取 gray-500（4.76:1），比正文浅、但可读。禁用态仍然用不到 4.5 的 disabled 色。 */
  --z-color-text-placeholder: var(--text-placeholder, var(--z-color-gray-500));

  /* ── 抬升面（Elevated Surface） ──
   *
   * [WHY 必须把「页面底」与「卡片面」分开] shadcn 系宿主给的是两个值：
   * \`--background: #f8fafc\`（页底）、\`--card: #ffffff\`（卡片）。此前组件把卡片、弹窗、
   * 抽屉的背景统统写成 \`--z-color-bg\`（= \`--background\`）—— 宿主一接入，卡片就跟着页底
   * 变成 #f8fafc，**卡片与页面同色**，层次全部塌平成一张灰纸。这正是「换肤换了但不一致」
   * 的典型形态：颜色都对，视觉层次没了。
   *
   * fallback 链刻意回到 \`--z-color-bg\`：没写 \`--card\` 的宿主，卡片面 = 页底，
   * 与改造前**一字不差**（向后兼容）。
   *
   * 分工：
   *   -bg        页面底面（宿主 \`--background\`）
   *   -surface   抬升面：卡片、面板、表格容器（宿主 \`--card\`）
   *   -popover   浮层：下拉、气泡、弹窗（宿主 \`--popover\`，未给则同 -surface）
   *   -canvas    下沉底面（放卡片的地面，见 component-style-standard）
   */
  --z-color-surface: var(--card, var(--z-color-bg));
  --z-color-surface-foreground: var(--card-foreground, var(--z-color-text));
  --z-color-popover: var(--popover, var(--z-color-surface));
  --z-color-popover-foreground: var(--popover-foreground, var(--z-color-text));

  /* ── 交互反馈底：hover / active / 按下（2026-10-26 补） ──
     [WHY 必须语义化] 组件里这 20 余处原本直接写 \`--z-color-gray-100\`。gray 阶是**本库的
     slate 阶梯**，暗色靠"整阶反转"才勉强成立；宿主一旦把自己的 \`--background\` / \`--border\`
     换掉，这些反馈底仍是我们的灰 —— 按你们的品牌色做主题，按钮悬停却是另一套灰，
     这是"换了主题但没换干净"最常见的形态。
     三档的分工判据是**反馈底压在哪一层之上**（不是"哪个好看"）：
       -hover         压在卡片/输入框（白面）上 → 深一档才看得出来
       -hover-subtle  压在浮层/灰面（已经是次级面）上 → 只深一点点，否则像选中态
       -hover-strong  图标按钮、折叠三角这种小面积控件 → 要更明显，否则点了没反应感
     宿主给 shadcn 的 \`--accent\` 就自动接管（accent 正是 shadcn 的 hover 底语义）。 */
  --z-color-hover: var(--accent, var(--z-color-gray-100));
  --z-color-hover-subtle: var(--accent-subtle, var(--z-color-gray-50));
  --z-color-hover-strong: var(--accent-strong, var(--z-color-gray-200));

  /* 中性浅底（徽章 / 标签 / 未激活步骤 / chip 底）—— 与 -hover 取值相同但**语义不同**：
     hover 是"一闪而过"，这层是"一直挂在那里"。合并会让宿主无法只调其中一种。
     桥到 shadcn 的 \`--secondary\`（其默认值恰为 #f1f5f9）。 */
  --z-color-bg-tertiary: var(--secondary, var(--z-color-gray-100));

  /* ── 轨道 / 空槽（进度条、滑杆、骨架、开关底） ──
     语义是"控件自身的槽"，不是边框也不是面。取值与 -border 相同是巧合，不要合并：
     宿主调 \`--border\` 时不该连带把进度条轨道改深一档。 */
  --z-color-track: var(--track, var(--z-color-gray-200));
  --z-color-track-strong: var(--track-strong, var(--z-color-gray-300));

  /* ── 反色实心（选中 chip、气泡底）+ 配套文字 ──
     [WHY 成对] 原先 chip--selected 与 slider tooltip 写 \`gray-800/900\` 底 + \`white\` 字。
     暗色里 gray 整阶反转 → 底变成 #f1f5f9/#f8fafc，文字还是白的 ⇒ **白压近白，几乎看不见**。
     底反转了、字没反转，是这个 bug 的全部原因，所以 -inverse 必须配一个 -inverse-text。 */
  --z-color-inverse: var(--inverse, var(--z-color-gray-800));
  --z-color-inverse-text: var(--inverse-foreground, var(--z-color-white));

  /* 禁用填充（滑杆禁用段、滑块描边）：与"禁用文字"同色是巧合，语义是填充 */
  --z-color-fill-disabled: var(--disabled-fill, var(--z-color-gray-400));

  /* ── Spacing ── */
  --z-space-1: 4px;
  --z-space-1-5: 6px; /* 修复 table/tabs 引用未定义 token（REQ-010） */
  --z-space-2: 8px;
  --z-space-3: 12px;
  --z-space-4: 16px;
  --z-space-5: 20px;
  --z-space-6: 24px;
  --z-space-8: 32px;
  --z-space-10: 40px;

  /* ── Border Radius（参考页：小元素 4px / 基 8px / 卡片 12px） ──
   * [WHY md 认 \`--radius\`] shadcn 只有**一个** \`--radius\`，其余由它派生。
   * 宿主写了 \`--radius: 0.5rem\` 却看到我们的小元素还是 4px 圆角，就是「换肤没换干净」。 */
  --z-radius-sm: var(--radius-sm, 4px);
  --z-radius-md: var(--radius, 8px);
  --z-radius-lg: var(--radius-lg, calc(var(--radius, 8px) + 4px));
  --z-radius-full: 9999px;

  /* ── Typography（中文商务字体栈 + 工作字号 13px） ── */
  /* [WHY] 2026-10-20 Windows 11 字体发虚/点阵感（用户反馈「字体对 Windows11 不友好，像点阵」）：
     原栈以 system-ui 打头 → Windows 上拉丁落到 Segoe UI 固定字重，中文落到 Microsoft YaHei
     （非 Windows UI 变体）；YaHei 没有 500 字重，13px 下 500/600 由系统合成加粗，笔画糊而硬，
     小字号尤其像点阵。改为 Win11 原生 UI 字体系：拉丁优先 Segoe UI Variable Text（可变字重，
     小字号更清晰），中文显式给 Microsoft YaHei UI（Windows 界面专用变体），再兜底 Noto Sans SC。
     注意顺序：拉丁字体在前，中文不会被 YaHei 的拉丁字形污染。 */
  /* [WHY 中间变量 \`-default\`] CSS 的 var fallback 允许带逗号（\`var(--x, a, b, c)\`），
     但把整条字体栈塞进 fallback 会让读取 token 的工具（测试解析器、构建期替换）分不清
     「这是几个值还是 fallback 的一部分」。拆一颗 \`-default\` 既保住宿主可覆盖
     （\`--font-sans\`），又让 token 图保持单值语义。issue IKIDAI */
  --z-font-sans-default: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --z-font-mono-default: ui-monospace, "Cascadia Mono", "Cascadia Code", "SF Mono", Consolas, "Fira Code", monospace;
  --z-font-sans: var(--font-sans, var(--z-font-sans-default));
  --z-font-mono: var(--font-mono, var(--z-font-mono-default));
  --z-font-size-xs: 12px;
  --z-font-size-sm: 13px;
  --z-font-size-base: 16px; /* 本地补丁：modal header 引用该 token，上游缺失（2026-08-10 实测） */
  --z-font-size-md: 16px;
  --z-font-size-lg: 18px;
  --z-font-size-xl: 20px;
  /* [WHY 2026-10-26 页面体系样式审计] 展示级标题档。
     demo/page-def.css 此前直接写 \`var(--z-font-size-2xl, 26px)\` —— 该 token **不存在**，
     靠 fallback 生效。有 fallback 所以不报错，但语义层查不到它，任何按 token 改字号的操作都漏掉它。
     补成真 token 而不是把标题降到 xl(20px)：20px 与渲染态 \`.zpg-head__title\` 同级，
     文档页标题就和页面内容标题分不开了。See: wiki/audits/2026-10-26-pagedef-style-audit.md P0-4 */
  --z-font-size-2xl: 26px;
  --z-font-weight-normal: 400;
  --z-font-weight-medium: 500;
  --z-font-weight-semibold: 600;
  --z-font-weight-bold: 700;
  --z-line-height: 1.5;

  /* ── Shadows ── */
  --z-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --z-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --z-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --z-shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.15);
  /* [WHY] audit 2026-10-25: modal/drawer 历史上以 (--z-shadow-xl, 0 20px 60px …) 自带 fallback，
     token 缺失时暗色不跟随。补齐后 fallback 保留以兼容旧宿主覆写。 */

  /* ── Duration（唯一时长真源。组件不得再写裸时长）──
     [WHY 2026-11-17 拆成叶子 + 复合值两层] 原来三个 \`--z-transition-*\` 各自写死
     「时长 + ease」，要换曲线得改三行；更要命的是 \`animation\` 简写里引用复合值再追加
     缓动，会展开成两个 timing function ⇒ 整条声明作废（实测 \`animationName\` 直接变 \`none\`，
     退场 \`animationend\` 永不触发，[[REQ-039-motion-token-layering]]）。
     拆开后复合值只是 \`var()\` 引用，主题/密度覆写叶子即全链跟随，组件零改动。

     [WHY 档位按现役取值定，不为整齐改数] 120/150/200/250/350 每一档背后都有真实消费者；
     把 120 并进 150 或把 200 并进 250 都是「统一性换手感」，不属于归位。 */
  --z-duration-micro: 100ms; /* 快速退场：关闭比打开快，手感才「干脆」（浮层 / 提示） */
  --z-duration-instant: 120ms; /* 即时反馈：悬停 / 拖拽跟手（gantt、page-view） */
  --z-duration-fast: 150ms; /* 快速过渡：颜色 / 边框 / 阴影 */
  --z-duration-quick: 200ms; /* 一次性进出场：弹窗 / 抽屉 / 浮层 */
  --z-duration-normal: 250ms; /* 常规过渡 */
  --z-duration-slow: 350ms; /* 慢过渡 / 展开 */
  /* 循环节奏与交互响应是两种语义，不共用上面五档（spinner 的 600ms 塞进 slow 会语义错位） */
  --z-duration-loop-fast: 600ms; /* 转圈 */
  --z-duration-loop-normal: 1200ms; /* 呼吸 / 弹跳 */
  --z-duration-loop-slow: 1500ms; /* 微光 / 脉动 */

  /* ── Easing（唯一曲线真源）──
     [WHY 都是关键字而非 cubic-bezier] 本轮的硬约束是零视觉回归：换曲线属视觉变更，
     须单独评审后改这里一处即可（复合值全是引用，改一行全局生效）。 */
  --z-ease-standard: ease;
  --z-ease-enter: ease-out;
  --z-ease-exit: ease-in;
  --z-ease-in-out: ease-in-out;
  --z-ease-linear: linear;

  /* ── Transitions（复合值：只准用在 \`transition\`，禁止进 \`animation\` 简写）── */
  --z-transition-instant: var(--z-duration-instant) var(--z-ease-standard);
  --z-transition-fast: var(--z-duration-fast) var(--z-ease-standard);
  --z-transition-quick: var(--z-duration-quick) var(--z-ease-standard);
  --z-transition-normal: var(--z-duration-normal) var(--z-ease-standard);
  --z-transition-slow: var(--z-duration-slow) var(--z-ease-standard);

  /* ── Animation Tokens ── */
  --z-anim-scale-enter: scale(0.95);
  --z-anim-scale-exit: scale(0.95);
  --z-anim-translate-up: -4px;
  --z-anim-translate-down: 4px;
  /* [WHY 旧名降级为别名，不再各写一份字面量] 两套时长真源必然漂移（F3）。这两个名字
     仍有 8 处组件引用，且宿主可能覆写过，删掉会让定制静默失效 —— 所以保留名字、
     把值交给叶子，从此只有一处可改。新代码请直接用 \`--z-duration-*\`。 */
  --z-anim-fade-duration: var(--z-duration-fast);
  --z-anim-duration-fast: var(--z-duration-fast);
  --z-anim-duration-normal: var(--z-duration-normal);

  /* ── Component: Input（紧凑：content 28px + 1px 边框×2 = 控件总高 30px） ── */
  --z-input-font-size: var(--z-font-size-sm);
  --z-input-radius: var(--z-radius-md);
  --z-input-padding-y: 5px;
  --z-input-padding-x: 10px;
  --z-input-border-width: 1px;
  /* [WHY 接到密度档位] 输入框高度此前独立写死 28px，密度切到 compact 时表格行变紧、
     输入框不变 —— 一行里两种节奏。接到 \`--z-control-h-sm\` 后一次切换全局一致。 */
  --z-input-height: var(--z-control-h-sm);
  --z-input-label-gap: var(--z-space-1);
  --z-input-message-gap: var(--z-space-1);
  --z-input-message-font-size: var(--z-font-size-xs);

  /* ── Component: Button（紧凑：5px 12px） ── */
  --z-button-font-size: var(--z-font-size-sm);
  --z-button-font-weight: var(--z-font-weight-medium);
  --z-button-radius: var(--z-radius-md);
  --z-button-padding-y: 5px;
  --z-button-padding-x: 12px;
  --z-button-gap: var(--z-space-2);
  --z-button-transition: all var(--z-transition-fast);
  --z-button-border-width: 1px;

  /* ── Component: Chart ── */
  --z-chart-font-family: var(--z-font-sans);
  --z-chart-title-font-size: var(--z-font-size-lg);
  --z-chart-title-color: var(--z-color-text);
  --z-chart-label-font-size: var(--z-font-size-xs);
  --z-chart-label-color: var(--z-color-text-secondary);
  --z-chart-grid-color: var(--z-color-border);
  --z-chart-axis-color: var(--z-color-text-secondary);
  --z-chart-legend-font-size: var(--z-font-size-xs);
  --z-chart-legend-color: var(--z-color-text-secondary);
  --z-chart-legend-gap: var(--z-space-3);
  --z-chart-tooltip-bg: var(--z-color-bg-overlay);
  --z-chart-tooltip-color: var(--z-color-text);
  --z-chart-tooltip-radius: var(--z-radius-md);
  --z-chart-tooltip-shadow: var(--z-shadow-md);
  --z-chart-focus-ring-color: var(--z-color-primary);

  /* ── Component: Property Panel（紧凑标签列） ── */
  --z-property-label-width: 88px;
  --z-property-gap: var(--z-space-3);
  --z-property-header-font-size: var(--z-font-size-sm);
  --z-property-header-weight: var(--z-font-weight-semibold);

  /* ── Component: App Shell（后台布局骨架 [[REQ-012]]，引用 semantic 变量，暗色自动翻转） ── */
  --z-app-shell-header-height: 56px;
  --z-app-shell-header-bg: var(--z-color-bg);
  --z-app-shell-header-border: var(--z-color-border);
  --z-app-shell-sidebar-width: 220px;
  --z-app-shell-sidebar-collapsed-width: 56px;
  /* [WHY 认 \`--sidebar\` 系列] shadcn 把侧栏单列一组（\`--sidebar\` / \`--sidebar-foreground\` /
     \`--sidebar-primary\` / \`--sidebar-accent\` / \`--sidebar-border\` / \`--sidebar-ring\`），
     因为侧栏常常是「深底浅字」而页面是「浅底深字」—— 用页面 token 套侧栏一定不对。
     宿主给了就用宿主的；没给则与页面面同源（向后兼容，观感不变）。 */
  --z-app-shell-sidebar-bg: var(--sidebar, var(--z-color-bg-secondary));
  --z-app-shell-sidebar-border: var(--sidebar-border, var(--z-color-border));
  --z-app-shell-sidebar-text: var(--sidebar-foreground, var(--z-color-text));
  --z-app-shell-main-bg: var(--z-color-bg);
  --z-app-shell-text: var(--z-color-text);
  --z-app-shell-text-secondary: var(--z-color-text-secondary);
  --z-app-shell-transition: var(--z-transition-normal);
  /* ── 状态角标（pastel 底 + 同色相深字）──
     [WHY] 表格里的状态/诊断/账龄角标由 z-report-table 以 innerHTML 渲染，落在其 **shadow DOM**
     内 —— 外部 CSS 一律命不中，只能内联样式。而内联写裸 hex 在暗色下就是刺眼白块
     （source-invariants 的「裸亮色 hex 棘轮」正是为此设的闸）。
     自定义属性**能穿透 shadow 边界继承**，故这里定义一套随主题翻转的角标色，
     消费侧写 style="color:var(--z-badge-red-fg);background:var(--z-badge-red-bg)" 即可。
     语义按「严重度/职能」命名，不按色相（换色不改调用点）。 */
  --z-badge-green-bg: #d1fae5;
  --z-badge-green-fg: #047857;
  --z-badge-amber-bg: #fef3c7;
  --z-badge-amber-fg: #b45309;
  --z-badge-orange-bg: #ffedd5;
  --z-badge-orange-fg: #c2410c;
  --z-badge-red-bg: #fee2e2;
  --z-badge-red-fg: #b91c1c;
  --z-badge-blue-bg: #dbeafe;
  --z-badge-blue-fg: #1d4ed8;
  --z-badge-violet-bg: #ede9fe;
  --z-badge-violet-fg: #6d28d9;
  --z-badge-slate-bg: #f1f5f9;
  --z-badge-slate-fg: #475569;
  /* A 类实心角标（白字紫底）：深底不随主题变，字永远是白 —— 暗色下依然 4.9:1 */
  --z-badge-solid-bg: #4f46e5;
  --z-badge-solid-fg: #ffffff;

  /* ── Data / Row 语义色（2026-10-20 UI 评审 P0 [[ui-review-20261020]]）──
     [WHY] 此前「读数方向」和「操作」共用一套 danger/success：未达标差额、删除按钮、
     状态标记全是同一个红，改主题必须逐个文件翻。这里按用途拆开——
       data-up / data-down = 读数方向，命名随**中国财务习惯**（涨红跌绿，见
         [[req-20261020-store-perf-daily]]「红涨绿跌着色」硬要求），不叫 positive/negative
         （英文语义里 positive 是绿，会误导后来人）。
       row-*  = 行级状态底色（假期/特殊日），永远淡染，不做整块重色。
     取值：up 红 #c6403a（比 danger #ef4444 深一档，白底 4.9:1 达 AA）；down 绿 #15803d
     （白底 5.1:1）。原来实际值列用的 #059669 只有 3.6:1，未达 AA —— 本次一并收口。 */
  --z-color-data-up: #c6403a;
  --z-color-data-down: #15803d;
  --z-color-data-neutral: var(--z-color-text);
  --z-color-row-holiday: color-mix(in srgb, #dc2626 7%, transparent);
  --z-color-row-holiday-mark: #d97706;
  --z-color-row-special: color-mix(in srgb, #f59e0b 8%, transparent);
  --z-color-row-special-mark: #b45309;
  /* 表头带 / 合计行 / 次级面板底色：此前各页各写 #f4f5f7、#f1f5f9、#f7f9fb 三种 */
  --z-color-surface-sunken: var(--z-color-gray-50);

  /* ── 下沉底面（canvas）：放卡片的"地面"，必须比卡片更深 ──
     [WHY 2026-10-26 页面体系审计] 编辑器的画布区与页面定义的预览区此前用 \`-bg-secondary\` 当"稍深的底"。
     亮色成立（gray-50 压在白色卡片下 = 卡片浮起）；**暗色方向反了**：\`-bg-secondary\` 在暗色是 #1e293b，
     是「抬升」语义（比页面底 #0f172a 更亮），于是放在上面的卡片（\`-bg\` = #0f172a）反而更暗 ——
     卡片看起来像在底板上凿了一个洞，\`--z-shadow-sm\` 也压不出浮起感（黑压黑）。
     一个 token 无法同时表达「抬升的面板」与「下沉的地面」，故单列一个，明暗两块方向各自正确。
     See: wiki/audits/2026-10-26-pagedef-style-audit.md P0-5 */
  --z-color-canvas: var(--z-color-gray-50);

}

/* ── Dark Theme（slate 暗色：bg #0f172a / 卡片 #1e293b / 边框 #334155） ── */
/* [WHY 选择器要带上 \`.dark\`] issue IKIDAI 要求「支持 \`.dark\` class **或** \`data-theme\` 属性
   作用域切换」。宿主（zwms / shadcn 系）用的是 \`.dark\`：只认 \`[data-theme="dark"]\` 的话，
   宿主切换暗色后**组件仍停在亮色** —— 页面一半深一半白，而我们的代码里找不到任何错。
   两个选择器并列，谁先命中都一样（值相同）。 */
[data-theme="dark"],
.dark {
  /* 见亮色块同名声明：浏览器自绘的部件（滚动条 / 原生弹层 / 选中高亮 / 自动填充）
     只认这一行，不认 \`--z-*\`。缺了它，暗色页面里这些部件仍按亮色画。 */
  color-scheme: dark;
  /* [WHY] 2026-10-11 明暗主题（[[2026-10-11-theme-mode]]）：gray primitive 全阶反转。
     全仓大量以 gray-* 作文字/边框/hover 底（「变量名保留组件零改动」约定），只翻语义
     token 它们不会适配暗色；反转后自动适配。elevated 变体：gray-50 → #1e293b（而非镜像的
     #0f172a），保证卡片(#0f172a)上的 hover 灰仍可见；gray-100/200 同值分任「强底色/边框」。
     已核查反例：gray-500~900 作背景仅 Tooltip 一处（已改 text/bg 语义对）；浅 gray 作文字
     均为幽灵图标/禁用态，反转后仍可读。 */
  --z-color-gray-50: #1e293b;
  --z-color-gray-100: #334155;
  --z-color-gray-200: #334155;
  --z-color-gray-300: #475569;
  --z-color-gray-400: #64748b;
  --z-color-gray-500: #94a3b8;
  --z-color-gray-600: #cbd5e1;
  --z-color-gray-700: #e2e8f0;
  --z-color-gray-800: #f1f5f9;
  --z-color-gray-900: #f8fafc;

  /* [WHY 暗色侧同样要套宿主名] 亮色块已经写成 \`var(--background, …)\`，但暗色块是硬赋值 ——
     宿主在 \`.dark { --background: #0b1220 }\` 给的深底**完全无效**，组件仍用我们的 #0f172a。
     「亮色换了、暗色没换」是最容易被当成「主题功能坏了」的形态。 */
  --z-color-bg: var(--background, #0f172a);
  --z-color-bg-secondary: var(--muted, #1e293b);
  --z-color-bg-overlay: rgba(0, 0, 0, 0.7);
  --z-color-border: var(--border, #334155);
  --z-color-border-hover: var(--border-hover, #475569);
  /* 暗色侧方向相反：底面越暗，控件边框要越亮才看得见。
     #64748b 对 #1e293b 是 3.07:1、对 #0f172a 是 3.75:1 —— 两档都过 3:1。 */
  --z-color-border-control: var(--border-control, #64748b);
  --z-color-border-control-hover: var(--border-control-hover, #94a3b8);
  /* 分隔线也要比 -border 更暗（亮色是更浅），方向由"离底面更近"决定，不跟视觉深浅走 */
  --z-color-divider: #243044;
  --z-color-text: var(--foreground, #f8fafc);
  --z-color-text-secondary: var(--muted-foreground, #94a3b8);
  --z-color-text-disabled: #64748b;
  --z-color-text-placeholder: var(--text-placeholder, #94a3b8);

  /* [WHY 只有这一颗需要暗色值] 其余新 token（hover / track / inverse 底）都取 gray 阶，
     而 gray 阶在本块里已整阶反转 ⇒ 自动适配。唯独"反色面上的文字"不能跟着反转两次：
     亮色是白字压深底，暗色是深字压浅底，必须显式给深色。 */
  --z-color-inverse-text: var(--inverse-foreground, #0f172a);

  --z-color-primary: var(--primary, #3b82f6);
  --z-color-primary-hover: var(--primary-hover, #60a5fa);
  --z-color-primary-active: var(--primary-active, #93c5fd);
  --z-color-primary-text: var(--primary-foreground, var(--z-color-white));
  --z-color-primary-strong: #93c5fd;

  /* [WHY] 极浅阶（*-50/100/200）在亮色是「近白 tint」，被多处组件直接当浅底引用。
     它们此前**没有**暗色覆盖 —— 深底上出现亮白块，压在里面的近白文字随之隐形
     （日历区间、tag、outline 按钮 hover、select 激活项、report-table 选中行都中招）。
     这里补齐暗色对应（本色半透明），即使宿主自建组件仍直接引用原始色板也不会崩。
     组件侧已同步改为语义 token（-soft / -tint），这层是兜底而非主要依赖。 */
  --z-color-blue-50: rgba(59, 130, 246, 0.14);
  --z-color-blue-100: rgba(59, 130, 246, 0.22);
  --z-color-blue-200: rgba(59, 130, 246, 0.3);
  --z-color-red-50: rgba(239, 68, 68, 0.14);
  --z-color-red-100: rgba(239, 68, 68, 0.22);
  --z-color-green-50: rgba(16, 185, 129, 0.14);
  --z-color-green-100: rgba(16, 185, 129, 0.22);
  --z-color-yellow-50: rgba(245, 158, 11, 0.14);
  --z-color-yellow-100: rgba(245, 158, 11, 0.22);

  /* json-viewer 的键名色：亮色紫 500 压暗底只有 4.09:1，暗色换浅一阶（≈6.4） */
  --z-color-purple-500: #a78bfa;

  /* [WHY] 2026-10-25 审计：新增 soft/fill 语义在暗色必须翻转，否则浅底组件
     （upload 拖拽区、command 选中项、tree-node 选中行）在暗色下变成刺眼亮块。 */
  --z-color-primary-soft: var(--primary-soft, rgba(59, 130, 246, 0.16));
  --z-color-danger-soft: var(--destructive-soft, rgba(239, 68, 68, 0.16));
  --z-color-success-soft: var(--success-soft, rgba(16, 185, 129, 0.16));
  --z-color-warning-soft: var(--warning-soft, rgba(245, 158, 11, 0.16));
  --z-color-info-soft: var(--info-soft, rgba(59, 130, 246, 0.16));
  /* 区间带：比 soft 实一档，压 #0f172a ≈ 1.55，让选区在深底上真的看得见 */
  --z-color-primary-tint: rgba(59, 130, 246, 0.28);
  --z-color-primary-tint-hover: rgba(59, 130, 246, 0.4);
  --z-color-info: #60a5fa;
  --z-color-fill: rgba(255, 255, 255, 0.06);

  /* soft 底上的文字需翻亮，否则深字压深底不可读 */
  --z-color-success-strong: #34d399;
  --z-color-warning-strong: #fbbf24;
  --z-color-danger-strong: #fca5a5;
  --z-color-info-strong: #93c5fd;
  --z-color-danger-border: #5c1a1a;

  /* 光晕在暗底需提高不透明度，否则几乎不可见 */
  --z-focus-ring-color: var(--ring-soft, rgba(96, 165, 250, 0.28));
  --z-focus-ring-danger: rgba(248, 113, 113, 0.28);

  --z-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --z-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --z-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  --z-shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.6);

  /* 状态角标暗色：底用同色相 22% 半透明（暗底上比实色浅块稳），字提亮到 300 阶。
     [WHY 不能用亮色 pastel] #d1fae5 之类放到 #0f172a 上是整块发光，和「轻量提示」的语义相反。 */
  --z-badge-green-bg: color-mix(in srgb, #10b981 22%, transparent);
  --z-badge-green-fg: #6ee7b7;
  --z-badge-amber-bg: color-mix(in srgb, #f59e0b 22%, transparent);
  --z-badge-amber-fg: #fcd34d;
  --z-badge-orange-bg: color-mix(in srgb, #f97316 22%, transparent);
  --z-badge-orange-fg: #fdba74;
  --z-badge-red-bg: color-mix(in srgb, #ef4444 22%, transparent);
  --z-badge-red-fg: #fca5a5;
  --z-badge-blue-bg: color-mix(in srgb, #3b82f6 22%, transparent);
  --z-badge-blue-fg: #93c5fd;
  --z-badge-violet-bg: color-mix(in srgb, #8b5cf6 22%, transparent);
  --z-badge-violet-fg: #c4b5fd;
  --z-badge-slate-bg: color-mix(in srgb, #94a3b8 18%, transparent);
  --z-badge-slate-fg: #cbd5e1;
  /* 实心角标暗色下保持原样：它是「最强档」，不需要跟着变淡 */
  --z-badge-solid-bg: #6366f1;
  --z-badge-solid-fg: #ffffff;

  /* [WHY] 暗色下 data-* 必须提亮：亮色的 #c6403a / #15803d 放到 #0f172a 上分别只有 3.1:1 / 2.4:1；
     行底色用同色相但更低的比例（暗色背景本身对比差，7% 会看不见）。 */
  --z-color-data-up: #f87171;
  --z-color-data-down: #4ade80;
  --z-color-row-holiday: color-mix(in srgb, #f87171 10%, transparent);
  --z-color-row-holiday-mark: #f59e0b;
  --z-color-row-special: color-mix(in srgb, #f59e0b 12%, transparent);
  --z-color-row-special-mark: #fbbf24;

  /* 下沉底面：比页面底（#0f172a）再深一档，卡片才浮得起来。见 :root 同名的长注释 */
  --z-color-canvas: #0b1220;
}

/* ═══════════════════════════════════════════════════════════════
   密度档位（issue IKIDAI）
   ═══════════════════════════════════════════════════════════════

   用法：\`<html data-density="compact">\`，缺省 default。

   [WHY 用「覆盖已有 token」而不是新增一套尺寸 token] 组件 CSS 已经在用
   \`--z-font-size-sm\` / \`--z-space-*\` / \`--z-line-height\`；再引入一套 \`--z-density-*\`
   意味着每个组件都要改一遍「尺寸从哪来」，改漏的那个组件在 compact 下保持原样 ——
   密度切换变成「大部分变紧、个别不变」的半成品。覆盖既有 token 则一次生效、零组件改动。

   边界（诚实说明）：写死像素高度的组件（部分控件的 28px 行高、图标尺寸）不会跟随，
   它们要靠 \`--z-control-h\`（见下）改造。这部分是增量工作，不假装已全覆盖。
   ═══════════════════════════════════════════════════════════════ */

:root,
[data-theme="light"],
[data-theme="dark"],
.dark {
  /* 控件高度基线：新代码请用它，别再写 28px / 30px 字面量。
     [WHY 取值按实际谱系重定] 上一版给的 26/30/34 是凭空的（全仓零引用），
     而组件真实在用的是 24（行内小按钮）/ 28（分页、关闭、输入框）/ 32（常规控件）/
     36（大输入）。token 与现状不吻合，替换就必然改视觉 —— 于是谁也不敢换，
     「控件高度 token 化」永远停在文档里。这里对齐现状，替换才是零变化。 */
  --z-control-h-xs: 24px;
  --z-control-h-sm: 28px;
  --z-control-h: 32px;
  --z-control-h-lg: 36px;
}

[data-density="compact"],
[data-density="small"] {
  --z-font-size-xs: 11px;
  --z-font-size-sm: 12px;
  --z-font-size-lg: 16px;
  --z-line-height: 1.4;

  --z-space-1: 3px;
  --z-space-1-5: 5px;
  --z-space-2: 6px;
  --z-space-3: 9px;
  --z-space-4: 12px;
  --z-space-5: 16px;
  --z-space-6: 20px;

  --z-control-h-xs: 22px;
  --z-control-h-sm: 26px;
  --z-control-h: 28px;
  --z-control-h-lg: 32px;
}

[data-density="comfortable"],
[data-density="large"] {
  --z-font-size-sm: 14px;
  --z-line-height: 1.6;

  /* [WHY 2026-10-26 补 --z-space-1-5] 原来只有 compact 覆盖了 1-5，comfortable 漏了。
     后果是「舒适」方向只有横向变松、纵向不动 —— tabs 的 \`space-1-5 space-4\` 与
     report-table 单元格的 \`space-1-5 space-3\` 都只加了下/左右之一，行看着被压扁。
     取值沿用本档 +2px 的既有节奏（space-2 8→10、space-3 12→14）。 */
  --z-space-1-5: 8px;
  --z-space-2: 10px;
  --z-space-3: 14px;
  --z-space-4: 20px;
  --z-space-5: 24px;
  --z-space-6: 28px;

  --z-control-h-xs: 26px;
  --z-control-h-sm: 32px;
  --z-control-h: 36px;
  --z-control-h-lg: 40px;
}

/* ── Mobile (H5) ──
   [WHY 与主题块分开 2026-11-08] 这一组值和明暗无关，但**必须**是 token 而不是各组件
   自己写 44px / env(safe-area-*)：
   · 触控目标尺寸是 iOS HIG / Material 共同的硬指标，写死在 9 个 m-* 组件里就会漂；
   · 安全区只能靠 env() 拿，而 env() 在 PC 上求值为 0 —— 用它做 padding 的下限，
     一套样式两端都能跑，不需要 \`@supports\` 分支；
   · 底部固定条（提交栏 / tabbar）不避让安全区的症状是 iPhone 上按钮压在家条上，
     表现为「点了没反应」，而不是任何报错。 */
:root {
  --z-safe-top: env(safe-area-inset-top, 0px);
  --z-safe-right: env(safe-area-inset-right, 0px);
  --z-safe-bottom: env(safe-area-inset-bottom, 0px);
  --z-safe-left: env(safe-area-inset-left, 0px);

  /* 最小可点区域：小于它，手指按不准（列表行 48、图标按钮 44） */
  --z-touch-min: 44px;
  --z-touch-min-sm: 36px;
  /* 移动端行高：单元格 / 表单行共用同一档，避免「同一种行两种高度」 */
  --z-m-row-h: 48px;
  --z-m-gutter: var(--z-space-4);
  --z-m-radius: var(--z-radius-lg);
}

/* ── 动效强度档（\`<html data-motion="none">\`）──
   [WHY 用「覆盖叶子」而不是新增一套动效 token] 与 \`data-density\` 同构：一次切换全局生效、
   组件零改动。只提供 \`none\` 一档 —— 它等价于 reduced-motion，零新增视觉风险；
   \`subtle\`（时长 ×0.6、位移减半）需要视觉确认，拆 P2（[[REQ-039-motion-token-layering]] §1.6）。

   [WHY 必须排在 reduced-motion 段之前] 实测（F6/F 组）：排在之后的覆写块会静默盖掉
   reduced-motion 的变量归零 —— 元素因为 \`* { transition-duration: 0ms !important }\`
   看起来仍然「没动」，但 JS 按 token 算出来的等待时长全错。守卫 R4 钉的就是这条。 */
[data-motion="none"] {
  --z-duration-micro: 0ms;
  --z-duration-instant: 0ms;
  --z-duration-fast: 0ms;
  --z-duration-quick: 0ms;
  --z-duration-normal: 0ms;
  --z-duration-slow: 0ms;
  --z-duration-loop-fast: 0ms;
  --z-duration-loop-normal: 0ms;
  --z-duration-loop-slow: 0ms;

  --z-anim-scale-enter: scale(1);
  --z-anim-scale-exit: scale(1);
  --z-anim-translate-up: 0;
  --z-anim-translate-down: 0;
}

/* ── Reduced Motion（必须是文件最后一个规则块）──
   [WHY 归零对象是叶子，不是复合值] 实测（F6/C 组）：拆出叶子后只归零复合值，
   \`--z-duration-fast\` 仍残留 150ms，任何按 token 计算等待逻辑的 JS 都会算错。
   复合值全是 \`var()\` 引用，叶子归零即自动跟随，不需要重复归零。
   [WHY 位置必须在最后] 见上方 \`[data-motion]\` 注释；守卫 R4 静态拦截。 */
@media (prefers-reduced-motion: reduce) {
  :root,
  [data-theme="light"],
  [data-theme="dark"],
  .dark {
    --z-duration-micro: 0ms;
    --z-duration-instant: 0ms;
    --z-duration-fast: 0ms;
    --z-duration-quick: 0ms;
    --z-duration-normal: 0ms;
    --z-duration-slow: 0ms;
    --z-duration-loop-fast: 0ms;
    --z-duration-loop-normal: 0ms;
    --z-duration-loop-slow: 0ms;

    --z-anim-scale-enter: scale(1);
    --z-anim-scale-exit: scale(1);
    --z-anim-translate-up: 0;
    --z-anim-translate-down: 0;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0ms !important;
    transition-delay: 0ms !important;
  }
}

/* ── 无引用的令牌：判定、清单与处置 ───────────────────────────────────────────
   [2026-11-14 实测] 下面这批名字，在全仓源码（src/** 与 demo/**，.ts / .css / .html）
   里除了自身定义之外没有任何引用。共 55 个 = 30 个原始色板 + 25 个组件令牌。

   [口径必须保守，否则会把活的判成死的] 四种情况容易算错：
     · \`--z-chart-1..5\` 是 chart/palette.ts 用一个**字符串数组**引的，不是 var() 形态；
     · \`--z-chart-label-color\` / \`--z-chart-grid-color\` 是 Chart.ts 用 getComputedStyle
       按名字读的（canvas 拿不到 CSS 变量，只能运行时取值）；
     · \`--z-font-sans-default\` 被本文件自己的 \`--z-font-sans\` 当 fallback 引用；
     · **统计前必须剥掉注释** —— 下面这段清单本身会提到这些名字，不剥就会「自证」
       它们被引用了。我按这个口径复算时，孤儿数从 55 变成 46，就是被本段说明污染。

   只按「var 前缀」匹配、或忘记剥注释，都会得出一个看起来精确但错误的数。

   [30 个原始色板不删] 色板是超集，语义层从中取色，不需要每个都被直接消费。

   [25 个组件令牌分三类，处置不同]
     ① **对外色板（页面内联用）** —— 16 个：--z-badge-{green,amber,orange,red,blue,violet,
        slate}-{bg,fg} 与 --z-badge-solid-{bg,fg}。
        [2026-11-14 改判，原判错了] 上一版把它们写成「已被语义令牌取代的残留，建议下个版本
        删除」。实测与读代码后推翻：它们**不是给组件用的**。z-report-table 以 innerHTML
        渲染状态角标，内容落在它的 shadow DOM 里 —— 外部 CSS 命不中，页面作者只能写
        \`style="color:var(--z-badge-red-fg)"\`（见上方 :root 里的同名注释）。
        所以「源码里零 var() 引用」正是它的设计，不是没人用。
        删掉的后果：不报错、不动测试，只是页面里所有状态角标在暗色下变成刺眼白块。
        判据由 tests/unit/theme-token-guard.test.ts 的「对外色板」一条钉住：明暗两套都得在。

     ② 语义已分裂，待接线 —— 2 个：--z-z-popover（1200）/ --z-z-drawer（1100）。
        它们不是「没人用」，是「用错了档」：Popover 组件取的是 dropdown 档，
        Drawer 也没有引用自己那一档。修它们属于 L2 的事，不是删令牌。

     ③ 无内部消费，保留为对外覆写点 —— 7 个：
        --z-z-base / --z-transition-slow / --z-anim-scale-enter / -scale-exit /
        --z-anim-translate-up / -translate-down / --z-chart-axis-color。

   [为什么②③不直接删] 它们是对外可覆写的名字。宿主要是覆写过，删掉不会报错，
   只会让那份主题定制静默失效 —— 比多留几行更难查。
   要清理，先确认四个宿主都没覆写，再一次性删。
   ------------------------------------------------------------------------ */


`,m="zui-theme",g="zui-theme-tokens";function y(n){return n==="light"||n==="dark"}function w(){return typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}function b(){try{const n=localStorage.getItem(m);return n&&y(n)?n:null}catch{return null}}function k(){if(typeof document>"u"||document.getElementById(g))return;const n=document.createElement("style");n.id=g,n.textContent=x,document.head.appendChild(n)}class A{constructor(){this._initialized=!1,this._theme=b()??w()}get theme(){return this._theme}set(r){this._theme!==r&&(this._theme=r,this.apply(r),this.persist(r),document.dispatchEvent(new CustomEvent("z-theme-change",{detail:r})))}init(){this._initialized||(this._initialized=!0,k(),this.apply(this._theme),typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",r=>{b()||this.set(r.matches?"dark":"light")}))}toggle(){this.set(this._theme==="light"?"dark":"light")}apply(r){document.documentElement.setAttribute("data-theme",r)}persist(r){try{localStorage.setItem(m,r)}catch{}}}const T=new A;function M(n,r){const o=n.observedAttributes??[];if(o.includes(r))return;const e=[...o,r];Object.defineProperty(n,"observedAttributes",{get:()=>e,configurable:!0})}function R(n,r,o,e){n[r]=e,n.getAttribute(o)!==e&&n.setAttribute(o,e)}const H='[part~="field"],[part~="native"],[part~="trigger"]',S=n=>n?"true":"false",d="data-z-field-name";function f(n){if(!n)return null;const r=n.shadowRoot;return r?r.querySelector(H):null}const s=n=>!!n&&n.trim().length>0;function W(n){var r;return v(((r=n==null?void 0:n.assignedElements)==null?void 0:r.call(n))??[])}const Y=8;function v(n,r=0){var o;if(r>Y)return null;for(const e of n){if(e.tagName==="SLOT"){const t=v(((o=e.assignedElements)==null?void 0:o.call(e))??[],r+1);if(t)return t;continue}return e}return null}function C(n){if(!n)return!1;if(s(n.getAttribute("aria-label"))||s(n.getAttribute("aria-labelledby"))||s(n.getAttribute("label")))return!0;const r=f(n);if(!r)return!1;if(s(r.getAttribute("aria-label"))||s(r.getAttribute("aria-labelledby")))return!0;const o=r.closest("label");return!!(o&&(s(o.textContent)||o.querySelector("slot")&&s(n.textContent)))}function u(n,r){const o=f(n);if(!n||!o)return;const e=o.hasAttribute(d);if(!s(r)){e&&I(n);return}!e&&C(n)||o.getAttribute("aria-label")!==r&&(o.setAttribute("aria-label",r),o.setAttribute(d,""))}function I(n){const r=f(n);!r||!r.hasAttribute(d)||(r.removeAttribute("aria-label"),r.removeAttribute(d))}function _(n,r){let o=null,e=null;const t=a=>{o==null||o.disconnect(),o=null;const c=a.shadowRoot;if(!c){e=null;return}e=a,o=new MutationObserver(()=>u(n(),r())),o.observe(c,{childList:!0})};return{sync:()=>{const a=n();a&&(u(a,r()),(e!==a||!o)&&t(a))},dispose(){o==null||o.disconnect(),o=null,e=null}}}function L(n,r,o,e){if(!r)return;if(!o){r.removeAttribute("aria-hidden"),r.removeAttribute("inert");return}const t=E();t&&t!==e&&n.contains(t)&&(e==null||e.focus()),r.setAttribute("aria-hidden","true"),r.setAttribute("inert","")}function E(){var r;let n=document.activeElement;for(let o=0;n&&o<16;o++){let e=null;try{e=((r=n.shadowRoot)==null?void 0:r.activeElement)??null}catch{e=null}if(!e)break;n=e}return n}function D(n,r){if(!n||!r)return!1;let o=r;for(let e=0;o&&e<16;e++){if(o===n)return!0;const t=o.getRootNode();o=t instanceof ShadowRoot?t.host:t.parentNode}return!1}const p='a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';function O(n){if(!n)return!1;if(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement)return!n.readOnly&&!n.disabled;const r=n.getAttribute("contenteditable");return r===""||r==="true"||r==="plaintext-only"}function h(n,r=0){if(!n||r>6)return null;if(n.matches(p))return n;const o=n.shadowRoot;if(!o)return null;const e=o.querySelector(p);if(e)return e;for(const t of o.children){const l=h(t,r+1);if(l)return l}return null}const z="data-z-trigger-aria";function P(n,r){let o=null,e=null;const t=a=>{!a||!a.hasAttribute(z)||(a.removeAttribute("aria-haspopup"),a.removeAttribute("aria-expanded"),a.removeAttribute("aria-disabled"),a.removeAttribute(z))},l=()=>{const a=n();a&&a!==e&&(a.addEventListener("slotchange",l),e=a);const c=r(),i=h(W(a))??(a==null?void 0:a.parentElement)??null;i!==o&&(t(o),o=i),i&&(i.setAttribute("aria-haspopup",c.hasPopup),i.setAttribute("aria-expanded",S(c.expanded)),c.disabled===!0?i.setAttribute("aria-disabled","true"):c.disabled===!1&&i.removeAttribute("aria-disabled"),i.setAttribute(z,""))};return{sync:l,dispose(){e==null||e.removeEventListener("slotchange",l),e=null,t(o),o=null}}}export{S as a,_ as b,P as c,E as d,R as e,L as f,f as g,D as h,O as i,M as o,W as s,T as t};

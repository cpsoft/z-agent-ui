// 从旧分类页 basics 搬来的示例与接线。
// 五页的接线各自用了同名变量
// （selectEl / radioGroup / ...），并到一个模块里就是重名错误；拆成模块则天然隔离。
// 每个模块只管「把自己那几个示例接上」，壳（侧栏/主题/语言）由页面统一 initShell。

  // Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/components/input/index.js";
  import "../../src/components/option/index.js";
  import "../../src/components/select/index.js";
  import "../../src/components/checkbox/index.js";
  import "../../src/components/switch/index.js";
  import "../../src/components/radio/index.js";
  import "../../src/components/radio-group/index.js";
  import "../../src/components/divider/index.js";
  import "../../src/components/search-bar/index.js";

  // ── Button ────────────────────────────────────────────

  const clickBtn = document.getElementById("click-demo");
  const clickCount = document.getElementById("click-count");
  let count = 0;
  clickBtn.addEventListener("z-click", () => {
    count++;
    clickCount.textContent = `Clicked ${count} times`;
  });

  // ── Input ─────────────────────────────────────────────

  const inputEl = document.getElementById("input-demo");
  const inputVal = document.getElementById("input-value");
  inputEl.addEventListener("z-input", (e) => {
    inputVal.textContent = `Value: ${JSON.stringify(e.detail.value)}`;
  });

  // ── Select ────────────────────────────────────────────

  const selectEl = document.getElementById("select-demo");
  const selectVal = document.getElementById("select-value");
  selectEl.addEventListener("z-change", (e) => {
    selectVal.textContent = `Selected: ${JSON.stringify(e.detail.value)}`;
  });

  // ── Select: 前端搜索 ─────────────────────────────────

  const selectSearch = document.getElementById("select-search-demo");
  const selectSearchVal = document.getElementById("select-search-value");
  selectSearch.addEventListener("z-change", (e) => {
    selectSearchVal.textContent = `Selected: ${JSON.stringify(e.detail.value)}`;
  });

  // ── Select: 后端搜索（模拟远程，事件流模式） ───────────

  const REMOTE_COUNTRIES = [
    { value: "cn", label: "China" },
    { value: "us", label: "United States" },
    { value: "jp", label: "Japan" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "uk", label: "United Kingdom" },
    { value: "kr", label: "South Korea" },
    { value: "au", label: "Australia" },
    { value: "br", label: "Brazil" },
    { value: "ca", label: "Canada" },
  ];

  const selectRemote = document.getElementById("select-remote-demo");
  const selectRemoteVal = document.getElementById("select-remote-value");
  const selectRemoteQuery = document.getElementById("select-remote-query");
  selectRemote.addEventListener("z-search", (e) => {
    const query = e.detail.query;
    selectRemoteQuery.textContent = `remote query: "${query}"`;
    if (!query) {
      selectRemote.loading = false;
      return;
    }
    // 模拟 400ms 网络延迟；选项替换后由 MutationObserver 自动重绘下拉
    selectRemote.loading = true;
    window.setTimeout(() => {
      const matches = REMOTE_COUNTRIES.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
      selectRemote.innerHTML = "";
      for (const c of matches) {
        const opt = document.createElement("z-option");
        opt.value = c.value;
        opt.textContent = c.label;
        selectRemote.appendChild(opt);
      }
      selectRemote.loading = false;
    }, 400);
  });
  selectRemote.addEventListener("z-change", (e) => {
    selectRemoteVal.textContent = `Selected: ${JSON.stringify(e.detail.value)}`;
  });

  // ── Checkbox ──────────────────────────────────────────

  const checkboxEl = document.getElementById("checkbox-demo");
  const checkboxVal = document.getElementById("checkbox-value");
  checkboxEl.addEventListener("z-change", (e) => {
    checkboxVal.textContent = `Checked: ${e.detail.checked}`;
  });

  const indeterminateCheckbox = document.getElementById("checkbox-indeterminate-demo");
  document.getElementById("toggle-indeterminate").addEventListener("z-click", () => {
    const el = indeterminateCheckbox;
    el.indeterminate = !el.indeterminate;
    el.checked = false;
  });

  // ── Switch ────────────────────────────────────────────

  const switchEl = document.getElementById("switch-demo");
  const switchVal = document.getElementById("switch-value");
  switchEl.addEventListener("z-change", (e) => {
    switchVal.textContent = `On: ${e.detail.checked}`;
  });

  // ── RadioGroup ────────────────────────────────────────

  const radioGroupV = document.getElementById("radio-group-vertical");
  const radioValV = document.getElementById("radio-value-vertical");
  radioGroupV.addEventListener("z-change", (e) => {
    radioValV.textContent = `Selected: ${e.detail.value}`;
  });

  const radioGroupH = document.getElementById("radio-group-horizontal");
  const radioValH = document.getElementById("radio-value-horizontal");
  radioGroupH.addEventListener("z-change", (e) => {
    radioValH.textContent = `Selected: ${e.detail.value}`;
  });

  // ── Search Bar（防抖搜索框） ───────────────────────────

  const sbDemo = document.getElementById("sb-demo");
  const sbLg = document.getElementById("sb-lg");
  const sbLog = document.getElementById("sb-log");

  const logSb = (label: string, value: string): void => {
    if (sbLog) sbLog.textContent = `${label}: "${value}"`;
  };

  sbDemo?.addEventListener("z-input", (e) => logSb("z-input（防抖后）", (e as CustomEvent).detail.value));
  sbDemo?.addEventListener("z-search", (e) => logSb("z-search（回车）", (e as CustomEvent).detail.value));
  sbDemo?.addEventListener("z-clear", () => logSb("z-clear", ""));
  sbLg?.addEventListener("z-input", (e) => logSb("debounce=0 逐键", (e as CustomEvent).detail.value));

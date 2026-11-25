// 从 advanced.html 搬来的三段组合件演示（属性面板 / 详情表单 / 代码编辑器）。
// 它们都在「编辑器语境」里出现，所以归到 editor.html；壳由页面统一提供。
// Components used on this page
  import "../../src/components/button/index.js";
  import "../../src/property/panel/index.js";
  import "../../src/property/group/index.js";
  import "../../src/property/row/index.js";
  import "../../src/app/detail-form/index.js";
  import "../../src/components/input/index.js";
  import "../../src/components/select/index.js";
  import "../../src/components/option/index.js";
  import "../../src/components/switch/index.js";
  import "../../src/components/checkbox/index.js";
  import "../../src/components/modal/index.js";
  import "../../src/content/code-editor/index.js";

  // ── Code Editor ─────────────────────────────────────────
  // value 为代码内容（含换行/反引号），走 JS 属性赋值（REQ-017）
  const codeEditor = document.getElementById("code-editor-demo");
  codeEditor.value = [
    "// z-code-editor：Tab 缩进 / 括号配对 / 回车自动缩进",
    "function greet(name) {",
    "  const msg = `Hello, ${name}!`;",
    "  return msg;",
    "}",
    "",
    "const n = 42;",
    "greet(\"zAgentUI\");",
  ].join("\n");

  codeEditor.addEventListener("z-input", (e) => {
    document.getElementById("code-editor-log").textContent = `z-input: ${e.detail.value.length} chars`;
  });
  codeEditor.addEventListener("z-change", (e) => {
    document.getElementById("code-editor-log").textContent = `z-change: ${e.detail.value.length} chars`;
  });

  // functions 注册表：为补全面板与参数签名提示提供函数元数据；键入词前缀自动弹出，
  // 输入 "(" 或 "," 触发签名提示，↑↓ 导航、Enter/Tab 接受、Esc 关闭、Ctrl+Space 强制弹出（REQ-017）
  codeEditor.functions = [
    { label: "greet", kind: "function", detail: "(name)", params: ["name"], desc: "返回问候语" },
    { label: "format", kind: "function", detail: "(value, pattern)", params: ["value", "pattern"], desc: "格式化数值" },
    { label: "print", kind: "function", detail: "(...args)", params: ["...args"], desc: "输出到控制台" },
  ];

  document.getElementById("code-editor-readonly-btn").addEventListener("z-click", () => {
    codeEditor.readonly = !codeEditor.readonly;
    document.getElementById("code-editor-readonly-btn").textContent = codeEditor.readonly ? "解除只读" : "切换只读";
  });
  document.getElementById("code-editor-wrap-btn").addEventListener("z-click", () => {
    codeEditor.wrap = !codeEditor.wrap;
    document.getElementById("code-editor-wrap-btn").textContent = codeEditor.wrap ? "关闭换行" : "切换换行";
  });
  document.getElementById("code-editor-lang").addEventListener("z-change", (e) => {
    codeEditor.language = e.detail.value;
  });

  // ── Property Panel ──────────────────────────────────────
  const propertyPanelDemo = document.getElementById("property-panel-demo");
  const propertyLockBtn = document.getElementById("property-lock-btn");
  const propertyReadonlyBtn = document.getElementById("property-readonly-btn");

  propertyLockBtn.addEventListener("z-click", () => {
    propertyPanelDemo.disabled = !propertyPanelDemo.disabled;
    propertyLockBtn.textContent = propertyPanelDemo.disabled ? "解除禁用" : "切换禁用";
  });

  propertyReadonlyBtn.addEventListener("z-click", () => {
    propertyPanelDemo.readonly = !propertyPanelDemo.readonly;
    propertyReadonlyBtn.textContent = propertyPanelDemo.readonly ? "解除只读" : "切换只读";
  });

  // ── Detail Form ─────────────────────────────────────────
  // fields/value 是复杂数据，JSON 属性不可行，演示用属性赋值（见 REQ-009）
  const detailFields = [
    { name: "name", label: "名称", type: "text", required: true, placeholder: "请输入名称" },
    {
      name: "dept", label: "部门", type: "select", defaultValue: "frontend",
      options: [
        { value: "frontend", label: "前端组" },
        { value: "backend", label: "后端组" },
        { value: "design", label: "设计组" },
      ],
    },
    { name: "age", label: "年龄", type: "number", placeholder: "18-60" },
    { name: "email", label: "邮箱", type: "email", placeholder: "name@example.com" },
    { name: "active", label: "启用", type: "boolean", defaultValue: true },
    { name: "joined", label: "入职日期", type: "date" },
    {
      name: "level", label: "职级", type: "select", group: "扩展",
      options: [
        { value: "p5", label: "P5 高级" },
        { value: "p6", label: "P6 资深" },
      ],
    },
    { name: "remark", label: "备注", type: "textarea", span: true, group: "扩展" },
  ];

  const detailFormDemo = document.getElementById("detail-form-demo");
  const detailFormLog = document.getElementById("detail-form-log");
  detailFormDemo.fields = detailFields;
  detailFormDemo.value = {
    name: "张三",
    dept: "frontend",
    age: 30,
    email: "zhangsan@example.com",
    active: true,
    joined: "2024-03-15",
    level: "p6",
  };

  detailFormDemo.addEventListener("z-change", (e) => {
    const d = e.detail;
    detailFormLog.textContent = `已更新: ${d.field} = ${JSON.stringify(d.value)}`;
  });

  document.getElementById("detail-save-btn").addEventListener("z-click", () => {
    const { valid, errors } = detailFormDemo.validate();
    detailFormLog.textContent = valid
      ? `保存值: ${JSON.stringify(detailFormDemo.getValues())}`
      : `校验失败: ${Object.keys(errors).join(", ")}`;
  });

  document.getElementById("detail-reset-btn").addEventListener("z-click", () => {
    detailFormDemo.reset();
    detailFormLog.textContent = "已重置";
  });

  const detailViewBtn = document.getElementById("detail-view-btn");
  detailViewBtn.addEventListener("z-click", () => {
    detailFormDemo.mode = detailFormDemo.mode === "view" ? "edit" : "view";
    detailViewBtn.textContent = detailFormDemo.mode === "view" ? "切换编辑" : "切换查看";
  });

  // 弹窗内创建（create 模式）
  const detailCreateForm = document.getElementById("detail-form-create");
  detailCreateForm.fields = detailFields;
  const detailModal = document.getElementById("detail-form-modal");
  document.getElementById("detail-open-modal").addEventListener("z-click", () => detailModal.show());
  document.getElementById("detail-modal-cancel").addEventListener("z-click", () => detailModal.close());
  document.getElementById("detail-modal-submit").addEventListener("z-click", () => {
    const { valid } = detailCreateForm.validate();
    if (valid) {
      detailModal.close();
      detailFormLog.textContent = `弹窗创建: ${JSON.stringify(detailCreateForm.getValues())}`;
    }
  });

// demo 站点 i18n：语言检测、取值、切换、DOM 注入。
//
// 本文件只留 API 与 DOM 注入逻辑；文案表按语言拆在 i18n/messages-{en,zh}.ts。

import { messagesEn } from "./i18n/messages-en.js";
import { messagesZh } from "./i18n/messages-zh.js";
import type { Lang, Messages } from "./i18n/types.js";

export type { Lang, Messages };

const messages: Record<Lang, Messages> = { en: messagesEn, zh: messagesZh };
function detectLang(): Lang {
  const stored = localStorage.getItem("z-demo-lang") as Lang | null;
  if (stored === "en" || stored === "zh") return stored;
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

let currentLang: Lang = detectLang();

function getNested(obj: Messages, path: string): string {
  const parts = path.split(".");
  let val: unknown = obj;
  for (const p of parts) {
    if (val && typeof val === "object") {
      val = (val as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof val === "string" ? val : path;
}

export function t(key: string): string {
  return getNested(messages[currentLang], key);
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem("z-demo-lang", lang);
  updatePage();
}

/**
 * 组件内置文案的**出厂值**（第一次见到元素时记下）。
 *
 * 必须放在模块作用域：写进 `updatePage()` 里会每次新建 WeakMap，「切回中文」时先记下
 * 当前（英文）值再写回去，界面永远停在英文，且不报错。
 */
const copyDefaults = new WeakMap<Element, Record<string, string>>();

export function updatePage(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const spec = el.getAttribute("data-i18n-attr");
    if (!spec) return;
    const [attr, key] = spec.split(",");
    if (attr && key) {
      el.setAttribute(attr, t(key));
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) {
      el.innerHTML = t(key);
    }
  });

  // Update code toggle buttons text
  document.querySelectorAll(".js-code-toggle").forEach((btn) => {
    const codeBlock = (btn as HTMLElement).closest(".demo-preview")?.querySelector(".demo-preview__code");
    const visible = codeBlock?.classList.contains("demo-preview__code--visible");
    (btn as HTMLElement).textContent = visible ? t("button.hideCode") : t("button.showCode");
  });

  // i18n: 组件内置文案通过属性注入,属性变化触发组件 re-render,见 [[REQ-001]]
  // 注意:本库多词 attribute 约定为全小写(如 emptyText → emptytext)
  //
  // // 库的默认文案本身就是中文（src/core/copy.ts）。中文界面若在这里把同一批中文
  // 再写一遍，就等于维护**第二份中文**：库改一个用词，这里不知道，界面上会出现
  // 两种说法。所以这里在**首次见到元素时记下它的默认值**，切回中文时写回去。
  //
  // 实测过：库对「属性被移除」的语义是
  // `convertFromAttribute(null)` → 空串，**不是回到声明时的默认值**。
  // 于是切回中文后表格的空态变成空字符串（blank），而不是「暂无数据」。
  // 记下初值再写回，是唯一不改库语义的做法。
  const apply = (sel: string, attr: string, key: string): void => {
    const prop = key.split(".").pop() as string; // components.table.emptyText → emptyText
    document.querySelectorAll(sel).forEach((el) => {
      const rec = copyDefaults.get(el) ?? {};
      // 首次 updatePage 可能早于自定义元素升级
      // （组件的 property 访问器在 connectedCallback 里才装上），那一刻 `el[prop]`
      // 是 undefined。把 undefined 记下来，后面每次"恢复"都会写回 undefined ——
      // 界面上表现为**切到英文就再也切不回中文**，而任何断言都不会报错。
      // 所以：读得到才记；读不到就跳过（那时它本来还是默认值，不需要恢复）。
      if (!(prop in rec)) {
        const cur = (el as unknown as Record<string, string>)[prop];
        if (typeof cur === "string" && cur) rec[prop] = cur;
      }
      copyDefaults.set(el, rec);
      if (currentLang === "zh") {
        if (prop in rec) {
          // 属性是英文注入留下的痕迹，不删的话中文页面上仍挂着
          // `emptytext="No data"`（属性不影响渲染，但会误导读 DOM 的人，也可能命中选择器）。
          // 顺序不能反：removeAttribute 会触发 attributeChanged → 属性值被置空，
          // 所以必须先删、后写，否则写进去的中文会被这一步清掉。
          el.removeAttribute(attr);
          (el as unknown as Record<string, string>)[prop] = rec[prop];
        }
      } else {
        el.setAttribute(attr, t(key));
      }
    });
  };
  apply("z-pagination", "prevlabel", "components.pagination.prevLabel");
  apply("z-pagination", "nextlabel", "components.pagination.nextLabel");
  apply("z-input", "clearlabel", "components.input.clearLabel");
  apply("z-alert", "closelabel", "components.alert.closeLabel");
  apply("z-datepicker", "prevmonthlabel", "components.datepicker.prevMonthLabel");
  apply("z-datepicker", "nextmonthlabel", "components.datepicker.nextMonthLabel");
  apply("z-modal", "closelabel", "components.modal.closeLabel");
  apply("z-tag", "removelabel", "components.tag.removeLabel");
  apply("z-table", "loadingtext", "components.table.loadingText");
  apply("z-table", "emptytext", "components.table.emptyText");
  apply("z-report-table", "loadingtext", "components.table.loadingText");
  apply("z-report-table", "emptytext", "components.table.emptyText");
  // i18n: report-table tips 属性注入(多词 attribute 全小写), 见 [[REQ-001]]
  apply("z-report-table", "columnsettingstext", "components.reportTable.columnSettingsText");
  apply("z-report-table", "alignlefttext", "components.reportTable.alignLeftText");
  apply("z-report-table", "aligncentertext", "components.reportTable.alignCenterText");
  apply("z-report-table", "alignrighttext", "components.reportTable.alignRightText");
  apply("z-report-table", "pinnonetext", "components.reportTable.pinNoneText");
  apply("z-report-table", "pinlefttext", "components.reportTable.pinLeftText");
  apply("z-report-table", "pinrighttext", "components.reportTable.pinRightText");
  apply("z-report-table", "columnstext", "components.reportTable.columnsText");
  apply("z-report-table", "requiredcolumntext", "components.reportTable.requiredColumnText");
  apply("z-report-table", "reordercolumntext", "components.reportTable.reorderColumnText");

  // 操作列文案在 render 回调内(非属性), 语言切换后重设 columns 触发重渲染, 见 [[REQ-001]]
  const tableDemo = document.getElementById("table-demo") as any;
  if (tableDemo?.columns?.length) tableDemo.columns = [...tableDemo.columns];
}

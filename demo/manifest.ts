// demo 站的「事实来源」访问层：组件清单 + 包入口。数字、属性表、事件表一律从这里取。
// 数据来自 `registry/component-manifest.json`（生成器从源码产出）与 `package.json` 的 exports。

import rawManifest from "../registry/component-manifest.json";
import pkg from "../package.json";

export interface PropertyDef {
  name: string;
  attribute: string;
  aliases: string[];
  type: string;
  default: unknown;
  values: string[] | null;
}

export interface SlotDef {
  name: string;
  description?: string;
}

export interface ComponentDef {
  tag: string;
  source: string;
  layer: "foundation" | "base" | "composite" | "page";
  summary: string;
  events: (string | { name: string; description?: string })[];
  slots: (string | SlotDef)[];
  properties: PropertyDef[];
}

export interface ManifestStats {
  components: number;
  byLayer: Record<string, number>;
  properties: number;
  events: number;
  componentsWithEvents: number;
  componentsWithNamedSlots: number;
  propertiesWithValues: number;
  attributesOnly: number;
}

export const COMPONENTS = rawManifest.components as unknown as ComponentDef[];
export const STATS = rawManifest.stats as unknown as ManifestStats;
export const VERSION = (rawManifest as { version?: string }).version ?? "";

const index = new Map(COMPONENTS.map((c) => [c.tag, c]));

export function byTag(tag: string): ComponentDef | undefined {
  return index.get(tag);
}

/** 同一层里的组件（保持清单顺序，即源码扫描顺序）。 */
export function byLayer(layer: ComponentDef["layer"]): ComponentDef[] {
  return COMPONENTS.filter((c) => c.layer === layer);
}

/** 按源码目录取组件，如 `src/report/` —— 域页用它列出「这一域有哪些件」，不手抄。 */
export function bySourcePrefix(...prefixes: string[]): ComponentDef[] {
  return COMPONENTS.filter((c) => prefixes.some((p) => c.source.startsWith(p)));
}

/**
 * 移动端控件（`m-*`）。
 *
 * 它们和 PC 控件同在 `src/components/` 下，靠目录区分不了；
 * 而它们在清单里是独立的一批（触控目标 44px、安全区、无 hover 态）。
 * 这 20 个也都算 L1 —— 「移动端」是版面语言，不是层。
 */
export function mobileComponents(): ComponentDef[] {
  return COMPONENTS.filter((c) => c.tag.startsWith("m-"));
}

export function eventNames(c: ComponentDef): string[] {
  return c.events.map((e) => (typeof e === "string" ? e : e.name));
}

export function slotNames(c: ComponentDef): string[] {
  return c.slots.map((s) => (typeof s === "string" ? s : s.name));
}

/** 属性默认值：`false`/`0` 与「没写默认值」必须能区分开，否则表格会谎报。 */
export function formatDefault(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value === "" ? '""' : value;
  return String(value);
}

// ── 包入口 ──────────────────────────────────────────────────────
// 方案文档里写的「12 组入口」是估的；exports 实际是 30 条键、
// 归类后是 15 个组（14 个模块组 + 1 份 CSS）。数字以这里为准，不手写。

export interface ExportGroup {
  /** 组名，如 `components` / `report` / `（根）` */
  name: string;
  /** 该组下的全部键，如 `./components/*` */
  keys: string[];
  /** 给使用者抄的那一行 import */
  sample: string;
}

const ROOT_LABEL = "（根）";

function groupOf(key: string): string {
  if (key === ".") return ROOT_LABEL;
  if (key === "./z-agent-ui.css") return "z-agent-ui.css";
  const seg = key.replace(/^\.\//, "").split("/")[0];
  return seg;
}

export function exportGroups(): ExportGroup[] {
  const groups = new Map<string, string[]>();
  for (const key of Object.keys(pkg.exports as Record<string, unknown>)) {
    const g = groupOf(key);
    groups.set(g, [...(groups.get(g) ?? []), key]);
  }
  return [...groups.entries()].map(([name, keys]) => ({
    name,
    keys,
    sample: sampleImport(name),
  }));
}

function sampleImport(group: string): string {
  if (group === ROOT_LABEL) return `import { /* … */ } from "z-agent-ui";`;
  if (group === "z-agent-ui.css") return `import "z-agent-ui/z-agent-ui.css";`;
  return `import { /* … */ } from "z-agent-ui/${group}";`;
}

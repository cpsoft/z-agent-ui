/**
 * `<z-select>` 选择策略（无头状态机，零 DOM 依赖）。
 *
 * 将「单选 / 多选 / 多选暂存确认（commit-on-confirm）」三种模式从组件类中剥离为
 * 可替换的策略对象，消除宿主内 `multiple && commitOnConfirm` 的组合分支爆炸。
 */

export type SelectionMode = "single" | "multi" | "draft-multi";

export interface SelectChangeDetail {
  value: string;
  values?: string[];
}

export interface SelectPickResult {
  nextValue?: string;
  closeDropdown: boolean;
  rerenderList: boolean;
  changeDetail?: SelectChangeDetail;
}

export interface SelectMutationResult {
  nextValue: string;
  changeDetail: SelectChangeDetail;
}

export interface SelectionStrategy {
  readonly mode: SelectionMode;
  readonly isStaging: boolean;
  getCommittedValues(rawValue: string): string[];
  getActiveValues(rawValue: string): string[];
  isSelected(optionValue: string, rawValue: string): boolean;
  onOpen(rawValue: string): void;
  onClose(): void;
  pick(optionValue: string, rawValue: string): SelectPickResult;
  removeValue(value: string, rawValue: string): SelectMutationResult | null;
  clear(rawValue: string): SelectMutationResult | null;
  commit(rawValue: string): SelectMutationResult | null;
  resetDraft(): boolean;
  draftCount(): number;
}

/** 解析逗号分隔的多选值（空串返回 []）。 */
export function parseMultiValues(rawValue: string): string[] {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggleInList(list: string[], value: string): string[] {
  if (value === "") return [];
  const next = list.slice();
  const idx = next.indexOf(value);
  if (idx >= 0) next.splice(idx, 1);
  else next.push(value);
  return next;
}

export class SingleSelectionStrategy implements SelectionStrategy {
  readonly mode: SelectionMode = "single";
  readonly isStaging = false;

  getCommittedValues(): string[] {
    return [];
  }

  getActiveValues(): string[] {
    return [];
  }

  isSelected(optionValue: string, rawValue: string): boolean {
    return optionValue === rawValue;
  }

  onOpen(): void {}
  onClose(): void {}

  pick(optionValue: string, rawValue: string): SelectPickResult {
    if (rawValue === optionValue) {
      return { closeDropdown: true, rerenderList: false };
    }
    return {
      nextValue: optionValue,
      closeDropdown: true,
      rerenderList: false,
      changeDetail: { value: optionValue },
    };
  }

  removeValue(): SelectMutationResult | null {
    return null;
  }

  clear(rawValue: string): SelectMutationResult | null {
    if (!rawValue) return null;
    return { nextValue: "", changeDetail: { value: "" } };
  }

  commit(): SelectMutationResult | null {
    return null;
  }

  resetDraft(): boolean {
    return false;
  }

  draftCount(): number {
    return 0;
  }
}

export class MultiSelectionStrategy implements SelectionStrategy {
  readonly mode: SelectionMode = "multi";
  readonly isStaging = false;

  getCommittedValues(rawValue: string): string[] {
    return parseMultiValues(rawValue);
  }

  getActiveValues(rawValue: string): string[] {
    return parseMultiValues(rawValue);
  }

  isSelected(optionValue: string, rawValue: string): boolean {
    return parseMultiValues(rawValue).includes(optionValue);
  }

  onOpen(): void {}
  onClose(): void {}

  pick(optionValue: string, rawValue: string): SelectPickResult {
    const next = toggleInList(parseMultiValues(rawValue), optionValue);
    const joined = next.join(",");
    return {
      nextValue: joined,
      closeDropdown: false,
      rerenderList: true,
      changeDetail: { values: next.slice(), value: joined },
    };
  }

  removeValue(value: string, rawValue: string): SelectMutationResult | null {
    const prev = parseMultiValues(rawValue);
    const next = prev.filter((v) => v !== value);
    if (next.length === prev.length) return null;
    const joined = next.join(",");
    return { nextValue: joined, changeDetail: { values: next.slice(), value: joined } };
  }

  clear(rawValue: string): SelectMutationResult | null {
    if (!rawValue) return null;
    return { nextValue: "", changeDetail: { values: [], value: "" } };
  }

  commit(): SelectMutationResult | null {
    return null;
  }

  resetDraft(): boolean {
    return false;
  }

  draftCount(): number {
    return 0;
  }
}

export class DraftMultiSelectionStrategy implements SelectionStrategy {
  readonly mode: SelectionMode = "draft-multi";
  readonly isStaging = true;
  private _draft: string[] | null = null;

  getCommittedValues(rawValue: string): string[] {
    return parseMultiValues(rawValue);
  }

  getActiveValues(rawValue: string): string[] {
    return this._draft ?? parseMultiValues(rawValue);
  }

  isSelected(optionValue: string, rawValue: string): boolean {
    return this.getActiveValues(rawValue).includes(optionValue);
  }

  onOpen(rawValue: string): void {
    this._draft = parseMultiValues(rawValue);
  }

  onClose(): void {
    this._draft = null;
  }

  pick(optionValue: string, rawValue: string): SelectPickResult {
    const base = this._draft ?? parseMultiValues(rawValue);
    this._draft = toggleInList(base, optionValue);
    return { closeDropdown: false, rerenderList: true };
  }

  removeValue(value: string, rawValue: string): SelectMutationResult | null {
    const prev = parseMultiValues(rawValue);
    const next = prev.filter((v) => v !== value);
    if (next.length === prev.length) return null;
    this._draft = next.slice();
    const joined = next.join(",");
    return { nextValue: joined, changeDetail: { values: next.slice(), value: joined } };
  }

  clear(rawValue: string): SelectMutationResult | null {
    if (!rawValue) return null;
    this._draft = [];
    return { nextValue: "", changeDetail: { values: [], value: "" } };
  }

  commit(rawValue: string): SelectMutationResult | null {
    const next = (this._draft ?? []).slice();
    const joined = next.join(",");
    if (joined === rawValue) return null;
    return { nextValue: joined, changeDetail: { values: next.slice(), value: joined } };
  }

  resetDraft(): boolean {
    if (!this._draft?.length) return false;
    this._draft = [];
    return true;
  }

  draftCount(): number {
    return (this._draft ?? []).length;
  }
}

/** 按开关解析对应策略；若当前策略模式未变则直接复用以保留草稿态。 */
export function resolveSelectionStrategy(
  multiple: boolean,
  commitOnConfirm: boolean,
  current?: SelectionStrategy,
): SelectionStrategy {
  const mode: SelectionMode = multiple ? (commitOnConfirm ? "draft-multi" : "multi") : "single";
  if (current && current.mode === mode) return current;
  if (mode === "draft-multi") return new DraftMultiSelectionStrategy();
  if (mode === "multi") return new MultiSelectionStrategy();
  return new SingleSelectionStrategy();
}

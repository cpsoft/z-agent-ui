// <z-select> 下拉选择：searchable 带搜索、multiple 多选、clearable 清空，开、合、变更、搜索各发事件。
// [组合架构] 元素壳只保留属性契约与交互编排；浮层托管给 FloatingPanelController、
// 搜索/防抖/子节点观察托管给 OptionSearchController、单/多/暂存选择委托给 SelectionStrategy、
// HTML 投影委托给 select-render.ts。
import { DROPDOWN_CSS } from "./dropdown-css.js";
import {
  BaseElement,
  html,
  property,
  t,
  injectGlobalStyles,
  controlHeight,
  type ControlSize,
  defineElement,
} from "../../core/index.js";
import { FloatingPanelController, FocusTrap, listIntent, resolveIndex } from "../../primitives/index.js";
import type { ZOption } from "../option/Option.js";
import {
  OptionSearchController,
  type RemoteSearchMethod,
  type ZSelectOptionSpec,
  type ZSelectSearchMode,
} from "./option-search.js";
import {
  resolveSelectionStrategy,
  type SelectionStrategy,
} from "./selection-strategy.js";
import {
  buildSelectDropdownShell,
  buildSelectOptionsHTML,
  renderSelectTrigger,
} from "./select-render.js";
import selectCSS from "./select.css?raw";

export type { ZSelectOptionSpec, ZSelectSearchMode } from "./option-search.js";

const DEFAULT_PLACEHOLDER = "Select...";
let SELECT_SEQ = 0;

function injectDropdownStyles(): void {
  injectGlobalStyles("z-select", DROPDOWN_CSS);
}

export class ZSelect extends BaseElement {
  static styles = selectCSS;

  @property({ type: String }) size: ControlSize = "sm";
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = DEFAULT_PLACEHOLDER;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) invalid = false;
  @property({ type: Boolean }) open = false;
  @property({ type: String }) name = "";
  @property({ type: Boolean }) searchable = false;
  @property({ type: String, attribute: "search-mode" }) searchMode: ZSelectSearchMode = "frontend";
  @property({ type: String, attribute: "search-placeholder" }) searchPlaceholder = "Search...";
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean }) clearable = false;
  @property({ type: Boolean, attribute: "commit-on-confirm" }) commitOnConfirm = false;
  @property({ type: Number, attribute: "max-tags" }) maxTags = 2;
  remoteMethod: RemoteSearchMethod | null = null;

  private _floating = this.addController(new FloatingPanelController(this));
  private _search = this.addController(new OptionSearchController());
  private _strategy: SelectionStrategy = resolveSelectionStrategy(false, false);
  private _focusTrap: FocusTrap | null = null;
  private _activeIndex = -1;
  private _uid = `z-select-${++SELECT_SEQ}`;

  protected willUpdate(): void {
    this.style.setProperty("--_h", controlHeight(this.size));
    this._syncStrategy();
  }

  render(): string {
    const strategy = this._syncStrategy();
    const selectedOption = this._getSelectedOption();
    return renderSelectTrigger({
      open: this.open,
      disabled: this.disabled,
      invalid: this.invalid,
      multiple: this.multiple,
      clearable: this.clearable,
      maxTags: this.maxTags,
      placeholder: this.placeholder,
      authoredPlaceholder: this._authoredPlaceholder(),
      emptyLabel: this._optionByValue("")?.label ?? "",
      selectedOption,
      selectedValues: strategy.getCommittedValues(this.value),
      labelOf: (v) => this._optionByValue(v)?.label ?? v,
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.listen(this, "click", this._onTriggerClick);
    this.listen(this, "keydown", this._onTriggerKey);
  }

  disconnectedCallback(): void {
    this._closeDropdown();
    super.disconnectedCallback();
  }

  updated(): void {
    if (this._floating.panel) this._renderOptionList();
  }

  private _syncStrategy(): SelectionStrategy {
    this._strategy = resolveSelectionStrategy(this.multiple, this.commitOnConfirm, this._strategy);
    return this._strategy;
  }

  private _getOptions(): ZOption[] {
    return Array.from(this.querySelectorAll<ZOption>("z-option"));
  }

  private _getSelectedOption(): ZOption | undefined {
    if (!this.value) return undefined;
    return this._getOptions().find((o) => o.value === this.value && !o.disabled);
  }

  private _optionByValue(v: string): ZOption | undefined {
    return this._getOptions().find((o) => o.value === v);
  }

  private _authoredPlaceholder(): string {
    return this.placeholder === DEFAULT_PLACEHOLDER ? "" : this.placeholder;
  }

  private _getFilteredOptions(): ZOption[] {
    return this._search.filter(this._getOptions(), this.searchable);
  }

  private _onTriggerClick = (e: Event): void => {
    if (this.disabled) return;
    const origin = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
    const tagX = origin?.closest?.(".z-select__tag-x") as HTMLElement | null;
    if (tagX) {
      this._removeValue(tagX.getAttribute("data-value") ?? "");
      return;
    }
    if (origin?.closest?.(".z-select__clear")) {
      this._clearValue();
      return;
    }
    this.open ? this._closeDropdown() : this._openDropdown();
  };

  private _removeValue(value: string): void {
    const res = this._syncStrategy().removeValue(value, this.value);
    if (!res) return;
    this.value = res.nextValue;
    if (this.open) this._renderOptionList();
    this.emit("z-change", res.changeDetail);
  }

  private _clearValue(): void {
    const res = this._syncStrategy().clear(this.value);
    if (!res) return;
    this.value = res.nextValue;
    if (this.open) this._renderOptionList();
    this.emit("z-change", res.changeDetail);
  }

  private _onTriggerKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key === "ArrowDown" || ke.key === "ArrowUp") {
      e.preventDefault();
      if (!this.open) this._openDropdown();
      else if (this._floating.panel) this._onDropdownKey(ke as Event);
    } else if (ke.key === "Enter" && this.open) {
      e.preventDefault();
      this._onDropdownKey(ke as Event);
    } else if (ke.key === "Escape") {
      e.stopPropagation();
      this._closeDropdown();
    } else if (ke.key === "Delete" && !this.open) {
      if (this.multiple || !this.clearable || !this.value) return;
      e.preventDefault();
      this._clearValue();
    } else if (ke.key === "Backspace" && this.multiple && !this.open) {
      const values = this._syncStrategy().getCommittedValues(this.value);
      if (!values.length) return;
      e.preventDefault();
      this._removeValue(values[values.length - 1]);
    }
  };

  private _openDropdown(): void {
    if (this.open) return;
    const strategy = this._syncStrategy();

    injectDropdownStyles();
    this._search.reset();
    this.loading = false;

    const trigger = this.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;
    const dd = this._floating.open(
      {
        panelClass: "z-select__dropdown",
        hidingClass: "z-select__dropdown--hiding",
        part: "dropdown",
        role: null,
        tabIndex: false,
        anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-select__trigger"),
        onOutsideClose: () => this._closeDropdown(),
      },
      (panel) => {
        panel.innerHTML = buildSelectDropdownShell({
          uid: this._uid,
          searchable: this.searchable,
          searchPlaceholder: this.searchPlaceholder,
          staging: strategy.isStaging,
          listName: this._authoredPlaceholder() || this.placeholder,
        });
      },
    );

    dd.addEventListener("click", (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
      if (act) {
        if (act.dataset.act === "confirm") this._commitDraft();
        else if (act.dataset.act === "reset") this._resetDraft();
        return;
      }
      const opt = (e.target as HTMLElement).closest<HTMLElement>(".z-select__option");
      if (!opt) return;
      const val = opt.dataset.value;
      if (val !== undefined && !opt.classList.contains("z-select__option--disabled")) {
        this._selectOption(val);
      }
    });

    dd.addEventListener("mouseover", (e) => {
      const opt = (e.target as HTMLElement).closest<HTMLElement>(".z-select__option");
      if (opt) this._setActiveByElement(opt);
    });

    dd.querySelector(".z-select__search")?.addEventListener("input", this._onSearchInput);

    const triggerRect = trigger.getBoundingClientRect();
    dd.style.minWidth = `${strategy.isStaging ? Math.max(triggerRect.width, 240) : triggerRect.width}px`;

    this._focusTrap = new FocusTrap({ container: dd });

    this.open = true;
    strategy.onOpen(this.value);
    this._activeIndex = this._getOptions().findIndex((o) => o.value === this.value && !o.disabled);
    this._renderOptionList();
    this._floating.reposition();
    this._search.observeHost(this, () => {
      if (this.open) this._renderOptionList();
    });

    dd.addEventListener("keydown", this._onDropdownKey);

    if (!this.searchable) {
      this._floating.panel?.querySelector<HTMLElement>(".z-select__options")?.focus();
      this._updateActive();
    }

    this.emit("z-select-open");
  }

  private _closeDropdown(): void {
    if (!this.open) return;

    this._search.clearTimer();
    this._search.stopObserving();
    this._focusTrap?.destroy();
    this._focusTrap = null;
    this._floating.panel?.removeEventListener("keydown", this._onDropdownKey);
    this._floating.close();

    this.open = false;
    this._activeIndex = -1;
    this._strategy.onClose();

    const trigger = this.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;
    trigger?.focus();

    this.emit("z-select-close");
  }

  private _selectOption(value: string): void {
    const res = this._syncStrategy().pick(value, this.value);
    if (res.nextValue !== undefined) this.value = res.nextValue;
    if (res.closeDropdown) this._closeDropdown();
    if (res.rerenderList) this._renderOptionList();
    if (res.changeDetail) this.emit("z-change", res.changeDetail);
  }

  private _commitDraft(): void {
    const res = this._syncStrategy().commit(this.value);
    this._closeDropdown();
    if (!res) return;
    this.value = res.nextValue;
    this.emit("z-change", res.changeDetail);
  }

  private _resetDraft(): void {
    if (this._syncStrategy().resetDraft()) {
      this._renderOptionList();
    }
  }

  private _updateFooter(): void {
    const panel = this._floating.panel;
    if (!panel) return;
    const count = panel.querySelector<HTMLElement>(".z-select__count");
    if (!count) return;
    const n = this._syncStrategy().draftCount();
    count.textContent = n > 0 ? t("selectedCount", { count: n }) : t("noneSelected");
    const reset = panel.querySelector<HTMLButtonElement>('[data-act="reset"]');
    if (reset) reset.disabled = n === 0;
  }

  private _onSearchInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this._search.handleInput(input.value, {
      searchMode: this.searchMode,
      remoteMethod: this.remoteMethod,
      isOpen: () => this.open,
      setLoading: (loading) => {
        this.loading = loading;
      },
      applySpecs: (specs) => this._applyRemoteOptions(specs),
      onLocalFilter: () => this._renderOptionList(),
      onSearchEmit: (query) => {
        this.emit("z-search", { query });
      },
    });
  };

  private _applyRemoteOptions(specs: ZSelectOptionSpec[]): void {
    this._getOptions().forEach((o) => o.remove());
    for (const spec of specs) {
      const opt = document.createElement("z-option") as ZOption;
      opt.value = spec.value;
      opt.textContent = spec.label;
      if (spec.disabled) opt.disabled = true;
      this.appendChild(opt);
    }
    this._renderOptionList();
  }

  private _renderOptionList(): void {
    if (!this._floating.panel) return;
    const container = this._floating.panel.querySelector<HTMLElement>(".z-select__options");
    if (!container) return;

    if (this.loading) {
      container.innerHTML = html`<div class="z-select__loading" part="loading">Loading...</div>`;
      this._activeIndex = -1;
      this._updateFooter();
      return;
    }

    const options = this._getFilteredOptions();
    container.innerHTML = this._buildOptionsHTML(options);
    this._updateFooter();

    if (options.length === 0) {
      this._activeIndex = -1;
      return;
    }
    if (
      this._activeIndex < 0 ||
      this._activeIndex >= options.length ||
      options[this._activeIndex].disabled
    ) {
      this._activeIndex = options.findIndex((o) => !o.disabled);
    }
    this._updateActive();
  }

  private _buildOptionsHTML(options: ZOption[]): string {
    const strategy = this._syncStrategy();
    return buildSelectOptionsHTML({
      uid: this._uid,
      options,
      multiple: this.multiple,
      searchable: this.searchable,
      query: this._search.query,
      activeIndex: this._activeIndex,
      isSelected: (v) => strategy.isSelected(v, this.value),
    });
  }

  private _setActiveByElement(el: HTMLElement): void {
    const items = this._floating.panel?.querySelectorAll<HTMLElement>(".z-select__option");
    if (!items) return;
    const idx = Array.from(items).indexOf(el);
    if (idx >= 0) {
      this._activeIndex = idx;
      this._updateActive();
    }
  }

  private _focusOwner(): HTMLElement | null {
    const panel = this._floating.panel;
    if (!panel) return null;
    return this.searchable
      ? panel.querySelector<HTMLElement>(".z-select__search")
      : panel.querySelector<HTMLElement>(".z-select__options");
  }

  private _updateActive(): void {
    if (!this._floating.panel) return;
    const items = this._floating.panel.querySelectorAll<HTMLElement>(".z-select__option");
    items.forEach((item, i) => {
      item.classList.toggle("z-select__option--active", i === this._activeIndex);
    });
    const owner = this._focusOwner();
    const active = items[this._activeIndex];
    if (owner) {
      if (active?.id) owner.setAttribute("aria-activedescendant", active.id);
      else owner.removeAttribute("aria-activedescendant");
    }
    active?.scrollIntoView({ block: "nearest" });
  }

  private _onDropdownKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const options = this._getFilteredOptions();
    const intent = listIntent(ke.key);
    if (intent) {
      e.preventDefault();
      const idx = resolveIndex(options.length, this._activeIndex, intent, {
        isDisabled: (i) => options[i].disabled,
      });
      if (idx >= 0) {
        this._activeIndex = idx;
        this._updateActive();
      }
      return;
    }

    switch (ke.key) {
      case "Enter": {
        e.preventDefault();
        const active = options[this._activeIndex];
        if (active && !active.disabled) this._selectOption(active.value);
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        this._closeDropdown();
        break;
      case "Tab":
        if (!this._syncStrategy().isStaging) this._closeDropdown();
        break;
    }
  };
}

defineElement("z-select", ZSelect);

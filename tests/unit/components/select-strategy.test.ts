import { describe, expect, it } from "vitest";
import {
  DraftMultiSelectionStrategy,
  MultiSelectionStrategy,
  SingleSelectionStrategy,
  parseMultiValues,
  resolveSelectionStrategy,
} from "../../../src/components/select/selection-strategy.js";

describe("Select SelectionStrategy 组合策略", () => {
  it("parseMultiValues 正确拆分逗号串并过滤空白", () => {
    expect(parseMultiValues("")).toEqual([]);
    expect(parseMultiValues("a, b , ,c")).toEqual(["a", "b", "c"]);
  });

  it("SingleSelectionStrategy: 选新值关闭并发事件，重选同值只关闭不发事件", () => {
    const s = new SingleSelectionStrategy();
    expect(s.isStaging).toBe(false);
    expect(s.isSelected("a", "a")).toBe(true);
    expect(s.pick("a", "a")).toEqual({ closeDropdown: true, rerenderList: false });
    expect(s.pick("b", "a")).toEqual({
      nextValue: "b",
      closeDropdown: true,
      rerenderList: false,
      changeDetail: { value: "b" },
    });
    expect(s.clear("")).toBeNull();
    expect(s.clear("b")).toEqual({ nextValue: "", changeDetail: { value: "" } });
  });

  it("MultiSelectionStrategy: 勾选切换不关面板，空值选项清空全部，removeValue 精准移除", () => {
    const s = new MultiSelectionStrategy();
    expect(s.pick("a", "")).toEqual({
      nextValue: "a",
      closeDropdown: false,
      rerenderList: true,
      changeDetail: { values: ["a"], value: "a" },
    });
    expect(s.pick("b", "a")).toEqual({
      nextValue: "a,b",
      closeDropdown: false,
      rerenderList: true,
      changeDetail: { values: ["a", "b"], value: "a,b" },
    });
    expect(s.pick("", "a,b")).toEqual({
      nextValue: "",
      closeDropdown: false,
      rerenderList: true,
      changeDetail: { values: [], value: "" },
    });
    expect(s.removeValue("a", "a,b")).toEqual({
      nextValue: "b",
      changeDetail: { values: ["b"], value: "b" },
    });
    expect(s.removeValue("x", "a,b")).toBeNull();
  });

  it("DraftMultiSelectionStrategy: 勾选只改草稿不发事件，commit 提交差异，onClose 丢弃草稿", () => {
    const s = new DraftMultiSelectionStrategy();
    expect(s.isStaging).toBe(true);
    s.onOpen("a");
    expect(s.draftCount()).toBe(1);

    const pickRes = s.pick("b", "a");
    expect(pickRes).toEqual({ closeDropdown: false, rerenderList: true });
    expect(s.isSelected("b", "a")).toBe(true);
    expect(s.draftCount()).toBe(2);

    expect(s.commit("a")).toEqual({
      nextValue: "a,b",
      changeDetail: { values: ["a", "b"], value: "a,b" },
    });
    // 无变化提交返回 null
    expect(s.commit("a,b")).toBeNull();

    expect(s.resetDraft()).toBe(true);
    expect(s.draftCount()).toBe(0);
    expect(s.resetDraft()).toBe(false);

    s.onClose();
    expect(s.draftCount()).toBe(0);
  });

  it("resolveSelectionStrategy 在模式不变时复用实例，模式切换时创建新策略", () => {
    const s1 = resolveSelectionStrategy(false, false);
    expect(s1.mode).toBe("single");
    expect(resolveSelectionStrategy(false, false, s1)).toBe(s1);

    const s2 = resolveSelectionStrategy(true, true, s1);
    expect(s2.mode).toBe("draft-multi");
    expect(resolveSelectionStrategy(true, true, s2)).toBe(s2);

    const s3 = resolveSelectionStrategy(true, false, s2);
    expect(s3.mode).toBe("multi");
  });
});

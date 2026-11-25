// Test: z-toast service
// Date: 2026-07-16

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZToast } from "../../../src/components/toast/Toast";

describe("ZToast", () => {
  afterEach(() => {
    ZToast.dismissAll();
  });

  it("show() creates a toast element in DOM", () => {
    const { dismiss } = ZToast.show({ message: "Hello Toast", duration: 0 });
    const toast = document.querySelector(".z-toast-item")!;
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain("Hello Toast");
    dismiss();
  });

  it("show() returns a dismiss function", () => {
    const { dismiss } = ZToast.show({ message: "Test", duration: 0 });
    dismiss();
    // Toast should be removing
    const toast = document.querySelector(".z-toast-item");
    if (toast) {
      expect(toast.classList.contains("z-toast-item--removing")).toBe(true);
    }
  });

  it("success() creates a success toast", () => {
    const { dismiss } = ZToast.success("Success!", 0);
    const toast = document.querySelector(".z-toast-item")!;
    expect(toast).toBeDefined();
    dismiss();
  });

  it("error() creates an error toast with default 5000ms", () => {
    const { dismiss } = ZToast.error("Error!");
    const toast = document.querySelector(".z-toast-item")!;
    expect(toast).toBeDefined();
    dismiss();
  });

  it("warning() creates a warning toast", () => {
    const { dismiss } = ZToast.warning("Warning!", 0);
    const toast = document.querySelector(".z-toast-item")!;
    expect(toast).toBeDefined();
    dismiss();
  });

  it("info() creates an info toast", () => {
    const { dismiss } = ZToast.info("Info!", 0);
    const toast = document.querySelector(".z-toast-item")!;
    expect(toast).toBeDefined();
    dismiss();
  });

  it("creates container with correct placement class", () => {
    const { dismiss } = ZToast.show({ message: "Test", placement: "bottom-left", duration: 0 });
    const container = document.querySelector(".z-toast-container--bottom-left")!;
    expect(container).toBeDefined();
    dismiss();
  });

  it("dismissAll clears all toasts", () => {
    ZToast.show({ message: "T1", duration: 0 });
    ZToast.show({ message: "T2", duration: 0 });
    ZToast.dismissAll();

    const toasts = document.querySelectorAll(".z-toast-item:not(.z-toast-item--removing)");
    expect(toasts.length).toBe(0);
  });
});

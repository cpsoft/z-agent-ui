// Test: z-upload 文件上传（选择/拖拽/XHR 进度/状态管理）
// Related: [[2026-08-11-W14-form]]
// Wiki: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "../../../src/components/upload/Upload.js";

// [WHY] happy-dom 无 XHR 进度事件 → FakeXHR mock（chart 测试 mock ResizeObserver 先例）
class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: { onprogress: ((e: any) => void) | null } = { onprogress: null };
  onload: ((this: FakeXHR) => void) | null = null;
  onerror: ((this: FakeXHR) => void) | null = null;
  status = 200;
  responseText = "";
  opened: [string, string] | null = null;
  sent: FormData | null = null;
  aborted = false;
  open(method: string, url: string): void {
    this.opened = [method, url];
  }
  setRequestHeader(): void {}
  send(fd: FormData): void {
    this.sent = fd;
    FakeXHR.instances.push(this);
  }
  abort(): void {
    this.aborted = true;
  }
}

function makeFile(name = "a.txt", size = 5): File {
  return new File([new Uint8Array(size)], name, { type: "text/plain" });
}

function createUpload(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-upload") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function pick(el: any, file: File): void {
  const input = el.shadowRoot.querySelector(".z-upload__input") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function drop(el: any, file: File): void {
  const dz = el.shadowRoot.querySelector(".z-upload__dropzone");
  const ev = new Event("drop", { bubbles: true, composed: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files: [file] } });
  dz.dispatchEvent(ev);
}

// [WHY] 每个用例都 stub 掉 XMLHttpRequest，而不是只给「要验 XHR 的用例」stub：
// 没 stub 的用例会真的发 XHR 到 happy-dom 默认 origin（http://localhost:3000/upload），
// 于是 50 条 ECONNREFUSED 以 AggregateError 的形式糊在测试输出里；
// 更糟的是「不该发请求」这类断言在真 XHR 下必然恒真（instances 只有在 stub 之后才有值），
// 等于把「没上传」验成了一句空话。stub 之后它们才真的在数请求。
beforeEach(() => {
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  FakeXHR.instances = [];
});

describe("z-upload", () => {
  it("renders dropzone, hidden input and empty list", async () => {
    const el = createUpload({ accept: "image/*", multiple: "" });
    await flush();
    const input = el.shadowRoot.querySelector(".z-upload__input");
    expect(input).toBeTruthy();
    expect(input.getAttribute("accept")).toBe("image/*");
    expect(input.hasAttribute("multiple")).toBe(true);
    expect(el.shadowRoot.querySelector(".z-upload__list").children.length).toBe(0);
    document.body.removeChild(el);
  });

  it("selecting file adds to list and emits z-change", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    pick(el, makeFile("report.pdf", 10));
    expect(el.files.length).toBe(1);
    expect(el.files[0].name).toBe("report.pdf");
    expect(el.shadowRoot.querySelectorAll(".z-upload__item").length).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.files.length).toBe(1);
    document.body.removeChild(el);
  });

  it("auto uploads via XHR with form data", async () => {
    const el = createUpload({ action: "/api/upload", method: "PUT", name: "doc" });
    await flush();
    pick(el, makeFile("a.txt"));
    expect(FakeXHR.instances.length).toBe(1);
    const xhr = FakeXHR.instances[0];
    expect(xhr.opened).toEqual(["PUT", "/api/upload"]);
    expect(xhr.sent!.get("doc")).toBeInstanceOf(File);
    expect(el.files[0].status).toBe("uploading");
    document.body.removeChild(el);
  });

  it("reports progress via z-progress", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-progress", handler);
    pick(el, makeFile());
    const xhr = FakeXHR.instances[0];
    xhr.upload.onprogress!({ lengthComputable: true, loaded: 5, total: 10 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.progress).toBe(50);
    expect(el.files[0].progress).toBe(50);
    document.body.removeChild(el);
  });

  it("marks success and emits z-success with url", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-success", handler);
    pick(el, makeFile());
    const xhr = FakeXHR.instances[0];
    xhr.status = 201;
    xhr.responseText = "http://cdn/x/a.txt";
    xhr.onload!();
    expect(el.files[0].status).toBe("success");
    expect(el.files[0].url).toBe("http://cdn/x/a.txt");
    expect(handler.mock.calls[0][0].detail.url).toBe("http://cdn/x/a.txt");
    expect(el.shadowRoot.querySelector(".z-upload__item--success")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("marks error on http failure and emits z-error", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-error", handler);
    pick(el, makeFile());
    const xhr = FakeXHR.instances[0];
    xhr.status = 500;
    xhr.onload!();
    expect(el.files[0].status).toBe("error");
    expect(el.files[0].error).toContain("500");
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("marks error on network failure", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    pick(el, makeFile());
    const xhr = FakeXHR.instances[0];
    xhr.onerror!();
    expect(el.files[0].status).toBe("error");
    expect(el.files[0].error).toBe("Network error");
    document.body.removeChild(el);
  });

  it("rejects file over max-size with inline error", async () => {
    const el = createUpload({ action: "/upload", "max-size": "10" });
    await flush();
    pick(el, makeFile("big.bin", 100));
    expect(el.files[0].status).toBe("error");
    expect(el.files[0].error).toContain("max size");
    expect(FakeXHR.instances.length).toBe(0); // 不上传
    document.body.removeChild(el);
  });

  it("no action keeps files local without uploading", async () => {
    const el = createUpload();
    await flush();
    pick(el, makeFile());
    expect(el.files[0].status).toBe("idle");
    expect(FakeXHR.instances.length).toBe(0);
    el.upload();
    expect(FakeXHR.instances.length).toBe(0);
    document.body.removeChild(el);
  });

  it("removeFile(id) emits z-remove and aborts upload", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-remove", handler);
    pick(el, makeFile());
    const id = el.files[0].id;
    el.removeFile(id);
    expect(el.files.length).toBe(0);
    expect(handler.mock.calls[0][0].detail.id).toBe(id);
    expect(FakeXHR.instances[0].aborted).toBe(true);
    document.body.removeChild(el);
  });

  it("clear() empties list", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    pick(el, makeFile());
    pick(el, makeFile("b.txt"));
    el.clear();
    expect(el.files.length).toBe(0);
    expect(el.shadowRoot.querySelectorAll(".z-upload__item").length).toBe(0);
    document.body.removeChild(el);
  });

  it("abort() resets uploading files to idle", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    pick(el, makeFile());
    el.abort();
    expect(el.files[0].status).toBe("idle");
    expect(FakeXHR.instances[0].aborted).toBe(true);
    document.body.removeChild(el);
  });

  it("drag drop adds files", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    drop(el, makeFile("dropped.txt"));
    expect(el.files.length).toBe(1);
    expect(el.files[0].name).toBe("dropped.txt");
    document.body.removeChild(el);
  });

  it("disabled blocks drop and pick", async () => {
    const el = createUpload({ action: "/upload", disabled: "" });
    await flush();
    drop(el, makeFile("x.txt"));
    expect(el.files.length).toBe(0);
    document.body.removeChild(el);
  });

  it("list remove button click removes item", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    pick(el, makeFile("a.txt"));
    const btn = el.shadowRoot.querySelector(".z-upload__remove");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.files.length).toBe(0);
    document.body.removeChild(el);
  });

  it("re-picking same file works (input value reset)", async () => {
    const el = createUpload({ action: "/upload" });
    await flush();
    pick(el, makeFile("a.txt"));
    pick(el, makeFile("a.txt"));
    expect(el.files.length).toBe(2);
    const input = el.shadowRoot.querySelector(".z-upload__input") as HTMLInputElement;
    expect(input.value).toBe("");
    document.body.removeChild(el);
  });
});

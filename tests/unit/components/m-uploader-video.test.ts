// Test: m-uploader 的视频口径（缩略图、录制入口、大小拦截、不压缩）
// Related: [[req-20261120-h5-photo]]（2026-11-20 同一波）
// Wiki: wiki/log.md（2026-11-20 视频上传）
// Date: 2026-11-20
//
// [WHY 视频要单独钉] 三处都是「界面正常、结果不对」：
//   ① 视频缩略图用 `<img>` 渲染 → 浏览器不报错，只是一格空白（用户以为没选上）；
//   ② `max-edge` 对视频也生效 → 走 canvas 解一帧都没有的容器，耗时几秒后**静默失败**；
//   ③ 超网关上限的视频交给后端 → 413，而受控列表里那条永远不会变缩略图。
// 所以判据落在「渲染成什么元素」「上报的 File 是谁」「有没有 reject」三件事上。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-uploader/MUploader";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}, attrs: Record<string, string> = {}): any {
  const el = document.createElement("m-uploader") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

function video(size = 100): File {
  return new File(["v".repeat(size)], "clip.mp4", { type: "video/mp4" });
}

async function pick(el: any, files: File[], source: "camera" | "album" = "album"): Promise<void> {
  const input = el.shadowRoot.querySelector(`input[data-src="${source}"]`) as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}

describe("m-uploader 视频", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("accept=video/* 时拍摄入口叫「录像」而不是「拍照」", async () => {
    el = mount({ accept: "video/*", capture: "environment" });
    await flush();
    const shot = el.shadowRoot.querySelector("[data-act='shot']");
    expect(shot.textContent.trim()).toBe("录像");
  });

  it("accept=image/* 仍是「拍照」；混合（图+视频）也按照片走", async () => {
    el = mount({ accept: "image/*", capture: "environment" });
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='shot']").textContent.trim()).toBe("拍照");
    el.capture = "environment";
    el.accept = "image/*,video/*";
    await flush();
    // 混合时原生单会弹「拍照/录像/相册」，一次点击直入只能选一种
    expect(el.shadowRoot.querySelector("[data-act='shot']").textContent.trim()).toBe("拍照");
  });

  it("视频缩略图渲染成 <video> + 播放角标，不是空白 <img>", async () => {
    el = mount({ accept: "video/*" });
    await flush();
    el.files = [{ name: "巡检.mp4", url: "blob:v1", type: "video" }];
    await flush();
    expect(el.shadowRoot.querySelector(".m-uploader__video")).not.toBeNull();
    expect(el.shadowRoot.querySelector(".m-uploader__img")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-uploader__play")).not.toBeNull();
  });

  it("没写 type 的条目仍按图片渲染（老调用方的形态不变）", async () => {
    el = mount({ max: 3 });
    await flush();
    el.files = [{ name: "a.png", url: "blob:a" }];
    await flush();
    expect(el.shadowRoot.querySelector(".m-uploader__img")).not.toBeNull();
    expect(el.shadowRoot.querySelector(".m-uploader__video")).toBeNull();
  });

  it("超过 max-size 的视频发 z-reject，且不进 z-select", async () => {
    el = mount({ accept: "video/*", maxSize: 50 });
    await flush();
    const rejected = collect(el, "z-reject");
    const selected = collect(el, "z-select");
    await pick(el, [video(200)]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBe("size");
    expect(rejected[0].limit).toBe(50);
    expect(selected).toHaveLength(0);
  });

  it("混选时只拦超限那个，合规的照常上报", async () => {
    el = mount({ accept: "video/*", maxSize: 50, multiple: true });
    await flush();
    const rejected = collect(el, "z-reject");
    const selected = collect(el, "z-select");
    const ok = new File(["small"], "ok.mp4", { type: "video/mp4" });
    await pick(el, [video(200), ok]);
    expect(rejected[0].files).toHaveLength(1);
    expect(selected[0].files).toEqual([ok]);
  });

  it("max-edge 对视频不生效：上报的就是同一个 File（浏览器端转码不可靠）", async () => {
    el = mount({ accept: "video/*", maxEdge: 1600 });
    await flush();
    const selected = collect(el, "z-select");
    const clip = video(300);
    await pick(el, [clip]);
    expect(selected[0].files[0]).toBe(clip);
  });

  it("视频能选到：两个 input 的 accept 都跟着属性走", async () => {
    el = mount({ accept: "video/*", capture: "environment" });
    await flush();
    expect(el.shadowRoot.querySelector("input[data-src='album']").getAttribute("accept")).toBe("video/*");
    expect(el.shadowRoot.querySelector("input[data-src='camera']").getAttribute("accept")).toBe("video/*");
  });
});

// <m-uploader> 上传列表：files 展示已选文件，accept / max 限类型与数量，选择与删除各发事件。
// [WHY] 图片上传（移动端）：宫格 + 缩略图 + 删除。
//
// [WHY 不内置 XHR] 与 z-upload 的取舍不同：H5 的上传通常要先压缩（手机照片 5~10MB）、
// 再带业务 token 走统一网关。组件内置一套 XHR 必然与宿主的网关规则冲突，
// 于是它只上报「用户选了哪些文件」，上传由宿主决定（与 ADR-004 一致）。
// 代价是宿主多写几行；收益是压缩、重试、鉴权只有一处实现。
//
// [2026-11-20 拍摄] 加了 `capture`：手机端要的是「点一下开相机拍」，而不是「点一下先
// 选来源」。原生 input 的 `capture` 属性就能做到，但它一旦写上，相册那条路就没了 ——
// 所以开着 capture 时出**两个**入口：拍照 / 相册，各自一个隐藏 input。两个入口上报的
// 仍是同一个 `z-select`，多了 `source`（`camera` / `album`）让宿主能区分。
//
// [2026-11-20 压缩] `max-edge`（长边上限 px）在**上报前**把照片缩到可直传的大小，
// 见 `photo-compress.ts`。缺省 0 = 不碰文件。压缩不改变「受控」语义：文件仍由宿主收。
//
// [2026-11-20 视频] 视频与照片共用同一套入口：`accept="video/*"` 时拍摄入口变成
// 「录像」（同一个 `capture`，原生 input 会打开录像界面），缩略图位置渲染 `<video>`
// + 播放角标。三条与照片不同的口径：
//   ① **不做本地压缩** —— 浏览器端转码要么靠 MediaRecorder 重录（丢时长与画质），
//      要么靠 WebCodecs（兼容面窄），失败率高且耗时以十秒计；`max-edge` 对视频无效。
//   ② **大小要先拦** —— 一段 4K 录像 100MB 起，超过网关上限时后端只会回一个 413，
//      用户看到的是「点了没反应」。`max-size` 超限直接发 `z-reject`，不进列表。
//   ③ **混合收（图 + 视频）按照片走** —— 一次点击只能开一种相机，混合时原生单会弹
//      「拍照 / 录像 / 相册」菜单，反而丢掉「一次点击直入」；要录像直入就写 `video/*`。
import { BaseElement, COPY, escapeAttr, escapeHtml, html, property, t, defineElement } from "../../core/index.js";
import mUploaderCSS from "./m-uploader.css?raw";
import { compressPhoto } from "./photo-compress.js";

/** 已展示的条目：宿主上传成功后回写 url，组件据此显示缩略图。 */
export interface MUploadFile {
  url?: string;
  name?: string;
  /**
   * 这条是照片还是视频，决定缩略图用 `<img>` 还是 `<video>`。
   *
   * 缺省按照片：老调用方回写 `{name, url}` 的形态不变 —— 它里面本来也只有图。
   */
  type?: "image" | "video";
  /** 视频封面（可选）。不给时靠浏览器解首帧，部分 iOS 上会先显示一块底色。 */
  poster?: string;
}

/** 这次是从哪儿来的图：相机（`capture`）还是相册/文件。 */
export type MUploadSource = "camera" | "album";

export class MUploader extends BaseElement {
  static styles = mUploaderCSS;

  @property({ attribute: false }) files: MUploadFile[] = [];
  @property({ type: String }) accept = "image/*";
  @property({ type: Boolean }) multiple = false;
  /** 最多几张；达到上限后「添加」格子消失 */
  @property({ type: Number }) max = 9;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String, attribute: "add-label" }) addLabel = COPY.upload;
  /**
   * 相机朝向：`environment` 后置（缺省语义）、`user` 前置、空串 = 不要相机入口。
   *
   * 写 `capture` 不带值也按后置处理 —— 与原生 `<input capture>` 的布尔写法一致，
   * 用户不必为了「开个相机」去背两个枚举值。
   */
  @property({ type: String }) capture = "";
  /** 长边上限（px），0 = 不压缩。手机直出 3~8MB，缩到 1600 通常 200~400KB。视频不压缩。 */
  @property({ type: Number, attribute: "max-edge" }) maxEdge = 0;
  /** JPEG 质量，仅 `max-edge > 0` 时生效。 */
  @property({ type: Number }) quality = 0.82;
  /**
   * 单个文件上限（字节），0 = 不限。
   *
   * [WHY 组件要自己拦] 视频超过网关上限时后端只回一个 413，而受控列表里那条**永远不会**
   * 变成缩略图 —— 用户看到的是「选了、什么都没发生」。拦在取图这一侧，才能当场说清。
   * 与 `z-upload` 同名同义（`max-size`），不另发明一套。
   */
  @property({ type: Number, attribute: "max-size" }) maxSize = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("change", this._onChange);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("change", this._onChange);
    super.disconnectedCallback();
  }

  /**
   * 相机入口开着没有。
   *
   * [WHY 还要看属性存不存在] `@property({type:String})` 把「没写」和「写了但没值」
   * 都读成空串，而 `<m-uploader capture>` 这种布尔写法必须算「要相机」，
   * 否则用户在 HTML 里写 `capture` 会得到一个不存在的入口，且没有任何报错。
   */
  private get _camera(): boolean {
    const v = (this.capture || "").trim().toLowerCase();
    if (v === "off" || v === "false" || v === "none") return false;
    return v !== "" || this.hasAttribute("capture");
  }

  /** 相机朝向的实际值：`user` 前置，其余（含布尔写法）一律后置。 */
  private get _facing(): string {
    const v = (this.capture || "").trim().toLowerCase();
    return v === "user" || v === "front" ? "user" : "environment";
  }

  /**
   * 这个上传件收的是照片还是视频（决定拍摄入口的图标与文案）。
   *
   * `accept` 是逗号分隔的 MIME 列表，只认前缀：`video/*` / `video/mp4` 都算视频。
   * 空串（不限类型）按照片 —— 那是老调用方的形态，改口径会让他们的界面文案突然变。
   */
  private get _mediaKind(): "image" | "video" {
    const items = (this.accept || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!items.length) return "image";
    const hasVideo = items.some((t) => t.startsWith("video/"));
    const hasImage = items.some((t) => t.startsWith("image/"));
    // 混合时按照片：一次点击只能开一种相机，混合只会退回系统来源菜单
    return hasVideo && !hasImage ? "video" : "image";
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    const el = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (!el) return;
    const act = el.dataset.act;
    if (act === "add" || act === "album") {
      this._pick("album");
    } else if (act === "shot") {
      this._pick("camera");
    } else if (act === "remove") {
      this.emit("z-remove", { index: Number(el.dataset.index) });
    }
  };

  private _pick(source: MUploadSource): void {
    const input = this.shadowRoot!.querySelector(`input[data-src="${source}"]`) as HTMLInputElement | null;
    (input ?? (this.shadowRoot!.querySelector("input[type=file]") as HTMLInputElement | null))?.click();
  }

  private _onChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (!input.classList.contains("m-uploader__file")) return;
    const source: MUploadSource = input.dataset.src === "camera" ? "camera" : "album";
    const picked = Array.from(input.files ?? []);
    // [WHY 必须清空 input.value] 不清的话「删掉再选同一张」不会触发 change ——
    // 用户看到的是「点了没反应」，而这在相册里重选同一张照片时几乎必现。
    input.value = "";
    if (!picked.length) return;

    // 先用大小筛一遍：超限的不进列表、不发 z-select，单独报 z-reject（见 `maxSize` 注释）
    const over = this.maxSize > 0 ? picked.filter((f) => f.size > this.maxSize) : [];
    const within = over.length ? picked.filter((f) => !over.includes(f)) : picked;
    if (over.length) this.emit("z-reject", { files: over, reason: "size", limit: this.maxSize });
    if (!within.length) return;

    const room = Math.max(0, this.max - this.files.length);
    // 相机一次只有一张（`capture` 的 input 也不接受 multiple），相册才按 multiple 收
    const take = this.multiple && source === "album" ? within.slice(0, room) : within.slice(0, Math.min(1, room));
    if (!take.length) return;
    void this._emitPicked(take, source);
  };

  /** 压缩（可选）后再上报：宿主拿到的就是可直传的大小，口子只有这一处。 */
  private async _emitPicked(files: File[], source: MUploadSource): Promise<void> {
    const out: File[] = [];
    for (const file of files) {
      out.push(this.maxEdge > 0 ? await compressPhoto(file, { maxEdge: this.maxEdge, quality: this.quality }) : file);
    }
    this.emit("z-select", { files: out, source });
  }

  render(): string {
    const full = this.files.length >= this.max;
    const tiles = this.files
      .map((f, i) => {
        const thumb = !f.url
          ? html`<span class="m-uploader__name">${escapeHtml(f.name ?? t("selectedFallback"))}</span>`
          : f.type === "video"
            ? html`<video
                  class="m-uploader__video"
                  src="${escapeAttr(f.url)}"
                  ${f.poster ? html`poster="${escapeAttr(f.poster)}"` : ""}
                  muted
                  playsinline
                  preload="metadata"
                  role="img"
                  aria-label="${escapeAttr(t("videoPrefix", { name: f.name ?? "" }))}"
                ></video>
                <span class="m-uploader__play" aria-hidden="true">
                  <svg width="9" height="11" viewBox="0 0 10 12" fill="currentColor">
                    <path d="M1 1.3c0-.9 1-1.5 1.8-1L9 5.1c.8.5.8 1.6 0 2.1L2.8 11.7c-.8.5-1.8-.1-1.8-1z" />
                  </svg>
                </span>`
            : html`<img class="m-uploader__img" src="${escapeAttr(f.url)}" alt="${escapeAttr(f.name ?? "")}" />`;
        return html`
          <div class="m-uploader__tile" part="tile">
            ${thumb}
            ${this.disabled
              ? ""
              : html`<button class="m-uploader__remove" part="remove" type="button" data-act="remove" data-index="${i}" aria-label="${escapeAttr(t("deleteItem"))}">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                </button>`}
          </div>
        `;
      })
      .join("");

    const add = full || this.disabled ? "" : this._camera ? this._cameraEntries() : this._singleEntry();

    return html`
      <div class="m-uploader" part="root">
        ${tiles}${add}
        <input
          class="m-uploader__file"
          type="file"
          data-src="album"
          accept="${escapeHtml(this.accept)}"
          ${this.multiple ? "multiple" : ""}
          hidden
          aria-hidden="true"
          tabindex="-1"
        />
        ${this._camera
          ? html`<input
              class="m-uploader__file"
              type="file"
              data-src="camera"
              accept="${escapeHtml(this.accept)}"
              capture="${escapeHtml(this._facing)}"
              hidden
              aria-hidden="true"
              tabindex="-1"
            />`
          : ""}
      </div>
    `;
  }

  /** 没有相机入口时的唯一加号（老形态，字节不变）。 */
  private _singleEntry(): string {
    return html`
      <button class="m-uploader__tile m-uploader__add" part="add" type="button" data-act="add">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span class="m-uploader__add-label">${escapeHtml(this.addLabel)}</span>
      </button>
    `;
  }

  /**
   * 相机 + 相册两个入口。
   *
   * [WHY 不是「一个入口 + 一个来源选择框」] 拍照要的是**一次点击**：多一层选择框等于
   * 每次拍照多点一次，而「拍照」在巡检、验收、报销这类场景里是最高频的那个动作。
   *
   * 收视频时同一个入口换成「录像」与摄像机图标：文案说「拍照」而实际打开录像界面，
   * 用户会以为点错了（iPhone 上两者的界面差别极大）。
   */
  private _cameraEntries(): string {
    const video = this._mediaKind === "video";
    const shotIcon = video
      ? html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="6.5" width="12.5" height="11" rx="2.2" stroke="currentColor" stroke-width="1.5" />
          <path d="M15 11.2 20 8.7c.7-.3 1.5.2 1.5 1v4.6c0 .8-.8 1.3-1.5 1L15 12.8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>`
      : html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.1-1.6a1.5 1.5 0 0 1 1.2-.6h5a1.5 1.5 0 0 1 1.2.6l1.1 1.6H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <circle cx="12" cy="13" r="3.4" stroke="currentColor" stroke-width="1.5" />
        </svg>`;
    return html`
      <button class="m-uploader__tile m-uploader__add m-uploader__add--shot" part="shot" type="button" data-act="shot">
        ${shotIcon}
        <span class="m-uploader__add-label">${escapeHtml(video ? t("recordVideo") : t("takePhoto"))}</span>
      </button>
      <button class="m-uploader__tile m-uploader__add" part="album" type="button" data-act="album">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
          <circle cx="9" cy="10" r="1.6" stroke="currentColor" stroke-width="1.3" />
          <path d="M4 16.5 9.6 12l4 3.4 2.6-2 3.8 3.1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
        <span class="m-uploader__add-label">${escapeHtml(t("album"))}</span>
      </button>
    `;
  }
}

defineElement("m-uploader", MUploader);

// <z-upload> 上传：action 与 headers 走宿主网关，auto 决定是否自动上传，进度与结果各发事件。
// [WHY] z-upload [[2026-08-11-W14-form]]:
// 文件上传：隐藏 input[type=file] + 拖拽区 + XHR 上传（fetch 无上传进度事件，
// xhr.upload.onprogress 是唯一进度来源）。
// 文件列表渲染直写 DOM 不走 requestUpdate：render 重建 shadow 会销毁隐藏
// input[type=file]（选中文件状态丢失），故列表变更只操作列表容器子节点，
// 重渲染仅发生在属性变化（disabled/accept 等），updated() 再回填列表。
// 文件 id 计数器：不依赖 crypto.randomUUID（happy-dom 兼容）。
// See: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// [2026-08-11] night-hawk: 创建
import { BaseElement, html, property, escapeHtml, escapeAttr, defineElement } from "../../core/index.js";
import uploadCSS from "./upload.css?raw";

export type ZUploadStatus = "idle" | "uploading" | "success" | "error";

export interface ZUploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: ZUploadStatus;
  progress: number;
  url?: string;
  error?: string;
}

export class ZUpload extends BaseElement {
  static styles = uploadCSS;

  @property({ type: String }) accept = "";
  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean }) drag = true;
  @property({ type: String }) action = "";
  @property({ type: String }) method = "POST";
  @property({ type: Object, attribute: false }) headers: Record<string, string> = {};
  @property({ type: String }) name = "file";
  // [WHY] 多词属性需显式 attribute 名（decorators 只做 toLowerCase，不做 kebab 转换，见 src/core/decorators.ts:22）
  @property({ type: Number, attribute: "max-size" }) maxSize: number | undefined;
  @property({ type: Boolean }) auto = true;
  @property({ type: Boolean, attribute: "show-list" }) showList = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) label = "Click or drag files to upload";

  private _files: ZUploadFile[] = [];
  private _xhrs = new Map<string, XMLHttpRequest>();
  private _idCounter = 0;
  private _dragOver = false;

  /** 当前文件列表快照（只读） */
  get files(): ZUploadFile[] {
    return this._files.slice();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("change", this._onInputChange);
    this.shadowRoot!.addEventListener("click", this._onListClick);
    this.shadowRoot!.addEventListener("dragover", this._onDragOver);
    this.shadowRoot!.addEventListener("dragleave", this._onDragLeave);
    this.shadowRoot!.addEventListener("drop", this._onDrop);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("change", this._onInputChange);
    this.shadowRoot!.removeEventListener("click", this._onListClick);
    this.shadowRoot!.removeEventListener("dragover", this._onDragOver);
    this.shadowRoot!.removeEventListener("dragleave", this._onDragLeave);
    this.shadowRoot!.removeEventListener("drop", this._onDrop);
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] render 重建后回填列表（首次渲染 + 属性重渲染都走这里）
    this._renderList();
  }

  render(): string {
    const disabled = this.disabled ? "z-upload--disabled" : "";
    return html`
      <div class="z-upload ${disabled}" part="root">
        <div class="z-upload__dropzone" part="dropzone">
          <input type="file" class="z-upload__input" part="input"
            ${this.accept ? `accept="${escapeAttr(this.accept)}"` : ""}
            ${this.multiple ? "multiple" : ""}
            ${this.disabled ? "disabled" : ""} />
          <div class="z-upload__hint" part="hint">${escapeHtml(this.label)}</div>
        </div>
        <div class="z-upload__list" part="list" ${this.showList ? "" : "hidden"}></div>
      </div>
    `;
  }

  // ── 方法 API ──

  /** 上传全部 idle 状态文件；无 action 时仅本地管理（不上传） */
  upload(): void {
    for (const f of this._files) {
      if (f.status === "idle") this._uploadFile(f);
    }
  }

  /** 移除单个文件（上传中先 abort）
   *  [WHY] 命名为 removeFile 而非 remove: 后者与继承自 Element 的 DOM remove() 冲突,
   *  宿主调用 uploadEl.remove() 会误命中该方法（[[lesson-web-components-render-pitfalls]]）*/
  removeFile(id: string): void {
    const idx = this._files.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const [removed] = this._files.splice(idx, 1);
    this._xhrs.get(removed.id)?.abort();
    this._xhrs.delete(removed.id);
    this._renderList();
    this.emit("z-remove", { id });
  }

  /** 清空全部文件（上传中先 abort） */
  clear(): void {
    for (const f of this._files) this._xhrs.get(f.id)?.abort();
    this._xhrs.clear();
    this._files = [];
    this._renderList();
  }

  /** 中止全部上传中请求，状态回 idle */
  abort(): void {
    for (const f of this._files) {
      if (f.status === "uploading") {
        this._xhrs.get(f.id)?.abort();
        this._xhrs.delete(f.id);
        f.status = "idle";
        f.progress = 0;
      }
    }
    this._renderList();
  }

  // ── 内部 ──

  private _nextId(): string {
    return "z-upload-" + ++this._idCounter;
  }

  private _addFiles(list: FileList | File[]): void {
    for (const file of Array.from(list)) {
      const info: ZUploadFile = {
        id: this._nextId(),
        file,
        name: file.name,
        size: file.size,
        status: "idle",
        progress: 0,
      };
      if (this.maxSize !== undefined && file.size > this.maxSize) {
        info.status = "error";
        info.error = `File exceeds max size (${this._formatSize(this.maxSize)})`;
      }
      this._files.push(info);
    }
    this._renderList();
    this.emit("z-change", { files: this._files.slice() });
    if (this.auto) this.upload();
  }

  private _uploadFile(info: ZUploadFile): void {
    if (!this.action || !info.file) return;
    const xhr = new XMLHttpRequest();
    this._xhrs.set(info.id, xhr);
    info.status = "uploading";
    info.progress = 0;
    this._renderList();
    xhr.open(this.method.toUpperCase(), this.action);
    for (const [k, v] of Object.entries(this.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e: ProgressEvent): void => {
      if (!e.lengthComputable) return;
      info.progress = Math.round((e.loaded / e.total) * 100);
      this._renderList();
      this.emit("z-progress", { id: info.id, progress: info.progress });
    };
    xhr.onload = (): void => {
      this._xhrs.delete(info.id);
      if (xhr.status >= 200 && xhr.status < 300) {
        info.status = "success";
        info.progress = 100;
        // [WHY] 响应体整体视为 url 占位；服务端可返回 JSON 字符串由消费方解析
        info.url = xhr.responseText || "";
        this._renderList();
        this.emit("z-success", { id: info.id, url: info.url });
      } else {
        info.status = "error";
        info.error = `HTTP ${xhr.status}`;
        this._renderList();
        this.emit("z-error", { id: info.id, error: info.error });
      }
    };
    xhr.onerror = (): void => {
      this._xhrs.delete(info.id);
      info.status = "error";
      info.error = "Network error";
      this._renderList();
      this.emit("z-error", { id: info.id, error: info.error });
    };
    const fd = new FormData();
    fd.append(this.name, info.file);
    xhr.send(fd);
  }

  private _renderList(): void {
    const list = this.shadowRoot?.querySelector(".z-upload__list") as HTMLElement | null;
    if (!list) return;
    list.innerHTML = this._files.map((f) => this._rowHtml(f)).join("");
  }

  private _rowHtml(f: ZUploadFile): string {
    const statusText =
      f.status === "uploading" ? `${f.progress}%` : f.status === "success" ? "✓" : f.status === "error" ? "✕" : "";
    const status = `${statusText}${f.error ? " " + escapeHtml(f.error) : ""}`;
    return html`
      <div class="z-upload__item z-upload__item--${f.status}" part="item" data-id="${f.id}">
        <span class="z-upload__name" part="name">${escapeHtml(f.name)}</span>
        <span class="z-upload__meta">${this._formatSize(f.size)}</span>
        <span class="z-upload__status" part="status">${status}</span>
        <button type="button" class="z-upload__remove" part="remove"
          aria-label="Remove ${escapeAttr(f.name)}">×</button>
      </div>
    `;
  }

  private _onInputChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (!input.classList.contains("z-upload__input") || !input.files?.length) return;
    this._addFiles(input.files);
    // [WHY] 重置 input 值：允许重复选择同一文件（否则二次 change 不触发）
    input.value = "";
  };

  private _onListClick = (e: Event): void => {
    // [WHY] closest 而非 classList：委托型点击统一走祖先链（[[bug-20260811-step-svg-click]] 教训）
    const item = (e.target as HTMLElement).closest(".z-upload__item");
    if (!item) return;
    if ((e.target as HTMLElement).closest(".z-upload__remove")) {
      this.removeFile(item.getAttribute("data-id") ?? "");
      return;
    }
    // [WHY] 点击列表区（非按钮）触发文件选择；disabled 时 dropzone 已挡，此处双保险
    if (!this.disabled) this._pick();
  };

  private _pick(): void {
    const input = this.shadowRoot!.querySelector(".z-upload__input") as HTMLInputElement | null;
    input?.click();
  }

  // [WHY] dragover 必须 preventDefault：否则浏览器默认行为拒绝 drop
  private _onDragOver = (e: Event): void => {
    if (!this.drag || this.disabled) return;
    e.preventDefault();
    this._setDragOver(true);
  };

  private _onDragLeave = (e: Event): void => {
    // [WHY] dragleave 在子元素间频繁触发；仅当离开 dropzone 本身时取消高亮
    if (!(e.target as HTMLElement).classList.contains("z-upload__dropzone")) return;
    this._setDragOver(false);
  };

  private _onDrop = (e: Event): void => {
    if (!this.drag || this.disabled) return;
    e.preventDefault();
    this._setDragOver(false);
    const files = (e as DragEvent).dataTransfer?.files;
    if (files?.length) this._addFiles(files);
  };

  private _setDragOver(on: boolean): void {
    if (this._dragOver === on) return;
    this._dragOver = on;
    const dz = this.shadowRoot!.querySelector(".z-upload__dropzone");
    dz?.classList.toggle("z-upload__dropzone--drag", on);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

defineElement("z-upload", ZUpload);

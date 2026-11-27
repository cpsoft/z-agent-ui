// <z-avatar> 头像：有图走 src，无图或加载失败退 initials 文字，size / shape 定尺寸与圆形或方形。
import { BaseElement, html, property, escapeHtml, escapeAttr, defineElement } from "../../core/index.js";
import avatarCSS from "./avatar.css?raw";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square";

const PERSON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="50%" height="50%"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-linecap="round"/></svg>`;

export class ZAvatar extends BaseElement {
  static styles = avatarCSS;

  @property({ type: String }) src = "";
  @property({ type: String }) alt = "";
  @property({ type: String }) size: AvatarSize = "md";
  @property({ type: String }) shape: AvatarShape = "circle";
  @property({ type: String }) initials = "";

  private _imgError = false;
  private _lastSrc = "";

  render(): string {
    const cls = `z-avatar z-avatar--${this.size} z-avatar--${this.shape}`;
    const useImage = this.src && !this._imgError;

    return html`
      <div class="${cls}" part="root" role="img" aria-label="${escapeAttr(this.alt || this.initials || 'avatar')}">
        ${useImage
          ? html`<img class="z-avatar__image" part="image" src="${escapeAttr(this.src)}" alt="${escapeAttr(this.alt)}" />`
          : this.initials
            ? html`<span class="z-avatar__fallback" part="fallback">${escapeHtml(this.initials.slice(0, 2))}</span>`
            : html`<span class="z-avatar__fallback" part="fallback"><slot>${PERSON_SVG}</slot></span>`
        }
      </div>
    `;
  }

  updated(): void {
    if (this.src !== this._lastSrc) {
      this._imgError = false;
      this._lastSrc = this.src;
    }
    const img = this.shadowRoot!.querySelector<HTMLImageElement>(".z-avatar__image");
    if (img && !(img as any).__bound) {
      img.addEventListener("error", this._onImgError, { once: true });
      img.addEventListener("load", () => {
        img.classList.add("z-avatar__image--loaded");
      }, { once: true });
      // Image may already be cached (complete=true before load event)
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("z-avatar__image--loaded");
      }
      (img as any).__bound = true;
    }
  }

  private _onImgError = (): void => {
    this._imgError = true;
    this.requestUpdate();
  };
}

defineElement("z-avatar", ZAvatar);

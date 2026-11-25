// <m-countdown> 倒计时：把「还剩 02:15:30」做成组件。
//
// 为什么值得单独一个组件，而不是每页写个 setInterval：
//   ① **不能靠累加**。「每秒减一」在页面卡顿、切后台、锁屏后都会漂移；必须每次用
//      `目标时间 - 当前时间` 重算，否则活动结束十分钟了还在跳。
//   ② **数字宽度必须恒定**。`font-variant-numeric: tabular-nums` 少了这一条，
//      每到 1→0、9→0 整块文字就抖一下。
//   ③ **读屏不能每秒播报**。`aria-live` 开着的话，屏幕阅读器会把每秒的数字念出来，
//      用户没法做别的事 —— 所以是 `role="timer"` + `aria-live="off"`，
//      到点再发 `z-end` 让宿主自己提示。
import { BaseElement, escapeAttr, html, property } from "../../core/index.js";
import mCountdownCSS from "./m-countdown.css?raw";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 把「YYYY-MM-DD[ HH:mm[:ss]]」当本地时间解析；`Date.parse` 对前者在部分内核里是 NaN。 */
function parseDeadline(raw: string): number {
  const s = String(raw).trim();
  if (!s) return Number.NaN;
  if (/^\d+$/.test(s)) return Number(s);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
    ).getTime();
  }
  return Date.parse(s);
}

export class MCountdown extends BaseElement {
  static styles = mCountdownCSS;

  /** 目标时间：`2026-12-01 10:00:00`（本地）/ ISO 串 / 毫秒时间戳。给了它就不用 `seconds`。 */
  @property({ type: String }) deadline = "";
  /** 相对剩余秒数（没给 `deadline` 时用）。改它会重新计时。 */
  @property({ type: Number }) seconds = 0;
  /** `hms`：总时:分:秒（时数可超过 24）；`ms`：分:秒；`dhms`：天 + 时:分:秒。 */
  @property({ type: String }) format: "hms" | "ms" | "dhms" = "hms";
  /** 暂停（不跑定时器，显示停在暂停那一刻）。 */
  @property({ type: Boolean }) paused = false;
  /** 前缀文字，如「距结束」。留空不画。 */
  @property({ type: String }) label = "";

  private _timer: number | undefined;
  /** `seconds` 模式的锚点：属性一变就重挂，避免「减一秒又变回去」。 */
  private _anchorMs = 0;
  private _anchorSec = 0;
  private _ended = false;
  /** 上一次的「目标 / 暂停」组合，用来判断要不要重排定时器。 */
  private _lastKey = "";

  private get _targetMs(): number {
    const d = parseDeadline(this.deadline);
    if (Number.isFinite(d)) return d;
    if (this._anchorSec !== this.seconds) {
      this._anchorSec = this.seconds;
      this._anchorMs = Date.now() + Math.max(0, this.seconds) * 1000;
    }
    return this._anchorMs;
  }

  /** 剩余秒数（向上取整：显示 00:00:01 时还剩不到一秒，仍算 1）。 */
  get remaining(): number {
    const ms = this._targetMs - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._onVisibility);
    this._start();
  }

  disconnectedCallback(): void {
    this._stop();
    document.removeEventListener("visibilitychange", this._onVisibility);
    super.disconnectedCallback();
  }

  updated(): void {
    // 每次渲染都重挂定时器的话，等于每秒清一次再设一次；只在「目标 / 暂停」变了时重排。
    // 目标变了还要把 z-end 的门闩打开 —— 否则活动延长时间后不再报结束。
    const key = `${this.deadline}|${this.seconds}|${this.paused}`;
    if (key === this._lastKey) return;
    this._lastKey = key;
    if (this.remaining > 0) this._ended = false;
    this._start();
  }

  render(): string {
    const total = this.remaining;
    const { head, clock } = this._split(total);
    return html`
      <div class="m-countdown" part="root" role="timer" aria-live="off"
        aria-label="${escapeAttr(this.label ? `${this.label} ${clock}` : clock)}">
        ${this.label ? `<span class="m-countdown__label" part="label">${escapeAttr(this.label)}</span>` : ""}
        ${head ? `<span class="m-countdown__head" part="day">${head}</span>` : ""}
        <span class="m-countdown__clock" part="clock">${clock}</span>
      </div>
    `;
  }

  /** 拆成「天」与「时:分:秒」两段。格式化只有这一处，改口径不用翻样式。 */
  private _split(total: number): { head: string; clock: string } {
    const t = Math.max(0, Math.trunc(total));
    const d = Math.floor(t / 86400);
    const h = Math.floor((t % 86400) / 3600);
    const mi = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (this.format === "ms") {
      return { head: "", clock: `${pad(Math.floor(t / 60))}:${pad(s)}` };
    }
    if (this.format === "dhms") {
      return { head: d > 0 ? `${d} 天` : "", clock: `${pad(h)}:${pad(mi)}:${pad(s)}` };
    }
    // hms：总小时数，超过 24 小时照实显示 49:30:00（不折成天，避免宿主自己再拼一次）
    return { head: "", clock: `${pad(Math.floor(t / 3600))}:${pad(mi)}:${pad(s)}` };
  }

  private _start(): void {
    this._stop();
    if (this.paused || !this.isConnected) return;
    if (this.remaining <= 0) {
      this._finish();
      return;
    }
    this._timer = window.setInterval(this._tick, 1000);
  }

  private _stop(): void {
    if (this._timer !== undefined) {
      window.clearInterval(this._timer);
      this._timer = undefined;
    }
  }

  private _tick = (): void => {
    if (this.remaining <= 0) {
      this._finish();
      return;
    }
    this.requestUpdate();
  };

  private _finish(): void {
    this._stop();
    this.requestUpdate();
    if (this._ended) return;
    this._ended = true;
    this.emit("z-end", {});
  }

  /** 切后台不跑定时器：省电，也避免后台被节流后回来一次跳好几分钟。 */
  private _onVisibility = (): void => {
    if (document.hidden) this._stop();
    else this._start();
  };
}

customElements.define("m-countdown", MCountdown);

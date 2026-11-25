export interface ClickOutsideOptions {
  element: HTMLElement;
  handler: () => void;
  /** CSS selector to ignore certain elements. */
  ignore?: string;
}

/**
 * Detects clicks/touches outside an element and calls the handler.
 * Call `destroy()` to clean up.
 */
export class ClickOutside {
  private _element: HTMLElement;
  private _handler: () => void;
  private _ignore?: string;
  private _onEvent: (e: Event) => void;

  constructor(options: ClickOutsideOptions) {
    this._element = options.element;
    this._handler = options.handler;
    this._ignore = options.ignore;
    this._onEvent = this._handleEvent.bind(this);

    // Use mousedown for earlier detection (before click bubbles fully)
    document.addEventListener("mousedown", this._onEvent, true);
    document.addEventListener("touchend", this._onEvent, true);
  }

  destroy(): void {
    document.removeEventListener("mousedown", this._onEvent, true);
    document.removeEventListener("touchend", this._onEvent, true);
  }

  private _handleEvent(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target || !document.body.contains(target)) return;

    // Inside the element — ignore
    if (this._element.contains(target)) return;

    // Matches ignore selector — ignore
    if (this._ignore && target.closest(this._ignore)) return;

    this._handler();
  }
}

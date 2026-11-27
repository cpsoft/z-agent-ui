import type { ReactiveController, ReactiveControllerHost } from "./controller.js";

/**
 * 强类型上下文键（遵循 W3C Web Components Context Protocol 约定）。
 * 使用任意唯一值（推荐 symbol 或命名字符串）作为运行时标识，类型参数 `T` 仅用于编译期推导。
 */
export type Context<T> = unknown & { readonly __contextType?: T };

export type ContextCallback<T> = (value: T, unsubscribe?: () => void) => void;

/** 创建一个强类型的 Context 键。 */
export function createContext<T>(key: unknown): Context<T> {
  return key as Context<T>;
}

/**
 * W3C 标准 `context-request` 事件：冒泡并穿透 Shadow DOM，
 * 由最近的匹配 `ContextProvider` 拦截并回传值与取消订阅句柄。
 */
export class ContextRequestEvent<T = unknown> extends Event {
  readonly context: Context<T>;
  readonly callback: ContextCallback<T>;
  readonly subscribe: boolean;

  constructor(context: Context<T>, callback: ContextCallback<T>, subscribe = false) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
    this.subscribe = subscribe;
  }
}

export interface ContextProviderOptions<T> {
  context: Context<T>;
  initialValue: T;
}

/**
 * 上下文提供者控制器：挂在容器宿主上，向任意深度的子孙组件（含 Shadow DOM 内）
 * 分发共享状态并在值变化时通知订阅者。
 */
export class ContextProvider<T> implements ReactiveController {
  private readonly _host: EventTarget & ReactiveControllerHost;
  private readonly _context: Context<T>;
  private _value: T;
  private readonly _subs = new Map<ContextCallback<T>, () => void>();

  constructor(host: EventTarget & ReactiveControllerHost, options: ContextProviderOptions<T>) {
    this._host = host;
    this._context = options.context;
    this._value = options.initialValue;
  }

  get value(): T {
    return this._value;
  }

  /** 更新上下文值；值变化（或 `force=true`）时广播给全部订阅者。 */
  setValue(value: T, force = false): void {
    if (!force && Object.is(this._value, value)) return;
    this._value = value;
    for (const [cb, unsub] of Array.from(this._subs.entries())) {
      cb(this._value, unsub);
    }
  }

  hostConnected(): void {
    this._host.addEventListener("context-request", this._onRequest as EventListener);
  }

  hostDisconnected(): void {
    this._host.removeEventListener("context-request", this._onRequest as EventListener);
    this._subs.clear();
  }

  private _onRequest = (e: Event): void => {
    const req = e as ContextRequestEvent<T>;
    if (req.context !== this._context) return;
    req.stopPropagation();
    if (req.subscribe) {
      let unsub = this._subs.get(req.callback);
      if (!unsub) {
        unsub = () => {
          this._subs.delete(req.callback);
        };
        this._subs.set(req.callback, unsub);
      }
      req.callback(this._value, unsub);
    } else {
      req.callback(this._value);
    }
  };
}

export interface ContextConsumerOptions<T> {
  context: Context<T>;
  subscribe?: boolean;
  callback?: (value: T) => void;
}

/**
 * 上下文消费者控制器：在宿主连接时自动向上寻找 `ContextProvider`，
 * 收到值更新时触发宿主重渲染并执行可选回调，断开时自动取消订阅。
 */
export class ContextConsumer<T> implements ReactiveController {
  private readonly _host: EventTarget & ReactiveControllerHost;
  private readonly _context: Context<T>;
  private readonly _subscribe: boolean;
  private readonly _onChange?: (value: T) => void;
  private _unsub: (() => void) | null = null;
  private _provided = false;
  private _connected = false;
  value: T | undefined = undefined;

  constructor(host: EventTarget & ReactiveControllerHost, options: ContextConsumerOptions<T>) {
    this._host = host;
    this._context = options.context;
    this._subscribe = options.subscribe ?? true;
    this._onChange = options.callback;
  }

  hostConnected(): void {
    this._connected = true;
    this._provided = false;
    this._dispatchRequest();
    // 若父级 Provider 是异步渲染（如 BaseElement 首帧微任务才产出 <slot>），
    // 同步派发时子元素尚未被分配到 slot，事件不会穿透到宿主；微任务后再补查一次。
    if (!this._provided) {
      queueMicrotask(() => {
        if (this._connected && !this._provided) {
          this._dispatchRequest();
        }
      });
    }
  }

  hostDisconnected(): void {
    this._connected = false;
    this._provided = false;
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
  }

  private _dispatchRequest(): void {
    this._host.dispatchEvent(
      new ContextRequestEvent<T>(this._context, this._receive, this._subscribe),
    );
  }

  private _receive: ContextCallback<T> = (value, unsubscribe) => {
    this._provided = true;
    if (this._unsub && this._unsub !== unsubscribe) {
      this._unsub();
    }
    this._unsub = unsubscribe ?? null;
    this.value = value;
    this._onChange?.(value);
    this._host.requestUpdate();
  };
}

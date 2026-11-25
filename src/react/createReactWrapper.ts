import React, { useRef, useEffect, useCallback } from "react";

type EventHandler = (e: Event) => void;

interface WrapperOptions {
  /** Map of React camelCase prop → DOM property name. */
  propMap?: Record<string, string>;
}

const EVENT_PREFIX = "on";
const ATTR_BLACKLIST = new Set(["children", "ref", "key", "style", "className", "dangerouslySetInnerHTML"]);

function isReactEventProp(key: string): boolean {
  return key.startsWith(EVENT_PREFIX) && key.length > 2 && key[2] === key[2].toUpperCase();
}

function eventPropToName(key: string): string {
  // "onZClick" → "z-click"
  const eventName = key.slice(2);
  return eventName.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

function toAttribute(name: string): string {
  return name.replace(/([A-Z])/g, "-$1").toLowerCase();
}

export function createReactWrapper(
  tagName: string,
  options?: WrapperOptions,
): React.ForwardRefExoticComponent<React.PropsWithChildren<Record<string, unknown>> & React.RefAttributes<HTMLElement>> {
  const propMap = options?.propMap ?? {};

  return React.forwardRef<HTMLElement, React.PropsWithChildren<Record<string, unknown>>>((props, ref) => {
    const elRef = useRef<HTMLElement | null>(null);
    // Always-current snapshot of props for stable event handlers
    const propsRef = useRef(props);
    propsRef.current = props;
    // Track previous non-event prop values to skip unchanged
    const prevValuesRef = useRef<Record<string, unknown>>({});

    const setRef = useCallback(
      (node: HTMLElement | null) => {
        elRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [ref],
    );

    // Event listeners: add once on mount, dispatch via propsRef.
    // [WHY] 原实现 useEffect 无依赖数组 → 每次渲染都 remove/re-add 全部事件监听器，
    // 触发 Web Components shadow DOM 重渲染 → 闪屏。改为只挂载一次，handler 通过
    // propsRef.current 获取最新值。
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;

      // Collect event prop keys present at mount time
      const eventKeys = Object.keys(props).filter(isReactEventProp);
      const cleanups: (() => void)[] = [];

      for (const key of eventKeys) {
        const eventName = eventPropToName(key);
        // [WHY] 本地补丁（2026-08-12 重放）：事件 retarget 校验 — 只响应宿主自身
        // emit 的事件，忽略 light DOM 子组件冒泡上来的同名事件。真实 bug：z-modal
        // 内 z-alert 关闭 emit z-close（bubbles+composed），冒泡穿过 z-modal 宿主
        // 触发 React onZClose → 弹窗被误关。VENDOR-NOTE 2026-08-10 二次同步声称
        // 上游已吸收该设计，但 8b04b3a 同步后副本实际无此校验（5ed881b 实测）
        // See: wiki/bugs/bug-20260812-alert-close-bubbles-modal.md
        const wrapped = (e: Event) => {
          if (e.target !== el) return;
          const handler = propsRef.current[key] as EventHandler | undefined;
          if (handler) handler(e);
        };
        el.addEventListener(eventName, wrapped);
        cleanups.push(() => el.removeEventListener(eventName, wrapped));
      }

      return () => cleanups.forEach((fn) => fn());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Property/attribute updates: only apply values that actually changed.
    // [WHY] 原实现每次渲染都重新 setAttribute + (el[prop] = value)，即使值未变。
    // Web Components 的 property setter 可能触发 shadow DOM 重渲染，导致闪屏。
    // 改为引用比较跳过未变化的 prop。
    useEffect(() => {
      const el = elRef.current;
      if (!el) return;

      const prev = prevValuesRef.current;
      const updated: Record<string, unknown> = {};

      // [WHY][本地补丁 2026-10-16] 先清理「上一次有、这一次没有」的键。
      // 原实现只遍历当前 props ⇒ 某个键一旦从 props 里消失就**永远不再被处理**，
      // 它的 attribute 会留在元素上：当「同一位置渲染同一个 wrapper、用可选 prop 切换形态」
      // 时（React 按同位置同类型复用实例，元素不重建），旧形态的 disabled / placeholder /
      // 任何 attribute 都残留，且**零报错**——排查时只看到「界面没更新」。
      // 真例（zEtl，2026-10-16 学员报障）：规则编辑器 source 面板 legacy→dataset 迁移后，
      // 抽取模式下拉仍是灰的、占位仍显示「SQL 查询（存量）」，用户以为迁移没生效。
      // 回归锁：src/web/src/vendor-wrapper.test.tsx
      // See: wiki/bugs/bug-20261016-wrapper-stale-attr.md
      for (const key of Object.keys(prev)) {
        if (key in props) continue;
        if (ATTR_BLACKLIST.has(key) || isReactEventProp(key)) continue;
        const propName = propMap[key] ?? key;
        el.removeAttribute(toAttribute(propName));
        try {
          (el as any)[propName] = undefined;
        } catch {
          // property 赋值可能失败；attribute 已移除即为兜底
        }
        delete prev[key];
      }

      for (const [key, value] of Object.entries(props)) {
        if (ATTR_BLACKLIST.has(key)) continue;
        if (isReactEventProp(key)) continue; // events handled by stable listeners

        // Skip unchanged values (reference equality)
        if (prev[key] === value) continue;

        const propName = propMap[key] ?? key;

        // DOM attribute (string/number/boolean)
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          const attrName = toAttribute(propName);
          if (typeof value === "boolean") {
            if (value) {
              el.setAttribute(attrName, "");
            } else {
              el.removeAttribute(attrName);
            }
          } else if (value != null) {
            el.setAttribute(attrName, String(value));
          }
        } else if (value == null) {
          // [WHY][本地补丁 2026-10-16] null / undefined 也要落到 attribute 上。
          // 否则 `placeholder={undefined}` 这种「显式置空」只靠下面的 property 赋值：
          // 组件若没给该名字定义 setter（或 setter 不反射到 attribute），
          // attribute 会静静留着旧值——而读 DOM 的人（E2E、截图对比、CSS）看到的正是它。
          el.removeAttribute(toAttribute(propName));
        }

        // Set as DOM property (for complex types)
        try {
          (el as any)[propName] = value;
        } catch {
          // Property assignment might fail, attribute is the fallback
        }

        updated[key] = value;
      }

      // Merge updated values back into prev ref
      prevValuesRef.current = { ...prev, ...updated };
    });

    // Build remaining HTML attributes (className, style, etc.)
    const attrs: Record<string, string> = {};
    if (props.className) attrs.class = String(props.className);

    return React.createElement(tagName, { ref: setRef, ...attrs }, props.children as React.ReactNode);
  });
}

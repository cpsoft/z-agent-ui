import { messageKeyOf } from "./i18n.js";
import type { MessageKey } from "./locales/zh-CN.js";

type PropertyType = StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor;

// [WHY] 默认 attribute 名必须 kebab-case（stickyHead → sticky-head）。
// 此前用 key.toLowerCase() 拼成 stickyhead，HTML/Vue 写 kebab 静态属性永不命中
// attributeChangedCallback ⇒ sticky-head / empty-text 这类多词静态属性**全部静默失效**
// （退回默认值，不报错）。见 [[bug-20260902-ce-kebab-attr-miss]]。
export function kebabAttr(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * 历史扁平名（`key.toLowerCase()`）：**只作为兼容别名被观察**，不是规范名。
 *
 * [WHY 保留而不是一刀切] 库里大量内部模板是手工拼的属性字符串
 * （`<z-column-selector columnstext="…" requiredcolumntext="…">`），
 * 库外页面也照抄过同样写法。若只留 kebab、不做兼容，这些属性会**静默退回默认值** ——
 * 正是 [[bug-20260902-ce-kebab-attr-miss]] 同一类故障，只是换了个方向。
 * 故：kebab 是唯一规范名（反射只写 kebab），扁平名继续被监听，供既有代码平滑迁移。
 * 新代码一律写 kebab；旧写法会一直可用，不需要也不应该引入第三个名字。
 */
export function legacyAttrName(key: string): string {
  return key.toLowerCase();
}

/**
 * 该属性需要监听的全部 attribute 名（规范名在首位）。
 *
 * [WHY 需要 attributeExplicit] meta.attribute 里存的**永远是解析后的名字**（kebab），
 * 光看它无法区分「作者显式写了 attribute: "custom-attr"」和「默认推导出来的 camel-case」。
 * 前者不该有别名（作者选的名字就是唯一名字），后者要保留扁平别名。
 * 因此判定依据是装饰器期记下的 attributeExplicit，而不是 attribute 的取值形态。
 */
export function metaAliases(meta: {
  key: string;
  attribute: string | false;
  attributeExplicit?: boolean;
}): string[] {
  if (meta.attribute === false) return [];
  if (meta.attributeExplicit) return [meta.attribute];
  const kebab = kebabAttr(meta.key);
  const legacy = legacyAttrName(meta.key);
  return kebab === legacy ? [kebab] : [kebab, legacy];
}


interface PropertyOptions {
  // [WHY] type 仅在属性反射路径（convertFromAttribute / toAttribute）使用：
  // 仅声明 attribute: false 的非反射属性（如 data/marks）无需 type，
  // 缺省时落回 String，语义与 attribute 路径无交叉（attribute === false 时
  // convertFromAttribute 与 toAttribute 都不会被调用）
  type?: PropertyType;
  attribute?: string | false;
  reflect?: boolean;
}

interface PropertyMeta {
  key: string;
  attribute: string | false;
  /** 作者是否显式指定了 attribute（决定要不要挂扁平别名，见 metaAliases）。 */
  attributeExplicit: boolean;
  type: PropertyType;
  reflect: boolean;
}

export function property(options?: PropertyOptions): PropertyDecorator {
  return (target, key) => {
    const opts = options ?? { type: String };
    const keyName = String(key);
    const privateKey = `__zui_prop_${keyName}`;
    const meta: PropertyMeta = {
      key: keyName,
      attribute: opts.attribute ?? kebabAttr(keyName),
      attributeExplicit: opts.attribute !== undefined,
      type: opts.type ?? String,
      reflect: opts.reflect ?? true,
    };

    // [WHY] 字段初始化器（this.id = "" / this.title = "x"）在构造期执行，
    // 若为原生属性名（id/title/draggable 等）会经原生 setter 反射写 attribute，
    // 覆盖 HTML 解析出的属性值（<z-flow-node id="a"> → id=""）。happy-dom 的
    // id 不反射 attribute，单测漏网、真实浏览器必现。改为原型访问器：构造期赋值
    // 只写 __zui_prop_* 存储，不碰 attribute；默认值惰性取自 legacy initializer
    // （返回新描述符后 TS 不再下发 initializer）。applyPropertyMeta 连接时
    // 以「属性优先于字段默认值」逻辑回填，见 [[field-initializer-clobbers-attribute]]
    const protoDesc = Object.getOwnPropertyDescriptor(target, keyName) as
      | { initializer?: () => unknown }
      | undefined;
    const initializer = protoDesc?.initializer;

    // 原生反射属性（title/id/draggable 等）回退：无 own 存储且无 initializer 时
    // 读原始描述符（如 HTMLElement.title getter → ""），保持 `title!: string`
    // 声明「未连接时读原生默认」的既有语义（[[bug-20260810-title-ctor-attr]] 回归）
    let nativeDesc: PropertyDescriptor | undefined;
    for (let proto = Object.getPrototypeOf(target); proto; proto = Object.getPrototypeOf(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, keyName);
      if (d) {
        nativeDesc = d;
        break;
      }
    }

    Object.defineProperty(target, keyName, {
      get(this: unknown) {
        const self = this as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(self, privateKey)) return self[privateKey];
        if (initializer) return initializer.call(this);
        if (nativeDesc) {
          if (nativeDesc.get) return nativeDesc.get.call(this);
          return nativeDesc.value;
        }
        return undefined;
      },
      set(this: unknown, value: unknown) {
        Object.defineProperty(this, privateKey, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      },
      enumerable: true,
      configurable: true,
    });

    // Store on the constructor (class), not prototype
    // In a PropertyDecorator, target is the prototype
    // We need to find the constructor — it's the class being defined
    // We use a deferred approach: store on prototype, then BaseElement.connectedCallback
    // collects them up to the constructor.
    if (!(target as any).__zui_protoPropertyMeta) {
      (target as any).__zui_protoPropertyMeta = [];
    }
    (target as any).__zui_protoPropertyMeta.push(meta);

    // [WHY] observedAttributes 必须在 customElements.define 时已完整可用，
    // 否则浏览器缓存空列表，连接后的 setAttribute 永不触发 attributeChangedCallback
    const ctor = target.constructor as any;
    if (!ctor.__zui_observedRegistered) {
      ctor.__zui_observedRegistered = true;
      Object.defineProperty(ctor, "observedAttributes", {
        configurable: true,
        get() {
          const attrs: string[] = [];
          let proto = ctor.prototype;
          while (proto) {
            const list = proto.__zui_protoPropertyMeta as PropertyMeta[] | undefined;
            if (list) {
              for (const m of list) {
                // [WHY 不只推规范名] meta.attribute 已是 kebab，但库内手工拼的模板字符串
                // 仍写扁平名（columnstext / requiredcolumntext …），不把它们列进
                // observedAttributes 就收不到回调 ⇒ 静默退回默认值。
                // 已显式声明 attribute 的属性只有一个名字，attrAliases 会返回单元素。
                for (const name of metaAliases(m)) {
                  if (!attrs.includes(name)) attrs.push(name);
                }
              }
            }
            proto = Object.getPrototypeOf(proto);
          }
          return attrs;
        },
      });
    }
  };
}

/** 按构造函数缓存聚合后的属性元数据，避免每个实例连接时重复遍历原型链。 */
const metaCache = new WeakMap<Function, PropertyMeta[]>();

function collectMeta(instance: HTMLElement): PropertyMeta[] {
  const ctor = instance.constructor;
  const cached = metaCache.get(ctor);
  if (cached) return cached;
  const seen = new Set<string>();
  const result: PropertyMeta[] = [];
  let proto = Object.getPrototypeOf(instance);
  while (proto) {
    const list = (proto as any).__zui_protoPropertyMeta as PropertyMeta[] | undefined;
    if (list) {
      for (const m of list) {
        if (!seen.has(m.key)) {
          seen.add(m.key);
          result.push(m);
        }
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  metaCache.set(ctor, result);
  return result;
}

/**
 * attribute 文本 → 属性值。**唯一一处**类型转换实现。
 *
 * [WHY 导出] `BaseElement.attributeChangedCallback` 曾经自己手写了一遍
 * （Boolean / Number / 其余当字符串），结果 Array 与 Object 属性在**元素升级之后**
 * 被 setAttribute 时退化成字符串：`items.map is not a function`，组件渲染成 0 高，
 * 而宿主只看到「这个组件不显示」。同一个转换写两遍，就一定会分叉 —— 现在只剩这一份。
 */
export function convertFromAttribute(value: string | null, type: PropertyType): unknown {
  if (type === Boolean) return value !== null;
  if (type === Number) return value ? Number(value) : 0;
  if (type === Array || type === Object) {
    try {
      return value ? JSON.parse(value) : type === Array ? [] : {};
    } catch {
      return type === Array ? [] : {};
    }
  }
  return value ?? "";
}

function toAttribute(value: unknown, type: PropertyType): string | null {
  if (type === Boolean) {
    return value ? "" : null;
  }
  if (value === null || value === undefined) return null;
  return String(value);
}

export function applyPropertyMeta(instance: HTMLElement, ctor: Function): void {
  const metaList = collectMeta(instance);
  (ctor as any).__zui_propertyMeta = metaList;
  if ((instance as any).__zui_metaApplied) return;
  (instance as any).__zui_metaApplied = true;
  const i18nDefaults: Map<string, MessageKey> =
    (instance as any).__zui_i18nDefaults ?? ((instance as any).__zui_i18nDefaults = new Map());

  for (const meta of metaList) {
    const { key, attribute, type, reflect } = meta;

    const privateKey = `__zui_prop_${key}`;

    // Capture class field default before defineProperty overwrites it
    const defaultValue = (instance as any)[key];

    Object.defineProperty(instance, key, {
      get() {
        return (instance as any)[privateKey];
      },
      set(value: unknown) {
        i18nDefaults.delete(key);
        const old = (instance as any)[privateKey];
        if (old === value) return;
        const changed = (instance as any).__zui_changedProps as Map<string, unknown> | undefined;
        if (changed && !changed.has(key)) changed.set(key, old);
        (instance as any)[privateKey] = value;

        if (reflect && attribute !== false) {
          const attrVal = toAttribute(value, type);
          if (attrVal === null) {
            instance.removeAttribute(attribute);
          } else {
            instance.setAttribute(attribute, attrVal);
          }
        }

        if ((instance as any).requestUpdate) {
          (instance as any).requestUpdate();
        }
      },
      enumerable: true,
      configurable: true,
    });

    // Initialize: HTML attribute takes priority over class field default
    if (attribute !== false) {
      // [WHY 逐个别名取第一个存在的] 静态写法 `<z-x columnstext="…">`（扁平名）在升级前
      // 是唯一能用的写法，升级后仍须能读到；规范名优先，故按 attrAliases 的顺序取首个非空。
      let attrVal: string | null = null;
      for (const name of metaAliases(meta)) {
        attrVal = instance.getAttribute(name);
        if (attrVal !== null) break;
      }
      if (attrVal !== null) {
        i18nDefaults.delete(key);
        (instance as any)[privateKey] = convertFromAttribute(attrVal, type);
      } else if (defaultValue !== undefined) {
        (instance as any)[privateKey] = defaultValue;
        if (type === String && typeof defaultValue === "string") {
          const mk = messageKeyOf(defaultValue);
          if (mk) i18nDefaults.set(key, mk);
        }
      }
    } else if (defaultValue !== undefined) {
      (instance as any)[privateKey] = defaultValue;
      if (type === String && typeof defaultValue === "string") {
        const mk = messageKeyOf(defaultValue);
        if (mk) i18nDefaults.set(key, mk);
      }
    }
  }
}

export { collectMeta as getPropertyMeta };

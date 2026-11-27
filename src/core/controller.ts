/**
 * Reactive Controller 协议（组合式生命周期单元）。
 *
 * 将跨组件复用的有状态能力（浮层、搜索防抖、焦点管理、虚拟滚动、上下文订阅等）
 * 从组件类中剥离为独立对象，通过 `host.addController(ctrl)` 自动接入宿主生命周期。
 */
export interface ReactiveController {
  /** 宿主连接到文档（或控制器在宿主已连接状态下被添加）时触发。 */
  hostConnected?(): void;
  /** 宿主从文档断开时触发，用于释放监听、定时器与外部 DOM。 */
  hostDisconnected?(): void;
  /** 宿主渲染前（willUpdate 之后、render 之前）触发。 */
  hostUpdate?(): void;
  /** 宿主渲染完成后（updated 之后）触发。 */
  hostUpdated?(): void;
}

/** 宿主组件向控制器暴露的最小契约。 */
export interface ReactiveControllerHost {
  addController<T extends ReactiveController>(controller: T): T;
  removeController(controller: ReactiveController): void;
  requestUpdate(): void;
}

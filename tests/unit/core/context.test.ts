import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BaseElement,
  ContextConsumer,
  ContextProvider,
  createContext,
  defineElement,
  html,
} from "../../../src/core/index.js";

const themeCtx = createContext<string>(Symbol("test-theme"));
const otherCtx = createContext<number>(Symbol("test-other"));

class TestProviderEl extends BaseElement {
  provider = this.addController(
    new ContextProvider(this, { context: themeCtx, initialValue: "light" }),
  );

  render(): string {
    return html`<slot></slot>`;
  }
}

class TestConsumerEl extends BaseElement {
  onChange = vi.fn();
  consumer = this.addController(
    new ContextConsumer(this, {
      context: themeCtx,
      callback: (v) => this.onChange(v),
    }),
  );

  render(): string {
    return html`<span class="val">${this.consumer.value ?? "none"}</span>`;
  }
}

defineElement("z-test-ctx-provider", TestProviderEl);
defineElement("z-test-ctx-consumer", TestConsumerEl);

describe("Context Protocol (ContextProvider / ContextConsumer)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("子组件挂载时自动获取初始值，setValue 时响应式广播并重渲染", async () => {
    const provider = document.createElement("z-test-ctx-provider") as TestProviderEl;
    const consumer = document.createElement("z-test-ctx-consumer") as TestConsumerEl;
    provider.appendChild(consumer);
    document.body.appendChild(provider);
    await Promise.resolve();

    expect(consumer.consumer.value).toBe("light");
    expect(consumer.shadowRoot?.querySelector(".val")?.textContent).toBe("light");
    expect(consumer.onChange).toHaveBeenCalledWith("light");

    provider.provider.setValue("dark");
    await Promise.resolve();

    expect(consumer.consumer.value).toBe("dark");
    expect(consumer.shadowRoot?.querySelector(".val")?.textContent).toBe("dark");
    expect(consumer.onChange).toHaveBeenCalledWith("dark");
  });

  it("相同值 setValue 不重复广播；force=true 强制广播", async () => {
    const provider = document.createElement("z-test-ctx-provider") as TestProviderEl;
    const consumer = document.createElement("z-test-ctx-consumer") as TestConsumerEl;
    provider.appendChild(consumer);
    document.body.appendChild(provider);
    await Promise.resolve();

    consumer.onChange.mockClear();
    provider.provider.setValue("light");
    expect(consumer.onChange).not.toHaveBeenCalled();

    provider.provider.setValue("light", true);
    expect(consumer.onChange).toHaveBeenCalledTimes(1);
  });

  it("消费者断开后自动取消订阅，且不同 Context 键互不干扰", async () => {
    const provider = document.createElement("z-test-ctx-provider") as TestProviderEl;
    const consumer = document.createElement("z-test-ctx-consumer") as TestConsumerEl;
    const otherConsumer = consumer.addController(
      new ContextConsumer(consumer, { context: otherCtx }),
    );
    provider.appendChild(consumer);
    document.body.appendChild(provider);
    await Promise.resolve();

    expect(otherConsumer.value).toBeUndefined();
    consumer.onChange.mockClear();

    consumer.remove();
    provider.provider.setValue("high-contrast");
    expect(consumer.onChange).not.toHaveBeenCalled();
  });
});

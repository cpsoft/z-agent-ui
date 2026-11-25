// 跨应用切换器的示例接线（app.html）。
//
// 只在 app.html 演示：它的场景是「后台顶栏左侧那个品牌名，点开跳到别的系统」，
// 摆在控件页里没有语境。
import "../../src/app/app-switcher/index.js";

interface SwitchItem {
  app: string;
  name?: string;
  icon?: string;
  url?: string;
}

const APPS: SwitchItem[] = [
  { app: "dashboard", name: "数据看板" },
  { app: "etl", name: "数据集成" },
  { app: "store", name: "门店运营" },
  { app: "hr", name: "人事" },
];

const switcher = document.getElementById("app-switcher") as
  | (HTMLElement & { apps: SwitchItem[]; current: string })
  | null;
const log = document.getElementById("switcher-log");

if (switcher) {
  // `apps` 是 `attribute: false` 的数组属性：
  // 数组反射成 attribute 只会得到 `[object Object]`（见组件头注释）。
  switcher.apps = APPS;
  switcher.current = "dashboard";

  switcher.addEventListener("z-switch", (e) => {
    const detail = (e as CustomEvent<{ app: string; item?: SwitchItem }>).detail;
    const name = detail?.item?.name ?? detail?.app ?? "?";
    if (log) log.textContent = `z-switch：切到「${name}」（app=${detail?.app}）—— 真实宿主在这里跳转/路由`;
  });
}

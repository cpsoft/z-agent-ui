// [WHY 把 z-radio 一起引进来 2026-11-18] `RadioGroup.ts` 只 `import { ZRadio }` 用在
// **类型位置**（`_getRadios(): ZRadio[]` 与类型断言），类型擦除后那个 import 会被编译器删掉
// —— 于是 `<z-radio-group>` 单独被加载时，组内的 `<z-radio>` 是**未升级的空标签**：
// 槽里的文字还在（light DOM），但圆点、选中态、点击选中全都不存在。
// 症状是「单选组能看见文字、点不动」，控制台干净。与 `select/index.ts` 里 z-option 的坑同源。
import "../radio/Radio.js";
import "./RadioGroup.js";
export { ZRadioGroup } from "./RadioGroup.js";

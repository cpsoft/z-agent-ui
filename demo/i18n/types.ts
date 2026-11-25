// demo 站点文案表的公共类型。
//
// 语言表与 i18n API 共用的类型。类型抽在这里，避免两份语言表与 API 模块互相 import。

export type Lang = "en" | "zh";

export interface Messages {
  [key: string]: string | Messages;
}

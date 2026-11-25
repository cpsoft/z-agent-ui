import "./CodeEditor.js";
export { ZCodeEditor, indentSelection, applyBracketPair, deletePairBackward, autoIndent } from "./CodeEditor.js";
export { highlightCode, detectLanguage, getKeywords } from "./highlight.js";
export { extractWords, getWordPrefix, filterItems, applyCompletion, findCallContext, defaultItems } from "./autocomplete.js";
export type { CodeLanguage } from "./highlight.js";
export type { CompletionItem, CallContext, ApplyResult } from "./autocomplete.js";

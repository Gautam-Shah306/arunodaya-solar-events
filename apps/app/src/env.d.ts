/// <reference types="vite/client" />

declare const __AR_DEBUG__: boolean;

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

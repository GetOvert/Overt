// This file defines the TypeScript type of imported asset modules.
// https://webpack.js.org/guides/typescript/#importing-other-assets

declare module "*.lit.css" {
  const content: CSSStyleSheet;
  export default content;
}

declare module "*.svg" {
  const content: any;
  export default content;
}

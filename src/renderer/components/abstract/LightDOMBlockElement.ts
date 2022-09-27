import { CSSResult, CSSResultGroup, html, LitElement, render } from "lit";

let processedElementClasses: Set<typeof LightDOMBlockElement> = new Set();

export default abstract class LightDOMBlockElement extends LitElement {
  abstract get customElementName(): string;

  constructor() {
    super();

    this.classList.add("d-block");

    const cls = this.constructor as typeof LightDOMBlockElement;
    if (!processedElementClasses.has(cls)) {
      processedElementClasses.add(cls);

      const styles = cls.styles;
      if (styles) this.applyStyles(styles);
    }
  }

  private applyStyles(cssResultGroup: CSSResultGroup) {
    if (Array.isArray(cssResultGroup)) {
      for (const cssResult of cssResultGroup) {
        this.applyStyles(cssResult);
      }
    } else {
      if (cssResultGroup instanceof CSSResult) {
        cssResultGroup = cssResultGroup.styleSheet!;
      }

      for (const rule of cssResultGroup.cssRules) {
        this.modifyStyleRule(rule);
      }

      const style = this.ownerDocument.createElement("style");
      this.ownerDocument.head.appendChild(style);
      for (const rule of cssResultGroup.cssRules) {
        style.append(rule.cssText);
      }
    }
  }

  private modifyStyleRule(rule: CSSRule) {
    if (rule instanceof CSSGroupingRule) {
      for (const subrule of rule.cssRules) {
        this.modifyStyleRule(subrule);
      }
    } else if (rule instanceof CSSStyleRule) {
      let selectorText = rule.selectorText;
      selectorText = selectorText.replace(/\s*:host/i, "");
      rule.selectorText = selectorText.replace(
        /(^|(?<=,))/,
        ` ${this.customElementName} `
      );
    }
  }

  createRenderRoot(): Element {
    return this;
  }
}

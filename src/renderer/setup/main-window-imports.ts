import theme from "renderer/preload/shared/theme";
window.theme = theme;

import "bootswatch/dist/sandstone/bootstrap.min.css";
import "renderer/styles/all.css";
import "renderer/styles/injection";

export { default as BootstrapBlockElement } from "renderer/components/abstract/BootstrapBlockElement";
export { default as LightDOMBlockElement } from "renderer/components/abstract/LightDOMBlockElement";

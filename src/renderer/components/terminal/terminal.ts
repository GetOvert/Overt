import { Terminal } from "xterm";
import { WebglAddon } from "xterm-addon-webgl";
import "xterm/css/xterm.css";

const xterm = new Terminal({
  disableStdin: true,
  cursorStyle: "bar",
  cols: 220,
  rows: 26,
  // For some reason, the WebGL addon seems to require proposed API
  // I can't find documentation stating this, but an error is thrown
  // from `#loadAddon` if this is `false`
  allowProposedApi: true,
});

const webglAddon = new WebglAddon();
// https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-webgl#handling-context-loss
webglAddon.onContextLoss(() => webglAddon.dispose());

xterm.open(document.querySelector("#terminal")!);
xterm.loadAddon(webglAddon);

window.terminal.onReceive((data) => xterm.write(data));

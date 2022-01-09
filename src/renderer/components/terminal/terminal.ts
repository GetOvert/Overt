import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { FitAddon } from "xterm-addon-fit";

const terminal = new Terminal();

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

terminal.open(document.querySelector("#terminal"));

((window as any).openStore as any).fitTerminal = () => {
  fitAddon.fit();
};
new MutationObserver(((window as any).openStore as any).fitTerminal).observe(
  document.body,
  {
    attributes: true,
    childList: true,
    subtree: true,
  }
);
window.addEventListener(
  "resize",
  ((window as any).openStore as any).fitTerminal
);

window.terminal.onReceive((data) => terminal.write(data));
terminal.onData((data) => window.terminal.send(data));

import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const xterm = new Terminal({
  disableStdin: true,
  cursorStyle: "bar",
  cols: 220,
  rows: 26,
});

xterm.open(document.querySelector("#terminal")!);

window.terminal.onReceive((data) => xterm.write(data));

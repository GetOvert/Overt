// SECTION: Initialization

let url;

document.addEventListener("DOMContentLoaded", async () => {
  await init();
  await render();
});

async function init() {
  const tab = await getCurrentTab();
  url = tab.url;
}

// !SECTION

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message.url) return;

  url = message.url;

  render();
});

async function render() {
  if (!url) {
    document.querySelector("#install").classList.add("d-none");
    document.querySelector("#noInstall").classList.remove("d-none");
    return;
  }

  const res = await fetch("https://formulae.brew.sh/api/cask.json");
  const casks = await res.json();

  const cask = casks.find(
    (cask) => cask.homepage && url.startsWith(cask.homepage)
  );
  if (!cask) {
    document.querySelector("#install").classList.add("d-none");
    document.querySelector("#noInstall").classList.remove("d-none");
    return;
  }

  document.querySelector("#noInstall").classList.add("d-none");
  document.querySelector("#install").classList.remove("d-none");

  document.querySelector("#link").href = cask?.name[0]
    ? `overt:brew-cask?1=install&1[name]=${cask.token}`
    : "";
  document.querySelector("#cask").textContent = cask?.name[0] ?? "[none]";
  document.querySelector(
    "#caskIcon"
  ).src = `https://storage.googleapis.com/storage.getovert.app/brew/homebrew/cask/${cask.token}.png`;
  document.querySelector("#caskIcon").ariaLabel = `Icon for ${cask.name[0]}`;
}

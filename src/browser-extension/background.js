chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  const url = change.url;
  if (!url) return;

  await Promise.all([
    (async () => {
      const cask = await caskForURL(url);
      if (cask) {
        await chrome.action.setBadgeBackgroundColor({ color: "#93c54b" });
        await chrome.action.setBadgeText({ tabId, text: "!" });
      }
    })(),
    (async () => {
      // https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage
      void (await chrome.runtime.sendMessage({
        tabId,
        url,
      }));
    })(),
  ]);
});

async function caskForURL(url) {
  const res = await fetch("https://formulae.brew.sh/api/cask.json");
  const casks = await res.json();

  return casks.find((cask) => cask.homepage && url.startsWith(cask.homepage));
}

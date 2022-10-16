window.openStore ||= {};
window.openStore.pages ||= {};

window.addEventListener("popstate", () => {
  window.openStore.displayPageForWindowLocation(
    document.querySelector("#content")
  );
});

new MutationObserver(() => {
  document
    .querySelectorAll(".openstore-jsnav-back-link")
    .forEach((backLink) => {
      if (!backLink.openStoreHandlerSetForBackLink) {
        backLink.openStoreHandlerSetForBackLink = true;
        backLink.addEventListener("click", async () => {
          window.history.back();
        });
      }
    });
}).observe(document.body, { attributes: true, childList: true, subtree: true });

window.openStore.encodeFragment = (routeParams) => {
  return "#" + encodeURIComponent(JSON.stringify(routeParams));
};
window.openStore.decodeFragment = (fragment) => {
  if (!fragment) return {};
  return JSON.parse(decodeURIComponent(fragment.slice(1)));
};

window.openStore.updateWindowLocationFragment = async (fragment) => {
  const routeParams = window.openStore.decodeFragment(window.location.hash);
  const routeParamsPatch =
    typeof fragment === "object"
      ? fragment
      : window.openStore.decodeFragment(fragment);
  const newRouteParams = { ...routeParams, ...routeParamsPatch };

  const newFragment = window.openStore.encodeFragment(newRouteParams);
  if (window.location.hash !== newFragment) {
    window.location.hash = newFragment;
  }
};

window.openStore.displayPageForWindowLocation = async (target) => {
  await window.openStore.displayPageForFragment(window.location.hash, target);
};
window.openStore.displayPageForAnchorElement = async (
  anchorElement,
  target
) => {
  await window.openStore.displayPageForFragment(
    window.openStore.pageForURLString(new URL(anchorElement.href).hash),
    target
  );
};
window.openStore.displayPageForFragment = async (fragment, target) => {
  const routeParams = window.openStore.decodeFragment(fragment);
  await window.openStore.displayPage(
    window.openStore.pages["apps"], // TODO: Rework this entire thing anyway
    routeParams.subpage ?? null,
    target
  );
};
window.openStore.displayPage = async (page, subpage, target) => {
  // Clear the target content area
  target.replaceChildren();

  if (subpage) page = await page.getSubpage(subpage);

  if (page) {
    const pageTitleDocumentFragment = document
      .querySelector("#openstore-template-page-title")
      .content.cloneNode(true);

    // Change page title
    if (page.title) {
      pageTitleDocumentFragment.querySelector(
        "#openstore-page-title"
      ).textContent = page.title;
    } else {
      for (const child of pageTitleDocumentFragment.children) {
        child.classList.add("d-none");
      }
    }

    // Control "back" link visibility
    pageTitleDocumentFragment
      .querySelectorAll(".openstore-jsnav-back-link")
      .forEach((backLink) => {
        if (page.isSubpage) {
          backLink.classList.remove("d-none");
        } else {
          backLink.classList.add("d-none");
        }
      });

    target.replaceChildren(pageTitleDocumentFragment);

    if (page.isSubpage) {
      window.scrollTo({ top: 0 });
    }
  }

  // Display loading template
  const loadingDocumentFragment = document
    .querySelector("#openstore-template-loading")
    .content.cloneNode(true);
  loadingDocumentFragment.querySelector(".openstore-loading-container").id =
    "displayPage-loading-indicator";
  target.append(loadingDocumentFragment);

  const renderingContainer = document.createElement("div");

  // Let the page do its setup
  if (page && page.onNavigatedTo) await page.onNavigatedTo(renderingContainer);

  target.append(renderingContainer);

  // Remove loading template
  target.querySelector("#displayPage-loading-indicator")?.remove();
};

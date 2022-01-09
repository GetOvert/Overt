window.openStore.pages["#other-programs"] = {
  title: "Other programs",

  async onNavigatedTo() {
    const content = document.querySelector("#content");

    const grid = document
      .querySelector("#openstore-template-grid")
      .content.cloneNode(true);

    const rowTemplate = document.querySelector(
      "#openstore-template-grid-row"
    ).content;
    const cardTemplate = document.querySelector(
      "#openstore-template-card"
    ).content;

    for (let i = 0; i < 1; i++) {
      const row = rowTemplate.cloneNode(true);
      row.querySelectorAll(".col").forEach((col) => {
        const card = cardTemplate.cloneNode(true);
        col.replaceChildren(card);
      });

      grid.append(row);
    }

    content.append(grid);
  },
};

(() => {
  const editableNodes = Array.from(document.querySelectorAll("[data-editable]"));
  const isLocalhost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  const editMode = isLocalhost && new URLSearchParams(window.location.search).get("edit") === "1";
  const storageKey = "academic-template-content";

  if (!editableNodes.length) {
    return;
  }

  const applyContent = (content) => {
    editableNodes.forEach((node) => {
      const key = node.dataset.editable;
      if (Object.prototype.hasOwnProperty.call(content, key)) {
        node.innerHTML = content[key];
      }
    });
  };

  const collectContent = () => {
    const content = {};
    editableNodes.forEach((node) => {
      content[node.dataset.editable] = node.innerHTML.trim();
    });
    return content;
  };

  const loadContent = async () => {
    try {
      const response = await fetch("data/site-content.json", { cache: "no-store" });
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      const localCopy = window.localStorage.getItem(storageKey);
      if (localCopy) {
        return JSON.parse(localCopy);
      }
    }

    return {};
  };

  const downloadJson = (content) => {
    const blob = new Blob([`${JSON.stringify(content, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "site-content.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const saveContent = async (statusNode) => {
    const content = collectContent();

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(content)
      });

      if (!response.ok) {
        throw new Error("Save endpoint unavailable");
      }

      statusNode.textContent = "Saved to data/site-content.json";
    } catch (error) {
      window.localStorage.setItem(storageKey, JSON.stringify(content));
      downloadJson(content);
      statusNode.textContent = "Downloaded JSON backup";
    }
  };

  const enableEditor = () => {
    document.body.classList.add("template-edit-mode");
    editableNodes.forEach((node) => {
      node.setAttribute("contenteditable", "true");
      node.setAttribute("spellcheck", "true");
    });

    const toolbar = document.createElement("div");
    toolbar.className = "template-editor-bar";
    toolbar.innerHTML = `
      <span>Local edit mode</span>
      <button type="button" data-template-save>Save</button>
      <button type="button" data-template-export>Export JSON</button>
      <a href="${window.location.pathname || "index.html"}">Exit</a>
      <small data-template-status>Editing page text only</small>
    `;
    document.body.appendChild(toolbar);

    const statusNode = toolbar.querySelector("[data-template-status]");
    toolbar.querySelector("[data-template-save]").addEventListener("click", () => saveContent(statusNode));
    toolbar.querySelector("[data-template-export]").addEventListener("click", () => {
      downloadJson(collectContent());
      statusNode.textContent = "Downloaded JSON";
    });
  };

  loadContent().then((content) => {
    applyContent(content);
    if (editMode) {
      enableEditor();
    }
  });
})();

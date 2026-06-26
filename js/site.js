(() => {
  const keywordData = window.RESEARCH_KEYWORD_DATA || null;
  const wordCloud = document.querySelector("[data-wordcloud]");

  const renderWordCloud = () => {
    if (!wordCloud || !keywordData || !Array.isArray(keywordData.keywords)) {
      return;
    }

    wordCloud.textContent = "";

    keywordData.keywords.forEach((keyword) => {
      const button = document.createElement("button");
      const scale = Number(keyword.scale || 1);
      const sizeClass = scale >= 2.15 ? " cloud-xl" : scale >= 1.45 ? " cloud-lg" : " cloud-md";
      button.className = `theme-word${sizeClass}${keyword.highlight ? " is-highlight" : ""}`;
      button.type = "button";
      button.dataset.keyword = keyword.slug;
      button.dataset.group = keyword.group;
      button.style.setProperty("--s", String(scale));
      button.style.setProperty("--cloud-order", String(keyword.order || 0));
      button.style.setProperty("--word-color", keyword.color || "#334155");
      button.textContent = keyword.label;
      button.title = `${keyword.label}: ${keyword.count} publication${keyword.count === 1 ? "" : "s"}`;
      wordCloud.appendChild(button);
    });
  };

  renderWordCloud();

  const cards = Array.from(document.querySelectorAll(".publication-card, [data-publication-item]"));
  const publicationSections = Array.from(document.querySelectorAll("[data-publication-section]"));
  const filterButtons = Array.from(document.querySelectorAll(".filter-chip, .theme-node, .theme-word[data-keyword]"));
  const themeWords = Array.from(document.querySelectorAll(".theme-word"));
  const searchInput = document.querySelector("#publication-search");
  const emptyState = document.querySelector(".empty-state");
  const filterSummary = document.querySelector("[data-filter-summary]");
  const filterResults = document.querySelector("[data-filter-results]");
  const copyButton = document.querySelector(".copy-email");
  const lightbox = document.querySelector("[data-photo-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxOpeners = Array.from(document.querySelectorAll("[data-lightbox-src]"));
  const lightboxClosers = Array.from(document.querySelectorAll("[data-lightbox-close]"));
  const markdownEditor = document.querySelector("[data-markdown-editor]");
  const markdownPreview = document.querySelector("[data-markdown-preview]");
  const markdownInsertButtons = Array.from(document.querySelectorAll("[data-markdown-insert]"));

  const setupMobileProfileIntro = () => {
    const homeShell = document.querySelector("#top.site-shell");
    const profileSidebar = homeShell ? homeShell.querySelector(".profile-sidebar") : null;

    if (!profileSidebar) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 560px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let collapseTimer = null;
    let settleTimer = null;

    const clearCollapseTimer = () => {
      if (collapseTimer) {
        window.clearTimeout(collapseTimer);
        collapseTimer = null;
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = null;
      }
    };

    const collapseProfile = (options = {}) => {
      clearCollapseTimer();
      document.body.classList.add("is-mobile-profile-collapsed");
      if (options.instant) {
        document.body.classList.add("is-mobile-profile-collapse-complete");
        return;
      }
      settleTimer = window.setTimeout(() => {
        document.body.classList.add("is-mobile-profile-collapse-complete");
      }, 650);
    };

    const scheduleProfileIntro = () => {
      clearCollapseTimer();
      document.body.classList.remove("is-mobile-profile-collapsed");
      document.body.classList.remove("is-mobile-profile-collapse-complete");

      if (!mobileQuery.matches) {
        return;
      }

      const shouldSkipIntro = window.location.hash && window.location.hash !== "#top";
      if (shouldSkipIntro || reducedMotionQuery.matches) {
        collapseProfile({ instant: true });
        return;
      }

      collapseTimer = window.setTimeout(collapseProfile, 2000);
    };

    const collapseOnUserScroll = () => {
      if (mobileQuery.matches && window.scrollY > 4) {
        collapseProfile();
      }
    };

    scheduleProfileIntro();

    mobileQuery.addEventListener("change", scheduleProfileIntro);
    reducedMotionQuery.addEventListener("change", scheduleProfileIntro);
    window.addEventListener("scroll", collapseOnUserScroll, { passive: true });
  };

  setupMobileProfileIntro();

  const defaultFilter = filterResults ? filterResults.dataset.defaultFilter || "all" : "all";

  let activeFilter = defaultFilter;
  let activeKeyword = "";
  let activeLabel = "";
  let searchTerm = "";
  let lastLightboxOpener = null;

  const filterLabels = {
    all: "All selected publications",
    featured: "Featured publications",
    robotics: "Robotics",
    vision: "Vision",
    reasoning: "Reasoning",
    rl: "Reinforcement learning",
    generalization: "Generalization",
    "data-efficiency": "Data efficiency",
    visuomotor: "Visuomotor policies",
    llms: "LLMs",
    workshop: "Workshops"
  };

  const normalize = (value) => value.trim().toLowerCase();

  const getCloudFontRange = () => {
    if (window.matchMedia("(max-width: 560px)").matches) {
      return { min: 8.5, max: 16.25 };
    }
    if (window.matchMedia("(max-width: 900px)").matches) {
      return { min: 10, max: 26.13 };
    }
    return { min: 11, max: 27.5 };
  };

  const updateCloudWordSizes = () => {
    const { min, max } = getCloudFontRange();
    const minScale = 0.88;
    const maxScale = 2.75;

    themeWords.forEach((word) => {
      const scale = Number.parseFloat(word.style.getPropertyValue("--s")) || 1;
      const ratio = Math.min(1, Math.max(0, (scale - minScale) / (maxScale - minScale)));
      word.style.setProperty("--cloud-font-size", `${(min + ratio * (max - min)).toFixed(2)}px`);
    });
  };

  const applyPaperKeywordData = () => {
    if (!keywordData || !keywordData.papers) {
      return;
    }

    cards.forEach((card) => {
      const paperId = card.dataset.paperId;
      const keywords = paperId ? keywordData.papers[paperId] : null;

      if (Array.isArray(keywords)) {
        card.dataset.keywords = keywords.join(" ");
      }
    });
  };

  const setActiveFilter = (filter, options = {}) => {
    activeFilter = filter;
    activeKeyword = options.keyword || "";
    activeLabel = options.label || "";
    filterButtons.forEach((button) => {
      const buttonFilter = button.dataset.filter || (button.dataset.keyword ? "keyword" : "");
      const buttonKeyword = button.dataset.keyword || "";
      const isActive = activeKeyword
        ? buttonFilter === "keyword" && buttonKeyword === activeKeyword
        : buttonFilter === filter;

      button.classList.toggle("is-active", isActive);
    });
    if (filterSummary) {
      filterSummary.textContent = activeLabel || filterLabels[filter] || `${filter} publications`;
    }
    applyFilters();
  };

  const cardMatchesFilter = (card) => {
    if (activeFilter === "all") {
      return true;
    }
    if (activeFilter === "featured") {
      return card.dataset.featuredPublication === "true";
    }
    if (activeFilter === "keyword") {
      const keywordMatches = keywordData && keywordData.keywordToPapers
        ? keywordData.keywordToPapers[activeKeyword]
        : null;
      if (Array.isArray(keywordMatches)) {
        return keywordMatches.includes(card.dataset.paperId || "");
      }
      return (card.dataset.keywords || "").split(" ").includes(activeKeyword);
    }
    return (card.dataset.topic || "").split(" ").includes(activeFilter);
  };

  const cardMatchesSearch = (card) => {
    if (!searchTerm) {
      return true;
    }
    return (card.dataset.search || card.textContent.toLowerCase()).includes(searchTerm);
  };

  const applyFilters = () => {
    let visibleCount = 0;

    cards.forEach((card) => {
      const isVisible = cardMatchesFilter(card) && cardMatchesSearch(card);
      card.classList.toggle("is-hidden", !isVisible);
      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }

    publicationSections.forEach((section) => {
      const sectionItems = Array.from(section.querySelectorAll("[data-publication-item]"));
      section.hidden = sectionItems.length > 0 && sectionItems.every((item) => item.hidden);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.keyword) {
        setActiveFilter("keyword", {
          keyword: button.dataset.keyword,
          label: button.textContent.trim()
        });
      } else {
        setActiveFilter(button.dataset.filter);
      }

      if (button.classList.contains("theme-word") && filterResults) {
        filterResults.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchTerm = normalize(event.target.value);
      applyFilters();
    });
  }

  if (themeWords.length) {
    updateCloudWordSizes();
    window.addEventListener("resize", updateCloudWordSizes);
  }

  if (cards.length) {
    applyPaperKeywordData();
    setActiveFilter(defaultFilter);
  }

  document.querySelectorAll(".publication-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".publication-card, .publication-list-item");
      const details = card ? card.querySelector(".publication-details") : null;
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      const collapsedLabel = button.dataset.collapsedLabel || "Details";
      const expandedLabel = button.dataset.expandedLabel || "Hide";

      if (!details) {
        return;
      }

      button.setAttribute("aria-expanded", String(!isExpanded));
      button.textContent = isExpanded ? collapsedLabel : expandedLabel;
      details.hidden = isExpanded;
    });
  });

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const originalLabel = copyButton.getAttribute("aria-label") || "Copy email address";
      const originalTitle = copyButton.getAttribute("title") || originalLabel;

      try {
        await copyText(copyButton.dataset.email);
        copyButton.setAttribute("aria-label", "Copied email address");
        copyButton.setAttribute("title", "Copied");
        copyButton.classList.add("is-copied");
      } catch (error) {
        copyButton.setAttribute("aria-label", "Could not copy email address");
        copyButton.setAttribute("title", "Copy failed");
      }

      window.setTimeout(() => {
        copyButton.setAttribute("aria-label", originalLabel);
        copyButton.setAttribute("title", originalTitle);
        copyButton.classList.remove("is-copied");
      }, 1800);
    });
  }

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

  const safeUrl = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return "#";
    }
    if (/^(https?:)?\/\//i.test(trimmed) || /^[./#\w-]/.test(trimmed)) {
      return trimmed;
    }
    return "#";
  };

  const renderFormulaText = (value) => {
    const replacements = {
      "\\alpha": "&alpha;",
      "\\beta": "&beta;",
      "\\Delta": "&Delta;",
      "\\lambda": "&lambda;",
      "\\mu": "&mu;",
      "\\pi": "&pi;",
      "\\sigma": "&sigma;",
      "\\sum": "&sum;",
      "\\theta": "&theta;"
    };
    let output = escapeHtml(value);

    Object.entries(replacements).forEach(([source, replacement]) => {
      output = output.split(source).join(replacement);
    });

    output = output.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");
    output = output.replace(/_(&[a-zA-Z]+;|[A-Za-z0-9]+)/g, "<sub>$1</sub>");
    output = output.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>");
    output = output.replace(/\^([A-Za-z0-9]+)/g, "<sup>$1</sup>");

    return output;
  };

  const renderInlineMarkdown = (value) => {
    let output = escapeHtml(value);

    output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
    output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const href = escapeAttribute(safeUrl(url));
      return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    });
    output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    output = output.replace(/\$([^$\n]+)\$/g, (_, formula) => `<span class="markdown-formula">${renderFormulaText(formula)}</span>`);

    return output;
  };

  const renderMarkdownImage = (alt, src) => {
    const safeSrc = escapeAttribute(safeUrl(src));
    const safeAlt = escapeAttribute(alt);
    const caption = alt ? `<figcaption>${renderInlineMarkdown(alt)}</figcaption>` : "";

    return `<figure class="markdown-figure"><img src="${safeSrc}" alt="${safeAlt}" loading="lazy">${caption}</figure>`;
  };

  const renderMarkdownVideo = (title, src) => {
    const safeSrc = escapeAttribute(safeUrl(src));
    const label = title || "Video";
    const safeLabel = escapeAttribute(label);
    const lowerSrc = String(src || "").toLowerCase();

    if (src.includes("VIDEO_ID")) {
      return `<div class="markdown-video-placeholder"><span>${renderInlineMarkdown(label)}</span><code>${escapeHtml(src)}</code></div>`;
    }

    if (/\.(mp4|webm|ogg)([?#].*)?$/i.test(lowerSrc)) {
      return `<figure class="markdown-video"><video controls preload="metadata" src="${safeSrc}" aria-label="${safeLabel}"></video><figcaption>${renderInlineMarkdown(label)}</figcaption></figure>`;
    }

    if (/youtube\.com\/embed|player\.vimeo\.com\/video/i.test(lowerSrc)) {
      return `<figure class="markdown-video"><iframe src="${safeSrc}" title="${safeLabel}" loading="lazy" allowfullscreen></iframe><figcaption>${renderInlineMarkdown(label)}</figcaption></figure>`;
    }

    return `<div class="markdown-video-placeholder"><span>${renderInlineMarkdown(label)}</span><code>${escapeHtml(src)}</code></div>`;
  };

  const isMarkdownBlockStart = (line) => {
    const trimmed = line.trim();
    return !trimmed
      || /^#{1,4}\s/.test(trimmed)
      || /^```/.test(trimmed)
      || /^\$\$/.test(trimmed)
      || /^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)
      || /^@\[[^\]]*\]\([^)]+\)$/.test(trimmed)
      || /^>\s?/.test(trimmed)
      || /^[-*]\s+/.test(trimmed)
      || /^---+$/.test(trimmed);
  };

  const renderMarkdown = (markdown) => {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      const fenceMatch = trimmed.match(/^```(\w+)?/);
      if (fenceMatch) {
        const language = fenceMatch[1] || "";
        const code = [];
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          code.push(lines[index]);
          index += 1;
        }
        index += 1;
        const languageLabel = language ? `<span>${escapeHtml(language)}</span>` : "";
        html.push(`<pre class="markdown-code">${languageLabel}<code>${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      if (trimmed.startsWith("$$")) {
        const formula = [];
        const inlineFormula = trimmed.replace(/^\$\$/, "").replace(/\$\$$/, "").trim();
        if (inlineFormula) {
          formula.push(inlineFormula);
        }
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("$$")) {
          formula.push(lines[index]);
          index += 1;
        }
        index += 1;
        html.push(`<div class="markdown-formula-block">${renderFormulaText(formula.join("\n").trim())}</div>`);
        continue;
      }

      const videoMatch = trimmed.match(/^@\[([^\]]*)\]\(([^)]+)\)$/);
      if (videoMatch) {
        html.push(renderMarkdownVideo(videoMatch[1], videoMatch[2]));
        index += 1;
        continue;
      }

      const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        html.push(renderMarkdownImage(imageMatch[1], imageMatch[2]));
        index += 1;
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length + 1, 5);
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        html.push("<hr>");
        index += 1;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        const quote = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
          quote.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        html.push(`<blockquote>${renderInlineMarkdown(quote.join(" "))}</blockquote>`);
        continue;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        const items = [];
        while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
          items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
          index += 1;
        }
        html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
        continue;
      }

      const paragraph = [trimmed];
      index += 1;
      while (index < lines.length && !isMarkdownBlockStart(lines[index])) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    }

    return html.join("");
  };

  if (markdownEditor && markdownPreview) {
    const updatePreview = () => {
      markdownPreview.innerHTML = renderMarkdown(markdownEditor.value);
    };

    const snippets = {
      code: "\n```python\n# Add code here\nresult = model(input)\n```\n",
      formula: "\n$$\nL(\\theta) = \\sum_t ||a_t - \\pi_\\theta(o_t)||_2^2\n$$\n",
      image: "\n![Image caption](images/paper_teaser/palm.png)\n",
      video: "\n@[Video caption](https://www.youtube.com/embed/VIDEO_ID)\n"
    };

    markdownInsertButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const snippet = snippets[button.dataset.markdownInsert] || "";
        const start = markdownEditor.selectionStart;
        const end = markdownEditor.selectionEnd;
        const before = markdownEditor.value.slice(0, start);
        const after = markdownEditor.value.slice(end);
        markdownEditor.value = `${before}${snippet}${after}`;
        markdownEditor.focus();
        markdownEditor.setSelectionRange(start + snippet.length, start + snippet.length);
        updatePreview();
      });
    });

    markdownEditor.addEventListener("input", updatePreview);
    updatePreview();
  }

  const closeLightbox = () => {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    if (document.fullscreenElement === lightbox && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    lightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");

    if (lightboxImage) {
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
    }

    if (lastLightboxOpener) {
      lastLightboxOpener.focus();
    }
  };

  const openLightbox = (opener) => {
    if (!lightbox || !lightboxImage) {
      return false;
    }

    lastLightboxOpener = opener;
    lightboxImage.src = opener.dataset.lightboxSrc;
    lightboxImage.alt = opener.dataset.lightboxAlt || "";
    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");

    if (lightbox.requestFullscreen) {
      lightbox.requestFullscreen().catch(() => {});
    }

    const closeButton = lightbox.querySelector(".photo-lightbox-close");
    if (closeButton) {
      closeButton.focus();
    }

    return true;
  };

  lightboxOpeners.forEach((opener) => {
    opener.addEventListener("click", (event) => {
      if (openLightbox(opener)) {
        event.preventDefault();
      }
    });
  });

  lightboxClosers.forEach((closer) => {
    closer.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    if (lightbox && !document.fullscreenElement && !lightbox.hidden) {
      closeLightbox();
    }
  });
})();

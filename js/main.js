(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const isText = (value) => typeof value === "string" && value.trim().length > 0;
  const asArray = (value) => (Array.isArray(value) ? value : []);

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (isText(text)) node.textContent = text;
    return node;
  }

  function appendText(parent, tag, className, text) {
    if (!isText(text)) return null;
    const node = makeElement(tag, className, text);
    parent.append(node);
    return node;
  }

  function setSectionLabel(section, titleId, fallbackLabel) {
    if (!section) return;
    if (titleId) section.setAttribute("aria-labelledby", titleId);
    else if (isText(fallbackLabel)) section.setAttribute("aria-label", fallbackLabel);
  }

  function makeKicker(text) {
    return isText(text) ? makeElement("p", "section-kicker", text) : null;
  }

  function makeTitle(tag, className, text, id) {
    if (!isText(text)) return null;
    const title = makeElement(tag, className, text);
    if (id) title.id = id;
    return title;
  }

  function makeLineTitle(tag, className, lines, id) {
    const validLines = asArray(lines).filter(isText);
    if (!validLines.length) return null;
    const title = makeElement(tag, className);
    if (id) title.id = id;
    validLines.forEach((line) => {
      title.append(makeElement("span", `${className}-line`, line));
    });
    return title;
  }

  function makeAction(action) {
    if (!action || !isText(action.label) || !isText(action.target)) return null;
    const link = makeElement("a", `button button--${action.style === "secondary" ? "secondary" : "primary"}`, action.label);
    link.href = `#${action.target}`;
    return link;
  }

  function makeImage(visual, className) {
    if (!visual || !isText(visual.src)) return null;
    const image = document.createElement("img");
    image.className = className;
    image.src = visual.src;
    image.alt = isText(visual.alt) ? visual.alt : "";
    image.width = 1600;
    image.height = 1000;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.hidden = true;
      image.parentElement?.classList.add("image-missing");
    });
    return image;
  }

  function mediaToken(value, fallback = "default") {
    if (!isText(value)) return fallback;
    const token = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    return token || fallback;
  }

  function makeMedia(media, className = "") {
    if (!media || typeof media !== "object") return null;
    const type = media.type === "video" ? "video" : "image";
    const source = isText(media.src) ? media.src : "";
    const poster = isText(media.poster) ? media.poster : "";
    const fallbackSource = isText(media.fallbackSrc) ? media.fallbackSrc : "";
    const initialImageSource = type === "image" ? source : poster || fallbackSource;
    if (!source && !initialImageSource) return null;

    const variant = mediaToken(media.variant);
    const fit = media.fit === "cover" ? "cover" : "contain";
    const frame = makeElement(
      "div",
      `product-media product-media--${variant} product-media--fit-${fit}${className ? ` ${className}` : ""}`
    );
    frame.dataset.mediaType = type;

    const fallback = document.createElement("img");
    fallback.className = "product-media__fallback";
    fallback.alt = isText(media.alt) ? media.alt : "";
    fallback.loading = "lazy";
    fallback.decoding = "async";
    fallback.width = 1600;
    fallback.height = 1000;
    if (initialImageSource) fallback.src = initialImageSource;
    fallback.addEventListener("error", () => {
      if (fallbackSource && fallback.src !== new URL(fallbackSource, document.baseURI).href) {
        fallback.src = fallbackSource;
        return;
      }
      fallback.hidden = true;
      frame.classList.add("is-empty");
    });

    const appendOverlay = () => {
      const overlayData = media.overlay;
      if (!overlayData || typeof overlayData !== "object") return;
      const overlay = makeElement("div", "product-media__overlay");
      appendText(overlay, "span", "product-media__overlay-eyebrow", overlayData.eyebrow);
      appendText(overlay, "p", "product-media__overlay-text", overlayData.text);
      if (overlay.childElementCount) frame.append(overlay);
    };

    if (type === "image") {
      frame.classList.add("is-image");
      frame.append(fallback);
      appendOverlay();
      return frame;
    }

    const video = document.createElement("video");
    video.className = "product-media__video";
    video.autoplay = media.autoplay !== false;
    video.defaultMuted = true;
    video.muted = true;
    video.loop = media.loop !== false;
    video.playsInline = true;
    video.preload = media.preload === "none" ? "none" : media.preload === "auto" ? "auto" : "metadata";
    video.controls = media.controls === true && media.autoplay !== false;
    video.disablePictureInPicture = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    if (video.autoplay) video.setAttribute("autoplay", "");
    if (video.loop) video.setAttribute("loop", "");
    if (poster) video.poster = poster;
    const mediaLabel = isText(media.ariaLabel) ? media.ariaLabel : media.alt;
    if (isText(mediaLabel)) video.setAttribute("aria-label", mediaLabel);
    else video.setAttribute("aria-hidden", "true");

    const videoSource = document.createElement("source");
    videoSource.src = source;
    videoSource.type = isText(media.mimeType) ? media.mimeType : "video/mp4";
    video.append(videoSource);
    frame.dataset.autoplay = String(video.autoplay);
    frame.classList.add(video.preload === "none" ? "is-ready" : "is-loading");

    const showFallback = () => {
      video.pause();
      frame.classList.remove("is-loading");
      frame.classList.add("is-fallback");
    };
    const showVideo = () => {
      frame.classList.remove("is-loading");
      frame.classList.add("is-ready");
    };
    video.addEventListener("loadeddata", showVideo, { once: true });
    if (variant.endsWith("-phone")) {
      const syncFeatureCycle = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        frame.style.setProperty("--feature-cycle", `${video.duration.toFixed(3)}s`);
      };
      let previousTime = 0;
      video.addEventListener("loadedmetadata", syncFeatureCycle);
      video.addEventListener("durationchange", syncFeatureCycle);
      video.addEventListener("timeupdate", () => {
        const looped = previousTime > video.currentTime + 0.35;
        previousTime = video.currentTime;
        if (!looped || !frame.classList.contains("is-playing")) return;
        frame.classList.remove("is-playing");
        void frame.offsetWidth;
        frame.classList.add("is-playing");
      });
    }
    video.addEventListener("error", showFallback, { once: true });
    videoSource.addEventListener("error", showFallback, { once: true });

    frame.append(video, fallback);
    if (media.autoplay === false && isText(media.playLabel)) {
      const playButton = makeElement("button", "product-media__play");
      playButton.type = "button";
      playButton.setAttribute("aria-label", media.playLabel);
      playButton.append(makeElement("span", "product-media__play-icon"));
      playButton.addEventListener("click", () => {
        if (video.ended) video.currentTime = 0;
        video.play().catch(() => frame.classList.add("is-paused"));
      });
      video.addEventListener("play", () => {
        if (media.controls === true) video.controls = true;
        playButton.hidden = true;
        frame.classList.add("is-playing");
        frame.classList.remove("is-paused", "is-ended");
      });
      video.addEventListener("ended", () => {
        video.controls = false;
        playButton.hidden = false;
        playButton.setAttribute("aria-label", isText(media.replayLabel) ? media.replayLabel : media.playLabel);
        frame.classList.remove("is-playing");
        frame.classList.add("is-ended");
      });
      frame.append(playButton);
    }
    appendOverlay();
    return frame;
  }

  function makePills(items, className = "action-pills") {
    const values = asArray(items).filter(isText);
    if (!values.length) return null;
    const list = makeElement("ul", className);
    values.forEach((item) => {
      const row = makeElement("li", `${className}__item`);
      row.append(makeElement("span", `${className}__dot`));
      row.append(makeElement("span", `${className}__label`, item));
      list.append(row);
    });
    return list;
  }

  function addReveal(node, delay = 0) {
    if (!node) return node;
    node.classList.add("reveal");
    if (delay > 0) node.style.setProperty("--reveal-delay", `${delay}ms`);
    return node;
  }

  function renderChrome(content) {
    const site = content.site || {};
    const brand = content.brand || {};
    const accessibility = content.accessibility || {};
    const navigation = content.navigation || {};

    if (isText(site.language)) document.documentElement.lang = site.language;
    if (isText(site.title)) document.title = site.title;
    const description = document.querySelector('meta[name="description"]');
    if (description && isText(site.description)) description.content = site.description;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor && isText(site.themeColor)) themeColor.content = site.themeColor;

    const skipLink = byId("skip-link");
    if (skipLink && isText(accessibility.skipLink)) skipLink.textContent = accessibility.skipLink;

    const main = byId("main");
    if (main && isText(accessibility.mainLabel)) main.setAttribute("aria-label", accessibility.mainLabel);

    const brandLink = byId("brand");
    if (brandLink && isText(brand.name)) brandLink.textContent = brand.name;
    if (brandLink && isText(brand.homeLabel)) brandLink.setAttribute("aria-label", brand.homeLabel);

    const desktopNav = byId("desktop-nav");
    const mobileNav = byId("mobile-nav");
    [desktopNav, mobileNav].forEach((nav) => {
      if (!nav) return;
      nav.replaceChildren();
      if (isText(accessibility.navigationLabel)) nav.setAttribute("aria-label", accessibility.navigationLabel);
      asArray(navigation.items).forEach((item) => {
        if (!item || !isText(item.label) || !isText(item.target)) return;
        const link = makeElement("a", "nav-link", item.label);
        link.href = `#${item.target}`;
        nav.append(link);
      });
    });

    const menuToggle = byId("menu-toggle");
    if (menuToggle && isText(accessibility.menuOpenLabel)) {
      menuToggle.setAttribute("aria-label", accessibility.menuOpenLabel);
      menuToggle.dataset.openLabel = accessibility.menuOpenLabel;
    }
    if (menuToggle && isText(accessibility.menuCloseLabel)) {
      menuToggle.dataset.closeLabel = accessibility.menuCloseLabel;
    }

    const progress = byId("scroll-progress");
    if (progress && isText(accessibility.progressLabel)) {
      progress.setAttribute("aria-label", accessibility.progressLabel);
    }
  }

  function renderHero(data, filmData) {
    const section = byId("hero");
    if (!section || !data) return;
    section.replaceChildren();

    const ambient = makeElement("div", "hero__ambient");
    ambient.setAttribute("aria-hidden", "true");
    section.append(ambient);

    const inner = makeElement("div", "section-inner hero__inner");
    const copy = makeElement("div", "hero__copy");
    let kicker = null;
    if (data.eyebrow && typeof data.eyebrow === "object") {
      kicker = makeElement("p", "section-kicker hero__eyebrow");
      appendText(kicker, "span", "hero__wordmark", data.eyebrow.brand);
      if (isText(data.eyebrow.brand) && isText(data.eyebrow.descriptor)) {
        const divider = makeElement("span", "hero__eyebrow-divider");
        divider.setAttribute("aria-hidden", "true");
        kicker.append(divider);
      }
      appendText(kicker, "span", "hero__descriptor", data.eyebrow.descriptor);
    } else {
      kicker = makeKicker(data.eyebrow);
    }
    if (kicker) copy.append(addReveal(kicker, 40));
    const slogans = data.slogans || {};
    appendText(copy, "p", "hero__lead reveal", slogans.opening)?.style.setProperty("--reveal-delay", "100ms");
    appendText(copy, "p", "hero__category reveal", slogans.category)?.style.setProperty("--reveal-delay", "150ms");

    const title = makeTitle("h1", "hero__title", slogans.primary, "hero-title");
    if (title) copy.append(addReveal(title, 210));
    appendText(copy, "p", "hero__description reveal", data.description)?.style.setProperty("--reveal-delay", "290ms");

    const actions = makeElement("div", "hero__actions reveal");
    actions.style.setProperty("--reveal-delay", "370ms");
    asArray(data.actions).forEach((action) => {
      const link = makeAction(action);
      if (link) actions.append(link);
    });
    if (actions.childElementCount) copy.append(actions);

    const film = makeMedia(filmData?.media, "hero__film reveal");
    if (film) {
      film.id = "product-film";
      film.style.setProperty("--reveal-delay", "320ms");
      inner.append(copy, film);
    } else {
      inner.append(copy);
    }
    section.append(inner);

    if (isText(data.scrollCue)) {
      const cue = makeElement("a", "hero__scroll-cue", data.scrollCue);
      cue.href = `#${isText(data.scrollTarget) ? data.scrollTarget : "pain"}`;
      cue.append(makeElement("span", "hero__scroll-line"));
      section.append(addReveal(cue, 420));
    }

    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderProductFilm(data) {
    const section = byId("product-film");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner product-film__inner reveal");
    const media = makeMedia(data.media, "product-film__media");
    if (media) inner.append(media);
    section.append(inner);
    setSectionLabel(section, null, data.sectionLabel);
  }

  function renderPain(data) {
    const section = byId("pain");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner split-layout");
    const copy = makeElement("div", "section-copy reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) copy.append(kicker);
    const title = makeTitle("h2", "section-title", data.title, "pain-title");
    if (title) copy.append(title);
    appendText(copy, "p", "section-body", data.body);

    const visual = data.visual || {};
    const figure = makeElement("figure", "visual-card pain-visual reveal");
    const media = makeElement("div", "visual-card__media");
    const image = makeImage(visual, "visual-card__image");
    if (image) media.append(image);
    const badge = appendText(media, "span", "visual-badge", visual.badge);
    if (!image && !badge) media.hidden = true;
    figure.append(media);

    const labels = makePills(visual.items, "signal-list");
    if (labels) figure.append(labels);
    appendText(figure, "figcaption", "visual-caption", visual.caption);

    inner.append(copy, figure);
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderTurningPoint(data) {
    const section = byId("turning-point");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner turning-point__inner");
    const intro = makeElement("div", "section-intro section-intro--center reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) intro.append(kicker);
    const title = makeTitle("h2", "section-title", data.title, "turning-point-title");
    if (title) intro.append(title);
    appendText(intro, "p", "section-body", data.body);
    inner.append(intro);

    const visual = data.visual || {};
    const figure = makeElement("figure", "signature-demo reveal");
    const media = makeElement("div", "signature-demo__media");
    const mediaNode = makeMedia(visual.media, "signature-demo__product-media");
    const image = mediaNode ? null : makeImage(visual, "signature-demo__image");
    if (mediaNode) media.append(mediaNode);
    else if (image) media.append(image);
    appendText(media, "span", "visual-badge visual-badge--dark", visual.badge);
    figure.append(media);

    const transcript = makeElement("figcaption", "signature-demo__transcript");
    const transcriptMessage = makeElement("div", "transcript-message");
    appendText(transcriptMessage, "span", "demo-meta demo-meta--dark", visual.messageLabel);
    appendText(transcriptMessage, "p", null, visual.message);
    if (transcriptMessage.childElementCount) transcript.append(transcriptMessage);

    const transcriptActions = makeElement("div", "transcript-actions");
    appendText(transcriptActions, "span", "demo-meta demo-meta--dark", visual.actionLabel);
    const pills = makePills(visual.actions, "transcript-pills");
    if (pills) transcriptActions.append(pills);
    if (transcriptActions.childElementCount) transcript.append(transcriptActions);

    appendText(transcript, "p", "transcript-result", visual.result);
    if (transcript.childElementCount) figure.append(transcript);
    inner.append(figure);

    const stories = makeElement("div", "turning-point__stories");
    asArray(data.stories).forEach((story, index) => {
      if (!story) return;
      const card = makeElement("article", "product-story reveal");
      card.style.setProperty("--reveal-delay", `${index * 90}ms`);
      const storyMedia = makeMedia(story.media, "product-story__media");
      if (storyMedia) card.append(storyMedia);
      const storyCopy = makeElement("div", "product-story__copy");
      appendText(storyCopy, "p", "product-story__eyebrow", story.eyebrow);
      appendText(storyCopy, "h3", "product-story__title", story.title);
      appendText(storyCopy, "p", "product-story__body", story.body);
      appendText(storyCopy, "p", "product-story__caption", story.caption);
      if (storyCopy.childElementCount) card.append(storyCopy);
      if (card.childElementCount) stories.append(card);
    });
    if (stories.childElementCount) inner.append(stories);

    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderPrinciple(data) {
    const section = byId("principle");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner principle__inner");
    const rule = makeElement("span", "principle__rule reveal");
    rule.setAttribute("aria-hidden", "true");
    inner.append(rule);
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) inner.append(addReveal(kicker, 60));
    const title = makeLineTitle("h2", "quote-title", data.titleLines, "principle-title");
    if (title) inner.append(addReveal(title, 120));
    appendText(inner, "p", "quote-body reveal", data.body)?.style.setProperty("--reveal-delay", "220ms");
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderSenderDemo(demo) {
    const box = makeElement("div", "engine-demo sender-demo");
    appendText(box, "span", "demo-meta demo-meta--dark", demo.label);
    const input = makeElement("div", "sender-demo__input");
    appendText(input, "span", "sender-demo__before", demo.before);
    appendText(input, "span", "sender-demo__after", demo.after);
    if (input.childElementCount) box.append(input);
    appendText(box, "span", "sender-demo__connector", demo.connector);
    return box;
  }

  function renderReceiverDemo(demo) {
    const box = makeElement("div", "engine-demo receiver-demo");
    appendText(box, "span", "demo-meta demo-meta--dark", demo.label);
    appendText(box, "p", "receiver-demo__message", demo.message);
    const actions = makePills(demo.actions, "receiver-pills");
    if (actions) box.append(actions);
    const route = makeElement("div", "receiver-demo__route");
    appendText(route, "span", "receiver-demo__routing", demo.routing);
    appendText(route, "span", "receiver-demo__status", demo.status);
    if (route.childElementCount) box.append(route);
    return box;
  }

  function renderEngines(data) {
    const section = byId("engines");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner engines__inner");
    const intro = makeElement("div", "section-intro reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) intro.append(kicker);
    const title = makeTitle("h2", "section-title", data.title, "engines-title");
    if (title) intro.append(title);
    appendText(intro, "p", "section-body", data.body);
    inner.append(intro);

    const grid = makeElement("div", "engine-grid");
    asArray(data.items).forEach((item, index) => {
      if (!item) return;
      const card = makeElement("article", "engine-card reveal");
      if (isText(item.anchor)) card.id = item.anchor;
      card.style.setProperty("--reveal-delay", `${index * 90}ms`);
      const cardCopy = makeElement("div", "engine-card__copy");
      appendText(cardCopy, "p", "engine-card__side", item.side);
      appendText(cardCopy, "h3", "engine-card__title", item.title);
      appendText(cardCopy, "p", "engine-card__body", item.body);
      if (cardCopy.childElementCount) card.append(cardCopy);
      const demo = item.demo || {};
      const demoMedia = makeMedia(demo.media, "engine-product-media");
      if (demoMedia) {
        const demoFrame = makeElement("figure", "engine-media");
        demoFrame.append(demoMedia);
        appendText(demoFrame, "figcaption", "engine-media__caption", demo.caption);
        card.append(demoFrame);
      } else {
        const demoNode = isText(demo.before) ? renderSenderDemo(demo) : renderReceiverDemo(demo);
        if (demoNode.childElementCount) card.append(demoNode);
      }
      grid.append(card);
    });
    if (grid.childElementCount) inner.append(grid);
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function makeMoatIcon(type) {
    const icon = makeElement("span", `moat-icon moat-icon--${isText(type) ? type : "default"}`);
    icon.setAttribute("aria-hidden", "true");
    icon.append(makeElement("span", "moat-icon__core"));
    icon.append(makeElement("span", "moat-icon__orbit moat-icon__orbit--one"));
    icon.append(makeElement("span", "moat-icon__orbit moat-icon__orbit--two"));
    return icon;
  }

  function renderMoats(data) {
    const section = byId("moats");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner moats__inner");
    const intro = makeElement("div", "section-intro reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) intro.append(kicker);
    const title = makeTitle("h2", "section-title", data.title, "moats-title");
    if (title) intro.append(title);
    appendText(intro, "p", "section-body", data.body);
    inner.append(intro);

    const grid = makeElement("div", "moat-grid");
    asArray(data.items).forEach((item, index) => {
      if (!item) return;
      const card = makeElement("article", "moat-card reveal");
      card.style.setProperty("--reveal-delay", `${index * 90}ms`);
      const top = makeElement("div", "moat-card__top");
      appendText(top, "span", "moat-card__number", item.number);
      appendText(top, "span", "moat-card__signal", item.signal);
      if (top.childElementCount) card.append(top);
      card.append(makeMoatIcon(item.icon));
      appendText(card, "h3", "moat-card__title", item.title);
      appendText(card, "p", "moat-card__body", item.body);
      grid.append(card);
    });
    if (grid.childElementCount) inner.append(grid);
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderVision(data) {
    const section = byId("vision");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner vision__inner");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) inner.append(addReveal(kicker));

    const timelineItems = asArray(data.timeline).filter(isText);
    let title = null;
    if (timelineItems.length) {
      title = makeElement("h2", "vision__timeline reveal");
      title.id = "vision-title";
      if (isText(data.timelineLabel)) title.setAttribute("aria-label", data.timelineLabel);
      title.style.setProperty("--reveal-delay", "80ms");
      timelineItems.forEach((item, index) => {
        const segment = makeElement("span", `vision__segment vision__segment--${index + 1}`, item);
        segment.style.setProperty("--vision-start", (0.05 + index * 0.18).toFixed(2));
        title.append(segment);
        if (index < timelineItems.length - 1) {
          const arrow = makeElement("span", "vision__arrow");
          arrow.setAttribute("aria-hidden", "true");
          arrow.style.setProperty("--vision-start", (0.14 + index * 0.18).toFixed(2));
          title.append(arrow);
        }
      });
      inner.append(title);
    }
    appendText(inner, "p", "vision__statement reveal", data.statement)?.style.setProperty("--reveal-delay", "180ms");
    appendText(inner, "p", "vision__supporting reveal", data.supportingStatement)?.style.setProperty("--reveal-delay", "250ms");
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderFutureSocial(data) {
    const section = byId("future-social");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner future-social__inner");
    const intro = makeElement("div", "future-social__intro reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) intro.append(kicker);
    const titleLines = asArray(data.titleLines).filter(isText);
    let title = null;
    if (titleLines.length) {
      title = makeElement("h2", "section-title future-social__title");
      title.id = "future-social-title";
      if (isText(data.title)) title.setAttribute("aria-label", data.title);
      titleLines.forEach((line, index) => {
        const lineNode = makeElement("span", "future-social__title-line", line);
        if (index === titleLines.length - 1) lineNode.classList.add("future-social__title-line--accent");
        title.append(lineNode);
      });
    } else {
      title = makeTitle("h2", "section-title future-social__title", data.title, "future-social-title");
    }
    if (title) intro.append(title);
    appendText(intro, "p", "section-body", data.body);

    const story = makeElement("div", "future-social__story");
    const timelineItems = asArray(data.timeline).filter((item) => isText(item) || (item && isText(item.label)));
    if (timelineItems.length) {
      const timeline = makeElement("ol", "future-social__timeline");
      if (isText(data.timelineLabel)) timeline.setAttribute("aria-label", data.timelineLabel);
      timelineItems.forEach((item, index) => {
        const itemData = typeof item === "string" ? { label: item } : item;
        const row = makeElement("li", `future-social__item future-social__item--${index + 1}`);
        row.style.setProperty("--era-index", index);
        row.style.setProperty("--era-start", (0.04 + index * 0.13).toFixed(2));
        appendText(row, "span", "future-social__pace", itemData.pace);
        appendText(row, "strong", "future-social__node", itemData.label);
        appendText(row, "span", "future-social__caption", itemData.caption);
        timeline.append(row);
      });
      story.append(timeline);
    }
    const statementLines = asArray(data.statementLines).filter(isText);
    if (statementLines.length) {
      const statement = makeElement("p", "future-social__statement");
      statementLines.forEach((line) => statement.append(makeElement("span", "future-social__statement-line", line)));
      story.append(statement);
    } else {
      appendText(story, "p", "future-social__statement", data.statement);
    }

    inner.append(intro, story);
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderTestflight(data) {
    const section = byId("testflight");
    if (!section || !data) return;
    section.replaceChildren();

    const inner = makeElement("div", "section-inner testflight__inner");
    const copy = makeElement("div", "section-copy reveal");
    const kicker = makeKicker(data.sectionLabel);
    if (kicker) copy.append(kicker);
    const title = makeTitle("h2", "section-title", data.title, "testflight-title");
    if (title) copy.append(title);
    appendText(copy, "p", "section-body", data.body);

    const formData = data.form || {};
    const formCard = makeElement("div", "apply-card reveal");
    const form = makeElement("form", "apply-form");
    form.noValidate = true;
    if (isText(formData.ariaLabel)) form.setAttribute("aria-label", formData.ariaLabel);

    const label = appendText(form, "label", "apply-form__label", formData.label);
    const fieldId = "testflight-email";
    if (label) label.htmlFor = fieldId;
    const controls = makeElement("div", "apply-form__controls");
    const input = document.createElement("input");
    input.className = "apply-form__input";
    input.id = fieldId;
    input.name = "email";
    input.type = "email";
    input.inputMode = "email";
    input.autocomplete = "email";
    if (isText(formData.placeholder)) input.placeholder = formData.placeholder;
    const submit = makeElement("button", "button button--primary apply-form__submit", formData.submitLabel);
    submit.type = "submit";
    controls.append(input, submit);
    form.append(controls);

    const helper = appendText(form, "p", "apply-form__helper", formData.helper);
    const status = makeElement("p", "apply-form__status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("role", "status");
    form.append(status);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      input.setAttribute("aria-invalid", String(!isValid));
      status.classList.toggle("is-error", !isValid);
      status.textContent = isValid ? formData.demoMessage || "" : formData.validationMessage || "";
      if (!isValid) input.focus();
    });

    if (helper) input.setAttribute("aria-describedby", helper.id || "apply-form-helper");
    if (helper && !helper.id) helper.id = "apply-form-helper";
    formCard.append(form);
    inner.append(copy, formCard);
    section.append(inner);
    setSectionLabel(section, title ? title.id : null, data.sectionLabel);
  }

  function renderFooter(data) {
    const footer = byId("site-footer");
    if (!footer || !data) return;
    footer.replaceChildren();
    const inner = makeElement("div", "footer-inner");
    appendText(inner, "span", "footer-brand", data.brand);
    appendText(inner, "span", "footer-copyright", data.copyright);
    const contact = makeElement("div", "footer-contact");
    appendText(contact, "span", "footer-contact__label", data.contactLabel);
    appendText(contact, "span", "footer-contact__value", data.contactValue);
    if (contact.childElementCount) inner.append(contact);
    footer.append(inner);
  }

  function applyInlineWordmarks(content) {
    const brandName = content.brand?.name;
    if (!isText(brandName)) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue?.includes(brandName)) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest(".brand, .hero__wordmark, .footer-brand, .inline-wordmark")) continue;
      nodes.push(node);
    }
    nodes.forEach((node) => {
      const parts = node.nodeValue.split(brandName);
      if (parts.length < 2) return;
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (part) fragment.append(document.createTextNode(part));
        if (index < parts.length - 1) fragment.append(makeElement("span", "inline-wordmark", brandName));
      });
      node.replaceWith(fragment);
    });
  }

  function setupMenu(content) {
    const toggle = byId("menu-toggle");
    const panel = byId("mobile-panel");
    if (!toggle || !panel) return;

    const closeMenu = (returnFocus = false) => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
      if (isText(toggle.dataset.openLabel)) toggle.setAttribute("aria-label", toggle.dataset.openLabel);
      if (returnFocus) toggle.focus();
    };

    const openMenu = () => {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      if (isText(toggle.dataset.closeLabel)) toggle.setAttribute("aria-label", toggle.dataset.closeLabel);
      panel.querySelector("a")?.focus();
    };

    toggle.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open")) closeMenu();
      else openMenu();
    });
    panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("nav-open")) closeMenu(true);
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 800 && document.body.classList.contains("nav-open")) closeMenu();
    });
  }

  function setupReveal() {
    const targets = [...document.querySelectorAll(".reveal")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    targets.forEach((target) => observer.observe(target));
  }

  function setupMediaPlayback() {
    const frames = [...document.querySelectorAll('.product-media[data-media-type="video"]')];
    if (!frames.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forceStaticMedia = new URLSearchParams(window.location.search).get("media") === "off";

    const syncFrame = (frame) => {
      const video = frame.querySelector("video");
      if (!video) return;
      const mediaAllowed =
        frame.dataset.inViewport === "true" &&
        document.visibilityState === "visible" &&
        !forceStaticMedia &&
        !reduceMotion.matches &&
        !frame.classList.contains("is-fallback");
      frame.classList.toggle("is-reduced-motion", forceStaticMedia || reduceMotion.matches);
      if (!mediaAllowed) {
        video.pause();
        frame.classList.remove("is-playing");
        return;
      }
      if (frame.dataset.autoplay !== "true") return;
      video
        .play()
        .then(() => {
          frame.classList.add("is-playing");
          frame.classList.remove("is-paused");
        })
        .catch(() => {
          frame.classList.remove("is-playing");
          frame.classList.add("is-paused");
        });
    };

    frames.forEach((frame) => {
      frame.dataset.inViewport = "false";
      frame.querySelector("video")?.pause();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.dataset.inViewport = String(entry.isIntersecting && entry.intersectionRatio >= 0.12);
            syncFrame(entry.target);
          });
        },
        { threshold: [0, 0.12, 0.4], rootMargin: "8% 0px 8% 0px" }
      );
      frames.forEach((frame) => observer.observe(frame));
    } else {
      frames.forEach((frame) => {
        frame.dataset.inViewport = "true";
        syncFrame(frame);
      });
    }

    const syncAll = () => frames.forEach(syncFrame);
    document.addEventListener("visibilitychange", syncAll);
    reduceMotion.addEventListener?.("change", syncAll);
    syncAll();
  }

  function setupProductOverlayMotion() {
    const frames = [...document.querySelectorAll(".product-media.is-image")].filter((frame) =>
      frame.querySelector(".product-media__overlay")
    );
    if (!frames.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forceStaticMedia = new URLSearchParams(window.location.search).get("media") === "off";

    const syncFrame = (frame) => {
      const shouldAnimate =
        frame.dataset.inViewport === "true" &&
        document.visibilityState === "visible" &&
        !forceStaticMedia &&
        !reduceMotion.matches;
      frame.classList.toggle("is-playing", shouldAnimate);
      frame.classList.toggle("is-reduced-motion", forceStaticMedia || reduceMotion.matches);
    };

    frames.forEach((frame) => {
      frame.dataset.inViewport = "false";
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.dataset.inViewport = String(entry.isIntersecting && entry.intersectionRatio >= 0.2);
            syncFrame(entry.target);
          });
        },
        { threshold: [0, 0.2, 0.55], rootMargin: "5% 0px 5% 0px" }
      );
      frames.forEach((frame) => observer.observe(frame));
    } else {
      frames.forEach((frame) => {
        frame.dataset.inViewport = "true";
        syncFrame(frame);
      });
    }

    const syncAll = () => frames.forEach(syncFrame);
    document.addEventListener("visibilitychange", syncAll);
    reduceMotion.addEventListener?.("change", syncAll);
    syncAll();
  }

  function setupScrollChrome() {
    const header = byId("site-header");
    const progress = byId("scroll-progress");
    const sections = [...document.querySelectorAll("[data-surface]")];
    let ticking = false;

    const update = () => {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const ratio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
      if (progress) {
        progress.style.setProperty("--scroll-progress", ratio);
        progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      }
      if (header) {
        header.classList.toggle("is-scrolled", scrollTop > 12);
        const probe = scrollTop + Math.max(header.offsetHeight, 72) * 0.6;
        const active = sections.find((section) => {
          const top = section.offsetTop;
          return probe >= top && probe < top + section.offsetHeight;
        });
        if (active?.dataset.surface) header.dataset.surface = active.dataset.surface;
      }
      ticking = false;
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();
  }

  function setupVisionMotion() {
    const section = byId("vision");
    if (!section) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = false;
    let ticking = false;

    const update = () => {
      if (!enabled) {
        ticking = false;
        return;
      }
      const rect = section.getBoundingClientRect();
      const travel = Math.max(window.innerHeight + rect.height, 1);
      const rawProgress = (window.innerHeight - rect.top) / travel;
      const progress = Math.min(Math.max(rawProgress * 1.6, 0), 1);
      section.style.setProperty("--vision-progress", progress.toFixed(4));
      ticking = false;
    };

    const requestUpdate = () => {
      if (!enabled || ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    const syncMode = () => {
      enabled = !reduceMotion.matches;
      section.classList.toggle("is-scroll-motion", enabled);
      section.style.setProperty("--vision-progress", enabled ? "0" : "1");
      requestUpdate();
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("orientationchange", requestUpdate);
    reduceMotion.addEventListener?.("change", syncMode);
    syncMode();
  }

  function setupFutureSocialMotion() {
    const section = byId("future-social");
    if (!section) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = false;
    let ticking = false;

    const update = () => {
      if (!enabled) {
        ticking = false;
        return;
      }
      const rect = section.getBoundingClientRect();
      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      const rawProgress = -rect.top / travel;
      const progress = Math.min(Math.max(rawProgress * 1.6, 0), 1);
      section.style.setProperty("--future-progress", progress.toFixed(4));
      ticking = false;
    };

    const requestUpdate = () => {
      if (!enabled || ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    const syncMode = () => {
      enabled = !reduceMotion.matches;
      section.classList.toggle("is-scroll-story", enabled);
      section.style.setProperty("--future-progress", enabled ? "0" : "1");
      requestUpdate();
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("orientationchange", requestUpdate);
    reduceMotion.addEventListener?.("change", syncMode);
    syncMode();
  }

  function restoreInitialAnchor() {
    if (!isText(window.location.hash)) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = byId(id);
    if (!target) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
        window.dispatchEvent(new Event("scroll"));
      });
    });
  }

  function render(content) {
    renderChrome(content);
    const sections = content.sections || {};
    renderHero(sections.hero, sections.productFilm);
    renderPain(sections.pain);
    renderTurningPoint(sections.turningPoint);
    renderPrinciple(sections.principle);
    renderEngines(sections.engines);
    renderVision(sections.vision);
    renderMoats(sections.moats);
    renderFutureSocial(sections.futureSocial);
    renderTestflight(sections.testflight);
    renderFooter(content.footer);
    applyInlineWordmarks(content);
    setupMenu(content);
    setupReveal();
    setupMediaPlayback();
    setupProductOverlayMotion();
    setupScrollChrome();
    setupVisionMotion();
    setupFutureSocialMotion();

    document.body.setAttribute("aria-busy", "false");
    window.requestAnimationFrame(() => document.body.classList.add("is-ready"));
    restoreInitialAnchor();
  }

  async function loadContent() {
    try {
      const response = await fetch("content.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.json();
      render(content);
    } catch (error) {
      document.body.setAttribute("aria-busy", "false");
      document.body.classList.add("content-error");
      console.error("[pickchat] content.json could not be loaded.", error);
    }
  }

  loadContent();
})();

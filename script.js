"use strict";

// This file is deferred by index.html, so the page is parsed when it runs.
// Apply the saved (or system) theme first, before wiring the other controls.
(() => {
  const root = document.documentElement;
  const storageKey = "mary-portfolio-theme";
  const themeColors = { light: "#faf7ef", dark: "#16241c" };

  function readSavedTheme() {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      // Storage may be blocked, including on some file:// browser settings.
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // The toggle still works for this page when storage is unavailable.
    }
  }

  let systemTheme = null;
  try {
    if (typeof window.matchMedia === "function") {
      systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    }
  } catch {
    // Older or restricted browsers can fall back to the light theme.
  }

  const preferredSystemTheme = () =>
    systemTheme && systemTheme.matches ? "dark" : "light";

  function applyTheme(theme) {
    const isDark = theme === "dark";
    root.setAttribute("data-theme", isDark ? "dark" : "light");

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      const action = `Switch to ${isDark ? "light" : "dark"} mode`;
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", action);
      themeToggle.title = action;
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", themeColors[isDark ? "dark" : "light"]);
    }
  }

  let hasExplicitTheme = readSavedTheme();
  applyTheme(hasExplicitTheme || preferredSystemTheme());

  function initializeControls() {
    // Also synchronize controls if this script is ever loaded before the body.
    applyTheme(root.getAttribute("data-theme"));

    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        hasExplicitTheme = nextTheme;
        applyTheme(nextTheme);
        saveTheme(nextTheme);
      });
    }

    // Follow OS changes until someone has explicitly chosen an appearance.
    if (systemTheme) {
      const onSystemThemeChange = () => {
        if (!hasExplicitTheme) applyTheme(preferredSystemTheme());
      };

      if (typeof systemTheme.addEventListener === "function") {
        systemTheme.addEventListener("change", onSystemThemeChange);
      } else if (typeof systemTheme.addListener === "function") {
        systemTheme.addListener(onSystemThemeChange);
      }
    }

    // Keep two open tabs in sync when their storage is available.
    window.addEventListener("storage", (event) => {
      if (event.key !== storageKey && event.key !== null) return;
      hasExplicitTheme = readSavedTheme();
      applyTheme(hasExplicitTheme || preferredSystemTheme());
    });

    const menuToggle = document.getElementById("mobileMenuToggle");
    const siteNav = document.getElementById("siteNav");

    function setMenuOpen(isOpen) {
      if (!menuToggle || !siteNav) return;
      siteNav.classList.toggle("is-open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    }

    if (menuToggle && siteNav) {
      setMenuOpen(false);

      menuToggle.addEventListener("click", () => {
        setMenuOpen(!siteNav.classList.contains("is-open"));
      });

      siteNav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setMenuOpen(false);
      });

      document.addEventListener("click", (event) => {
        if (!siteNav.contains(event.target) && !menuToggle.contains(event.target)) {
          setMenuOpen(false);
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 780) setMenuOpen(false);
      });
    }

    const searchToggle = document.getElementById("searchToggle");
    const searchDialog = document.getElementById("searchDialog");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    // Index actual portfolio sections so searches also find their body text.
    const navLabels = new Map(
      Array.from(document.querySelectorAll("#siteNav a[href^='#']"), (link) => [
        link.getAttribute("href").slice(1),
        link.textContent.trim()
      ])
    );

    const sections = Array.from(document.querySelectorAll("main section[id]"), (section) => {
      const heading = section.querySelector("h1, h2, h3");
      const label = section.id === "home"
        ? "Home"
        : navLabels.get(section.id) || (heading && heading.textContent.trim()) || section.id;

      return {
        label,
        href: `#${section.id}`,
        searchableText: `${section.id} ${label} ${section.textContent}`.toLocaleLowerCase()
      };
    });

    function renderSearchResults() {
      if (!searchResults) return;
      const query = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = sections.filter((section) =>
        terms.every((term) => section.searchableText.includes(term))
      );

      searchResults.textContent = "";

      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "search-empty";
        empty.textContent = "No matching sections. Try another search.";
        searchResults.appendChild(empty);
        return;
      }

      const fragment = document.createDocumentFragment();
      for (const section of matches) {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = section.href;
        link.textContent = section.label;
        fragment.appendChild(link);
      }
      searchResults.appendChild(fragment);
    }

    function openSearch() {
      if (!searchDialog) return;
      setMenuOpen(false);
      renderSearchResults();

      if (!searchDialog.open) {
        if (typeof searchDialog.showModal === "function") {
          searchDialog.showModal();
        } else {
          searchDialog.setAttribute("open", "");
        }
      }
      if (searchInput) searchInput.focus();
    }

    function closeSearch() {
      if (!searchDialog || !searchDialog.open) return;
      if (typeof searchDialog.close === "function") {
        searchDialog.close();
      } else {
        searchDialog.removeAttribute("open");
      }
    }

    if (searchToggle && searchDialog) {
      searchToggle.addEventListener("click", openSearch);
    }

    if (searchDialog) {
      if (searchInput) searchInput.addEventListener("input", renderSearchResults);

      const closeButton = searchDialog.querySelector("[data-search-close]");
      if (closeButton) closeButton.addEventListener("click", closeSearch);

      if (searchResults) {
        searchResults.addEventListener("click", (event) => {
          if (event.target.closest("a")) closeSearch();
        });
      }

      searchDialog.addEventListener("click", (event) => {
        if (event.target === searchDialog) closeSearch();
      });
    }

    const copyEmailButton = document.getElementById("copyEmailButton");
    if (copyEmailButton) {
      const copyLabel = copyEmailButton.querySelector(".contact-copy-label");
      const copyStatus = document.getElementById("copyEmailStatus");
      const originalLabel = copyLabel ? copyLabel.textContent : "Email";
      const originalAriaLabel = copyEmailButton.getAttribute("aria-label") || "Copy email address";
      let copyTimer = null;
      let copyAttempt = 0;

      if (copyStatus) copyStatus.setAttribute("aria-live", "polite");

      function resetCopyFeedback() {
        copyEmailButton.classList.remove("is-copied");
        copyEmailButton.setAttribute("aria-label", originalAriaLabel);
        if (copyLabel) copyLabel.textContent = originalLabel;
        if (copyStatus) copyStatus.textContent = "";
      }

      // execCommand is still useful when the Clipboard API is blocked by file://.
      function copyWithSelection(email) {
        if (!document.body || typeof document.execCommand !== "function") return false;

        const textarea = document.createElement("textarea");
        const previousFocus = document.activeElement;
        textarea.value = email;
        textarea.readOnly = true;
        textarea.setAttribute("aria-hidden", "true");
        textarea.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none";

        try {
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          return document.execCommand("copy") === true;
        } catch {
          return false;
        } finally {
          if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
          try {
            if (previousFocus && typeof previousFocus.focus === "function") {
              previousFocus.focus();
            }
          } catch {
            // Clipboard result is unaffected if focus cannot be restored.
          }
        }
      }

      copyEmailButton.addEventListener("click", async () => {
        const email = (copyEmailButton.getAttribute("data-email") || "").trim();
        if (!email) return;

        const attempt = ++copyAttempt;
        if (copyTimer !== null) {
          window.clearTimeout(copyTimer);
          copyTimer = null;
        }
        resetCopyFeedback();

        let copied = false;
        try {
          const clipboard = window.navigator && window.navigator.clipboard;
          if (clipboard && typeof clipboard.writeText === "function") {
            await clipboard.writeText(email);
            copied = true;
          }
        } catch {
          // Try selection-based copying when browser permission or context blocks the API.
        }

        if (attempt !== copyAttempt) return;
        if (!copied) copied = copyWithSelection(email);

        if (!copied) {
          // Manual copy remains possible, but is never reported as a completed copy.
          try {
            if (typeof window.prompt === "function") {
              window.prompt("Select and copy this email address:", email);
            }
          } catch {
            // Some browsers disable prompts; leave the button ready to retry.
          }
          return;
        }

        copyEmailButton.classList.add("is-copied");
        copyEmailButton.setAttribute("aria-label", "Email copied to clipboard");
        if (copyLabel) copyLabel.textContent = "Copied!";
        if (copyStatus) copyStatus.textContent = "Email copied to clipboard.";

        copyTimer = window.setTimeout(() => {
          copyTimer = null;
          resetCopyFeedback();
        }, 1700);
      });
    }

    function initializeMusicPlayer() {
      const player = document.getElementById("musicPlayer");
      const audio = document.getElementById("musicAudio");
      if (!player || !audio || typeof audio.play !== "function") return;

      const playPause = document.getElementById("musicPlayPause");
      const playlistToggle = document.getElementById("musicPlaylistToggle");
      const playlist = document.getElementById("musicPlaylist");
      const trackTitle = document.getElementById("musicTrackTitle");
      const status = document.getElementById("musicStatus");
      const currentTime = document.getElementById("musicCurrentTime");
      const duration = document.getElementById("musicDuration");
      const seek = document.getElementById("musicSeek");
      const volume = document.getElementById("musicVolume");
      const loopToggle = document.getElementById("musicLoop");
      const playIcon = playPause && playPause.querySelector(".music-icon-play");
      const pauseIcon = playPause && playPause.querySelector(".music-icon-pause");
      const tracks = Array.from(player.querySelectorAll(".music-track[data-src][data-title]"));
      let playRequestVersion = 0;
      let manualPlayPending = false;

      function setStatus(message) {
        if (status) status.textContent = message;
      }

      function formatTime(value) {
        if (!Number.isFinite(value) || value < 0) return "0:00";
        const seconds = Math.floor(value);
        const minutes = Math.floor(seconds / 60);
        const remainder = String(seconds % 60).padStart(2, "0");
        return minutes >= 60
          ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${remainder}`
          : `${minutes}:${remainder}`;
      }

      function updateProgress() {
        const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const elapsed = Number.isFinite(audio.currentTime) && audio.currentTime >= 0
          ? audio.currentTime : 0;

        if (currentTime) currentTime.textContent = formatTime(elapsed);
        if (duration) duration.textContent = formatTime(total);
        if (seek) {
          seek.disabled = total === 0;
          seek.value = String(total ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0);
          seek.setAttribute("aria-valuetext", `${formatTime(elapsed)} of ${formatTime(total)}`);
        }
      }

      function updatePlayControls() {
        const isPlaying = !audio.paused && !audio.ended;
        player.classList.toggle("is-playing", isPlaying);
        if (playPause) {
          const label = isPlaying ? "Pause ambient music" : "Play ambient music";
          playPause.setAttribute("aria-pressed", String(isPlaying));
          playPause.setAttribute("aria-label", label);
          playPause.title = label;
        }
        if (playIcon) playIcon.hidden = isPlaying;
        if (pauseIcon) pauseIcon.hidden = !isPlaying;
      }

      function setPlaylistOpen(isOpen) {
        if (!playlist) return;
        playlist.hidden = !isOpen;
        player.classList.toggle("is-open", isOpen);
        if (playlistToggle) {
          playlistToggle.setAttribute("aria-expanded", String(isOpen));
          const label = isOpen ? "Hide playlist and music controls" : "Show playlist and music controls";
          playlistToggle.setAttribute("aria-label", label);
          playlistToggle.title = label;
        }
      }

      function updateLoopControl() {
        if (!loopToggle) return;
        loopToggle.setAttribute("aria-pressed", String(audio.loop));
        loopToggle.setAttribute("aria-label", audio.loop ? "Turn looping off" : "Turn looping on");
        loopToggle.title = audio.loop ? "Turn looping off" : "Turn looping on";
      }

      function selectTrack(track) {
        if (!track) return false;
        const src = (track.getAttribute("data-src") || "").trim();
        if (!src) return false;

        for (const item of tracks) {
          const selected = item === track;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", String(selected));
          if (selected) item.setAttribute("aria-current", "true");
          else item.removeAttribute("aria-current");
        }

        if (trackTitle) trackTitle.textContent = track.getAttribute("data-title") || "Untitled track";
        if (audio.getAttribute("src") !== src) {
          audio.setAttribute("src", src);
          updateProgress();
          if (typeof audio.load === "function") audio.load();
        }
        return true;
      }

      // Calling play() synchronously before the first await preserves a click's
      // browser user activation. The initial call deliberately uses audible audio.
      async function requestPlay(isAutoplay = false) {
        const request = ++playRequestVersion;
        manualPlayPending = !isAutoplay;
        if (!isAutoplay) setStatus("Starting music...");
        try {
          await audio.play();
          if (request !== playRequestVersion) return;
          manualPlayPending = false;
          updatePlayControls();
          setStatus(audio.paused ? "Tap play to begin" : "Playing");
        } catch {
          if (request !== playRequestVersion) return;
          manualPlayPending = false;
          updatePlayControls();
          setStatus(audio.error ? "Unable to load music" :
            isAutoplay ? "Tap play to begin" : "Unable to play music");
        }
      }

      function pauseMusic() {
        ++playRequestVersion;
        manualPlayPending = false;
        audio.pause();
        updatePlayControls();
        setStatus("Paused");
      }

      if (playPause) {
        playPause.addEventListener("click", () => {
          if (!audio.paused || manualPlayPending) pauseMusic();
          else void requestPlay();
        });
      }

      if (playlist && playlistToggle) {
        playlistToggle.addEventListener("click", () => {
          setPlaylistOpen(playlist.hidden);
        });
      }

      for (const track of tracks) {
        track.addEventListener("click", () => {
          if (!selectTrack(track)) return;
          void requestPlay();
        });
      }

      if (seek) {
        seek.addEventListener("input", () => {
          const total = audio.duration;
          const percent = Number(seek.value);
          if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(percent)) return;
          try {
            audio.currentTime = total * Math.min(100, Math.max(0, percent)) / 100;
            updateProgress();
          } catch {
            // Some media cannot seek until enough data has loaded.
          }
        });
      }

      if (volume) {
        volume.value = "25";
        volume.addEventListener("input", () => {
          const next = Number(volume.value);
          if (Number.isFinite(next)) audio.volume = Math.min(1, Math.max(0, next / 100));
        });
      }
      audio.volume = 0.25;
      audio.loop = true;
      if (loopToggle) {
        loopToggle.addEventListener("click", () => {
          audio.loop = !audio.loop;
          updateLoopControl();
        });
      }

      audio.addEventListener("play", () => {
        updatePlayControls();
        if (!audio.paused) setStatus("Playing");
      });
      audio.addEventListener("playing", () => {
        updatePlayControls();
        setStatus("Playing");
      });
      audio.addEventListener("pause", () => {
        updatePlayControls();
        if (!audio.ended) setStatus("Paused");
      });
      audio.addEventListener("waiting", () => {
        if (!audio.paused) setStatus("Buffering music...");
      });
      audio.addEventListener("error", () => {
        ++playRequestVersion;
        manualPlayPending = false;
        updatePlayControls();
        setStatus("Unable to load music");
      });
      audio.addEventListener("ended", () => {
        updatePlayControls();
        if (!audio.loop) setStatus("Finished");
      });
      audio.addEventListener("loadedmetadata", updateProgress);
      audio.addEventListener("durationchange", updateProgress);
      audio.addEventListener("timeupdate", updateProgress);

      setPlaylistOpen(playlist ? !playlist.hidden : false);
      updateLoopControl();
      const initialTrack = tracks.find((track) => track.classList.contains("is-active")) || tracks[0];
      if (initialTrack) selectTrack(initialTrack);
      updateProgress();
      updatePlayControls();

      const hasSource = Boolean(audio.getAttribute("src") || audio.currentSrc ||
        (typeof audio.querySelector === "function" && audio.querySelector("source[src]")));
      if (hasSource) void requestPlay(true);
      else setStatus("No music available");
    }

    initializeMusicPlayer();

    function initializeVisualEffects() {
      // Class hooks are also added here so the effects work with the existing
      // HTML. CSS remains responsible for the actual transitions and keyframes.
      document.querySelectorAll(
        ".profile-card, .section-divider, .content-section, .site-footer"
      ).forEach((element) => element.classList.add("fx-reveal"));
      document.querySelectorAll(".about-panel, .story-card, .contact-card")
        .forEach((element) => element.classList.add("fx-tilt"));

      const hero = document.querySelector(".hero");
      if (hero) {
        const fairy = hero.querySelector(".hero-fairy");
        const glitter = hero.querySelector(".hero-glitter");
        if (fairy) {
          fairy.classList.add("fx-parallax");
          if (!fairy.hasAttribute("data-parallax-depth")) {
            fairy.setAttribute("data-parallax-depth", "1");
          }
        }
        if (glitter) {
          glitter.classList.add("fx-parallax");
          if (!glitter.hasAttribute("data-parallax-depth")) {
            glitter.setAttribute("data-parallax-depth", "0.65");
          }
        }
      }

      function mediaQuery(query) {
        try {
          return typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
        } catch {
          return null;
        }
      }

      const reducedMotion = mediaQuery("(prefers-reduced-motion: reduce)");
      const finePointer = mediaQuery("(hover: hover) and (pointer: fine)");
      const mobileWidth = mediaQuery("(max-width: 780px)");
      const isReduced = () => Boolean(reducedMotion && reducedMotion.matches);
      const canUsePointer = () => !isReduced() && Boolean(finePointer && finePointer.matches);
      const requestFrame = typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window) : null;
      const cancelFrame = typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame.bind(window) : null;

      const reveals = Array.from(document.querySelectorAll(".fx-reveal"));
      let revealObserver = null;
      function updateReveals() {
        if (revealObserver) {
          revealObserver.disconnect();
          revealObserver = null;
        }

        if (isReduced() || typeof window.IntersectionObserver !== "function") {
          root.classList.remove("fx-ready");
          reveals.forEach((element) => element.classList.add("is-visible"));
          return;
        }

        try {
          revealObserver = new window.IntersectionObserver((entries, observer) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });
          reveals.filter((element) => !element.classList.contains("is-visible"))
            .forEach((element) => revealObserver.observe(element));
          root.classList.add("fx-ready");
        } catch {
          if (revealObserver) revealObserver.disconnect();
          revealObserver = null;
          root.classList.remove("fx-ready");
          reveals.forEach((element) => element.classList.add("is-visible"));
        }
      }
      updateReveals();

      const tiltTargets = Array.from(document.querySelectorAll(".fx-tilt"));
      const tiltHandlers = tiltTargets.map((element) => {
        let frame = null;
        let lastPointer = null;

        function reset() {
          if (frame !== null && cancelFrame) cancelFrame(frame);
          frame = null;
          lastPointer = null;
          element.classList.remove("is-tilting");
          element.style.setProperty("--tilt-x", "0deg");
          element.style.setProperty("--tilt-y", "0deg");
          element.style.setProperty("--fx-tilt-x", "0deg");
          element.style.setProperty("--fx-tilt-y", "0deg");
        }

        function move(event) {
          if (event.pointerType === "touch" || !requestFrame) return;
          lastPointer = { x: event.clientX, y: event.clientY };
          if (frame !== null) return;
          frame = requestFrame(() => {
            frame = null;
            if (!lastPointer || !canUsePointer()) return;
            const bounds = element.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return;
            const x = Math.max(-1, Math.min(1, ((lastPointer.x - bounds.left) / bounds.width - 0.5) * 2));
            const y = Math.max(-1, Math.min(1, ((lastPointer.y - bounds.top) / bounds.height - 0.5) * 2));
            const tiltX = `${(-y * 3.5).toFixed(2)}deg`;
            const tiltY = `${(x * 3.5).toFixed(2)}deg`;
            element.style.setProperty("--tilt-x", tiltX);
            element.style.setProperty("--tilt-y", tiltY);
            element.style.setProperty("--fx-tilt-x", tiltX);
            element.style.setProperty("--fx-tilt-y", tiltY);
            element.classList.add("is-tilting");
          });
        }

        return {
          attach() {
            element.addEventListener("pointermove", move, { passive: true });
            element.addEventListener("pointerleave", reset);
            element.addEventListener("pointercancel", reset);
          },
          detach() {
            element.removeEventListener("pointermove", move);
            element.removeEventListener("pointerleave", reset);
            element.removeEventListener("pointercancel", reset);
            reset();
          },
          reset
        };
      });

      const parallaxTargets = hero ? Array.from(hero.querySelectorAll(".fx-parallax")) : [];
      let parallaxFrame = null;
      let parallaxPointer = null;
      function resetParallax() {
        if (parallaxFrame !== null && cancelFrame) cancelFrame(parallaxFrame);
        parallaxFrame = null;
        parallaxPointer = null;
        for (const element of parallaxTargets) {
          element.style.setProperty("--parallax-x", "0px");
          element.style.setProperty("--parallax-y", "0px");
          element.style.setProperty("--fx-parallax-x", "0px");
          element.style.setProperty("--fx-parallax-y", "0px");
        }
      }

      function moveParallax(event) {
        if (event.pointerType === "touch" || !requestFrame) return;
        parallaxPointer = { x: event.clientX, y: event.clientY };
        if (parallaxFrame !== null) return;
        parallaxFrame = requestFrame(() => {
          parallaxFrame = null;
          if (!parallaxPointer || !canUsePointer() || !hero) return;
          const bounds = hero.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return;
          const x = Math.max(-1, Math.min(1, ((parallaxPointer.x - bounds.left) / bounds.width - 0.5) * 2));
          const y = Math.max(-1, Math.min(1, ((parallaxPointer.y - bounds.top) / bounds.height - 0.5) * 2));
          for (const element of parallaxTargets) {
            const rawDepth = Number(element.getAttribute("data-parallax-depth"));
            const depth = Number.isFinite(rawDepth) ? Math.min(2, Math.max(0, rawDepth)) : 1;
            const parallaxX = `${(x * 9 * depth).toFixed(2)}px`;
            const parallaxY = `${(y * 6 * depth).toFixed(2)}px`;
            element.style.setProperty("--parallax-x", parallaxX);
            element.style.setProperty("--parallax-y", parallaxY);
            element.style.setProperty("--fx-parallax-x", parallaxX);
            element.style.setProperty("--fx-parallax-y", parallaxY);
          }
        });
      }

      let pointerAttached = false;
      function updatePointerEffects() {
        const enable = canUsePointer() && Boolean(requestFrame);
        if (enable === pointerAttached) return;
        pointerAttached = enable;
        for (const handler of tiltHandlers) {
          if (enable) handler.attach();
          else handler.detach();
        }
        if (hero && parallaxTargets.length) {
          if (enable) {
            hero.addEventListener("pointermove", moveParallax, { passive: true });
            hero.addEventListener("pointerleave", resetParallax);
            hero.addEventListener("pointercancel", resetParallax);
          } else {
            hero.removeEventListener("pointermove", moveParallax);
            hero.removeEventListener("pointerleave", resetParallax);
            hero.removeEventListener("pointercancel", resetParallax);
            resetParallax();
          }
        }
      }
      updatePointerEffects();

      let particleLayer = hero && hero.querySelector("#fairyParticles");
      const generatedParticles = [];
      if (hero && !particleLayer) {
        particleLayer = document.createElement("div");
        particleLayer.id = "fairyParticles";
        particleLayer.className = "fairy-particles";
        particleLayer.setAttribute("aria-hidden", "true");
        hero.appendChild(particleLayer);
      }
      if (particleLayer) {
        particleLayer.setAttribute("aria-hidden", "true");
        particleLayer.style.pointerEvents = "none";
      }

      function updateParticles() {
        if (!particleLayer) return;
        const isMobile = mobileWidth ? mobileWidth.matches : window.innerWidth <= 780;
        const targetCount = isReduced() ? 0 : isMobile ? 7 : 16;
        if (targetCount === generatedParticles.length) return;

        for (const particle of generatedParticles) particle.remove();
        generatedParticles.length = 0;
        if (!targetCount) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < targetCount; i++) {
          const particle = document.createElement("span");
          particle.className = "fairy-particle";
          particle.setAttribute("aria-hidden", "true");
          particle.style.pointerEvents = "none";
          particle.style.setProperty("--particle-x", `${(5 + Math.random() * 90).toFixed(1)}%`);
          particle.style.setProperty("--particle-y", `${(10 + Math.random() * 80).toFixed(1)}%`);
          particle.style.setProperty("--particle-size", `${(2 + Math.random() * 3).toFixed(1)}px`);
          particle.style.setProperty("--particle-delay", `${(-Math.random() * 15).toFixed(1)}s`);
          particle.style.setProperty("--particle-duration", `${(8 + Math.random() * 9).toFixed(1)}s`);
          generatedParticles.push(particle);
          fragment.appendChild(particle);
        }
        particleLayer.appendChild(fragment);
      }
      updateParticles();

      function onMotionChange() {
        updateReveals();
        updatePointerEffects();
        updateParticles();
      }
      function listenMedia(media, callback) {
        if (!media) return;
        if (typeof media.addEventListener === "function") media.addEventListener("change", callback);
        else if (typeof media.addListener === "function") media.addListener(callback);
      }
      listenMedia(reducedMotion, onMotionChange);
      listenMedia(finePointer, updatePointerEffects);
      listenMedia(mobileWidth, updateParticles);
      document.addEventListener("visibilitychange", () => {
        if (particleLayer) particleLayer.classList.toggle("is-paused", document.hidden);
        if (document.hidden) {
          tiltHandlers.forEach((handler) => handler.reset());
          resetParallax();
        }
      });
      window.addEventListener("blur", () => {
        tiltHandlers.forEach((handler) => handler.reset());
        resetParallax();
      });
    }

    initializeVisualEffects();

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k" && searchDialog) {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        setMenuOpen(false);
        closeSearch();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeControls, { once: true });
  } else {
    initializeControls();
  }
})();

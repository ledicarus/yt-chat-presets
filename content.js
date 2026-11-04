(() => {
  const DEFAULT_PRESETS = [
    { label: "Donor Class", text: ":_Donors: <( [x] IS PART OF THE DONOR CLASS!!!)" }
  ];
  const state = { presets: DEFAULT_PRESETS.slice(), autoSend: false, username: "", editing: false, open: true, emotes: {} };
  let statusEl = null;
  let root = null;
  let panel = null;

  const save = () =>
    chrome.storage.local.set({
      presets: state.presets,
      autoSend: state.autoSend,
      username: state.username,
      open: state.open,
      emotes: state.emotes
    });

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    children.forEach((c) => e.append(c));
    return e;
  }

  function getInput() {
    return document.querySelector("yt-live-chat-text-input-field-renderer #input");
  }

  const EMOTE_RE = /(:[^:\s]+:)/g;
  const EMOTE_ONE = /^:[^:\s]+:$/;
  let emoteSeq = 0;

  // Build an <img> the same way YouTube's emoji picker does, so it is sent as a real emote.
  function emoteHtml(e) {
    const img = document.createElement("img");
    img.className = "emoji yt-formatted-string style-scope yt-live-chat-text-input-field-renderer";
    img.src = e.src;
    img.alt = e.alt;
    img.setAttribute("data-emoji-id", e.id);
    img.setAttribute("shared-tooltip-text", e.tip);
    img.id = "emoji-ycp" + emoteSeq++;
    return img.outerHTML;
  }

  function showStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.hidden = false;
    clearTimeout(showStatus.t);
    showStatus.t = setTimeout(() => (statusEl.hidden = true), 9000);
  }

  // Copy emote images (from chat, the picker or the input) for every :shortcode: used in the presets.
  function learnEmotes() {
    const want = new Set();
    state.presets.forEach((p) => (p.text.match(EMOTE_RE) || []).forEach((c) => want.add(c)));
    if (!want.size) return;
    let changed = false;
    document.querySelectorAll("img[data-emoji-id]").forEach((img) => {
      if (img.closest("#ycp-root")) return;
      let tip = img.getAttribute("shared-tooltip-text") || img.getAttribute("alt") || "";
      if (tip && !EMOTE_ONE.test(tip)) tip = ":" + tip + ":";
      if (!want.has(tip)) return;
      const id = img.getAttribute("data-emoji-id");
      const src = img.currentSrc || img.src;
      const cur = state.emotes[tip];
      if (cur && cur.id === id && cur.src === src) return;
      state.emotes[tip] = { id, src, alt: img.getAttribute("alt") || tip, tip };
      changed = true;
      console.log("[YT Chat Presets] learned emote", tip);
    });
    if (changed) save();
  }

  function sendMessage(preset, userField) {
    const input = getInput();
    if (!input) return;
    const user = state.username.trim();
    if (/\[x\]/i.test(preset.text) && !user) {
      userField.classList.add("ycp-error");
      userField.focus();
      setTimeout(() => userField.classList.remove("ycp-error"), 800);
      return;
    }
    const text = preset.text.replace(/\[x\]/gi, user);
    input.focus();
    document.execCommand("selectAll", false);
    const missing = [];
    text.split(EMOTE_RE).forEach((part) => {
      if (!part) return;
      const emote = state.emotes[part];
      if (emote) {
        document.execCommand("insertHTML", false, emoteHtml(emote));
      } else {
        if (EMOTE_ONE.test(part)) missing.push(part);
        document.execCommand("insertText", false, part);
      }
    });
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // YouTube may convert plain :shortcodes: into emotes by itself, so re-check a moment later.
    setTimeout(() => {
      learnEmotes();
      const still = missing.filter((c) => input.textContent.includes(c));
      if (still.length) {
        showStatus(
          "Emote " + still.join(", ") + " not learned yet. Open the emoji picker (smiley) once so I can copy it, then press the button again. Not auto-sent."
        );
        return;
      }
      if (statusEl) statusEl.hidden = true;
      if (state.autoSend) {
        const btn =
          document.querySelector("#send-button button") ||
          document.querySelector("#send-button");
        if (btn) btn.click();
      }
    }, 250);
  }

  function render() {
    if (!panel) return;
    panel.textContent = "";

    const userField = el("input", {
      type: "text",
      className: "ycp-user",
      placeholder: "Username for [x]",
      value: state.username
    });
    userField.addEventListener("input", () => {
      state.username = userField.value;
      save();
    });

    const sendBox = el("input", { type: "checkbox", checked: state.autoSend });
    sendBox.addEventListener("change", () => {
      state.autoSend = sendBox.checked;
      save();
    });
    const sendLabel = el("label", { className: "ycp-auto", title: "Press Send automatically" }, [
      sendBox,
      document.createTextNode(" auto-send")
    ]);

    const gear = el("button", { className: "ycp-btn ycp-gear", textContent: state.editing ? "Done" : "Edit" });
    gear.addEventListener("click", () => {
      state.editing = !state.editing;
      render();
    });

    panel.append(el("div", { className: "ycp-row" }, [userField, sendLabel, gear]));

    if (!state.editing) {
      const row = el("div", { className: "ycp-row ycp-presets" });
      state.presets.forEach((p) => {
        const b = el("button", { className: "ycp-btn", textContent: p.label || "(unnamed)", title: p.text });
        b.addEventListener("click", () => sendMessage(p, userField));
        row.append(b);
      });
      const plus = el("button", { className: "ycp-btn ycp-gear", textContent: "+ New", title: "Add a new preset" });
      plus.addEventListener("click", () => {
        state.presets.push({ label: "New", text: "[x] " });
        state.editing = true;
        save();
        render();
      });
      row.append(plus);
      panel.append(row);
    } else {
      state.presets.forEach((p, i) => {
        const label = el("input", { type: "text", className: "ycp-edit-label", placeholder: "Button name", value: p.label });
        const text = el("input", { type: "text", className: "ycp-edit-text", placeholder: "Message, use [x] for username", value: p.text });
        const del = el("button", { className: "ycp-btn ycp-del", textContent: "✕", title: "Delete" });
        label.addEventListener("input", () => { p.label = label.value; save(); });
        text.addEventListener("input", () => { p.text = text.value; save(); });
        del.addEventListener("click", () => {
          state.presets.splice(i, 1);
          save();
          render();
        });
        panel.append(el("div", { className: "ycp-row" }, [label, text, del]));
      });
      const add = el("button", { className: "ycp-btn", textContent: "+ Add preset" });
      add.addEventListener("click", () => {
        state.presets.push({ label: "New", text: "[x] " });
        save();
        render();
      });
      const reset = el("button", { className: "ycp-btn", textContent: "Reset defaults" });
      reset.addEventListener("click", () => {
        if (!confirm("Replace all presets with the default?")) return;
        state.presets = DEFAULT_PRESETS.map((p) => ({ ...p }));
        save();
        render();
      });
      panel.append(el("div", { className: "ycp-row" }, [add, reset]));
    }
    statusEl = el("div", { className: "ycp-status", hidden: true });
    panel.append(statusEl);
  }

  // Speech-bubble icon: white outline, black fill, white "YT", transparent outside.
  function bubbleSvg(size) {
    const NS = "http://www.w3.org/2000/svg";
    const mk = (t, attrs) => {
      const n = document.createElementNS(NS, t);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    const svg = mk("svg", { viewBox: "0 0 100 100", width: size, height: size });
    svg.append(
      mk("path", {
        d: "M 13.4 56.4 A 40 40 0 1 1 32 80.6 L 10 92 Z",
        fill: "#000",
        stroke: "#fff",
        "stroke-width": "6",
        "stroke-linejoin": "round"
      })
    );
    const t = mk("text", {
      x: "52",
      y: "60",
      "text-anchor": "middle",
      "font-size": "34",
      "font-family": "Impact, 'Arial Black', sans-serif",
      fill: "#fff"
    });
    t.textContent = "YT";
    svg.append(t);
    return svg;
  }

  function placeToggle() {
    if (toggle.isConnected) return;
    const header = document.querySelector("yt-live-chat-header-renderer");
    if (!header) return;
    // Outermost button-like elements in the header, left to right, ignoring our own.
    const all = Array.from(
      header.querySelectorAll("button, yt-icon-button, [role='button']")
    ).filter((n) => n !== toggle && !toggle.contains(n));
    const outer = all.filter((n) => !all.some((o) => o !== n && o.contains(n)));
    const visible = outer
      .map((n) => ({ n, r: n.getBoundingClientRect() }))
      .filter((o) => o.r.width > 0 && o.r.height > 0)
      .sort((a, b) => a.r.left - b.r.left);
    // Preferred: YouTube's three-dot menu component. Fallback: second-to-last button by position.
    let menu = header.querySelector("#live-chat-header-context-menu");
    if (!menu && visible.length >= 2) menu = visible[visible.length - 2].n;
    // Always insert as a direct child of the header, never inside another component.
    while (menu && menu.parentNode !== header) menu = menu.parentNode;
    if (menu) {
      header.insertBefore(toggle, menu);
      console.log("[YT Chat Presets] toggle placed before", menu.tagName, menu.id);
    } else {
      header.append(toggle);
      console.log("[YT Chat Presets] header buttons not found, appended to header");
    }
  }

  // The preset panel floats directly above the message box; the toggle lives in the chat header.
  function ensurePanel() {
    if (!loaded || !document.body) return;
    if (!root || !root.isConnected) {
      panel = el("div", { id: "ycp-panel" });
      root = el("div", { id: "ycp-root" }, [panel]);
      document.body.append(root);
      panel.hidden = !state.open;
      console.log("[YT Chat Presets] panel attached");
      render();
    }
    placeToggle();
    const input = document.querySelector("yt-live-chat-message-input-renderer");
    const top = input ? input.getBoundingClientRect().top : 0;
    const bottom = top > 0 ? Math.max(0, window.innerHeight - top) : 0;
    root.style.bottom = bottom + "px";
  }
  const toggle = el("button", { id: "ycp-toggle", title: "Show / hide chat presets" });
  toggle.append(bubbleSvg(30));
  toggle.classList.toggle("ycp-off", false);
  toggle.addEventListener("click", () => {
    state.open = !state.open;
    if (panel) panel.hidden = !state.open;
    toggle.classList.toggle("ycp-off", !state.open);
    save();
  });
  let loaded = false;
  console.log("[YT Chat Presets] loaded in", location.href);

  chrome.storage.local.get(["presets", "autoSend", "username", "open", "emotes"], (s) => {
    if (s.emotes && typeof s.emotes === "object") state.emotes = s.emotes;
    if (Array.isArray(s.presets) && s.presets.length) state.presets = s.presets;
    state.autoSend = !!s.autoSend;
    state.username = s.username || "";
    state.open = s.open !== false;
    toggle.classList.toggle("ycp-off", !state.open);
    loaded = true;
    ensurePanel();
    setInterval(ensurePanel, 500);
    setInterval(learnEmotes, 2000);
  });
})();

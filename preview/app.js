// Docs: docs/05 - UI-UX/Preview.md
// Style preview behaviour only: navigation, sidebar, theme, route window, toasts, onboarding. No real data.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $("#app");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 860px)");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const icons = () => window.lucide && lucide.createIcons();

  // ---------- Pages ----------
  const PAGES = {
    overview: { title: "Overview" },
    routes: { title: "Routes", group: "Routing" },
    services: { title: "Services", group: "Routing", desc: "Containers and URLs your routes send traffic to." },
    middlewares: { title: "Middlewares", group: "Routing", desc: "Auth, headers, redirects and limits applied to routes." },
    domains: { title: "Domains", group: "Network", desc: "Every domain, its routes and its certificate." },
    certificates: { title: "Certificates", group: "Network", desc: "Let's Encrypt resolvers, issued certificates and TLS options." },
    entrypoints: { title: "Entrypoints", group: "Network", desc: "Ports Traefik listens on." },
    docker: { title: "Docker", group: "Sources", desc: "Containers on this host and how Traefik reaches them." },
    stats: { title: "Stats", group: "Observe", desc: "Requests, status codes and latency." },
    logs: { title: "Logs", group: "Observe", desc: "Traefik logs and access logs." },
    traefik: { title: "Traefik", group: "System", desc: "The Traefik container, its options and environment variables." },
    settings: { title: "Settings", group: "System", desc: "Account, theme, history and backups." },
    components: { title: "Components", group: "Preview only" },
  };
  let current = null;

  function showPage(name, { focus = true } = {}) {
    if (name === "onboarding") { openOnboarding(); return; }
    if (!PAGES[name]) name = "overview";
    if (name === current) return;
    const meta = PAGES[name];
    const target = $(`.page[data-page="${PAGES[name].desc ? "placeholder" : name}"]`);
    const prev = $(".page:not([hidden])");

    const reveal = () => {
      $$(".page").forEach(p => { p.hidden = p !== target; p.classList.remove("is-leaving", "is-entering"); });
      if (meta.desc) { $("#h-placeholder").textContent = meta.title; $("#placeholder-desc").textContent = meta.desc; }
      [...target.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 6)));
      void target.offsetWidth; // restart the animation
      target.classList.add("is-entering");
      window.scrollTo({ top: 0 });
      if (focus) $("#main").focus({ preventScroll: true });
    };
    if (prev && prev !== target && !reducedMotion.matches) {
      prev.classList.add("is-leaving");
      setTimeout(reveal, 90);
    } else reveal();

    current = name;
    $$(".nav-item").forEach(a => a.dataset.nav === name ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    $("#breadcrumb").innerHTML = (meta.group ? `<li>${meta.group}</li>` : "") + `<li><span aria-current="page">${meta.title}</span></li>`;
    document.title = `${meta.title} - eztraefik preview`;
    if (mobile.matches) setMobileNav(false);
  }
  window.addEventListener("hashchange", () => showPage(location.hash.slice(1)));

  // ---------- Sidebar ----------
  const toggle = $("#sidebar-toggle");
  function setCollapsed(collapsed) {
    app.dataset.sidebar = collapsed ? "collapsed" : "expanded";
    const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
    toggle.setAttribute("aria-label", label);
    toggle.dataset.tooltip = label;
    toggle.setAttribute("aria-expanded", String(!collapsed));
    store.set("ezt-sidebar", app.dataset.sidebar);
  }
  function setMobileNav(open) {
    app.dataset.mobileNav = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    toggle.dataset.tooltip = open ? "Close navigation" : "Open navigation";
    // In the mobile drawer the icon shows the "expanded" state while open
    app.dataset.sidebar = open ? "expanded" : "collapsed";
    showScrim(open, () => setMobileNav(false));
  }
  toggle.addEventListener("click", () => {
    if (mobile.matches) setMobileNav(app.dataset.mobileNav !== "open");
    else setCollapsed(app.dataset.sidebar !== "collapsed");
    hideTooltip();
  });
  function syncLayout() {
    if (mobile.matches) { app.dataset.mobileNav = "closed"; app.dataset.sidebar = "collapsed";
      toggle.setAttribute("aria-label", "Open navigation"); toggle.dataset.tooltip = "Open navigation"; toggle.setAttribute("aria-expanded", "false"); }
    else { showScrim(false); setCollapsed(store.get("ezt-sidebar") === "collapsed"); }
  }
  mobile.addEventListener("change", syncLayout);

  // ---------- Scrim (shared by the route window and mobile nav) ----------
  const scrim = $("#scrim");
  let scrimClose = null;
  function showScrim(show, onClose) {
    if (show) {
      scrimClose = onClose; scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add("is-open"));
    } else {
      scrimClose = null; scrim.classList.remove("is-open");
      setTimeout(() => { if (!scrim.classList.contains("is-open")) scrim.hidden = true; }, 200);
    }
  }
  scrim.addEventListener("click", () => scrimClose && scrimClose());

  // ---------- Tooltip ----------
  const tip = $("#tooltip");
  let tipTimer;
  function showTooltip(el) {
    const isNav = el.classList.contains("nav-item") || el.classList.contains("sidebar-foot");
    if (isNav && (app.dataset.sidebar !== "collapsed" || mobile.matches)) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tip.textContent = el.dataset.tooltip;
      const r = el.getBoundingClientRect();
      const side = el.dataset.tooltipSide || "right";
      tip.dataset.side = side;
      if (side === "bottom") { tip.style.left = `${Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2)}px`; tip.style.top = `${r.bottom + 8}px`; }
      else { tip.style.left = `${r.right + 10}px`; tip.style.top = `${r.top + r.height / 2 - tip.offsetHeight / 2}px`; }
      tip.classList.add("is-visible");
    }, 250);
  }
  function hideTooltip() { clearTimeout(tipTimer); tip.classList.remove("is-visible"); }
  $$("[data-tooltip]").forEach(el => {
    el.addEventListener("mouseenter", () => showTooltip(el));
    el.addEventListener("mouseleave", hideTooltip);
    el.addEventListener("focus", () => el.matches(":focus-visible") && showTooltip(el));
    el.addEventListener("blur", hideTooltip);
  });

  // ---------- Theme ----------
  const themeBtn = $("#theme-toggle");
  function effectiveTheme() {
    return document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  function renderThemeBtn() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    themeBtn.innerHTML = `<i data-lucide="${next === "light" ? "sun" : "moon"}" class="icon-sm"></i><span class="theme-label">${next === "light" ? "Light" : "Dark"}</span>`;
    themeBtn.setAttribute("aria-label", `Switch to ${next} theme`);
    icons(); renderSwatches();
  }
  themeBtn.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("ezt-theme", next); renderThemeBtn();
  });

  // ---------- Routes table ----------
  const ROUTES = [
    { name: "cloud", proto: "http", rule: "Host(`cloud.example.com`)", ep: "websecure", svc: "nextcloud", status: "warning", statusText: "1 server down" },
    { name: "grafana", proto: "http", rule: "Host(`grafana.example.com`)", ep: "websecure", svc: "grafana", status: "success", statusText: "Healthy" },
    { name: "media", proto: "http", rule: "Host(`media.example.com`)", ep: "websecure", svc: "jellyfin", status: "warning", statusText: "Cert expires soon" },
    { name: "api-gateway", proto: "http", rule: "Host(`example.com`) && PathPrefix(`/api`)", ep: "websecure", svc: "external-api", status: "success", statusText: "Healthy" },
    { name: "legacy-api", proto: "http", rule: "Host(`old.example.com`)", ep: "web", svc: "legacy", status: "danger", statusText: "Missing middleware" },
    { name: "postgres", proto: "tcp", rule: "HostSNI(`db.example.com`)", ep: "postgres", svc: "postgres", status: "success", statusText: "Healthy" },
    { name: "minecraft", proto: "tcp", rule: "HostSNI(`*`)", ep: "minecraft", svc: "mc-server", status: "success", statusText: "Healthy" },
    { name: "wireguard", proto: "udp", rule: "—", ep: "wg", svc: "wireguard", status: "", statusText: "Disabled" },
  ];
  let proto = "all", query = "";
  function renderRoutes() {
    const q = query.trim().toLowerCase();
    const rows = ROUTES.filter(r => (proto === "all" || r.proto === proto) && (!q || [r.name, r.rule, r.svc].some(v => v.toLowerCase().includes(q))));
    $("#routes-body").innerHTML = rows.map(r => `
      <tr>
        <td><a class="row-link" href="#routes" data-new-route>${r.name}</a> <span class="badge is-accent no-dot proto">${r.proto.toUpperCase()}</span><span class="rule rule-inline">${r.rule.replace(/&/g, "&amp;")}</span></td>
        <td class="col-rule"><span class="rule">${r.rule.replace(/&/g, "&amp;")}</span></td>
        <td class="col-optional muted">${r.ep}</td>
        <td class="col-optional muted">${r.svc}</td>
        <td><span class="badge ${r.status ? "is-" + r.status : ""}">${r.statusText}</span></td>
        <td class="actions"><button class="icon-btn" type="button" aria-label="Actions for ${r.name}"><i data-lucide="ellipsis"></i></button></td>
      </tr>`).join("");
    $("#routes-empty").hidden = rows.length > 0;
    $("table", $('[data-page="routes"]')).hidden = rows.length === 0;
    $("#routes-count").textContent = `${rows.length} of ${ROUTES.length} routes`;
    icons();
  }
  $("#route-search").addEventListener("input", e => { query = e.target.value; renderRoutes(); });
  $("#clear-filters").addEventListener("click", () => {
    query = ""; $("#route-search").value = ""; setRadio($("#proto-filter"), "all"); proto = "all"; renderRoutes();
  });

  // Radio groups built from buttons: click and arrow keys
  function setRadio(group, value) {
    $$('[role="radio"]', group).forEach(b => {
      const on = (b.dataset.proto || b.dataset.value) === value;
      b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1;
    });
  }
  $$('[role="radiogroup"]').forEach(group => {
    const radios = $$('[role="radio"]', group);
    radios.forEach((b, i) => {
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", () => {
        const v = b.dataset.proto || b.dataset.value; setRadio(group, v);
        if (group.id === "proto-filter") { proto = v; renderRoutes(); }
        if (group.id === "f-target-type") onFormChange();
      });
      b.addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return; e.preventDefault();
        const n = radios[(i + d + radios.length) % radios.length]; n.focus(); n.click();
      });
    });
  });

  // Switches
  document.addEventListener("click", e => {
    const sw = e.target.closest("[data-switch]");
    if (sw) { sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true")); onFormChange(); }
  });

  // ---------- New route window ----------
  const modal = $("#route-modal");
  let lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false; modal.classList.remove("is-closing");
    showScrim(true, closeModal);
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
    selectTab("tab-common", { focus: false, animate: false });
    onFormChange();
    setTimeout(() => $("#f-name").focus(), 60);
  }
  function closeModal() {
    modal.classList.add("is-closing"); modal.classList.remove("is-open");
    showScrim(false);
    setTimeout(() => { modal.hidden = true; }, 160);
    lastFocus && lastFocus.focus();
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-new-route]")) { e.preventDefault(); openModal(); }
    if (e.target.closest("[data-close-modal]")) closeModal();
  });
  // Clicking the empty area around the window closes it, like the scrim
  modal.addEventListener("mousedown", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!modal.hidden) closeModal();
    else if (app.dataset.mobileNav === "open") { setMobileNav(false); toggle.focus(); }
  });
  // Keep focus inside the open window
  modal.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const f = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]', modal)
      .filter(el => el.offsetParent && el.tabIndex !== -1);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Tabs: click, arrow keys, Home / End. The indicator slides with transform only.
  const tabs = $$('#route-tabs [role="tab"]');
  const indicator = $("#route-tabs .tab-indicator");
  function moveIndicator(tab) {
    indicator.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
  }
  function selectTab(id, { focus = true, animate = true } = {}) {
    tabs.forEach(t => {
      const on = t.id === id;
      t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
      const panel = $("#" + t.getAttribute("aria-controls"));
      panel.hidden = !on;
      if (on && animate && !reducedMotion.matches) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); }
      if (on) { moveIndicator(t); if (focus) t.focus(); }
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.id));
    t.addEventListener("keydown", e => {
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return; e.preventDefault();
      selectTab(tabs[(n + tabs.length) % tabs.length].id);
    });
  });
  window.addEventListener("resize", () => { if (!modal.hidden) moveIndicator($('#route-tabs [aria-selected="true"]')); });

  // Certificates known to this host. A certificate is offered only when it covers the domain.
  const CERTS = [
    { id: "wild", names: ["*.example.com"], source: "Let's Encrypt, DNS challenge", expires: "in 64 days", status: "" },
    { id: "apex", names: ["example.com", "www.example.com"], source: "Let's Encrypt", expires: "in 6 days", status: "warning" },
    { id: "lan", names: ["*.home.lan"], source: "Uploaded, internal CA", expires: "on 1 Mar 2027", status: "" },
  ];
  const covers = (name, host) => name === host || (name.startsWith("*.") && host.endsWith(name.slice(1)) && host.split(".").length === name.split(".").length);
  let certChoice = "new";

  function renderCerts() {
    const host = $("#f-host").value.trim().toLowerCase();
    const matching = host ? CERTS.filter(c => c.names.some(n => covers(n, host))) : [];
    if (!matching.some(c => c.id === certChoice)) certChoice = matching[0] ? matching[0].id : "new";
    const item = (id, title, sub, extra = "") => `
      <label class="choice">
        <input type="radio" name="cert" value="${id}" ${certChoice === id ? "checked" : ""}>
        <span class="grow"><span class="title">${title}</span>${extra}<br><span class="sub">${sub}</span></span>
      </label>`;
    $("#cert-list").innerHTML =
      matching.map(c => item(c.id, `<span class="mono">${c.names.join(", ")}</span>`,
        `${c.source}, expires ${c.expires}`,
        c.status === "warning" ? ` <span class="badge is-warning">Expires soon</span>` : ` <span class="badge is-success">Covers this domain</span>`)).join("") +
      item("new", "Generate a new certificate",
        host ? `Let's Encrypt issues one for <span class="mono">${host}</span> on the first visit, usually in under a minute.` : "Let's Encrypt issues one for this domain on the first visit.");
    const others = CERTS.length - matching.length;
    $("#cert-other").textContent = !host ? "Enter a domain in Common to see the certificates that cover it."
      : others ? `${others} other certificate${others > 1 ? "s" : ""} on this host ${others > 1 ? "don't" : "doesn't"} cover this domain.` : "";
  }
  $("#cert-list").addEventListener("change", e => { certChoice = e.target.value; renderYaml(); });

  function syncTarget() {
    const type = $('#f-target-type [aria-checked="true"]').dataset.value;
    $$(".target-host").forEach(el => { el.hidden = el.dataset.target !== type; });
    const msg = $("#f-target-msg");
    if (!msg.classList.contains("error")) msg.textContent = msg.dataset["hint" + (type === "ip" ? "Ip" : "Docker")];
  }
  $("#f-container").addEventListener("change", e => {
    // Prefill the port the container exposes, the user can still change it
    const port = e.target.selectedOptions[0].dataset.port;
    if (port) $("#f-port").value = port;
  });

  function syncTls() {
    const on = $("#f-tls").getAttribute("aria-checked") === "true";
    $("#cert-fieldset").disabled = !on;
    $("#f-redirect").disabled = !on;
  }

  function onFormChange() { syncTarget(); syncTls(); renderCerts(); renderYaml(); }

  function renderYaml() {
    const name = $("#f-name").value.trim() || "my-route";
    const host = $("#f-host").value.trim() || "example.com";
    const type = $('#f-target-type [aria-checked="true"]').dataset.value;
    const target = (type === "docker" ? $("#f-container").value : $("#f-ip").value.trim()) || (type === "docker" ? "container" : "192.168.1.20");
    const port = $("#f-port").value.trim() || "80";
    const tls = $("#f-tls").getAttribute("aria-checked") === "true";
    const redirect = tls && $("#f-redirect").getAttribute("aria-checked") === "true";
    const k = s => `<span class="k">${s}</span>`, s = v => `<span class="s">${v}</span>`;
    const cert = CERTS.find(c => c.id === certChoice);
    let out = `${k("http")}:\n  ${k("routers")}:\n    ${k(name)}:\n`;
    out += `      ${k("rule")}: ${s(`"Host(\`${host}\`)"`)}\n`;
    out += `      ${k("entryPoints")}: [${tls ? "websecure" : "web"}]\n      ${k("service")}: ${name}\n`;
    if (tls) out += cert
      ? `      ${k("tls")}:\n        ${k("domains")}:\n          - ${k("main")}: ${s('"' + cert.names[0] + '"')}\n`
      : `      ${k("tls")}:\n        ${k("certResolver")}: letsencrypt\n`;
    if (redirect) out += `    ${k(name + "-http")}:\n      ${k("rule")}: ${s(`"Host(\`${host}\`)"`)}\n      ${k("entryPoints")}: [web]\n      ${k("middlewares")}: [redirect-to-https]\n      ${k("service")}: ${name}\n`;
    out += `  ${k("services")}:\n    ${k(name)}:\n      ${k("loadBalancer")}:\n        ${k("servers")}:\n          - ${k("url")}: ${s(`"http://${target}:${port}"`)}\n`;
    $("#yaml-preview").innerHTML = out;
  }
  $("#route-form").addEventListener("input", e => {
    const f = FIELDS.find(x => x.el === e.target.id);
    if (f && $("#" + f.el).getAttribute("aria-invalid") === "true") validateField(f);
    if (e.target.getAttribute("aria-invalid") === "true" && ["f-ip", "f-port"].includes(e.target.id)) validateAll();
    updateTabDots();
    onFormChange();
  });
  $("#route-form").addEventListener("change", e => {
    if (e.target.id === "f-container" && e.target.getAttribute("aria-invalid") === "true") validateAll();
    onFormChange(); updateTabDots();
  });

  // Validation: message under the field, a dot on the tab that has errors
  const FIELDS = [
    { el: "f-name", msg: "f-name-msg", tab: "tab-common",
      check: v => !v ? "Give the route a name." : !/^[a-z0-9-]+$/.test(v) ? "Use only lowercase letters, numbers and dashes." : "" },
    { el: "f-host", msg: "f-host-msg", tab: "tab-common",
      check: v => !v ? "Enter the domain visitors will use." : !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v) ? "This doesn't look like a domain, for example app.example.com." : "" },
    { el: () => $('#f-target-type [aria-checked="true"]').dataset.value === "docker" ? "f-container" : "f-ip", msg: "f-target-msg", tab: "tab-common",
      check: (v, id) => !v ? (id === "f-container" ? "Choose the container to forward to." : "Enter an IP address or hostname.") : "" },
    { el: "f-port", msg: "f-target-msg", tab: "tab-common",
      check: v => !v ? "Enter the port the app listens on." : !(+v >= 1 && +v <= 65535 && /^\d+$/.test(v)) ? "Port must be between 1 and 65535." : "" },
  ];
  function setMessage(msgId, inputId, text) {
    const msg = $("#" + msgId), input = $("#" + inputId);
    if (text) {
      input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", msgId);
      msg.className = "error"; msg.innerHTML = `<i data-lucide="circle-alert"></i>${text}`; icons();
    } else {
      input.removeAttribute("aria-invalid");
      msg.className = "hint"; msg.textContent = msg.dataset.hint || "";
      if (msgId === "f-target-msg") syncTarget();
    }
  }
  function validateField(f) {
    const id = typeof f.el === "function" ? f.el() : f.el;
    const text = f.check($("#" + id).value.trim(), id);
    setMessage(f.msg, id, text);
    return text ? id : null;
  }
  function updateTabDots() {
    tabs.forEach(t => { $(".tab-dot", t).hidden = !$("#" + t.getAttribute("aria-controls")).querySelector('[aria-invalid="true"]'); });
  }
  function validateAll() {
    // Target and port share one message line: show the first problem only
    ["f-container", "f-ip", "f-port"].forEach(id => $("#" + id).removeAttribute("aria-invalid"));
    $("#f-target-msg").className = "hint"; syncTarget();
    const bad = [];
    for (const f of FIELDS) {
      if (f.msg === "f-target-msg" && bad.some(b => b.msg === "f-target-msg")) continue;
      const id = validateField(f); if (id) bad.push({ id, tab: f.tab, msg: f.msg });
    }
    updateTabDots();
    return bad;
  }

  $("#route-form").addEventListener("submit", e => {
    e.preventDefault();
    const bad = validateAll();
    if (bad.length) {
      selectTab(bad[0].tab, { focus: false });
      $("#" + bad[0].id).focus();
      return;
    }
    const btn = $("#f-submit");
    btn.disabled = true; btn.classList.add("is-loading"); btn.setAttribute("aria-busy", "true");
    btn.innerHTML = `<i data-lucide="loader-circle" class="spin"></i><span class="btn-label">Creating</span>`; icons();
    setTimeout(() => {
      btn.disabled = false; btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy");
      btn.innerHTML = `<span class="btn-label">Create route</span>`;
      const name = $("#f-name").value.trim(), host = $("#f-host").value.trim();
      closeModal(); toast(`Route ${name} created. ${host} is live.`);
      $("#route-form").reset(); certChoice = "new";
      ["f-tls", "f-redirect"].forEach(id => $("#" + id).setAttribute("aria-checked", "true"));
      setRadio($("#f-target-type"), "docker"); tabs.forEach(t => { $(".tab-dot", t).hidden = true; });
    }, 900);
  });

  // ---------- Toasts ----------
  function toast(text) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i data-lucide="circle-check"></i><span class="grow"></span><button class="icon-btn" type="button" aria-label="Dismiss"><i data-lucide="x" class="icon-sm"></i></button>`;
    $(".grow", el).textContent = text;
    $("#toasts").append(el); icons();
    const remove = () => { el.classList.add("is-leaving"); setTimeout(() => el.remove(), 160); };
    $("button", el).addEventListener("click", remove);
    setTimeout(remove, 5000);
  }
  document.addEventListener("click", e => { const t = e.target.closest("[data-toast]"); if (t) toast(t.dataset.toast); });

  // ---------- Swatches ----------
  function renderSwatches() {
    const css = getComputedStyle(document.documentElement);
    const list = [["Background", "--bg"], ["Surface", "--surface"], ["Surface 2", "--surface-2"], ["Border", "--border-strong"],
      ["Text", "--text"], ["Text muted", "--text-muted"], ["Accent", "--accent"], ["Success", "--success"], ["Warning", "--warning"], ["Danger", "--danger"]];
    $("#swatches").innerHTML = list.map(([n, v]) =>
      `<div class="swatch"><div class="chip" style="background:var(${v})"></div><div class="meta"><strong>${n}</strong><span class="mono">${css.getPropertyValue(v).trim()}</span></div></div>`).join("");
  }

  // ---------- Onboarding ----------
  const STEPS = [
    { title: "Set up eztraefik", lead: "A few questions and Traefik will be running on this host. You can change every answer later.",
      body: `<ul class="list card"><li class="list-row"><span class="sev is-neutral"><i data-lucide="container" class="icon-sm"></i></span><div class="grow"><div class="title">Check Docker</div><div class="sub">eztraefik manages containers through the Docker socket.</div></div></li>
        <li class="list-row"><span class="sev is-neutral"><i data-lucide="box" class="icon-sm"></i></span><div class="grow"><div class="title">Create the Traefik container</div><div class="sub">With the ports, domain and certificates you choose.</div></div></li>
        <li class="list-row"><span class="sev is-neutral"><i data-lucide="lock" class="icon-sm"></i></span><div class="grow"><div class="title">Create your account</div><div class="sub">Only you can open this panel.</div></div></li></ul>` },
    { title: "Docker", lead: "eztraefik found the Docker socket.",
      body: `<div class="card"><div class="check-row" style="padding:var(--space-4) var(--space-5)"><span class="sev is-success"><i data-lucide="circle-check" class="icon-sm"></i></span><div class="grow"><div class="title">Connected to Docker 28.4</div><div class="sub mono">/var/run/docker.sock</div></div></div>
        <div class="check-row" style="padding:var(--space-4) var(--space-5)"><span class="sev is-success"><i data-lucide="circle-check" class="icon-sm"></i></span><div class="grow"><div class="title">14 containers, 3 networks</div><div class="sub">You will see them in Docker after setup.</div></div></div></div>` },
    { title: "Traefik", lead: "A Traefik container named traefik is already running. Use it or start fresh.",
      body: `<div class="choice-grid" role="radiogroup" aria-label="Traefik container">
        <label class="choice"><input type="radio" name="ob-traefik" checked><span><span class="title">Create a new one</span><br><span class="sub">eztraefik owns its config. The old container is stopped, not deleted.</span></span></label>
        <label class="choice"><input type="radio" name="ob-traefik"><span><span class="title">Adopt the existing one</span><br><span class="sub">eztraefik recreates it with the same settings, then manages it.</span></span></label></div>
        <div class="field" style="margin-top:var(--space-5);max-width:280px"><label class="label" for="ob-tag">Traefik version</label><select class="select" id="ob-tag"><option>v3.7.16 (latest)</option><option>v3.6</option></select></div>` },
    { title: "Ports", lead: "Where Traefik listens. Add custom ports like 5432 or 25565 later in Entrypoints.",
      body: `<div class="field-row"><div class="field"><label class="label" for="ob-http">HTTP port</label><input class="input mono" id="ob-http" value="80"></div>
        <div class="field" style="margin-top:0"><label class="label" for="ob-https">HTTPS port</label><input class="input mono" id="ob-https" value="443"></div></div>
        <div class="field"><span class="label" id="ob-redir">Redirect HTTP to HTTPS</span><span class="switch"><button type="button" role="switch" aria-checked="true" aria-labelledby="ob-redir" data-switch></button><span class="hint">Recommended</span></span></div>` },
    { title: "First domain", lead: "The domain you will serve apps on. Add more later in Domains.",
      body: `<div class="field" style="max-width:420px"><label class="label" for="ob-domain">Domain</label><input class="input mono" id="ob-domain" value="example.com"><span class="hint" style="display:flex;align-items:center;gap:6px;color:var(--success)"><i data-lucide="circle-check" class="icon-sm"></i>Points to this host (203.0.113.24)</span></div>` },
    { title: "Certificates", lead: "How HTTPS certificates are issued.",
      body: `<div class="choice-grid" role="radiogroup" aria-label="Certificate method">
        <label class="choice"><input type="radio" name="ob-cert" checked><span><span class="title">Let's Encrypt, HTTP challenge</span><br><span class="sub">Simplest. Needs port 80 reachable from the internet.</span></span></label>
        <label class="choice"><input type="radio" name="ob-cert"><span><span class="title">Let's Encrypt, DNS challenge</span><br><span class="sub">Works behind a firewall and for wildcards. Needs a DNS provider token.</span></span></label>
        <label class="choice"><input type="radio" name="ob-cert"><span><span class="title">Upload my own</span><br><span class="sub">Certificate and key in PEM format.</span></span></label>
        <label class="choice"><input type="radio" name="ob-cert"><span><span class="title">Decide later</span><br><span class="sub">Routes stay on HTTP until you add a certificate.</span></span></label></div>
        <div class="field" style="margin-top:var(--space-5);max-width:420px"><label class="label" for="ob-email">Email for Let's Encrypt</label><input class="input" id="ob-email" type="email" placeholder="you@example.com"><span class="hint">Used only for expiry notices.</span></div>` },
    { title: "Your account", lead: "Sign in with this to open eztraefik.",
      body: `<div style="max-width:420px"><div class="field"><label class="label" for="ob-user">Username</label><input class="input" id="ob-user" value="admin" autocomplete="username"></div>
        <div class="field"><label class="label" for="ob-pass">Password</label><input class="input" id="ob-pass" type="password" autocomplete="new-password"><span class="hint">At least 12 characters.</span></div></div>` },
    { title: "Review", lead: "This is what will be created.",
      body: `<pre class="code-block">docker run -d --name traefik \\
  -p 80:80 -p 443:443 \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v ezt-dynamic:/etc/traefik/dynamic \\
  traefik:v3.7.16 \\
  --entrypoints.web.address=:80 \\
  --entrypoints.web.http.redirections.entrypoint.to=websecure \\
  --entrypoints.websecure.address=:443 \\
  --providers.docker.exposedbydefault=false \\
  --providers.file.directory=/etc/traefik/dynamic \\
  --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web</pre>` },
  ];
  let step = 0;
  const ob = $("#onboarding");
  function renderStep() {
    const s = STEPS[step], el = $("#ob-step");
    el.innerHTML = `<h1 id="ob-title" tabindex="-1">${s.title}</h1><p class="lead">${s.lead}</p>${s.body}`;
    el.classList.remove("is-entering"); void el.offsetWidth; el.classList.add("is-entering");
    $$("#ob-steps li").forEach((li, i) => {
      li.classList.toggle("is-done", i < step);
      i === step ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
    });
    $("#ob-back").disabled = step === 0;
    $("#ob-skip").hidden = step === 0 || step === STEPS.length - 1;
    $("#ob-next .btn-label").textContent = step === 0 ? "Start" : step === STEPS.length - 1 ? "Create Traefik" : "Continue";
    icons();
    $("#ob-title").focus({ preventScroll: true });
  }
  function openOnboarding() {
    step = 0; ob.hidden = false; ob.classList.add("is-open"); renderStep();
  }
  function closeOnboarding() {
    ob.classList.remove("is-open"); ob.hidden = true;
    if (location.hash === "#onboarding") history.replaceState(null, "", "#overview");
    current = null; showPage("overview");
  }
  $("#ob-back").addEventListener("click", () => { if (step > 0) { step--; renderStep(); } });
  $("#ob-skip").addEventListener("click", () => { step++; renderStep(); });
  $("#ob-exit").addEventListener("click", closeOnboarding);
  $("#ob-next").addEventListener("click", () => {
    if (step < STEPS.length - 1) { step++; renderStep(); return; }
    const btn = $("#ob-next");
    btn.disabled = true; btn.innerHTML = `<i data-lucide="loader-circle" class="spin"></i><span class="btn-label">Starting Traefik</span>`; icons();
    setTimeout(() => {
      btn.disabled = false; btn.innerHTML = `<span class="btn-label">Continue</span><i data-lucide="arrow-right"></i>`;
      closeOnboarding(); toast("Traefik is running on ports 80 and 443.");
    }, 1400);
  });

  // ---------- Init ----------
  syncLayout();
  renderRoutes();
  renderThemeBtn();
  icons();
  showPage(location.hash.slice(1) || "overview", { focus: false });
})();

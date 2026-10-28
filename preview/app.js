// Docs: docs/05 - UI-UX/Preview.md
// Style preview behaviour only: navigation, sidebar, theme, drawer, toasts, onboarding. No real data.
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

  // ---------- Scrim (shared by drawer and mobile nav) ----------
  const scrim = $("#drawer-scrim");
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
        <td><a class="row-link" href="#routes" data-open-drawer>${r.name}</a> <span class="badge is-accent no-dot proto">${r.proto.toUpperCase()}</span></td>
        <td><span class="rule">${r.rule.replace(/&/g, "&amp;")}</span></td>
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
        if (group.id === "f-proto") renderYaml();
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
    if (sw) { sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true")); renderYaml(); }
  });

  // ---------- Drawer ----------
  const drawer = $("#drawer");
  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false; drawer.classList.remove("is-closing");
    showScrim(true, closeDrawer);
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
    renderYaml();
    setTimeout(() => $("#f-name").focus(), 60);
  }
  function closeDrawer() {
    drawer.classList.add("is-closing"); drawer.classList.remove("is-open");
    showScrim(false);
    setTimeout(() => { drawer.hidden = true; }, 200);
    lastFocus && lastFocus.focus();
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-open-drawer]")) { e.preventDefault(); openDrawer(); }
    if (e.target.closest("[data-close-drawer]")) closeDrawer();
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!drawer.hidden) closeDrawer();
    else if (app.dataset.mobileNav === "open") { setMobileNav(false); toggle.focus(); }
  });
  // Keep focus inside the open drawer
  drawer.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const f = $$('button:not([disabled]), input:not([disabled]), select, summary, [tabindex="0"]', drawer).filter(el => el.offsetParent);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function renderYaml() {
    const name = $("#f-name").value.trim() || "my-route";
    const host = $("#f-host").value.trim() || "example.com";
    const path = $("#f-path").value.trim();
    const eps = $$('input[name="ep"]:checked').map(i => i.value);
    const p = $('#f-proto [aria-checked="true"]').dataset.value;
    const tls = $("#f-tls").getAttribute("aria-checked") === "true";
    const svc = $("#f-service").value;
    const k = s => `<span class="k">${s}</span>`, s = v => `<span class="s">${v}</span>`;
    const rule = p === "http" ? `Host(\`${host}\`)${path && path !== "/" ? ` &amp;&amp; PathPrefix(\`${path}\`)` : ""}` : `HostSNI(\`${host}\`)`;
    let out = `${k(p)}:\n  ${k("routers")}:\n    ${k(name)}:\n`;
    if (p !== "udp") out += `      ${k("rule")}: ${s('"' + rule + '"')}\n`;
    out += `      ${k("entryPoints")}: [${eps.join(", ") || "websecure"}]\n      ${k("service")}: ${svc}\n`;
    if (tls && p !== "udp") out += `      ${k("tls")}:\n        ${k("certResolver")}: letsencrypt\n`;
    $("#yaml-preview").innerHTML = out;
  }
  $("#route-form").addEventListener("input", e => {
    if (e.target.id === "f-name") validateName(false);
    renderYaml();
  });

  function validateName(show = true) {
    const input = $("#f-name"), v = input.value.trim();
    const msg = !v ? "Give the route a name." : !/^[a-z0-9-]+$/.test(v) ? "Use only lowercase letters, numbers and dashes." : "";
    const hint = $("#f-name-hint");
    if (msg && show) {
      input.setAttribute("aria-invalid", "true");
      hint.className = "error"; hint.innerHTML = `<i data-lucide="circle-alert"></i>${msg}`; icons();
    } else if (!msg) {
      input.removeAttribute("aria-invalid");
      hint.className = "hint"; hint.textContent = "Lowercase letters, numbers and dashes.";
    }
    return !msg;
  }

  $("#route-form").addEventListener("submit", e => {
    e.preventDefault();
    if (!validateName()) { $("#f-name").focus(); return; }
    const btn = $("#f-submit");
    btn.disabled = true; btn.classList.add("is-loading"); btn.setAttribute("aria-busy", "true");
    btn.innerHTML = `<i data-lucide="loader-circle" class="spin"></i><span class="btn-label">Creating</span>`; icons();
    setTimeout(() => {
      btn.disabled = false; btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy");
      btn.innerHTML = `<span class="btn-label">Create route</span>`;
      const name = $("#f-name").value.trim();
      closeDrawer(); toast(`Route ${name} created. Traefik picked it up.`);
      $("#route-form").reset(); $("#f-tls").setAttribute("aria-checked", "true"); setRadio($("#f-proto"), "http");
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

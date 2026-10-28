/* =========================================================
   TC2038 · animated, interactive widgets for Reveal.js
   Usage inside a Markdown slide (keep it on one line):
     <div class="w" data-widget="mergesort" data-input="40,21,4,10,9,35"></div>
   Every animated widget has a step bar: Reset · Prev · Play · Next · End.
   The presenter can also press  .  (next step) and  ,  (previous step).
   ========================================================= */
(function () {
  "use strict";

  const registry = {};
  const live = [];
  const SVGNS = "http://www.w3.org/2000/svg";

  // ---------- tiny DOM helpers ----------
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k === "class") e.className = v;
      else if (k === "style") e.style.cssText = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  function S(tag, attrs, text) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v != null) e.setAttribute(k, v); }
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(w, hgt) { return S("svg", { viewBox: "0 0 " + w + " " + hgt, preserveAspectRatio: "xMidYMid meet" }); }
  function btn(label, fn, title) { return h("button", { type: "button", title: title || null, onclick: fn }, label); }
  function nums(str) { return String(str || "").split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => !isNaN(x)); }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function stat(label, value) { return h("span", {}, label + " ", h("b", {}, String(value))); }
  function cell(content, cls, idx) {
    return h("div", { class: "cell " + (cls || "") }, idx != null ? h("span", { class: "idx" }, idx) : null, String(content));
  }
  function setOn(group, active) { group.forEach((b) => b.classList.toggle("on", b === active)); }
  function fmtNum(x) { return Number.isInteger(x) ? String(x) : x.toFixed(2); }
  function tex(s, el) {
    if (window.katex) { try { window.katex.render(s, el, { throwOnError: false }); return el; } catch (e) { /* fall back */ } }
    el.textContent = s; return el;
  }

  // ---------- Stepper: frames + transport bar ----------
  function Stepper(render) {
    const st = { i: 0, frames: [], timer: null };
    const caption = h("div", { class: "w-caption" });
    const count = h("span", { class: "count" });
    const bReset = btn("↺", () => go(0), "Reset");
    const bPrev = btn("‹ Prev", () => { stop(); go(st.i - 1); });
    const bPlay = btn("Play", toggle);
    const bNext = btn("Next ›", () => { stop(); go(st.i + 1); });
    const bEnd = btn("⇥", () => { stop(); go(st.frames.length - 1); }, "Jump to end");
    const speed = h("input", { type: "range", min: 1, max: 10, value: 5, title: "speed" });
    const bar = h("div", { class: "w-controls" }, bReset, bPrev, bPlay, bNext, bEnd, h("label", {}, "speed"), speed, count);
    function delay() { return 1700 / Math.pow(1.5, speed.value - 1); }
    function go(i) {
      if (!st.frames.length) return;
      st.i = Math.max(0, Math.min(st.frames.length - 1, i));
      paint();
    }
    function paint() {
      const f = st.frames[st.i];
      render(f, st.i, st.frames);
      caption.innerHTML = (f && f.msg) || "&nbsp;";
      count.textContent = (st.i + 1) + " / " + st.frames.length;
      bPrev.disabled = st.i === 0;
      bNext.disabled = st.i >= st.frames.length - 1;
    }
    function stop() { clearTimeout(st.timer); st.timer = null; bPlay.textContent = "Play"; }
    function tick() {
      st.timer = setTimeout(() => {
        if (st.i < st.frames.length - 1) { st.i++; paint(); tick(); } else stop();
      }, delay());
    }
    function toggle() {
      if (st.timer) { stop(); return; }
      if (st.i >= st.frames.length - 1) st.i = 0;
      bPlay.textContent = "Pause";
      paint(); tick();
    }
    return {
      bar, caption,
      set(frames, at) { stop(); st.frames = frames; st.i = at === "end" ? frames.length - 1 : 0; paint(); },
      step(d) { stop(); go(st.i + d); },
      repaint() { if (st.frames.length) paint(); },
      stop,
      get index() { return st.i; }
    };
  }

  function register(name, fn) { registry[name] = fn; }

  function mountAll(root) {
    root.querySelectorAll(".w[data-widget]").forEach((host) => {
      if (host.dataset.ready) return;
      const fn = registry[host.dataset.widget];
      if (!fn) { host.textContent = "Unknown widget: " + host.dataset.widget; return; }
      host.dataset.ready = "1";
      if (host.dataset.h) host.style.setProperty("--wh", host.dataset.h + "px");
      try {
        const api = fn(host, host.dataset) || {};
        host._api = api;
        live.push(host);
      } catch (err) {
        console.error(err);
        host.textContent = "Widget error (" + host.dataset.widget + "): " + err.message;
      }
    });
  }
  function stepIn(slide, dir) {
    const host = Array.from(slide.querySelectorAll(".w[data-widget]")).find((x) => x._api && x._api.stepper);
    if (host) host._api.stepper.step(dir);
  }
  function repaintAll() { live.forEach((x) => { if (x._api && x._api.repaint) x._api.repaint(); else if (x._api && x._api.stepper) x._api.stepper.repaint(); }); }

  window.Widgets = { register, mountAll, stepIn, repaintAll, h, S, Stepper };

  /* =======================================================
     1. TSP sandbox: nearest neighbour vs closest pair vs optimal
     ======================================================= */
  register("tsp", (host, d) => {
    const W = 800, H = 400;
    const presets = {
      line: { pts: [-21, -5, -1, 0, 1, 3, 11].map((v) => [60 + (v + 21) / 32 * 680, 200]), start: 3, arcs: true, unit: 680 / 32, labels: ["-21", "-5", "-1", "0", "1", "3", "11"] },
      clusters: { pts: [[12, 1], [2, 0], [7, 3], [6, 2], [11, 6], [8, 0]].map(([x, y]) => [100 + x * 50, 360 - y * 50]), start: 0, unit: 50 },
      random: null
    };
    let pts = [], start = 0, arcs = false, unit = 10, labels = null, algo = d.algo || "nn";
    const sv = svg(W, H);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const presetBtns = [], algoBtns = [];
    function mkPreset(key, label) { const b = btn(label, () => { load(key); setOn(presetBtns, b); }); presetBtns.push(b); return b; }
    function mkAlgo(key, label) { const b = btn(label, () => { algo = key; setOn(algoBtns, b); run(); }); b.dataset.k = key; algoBtns.push(b); return b; }
    const tb = h("div", { class: "w-toolbar" },
      mkPreset("line", "Points on a line"), mkPreset("clusters", "Scattered"), mkPreset("random", "Random 8"),
      btn("Clear (click to add)", () => { pts = []; labels = null; arcs = false; setOn(presetBtns, null); run(); }),
      h("span", { style: "width:1em" }),
      mkAlgo("nn", "Nearest neighbor"), mkAlgo("cp", "Closest pair"), mkAlgo("opt", "Exhaustive (optimal)"));
    host.append(tb, sv, stepper.bar, stepper.caption, stats);
    sv.style.cursor = "crosshair";
    sv.addEventListener("click", (e) => {
      const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(sv.getScreenCTM().inverse());
      if (pts.length >= 10) return;
      pts.push([q.x, q.y]); labels = null; arcs = false; run();
    });
    const dist = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
    function nn() {
      if (!pts.length) return [];
      const left = new Set(pts.map((_, i) => i)); let cur = start; left.delete(cur); const E = [];
      while (left.size) { let best = null; left.forEach((j) => { if (best == null || dist(cur, j) < dist(cur, best) - 1e-9) best = j; }); E.push([cur, best]); left.delete(best); cur = best; }
      if (pts.length > 1) E.push([cur, start]);
      return E;
    }
    function cp() {
      const n = pts.length; if (n < 2) return [];
      const par = pts.map((_, i) => i), deg = pts.map(() => 0), E = [];
      const f = (x) => { while (par[x] !== x) x = par[x]; return x; };
      const pairs = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([dist(i, j), i, j]);
      pairs.sort((a, b) => a[0] - b[0]);
      for (const [, i, j] of pairs) if (deg[i] < 2 && deg[j] < 2 && f(i) !== f(j)) { par[f(i)] = f(j); deg[i]++; deg[j]++; E.push([i, j]); }
      const ends = deg.map((x, i) => [x, i]).filter((x) => x[0] < 2).map((x) => x[1]);
      if (ends.length === 2) E.push([ends[0], ends[1]]);
      return E;
    }
    function opt() {
      const n = pts.length; if (n < 2) return [];
      if (n > 9) return null;
      const rest = pts.map((_, i) => i).filter((i) => i !== start);
      let best = Infinity, bestT = null;
      (function perm(arr, k) {
        if (k === arr.length) {
          let L = dist(start, arr[0]); for (let i = 0; i + 1 < arr.length; i++) L += dist(arr[i], arr[i + 1]); L += dist(arr[arr.length - 1], start);
          if (L < best - 1e-9) { best = L; bestT = arr.slice(); } return;
        }
        for (let i = k; i < arr.length; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; perm(arr, k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; }
      })(rest, 0);
      const t = [start, ...bestT], E = [];
      for (let i = 0; i < t.length; i++) E.push([t[i], t[(i + 1) % t.length]]);
      return E;
    }
    const len = (E) => E.reduce((s, [a, b]) => s + dist(a, b), 0) / unit;
    function run() {
      const E = algo === "nn" ? nn() : algo === "cp" ? cp() : opt();
      const frames = [];
      if (E === null) { frames.push({ E: [], msg: "Exhaustive search disabled for more than 9 points (9! = 362,880 tours already)." }); stepper.set(frames); stats.innerHTML = ""; return; }
      frames.push({ E: [], msg: pts.length ? "Start at <b>p0</b>. Press Play or Next." : "Click anywhere to add points (max 10)." });
      E.forEach((e, k) => {
        const last = k === E.length - 1;
        frames.push({ E: E.slice(0, k + 1), msg: (last && algo !== "cp" ? "Return to the start: " : algo === "cp" ? (last ? "Close the tour with the only edge left: " : "Shortest legal edge (no cycle, no 3-way branch): ") : "Go to nearest unvisited point: ") + "length " + (dist(e[0], e[1]) / unit).toFixed(1) });
      });
      const o = pts.length <= 9 && pts.length > 1 ? len(opt()) : null;
      const L = len(E);
      frames.push({ E, msg: "Tour length <b>" + L.toFixed(1) + "</b>" + (o != null ? (Math.abs(L - o) < 1e-6 ? " = optimal ✓" : " vs optimal " + o.toFixed(1) + " → <span class='bad'>" + ((L / o - 1) * 100).toFixed(1) + "% longer</span>") : "") });
      stepper.set(frames);
      stats.replaceChildren(stat("points", pts.length), stat("tours to check (exhaustive) = (n−1)! =", fact(Math.max(0, pts.length - 1)).toLocaleString()));
    }
    function fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
    function draw(f) {
      sv.replaceChildren();
      const E = f ? f.E : [];
      E.forEach(([a, b], k) => {
        const [x1, y1] = pts[a], [x2, y2] = pts[b];
        let path;
        if (arcs) { const mx = (x1 + x2) / 2, bend = (k % 2 ? 1 : -1) * Math.abs(x2 - x1) * 0.35; path = `M${x1},${y1} Q${mx},${y1 + bend} ${x2},${y2}`; }
        else path = `M${x1},${y1} L${x2},${y2}`;
        const isLast = k === E.length - 1;
        sv.append(S("path", { d: path, style: `fill:none;stroke:${isLast ? "var(--hot)" : "var(--accent)"};stroke-width:3;stroke-linecap:round;opacity:${isLast ? 1 : 0.75}` }));
      });
      pts.forEach(([x, y], i) => {
        sv.append(S("circle", { cx: x, cy: y, r: i === start ? 12 : 9, style: `fill:${i === start ? "var(--hot)" : "var(--ink)"}` }));
        if (labels) sv.append(S("text", { x, y: y + 40, "text-anchor": "middle", "font-size": 20, class: "mono" }, labels[i]));
        if (i === start) sv.append(S("text", { x: x, y: y - 20, "text-anchor": "middle", "font-size": 22, "font-weight": 700 }, "p0"));
      });
    }
    function load(key) {
      const p = presets[key];
      if (key === "random") {
        pts = Array.from({ length: 8 }, () => [40 + Math.random() * 720, 40 + Math.random() * 320]); start = 0; arcs = false; unit = 10; labels = null;
      } else { pts = p.pts.map((x) => x.slice()); start = p.start; arcs = !!p.arcs; unit = p.unit; labels = p.labels || null; }
      run();
    }
    const initial = d.preset || "line";
    setOn(presetBtns, presetBtns[["line", "clusters", "random"].indexOf(initial)]);
    setOn(algoBtns, algoBtns.find((b) => b.dataset.k === algo));
    load(initial);
    return { stepper };
  });

  /* =======================================================
     2. Growth of functions (canvas)
     ======================================================= */
  register("growth", (host, d) => {
    const fns = [
      { k: "log", label: "log n", f: (n) => Math.log2(Math.max(n, 1)), c: "#868e96" },
      { k: "n", label: "n", f: (n) => n, c: "#2b8a3e" },
      { k: "nlogn", label: "n log n", f: (n) => n * Math.log2(Math.max(n, 1)), c: "#1c7ed6" },
      { k: "n2", label: "n²", f: (n) => n * n, c: "#7048e8" },
      { k: "n3", label: "n³", f: (n) => n * n * n, c: "#c2255c" },
      { k: "2n", label: "2ⁿ", f: (n) => Math.pow(2, n), c: "#e8590c" },
      { k: "fact", label: "n!", f: (n) => gamma(n), c: "#c92a2a" }
    ];
    function gamma(n) { let r = 1; for (let i = 2; i <= Math.floor(n); i++) r *= i; return r; }
    const on = new Set((d.show || "log,n,nlogn,n2,n3,2n").split(","));
    let nmax = parseInt(d.nmax || "20", 10), logy = d.log === "1";
    const cv = h("canvas", { width: 1000, height: 430 });
    const boxes = fns.map((f) => {
      const cb = h("input", { type: "checkbox" }); cb.checked = on.has(f.k);
      cb.addEventListener("change", () => { cb.checked ? on.add(f.k) : on.delete(f.k); draw(); });
      return h("label", { style: "color:" + f.c + ";font-weight:700" }, cb, " " + f.label);
    });
    const slider = h("input", { type: "range", min: 4, max: 100, value: nmax });
    const nlab = h("label", {}, "n up to " + nmax);
    slider.addEventListener("input", () => { nmax = +slider.value; nlab.textContent = "n up to " + nmax; draw(); });
    const bLog = btn("Log scale", () => { logy = !logy; bLog.classList.toggle("on", logy); draw(); });
    bLog.classList.toggle("on", logy);
    host.append(h("div", { class: "w-toolbar" }, ...boxes), cv, h("div", { class: "w-toolbar" }, nlab, slider, bLog));
    function draw() {
      const g = cv.getContext("2d"), Wc = cv.width, Hc = cv.height, L = 90, R = 100, T = 15, B = 44;
      g.clearRect(0, 0, Wc, Hc);
      const ink = cssVar("--ink"), muted = cssVar("--muted"), line = cssVar("--line");
      const ymax = logy ? Math.log10(Math.max(10, fns[6].f(Math.min(nmax, 60)))) : nmax * nmax * 1.25;
      const X = (n) => L + (n / nmax) * (Wc - L - R);
      const Y = (v) => { const t = logy ? Math.log10(Math.max(v, 1)) / ymax : v / ymax; return Hc - B - t * (Hc - B - T); };
      g.strokeStyle = line; g.lineWidth = 1; g.font = "20px JetBrains Mono, monospace"; g.fillStyle = muted;
      for (let i = 0; i <= 5; i++) {
        const y = T + i * (Hc - B - T) / 5; g.beginPath(); g.moveTo(L, y); g.lineTo(Wc - R, y); g.stroke();
        const val = logy ? "1e" + Math.round(ymax * (1 - i / 5)) : Math.round(ymax * (1 - i / 5)).toLocaleString();
        g.textAlign = "right"; g.fillText(val, L - 8, y + 5);
      }
      g.textAlign = "center";
      for (let i = 0; i <= 5; i++) g.fillText(String(Math.round(nmax * i / 5)), X(nmax * i / 5), Hc - 12);
      g.fillStyle = ink; g.textAlign = "left"; g.fillText(logy ? "steps (log scale)" : "steps", L + 6, T + 14);
      fns.forEach((f) => {
        if (!on.has(f.k)) return;
        g.save(); g.beginPath(); g.rect(L, T - 2, Wc - L - R, Hc - B - T + 4); g.clip();
        g.strokeStyle = f.c; g.lineWidth = 4; g.beginPath();
        const steps = 300;
        for (let i = 0; i <= steps; i++) { const n = 1 + (nmax - 1) * i / steps; const y = Y(f.f(n)); i ? g.lineTo(X(n), y) : g.moveTo(X(n), y); }
        g.stroke(); g.restore();
        let lab = Y(f.f(nmax)); let lx = Wc - R + 6;
        if (lab < T) { // went off the top: label where it exits
          let n = 1; while (n < nmax && Y(f.f(n)) > T) n += nmax / 400;
          lx = Math.min(X(n) + 4, Wc - R + 6); lab = T + 12;
        }
        g.fillStyle = f.c; g.font = "bold 22px Inter, sans-serif"; g.fillText(f.label, lx, lab + 7);
      });
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     3. Faster computer vs faster algorithm (CLRS race)
     ======================================================= */
  register("race", (host) => {
    const slider = h("input", { type: "range", min: 2, max: 9, step: 0.5, value: 6 });
    const out = h("div");
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "input size n = 10^k"), slider), out);
    function human(s) {
      if (s < 1e-3) return (s * 1e6).toFixed(1) + " µs";
      if (s < 1) return (s * 1e3).toFixed(1) + " ms";
      if (s < 120) return s.toFixed(1) + " s";
      if (s < 7200) return (s / 60).toFixed(1) + " min";
      if (s < 172800) return (s / 3600).toFixed(1) + " h";
      if (s < 3.15e7 * 2) return (s / 86400).toFixed(1) + " days";
      return (s / 3.15e7).toFixed(1) + " years";
    }
    function draw() {
      const n = Math.pow(10, +slider.value);
      const a = 2 * n * n / 1e10, b = 50 * n * Math.log2(n) / 1e7;
      const mx = Math.log10(Math.max(a, b)) + 7;
      const bar = (t, c) => h("div", { style: `height:22px;border-radius:6px;background:${c};width:${Math.max(2, (Math.log10(t) + 7) / mx * 100)}%` });
      out.replaceChildren(
        h("div", { class: "cols", style: "gap:1em" },
          h("div", { class: "card" }, h("h4", {}, "Computer A · 10¹⁰ ops/s"), h("p", {}, "Insertion sort, 2n² steps"), bar(a, "var(--hot)"), h("p", { class: "big" }, human(a))),
          h("div", { class: "card" }, h("h4", {}, "Computer B · 10⁷ ops/s (1000× slower)"), h("p", {}, "Merge sort, 50·n·log₂n steps"), bar(b, "var(--accent)"), h("p", { class: "big" }, human(b)))),
        h("p", { class: "small" }, "n = " + n.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " → winner: ", h("b", { class: a < b ? "hot" : "ok" }, a < b ? "A (fast hardware)" : "B (better algorithm)")));
    }
    slider.addEventListener("input", draw); draw();
  });

  /* =======================================================
     4. Big-O definition explorer: T(n) ≤ c·f(n) for n ≥ n0
     ======================================================= */
  register("bigo", (host) => {
    const T = (n) => 1.62 * n * n + 3.5 * n + 8;
    const F = { n: (n) => n, n2: (n) => n * n, n3: (n) => n * n * n };
    let fk = "n2", c = 2, n0 = 5;
    const cv = h("canvas", { width: 1000, height: 400 });
    const cS = h("input", { type: "range", min: 0.5, max: 4, step: 0.05, value: c });
    const nS = h("input", { type: "range", min: 0, max: 25, step: 1, value: n0 });
    const cl = h("label"), nl = h("label");
    const fb = ["n", "n2", "n3"].map((k) => { const b = btn({ n: "f(n) = n", n2: "f(n) = n²", n3: "f(n) = n³" }[k], () => { fk = k; setOn(fb, b); draw(); }); return b; });
    const verdict = h("div", { class: "w-caption" });
    host.append(h("div", { class: "w-toolbar" }, ...fb, cl, cS, nl, nS), cv, verdict);
    setOn(fb, fb[1]);
    cS.addEventListener("input", () => { c = +cS.value; draw(); });
    nS.addEventListener("input", () => { n0 = +nS.value; draw(); });
    function draw() {
      cl.textContent = "c = " + c.toFixed(2); nl.textContent = "n₀ = " + n0;
      const g = cv.getContext("2d"), Wc = cv.width, Hc = cv.height, L = 40, R = 30, Tp = 30, B = 40, NX = 30;
      g.clearRect(0, 0, Wc, Hc);
      const f = F[fk];
      const ymax = T(NX) * 1.3;
      const X = (n) => L + n / NX * (Wc - L - R), Y = (v) => Hc - B - Math.min(v, ymax * 1.05) / ymax * (Hc - B - Tp);
      g.fillStyle = cssVar("--line"); g.globalAlpha = 0.6; g.fillRect(L, Tp, X(n0) - L, Hc - B - Tp); g.globalAlpha = 1;
      g.fillStyle = cssVar("--bad"); g.globalAlpha = 0.18;
      for (let n = 0; n < NX; n += 0.1) if (n >= n0 && T(n) > c * f(n)) g.fillRect(X(n), Tp, X(0.1) - L + 1, Hc - B - Tp);
      g.globalAlpha = 1;
      const curve = (fn, col, dash) => { g.setLineDash(dash || []); g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 300; i++) { const n = NX * i / 300; i ? g.lineTo(X(n), Y(fn(n))) : g.moveTo(X(n), Y(fn(n))); } g.stroke(); g.setLineDash([]); };
      curve(T, cssVar("--ink"));
      curve((n) => c * f(n), cssVar("--accent"), [10, 6]);
      g.font = "bold 22px Inter, sans-serif"; g.fillStyle = cssVar("--ink"); g.fillText("T(n) = 1.62n² + 3.5n + 8", L + 14, Tp + 22);
      g.fillStyle = cssVar("--accent"); g.fillText("c·f(n)  (dashed)", L + 14, Tp + 52);
      g.fillStyle = cssVar("--muted"); g.font = "20px JetBrains Mono, monospace"; g.textAlign = "center";
      for (let i = 0; i <= 6; i++) g.fillText(String(i * 5), X(i * 5), Hc - 12);
      g.fillText("n₀", X(n0), Tp - 8); g.textAlign = "left";
      let fail = null;
      for (let n = n0; n <= 100000; n = n < 100 ? n + 1 : Math.ceil(n * 1.1)) if (T(n) > c * f(n)) { fail = n; break; }
      verdict.innerHTML = fail == null
        ? `<span class="ok">✓ T(n) ≤ ${c.toFixed(2)}·f(n) for every n ≥ ${n0}</span> — so T(n) = O(${fk === "n" ? "n" : fk === "n2" ? "n²" : "n³"}).`
        : `<span class="bad">✗ Fails at n = ${fail}</span> (T = ${fmtNum(T(fail))} &gt; c·f = ${fmtNum(c * f(fail))}). Try a bigger c or n₀${fk === "n" ? " … or accept that no constant will ever work." : "."}`;
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     5. Operation counter for loop shapes
     ======================================================= */
  register("opcount", (host) => {
    const snippets = [
      { k: "lin", name: "single loop", code: "for i in 0..n-1:\n    sum += a[i]", f: (n) => n, big: "O(n)" },
      { k: "quad", name: "nested loops", code: "for i in 0..n-1:\n    for j in 0..n-1:\n        count++", f: (n) => n * n, big: "O(n²)" },
      { k: "tri", name: "triangular", code: "for i in 0..n-1:\n    for j in i+1..n-1:\n        if a[i]==a[j]: dup++", f: (n) => n * (n - 1) / 2, big: "O(n²)" },
      { k: "log", name: "halving", code: "while n > 1:\n    n = n / 2\n    steps++", f: (n) => Math.ceil(Math.log2(Math.max(n, 1))), big: "O(log n)" }
    ];
    let cur = snippets[0];
    const pre = h("pre", { style: "font-size:0.62em;margin:0" }, h("code", { style: "padding:.6em 1em" }));
    const slider = h("input", { type: "range", min: 1, max: 6, step: 1, value: 3 });
    const out = h("div", { class: "w-caption" });
    const bs = snippets.map((s) => { const b = btn(s.name, () => { cur = s; setOn(bs, b); draw(); }); return b; });
    host.append(h("div", { class: "w-toolbar" }, ...bs), h("div", { class: "cols", style: "gap:1em;align-items:center" }, pre, h("div", {}, h("label", {}, "n = 10^k"), slider, out)));
    setOn(bs, bs[0]);
    slider.addEventListener("input", draw);
    function draw() {
      pre.firstChild.textContent = cur.code;
      const n = Math.pow(10, +slider.value);
      const ops = cur.f(n);
      out.innerHTML = `n = <b>${n.toLocaleString()}</b><br>basic operations ≈ <b>${Math.round(ops).toLocaleString()}</b><br>at 10⁹ ops/s: <b>${ops / 1e9 < 1 ? (ops / 1e6).toFixed(3) + " ms" : (ops / 1e9).toFixed(1) + " s"}</b><br>growth: <b>${cur.big}</b>`;
    }
    draw();
  });

  /* =======================================================
     6. Fibonacci call tree: naive recursion vs memoization
     ======================================================= */
  register("fibtree", (host, d) => {
    let n = parseInt(d.n || "6", 10), memoOn = d.mode === "memo";
    const sv = svg(980, 430);
    const memoRow = h("div", { class: "cells" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const sel = h("select", {}, ...[4, 5, 6, 7].map((k) => h("option", { value: k }, "n = " + k)));
    sel.value = n;
    sel.addEventListener("change", () => { n = +sel.value; build(); });
    const bN = btn("Naive recursion", () => { memoOn = false; setOn([bN, bM], bN); build(); });
    const bM = btn("With memo table", () => { memoOn = true; setOn([bN, bM], bM); build(); });
    setOn([bN, bM], memoOn ? bM : bN);
    host.append(h("div", { class: "w-toolbar" }, sel, bN, bM), sv, memoRow, stepper.bar, stepper.caption, stats);
    let nodes = [];
    function build() {
      nodes = []; const ev = []; const memo = {}; const seen = {};
      let leafX = 0;
      function call(k, parent, depth) {
        const id = nodes.length;
        const node = { id, k, parent, depth, kids: [], val: null, hit: false };
        nodes.push(node); if (parent != null) nodes[parent].kids.push(id);
        seen[k] = (seen[k] || 0) + 1;
        ev.push({ t: "enter", id, repeat: seen[k] });
        if (memoOn && memo[k] != null) { node.hit = true; node.val = memo[k]; node.x = leafX++; ev.push({ t: "hit", id }); return memo[k]; }
        let v;
        if (k < 2) { v = k; node.x = leafX++; }
        else { v = call(k - 1, id, depth + 1) + call(k - 2, id, depth + 1); node.x = (nodes[node.kids[0]].x + nodes[node.kids[1]].x) / 2; }
        node.val = v; if (memoOn) memo[k] = v;
        ev.push({ t: "exit", id });
        return v;
      }
      call(n, null, 0);
      nodes.layoutW = leafX;
      // frames
      const frames = [{ upto: 0, ev, calls: 1, repeats: 0, msg: `Compute F(${n}) ${memoOn ? "with a memo table" : "with plain recursion"}. Press Play.` }];
      let calls = 0, repeats = 0;
      ev.forEach((e, i) => {
        if (i === 0) { calls = 1; return; }
        const nd = nodes[e.id];
        let msg;
        if (e.t === "enter") {
          calls++; if (e.repeat > 1 && !(memoOn)) repeats++;
          msg = `call F(${nd.k})` + (e.repeat > 1 && !memoOn ? ` — <span class="bad">computed for the ${ord(e.repeat)} time!</span>` : "");
        } else if (e.t === "hit") msg = `F(${nd.k}) is already in the table → <span class="ok">reuse ${nd.val}, no recursion</span>`;
        else msg = nd.k < 2 ? `base case F(${nd.k}) = ${nd.val}` : `F(${nd.k}) = F(${nd.k - 1}) + F(${nd.k - 2}) = ${nd.val}`;
        frames.push({ upto: i, ev, msg, calls, repeats });
      });
      const last = frames[frames.length - 1];
      last.msg += ` &nbsp;·&nbsp; <b>${calls} calls in total</b>`;
      stepper.set(frames);
    }
    function ord(k) { return k + (k === 2 ? "nd" : k === 3 ? "rd" : "th"); }
    function draw(f) {
      sv.replaceChildren();
      const state = {}; // id -> 'active' | 'done' | 'hit'
      const memo = {};
      if (f && f.upto >= 0) for (let i = 0; i <= f.upto; i++) {
        const e = f.ev[i]; const nd = nodes[e.id];
        if (e.t === "enter") state[e.id] = "active";
        else if (e.t === "hit") state[e.id] = "hit";
        else { state[e.id] = "done"; memo[nd.k] = nd.val; }
      }
      const curId = f && f.upto >= 0 ? f.ev[f.upto].id : null;
      const maxD = Math.max(...nodes.map((x) => x.depth));
      const slot = 900 / Math.max(1, nodes.layoutW);
      const X = (nd) => 40 + slot * (nd.x + 0.5), Y = (nd) => 30 + nd.depth * Math.min(62, 380 / Math.max(1, maxD));
      const r = Math.min(20, slot * 0.42);
      nodes.forEach((nd) => {
        if (!state[nd.id] || nd.parent == null) return;
        const p = nodes[nd.parent];
        sv.append(S("line", { x1: X(p), y1: Y(p), x2: X(nd), y2: Y(nd), style: "stroke:var(--line);stroke-width:2" }));
      });
      nodes.forEach((nd) => {
        const s = state[nd.id]; if (!s) return;
        const isCur = nd.id === curId;
        const fill = s === "hit" ? "var(--ok-soft)" : s === "done" ? "var(--accent-soft)" : "var(--surface)";
        const stroke = isCur ? "var(--hot)" : s === "hit" ? "var(--ok)" : "var(--accent)";
        sv.append(S("circle", { cx: X(nd), cy: Y(nd), r, style: `fill:${fill};stroke:${stroke};stroke-width:${isCur ? 4 : 2}` + (s === "hit" ? ";stroke-dasharray:4 3" : "") }));
        sv.append(S("text", { x: X(nd), y: Y(nd) + 5, "text-anchor": "middle", "font-size": Math.max(11, r * 0.75), "font-weight": 700 }, "F" + nd.k));
        if (s !== "active") sv.append(S("text", { x: X(nd), y: Y(nd) + r + 14, "text-anchor": "middle", "font-size": 13, class: "mono", style: "fill:var(--muted)" }, "=" + nd.val));
      });
      memoRow.replaceChildren(h("span", { class: "tiny muted", style: "align-self:center;margin-right:.5em" }, memoOn ? "memo table" : "values known"),
        ...Array.from({ length: n + 1 }, (_, k) => cell(memo[k] != null ? memo[k] : "·", memo[k] != null ? "good" : "", "F" + k)));
      stats.replaceChildren(stat("calls so far:", f && f.calls || 0), memoOn ? stat("total calls with memo = 2n−1 =", 2 * n - 1) : stat("repeated computations:", f && f.repeats || 0));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     7. N-Queens backtracking
     ======================================================= */
  register("queens", (host, d) => {
    let N = parseInt(d.n || "6", 10);
    const board = h("div", { class: "board" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const sel = h("select", {}, ...[4, 5, 6, 7, 8].map((k) => h("option", { value: k }, k + " × " + k)));
    sel.value = N;
    sel.addEventListener("change", () => { N = +sel.value; build(); });
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "board"), sel),
      h("div", { style: "display:flex;gap:1.2em;align-items:flex-start" }, board, h("div", { style: "flex:1" }, stepper.caption, stats)), stepper.bar);
    function build() {
      const frames = [{ q: [], msg: "Place one queen per column, left to right. Press Play." }];
      const rows = []; let tried = 0, back = 0;
      function attacker(c, r) { for (let cc = 0; cc < c; cc++) { const rr = rows[cc]; if (rr === r || Math.abs(rr - r) === c - cc) return [cc, rr]; } return null; }
      function solve(c) {
        if (c === N) { frames.push({ q: rows.slice(), sol: true, tried, back, msg: `<span class="ok">Solution found!</span> Visited ${tried} placements instead of ${Math.pow(N, N).toLocaleString()} (brute force Nᴺ).` }); return true; }
        for (let r = 0; r < N; r++) {
          tried++;
          const a = attacker(c, r);
          if (a) { frames.push({ q: rows.slice(), tr: [c, r], conf: a, tried, back, msg: `Column ${c + 1}, row ${r + 1}: attacked by the queen in column ${a[0] + 1} ✗` }); continue; }
          rows.push(r);
          frames.push({ q: rows.slice(), tr: [c, r], tried, back, msg: `Column ${c + 1}, row ${r + 1}: safe → place queen, go deeper` });
          if (solve(c + 1)) return true;
          rows.pop(); back++;
          frames.push({ q: rows.slice(), tried, back, msg: `<span class="hot">Dead end below.</span> Backtrack: remove queen from column ${c + 1}, row ${r + 1}` });
        }
        return false;
      }
      solve(0);
      stepper.set(frames);
    }
    function draw(f) {
      board.style.gridTemplateColumns = `repeat(${N}, 46px)`;
      board.replaceChildren();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const sq = h("div", { class: "sq " + ((r + c) % 2 ? "d" : "l") });
        if (f.q[c] === r) { sq.textContent = "♛"; if (f.sol) sq.classList.add("sol"); }
        if (f.tr && f.tr[0] === c && f.tr[1] === r) { sq.classList.add(f.conf ? "conf" : "try"); if (f.conf) sq.textContent = "♕"; }
        if (f.conf && f.conf[0] === c && f.conf[1] === r) sq.classList.add("attacker");
        board.append(sq);
      }
      stats.replaceChildren(stat("placements tried:", f.tried || 0), stat("backtracks:", f.back || 0));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     8. Divide & conquer recursion tree (merge sort / max)
     ======================================================= */
  register("dctree", (host, d) => {
    const mode = d.mode || "sort"; // 'sort' | 'max'
    let a = nums(d.input || "40,21,4,10,9,35");
    const inp = h("input", { type: "text", value: a.join(", "), size: 26 });
    const sv = svg(1000, 470);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "array"), inp, btn("Load", () => { a = nums(inp.value).slice(0, 10); build(); }),
      btn("Random", () => { a = Array.from({ length: 7 }, () => 1 + Math.floor(Math.random() * 60)); inp.value = a.join(", "); build(); })),
      sv, stepper.bar, stepper.caption, stats);
    let nodes = [];
    function build() {
      nodes = []; const ev = []; let comps = 0;
      function rec(lo, hi, depth, parent) {
        const id = nodes.length; const nd = { id, lo, hi, depth, parent, vals: a.slice(lo, hi + 1), res: null };
        nodes.push(nd);
        ev.push({ t: "split", id });
        if (lo === hi) { nd.res = mode === "sort" ? [a[lo]] : a[lo]; ev.push({ t: "leaf", id }); return nd.res; }
        const mid = Math.floor((lo + hi) / 2);
        nd.mid = mid;
        const L = rec(lo, mid, depth + 1, id), R = rec(mid + 1, hi, depth + 1, id);
        let c = 0;
        if (mode === "sort") {
          const out = []; let i = 0, j = 0;
          while (i < L.length && j < R.length) { c++; out.push(L[i] <= R[j] ? L[i++] : R[j++]); }
          while (i < L.length) out.push(L[i++]); while (j < R.length) out.push(R[j++]);
          nd.res = out;
        } else { c = 1; nd.res = Math.max(L, R); }
        comps += c;
        ev.push({ t: "combine", id, L, R, c, comps });
        return nd.res;
      }
      if (!a.length) a = [1];
      rec(0, a.length - 1, 0, null);
      const frames = [{ upto: 0, ev, msg: mode === "sort" ? "Merge sort: divide until size 1, then merge back up." : "Find the max: split in halves, solve each half, compare the two answers." }];
      ev.forEach((e, i) => {
        if (i === 0) return;
        const nd = nodes[e.id]; let msg;
        if (e.t === "split") msg = nd.lo === nd.hi ? `[${nd.vals}] has one element → nothing to divide` : `<b>Divide</b> [${nd.vals.join(", ")}] → [${a.slice(nd.lo, nd.mid + 1).join(", ")}] | [${a.slice(nd.mid + 1, nd.hi + 1).join(", ")}]`;
        else if (e.t === "leaf") msg = mode === "sort" ? `Base case: [${nd.res}] is already sorted` : `Base case: max of [${nd.res}] is ${nd.res}`;
        else msg = mode === "sort"
          ? `<b>Merge</b> [${e.L.join(", ")}] + [${e.R.join(", ")}] → [${nd.res.join(", ")}] (${e.c} comparisons)`
          : `<b>Combine</b> max(${e.L}, ${e.R}) = ${nd.res} (1 comparison)`;
        frames.push({ upto: i, ev, msg, comps: e.comps != null ? e.comps : undefined });
      });
      let cc = 0; frames.forEach((f) => { if (f.comps != null) cc = f.comps; f.cc = cc; });
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const n = a.length, maxD = Math.max(...nodes.map((x) => x.depth));
      const cw = 56, gap = 16, rowH = 46;
      const splits = nodes.filter((x) => x.mid != null).map((x) => ({ pos: x.mid + 1, depth: x.depth }));
      const xOf = (nd) => { let g = 0; splits.forEach((s) => { if (s.depth < nd.depth && s.pos <= nd.lo) g++; }); return g; };
      const totalW = n * cw + gap * (n - 1);
      const x0 = 96;
      sv.setAttribute("viewBox", `0 0 ${x0 + totalW + 10} ${(2 * maxD + 2) * rowH + 18}`);
      const X = (nd) => x0 + nd.lo * cw + xOf(nd) * gap;
      const yTop = (dp) => 10 + dp * rowH, yBot = (dp) => 10 + (maxD + 1) * rowH + (maxD - dp) * rowH + 8;
      const vis = {}, comb = {};
      let cur = null;
      if (f.upto >= 0) for (let i = 0; i <= f.upto; i++) { const e = f.ev[i]; vis[e.id] = true; if (e.t !== "split") comb[e.id] = true; cur = e; }
      const boxH = rowH * 0.66;
      // lines
      nodes.forEach((nd) => {
        if (nd.parent == null) return; const p = nodes[nd.parent];
        const w = (x) => (x.hi - x.lo + 1) * cw;
        if (vis[nd.id]) sv.append(S("line", { x1: X(p) + w(p) / 2, y1: yTop(p.depth) + boxH, x2: X(nd) + w(nd) / 2, y2: yTop(nd.depth), style: "stroke:var(--line);stroke-width:2" }));
        if (comb[p.id]) sv.append(S("line", { x1: X(nd) + w(nd) / 2, y1: yBot(nd.depth) + boxH, x2: X(p) + w(p) / 2, y2: yBot(p.depth), style: "stroke:var(--line);stroke-width:2" }));
      });
      const box = (x, y, vals, style, ww) => {
        vals.forEach((v, k) => {
          sv.append(S("rect", { x: x + k * cw + 2, y, width: (ww || cw) - 4, height: boxH, rx: 6, style }));
          sv.append(S("text", { x: x + k * cw + (ww || cw) / 2, y: y + boxH / 2 + 6, "text-anchor": "middle", "font-size": 19, class: "mono", "font-weight": 600 }, v));
        });
      };
      nodes.forEach((nd) => {
        const isCur = cur && cur.id === nd.id;
        if (vis[nd.id]) box(X(nd), yTop(nd.depth), nd.vals, `fill:var(--surface);stroke:${isCur && cur.t === "split" ? "var(--hot)" : "var(--accent)"};stroke-width:${isCur && cur.t === "split" ? 3 : 1.5}`);
        if (comb[nd.id]) {
          const st = `fill:var(--ok-soft);stroke:${isCur && cur.t !== "split" ? "var(--hot)" : "var(--ok)"};stroke-width:${isCur && cur.t !== "split" ? 3 : 1.5}`;
          if (mode === "sort") box(X(nd), yBot(nd.depth), nd.res, st);
          else { const w = (nd.hi - nd.lo + 1) * cw; box(X(nd) + w / 2 - cw / 2, yBot(nd.depth), [nd.res], st); }
        }
      });
      sv.append(S("text", { x: 4, y: yTop(0) + boxH / 2 + 6, "font-size": 16, "font-weight": 600, style: "fill:var(--muted)" }, "divide ↓"));
      sv.append(S("text", { x: 4, y: yBot(0) + boxH / 2 + 6, "font-size": 16, "font-weight": 600, style: "fill:var(--muted)" }, mode === "sort" ? "merge ↑" : "combine ↑"));
      stats.replaceChildren(stat("comparisons so far:", f.cc || 0), stat("n =", n), mode === "sort" ? stat("n·log₂n ≈", Math.round(n * Math.log2(n))) : stat("n − 1 =", n - 1));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     9. Merge two sorted lists
     ======================================================= */
  register("merge", (host, d) => {
    let U = nums(d.u || "4,21,40"), V = nums(d.v || "9,10,35");
    const iu = h("input", { type: "text", value: U.join(", "), size: 14 }), iv = h("input", { type: "text", value: V.join(", "), size: 14 });
    const stage = h("div", { style: "display:grid;grid-template-columns:3em 1fr;gap:.5em;align-items:center" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "U"), iu, h("label", {}, "V"), iv, btn("Load", () => { U = nums(iu.value).sort((x, y) => x - y); V = nums(iv.value).sort((x, y) => x - y); build(); })), stage, stepper.bar, stepper.caption);
    function build() {
      const frames = [{ i: 0, j: 0, S: [], c: 0, msg: "Two sorted lists. Compare the fronts, move the smaller one to S." }];
      let i = 0, j = 0, c = 0; const out = [];
      while (i < U.length && j < V.length) {
        c++;
        const takeU = U[i] <= V[j];
        const msg = `compare U[${i + 1}]=${U[i]} vs V[${j + 1}]=${V[j]} → take <b>${takeU ? U[i] : V[j]}</b>`;
        frames.push({ i, j, S: out.slice(), c, cmp: true, msg });
        out.push(takeU ? U[i++] : V[j++]);
        frames.push({ i, j, S: out.slice(), c, msg: "S = [" + out.join(", ") + "]" });
      }
      if (i < U.length || j < V.length) {
        const rest = i < U.length ? U.slice(i) : V.slice(j);
        out.push(...rest); i = U.length; j = V.length;
        frames.push({ i, j, S: out.slice(), c, msg: `One list is empty → append the rest [${rest.join(", ")}] with no comparisons. Total: <b>${c} comparisons</b> (worst case h + m − 1 = ${U.length + V.length - 1}).` });
      }
      stepper.set(frames);
    }
    function draw(f) {
      const row = (arr, p) => h("div", { class: "cells" }, ...arr.map((v, k) => cell(v, k < p ? "dim" : k === p && f.cmp ? "mid" : k === p ? "act" : "", k + 1)));
      stage.replaceChildren(h("b", {}, "U"), row(U, f.i), h("b", {}, "V"), row(V, f.j), h("b", {}, "S"),
        h("div", { class: "cells" }, ...Array.from({ length: U.length + V.length }, (_, k) => cell(k < f.S.length ? f.S[k] : "·", k < f.S.length ? "good" : "empty", k + 1))));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     10. Binary search
     ======================================================= */
  register("bsearch", (host, d) => {
    let A = nums(d.input || "8,15,22,31,40,48,59,75,81,92"), x = parseFloat(d.target || "75");
    const ia = h("input", { type: "text", value: A.join(", "), size: 30 }), ix = h("input", { type: "number", value: x, style: "width:5em" });
    const cells = h("div", { class: "cells" }), ptrs = h("div", { class: "cells" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "sorted A"), ia, h("label", {}, "x"), ix, btn("Search", () => { A = nums(ia.value).sort((p, q) => p - q); x = parseFloat(ix.value); ia.value = A.join(", "); build(); })),
      cells, ptrs, stepper.bar, stepper.caption, stats);
    function build() {
      const frames = [{ lo: 0, hi: A.length - 1, c: 0, msg: `Search for x = ${x}. low = 0, high = ${A.length - 1}.` }];
      let lo = 0, hi = A.length - 1, c = 0, found = -1;
      while (lo <= hi) {
        const m = Math.floor((lo + hi) / 2); c++;
        if (A[m] === x) { frames.push({ lo, hi, m, c, found: m, msg: `mid = ⌊(${lo}+${hi})/2⌋ = ${m}; A[${m}] = ${A[m]} = x → <span class="ok">found at index ${m}</span>` }); found = m; break; }
        if (x < A[m]) { frames.push({ lo, hi, m, c, msg: `mid = ⌊(${lo}+${hi})/2⌋ = ${m}; ${x} &lt; A[${m}] = ${A[m]} → discard the right half` }); hi = m - 1; }
        else { frames.push({ lo, hi, m, c, msg: `mid = ⌊(${lo}+${hi})/2⌋ = ${m}; ${x} &gt; A[${m}] = ${A[m]} → discard the left half` }); lo = m + 1; }
        frames.push({ lo, hi, c, msg: `new range: low = ${lo}, high = ${hi}` });
      }
      if (found < 0) frames.push({ lo, hi, c, msg: `low &gt; high → <span class="bad">not found, return −1</span>` });
      const seq = found >= 0 ? A.indexOf(x) + 1 : A.length;
      frames[frames.length - 1].msg += ` &nbsp;·&nbsp; binary: <b>${c}</b> comparisons, sequential: <b>${seq}</b>`;
      stepper.set(frames);
    }
    function draw(f) {
      cells.replaceChildren(...A.map((v, k) => cell(v, k === f.found ? "found" : k === f.m ? "mid" : k < f.lo || k > f.hi ? "dim" : "", k)));
      ptrs.replaceChildren(...A.map((_, k) => h("div", { class: "cell", style: "border-color:transparent;background:transparent;color:var(--accent);font-weight:700" },
        [k === f.lo ? "low" : "", k === f.m ? "mid" : "", k === f.hi ? "high" : ""].filter(Boolean).join("/") || " ")));
      stats.replaceChildren(stat("comparisons:", f.c), stat("⌊log₂n⌋+1 =", Math.floor(Math.log2(A.length)) + 1));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     11. Master theorem calculator
     ======================================================= */
  register("master", (host, d) => {
    const ia = h("input", { type: "number", value: d.a || 2, min: 1, step: 1, style: "width:4em" });
    const ib = h("input", { type: "number", value: d.b || 2, min: 2, step: 1, style: "width:4em" });
    const id = h("input", { type: "number", value: d.d || 1, min: 0, step: 0.5, style: "width:4em" });
    const out = h("div", { class: "w-caption", style: "font-size:0.75em;padding:.6em 1em" });
    const presets = [["Binary search", 1, 2, 0], ["Max (D&C)", 2, 2, 0], ["Merge sort", 2, 2, 1], ["Karatsuba", 3, 2, 1], ["Strassen", 7, 2, 2]];
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "a"), ia, h("label", {}, "b"), ib, h("label", {}, "d"), id,
      ...presets.map(([nm, a, b, dd]) => btn(nm, () => { ia.value = a; ib.value = b; id.value = dd; draw(); }))), out);
    [ia, ib, id].forEach((e) => e.addEventListener("input", draw));
    function draw() {
      const a = +ia.value, b = +ib.value, dd = +id.value;
      if (!(a >= 1 && b > 1 && dd >= 0)) { out.textContent = "Need a ≥ 1, b > 1, d ≥ 0"; return; }
      const crit = Math.log(a) / Math.log(b);
      let caseTxt, res;
      if (Math.abs(dd - crit) < 1e-9) { caseTxt = "d = log_b a → work is the same at every level"; res = dd === 0 ? "\\Theta(\\log n)" : `\\Theta(n^{${fmtNum(dd)}} \\log n)`; }
      else if (dd > crit) { caseTxt = "d > log_b a → the root (combine step) dominates"; res = dd === 0 ? "\\Theta(1)" : `\\Theta(n^{${fmtNum(dd)}})`; }
      else { caseTxt = "d < log_b a → the leaves dominate"; res = `\\Theta(n^{${crit.toFixed(3).replace(/\.?0+$/, "")}})`; }
      out.replaceChildren(
        tex(`T(n) = ${a}\\,T(n/${b}) + \\Theta(n^{${fmtNum(dd)}})`, h("div")),
        h("div", {}, `log_${b} ${a} = ${crit.toFixed(3)}  ·  ${caseTxt}`),
        tex(`\\Rightarrow\\; T(n) = ${res}`, h("div", { style: "font-size:1.3em;color:var(--accent)" })));
    }
    draw();
  });

  /* =======================================================
     12. Change making: greedy vs optimal
     ======================================================= */
  function changeDP(den, n) {
    const F = [0], pick = [0];
    for (let m = 1; m <= n; m++) { F[m] = Infinity; pick[m] = 0; den.forEach((c) => { if (c <= m && F[m - c] + 1 < F[m]) { F[m] = F[m - c] + 1; pick[m] = c; } }); }
    const coins = []; let m = n; if (F[n] === Infinity) return { F, coins: null };
    while (m > 0) { coins.push(pick[m]); m -= pick[m]; }
    return { F, pick, coins };
  }
  register("change", (host, d) => {
    const iden = h("input", { type: "text", value: d.coins || "1,7,10", size: 12 }), iam = h("input", { type: "number", value: d.amount || 15, style: "width:5em" });
    const out = h("div");
    const presets = [["US ¢ (1,5,10,25) · 63", "1,5,10,25", 63], ["Darsek (1,7,10) · 15", "1,7,10", 15], ["(1,3,4) · 6", "1,3,4", 6]];
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "coins"), iden, h("label", {}, "amount"), iam, btn("Compute", draw),
      ...presets.map(([nm, c, a]) => btn(nm, () => { iden.value = c; iam.value = a; draw(); }))), out);
    function coinRow(list) {
      return h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;min-height:58px;align-items:center" }, ...list.map((c, k) => h("div", {
        style: `width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-weight:700;font-size:0.6em;background:var(--hot-soft);border:2px solid var(--hot);animation:pop .3s ease-out ${k * 0.08}s both`
      }, c)));
    }
    function draw() {
      const den = nums(iden.value).filter((x) => x > 0).sort((a, b) => b - a), n = Math.max(0, Math.floor(+iam.value));
      const g = []; let left = n;
      den.forEach((c) => { while (left >= c) { g.push(c); left -= c; } });
      const opt = n <= 5000 ? changeDP(den.slice().reverse(), n).coins : null;
      out.replaceChildren(
        h("div", { class: "card", style: "margin:.3em 0" }, h("h4", {}, "Greedy: largest coin that fits — " + (left ? "stuck! " + left + " left" : g.length + " coins")), coinRow(g)),
        h("div", { class: "card" }, h("h4", {}, "Optimal (dynamic programming) — " + (opt ? opt.length + " coins" : "no solution")), coinRow((opt || []).slice().sort((x, y) => y - x))),
        h("p", { class: "small" }, opt && !left && opt.length === g.length ? h("span", { class: "ok" }, "Greedy is optimal here.") : h("span", { class: "bad" }, "Greedy is NOT optimal for this coin system.")));
    }
    draw();
  });

  register("changedp", (host, d) => {
    let den = nums(d.coins || "1,3,4").sort((a, b) => a - b), N = parseInt(d.amount || "6", 10);
    const iden = h("input", { type: "text", value: den.join(","), size: 10 }), iam = h("input", { type: "number", value: N, style: "width:4em" });
    const row = h("div", { class: "cells" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "d"), iden, h("label", {}, "n"), iam, btn("Load", () => { den = nums(iden.value).filter((x) => x > 0).sort((a, b) => a - b); N = Math.min(20, +iam.value); build(); })),
      row, stepper.bar, stepper.caption);
    function build() {
      const F = [0], pick = [0], frames = [{ F: [0], msg: "F(0) = 0: zero coins make amount 0." }];
      for (let m = 1; m <= N; m++) {
        const opts = [];
        den.forEach((c) => { if (c <= m && F[m - c] !== Infinity) opts.push([c, F[m - c] + 1]); });
        opts.forEach(([c, v]) => frames.push({ F: F.slice(), cur: m, ref: m - c, msg: `F(${m}): use a coin ${c} → F(${m - c}) + 1 = ${v}` }));
        let best = Infinity, bc = 0; opts.forEach(([c, v]) => { if (v < best) { best = v; bc = c; } });
        F[m] = best; pick[m] = bc;
        frames.push({ F: F.slice(), cur: m, msg: `F(${m}) = min{ ${opts.map(([c, v]) => v).join(", ")} } = <b>${best === Infinity ? "∞" : best}</b>` });
      }
      const used = []; let m = N; const path = [];
      while (m > 0 && pick[m]) { used.push(pick[m]); path.push(m); m -= pick[m]; }
      frames.push({ F: F.slice(), path, msg: `Trace back from F(${N}): coins <b>${used.join(" + ")}</b> = ${N} → ${used.length} coins` });
      stepper.set(frames);
    }
    function draw(f) {
      row.replaceChildren(h("span", { class: "tiny muted", style: "align-self:center;margin-right:.4em" }, "F(n)"),
        ...Array.from({ length: N + 1 }, (_, k) => cell(f.F[k] == null ? "·" : f.F[k] === Infinity ? "∞" : f.F[k],
          k === f.cur ? "act" : k === f.ref ? "mid" : f.path && f.path.includes(k) ? "good" : f.F[k] == null ? "empty" : "", k)));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     13. Coin-row DP
     ======================================================= */
  register("coinrow", (host, d) => {
    let C = nums(d.input || "5,1,2,10,6,2");
    const ic = h("input", { type: "text", value: C.join(", "), size: 22 });
    const stage = h("div", { style: "display:grid;grid-template-columns:3.2em 1fr;gap:.4em;align-items:center" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "coins"), ic, btn("Load", () => { C = nums(ic.value).slice(0, 12); build(); })), stage, stepper.bar, stepper.caption);
    function build() {
      const n = C.length, F = [0, C[0]];
      const frames = [{ F: [0], msg: "F(0) = 0 (no coins)." }, { F: [0, C[0]], cur: 1, msg: `F(1) = c₁ = ${C[0]}` }];
      for (let i = 2; i <= n; i++) {
        const take = C[i - 1] + F[i - 2], skip = F[i - 1];
        frames.push({ F: F.slice(), cur: i, refs: [i - 2, i - 1], msg: `F(${i}) = max( c${i} + F(${i - 2}), F(${i - 1}) ) = max( ${C[i - 1]} + ${F[i - 2]}, ${skip} ) = max(${take}, ${skip})` });
        F[i] = Math.max(take, skip);
        frames.push({ F: F.slice(), cur: i, msg: `F(${i}) = <b>${F[i]}</b> → ${take >= skip ? "take coin " + i : "skip coin " + i}` });
      }
      const picked = []; let i = n;
      while (i >= 1) { if (i === 1 || C[i - 1] + (F[i - 2] || 0) >= F[i - 1]) { if (i === 1 && F[1] === 0) break; picked.push(i); i -= 2; } else i -= 1; }
      frames.push({ F: F.slice(), picked, msg: `Max amount F(${n}) = <b>${F[n]}</b>, coins ${picked.slice().reverse().map((k) => "c" + k + "=" + C[k - 1]).join(", ")}` });
      stepper.set(frames);
    }
    function draw(f) {
      const n = C.length;
      stage.replaceChildren(
        h("b", { class: "small" }, "coin"), h("div", { class: "cells" }, cell("", "empty", 0), ...C.map((c, k) => cell(c, f.picked && f.picked.includes(k + 1) ? "good" : k + 1 === f.cur ? "ref" : "", k + 1))),
        h("b", { class: "small" }, "F"), h("div", { class: "cells" }, ...Array.from({ length: n + 1 }, (_, k) => cell(f.F[k] != null ? f.F[k] : "·", k === f.cur ? "act" : f.refs && f.refs.includes(k) ? "mid" : f.F[k] == null ? "empty" : "", k))));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     14. Job scheduling (makespan) – Gantt chart
     ======================================================= */
  register("schedule", (host, d) => {
    let jobs = nums(d.jobs || "3,5,6,10,11,14,15,18,20"), m = parseInt(d.m || "3", 10), strat = d.strategy || "lpt";
    const sv = svg(1000, 60 + m * 70);
    const stepper = Stepper(draw);
    const bs = [["lpt", "Longest first"], ["spt", "Shortest first"], ["opt", "Optimal (try all)"]].map(([k, nm]) => { const b = btn(nm, () => { strat = k; setOn(bs, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...bs, h("span", { class: "tiny muted" }, "jobs: " + jobs.join(", ") + " · " + m + " processors")), sv, stepper.bar, stepper.caption);
    setOn(bs, bs.find((b) => b.dataset.k === strat));
    const total = jobs.reduce((s, x) => s + x, 0), lb = Math.ceil(total / m);
    function optimal() {
      const J = jobs.slice().sort((a, b) => b - a); let best = Infinity, bestA = null; const loads = Array(m).fill(0), as = [];
      (function rec(k) {
        if (k === J.length) { const mk = Math.max(...loads); if (mk < best) { best = mk; bestA = as.slice(); } return; }
        const tried = new Set();
        for (let p = 0; p < m; p++) { if (tried.has(loads[p])) continue; tried.add(loads[p]); if (loads[p] + J[k] >= best) continue; loads[p] += J[k]; as.push([J[k], p]); rec(k + 1); as.pop(); loads[p] -= J[k]; }
      })(0);
      return bestA;
    }
    function build() {
      let order;
      if (strat === "opt") order = optimal();
      else {
        const J = jobs.slice().sort((a, b) => strat === "lpt" ? b - a : a - b); const loads = Array(m).fill(0); order = [];
        J.forEach((j) => { let p = 0; for (let q = 1; q < m; q++) if (loads[q] < loads[p]) p = q; loads[p] += j; order.push([j, p]); });
      }
      const frames = [{ A: [], msg: strat === "opt" ? "An optimal assignment found by exhaustive search (exponential time)." : `Greedy: take jobs ${strat === "lpt" ? "longest" : "shortest"}-first, give each to the processor that frees up first.` }];
      order.forEach((x, k) => frames.push({ A: order.slice(0, k + 1), msg: `job ${x[0]} min → P${x[1] + 1}` }));
      const loads = Array(m).fill(0); order.forEach(([j, p]) => loads[p] += j);
      frames.push({ A: order, done: true, msg: `Finish time (makespan) = <b>${Math.max(...loads)} min</b> · lower bound ⌈${total}/${m}⌉ = ${lb}` });
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const L = 60, R = 30, scale = (1000 - L - R) / 45, loads = Array(m).fill(0);
      for (let t = 0; t <= 45; t += 5) {
        sv.append(S("line", { x1: L + t * scale, y1: 20, x2: L + t * scale, y2: 30 + m * 70, style: "stroke:var(--line)" }));
        sv.append(S("text", { x: L + t * scale, y: 50 + m * 70, "text-anchor": "middle", "font-size": 14, class: "mono", style: "fill:var(--muted)" }, t));
      }
      for (let p = 0; p < m; p++) sv.append(S("text", { x: 10, y: 30 + p * 70 + 32, "font-size": 18, "font-weight": 700 }, "P" + (p + 1)));
      f.A.forEach(([j, p], k) => {
        const x = L + loads[p] * scale, y = 30 + p * 70;
        const last = k === f.A.length - 1 && !f.done;
        sv.append(S("rect", { x: x + 1, y, width: j * scale - 2, height: 50, rx: 8, style: `fill:${last ? "var(--hot-soft)" : "var(--accent-soft)"};stroke:${last ? "var(--hot)" : "var(--accent)"};stroke-width:2` }));
        sv.append(S("text", { x: x + j * scale / 2, y: y + 32, "text-anchor": "middle", "font-size": 18, class: "mono", "font-weight": 700 }, j));
        loads[p] += j;
      });
      if (f.done) { const mk = Math.max(...loads); sv.append(S("line", { x1: L + mk * scale, y1: 15, x2: L + mk * scale, y2: 35 + m * 70, style: "stroke:var(--hot);stroke-width:3;stroke-dasharray:6 4" })); }
    }
    build();
    return { stepper };
  });

  /* =======================================================
     15. Huffman tree builder
     ======================================================= */
  register("huffman", (host, d) => {
    let text = d.text || "this is his message";
    const it = h("input", { type: "text", value: text, size: 26 });
    const sv = svg(1000, 400);
    const table = h("div", { class: "small" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "message"), it, btn("Build", () => { text = it.value || "a"; build(); })), sv, stepper.bar, stepper.caption, table);
    const show = (ch) => ch === " " ? "␣" : ch;
    let all = [];
    function build() {
      const freq = {}; for (const ch of text) freq[ch] = (freq[ch] || 0) + 1;
      all = []; let uid = 0;
      const leaves = Object.entries(freq).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([ch, w]) => ({ id: uid++, ch, w }));
      all.push(...leaves);
      let forest = leaves.slice();
      const sortF = (F) => F.slice().sort((a, b) => a.w - b.w || a.id - b.id);
      const frames = [{ forest: sortF(forest), msg: `Count frequencies: ${leaves.map((l) => show(l.ch) + "=" + l.w).join(", ")}. Start with one tree per symbol.` }];
      if (forest.length === 1) { leaves[0].code = "0"; }
      while (forest.length > 1) {
        const F = sortF(forest); const a = F[0], b = F[1];
        frames.push({ forest: F, sel: [a.id, b.id], msg: `Pick the two lightest trees: ${a.w} and ${b.w}` });
        const nd = { id: uid++, w: a.w + b.w, l: a, r: b }; all.push(nd);
        forest = F.slice(2).concat([nd]);
        frames.push({ forest: sortF(forest), sel: [nd.id], msg: `Merge them under a new root of weight ${a.w} + ${b.w} = <b>${nd.w}</b>` });
      }
      const root = forest[0];
      (function assign(nd, code) { if (nd.ch != null) { nd.code = code || "0"; return; } assign(nd.l, code + "0"); assign(nd.r, code + "1"); })(root, "");
      const bits = leaves.reduce((s, l) => s + l.w * l.code.length, 0), fixed = Math.max(1, Math.ceil(Math.log2(leaves.length))) * text.length;
      frames.push({ forest: [root], labels: true, msg: `Label left edges 0, right edges 1. Encoded size: <b>${bits} bits</b> vs ${fixed} bits fixed-length (${Math.max(1, Math.ceil(Math.log2(leaves.length)))} bits/char) vs ${8 * text.length} bits ASCII.` });
      stepper._leaves = leaves;
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); table.replaceChildren();
      const leafCount = (nd) => nd.ch != null ? 1 : leafCount(nd.l) + leafCount(nd.r);
      const total = f.forest.reduce((s, t) => s + leafCount(t), 0);
      const slot = Math.min(110, 960 / total);
      let next = 20 + (960 - slot * total) / 2;
      const depthOf = (nd) => nd.ch != null ? 0 : 1 + Math.max(depthOf(nd.l), depthOf(nd.r));
      const maxDepth = Math.max(...f.forest.map(depthOf));
      const dy = Math.min(70, 310 / Math.max(1, maxDepth));
      const pos = new Map();
      function lay(nd, depth) {
        if (nd.ch != null) { pos.set(nd, [next + slot / 2, 30 + depth * dy]); next += slot; return; }
        lay(nd.l, depth + 1); lay(nd.r, depth + 1);
        pos.set(nd, [(pos.get(nd.l)[0] + pos.get(nd.r)[0]) / 2, 30 + depth * dy]);
      }
      f.forest.forEach((t) => lay(t, 0));
      const sel = new Set(f.sel || []);
      const edges = (nd) => {
        if (nd.ch != null) return;
        [[nd.l, "0"], [nd.r, "1"]].forEach(([c, lab]) => {
          const [x1, y1] = pos.get(nd), [x2, y2] = pos.get(c);
          sv.append(S("line", { x1, y1, x2, y2, style: "stroke:var(--muted);stroke-width:2" }));
          if (f.labels) sv.append(S("text", { x: (x1 + x2) / 2 + (lab === "0" ? -14 : 14), y: (y1 + y2) / 2, "text-anchor": "middle", "font-size": 19, "font-weight": 700, style: "fill:var(--hot)" }, lab));
          edges(c);
        });
      };
      f.forest.forEach(edges);
      pos.forEach(([x, y], nd) => {
        const hot = sel.has(nd.id);
        sv.append(S("circle", { cx: x, cy: y, r: 22, style: `fill:${nd.ch != null ? "var(--accent-soft)" : "var(--surface)"};stroke:${hot ? "var(--hot)" : "var(--accent)"};stroke-width:${hot ? 4 : 2}` }));
        sv.append(S("text", { x, y: y + 6, "text-anchor": "middle", "font-size": 18, "font-weight": 700, class: "mono" }, nd.w));
        if (nd.ch != null) sv.append(S("text", { x, y: y + 46, "text-anchor": "middle", "font-size": 22, "font-weight": 700, style: "fill:var(--accent)" }, show(nd.ch)));
      });
      if (f.labels && stepper._leaves) {
        const L = stepper._leaves.slice().sort((a, b) => a.code.length - b.code.length || (a.ch < b.ch ? -1 : 1));
        table.append(h("div", { class: "cells" }, ...L.map((l) => h("div", { class: "cell" }, h("span", { class: "idx" }, show(l.ch) + " ×" + l.w), l.code))));
      }
    }
    build();
    return { stepper };
  });

  /* =======================================================
     16. Branch & bound for 0/1 knapsack (best-first)
     ======================================================= */
  register("knapsack", (host, d) => {
    const instances = {
      example: { W: 10, items: [[4, 40], [7, 42], [5, 25], [3, 12]] },
      exercise: { W: 16, items: [[10, 100], [7, 63], [8, 56], [4, 12]] }
    };
    let inst = d.instance || "example";
    const sv = svg(1000, 470);
    const info = h("div", { class: "small" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const bs = Object.keys(instances).map((k) => { const b = btn(k === "example" ? "Example (W = 10)" : "Exercise (W = 16)", () => { inst = k; setOn(bs, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...bs, info), sv, stepper.bar, stepper.caption, stats);
    setOn(bs, bs.find((b) => b.dataset.k === inst));
    let nodes = [];
    function build() {
      const { W, items } = instances[inst]; const n = items.length;
      const dens = items.map(([w, v]) => v / w);
      info.textContent = "W = " + W + " · items (w, v, v/w): " + items.map(([w, v], i) => `${i + 1}:(${w}, ${v}, ${fmtNum(v / w)})`).join("  ");
      const ub = (lvl, w, v) => lvl >= n ? v : v + (W - w) * dens[lvl];
      nodes = []; const ev = [];
      const mk = (lvl, w, v, parent, take) => { const nd = { id: nodes.length, lvl, w, v, ub: ub(lvl, w, v), parent, take, kids: [], status: "open" }; nodes.push(nd); if (parent != null) nodes[parent].kids.push(nd.id); return nd; };
      const root = mk(0, 0, 0, null, null);
      ev.push({ t: "gen", ids: [root.id], msg: `Root: nothing chosen. ub = 0 + (${W} − 0)·${fmtNum(dens[0])} = ${fmtNum(root.ub)}` });
      let best = null; const live = [root];
      while (live.length) {
        live.sort((a, b) => b.ub - a.ub || a.id - b.id);
        const nd = live.shift();
        if (best && nd.ub <= best.v) { ev.push({ t: "prune", id: nd.id, msg: `Node ${nd.id}: ub ${fmtNum(nd.ub)} ≤ best ${best.v} → <span class="bad">prune</span>` }); continue; }
        if (nd.lvl === n) {
          if (!best || nd.v > best.v) { best = nd; ev.push({ t: "best", id: nd.id, msg: `Node ${nd.id} is a complete solution with value <b>${nd.v}</b> → new best` }); }
          // prune everything that can no longer win
          live.slice().forEach((o) => { if (o.ub <= best.v) { ev.push({ t: "prune", id: o.id, msg: `Node ${o.id}: ub ${fmtNum(o.ub)} ≤ best ${best.v} → <span class="bad">prune</span>` }); live.splice(live.indexOf(o), 1); } });
          continue;
        }
        const [wi, vi] = items[nd.lvl];
        ev.push({ t: "expand", id: nd.id, msg: `Expand the most promising live node: node ${nd.id} (ub = ${fmtNum(nd.ub)})` });
        const a = mk(nd.lvl + 1, nd.w + wi, nd.v + vi, nd.id, true), b = mk(nd.lvl + 1, nd.w, nd.v, nd.id, false);
        if (a.w > W) { a.status = "infeasible"; a.ub = NaN; } else live.push(a);
        live.push(b);
        ev.push({ t: "gen", ids: [a.id, b.id], msg: `With item ${nd.lvl + 1}: ${a.w > W ? `w = ${a.w} &gt; ${W} → <span class="bad">infeasible</span>` : `w=${a.w}, v=${a.v}, ub=${fmtNum(a.ub)}`} &nbsp;|&nbsp; Without: w=${b.w}, v=${b.v}, ub=${fmtNum(b.ub)}` });
      }
      ev.push({ t: "end", msg: `No live nodes left → optimal value <b>${best.v}</b>. Nodes generated: ${nodes.length} (full tree: ${Math.pow(2, n + 1) - 1}).` });
      // layout: leaves sequential
      let slot = 0;
      (function lay(nd) { if (!nd.kids.length) { nd.x = slot++; return; } nd.kids.forEach((k) => lay(nodes[k])); nd.x = nd.kids.reduce((s, k) => s + nodes[k].x, 0) / nd.kids.length; })(root);
      nodes.slots = slot;
      const frames = [];
      ev.forEach((e, i) => frames.push({ upto: i, ev, msg: e.msg }));
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const state = {}; let best = null, cur = null;
      for (let i = 0; i <= f.upto; i++) {
        const e = f.ev[i];
        if (e.t === "gen") e.ids.forEach((id) => state[id] = nodes[id].status === "infeasible" ? "infeasible" : "live");
        if (e.t === "expand") state[e.id] = "expanded";
        if (e.t === "prune") state[e.id] = "pruned";
        if (e.t === "best") { state[e.id] = "best"; best = e.id; }
        cur = e;
      }
      const slotW = 150, levH = 78, bw = 136, bh = 56;
      const maxL = Math.max(...nodes.map((x) => x.lvl));
      sv.setAttribute("viewBox", `0 0 ${nodes.slots * slotW + 20} ${(maxL + 1) * levH + 10}`);
      const X = (nd) => 10 + slotW * (nd.x + 0.5), Y = (nd) => 8 + bh / 2 + nd.lvl * levH;
      nodes.forEach((nd) => {
        if (!state[nd.id] || nd.parent == null) return; const p = nodes[nd.parent];
        sv.append(S("line", { x1: X(p), y1: Y(p) + bh / 2, x2: X(nd), y2: Y(nd) - bh / 2, style: "stroke:var(--line);stroke-width:2" }));
        sv.append(S("text", { x: (X(p) + X(nd)) / 2 + (nd.take ? -18 : 18), y: (Y(p) + Y(nd)) / 2 + 5, "text-anchor": "middle", "font-size": 15, style: `fill:${nd.take ? "var(--ok)" : "var(--muted)"}`, "font-weight": 700 }, (nd.take ? "+" : "−") + nd.lvl));
      });
      nodes.forEach((nd) => {
        const s = state[nd.id]; if (!s) return;
        const isCur = cur && (cur.id === nd.id || (cur.ids && cur.ids.includes(nd.id)));
        const fill = { live: "var(--surface)", expanded: "var(--accent-soft)", pruned: "var(--line)", infeasible: "var(--bad-soft)", best: "var(--ok-soft)" }[s];
        const stroke = isCur ? "var(--hot)" : s === "best" ? "var(--ok)" : s === "infeasible" ? "var(--bad)" : "var(--accent)";
        const g = S("g", { style: s === "pruned" ? "opacity:.45" : "" });
        g.append(S("rect", { x: X(nd) - bw / 2, y: Y(nd) - bh / 2, width: bw, height: bh, rx: 10, style: `fill:${fill};stroke:${stroke};stroke-width:${isCur ? 3.5 : 2}` }));
        g.append(S("text", { x: X(nd) - bw / 2 + 6, y: Y(nd) - bh / 2 + 14, "font-size": 12, style: "fill:var(--muted)" }, "#" + nd.id));
        g.append(S("text", { x: X(nd) + 6, y: Y(nd) - 1, "text-anchor": "middle", "font-size": 16, class: "mono", "font-weight": 600 }, `w=${nd.w} v=${nd.v}`));
        g.append(S("text", { x: X(nd), y: Y(nd) + 20, "text-anchor": "middle", "font-size": 16, class: "mono", style: s === "infeasible" ? "fill:var(--bad)" : "" }, s === "infeasible" ? "w > W ✗" : "ub=" + fmtNum(nd.ub)));
        if (s === "pruned") g.append(S("line", { x1: X(nd) - bw / 2, y1: Y(nd) + bh / 2, x2: X(nd) + bw / 2, y2: Y(nd) - bh / 2, style: "stroke:var(--bad);stroke-width:2" }));
        sv.append(g);
      });
      stats.replaceChildren(stat("best so far:", best != null ? nodes[best].v : "—"), stat("nodes generated:", Object.keys(state).length));
    }
    build();
    return { stepper };
  });
})();

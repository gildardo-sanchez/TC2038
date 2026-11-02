/* =========================================================
   TC2038 · Unit 4 — Computational geometry widgets
   Requires widgets.js (window.Widgets) to be loaded first.
   All algorithms work in "math" coordinates (y grows upward);
   drawing converts to SVG coordinates (y grows downward).
   ========================================================= */
(function () {
  "use strict";
  const { register, h, S, Stepper } = window.Widgets;

  // ---------- helpers ----------
  const btn = (label, fn, title) => h("button", { type: "button", title: title || null, onclick: fn }, label);
  const setOn = (group, active) => group.forEach((b) => b.classList.toggle("on", b === active));
  const stat = (label, value) => h("span", {}, label + " ", h("b", {}, String(value)));
  function mkSvg(w, hh, extra) { const s = S("svg", { viewBox: `0 0 ${w} ${hh}`, preserveAspectRatio: "xMidYMid meet" }); s.style.touchAction = "none"; s.style.overflow = "hidden"; if (extra) s.style.cssText += extra; return s; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function randomPoints(n, W, H, seed, margin) {
    const r = rng(seed || 7), m = margin == null ? 40 : margin, pts = [];
    let guard = 0;
    while (pts.length < n && guard++ < 5000) {
      const p = { x: m + r() * (W - 2 * m), y: m + r() * (H - 2 * m) };
      if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 34)) pts.push(p);
    }
    return pts;
  }
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); // >0 left turn (math coords)
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function svgPoint(sv, e) { const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); }
  function circumcircle(a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { x, y, r: Math.hypot(a.x - x, a.y - y) };
  }
  function inCircle(a, b, c, d) { // >0 if d inside circle abc (abc counter-clockwise)
    const ax = a.x - d.x, ay = a.y - d.y, bx = b.x - d.x, by = b.y - d.y, cx = c.x - d.x, cy = c.y - d.y;
    return (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay);
  }
  // Draggable / clickable points on an SVG whose y axis is flipped (world height H)
  function interact(sv, H, getPts, onChange, opts) {
    opts = opts || {};
    let drag = -1;
    sv.addEventListener("pointerdown", (e) => {
      const q = svgPoint(sv, e), w = { x: q.x, y: H - q.y }, pts = getPts();
      let best = -1, bd = opts.grab || 18;
      pts.forEach((p, i) => { const dd = dist(p, w); if (dd < bd) { bd = dd; best = i; } });
      if (best >= 0 && opts.drag !== false) { drag = best; sv.setPointerCapture(e.pointerId); e.preventDefault(); }
      else if (opts.add) { opts.add(opts.snap ? opts.snap(w) : w); }
    });
    sv.addEventListener("pointermove", (e) => {
      if (drag < 0) { if (opts.hover) { const q = svgPoint(sv, e); opts.hover({ x: q.x, y: H - q.y }); } return; }
      const q = svgPoint(sv, e); let w = { x: Math.max(4, Math.min(opts.W - 4, q.x)), y: Math.max(4, Math.min(H - 4, H - q.y)) };
      if (opts.snap) w = opts.snap(w);
      const pts = getPts(); pts[drag].x = w.x; pts[drag].y = w.y; onChange(drag);
    });
    const up = () => { drag = -1; };
    sv.addEventListener("pointerup", up); sv.addEventListener("pointercancel", up);
    sv.addEventListener("pointerleave", () => { if (opts.hover) opts.hover(null); });
  }
  // drawing helpers (world -> svg)
  function D(sv, H) {
    return {
      line(a, b, st) { sv.append(S("line", { x1: a.x, y1: H - a.y, x2: b.x, y2: H - b.y, style: st || "stroke:var(--ink);stroke-width:2" })); },
      dot(p, r, st) { sv.append(S("circle", { cx: p.x, cy: H - p.y, r: r || 6, style: st || "fill:var(--ink)" })); },
      text(p, t, st, size, dx, dy) { sv.append(S("text", { x: p.x + (dx || 0), y: H - p.y + (dy || 0), "font-size": size || 16, "font-weight": 700, style: st || "" }, t)); },
      poly(ps, st) { sv.append(S("polygon", { points: ps.map((p) => p.x + "," + (H - p.y)).join(" "), style: st })); },
      path(ps, st) { sv.append(S("polyline", { points: ps.map((p) => p.x + "," + (H - p.y)).join(" "), style: st || "fill:none;stroke:var(--accent);stroke-width:3" })); },
      circle(c, r, st) { sv.append(S("circle", { cx: c.x, cy: H - c.y, r, style: st })); },
      rect(x0, y0, x1, y1, st) { sv.append(S("rect", { x: Math.min(x0, x1), y: H - Math.max(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0), style: st })); }
    };
  }

  /* =======================================================
     1. Orientation predicate (drag p, q, r on an integer grid)
     ======================================================= */
  register("orient", (host) => {
    const U = 44, W = 14 * U, H = 9 * U;
    const pts = [{ x: 2 * U, y: 2 * U }, { x: 9 * U, y: 4 * U }, { x: 5 * U, y: 7 * U }];
    const sv = mkSvg(W, H);
    const out = h("div", { class: "w-caption", style: "font-size:0.62em;line-height:1.6" });
    host.append(h("div", { class: "cols", style: "grid-template-columns:1.4fr 1fr;gap:1em;align-items:center" }, sv, out));
    const snap = (w) => ({ x: Math.round(w.x / U) * U, y: Math.round(w.y / U) * U });
    interact(sv, H, () => pts, draw, { W, snap });
    function draw() {
      sv.replaceChildren(); const d = D(sv, H);
      for (let i = 0; i <= 14; i++) d.line({ x: i * U, y: 0 }, { x: i * U, y: H }, "stroke:var(--line);stroke-width:1");
      for (let j = 0; j <= 9; j++) d.line({ x: 0, y: j * U }, { x: W, y: j * U }, "stroke:var(--line);stroke-width:1");
      const [p, q, r] = pts, o = orient(p, q, r);
      const col = o > 0 ? "var(--ok)" : o < 0 ? "var(--bad)" : "var(--muted)";
      d.poly([p, q, r], `fill:${col};fill-opacity:.15;stroke:none`);
      const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
      d.line({ x: p.x - dx / L * 1000, y: p.y - dy / L * 1000 }, { x: p.x + dx / L * 1000, y: p.y + dy / L * 1000 }, "stroke:var(--muted);stroke-width:1.5;stroke-dasharray:6 5");
      d.line(p, q, "stroke:var(--accent);stroke-width:4");
      const m = { x: p.x + dx * 0.6, y: p.y + dy * 0.6 };
      d.poly([{ x: m.x + dx / L * 14, y: m.y + dy / L * 14 }, { x: m.x - dy / L * 8, y: m.y + dx / L * 8 }, { x: m.x + dy / L * 8, y: m.y - dx / L * 8 }], "fill:var(--accent)");
      d.line(q, r, `stroke:${col};stroke-width:2.5;stroke-dasharray:4 4`);
      [["p", p], ["q", q], ["r", r]].forEach(([n, a]) => { d.dot(a, 10, n === "r" ? `fill:${col}` : "fill:var(--accent)"); d.text(a, n, "", 22, 12, -12); });
      const g = (a) => `(${a.x / U}, ${a.y / U})`, det = o / (U * U);
      out.innerHTML = `p = ${g(p)} &nbsp; q = ${g(q)} &nbsp; r = ${g(r)}<br>` +
        `<span class="mono">(q<sub>x</sub>−p<sub>x</sub>)(r<sub>y</sub>−p<sub>y</sub>) − (q<sub>y</sub>−p<sub>y</sub>)(r<sub>x</sub>−p<sub>x</sub>)</span><br>` +
        `= (${(q.x - p.x) / U})(${(r.y - p.y) / U}) − (${(q.y - p.y) / U})(${(r.x - p.x) / U}) = <b style="font-size:1.3em">${det}</b><br>` +
        (o > 0 ? `<span class="ok">&gt; 0 → r is LEFT of pq (counter-clockwise turn)</span>` : o < 0 ? `<span class="bad">&lt; 0 → r is RIGHT of pq (clockwise turn)</span>` : `<b>= 0 → p, q, r are collinear</b>`) +
        `<br><span class="muted">|det| / 2 = area of triangle pqr = ${Math.abs(det) / 2}</span>`;
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     2. Segment intersection test with four orientation tests
     ======================================================= */
  register("segtest", (host) => {
    const W = 640, H = 380;
    const pts = [{ x: 90, y: 80 }, { x: 520, y: 300 }, { x: 140, y: 320 }, { x: 470, y: 60 }];
    const sv = mkSvg(W, H);
    const out = h("div", { class: "w-caption", style: "font-size:0.6em;line-height:1.7" });
    host.append(h("div", { class: "cols", style: "grid-template-columns:1.35fr 1fr;gap:1em;align-items:center" }, sv, out));
    interact(sv, H, () => pts, draw, { W });
    const sgn = (v) => (Math.abs(v) < 1e-9 ? 0 : v > 0 ? 1 : -1);
    const sym = (s) => (s > 0 ? '<span class="ok">+ left</span>' : s < 0 ? '<span class="bad">− right</span>' : "0 on line");
    function onSeg(a, b, c) { return Math.min(a.x, b.x) - 1e-9 <= c.x && c.x <= Math.max(a.x, b.x) + 1e-9 && Math.min(a.y, b.y) - 1e-9 <= c.y && c.y <= Math.max(a.y, b.y) + 1e-9; }
    function draw() {
      sv.replaceChildren(); const d = D(sv, H);
      const [a, b, c, e] = pts;
      const o1 = sgn(orient(a, b, c)), o2 = sgn(orient(a, b, e)), o3 = sgn(orient(c, e, a)), o4 = sgn(orient(c, e, b));
      let hit = (o1 * o2 < 0 && o3 * o4 < 0);
      if (!hit) hit = (o1 === 0 && onSeg(a, b, c)) || (o2 === 0 && onSeg(a, b, e)) || (o3 === 0 && onSeg(c, e, a)) || (o4 === 0 && onSeg(c, e, b));
      d.line(a, b, "stroke:var(--accent);stroke-width:5;stroke-linecap:round");
      d.line(c, e, "stroke:var(--hot);stroke-width:5;stroke-linecap:round");
      [["a", a, "var(--accent)"], ["b", b, "var(--accent)"], ["c", c, "var(--hot)"], ["d", e, "var(--hot)"]].forEach(([n, p, col]) => { d.dot(p, 10, `fill:${col}`); d.text(p, n, "", 22, 12, -12); });
      if (hit && o1 * o2 < 0) {
        const t = orient(c, e, a) / (orient(c, e, a) - orient(c, e, b));
        d.dot({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, 11, "fill:none;stroke:var(--ok);stroke-width:4");
      }
      out.innerHTML = `orient(a, b, c): ${sym(o1)}<br>orient(a, b, d): ${sym(o2)}<br>` +
        `→ c and d on ${o1 * o2 < 0 ? "<b>opposite</b>" : "the <b>same</b>"} sides of ab<br>` +
        `orient(c, d, a): ${sym(o3)}<br>orient(c, d, b): ${sym(o4)}<br>` +
        `→ a and b on ${o3 * o4 < 0 ? "<b>opposite</b>" : "the <b>same</b>"} sides of cd<br>` +
        (hit ? '<b class="ok">✓ The segments intersect</b>' : '<b class="bad">✗ No intersection</b>') +
        '<br><span class="muted">Only multiplications and subtractions — no division, no angles.</span>';
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     3. Closest pair — divide and conquer
     ======================================================= */
  register("closestpair", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "11", 10), n = parseInt(dd.n || "16", 10), P = [];
    const sv = mkSvg(W, H);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New points", () => { seed++; build(); }), h("label", {}, "n"),
      (() => { const s = h("select", {}, ...[8, 12, 16, 24].map((k) => h("option", { value: k }, k))); s.value = n; s.addEventListener("change", () => { n = +s.value; build(); }); return s; })()),
      sv, stepper.bar, stepper.caption, stats);
    function build() {
      P = randomPoints(n, W, H, seed, 30).sort((a, b) => a.x - b.x);
      P.forEach((p, i) => { p.id = i; });
      const frames = []; let dcount = 0, best = { d: Infinity, a: null, b: null };
      const upd = (a, b) => { dcount++; const d0 = dist(a, b); if (d0 < best.d) best = { d: d0, a, b }; return d0; };
      const snap = (o) => frames.push(Object.assign({ best: Object.assign({}, best), dcount }, o));
      function rec(lo, hi, depth) { // P[lo..hi) sorted by x; returns delta of this subproblem
        const m = hi - lo;
        if (m <= 3) {
          let dl = Infinity;
          for (let i = lo; i < hi; i++) for (let j = i + 1; j < hi; j++) dl = Math.min(dl, upd(P[i], P[j]));
          snap({ lo, hi, msg: `Base case: ${m} point${m > 1 ? "s" : ""} → brute force (${m * (m - 1) / 2} distance${m * (m - 1) / 2 === 1 ? "" : "s"})` });
          return dl;
        }
        const mid = lo + Math.floor(m / 2), xm = (P[mid - 1].x + P[mid].x) / 2;
        snap({ lo, hi, split: xm, msg: `<b>Divide</b> ${m} points by the vertical line through the median x` });
        const d1 = rec(lo, mid, depth + 1), d2 = rec(mid, hi, depth + 1);
        const delta = Math.min(d1, d2);
        const strip = P.slice(lo, hi).filter((p) => Math.abs(p.x - xm) < delta).sort((a, b) => a.y - b.y);
        snap({ lo, hi, split: xm, delta, strip: strip.map((p) => p.id), msg: `<b>Combine</b>: δ = min(δ<sub>L</sub>, δ<sub>R</sub>) = ${delta.toFixed(0)}. Only the ${strip.length} points within δ of the line can do better.` });
        let dl = delta;
        for (let i = 0; i < strip.length; i++) {
          const cmp = [];
          for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < dl; j++) { cmp.push(strip[j].id); dl = Math.min(dl, upd(strip[i], strip[j])); }
          if (cmp.length) snap({ lo, hi, split: xm, delta, strip: strip.map((p) => p.id), cur: strip[i].id, cmp, msg: `Strip: compare point with the next ${cmp.length} point${cmp.length > 1 ? "s" : ""} above it (never more than 7)` });
        }
        return dl;
      }
      snap({ lo: 0, hi: n, msg: `${n} points sorted by x. Brute force would compute ${n * (n - 1) / 2} distances.` });
      rec(0, n, 0);
      snap({ lo: 0, hi: n, done: true, msg: `Closest pair found: distance <b>${best.d.toFixed(1)}</b> using ${dcount} distance computations (brute force: ${n * (n - 1) / 2}).` });
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      if (!P.length) return;
      const x0 = f.lo < f.hi ? P[f.lo].x - 12 : 0, x1 = P[f.hi - 1].x + 12;
      d.rect(x0, 0, x1, H, "fill:var(--accent-soft);opacity:.55");
      if (f.delta != null) d.rect(f.split - f.delta, 0, f.split + f.delta, H, "fill:var(--hot-soft);opacity:.9");
      if (f.split != null) d.line({ x: f.split, y: 0 }, { x: f.split, y: H }, "stroke:var(--accent);stroke-width:2.5;stroke-dasharray:8 6");
      if (f.cur != null) f.cmp.forEach((j) => d.line(P[f.cur], P[j], "stroke:var(--hot);stroke-width:2"));
      if (f.best.a) d.line(f.best.a, f.best.b, "stroke:var(--ok);stroke-width:5");
      const inStrip = new Set(f.strip || []);
      P.forEach((p, i) => d.dot(p, i === f.cur ? 10 : 7, `fill:${i === f.cur ? "var(--hot)" : inStrip.has(i) ? "var(--hot)" : i >= f.lo && i < f.hi ? "var(--ink)" : "var(--muted)"}`));
      stats.replaceChildren(stat("distances computed:", f.dcount), stat("brute force:", n * (n - 1) / 2), stat("best so far:", f.best.d === Infinity ? "—" : f.best.d.toFixed(1)));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     4. Line-segment intersection — plane sweep (Bentley–Ottmann)
     ======================================================= */
  function segX(s, y) { const { a, b } = s; if (Math.abs(a.y - b.y) < 1e-12) return Math.min(a.x, b.x); return a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y); }
  function segInt(s, t) {
    const p = s.a, r = { x: s.b.x - s.a.x, y: s.b.y - s.a.y }, q = t.a, u = { x: t.b.x - t.a.x, y: t.b.y - t.a.y };
    const den = r.x * u.y - r.y * u.x; if (Math.abs(den) < 1e-12) return null;
    const tt = ((q.x - p.x) * u.y - (q.y - p.y) * u.x) / den, uu = ((q.x - p.x) * r.y - (q.y - p.y) * r.x) / den;
    if (tt < 0 || tt > 1 || uu < 0 || uu > 1) return null;
    return { x: p.x + tt * r.x, y: p.y + tt * r.y };
  }
  register("sweep", (host, dd) => {
    const W = 900, H = 380;
    let seed = parseInt(dd.seed || "5", 10), n = parseInt(dd.n || "7", 10), segs = [];
    const sv = mkSvg(W, H);
    const status = h("div", { class: "cells", style: "min-height:2.4em;align-items:center" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New segments", () => { seed++; build(); }), h("label", {}, "status (left → right):"), status), sv, stepper.bar, stepper.caption, stats);
    function makeSegs() {
      const r = rng(seed); const out = [];
      while (out.length < n) {
        const a = { x: 40 + r() * (W - 80), y: 30 + r() * (H - 60) }, b = { x: 40 + r() * (W - 80), y: 30 + r() * (H - 60) };
        if (Math.abs(a.y - b.y) < 40 || dist(a, b) < 120 || dist(a, b) > 520) continue;
        const s = a.y > b.y ? { a, b } : { a: b, b: a }; // a = upper endpoint (larger y)
        out.push(s);
      }
      return out.map((s, i) => Object.assign(s, { id: i, name: "s" + (i + 1) }));
    }
    function build() {
      segs = makeSegs();
      // event queue: upper / lower endpoints (sweep goes from top: larger y first)
      const Q = []; const key = (p) => p.x.toFixed(6) + "," + p.y.toFixed(6);
      segs.forEach((s) => { Q.push({ p: s.a, type: "upper", s: s.id }); Q.push({ p: s.b, type: "lower", s: s.id }); });
      const cmp = (e, f) => (f.p.y - e.p.y) || (e.p.x - f.p.x);
      Q.sort(cmp);
      const seen = new Set(); const found = []; const frames = []; let tests = 0; const tested = new Set();
      let active = [];
      const order = (y) => active.slice().sort((i, j) => segX(segs[i], y) - segX(segs[j], y));
      function test(i, j, ev) {
        if (i == null || j == null) return null;
        const k = Math.min(i, j) + "-" + Math.max(i, j); tests++; tested.add(k);
        const p = segInt(segs[i], segs[j]);
        if (p && (p.y < ev.y - 1e-9 || (Math.abs(p.y - ev.y) < 1e-9 && p.x > ev.x + 1e-9)) && !seen.has(key(p))) {
          seen.add(key(p)); Q.push({ p, type: "cross", s: i, t: j }); Q.sort(cmp); return p;
        }
        return null;
      }
      frames.push({ y: H + 10, st: [], done: [], found: [], queue: Q.map((e) => e.p), tests: 0, msg: `Event queue: the ${2 * n} endpoints, sorted top to bottom. Status: empty.` });
      const done = [];
      while (Q.length) {
        const ev = Q.shift(); const y = ev.p.y; done.push(ev.p);
        let msg = "", newP = [];
        if (ev.type === "upper") {
          active.push(ev.s); const ord = order(y - 1e-6); const k = ord.indexOf(ev.s);
          const L = ord[k - 1], R = ord[k + 1];
          [test(L, ev.s, ev.p), test(ev.s, R, ev.p)].forEach((p) => p && newP.push(p));
          msg = `Upper endpoint of <b>${segs[ev.s].name}</b> → insert into status; test with its neighbors ${[L, R].filter((x) => x != null).map((x) => segs[x].name).join(" and ") || "(none)"}`;
        } else if (ev.type === "lower") {
          const ordBefore = order(y + 1e-6); const k = ordBefore.indexOf(ev.s);
          const L = ordBefore[k - 1], R = ordBefore[k + 1];
          active = active.filter((x) => x !== ev.s);
          const p = test(L, R, ev.p); if (p) newP.push(p);
          msg = `Lower endpoint of <b>${segs[ev.s].name}</b> → delete it; its old neighbors ${L != null && R != null ? segs[L].name + " and " + segs[R].name + " become adjacent → test them" : "do not both exist"}`;
        } else {
          found.push(ev.p);
          const ord = order(y - 1e-6); const i1 = ord.indexOf(ev.s), i2 = ord.indexOf(ev.t);
          const lo = Math.min(i1, i2), hi = Math.max(i1, i2);
          [test(ord[lo - 1], ord[lo], ev.p), test(ord[hi], ord[hi + 1], ev.p)].forEach((p) => p && newP.push(p));
          msg = `<span class="hot">Intersection</span> of ${segs[ev.s].name} and ${segs[ev.t].name} → report it, <b>swap</b> them in the status, test the new outer neighbors`;
        }
        if (newP.length) msg += ` · <span class="ok">${newP.length} new intersection event${newP.length > 1 ? "s" : ""} added</span>`;
        frames.push({ y, ev, st: order(y - 1e-6).map((i) => segs[i].name), done: done.slice(), found: found.slice(), queue: Q.map((e) => e.p), newP, tests, msg });
      }
      frames[frames.length - 1].msg += ` &nbsp;·&nbsp; <b>Done: ${found.length} intersections with ${tests} pair tests</b> (brute force: ${n * (n - 1) / 2})`;
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      d.rect(0, f.y, W, H + 20, "fill:var(--accent-soft);opacity:.45");
      segs.forEach((s) => {
        d.line(s.a, s.b, `stroke:${f.st.includes(s.name) ? "var(--accent)" : "var(--muted)"};stroke-width:${f.st.includes(s.name) ? 4 : 2.5};stroke-linecap:round`);
        d.text(s.a, s.name, "fill:var(--muted)", 16, 6, -8);
      });
      f.queue.forEach((p) => d.dot(p, 5, "fill:var(--surface);stroke:var(--muted);stroke-width:2"));
      f.done.forEach((p) => d.dot(p, 5, "fill:var(--muted)"));
      f.found.forEach((p) => d.dot(p, 8, "fill:var(--hot)"));
      (f.newP || []).forEach((p) => d.dot(p, 12, "fill:none;stroke:var(--ok);stroke-width:3"));
      if (f.y <= H) {
        d.line({ x: 0, y: f.y }, { x: W, y: f.y }, "stroke:var(--hot);stroke-width:2.5");
        d.text({ x: W - 6, y: f.y }, "sweep line ℓ", "fill:var(--hot);text-anchor:end", 15, 0, -8);
      }
      if (f.ev) d.dot(f.ev.p, 11, "fill:none;stroke:var(--hot);stroke-width:4");
      status.replaceChildren(...(f.st.length ? f.st.map((nm) => h("div", { class: "cell act" }, nm)) : [h("span", { class: "tiny muted" }, "empty")]));
      stats.replaceChildren(stat("pair tests:", f.tests), stat("brute force:", n * (n - 1) / 2), stat("intersections found:", f.found.length), stat("events in queue:", f.queue.length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     5. kd-tree: construction and rectangular range query
     ======================================================= */
  register("kdtree", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "3", 10), n = parseInt(dd.n || "16", 10), P = [], root = null, R = null;
    const sv = mkSvg(W, H);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New points", () => { seed++; build(); }), btn("New query range", () => { R = randRect(); build(true); })), sv, stepper.bar, stepper.caption, stats);
    function randRect() { const r = rng(seed * 31 + Math.floor(Math.random() * 1000)); const w = 200 + r() * 220, hh = 120 + r() * 150; const x = 20 + r() * (W - w - 40), y = 20 + r() * (H - hh - 40); return { x0: x, x1: x + w, y0: y, y1: y + hh }; }
    function build(keepPts) {
      if (!keepPts) { P = randomPoints(n, W, H, seed, 26); R = R || { x0: 380, x1: 690, y0: 120, y1: 310 }; }
      const frames = []; const lines = [];
      function mk(pts, depth, box) {
        if (pts.length === 1) return { leaf: true, p: pts[0], box, depth };
        const vert = depth % 2 === 0; const key = vert ? "x" : "y";
        const s = pts.slice().sort((a, b) => a[key] - b[key]); const m = Math.ceil(s.length / 2) - 1;
        const val = (s[m][key] + s[m + 1][key]) / 2;
        const node = { leaf: false, vert, val, box, depth };
        lines.push({ vert, val, box, depth });
        frames.push({ phase: "build", lines: lines.slice(), box, msg: `Depth ${depth}: split ${s.length} points by a <b>${vert ? "vertical" : "horizontal"}</b> line at the median ${vert ? "x" : "y"}` });
        const b1 = Object.assign({}, box), b2 = Object.assign({}, box);
        if (vert) { b1.x1 = val; b2.x0 = val; } else { b1.y1 = val; b2.y0 = val; }
        node.left = mk(s.slice(0, m + 1), depth + 1, b1); node.right = mk(s.slice(m + 1), depth + 1, b2);
        return node;
      }
      root = mk(P, 0, { x0: 0, x1: W, y0: 0, y1: H });
      const allLines = lines.slice();
      frames.push({ phase: "build", lines: allLines, msg: `kd-tree ready: ${n} leaves, depth ${Math.ceil(Math.log2(n))}, O(n) storage, built in O(n log n).` });
      // query
      const inside = (p) => p.x >= R.x0 && p.x <= R.x1 && p.y >= R.y0 && p.y <= R.y1;
      const contained = (b) => b.x0 >= R.x0 && b.x1 <= R.x1 && b.y0 >= R.y0 && b.y1 <= R.y1;
      const disjoint = (b) => b.x1 < R.x0 || b.x0 > R.x1 || b.y1 < R.y0 || b.y0 > R.y1;
      const reported = [], pruned = [], whole = []; let visited = 0;
      const leaves = (nd) => nd.leaf ? [nd.p] : leaves(nd.left).concat(leaves(nd.right));
      const q = (o) => frames.push(Object.assign({ phase: "query", lines: allLines, reported: reported.slice(), pruned: pruned.slice(), whole: whole.slice(), visited }, o));
      q({ msg: "Query: report every point inside the orange rectangle." });
      function search(nd) {
        visited++;
        if (nd.leaf) { const ok = inside(nd.p); if (ok) reported.push(nd.p); q({ box: nd.box, msg: `Leaf: check the point → ${ok ? '<span class="ok">inside, report</span>' : "outside"}` }); return; }
        [nd.left, nd.right].forEach((c) => {
          if (contained(c.box)) { const ls = leaves(c); reported.push(...ls); whole.push(c.box); visited++; q({ box: c.box, msg: `Region fully inside the range → <span class="ok">report the whole subtree (${ls.length} points) without more tests</span>` }); }
          else if (disjoint(c.box)) { pruned.push(c.box); visited++; q({ box: c.box, msg: `Region disjoint from the range → <span class="bad">prune the subtree</span>` }); }
          else { q({ box: c.box, msg: `Region partially intersects the range → go down` }); search(c); }
        });
      }
      search(root);
      q({ done: true, msg: `Reported <b>${reported.length}</b> points visiting ${visited} nodes (tree has ${2 * n - 1}). Query time O(√n + k).` });
      stepper.set(frames, keepPts ? 0 : 0);
      if (keepPts) { let k = frames.findIndex((f) => f.phase === "query"); for (let i = 0; i < k; i++) stepper.step(1); }
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      if (f.phase === "query") {
        (f.pruned || []).forEach((b) => d.rect(b.x0, b.y0, b.x1, b.y1, "fill:var(--line);opacity:.6"));
        (f.whole || []).forEach((b) => d.rect(b.x0, b.y0, b.x1, b.y1, "fill:var(--ok-soft)"));
        d.rect(R.x0, R.y0, R.x1, R.y1, "fill:var(--hot-soft);fill-opacity:.5;stroke:var(--hot);stroke-width:3");
      }
      if (f.box) d.rect(f.box.x0, f.box.y0, f.box.x1, f.box.y1, "fill:var(--accent-soft);fill-opacity:.55;stroke:var(--accent);stroke-width:3");
      f.lines.forEach((l) => {
        const st = `stroke:${l.vert ? "var(--accent)" : "var(--hot)"};stroke-width:${Math.max(1.2, 3.5 - l.depth * 0.6)}`;
        if (l.vert) d.line({ x: l.val, y: l.box.y0 }, { x: l.val, y: l.box.y1 }, st); else d.line({ x: l.box.x0, y: l.val }, { x: l.box.x1, y: l.val }, st);
      });
      const rep = new Set(f.reported || []);
      P.forEach((p) => d.dot(p, rep.has(p) ? 9 : 6, `fill:${rep.has(p) ? "var(--ok)" : "var(--ink)"}`));
      stats.replaceChildren(stat("n =", n), f.phase === "query" ? stat("nodes visited:", f.visited) : stat("splitting lines:", f.lines.length), f.phase === "query" ? stat("reported:", (f.reported || []).length) : stat("√n ≈", Math.round(Math.sqrt(n))));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     6. Convex hull: Andrew / de Berg (upper + lower) and Jarvis march
     ======================================================= */
  register("hull", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "4", 10), n = parseInt(dd.n || "14", 10), algo = dd.algo || "andrew", P = [];
    const sv = mkSvg(W, H, "cursor:crosshair");
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const ab = [["andrew", "Sweep (upper + lower hull)"], ["jarvis", "Gift wrapping (Jarvis)"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...ab, btn("Random points", () => { seed++; P = randomPoints(n, W, H, seed, 40); build(); }), btn("Clear (click to add)", () => { P = []; build(); })), sv, stepper.bar, stepper.caption, stats);
    setOn(ab, ab.find((b) => b.dataset.k === algo));
    interact(sv, H, () => P, () => build(), { W, add: (w) => { if (P.length < 40) { P.push(w); build(); } } });
    function build() {
      const frames = []; let tests = 0;
      if (P.length < 3) { stepper.set([{ chain: [], msg: "Click to add at least 3 points." }]); stats.replaceChildren(); return; }
      if (algo === "andrew") {
        const s = P.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        frames.push({ chain: [], sorted: true, s, msg: "Sort the points by x-coordinate (left to right). O(n log n)" });
        const half = (pts, label) => {
          const L = [pts[0], pts[1]];
          frames.push({ chain: L.slice(), s, label, msg: `${label}: start with the two leftmost points` });
          for (let i = 2; i < pts.length; i++) {
            L.push(pts[i]);
            frames.push({ chain: L.slice(), s, label, add: pts[i], msg: `${label}: append p${i + 1}` });
            while (L.length > 2) {
              tests++;
              const [a, b, c] = L.slice(-3);
              if (orient(a, b, c) < 0) { frames.push({ chain: L.slice(), s, label, ok: [a, b, c], tests, msg: `Last three points make a <span class="ok">right turn</span> ✓ keep going` }); break; }
              frames.push({ chain: L.slice(), s, label, bad: [a, b, c], tests, msg: `Last three points make a <span class="bad">left turn</span> → delete the middle one` });
              L.splice(L.length - 2, 1);
            }
          }
          return L;
        };
        const up = half(s, "Upper hull");
        const low = half(s.slice().reverse(), "Lower hull");
        const hull = up.concat(low.slice(1, -1));
        frames.push({ chain: hull.concat([hull[0]]), final: true, s, tests, msg: `Upper + lower hull = CH(P): <b>${hull.length} vertices</b>, ${tests} orientation tests. O(n log n) total.` });
      } else {
        let start = P.reduce((a, b) => (b.x < a.x || (b.x === a.x && b.y < a.y) ? b : a));
        const hull = [start]; let cur = start;
        frames.push({ chain: hull.slice(), msg: "Start at the leftmost point — it is surely on the hull." });
        for (let guard = 0; guard < P.length + 1; guard++) {
          let cand = P[0] === cur ? P[1] : P[0];
          frames.push({ chain: hull.slice(), cand, msg: `From the current point, take any candidate…` });
          for (const q of P) {
            if (q === cur || q === cand) continue;
            tests++;
            const o = orient(cur, cand, q);
            if (o < 0 || (o === 0 && dist(cur, q) > dist(cur, cand))) { cand = q; frames.push({ chain: hull.slice(), cand, tests, msg: `A point lies to the <span class="hot">right</span> of the candidate edge → it becomes the new candidate` }); }
          }
          if (cand === start) break;
          hull.push(cand); cur = cand;
          frames.push({ chain: hull.slice(), tests, msg: `No point is to the right → edge confirmed. Hull has ${hull.length} vertices so far.` });
        }
        frames.push({ chain: hull.concat([start]), final: true, tests, msg: `Back at the start: <b>h = ${hull.length}</b> hull vertices, ${tests} orientation tests ≈ n·h. O(nh) — output-sensitive.` });
      }
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      if (f.final) d.poly(f.chain, "fill:var(--accent-soft);fill-opacity:.6;stroke:none");
      if (f.chain.length > 1) d.path(f.chain, `fill:none;stroke:${f.final ? "var(--accent)" : "var(--accent)"};stroke-width:4;stroke-linejoin:round`);
      if (f.cand) d.line(f.chain[f.chain.length - 1], f.cand, "stroke:var(--hot);stroke-width:3;stroke-dasharray:8 5");
      const tri = f.bad || f.ok;
      if (tri) d.poly(tri, `fill:${f.bad ? "var(--bad)" : "var(--ok)"};fill-opacity:.25;stroke:${f.bad ? "var(--bad)" : "var(--ok)"};stroke-width:2`);
      P.forEach((p) => d.dot(p, 7, "fill:var(--ink)"));
      if (f.bad) d.dot(f.bad[1], 12, "fill:none;stroke:var(--bad);stroke-width:4");
      if (f.add) d.dot(f.add, 11, "fill:none;stroke:var(--hot);stroke-width:4");
      if (f.cand) d.dot(f.cand, 11, "fill:none;stroke:var(--hot);stroke-width:4");
      if (f.sorted && f.s) f.s.forEach((p, i) => d.text(p, String(i + 1), "fill:var(--muted)", 13, 8, 16));
      stats.replaceChildren(stat("n =", P.length), stat("orientation tests:", f.tests || 0));
    }
    P = randomPoints(n, W, H, seed, 40);
    build();
    return { stepper };
  });

  /* =======================================================
     7. Point–line duality and line arrangements
     ======================================================= */
  register("duality", (host) => {
    const W = 440, H = 400, SC = 60; // world [-3.5,3.5] x [-3.3,3.3]
    const toS = (p) => ({ x: W / 2 + p.x * SC, y: H / 2 + p.y * SC }), toW = (s) => ({ x: (s.x - W / 2) / SC, y: (s.y - H / 2) / SC });
    let pts = [{ x: -2, y: -1 }, { x: 0, y: 0 }, { x: 1.5, y: 2 }];
    const colors = ["#3b5bdb", "#e8590c", "#2b8a3e", "#9c36b5", "#c2255c", "#1098ad", "#f08c00", "#5c940d"];
    const sv1 = mkSvg(W, H), sv2 = mkSvg(W, H);
    const out = h("div", { class: "w-caption", style: "font-size:0.58em" });
    host.append(h("div", { class: "w-toolbar" }, btn("Add point", () => { if (pts.length < 8) { pts.push({ x: Math.round((Math.random() * 5 - 2.5) * 2) / 2, y: Math.round((Math.random() * 5 - 2.5) * 2) / 2 }); draw(); } }),
      btn("Make 3 collinear", () => { pts = [{ x: -2, y: -1 }, { x: 0, y: 0 }, { x: 2, y: 1 }]; draw(); }), btn("Reset", () => { pts = [{ x: -2, y: -1 }, { x: 0, y: 0 }, { x: 1.5, y: 2 }]; draw(); })),
      h("div", { class: "cols", style: "gap:1em" }, h("div", {}, h("div", { class: "tiny muted center" }, "primal plane: points p = (a, b)"), sv1), h("div", {}, h("div", { class: "tiny muted center" }, "dual plane: lines p* : y = a·x − b"), sv2)), out);
    // drag in primal (world coords stored, snapped to 0.25)
    const proxy = { get list() { return pts.map((p) => { const s = toS(p); return { x: s.x, y: s.y }; }); } };
    let drag = -1;
    sv1.addEventListener("pointerdown", (e) => { const q = svgPoint(sv1, e), w = { x: q.x, y: H - q.y }; let best = -1, bd = 20; proxy.list.forEach((p, i) => { const dd = dist(p, w); if (dd < bd) { bd = dd; best = i; } }); if (best >= 0) { drag = best; sv1.setPointerCapture(e.pointerId); } });
    sv1.addEventListener("pointermove", (e) => { if (drag < 0) return; const q = svgPoint(sv1, e); const w = toW({ x: q.x, y: H - q.y }); pts[drag] = { x: Math.max(-3.25, Math.min(3.25, Math.round(w.x * 4) / 4)), y: Math.max(-3, Math.min(3, Math.round(w.y * 4) / 4)) }; draw(); });
    sv1.addEventListener("pointerup", () => { drag = -1; });
    function axes(sv) { const d = D(sv, H); for (let k = -3; k <= 3; k++) { d.line(toS({ x: k, y: -4 }), toS({ x: k, y: 4 }), "stroke:var(--line);stroke-width:1"); d.line(toS({ x: -4, y: k }), toS({ x: 4, y: k }), "stroke:var(--line);stroke-width:1"); } d.line(toS({ x: 0, y: -4 }), toS({ x: 0, y: 4 }), "stroke:var(--muted);stroke-width:1.5"); d.line(toS({ x: -4, y: 0 }), toS({ x: 4, y: 0 }), "stroke:var(--muted);stroke-width:1.5"); return d; }
    function draw() {
      sv1.replaceChildren(); sv2.replaceChildren();
      const d1 = axes(sv1), d2 = axes(sv2);
      // primal line through p1 and p2 (if not vertical) and its dual point
      const [p1, p2] = pts; let lineDual = null;
      if (Math.abs(p2.x - p1.x) > 1e-9) {
        const m = (p2.y - p1.y) / (p2.x - p1.x), b = p1.y - m * p1.x;
        d1.line(toS({ x: -4, y: m * -4 + b }), toS({ x: 4, y: m * 4 + b }), "stroke:var(--muted);stroke-width:2;stroke-dasharray:7 5");
        lineDual = { x: m, y: -b };
      }
      pts.forEach((p, i) => { d1.dot(toS(p), 9, `fill:${colors[i]}`); d1.text(toS(p), "p" + (i + 1), `fill:${colors[i]}`, 18, 10, -10); });
      pts.forEach((p, i) => d2.line(toS({ x: -4, y: p.x * -4 - p.y }), toS({ x: 4, y: p.x * 4 - p.y }), `stroke:${colors[i]};stroke-width:3`));
      // arrangement vertices
      const V = [];
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a1 = pts[i].x, b1 = pts[i].y, a2 = pts[j].x, b2 = pts[j].y; if (Math.abs(a1 - a2) < 1e-9) continue;
        const x = (b1 - b2) / (a1 - a2), y = a1 * x - b1;
        if (!V.some((v) => Math.abs(v.x - x) < 1e-6 && Math.abs(v.y - y) < 1e-6)) V.push({ x, y, lines: new Set([i, j]) }); else V.find((v) => Math.abs(v.x - x) < 1e-6 && Math.abs(v.y - y) < 1e-6).lines.add(i).add(j);
      }
      V.forEach((v) => { if (Math.abs(v.x) < 3.6 && Math.abs(v.y) < 3.4) d2.dot(toS(v), v.lines.size > 2 ? 10 : 5, v.lines.size > 2 ? "fill:var(--hot)" : "fill:var(--ink)"); });
      if (lineDual && Math.abs(lineDual.x) < 3.6 && Math.abs(lineDual.y) < 3.4) { d2.dot(toS(lineDual), 9, "fill:none;stroke:var(--muted);stroke-width:3"); d2.text(toS(lineDual), "ℓ*", "fill:var(--muted)", 17, 10, 18); }
      const n = pts.length; let E = 0;
      pts.forEach((_, i) => { E += V.filter((v) => v.lines.has(i)).length + 1; });
      const F = E - V.length + 1;
      const concurrent = V.find((v) => v.lines.size > 2);
      out.innerHTML = `p = (a, b) ↦ p* : y = ax − b &nbsp;·&nbsp; ℓ : y = mx + c ↦ ℓ* = (m, −c). The dashed line ℓ through p1, p2 becomes the point ℓ* where p1* and p2* meet.<br>` +
        (concurrent ? `<span class="hot">${concurrent.lines.size} collinear points ↦ ${concurrent.lines.size} lines through one point!</span> ` : "") +
        `Arrangement of ${n} lines: <b>${V.length}</b> vertices, <b>${E}</b> edges, <b>${F}</b> faces &nbsp;<span class="muted">(simple arrangement: ${n * (n - 1) / 2}, ${n * n}, ${n * (n + 1) / 2 + 1})</span>`;
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     Voronoi via half-plane clipping (O(n²) — fine for a classroom)
     ======================================================= */
  function clip(poly, a, b, nx, ny, c) { // keep points with nx*x+ny*y <= c
    const out = []; for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const fp = nx * p.x + ny * p.y - c, fq = nx * q.x + ny * q.y - c;
      if (fp <= 0) out.push(p);
      if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y), from: (p.from && p.from === q.from) ? p.from : null }); }
    }
    return out;
  }
  function voronoi(sites, box) {
    const big = 4000;
    return sites.map((s, i) => {
      let poly = [{ x: -big, y: -big }, { x: big, y: -big }, { x: big, y: big }, { x: -big, y: big }];
      const nb = new Set();
      sites.forEach((t, j) => {
        if (i === j) return;
        const nx = t.x - s.x, ny = t.y - s.y, c = (t.x * t.x + t.y * t.y - s.x * s.x - s.y * s.y) / 2;
        const before = poly.length; poly = clip(poly, s, t, nx, ny, c);
      });
      // neighbors: a site j is a neighbor if some cell edge lies on bisector(i, j)
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k], q = poly[(k + 1) % poly.length], m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        if (dist(p, q) < 1e-6) continue;
        const di = dist(m, s);
        sites.forEach((t, j) => { if (j !== i && Math.abs(dist(m, t) - di) < 1e-6 * Math.max(1, di)) nb.add(j); });
      }
      return { poly, nb };
    });
  }
  const hue = (i) => `hsl(${(i * 137.5) % 360} 70% 60%)`;

  /* =======================================================
     8. Voronoi diagram (interactive) + Delaunay dual + post office
     ======================================================= */
  register("voronoi", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "8", 10), sites = randomPoints(parseInt(dd.n || "9", 10), W, H, seed, 50);
    let showDel = dd.delaunay === "1", showCircles = false, hoverP = null;
    const sv = mkSvg(W, H, "cursor:crosshair;overflow:hidden");
    const info = h("div", { class: "w-caption" });
    const bD = btn("Delaunay (dual)", () => { showDel = !showDel; bD.classList.toggle("on", showDel); draw(); });
    const bC = btn("Empty circles at vertices", () => { showCircles = !showCircles; bC.classList.toggle("on", showCircles); draw(); });
    bD.classList.toggle("on", showDel);
    host.append(h("div", { class: "w-toolbar" }, btn("Random", () => { seed++; sites = randomPoints(sites.length, W, H, seed, 50); draw(); }), btn("Clear (click to add)", () => { sites = []; draw(); }), bD, bC), sv, info);
    interact(sv, H, () => sites, draw, { W, add: (w) => { if (sites.length < 40) { sites.push(w); draw(); } }, hover: (w) => { hoverP = w; draw(); } });
    function draw() {
      sv.replaceChildren(); const d = D(sv, H);
      const cells = sites.length ? voronoi(sites) : [];
      cells.forEach((c, i) => d.poly(c.poly, `fill:${hue(i)};fill-opacity:.18;stroke:var(--accent);stroke-width:2.5`));
      if (showDel) cells.forEach((c, i) => c.nb.forEach((j) => { if (j > i) d.line(sites[i], sites[j], "stroke:var(--hot);stroke-width:2.5"); }));
      let vcount = 0;
      if (showCircles || true) {
        const seen = [];
        cells.forEach((c, i) => c.poly.forEach((v) => {
          if (Math.abs(v.x) > 3000 || Math.abs(v.y) > 3000) return;
          if (seen.some((u) => dist(u, v) < 0.5)) return; seen.push(v);
        }));
        vcount = seen.length;
        if (showCircles) seen.forEach((v) => { let r = Math.min(...sites.map((s) => dist(s, v))); d.circle(v, r, "fill:none;stroke:var(--ok);stroke-width:1.8;stroke-dasharray:5 4"); d.dot(v, 5, "fill:var(--ok)"); });
      }
      if (hoverP && sites.length) {
        let bi = 0; sites.forEach((s, i) => { if (dist(s, hoverP) < dist(sites[bi], hoverP)) bi = i; });
        const r = dist(sites[bi], hoverP);
        d.circle(hoverP, r, "fill:none;stroke:var(--hot);stroke-width:2");
        d.line(hoverP, sites[bi], "stroke:var(--hot);stroke-width:3");
        d.dot(hoverP, 6, "fill:var(--hot)");
      }
      sites.forEach((s, i) => d.dot(s, 8, "fill:var(--ink)"));
      const n = sites.length, ne = cells.reduce((a, c) => a + c.nb.size, 0) / 2;
      info.innerHTML = n ? `n = <b>${n}</b> sites · <b>${vcount}</b> Voronoi vertices (≤ 2n − 5 = ${Math.max(0, 2 * n - 5)}) · <b>${ne}</b> edges (≤ 3n − 6 = ${Math.max(0, 3 * n - 6)}). <span class="muted">Move the mouse: the circle around the cursor is empty — the nearest site is your "post office". Click to add sites, drag to move them.</span>` : "Click to add sites.";
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     9. Fortune's algorithm — beach line animation
     ======================================================= */
  register("fortune", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "21", 10), sites = [];
    const sv = mkSvg(W, H, "overflow:hidden");
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New sites", () => { seed++; build(); })), sv, stepper.bar, stepper.caption, stats);
    let cells = [], verts = [];
    function build() {
      sites = randomPoints(parseInt(dd.n || "8", 10), W, H - 40, seed, 50).map((p) => ({ x: p.x, y: p.y + 40 }));
      cells = voronoi(sites);
      // Voronoi vertices with their circle-event sweep position (lowest point of the empty circle)
      verts = [];
      cells.forEach((c) => c.poly.forEach((v) => {
        if (Math.abs(v.x) > 3000 || Math.abs(v.y) > 3000) return;
        if (verts.some((u) => dist(u, v) < 0.5)) return;
        const r = Math.min(...sites.map((s) => dist(s, v))); verts.push({ x: v.x, y: v.y, r, ev: v.y - r });
      }));
      // sweep moves DOWN (from y = H to y = -something) in world coords (y up)
      const evs = sites.map((s, i) => ({ y: s.y, type: "site", i })).concat(verts.map((v, i) => ({ y: v.ev, type: "circle", i }))).filter((e) => e.y > -60).sort((a, b) => b.y - a.y);
      const frames = []; let k = 0; const step = 9; const nsites = (L) => sites.filter((s) => s.y > L).length;
      for (let L = H + 2; L > -60; L -= step) {
        while (k < evs.length && evs[k].y >= L - step && evs[k].y < L + 1e-9) { // event lies in (L-step, L]
          const e = evs[k++]; const Ly = e.y - 0.01;
          frames.push({ L: Ly, ev: e, msg: e.type === "site" ? `<b>Site event</b>: the sweep line reaches a new site → a new parabolic arc appears on the beach line` : `<b>Circle event</b>: the sweep line touches the bottom of an empty circle through 3 sites → an arc disappears and a <b>Voronoi vertex</b> is born`, sitesSeen: nsites(Ly) });
        }
        frames.push({ L, msg: "Points above the beach line are closer to a site than to the sweep line → that part of the diagram is final.", sitesSeen: nsites(L) });
      }
      frames.push({ L: -60, end: true, msg: `Sweep finished: n = ${sites.length} site events + ${verts.length} circle events → O(n log n) with a balanced tree + priority queue.`, sitesSeen: sites.length });
      stepper.set(frames);
    }
    function beach(L) {
      const pts = []; const above = sites.filter((s) => s.y > L + 0.5);
      for (let x = 0; x <= W; x += 4) {
        let y = -Infinity;
        above.forEach((s) => { const yy = ((x - s.x) ** 2 + s.y * s.y - L * L) / (2 * (s.y - L)); if (yy > y) y = yy; });
        pts.push({ x, y: Math.min(y, H + 400) });
      }
      return { pts, any: above.length > 0 };
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      const L = f.end ? -1e5 : f.L, b = f.end ? null : beach(L);
      // clip region: above the beach line (world y > beach)
      const cid = "fclip" + Math.random().toString(36).slice(2, 8);
      const defs = S("defs"); const cp = S("clipPath", { id: cid });
      if (f.end) cp.append(S("rect", { x: 0, y: 0, width: W, height: H }));
      else if (b.any) cp.append(S("polygon", { points: [{ x: 0, y: H + 500 }, ...b.pts, { x: W, y: H + 500 }].map((p) => p.x + "," + (H - Math.max(-500, p.y))).join(" ") }));
      defs.append(cp); sv.append(defs);
      const g = S("g", { "clip-path": `url(#${cid})` });
      cells.forEach((c, i) => g.append(S("polygon", { points: c.poly.map((p) => p.x + "," + (H - p.y)).join(" "), style: `fill:${hue(i)};fill-opacity:.2;stroke:var(--accent);stroke-width:2.5` })));
      sv.append(g);
      if (b && b.any) d.path(b.pts.filter((p) => p.y > -500), "fill:none;stroke:var(--ok);stroke-width:3.5");
      if (!f.end) { d.line({ x: 0, y: L }, { x: W, y: L }, "stroke:var(--hot);stroke-width:3"); d.text({ x: W - 8, y: L }, "sweep line", "fill:var(--hot);text-anchor:end", 15, 0, 18); }
      if (f.ev && f.ev.type === "circle") { const v = verts[f.ev.i]; d.circle(v, v.r, "fill:none;stroke:var(--hot);stroke-width:2.5;stroke-dasharray:6 4"); d.dot(v, 8, "fill:var(--hot)"); }
      sites.forEach((s) => d.dot(s, 7, `fill:${s.y > L ? "var(--ink)" : "var(--muted)"}`));
      if (f.ev && f.ev.type === "site") d.dot(sites[f.ev.i], 12, "fill:none;stroke:var(--hot);stroke-width:4");
      stats.replaceChildren(stat("sites passed:", f.sitesSeen), stat("Voronoi vertices (circle events):", verts.length), h("span", { class: "ok" }, "— beach line"));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     Triangulation utilities (Bowyer–Watson + flips)
     ======================================================= */
  function ccw(P, t) { return orient(P[t[0]], P[t[1]], P[t[2]]) > 0 ? t : [t[0], t[2], t[1]]; }
  function bowyerWatson(P, order, onStep) {
    // P: points; super-triangle vertices appended at the end
    const n = P.length, M = 20000;
    const Q = P.concat([{ x: -M, y: -M }, { x: M, y: -M }, { x: 0, y: M }]);
    let T = [[n, n + 1, n + 2]];
    (order || P.map((_, i) => i)).forEach((pi, step) => {
      const p = Q[pi];
      const bad = T.filter((t) => inCircle(Q[t[0]], Q[t[1]], Q[t[2]], p) > 0);
      const edges = new Map();
      bad.forEach((t) => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(([a, b]) => { const k = Math.min(a, b) + "," + Math.max(a, b); edges.set(k, edges.has(k) ? null : [a, b]); }));
      const keep = T.filter((t) => !bad.includes(t));
      const created = [];
      edges.forEach((e) => { if (e) { const t = ccw(Q, [e[0], e[1], pi]); created.push(t); } });
      T = keep.concat(created);
      if (onStep) onStep({ p: pi, bad, created, T: T.slice(), Q, step });
    });
    return { T, Q, n };
  }
  const realTris = (T, n) => T.filter((t) => t[0] < n && t[1] < n && t[2] < n);
  function minAngle(P, T) {
    let m = 180;
    T.forEach((t) => { for (let k = 0; k < 3; k++) { const a = P[t[k]], b = P[t[(k + 1) % 3]], c = P[t[(k + 2) % 3]]; const v1 = { x: b.x - a.x, y: b.y - a.y }, v2 = { x: c.x - a.x, y: c.y - a.y }; const ang = Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))))) * 180 / Math.PI; m = Math.min(m, ang); } });
    return m;
  }
  function edgeMap(T) { const m = new Map(); T.forEach((t, ti) => [[t[0], t[1], t[2]], [t[1], t[2], t[0]], [t[2], t[0], t[1]]].forEach(([a, b, c]) => { const k = Math.min(a, b) + "," + Math.max(a, b); if (!m.has(k)) m.set(k, []); m.get(k).push({ ti, opp: c, a, b }); })); return m; }
  function illegalEdges(P, T) {
    const out = []; edgeMap(T).forEach((v, k) => { if (v.length !== 2) return; const [x, y] = v; const t = T[x.ti]; if (inCircle(P[t[0]], P[t[1]], P[t[2]], P[y.opp]) > 1e-6) out.push({ k, x, y }); }); return out;
  }
  function flip(P, T, e) { const a = e.x.a, b = e.x.b, c = e.x.opp, d = e.y.opp; const keep = T.filter((_, i) => i !== e.x.ti && i !== e.y.ti); return keep.concat([ccw(P, [c, d, a]), ccw(P, [c, d, b])]); }
  function convexQuad(P, e) { const a = P[e.x.a], b = P[e.x.b], c = P[e.x.opp], d = P[e.y.opp]; return orient(c, d, a) * orient(c, d, b) < 0; }

  /* =======================================================
     10. Edge flips (Lawson) → Delaunay
     ======================================================= */
  register("flips", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "13", 10), P = [];
    const sv = mkSvg(W, H);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New points", () => { seed++; build(); })), sv, stepper.bar, stepper.caption, stats);
    function build() {
      P = randomPoints(parseInt(dd.n || "12", 10), W, H, seed, 40);
      let T = realTris(bowyerWatson(P).T, P.length);
      // scramble: random legal flips of convex quads -> a "bad" triangulation
      const r = rng(seed * 7);
      for (let k = 0; k < 60; k++) {
        const es = []; edgeMap(T).forEach((v, key) => { if (v.length === 2) es.push({ k: key, x: v[0], y: v[1] }); });
        const e = es[Math.floor(r() * es.length)]; if (e && convexQuad(P, e)) T = flip(P, T, e);
      }
      const frames = [];
      frames.push({ T: T.slice(), ill: illegalEdges(P, T), msg: `Some triangulation of P. Red edges are <b>illegal</b>: the circle of one triangle contains the opposite vertex.` });
      for (let guard = 0; guard < 200; guard++) {
        const ill = illegalEdges(P, T); if (!ill.length) break;
        const e = ill[0];
        frames.push({ T: T.slice(), ill, cur: e, msg: `Edge ${e.k.replace(",", "–")} is illegal: the opposite vertex lies <span class="bad">inside</span> the circumcircle` });
        T = flip(P, T, e);
        frames.push({ T: T.slice(), ill: illegalEdges(P, T), flipped: [e.x.opp, e.y.opp], msg: `<b>Flip</b> it: the new edge is legal and the smallest angle of the quadrilateral can only grow` });
      }
      frames.push({ T: T.slice(), ill: [], done: true, msg: `No illegal edges left → this is <b>the Delaunay triangulation</b>. ${T.length} triangles = 2n − 2 − k (k = hull vertices).` });
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      const illK = new Set(f.ill.map((e) => e.k));
      if (f.cur) { const t = f.T[f.cur.x.ti]; const c = circumcircle(P[t[0]], P[t[1]], P[t[2]]); d.poly(t.map((i) => P[i]), "fill:var(--hot-soft);opacity:.9"); if (c) d.circle(c, c.r, "fill:none;stroke:var(--hot);stroke-width:2.5;stroke-dasharray:7 5"); d.dot(P[f.cur.y.opp], 12, "fill:none;stroke:var(--bad);stroke-width:4"); }
      edgeMap(f.T).forEach((v, k) => { const [a, b] = k.split(",").map(Number); const isF = f.flipped && ((a === f.flipped[0] && b === f.flipped[1]) || (a === f.flipped[1] && b === f.flipped[0])); d.line(P[a], P[b], `stroke:${isF ? "var(--ok)" : illK.has(k) ? "var(--bad)" : "var(--accent)"};stroke-width:${isF || illK.has(k) ? 4 : 2.2}`); });
      P.forEach((p) => d.dot(p, 6, "fill:var(--ink)"));
      stats.replaceChildren(stat("illegal edges:", f.ill.length), stat("smallest angle:", minAngle(P, f.T).toFixed(1) + "°"), stat("triangles:", f.T.length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     11. Randomized incremental Delaunay construction
     ======================================================= */
  register("ric", (host, dd) => {
    const W = 900, H = 400;
    let seed = parseInt(dd.seed || "17", 10), P = [];
    const sv = mkSvg(W, H, "overflow:hidden");
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    host.append(h("div", { class: "w-toolbar" }, btn("New random order", () => { seed++; build(); })), sv, stepper.bar, stepper.caption, stats);
    let Q = [], n = 0;
    function build() {
      P = randomPoints(parseInt(dd.n || "14", 10), W, H, 99, 40); n = P.length;
      const r = rng(seed); const order = P.map((_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const frames = []; let total = 0;
      const res = bowyerWatson(P, order, (s) => {
        total += s.created.length;
        frames.push({ phase: "locate", s, ins: order.slice(0, s.step), total, msg: `Insert point #${s.step + 1} (random order). The ${s.bad.length} triangle${s.bad.length > 1 ? "s" : ""} whose circumcircle contains it ${s.bad.length > 1 ? "are" : "is"} no longer Delaunay…` });
        frames.push({ phase: "done", s, ins: order.slice(0, s.step + 1), total, msg: `…replace them by ${s.created.length} new triangles around the point (same result as split + edge flips). Average so far: ${(total / (s.step + 1)).toFixed(1)} per insertion.` });
      });
      Q = res.Q;
      frames.push({ phase: "final", s: { T: res.T, created: [], bad: [] }, ins: order, total, msg: `Remove the 3 artificial outer points: Delaunay triangulation of ${n} points. ${total} triangles created in total — expected O(n) (≤ 9n + 1), expected time O(n log n).` });
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      const s = f.s, T = f.phase === "locate" ? s.T.filter((t) => !s.created.includes(t)).concat(s.bad) : s.T;
      const fake = (t) => t.some((i) => i >= n);
      if (f.phase === "locate") s.bad.forEach((t) => { const c = circumcircle(Q[t[0]], Q[t[1]], Q[t[2]]); if (!fake(t)) d.poly(t.map((i) => Q[i]), "fill:var(--bad-soft)"); if (c && c.r < 2000) d.circle(c, c.r, "fill:none;stroke:var(--bad);stroke-width:1.5;stroke-dasharray:5 4"); });
      if (f.phase === "done") s.created.forEach((t) => { if (!fake(t)) d.poly(t.map((i) => Q[i]), "fill:var(--ok-soft)"); });
      T.forEach((t) => { if (f.phase === "final" && fake(t)) return; [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const u = t[a], v = t[b]; const outer = u >= n || v >= n; d.line(Q[u], Q[v], outer ? "stroke:var(--muted);stroke-width:1;stroke-dasharray:3 5" : "stroke:var(--accent);stroke-width:2.2"); }); });
      const ins = new Set(f.ins);
      P.forEach((p, i) => d.dot(p, ins.has(i) ? 6 : 4, `fill:${ins.has(i) ? "var(--ink)" : "var(--line)"}`));
      if (s.p != null) d.dot(Q[s.p], 11, "fill:var(--hot)");
      stats.replaceChildren(stat("inserted:", f.ins.length + " / " + n), stat("triangles created so far:", f.total), stat("9n + 1 =", 9 * n + 1));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     12. Monte Carlo estimation (π or ∫₀¹ x³ dx)
     ======================================================= */
  register("montecarlo", (host, dd) => {
    let mode = dd.mode || "pi", N = 0, hits = 0, hist = [], darts = [];
    const S0 = 340;
    const sv = mkSvg(S0, S0);
    const cv = h("canvas", { width: 600, height: 340 });
    const out = h("div", { class: "w-caption" });
    const bm = [["pi", "Estimate π"], ["int", "∫₀¹ x³ dx"]].map(([k, nm]) => { const b = btn(nm, () => { mode = k; setOn(bm, b); reset(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...bm, btn("+10", () => add(10)), btn("+100", () => add(100)), btn("+1,000", () => add(1000)), btn("+10,000", () => add(10000)), btn("Reset", reset)),
      h("div", { style: "display:grid;grid-template-columns:340px 1fr;gap:1em;align-items:center" }, sv, cv), out);
    setOn(bm, bm.find((b) => b.dataset.k === mode));
    const f = (x) => x * x * x;
    const inside = (x, y) => mode === "pi" ? x * x + y * y <= 1 : y <= f(x);
    const truth = () => mode === "pi" ? Math.PI : 0.25;
    const est = () => mode === "pi" ? 4 * hits / N : hits / N;
    function add(k) { for (let i = 0; i < k; i++) { const x = Math.random(), y = Math.random(); const ok = inside(x, y); N++; if (ok) hits++; if (darts.length < 3000) darts.push([x, y, ok]); } hist.push([N, est()]); draw(); }
    function reset() { N = 0; hits = 0; hist = []; darts = []; draw(); }
    function draw() {
      sv.replaceChildren();
      sv.append(S("rect", { x: 0, y: 0, width: S0, height: S0, style: "fill:var(--surface);stroke:var(--ink);stroke-width:2" }));
      if (mode === "pi") sv.append(S("path", { d: `M0,${S0} L0,0 A${S0},${S0} 0 0 1 ${S0},${S0} Z`, style: "fill:var(--accent-soft);stroke:var(--accent);stroke-width:2" }));
      else { const pts = []; for (let i = 0; i <= 60; i++) { const x = i / 60; pts.push(`${x * S0},${S0 - f(x) * S0}`); } sv.append(S("polygon", { points: `0,${S0} ${pts.join(" ")} ${S0},${S0}`, style: "fill:var(--accent-soft);stroke:var(--accent);stroke-width:2" })); }
      darts.forEach(([x, y, ok]) => sv.append(S("circle", { cx: x * S0, cy: S0 - y * S0, r: 2.2, style: `fill:${ok ? "var(--ok)" : "var(--bad)"}` })));
      const g = cv.getContext("2d"), Wc = cv.width, Hc = cv.height; g.clearRect(0, 0, Wc, Hc);
      const t = truth(), lo = t * 0.7, hi = t * 1.3, Y = (v) => Hc - 30 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (Hc - 50);
      const maxN = Math.max(10, N), X = (k) => 60 + Math.log10(k) / Math.log10(maxN) * (Wc - 80);
      g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ok"); g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(60, Y(t)); g.lineTo(Wc - 20, Y(t)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent"); g.lineWidth = 3; g.beginPath(); hist.forEach(([k, v], i) => (i ? g.lineTo(X(k), Y(v)) : g.moveTo(X(k), Y(v)))); g.stroke();
      g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted"); g.font = "18px JetBrains Mono, monospace";
      g.fillText("estimate vs N (log scale)", 64, 22); g.fillText((mode === "pi" ? "π" : "0.25"), 10, Y(t) + 6);
      out.innerHTML = N ? `N = <b>${N.toLocaleString()}</b> darts · hits = ${hits.toLocaleString()} · estimate = <b>${est().toFixed(4)}</b> (true ${t.toFixed(4)}) · error ≈ ${Math.abs(est() - t).toFixed(4)} <span class="muted">— error shrinks like 1/√N: 100× more darts → 10× more precise</span>` : "Throw darts uniformly at the unit square. Fraction inside the shaded region ≈ its area.";
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     13. Karger's randomized min-cut
     ======================================================= */
  register("karger", (host) => {
    const W = 900, H = 340;
    const V = [{ x: 120, y: 90 }, { x: 260, y: 60 }, { x: 110, y: 250 }, { x: 270, y: 280 }, { x: 630, y: 70 }, { x: 790, y: 100 }, { x: 640, y: 270 }, { x: 780, y: 260 }];
    const E = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [4, 5], [4, 6], [4, 7], [5, 6], [5, 7], [6, 7], [1, 4], [3, 6]];
    const sv = mkSvg(W, H);
    const out = h("div", { class: "w-caption" });
    const stepper = Stepper(draw);
    let runs = 0, wins = 0;
    host.append(h("div", { class: "w-toolbar" }, btn("New random trial", trial), btn("Run 1,000 trials", () => { for (let i = 0; i < 1000; i++) { runs++; if (contract().cut === 2) wins++; } trialStats(); }), btn("Reset stats", () => { runs = 0; wins = 0; trialStats(); })), sv, stepper.bar, stepper.caption, out);
    function contract(record) {
      const par = V.map((_, i) => i); const f = (x) => (par[x] === x ? x : (par[x] = f(par[x])));
      let groups = V.length; const frames = [];
      const live = () => E.filter(([a, b]) => f(a) !== f(b));
      if (record) frames.push({ par: par.slice(), live: live(), msg: `8 vertices, 14 edges. Minimum cut = 2 (the two bridges). Pick a random edge and contract it…` });
      while (groups > 2) {
        const L = live(); const [a, b] = L[Math.floor(Math.random() * L.length)];
        const ra = f(a), rb = f(b); par[rb] = ra; groups--;
        const parSnap = V.map((_, i) => f(i));
        if (record) frames.push({ par: parSnap, live: live(), pick: [a, b], msg: `Contract random edge (${a + 1}, ${b + 1}) → ${groups} super-vertices, ${live().length} edges between them` });
      }
      const cut = live().length;
      if (record) frames.push({ par: V.map((_, i) => f(i)), live: live(), msg: cut === 2 ? `<span class="ok">Two super-vertices left: cut of size ${cut} — the minimum cut!</span>` : `<span class="bad">Two super-vertices left: cut of size ${cut} — not minimum.</span> Repeat the experiment.`, cut });
      return { cut, frames };
    }
    function trial() { const r = contract(true); runs++; if (r.cut === 2) wins++; stepper.set(r.frames); trialStats(); }
    function trialStats() { out.innerHTML = runs ? `Trials: <b>${runs}</b> · found the min cut: <b>${wins}</b> (${(100 * wins / runs).toFixed(1)}%) · guaranteed lower bound 2/(n(n−1)) = ${(200 / 56).toFixed(1)}% · with T independent trials, failure ≤ (1 − 2/n²)<sup>T</sup>` : "Run trials to estimate the success probability."; }
    function draw(f) {
      sv.replaceChildren(); const d = D(sv, H);
      const liveSet = new Set(f.live.map((e) => e.join(",")));
      E.forEach(([a, b]) => { const live = liveSet.has(a + "," + b); const isPick = f.pick && f.pick[0] === a && f.pick[1] === b; d.line({ x: V[a].x, y: H - V[a].y }, { x: V[b].x, y: H - V[b].y }, `stroke:${isPick ? "var(--hot)" : live ? "var(--ink)" : "var(--line)"};stroke-width:${isPick ? 6 : live ? 3 : 2}`); });
      const roots = [...new Set(f.par)].sort((a, b) => a - b), pal = ["#4c6ef5", "#f76707", "#37b24d", "#ae3ec9", "#f03e3e", "#1098ad", "#fab005", "#868e96"];
      V.forEach((v, i) => { const g = roots.indexOf(f.par[i]); d.dot({ x: v.x, y: H - v.y }, 22, `fill:${pal[g % 8]};stroke:var(--ink);stroke-width:2`); d.text({ x: v.x, y: H - v.y }, String(i + 1), "text-anchor:middle", 18, 0, 6); });
    }
    trial();
    return { stepper };
  });
})();

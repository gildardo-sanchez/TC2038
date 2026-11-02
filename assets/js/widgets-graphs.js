/* =========================================================
   TC2038 · Unit 3 — Graph algorithm widgets
   Requires widgets.js (window.Widgets) to be loaded first.
   ========================================================= */
(function () {
  "use strict";
  const { register, h, S, Stepper } = window.Widgets;
  const btn = (label, fn, title) => h("button", { type: "button", title: title || null, onclick: fn }, label);
  const setOn = (group, active) => group.forEach((b) => b.classList.toggle("on", b === active));
  const stat = (label, value) => h("span", {}, label + " ", h("b", {}, String(value)));
  const INF = Infinity, fmt = (v) => (v === INF ? "∞" : String(v));
  function mkSvg(w, hh) { const s = S("svg", { viewBox: `0 0 ${w} ${hh}`, preserveAspectRatio: "xMidYMid meet" }); s.style.overflow = "hidden"; return s; }
  let markerSeq = 0;

  /* -------- generic graph renderer --------
     G = { nodes: {id: {x, y, label?}}, edges: [{u, v, w?, dir?}] }
     st = { node(id) -> {fill, stroke, text, sub}, edge(e, i) -> {color, width, dash, label, hidden} } */
  function drawGraph(sv, G, st, opts) {
    opts = opts || {}; sv.replaceChildren();
    const R = opts.r || 22, mid = "arw" + (++markerSeq);
    const defs = S("defs");
    ["ink", "accent", "hot", "ok", "bad", "muted", "line"].forEach((c) => { const m = S("marker", { id: mid + c, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }); m.append(S("path", { d: "M0,0 L10,5 L0,10 z", style: `fill:var(--${c})` })); defs.append(m); });
    sv.append(defs);
    const has = new Set(G.edges.map((e) => e.u + ">" + e.v));
    G.edges.forEach((e, i) => {
      const s = (st.edge && st.edge(e, i)) || {}; if (s.hidden) return;
      const a = G.nodes[e.u], b = G.nodes[e.v]; const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const bend = e.dir && has.has(e.v + ">" + e.u) ? 26 : (e.bend || 0);
      const nx = -dy / L, ny = dx / L;
      const cx = (a.x + b.x) / 2 + nx * bend, cy = (a.y + b.y) / 2 + ny * bend;
      // shorten to node borders
      const t0x = cx - a.x, t0y = cy - a.y, l0 = Math.hypot(t0x, t0y) || 1, t1x = cx - b.x, t1y = cy - b.y, l1 = Math.hypot(t1x, t1y) || 1;
      const p0 = { x: a.x + t0x / l0 * R, y: a.y + t0y / l0 * R }, p1 = { x: b.x + t1x / l1 * (R + (e.dir ? 3 : 0)), y: b.y + t1y / l1 * (R + (e.dir ? 3 : 0)) };
      const col = s.color || "line";
      sv.append(S("path", { d: `M${p0.x},${p0.y} Q${cx},${cy} ${p1.x},${p1.y}`, style: `fill:none;stroke:var(--${col});stroke-width:${s.width || 2.5};${s.dash ? "stroke-dasharray:7 5;" : ""}`, "marker-end": e.dir ? `url(#${mid}${col})` : null }));
      const lab = s.label != null ? s.label : e.w;
      if (lab != null && lab !== "") {
        const lx = (a.x + b.x) / 4 + cx / 2, ly = (a.y + b.y) / 4 + cy / 2;
        sv.append(S("rect", { x: lx - 15 - (String(lab).length > 3 ? 8 : 0), y: ly - 12, width: 30 + (String(lab).length > 3 ? 16 : 0), height: 22, rx: 6, style: "fill:var(--bg);opacity:.92" }));
        sv.append(S("text", { x: lx, y: ly + 5, "text-anchor": "middle", "font-size": 15, class: "mono", "font-weight": 700, style: `fill:var(--${s.labelColor || (col === "line" ? "muted" : col)})` }, String(lab)));
      }
    });
    Object.entries(G.nodes).forEach(([id, n]) => {
      const s = (st.node && st.node(id)) || {};
      sv.append(S("circle", { cx: n.x, cy: n.y, r: R, style: `fill:${s.fill || "var(--surface)"};stroke:${s.stroke || "var(--ink)"};stroke-width:${s.sw || 2.5}` }));
      sv.append(S("text", { x: n.x, y: n.y + 6, "text-anchor": "middle", "font-size": (n.label || id).length > 3 ? 12 : (n.label || id).length > 2 ? 14 : 17, "font-weight": 700, style: s.textColor ? `fill:${s.textColor}` : "" }, n.label || id));
      if (s.sub != null) sv.append(S("text", { x: n.x, y: n.y - R - 7, "text-anchor": "middle", "font-size": 15, class: "mono", "font-weight": 700, style: `fill:${s.subColor || "var(--hot)"}` }, String(s.sub)));
    });
  }
  const chips = (arr, cls) => (arr.length ? arr.map((x) => h("div", { class: "cell " + (cls || "") }, String(x))) : [h("span", { class: "tiny muted" }, "empty")]);

  /* =======================================================
     Sample graphs (mostly from CLRS)
     ======================================================= */
  const MSTG = { nodes: { a: { x: 70, y: 170 }, b: { x: 230, y: 60 }, c: { x: 430, y: 60 }, d: { x: 630, y: 60 }, e: { x: 800, y: 170 }, f: { x: 630, y: 280 }, g: { x: 430, y: 280 }, h: { x: 230, y: 280 }, i: { x: 340, y: 170 } },
    edges: [["a", "b", 4], ["a", "h", 8], ["b", "c", 8], ["b", "h", 11], ["c", "d", 7], ["c", "f", 4], ["c", "i", 2], ["d", "e", 9], ["d", "f", 14], ["e", "f", 10], ["f", "g", 2], ["g", "h", 1], ["g", "i", 6], ["h", "i", 7]].map(([u, v, w]) => ({ u, v, w })) };
  const DIJ = { nodes: { s: { x: 70, y: 170 }, t: { x: 320, y: 60 }, x: { x: 600, y: 60 }, y: { x: 320, y: 280 }, z: { x: 600, y: 280 } },
    edges: [["s", "t", 10], ["s", "y", 5], ["t", "x", 1], ["t", "y", 2], ["y", "t", 3], ["y", "x", 9], ["y", "z", 2], ["x", "z", 4], ["z", "x", 6], ["z", "s", 7]].map(([u, v, w]) => ({ u, v, w, dir: true })) };
  const NEG = { nodes: { a: { x: 120, y: 170 }, b: { x: 420, y: 60 }, c: { x: 420, y: 280 }, d: { x: 700, y: 60 } },
    edges: [["a", "b", 2], ["a", "c", 5], ["c", "b", -4], ["b", "d", 3]].map(([u, v, w]) => ({ u, v, w, dir: true })) };
  const BFSG = { nodes: { r: { x: 80, y: 80 }, s: { x: 250, y: 80 }, t: { x: 420, y: 80 }, u: { x: 590, y: 80 }, v: { x: 80, y: 260 }, w: { x: 250, y: 260 }, x: { x: 420, y: 260 }, y: { x: 590, y: 260 } },
    edges: [["r", "s"], ["r", "v"], ["s", "w"], ["w", "t"], ["w", "x"], ["t", "x"], ["t", "u"], ["x", "u"], ["x", "y"], ["u", "y"]].map(([u, v]) => ({ u, v })) };
  const DAG = { nodes: { undershorts: { x: 90, y: 80, label: "und" }, pants: { x: 300, y: 40, label: "pants" }, shoes: { x: 540, y: 90, label: "shoes" }, socks: { x: 300, y: 160, label: "socks" }, shirt: { x: 90, y: 280, label: "shirt" }, tie: { x: 300, y: 300, label: "tie" }, belt: { x: 540, y: 220, label: "belt" }, jacket: { x: 760, y: 270, label: "jacket" }, watch: { x: 760, y: 80, label: "watch" } },
    edges: [["undershorts", "pants"], ["undershorts", "shoes"], ["pants", "belt"], ["pants", "shoes"], ["belt", "jacket"], ["shirt", "belt"], ["shirt", "tie"], ["tie", "jacket"], ["socks", "shoes"]].map(([u, v]) => ({ u, v, dir: true })) };

  /* =======================================================
     1. Representations: adjacency matrix & lists
     ======================================================= */
  register("graphrep", (host, d) => {
    let directed = d.directed === "1", sel = null;
    const W = 520, H = 330;
    const base = { nodes: { 1: { x: 90, y: 80 }, 2: { x: 270, y: 60 }, 3: { x: 430, y: 150 }, 4: { x: 300, y: 270 }, 5: { x: 110, y: 250 } }, edges: [[1, 2], [1, 5], [2, 3], [2, 4], [2, 5], [3, 4], [4, 5]].map(([u, v]) => ({ u: String(u), v: String(v) })) };
    const sv = mkSvg(W, H), side = h("div", { style: "font-size:0.6em" });
    const bD = btn("Directed", () => { directed = !directed; bD.classList.toggle("on", directed); draw(); });
    host.append(h("div", { class: "w-toolbar" }, bD, h("span", { class: "tiny muted" }, "click a vertex")), h("div", { class: "cols", style: "grid-template-columns:1fr 1fr;gap:1em;align-items:center" }, sv, side));
    sv.addEventListener("click", (e) => { const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(sv.getScreenCTM().inverse()); sel = null; Object.entries(base.nodes).forEach(([id, n]) => { if (Math.hypot(n.x - q.x, n.y - q.y) < 26) sel = id; }); draw(); });
    function draw() {
      const G = { nodes: base.nodes, edges: base.edges.map((e) => ({ ...e, dir: directed })) };
      const ids = Object.keys(base.nodes), adj = {}; ids.forEach((i) => (adj[i] = []));
      G.edges.forEach((e) => { adj[e.u].push(e.v); if (!directed) adj[e.v].push(e.u); }); ids.forEach((i) => adj[i].sort());
      drawGraph(sv, G, { node: (id) => (id === sel ? { fill: "var(--accent)", textColor: "#fff" } : sel && adj[sel].includes(id) ? { fill: "var(--accent-soft)", stroke: "var(--accent)" } : {}), edge: (e) => (sel && (e.u === sel || (!directed && e.v === sel)) ? { color: "accent", width: 4 } : {}) });
      const m = h("table", { class: "tight", style: "margin:0;font-family:var(--mono)" }, h("tr", {}, h("th", {}, ""), ...ids.map((j) => h("th", {}, j))),
        ...ids.map((i) => h("tr", { style: i === sel ? "background:var(--accent-soft)" : "" }, h("th", {}, i), ...ids.map((j) => h("td", { style: "text-align:center" }, adj[i].includes(j) ? "1" : "0")))));
      const lists = h("div", { class: "mono", style: "margin-top:.5em" }, ...ids.map((i) => h("div", { style: i === sel ? "color:var(--accent);font-weight:700" : "" }, `${i} → ${adj[i].join(" → ") || "∅"}`)));
      side.replaceChildren(h("b", {}, "Adjacency matrix  Θ(V²) space"), m, h("b", {}, "Adjacency lists  Θ(V + E) space"), lists);
    }
    draw();
  });

  /* =======================================================
     2. BFS / DFS / topological sort
     ======================================================= */
  register("traverse", (host, d) => {
    let mode = d.mode || "bfs";
    const sv = mkSvg(860, 330), info = h("div", { class: "cells", style: "align-items:center;min-height:2.2em" }), stepper = Stepper(draw);
    const mb = [["bfs", "BFS (from s)"], ["dfs", "DFS (from s)"], ["topo", "Topological sort (DAG)"]].map(([k, nm]) => { const b = btn(nm, () => { mode = k; setOn(mb, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...mb), sv, h("div", { class: "w-toolbar" }, h("label", {}, "structure:"), info), stepper.bar, stepper.caption);
    setOn(mb, mb.find((b) => b.dataset.k === mode));
    let G = BFSG;
    function build() {
      const frames = [];
      if (mode === "bfs") {
        G = BFSG; const adj = {}; Object.keys(G.nodes).forEach((v) => (adj[v] = [])); G.edges.forEach((e) => { adj[e.u].push(e.v); adj[e.v].push(e.u); }); Object.values(adj).forEach((a) => a.sort());
        const dist = { s: 0 }, par = {}, Q = ["s"], done = new Set();
        frames.push({ dist: { ...dist }, par: { ...par }, Q: Q.slice(), done: [], msg: "Discover s (distance 0) and put it in the FIFO queue." });
        while (Q.length) { const u = Q.shift(); const nw = []; adj[u].forEach((v) => { if (dist[v] == null) { dist[v] = dist[u] + 1; par[v] = u; Q.push(v); nw.push(v); } }); done.add(u);
          frames.push({ cur: u, dist: { ...dist }, par: { ...par }, Q: Q.slice(), done: [...done], msg: `Dequeue ${u}: discover ${nw.join(", ") || "nothing new"} at distance ${dist[u] + 1}` }); }
        frames.push({ dist, par, Q: [], done: [...done], msg: "BFS tree (blue) = shortest paths in number of edges. Time Θ(V + E)." });
      } else {
        G = mode === "topo" ? DAG : BFSG;
        const adj = {}; Object.keys(G.nodes).forEach((v) => (adj[v] = [])); G.edges.forEach((e) => { adj[e.u].push(e.v); if (mode !== "topo") adj[e.v].push(e.u); }); Object.values(adj).forEach((a) => a.sort());
        const disc = {}, fin = {}, par = {}; let time = 0; const order = []; const stack = [];
        const visit = (u) => { disc[u] = ++time; stack.push(u); frames.push({ cur: u, disc: { ...disc }, fin: { ...fin }, par: { ...par }, stack: stack.slice(), order: order.slice(), msg: `Discover ${G.nodes[u].label || u} at time ${time}` });
          adj[u].forEach((v) => { if (disc[v] == null) { par[v] = u; visit(v); } }); fin[u] = ++time; stack.pop(); order.unshift(G.nodes[u].label || u);
          frames.push({ cur: u, disc: { ...disc }, fin: { ...fin }, par: { ...par }, stack: stack.slice(), order: order.slice(), msg: `Finish ${G.nodes[u].label || u} at time ${time}${mode === "topo" ? " → put it at the FRONT of the list" : ""}` }); };
        const roots = mode === "topo" ? Object.keys(G.nodes) : ["s"];
        roots.forEach((r) => { if (disc[r] == null) visit(r); });
        frames.push({ disc, fin, par, stack: [], order, msg: mode === "topo" ? `Decreasing finishing times = a <b>topological order</b>: every edge goes left → right. Θ(V + E).` : "DFS tree (blue). Discovery/finish times nest like parentheses." });
      }
      stepper.set(frames);
    }
    function draw(f) {
      const tree = (e) => (f.par && (f.par[e.v] === e.u || f.par[e.u] === e.v));
      drawGraph(sv, G, {
        node: (id) => { const seen = mode === "bfs" ? f.dist[id] != null : f.disc[id] != null; const fin = mode === "bfs" ? (f.done || []).includes(id) : f.fin[id] != null;
          return { fill: id === f.cur ? "var(--hot)" : fin ? "var(--accent-soft)" : seen ? "var(--hot-soft)" : "var(--surface)", textColor: id === f.cur ? "#fff" : null, sub: mode === "bfs" ? (f.dist[id] != null ? f.dist[id] : null) : f.disc[id] != null ? `${f.disc[id]}/${f.fin[id] || "·"}` : null, subColor: "var(--accent)" }; },
        edge: (e) => (tree(e) ? { color: "accent", width: 4 } : {})
      }, { r: 24 });
      info.replaceChildren(...(mode === "bfs" ? [h("span", { class: "tiny muted" }, "queue:"), ...chips(f.Q, "ref")] : [h("span", { class: "tiny muted" }, "stack:"), ...chips(f.stack.map((x) => G.nodes[x].label || x), "ref"), ...(mode === "topo" ? [h("span", { class: "tiny muted", style: "margin-left:1em" }, "order:"), ...chips(f.order, "good")] : [])]));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     3. Trie: insert / search / delete
     ======================================================= */
  register("trie", (host, d) => {
    let words = (d.words || "bear,bell,bid,bull,buy,sell,stock,stop").split(",").map((w) => w.trim()).filter(Boolean);
    const sv = mkSvg(1000, 380), out = h("div", { class: "w-caption" });
    const inp = h("input", { type: "text", value: "bell", size: 10 });
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "word"), inp, btn("Insert", () => act("ins")), btn("Search", () => act("find")), btn("Prefix?", () => act("pre")), btn("Delete", () => act("del")), btn("Reset", () => { words = (d.words || "bear,bell,bid,bull,buy,sell,stock,stop").split(","); hl = null; draw("Trie of the initial set."); })), sv, out);
    inp.addEventListener("keydown", (e) => e.stopPropagation());
    let hl = null;
    function build() { const root = { ch: "", kids: {}, end: false }; words.forEach((w) => { let n = root; for (const c of w) { n = n.kids[c] = n.kids[c] || { ch: c, kids: {}, end: false }; } n.end = true; }); return root; }
    function act(k) {
      const w = inp.value.trim().toLowerCase(); if (!w) return;
      if (k === "ins") { if (!words.includes(w)) words.push(w); hl = { path: w, ok: true }; draw(`Insert "${w}": follow existing nodes, create the missing ones, mark the last node as end of word. O(|w|).`); return; }
      const root = build(); let n = root, i = 0; for (; i < w.length && n.kids[w[i]]; i++) n = n.kids[w[i]];
      if (k === "find") { const ok = i === w.length && n.end; hl = { path: w.slice(0, i), ok, fail: i < w.length }; draw(ok ? `<span class="ok">"${w}" found</span> after ${w.length} steps — independent of how many words are stored.` : i < w.length ? `<span class="bad">Not found</span>: no edge for '${w[i]}' after "${w.slice(0, i)}".` : `<span class="bad">Not found</span>: "${w}" is only a prefix (node not marked as end of word).`); }
      if (k === "pre") { const ok = i === w.length; const cnt = ok ? (function c(x) { return (x.end ? 1 : 0) + Object.values(x.kids).reduce((s, y) => s + c(y), 0); })(n) : 0; hl = { path: w.slice(0, i), ok, fail: !ok, sub: ok }; draw(ok ? `<span class="ok">${cnt} word(s)</span> start with "${w}" — the whole subtree below the highlighted node (autocomplete!).` : `<span class="bad">No word starts with "${w}".</span>`); }
      if (k === "del") { const had = words.includes(w); words = words.filter((x) => x !== w); hl = null; draw(had ? `Delete "${w}": unmark the end node and remove nodes bottom-up while they have no other children and are not the end of another word.` : `"${w}" is not in the trie.`); }
    }
    function draw(msg) {
      const root = build(); sv.replaceChildren();
      let leaf = 0; const pos = new Map();
      (function lay(n, dep) { const ks = Object.keys(n.kids).sort(); if (!ks.length) { pos.set(n, { x: leaf++, y: dep }); return; } ks.forEach((k) => lay(n.kids[k], dep + 1)); const xs = ks.map((k) => pos.get(n.kids[k]).x); pos.set(n, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: dep }); })(root, 0);
      const maxD = Math.max(...[...pos.values()].map((p) => p.y)), sx = Math.min(105, 940 / Math.max(1, leaf)), sy = Math.min(78, 330 / Math.max(1, maxD));
      const X = (n) => 30 + (940 - sx * (leaf - 1)) / 2 + pos.get(n).x * sx, Y = (n) => 26 + pos.get(n).y * sy;
      const onPath = new Set(); if (hl) { let n = root; onPath.add(root); for (const c of hl.path) { n = n.kids[c]; if (!n) break; onPath.add(n); } if (hl.sub) { const mark = (x) => { onPath.add(x); Object.values(x.kids).forEach(mark); }; mark(n); } }
      (function edges(n) { Object.values(n.kids).forEach((c) => { sv.append(S("line", { x1: X(n), y1: Y(n), x2: X(c), y2: Y(c), style: `stroke:${onPath.has(c) ? (hl.ok ? "var(--ok)" : "var(--hot)") : "var(--line)"};stroke-width:${onPath.has(c) ? 4 : 2}` })); edges(c); }); })(root);
      pos.forEach((p, n) => { const on = onPath.has(n); sv.append(S("circle", { cx: X(n), cy: Y(n), r: 19, style: `fill:${n.end ? "var(--accent)" : on ? (hl.ok ? "var(--ok-soft)" : "var(--hot-soft)") : "var(--surface)"};stroke:${on ? (hl.ok ? "var(--ok)" : "var(--hot)") : "var(--accent)"};stroke-width:2.5` })); sv.append(S("text", { x: X(n), y: Y(n) + 5, "text-anchor": "middle", "font-size": 18, "font-weight": 700, class: "mono", style: n.end ? "fill:#fff" : "" }, n.ch || "·")); });
      let nodes = 0; pos.forEach(() => nodes++);
      out.innerHTML = (msg || "") + ` <span class="muted">· ${words.length} words, ${nodes} nodes (filled = end of a word)</span>`;
    }
    draw("Trie of { " + words.join(", ") + " } — your example set.");
  });

  /* =======================================================
     4. Dijkstra
     ======================================================= */
  register("dijkstra", (host, d) => {
    let preset = d.preset || "clrs";
    const sv = mkSvg(800, 340), table = h("div"), stepper = Stepper(draw);
    const pb = [["clrs", "CLRS Fig. 24.6"], ["neg", "Negative edge (fails!)"]].map(([k, nm]) => { const b = btn(nm, () => { preset = k; setOn(pb, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...pb), h("div", { style: "display:grid;grid-template-columns:1.6fr 1fr;gap:1em;align-items:center" }, sv, table), stepper.bar, stepper.caption);
    setOn(pb, pb.find((b) => b.dataset.k === preset));
    let G = DIJ;
    function build() {
      G = preset === "neg" ? NEG : DIJ; const src = preset === "neg" ? "a" : "s"; const ids = Object.keys(G.nodes);
      const dist = {}, par = {}; ids.forEach((v) => { dist[v] = INF; par[v] = null; }); dist[src] = 0; const S0 = new Set(); const frames = [];
      frames.push({ dist: { ...dist }, par: { ...par }, S: [], msg: `Initialize: d[${src}] = 0, every other d = ∞. S = ∅.` });
      while (S0.size < ids.length) {
        let u = null; ids.forEach((v) => { if (!S0.has(v) && (u == null || dist[v] < dist[u])) u = v; }); if (dist[u] === INF) break;
        S0.add(u); frames.push({ cur: u, dist: { ...dist }, par: { ...par }, S: [...S0], msg: `EXTRACT-MIN → <b>${u}</b> (d = ${dist[u]}). Its distance is now final.` });
        G.edges.filter((e) => e.u === u).forEach((e) => {
          const nd = dist[u] + e.w; const better = nd < dist[e.v] && !S0.has(e.v);
          const old = dist[e.v]; if (better) { dist[e.v] = nd; par[e.v] = u; }
          frames.push({ cur: u, relax: e, better, dist: { ...dist }, par: { ...par }, S: [...S0], msg: `RELAX(${u}, ${e.v}): d[${u}] + w = ${dist[u]} + ${e.w} = ${nd} ${better ? `&lt; ${fmt(old)} → <span class="ok">update d[${e.v}] = ${nd}</span>` : S0.has(e.v) ? `(${e.v} already final${nd < dist[e.v] ? ' — <span class="bad">but this is shorter! negative edge breaks Dijkstra</span>' : ""})` : `≥ ${fmt(old)} → no change`}` });
        });
      }
      frames.push({ dist, par, S: [...S0], msg: preset === "neg" ? `Dijkstra says d[b] = 2, but a → c → b costs 5 − 4 = 1. <span class="bad">With negative weights use Bellman–Ford.</span>` : "Done: the blue edges form the shortest-path tree. O((V + E) log V) with a binary heap." });
      stepper.set(frames);
    }
    function draw(f) {
      const ids = Object.keys(G.nodes);
      drawGraph(sv, G, { node: (id) => ({ fill: id === f.cur ? "var(--hot)" : f.S.includes(id) ? "var(--accent-soft)" : "var(--surface)", textColor: id === f.cur ? "#fff" : null, sub: fmt(f.dist[id]), subColor: f.S.includes(id) ? "var(--accent)" : "var(--hot)" }),
        edge: (e) => (f.relax === e ? { color: f.better ? "ok" : "bad", width: 5 } : f.par[e.v] === e.u ? { color: "accent", width: 4 } : {}) }, { r: 24 });
      table.replaceChildren(h("table", { class: "tight", style: "font-size:0.6em;margin:0" }, h("tr", {}, h("th", {}, "v"), h("th", {}, "d[v]"), h("th", {}, "π[v]"), h("th", {}, "")),
        ...ids.map((v) => h("tr", { style: v === f.cur ? "background:var(--hot-soft)" : "" }, h("td", {}, v), h("td", { class: "mono" }, fmt(f.dist[v])), h("td", { class: "mono" }, f.par[v] || "–"), h("td", {}, f.S.includes(v) ? "✓" : "")))));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     5. Floyd–Warshall
     ======================================================= */
  register("floyd", (host) => {
    const n = 4, W0 = [[0, 3, INF, 5], [2, 0, INF, 4], [INF, 1, 0, INF], [INF, INF, 2, 0]];
    const G = { nodes: { 1: { x: 90, y: 80 }, 2: { x: 330, y: 80 }, 3: { x: 330, y: 280 }, 4: { x: 90, y: 280 } }, edges: [] };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && W0[i][j] !== INF) G.edges.push({ u: String(i + 1), v: String(j + 1), w: W0[i][j], dir: true });
    const sv = mkSvg(430, 350), mat = h("div"), stepper = Stepper(draw);
    host.append(h("div", { style: "display:grid;grid-template-columns:0.9fr 1fr;gap:1em;align-items:center" }, sv, mat), stepper.bar, stepper.caption);
    const frames = []; let D = W0.map((r) => r.slice());
    frames.push({ D: D.map((r) => r.slice()), k: 0, msg: "D⁽⁰⁾ = W: direct edges only (your example)." });
    for (let k = 0; k < n; k++) {
      const changed = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (D[i][k] + D[k][j] < D[i][j]) { const old = D[i][j]; D[i][j] = D[i][k] + D[k][j]; changed.push([i, j]); frames.push({ D: D.map((r) => r.slice()), k: k + 1, cell: [i, j], msg: `k = ${k + 1}: d[${i + 1}][${j + 1}] = min(${fmt(old)}, d[${i + 1}][${k + 1}] + d[${k + 1}][${j + 1}] = ${D[i][k]} + ${D[k][j]}) = <b>${D[i][j]}</b> — go through ${k + 1}` }); }
      }
      frames.push({ D: D.map((r) => r.slice()), k: k + 1, changed, msg: `D⁽${k + 1}⁾: paths may now use vertices {1${k ? "…" + (k + 1) : ""}} as intermediates. ${changed.length} entr${changed.length === 1 ? "y" : "ies"} improved.` });
    }
    frames[frames.length - 1].msg += " Three nested loops: Θ(n³) time, Θ(n²) space.";
    stepper.set(frames);
    function draw(f) {
      drawGraph(sv, G, { node: (id) => (f.k && +id === f.k ? { fill: "var(--hot)", textColor: "#fff" } : f.cell && (+id === f.cell[0] + 1 || +id === f.cell[1] + 1) ? { fill: "var(--ok-soft)", stroke: "var(--ok)" } : {}),
        edge: (e) => (f.cell && ((+e.u === f.cell[0] + 1 && +e.v === f.k) || (+e.u === f.k && +e.v === f.cell[1] + 1)) ? { color: "ok", width: 4 } : {}) }, { r: 24 });
      const ch = new Set((f.changed || []).map(([i, j]) => i + "," + j));
      mat.replaceChildren(h("div", { class: "small", style: "margin-bottom:.3em" }, `k = ${f.k}`), h("table", { class: "tight", style: "font-size:0.75em;margin:0;font-family:var(--mono)" }, h("tr", {}, h("th", {}, ""), ...[1, 2, 3, 4].map((j) => h("th", { style: j === f.k ? "color:var(--hot)" : "" }, j))),
        ...f.D.map((r, i) => h("tr", {}, h("th", { style: i + 1 === f.k ? "color:var(--hot)" : "" }, i + 1), ...r.map((v, j) => h("td", { style: `text-align:center;${f.cell && f.cell[0] === i && f.cell[1] === j ? "background:var(--ok-soft);font-weight:700" : ch.has(i + "," + j) ? "background:var(--ok-soft)" : i + 1 === f.k || j + 1 === f.k ? "background:var(--hot-soft)" : ""}` }, fmt(v)))))));
    }
    return { stepper };
  });

  /* =======================================================
     6. 0/1 knapsack DP table
     ======================================================= */
  register("knapdp", (host, d) => {
    const presets = { a: { W: 5, items: [[2, 3], [3, 4], [4, 5], [5, 6]] }, b: { W: 7, items: [[1, 1], [3, 4], [4, 5], [5, 7]] } };
    let p = d.preset || "a";
    const stage = h("div"), stepper = Stepper(draw);
    const pb = [["a", "n = 4, W = 5"], ["b", "n = 4, W = 7"]].map(([k, nm]) => { const b = btn(nm, () => { p = k; setOn(pb, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...pb), stage, stepper.bar, stepper.caption);
    setOn(pb, pb.find((b) => b.dataset.k === p));
    let inst = presets[p];
    function build() {
      inst = presets[p]; const { W, items } = inst, n = items.length; const B = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null)); for (let w = 0; w <= W; w++) B[0][w] = 0; for (let i = 0; i <= n; i++) B[i][0] = 0;
      const frames = [{ B: B.map((r) => r.slice()), msg: "B[i][w] = best value using items 1..i with capacity w. Row 0 and column 0 are 0." }];
      for (let i = 1; i <= n; i++) for (let w = 1; w <= W; w++) {
        const [wi, bi] = items[i - 1]; const skip = B[i - 1][w]; let msg;
        if (wi > w) { B[i][w] = skip; msg = `item ${i} (w=${wi}) doesn't fit in ${w} → B[${i}][${w}] = B[${i - 1}][${w}] = ${skip}`; frames.push({ B: B.map((r) => r.slice()), cur: [i, w], refs: [[i - 1, w]], msg }); }
        else { const take = bi + B[i - 1][w - wi]; B[i][w] = Math.max(take, skip); msg = `max( skip: B[${i - 1}][${w}] = ${skip}, take: ${bi} + B[${i - 1}][${w - wi}] = ${take} ) = <b>${B[i][w]}</b>`; frames.push({ B: B.map((r) => r.slice()), cur: [i, w], refs: [[i - 1, w], [i - 1, w - wi]], msg }); }
      }
      const pick = []; let w = W; const path = []; for (let i = n; i >= 1; i--) { path.push([i, w]); if (B[i][w] !== B[i - 1][w]) { pick.push(i); w -= items[i - 1][0]; } }
      frames.push({ B, path, msg: `Best value <b>${B[n][W]}</b> · trace back: items {${pick.reverse().join(", ")}} · Θ(nW) time — pseudo-polynomial (W can be exponential in its number of bits).` });
      stepper.set(frames);
    }
    function draw(f) {
      const { W, items } = inst, n = items.length; const ref = new Set((f.refs || []).map(([a, b]) => a + "," + b)), pth = new Set((f.path || []).map(([a, b]) => a + "," + b));
      stage.replaceChildren(h("div", { class: "small", style: "margin-bottom:.3em" }, "items (w, b): " + items.map(([a, b], i) => `${i + 1}:(${a}, ${b})`).join("  ")),
        h("table", { class: "tight", style: "font-size:0.7em;margin:0;font-family:var(--mono)" }, h("tr", {}, h("th", {}, "i \\ w"), ...Array.from({ length: W + 1 }, (_, w) => h("th", {}, w))),
          ...f.B.map((r, i) => h("tr", {}, h("th", {}, i), ...r.map((v, w) => h("td", { style: `text-align:center;${f.cur && f.cur[0] === i && f.cur[1] === w ? "background:var(--accent-soft);outline:2px solid var(--accent)" : ref.has(i + "," + w) ? "background:var(--hot-soft)" : pth.has(i + "," + w) ? "background:var(--ok-soft);font-weight:700" : ""}` }, v == null ? "" : String(v)))))));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     7. TSP on a weighted complete graph: NN, repetitive NN, cheapest link, exact
     ======================================================= */
  register("tspgraph", (host) => {
    const ids = ["A", "B", "C", "D", "E"];
    const Wt = { AB: 12, AC: 9, AD: 3, AE: 11, BC: 5, BD: 6, BE: 4, CD: 7, CE: 10, DE: 8 };
    const w = (a, b) => Wt[a + b] || Wt[b + a];
    const G = { nodes: { A: { x: 380, y: 50 }, B: { x: 680, y: 160 }, C: { x: 580, y: 320 }, D: { x: 180, y: 320 }, E: { x: 80, y: 160 } }, edges: [] };
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) G.edges.push({ u: ids[i], v: ids[j], w: w(ids[i], ids[j]) });
    let algo = "nn";
    const sv = mkSvg(760, 370), stepper = Stepper(draw);
    const ab = [["nn", "Nearest neighbor (from A)"], ["rnn", "Repetitive NN"], ["cl", "Cheapest link"], ["bf", "Brute force (optimal)"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...ab), sv, stepper.bar, stepper.caption);
    setOn(ab, ab[0]);
    const L = (t) => t.reduce((s, x, i) => s + w(x, t[(i + 1) % t.length]), 0);
    const nn = (s) => { const t = [s]; while (t.length < 5) { const c = ids.filter((x) => !t.includes(x)).sort((a, b) => w(t[t.length - 1], a) - w(t[t.length - 1], b))[0]; t.push(c); } return t; };
    function tourEdges(t) { return t.map((x, i) => [x, t[(i + 1) % t.length]]); }
    function build() {
      const frames = [];
      if (algo === "nn") { const t = nn("A"); for (let k = 1; k <= 5; k++) frames.push({ E: tourEdges(t).slice(0, k), msg: k < 5 ? `From ${t[k - 1]} go to the nearest unvisited city: ${t[k]} (${w(t[k - 1], t[k])})` : `Return to A. Tour ${t.join("")}A, cost <b>${L(t)}</b>` }); }
      else if (algo === "rnn") { ids.forEach((s) => { const t = nn(s); frames.push({ E: tourEdges(t), msg: `NN starting at ${s}: ${t.join("")}${s} → cost ${L(t)}` }); }); const best = ids.map(nn).sort((a, b) => L(a) - L(b))[0]; frames.push({ E: tourEdges(best), msg: `Keep the best start: cost <b>${L(best)}</b> (rewrite it starting from A if needed).` }); }
      else if (algo === "cl") {
        const es = G.edges.slice().sort((a, b) => a.w - b.w), deg = {}, par = {}; ids.forEach((x) => { deg[x] = 0; par[x] = x; }); const f = (x) => (par[x] === x ? x : f(par[x])); const ch = [];
        es.forEach((e) => { if (ch.length === 5) return; const ok = deg[e.u] < 2 && deg[e.v] < 2 && (f(e.u) !== f(e.v) || ch.length === 4); frames.push({ E: ch.map((x) => [x.u, x.v]), cand: e, ok, msg: `Cheapest remaining edge ${e.u}${e.v} (${e.w}): ${ok ? "add it" : "skip — it would close a cycle too early or give a vertex degree 3"}` }); if (ok) { ch.push(e); deg[e.u]++; deg[e.v]++; par[f(e.u)] = f(e.v); } });
        frames.push({ E: ch.map((x) => [x.u, x.v]), msg: `Cheapest-link tour cost <b>${ch.reduce((s, e) => s + e.w, 0)}</b>` });
      } else {
        const perms = []; (function per(a, k) { if (k === a.length) { perms.push(["A", ...a]); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; per(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } })(["B", "C", "D", "E"], 0);
        let best = perms[0]; perms.forEach((t) => { if (L(t) < L(best)) best = t; });
        frames.push({ E: tourEdges(best), msg: `Checked all (n − 1)! = 24 tours (12 distinct up to direction). Optimal: ${best.join("")}A, cost <b>${L(best)}</b>. Held–Karp DP: O(2ⁿ n²).` });
      }
      stepper.set(frames, algo === "bf" ? 0 : 0);
    }
    function draw(f) {
      const on = new Set(f.E.map(([a, b]) => [a, b].sort().join("")));
      drawGraph(sv, G, { edge: (e) => { const k = [e.u, e.v].sort().join(""); if (f.cand && f.cand === e) return { color: f.ok ? "ok" : "bad", width: 5 }; return on.has(k) ? { color: "accent", width: 5 } : { color: "line", width: 1.5 }; } }, { r: 24 });
    }
    build();
    return { stepper };
  });

  /* =======================================================
     8. MST: Prim and Kruskal
     ======================================================= */
  register("mst", (host, d) => {
    let algo = d.algo || "kruskal";
    const sv = mkSvg(870, 340), side = h("div", { class: "cells", style: "align-items:center;min-height:2.2em;flex-wrap:wrap" }), stepper = Stepper(draw);
    const ab = [["prim", "Prim (from a)"], ["kruskal", "Kruskal"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...ab), sv, h("div", { class: "w-toolbar" }, side), stepper.bar, stepper.caption);
    setOn(ab, ab.find((b) => b.dataset.k === algo));
    const G = MSTG, ids = Object.keys(G.nodes);
    function build() {
      const frames = [];
      if (algo === "kruskal") {
        const par = {}; ids.forEach((v) => (par[v] = v)); const f = (x) => (par[x] === x ? x : (par[x] = f(par[x]))); const A = []; let tot = 0;
        const sorted = G.edges.slice().sort((a, b) => a.w - b.w);
        frames.push({ A: [], comp: { ...par }, sorted, msg: "Sort edges by weight. Every vertex is its own component (MAKE-SET)." });
        sorted.forEach((e, k) => { const ok = f(e.u) !== f(e.v); if (ok) { par[f(e.u)] = f(e.v); A.push(e); tot += e.w; }
          frames.push({ A: A.slice(), cand: e, ok, k, sorted, comp: Object.fromEntries(ids.map((v) => [v, f(v)])), msg: `(${e.u}, ${e.v}) w=${e.w}: ${ok ? `different components → <span class="ok">add</span> (UNION)` : `same component → <span class="bad">ignore</span> (would form a cycle)`}` }); });
        frames.push({ A, sorted, comp: Object.fromEntries(ids.map((v) => [v, f(v)])), msg: `MST weight <b>${tot}</b>, |V| − 1 = ${A.length} edges. O(E log E) for sorting + nearly O(E) for union–find.` });
      } else {
        const key = {}, par = {}, inT = new Set(); ids.forEach((v) => { key[v] = INF; par[v] = null; }); key.a = 0; let tot = 0;
        frames.push({ key: { ...key }, par: { ...par }, inT: [], msg: "key[a] = 0, all other keys ∞. Q holds all vertices." });
        while (inT.size < ids.length) {
          let u = null; ids.forEach((v) => { if (!inT.has(v) && (u == null || key[v] < key[u])) u = v; }); inT.add(u); if (par[u]) tot += key[u];
          const upd = [];
          G.edges.forEach((e) => { const v = e.u === u ? e.v : e.v === u ? e.u : null; if (v && !inT.has(v) && e.w < key[v]) { key[v] = e.w; par[v] = u; upd.push(`${v}:${e.w}`); } });
          frames.push({ cur: u, key: { ...key }, par: { ...par }, inT: [...inT], msg: `EXTRACT-MIN → <b>${u}</b>${par[u] ? ` via light edge (${par[u]}, ${u}) w=${G.edges.find((e) => (e.u === u && e.v === par[u]) || (e.v === u && e.u === par[u])).w}` : ""}. Update keys: ${upd.join(", ") || "none"}` });
        }
        frames.push({ key, par, inT: [...inT], msg: `MST weight <b>${tot}</b>. O(E log V) with a binary heap.` });
      }
      stepper.set(frames);
    }
    const pal = ["#4c6ef5", "#f76707", "#37b24d", "#ae3ec9", "#f03e3e", "#1098ad", "#fab005", "#868e96", "#d6336c"];
    function draw(f) {
      if (algo === "kruskal") {
        const roots = [...new Set(Object.values(f.comp))].sort();
        drawGraph(sv, G, { node: (id) => ({ fill: pal[roots.indexOf(f.comp[id]) % pal.length], textColor: "#fff", stroke: "var(--ink)" }), edge: (e) => (f.cand === e ? { color: f.ok ? "ok" : "bad", width: 6 } : f.A.includes(e) ? { color: "accent", width: 5 } : {}) });
        side.replaceChildren(h("span", { class: "tiny muted" }, "sorted edges:"), ...f.sorted.map((e, k) => h("div", { class: "cell " + (k === f.k ? (f.ok ? "good" : "mid") : f.A.includes(e) ? "act" : k < (f.k == null ? (f.A.length ? 99 : -1) : f.k) ? "dim" : ""), style: "min-width:2.6em" }, h("span", { class: "idx" }, e.u + e.v), String(e.w))));
      } else {
        drawGraph(sv, G, { node: (id) => ({ fill: id === f.cur ? "var(--hot)" : f.inT.includes(id) ? "var(--accent)" : "var(--surface)", textColor: f.inT.includes(id) ? "#fff" : null, sub: f.inT.includes(id) ? null : fmt(f.key[id]) }),
          edge: (e) => (f.par[e.v] === e.u && f.inT.includes(e.v) || f.par[e.u] === e.v && f.inT.includes(e.u) ? { color: "accent", width: 5 } : (f.par[e.v] === e.u || f.par[e.u] === e.v) ? { color: "hot", width: 3, dash: true } : {}) });
        side.replaceChildren(h("span", { class: "tiny muted" }, "keys of vertices still in Q (orange) · dashed = current best edge to the tree"));
      }
    }
    build();
    return { stepper };
  });

  /* =======================================================
     9. Graph coloring: greedy (order matters), Welsh–Powell, backtracking
     ======================================================= */
  register("coloring", (host, d) => {
    const presets = {
      crown: { nodes: { 1: { x: 120, y: 70 }, 2: { x: 320, y: 70 }, 3: { x: 520, y: 70 }, 4: { x: 720, y: 70 }, 5: { x: 120, y: 280 }, 6: { x: 320, y: 280 }, 7: { x: 520, y: 280 }, 8: { x: 720, y: 280 } },
        edges: [[1, 6], [1, 7], [1, 8], [2, 5], [2, 7], [2, 8], [3, 5], [3, 6], [3, 8], [4, 5], [4, 6], [4, 7]].map(([u, v]) => ({ u: String(u), v: String(v) })), order: ["1", "5", "2", "6", "3", "7", "4", "8"] },
      wheel: { nodes: { A: { x: 420, y: 175 }, B: { x: 420, y: 40 }, C: { x: 620, y: 110 }, D: { x: 600, y: 300 }, E: { x: 240, y: 300 }, F: { x: 220, y: 110 } },
        edges: [["A", "B"], ["A", "C"], ["A", "D"], ["A", "E"], ["A", "F"], ["B", "C"], ["C", "D"], ["D", "E"], ["E", "F"], ["F", "B"]].map(([u, v]) => ({ u, v })), order: ["B", "C", "D", "E", "F", "A"] },
      petersen: (() => { const n = {}, e = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; n["o" + i] = { x: 420 + 170 * Math.cos(a), y: 180 + 150 * Math.sin(a), label: String(i) }; n["i" + i] = { x: 420 + 75 * Math.cos(a), y: 180 + 68 * Math.sin(a), label: String(i + 5) }; }
        for (let i = 0; i < 5; i++) { e.push({ u: "o" + i, v: "o" + ((i + 1) % 5) }); e.push({ u: "o" + i, v: "i" + i }); e.push({ u: "i" + i, v: "i" + ((i + 2) % 5) }); } return { nodes: n, edges: e, order: Object.keys(n) }; })()
    };
    let p = d.preset || "crown", algo = "greedy";
    const sv = mkSvg(840, 350), stepper = Stepper(draw);
    const pb = [["crown", "Bipartite (bad order)"], ["wheel", "Wheel W₅"], ["petersen", "Petersen graph"]].map(([k, nm]) => { const b = btn(nm, () => { p = k; setOn(pb, b); build(); }); b.dataset.k = k; return b; });
    const ab = [["greedy", "Greedy (given order)"], ["wp", "Welsh–Powell"], ["bt", "Backtracking (exact χ)"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...pb), h("div", { class: "w-toolbar" }, ...ab), sv, stepper.bar, stepper.caption);
    setOn(pb, pb.find((b) => b.dataset.k === p)); setOn(ab, ab[0]);
    const pal = ["#4c6ef5", "#f76707", "#37b24d", "#ae3ec9", "#f03e3e", "#fab005"];
    let G = presets[p];
    function build() {
      G = presets[p]; const ids = Object.keys(G.nodes), adj = {}; ids.forEach((v) => (adj[v] = [])); G.edges.forEach((e) => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
      const frames = []; const lab = (v) => G.nodes[v].label || v;
      if (algo === "greedy" || algo === "wp") {
        const order = algo === "wp" ? ids.slice().sort((a, b) => adj[b].length - adj[a].length) : G.order;
        const col = {}; frames.push({ col: {}, msg: algo === "wp" ? `Welsh–Powell: sort by decreasing degree: ${order.map((v) => `${lab(v)}(${adj[v].length})`).join(", ")}` : `Greedy in the order ${order.map(lab).join(", ")}: give each vertex the smallest color not used by its neighbors.` });
        order.forEach((v) => { const used = new Set(adj[v].map((u) => col[u]).filter((c) => c != null)); let c = 0; while (used.has(c)) c++; col[v] = c; frames.push({ col: { ...col }, cur: v, msg: `${lab(v)}: neighbors use {${[...used].map((x) => x + 1).sort().join(", ")}} → color <b>${c + 1}</b>` }); });
        const k = Math.max(...Object.values(col)) + 1; frames.push({ col, msg: `Used <b>${k}</b> colors. Greedy only guarantees ≤ Δ + 1 = ${Math.max(...ids.map((v) => adj[v].length)) + 1}; whether it is optimal depends on the order (compare with Backtracking).` });
      } else {
        let found = null, nodes = 0;
        for (let k = 1; k <= 6 && !found; k++) {
          const col = {}; frames.push({ col: {}, msg: `Try k = ${k} colors.` });
          const ok = (function bt(i) { if (i === ids.length) return true; const v = ids[i]; for (let c = 0; c < k; c++) { nodes++; if (adj[v].some((u) => col[u] === c)) continue; col[v] = c; if (frames.length < 400) frames.push({ col: { ...col }, cur: v, msg: `k = ${k}: color ${lab(v)} with ${c + 1}` }); if (bt(i + 1)) return true; delete col[v]; } if (frames.length < 400) frames.push({ col: { ...col }, cur: v, bad: true, msg: `k = ${k}: no color fits ${lab(v)} → backtrack` }); return false; })(0);
          if (ok) found = { k, col: { ...col } }; else frames.push({ col: {}, msg: `<span class="bad">${k} colors are not enough.</span>` });
        }
        frames.push({ col: found.col, msg: `Chromatic number χ = <b>${found.k}</b> (${nodes} assignments tried). Exact coloring is NP-hard: exponential worst case.` });
      }
      stepper.set(frames);
    }
    function draw(f) { drawGraph(sv, G, { node: (id) => (f.col[id] != null ? { fill: pal[f.col[id]], textColor: "#fff", stroke: id === f.cur ? (f.bad ? "var(--bad)" : "var(--ink)") : "var(--ink)", sw: id === f.cur ? 5 : 2.5 } : id === f.cur ? { stroke: "var(--bad)", sw: 5 } : {}) }, { r: 22 }); }
    build();
    return { stepper };
  });

  /* =======================================================
     10. Optimal BST (CLRS 15.5)
     ======================================================= */
  register("obst", (host) => {
    const p = [0, 0.15, 0.10, 0.05, 0.10, 0.20], q = [0.05, 0.10, 0.05, 0.05, 0.05, 0.10], n = 5;
    const stage = h("div", { style: "display:grid;grid-template-columns:1.1fr 1fr;gap:1em;align-items:center" }), tbl = h("div"), sv = mkSvg(460, 300), stepper = Stepper(draw);
    stage.append(tbl, sv); host.append(h("p", { class: "small", style: "margin:.1em 0" }, "keys k₁…k₅ with p = .15 .10 .05 .10 .20 · dummy keys d₀…d₅ with q = .05 .10 .05 .05 .05 .10"), stage, stepper.bar, stepper.caption);
    const e = Array.from({ length: n + 2 }, () => Array(n + 1).fill(null)), w = Array.from({ length: n + 2 }, () => Array(n + 1).fill(0)), root = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null));
    const frames = [];
    for (let i = 1; i <= n + 1; i++) { e[i][i - 1] = q[i - 1]; w[i][i - 1] = q[i - 1]; }
    frames.push({ e: e.map((r) => r.slice()), msg: "e[i][i−1] = q(i−1): an empty subtree is just the dummy key d(i−1)." });
    for (let l = 1; l <= n; l++) for (let i = 1; i <= n - l + 1; i++) {
      const j = i + l - 1; e[i][j] = INF; w[i][j] = w[i][j - 1] + p[j] + q[j]; const cand = [];
      for (let r = i; r <= j; r++) { const t = e[i][r - 1] + e[r + 1][j] + w[i][j]; cand.push(`k${r}: ${t.toFixed(2)}`); if (t < e[i][j] - 1e-12) { e[i][j] = t; root[i][j] = r; } }
      frames.push({ e: e.map((r) => r.slice()), cur: [i, j], msg: `e[${i}][${j}] = min over roots r of e[${i}][r−1] + e[r+1][${j}] + w(${i},${j}) → {${cand.join(", ")}} = <b>${e[i][j].toFixed(2)}</b>, root k${root[i][j]}` });
    }
    frames.push({ e, tree: true, msg: `Expected search cost <b>${e[1][n].toFixed(2)}</b> with root k${root[1][n]}. Θ(n³) time (Knuth: O(n²)). Gilbert & Moore (1959) solved the variant for alphabetic codes.` });
    stepper.set(frames);
    function draw(f) {
      tbl.replaceChildren(h("table", { class: "tight", style: "font-size:0.58em;margin:0;font-family:var(--mono)" }, h("tr", {}, h("th", {}, "e[i][j]"), ...[0, 1, 2, 3, 4, 5].map((j) => h("th", {}, "j=" + j))),
        ...[1, 2, 3, 4, 5, 6].map((i) => h("tr", {}, h("th", {}, "i=" + i), ...[0, 1, 2, 3, 4, 5].map((j) => { const v = f.e[i] && f.e[i][j]; const cur = f.cur && f.cur[0] === i && f.cur[1] === j; return h("td", { style: `text-align:center;${cur ? "background:var(--accent-soft);outline:2px solid var(--accent)" : ""}` }, v == null || v === INF ? "" : v.toFixed(2)); })))));
      sv.replaceChildren();
      if (f.tree) {
        const nodes = []; (function lay(i, j, dep, px, py) { const y = 28 + dep * 58; if (j < i) { const x = 22 + 2 * j * 41.6; nodes.push({ x, y, t: "d" + j, leaf: true, px, py }); return; } const r = root[i][j], x = 22 + (2 * r - 1) * 41.6; nodes.push({ x, y, t: "k" + r, px, py }); lay(i, r - 1, dep + 1, x, y); lay(r + 1, j, dep + 1, x, y); })(1, n, 0, null, null);
        nodes.forEach((nd) => { if (nd.px != null) sv.append(S("line", { x1: nd.px, y1: nd.py, x2: nd.x, y2: nd.y, style: "stroke:var(--line);stroke-width:2" })); });
        nodes.forEach((nd) => { if (nd.leaf) sv.append(S("rect", { x: nd.x - 15, y: nd.y - 13, width: 30, height: 26, rx: 5, style: "fill:var(--hot-soft);stroke:var(--hot);stroke-width:1.5" })); else sv.append(S("circle", { cx: nd.x, cy: nd.y, r: 18, style: "fill:var(--accent);stroke:var(--ink);stroke-width:2" })); sv.append(S("text", { x: nd.x, y: nd.y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, style: nd.leaf ? "" : "fill:#fff" }, nd.t)); });
      } else sv.append(S("text", { x: 230, y: 150, "text-anchor": "middle", "font-size": 18, style: "fill:var(--muted)" }, "tree appears at the end"));
    }
    return { stepper };
  });

  /* =======================================================
     11. Max flow: Ford–Fulkerson with BFS (Edmonds–Karp)
     ======================================================= */
  register("maxflow", (host, d) => {
    const G = { nodes: { s: { x: 70, y: 180 }, v1: { x: 290, y: 70 }, v2: { x: 290, y: 290 }, v3: { x: 570, y: 70 }, v4: { x: 570, y: 290 }, t: { x: 790, y: 180 } },
      edges: [["s", "v1", 16], ["s", "v2", 13], ["v2", "v1", 4], ["v1", "v3", 12], ["v3", "v2", 9], ["v2", "v4", 14], ["v4", "v3", 7], ["v3", "t", 20], ["v4", "t", 4]].map(([u, v, c]) => ({ u, v, c, dir: true })) };
    let mode = d.mode || "bfs";
    const sv = mkSvg(860, 360), stepper = Stepper(draw);
    const mb = [["bfs", "BFS paths (Edmonds–Karp)"], ["dfs", "DFS paths (plain Ford–Fulkerson)"]].map(([k, nm]) => { const b = btn(nm, () => { mode = k; setOn(mb, b); build(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...mb), sv, stepper.bar, stepper.caption);
    setOn(mb, mb.find((b) => b.dataset.k === mode));
    function build() {
      const frames = []; const f = G.edges.map(() => 0); let total = 0;
      const res = () => { const r = []; G.edges.forEach((e, i) => { if (e.c - f[i] > 0) r.push({ u: e.u, v: e.v, cap: e.c - f[i], i, fwd: true }); if (f[i] > 0) r.push({ u: e.v, v: e.u, cap: f[i], i, fwd: false }); }); return r; };
      frames.push({ f: f.slice(), total, msg: "Start with zero flow. Each edge shows flow / capacity." });
      for (let it = 0; it < 30; it++) {
        const R = res(), par = { s: null };
        if (mode === "bfs") { const Q = ["s"]; while (Q.length && !("t" in par)) { const u = Q.shift(); R.filter((e) => e.u === u).forEach((e) => { if (!(e.v in par)) { par[e.v] = e; Q.push(e.v); } }); } }
        else { (function dfs(u) { if (u === "t") return true; for (const e of R.filter((x) => x.u === u)) { if (!(e.v in par)) { par[e.v] = e; if (dfs(e.v)) return true; } } return false; })("s"); }
        if (!("t" in par)) { const reach = new Set(Object.keys(par)); frames.push({ f: f.slice(), total, cut: reach, msg: `No augmenting path in the residual network → maximum flow = <b>${total}</b>. Vertices reachable from s (green) define a minimum cut of capacity ${G.edges.filter((e) => reach.has(e.u) && !reach.has(e.v)).reduce((a, e) => a + e.c, 0)} — max-flow min-cut theorem.` }); break; }
        const path = []; let v = "t"; while (par[v]) { path.unshift(par[v]); v = par[v].u; } const b = Math.min(...path.map((e) => e.cap));
        frames.push({ f: f.slice(), total, path, msg: `${mode === "bfs" ? "BFS finds the shortest" : "DFS finds an"} augmenting path ${["s", ...path.map((e) => e.v)].join(" → ")}${path.some((e) => !e.fwd) ? ' (uses a <b class="bad">backward</b> residual edge: it cancels flow)' : ""}. Bottleneck c_f(p) = min(${path.map((e) => e.cap).join(", ")}) = <b>${b}</b>` });
        path.forEach((e) => { f[e.i] += e.fwd ? b : -b; }); total += b;
        frames.push({ f: f.slice(), total, path, msg: `Augment by ${b}: |f| = <b>${total}</b>` });
      }
      stepper.set(frames);
    }
    function draw(fr) {
      const onPath = new Map((fr.path || []).map((e) => [e.i, e.fwd]));
      drawGraph(sv, G, { node: (id) => (fr.cut ? (fr.cut.has(id) ? { fill: "var(--ok-soft)", stroke: "var(--ok)" } : { fill: "var(--hot-soft)", stroke: "var(--hot)" }) : id === "s" || id === "t" ? { fill: "var(--accent)", textColor: "#fff" } : {}),
        edge: (e, i) => { const lab = `${fr.f[i]}/${e.c}`; if (onPath.has(i)) return { color: onPath.get(i) ? "ok" : "bad", width: 6, label: lab, dash: !onPath.get(i) }; if (fr.cut && fr.cut.has(e.u) && !fr.cut.has(e.v)) return { color: "hot", width: 5, label: lab }; return { color: fr.f[i] ? "accent" : "line", width: 2 + fr.f[i] / 4, label: lab, labelColor: fr.f[i] === e.c ? "bad" : "muted" }; } }, { r: 24 });
      sv.append(S("text", { x: 430, y: 350, "text-anchor": "middle", "font-size": 18, "font-weight": 700, style: "fill:var(--accent)" }, `|f| = ${fr.total}`));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     12. Minimum path cover in a DAG via bipartite matching
     ======================================================= */
  register("pathcover", (host) => {
    const V = ["1", "2", "3", "4", "5", "6", "7"]; const E = [["1", "2"], ["1", "3"], ["2", "4"], ["3", "4"], ["3", "5"], ["4", "6"], ["5", "6"], ["5", "7"]];
    const pos = { 1: [80, 170], 2: [230, 70], 3: [230, 270], 4: [400, 170], 5: [400, 300], 6: [560, 170], 7: [560, 300] };
    const sv = mkSvg(1000, 360), stepper = Stepper(draw);
    host.append(sv, stepper.bar, stepper.caption);
    const frames = [], mL = {}, mR = {};
    frames.push({ m: {}, msg: "Split every vertex v into v_out (left) and v_in (right); each DAG edge u → v becomes u_out — v_in. A matching = a set of 'continue the path' choices." });
    V.forEach((u) => {
      const seen = new Set(); const tryK = (x) => { for (const [a, b] of E) { if (a !== x || seen.has(b)) continue; seen.add(b); if (mR[b] == null || tryK(mR[b])) { mL[x] = b; mR[b] = x; return true; } } return false; };
      const ok = tryK(u); frames.push({ m: { ...mL }, cur: u, msg: ok ? `Augmenting path from ${u}_out → matching size ${Object.keys(mL).length}` : `No augmenting path from ${u}_out` });
    });
    const k = Object.keys(mL).length, paths = []; V.forEach((v) => { if (!Object.values(mL).includes(v)) { const p = [v]; let x = v; while (mL[x]) { x = mL[x]; p.push(x); } paths.push(p); } });
    frames.push({ m: { ...mL }, paths, msg: `Maximum matching = ${k} → minimum path cover = |V| − ${k} = <b>${V.length - k}</b> paths: ${paths.map((p) => p.join("→")).join(" · ")}. (Matching via max flow / augmenting paths.)` });
    stepper.set(frames);
    const pal = ["#4c6ef5", "#f76707", "#37b24d", "#ae3ec9"];
    function draw(f) {
      sv.replaceChildren();
      const pc = {}; (f.paths || []).forEach((p, i) => p.forEach((v) => (pc[v] = pal[i])));
      // left: DAG
      E.forEach(([a, b]) => { const used = f.m[a] === b; sv.append(S("line", { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], style: `stroke:${used ? (f.paths ? pc[a] : "var(--ok)") : "var(--line)"};stroke-width:${used ? 6 : 2.5}` })); });
      V.forEach((v) => { sv.append(S("circle", { cx: pos[v][0], cy: pos[v][1], r: 20, style: `fill:${pc[v] || "var(--surface)"};stroke:var(--ink);stroke-width:2.5` })); sv.append(S("text", { x: pos[v][0], y: pos[v][1] + 6, "text-anchor": "middle", "font-size": 17, "font-weight": 700, style: pc[v] ? "fill:#fff" : "" }, v)); });
      // right: bipartite
      const LX = 720, RX = 920, Y = (i) => 30 + i * 47;
      E.forEach(([a, b]) => { const used = f.m[a] === b; sv.append(S("line", { x1: LX, y1: Y(V.indexOf(a)), x2: RX, y2: Y(V.indexOf(b)), style: `stroke:${used ? "var(--ok)" : "var(--line)"};stroke-width:${used ? 5 : 2}` })); });
      V.forEach((v, i) => { [[LX, v + "out"], [RX, v + "in"]].forEach(([x, t]) => { sv.append(S("circle", { cx: x, cy: Y(i), r: 17, style: `fill:${t === f.cur + "out" ? "var(--hot-soft)" : "var(--surface)"};stroke:var(--accent);stroke-width:2` })); sv.append(S("text", { x, y: Y(i) + 5, "text-anchor": "middle", "font-size": 13, "font-weight": 700 }, v)); }); });
      sv.append(S("text", { x: LX, y: 352, "text-anchor": "middle", "font-size": 14, style: "fill:var(--muted)" }, "out")); sv.append(S("text", { x: RX, y: 352, "text-anchor": "middle", "font-size": 14, style: "fill:var(--muted)" }, "in"));
    }
    return { stepper };
  });
})();

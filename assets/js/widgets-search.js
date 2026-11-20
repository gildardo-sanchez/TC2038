/* =========================================================
   TC2038 · Unit 5 — Advanced search widgets
   Requires widgets.js (window.Widgets) to be loaded first.
   ========================================================= */
(function () {
  "use strict";
  const { register, h, S, Stepper } = window.Widgets;
  const btn = (label, fn, title) => h("button", { type: "button", title: title || null, onclick: fn }, label);
  const setOn = (group, active) => group.forEach((b) => b.classList.toggle("on", b === active));
  const stat = (label, value) => h("span", {}, label + " ", h("b", {}, String(value)));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function mkSvg(w, hh, extra) { const s = S("svg", { viewBox: `0 0 ${w} ${hh}`, preserveAspectRatio: "xMidYMid meet" }); s.style.touchAction = "none"; s.style.overflow = "hidden"; if (extra) s.style.cssText += extra; return s; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function svgPoint(sv, e) { const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); }
  const chip = (txt, cls) => h("div", { class: "cell " + (cls || "") }, txt);

  /* =======================================================
     0. Wolf, goat & cabbage: play it, then see its state space
     state = 4 bits (F, W, G, C): 0 = left bank, 1 = right bank
     ======================================================= */
  register("river", (host, d) => {
    const mode = d.mode || "play";               // "play" | "space"
    const NAMES = ["Farmer", "Wolf", "Goat", "Cabbage"], L = ["F", "W", "G", "C"], COL = ["#4c6ef5", "#868e96", "#f08c00", "#37b24d"];
    const side = (s, i) => (s >> i) & 1;
    const unsafe = (s) => (side(s, 1) === side(s, 2) && side(s, 0) !== side(s, 1)) ? "the wolf eats the goat!" : (side(s, 2) === side(s, 3) && side(s, 0) !== side(s, 2)) ? "the goat eats the cabbage!" : null;
    const label = (s) => { const l = [0, 1, 2, 3].filter((i) => !side(s, i)).map((i) => L[i]).join("") || "∅", r = [0, 1, 2, 3].filter((i) => side(s, i)).map((i) => L[i]).join("") || "∅"; return l + " | " + r; };
    const moves = (s) => { const out = []; [-1, 1, 2, 3].forEach((k) => { if (k > 0 && side(s, k) !== side(s, 0)) return; let t = s ^ 1; if (k > 0) t ^= 1 << k; out.push({ k, t }); }); return out; };
    // state space (legal states only) laid out by BFS depth
    const legal = []; for (let s = 0; s < 16; s++) if (!unsafe(s)) legal.push(s);
    const depth = { 0: 0 }, par = { 0: null }, Q = [0]; while (Q.length) { const s = Q.shift(); moves(s).forEach(({ t }) => { if (!unsafe(t) && depth[t] == null) { depth[t] = depth[s] + 1; par[t] = s; Q.push(t); } }); }
    const cols = {}; legal.forEach((s) => (cols[depth[s]] = (cols[depth[s]] || []).concat(s)));
    const GW = 900, GH = 300, pos = {};
    Object.entries(cols).forEach(([dd, ss]) => ss.forEach((s, k) => { pos[s] = { x: 60 + dd * (GW - 120) / 7, y: GH / 2 + (k - (ss.length - 1) / 2) * 130 }; }));
    const sol = []; for (let s = 15; s != null; s = par[s]) sol.unshift(s);
    let cur = 0, hist = [0], dead = null, showSol = false;
    const scene = mkSvg(900, 230), graph = mkSvg(GW, GH), out = h("div", { class: "w-caption" });
    const mb = [-1, 1, 2, 3].map((k) => btn(k < 0 ? "Cross alone" : "Take the " + NAMES[k].toLowerCase(), () => go(k)));
    const tools = [...mb, btn("Undo", () => { if (hist.length > 1) { hist.pop(); cur = hist[hist.length - 1]; dead = null; draw(); } }), btn("Reset", () => { cur = 0; hist = [0]; dead = null; showSol = false; draw(); })];
    if (mode === "space") tools.push(btn("Show a shortest solution", () => { showSol = !showSol; draw(); }));
    host.append(h("div", { class: "w-toolbar" }, ...tools), mode === "space" ? h("div", { style: "display:grid;grid-template-columns:0.75fr 1.45fr;gap:.8em;align-items:center" }, scene, graph) : scene, out);
    function go(k) {
      if (dead || cur === 15) return;
      const m = moves(cur).find((x) => x.k === k); if (!m) { out.innerHTML = `<span class="bad">The ${NAMES[k].toLowerCase()} is not on the farmer's bank.</span>`; return; }
      cur = m.t; hist.push(cur); dead = unsafe(cur); draw();
    }
    function draw() {
      scene.replaceChildren();
      scene.append(S("rect", { x: 0, y: 0, width: 300, height: 230, style: "fill:#d3f9d8" }), S("rect", { x: 600, y: 0, width: 300, height: 230, style: "fill:#d3f9d8" }), S("rect", { x: 300, y: 0, width: 300, height: 230, style: "fill:#a5d8ff" }));
      scene.append(S("text", { x: 150, y: 24, "text-anchor": "middle", "font-size": 18, "font-weight": 700, style: "fill:#2b8a3e" }, "left bank"), S("text", { x: 750, y: 24, "text-anchor": "middle", "font-size": 18, "font-weight": 700, style: "fill:#2b8a3e" }, "right bank"));
      const fs = side(cur, 0);
      scene.append(S("path", { d: `M${fs ? 470 : 330},170 h100 l-18,26 h-64 z`, style: "fill:#8d5a2b" }));
      [0, 1, 2, 3].forEach((i) => {
        const s = side(cur, i), x = (s ? 640 : 40) + i * 62, y = 120;
        scene.append(S("circle", { cx: x + 26, cy: y, r: 26, style: `fill:${COL[i]};stroke:${dead && i > 0 && ((dead.includes("wolf") && (i === 1 || i === 2)) || (dead.includes("cabbage") && (i === 2 || i === 3))) ? "var(--bad)" : "#fff"};stroke-width:4` }));
        scene.append(S("text", { x: x + 26, y: y + 7, "text-anchor": "middle", "font-size": 22, "font-weight": 700, style: "fill:#fff" }, L[i]));
        scene.append(S("text", { x: x + 26, y: y + 46, "text-anchor": "middle", "font-size": 13, style: "fill:#333" }, NAMES[i]));
      });
      const nm = hist.length - 1;
      out.innerHTML = dead ? `<span class="bad"><b>Oops — ${dead}</b></span> That state is not allowed. Press Undo.` : cur === 15 ? `<span class="ok"><b>Solved in ${nm} crossings!</b></span> ${nm === 7 ? "That is the minimum." : "The minimum is 7 — can you do it in fewer?"}` : `The farmer must take everyone to the right bank. The boat carries the farmer and <b>at most one</b> passenger. Never leave the wolf alone with the goat, or the goat with the cabbage. Crossings so far: <b>${nm}</b>.`;
      if (mode !== "space") return;
      graph.replaceChildren();
      const onPath = new Set(); for (let i = 0; i + 1 < hist.length; i++) onPath.add(Math.min(hist[i], hist[i + 1]) + "-" + Math.max(hist[i], hist[i + 1]));
      const solE = new Set(); for (let i = 0; i + 1 < sol.length; i++) solE.add(Math.min(sol[i], sol[i + 1]) + "-" + Math.max(sol[i], sol[i + 1]));
      legal.forEach((s) => moves(s).forEach(({ t }) => { if (unsafe(t) || t < s) return; const k = s + "-" + t, a = pos[s], b = pos[t];
        graph.append(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: `stroke:${onPath.has(k) ? "var(--hot)" : showSol && solE.has(k) ? "var(--ok)" : "var(--muted)"};stroke-width:${onPath.has(k) || (showSol && solE.has(k)) ? 7 : 3}` })); }));
      legal.forEach((s) => { const p = pos[s], isCur = s === cur, seen = hist.includes(s);
        graph.append(S("rect", { x: p.x - 50, y: p.y - 22, width: 100, height: 44, rx: 10, style: `fill:${isCur ? "var(--hot)" : seen ? "var(--hot-soft)" : s === 15 ? "var(--ok-soft)" : "var(--surface)"};stroke:${s === 15 || s === 0 ? "var(--ink)" : "var(--muted)"};stroke-width:${s === 15 || s === 0 ? 2.5 : 1.5}` }));
        graph.append(S("text", { x: p.x, y: p.y + 6, "text-anchor": "middle", "font-size": 19, "font-weight": 700, class: "mono", style: isCur ? "fill:#fff" : "" }, label(s))); });
      graph.append(S("text", { x: 60, y: GH - 6, "text-anchor": "middle", "font-size": 18, style: "fill:var(--muted)" }, "start"), S("text", { x: GW - 60, y: GH - 6, "text-anchor": "middle", "font-size": 18, style: "fill:var(--muted)" }, "goal"));
      if (dead) out.innerHTML += ` <span class="muted">(Unsafe states are not even in the graph: 16 − 6 = 10 legal states.)</span>`;
    }
    draw();
    return { repaint: draw };
  });

  /* =======================================================
     0b. Play the 15-puzzle: random (solvable) start, several goals, Loyd's 14–15 challenge
     ======================================================= */
  register("puzzle15", (host, d) => {
    const GOALS = {
      standard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0],
      blankfirst: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      spiral: [1, 2, 3, 4, 12, 13, 14, 5, 11, 0, 15, 6, 10, 9, 8, 7],
      columns: [1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 0],
      snake: [1, 2, 3, 4, 8, 7, 6, 5, 9, 10, 11, 12, 0, 15, 14, 13]
    };
    const GN = { standard: "Standard", blankfirst: "Blank first", spiral: "Spiral", columns: "Columns", snake: "Snake" };
    let gk = d.goal || "standard", goal = GOALS[gk], board = [], moves = 0, loyd = false, depth = 30;
    const nb = (i) => [i - 4, i + 4, i % 4 ? i - 1 : -1, i % 4 < 3 ? i + 1 : -1].filter((j) => j >= 0 && j < 16);
    const parity = (b) => { const a = b.filter((x) => x); let inv = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++; return (inv + (3 - Math.floor(b.indexOf(0) / 4))) % 2; };
    function scramble() {
      board = goal.slice(); let prev = -1;
      for (let k = 0; k < depth; k++) { const z = board.indexOf(0), opts = nb(z).filter((j) => j !== prev); const j = opts[Math.floor(Math.random() * opts.length)]; [board[z], board[j]] = [board[j], board[z]]; prev = z; }
      moves = 0; loyd = false; draw();
    }
    const cell = (v, ok, small, click) => { const e = h("div", { style: `display:flex;align-items:center;justify-content:center;border-radius:${small ? 5 : 10}px;font-weight:700;font-family:var(--mono);font-size:${small ? "0.55em" : "1.1em"};${v ? `background:${ok ? "var(--ok-soft)" : "var(--surface)"};border:2px solid ${ok ? "var(--ok)" : "var(--accent)"};cursor:${click ? "pointer" : "default"};` : "background:transparent;"}` }, v ? String(v) : ""); if (click) e.addEventListener("click", click); return e; };
    const grid = (size, gap) => h("div", { style: `display:grid;grid-template-columns:repeat(4,${size});grid-auto-rows:${size};gap:${gap};padding:${gap};background:var(--line);border-radius:12px;width:max-content` });
    const big = grid("78px", "6px"), small = grid("30px", "3px"), out = h("div", { class: "w-caption" });
    const gb = Object.keys(GOALS).map((k) => { const b = btn(GN[k], () => { gk = k; goal = GOALS[k]; setOn(gb, b); scramble(); }); b.dataset.k = k; return b; });
    const db = [["Easy (15 moves)", 15], ["Medium (40)", 40], ["Hard (random)", 1000]].map(([nm, dd]) => { const b = btn(nm, () => { depth = dd; setOn(db, b); scramble(); }); b.dataset.d = dd; return b; });
    host.append(h("div", { class: "w-toolbar" }, h("span", { class: "tiny muted" }, "goal:"), ...gb), h("div", { class: "w-toolbar" }, h("span", { class: "tiny muted" }, "start:"), ...db, btn("Loyd's $1,000 challenge", () => { gk = "standard"; goal = GOALS.standard; setOn(gb, gb[0]); board = goal.slice(); [board[13], board[14]] = [board[14], board[13]]; moves = 0; loyd = true; draw(); })),
      h("div", { style: "display:flex;gap:2.5em;align-items:center;justify-content:center" }, h("div", { style: "text-align:center" }, h("div", { class: "tiny muted" }, "your board (click a tile next to the gap)"), big), h("div", { style: "text-align:center" }, h("div", { class: "tiny muted" }, "goal"), small)), out);
    setOn(gb, gb.find((b) => b.dataset.k === gk)); setOn(db, db[0]); depth = 15;
    function click(i) {
      const z = board.indexOf(0); if (!nb(z).includes(i)) return;
      [board[z], board[i]] = [board[i], board[z]]; moves++; draw();
    }
    function draw() {
      big.replaceChildren(...board.map((v, i) => cell(v, v && v === goal[i], false, () => click(i))));
      small.replaceChildren(...goal.map((v) => cell(v, false, true)));
      const done = board.every((v, i) => v === goal[i]), placed = board.filter((v, i) => v && v === goal[i]).length, solv = parity(board) === parity(goal);
      out.innerHTML = done ? `<span class="ok"><b>Solved in ${moves} moves!</b></span> (Optimal solutions of random 15-puzzles need up to 80 moves; computers find them with IDA*, session 5.2.)`
        : `Moves: <b>${moves}</b> · tiles in place: <b>${placed}/15</b> · ` + (solv ? `reachable from here: <span class="ok">yes</span>` : `reachable from here: <span class="bad"><b>no!</b></span> ${loyd ? "Sam Loyd offered $1,000 (1880s) for solving this one. Nobody ever collected: every move keeps the <b>parity</b> of the permutation (plus the row of the gap), so exactly half of the 16! arrangements can never reach the goal." : ""}`);
    }
    scramble();
  });

  /* =======================================================
     0c. N-queens with three masks: board + cols / down-right / down-left / free, step by step
     bit i = column i (cells shown in column order, so they line up with the board)
     ======================================================= */
  register("nqmasks", (host, d) => {
    let n = parseInt(d.n || "4", 10), firstOnly = d.first !== "0";
    const sv = mkSvg(1100, 400), stepper = Stepper(draw), stats = h("div", { class: "w-stats" });
    const nb = [4, 5, 6].map((k) => { const b = btn("n = " + k, () => { n = k; setOn(nb, b); build(); }); b.dataset.k = k; return b; });
    const fb = btn("Stop at first solution", () => { firstOnly = !firstOnly; fb.classList.toggle("on", firstOnly); build(); });
    host.append(h("div", { class: "w-toolbar" }, ...nb, fb), sv, stepper.bar, stepper.caption, stats);
    setOn(nb, nb.find((b) => +b.dataset.k === n)); fb.classList.toggle("on", firstOnly);
    const COL = { cols: "#e8590c", dr: "#9c36b5", dl: "#1971c2", free: "#2b8a3e" };
    const bin = (x) => x.toString(2).padStart(n, "0");
    function build() {
      const all = (1 << n) - 1, frames = []; let sols = 0, stop = false;
      const F = (o) => { if (frames.length < 900) frames.push(o); };
      (function solve(row, cols, ld, rd, Q) {
        if (stop) return;
        const avail = all & ~(cols | ld | rd);
        if (row === n) { sols++; F({ Q: Q.slice(), row, cols, ld: ld & all, rd, avail: 0, sol: true, sols, msg: `<span class="ok"><b>Solution ${sols}!</b></span> All ${n} rows have a queen: cols = ${bin(all)}₂. ${firstOnly ? "" : "The recursion continues looking for more."}` }); if (firstOnly) stop = true; return; }
        F({ Q: Q.slice(), row, cols, ld: ld & all, rd, avail, msg: row === 0 ? `Row 0: nothing is attacked yet, every column is free. free = ~(cols | down-right | down-left) & ${bin(all)}₂.` : `Row ${row}: the masks are shifted one column. free = ~(${bin(cols)} | ${bin(ld & all)} | ${bin(rd)}) = <b>${bin(avail)}</b>₂ ${avail ? "" : `→ <span class="bad">no free column: dead end, backtrack</span>`}` });
        let a = avail;
        while (a && !stop) {
          const bit = a & -a, c = 31 - Math.clz32(bit); a -= bit;
          F({ Q: Q.concat(c), row, cols, ld: ld & all, rd, avail, pick: c, msg: `Pick the lowest free column: bit = free &amp; −free → column <b>${c}</b>. Next row: cols | bit, (down-right | bit) &lt;&lt; 1, (down-left | bit) &gt;&gt; 1.` });
          solve(row + 1, cols | bit, (ld | bit) << 1, (rd | bit) >> 1, Q.concat(c));
          if (!stop) F({ Q: Q.slice(), row, cols, ld: ld & all, rd, avail: a, back: c, msg: `Back in row ${row}: remove the queen from column ${c} and try the next free column${a ? "" : " — none left, return"}.` });
        }
      })(0, 0, 0, 0, []);
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const CS = Math.min(84, 336 / n), BX = 60, BY = 40;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        let fill = (r + c) % 2 ? "var(--line)" : "var(--surface)";
        if (r === f.row && !f.sol) { const b = 1 << c; fill = f.avail & b ? "var(--ok-soft)" : "var(--bad-soft)"; }
        sv.append(S("rect", { x: BX + c * CS, y: BY + r * CS, width: CS - 4, height: CS - 4, rx: 7, style: `fill:${fill};stroke:${r === f.row && !f.sol ? "var(--ink)" : "none"};stroke-width:1.5` }));
      }
      for (let c = 0; c < n; c++) sv.append(S("text", { x: BX + c * CS + CS / 2 - 2, y: BY - 12, "text-anchor": "middle", "font-size": 18, class: "mono", style: "fill:var(--muted)" }, String(c)));
      for (let r = 0; r < n; r++) sv.append(S("text", { x: BX - 22, y: BY + r * CS + CS / 2 + 4, "text-anchor": "middle", "font-size": 18, class: "mono", style: "fill:var(--muted)" }, String(r)));
      // diagonal attack rays from placed queens down to the current row
      f.Q.forEach((c, r) => { if (r >= f.row || f.sol) return; const x = BX + c * CS + CS / 2 - 2, y = BY + r * CS + CS / 2 - 2, k = f.row - r, yy = y + k * CS;
        [[1, COL.dr], [-1, COL.dl]].forEach(([s, col]) => { const kk = Math.min(k, s > 0 ? n - 1 - c : c); if (!kk) return; sv.append(S("line", { x1: x, y1: y, x2: x + s * kk * CS, y2: y + kk * CS, style: `stroke:${col};stroke-width:2.5;stroke-dasharray:6 5;opacity:.75` })); });
        sv.append(S("line", { x1: x, y1: y, x2: x, y2: yy, style: `stroke:${COL.cols};stroke-width:2.5;stroke-dasharray:6 5;opacity:.75` })); });
      f.Q.forEach((c, r) => { const cx = BX + c * CS + CS / 2 - 2, cy = BY + r * CS + CS / 2 - 2;
        sv.append(S("circle", { cx, cy, r: CS * 0.32, style: `fill:${f.sol ? "var(--ok)" : r === f.row && f.pick === c ? "var(--hot)" : "#8ce99a"};stroke:var(--ink);stroke-width:1.5` }));
        sv.append(S("text", { x: cx, y: cy + CS * 0.12, "text-anchor": "middle", "font-size": CS * 0.36, "font-weight": 700, style: "fill:#1b4332" }, "Q")); });
      // masks
      const MX = 640, MS = Math.min(66, 380 / n), rows = [["columns", f.cols, COL.cols], ["down-right", f.ld, COL.dr], ["down-left", f.rd, COL.dl], ["free", f.avail, COL.free]];
      rows.forEach(([nm, v, col], k) => {
        const y = BY + k * (MS + 18) + (k === 3 ? 14 : 0);
        sv.append(S("text", { x: MX - 14, y: y + MS / 2 + 7, "text-anchor": "end", "font-size": 20, "font-weight": 700, class: "mono", style: `fill:${col}` }, nm));
        for (let c = 0; c < n; c++) { const on = (v >> c) & 1;
          sv.append(S("rect", { x: MX + c * (MS + 6), y, width: MS, height: MS, rx: 8, style: `fill:${on ? col : "var(--surface)"};fill-opacity:${on ? 0.25 : 1};stroke:${on ? col : "var(--line)"};stroke-width:${on ? 3 : 1.5}` }));
          sv.append(S("text", { x: MX + c * (MS + 6) + MS / 2, y: y + MS / 2 + 9, "text-anchor": "middle", "font-size": 26, "font-weight": 700, class: "mono" }, String(on))); }
        if (k === 3) for (let c = 0; c < n; c++) sv.append(S("text", { x: MX + c * (MS + 6) + MS / 2, y: y + MS + 22, "text-anchor": "middle", "font-size": 16, class: "mono", style: "fill:var(--muted)" }, String(c)));
      });
      const ry = BY + 3 * (MS + 18) + 5; sv.append(S("line", { x1: MX, y1: ry, x2: MX + n * (MS + 6) - 6, y2: ry, style: "stroke:var(--muted);stroke-width:1.5" }));
      sv.append(S("text", { x: 1090, y: BY + 30, "text-anchor": "end", "font-size": 30, "font-weight": 700, class: "mono" }, f.sol ? "solved" : "row " + f.row));
      stats.replaceChildren(stat("n =", n), stat("queens:", f.Q.length), h("span", {}, "mask cells in column order (bit 0 on the left, under column 0)"));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     0d. Romania (Russell & Norvig, Fig. 3.2 / 3.22): greedy best-first vs A* vs uniform cost, Arad → Bucharest
     ======================================================= */
  const RO = {
    pos: { Arad: [91, 492], Bucharest: [400, 327], Craiova: [253, 288], Drobeta: [165, 299], Eforie: [562, 293], Fagaras: [305, 449], Giurgiu: [375, 270], Hirsova: [534, 350], Iasi: [473, 506], Lugoj: [165, 379], Mehadia: [168, 339], Neamt: [406, 537], Oradea: [131, 571], Pitesti: [320, 368], "Rimnicu Vilcea": [233, 410], Sibiu: [207, 457], Timisoara: [94, 410], Urziceni: [456, 350], Vaslui: [509, 444], Zerind: [108, 531] },
    roads: [["Arad", "Zerind", 75], ["Arad", "Sibiu", 140], ["Arad", "Timisoara", 118], ["Bucharest", "Urziceni", 85], ["Bucharest", "Pitesti", 101], ["Bucharest", "Giurgiu", 90], ["Bucharest", "Fagaras", 211], ["Craiova", "Drobeta", 120], ["Craiova", "Rimnicu Vilcea", 146], ["Craiova", "Pitesti", 138], ["Drobeta", "Mehadia", 75], ["Eforie", "Hirsova", 86], ["Fagaras", "Sibiu", 99], ["Hirsova", "Urziceni", 98], ["Iasi", "Vaslui", 92], ["Iasi", "Neamt", 87], ["Lugoj", "Timisoara", 111], ["Lugoj", "Mehadia", 70], ["Oradea", "Zerind", 71], ["Oradea", "Sibiu", 151], ["Pitesti", "Rimnicu Vilcea", 97], ["Rimnicu Vilcea", "Sibiu", 80], ["Urziceni", "Vaslui", 142]],
    h: { Arad: 366, Bucharest: 0, Craiova: 160, Drobeta: 242, Eforie: 161, Fagaras: 176, Giurgiu: 77, Hirsova: 151, Iasi: 226, Lugoj: 244, Mehadia: 241, Neamt: 234, Oradea: 380, Pitesti: 100, "Rimnicu Vilcea": 193, Sibiu: 253, Timisoara: 329, Urziceni: 80, Vaslui: 199, Zerind: 374 }
  };
  register("romania", (host, d) => {
    let algo = d.algo || "astar", start = d.start || "Arad", showH = d.h !== "0";
    const goal = "Bucharest", sv = mkSvg(680, 395), side = h("div", { style: "font-size:0.58em" }), stepper = Stepper(draw);
    const adj = {}; Object.keys(RO.pos).forEach((c) => (adj[c] = [])); RO.roads.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
    const ab = [["greedy", "Greedy best-first: f = h"], ["astar", "A*: f = g + h"], ["ucs", "Uniform cost: f = g"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    const sel = h("select", {}, ...Object.keys(RO.pos).sort().filter((c) => c !== goal).map((c) => h("option", { value: c }, "start: " + c))); sel.value = start;
    sel.addEventListener("change", () => { start = sel.value; build(); }); sel.addEventListener("keydown", (e) => e.stopPropagation());
    const hb = btn("h = straight-line distance to Bucharest", () => { showH = !showH; hb.classList.toggle("on", showH); stepper.repaint(); });
    const mapOnly = d.mode === "map";
    if (mapOnly) host.append(sv);
    else { host.append(h("div", { class: "w-toolbar" }, ...ab, sel, hb)); host.append(h("div", { style: "display:grid;grid-template-columns:1.75fr 1fr;gap:.6em;align-items:start" }, sv, side), stepper.bar, stepper.caption); }
    setOn(ab, ab.find((b) => b.dataset.k === algo)); hb.classList.toggle("on", showH);
    const P = (c) => ({ x: (RO.pos[c][0] - 70) * 1.12 + 75, y: (590 - RO.pos[c][1]) * 1.1 + 18 });
    const LAB = { Arad: "L", Zerind: "L", Timisoara: "L", Bucharest: "B", Urziceni: "T" };
    const fOf = (g, c) => (algo === "greedy" ? RO.h[c] : algo === "ucs" ? g : g + RO.h[c]);
    function build() {
      const frames = [], fr = new Map([[start, { g: 0, par: null }]]), closed = new Set(); let gen = 1;
      const snap = (extra) => Object.assign({ fr: [...fr.entries()].map(([c, v]) => ({ c, g: v.g, par: v.par, f: fOf(v.g, c) })).sort((a, b) => a.f - b.f || a.c.localeCompare(b.c)), closed: [...closed], tree: new Map([...tree]) }, extra);
      const tree = new Map([[start, null]]);
      frames.push(snap({ msg: `Start in ${start}: f(${start}) = ${algo === "greedy" ? `h = ${RO.h[start]}` : algo === "ucs" ? "g = 0" : `0 + ${RO.h[start]} = ${RO.h[start]}`}.` }));
      while (fr.size) {
        let best = null; fr.forEach((v, c) => { const f = fOf(v.g, c); if (!best || f < best.f || (f === best.f && c < best.c)) best = { c, f, g: v.g }; });
        const { c, g } = best, par = fr.get(c).par; fr.delete(c);
        if (c === goal) {
          const path = [c]; let x = c; while (tree.get(x)) { x = tree.get(x); path.unshift(x); }
          frames.push(snap({ cur: c, path, cost: g, msg: `Pop <b>Bucharest</b> (f = ${best.f}): goal reached. Route ${path.join(" → ")}, cost <b>${g} km</b>${algo === "greedy" ? ` — <span class="bad">not optimal</span> (the best route costs 418 km).` : ` — <span class="ok">optimal</span>.`} Expanded ${closed.size} cities, generated ${gen} nodes.` }));
          break;
        }
        closed.add(c);
        const added = [];
        adj[c].forEach(([n, w]) => { if (closed.has(n)) return; const ng = g + w; const old = fr.get(n);
          if (algo === "greedy" ? !old : !old || ng < old.g) { fr.set(n, { g: ng, par: c }); tree.set(n, c); gen++; added.push(`${old ? "cheaper path to " : ""}${n} (${algo === "greedy" ? `h = ${RO.h[n]}` : algo === "ucs" ? `g = ${ng}` : `${ng} + ${RO.h[n]} = ${ng + RO.h[n]}`})`); } });
        frames.push(snap({ cur: c, msg: `Expand <b>${c}</b> (lowest f = ${best.f}). New or cheaper in the frontier: ${added.join(", ") || "nothing"}.` }));
        if (frames.length > 80) break;
      }
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const pathE = new Set(); if (f.path) for (let i = 0; i + 1 < f.path.length; i++) pathE.add([f.path[i], f.path[i + 1]].sort().join("|"));
      const treeE = new Set(); f.tree.forEach((p, c) => { if (p && (f.closed.includes(c) || f.fr.some((e) => e.c === c) || c === f.cur)) treeE.add([p, c].sort().join("|")); });
      RO.roads.forEach(([a, b, w]) => { const A = P(a), B = P(b), k = [a, b].sort().join("|");
        const st = pathE.has(k) ? "stroke:var(--ok);stroke-width:6" : treeE.has(k) ? "stroke:var(--accent);stroke-width:3.5" : "stroke:var(--line);stroke-width:2.5";
        sv.append(S("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, style: st }));
        sv.append(S("text", { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - 3, "text-anchor": "middle", "font-size": 13, class: "mono", style: "fill:var(--muted)" }, String(w))); });
      const inFr = new Map(f.fr.map((e) => [e.c, e]));
      Object.keys(RO.pos).forEach((c) => { const p = P(c), isCur = c === f.cur, cl = f.closed.includes(c), fe = inFr.get(c);
        sv.append(S("circle", { cx: p.x, cy: p.y, r: isCur ? 10 : 7.5, style: `fill:${isCur ? "var(--hot)" : c === goal ? "var(--ok)" : cl ? "var(--muted)" : fe ? "var(--accent)" : "var(--surface)"};stroke:var(--ink);stroke-width:1.5` }));
        const lp = LAB[c] || "R", lines = [[c, "fill:var(--ink)", 16, isCur || fe ? 700 : 400]];
        if (showH) lines.push(["h=" + RO.h[c], "fill:var(--hot)", 13.5, 400]);
        if (fe) lines.push(["f=" + fe.f, "fill:var(--accent)", 14, 700]);
        lines.forEach(([txt, st, fs, fw], k) => {
          const x = lp === "L" ? p.x - 12 : lp === "R" ? p.x + 12 : p.x, anchor = lp === "L" ? "end" : lp === "R" ? "start" : "middle";
          const y = lp === "B" ? p.y + 24 + k * 15 : lp === "T" ? p.y - 14 - (lines.length - 1 - k) * 15 : p.y - 4 + k * 14;
          sv.append(S("text", { x, y, "text-anchor": anchor, "font-size": fs, "font-weight": fw, class: k ? "mono" : null, style: st }, txt)); }); });
      const rows = f.fr.map((e, i) => h("tr", { style: i === 0 ? "background:var(--accent-soft);font-weight:700" : "" }, h("td", {}, e.c), h("td", { class: "mono" }, String(e.g)), h("td", { class: "mono" }, String(RO.h[e.c])), h("td", { class: "mono" }, String(e.f))));
      side.replaceChildren(h("b", {}, "Frontier (priority queue, sorted by f)"), h("table", { class: "tight", style: "margin:.3em 0" }, h("tr", {}, h("th", {}, "city"), h("th", {}, "g"), h("th", {}, "h"), h("th", {}, algo === "greedy" ? "f = h" : algo === "ucs" ? "f = g" : "f = g + h")), ...rows),
        h("div", { class: "tiny muted" }, "Expanded: " + (f.closed.join(", ") || "—")),
        f.path ? h("div", { style: "margin-top:.4em" }, h("b", {}, `Route: ${f.cost} km`)) : "");
    }
    if (mapOnly) draw({ fr: [], closed: [], tree: new Map() }); else build();
    return mapOnly ? { repaint: () => draw({ fr: [], closed: [], tree: new Map() }) } : { stepper };
  });

  /* =======================================================
     0e. IDA* on the Romania map: one DFS per f-limit, tree view
     ======================================================= */
  register("idaromania", (host, d) => {
    const start = d.start || "Arad", goal = "Bucharest";
    const adj = {}; Object.keys(RO.pos).forEach((c) => (adj[c] = [])); RO.roads.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
    Object.values(adj).forEach((l) => l.sort((x, y) => x[0].localeCompare(y[0])));
    const short = (c) => (c === "Rimnicu Vilcea" ? "Rimnicu V." : c);
    const sv = mkSvg(960, 330), side = h("div", { style: "font-size:0.6em" }), stepper = Stepper(draw);
    host.append(h("div", { style: "display:grid;grid-template-columns:2.4fr 1fr;gap:.6em;align-items:start" }, sv, side), stepper.bar, stepper.caption);
    const frames = [], iters = [];
    let bound = RO.h[start], found = null;
    for (let it = 1; it <= 12 && !found; it++) {
      const nodes = [], minOver = { v: Infinity }; let id = 0;
      const F = (o) => frames.push(Object.assign({ it, bound, nodes, sts: nodes.map((x) => x.st), iters: iters.slice() }, o));
      const root = { id: id++, c: start, g: 0, f: RO.h[start], par: null, kids: [], st: "open", depth: 0 };
      nodes.push(root);
      F({ cur: root.id, nNodes: 1, msg: it === 1 ? `Iteration 1: f-limit = f(${start}) = h(${start}) = <b>${bound}</b>. Start a depth-first search that cuts every node with f &gt; ${bound}.` : `Iteration ${it}: new f-limit = <b>${bound}</b> (the smallest f that was cut last time). Start again from ${start}: IDA* keeps NOTHING from the previous iteration.` });
      (function dfs(n, path) {
        if (found) return;
        if (n.f > bound) { n.st = "cut"; minOver.v = Math.min(minOver.v, n.f); F({ cur: n.id, nNodes: nodes.length, msg: `${n.c}: f = ${n.g} + ${RO.h[n.c]} = <b>${n.f}</b> &gt; ${bound} → <span class="bad">cut</span>. Remember ${n.f} as a candidate for the next limit.` }); return; }
        if (n.c === goal) { n.st = "goal"; found = n; F({ cur: n.id, nNodes: nodes.length, goal: true, msg: `${n.c}: f = <b>${n.f}</b> ≤ ${bound} and it is the goal → <span class="ok">solution found, cost ${n.g} km</span> (optimal, h is admissible).` }); return; }
        n.st = "exp";
        const kids = adj[n.c].filter(([c]) => !path.includes(c));
        kids.forEach(([c, w]) => { const k = { id: id++, c, g: n.g + w, f: n.g + w + RO.h[c], par: n.id, kids: [], st: "open", depth: n.depth + 1 }; n.kids.push(k); nodes.push(k); });
        F({ cur: n.id, nNodes: nodes.length, msg: `${n.c}: f = ${n.f} ≤ ${bound} → expand it: ${kids.map(([c]) => c).join(", ") || "no new neighbors"} (cities already on the path are skipped).` });
        for (const k of n.kids) { dfs(k, path.concat(k.c)); if (found) return; }
      })(root, [start]);
      iters.push({ it, bound, gen: nodes.length, next: found ? null : minOver.v });
      if (!found) { F({ endIt: true, nNodes: nodes.length, iters: iters.slice(), msg: `End of iteration ${it}: no solution with f ≤ ${bound}. ${nodes.length} nodes generated. Smallest f that was cut: <b>${minOver.v}</b> → next f-limit.` }); bound = minOver.v; }
      else frames[frames.length - 1].iters = iters.slice();
    }
    // layout per iteration (all nodes of that iteration known at the end)
    const lay = new Map();
    frames.forEach((f) => { if (lay.has(f.nodes)) return; const N = f.nodes, byId = new Map(N.map((n) => [n.id, n])), pos = {}; let leaf = 0;
      (function L(n) { if (!n.kids.length) { pos[n.id] = { x: leaf++, y: n.depth }; return; } n.kids.forEach(L); pos[n.id] = { x: (pos[n.kids[0].id].x + pos[n.kids[n.kids.length - 1].id].x) / 2, y: n.depth }; })(N[0]);
      lay.set(N, { pos, leaves: Math.max(1, leaf), byId }); });
    function draw(f) {
      sv.replaceChildren();
      const { pos, leaves } = lay.get(f.nodes), maxD = Math.max(1, ...f.nodes.map((n) => n.depth)), dx = Math.min(130, 900 / leaves), x0 = 480 - dx * (leaves - 1) / 2, dy = Math.min(78, 270 / maxD);
      const X = (n) => x0 + pos[n.id].x * dx, Y = (n) => 30 + pos[n.id].y * dy, shown = f.nodes.slice(0, f.nNodes);
      const vis = new Set(shown.map((n) => n.id));
      const ST = (n) => f.sts[n.id] || "open";
      shown.forEach((n) => { if (n.par == null) return; const p = f.nodes[n.par]; sv.append(S("line", { x1: X(p), y1: Y(p) + 14, x2: X(n), y2: Y(n) - 14, style: `stroke:${ST(n) === "cut" ? "var(--bad)" : "var(--muted)"};stroke-width:2;${ST(n) === "cut" ? "stroke-dasharray:5 4" : ""}` }));
        sv.append(S("text", { x: (X(p) + X(n)) / 2 + 4, y: (Y(p) + Y(n)) / 2 + 4, "font-size": 12, class: "mono", style: "fill:var(--muted)" }, String(n.g - p.g))); });
      const onPath = new Set(); if (f.goal) { let n = f.nodes.find((x) => x.id === f.cur); while (n) { onPath.add(n.id); n = n.par == null ? null : f.nodes[n.par]; } }
      shown.forEach((n) => { const x = X(n), y = Y(n), cur = n.id === f.cur;
        const fill = onPath.has(n.id) ? "var(--ok)" : ST(n) === "cut" ? "var(--bad-soft)" : ST(n) === "exp" ? "var(--accent-soft)" : "var(--surface)";
        sv.append(S("rect", { x: x - 50, y: y - 15, width: 100, height: 30, rx: 8, style: `fill:${fill};stroke:${cur ? "var(--hot)" : ST(n) === "cut" ? "var(--bad)" : "var(--ink)"};stroke-width:${cur ? 4 : 1.5};${ST(n) === "cut" ? "stroke-dasharray:5 3" : ""}` }));
        sv.append(S("text", { x, y: y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, style: onPath.has(n.id) ? "fill:#fff" : "" }, short(n.c)));
        sv.append(S("text", { x: x + 52, y: y - 8, "font-size": 13, "font-weight": 700, class: "mono", style: `fill:${ST(n) === "cut" ? "var(--bad)" : "var(--accent)"}` }, String(n.f))); });
      sv.append(S("text", { x: 950, y: 22, "text-anchor": "end", "font-size": 20, "font-weight": 700, class: "mono", style: "fill:var(--hot)" }, `f-limit = ${f.bound}`));
      side.replaceChildren(h("b", {}, `Iteration ${f.it}`), h("table", { class: "tight", style: "margin:.3em 0" }, h("tr", {}, h("th", {}, "it."), h("th", {}, "f-limit"), h("th", {}, "nodes"), h("th", {}, "next")),
        ...f.iters.map((r) => h("tr", {}, h("td", {}, String(r.it)), h("td", { class: "mono" }, String(r.bound)), h("td", { class: "mono" }, String(r.gen)), h("td", { class: "mono" }, r.next == null ? "✓" : String(r.next))))),
        h("div", { class: "tiny muted" }, "Numbers next to the boxes: f = g + h. Red dashed = cut (f > limit). Memory: only the current path."));
    }
    stepper.set(frames);
    return { stepper };
  });

  /* =======================================================
     1. Blind search on a tree: BFS · DFS · DLS · IDS
     ======================================================= */
  register("treesearch", (host, d) => {
    const W = 900, H = 330, B = 2, DEPTH = 3; // nodes 1..15 (binary tree, like the classic slides)
    const N = (1 << (DEPTH + 1)) - 1;
    let algo = d.algo || "bfs", goal = parseInt(d.goal || "11", 10), limit = 2;
    const sv = mkSvg(W, H);
    const fringe = h("div", { class: "cells", style: "min-height:2.2em;align-items:center" });
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const ab = [["bfs", "Breadth-first"], ["dfs", "Depth-first"], ["dls", "Depth-limited (ℓ = 2)"], ["ids", "Iterative deepening"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); build(); }); b.dataset.k = k; return b; });
    const sel = h("select", {}, ...Array.from({ length: N }, (_, i) => h("option", { value: i + 1 }, "goal = " + (i + 1)))); sel.value = goal;
    sel.addEventListener("change", () => { goal = +sel.value; build(); });
    host.append(h("div", { class: "w-toolbar" }, ...ab, sel), sv, h("div", { class: "w-toolbar" }, h("label", {}, "FRINGE:"), fringe), stepper.bar, stepper.caption, stats);
    setOn(ab, ab.find((b) => b.dataset.k === algo));
    const depthOf = (v) => Math.floor(Math.log2(v));
    const kids = (v) => (depthOf(v) < DEPTH ? [2 * v, 2 * v + 1] : []);
    const pos = (v) => { const dd = depthOf(v), i = v - (1 << dd), cnt = 1 << dd; return { x: (i + 0.5) * W / cnt, y: 34 + dd * 88 }; };
    function build() {
      const frames = []; let expanded = 0, maxF = 1;
      const snap = (o) => frames.push(Object.assign({ expanded, maxF }, o));
      function run(lim, iter) { // generic: queue (BFS) or stack (DFS); lim = depth limit or Infinity
        let F = [1]; const closed = [];
        snap({ F: F.slice(), closed: [], cur: null, iter, msg: iter != null ? `<b>Iteration ℓ = ${lim}</b>: depth-first search, nodes deeper than ${lim} are not expanded` : "FRINGE = (1). The root is the only node to expand." });
        while (F.length) {
          const v = algo === "bfs" ? F.shift() : F.shift();
          if (v === goal) { closed.push(v); snap({ F: F.slice(), closed: closed.slice(), cur: v, found: true, iter, msg: `Node ${v} is the <span class="ok">goal</span> → stop. Path: ${pathTo(v).join(" → ")}` }); return true; }
          closed.push(v); expanded++;
          let ch = depthOf(v) < lim ? kids(v) : [];
          if (algo === "bfs") F = F.concat(ch); else F = ch.concat(F); // BFS: append at end · DFS: insert at front
          maxF = Math.max(maxF, F.length);
          snap({ F: F.slice(), closed: closed.slice(), cur: v, iter, msg: `Expand ${v}: ${ch.length ? "children " + ch.join(", ") + (algo === "bfs" ? " go to the <b>end</b> of the FRINGE (queue)" : " go to the <b>front</b> of the FRINGE (stack)") : depthOf(v) >= lim && depthOf(v) < DEPTH ? "<span class='hot'>cutoff</span> — depth limit reached" : "leaf, no children"}` });
        }
        return false;
      }
      const pathTo = (v) => { const p = []; while (v >= 1) { p.unshift(v); v = Math.floor(v / 2); } return p; };
      if (algo === "bfs") run(Infinity);
      else if (algo === "dfs") run(Infinity);
      else if (algo === "dls") { if (!run(limit)) snap({ F: [], closed: [], cur: null, msg: `<span class="bad">Cutoff</span>: no solution within depth ${limit} (the goal is at depth ${depthOf(goal)})` }); }
      else { for (let L = 0; L <= DEPTH; L++) if (run(L, L)) break; }
      frames[frames.length - 1].msg += ` · <b>${expanded}</b> nodes expanded, max FRINGE size <b>${maxF}</b>`;
      stepper.set(frames);
    }
    function draw(f) {
      sv.replaceChildren();
      const closed = new Set(f.closed), inF = new Set(f.F);
      for (let v = 2; v <= N; v++) { const a = pos(Math.floor(v / 2)), b = pos(v); sv.append(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: "stroke:var(--line);stroke-width:2" })); }
      for (let v = 1; v <= N; v++) {
        const p = pos(v), isG = v === goal;
        const fill = v === f.cur ? (f.found ? "var(--ok)" : "var(--hot)") : closed.has(v) ? "var(--accent-soft)" : inF.has(v) ? "var(--hot-soft)" : "var(--surface)";
        const stroke = isG ? "var(--ok)" : inF.has(v) ? "var(--hot)" : closed.has(v) ? "var(--accent)" : "var(--line)";
        sv.append(S("circle", { cx: p.x, cy: p.y, r: 22, style: `fill:${fill};stroke:${stroke};stroke-width:${isG ? 4 : 2.5}` + (inF.has(v) ? ";stroke-dasharray:5 3" : "") }));
        sv.append(S("text", { x: p.x, y: p.y + 7, "text-anchor": "middle", "font-size": 19, "font-weight": 700, style: v === f.cur ? "fill:#fff" : "" }, String(v)));
      }
      if (f.iter != null) sv.append(S("line", { x1: 0, y1: 34 + f.iter * 88 + 40, x2: W, y2: 34 + f.iter * 88 + 40, style: "stroke:var(--hot);stroke-width:2;stroke-dasharray:8 6" }));
      fringe.replaceChildren(...(f.F.length ? f.F.map((v) => chip(v, "ref")) : [h("span", { class: "tiny muted" }, "empty")]));
      stats.replaceChildren(stat("expanded:", f.expanded), stat("max FRINGE:", f.maxF), h("span", {}, "◯ dashed = in FRINGE (open) · blue = expanded (closed) · green ring = goal"));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     2. Grid path-finding: BFS · DFS · Dijkstra · Greedy · A* · weighted A*
     ======================================================= */
  register("gridsearch", (host, d) => {
    const C = 26, R = 15, S0 = 36, W = C * S0, H = R * S0;
    let algo = d.algo || "astar", tool = "wall";
    let start = { x: 3, y: 7 }, goal = { x: 22, y: 7 };
    const grid = Array.from({ length: R }, () => Array(C).fill(0)); // 0 free, 1 wall, 2 mud (cost 5)
    const preset = d.preset || "wall";
    function loadPreset(name) {
      grid.forEach((r) => r.fill(0));
      if (name === "wall") { for (let y = 2; y <= 12; y++) grid[y][13] = 1; for (let x = 8; x <= 13; x++) grid[2][x] = 1; for (let x = 8; x <= 13; x++) grid[12][x] = 1; }
      if (name === "mud") { for (let y = 0; y < R; y++) for (let x = 9; x <= 16; x++) if (y > 2 && y < 12) grid[y][x] = 2; }
      if (name === "maze") { const r = rng(5); for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (r() < 0.28) grid[y][x] = 1; grid[start.y][start.x] = 0; grid[goal.y][goal.x] = 0; }
    }
    loadPreset(preset);
    const sv = mkSvg(W, H, "cursor:crosshair");
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const ab = [["bfs", "BFS"], ["dfs", "DFS"], ["ucs", "Dijkstra / UCS"], ["greedy", "Greedy best-first"], ["astar", "A* (Manhattan)"], ["wastar", "Weighted A* (w = 3)"]].map(([k, nm]) => { const b = btn(nm, () => { algo = k; setOn(ab, b); run(); }); b.dataset.k = k; return b; });
    const tb = [["wall", "draw walls"], ["mud", "draw mud (cost 5)"], ["erase", "erase"]].map(([k, nm]) => { const b = btn(nm, () => { tool = k; setOn(tb, b); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...ab), h("div", { class: "w-toolbar" }, ...tb,
      btn("Wall preset", () => { loadPreset("wall"); run(); }), btn("Mud preset", () => { loadPreset("mud"); run(); }), btn("Random maze", () => { loadPreset("maze"); run(); }), btn("Clear", () => { loadPreset("none"); run(); })),
      sv, stepper.bar, stepper.caption, stats);
    setOn(ab, ab.find((b) => b.dataset.k === algo)); setOn(tb, tb[0]);
    let painting = false, dragging = null;
    const cellAt = (e) => { const p = svgPoint(sv, e); return { x: Math.floor(p.x / S0), y: Math.floor(p.y / S0) }; };
    const inside = (c) => c.x >= 0 && c.y >= 0 && c.x < C && c.y < R;
    sv.addEventListener("pointerdown", (e) => {
      const c = cellAt(e); if (!inside(c)) return; sv.setPointerCapture(e.pointerId);
      if (c.x === start.x && c.y === start.y) dragging = "s"; else if (c.x === goal.x && c.y === goal.y) dragging = "g"; else { painting = true; paint(c); }
    });
    sv.addEventListener("pointermove", (e) => {
      const c = cellAt(e); if (!inside(c)) return;
      if (dragging) { if (grid[c.y][c.x] !== 1) { if (dragging === "s") start = c; else goal = c; run(); } }
      else if (painting) paint(c);
    });
    sv.addEventListener("pointerup", () => { if (painting) run(); painting = false; dragging = null; });
    function paint(c) { if ((c.x === start.x && c.y === start.y) || (c.x === goal.x && c.y === goal.y)) return; grid[c.y][c.x] = tool === "wall" ? 1 : tool === "mud" ? 2 : 0; draw({ exp: [], open: [], path: null, n: 0 }); }
    const cost = (c) => (grid[c.y][c.x] === 2 ? 5 : 1);
    const manh = (a) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
    function run() {
      const key = (c) => c.y * C + c.x;
      const g = new Map([[key(start), 0]]), par = new Map(), closed = new Set();
      let open = [{ c: start, g: 0, f: 0, t: 0 }]; let t = 0;
      const frames = []; const exp = [];
      const prio = (node) => algo === "ucs" ? node.g : algo === "greedy" ? manh(node.c) : algo === "astar" ? node.g + manh(node.c) : algo === "wastar" ? node.g + 3 * manh(node.c) : 0;
      let found = null, guard = 0;
      while (open.length && guard++ < 5000) {
        let i = 0;
        if (algo === "bfs") i = 0; else if (algo === "dfs") i = open.length - 1;
        else { for (let j = 1; j < open.length; j++) if (open[j].f < open[i].f || (open[j].f === open[i].f && open[j].t > open[i].t)) i = j; }
        const cur = open.splice(i, 1)[0]; const k = key(cur.c);
        if (closed.has(k)) continue;
        closed.add(k); exp.push(cur.c);
        if (cur.c.x === goal.x && cur.c.y === goal.y) { found = cur; break; }
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const n = { x: cur.c.x + dx, y: cur.c.y + dy }; if (!inside(n) || grid[n.y][n.x] === 1) continue;
          const nk = key(n), ng = cur.g + cost(n);
          if (closed.has(nk)) continue;
          if (algo === "bfs" || algo === "dfs") { if (g.has(nk)) continue; }
          else if (g.has(nk) && g.get(nk) <= ng) continue;
          g.set(nk, ng); par.set(nk, cur.c);
          const node = { c: n, g: ng, t: ++t }; node.f = prio(node); open.push(node);
        }
        if (exp.length % 3 === 0) frames.push({ exp: exp.slice(), open: open.map((o) => o.c), n: exp.length });
      }
      let path = null, pc = 0;
      if (found) { path = []; let c = goal; while (c) { path.unshift(c); pc += (c === start ? 0 : cost(c)); c = par.get(key(c)); if (c && c.x === start.x && c.y === start.y) { path.unshift(c); break; } } pc = g.get(key(goal)); }
      const names = { bfs: "BFS", dfs: "DFS", ucs: "Dijkstra/UCS", greedy: "Greedy best-first", astar: "A*", wastar: "Weighted A*" };
      frames.push({ exp: exp.slice(), open: open.map((o) => o.c), path, n: exp.length, pc, msg: found ? `${names[algo]}: expanded <b>${exp.length}</b> cells, path cost <b>${pc}</b>${(algo === "bfs" || algo === "dfs") && hasMud() ? " (BFS/DFS ignore cell costs!)" : ""}` : `${names[algo]}: no path` });
      frames[0].msg = frames[0].msg || "Press Play to watch the search. Drag S or G, draw walls or mud.";
      stepper.set(frames, "end");
    }
    const hasMud = () => grid.some((r) => r.includes(2));
    function draw(f) {
      sv.replaceChildren();
      const ex = new Set((f.exp || []).map((c) => c.y * C + c.x)), op = new Set((f.open || []).map((c) => c.y * C + c.x)), pa = new Set((f.path || []).map((c) => c.y * C + c.x));
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        const k = y * C + x, v = grid[y][x];
        let fill = v === 1 ? "var(--ink)" : v === 2 ? "#b08a5a" : "var(--surface)";
        if (v !== 1 && ex.has(k)) fill = v === 2 ? "#8e6f48" : "var(--accent-soft)";
        if (v !== 1 && op.has(k)) fill = "var(--hot-soft)";
        sv.append(S("rect", { x: x * S0 + 1, y: y * S0 + 1, width: S0 - 2, height: S0 - 2, rx: 4, style: `fill:${fill};stroke:var(--line);stroke-width:1` }));
        if (pa.has(k)) sv.append(S("circle", { cx: x * S0 + S0 / 2, cy: y * S0 + S0 / 2, r: 8, style: "fill:var(--ok)" }));
      }
      [[start, "S", "var(--accent)"], [goal, "G", "var(--ok)"]].forEach(([c, t, col]) => { sv.append(S("rect", { x: c.x * S0 + 2, y: c.y * S0 + 2, width: S0 - 4, height: S0 - 4, rx: 6, style: `fill:${col}` })); sv.append(S("text", { x: c.x * S0 + S0 / 2, y: c.y * S0 + S0 / 2 + 8, "text-anchor": "middle", "font-size": 22, "font-weight": 700, style: "fill:#fff" }, t)); });
      stats.replaceChildren(stat("expanded:", f.n || 0), stat("path cost:", f.pc != null ? f.pc : "—"), h("span", {}, "blue = expanded · orange = frontier · green = path · brown = mud (cost 5)"));
    }
    run();
    return { stepper };
  });

  /* =======================================================
     3. Bit playground
     ======================================================= */
  register("bits", (host) => {
    let x = 44, y = 26, n = 8;
    const out = h("div");
    host.append(out);
    const bitsRow = (v, label, clickable, set) => h("div", { style: "display:flex;gap:6px;align-items:center;margin:2px 0;font-size:0.92em" },
      h("span", { class: "mono", style: "width:7.5em;font-size:0.55em;text-align:right;color:var(--muted)" }, label),
      ...Array.from({ length: n }, (_, k) => { const bit = n - 1 - k, on = (v >> bit) & 1; return h("div", { class: "cell " + (on ? "act" : ""), style: `width:2.1em;${clickable ? "cursor:pointer" : ""}`, onclick: clickable ? () => set(v ^ (1 << bit)) : null }, h("span", { class: "idx" }, bit), String(on)); }),
      h("span", { class: "mono", style: "font-size:0.6em;margin-left:.6em" }, "= " + v));
    function draw() {
      const m = (1 << n) - 1;
      const ops = [["x & y", x & y, "intersection"], ["x | y", x | y, "union"], ["x ^ y", x ^ y, "XOR: symmetric difference"], ["x & ~y", x & ~y & m, "x minus y"], ["x & (x−1)", x & (x - 1), "remove lowest set bit"], ["x & −x", x & -x & m, "lowest set bit only"], ];
      let pc = 0; for (let t = x; t; t &= t - 1) pc++;
      out.replaceChildren(
        
        bitsRow(x, "x", true, (v) => { x = v; draw(); }), bitsRow(y, "y", true, (v) => { y = v; draw(); }),
        h("div", { style: "height:.4em" }),
        ...ops.map(([lab, v, why]) => h("div", { style: "display:flex;align-items:center" }, bitsRow(v, lab, false), h("span", { class: "tiny muted", style: "margin-left:1em" }, why))),
        h("p", { class: "small", style: "margin:.4em 0 0" }, `popcount(x) = ${pc} · x has bit 3? (x >> 3) & 1 = ${(x >> 3) & 1} · set bit 0: x | 1 = ${x | 1}`));
    }
    draw();
  });

  /* =======================================================
     4. N-Queens with bitmasks (cols, left diag, right diag)
     ======================================================= */
  register("nqbits", (host, d) => {
    let N = parseInt(d.n || "6", 10);
    const board = h("div", { class: "board" });
    const masks = h("div", { style: "flex:1" });
    const stepper = Stepper(draw);
    const sel = h("select", {}, ...[4, 5, 6, 7, 8].map((k) => h("option", { value: k }, k + " × " + k))); sel.value = N;
    sel.addEventListener("change", () => { N = +sel.value; build(); });
    const bench = h("div", { class: "w-caption" });
    host.append(h("div", { class: "w-toolbar" }, sel, btn("Count all solutions N = 4…13", benchRun)), h("div", { style: "display:flex;gap:1.2em;align-items:flex-start" }, board, masks), stepper.bar, stepper.caption, bench);
    const bs = (v) => v.toString(2).padStart(N, "0").slice(-N);
    function build() {
      const frames = []; const full = (1 << N) - 1; const rows = []; let nodes = 0, sols = 0;
      function rec(row, cols, ld, rd) {
        if (row === N) { sols++; if (sols === 1) frames.push({ q: rows.slice(), cols, ld, rd, avail: 0, row, nodes, msg: `<span class="ok">First solution!</span> (${nodes} nodes so far)` }); return sols >= 1; }
        let avail = full & ~(cols | ld | rd);
        frames.push({ q: rows.slice(), cols, ld, rd, avail, row, nodes, msg: `Row ${row + 1}: available = ~(cols | ld | rd) = <span class="mono">${bs(avail)}</span>${avail ? "" : ' → <span class="bad">no free square: backtrack</span>'}` });
        while (avail) {
          const bit = avail & -avail; avail ^= bit; nodes++;
          rows.push(31 - Math.clz32(bit));
          if (rec(row + 1, cols | bit, ((ld | bit) << 1) & full, (rd | bit) >> 1)) return true;
          rows.pop();
        }
        return false;
      }
      rec(0, 0, 0, 0);
      stepper.set(frames);
    }
    function draw(f) {
      board.style.gridTemplateColumns = `repeat(${N}, 42px)`; board.replaceChildren();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const bitIdx = N - 1 - c; // column c drawn left→right = bit N-1-c
        const sq = h("div", { class: "sq " + ((r + c) % 2 ? "d" : "l"), style: "width:42px;height:42px;font-size:26px" });
        if (f.q[r] === bitIdx) sq.textContent = "♛";
        if (r === f.row && (f.avail >> bitIdx) & 1) sq.classList.add("try");
        board.append(sq);
      }
      const row = (lab, v, cls) => h("div", { style: "display:flex;gap:4px;align-items:center;margin:3px 0" }, h("span", { class: "mono", style: "width:6em;font-size:0.5em;color:var(--muted)" }, lab), ...bs(v).split("").map((b) => h("div", { class: "cell " + (b === "1" ? cls : ""), style: "width:1.7em" }, b)));
      masks.replaceChildren(row("cols", f.cols, "mid"), row("ld (↙ diag)", f.ld, "mid"), row("rd (↘ diag)", f.rd, "mid"), row("available", f.avail, "good"),
        h("p", { class: "tiny muted" }, "Next row: cols | bit · (ld | bit) << 1 · (rd | bit) >> 1. Pick bits with  bit = avail & −avail."));
    }
    function benchRun() {
      const lines = [];
      for (let n = 4; n <= 13; n++) {
        const t0 = performance.now(); const full = (1 << n) - 1; let cnt = 0;
        (function rec(cols, ld, rd) { if (cols === full) { cnt++; return; } let av = full & ~(cols | ld | rd); while (av) { const b = av & -av; av ^= b; rec(cols | b, ((ld | b) << 1) & full, (rd | b) >> 1); } })(0, 0, 0);
        lines.push(`N=${n}: <b>${cnt.toLocaleString()}</b> (${(performance.now() - t0).toFixed(0)} ms)`);
      }
      bench.innerHTML = "All solutions with bitmasks, in your browser: " + lines.join(" · ");
    }
    build();
    return { stepper };
  });

  /* =======================================================
     5. Pruning lab: subset sum backtracking with/without pruning
     ======================================================= */
  register("pruning", (host, d) => {
    let n = parseInt(d.n || "24", 10), seed = 3;
    const out = h("div");
    const opts = { feas: true, bound: true, sort: true, stop: false };
    const cbs = [["feas", "feasibility: stop if sum > T"], ["bound", "bound: stop if sum + remaining < T"], ["sort", "order: try big numbers first"], ["stop", "stop at first solution"]].map(([k, lab]) => {
      const cb = h("input", { type: "checkbox" }); cb.checked = opts[k]; cb.addEventListener("change", () => { opts[k] = cb.checked; }); return h("label", { style: "font-size:0.55em;color:var(--ink);margin-right:1em" }, cb, " " + lab);
    });
    const sel = h("select", {}, ...[16, 20, 24, 28].map((k) => h("option", { value: k }, "n = " + k))); sel.value = n; sel.addEventListener("change", () => { n = +sel.value; });
    const hist = [];
    host.append(h("div", { class: "w-toolbar" }, ...cbs), h("div", { class: "w-toolbar" }, sel, btn("Run", runOnce), btn("New instance", () => { seed++; hist.length = 0; runOnce(); })), out);
    function inst() { const r = rng(seed); const a = Array.from({ length: n }, () => 1 + Math.floor(r() * 1000)); const T = Math.floor(a.reduce((s, x) => s + x, 0) * 0.37); return { a, T }; }
    function runOnce() {
      const { a: raw, T } = inst(); const a = opts.sort ? raw.slice().sort((x, y) => y - x) : raw.slice();
      const suf = Array(n + 1).fill(0); for (let i = n - 1; i >= 0; i--) suf[i] = suf[i + 1] + a[i];
      let nodes = 0, sols = 0, stopped = false; const LIMIT = 3e7; const t0 = performance.now();
      (function rec(i, s) {
        if (stopped) return; nodes++; if (nodes > LIMIT) { stopped = true; return; }
        if (s === T) { sols++; if (opts.stop) { stopped = true; return; } }
        if (i === n) return;
        if (opts.feas && s > T) return;
        if (opts.bound && s + suf[i] < T) return;
        rec(i + 1, s + a[i]); rec(i + 1, s);
      })(0, 0);
      const ms = performance.now() - t0;
      const label = Object.entries(opts).filter(([, v]) => v).map(([k]) => k).join(" + ") || "no pruning";
      hist.push({ label, nodes, ms, sols, capped: nodes > LIMIT }); if (hist.length > 6) hist.shift();
      const mx = Math.max(...hist.map((x) => x.nodes));
      out.replaceChildren(h("p", { class: "small", style: "margin:.2em 0" }, `n = ${n} numbers, target T = ${T}. Full tree: 2^${n + 1} − 1 = ${(2 ** (n + 1) - 1).toLocaleString()} nodes.`),
        ...hist.map((x) => h("div", { style: "display:grid;grid-template-columns:16em 1fr 13em;gap:.6em;align-items:center;font-size:0.55em;margin:4px 0" },
          h("span", { class: "mono" }, x.label), h("div", { style: `height:20px;border-radius:5px;background:var(--accent);width:${Math.max(0.5, Math.log10(x.nodes + 1) / Math.log10(mx + 1) * 100)}%` }),
          h("span", { class: "mono" }, `${x.nodes.toLocaleString()}${x.capped ? "+" : ""} nodes · ${x.ms.toFixed(0)} ms${opts.stop ? "" : " · " + x.sols + " sol."}`))),
        h("p", { class: "tiny muted" }, "Bars use a log scale. Toggle the options and press Run to compare."));
    }
    runOnce();
  });

  /* =======================================================
     6. Meet in the middle — subset sum with two pointers
     ======================================================= */
  register("mitm", (host, d) => {
    const A0 = (d.input || "3,34,4,12,5,2,27,9").split(",").map(Number), T = parseInt(d.target || "40", 10);
    const half = A0.length >> 1, L = A0.slice(0, half), R = A0.slice(half);
    const sums = (arr) => { const out = []; for (let m = 0; m < 1 << arr.length; m++) { let s = 0; arr.forEach((v, i) => { if (m >> i & 1) s += v; }); out.push({ s, m }); } return out.sort((p, q) => p.s - q.s); };
    const SL = sums(L), SR = sums(R);
    const stage = h("div");
    const stepper = Stepper(draw);
    host.append(h("p", { class: "small", style: "margin:.2em 0" }, `Numbers: [${L.join(", ")}] | [${R.join(", ")}] · target T = ${T}. Brute force: 2^${A0.length} = ${2 ** A0.length} subsets. Meet in the middle: 2·2^${half} = ${2 * 2 ** half} half-sums.`), stage, stepper.bar, stepper.caption);
    const frames = []; let i = 0, j = SR.length - 1, found = null, steps = 0;
    frames.push({ i: -1, j: -1, msg: "Enumerate all subset sums of each half and sort them. Then walk two pointers: left list ascending, right list descending." });
    while (i < SL.length && j >= 0) {
      const s = SL[i].s + SR[j].s; steps++;
      if (s === T) { found = [i, j]; frames.push({ i, j, hit: true, msg: `${SL[i].s} + ${SR[j].s} = <b>${T}</b> <span class="ok">✓ found</span> after ${steps} comparisons` }); break; }
      frames.push({ i, j, msg: `${SL[i].s} + ${SR[j].s} = ${s} ${s < T ? "&lt; T → move the left pointer right" : "&gt; T → move the right pointer left"}` });
      if (s < T) i++; else j--;
    }
    if (!found) frames.push({ i: -1, j: -1, msg: "Pointers crossed: no subset sums to T." });
    else { const pick = []; L.forEach((v, k) => { if (SL[found[0]].m >> k & 1) pick.push(v); }); R.forEach((v, k) => { if (SR[found[1]].m >> k & 1) pick.push(v); }); frames[frames.length - 1].msg += ` · subset {${pick.join(", ")}}`; }
    function draw(f) {
      const col = (list, ptr, label) => h("div", {}, h("div", { class: "tiny muted" }, label), h("div", { class: "cells" }, ...list.map((e, k) => h("div", { class: "cell " + (k === ptr ? (f.hit ? "found" : "mid") : ""), style: "min-width:2.4em" }, String(e.s)))));
      stage.replaceChildren(col(SL, f.i, `sums of the left half (${SL.length}), sorted ↑ — pointer moves →`), h("div", { style: "height:.5em" }), col(SR, f.j, `sums of the right half (${SR.length}), sorted ↑ — pointer starts at the right and moves ←`));
    }
    stepper.set(frames);
    return { stepper };
  });

  /* =======================================================
     7. 8-puzzle with IDA* (misplaced tiles vs Manhattan)
     ======================================================= */
  register("puzzle8", (host, d) => {
    const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    const presets = { easy: [1, 2, 3, 4, 0, 6, 7, 5, 8], medium: [1, 8, 5, 4, 3, 6, 7, 2, 0], hard: [8, 6, 7, 2, 5, 4, 3, 0, 1] };
    let start = presets[d.preset || "medium"].slice(), heur = "manhattan";
    const boardEl = h("div", { style: "display:grid;grid-template-columns:repeat(3,64px);gap:6px" });
    const log = h("div", { style: "flex:1;font-size:0.55em" });
    const stepper = Stepper(draw);
    const hb = [["misplaced", "h₁ = misplaced tiles"], ["manhattan", "h₂ = Manhattan distance"]].map(([k, nm]) => { const b = btn(nm, () => { heur = k; setOn(hb, b); solve(); }); b.dataset.k = k; return b; });
    host.append(h("div", { class: "w-toolbar" }, ...hb, btn("Easy", () => { start = presets.easy.slice(); solve(); }), btn("Medium (16 moves)", () => { start = presets.medium.slice(); solve(); }), btn("Hard (31 moves)", () => { start = presets.hard.slice(); solve(); }), btn("Shuffle 20", () => { start = shuffle(20); solve(); })),
      h("div", { style: "display:flex;gap:1.5em;align-items:flex-start" }, boardEl, log), stepper.bar, stepper.caption);
    setOn(hb, hb[1]);
    const h1 = (s) => s.reduce((c, v, i) => c + (v && v !== GOAL[i] ? 1 : 0), 0);
    const h2 = (s) => s.reduce((c, v, i) => { if (!v) return c; const g = v - 1; return c + Math.abs((i % 3) - (g % 3)) + Math.abs(Math.floor(i / 3) - Math.floor(g / 3)); }, 0);
    const nbrs = (z) => [[-3, z >= 3], [3, z < 6], [-1, z % 3 > 0], [1, z % 3 < 2]].filter((x) => x[1]).map((x) => z + x[0]);
    function shuffle(k) { let s = GOAL.slice(), z = 8, prev = -1; const r = rng(Math.floor(Math.random() * 1e6)); for (let i = 0; i < k; i++) { const opts = nbrs(z).filter((q) => q !== prev); const q = opts[Math.floor(r() * opts.length)]; [s[z], s[q]] = [s[q], s[z]]; prev = z; z = q; } return s; }
    function solve() {
      const hf = heur === "manhattan" ? h2 : h1;
      const tiles = start.filter((v) => v); let inv = 0; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (tiles[i] > tiles[j]) inv++;
      if (inv % 2) { stepper.set([{ board: start.slice(), iters: [], total: 0, msg: `<span class="bad">Unsolvable</span>: odd number of inversions (${inv}). Half of all 9! arrangements can't reach the goal.` }]); return; }
      let bound = hf(start); const iters = []; let total = 0, path = null;
      const s = start.slice(); const moves = [];
      for (let it = 0; it < 60 && !path; it++) {
        let nodes = 0, next = Infinity;
        const dfs = (g, z, prev) => {
          nodes++; const f = g + hf(s);
          if (f > bound) { next = Math.min(next, f); return false; }
          if (hf(s) === 0) return true;
          for (const q of nbrs(z)) { if (q === prev) continue; [s[z], s[q]] = [s[q], s[z]]; moves.push(q); if (dfs(g + 1, q, z)) return true; moves.pop(); [s[z], s[q]] = [s[q], s[z]]; if (nodes > 4e6) return false; }
          return false;
        };
        const ok = dfs(0, s.indexOf(0), -1); total += nodes; iters.push({ bound, nodes });
        if (ok) path = moves.slice(); else if (next === Infinity || nodes > 4e6) break; else bound = next;
      }
      // frames: one per iteration, then solution playback
      const frames = [];
      iters.forEach((x, k) => frames.push({ board: start.slice(), iters: iters.slice(0, k + 1), total: iters.slice(0, k + 1).reduce((a, y) => a + y.nodes, 0), msg: `Iteration ${k + 1}: depth-first search with f-limit <b>${x.bound}</b> → ${x.nodes.toLocaleString()} nodes${k < iters.length - 1 ? `; smallest f above the limit becomes the next limit` : path ? ` → <span class="ok">solution found</span>` : ""}` }));
      if (path) { let b = start.slice(), z = b.indexOf(0); path.forEach((q, k) => { [b[z], b[q]] = [b[q], b[z]]; z = q; frames.push({ board: b.slice(), iters, total, move: k + 1, msg: `Optimal solution: move ${k + 1} of ${path.length}` }); }); }
      stepper.set(frames);
    }
    function draw(f) {
      boardEl.replaceChildren(...f.board.map((v) => h("div", { style: `height:64px;display:flex;align-items:center;justify-content:center;border-radius:10px;font:700 30px var(--mono);${v ? "background:var(--accent);color:#fff" : "background:var(--line)"}` }, v ? String(v) : "")));
      log.replaceChildren(h("div", { class: "mono", style: "margin-bottom:.4em" }, `h(start) = ${(heur === "manhattan" ? h2 : h1)(start)} · heuristic: ${heur === "manhattan" ? "Manhattan" : "misplaced"}`),
        ...f.iters.map((x, k) => h("div", { style: "display:grid;grid-template-columns:7em 1fr 7em;gap:.5em;align-items:center;margin:2px 0" }, h("span", { class: "mono" }, `limit ${x.bound}`), h("div", { style: `height:14px;border-radius:4px;background:var(--hot);width:${Math.max(1, Math.log10(x.nodes + 1) / 7 * 100)}%` }), h("span", { class: "mono" }, x.nodes.toLocaleString()))),
        h("div", { class: "mono", style: "margin-top:.4em" }, `total nodes: ${f.total.toLocaleString()} · memory: O(depth)`));
    }
    solve();
    return { stepper };
  });

  /* =======================================================
     8. Landscape: hill climbing, random restarts, simulated annealing
     ======================================================= */
  register("landscape", (host, d) => {
    const W = 900, H = 300, NX = 200;
    const fx = (x) => 0.55 * Math.sin(x * 0.11) + 0.35 * Math.sin(x * 0.047 + 1) + 0.25 * Math.sin(x * 0.29 + 2) + 0.9 * Math.exp(-((x - 150) ** 2) / 120);
    let mode = d.mode || "hill", T0 = 1.5, alpha = 0.99, seed = d.seed ? +d.seed : (d.mode === "sa" ? 4 : 5);
    const sv = mkSvg(W, H);
    const stats = h("div", { class: "w-stats" });
    const stepper = Stepper(draw);
    const mb = [["hill", "Hill climbing"], ["restart", "Random restarts (×6)"], ["sa", "Simulated annealing"]].map(([k, nm]) => { const b = btn(nm, () => { mode = k; setOn(mb, b); build(); }); b.dataset.k = k; return b; });
    const tS = h("input", { type: "range", min: 0.05, max: 3, step: 0.05, value: T0 }), aS = h("input", { type: "range", min: 0.9, max: 0.995, step: 0.005, value: alpha });
    const tl = h("label"), al = h("label");
    tS.addEventListener("change", () => { T0 = +tS.value; build(); }); aS.addEventListener("change", () => { alpha = +aS.value; build(); });
    tS.addEventListener("input", () => { tl.textContent = "T₀ = " + (+tS.value).toFixed(2); }); aS.addEventListener("input", () => { al.textContent = "cooling α = " + (+aS.value).toFixed(3); });
    tl.textContent = "T₀ = " + T0.toFixed(2); al.textContent = "cooling α = " + alpha.toFixed(3);
    host.append(h("div", { class: "w-toolbar" }, ...mb, btn("New start", () => { seed++; build(); })), h("div", { class: "w-toolbar" }, tl, tS, al, aS), sv, stepper.bar, stepper.caption, stats);
    setOn(mb, mb.find((b) => b.dataset.k === mode));
    const best = (() => { let b = 0; for (let x = 0; x < NX; x++) if (fx(x) > fx(b)) b = x; return b; })();
    function build() {
      const r = rng(seed * 97 + 3); const frames = [];
      const climb = (x0, trail, tag) => {
        let x = x0;
        frames.push({ x, trail: trail.slice(), msg: `${tag}start at x = ${x}, f = ${fx(x).toFixed(3)}` });
        for (let k = 0; k < 400; k++) {
          const nb = [x - 1, x + 1].filter((v) => v >= 0 && v < NX); const bn = nb.reduce((a, b) => (fx(b) > fx(a) ? b : a));
          if (fx(bn) <= fx(x)) { frames.push({ x, trail: trail.slice(), stuck: true, msg: `${tag}no neighbor is better → <b>stop</b> at f = ${fx(x).toFixed(3)} ${x === best ? '<span class="ok">(global maximum!)</span>' : '<span class="bad">(local maximum)</span>'}` }); return x; }
          x = bn; trail.push(x); if (k % 2 === 0) frames.push({ x, trail: trail.slice(), msg: `${tag}move uphill to x = ${x}, f = ${fx(x).toFixed(3)}` });
        }
        return x;
      };
      if (mode === "hill") climb(Math.floor(r() * NX), [], "");
      else if (mode === "restart") { let bestX = null; const trails = []; for (let k = 0; k < 6; k++) { const t = []; const x = climb(Math.floor(r() * NX), t, `Restart ${k + 1}: `); trails.push(t); if (bestX == null || fx(x) > fx(bestX)) bestX = x; frames[frames.length - 1].keep = bestX; } frames.push({ x: bestX, trail: [], keep: bestX, msg: `Best of 6 restarts: f = ${fx(bestX).toFixed(3)} ${bestX === best ? '<span class="ok">= global maximum</span>' : ""}` }); }
      else {
        let x = Math.floor(r() * NX), T = T0, bx = x; const tr = [x]; let acc = 0, worse = 0;
        frames.push({ x, T, trail: [], msg: `Start at x = ${x}. Temperature T = ${T.toFixed(2)}` });
        for (let k = 0; k < 1500 && T > 0.002; k++) {
          const step = Math.round((r() * 2 - 1) * 12) || 1; const y = Math.min(NX - 1, Math.max(0, x + step));
          const dE = fx(y) - fx(x); let accept = dE >= 0;
          if (!accept && r() < Math.exp(dE / T)) { accept = true; worse++; }
          if (accept) { x = y; acc++; tr.push(x); if (fx(x) > fx(bx)) bx = x; }
          T *= alpha;
          if (k % 3 === 0) frames.push({ x, T, trail: tr.slice(-40), best: bx, msg: `T = ${T.toFixed(3)} · ${dE >= 0 ? "better move → accept" : accept ? `<span class="hot">worse move accepted</span> (p = e^(Δ/T) = ${Math.exp(dE / T).toFixed(2)})` : `worse move rejected (p = ${Math.exp(dE / T).toFixed(2)})`}` });
        }
        frames.push({ x, T, trail: tr.slice(-40), best: bx, msg: `Frozen at f = ${fx(x).toFixed(3)} ${Math.abs(x - best) <= 2 ? '<span class="ok">(global maximum region)</span>' : '<span class="bad">(not the global maximum — try a higher T₀ or slower cooling)</span>'} · ${worse} worse moves were accepted` });
      }
      stepper.set(frames);
    }
    const X = (x) => 20 + x / (NX - 1) * (W - 40), Y = (v) => H - 30 - (v + 1.3) / 3 * (H - 50);
    function draw(f) {
      sv.replaceChildren();
      const pts = []; for (let x = 0; x < NX; x++) pts.push(`${X(x)},${Y(fx(x))}`);
      sv.append(S("polygon", { points: `${X(0)},${H} ${pts.join(" ")} ${X(NX - 1)},${H}`, style: "fill:var(--accent-soft)" }));
      sv.append(S("polyline", { points: pts.join(" "), style: "fill:none;stroke:var(--accent);stroke-width:3" }));
      sv.append(S("text", { x: X(best), y: Y(fx(best)) - 14, "text-anchor": "middle", "font-size": 15, "font-weight": 700, style: "fill:var(--ok)" }, "global max"));
      (f.trail || []).forEach((x) => sv.append(S("circle", { cx: X(x), cy: Y(fx(x)), r: 3.5, style: "fill:var(--hot);opacity:.45" })));
      if (f.keep != null) sv.append(S("circle", { cx: X(f.keep), cy: Y(fx(f.keep)), r: 9, style: "fill:none;stroke:var(--ok);stroke-width:3" }));
      sv.append(S("circle", { cx: X(f.x), cy: Y(fx(f.x)), r: 11, style: `fill:${f.stuck ? "var(--bad)" : "var(--hot)"};stroke:#fff;stroke-width:2` }));
      if (f.T != null) { const w = Math.min(1, f.T / Math.max(T0, 0.01)) * 200; sv.append(S("rect", { x: W - 230, y: 14, width: 200, height: 14, rx: 7, style: "fill:var(--line)" })); sv.append(S("rect", { x: W - 230, y: 14, width: w, height: 14, rx: 7, style: "fill:var(--bad)" })); sv.append(S("text", { x: W - 236, y: 26, "text-anchor": "end", "font-size": 14, style: "fill:var(--muted)" }, "temperature")); }
      stats.replaceChildren(stat("current f =", fx(f.x).toFixed(3)), stat("global max f =", fx(best).toFixed(3)));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     9. Simulated annealing on the TSP (2-opt moves), live
     ======================================================= */
  register("satsp", (host, d) => {
    const W = 560, H = 380, n = parseInt(d.n || "40", 10);
    let pts = [], tour = [], T = 0, T0 = 60, alpha = 0.9995, it = 0, timer = null, mode = "sa", bestLen = Infinity, history = [];
    const sv = mkSvg(W, H);
    const cv = h("canvas", { width: 520, height: 380 });
    const info = h("div", { class: "w-caption" });
    const mb = [["sa", "Simulated annealing"], ["hc", "Hill climbing (T = 0)"]].map(([k, nm]) => { const b = btn(nm, () => { mode = k; setOn(mb, b); reset(); }); b.dataset.k = k; return b; });
    const bPlay = btn("Run", toggle);
    host.append(h("div", { class: "w-toolbar" }, ...mb, bPlay, btn("New cities", () => { seedPts(Math.random() * 1e6); reset(); })), h("div", { style: "display:grid;grid-template-columns:1.1fr 1fr;gap:1em;align-items:center" }, sv, cv), info);
    setOn(mb, mb[0]);
    function seedPts(sd) { const r = rng(Math.floor(sd)); pts = Array.from({ length: n }, () => ({ x: 20 + r() * (W - 40), y: 20 + r() * (H - 40) })); }
    const dist = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
    const len = () => { let s = 0; for (let i = 0; i < n; i++) s += dist(tour[i], tour[(i + 1) % n]); return s; };
    function reset() { stop(); tour = pts.map((_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tour[i], tour[j]] = [tour[j], tour[i]]; } T = mode === "sa" ? T0 : 0; it = 0; bestLen = len(); history = [[0, bestLen, T]]; draw(); }
    function step(k) {
      let L = len();
      for (let s = 0; s < k; s++) {
        let i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n); if (i > j) [i, j] = [j, i]; if (j - i < 2 || (i === 0 && j === n - 1)) continue;
        const a = tour[i], b = tour[i + 1], c = tour[j], e = tour[(j + 1) % n];
        const dE = dist(a, c) + dist(b, e) - dist(a, b) - dist(c, e);
        if (dE < 0 || (T > 1e-9 && Math.random() < Math.exp(-dE / T))) { let x = i + 1, y = j; while (x < y) { [tour[x], tour[y]] = [tour[y], tour[x]]; x++; y--; } L += dE; }
        if (mode === "sa") T *= alpha; it++;
      }
      bestLen = Math.min(bestLen, L); history.push([it, L, T]);
    }
    function toggle() { if (timer) stop(); else { bPlay.textContent = "Pause"; timer = setInterval(() => { step(400); draw(); if ((mode === "sa" && T < 0.01) || it > 400000) stop(); }, 30); } }
    function stop() { clearInterval(timer); timer = null; bPlay.textContent = "Run"; }
    function draw() {
      sv.replaceChildren();
      sv.append(S("polygon", { points: tour.map((i) => pts[i].x + "," + pts[i].y).join(" "), style: "fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round" }));
      pts.forEach((p) => sv.append(S("circle", { cx: p.x, cy: p.y, r: 5, style: "fill:var(--ink)" })));
      const g = cv.getContext("2d"), Wc = cv.width, Hc = cv.height; g.clearRect(0, 0, Wc, Hc);
      const maxL = Math.max(...history.map((x) => x[1])), minL = Math.min(...history.map((x) => x[1])) * 0.95, maxI = Math.max(1, it);
      const X = (i) => 50 + i / maxI * (Wc - 70), Y = (v) => Hc - 30 - (v - minL) / Math.max(1, maxL - minL) * (Hc - 60);
      g.strokeStyle = cssVar("--accent"); g.lineWidth = 3; g.beginPath(); history.forEach(([i, l], k) => (k ? g.lineTo(X(i), Y(l)) : g.moveTo(X(i), Y(l)))); g.stroke();
      if (mode === "sa") { g.strokeStyle = cssVar("--bad"); g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); history.forEach(([i, , t], k) => { const y = Hc - 30 - t / T0 * (Hc - 60); k ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); g.setLineDash([]); }
      g.fillStyle = cssVar("--muted"); g.font = "18px JetBrains Mono, monospace"; g.fillText("tour length", 54, 22); if (mode === "sa") { g.fillStyle = cssVar("--bad"); g.fillText("temperature (dashed)", 230, 22); }
      info.innerHTML = `iterations: <b>${it.toLocaleString()}</b> · current length: <b>${len().toFixed(0)}</b> · best: ${bestLen.toFixed(0)} · T = ${T.toFixed(3)} <span class="muted">— move: reverse a random segment (2-opt)</span>`;
    }
    seedPts(42); reset();
    return { repaint: draw };
  });

  /* =======================================================
     10. Genetic algorithm — 0/1 knapsack (W = 15)
     ======================================================= */
  register("ga", (host) => {
    const items = [[12, 4], [2, 2], [1, 1], [1, 2], [4, 10], [3, 6], [6, 12], [5, 7], [2, 3], [9, 13], [7, 9], [3, 5]]; // [weight, value]
    const Wmax = 15, n = items.length, P = 16;
    let pc = 0.6, pm = 0.02, pop = [], gen = 0, hist = [], timer = null;
    const fit = (c) => { let w = 0, v = 0; c.forEach((b, i) => { if (b) { w += items[i][0]; v += items[i][1]; } }); return w > Wmax ? 0 : v; };
    const opt = (() => { let b = 0; for (let m = 0; m < 1 << n; m++) { let w = 0, v = 0; for (let i = 0; i < n; i++) if (m >> i & 1) { w += items[i][0]; v += items[i][1]; } if (w <= Wmax) b = Math.max(b, v); } return b; })();
    const popEl = h("div", { style: "display:grid;grid-template-columns:repeat(2,1fr);gap:4px 1.5em" });
    const cv = h("canvas", { width: 420, height: 300 });
    const info = h("div", { class: "w-caption" });
    const cS = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: pc }), mS = h("input", { type: "range", min: 0, max: 0.2, step: 0.01, value: pm });
    const cl = h("label"), ml = h("label");
    const sync = () => { pc = +cS.value; pm = +mS.value; cl.textContent = `crossover rate ${pc.toFixed(2)}`; ml.textContent = `mutation rate ${pm.toFixed(2)}`; };
    cS.addEventListener("input", sync); mS.addEventListener("input", sync); sync();
    const bRun = btn("Run", () => { if (timer) { clearInterval(timer); timer = null; bRun.textContent = "Run"; } else { bRun.textContent = "Pause"; timer = setInterval(() => { next(); if (gen >= 200) { clearInterval(timer); timer = null; bRun.textContent = "Run"; } }, 120); } });
    host.append(h("div", { class: "w-toolbar" }, btn("New population", init), btn("Next generation", next), bRun, cl, cS, ml, mS), h("div", { style: "display:grid;grid-template-columns:1.2fr 1fr;gap:1em;align-items:start" }, popEl, cv), info);
    function init() { pop = Array.from({ length: P }, () => Array.from({ length: n }, () => (Math.random() < 0.25 ? 1 : 0))); gen = 0; hist = []; record(); draw(); }
    function tour() { const a = pop[Math.floor(Math.random() * P)], b = pop[Math.floor(Math.random() * P)]; return fit(a) >= fit(b) ? a : b; }
    function next() {
      const sorted = pop.slice().sort((a, b) => fit(b) - fit(a)); const nxt = [sorted[0].slice(), sorted[1].slice()]; // elitism: the 2 fittest pass unchanged
      while (nxt.length < P) {
        let a = tour().slice(), b = tour().slice();
        if (Math.random() < pc) { const cut = 1 + Math.floor(Math.random() * (n - 1)); const a2 = a.slice(0, cut).concat(b.slice(cut)); const b2 = b.slice(0, cut).concat(a.slice(cut)); a = a2; b = b2; }
        [a, b].forEach((c) => { for (let i = 0; i < n; i++) if (Math.random() < pm) c[i] ^= 1; if (nxt.length < P) nxt.push(c); });
      }
      pop = nxt; gen++; record(); draw();
    }
    function record() { const f = pop.map(fit); hist.push([Math.max(...f), f.reduce((s, x) => s + x, 0) / P]); }
    function draw() {
      const sorted = pop.slice().sort((a, b) => fit(b) - fit(a));
      popEl.replaceChildren(...sorted.map((c) => h("div", { style: "display:flex;gap:2px;align-items:center" }, ...c.map((b) => h("div", { style: `width:14px;height:16px;border-radius:3px;background:${b ? "var(--accent)" : "var(--line)"}` })), h("span", { class: "mono", style: `font-size:0.45em;margin-left:6px;${fit(c) === 0 ? "color:var(--bad)" : ""}` }, String(fit(c))))));
      const g = cv.getContext("2d"), Wc = cv.width, Hc = cv.height; g.clearRect(0, 0, Wc, Hc);
      const X = (i) => 40 + i / Math.max(10, hist.length - 1) * (Wc - 60), Y = (v) => Hc - 30 - v / (opt * 1.1) * (Hc - 50);
      g.setLineDash([6, 5]); g.strokeStyle = cssVar("--ok"); g.lineWidth = 2; g.beginPath(); g.moveTo(40, Y(opt)); g.lineTo(Wc - 20, Y(opt)); g.stroke(); g.setLineDash([]);
      [[0, "--accent"], [1, "--hot"]].forEach(([k, c]) => { g.strokeStyle = cssVar(c); g.lineWidth = 3; g.beginPath(); hist.forEach((x, i) => (i ? g.lineTo(X(i), Y(x[k])) : g.moveTo(X(i), Y(x[k])))); g.stroke(); });
      g.font = "16px JetBrains Mono, monospace"; g.fillStyle = cssVar("--accent"); g.fillText("best", 44, 20); g.fillStyle = cssVar("--hot"); g.fillText("average", 100, 20); g.fillStyle = cssVar("--ok"); g.fillText("optimum " + opt, 190, 20);
      const b = hist[hist.length - 1];
      info.innerHTML = `Generation <b>${gen}</b> · best fitness <b>${b[0]}</b> (optimum ${opt}) · average ${b[1].toFixed(1)} · each row = a chromosome (blue bit = item in the knapsack), red fitness 0 = overweight (W &gt; ${Wmax})`;
    }
    init();
  });

  /* =======================================================
     11. Ant colony optimization on the TSP
     ======================================================= */
  register("aco", (host, d) => {
    const W = 640, H = 380, n = parseInt(d.n || "14", 10), ants = 12;
    let pts = [], tau = [], best = null, bestLen = Infinity, it = 0, timer = null, alphaP = 1, betaP = 3, rho = 0.3;
    const sv = mkSvg(W, H);
    const info = h("div", { class: "w-caption" });
    const bRun = btn("Run", () => { if (timer) { clearInterval(timer); timer = null; bRun.textContent = "Run"; } else { bRun.textContent = "Pause"; timer = setInterval(() => { iterate(); if (it >= 150) { clearInterval(timer); timer = null; bRun.textContent = "Run"; } }, 150); } });
    const rS = h("input", { type: "range", min: 0.05, max: 0.9, step: 0.05, value: rho }), rl = h("label");
    rS.addEventListener("input", () => { rho = +rS.value; rl.textContent = `evaporation ρ = ${rho.toFixed(2)}`; }); rl.textContent = `evaporation ρ = ${rho.toFixed(2)}`;
    host.append(h("div", { class: "w-toolbar" }, btn("One iteration (12 ants)", iterate), bRun, btn("New cities", () => { init(Math.random() * 1e6); }), rl, rS), sv, info);
    const dist = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
    function init(sd) { const r = rng(Math.floor(sd)); pts = Array.from({ length: n }, () => ({ x: 30 + r() * (W - 60), y: 30 + r() * (H - 60) })); tau = pts.map(() => pts.map(() => 1)); best = null; bestLen = Infinity; it = 0; draw(); }
    function iterate() {
      const tours = [];
      for (let k = 0; k < ants; k++) {
        const start = Math.floor(Math.random() * n), t = [start], seen = new Set(t);
        while (t.length < n) {
          const i = t[t.length - 1]; const cand = []; let tot = 0;
          for (let j = 0; j < n; j++) if (!seen.has(j)) { const w = Math.pow(tau[i][j], alphaP) * Math.pow(1 / dist(i, j), betaP); cand.push([j, w]); tot += w; }
          let r = Math.random() * tot, pick = cand[cand.length - 1][0]; for (const [j, w] of cand) { r -= w; if (r <= 0) { pick = j; break; } }
          t.push(pick); seen.add(pick);
        }
        let L = 0; for (let q = 0; q < n; q++) L += dist(t[q], t[(q + 1) % n]);
        tours.push([t, L]); if (L < bestLen) { bestLen = L; best = t.slice(); }
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tau[i][j] *= (1 - rho);
      tours.forEach(([t, L]) => { for (let q = 0; q < n; q++) { const a = t[q], b = t[(q + 1) % n]; tau[a][b] += 100 / L; tau[b][a] += 100 / L; } });
      it++; draw();
    }
    function draw() {
      sv.replaceChildren();
      let mx = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) mx = Math.max(mx, tau[i][j]);
      if (it > 0) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = tau[i][j] / mx; if (v < 0.05) continue; sv.append(S("line", { x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y, style: `stroke:var(--hot);stroke-width:${1 + v * 9};opacity:${0.15 + v * 0.6};stroke-linecap:round` })); }
      if (best) sv.append(S("polygon", { points: best.map((i) => pts[i].x + "," + pts[i].y).join(" "), style: "fill:none;stroke:var(--accent);stroke-width:2;stroke-dasharray:6 5" }));
      pts.forEach((p) => sv.append(S("circle", { cx: p.x, cy: p.y, r: 7, style: "fill:var(--ink)" })));
      info.innerHTML = `Iteration <b>${it}</b> · best tour length <b>${bestLen === Infinity ? "—" : bestLen.toFixed(0)}</b> · orange thickness = pheromone τ<sub>ij</sub> · dashed = best tour · P(i→j) ∝ τ<sup>α</sup>·(1/d)<sup>β</sup>, α = ${alphaP}, β = ${betaP}`;
    }
    init(7);
    return { repaint: draw };
  });
})();

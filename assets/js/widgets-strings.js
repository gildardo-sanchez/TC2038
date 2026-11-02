/* =========================================================
   TC2038 · Unit 2 — String algorithms widgets
   Requires widgets.js (window.Widgets) to be loaded first.
   ========================================================= */
(function () {
  "use strict";
  const { register, h, Stepper } = window.Widgets;
  const btn = (label, fn, title) => h("button", { type: "button", title: title || null, onclick: fn }, label);
  const setOn = (group, active) => group.forEach((b) => b.classList.toggle("on", b === active));
  const stat = (label, value) => h("span", {}, label + " ", h("b", {}, String(value)));
  const GHOST = "border-color:transparent;background:transparent";
  // a row of character cells; cls(i) returns extra classes; offset = leading blank cells
  function row(str, cls, opts) {
    opts = opts || {};
    const out = [];
    if (opts.label != null) out.push(h("span", { class: "mono", style: "width:3.2em;font-size:0.5em;color:var(--muted);text-align:right;margin-right:4px" }, opts.label));
    const tight0 = (opts.offset || 0) + str.length > 20 ? ";min-width:1.35em;font-size:0.5em;padding:0.2em 0.15em" : "";
    for (let k = 0; k < (opts.offset || 0); k++) out.push(h("div", { class: "cell", style: GHOST + ";color:transparent" + tight0 }, "·"));
    const tight = (opts.offset || 0) + str.length > 20 ? "min-width:1.35em;font-size:0.5em;padding:0.2em 0.15em" : "";
    [...str].forEach((c, i) => out.push(h("div", { class: "cell " + ((cls && cls(i)) || ""), style: tight || (opts.w ? `min-width:${opts.w}` : "") }, opts.idx === false ? null : h("span", { class: "idx" }, (opts.idxBase || 0) + i), c === " " ? "␣" : c)));
    return h("div", { class: "cells", style: "flex-wrap:nowrap" }, ...out);
  }
  function numRow(arr, cls, label, offset) {
    const out = [];
    if (label != null) out.push(h("span", { class: "mono", style: "width:3.2em;font-size:0.5em;color:var(--muted);text-align:right;margin-right:4px" }, label));
    const t = (offset || 0) + arr.length > 20 ? ";min-width:1.35em;font-size:0.5em;padding:0.2em 0.15em" : "";
    for (let k = 0; k < (offset || 0); k++) out.push(h("div", { class: "cell", style: GHOST + ";color:transparent" + t }, "·"));
    arr.forEach((v, i) => out.push(h("div", { class: "cell " + ((cls && cls(i)) || ""), style: (v == null ? GHOST : "") + t }, v == null ? "" : String(v))));
    return h("div", { class: "cells", style: "flex-wrap:nowrap" }, ...out);
  }
  function inputs(host, fields, onGo, extra) {
    const els = fields.map(([lab, val, size]) => { const e = h("input", { type: "text", value: val, size: size || 18 }); return [lab, e]; });
    host.append(h("div", { class: "w-toolbar" }, ...els.flatMap(([lab, e]) => [h("label", {}, lab), e]), btn("Run", () => onGo(...els.map(([, e]) => e.value))), ...(extra || [])));
    return els.map(([, e]) => e);
  }
  function prefixFunction(P) { const pi = Array(P.length).fill(0); for (let i = 1, k = 0; i < P.length; i++) { while (k > 0 && P[k] !== P[i]) k = pi[k - 1]; if (P[k] === P[i]) k++; pi[i] = k; } return pi; }

  /* =======================================================
     1. Naive string matching
     ======================================================= */
  register("naive", (host, d) => {
    let T = d.text || "abacaabaccabacabaabb", P = d.pattern || "abacab";
    inputs(host, [["T", T, 24], ["P", P, 10]], (t, p) => { T = t; P = p || "a"; build(); });
    const stage = h("div"), stats = h("div", { class: "w-stats" }), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption, stats);
    function build() {
      const n = T.length, m = P.length, frames = []; let comps = 0; const found = [];
      for (let s = 0; s + m <= n; s++) {
        let j = 0;
        while (j < m) { comps++; const ok = T[s + j] === P[j]; frames.push({ s, j, ok, comps, found: found.slice(), msg: `shift s = ${s}: compare T[${s + j}] = ${T[s + j]} with P[${j}] = ${P[j]} → ${ok ? "match" : '<span class="bad">mismatch</span>, shift by 1'}` }); if (!ok) break; j++; }
        if (j === m) { found.push(s); frames.push({ s, j: m, ok: true, full: true, comps, found: found.slice(), msg: `<span class="ok">Pattern found at shift ${s}</span>` }); }
      }
      frames.push({ s: -1, comps, found, msg: `Done: ${comps} character comparisons, ${found.length} occurrence(s) at ${found.join(", ") || "—"}. Worst case (n − m + 1)·m = ${(n - m + 1) * m}.` });
      stepper.set(frames);
    }
    function draw(f) {
      const m = P.length, hitSet = new Set(); (f.found || []).forEach((s) => { for (let k = 0; k < m; k++) hitSet.add(s + k); });
      stage.replaceChildren(row(T, (i) => (f.s >= 0 && i === f.s + f.j && !f.full ? (f.ok ? "act" : "mid") : hitSet.has(i) ? "good" : f.s >= 0 && i >= f.s && i < f.s + f.j ? "act" : ""), { label: "T" }),
        f.s >= 0 ? row(P, (j) => (j === f.j && !f.full ? (f.ok ? "act" : "mid") : j < f.j ? "good" : ""), { label: "P", offset: f.s, idx: false }) : h("div", { style: "height:2.4em" }));
      stats.replaceChildren(stat("comparisons:", f.comps), stat("occurrences:", (f.found || []).length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     2. Prefix function (failure function) π
     ======================================================= */
  register("prefixfn", (host, d) => {
    let P = d.pattern || "ababaca";
    inputs(host, [["P", P, 14]], (p) => { P = p || "a"; build(); });
    const stage = h("div"), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption);
    function build() {
      const m = P.length, pi = Array(m).fill(null); pi[0] = 0; const frames = [{ i: 0, k: 0, pi: pi.slice(), msg: "π[0] = 0 by definition (a proper prefix of one character is empty)." }];
      let k = 0;
      for (let i = 1; i < m; i++) {
        while (k > 0 && P[k] !== P[i]) { frames.push({ i, k, pi: pi.slice(), bad: true, msg: `P[${k}] = ${P[k]} ≠ P[${i}] = ${P[i]} → fall back: k = π[${k - 1}] = ${pi[k - 1]}` }); k = pi[k - 1]; }
        if (P[k] === P[i]) { k++; pi[i] = k; frames.push({ i, k, pi: pi.slice(), msg: `P[${k - 1}] = P[${i}] = ${P[i]} → the border grows: π[${i}] = <b>${k}</b> ("${P.slice(0, k)}" is a prefix and a suffix of "${P.slice(0, i + 1)}")` }); }
        else { pi[i] = 0; frames.push({ i, k, pi: pi.slice(), msg: `P[0] = ${P[0]} ≠ P[${i}] = ${P[i]} → π[${i}] = <b>0</b>` }); }
      }
      frames.push({ i: -1, k: 0, pi, msg: `π = [${pi.join(", ")}] · computed in Θ(m): k increases at most m times in total, so the fall-backs are amortized.` });
      stepper.set(frames);
    }
    function draw(f) {
      const k = f.i >= 0 ? (f.bad ? f.k : f.k) : 0;
      const border = f.i >= 0 && !f.bad ? f.pi[f.i] || 0 : 0;
      stage.replaceChildren(
        row(P, (j) => (j === f.i ? (f.bad ? "mid" : "act") : f.i >= 0 && j >= f.i - border + 1 && j < f.i && border ? "good" : f.i >= 0 && j < border ? "good" : f.bad && j === f.k ? "ref" : ""), { label: "P" }),
        numRow(f.pi, (j) => (j === f.i ? "act" : ""), "π"),
        h("p", { class: "tiny muted", style: "margin:.3em 0 0" }, "π[i] = length of the longest proper prefix of P[0..i] that is also a suffix of P[0..i] (green = that border)."));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     3. KMP matcher
     ======================================================= */
  register("kmp", (host, d) => {
    let T = d.text || "abacaabaccabacabaabb", P = d.pattern || "abacab";
    inputs(host, [["T", T, 24], ["P", P, 10]], (t, p) => { T = t; P = p || "a"; build(); });
    const stage = h("div"), stats = h("div", { class: "w-stats" }), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption, stats);
    let pi = [];
    function build() {
      pi = prefixFunction(P); const n = T.length, m = P.length, frames = []; let comps = 0; const found = [];
      let i = 0, j = 0;
      frames.push({ i, j, comps, found: [], msg: `π(P) = [${pi.join(", ")}]. The text pointer i never moves back.` });
      while (i < n) {
        comps++;
        if (T[i] === P[j]) {
          frames.push({ i, j, ok: true, comps, found: found.slice(), msg: `T[${i}] = P[${j}] = ${T[i]} → advance both` });
          i++; j++;
          if (j === m) { found.push(i - m); frames.push({ i: i - 1, j: m - 1, full: true, comps, found: found.slice(), msg: `<span class="ok">Match at shift ${i - m}</span> → continue with j = π[${m - 1}] = ${pi[m - 1]}` }); j = pi[m - 1]; }
        } else if (j > 0) {
          frames.push({ i, j, ok: false, comps, found: found.slice(), msg: `T[${i}] = ${T[i]} ≠ P[${j}] = ${P[j]} → keep the border: j = π[${j - 1}] = <b>${pi[j - 1]}</b> (slide P by ${j - pi[j - 1]}, i stays)` });
          j = pi[j - 1];
        } else { frames.push({ i, j, ok: false, comps, found: found.slice(), msg: `T[${i}] = ${T[i]} ≠ P[0] → advance i` }); i++; }
      }
      frames.push({ i: -1, j: 0, comps, found, msg: `Done: <b>${comps}</b> comparisons (≤ 2n = ${2 * n}) · occurrences at ${found.join(", ") || "—"}` });
      stepper.set(frames);
    }
    function draw(f) {
      const m = P.length, hit = new Set(); (f.found || []).forEach((s) => { for (let k = 0; k < m; k++) hit.add(s + k); });
      const s = f.i - f.j;
      stage.replaceChildren(
        row(T, (x) => (x === f.i && !f.full ? (f.ok ? "act" : "mid") : hit.has(x) ? "good" : f.i >= 0 && x >= s && x < f.i ? "act" : ""), { label: "T" }),
        f.i >= 0 ? row(P, (y) => (y === f.j && !f.full ? (f.ok ? "act" : "mid") : y < f.j || f.full ? "good" : ""), { label: "P", offset: Math.max(0, s), idx: false }) : h("div", { style: "height:2.4em" }),
        f.i >= 0 ? numRow(pi, (y) => (y === f.j - 1 && !f.ok && !f.full ? "ref" : ""), "π", Math.max(0, s)) : h("div"));
      stats.replaceChildren(stat("comparisons:", f.comps), stat("2n =", 2 * T.length), stat("occurrences:", (f.found || []).length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     4. Z-function
     ======================================================= */
  register("zfunc", (host, d) => {
    let S = d.text || "aabxaabxcaabxaabxay", mode = d.mode || "plain", P = d.pattern || "aabx";
    const els = inputs(host, [["s", S, 22], ["P (for P#s)", P, 8]], (s, p) => { S = s || "a"; P = p || "a"; build(); },
      [btn("Z of s", () => { mode = "plain"; build(); }), btn("Search: Z of P#s", () => { mode = "match"; build(); })]);
    const stage = h("div"), stats = h("div", { class: "w-stats" }), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption, stats);
    let str = "";
    function build() {
      str = mode === "match" ? P + "#" + S : S;
      const n = str.length, z = Array(n).fill(null); z[0] = mode === "match" ? null : n; const frames = []; let l = 0, r = 0, comps = 0;
      frames.push({ i: 0, l, r, z: z.slice(), comps, msg: `z[i] = length of the longest common prefix of s and s[i..]. ${mode === "match" ? `Searching "${P}": every i with z[i] = ${P.length} is a match.` : `z[0] is not interesting (= n).`}` });
      for (let i = 1; i < n; i++) {
        let zi = 0, msg = "";
        if (i < r) { zi = Math.min(r - i, z[i - l]); msg = `i = ${i} is inside the Z-box [${l}, ${r}) → reuse z[${i - l}] = ${z[i - l]}: start with min(${r - i}, ${z[i - l]}) = ${zi}. `; }
        else msg = `i = ${i} is outside the Z-box → compare from scratch. `;
        let c = 0; while (i + zi < n && str[zi] === str[i + zi]) { zi++; c++; comps++; } if (i + zi < n) comps++;
        z[i] = zi; msg += c ? `Extended ${c} more character${c > 1 ? "s" : ""} → z[${i}] = <b>${zi}</b>` : `No extension → z[${i}] = <b>${zi}</b>`;
        if (i + zi > r) { l = i; r = i + zi; msg += ` · new Z-box [${l}, ${r})`; }
        if (mode === "match" && zi === P.length) msg += ` · <span class="ok">match at position ${i - P.length - 1} of s</span>`;
        frames.push({ i, l, r, z: z.slice(), zi, comps, msg });
      }
      frames.push({ i: -1, l: 0, r: 0, z, comps, msg: `Done in O(n): ${comps} comparisons (r only moves right).` + (mode === "match" ? ` Matches at ${z.map((v, i) => (v === P.length ? i - P.length - 1 : null)).filter((v) => v != null).join(", ") || "none"}.` : "") });
      stepper.set(frames);
    }
    function draw(f) {
      const isMatch = (i) => mode === "match" && f.z[i] === P.length;
      stage.replaceChildren(
        row(str, (i) => (i === f.i ? "act" : f.i > 0 && i >= f.i && i < f.i + (f.z[f.i] || 0) ? "good" : f.i > 0 && i < (f.z[f.i] || 0) ? "good" : i >= f.l && i < f.r && f.i > 0 ? "ref" : ""), { label: "s" }),
        numRow(f.z, (i) => (i === f.i ? "act" : isMatch(i) ? "found" : f.i > 0 && i === f.i - f.l && f.i < f.r ? "mid" : ""), "z"),
        h("p", { class: "tiny muted", style: "margin:.3em 0 0" }, "orange outline = Z-box [l, r) · green = the matching prefix and the segment starting at i · orange cell = z[i − l] reused"));
      stats.replaceChildren(stat("comparisons:", f.comps), stat("n =", str.length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     5. Manacher
     ======================================================= */
  register("manacher", (host, d) => {
    let S = d.text || "abaxabaxabb";
    inputs(host, [["s", S, 18]], (s) => { S = s || "a"; build(); });
    const stage = h("div"), stats = h("div", { class: "w-stats" }), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption, stats);
    let t = "";
    function build() {
      t = "#" + [...S].join("#") + "#"; const n = t.length, p = Array(n).fill(null); const frames = []; let c = 0, r = -1, comps = 0;
      frames.push({ i: -1, c, r, p: p.slice(), comps, msg: `Insert # between characters: "${S}" → "${t}". Now every palindrome has odd length and a center. p[i] = radius = palindrome length in s.` });
      for (let i = 0; i < n; i++) {
        let k = 0, msg = "", cas = "";
        if (i <= r) {
          const mi = 2 * c - i; k = Math.min(r - i, p[mi]);
          cas = p[mi] < r - i ? "Case 1: mirror palindrome is strictly inside → copy it, no expansion can help" : p[mi] > r - i ? "Case 2: mirror extends past the left border → only r − i is guaranteed" : "Case 3: mirror touches the border → start at r − i and try to expand";
          msg = `i = ${i}, mirror i' = 2c − i = ${mi}, p[i'] = ${p[mi]}, r − i = ${r - i}. ${cas}. Start with p[i] = ${k}.`;
        } else msg = `i = ${i} is beyond r → start with p[i] = 0 and expand.`;
        let e = 0; while (i - k - 1 >= 0 && i + k + 1 < n && t[i - k - 1] === t[i + k + 1]) { k++; e++; comps++; } if (i - k - 1 >= 0 && i + k + 1 < n) comps++;
        p[i] = k; if (e) msg += ` Expanded ${e} step${e > 1 ? "s" : ""}.`; msg += ` → p[${i}] = <b>${k}</b>`;
        let moved = false; if (i + k > r) { c = i; r = i + k; moved = true; msg += ` · new center c = ${c}, r = ${r}`; }
        frames.push({ i, c, r, p: p.slice(), mi: i <= r && !moved ? 2 * c - i : null, comps, msg });
      }
      let best = 0; p.forEach((v, i) => { if (v > p[best]) best = i; });
      const start = (best - p[best]) / 2;
      frames.push({ i: -1, c: best, r: best + p[best], p, best, comps, msg: `Longest palindrome: "<b>${S.substr(start, p[best])}</b>" (length ${p[best]}) · ${comps} character comparisons for n = ${S.length} → O(n)` });
      stepper.set(frames);
    }
    function draw(f) {
      const c = f.c, rad = f.p[c] || 0, L = c - rad, R = f.r;
      stage.replaceChildren(
        row(t, (i) => (i === f.i ? "act" : f.best != null && i >= f.best - f.p[f.best] && i <= f.best + f.p[f.best] ? "found" : i === f.mi ? "mid" : i === c && f.i >= 0 ? "ref" : f.i >= 0 && i >= L && i <= R ? "good" : ""), { label: "t", w: "1.7em" }),
        numRow(f.p, (i) => (i === f.i ? "act" : i === f.mi ? "mid" : ""), "p"),
        h("p", { class: "tiny muted", style: "margin:.3em 0 0" }, "green = current rightmost palindrome [c − p[c], r] · orange outline = its center c · orange = mirror i'"));
      stats.replaceChildren(stat("comparisons:", f.comps), stat("|t| =", t.length));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     6. Rabin–Karp (rolling hash, spurious hits)
     ======================================================= */
  register("rabinkarp", (host, d) => {
    let T = d.text || "2359023141526739921", P = d.pattern || "31415", q = parseInt(d.q || "13", 10);
    const els = inputs(host, [["T", T, 22], ["P", P, 8], ["q", String(q), 4]], (t, p, qq) => { T = t; P = p || "1"; q = Math.max(2, parseInt(qq, 10) || 13); build(); });
    const stage = h("div"), stats = h("div", { class: "w-stats" }), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption, stats);
    let hs = [];
    function build() {
      const digits = /^\d+$/.test(T + P), base = digits ? 10 : 31, val = (ch) => (digits ? +ch : ch.charCodeAt(0) - 96);
      const n = T.length, m = P.length; let hm = 1; for (let k = 1; k < m; k++) hm = (hm * base) % q;
      let p = 0, t = 0; for (let k = 0; k < m; k++) { p = (p * base + val(P[k])) % q; t = (t * base + val(T[k])) % q; }
      const frames = []; hs = Array(Math.max(0, n - m + 1)).fill(null); let checks = 0, spur = 0; const found = [];
      frames.push({ s: -1, msg: `Base d = ${base}, modulus q = ${q}. h(P) = ${p}. Precompute d^(m−1) mod q = ${hm}. Each window hash is updated in O(1).`, hs: hs.slice(), p, checks, spur, found: [] });
      for (let s = 0; s + m <= n; s++) {
        hs[s] = t; let msg = `window T[${s}..${s + m - 1}] = ${T.substr(s, m)} → hash ${t}`, kind = "";
        if (t === p) { checks += m; if (T.substr(s, m) === P) { kind = "hit"; found.push(s); msg += ` = h(P) → verify characters → <span class="ok">valid match</span>`; } else { kind = "spur"; spur++; msg += ` = h(P) → verify characters → <span class="bad">spurious hit!</span>`; } }
        else msg += ` ≠ ${p} → skip, no character comparisons`;
        if (s + m < n) msg += ` · roll: (d·(t − T[${s}]·${hm}) + T[${s + m}]) mod q`;
        frames.push({ s, kind, msg, hs: hs.slice(), p, checks, spur, found: found.slice() });
        if (s + m < n) t = ((base * (t - val(T[s]) * hm) + val(T[s + m])) % q + q) % q;
      }
      frames.push({ s: -1, msg: `Done. ${found.length} match(es), ${spur} spurious hit(s). Expected O(n + m) when q is a large random prime; worst case O((n − m + 1)m).`, hs, p, checks, spur, found });
      stepper.set(frames);
    }
    function draw(f) {
      const m = P.length, hit = new Set(); (f.found || []).forEach((s) => { for (let k = 0; k < m; k++) hit.add(s + k); });
      stage.replaceChildren(
        row(T, (i) => (f.s >= 0 && i >= f.s && i < f.s + m ? (f.kind === "hit" ? "found" : f.kind === "spur" ? "mid" : "act") : hit.has(i) ? "good" : ""), { label: "T" }),
        numRow(f.hs, (s) => (s === f.s ? (f.kind === "spur" ? "mid" : f.kind === "hit" ? "found" : "act") : f.hs[s] === f.p ? "ref" : ""), "hash"),
        h("p", { class: "small", style: "margin:.3em 0 0" }, `h(P) = ${f.p}`));
      stats.replaceChildren(stat("character checks:", f.checks), stat("spurious hits:", f.spur));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     7. Polynomial hash calculator (Horner)
     ======================================================= */
  register("hashcalc", (host, d) => {
    let S = d.text || "abracadabra", p = parseInt(d.p || "31", 10), M = d.m || "1000000007";
    const out = h("div");
    inputs(host, [["s", S, 14], ["p", String(p), 5], ["m", M, 11]], (s, pp, mm) => { S = s; p = parseInt(pp, 10) || 31; M = mm; draw(); });
    host.append(out);
    function draw() {
      const m = BigInt(M || "1000000007"), P = BigInt(p); let hsh = 0n; const rows = [];
      [...S].forEach((ch, i) => { const v = BigInt(ch.charCodeAt(0) - 96 > 0 ? ch.charCodeAt(0) - 96 : ch.charCodeAt(0)); const before = hsh; hsh = (hsh * P + v) % m; if (i < 12) rows.push(h("div", { class: "mono", style: "font-size:0.5em" }, `y = (${before} · ${p} + ${v} ['${ch}']) mod m = ${hsh}`)); });
      if (S.length > 12) rows.push(h("div", { class: "mono", style: "font-size:0.5em" }, "…"));
      out.replaceChildren(h("div", { class: "w-caption" }, `hash("${S}") = `, h("b", {}, String(hsh)), ` · with letters a=1 … z=26 and Horner's rule: y ← y·p + sᵢ (mod m)`), h("div", { style: "margin-top:.3em" }, ...rows));
    }
    draw();
  });

  /* =======================================================
     8. Collision probability (birthday paradox)
     ======================================================= */
  register("birthday", (host) => {
    const sl = h("input", { type: "range", min: 1, max: 7, step: 0.25, value: 5 });
    const out = h("div");
    host.append(h("div", { class: "w-toolbar" }, h("label", {}, "number of distinct strings hashed: n = 10^k"), sl), out);
    sl.addEventListener("input", draw);
    function draw() {
      const n = Math.pow(10, +sl.value);
      const mods = [["mod 10⁹ + 7", 1e9 + 7], ["mod 2⁶¹ − 1", Math.pow(2, 61) - 1], ["two mods (10⁹+7, 10⁹+9)", (1e9 + 7) * (1e9 + 9)]];
      out.replaceChildren(h("p", { class: "small", style: "margin:.2em 0" }, `n = ${Math.round(n).toLocaleString()} strings → ${(n * (n - 1) / 2).toExponential(2)} pairs`),
        ...mods.map(([nm, M]) => { const pr = -Math.expm1(-n * (n - 1) / (2 * M)); return h("div", { style: "display:grid;grid-template-columns:14em 1fr 7em;gap:.6em;align-items:center;font-size:0.6em;margin:6px 0" },
          h("span", { class: "mono" }, nm), h("div", { style: "height:20px;border-radius:6px;background:var(--line)" }, h("div", { style: `height:20px;border-radius:6px;background:${pr > 0.5 ? "var(--bad)" : pr > 0.01 ? "var(--hot)" : "var(--ok)"};width:${Math.max(0.5, pr * 100)}%` })),
          h("span", { class: "mono" }, pr < 1e-6 ? pr.toExponential(1) : (pr * 100).toFixed(pr < 0.01 ? 4 : 1) + "%")); }),
        h("p", { class: "tiny muted" }, "P(at least one collision) ≈ 1 − e^(−n²/2m). Collisions appear around n ≈ √m — the birthday paradox."));
    }
    draw();
  });

  /* =======================================================
     Suffix array helpers
     ======================================================= */
  function suffixArrayDoubling(s) {
    const n = s.length; let rank = [...s].map((c) => c.charCodeAt(0)); let sa = [...Array(n).keys()]; const stages = [];
    for (let k = 1; ; k *= 2) {
      const key = (i) => [rank[i], i + k < n ? rank[i + k] : -1];
      sa.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1]; });
      const nr = Array(n); nr[sa[0]] = 0;
      for (let i = 1; i < n; i++) { const x = key(sa[i - 1]), y = key(sa[i]); nr[sa[i]] = nr[sa[i - 1]] + (x[0] !== y[0] || x[1] !== y[1] ? 1 : 0); }
      stages.push({ k, sa: sa.slice(), pairs: sa.map((i) => key(i)), rank: nr.slice() });
      rank = nr; if (rank[sa[n - 1]] === n - 1 || k > n) break;
    }
    return { sa, stages };
  }
  function kasai(s, sa) { const n = s.length, rk = Array(n), lcp = Array(n).fill(0); sa.forEach((p, i) => (rk[p] = i)); let k = 0; for (let i = 0; i < n; i++) { if (rk[i] === 0) { k = 0; continue; } const j = sa[rk[i] - 1]; while (i + k < n && j + k < n && s[i + k] === s[j + k]) k++; lcp[rk[i]] = k; if (k) k--; } return lcp; }

  /* =======================================================
     9. Suffix array: prefix doubling + LCP + pattern search
     ======================================================= */
  register("suffixarray", (host, d) => {
    let S = d.text || "banana", Q = d.query || "an";
    inputs(host, [["s", S, 14], ["search", Q, 6]], (s, q) => { S = s || "a"; Q = q; build(); });
    const stage = h("div"), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption);
    let res = null, lcp = [];
    function build() {
      res = suffixArrayDoubling(S); lcp = kasai(S, res.sa);
      const frames = [{ st: null, msg: `All ${S.length} suffixes of "${S}" in their original order.` }];
      res.stages.forEach((st, k) => frames.push({ st, msg: `Sort by the first ${2 * st.k} characters using the pair (rank of first ${st.k}, rank of next ${st.k}) — built from the previous round. ${new Set(st.rank).size === S.length ? "All ranks distinct → done." : ""}` }));
      frames.push({ st: res.stages[res.stages.length - 1], final: true, msg: `SA = [${res.sa.join(", ")}] · LCP with the previous suffix (Kasai, O(n)) · O(n log n) rounds × sort.` });
      let lo = 0, hi = S.length; const search = [];
      if (Q) {
        const pre = (i) => S.substr(res.sa[i], Q.length);
        let a = 0, b = S.length; while (a < b) { const mid = (a + b) >> 1; search.push(mid); if (pre(mid) < Q) a = mid + 1; else b = mid; } lo = a;
        let c = lo, e = S.length; while (c < e) { const mid = (c + e) >> 1; if (pre(mid) <= Q) c = mid + 1; else e = mid; } hi = c;
        frames.push({ st: res.stages[res.stages.length - 1], final: true, range: [lo, hi], probes: search, msg: `Search "${Q}": two binary searches over SA (probed rows ${search.join(", ")}) → rows [${lo}, ${hi}) → <b>${hi - lo}</b> occurrence(s) at positions ${res.sa.slice(lo, hi).sort((x, y) => x - y).join(", ") || "—"} · O(m log n)` });
      }
      stepper.set(frames);
    }
    function draw(f) {
      const n = S.length, order = f.st ? f.st.sa : [...Array(n).keys()];
      const head = ["row", "i", "suffix", f.st && !f.final ? `(rank, rank+${f.st.k})` : null, f.final ? "LCP" : null].filter((x) => x != null);
      const rowsEl = order.map((i, r) => {
        const inRange = f.range && r >= f.range[0] && r < f.range[1];
        const cells = [String(r), String(i), h("span", { class: "mono" }, f.final && r > 0 && lcp[r] ? [h("span", { style: "background:var(--hot-soft);border-radius:3px" }, S.substr(i, lcp[r])), S.slice(i + lcp[r])] : S.slice(i))];
        if (f.st && !f.final) cells.push(h("span", { class: "mono" }, `(${f.st.pairs[r][0]}, ${f.st.pairs[r][1]})`));
        if (f.final) cells.push(String(r ? lcp[r] : "—"));
        return h("tr", { style: inRange ? "background:var(--ok-soft)" : f.probes && f.probes.includes(r) ? "background:var(--accent-soft)" : "" }, ...cells.map((c) => h("td", {}, c)));
      });
      stage.replaceChildren(h("table", { class: "tight", style: "font-size:0.62em;margin:0" }, h("tr", {}, ...head.map((x) => h("th", {}, x))), ...rowsEl));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     10. Longest common substring — DP table
     ======================================================= */
  register("lcsdp", (host, d) => {
    let A = d.a || "ABABC", B = d.b || "BABCA";
    inputs(host, [["X", A, 10], ["Y", B, 10]], (a, b) => { A = (a || "A").slice(0, 10); B = (b || "B").slice(0, 10); build(); });
    const stage = h("div"), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption);
    function build() {
      const m = A.length, n = B.length, L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null)); for (let i = 0; i <= m; i++) L[i][0] = 0; for (let j = 0; j <= n; j++) L[0][j] = 0;
      const frames = [{ L: L.map((r) => r.slice()), msg: "L[i][j] = length of the longest common SUFFIX of X[1..i] and Y[1..j]. First row and column are 0." }]; let best = 0, bi = 0, bj = 0;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        const eq = A[i - 1] === B[j - 1]; L[i][j] = eq ? L[i - 1][j - 1] + 1 : 0; if (L[i][j] > best) { best = L[i][j]; bi = i; bj = j; }
        frames.push({ L: L.map((r) => r.slice()), cur: [i, j], eq, best, bi, bj, msg: eq ? `X[${i}] = Y[${j}] = ${A[i - 1]} → L[${i}][${j}] = L[${i - 1}][${j - 1}] + 1 = <b>${L[i][j]}</b>` : `X[${i}] = ${A[i - 1]} ≠ Y[${j}] = ${B[j - 1]} → 0` });
      }
      frames.push({ L, best, bi, bj, done: true, msg: `Maximum cell = <b>${best}</b> at (${bi}, ${bj}) → longest common substring "<b>${A.slice(bi - best, bi)}</b>". Time and space O(mn).` });
      stepper.set(frames);
    }
    function draw(f) {
      const m = A.length, n = B.length;
      const onPath = (i, j) => f.done && f.best && i <= f.bi && i > f.bi - f.best && j - i === f.bj - f.bi;
      const head = h("tr", {}, h("th", {}, ""), h("th", {}, "∅"), ...[...B].map((c) => h("th", {}, c)));
      const rows = []; for (let i = 0; i <= m; i++) rows.push(h("tr", {}, h("th", {}, i ? A[i - 1] : "∅"), ...Array.from({ length: n + 1 }, (_, j) => {
        const v = f.L[i][j]; const cur = f.cur && f.cur[0] === i && f.cur[1] === j; const diag = f.cur && f.eq && f.cur[0] - 1 === i && f.cur[1] - 1 === j;
        return h("td", { style: `text-align:center;font-family:var(--mono);${cur ? "background:var(--accent-soft);outline:2px solid var(--accent)" : diag ? "background:var(--hot-soft)" : onPath(i, j) ? "background:var(--ok-soft);font-weight:700" : v ? "font-weight:700" : "color:var(--muted)"}` }, v == null ? "" : String(v));
      })));
      stage.replaceChildren(h("table", { class: "tight", style: "font-size:0.62em;margin:0" }, head, ...rows));
    }
    build();
    return { stepper };
  });

  /* =======================================================
     11. Longest common substring with a suffix array of X#Y
     ======================================================= */
  register("lcssa", (host, d) => {
    let A = d.a || "ABABC", B = d.b || "BABCA";
    inputs(host, [["X", A, 10], ["Y", B, 10]], (a, b) => { A = a || "A"; B = b || "B"; build(); });
    const stage = h("div"), stepper = Stepper(draw);
    host.append(stage, stepper.bar, stepper.caption);
    let S = "", sa = [], lcp = [];
    function build() {
      S = A + "#" + B + "%"; sa = suffixArrayDoubling(S).sa; lcp = kasai(S, sa);
      const from = (i) => (i < A.length ? 1 : i > A.length ? 2 : 0);
      const frames = [{ r: -1, best: 0, msg: `Build the suffix array of X#Y% = "${S}" (# and % are separators that appear only once). Then scan adjacent rows.` }]; let best = 0, br = -1;
      for (let r = 1; r < S.length; r++) {
        const a = from(sa[r - 1]), b = from(sa[r]), cross = a && b && a !== b;
        if (cross && lcp[r] > best) { best = lcp[r]; br = r; }
        frames.push({ r, cross, best, br, msg: cross ? `Rows ${r - 1}, ${r} come from different strings → common substring of length LCP = ${lcp[r]}${lcp[r] === best && br === r ? " · <span class='ok'>new best</span>" : ""}` : `Rows ${r - 1}, ${r} come from the same string → ignore` });
      }
      frames.push({ r: -1, best, br, done: true, msg: `Longest common substring: "<b>${br > 0 ? S.substr(sa[br], best) : ""}</b>" (length ${best}). Total O((m + n) log(m + n)) with doubling, O(m + n) with a linear SA.` });
      stepper.set(frames);
    }
    function draw(f) {
      const from = (i) => (i < A.length ? "X" : i > A.length ? "Y" : "–");
      stage.replaceChildren(h("table", { class: "tight", style: "font-size:0.56em;margin:0" }, h("tr", {}, ...["row", "from", "suffix", "LCP"].map((x) => h("th", {}, x))),
        ...sa.map((i, r) => h("tr", { style: (r === f.r || r === f.r - 1) ? `background:${f.cross ? "var(--hot-soft)" : "var(--line)"}` : f.done && (r === f.br || r === f.br - 1) ? "background:var(--ok-soft)" : "" },
          h("td", {}, String(r)), h("td", { style: `font-weight:700;color:${from(i) === "X" ? "var(--accent)" : from(i) === "Y" ? "var(--hot)" : "var(--muted)"}` }, from(i)), h("td", { class: "mono" }, S.slice(i)), h("td", {}, r ? String(lcp[r]) : "—")))));
    }
    build();
    return { stepper };
  });
})();

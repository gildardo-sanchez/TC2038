/* =========================================================
   TC2038 · course runtime
   - boots Reveal.js with the course defaults
   - turns .quiz / .predict / .timer markup into interactive blocks
   - mounts animated widgets (see widgets.js) after Markdown is rendered
   Keyboard (besides Reveal defaults):
     .  /  ,   step the animation on the current slide forward / back
     1-4       answer the quiz on the current slide (A-D)
     D         toggle dark mode
   ========================================================= */
(function () {
  "use strict";

  // ---------- Quiz ----------
  // Markup (inside Markdown, keep it flush-left and without blank lines):
  // <div class="quiz" data-answer="2">
  // <p class="q">Question?</p>
  // <ol><li>Option A</li><li>Option B</li></ol>
  // <p class="explain">Why…</p>
  // </div>
  // data-answer is 1-based.
  function mountQuiz(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    const answer = parseInt(box.dataset.answer, 10);
    const items = Array.from(box.querySelectorAll("ol > li"));
    const keys = "ABCDEFGH";
    items.forEach((li, i) => {
      const btn = document.createElement("button");
      btn.className = "opt";
      btn.type = "button";
      btn.innerHTML = '<span class="key">' + keys[i] + "</span><span>" + li.innerHTML + "</span>";
      btn.addEventListener("click", () => choose(i));
      li.innerHTML = "";
      li.appendChild(btn);
    });
    function choose(i) {
      const btns = box.querySelectorAll(".opt");
      btns.forEach((b) => b.classList.remove("correct", "wrong"));
      if (i + 1 === answer) btns[i].classList.add("correct");
      else {
        btns[i].classList.add("wrong");
        if (box.dataset.reveal !== "manual") btns[answer - 1].classList.add("correct");
      }
      box.classList.add("answered");
    }
    const tools = document.createElement("div");
    tools.className = "quiz-tools";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      box.querySelectorAll(".opt").forEach((b) => b.classList.remove("correct", "wrong"));
      box.classList.remove("answered");
    });
    tools.appendChild(reset);
    box.appendChild(tools);
    box._choose = choose;
  }

  // ---------- Predict a value ----------
  // <div class="predict" data-answer="25" data-tol="0"><p class="q">How many calls?</p><p class="explain">…</p></div>
  function mountPredict(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    const ans = parseFloat(box.dataset.answer);
    const tol = parseFloat(box.dataset.tol || "0");
    const row = document.createElement("div");
    row.className = "row";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "your guess";
    const check = document.createElement("button");
    check.type = "button";
    check.textContent = "Check";
    const show = document.createElement("button");
    show.type = "button";
    show.textContent = "Show answer";
    const fb = document.createElement("span");
    fb.className = "fb";
    row.append(inp, check, show, fb);
    const q = box.querySelector(".q");
    (q ? q : box.firstChild).after(row);
    function test() {
      const v = parseFloat(inp.value.replace(/,/g, ""));
      if (isNaN(v)) { fb.textContent = ""; return; }
      if (Math.abs(v - ans) <= tol) { fb.textContent = "✓ correct"; fb.className = "fb ok"; box.classList.add("shown"); }
      else { fb.textContent = v < ans ? "↑ higher" : "↓ lower"; fb.className = "fb bad"; }
    }
    check.addEventListener("click", test);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") test(); e.stopPropagation(); });
    show.addEventListener("click", () => { fb.textContent = "Answer: " + box.dataset.answer; fb.className = "fb ok"; box.classList.add("shown"); });
  }

  // ---------- Countdown timer ----------
  // <div class="timer" data-seconds="120"></div>
  function mountTimer(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    const total = parseInt(box.dataset.seconds || "60", 10);
    let left = total, id = null;
    const clock = document.createElement("span");
    clock.className = "clock";
    const start = document.createElement("button");
    start.type = "button";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset";
    box.append(clock, start, reset);
    function fmt(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
    function paint() { clock.textContent = fmt(left); start.textContent = id ? "Pause" : "Start"; box.classList.toggle("done", left === 0); }
    start.addEventListener("click", () => {
      if (id) { clearInterval(id); id = null; }
      else {
        if (left === 0) left = total;
        id = setInterval(() => { left = Math.max(0, left - 1); if (left === 0) { clearInterval(id); id = null; } paint(); }, 1000);
      }
      paint();
    });
    reset.addEventListener("click", () => { clearInterval(id); id = null; left = total; paint(); });
    paint();
  }

  function mountAll(root) {
    root.querySelectorAll(".quiz").forEach(mountQuiz);
    root.querySelectorAll(".predict").forEach(mountPredict);
    root.querySelectorAll(".timer").forEach(mountTimer);
    if (window.Widgets) window.Widgets.mountAll(root);
  }

  // ---------- Theme ----------
  function setDark(on) {
    document.documentElement.classList.toggle("dark", on);
    try { localStorage.setItem("tc2038-dark", on ? "1" : "0"); } catch (e) { /* storage blocked */ }
    if (window.Widgets) window.Widgets.repaintAll();
  }
  try { if (localStorage.getItem("tc2038-dark") === "1") document.documentElement.classList.add("dark"); } catch (e) { /* ignore */ }

  // Markdown quirk: "- text **bold** <!-- .element: class="fragment" -->" attaches the
  // fragment to the <strong>, not to the list item. Move it to the <li> so the whole
  // bullet appears at once (otherwise only the bold words are hidden).
  function fixListFragments(root) {
    root.querySelectorAll("li strong.fragment, li em.fragment, li b.fragment, li i.fragment, li a.fragment, li code.fragment").forEach((el) => {
      const li = el.closest("li");
      if (!li || li.classList.contains("fragment")) { el.classList.remove("fragment"); return; }
      li.classList.add("fragment");
      ["data-fragment-index"].forEach((a) => { if (el.hasAttribute(a)) li.setAttribute(a, el.getAttribute(a)); });
      el.classList.remove("fragment", "visible", "current-fragment");
      el.removeAttribute("data-fragment-index");
    });
  }

  function currentSlide() { return window.Reveal && Reveal.getCurrentSlide(); }

  function stepCurrent(dir) {
    const s = currentSlide();
    if (!s || !window.Widgets) return;
    window.Widgets.stepIn(s, dir);
  }

  function answerCurrent(i) {
    const s = currentSlide();
    if (!s) return;
    const q = s.querySelector(".quiz");
    if (q && q._choose && q.querySelectorAll(".opt")[i]) q._choose(i);
  }

  // ---------- Boot ----------
  window.Course = {
    init(extra) {
      const plugins = [RevealMarkdown, RevealHighlight, RevealNotes];
      if (window.RevealMath) plugins.push(RevealMath.KaTeX);
      if (window.RevealZoom) plugins.push(RevealZoom);
      const cfg = Object.assign({
        hash: true,
        width: 1280,
        height: 720,
        margin: 0.06,
        center: true,
        slideNumber: "c/t",
        showSlideNumber: "all",
        transition: "fade",
        transitionSpeed: "fast",
        backgroundTransition: "none",
        controlsTutorial: false,
        pdfSeparateFragments: false,
        katex: { version: "0.16.11", delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ], ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"] },
        keyboard: {
          190: () => stepCurrent(1),   // .
          188: () => stepCurrent(-1),  // ,
          68: () => setDark(!document.documentElement.classList.contains("dark")), // D
          49: () => answerCurrent(0), 50: () => answerCurrent(1), 51: () => answerCurrent(2), 52: () => answerCurrent(3)
        },
        plugins
      }, extra || {});
      return Reveal.initialize(cfg).then(() => {
        fixListFragments(document.querySelector(".reveal .slides"));
        mountAll(document.querySelector(".reveal .slides"));
        Reveal.sync();
        Reveal.layout();
      });
    }
  };
})();

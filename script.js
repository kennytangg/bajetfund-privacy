// Language switch and "where am I" in the contents. Without JavaScript all three languages
// show one after another and every link still works.
(function () {
  var root = document.documentElement;
  var policies = [].slice.call(document.querySelectorAll(".policy"));
  var buttons = [].slice.call(document.querySelectorAll(".lang button"));
  if (!policies.length) return;
  var codes = policies.map(function (p) { return p.dataset.lang; });
  var stopWatching = null;
  var pinHandler = null;
  var shownLang = null;
  var currentSection = null; // e.g. "security", shared across languages

  // "#zh" picks a language; "#zh-contact" picks it and jumps to that section.
  function fromHash() {
    var code = location.hash.slice(1).split("-")[0];
    return codes.indexOf(code) >= 0 ? code : null;
  }

  function fromBrowser() {
    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var c = String(langs[i]).toLowerCase();
      if (c.indexOf("zh") === 0) return "zh";
      if (c.indexOf("id") === 0 || c.indexOf("in") === 0) return "id";
      if (c.indexOf("en") === 0) return "en";
    }
    return "en";
  }

  function pick(code, writeHash) {
    var shown = null;
    policies.forEach(function (p) {
      var on = p.dataset.lang === code;
      p.hidden = !on;
      if (on) shown = p;
    });
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === code)); });
    root.lang = shown.getAttribute("lang");
    document.title = shown.dataset.title;
    if (writeHash && history.replaceState) history.replaceState(null, "", "#" + code);
    shownLang = code;
    watch(shown);
  }

  // Marks the section being read in the desktop contents: the last one whose heading has passed the
  // reading line (see update). A click in the contents marks its section straight away, until the
  // reader scrolls by hand again.
  function watch(policy) {
    if (stopWatching) stopWatching();
    var links = {};
    [].slice.call(policy.querySelectorAll(".toc a")).forEach(function (a) {
      a.removeAttribute("aria-current"); // left over from the last time this language was shown
      links[a.hash.slice(1)] = a;
    });
    var sections = [].slice.call(policy.querySelectorAll(".clause"));
    var current = null;
    var pinned = null;
    var pinY = null; // where the jump to the pinned section landed
    var queued = false;

    function mark(id) {
      if (id === current || !links[id]) return;
      if (current && links[current]) links[current].removeAttribute("aria-current");
      links[id].setAttribute("aria-current", "true");
      current = id;
      currentSection = id.slice(id.indexOf("-") + 1);
    }

    function update() {
      queued = false;
      if (pinned) {
        if (pinY === null) pinY = window.scrollY;
        if (Math.abs(window.scrollY - pinY) <= 60) { mark(pinned); return; }
        pinned = null; // moved away from the jump, by wheel, keys, touch or scrollbar
      }
      // The reading line sits just under the top bar. Over the last stretch of the page it slides down
      // to the bottom of the window, so the short final sections still get marked one by one, in order.
      var top = 140;
      var view = window.innerHeight;
      var remaining = document.documentElement.scrollHeight - view - window.scrollY;
      var stretch = view * 0.75;
      var line = remaining >= stretch ? top : top + (view - top) * (1 - Math.max(remaining, 0) / stretch);
      var id = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) id = sections[i].id; else break;
      }
      mark(id);
    }

    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    function unpin() { pinned = null; }
    // The jump lands a frame after the pin, so measure it then.

    pinHandler = function (id) { if (links[id]) { pinned = id; pinY = null; mark(id); onScroll(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    ["wheel", "touchstart", "keydown"].forEach(function (t) { window.addEventListener(t, unpin, { passive: true }); });
    update();

    stopWatching = function () {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ["wheel", "touchstart", "keydown"].forEach(function (t) { window.removeEventListener(t, unpin); });
    };
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".toc a");
    if (a && pinHandler) pinHandler(a.hash.slice(1));
  });

  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      // Stay on the same section in the other language, unless still reading the top of the page.
      var section = window.scrollY > 300 ? currentSection : null;
      pick(b.dataset.lang, true);
      var target = section && document.getElementById(b.dataset.lang + "-" + section);
      if (target) {
        target.scrollIntoView();
        if (pinHandler) pinHandler(target.id);
      }
    });
  });

  window.addEventListener("hashchange", function () {
    var code = fromHash();
    if (!code) return;
    if (code !== shownLang) pick(code, false);
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  });

  // Close the phone contents after a tap so the section is visible.
  [].slice.call(document.querySelectorAll(".toc-mobile a")).forEach(function (a) {
    a.addEventListener("click", function () { a.closest("details").open = false; });
  });

  pick(fromHash() || fromBrowser(), false);
  var start = document.getElementById(location.hash.slice(1));
  if (start && start.classList.contains("clause")) start.scrollIntoView();
})();

/* ==========================================================================
   Pixerio — motion pass (v3.0)
   Adds the movement the v1.7 build deliberately withheld: entrance choreography,
   masked heading reveals beyond the hero, magnetic controls, and a shallow
   parallax on photography. Everything here is GPU-only (transform/opacity),
   camera-quiet (max 6px pull, max 14px parallax), and stops dead on the site's
   "Pause motion" control and under prefers-reduced-motion.
   The hero surface itself is driven by assets/js/hero-bg.js.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)');

  function paused() {
    return root.getAttribute('data-motion') === 'paused' || reduce.matches;
  }
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  root.classList.add('js');

  /* -------- 1. entrance choreography: crumbs, lead, actions rise in order -------- */
  function entrance() {
    window.setTimeout(function () { root.classList.add('is-ready'); }, 80);
  }

  /* -------- 2. masked line reveals for every heading, not just the hero -------- */
  function revealLines() {
    var lines = [].slice.call(document.querySelectorAll('.mask-line'));
    if (!lines.length) return;
    if (!('IntersectionObserver' in window) || reduce.matches) {
      lines.forEach(function (l) { l.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var line = en.target;
        var sibs = [].slice.call(line.parentElement.querySelectorAll('.mask-line'));
        var i = Math.max(0, sibs.indexOf(line));
        io.unobserve(line);
        window.setTimeout(function () { line.classList.add('in'); }, i * 90);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    lines.forEach(function (l) { if (!l.classList.contains('in')) io.observe(l); });
  }

  /* -------- 3. magnetic controls: 6px of pull, nothing more -------- */
  function magnetic() {
    if (!fine.matches || reduce.matches) return;
    [].slice.call(document.querySelectorAll('.btn, .header-cta')).forEach(function (el) {
      var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

      function step() {
        if (paused()) { el.style.transform = ''; running = false; return; }
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        if (Math.abs(tx - cx) > 0.08 || Math.abs(ty - cy) > 0.08) {
          window.requestAnimationFrame(step);
        } else {
          running = false;
        }
      }
      function kick() { if (!running) { running = true; window.requestAnimationFrame(step); } }

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx = Math.max(-6, Math.min(6, (e.clientX - (r.left + r.width / 2)) * 0.16));
        ty = Math.max(-4, Math.min(4, (e.clientY - (r.top + r.height / 2)) * 0.18));
        kick();
      }, { passive: true });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
      el.addEventListener('blur', function () { tx = 0; ty = 0; kick(); });
    });
  }

  /* -------- 4. shallow parallax on photography (max 14px) -------- */
  function parallax() {
    var els = [].slice.call(document.querySelectorAll('.tile img, .feature__media img'));
    if (!els.length || reduce.matches) return;
    var queued = false;

    function draw() {
      queued = false;
      var vh = window.innerHeight;
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        var p = (r.top + r.height / 2 - vh / 2) / vh;      /* -0.5 .. 0.5 across the viewport */
        var py = Math.max(-14, Math.min(14, -p * 22));
        if (paused()) els[i].style.removeProperty('--py');
        else els[i].style.setProperty('--py', py.toFixed(2) + 'px');
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(draw);
    }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    queue();
  }

  /* -------- 5. the quote tab steps back while the hero CTA is on screen -------- */
  function quietTab() {
    var tab = document.querySelector('.quote-tab');
    var hero = document.querySelector('.page-head');
    if (!tab || !hero) return;
    var queued = false;
    function draw() {
      queued = false;
      var limit = hero.getBoundingClientRect().height * 0.72;
      tab.classList.toggle('is-quiet', window.scrollY < limit);
    }
    function queue() { if (queued) return; queued = true; window.requestAnimationFrame(draw); }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    draw();
  }

  onReady(function () {
    entrance();
    quietTab();
    revealLines();
    magnetic();
    parallax();
  });
})();

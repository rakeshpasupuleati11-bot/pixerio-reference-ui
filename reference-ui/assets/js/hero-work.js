/* ==========================================================================
   Pixerio — hero work wall (v3.2)
   Cycles real projects in the hero, each slide labelled with the service it
   belongs to and the promise that service makes. Tabs drive it, arrows move
   it, hover/focus holds it. Stops when scrolled away, when the site motion
   control is paused, and under prefers-reduced-motion. No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-works]');
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide]'));
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-tab]'));
  var bar = root.querySelector('[data-bar]');
  var copy = root.querySelector('.works__copy') || root;
  var num = copy.querySelector('[data-num]');
  var title = copy.querySelector('[data-title]');
  var promise = copy.querySelector('[data-promise]');
  var meta = copy.querySelector('[data-meta]');
  var cta = copy.querySelector('[data-cta]');
  if (slides.length < 2) return;

  var HOLD = 5000;
  var i = 0, timer = null, hover = false, visible = true;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function still() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  function paint(n) {
    i = (n + slides.length) % slides.length;
    var s = slides[i];

    slides.forEach(function (el, k) { el.setAttribute('data-on', k === i ? 'true' : 'false'); });
    tabs.forEach(function (el, k) { el.setAttribute('aria-selected', k === i ? 'true' : 'false'); });

    if (num) num.textContent = s.getAttribute('data-num') || String(i + 1);
    if (title) title.textContent = s.getAttribute('data-title') || '';
    if (promise) promise.textContent = s.getAttribute('data-promise') || '';
    if (meta) {
      var m = s.getAttribute('data-meta') || '';
      meta.textContent = m;
      if (m) meta.removeAttribute('hidden'); else meta.setAttribute('hidden', '');
    }
    if (cta) cta.setAttribute('href', s.getAttribute('data-href') || '#work');

    if (bar) {
      bar.setAttribute('data-run', 'false');
      // restart the progress bar on the next frame
      void bar.offsetWidth;
      if (!still() && visible && !hover) bar.setAttribute('data-run', 'true');
    }
  }

  function start() {
    stop();
    if (still() || hover || !visible) return;
    if (bar) bar.setAttribute('data-run', 'true');
    timer = setInterval(function () { paint(i + 1); }, HOLD);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bar) bar.setAttribute('data-run', 'false');
  }

  function go(n) { paint(n); start(); }

  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { go(k); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      go(next);
      tabs[next].focus();
    });
  });

  root.addEventListener('mouseenter', function () { hover = true; stop(); });
  root.addEventListener('mouseleave', function () { hover = false; start(); });
  root.addEventListener('focusin', function () { hover = true; stop(); });
  root.addEventListener('focusout', function () { hover = false; start(); });

  if (window.MutationObserver) {
    new MutationObserver(function () { still() ? stop() : start(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }
  if (reduce.addEventListener) reduce.addEventListener('change', function () { still() ? stop() : start(); });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.15 }).observe(root);
  }

  paint(0);
  start();
})();

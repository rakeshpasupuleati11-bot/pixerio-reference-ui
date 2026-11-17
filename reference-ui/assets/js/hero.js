/* ==========================================================================
   Pixerio — hero shot (v5.0)
   One slow crossfade between three pieces of work. That is the whole script.
   Pauses when the hero is off screen, on hover, when the site motion control
   is paused, and under prefers-reduced-motion (where it holds one image).
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-shot]');
  if (!root) return;

  var imgs = Array.prototype.slice.call(root.querySelectorAll('[data-shot-img]'));
  if (imgs.length < 2) return;

  var nameEl = root.querySelector('[data-shot-name]');
  var linkEl = root.querySelector('[data-shot-link]');
  var idxEl = root.querySelector('[data-shot-idx]');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var HOLD = 6000;
  var i = 0, timer = null, hover = false, visible = true;

  function still() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  function paint(n) {
    i = (n + imgs.length) % imgs.length;
    var img = imgs[i];
    imgs.forEach(function (el, k) { el.classList.toggle('on', k === i); });
    if (nameEl) nameEl.textContent = img.getAttribute('data-name') || '';
    if (linkEl) linkEl.setAttribute('href', img.getAttribute('data-href') || '#work');
    if (idxEl) idxEl.textContent = ('0' + (i + 1)).slice(-2) + ' / 0' + imgs.length;
  }

  function start() {
    stop();
    if (still() || hover || !visible) return;
    timer = setInterval(function () { paint(i + 1); }, HOLD);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

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

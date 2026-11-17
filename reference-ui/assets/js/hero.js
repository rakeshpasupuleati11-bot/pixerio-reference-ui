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

  var hxEl = document.querySelector('.hx');
  function syncPaused() {
    if (hxEl) hxEl.classList.toggle('hx--paused', still());
    still() ? stop() : start();
  }
  syncPaused();

  if (window.MutationObserver) {
    new MutationObserver(syncPaused)
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

  /* ---------- entrance ---------- */
  var hx = hxEl;
  if (hx) {
    window.requestAnimationFrame(function () {
      window.setTimeout(function () { hx.classList.add('is-in'); }, 60);
    });
  }

  /* ---------- pointer + scroll parallax on the shot ---------- */
  var shot = root;
  var tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, syT = 0, raf = null;

  function kick() { if (!raf) raf = window.requestAnimationFrame(draw); }
  function draw() {
    raf = null;
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    sy += (syT - sy) * 0.09;
    shot.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + (cy + sy).toFixed(2) + 'px,0)';
    if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 || Math.abs(syT - sy) > 0.05) kick();
  }

  window.addEventListener('pointermove', function (e) {
    if (still()) return;
    tx = (e.clientX / window.innerWidth - 0.5) * 12;
    ty = (e.clientY / window.innerHeight - 0.5) * 10;
    kick();
  }, { passive: true });

  window.addEventListener('scroll', function () {
    if (still()) { syT = 0; return; }
    var r = shot.getBoundingClientRect();
    syT = Math.max(-18, Math.min(18, -r.top * 0.045));
    kick();
  }, { passive: true });

  document.documentElement.addEventListener('motionchange', function () { sy = syT = 0; kick(); });
})();

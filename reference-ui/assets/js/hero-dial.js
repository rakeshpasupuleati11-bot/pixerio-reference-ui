/* ==========================================================================
   Pixerio — hero dial (v3.1)
   Turns the static six-service list in the hero into a stepped orbit:
   one service active at a time, its promise in the middle, its own image
   behind it. Pauses on hover/focus, when scrolled out of view, when the site
   motion control is paused, and under prefers-reduced-motion (where it only
   changes on click, never on a timer). No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var dial = document.querySelector('[data-dial]');
  if (!dial || !window.matchMedia) return;

  var items = Array.prototype.slice.call(dial.querySelectorAll('[data-i]'));
  var faceImg = dial.querySelector('[data-face-img]');
  var faceTitle = dial.querySelector('[data-face-title]');
  var facePromise = dial.querySelector('[data-face-promise]');
  var faceLink = dial.querySelector('[data-face-link]');
  var dotsBox = dial.querySelector('[data-dots]');
  if (items.length < 2 || !faceImg || !faceTitle) return;

  var HOLD = 3800;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var index = 0;
  var timer = null;
  var visible = true;
  var hovering = false;

  function motionOff() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  // dots
  var dots = [];
  if (dotsBox) {
    items.forEach(function (_, i) {
      var d = document.createElement('span');
      d.className = 'dial__dot';
      d.setAttribute('data-on', i === 0 ? 'true' : 'false');
      dotsBox.appendChild(d);
      dots.push(d);
    });
  }

  function show(i) {
    index = (i + items.length) % items.length;
    var node = items[index];
    var img = node.querySelector('img');
    var label = node.querySelector('.dial__label');
    var promise = node.querySelector('.dial__promise');

    items.forEach(function (n, k) {
      n.setAttribute('data-active', k === index ? 'true' : 'false');
      var a = n.querySelector('.dial__node');
      if (a) a.setAttribute('aria-current', k === index ? 'true' : 'false');
    });
    dots.forEach(function (d, k) { d.setAttribute('data-on', k === index ? 'true' : 'false'); });

    if (img && faceImg.getAttribute('src') !== img.getAttribute('src')) {
      faceImg.setAttribute('src', img.getAttribute('src'));
    }
    if (label && faceTitle) faceTitle.textContent = label.textContent;
    if (promise && facePromise) facePromise.textContent = promise.textContent;
    if (faceLink) {
      var a2 = node.querySelector('.dial__node');
      if (a2 && a2.getAttribute('href')) faceLink.setAttribute('href', a2.getAttribute('href'));
    }
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function start() {
    stop();
    if (motionOff() || hovering || !visible) return;
    timer = setInterval(function () { show(index + 1); }, HOLD);
  }

  function go(i) { show(i); start(); }

  // interactions
  items.forEach(function (n, i) {
    var a = n.querySelector('.dial__node');
    if (!a) return;
    a.addEventListener('mouseenter', function () { show(i); });
    a.addEventListener('focus', function () { show(i); });
    a.addEventListener('click', function (e) {
      // let the link do its job; just make sure the face matches what was clicked
      show(i);
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    });
  });

  dial.addEventListener('mouseenter', function () { hovering = true; focusMode(true); });
  dial.addEventListener('mouseleave', function () { hovering = false; focusMode(false); });
  dial.addEventListener('focusin', function () { hovering = true; focusMode(true); });
  dial.addEventListener('focusout', function () { hovering = false; focusMode(false); });

  function focusMode(on) {
    if (on) stop(); else start();
  }

  dial.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    go(index + (e.key === 'ArrowRight' ? -1 : 1));
    var a = items[index].querySelector('.dial__node');
    if (a) a.focus();
  });

  // motion control
  if (window.MutationObserver) {
    new MutationObserver(function () { if (motionOff()) stop(); else start(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }
  if (reduce.addEventListener) reduce.addEventListener('change', start);

  // stop work when the hero is off screen
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.15 }).observe(dial);
  }

  // go live: only when the orbit styles can actually apply
  var wide = window.matchMedia('(min-width: 1000px)');
  function applyMode() {
    if (wide.matches) {
      show(index);
      dial.classList.add('is-live');
      start();
    } else {
      stop();
      dial.classList.remove('is-live');
    }
  }
  applyMode();
  if (wide.addEventListener) wide.addEventListener('change', applyMode);
})();

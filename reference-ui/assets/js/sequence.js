/* ==========================================================================
   Pixerio — the six-service sequence controller
   Maps scroll progress through the pinned stage to one of six services and
   cross-fades the copy, the ticks and the project shot. Reverses naturally
   when scrolling back. Stops under reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  var sq = document.querySelector('[data-sq]');
  if (!sq) return;

  var shots = Array.prototype.slice.call(sq.querySelectorAll('[data-shot]'));
  var num = sq.querySelector('[data-num]');
  var numBig = sq.querySelector('[data-num-big]');
  var name = sq.querySelector('[data-name]');
  var promise = sq.querySelector('[data-promise]');
  var link = sq.querySelector('[data-link]');
  var ticks = Array.prototype.slice.call(sq.querySelectorAll('[data-tick]'));
  if (!shots.length) return;

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var current = -1;
  var raf = null;

  var data = shots.map(function (s) {
    return {
      num: s.getAttribute('data-n') || '',
      name: s.getAttribute('data-title') || '',
      promise: s.getAttribute('data-promise') || '',
      href: s.getAttribute('data-href') || '#work'
    };
  });

  function paint(i) {
    if (i === current) return;
    current = i;
    shots.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    ticks.forEach(function (t, k) { t.classList.toggle('on', k === i); });
    var d = data[i] || data[0];
    if (num) num.textContent = d.num;
    if (numBig) numBig.textContent = d.num;
    if (name) name.textContent = d.name;
    if (promise) promise.textContent = d.promise;
    if (link) link.setAttribute('href', d.href);
  }

  function frame() {
    raf = null;
    var r = sq.getBoundingClientRect();
    var span = sq.offsetHeight - window.innerHeight;
    if (span <= 0) { paint(0); return; }
    var p = Math.min(1, Math.max(0, -r.top / span));
    var i = Math.min(shots.length - 1, Math.floor(p * shots.length));
    paint(i);
  }

  function queue() { if (!raf) raf = window.requestAnimationFrame(frame); }

  if (reduce.matches) { paint(0); }
  else {
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    frame();
  }
})();

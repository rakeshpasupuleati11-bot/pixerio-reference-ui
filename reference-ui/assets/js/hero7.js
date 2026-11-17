/* ==========================================================================
   Pixerio — hero v7 controller
   Drives the depth corridor: six panels on one axis, camera pushed by scroll,
   tilted by the pointer. Nothing pinned, nothing hijacked. Frozen by the site
   motion toggle and under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var hx = document.querySelector('.hx');
  if (!hx) return;
  var world = hx.querySelector('.hx__world');
  var panels = Array.prototype.slice.call(hx.querySelectorAll('.pnl'));
  var point = hx.querySelector('.hx__point');
  if (!world || !panels.length) return;

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function still() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  // place the panels along Z, each smaller and further, converging on the point
  var GAP = 260;
  function layout() {
    panels.forEach(function (p, i) {
      var z = -i * GAP;
      var scale = 1 - i * 0.05;
      var tilt = (i % 2 ? 1 : -1) * (2 + i * 1.2);
      var off = (i % 2 ? 1 : -1) * i * 10;
      p.style.transform = 'translate3d(calc(-50% + ' + off + 'px), -50%, ' + z + 'px) ' +
        'rotateY(' + tilt + 'deg) scale(' + scale + ')';
      p.style.zIndex = String(10 - i);
      p.style.opacity = String(Math.max(0.22, 0.62 - i * 0.07));
      p.style.filter = i ? 'blur(' + (i * 0.9).toFixed(1) + 'px)' : 'none';
    });
  }
  layout();

  var camZ = 0, camTarget = 0, tiltX = 0, tiltY = 0, curX = 0, curY = 0, raf = null;

  function kick() { if (!raf) raf = window.requestAnimationFrame(draw); }

  function draw() {
    raf = null;
    camZ += (camTarget - camZ) * 0.08;
    curX += (tiltX - curX) * 0.08;
    curY += (tiltY - curY) * 0.08;
    if (still()) { world.style.transform = ''; return; }
    world.style.transform =
      'translateZ(' + camZ.toFixed(1) + 'px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
    if (Math.abs(camTarget - camZ) > 0.4 || Math.abs(tiltX - curX) > 0.02 || Math.abs(tiltY - curY) > 0.02) kick();
  }

  window.addEventListener('scroll', function () {
    if (still()) return;
    var r = hx.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
    camTarget = p * 420;              // camera pushes forward through the corridor
    if (point) point.style.opacity = String(Math.max(0.25, 1 - p));
    kick();
  }, { passive: true });

  var fine = window.matchMedia ? window.matchMedia('(hover:hover) and (pointer:fine)').matches : false;
  if (fine) {
    hx.addEventListener('pointermove', function (e) {
      if (still()) return;
      var r = hx.getBoundingClientRect();
      tiltY = ((e.clientX - r.left) / r.width - 0.5) * 7;
      tiltX = -((e.clientY - r.top) / r.height - 0.5) * 5;
      kick();
    });
    hx.addEventListener('pointerleave', function () { tiltX = 0; tiltY = 0; kick(); });
  }

  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (still()) { camZ = camTarget = 0; curX = curY = 0; world.style.transform = ''; }
      else kick();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }

  window.addEventListener('resize', function () { layout(); kick(); }, { passive: true });

  // entrance class (the copy stack); also set by hero-enter.js when present
  window.requestAnimationFrame(function () { window.setTimeout(function () { hx.classList.add('is-in'); }, 60); });
})();

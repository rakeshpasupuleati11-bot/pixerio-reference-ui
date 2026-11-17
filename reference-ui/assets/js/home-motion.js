/* ==========================================================================
   Pixerio — home motion controller v6
   - duplicates the marquee group so the loop is seamless
   - scroll-linked parallax fade-up on [data-parallax] sections
   - a short hero exit (scale + lift + fade) while the hero leaves the screen
   No pinning, no scroll hijack. Everything stops on the site motion toggle and
   under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function still() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  /* ---------- marquee: clone the group for a seamless loop ---------- */
  var track = document.querySelector('.mq__track');
  if (track) {
    var group = track.querySelector('.mq__group');
    if (group && track.children.length < 2) {
      var clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
  }

  /* ---------- scroll parallax ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var heroWrap = document.querySelector('.hx__wrap');
  var heroOrb = document.querySelector('.hx__orb');
  var raf = null;

  function frame() {
    raf = null;
    var vh = window.innerHeight || 800;

    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      // 0 when the section's top is at the bottom of the viewport, 1 when it reaches 40% up
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.6)));
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var shift = (1 - eased) * 34;
      el.style.transform = still() ? 'none' : 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      el.style.opacity = still() ? '1' : (0.2 + eased * 0.8).toFixed(3);
    });

    if (sprogBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      sprogBar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0).toFixed(2) + '%';
    }

    if (heroWrap && !still()) {
      var hr = heroWrap.getBoundingClientRect();
      var hp = Math.min(1, Math.max(0, -hr.top / (vh * 0.9)));
      if (hp > 0.001) {
        heroWrap.style.transform = 'translate3d(0,' + (-hp * 60).toFixed(1) + 'px,0) scale(' + (1 - hp * 0.06).toFixed(3) + ')';
        heroWrap.style.opacity = (1 - hp * 0.9).toFixed(3);
        if (heroOrb) heroOrb.style.transform = 'translate3d(0,' + (-hp * 110).toFixed(1) + 'px,0)';
      } else {
        heroWrap.style.transform = '';
        heroWrap.style.opacity = '';
        if (heroOrb) heroOrb.style.transform = '';
      }
    }
  }

  function queue() { if (!raf) raf = window.requestAnimationFrame(frame); }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });

  var band = document.querySelector('.mq');

  function syncStill() {
    var frozen = still();
    if (track) track.style.animationPlayState = frozen ? 'paused' : '';
    if (band) band.style.animationPlayState = frozen ? 'paused' : '';
    if (frozen) items.forEach(function (el) { el.style.transform = 'none'; el.style.opacity = '1'; });
    queue();
  }
  syncStill();

  if (window.MutationObserver) {
    new MutationObserver(syncStill)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }

  /* ---------- scroll progress rail ---------- */
  var sprog = document.createElement('div');
  sprog.className = 'sprog';
  sprog.innerHTML = '<i></i>';
  document.body.appendChild(sprog);
  var sprogBar = sprog.firstChild;

  /* ---------- kinetic band: duplicate rows for a seamless loop ---------- */
  document.querySelectorAll('.kin__row').forEach(function (row) {
    if (row.children.length && row.dataset.done !== '1') {
      row.innerHTML = row.innerHTML + row.innerHTML;
      row.dataset.done = '1';
    }
  });

  /* ---------- horizontal rail: drag + arrow buttons ---------- */
  document.querySelectorAll('.rail').forEach(function (rail) {
    var track = rail.querySelector('.rail__track');
    var prev = rail.querySelector('[data-rail-prev]');
    var next = rail.querySelector('[data-rail-next]');
    if (!track) return;
    var step = function () { return Math.max(260, track.clientWidth * 0.8); };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    var down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', function (e) {
      down = true; sx = e.clientX; sl = track.scrollLeft; track.classList.add('dragging');
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      track.scrollLeft = sl - (e.clientX - sx);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      track.addEventListener(ev, function () { down = false; track.classList.remove('dragging'); });
    });
  });

  /* ---------- clip reveal ---------- */
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.clip').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.clip').forEach(function (el) { el.classList.add('in'); });
  }

  // seed: mark the sections that should ride in
  document.querySelectorAll('main > section').forEach(function (s) {
    if (s.classList.contains('hx')) return;
    if (s.hasAttribute('data-parallax')) return;
    s.setAttribute('data-parallax', '');
    items.push(s);
  });
  queue();
})();

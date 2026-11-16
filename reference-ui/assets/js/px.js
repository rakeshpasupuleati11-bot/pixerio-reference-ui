/* Pixerio — "Signal" interaction layer (v2.0)
   No dependencies. Everything degrades: with JS off, content is visible and links work.
   Correctness does not depend on requestAnimationFrame (background tabs throttle it). */
(function () {
  'use strict';
  var root = document.documentElement,
      reduce = matchMedia('(prefers-reduced-motion: reduce)'),
      fine = matchMedia('(hover:hover) and (pointer:fine)'),
      KEY = 'pixerio:motion',
      paused = function () { return root.getAttribute('data-motion') === 'paused' || reduce.matches; };

  root.classList.add('js');
  try { if (localStorage.getItem(KEY) === 'paused') root.setAttribute('data-motion', 'paused'); } catch (e) {}

  /* ---------------- header, nav ---------------- */
  var header = document.querySelector('.site-header'),
      nav = document.getElementById('nav'),
      navBtn = document.querySelector('.nav-toggle'),
      parent = document.querySelector('.nav__parent'),
      menu = document.getElementById('services-menu'),
      prog = document.querySelector('.progress');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    if (parent) parent.setAttribute('aria-expanded', 'false');
  }
  function closeNav() {
    if (!header || !navBtn) return;
    header.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
  if (parent && menu) parent.addEventListener('click', function (e) {
    e.preventDefault();
    var open = menu.classList.toggle('is-open');
    parent.setAttribute('aria-expanded', String(open));
  });
  if (navBtn) navBtn.addEventListener('click', function () {
    var open = !header.classList.contains('is-open');
    header.classList.toggle('is-open', open);
    navBtn.setAttribute('aria-expanded', String(open));
    if (!open) closeMenu();
  });
  document.addEventListener('click', function (e) {
    if (menu && menu.classList.contains('is-open') && !e.target.closest('.has-menu')) closeMenu();
    if (header && header.classList.contains('is-open') && !e.target.closest('.site-header')) closeNav();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menu && menu.classList.contains('is-open')) { closeMenu(); if (parent) parent.focus(); return; }
    closeNav();
  });
  addEventListener('resize', function () { if (innerWidth > 900) { closeNav(); closeMenu(); } }, { passive: true });

  /* ---------------- motion toggle ---------------- */
  var mBtn = document.querySelector('.motion-toggle'), mLabel = document.querySelector('.motion-toggle__label');
  function paintToggle() {
    var p = root.getAttribute('data-motion') === 'paused';
    if (mBtn) {
      mBtn.setAttribute('aria-pressed', String(p));
      mBtn.setAttribute('aria-label', p ? 'Play motion — resume animation on this page'
                                       : 'Pause motion — freeze animation on this page');
    }
    if (mLabel) mLabel.textContent = p ? 'Play motion' : 'Pause motion';
  }
  paintToggle();
  if (mBtn) mBtn.addEventListener('click', function () {
    var p = root.getAttribute('data-motion') !== 'paused';
    if (p) root.setAttribute('data-motion', 'paused'); else root.removeAttribute('data-motion');
    try { localStorage.setItem(KEY, p ? 'paused' : 'playing'); } catch (e) {}
    paintToggle();
  });

  /* ---------------- split headings into masked lines ---------------- */
  /* Splits on explicit <br> or on sentence boundaries; wraps each line so it can rise into view.
     Runs only once per heading and leaves the original text intact for search engines. */
  function splitLines(el) {
    if (!el || el.dataset.split === 'done' || el.querySelector('img,svg,ul,ol')) return;
    var html = el.innerHTML.trim();
    if (html.replace(/<[^>]+>/g, '').length < 44) return; /* short headings stay one piece */
    var parts = html.split(/<br\s*\/?>/i).map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length < 2) {
      var words = html.split(/\s+/);
      if (words.length < 4) return;
      var mid = Math.ceil(words.length / 2);
      parts = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    el.innerHTML = parts.map(function (p) {
      return '<span class="mask-line"><span>' + p + '</span></span>';
    }).join('');
    el.dataset.split = 'done';
  }
  [].slice.call(document.querySelectorAll('[data-split], .page-head h1, .hero h1')).forEach(splitLines);

  /* reveal the above-the-fold headings immediately, then stagger the rest */
  function readyHeads() {
    [].slice.call(document.querySelectorAll('.page-head h1 .mask-line, .hero h1 .mask-line')).forEach(function (l, i) {
      setTimeout(function () { l.classList.add('in'); }, 90 + i * 90);
    });
    root.classList.add('split-ready');
  }
  if (document.readyState !== 'loading') readyHeads(); else document.addEventListener('DOMContentLoaded', readyHeads);

  /* ---------------- reveals ---------------- */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (!('IntersectionObserver' in window) || reduce.matches) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }
  /* mark major blocks for reveal without touching markup-by-hand */
  if ('IntersectionObserver' in window && !reduce.matches) {
    var blocks = document.querySelectorAll('.sec-head, .work .tile, .cards .card, .bento .info, .step, .quote, .row, .info, .feature__media');
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
          io2.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    [].slice.call(blocks).forEach(function (el, i) {
      if (el.classList.contains('in')) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity .8s var(--ease) ' + ((i % 4) * 60) + 'ms, transform .8s var(--ease) ' + ((i % 4) * 60) + 'ms';
      io2.observe(el);
    });
  }

  /* ---------------- scroll chrome ---------------- */
  var lastY = 0, ticking = false;
  function draw() {
    var y = scrollY;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (prog) {
      var max = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    }
    var rail = document.querySelector('.process__rail i');
    if (rail) {
      var box = rail.parentElement.getBoundingClientRect();
      var seen = Math.min(1, Math.max(0, (innerHeight * 0.75 - box.top) / (box.height + innerHeight * 0.2)));
      rail.style.transform = 'scaleY(' + seen.toFixed(3) + ')';
    }
    [].slice.call(document.querySelectorAll('.tile__frame, .tile')).forEach(function (t) {});
    lastY = y; ticking = false;
  }
  addEventListener('scroll', function () { draw(); }, { passive: true });
  addEventListener('resize', draw, { passive: true });
  draw();

  /* ---------------- counters ---------------- */
  var nums = [].slice.call(document.querySelectorAll('.stat__n'));
  if (nums.length && 'IntersectionObserver' in window && !reduce.matches) {
    var ioN = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, raw = el.textContent.trim(), m = raw.match(/^0*(\d+)(.*)$/);
        ioN.unobserve(el);
        if (!m) return;
        var target = parseInt(m[1], 10), suffix = m[2] || '', start = null;
        function step(t) {
          if (!start) start = t;
          var k = Math.min(1, (t - start) / 900);
          var val = Math.round(target * (1 - Math.pow(1 - k, 3)));
          el.textContent = (raw.charAt(0) === '0' && target < 10 ? '0' : '') + val + suffix;
          if (k < 1) requestAnimationFrame(step);
          else el.textContent = raw;
        }
        requestAnimationFrame(step);
        setTimeout(function () { el.textContent = raw; }, 1200);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { ioN.observe(n); });
  }

  /* ---------------- persistent action tab (pattern from the live site) ---------------- */
  if (!document.querySelector('.quote-tab')) {
    var tab = document.createElement('a');
    tab.className = 'quote-tab';
    tab.href = 'contact-us.html';
    tab.innerHTML = '<span>Get a free quote</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(tab);
  }

  /* ---------------- magnetic controls + cursor: retired in v2.4 ----------------
     Nothing follows the pointer and nothing moves under the cursor. Hover is
     colour, edge and underline only, so the pages stay still while reading. */

  /* ---------------- ribbon: duplicate the track for a seamless loop ---------------- */
  [].slice.call(document.querySelectorAll('.ribbon__track')).forEach(function (track) {
    if (track.dataset.cloned === 'yes') return;
    track.innerHTML += track.innerHTML;
    track.dataset.cloned = 'yes';
  });

  /* ---------------- hero pointer parallax: retired in v2.4 ---------------- */
})();

/* ---------------- v2.2 additions ---------------- */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)'),
      fine = matchMedia('(hover:hover) and (pointer:fine)'),
      root = document.documentElement,
      paused = function () { return root.getAttribute('data-motion') === 'paused' || reduce.matches; };

  /* signature sequence: one project, brief to launch */
  var seq = document.querySelector('[data-seq]');
  if (seq) {
    var steps = [].slice.call(seq.querySelectorAll('.seq__step')),
        shots = [].slice.call(seq.querySelectorAll('.seq__media img')),
        cap = seq.querySelector('.seq__media figcaption'),
        rail = seq.querySelector('.seq__rail i'),
        desktop = function () { return innerWidth >= 1080; };

    function sizeSeq() {
      var pinned = desktop() && !reduce.matches;
      seq.style.height = pinned ? (100 + steps.length * 65) + 'vh' : '';
      if (!pinned) {
        steps.forEach(function (s) { s.classList.add('is-on'); });
        shots.forEach(function (s, i) { s.classList.toggle('is-on', i === 0); });
        return;
      }
      drawSeq();
    }
    function drawSeq() {
      if (!desktop() || !steps.length) {
        steps.forEach(function (s) { s.classList.add('is-on'); });
        shots.forEach(function (s, i) { s.classList.toggle('is-on', i === 0); });
        return;
      }
      var r = seq.getBoundingClientRect(),
          span = seq.offsetHeight - innerHeight,
          p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0,
          n = steps.length,
          idx = Math.min(n - 1, Math.floor(p * n));
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === idx); });
      shots.forEach(function (s, i) { s.classList.toggle('is-on', i === idx); });
      if (cap) cap.textContent = steps[idx] ? (steps[idx].getAttribute('data-label') || '') : '';
      if (rail) rail.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    sizeSeq();
    addEventListener('scroll', function () { if (!paused() || true) drawSeq(); }, { passive: true });
    addEventListener('resize', sizeSeq, { passive: true });
  }

  /* portfolio cursor preview: retired in v2.4 — images no longer pop out over the
     cursor. The tile itself is the preview; it does not move or zoom. */

  /* ribbon reacts to scroll velocity */
  var ribbon = document.querySelector('.ribbon__track');
  if (ribbon && !reduce.matches) {
    var last = 0, timer = null;
    addEventListener('scroll', function () {
      var v = Math.abs(scrollY - last); last = scrollY;
      if (v > 4) {
        ribbon.style.animationDuration = Math.max(8, 44 - Math.min(34, v)) + 's';
        clearTimeout(timer);
        timer = setTimeout(function () { ribbon.style.animationDuration = ''; }, 400);
      }
    }, { passive: true });
  }

  /* skip-to-target focus handling for in-page CTAs */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { t.setAttribute('tabindex', '-1'); setTimeout(function () { t.focus({ preventScroll: true }); }, 420); }
    });
  });
})();

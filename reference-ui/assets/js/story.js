/* ==========================================================================
   Pixerio — scroll story controller (v4.0)
   One rAF loop, one smoothed progress value, five beats. No libraries.
   Content is ours: six services, 22 documented projects, 12 named clients,
   3 stages, 1 partner. Nothing here is invented.
   Stops on html[data-motion="paused"], respects prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var story = document.querySelector('[data-story]');
  if (!story) return;

  var stage = story.querySelector('.story__stage');
  var cam = story.querySelector('[data-cam]');
  var plate = story.querySelector('[data-plate]');
  var front = story.querySelector('[data-front]');
  var hero = story.querySelector('[data-hero]');
  var heroFoot = story.querySelector('[data-herofoot]');
  var heroLayer = story.querySelector('[data-layer="0"]');
  var footLayer = story.querySelector('[data-layer="1b"]');
  var plates = Array.prototype.slice.call(story.querySelectorAll('[data-plate-item]'));
  var count = story.querySelector('[data-count]');
  var approachLayer = story.querySelector('[data-layer="2"]');
  var approach = story.querySelector('[data-approach]');
  var acctLayer = story.querySelector('[data-layer="3"]');
  var acct = story.querySelector('[data-acct]');
  var spots = Array.prototype.slice.call(story.querySelectorAll('[data-spot]'));
  var stationLayer = story.querySelector('[data-layer="4"]');
  var cred = story.querySelector('[data-cred]');
  var card = story.querySelector('[data-card]');
  var numEl = story.querySelector('[data-num]');
  var ticks = Array.prototype.slice.call(story.querySelectorAll('[data-tick]'));
  var feats = Array.prototype.slice.call(story.querySelectorAll('[data-feat]'));
  var prog = story.querySelector('[data-prog]');
  var panel = document.querySelector('[data-panel]');

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function paused() {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  }

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------- word splitting ---------- */
  function splitWords(el) {
    if (!el || el.dataset.split === 'done') return [];
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    return words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'story__word';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
  }
  var approachWords = splitWords(story.querySelector('[data-words]'));
  var acctWords = splitWords(acct);

  /* ---------- state ---------- */
  var sp = 0, p = 0, last = 0;
  var sx = 0, sy = 0, txs = 0, tys = 0;
  var shownCount = -1;

  function metrics() {
    var r = story.getBoundingClientRect();
    var span = story.offsetHeight - window.innerHeight;
    p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  /* ---------- interaction ---------- */
  spots.forEach(function (s) {
    s.addEventListener('click', function () {
      var on = s.classList.contains('on');
      spots.forEach(function (o) { o.classList.remove('on'); });
      if (!on) s.classList.add('on');
    });
  });
  feats.forEach(function (f) {
    f.addEventListener('click', function () {
      var on = f.classList.contains('on');
      feats.forEach(function (o) { o.classList.remove('on'); });
      if (!on) f.classList.add('on');
    });
  });

  window.addEventListener('pointermove', function (e) {
    txs = e.clientX / window.innerWidth - 0.5;
    tys = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* ---------- the frame ---------- */
  function frame(t) {
    var dt = Math.min(64, t - last || 16.7);
    last = t;

    metrics();
    var still = paused();
    if (still) sp = p;
    else {
      sp += (p - sp) * (1 - Math.pow(0.86, dt / 16.7));
      if (Math.abs(p - sp) < 0.0002) sp = p;
    }
    sx += (txs - sx) * (still ? 1 : 0.06);
    sy += (tys - sy) * (still ? 1 : 0.06);

    /* 1 — hero out, camera in */
    var h = seg(sp, 0.02, 0.12);
    if (hero) {
      hero.style.transform = 'translate3d(' + (-sx * 10).toFixed(2) + 'px,' + (-h * 80 - sy * 6).toFixed(2) + 'px,0) scale(' + (1 + h * 0.12).toFixed(3) + ')';
      hero.style.filter = h > 0.001 ? 'blur(' + (h * 14).toFixed(2) + 'px)' : 'none';
      hero.style.opacity = (1 - h).toFixed(3);
    }
    if (heroFoot) {
      heroFoot.style.transform = 'translate3d(' + (-sx * 8).toFixed(2) + 'px,' + (-h * 60 - sy * 5).toFixed(2) + 'px,0)';
      heroFoot.style.filter = h > 0.001 ? 'blur(' + (h * 10).toFixed(2) + 'px)' : 'none';
      heroFoot.style.opacity = (1 - h).toFixed(3);
    }
    if (footLayer) footLayer.style.visibility = h >= 0.999 ? 'hidden' : 'visible';
    if (heroLayer) heroLayer.style.visibility = h >= 0.999 ? 'hidden' : 'visible';

    var dolly = ease(seg(sp, 0.08, 0.44));
    if (cam) {
      cam.style.transform =
        'translate3d(' + (-sx * 18).toFixed(2) + 'px,' + (-sy * 12 + (1 - dolly) * window.innerHeight * 0.06).toFixed(2) +
        'px,0) scale(' + (1 + dolly * 0.42).toFixed(3) + ')';
      cam.style.filter = dolly > 0.001 ? 'blur(' + (dolly * 6).toFixed(2) + 'px)' : 'none';
      cam.style.opacity = (1 - seg(sp, 0.36, 0.46)).toFixed(3);
    }
    if (front) {
      front.style.transform = cam ? cam.style.transform : '';
      front.style.opacity = (1 - seg(sp, 0.36, 0.46)).toFixed(3);
    }

    /* 2 — the six services fly past */
    var activeIdx = -1;
    plates.forEach(function (el, i) {
      var a = 0.10 + i * 0.045;
      var u = seg(sp, a, a + 0.17);
      var on = sp > a - 0.02 && sp < a + 0.19;
      if (on && u > 0.35 && u < 0.75) activeIdx = i;
      el.style.opacity = on ? (u < 0.16 ? (u / 0.16).toFixed(3) : u > 0.82 ? ((1 - u) / 0.18).toFixed(3) : '1') : '0';
      el.style.transform =
        'translate(-50%,-50%) translate3d(' + (i % 2 ? 6 : -6) + 'vw,' + ((0.5 - u) * 30).toFixed(2) + 'vh,0) ' +
        'scale(' + (0.82 + u * 1.5).toFixed(3) + ') rotate(' + ((i % 2 ? 1 : -1) * (u - 0.5) * 3).toFixed(2) + 'deg)';
      el.style.filter = u > 0.001 && u < 0.999 ? 'blur(' + (Math.abs(u - 0.42) * 11).toFixed(2) + 'px)' : 'none';
      el.style.zIndex = 10 + i;
    });
    if (count) {
      var cOn = seg(sp, 0.10, 0.13) * (1 - seg(sp, 0.40, 0.44));
      count.style.opacity = cOn.toFixed(3);
      if (activeIdx >= 0 && activeIdx !== shownCount) {
        shownCount = activeIdx;
        count.textContent = '0' + (activeIdx + 1) + ' / 06 — ' + (plates[activeIdx].getAttribute('data-name') || '');
      }
    }

    /* 3 — approach, written by scroll */
    var vIn = seg(sp, 0.40, 0.50), vOut = seg(sp, 0.52, 0.585);
    if (approach) {
      approach.style.opacity = '1';
      approachWords.forEach(function (w, i) {
        var k = clamp(vIn * 1.7 - i * 0.085, 0, 1);
        w.style.transform = 'translate3d(0,' + ((1 - k) * 30 - vOut * 60).toFixed(2) + 'px,0)';
        w.style.filter = (1 - k) * 12 + vOut * 14 > 0.01 ? 'blur(' + ((1 - k) * 12 + vOut * 14).toFixed(2) + 'px)' : 'none';
        w.style.opacity = (k * (1 - vOut)).toFixed(3);
      });
    }
    if (approachLayer) approachLayer.style.visibility = sp >= 0.40 && sp <= 0.60 ? 'visible' : 'hidden';

    /* 4 — accounting + hotspots */
    var aIn = seg(sp, 0.55, 0.63), aOut = seg(sp, 0.66, 0.70);
    acctWords.forEach(function (w, i) {
      var k = clamp(aIn * 2.2 - (i / Math.max(1, acctWords.length)) * 1.2, 0, 1);
      w.style.opacity = ((0.15 + 0.85 * k) * (1 - aOut)).toFixed(3);
      var b = (1 - k) * 6 + aOut * 10;
      w.style.filter = b > 0.01 ? 'blur(' + b.toFixed(2) + 'px)' : 'none';
    });
    spots.forEach(function (s, i) {
      var k = ease(seg(sp, 0.575 + i * 0.02, 0.60 + i * 0.02));
      s.style.opacity = (k * (1 - aOut)).toFixed(3);
      s.style.transform = 'translate3d(' + (-sx * 30).toFixed(1) + 'px,' + (-sy * 20).toFixed(1) + 'px,0) scale(' + Math.max(0.001, k * (1 - aOut)).toFixed(3) + ')';
    });
    if (acctLayer) acctLayer.style.visibility = sp >= 0.55 && sp <= 0.71 ? 'visible' : 'hidden';

    /* 5 — the station */
    var sIn = seg(sp, 0.70, 0.80);
    if (cred) {
      cred.style.opacity = sIn.toFixed(3);
      cred.style.transform = 'translate3d(0,' + ((1 - sIn) * 30).toFixed(2) + 'px,0)';
      cred.style.filter = sIn < 0.999 ? 'blur(' + ((1 - sIn) * 8).toFixed(2) + 'px)' : 'none';
    }
    var cIn = ease(seg(sp, 0.72, 0.86));
    if (card) {
      card.style.opacity = cIn.toFixed(3);
      card.style.transform =
        'translate3d(' + (-sx * 14).toFixed(1) + 'px,' + ((1 - cIn) * 60 - sy * 10).toFixed(1) + 'px,0) ' +
        'rotateY(' + (sx * 8).toFixed(2) + 'deg) rotateX(' + (-sy * 8).toFixed(2) + 'deg)';
    }
    var n = Math.round(22 * seg(sp, 0.74, 0.90));
    if (numEl && numEl.textContent !== String(n)) numEl.textContent = String(n);
    var fill = Math.round(ticks.length * seg(sp, 0.76, 0.92));
    ticks.forEach(function (tk, i) { tk.style.background = i < fill ? 'var(--s-lime)' : 'rgba(255,255,255,.22)'; });
    feats.forEach(function (f, i) {
      var k = ease(seg(sp, 0.74 + i * 0.022, 0.80 + i * 0.022));
      f.style.opacity = k.toFixed(3);
      f.style.transform = 'translateX(' + ((1 - k) * 40).toFixed(1) + 'px)';
    });
    if (stationLayer) stationLayer.style.visibility = sp >= 0.70 ? 'visible' : 'hidden';

    if (prog) prog.style.transform = 'scaleX(' + sp.toFixed(4) + ')';

    /* panel stats: start once its top passes 60% of the viewport */
    if (panel && window.__panelRun && panel.getBoundingClientRect().top < window.innerHeight * 0.6) {
      window.__panelRun();
    }

    window.requestAnimationFrame(frame);
  }

  /* ---------- the panel: tilt + count-up ---------- */
  (function panelBits() {
    if (!panel) return;
    var cards = Array.prototype.slice.call(panel.querySelectorAll('[data-tilt]'));
    cards.forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        if (paused() || e.pointerType === 'touch') return;
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(1000px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });

    var stats = Array.prototype.slice.call(panel.querySelectorAll('[data-stat]'));
    var done = false;
    function run() {
      if (done) return;
      done = true;
      var t0 = performance.now();
      function tick(now) {
        var k = clamp((now - t0) / 1600, 0, 1);
        var e = ease(k);
        stats.forEach(function (s) {
          var target = parseFloat(s.getAttribute('data-stat'));
          var dec = parseInt(s.getAttribute('data-dec') || '0', 10);
          var val = (target * e).toFixed(dec);
          if (parseInt(s.getAttribute('data-comma') || '0', 10)) {
            val = Number(val).toLocaleString('en-IN');
          }
          s.textContent = val;
        });
        if (k < 1) window.requestAnimationFrame(tick);
      }
      window.requestAnimationFrame(tick);
    }

    // the panel's top passing 60% of the viewport starts the count, once
    panel.addEventListener('story:panel', run);
    window.__panelRun = run;
  })();

  /* ---------- go ---------- */
  window.addEventListener('resize', metrics, { passive: true });
  metrics();
  sp = p;
  window.requestAnimationFrame(function (t) { last = t; frame(t); });
})();

/* ==========================================================================
   Pixerio — site motion controller v1
   Runs on every page. Tags sections and images for reveal, staggers them by
   row, draws the scroll progress rail, and boots the page-in transition.
   Nothing here touches layout. Everything stops on the site motion toggle.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function still() {
    return reduce.matches || doc.getAttribute('data-motion') === 'paused';
  }

  /* page-in: only if JS is alive, so no-JS users never see a blank page */
  doc.classList.add('sm-boot');
  var unhide = function () { doc.classList.remove('sm-boot'); };
  window.requestAnimationFrame(function () { window.setTimeout(unhide, 40); });
  window.setTimeout(unhide, 600);

  /* ---------- scroll progress rail ---------- */
  var bar = document.createElement('div');
  bar.className = 'sprog';
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var fill = bar.firstChild;

  /* ---------- tag what should reveal ---------- */
  var targets = [];

  document.querySelectorAll('main section').forEach(function (sec, si) {
    if (sec.closest('.hx')) return;                    // the hero owns its own motion
    if (!sec.hasAttribute('data-sm')) {
      sec.setAttribute('data-sm', '');
      sec.classList.add('sm-r');
      targets.push(sec);
    }
    // stagger the direct children that read as blocks
    Array.prototype.slice.call(sec.children).forEach(function (child, ci) {
      var tag = child.tagName.toLowerCase();
      if (['h2', 'h3', 'p', 'div', 'ul', 'ol', 'article', 'figure'].indexOf(tag) < 0) return;
      if (child.classList.contains('sm-r') || child.closest('.sm-r') === child) return;
      if (!child.hasAttribute('data-sm')) {
        child.setAttribute('data-sm', '');
        child.classList.add('sm-r');
        child.style.transitionDelay = Math.min(0.36, ci * 0.06) + 's';
        targets.push(child);
      }
    });
  });

  /* images uncover — wrapped in a span so the observed node never clips itself */
  document.querySelectorAll('main img').forEach(function (img) {
    if (img.closest('.hx') || img.closest('.sm-img')) return;
    var parent = img.parentElement;
    if (!parent) return;
    parent.classList.add('sm-img');
    targets.push(parent);
  });

  /* ---------- observer ---------- */
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('sm-in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('sm-in'); });
  }

  /* anything already in view on load reveals immediately */
  window.requestAnimationFrame(function () {
    targets.forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) t.classList.add('sm-in');
    });
  });

  /* ---------- progress + still handling ---------- */
  var raf = null;
  function frame() {
    raf = null;
    var max = doc.scrollHeight - window.innerHeight;
    fill.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0).toFixed(2) + '%';
  }
  function queue() { if (!raf) raf = window.requestAnimationFrame(frame); }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });

  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (still()) {
        targets.forEach(function (t) { t.classList.add('sm-in'); });
      }
    }).observe(doc, { attributes: true, attributeFilter: ['data-motion'] });
  }

  /* the fixed quote link needs a landmark around it */
  var qt = document.querySelector('.quote-tab');
  if (qt && !qt.closest('.quote-aside')) {
    var aside = document.createElement('aside');
    aside.className = 'quote-aside';
    aside.setAttribute('aria-label', 'Quick enquiry');
    qt.parentNode.insertBefore(aside, qt);
    aside.appendChild(qt);
  }

  /* heading order: an h3 that appears before any h2 is really a level-2
     heading. Set aria-level so the outline reads correctly without changing
     the visual size of card titles. */
  var seenH2 = false;
  Array.prototype.forEach.call(document.querySelectorAll('h1,h2,h3'), function (h) {
    var t = h.tagName;
    if (t === 'H1') seenH2 = false;
    else if (t === 'H2') seenH2 = true;
    else if (t === 'H3' && !seenH2) h.setAttribute('aria-level', '2');
  });

  /* inner pages get the same numbered chapters the home page has */
  if (document.body.getAttribute('data-page') !== 'index.html') {
    var secs = Array.prototype.slice.call(document.querySelectorAll('main > section'));
    secs.forEach(function (sec, i) {
      if (sec.classList.contains('hx') || sec.classList.contains('page-head')) return;
      var wrap = sec.querySelector('.wrap') || sec;
      if (wrap.querySelector('.sm-chapter')) return;
      var h = wrap.querySelector('h2');
      if (!h) return;                       /* only label real content blocks */
      var label = h.textContent.trim().split(/[.,]/)[0].slice(0, 34);
      var el = document.createElement('p');
      el.className = 'sm-chapter';
      el.textContent = ('0' + (i + 1)).slice(-2) + ' · ' + label;
      wrap.insertBefore(el, wrap.firstChild);
    });
  }

  /* BUILD_STAMP — a quiet marker so it is always obvious which build is on screen */
  var foot = document.querySelector('footer .footer__bottom') || document.querySelector('footer');
  if (foot && !document.querySelector('.build-stamp')) {
    var b = document.createElement('span');
    b.className = 'build-stamp';
    b.style.cssText = 'font-family:var(--mono);font-size:9px;letter-spacing:.14em;' +
      'text-transform:uppercase;opacity:.45;margin-left:12px;white-space:nowrap';
    b.textContent = 'build 20261117n';
    foot.appendChild(b);
  }

  queue();
})();

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

  queue();
})();

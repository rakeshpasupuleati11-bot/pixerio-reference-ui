/* ==========================================================================
   Pixerio — story spine controller (home only)
   Gives the five story blocks on the home page a chapter number and name,
   prints the label above each block, and tracks the active chapter in a fixed
   marker with a jump list.
   ========================================================================== */
(function () {
  'use strict';

  if (document.body.getAttribute('data-page') !== 'index.html') return;

  var chapters = [
    { sel: '[data-atm="paper"]', n: '01', name: 'The studio' },
    { sel: '[data-sq]', n: '02', name: 'What we do' },
    { sel: '[data-atm="mesh"]', n: '03', name: 'The work' },
    { sel: '.process', n: '04', name: 'How we work' },
    { sel: '[data-atm="signal"]', n: '05', name: 'Start' }
  ].map(function (c) {
    c.el = document.querySelector(c.sel);
    return c;
  }).filter(function (c) { return c.el; });

  if (chapters.length < 2) return;

  // labels above each block (and an id so the jump list has a target)
  chapters.forEach(function (c, i) {
    if (!c.el.id) c.el.id = 'ch-' + c.n;
    var wrap = c.el.querySelector('.wrap') || c.el;
    if (wrap.querySelector('.spine-chapter')) return;
    var lab = document.createElement('p');
    lab.className = 'spine-chapter';
    lab.innerHTML = '<b>' + c.n + '</b> ' + c.name;
    wrap.insertBefore(lab, wrap.firstChild);
  });

  // fixed marker + jump list
  var marker = document.createElement('div');
  marker.className = 'spine';
  marker.innerHTML = '<span class="spine__n">01</span><span class="spine__name">The studio</span>' +
    '<span class="spine__bar"><i></i></span>';
  document.body.appendChild(marker);

  var list = document.createElement('ul');
  list.className = 'spine__list';
  chapters.forEach(function (c, i) {
    var li = document.createElement('li');
    if (i === 0) li.className = 'on';
    var a = document.createElement('a');
    a.href = '#' + (c.el.id || '');
    a.textContent = c.n + ' · ' + c.name;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      c.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    li.appendChild(a);
    list.appendChild(li);
  });
  document.body.appendChild(list);

  var numEl = marker.querySelector('.spine__n');
  var nameEl = marker.querySelector('.spine__name');
  var barEl = marker.querySelector('.spine__bar i');
  var items = Array.prototype.slice.call(list.children);
  var active = 0;
  var raf = null;

  function frame() {
    raf = null;
    var mid = window.innerHeight * 0.45;
    var idx = 0;
    chapters.forEach(function (c, i) {
      var r = c.el.getBoundingClientRect();
      if (r.top <= mid) idx = i;
    });
    if (idx !== active) {
      active = idx;
      numEl.textContent = chapters[idx].n;
      nameEl.textContent = chapters[idx].name;
      items.forEach(function (li, k) { li.classList.toggle('on', k === idx); });
    }
    var c = chapters[active];
    var r2 = c.el.getBoundingClientRect();
    var span = Math.max(1, r2.height);
    var p = Math.min(1, Math.max(0, (mid - r2.top) / span));
    barEl.style.transform = 'translateX(' + (p * 400).toFixed(0) + '%)';
  }
  function queue() { if (!raf) raf = window.requestAnimationFrame(frame); }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  frame();
})();

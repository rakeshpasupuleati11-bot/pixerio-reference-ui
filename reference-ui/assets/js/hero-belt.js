/* ============================================================
   Hero belt — six disciplines on a conveyor, one scanner, real pixels.
   One requestAnimationFrame loop drives card positions, the code twins,
   the readout badge and the canvas dissolve. No libraries.
   ============================================================ */
(() => {
  const belt = document.querySelector('[data-belt]');
  if (!belt) return;

  const cardEls = [...belt.querySelectorAll('[data-card]')];
  const plateEls = [...belt.querySelectorAll('[data-2d]')];
  const canvas = belt.querySelector('[data-fx]');
  const badgeNum = document.querySelector('[data-badge-num]');
  const badgePct = document.querySelector('[data-badge-pct]');
  const ctx = canvas.getContext('2d');
  if (!cardEls.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rootEl = document.documentElement;
  const paused = () => rootEl.getAttribute('data-motion') === 'paused'
    || rootEl.classList.contains('motion-paused');
  const still = () => reduce.matches || paused();

  let W = 0, H = 0, cw = 0, ch = 0, gap = 0, span = 0, period = 0, Lx = 0, dpr = 1;
  let off = 0, vel = 0, hover = 0, drag = null;
  let sparks = [];
  let badgeState = { i: -1, shown: 0 };

  const PALETTE = ['#0B4C7A', '#0E5C93', '#1E6FA8', '#217FC3', '#2E92D6', '#6FB9E3', '#A8D6EE'];

  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* 32-bit integer hash, stable across frames */
  const hash = (a, b, c) => {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const measure = () => {
    const rect = cardEls[0].getBoundingClientRect();
    cw = rect.width; ch = rect.height;
    // --gap is authored in vw on .hero; read it there and convert to px
    const gapRaw = getComputedStyle(belt.closest('.hero') || belt)
      .getPropertyValue('--gap').trim();
    gap = gapRaw.endsWith('vw') ? parseFloat(gapRaw) * window.innerWidth / 100
        : gapRaw.endsWith('rem') ? parseFloat(gapRaw) * 16
        : (parseFloat(gapRaw) || cw * 0.1);
    span = cw + gap;
    period = span * cardEls.length;
    W = belt.clientWidth; H = belt.clientHeight;
    Lx = window.innerWidth / 2;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // open on a card just crossing the line: a sliver on desktop, about half
    // of the card on a phone where the viewport only shows part of one
    if (!off) off = Lx - (window.innerWidth < 900 ? 0.45 : 0.12) * cw;
  };

  /* ---------------- canvas ---------------- */

  const drawHaze = (x, cut) => {
    const R = x + cw - Lx;
    if (R <= 0) return;
    const w = Math.min(110, R);
    const g = ctx.createLinearGradient(Lx, 0, Lx + 110, 0);
    g.addColorStop(0, 'rgba(46,146,214,.20)');
    g.addColorStop(1, 'rgba(46,146,214,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Lx, 70, w, ch);
  };

  const drawDots = (x, cut, i, t, frozen) => {
    const R = 0.24 * cw, rows = Math.round(ch / 3);
    const startGX = Math.floor(cut / 3), endGX = Math.ceil((cut + R) / 3);
    const twinkleBucket = Math.floor(t * 9) + 97;
    for (let gx = startGX; gx <= endGX; gx++) {
      const sx = x + gx * 3;
      const d = sx - Lx;
      if (d < 0) continue;
      const t = 1 - d / R;
      if (!(t > 0.04)) continue;          // past the falloff: nothing to draw
      const p = Math.pow(t, 1.7);
      if (!(p > 0.01)) continue;
      for (let row = -5; row <= rows + 5; row++) {
        const inside = row >= 0 && row < rows;
        const prob = inside ? p * 0.92 : p * 0.16 * (1 - Math.abs(row) / (rows + 6));
        if (hash(gx, row, i) >= prob) continue;
        if (!frozen && hash(gx, row, twinkleBucket) < 0.22) continue;
        const h2 = hash(row, gx, i + 31);
        const near = d < 10;
        const col = near
          ? PALETTE[Math.floor(h2 * 3)]          // white-hot at the line
          : PALETTE[2 + Math.floor(h2 * 3)];
        const size = 1.3 + h2 * 1.8;
        const jx = frozen ? 0 : (hash(gx + 7, row, i) - 0.5) * 1.6;
        const jy = frozen ? 0 : (hash(gx, row + 11, i) - 0.5) * 1.6;
        ctx.fillStyle = col;
        ctx.fillRect(sx + jx, 70 + row * 3 + jy, size, size);
      }
    }
  };

  const stepSparks = (dt) => {
    if (!still()) {
      for (let s = 0; s < 3; s++) {
        if (Math.random() > 0.7) continue;
        sparks.push({
          x: Lx + Math.random() * 30,
          y: 70 + Math.random() * (ch + 20) - 10,
          vx: -30 + Math.random() * 70 + vel * 0.6,
          vy: (Math.random() - 0.5) * 50,
          life: 0.3 + Math.random() * 0.8,
          age: 0,
          size: 0.8 + Math.random() * 1.8,
          col: Math.random() < 0.12 ? '#49AD48' : PALETTE[Math.floor(Math.random() * 4)]
        });
      }
    }
    for (let k = sparks.length - 1; k >= 0; k--) {
      const sp = sparks[k];
      sp.age += dt;
      if (sp.age > sp.life) { sparks.splice(k, 1); continue; }
      sp.x += sp.vx * dt; sp.y += sp.vy * dt;
      ctx.globalAlpha = Math.min(1, sp.life * 2.2) * (1 - sp.age / sp.life);
      ctx.fillStyle = sp.col;
      ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
      ctx.globalAlpha = 1;
    }
  };

  /* ---------------- per-frame ---------------- */

  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (paused()) {
      // frozen: keep the composition exactly as it is, no advance, no sparks
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < cardEls.length; i++) {
        const x = mod(off + i * span + span, period) - span;
        const cut = clamp(Lx - x, 0, cw);
        place(i, x, cut);
        if (cut > 0 && x + cw > Lx) { drawHaze(x, cut); drawDots(x, cut, i, 0, true); }
      }
      raf = requestAnimationFrame(frame);
      return;
    }

    const auto = reduce.matches ? 0 : -0.075 * window.innerWidth;
    const target = auto * (1 - 0.65 * hover);
    if (!drag) {
      vel += (target - vel) * (1 - Math.exp(-2.2 * dt));
      off += vel * dt;
    }

    ctx.clearRect(0, 0, W, H);
    let crossing = -1, crossCut = 0;

    for (let i = 0; i < cardEls.length; i++) {
      const x = mod(off + i * span + span, period) - span;
      const cut = clamp(Lx - x, 0, cw);
      place(i, x, cut);
      if (cut > 0 && cut < cw) { crossing = i; crossCut = cut; }
      if (cut > 0 && x + cw > Lx) {
        drawHaze(x, cut);
        drawDots(x, cut, i, t, false);
      }
    }

    stepSparks(dt);
    updateBadge(crossing, crossCut, dt);
    raf = requestAnimationFrame(frame);
  };

  const place = (i, x, cut) => {
    const card = cardEls[i], plate = plateEls[i];
    const tx = `translate3d(${x.toFixed(2)}px,0,0)`;
    card.style.transform = tx;
    if (cut > 0) {
      card.style.clipPath = `inset(0 0 0 ${cut.toFixed(1)}px round 0 1.6vw 1.6vw 0)`;
      card.style.webkitClipPath = card.style.clipPath;
      // the card is eaten, not merely covered: its own alpha climbs behind the
      // particle field so text dissolves faster than the dots
      card.style.maskImage = 'linear-gradient(90deg,transparent ' + cut.toFixed(1) + 'px,'
        + 'rgba(0,0,0,.6) ' + (cut + 12).toFixed(1) + 'px,'
        + '#000 ' + (cut + 44).toFixed(1) + 'px)';
      card.style.webkitMaskImage = card.style.maskImage;
    } else if (card.style.clipPath) {
      card.style.clipPath = '';
      card.style.webkitClipPath = '';
      card.style.maskImage = '';
      card.style.webkitMaskImage = '';
    }
    if (!plate) return;
    // The plate is deposited by the scanner: its right edge sits on the line
    // while the card is being consumed, then it travels left with the belt as
    // a whole object. Nothing is sliced.
    const plateX = Math.min(x, Lx - cw);
    const appear = cut <= 0 ? 0 : Math.min(1, Math.max(0, (cut / cw - 0.04) / 0.26));
    // once it has drifted clear of the scanner the object fades, so only the
    // newest plate is ever prominent and plates never stack on each other
    const drift = Math.min(1, Math.max(0, (Lx - cw - x) / (0.15 * cw)));
    const alpha = appear * (1 - drift);
    // only the card at the scanner owns a visible plate
    plate.dataset.alpha = alpha.toFixed(3);
    const tilt = -10 - (1 - appear) * 12;      // a standing object, not a flat print
    const scale = (0.84 + 0.16 * appear) * 0.94;
    plate.style.transform = 'translate3d(' + plateX.toFixed(2) + 'px,0,0)'
      + ' rotateY(' + tilt.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    plate.style.opacity = alpha.toFixed(3);
    plate.style.zIndex = String(Math.round(appear * 8));
    plate.style.visibility = cut > 0 ? 'visible' : 'hidden';
  };

  const updateBadge = (i, cut, dt) => {
    if (!badgeNum || !badgePct || i < 0) return;
    if (i !== badgeState.i) {
      badgeState.i = i;
      badgeState.shown = 0;
      const total = Number(cardEls[i].dataset.total || 0);
      badgeState.total = total;
      badgePct.textContent = (i + 1 < 10 ? '0' : '') + (i + 1) + '/06';
    }
    const total = badgeState.total || 0;
    badgeNum.textContent = String(total).padStart(2, '0');
  };

  /* ---------------- interaction ---------------- */

  belt.addEventListener('pointerenter', () => { hover = 1; });
  belt.addEventListener('pointerleave', () => { hover = 0; });

  belt.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    belt.setPointerCapture(e.pointerId);
    belt.classList.add('is-dragging');
    drag = { x: e.clientX, lastX: e.clientX, lastT: performance.now(), v: 0 };
  });

  belt.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now();
    const dx = e.clientX - drag.lastX;
    const dt = Math.max(8, now - drag.lastT);
    off += dx;
    drag.v = (dx / dt) * 1000 * 0.8 + drag.v * 0.2;
    drag.lastX = e.clientX; drag.lastT = now;
  });

  const endDrag = (e) => {
    if (!drag) return;
    belt.classList.remove('is-dragging');
    vel = clamp(drag.v, -4000, 4000);
    drag = null;
    try { belt.releasePointerCapture(e.pointerId); } catch (err) {}
  };
  belt.addEventListener('pointerup', endDrag);
  belt.addEventListener('pointercancel', endDrag);

  belt.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    vel += -e.deltaX * 6;
    e.preventDefault();
  }, { passive: false });

  /* keyboard: the belt is decorative, but scrubbing by focus is cheap */
  belt.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { vel -= 400; }
    if (e.key === 'ArrowRight') { vel += 400; }
  });

  let raf = requestAnimationFrame(frame);
  window.addEventListener('resize', () => { measure(); });
  reduce.addEventListener?.('change', () => { vel = 0; });

  measure();
  // a first paint pass so nothing waits for the first rAF tick
  for (let i = 0; i < cardEls.length; i++) {
    const x = mod(off + i * span + span, period) - span;
    place(i, x, clamp(Lx - x, 0, cw));
  }
  window.__belt = { get off() { return off; }, set off(v) { off = v; }, get cw() { return cw; } };
})();

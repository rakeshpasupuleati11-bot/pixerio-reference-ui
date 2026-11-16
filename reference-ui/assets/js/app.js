/* ============================================================
   Pixerio — reference UI motion layer
   1 View Transitions · 2 Scroll scrubbing · 3 Magnetic hover
   4 Staggered reveals · 5 Spotlight bento · 6 Button morph
   7 Glass header (CSS-driven, JS toggles state)
   Every effect degrades to a static, readable page.
   ============================================================ */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsTimeline = CSS.supports('animation-timeline: view()');

  /* ---------- 7 · glass header state ---------- */
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* the header is white on every surface; no tone switching needed */

  /* ---------- mobile nav ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); }
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); toggle.focus();
      }
    });
  }

  /* ---------- services menu (§1.2: split by service, short nav) ---------- */
  const menuWrap = document.querySelector('.has-menu');
  if (menuWrap) {
    const parent = menuWrap.querySelector('.nav__parent');
    const setOpen = (open) => {
      menuWrap.classList.toggle('is-open', open);
      parent.setAttribute('aria-expanded', String(open));
    };
    parent.addEventListener('click', () => setOpen(!menuWrap.classList.contains('is-open')));
    const hoverable = matchMedia('(hover:hover) and (min-width:1121px)');
    menuWrap.addEventListener('mouseenter', () => { if (hoverable.matches) setOpen(true); });
    menuWrap.addEventListener('mouseleave', () => { if (hoverable.matches) setOpen(false); });
    menuWrap.addEventListener('focusout', e => {
      if (!menuWrap.contains(e.relatedTarget)) setOpen(false);
    });
    document.addEventListener('click', e => {
      if (!menuWrap.contains(e.target)) setOpen(false);
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- enquiry form names the service (§4.8) ---------- */
  const serviceField = document.querySelector('#service');
  if (serviceField) {
    const wanted = new URLSearchParams(location.search).get('service');
    if (wanted && Array.from(serviceField.options).some(o => o.value === wanted)) {
      serviceField.value = wanted;
    }
  }



  /* ---------- pause motion (manne.work pattern) ---------- */
  const rootEl = document.documentElement;
  const motionBtn = document.querySelector('.motion-toggle');
  const KEY = 'pixerio:motion';
  const readMotion = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const writeMotion = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  const applyMotion = (paused, silent) => {
    if (paused) rootEl.dataset.motion = 'paused';
    else rootEl.removeAttribute('data-motion');
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(paused));
      const label = motionBtn.querySelector('.motion-toggle__label');
      if (label) label.textContent = paused ? 'Play motion' : 'Pause motion';
      motionBtn.setAttribute('aria-label',
        paused ? 'Play motion — resume animation on this page' : 'Pause motion — freeze animation on this page');
    }
    // resuming: anything already on screen settles rather than replaying
    if (!paused && !silent) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
    }
  };

  applyMotion(readMotion() === 'paused', true);
  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      const next = rootEl.dataset.motion !== 'paused';
      applyMotion(next, false);
      writeMotion(next ? 'paused' : 'playing');
    });
  }

  /* ---------- hero: staged entrance, then parallax ----------
     The lines rise out of their masks, then the sub-copy, the actions and the
     cue follow, while the 3D object arrives from depth. After that the copy and
     the object separate on scroll at different rates. */
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    // commit the pre-entrance state first: without a forced style read the
    // browser can coalesce both states and skip the transition entirely
    hero.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      hero.getBoundingClientRect();
      hero.classList.add('is-ready');
    }));

    if (!reduce.matches) {
      const heroCopy = hero.querySelector('.hero__copy');
      const heroStage = hero.querySelector('.hero__stage');
      let hRaf = 0;

      const drift = () => {
        hRaf = 0;
        const paused = document.documentElement.hasAttribute('data-motion');
        const y = Math.min(window.scrollY || 0, window.innerHeight);
        const p = paused ? 0 : y / window.innerHeight;
        if (heroCopy) heroCopy.style.transform = p ? `translate3d(0,${(-p * 34).toFixed(1)}px,0)` : '';
        if (heroStage) {
          heroStage.style.transform = p
            ? `translate3d(0,${(p * 26).toFixed(1)}px,0) scale(${(1 - p * 0.04).toFixed(3)})`
            : '';
        }
      };
      addEventListener('scroll', () => { if (!hRaf) hRaf = requestAnimationFrame(drift); }, { passive: true });
      if (motionBtn) motionBtn.addEventListener('click', () => setTimeout(drift, 0));
    }

    /* ---------- stepped carousel: one card forward, held 3s, then a fast turn ---------- */
    const ring = hero.querySelector('.ring');
    const slots = [...hero.querySelectorAll('.slot')];
    if (ring && slots.length) {
      const BASE = 'translate3d(10px,-6px,0) rotateX(15deg) rotateZ(-1.5deg)';
      const STEP = 360 / slots.length;          // 60° per card
      const DWELL = 3000;                        // ms a card stays presented
      let idx = 0, timer = 0, hovered = false, onScreen = true;

      const paint = () => {
        ring.style.transform = `${BASE} rotateY(${-STEP * idx}deg)`;
        const n = slots.length;
        slots.forEach((slot, i) => {
          const rel = ((i - idx) % n + n) % n;
          slot.classList.toggle('is-front', rel === 0);
          slot.classList.toggle('is-near', rel === 1 || rel === n - 1);
        });
      };

      const tick = () => { idx += 1; paint(); };

      const canRun = () => !reduce.matches
        && !document.documentElement.hasAttribute('data-motion')
        && !hovered && onScreen && !document.hidden;

      const sync = () => {
        if (canRun()) {
          if (!timer) { paint(); timer = setInterval(tick, DWELL); }
        } else if (timer) {
          clearInterval(timer); timer = 0;
        }
      };

      paint();
      sync();

      const stage = hero.querySelector('.hero__stage');
      if (stage) {
        stage.addEventListener('pointerenter', () => { hovered = true; sync(); });
        stage.addEventListener('pointerleave', () => { hovered = false; sync(); });
      }
      document.addEventListener('visibilitychange', sync);
      if (motionBtn) motionBtn.addEventListener('click', () => setTimeout(sync, 0));
      if (reduce.addEventListener) reduce.addEventListener('change', () => { idx = 0; paint(); sync(); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); },
          { rootMargin: '120px' }).observe(hero);
      }
    }
  }

  /* ---------- 4 · staggered reveals + cascading text ---------- */
  const splitText = (el) => {
    if (el.dataset.splitDone) return;
    const nodes = Array.from(el.childNodes);
    const out = [];
    let i = 0;
    const pushWord = (txt) => {
      txt.split(/(\s+)/).forEach(part => {
        if (!part.trim()) { out.push(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', i++);
        const s = document.createElement('span');
        s.textContent = part;
        w.appendChild(s);
        out.push(w);
      });
    };
    nodes.forEach(node => {
      if (node.nodeType === 3) { pushWord(node.textContent); return; }
      if (node.nodeType === 1) {
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', i++);
        const s = document.createElement('span');
        s.appendChild(node.cloneNode(true));
        w.appendChild(s);
        out.push(w);
      }
    });
    el.textContent = '';
    el.classList.add('split');
    out.forEach(n => el.appendChild(n));
    el.dataset.splitDone = '1';
  };

  /* section headings open like a curtain — added before the observer starts */
  document.querySelectorAll('.sec-head h2, .pinsvc__left h2, .feature h2')
    .forEach(h => { if (!h.hasAttribute('data-reveal')) h.setAttribute('data-reveal', 'curtain'); });

  const units = document.querySelectorAll('[data-reveal]');
  units.forEach((el, idx) => {
    // children inside a stagger container cascade
    if (el.hasAttribute('data-stagger')) {
      Array.from(el.children).forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) {
          child.setAttribute('data-reveal', '');
          child.style.setProperty('--i', i);
          units.length; // no-op
        }
      });
    }
    if (el.hasAttribute('data-split')) splitText(el);
  });
  // headings authored with only data-split still cascade
  document.querySelectorAll('[data-split]').forEach(el => splitText(el));

  const revealTargets = document.querySelectorAll('[data-reveal], [data-split]');

  if ('IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealTargets.forEach(el => io.observe(el));

    /* Safety net. Inside a pinned/sticky container the observer can miss a
       target whose box never crosses the threshold band cleanly, which leaves
       a heading clipped and invisible. One rAF-throttled rect check on scroll
       settles anything already on screen. */
    const pending = new Set(revealTargets);
    let checkRaf = 0;
    const checkVisible = () => {
      checkRaf = 0;
      const h = innerHeight;
      pending.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < h - h * 0.06 && r.height > 0) {
          el.classList.add('is-in');
          pending.delete(el);
          io.unobserve(el);
        }
      });
    };
    const queueCheck = () => { if (!checkRaf) checkRaf = requestAnimationFrame(checkVisible); };
    addEventListener('scroll', queueCheck, { passive: true });
    addEventListener('resize', queueCheck);
    queueCheck();
  } else {
    revealTargets.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- 3 · magnetic hover ---------- */
  const magnets = document.querySelectorAll('[data-magnetic]');
  if (magnets.length && !reduce.matches && matchMedia('(hover:hover)').matches) {
    magnets.forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.28;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null, active = false;

      const loop = () => {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      };
      const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

      el.addEventListener('pointerenter', () => { active = true; el.style.transition = 'none'; });
      el.addEventListener('pointermove', (e) => {
        if (!active) return;
        const r = el.getBoundingClientRect();
        tx = (e.clientX - (r.left + r.width / 2)) * strength;
        ty = (e.clientY - (r.top + r.height / 2)) * strength;
        start();
      });
      el.addEventListener('pointerleave', () => {
        active = false; tx = 0; ty = 0;
        el.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = 'translate3d(0,0,0)';
        cx = cy = 0;
      });
    });
  }

  /* ---------- 5 · spotlight borders / glints ---------- */
  const spot = document.querySelectorAll('[data-spotlight]');
  if (spot.length && matchMedia('(hover:hover)').matches) {
    spot.forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- 2 · scroll scrubbing fallback ---------- */
  if (!supportsTimeline && !reduce.matches) {
    const scrub = [];
    document.querySelectorAll('.hero__visual img, .feature__media img').forEach(img => {
      img.style.animation = 'none';
      scrub.push(img);
    });
    const rail = document.querySelector('.progress');
    if (rail) rail.style.animation = 'none';

    let ticking = false;
    const update = () => {
      const vh = innerHeight;
      scrub.forEach(img => {
        const r = img.getBoundingClientRect();
        const p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
        img.style.transform = `translate3d(0, ${(0.5 - p) * 12}%, 0) scale(1.04)`;
      });
      if (rail) {
        const max = document.documentElement.scrollHeight - vh;
        rail.style.transform = `scaleX(${Math.min(window.scrollY / Math.max(max, 1), 1)})`;
      }
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 2b · pinned process activation ---------- */
  const steps = Array.from(document.querySelectorAll('.step'));
  const railBar = document.querySelector('.process__rail i');
  if (steps.length) {
    if ('IntersectionObserver' in window) {
      const so = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            steps.forEach(s => s.classList.remove('is-active'));
            entry.target.classList.add('is-active');
            const idx = steps.indexOf(entry.target);
            if (railBar) railBar.style.setProperty('--p', ((idx + 1) / steps.length).toFixed(2));
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      steps.forEach(s => so.observe(s));
    } else {
      steps.forEach(s => s.classList.add('is-active'));
    }
  }


  /* ---------- six disciplines: pinned scroll sequence ----------
     One measurement per frame while the section is on screen: progress through
     the section picks the beat, and the beat drives the list, the cards, the
     counter and the rail. Collapses to a static grid when the section is short,
     when motion is paused, or under reduced motion. */
  const pin = document.querySelector('[data-pinsvc]');
  if (pin) {
    const cards = [...pin.querySelectorAll('.pcard')];
    const rows = [...pin.querySelectorAll('.pinsvc__list li')];
    const dots = [...pin.querySelectorAll('.pinsvc__dots li')];
    const chipN = pin.querySelector('[data-chip-n]');
    const chipName = pin.querySelector('[data-chip-name]');
    const total = cards.length;
    let current = -1, raf = 0, live = false;

    const setBeat = (i) => {
      if (i === current) return;
      current = i;
      cards.forEach((c, k) => c.classList.toggle('is-on', k === i));
      rows.forEach((r, k) => {
        r.classList.toggle('is-on', k === i);
        r.classList.toggle('is-past', k < i);
      });
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      if (chipN) chipN.textContent = String(i + 1).padStart(2, '0');
      if (chipName) {
        const t = cards[i].querySelector('.pcard__name');
        if (t) chipName.textContent = t.textContent.trim();
      }
    };

    const measure = () => {
      raf = 0;
      if (!live) return;
      const r = pin.getBoundingClientRect();
      const distance = r.height - innerHeight;
      if (distance <= 0) return;
      const p = Math.min(1, Math.max(0, -r.top / distance));
      // the last beat holds through the tail of the section rather than
      // snapping back, so the sequence ends settled
      const i = Math.min(total - 1, Math.floor(p * total));
      setBeat(i);
    };

    const queue = () => { if (!raf) raf = requestAnimationFrame(measure); };

    const setLive = (on) => {
      if (on === live) return;
      live = on;
      pin.classList.toggle('is-live', on);
      if (on) { current = -1; setBeat(0); queue(); }
      else { pin.removeAttribute('data-ready'); }
    };

    const evaluate = () => {
      const canPin = !reduce.matches
        && !document.documentElement.hasAttribute('data-motion')
        && innerWidth > 900;
      setLive(canPin);
    };

    evaluate();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', () => { evaluate(); queue(); });
    if (window.ResizeObserver) new ResizeObserver(queue).observe(pin);

    // the pause control and the media query both change the picture
    if (motionBtn) motionBtn.addEventListener('click', () => setTimeout(() => { evaluate(); queue(); }, 0));
    if (reduce.addEventListener) reduce.addEventListener('change', () => { evaluate(); queue(); });
  }

  /* ---------- stat counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce.matches) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const dur = 1100;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toString();
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        co.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => co.observe(c));
  }

  /* ---------- 6 · micro-state morph: button → loader → done ---------- */
  document.querySelectorAll('form[data-demo]').forEach(form => {
    const btn = form.querySelector('.btn[data-morph]');
    if (!btn) return;
    const status = form.querySelector('[data-status]');
    const label = btn.querySelector('.btn__label');
    const original = label ? label.textContent : '';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btn.classList.contains('is-loading') || btn.classList.contains('is-done')) return;
      btn.classList.add('is-loading');
      btn.disabled = true;
      if (label) label.textContent = 'Sending';
      if (status) status.textContent = 'Sending your enquiry…';

      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.classList.add('is-done');
        if (label) label.textContent = 'Sent';
        if (status) status.textContent =
          'Thank you. This is a reference build: the enquiry was not transmitted. We reply within one working day.';
        setTimeout(() => {
          btn.classList.remove('is-done');
          btn.disabled = false;
          if (label) label.textContent = original;
        }, 3200);
      }, 1500);
    });
  });

  /* ---------- demo: standalone morph button ---------- */
  document.querySelectorAll('[data-morph-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-loading') || btn.classList.contains('is-done')) return;
      var label = btn.querySelector('.btn__label');
      var original = label ? label.textContent : '';
      btn.classList.add('is-loading');
      if (label) label.textContent = 'Sending';
      setTimeout(function () {
        btn.classList.remove('is-loading');
        btn.classList.add('is-done');
        if (label) label.textContent = 'Sent';
        setTimeout(function () {
          btn.classList.remove('is-done');
          if (label) label.textContent = original;
        }, 2200);
      }, 1400);
    });
  });

  /* ---------- demo: replay a text cascade ---------- */
  document.querySelectorAll('[data-replay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.dataset.replay);
      if (!target) return;
      target.classList.remove('is-in');
      void target.offsetWidth;
      target.classList.add('is-in');
    });
  });

  /* ---------- 1 · view transitions ---------- */
  // Cross-document transitions are declared in CSS (@view-transition).
  // Same-document fallback for browsers without support: soft page fade.
  if (!document.startViewTransition) {
    document.documentElement.style.opacity = '0';
    document.documentElement.style.transition = 'opacity .35s ease';
    requestAnimationFrame(() => { document.documentElement.style.opacity = '1'; });
  }

  /* ---------- active nav ---------- */
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a[href]').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === here) a.setAttribute('aria-current', 'page');
  });
})();

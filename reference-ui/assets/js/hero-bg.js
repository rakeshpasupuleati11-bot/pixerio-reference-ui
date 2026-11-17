/* ==========================================================================
   Pixerio — hero atmosphere layer (v2.8)
   A live, generative background for the page head. Replaces the rejected
   v2.6/v2.7 prism piece. Three renderers live here; pick one with MODE:

     'mesh' — a sculpted 3D surface of hairlines and soft faces (default)
     'ink'  — marbled aqua ink diffusing on paper (WebGL, falls back to mesh)
     'flow' — thousands of hairlines following a curl field

   No image, no video, nothing to download. It draws only while the hero is
   on screen and the tab is visible, freezes on the site's "Pause motion"
   control (html[data-motion="paused"]) and under prefers-reduced-motion,
   where it renders one static frame instead of animating.
   ========================================================================== */
(function () {
  'use strict';

  var MODE = 'reel';

  var canvas = document.getElementById('hero-bg');
  if (!canvas) return;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var PAPER = '#F2FAFB';
  var NAVY = '18,50,74';
  var TEAL = '0,179,163';

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var pointerSeen = false;
  var scrollBoost = 0;
  var lastScrollY = 0;
  var t = reduce.matches ? 22 : 0;
  var last = performance.now();
  var raf = 0;
  var onScreen = true;

  function paused() { return root.getAttribute('data-motion') === 'paused' || reduce.matches; }
  function hidden() { return document.visibilityState === 'hidden'; }

  function resize(cap) {
    var dpr = Math.min(window.devicePixelRatio || 1, cap);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ mesh */
  var NX = 48, NZ = 34;
  var GRID = [];
  (function build() {
    for (var j = 0; j <= NZ; j++) {
      for (var i = 0; i <= NX; i++) GRID.push({ u: i / NX * 2 - 1, v: j / NZ * 2 - 1 });
    }
  })();

  /* colour is bucketed into 16 pre-built strings: building an rgba() string and
     letting canvas parse it 1000x a frame was half the per-frame cost */
  var FILL = [];
  for (var fb = 0; fb < 16; fb++) {
    var lift0 = fb / 15;
    var fr = Math.round(242 - lift0 * 190);
    var fg = Math.round(250 - lift0 * 130);
    var fbb = Math.round(251 - lift0 * 88);
    FILL.push('rgba(' + fr + ',' + fg + ',' + fbb + ',');
  }

  /* Six crests ride the sheet, one per Pixerio service, each carrying its own
     hue. The surface is the argument the old drum made in words: six practices
     under one continuous material. */
  var CREST_HUE = ['0,179,189', '48,192,240', '32,120,192', '192,216,72', '240,152,64', '225,42,88'];

  function crestCenter(i, tt) {
    var a = i * Math.PI / 3 + tt * 0.05;
    return { u: Math.cos(a) * 0.80, v: Math.sin(a) * 0.62 };
  }

  function height(u, v, tt) {
    var base = 0.30 * Math.sin(u * 2.1 + tt * 0.45) * Math.cos(v * 1.7 - tt * 0.30)
             + 0.13 * Math.sin(u * 4.3 - v * 2.2 + tt * 0.62)
             + 0.07 * Math.cos(u * 7.1 + v * 5.3 - tt * 0.9);
    var crest = 0;
    for (var i = 0; i < 6; i++) {
      var c = crestCenter(i, tt);
      var dx = u - c.u, dz = v - c.v;
      crest += Math.exp(-(dx * dx + dz * dz) * 9.0) * (0.22 + 0.07 * Math.sin(tt * 0.5 + i));
    }
    return base + crest;
  }

  var meshBuf = document.createElement('canvas');
  var mctx = meshBuf.getContext('2d');

  function drawMesh() {
    resize(1.5);
    var W = canvas.clientWidth, H = canvas.clientHeight;

    /* The shaded sheet is drawn at 55% resolution and upsampled; the hairlines
       that give it structure are drawn afterwards at full resolution, so the
       surface is soft where it should be soft and crisp where it should read. */
    var oW = Math.max(2, Math.round(canvas.width * 0.55));
    var oH = Math.max(2, Math.round(canvas.height * 0.55));
    if (meshBuf.width !== oW || meshBuf.height !== oH) {
      meshBuf.width = oW;
      meshBuf.height = oH;
    }
    var c = mctx;
    c.setTransform(oW / W, 0, 0, oH / H, 0, 0);
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);

    var g = c.createRadialGradient(W * 0.66, H * 0.32, 0, W * 0.66, H * 0.32, Math.max(W, H) * 0.62);
    g.addColorStop(0, 'rgba(48,192,240,.20)');
    g.addColorStop(0.45, 'rgba(0,179,189,.10)');
    g.addColorStop(1, 'rgba(242,250,251,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    /* scroll lifts the sheet and lets the crests drift on */
    var scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, canvas.clientHeight * 0.85)));
    var cx = W * 0.64, cy = H * 0.46 - scrollP * 26, unit = Math.min(W, H) * 0.88;
    var yaw = -0.28 + pointer.x * 0.20;
    var pitch = 0.62 + pointer.y * 0.09;
    var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    var cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    function project(x, y, z) {
      var X = x * cosY - z * sinY;
      var Z0 = x * sinY + z * cosY;
      var Y = y * cosP - Z0 * sinP;
      var Z = y * sinP + Z0 * cosP;
      var persp = 1 / (2.5 + Z * 0.9);
      return { sx: cx + X * persp * unit, sy: cy + Y * persp * unit, d: Z, persp: persp };
    }

    var pts = new Array(GRID.length);
    for (var k = 0; k < GRID.length; k++) {
      var u = GRID[k].u, v = GRID[k].v;
      var y = height(u, v, t);
      var q = project(u * 1.55, y, v * 1.15);
      q.y = y;
      q.u = u;
      q.v = v;
      pts[k] = q;
    }
    function idx(i, j) { return j * (NX + 1) + i; }

    /* painter's order: far quads first, pale to darker with height */
    var cells = [];
    for (var jj = 0; jj < NZ; jj++) {
      for (var ii = 0; ii < NX; ii++) {
        var a = pts[idx(ii, jj)], b = pts[idx(ii + 1, jj)],
            d = pts[idx(ii, jj + 1)], e = pts[idx(ii + 1, jj + 1)];
        cells.push({ a: a, b: b, c: e, d: d,
          z: (a.d + b.d + e.d + d.d) * 0.25,
          y: (a.y + b.y + e.y + d.y) * 0.25 });
      }
    }
    cells.sort(function (m, n) { return n.z - m.z; });

    for (var n2 = 0; n2 < cells.length; n2++) {
      var cell = cells[n2];
      var lift = (cell.y + 0.45) / 0.9;
      var fade = (cell.z + 1.9) / 3.8;
      fade = fade < 0.15 ? 0.15 : fade > 1 ? 1 : fade;
      var bucket = lift <= 0 ? 0 : lift >= 1 ? 15 : (lift * 15) | 0;
      c.fillStyle = FILL[bucket] + (0.30 + fade * 0.60).toFixed(2) + ')';
      c.beginPath();
      c.moveTo(cell.a.sx, cell.a.sy);
      c.lineTo(cell.b.sx, cell.b.sy);
      c.lineTo(cell.c.sx, cell.c.sy);
      c.lineTo(cell.d.sx, cell.d.sy);
      c.closePath();
      c.fill();
    }

    /* composite the shaded sheet, then work in real pixels again */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(meshBuf, 0, 0, canvas.width, canvas.height);

    var s = canvas.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    /* ---- warp and weft: the structure of the sheet, drawn crisp ---- */
    function crestAt(u, v) {
      var best = 0, bestD = 9;
      for (var i = 0; i < 6; i++) {
        var cc = crestCenter(i, t);
        var dx = u - cc.u, dz = v - cc.v;
        var dd = dx * dx + dz * dz;
        if (dd < bestD) { bestD = dd; best = i; }
      }
      return { i: best, w: Math.exp(-bestD * 9.0) };
    }

    /* fixed = the row index (vertical=false) or the column index (vertical=true) */
    function strokeLine(fixed, count, vertical) {
      var hueVotes = [0, 0, 0, 0, 0, 0];
      var sumW = 0, brightSum = 0, n = 0, i, pt;
      for (i = 0; i <= count; i++) {
        pt = vertical ? pts[idx(fixed, i)] : pts[idx(i, fixed)];
        var m = crestAt(pt.u, pt.v);
        sumW += m.w;
        hueVotes[m.i] += m.w;
        brightSum += 1 - Math.max(0.15, Math.min(1, (pt.d + 1.9) / 3.8));
        n++;
      }
      var top = 0;
      for (i = 1; i < 6; i++) if (hueVotes[i] > hueVotes[top]) top = i;
      var crest = sumW / Math.max(1, n);
      var brightness = brightSum / Math.max(1, n);
      var isCrest = crest > 0.22;
      var fade2 = 1 - scrollP * 0.35;

      ctx.beginPath();
      for (i = 0; i <= count; i++) {
        pt = vertical ? pts[idx(fixed, i)] : pts[idx(i, fixed)];
        if (i === 0) ctx.moveTo(pt.sx, pt.sy); else ctx.lineTo(pt.sx, pt.sy);
      }
      var near = 1 + crest * 2.4;
      ctx.strokeStyle = 'rgba(' + NAVY + ',' +
        Math.min(0.34, (0.050 + brightness * 0.095) * near * fade2).toFixed(3) + ')';
      ctx.lineWidth = 0.55 + crest * 0.5;
      ctx.stroke();
    }

    /* rows (warp) every 2nd, columns (weft) every 4th: enough to read, not a wireframe */
    for (var j3 = 0; j3 <= NZ; j3 += 2) strokeLine(j3, NX, false);
    for (var i3 = 0; i3 <= NX; i3 += 4) strokeLine(i3, NZ, true);

    /* ---- scrim: the headline side stays paper ---- */
    var scrim = ctx.createLinearGradient(0, 0, W * 0.74, 0);
    scrim.addColorStop(0, 'rgba(242,250,251,.96)');
    scrim.addColorStop(0.42, 'rgba(242,250,251,.66)');
    scrim.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);

    /* a soft light that follows the pointer, so the sheet reads as lit */
    if (pointerSeen) {
      var lxp = (pointer.x * 0.5 + 0.5) * W;
      var lyp = (0.5 - pointer.y * 0.5) * H;
      var lg = ctx.createRadialGradient(lxp, lyp, 0, lxp, lyp, Math.min(W, H) * 0.40);
      lg.addColorStop(0, 'rgba(255,255,255,.14)');
      lg.addColorStop(0.6, 'rgba(255,255,255,.05)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------------ rays */
  /* Six hairlines of light — one per service — cross the paper and meet in a
     single nucleus, then leave as one line. Six under one partner, stated as
     light rather than as an object. Everything is drawn at full resolution:
     crisp lines, soft halo, no texture mush. */
  var RAY_LABEL = ['3D & IMMERSIVE', 'PLATFORMS', 'VIDEO', 'BRAND', 'LEARNING', 'SEARCH'];
  var rayW = [1, 1, 1, 1, 1, 1];   /* hover weight per ray, eased each frame */

  function drawRays() {
    resize(1.5);
    var W = canvas.clientWidth, H = canvas.clientHeight;
    var s = canvas.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    var scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, canvas.clientHeight * 0.85)));
    var nx = W * 0.640, ny = H * 0.42 + Math.sin(t * 0.22) * 7 - scrollP * 34;
    var spread = 1 - scrollP * 0.30;
    var N = 44;

    var wash = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(W, H) * 0.62);
    wash.addColorStop(0, 'rgba(48,192,240,.17)');
    wash.addColorStop(0.42, 'rgba(0,179,189,.07)');
    wash.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    /* geometry first: every ray is a polyline, so labels and proximity can use it */
    var HEXR = Math.max(26, Math.min(44, W * 0.030));
    var rays = [];
    for (var i = 0; i < 6; i++) {
      var vAng = -Math.PI / 2 + i * Math.PI / 3 + t * 0.06;
      var ex = nx + Math.cos(vAng) * HEXR;
      var ey = ny + Math.sin(vAng) * HEXR;
      var sx = W * 1.10;
      var sy = H * 0.5 + ((i / 5) - 0.5) * H * 1.02 * spread;
      var cxp = (sx + ex) / 2 + (i % 2 ? 54 : -54);
      var cyp = (sy + ey) / 2 + Math.sin(t * 0.4 + i * 1.3) * 20;
      var wob = 5 + (i % 3) * 2;
      var pts = [];
      for (var k = 0; k <= N; k++) {
        var u = k / N, mu = 1 - u;
        var x = mu * mu * sx + 2 * mu * u * cxp + u * u * ex;
        var y = mu * mu * sy + 2 * mu * u * cyp + u * u * ey;
        y += Math.sin(u * 7.0 - t * 0.9 + i * 1.7) * wob * Math.sin(u * Math.PI);
        pts.push({ x: x, y: y });
      }
      rays.push(pts);
    }

    /* which ray is the pointer closest to? one line answers when you go near it */
    var near = -1, nearD = 70 * 70;
    if (pointerSeen) {
      var mxp = (pointer.x * 0.5 + 0.5) * W;
      var myp = (0.5 - pointer.y * 0.5) * H;
      for (var ri = 0; ri < 6; ri++) {
        for (var q = 0; q <= N; q += 2) {
          var dxp = rays[ri][q].x - mxp, dyp = rays[ri][q].y - myp;
          var dd = dxp * dxp + dyp * dyp;
          if (dd < nearD) { nearD = dd; near = ri; }
        }
      }
    }
    for (var w2 = 0; w2 < 6; w2++) {
      var target = near === w2 ? 1.9 : near >= 0 ? 0.45 : 1;
      rayW[w2] += (target - rayW[w2]) * 0.12;
    }

    for (var i2 = 0; i2 < 6; i2++) {
      var hue = CREST_HUE[i2], pts2 = rays[i2], wt = rayW[i2];
      ctx.beginPath();
      for (var k2 = 0; k2 <= N; k2++) {
        if (k2) ctx.lineTo(pts2[k2].x, pts2[k2].y); else ctx.moveTo(pts2[k2].x, pts2[k2].y);
      }
      ctx.strokeStyle = 'rgba(' + hue + ',' + (0.055 * wt).toFixed(3) + ')';
      ctx.lineWidth = 11;
      ctx.stroke();

      var grad = ctx.createLinearGradient(pts2[0].x, pts2[0].y, nx, ny);
      grad.addColorStop(0, 'rgba(' + hue + ',0)');
      grad.addColorStop(0.30, 'rgba(' + hue + ',' + Math.min(1, 0.34 * wt).toFixed(3) + ')');
      grad.addColorStop(0.82, 'rgba(' + hue + ',' + Math.min(1, 0.66 * wt).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + hue + ',' + Math.min(1, 0.22 * wt).toFixed(3) + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 * (wt > 1 ? 1.35 : 1);
      ctx.stroke();

      var bead = ((t * 0.10 + i2 * 0.167) % 1);
      var bi = Math.round(bead * N);
      ctx.fillStyle = 'rgba(' + hue + ',' + (0.7 * Math.sin(bead * Math.PI) * Math.min(1, wt)).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(pts2[bi].x, pts2[bi].y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    /* the nucleus: the mark's own faceted solid, not a generic orb */
    var halo = ctx.createRadialGradient(nx, ny, 0, nx, ny, 132);
    halo.addColorStop(0, 'rgba(48,192,240,.30)');
    halo.addColorStop(0.42, 'rgba(0,179,189,.12)');
    halo.addColorStop(1, 'rgba(0,179,189,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(nx, ny, 132, 0, Math.PI * 2);
    ctx.fill();

    function hexPath(radius, rot) {
      ctx.beginPath();
      for (var v = 0; v < 6; v++) {
        var a = -Math.PI / 2 + v * Math.PI / 3 + rot;
        var px = nx + Math.cos(a) * radius, py = ny + Math.sin(a) * radius;
        if (v) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    /* facet shading: six lit triangles, so the core reads as a solid, not a wire */
    var solid = ctx.createLinearGradient(nx, ny - HEXR, nx, ny + HEXR);
    solid.addColorStop(0, 'rgba(255,255,255,.92)');
    solid.addColorStop(0.55, 'rgba(214,244,248,.85)');
    solid.addColorStop(1, 'rgba(48,192,240,.30)');
    hexPath(HEXR, t * 0.06);
    ctx.fillStyle = solid;
    ctx.fill();

    for (var f = 0; f < 6; f++) {
      var a0 = -Math.PI / 2 + f * Math.PI / 3 + t * 0.06;
      var a1 = a0 + Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + Math.cos(a0) * HEXR, ny + Math.sin(a0) * HEXR);
      ctx.lineTo(nx + Math.cos(a1) * HEXR, ny + Math.sin(a1) * HEXR);
      ctx.closePath();
      ctx.fillStyle = f % 2 ? 'rgba(255,255,255,.34)' : 'rgba(0,140,160,.055)';
      ctx.fill();
    }

    hexPath(HEXR, t * 0.06);
    ctx.strokeStyle = 'rgba(' + NAVY + ',.62)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    hexPath(HEXR * 0.52, -t * 0.09);
    ctx.strokeStyle = 'rgba(' + NAVY + ',.28)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    for (var r = 0; r < 3; r++) {
      hexPath(HEXR + 16 + r * 18 + Math.sin(t * 0.45 + r) * 1.6, (r % 2 ? -1 : 1) * t * (0.05 + r * 0.02));
      ctx.strokeStyle = 'rgba(' + NAVY + ',' + (0.10 - r * 0.024).toFixed(3) + ')';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    /* the single line that leaves: six services, one relationship */
    var beam = ctx.createLinearGradient(nx, ny, W * 0.10, ny + 34);
    beam.addColorStop(0, 'rgba(' + NAVY + ',.20)');
    beam.addColorStop(0.45, 'rgba(' + NAVY + ',.06)');
    beam.addColorStop(1, 'rgba(' + NAVY + ',0)');
    ctx.strokeStyle = beam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.lineTo(W * 0.10, ny + 34);
    ctx.stroke();

    /* ---- labels: the six services, named at the point where each line enters ---- */
    var labelFade = Math.max(0, 1 - scrollP * 1.15);
    if (W > 820 && labelFade > 0.06) {
      ctx.font = '600 11.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      for (var li = 0; li < 6; li++) {
        var anchor = rays[li][Math.round(N * 0.48)];
        var label = RAY_LABEL[li];
        var tw = ctx.measureText(label).width;
        var lx = anchor.x + 12, ly = anchor.y;
        if (lx + tw > W * 0.9) lx = anchor.x - tw - 14;
        if (ly < 34 || ly > H - 30) continue;
        ctx.fillStyle = 'rgba(' + CREST_HUE[li] + ',' + (0.85 * labelFade * Math.min(1, rayW[li])).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(lx - 5, ly, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + NAVY + ',' + (0.74 * labelFade * Math.min(1.2, rayW[li])).toFixed(2) + ')';
        ctx.fillText(label, lx, ly);
        ctx.fillStyle = 'rgba(' + CREST_HUE[li] + ',' + (0.55 * labelFade * Math.min(1, rayW[li])).toFixed(2) + ')';
        ctx.fillRect(lx, ly + 8, tw, 0.9);
      }
    }

    /* the headline side stays paper */
    var scrim = ctx.createLinearGradient(0, 0, W * 0.72, 0);
    scrim.addColorStop(0, 'rgba(242,250,251,.97)');
    scrim.addColorStop(0.40, 'rgba(242,250,251,.72)');
    scrim.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);

    if (pointerSeen) {
      var lxp = (pointer.x * 0.5 + 0.5) * W;
      var lyp = (0.5 - pointer.y * 0.5) * H;
      var lg = ctx.createRadialGradient(lxp, lyp, 0, lxp, lyp, Math.min(W, H) * 0.40);
      lg.addColorStop(0, 'rgba(255,255,255,.16)');
      lg.addColorStop(0.6, 'rgba(255,255,255,.05)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------------ reel */
  /* Six panels, one per service, drifting across the hero on a belt. Each one
     runs its own small animation of that discipline, so the background is a
     working reel of what the site sells rather than decorative motion.
     The panel nearest the focus line is the one that runs at full strength —
     the same "nearest card is active" behaviour the capability wall uses. */
  var SERVICES = [
    { n: '01', label: '3d and immersive', hue: '0,179,189' },
    { n: '02', label: 'digital platforms', hue: '32,120,192' },
    { n: '03', label: 'video and motion', hue: '48,192,240' },
    { n: '04', label: 'brand and design', hue: '192,216,72' },
    { n: '05', label: 'learning', hue: '240,152,64' },
    { n: '06', label: 'search and marketing', hue: '225,42,88' }
  ];

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---- the six micro-scenes, drawn in a box of w x h at 0,0 ---- */
  function scene3D(w, h, ph) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.30;
    var a0 = ph * 0.5;
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = a0 + i * Math.PI / 3;
      var px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R * 0.62;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,179,189,.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6,42,55,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (var j = 0; j < 6; j++) {
      var b = a0 + j * Math.PI / 3;
      ctx.moveTo(cx + Math.cos(b) * R * 0.42, cy + Math.sin(b) * R * 0.26);
      ctx.lineTo(cx + Math.cos(b) * R, cy + Math.sin(b) * R * 0.62);
    }
    ctx.strokeStyle = 'rgba(6,42,55,.28)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,179,189,.9)';
    ctx.fill();
  }

  function scenePlatforms(w, h, ph) {
    var pad = w * 0.10;
    ctx.strokeStyle = 'rgba(6,42,55,.40)';
    ctx.lineWidth = 1;
    rr(pad, h * 0.16, w - pad * 2, h * 0.62, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, h * 0.30);
    ctx.lineTo(w - pad, h * 0.30);
    ctx.strokeStyle = 'rgba(6,42,55,.22)';
    ctx.stroke();
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(pad + 8 + i * 6, h * 0.23, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6,42,55,.35)';
      ctx.fill();
    }
    var cols = 3, rows = 2;
    for (var c = 0; c < cols; c++) {
      for (var r = 0; r < rows; r++) {
        var k = Math.sin(ph * 1.1 + c * 0.9 + r * 0.5);
        var bw = (w - pad * 2 - 18) / cols - 6;
        var bh = (h * 0.62 - 34) / rows - 6;
        var bx = pad + 6 + c * (bw + 6), by = h * 0.34 + r * (bh + 6);
        ctx.fillStyle = 'rgba(32,120,192,' + (0.10 + 0.16 * Math.max(0, k)).toFixed(3) + ')';
        ctx.fillRect(bx, by, bw, bh * (0.75 + 0.25 * Math.max(0, k)));
      }
    }
  }

  function sceneVideo(w, h, ph) {
    var pad = w * 0.10, n = 2;
    var fw = (w - pad * 2 - 8) / n;
    var fy = h * 0.24, fh = h * 0.48;
    for (var i = 0; i < n; i++) {
      var x = pad + i * (fw + 8);
      ctx.fillStyle = 'rgba(6,42,55,.055)';
      ctx.fillRect(x, fy, fw, fh);
      ctx.strokeStyle = 'rgba(6,42,55,.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, fy, fw, fh);
      /* sprocket holes: the cue that says "film" */
      for (var sp = 0; sp < 4; sp++) {
        var sx2 = x + fw * (0.18 + sp * 0.21);
        ctx.fillStyle = 'rgba(6,42,55,.20)';
        ctx.fillRect(sx2, fy + 3, 3, 2.4);
        ctx.fillRect(sx2, fy + fh - 5.4, 3, 2.4);
      }
      /* frame content: moving light bands */
      for (var bnd = 0; bnd < 3; bnd++) {
        var v = 0.25 + 0.55 * Math.abs(Math.sin(ph * 0.9 + i * 1.4 + bnd * 0.8));
        ctx.fillStyle = 'rgba(48,192,240,' + (0.10 + 0.16 * v).toFixed(3) + ')';
        ctx.fillRect(x + 6, fy + 10 + bnd * (fh - 20) / 3, fw - 12, (fh - 20) / 3 - 4);
      }
    }
    /* play triangle on the left frame */
    var px0 = pad + fw * 0.5, py0 = fy + fh / 2;
    ctx.beginPath();
    ctx.moveTo(px0 - 5, py0 - 7);
    ctx.lineTo(px0 + 7, py0);
    ctx.lineTo(px0 - 5, py0 + 7);
    ctx.closePath();
    ctx.fillStyle = 'rgba(225,19,110,.72)';
    ctx.fill();
    /* playhead */
    var phx = pad + ((ph * 0.30) % 1) * (w - pad * 2);
    ctx.beginPath();
    ctx.moveTo(phx, fy - 6);
    ctx.lineTo(phx, fy + fh + 6);
    ctx.strokeStyle = 'rgba(6,42,55,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(phx, fy - 6, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(225,19,110,.9)';
    ctx.fill();
  }

  function sceneBrand(w, h, ph) {
    ctx.fillStyle = 'rgba(6,42,55,.72)';
    ctx.font = '600 ' + Math.round(h * 0.34) + 'px Georgia, "Iowan Old Style", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Aa', w * 0.10, h * 0.56);
    var gx = w * 0.60, gy = h * 0.36, g = Math.min(w, h) * 0.075;
    for (var i = 0; i < 4; i++) {
      var ang = ph * 0.6 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(gx + Math.cos(ang) * g * 1.4, gy + Math.sin(ang) * g * 1.4, g * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(192,216,72,' + (0.35 + 0.35 * Math.sin(ph + i)).toFixed(2) + ')';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(6,42,55,.30)';
    ctx.fillRect(w * 0.10, h * 0.66, w * 0.52, 1);
    ctx.fillRect(w * 0.10, h * 0.72, w * 0.30, 1);
  }

  function sceneLearning(w, h, ph) {
    var pad = w * 0.11;
    /* cap: the one shape everyone reads as learning */
    var capX = w * 0.78, capY = h * 0.24, capW = Math.min(w, h) * 0.30;
    ctx.beginPath();
    ctx.moveTo(capX, capY - capW * 0.28);
    ctx.lineTo(capX + capW * 0.62, capY - capW * 0.06);
    ctx.lineTo(capX, capY + capW * 0.16);
    ctx.lineTo(capX - capW * 0.62, capY - capW * 0.06);
    ctx.closePath();
    ctx.fillStyle = 'rgba(240,152,64,.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6,42,55,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(capX + capW * 0.40, capY + capW * 0.02);
    ctx.lineTo(capX + capW * 0.40, capY + capW * 0.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(capX + capW * 0.40, capY + capW * 0.38, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,42,55,.5)';
    ctx.fill();

    for (var i = 0; i < 3; i++) {
      var y = h * 0.46 + i * h * 0.13;
      rr(pad, y, 8, 8, 2);
      ctx.strokeStyle = 'rgba(6,42,55,.32)';
      ctx.lineWidth = 1;
      ctx.stroke();
      var done = Math.sin(ph * 0.7 - i * 0.8) > 0.15;
      if (done) {
        ctx.beginPath();
        ctx.moveTo(pad + 1.8, y + 4.2);
        ctx.lineTo(pad + 3.8, y + 6.4);
        ctx.lineTo(pad + 6.6, y + 1.8);
        ctx.strokeStyle = 'rgba(240,152,64,.95)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(6,42,55,' + (done ? 0.30 : 0.14) + ')';
      ctx.fillRect(pad + 14, y + 2, (w * 0.48) * (i === 1 ? 0.7 : 0.92), 4);
    }
    var prog = (Math.sin(ph * 0.45) * 0.5 + 0.5);
    ctx.fillStyle = 'rgba(6,42,55,.10)';
    ctx.fillRect(pad, h * 0.84, w * 0.62, 3);
    ctx.fillStyle = 'rgba(240,152,64,.75)';
    ctx.fillRect(pad, h * 0.84, w * 0.62 * prog, 3);
  }

  function sceneSearch(w, h, ph) {
    var pad = w * 0.12, bars = 5;
    var bw = (w - pad * 2) / bars * 0.52;
    var gap = (w - pad * 2) / bars;
    for (var i = 0; i < bars; i++) {
      var v = 0.28 + 0.55 * Math.abs(Math.sin(ph * 0.9 + i * 0.7));
      ctx.fillStyle = 'rgba(32,120,192,' + (0.20 + 0.35 * v).toFixed(3) + ')';
      ctx.fillRect(pad + i * gap, h * 0.72 - (h * 0.42) * v, bw, (h * 0.42) * v);
    }
    var mx = pad + ((ph * 0.16) % 1) * (w - pad * 2);
    ctx.beginPath();
    ctx.arc(mx, h * 0.36, 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225,42,88,.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx + 6.4, h * 0.36 + 6.4);
    ctx.lineTo(mx + 12, h * 0.36 + 12);
    ctx.stroke();
  }

  var SCENES = [scene3D, scenePlatforms, sceneVideo, sceneBrand, sceneLearning, sceneSearch];

  function drawReel() {
    resize(1.5);
    var W = canvas.clientWidth, H = canvas.clientHeight;
    var s = canvas.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    var scrollP = Math.min(1, Math.max(0, window.scrollY / Math.max(1, canvas.clientHeight * 0.85)));

    var wash = ctx.createLinearGradient(0, 0, W, H);
    wash.addColorStop(0, 'rgba(242,250,251,0)');
    wash.addColorStop(0.55, 'rgba(48,192,240,.08)');
    wash.addColorStop(1, 'rgba(0,179,189,.11)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    /* ---- six tiles, all on screen: the set is the argument ----
       Below 860px the hero copy owns the full width, so the wall stands down and
       the services section below carries the same six names. ---- */
    var drawWall = W >= 860;
    var cols = 3, rows = 2;
    var gapx, cw, chh, gW, gH;
    if (W < 760) {
      /* narrow: a single column pair, smaller, hugging the right edge */
      cols = 2; rows = 3;
      cw = Math.min(150, (W * 0.62 - 10) / 2);
      chh = cw * 0.66;
      gapx = cw * 0.10;
      gW = cw * 2 + gapx;
      gH = chh * 3 + chh * 0.14 * 2;
    } else {
      cw = Math.min(212, (W * 0.46 - 24) / 3);
      chh = cw * 0.64;
      gapx = cw * 0.11;
      gW = cw * 3 + gapx * 2;
      gH = chh * 2 + chh * 0.16;
    }
    var gx = W - gW - Math.max(24, W * 0.035);
    var gy = H * 0.195 - scrollP * 46;
    var tilt = -0.026;

    ctx.save();
    ctx.translate(gx + gW / 2, gy + gH / 2);
    ctx.rotate(tilt);
    ctx.translate(-(gx + gW / 2), -(gy + gH / 2));

    var active = Math.floor(t / 2.6) % 6;

    for (var i = 0; i < (drawWall ? 6 : 0); i++) {
      var c = i % cols, r = (i / cols) | 0;
      var bob = Math.sin(t * 0.55 + i * 1.1) * 3;
      var lift = i === active ? -5 : 0;
      var cx0 = gx + c * (cw + gapx);
      var cy0 = gy + r * (chh + chh * 0.16) + bob + lift;
      var near = i === active ? 1 : 0.82;

      /* the active tile carries a hue rule across its top edge */
      if (i === active) {
        rr(cx0, cy0, cw, chh, 12);
        ctx.fillStyle = 'rgba(' + SERVICES[i].hue + ',.10)';
        ctx.fill();
      }

      ctx.shadowColor = 'rgba(18,50,74,' + (0.10 + near * 0.10).toFixed(2) + ')';
      ctx.shadowBlur = 16 + near * 14;
      ctx.shadowOffsetY = 8;
      rr(cx0, cy0, cw, chh, 12);
      ctx.fillStyle = '#FCFEFF';
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      rr(cx0, cy0, cw, chh, 12);
      ctx.strokeStyle = 'rgba(18,50,74,' + (0.09 + near * 0.10).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* the discipline, drawn */
      ctx.save();
      rr(cx0, cy0, cw, chh, 12);
      ctx.clip();
      ctx.translate(cx0, cy0);
      SCENES[i](cw, chh, t * (0.8 + near * 0.7) + i * 1.7);
      ctx.restore();

      /* name */
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(18,50,74,' + (0.52 + near * 0.34).toFixed(2) + ')';
      ctx.fillText(SERVICES[i].n, cx0 + 12, cy0 + chh - 11);
      ctx.fillStyle = 'rgba(18,50,74,' + (0.72 + near * 0.24).toFixed(2) + ')';
      ctx.fillText(SERVICES[i].label.toUpperCase(), cx0 + 29, cy0 + chh - 11);

      ctx.fillStyle = 'rgba(' + SERVICES[i].hue + ',' + (0.30 + near * 0.60).toFixed(2) + ')';
      ctx.fillRect(cx0 + 12, cy0 + chh - 23, i === active ? cw - 24 : 18, 1.2);
    }
    ctx.restore();

    /* the claim, said once beside the wall */
    if (W >= 900) {
      ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var cy2 = gy + gH + 30;
      ctx.fillStyle = 'rgba(' + NAVY + ',' + Math.max(0, 0.66 - scrollP * 0.45).toFixed(2) + ')';
      /* follows the wall's own tilt, so it reads centred under the grid */
      ctx.save();
      ctx.translate(gx + gW / 2, cy2);
      ctx.rotate(tilt);
      ctx.fillText('SIX SERVICES · ONE PARTNER · BENGALURU', 0, 0);
      ctx.restore();
    }

    /* dissolve toward the headline and into the page */
    var scrim = ctx.createLinearGradient(0, 0, W * 0.60, 0);
    scrim.addColorStop(0, 'rgba(242,250,251,1)');
    scrim.addColorStop(0.30, 'rgba(242,250,251,.97)');
    scrim.addColorStop(0.62, 'rgba(242,250,251,.55)');
    scrim.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);

    var vBot = ctx.createLinearGradient(0, H * 0.70, 0, H * 0.90);
    vBot.addColorStop(0, 'rgba(242,250,251,0)');
    vBot.addColorStop(1, 'rgba(242,250,251,1)');
    ctx.fillStyle = vBot;
    ctx.fillRect(0, H * 0.70, W, H * 0.20);

    if (pointerSeen) {
      var lxp = (pointer.x * 0.5 + 0.5) * W;
      var lyp = (0.5 - pointer.y * 0.5) * H;
      var lg = ctx.createRadialGradient(lxp, lyp, 0, lxp, lyp, Math.min(W, H) * 0.40);
      lg.addColorStop(0, 'rgba(255,255,255,.12)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ------------------------------------------------------------------- ink */
  var GL = null;
  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uM;',
    'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),',
    '             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);',
    '}',
    'float fbm(vec2 p){ float s=0.0,a=0.5;',
    '  for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.05+vec2(3.1,7.7); a*=0.5; } return s; }',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
    '  vec2 p=uv*1.5+uM*0.08; float t=uT*0.035;',
    '  vec2 q=vec2(fbm(p+t*0.8), fbm(p+vec2(5.2,1.3)-t*0.7));',
    '  vec2 r=vec2(fbm(p+2.0*q+vec2(1.7,9.2)+t*1.1),',
    '              fbm(p+2.2*q+vec2(8.3,2.8)-t*0.9));',
    '  float f=fbm(p+2.6*r);',
    '  vec3 paper=vec3(0.949,0.980,0.984);',
    '  vec3 navy =vec3(0.071,0.196,0.290);',
    '  vec3 teal =vec3(0.000,0.702,0.741);',
    '  vec3 cyan =vec3(0.188,0.753,0.941);',
    '  vec3 blue =vec3(0.125,0.470,0.753);',
    '  vec3 amber=vec3(0.941,0.596,0.251);',
    '  float anchor=1.0-smoothstep(0.18,1.18,length((uv-vec2(0.26,0.14))*vec2(0.82,1.10)));',
    '  float w8=0.28+0.72*anchor;',
    '  vec3 col=paper;',
    '  col=mix(col, mix(cyan,teal,0.45), smoothstep(0.34,0.72,f)*0.34*w8);',
    '  col=mix(col, blue, smoothstep(0.50,0.84,f)*0.46*w8);',
    '  col=mix(col, navy, smoothstep(0.66,0.96,f)*0.52*w8);',
    '  float band=sin((f*8.0+r.x*4.5+t*2.4)*6.2831853);',
    '  float fil=pow(max(band,0.0),20.0);',
    '  col=mix(col, mix(teal,vec3(0.80,0.95,0.97),0.55), fil*0.40*w8);',
    '  float contour=abs(fract(f*9.0)-0.5);',
    '  col=mix(col, navy, smoothstep(0.045,0.0,contour)*0.13*w8);',
    '  col=mix(col, amber, pow(clamp(r.x-0.60,0.0,1.0)*2.4,6.0)*0.15*w8);',
    '  col=mix(col, paper, smoothstep(0.30,-0.55,uv.x)*0.60);',
    '  float edge=1.0-smoothstep(0.42,0.98,length(uv*vec2(0.78,1.0)));',
    '  col=mix(paper, col, 0.20+0.80*edge);',
    '  col+=(hash(gl_FragCoord.xy+fract(uT))-0.5)*0.006;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'].join('\n');

  function initGL() {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false,
      premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return { gl: gl, uRes: gl.getUniformLocation(prog, 'uRes'),
      uT: gl.getUniformLocation(prog, 'uT'), uM: gl.getUniformLocation(prog, 'uM') };
  }

  function drawInk() {
    if (!GL) {
      GL = initGL();
      if (!GL) { MODE = 'mesh'; return drawMesh(); }
    }
    resize(0.7);
    var gl = GL.gl;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(GL.uRes, canvas.width, canvas.height);
    gl.uniform1f(GL.uT, t);
    gl.uniform2f(GL.uM, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ------------------------------------------------------------------ flow */
  var trail = document.createElement('canvas');
  var tctx = trail.getContext('2d');
  var flow = [];
  (function seed(n) {
    for (var i = 0; i < n; i++) {
      flow.push({ x: Math.random(), y: Math.random(), life: 160 + Math.random() * 260,
        sp: 0.6 + Math.random() * 0.9 });
    }
  })(1400);

  function angleAt(x, y, tt) {
    var a = Math.sin(x * 3.1 + tt * 0.22) + Math.cos(y * 2.4 - tt * 0.17);
    var b = Math.sin((x + y) * 1.7 - tt * 0.31);
    return a * 1.15 + b * 0.9 + 0.9;
  }

  function drawFlow() {
    resize(1.2);
    var w = canvas.width, h = canvas.height;
    if (trail.width !== w || trail.height !== h) {
      trail.width = w;
      trail.height = h;
      tctx.fillStyle = PAPER;
      tctx.fillRect(0, 0, w, h);
    }
    tctx.fillStyle = 'rgba(242,250,251,.05)';
    tctx.fillRect(0, 0, w, h);
    tctx.lineWidth = Math.max(0.7, w / 1700);
    tctx.lineCap = 'round';

    var stepPx = Math.max(1, w * 0.0016);
    for (var i = 0; i < flow.length; i++) {
      var p = flow[i];
      var ang = angleAt(p.x * 3.4, p.y * 3.4, t);
      var nx = p.x + Math.cos(ang) * (stepPx * p.sp) / w;
      var ny = p.y + Math.sin(ang) * (stepPx * p.sp) / h;
      var dark = Math.min(1, Math.abs(Math.cos(ang)) * 0.7 + 0.25);
      tctx.strokeStyle = (i % 7 === 0)
        ? 'rgba(' + TEAL + ',' + (0.05 + dark * 0.10).toFixed(3) + ')'
        : 'rgba(' + NAVY + ',' + (0.045 + dark * 0.075).toFixed(3) + ')';
      tctx.beginPath();
      tctx.moveTo(p.x * w, p.y * h);
      tctx.lineTo(nx * w, ny * h);
      tctx.stroke();
      p.x = nx;
      p.y = ny;
      p.life -= 1;
      if (p.life <= 0 || p.x < -0.02 || p.x > 1.02 || p.y < -0.02 || p.y > 1.02) {
        p.x = Math.random();
        p.y = Math.random();
        p.life = 160 + Math.random() * 260;
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w * 0.68, h * 0.38, 0, w * 0.68, h * 0.38, Math.max(w, h) * 0.66);
    g.addColorStop(0, 'rgba(48,192,240,.22)');
    g.addColorStop(0.5, 'rgba(0,179,189,.10)');
    g.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(trail, 0, 0);
    ctx.globalAlpha = 1;

    var s = w / canvas.clientWidth;
    var scrim = ctx.createLinearGradient(0, 0, w * 0.74, 0);
    scrim.addColorStop(0, 'rgba(242,250,251,.95)');
    scrim.addColorStop(0.44, 'rgba(242,250,251,.55)');
    scrim.addColorStop(1, 'rgba(242,250,251,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
  }

  /* ------------------------------------------------------------ loop + life */
  var live = false;
  var frames = 0;
  function draw() {
    frames++;
    if (MODE === 'reel') drawReel();
    else if (MODE === 'rays') drawRays();
    else if (MODE === 'ink') drawInk();
    else if (MODE === 'flow') drawFlow();
    else drawMesh();
    if (!live) { live = true; canvas.classList.add('is-live'); }
  }

  var lastPaint = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    /* scroll velocity swells the drift for a moment, then it settles back */
    var sc = window.scrollY || 0;
    var dv = Math.abs(sc - lastScrollY);
    lastScrollY = sc;
    scrollBoost = Math.max(scrollBoost * 0.90, Math.min(1, dv / 70));
    if (!paused()) t += dt * (1 + scrollBoost * 0.9);
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    /* 30fps is enough for a surface this slow: it halves the paint cost and
       the motion still reads as drift rather than animation. */
    if (now - lastPaint >= 33) {
      lastPaint = now;
      draw();
    }
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (!raf && !paused() && onScreen && !hidden()) {
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    }
  }
  function stop() {
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  function sync() {
    if (paused() || !onScreen || hidden()) {
      stop();
      draw();            // one framed still, so the hero is never blank
    } else {
      start();
    }
  }

  // the site's own motion switch lives on <html data-motion="paused">
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  if (reduce.addEventListener) reduce.addEventListener('change', sync);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      sync();
    }, { rootMargin: '120px' }).observe(canvas);
  }

  document.addEventListener('visibilitychange', sync);

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (trail.width) { trail.width = 0; trail.height = 0; }
      draw();
    }, 180);
  });

  /* window resize alone misses container-driven changes (zoom, split view,
     orientation with a fixed layout), so watch the element itself too */
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (trail.width) { trail.width = 0; trail.height = 0; }
      last = performance.now();
      draw();
    }).observe(canvas);
  }

  if (window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (window.innerHeight / 2 - e.clientY) / window.innerHeight * 2;
      pointerSeen = true;
    }, { passive: true });
  }

  // first paint happens even if scripts run before layout settles
  draw();
  sync();

  window.HeroBg = { mode: MODE, draw: draw, stop: stop, start: start,
    /* deterministic single step, used to verify the pause gate without rAF */
    step: function (dtSeconds) {
      if (!paused()) t += dtSeconds * (1 + scrollBoost * 0.9);
      draw();
      return { t: +t.toFixed(3), frames: frames, paused: paused() };
    },
    get frames() { return frames; }, get time() { return t.toFixed(2); } };
})();

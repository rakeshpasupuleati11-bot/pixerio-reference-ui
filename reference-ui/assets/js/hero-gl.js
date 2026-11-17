/* ==========================================================================
   Pixerio — WebGL depth field for the hero
   A single fragment shader: layered brand-colour nebula with slow drift and a
   vignette, sitting under the CSS-3D corridor. No libraries, no textures.
   Falls back silently to the CSS ambience when WebGL is unavailable, paused
   by the site motion toggle, and drawn once under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';
  var host = document.querySelector('.hx__scene');
  if (!host) return;
  var cv = document.createElement('canvas');
  cv.className = 'gl';
  cv.setAttribute('aria-hidden', 'true');
  host.insertBefore(cv, host.firstChild);

  var gl = cv.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' });
  if (!gl) { cv.remove(); return; }

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;',
    'uniform vec2 R;uniform float T;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;',
    ' float t=T*.045;',
    ' float f1=fbm(uv*1.6+vec2(t*.6,-t*.35));',
    ' float f2=fbm(uv*2.4-vec2(t*.4,t*.25)+7.3);',
    ' vec3 teal=vec3(0.0,0.70,0.74), cyan=vec3(0.016,0.59,0.76), lime=vec3(0.72,0.84,0.31);',
    ' vec3 c=mix(teal,cyan,smoothstep(.25,.75,f1));',
    ' c=mix(c,lime,smoothstep(.55,.95,f2)*.55);',
    ' float r=length(uv);',
    ' float glow=smoothstep(.85,.05,r);',
    ' c*=glow*.42;',
    ' c+=vec3(.02,.07,.09)*(1.-glow);',
    ' gl_FragColor=vec4(c,.55);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) { cv.remove(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(prog, 'R');
  var uT = gl.getUniformLocation(prog, 'T');

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var still = function () {
    return reduce.matches || document.documentElement.getAttribute('data-motion') === 'paused';
  };

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(host.clientWidth * dpr));
    var h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uR, w, h);
  }

  var t0 = performance.now(), raf = null, running = false;
  function draw(now) {
    raf = null;
    size();
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still()) { raf = window.requestAnimationFrame(draw); running = true; }
    else running = false;
  }
  function kick() { if (!raf) raf = window.requestAnimationFrame(draw); }

  size(); kick();
  window.addEventListener('resize', kick, { passive: true });
  window.addEventListener('scroll', function () { if (!running) kick(); }, { passive: true });
  if (window.MutationObserver) {
    new MutationObserver(function () { if (still()) { if (raf) { cancelAnimationFrame(raf); raf = null; } running = false; } else kick(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  }
})();

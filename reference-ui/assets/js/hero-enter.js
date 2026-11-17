/* Hero entrance: adds .is-in so the masked headline and the stack arrive.
   Kept separate from hero.js so it runs even when the hero has no photo card. */
(function () {
  'use strict';
  var hx = document.querySelector('.hx');
  if (!hx) return;
  var go = function () { hx.classList.add('is-in'); };
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(function () { window.setTimeout(go, 60); });
  } else {
    window.setTimeout(go, 60);
  }
})();

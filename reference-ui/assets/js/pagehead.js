/* Page-head consistency: pages without an .eyebrow get their breadcrumb line
   promoted to the same teal chip the service pages use. CSS-only styling,
   one class added here. */
(function () {
  'use strict';
  var head = document.querySelector('.page-head');
  if (!head) return;
  if (head.querySelector('.eyebrow')) return;
  var crumbs = head.querySelector('.crumbs');
  if (crumbs) crumbs.classList.add('crumbs--chip');
})();

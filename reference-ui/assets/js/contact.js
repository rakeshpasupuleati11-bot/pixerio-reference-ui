/* ==========================================================================
   Pixerio — contact form (static-safe)
   The site is static, so there is no server to post to. This validates the
   enquiry in the browser and hands it to the visitor's mail app, addressed
   to the studio inbox that is already published in the page's structured data.
   No data is stored or sent anywhere else.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('form[data-enquiry]') || document.querySelector('main form');
  if (!form) return;

  var TO = form.getAttribute('data-mailto') || 'info@pixerio.com';
  var note = form.querySelector('.formnote') || document.createElement('p');
  if (!note.parentNode) {
    note.className = 'formnote';
    form.appendChild(note);
  }

  function fieldWrap(el) {
    var w = el.closest('label, .field') || el.parentNode;
    return w;
  }

  function say(msg, ok) {
    note.textContent = msg;
    note.className = 'formnote ' + (ok ? 'formnote--ok' : 'formnote--bad');
  }

  form.setAttribute('novalidate', '');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var required = ['name', 'email', 'brief'];
    var bad = [];

    required.forEach(function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      if (!el) return;
      var empty = !el.value.trim();
      var badEmail = n === 'email' && el.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      var wrap = fieldWrap(el);
      var isBad = empty || badEmail;
      if (wrap) wrap.classList.toggle('field--bad', !!isBad);
      if (isBad) bad.push(n);
    });

    var consent = form.querySelector('[name="consent"]');
    if (consent && !consent.checked) bad.push('consent');

    if (bad.length) {
      var anyEmpty = ['name','email','brief'].some(function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el && !el.value.trim();
      });
      say(anyEmpty ? 'Fill the required fields'
          : bad.indexOf('email') > -1 ? 'Check the email address'
          : 'Please accept the privacy note', false);
      var first = form.querySelector('[name="' + bad[0] + '"]');
      if (first && first.focus) first.focus();
      return;
    }

    var get = function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      return el && el.value ? el.value.trim() : '';
    };

    var service = get('service');
    var body = [
      'Name: ' + get('name'),
      'Company: ' + get('company'),
      'Email: ' + get('email'),
      'Phone: ' + get('phone'),
      'Service: ' + service,
      '',
      'Brief:',
      get('brief')
    ].join('\n');

    var href = 'mailto:' + TO +
      '?subject=' + encodeURIComponent('Project enquiry' + (service ? ' — ' + service : '')) +
      '&body=' + encodeURIComponent(body);

    say('Opening your mail app — the enquiry is addressed to ' + TO, true);
    window.location.href = href;
  });
})();

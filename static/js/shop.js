/* Coin shop — progressive enhancement.
 * Forms POST normally without JS (server redirects with a message). With JS we
 * intercept, send the same POST via fetch, and update the coin balance + a toast
 * instead of a full navigation. Purchase/equip state is re-rendered by a light
 * reload so the server stays the single source of truth (safe at scale). */
(function () {
  'use strict';

  function toast(message, ok) {
    var el = document.createElement('div');
    el.textContent = message;
    el.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;' +
      'padding:12px 20px;border-radius:14px;font-weight:600;font-size:14px;color:#fff;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;' +
      'background:' + (ok ? '#10b981' : '#ef4444');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.transform = 'translateX(-50%) translateY(-4px)'; });
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 1800);
  }

  function onSubmit(e) {
    var form = e.target.closest('.shop-form');
    if (!form) return;
    e.preventDefault();

    var btn = form.querySelector('button[type="submit"]');
    if (btn && btn.disabled) return;
    var original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    fetch(form.action, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new FormData(form),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        var d = res.data || {};
        if (!res.ok || !d.ok) {
          toast(d.message || 'Xatolik yuz berdi.', false);
          if (btn) { btn.disabled = false; btn.textContent = original; }
          return;
        }
        if (typeof d.coins === 'number') {
          var bal = document.getElementById('coin-balance');
          if (bal) bal.textContent = d.coins;
        }
        toast(d.message || 'Bajarildi', true);
        // Re-render owned/equipped state authoritatively.
        setTimeout(function () { window.location.reload(); }, 500);
      })
      .catch(function () {
        toast('Tarmoq xatosi. Qayta urinib ko‘ring.', false);
        if (btn) { btn.disabled = false; btn.textContent = original; }
      });
  }

  document.addEventListener('submit', onSubmit);
})();

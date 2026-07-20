/* Auto-save for long written (open) answers (Feature 4).
 * Drafts are persisted to localStorage every second (and on input), restored when the
 * question card is (re)rendered, and cleared once the answer is submitted. No backend
 * storage — purely client-side, so it survives an accidental reload or tab close.
 *
 * The test screen swaps the question card via HTMX, so we (re)initialise on every
 * htmx:afterSwap as well as the initial load. */
(function () {
  'use strict';
  var SAVE_INTERVAL_MS = 1000;
  var timers = new WeakMap();

  function keyFor(form, fieldName) {
    return 'ilm_draft_' + form.dataset.attempt + '_' + form.dataset.question + '_' + fieldName;
  }

  function fields(form) {
    return form.querySelectorAll('textarea[name="text_answer"], textarea[name^="subanswer_"]');
  }

  function restore(form) {
    fields(form).forEach(function (ta) {
      // Only restore when the server didn't already render a saved answer, so we never
      // clobber a real submitted answer with a stale draft.
      if (ta.value.trim() !== '') return;
      var saved = localStorage.getItem(keyFor(form, ta.name));
      if (saved) ta.value = saved;
    });
  }

  function save(form) {
    var wroteSomething = false;
    fields(form).forEach(function (ta) {
      var k = keyFor(form, ta.name);
      if (ta.value.trim() === '') { localStorage.removeItem(k); }
      else { localStorage.setItem(k, ta.value); wroteSomething = true; }
    });
    return wroteSomething;
  }

  function clearDrafts(form) {
    fields(form).forEach(function (ta) { localStorage.removeItem(keyFor(form, ta.name)); });
  }

  function init(root) {
    (root || document).querySelectorAll('form[data-autosave]').forEach(function (form) {
      if (form.__autosaveBound) return;
      form.__autosaveBound = true;

      restore(form);

      // Periodic save (the "every second" requirement) + immediate save on typing.
      var t = setInterval(function () {
        if (!document.body.contains(form)) { clearInterval(t); return; }
        save(form);
      }, SAVE_INTERVAL_MS);
      timers.set(form, t);
      form.addEventListener('input', function () { save(form); });

      // Once the answer is submitted, the draft is no longer needed.
      form.addEventListener('submit', function () { clearDrafts(form); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { init(document); });
  document.body.addEventListener('htmx:afterSwap', function (e) { init(e.target); });
  // HTMX submits the form via AJAX (no native submit event on success swap) — clear the
  // just-submitted question's draft after a successful post, too.
  document.body.addEventListener('htmx:afterRequest', function (e) {
    var form = e.detail && e.detail.elt && e.detail.elt.closest && e.detail.elt.closest('form[data-autosave]');
    if (form && e.detail.successful) clearDrafts(form);
  });
})();

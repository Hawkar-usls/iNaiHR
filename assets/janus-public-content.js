/*
 * JANUS Public Content Viewer · independent GitHub Pages frontend.
 * Copyright (c) 2026 Hawkar-usls (MIT).
 * Fetches public, same-origin static files only. Never sends user data.
 * Model output is denied unless separately reviewed and merged into the repo.
 */
(function () {
  'use strict';

  const SOURCE_SCHEMA = 'janus.public_i18n.source.v1';
  const REVIEW_SCHEMA = 'janus.public_i18n.translation.v1';
  const BASE = new URL('./public-i18n/', document.baseURI);
  let requestId = 0;
  let priorFocus = null;

  function allowedLang(lang) { return lang === 'uk' || lang === 'ru'; }

  function safeText(value) {
    return typeof value === 'string' && value.length >= 3 && value.length <= 480 &&
      !/[<>{}\u0000-\u001f]/.test(value) &&
      !/https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i.test(value);
  }

  function validSource(source) {
    return source && source.schema === SOURCE_SCHEMA &&
      source.classification === 'PUBLIC_ONLY' && source.source_language === 'en' &&
      typeof source.source_version === 'string' &&
      Array.isArray(source.entries) && source.entries.length >= 1 && source.entries.length <= 12 &&
      new Set(source.entries.map(item => item && item.id)).size === source.entries.length &&
      source.entries.every(item => item && /^[a-z][a-z0-9_-]{1,39}$/.test(item.id) && safeText(item.text));
  }

  function validReview(doc, source, digest, lang) {
    if (!allowedLang(lang) || !validSource(source) || !doc || typeof doc !== 'object') return false;
    if (doc.schema !== REVIEW_SCHEMA || doc.classification !== 'PUBLIC_ONLY' ||
        doc.language !== lang || doc.source_version !== source.source_version ||
        doc.source_sha256 !== digest || doc.status !== 'HUMAN_REVIEWED' ||
        doc.approved !== true || !doc.texts || typeof doc.texts !== 'object') return false;
    const keys = source.entries.map(x => x.id).sort();
    const received = Object.keys(doc.texts).sort();
    return keys.length === received.length &&
      keys.every((key, index) => key === received[index] && safeText(doc.texts[key]));
  }

  async function readSameOrigin(path) {
    const url = new URL(path, BASE);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE.pathname)) {
      throw new Error('Cross-origin or out-of-scope public content rejected');
    }
    const response = await fetch(url.href, {
      credentials: 'omit',
      redirect: 'error',
      mode: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Missing public content');
    const raw = await response.text();
    if (raw.length > 16384) throw new Error('Public content exceeds size limit');
    return { raw, json: JSON.parse(raw) };
  }

  async function sha256(raw) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder !== 'function') {
      throw new Error('Source integrity check unavailable');
    }
    const bytes = new TextEncoder().encode(raw);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function renderText(entries, status) {
    const target = document.getElementById('public-i18n-copy');
    const indicator = document.getElementById('public-i18n-status');
    if (!target || !indicator) return;
    target.replaceChildren();
    entries.forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      target.appendChild(paragraph);
    });
    indicator.textContent = status;
  }

  async function showLocale(lang) {
    const current = ++requestId;
    try {
      const sourceFile = await readSameOrigin('source.json');
      const source = sourceFile.json;
      if (!validSource(source)) throw new Error('Public catalog is not approved for display');
      let entries = source.entries.map(item => item.text);
      let status = 'PUBLIC ORIGINAL · EN';
      if (allowedLang(lang)) {
        try {
          const digest = await sha256(sourceFile.raw);
          const reviewFile = await readSameOrigin('reviewed/' + lang + '.json');
          if (!validReview(reviewFile.json, source, digest, lang)) {
            throw new Error('Translation has no valid editorial approval');
          }
          entries = source.entries.map(item => reviewFile.json.texts[item.id]);
          status = 'HUMAN-REVIEWED PUBLIC COPY · ' + lang.toUpperCase();
        } catch (_) {
          status = 'NO VERIFIED ' + lang.toUpperCase() + ' TRANSLATION · SHOWING EN ORIGINAL';
        }
      }
      if (current === requestId) renderText(entries, status);
    } catch (_) {
      if (current === requestId) renderText(
        ['Public project description is unavailable. No private data was accessed.'],
        'PUBLIC CONTENT UNAVAILABLE'
      );
    }
  }

  function currentLocale() {
    const loc = window.JanusLocale;
    return loc && typeof loc.getLocale === 'function' ? loc.getLocale() : 'en';
  }

  function open() {
    const modal = document.getElementById('public-i18n-modal');
    if (!modal) return;
    priorFocus = document.activeElement;
    modal.style.display = 'flex';
    const closeButton = document.getElementById('public-i18n-close');
    if (closeButton) closeButton.focus();
    void showLocale(currentLocale());
  }

  function close() {
    ++requestId;
    const modal = document.getElementById('public-i18n-modal');
    if (modal) modal.style.display = 'none';
    if (priorFocus && typeof priorFocus.focus === 'function') priorFocus.focus();
  }

  function init() {
    const launcher = document.getElementById('btn-public');
    const dismiss = document.getElementById('public-i18n-close');
    const modal = document.getElementById('public-i18n-modal');
    if (launcher) launcher.addEventListener('click', open);
    if (dismiss) dismiss.addEventListener('click', close);
    if (modal) modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('janus:locale-change', () => {
      if (modal && modal.style.display === 'flex') void showLocale(currentLocale());
    });
  }

  window.JanusPublicContent = Object.freeze({
    open,
    close,
    refresh: () => showLocale(currentLocale()),
    validReview
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/*
 * JANUS Locale UI · original, dependency-free localization of static UI controls.
 * Copyright (c) 2026 Hawkar-usls. MIT license (repository LICENSE).
 * This implementation does NOT incorporate translate.js source code.
 * Does not translate user-authored graph data or send text over the network.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'janus.ui.locale.v1';
  const MESSAGES = Object.freeze({
    en: Object.freeze({
      clearDesk: 'CLEAR LOCAL DESK',
      deleteHint: 'DELETE LOCAL NODE',
      workspaceNote: 'Clearing or deleting here affects only this browser workspace. No iNaiHR control can delete Meta Registry source objects.',
      nodeInput: 'NODE INPUT',
      inputData: 'INPUT DATA...',
      initiate: 'INITIATE',
      cancel: 'CANCEL',
      confirmClear: "CLEAR THIS BROWSER'S LOCAL DESK?",
      registryUnchanged: 'JANUS Meta Registry and HRaiN Registry Mode are untouched.',
      clearLocal: 'CLEAR LOCAL',
      interfaceLanguage: 'Interface language',
      publicInfo: 'PUBLIC INFO',
      publicTitle: 'PUBLIC PROJECT INFORMATION',
      publicClose: 'CLOSE'
    }),
    uk: Object.freeze({
      clearDesk: 'ОЧИСТИТИ ЛОКАЛЬНИЙ ПРОСТІР',
      deleteHint: 'ВИДАЛИТИ ЛОКАЛЬНИЙ ВУЗОЛ',
      workspaceNote: 'Очищення або видалення тут впливає лише на локальний простір цього браузера. Жоден елемент керування iNaiHR не видаляє вихідні об’єкти Meta Registry.',
      nodeInput: 'ВВЕДЕННЯ ВУЗЛА',
      inputData: 'ВВЕДІТЬ ДАНІ...',
      initiate: 'ПІДТВЕРДИТИ',
      cancel: 'СКАСУВАТИ',
      confirmClear: 'ОЧИСТИТИ ЛОКАЛЬНИЙ ПРОСТІР ЦЬОГО БРАУЗЕРА?',
      registryUnchanged: 'JANUS Meta Registry та режим реєстру HRaiN залишаться без змін.',
      clearLocal: 'ОЧИСТИТИ ЛОКАЛЬНО',
      interfaceLanguage: 'Мова інтерфейсу',
      publicInfo: 'ПУБЛІЧНА ІНФОРМАЦІЯ',
      publicTitle: 'ІНФОРМАЦІЯ ПРО ПРОЄКТ',
      publicClose: 'ЗАКРИТИ'
    }),
    ru: Object.freeze({
      clearDesk: 'ОЧИСТИТЬ ЛОКАЛЬНОЕ ПРОСТРАНСТВО',
      deleteHint: 'УДАЛИТЬ ЛОКАЛЬНЫЙ УЗЕЛ',
      workspaceNote: 'Очистка и удаление здесь затрагивают только локальное пространство этого браузера. Элементы управления iNaiHR не удаляют исходные объекты Meta Registry.',
      nodeInput: 'ВВОД УЗЛА',
      inputData: 'ВВЕДИТЕ ДАННЫЕ...',
      initiate: 'ПОДТВЕРДИТЬ',
      cancel: 'ОТМЕНА',
      confirmClear: 'ОЧИСТИТЬ ЛОКАЛЬНОЕ ПРОСТРАНСТВО ЭТОГО БРАУЗЕРА?',
      registryUnchanged: 'JANUS Meta Registry и режим реестра HRaiN останутся без изменений.',
      clearLocal: 'ОЧИСТИТЬ ЛОКАЛЬНО',
      interfaceLanguage: 'Язык интерфейса',
      publicInfo: 'О ПРОЕКТЕ',
      publicTitle: 'ПУБЛИЧНАЯ ИНФОРМАЦИЯ',
      publicClose: 'ЗАКРЫТЬ'
    })
  });

  const SUPPORTED = Object.freeze(Object.keys(MESSAGES));
  let locale = 'en';

  function supported(value) {
    return Object.prototype.hasOwnProperty.call(MESSAGES, value);
  }

  // A validated, explicitly selected URL locale takes precedence over the saved preference.
  // This affects presentation only; it does not expose or transmit page content.
  function urlLocale() {
    try {
      if (typeof URLSearchParams !== 'function') return null;
      const params = new URLSearchParams(window.location && window.location.search || '');
      const requested = params.get('janus_lang');
      return supported(requested) ? requested : null;
    } catch (_) { return null; }
  }

  function initialLocale() {
    const requested = urlLocale();
    if (requested) return requested;
    let stored = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch (_) { /* storage may be unavailable */ }
    if (supported(stored)) return stored;
    const nav = window.navigator || {};
    const hint = (nav.languages && nav.languages[0]) || nav.language || 'en';
    const base = String(hint).toLowerCase().split(/[-_]/)[0];
    return supported(base) ? base : 'en';
  }

  // Explicit per-control opt-in: dynamic graph data and arbitrary document text
  // never enter the localization pipeline.
  const BINDINGS = Object.freeze([
    { selector: '[data-janus-i18n]', attribute: 'data-janus-i18n', property: 'textContent' },
    { selector: '[data-janus-i18n-placeholder]', attribute: 'data-janus-i18n-placeholder', property: 'placeholder' },
    { selector: '[data-janus-i18n-aria-label]', attribute: 'data-janus-i18n-aria-label', property: 'aria-label' },
    { selector: '[data-janus-i18n-title]', attribute: 'data-janus-i18n-title', property: 'title' }
  ]);

  function excluded(element) {
    let parent = element;
    while (parent && parent.nodeType === 1) {
      if (typeof parent.hasAttribute === 'function' && parent.hasAttribute('data-janus-i18n-ignore')) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function applyTranslation(element, binding) {
    if (!element || excluded(element)) return;
    const key = element.getAttribute(binding.attribute);
    const messages = MESSAGES[locale];
    if (!Object.prototype.hasOwnProperty.call(messages, key)) return;
    const value = messages[key];
    if (binding.property === 'aria-label' || binding.property === 'title') {
      if (element.getAttribute(binding.property) !== value) element.setAttribute(binding.property, value);
    } else if (element[binding.property] !== value) {
      element[binding.property] = value;
    }
  }

  function refresh() {
    document.documentElement.lang = locale;
    for (const binding of BINDINGS) {
      document.querySelectorAll(binding.selector).forEach(element => applyTranslation(element, binding));
    }
    const select = document.getElementById('janus-language');
    if (select && select.value !== locale) select.value = locale;
  }

  function refreshNewSubtree(root) {
    if (!root || root.nodeType !== 1 || excluded(root)) return;
    for (const binding of BINDINGS) {
      if (root.hasAttribute(binding.attribute)) applyTranslation(root, binding);
      root.querySelectorAll(binding.selector).forEach(element => applyTranslation(element, binding));
    }
  }

  function observeNewControls() {
    if (typeof MutationObserver !== 'function' || !document.body) return;
    const watcher = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) refreshNewSubtree(node);
      }
    });
    // Only newly inserted opt-in controls are processed; no attribute, network,
    // text-node, or whole-page rescanning is used.
    watcher.observe(document.body, { childList: true, subtree: true });
  }

  function setLocale(value) {
    if (!supported(value)) return false;
    locale = value;
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch (_) { /* remain usable without storage */ }
    refresh();
    try {
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('janus:locale-change', { detail: { locale } }));
      }
    } catch (_) { /* localization remains usable */ }
    return true;
  }

  function init() {
    locale = initialLocale();
    const select = document.getElementById('janus-language');
    if (select) select.addEventListener('change', () => setLocale(select.value));
    refresh();
    observeNewControls();
  }

  window.JanusLocale = Object.freeze({
    setLocale,
    getLocale: () => locale,
    refresh,
    supportedLocales: SUPPORTED
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

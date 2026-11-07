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
      clearLocal: 'CLEAR LOCAL'
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
      clearLocal: 'ОЧИСТИТИ ЛОКАЛЬНО'
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
      clearLocal: 'ОЧИСТИТЬ ЛОКАЛЬНО'
    })
  });

  const SUPPORTED = Object.freeze(Object.keys(MESSAGES));
  let locale = 'en';

  function supported(value) {
    return Object.prototype.hasOwnProperty.call(MESSAGES, value);
  }

  function initialLocale() {
    let stored = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch (_) { /* storage may be unavailable */ }
    if (supported(stored)) return stored;
    const nav = window.navigator || {};
    const hint = (nav.languages && nav.languages[0]) || nav.language || 'en';
    const base = String(hint).toLowerCase().split(/[-_]/)[0];
    return supported(base) ? base : 'en';
  }

  function refresh() {
    document.documentElement.lang = locale;
    const messages = MESSAGES[locale];
    document.querySelectorAll('[data-janus-i18n]').forEach(element => {
      const key = element.getAttribute('data-janus-i18n');
      if (Object.prototype.hasOwnProperty.call(messages, key) && element.textContent !== messages[key]) {
        element.textContent = messages[key];
      }
    });
    document.querySelectorAll('[data-janus-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-janus-i18n-placeholder');
      if (Object.prototype.hasOwnProperty.call(messages, key) && element.placeholder !== messages[key]) {
        element.placeholder = messages[key];
      }
    });
    const select = document.getElementById('janus-language');
    if (select && select.value !== locale) select.value = locale;
  }

  function setLocale(value) {
    if (!supported(value)) return false;
    locale = value;
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch (_) { /* remain usable without storage */ }
    refresh();
    return true;
  }

  function init() {
    locale = initialLocale();
    const select = document.getElementById('janus-language');
    if (select) select.addEventListener('change', () => setLocale(select.value));
    refresh();
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

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'janus-locale-ui.js'), 'utf8');

function fixture({ language = 'en-US', stored = null, storageWorks = true, query = '', observe = false } = {}) {
  const saved = new Map(stored ? [['janus.ui.locale.v1', stored]] : []);
  const clear = {
    textContent: 'CLEAR LOCAL DESK',
    getAttribute: attribute => attribute === 'data-janus-i18n' ? 'clearDesk' : null
  };
  const hint = {
    textContent: 'DELETE LOCAL NODE',
    getAttribute: attribute => attribute === 'data-janus-i18n' ? 'deleteHint' : null
  };
  const input = {
    placeholder: 'INPUT DATA...',
    getAttribute: attribute => attribute === 'data-janus-i18n-placeholder' ? 'inputData' : null
  };
  const graph = { textContent: 'Private user graph: JANUS 123' };
  const picker = {
    value: 'en',
    attributes: { 'aria-label': 'Interface language' },
    getAttribute(name) {
      if (name === 'data-janus-i18n-aria-label') return 'interfaceLanguage';
      return this.attributes[name] || null;
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(event, callback) {
      if (event === 'change') this.onChange = callback;
    }
  };
  const document = {
    readyState: 'complete',
    body: {},

    documentElement: { lang: 'en' },
    querySelectorAll(selector) {
      if (selector === '[data-janus-i18n]') return [clear, hint];
      if (selector === '[data-janus-i18n-placeholder]') return [input];
      if (selector === '[data-janus-i18n-aria-label]') return [picker];
      return [];
    },
    getElementById(id) { return id === 'janus-language' ? picker : null; }
  };
  const window = {
    location: { search: query },
    navigator: { language, languages: [language] },
    localStorage: {
      getItem(key) {
        if (!storageWorks) throw new Error('Storage blocked');
        return saved.get(key) || null;
      },
      setItem(key, value) {
        if (!storageWorks) throw new Error('Storage blocked');
        saved.set(key, value);
      }
    },
    fetch() { throw new Error('Unwanted network use'); }
  };
  let observer = null;
  class TestObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target, options) { this.target = target; this.options = options; }
  }
  vm.runInNewContext(source, {
    window,
    document,
    URLSearchParams,
    MutationObserver: observe ? TestObserver : undefined
  });
  return { api: window.JanusLocale, clear, hint, input, graph, picker, document, saved, observer };
}

test('locale selection translates opted-in UI text only', () => {
  const f = fixture();
  assert.equal(f.api.setLocale('uk'), true);
  assert.equal(f.clear.textContent, 'ОЧИСТИТИ ЛОКАЛЬНИЙ ПРОСТІР');
  assert.equal(f.hint.textContent, 'ВИДАЛИТИ ЛОКАЛЬНИЙ ВУЗОЛ');
  assert.equal(f.input.placeholder, 'ВВЕДІТЬ ДАНІ...');
  assert.equal(f.graph.textContent, 'Private user graph: JANUS 123');
  assert.equal(f.document.documentElement.lang, 'uk');
  assert.equal(f.saved.get('janus.ui.locale.v1'), 'uk');
});

test('respects stored language and handles a selector change', () => {
  const f = fixture({ language: 'ru-RU', stored: 'uk' });
  assert.equal(f.api.getLocale(), 'uk');
  f.picker.value = 'ru';
  f.picker.onChange();
  assert.equal(f.api.getLocale(), 'ru');
  assert.equal(f.clear.textContent, 'ОЧИСТИТЬ ЛОКАЛЬНОЕ ПРОСТРАНСТВО');
});

test('invalid locale cannot replace UI or preference', () => {
  const f = fixture();
  assert.equal(f.api.setLocale('__proto__'), false);
  assert.equal(f.api.setLocale('fr'), false);
  assert.equal(f.clear.textContent, 'CLEAR LOCAL DESK');
  assert.equal(f.api.getLocale(), 'en');
});

test('works without localStorage and never touches user graph', () => {
  const f = fixture({ language: 'uk-UA', storageWorks: false });
  assert.equal(f.api.getLocale(), 'uk');
  assert.equal(f.api.setLocale('ru'), true);
  assert.equal(f.graph.textContent, 'Private user graph: JANUS 123');
  assert.equal(f.api.getLocale(), 'ru');
});

test('URL language override is allowlisted and outranks saved preference', () => {
  const accepted = fixture({ stored: 'ru', query: '?janus_lang=uk' });
  assert.equal(accepted.api.getLocale(), 'uk');
  assert.equal(accepted.document.documentElement.lang, 'uk');
  const rejected = fixture({ stored: 'ru', query: '?janus_lang=__proto__' });
  assert.equal(rejected.api.getLocale(), 'ru');
});

test('accessible language picker label is localized', () => {
  const f = fixture();
  assert.equal(f.picker.attributes['aria-label'], 'Interface language');
  f.api.setLocale('uk');
  assert.equal(f.picker.attributes['aria-label'], 'Мова інтерфейсу');
  f.api.setLocale('ru');
  assert.equal(f.picker.attributes['aria-label'], 'Язык интерфейса');
});

test('newly inserted opted-in controls localize without whole-page retranslation', () => {
  const f = fixture({ observe: true });
  assert.ok(f.observer);
  assert.equal(f.observer.options.childList, true);
  assert.equal(f.observer.options.attributes, undefined);
  f.api.setLocale('uk');
  const dynamic = {
    nodeType: 1,
    parentElement: null,
    textContent: 'CLEAR LOCAL DESK',
    getAttribute(name) { return name === 'data-janus-i18n' ? 'clearDesk' : null; },
    hasAttribute(name) { return name === 'data-janus-i18n'; },
    querySelectorAll() { return []; }
  };
  f.observer.callback([{ addedNodes: [dynamic] }]);
  assert.equal(dynamic.textContent, 'ОЧИСТИТИ ЛОКАЛЬНИЙ ПРОСТІР');
  assert.equal(f.graph.textContent, 'Private user graph: JANUS 123');
});

test('ignored descendants are untouched even when bearing an opt-in attribute', () => {
  const f = fixture({ observe: true });
  f.api.setLocale('ru');
  const ignored = {
    nodeType: 1,
    parentElement: null,
    hasAttribute(name) { return name === 'data-janus-i18n-ignore'; }
  };
  const fakeGraphLabel = {
    nodeType: 1,
    parentElement: ignored,
    textContent: 'User-owned science text',
    getAttribute(name) { return name === 'data-janus-i18n' ? 'clearDesk' : null; },
    hasAttribute(name) { return name === 'data-janus-i18n'; },
    querySelectorAll() { return []; }
  };
  f.observer.callback([{ addedNodes: [fakeGraphLabel] }]);
  assert.equal(fakeGraphLabel.textContent, 'User-owned science text');
});

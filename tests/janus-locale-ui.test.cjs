'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'janus-locale-ui.js'), 'utf8');

function fixture({ language = 'en-US', stored = null, storageWorks = true } = {}) {
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
    addEventListener(event, callback) {
      if (event === 'change') this.onChange = callback;
    }
  };
  const document = {
    readyState: 'complete',
    documentElement: { lang: 'en' },
    querySelectorAll(selector) {
      if (selector === '[data-janus-i18n]') return [clear, hint];
      if (selector === '[data-janus-i18n-placeholder]') return [input];
      return [];
    },
    getElementById(id) { return id === 'janus-language' ? picker : null; }
  };
  const window = {
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
  vm.runInNewContext(source, { window, document });
  return { api: window.JanusLocale, clear, hint, input, graph, picker, document, saved };
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

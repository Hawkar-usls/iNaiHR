'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');

const code = fs.readFileSync(path.join(__dirname, '..', 'assets', 'janus-public-content.js'), 'utf8');
const source = {
  schema: 'janus.public_i18n.source.v1',
  source_language: 'en',
  source_version: 'public-about-2026-11-07-v1',
  classification: 'PUBLIC_ONLY',
  entries: [{ id: 'intro', text: 'This is a public project description.' }]
};
const sourceRaw = JSON.stringify(source) + '\n';
const digest = createHash('sha256').update(sourceRaw).digest('hex');
function reviewed(overrides = {}) {
  return {
    schema: 'janus.public_i18n.translation.v1',
    classification: 'PUBLIC_ONLY',
    source_version: source.source_version,
    source_sha256: digest,
    language: 'uk',
    status: 'HUMAN_REVIEWED',
    approved: true,
    texts: { intro: 'Це публічний опис нашого проєкту.' },
    ...overrides
  };
}

function fixture({ language = 'uk', review = reviewed() } = {}) {
  const fetched = [];
  const elements = {
    'public-i18n-copy': {
      children: [],
      replaceChildren() { this.children = []; },
      appendChild(item) { this.children.push(item); }
    },
    'public-i18n-status': { textContent: '' },
    'public-i18n-modal': { style: { display: 'none' }, addEventListener() {} },
    'btn-public': { addEventListener() {} },
    'public-i18n-close': { addEventListener() {}, focus() {} }
  };
  const document = {
    baseURI: 'https://hawkar-usls.github.io/iNaiHR/',
    readyState: 'complete',
    activeElement: { focus() {} },
    getElementById: key => elements[key] || null,
    createElement: tag => {
      assert.equal(tag, 'p');
      return { textContent: '' };
    }
  };
  const window = {
    location: { origin: 'https://hawkar-usls.github.io' },
    crypto: webcrypto,
    addEventListener() {},
    JanusLocale: { getLocale: () => language }
  };
  async function fetch(url, options) {
    fetched.push({ url, options });
    assert.equal(options.credentials, 'omit');
    assert.equal(options.mode, 'same-origin');
    assert.ok(url.startsWith('https://hawkar-usls.github.io/iNaiHR/public-i18n/'));
    if (url.endsWith('/source.json')) {
      return { ok: true, text: async () => sourceRaw };
    }
    if (url.endsWith('/reviewed/uk.json') && review) {
      return { ok: true, text: async () => JSON.stringify(review) };
    }
    return { ok: false, text: async () => '' };
  }
  vm.runInNewContext(code, { window, document, URL, TextEncoder, Uint8Array, fetch, Set });
  return { api: window.JanusPublicContent, fetched, elements };
}

test('allowlisted reviewed public copy renders without external translation API', async () => {
  const f = fixture();
  await f.api.refresh();
  assert.equal(f.elements['public-i18n-copy'].children[0].textContent, 'Це публічний опис нашого проєкту.');
  assert.match(f.elements['public-i18n-status'].textContent, /HUMAN-REVIEWED/);
  assert.equal(f.fetched.length, 2);
});

test('unreviewed model output is never published; display safe English original', async () => {
  const f = fixture({ review: reviewed({ status: 'UNREVIEWED', approved: false }) });
  await f.api.refresh();
  assert.equal(f.elements['public-i18n-copy'].children[0].textContent, source.entries[0].text);
  assert.match(f.elements['public-i18n-status'].textContent, /NO VERIFIED/);
});

test('missing reviewed translations fall back to original English', async () => {
  const f = fixture({ review: null });
  await f.api.refresh();
  assert.equal(f.elements['public-i18n-copy'].children[0].textContent, source.entries[0].text);
});

test('old source digest or extra translation keys invalidates approval', () => {
  const f = fixture({ review: null });
  assert.equal(f.api.validReview(reviewed({ source_sha256: '0'.repeat(64) }), source, digest, 'uk'), false);
  assert.equal(f.api.validReview(reviewed({ texts: { intro: 'Valid text here', extra: 'Unexpected data here' } }), source, digest, 'uk'), false);
  assert.equal(f.api.validReview(reviewed(), source, digest, 'uk'), true);
});

test('translations containing HTML markup fail closed', () => {
  const f = fixture({ review: null });
  assert.equal(f.api.validReview(reviewed({ texts: { intro: '<img src=x onerror=alert(1)>' } }), source, digest, 'uk'), false);
});

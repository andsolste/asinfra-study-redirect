const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const root = resolve(__dirname, '..');
const pages = ['index.html', '404.html'].map(file => readFileSync(resolve(root, file), 'utf8'));
const scripts = pages.map(html => html.match(/<script>([\s\S]*?)<\/script>/)?.[1]);

function run(script, input) {
  const source = new URL(input);
  const calls = [];
  const writes = [];
  const listeners = {};
  const deny = () => { throw new Error('Unexpected DOM/storage/network/log access'); };
  const nodes = Object.fromEntries(['test-panel', 'test-target', 'test-redirect'].map(id => [id, {
    set hidden(value) { writes.push([id, 'hidden', value]); },
    set href(value) { writes.push([id, 'href', value]); },
    set textContent(value) { writes.push([id, 'textContent', value]); },
    addEventListener(event, callback) { listeners[id + ':' + event] = callback; },
  }]));
  const context = {
    URL,
    window: { location: {
      hostname: source.hostname, origin: source.origin, pathname: source.pathname,
      search: source.search, hash: source.hash, replace: value => calls.push(value),
    } },
    document: { getElementById: source.hostname === 'study.asinfra.no' || source.hostname === 'flow.asinfra.no'
      ? deny : id => { assert.ok(nodes[id]); return nodes[id]; }, get referrer() { return deny(); }, get cookie() { return deny(); } },
    console: { log: deny, info: deny, error: deny }, fetch: deny,
    get localStorage() { return deny(); }, get sessionStorage() { return deny(); },
  };
  runInNewContext(script, context, { timeout: 1000 });
  return { buildRedirectTarget: context.buildRedirectTarget, calls, writes, listeners };
}

const cases = [
  ['root /', '/', 'https://flow.asinfra.no/'],
  ['query', '/?foo=bar', 'https://flow.asinfra.no/?foo=bar'],
  ['hash', '/#section', 'https://flow.asinfra.no/#section'],
  ['query and hash', '/?foo=bar#section', 'https://flow.asinfra.no/?foo=bar#section'],
  ['deep path', '/foo/bar', 'https://flow.asinfra.no/foo/bar'],
  ['deep path, query and hash', '/foo/bar?foo=bar#section', 'https://flow.asinfra.no/foo/bar?foo=bar#section'],
  ['opaque auth-like components', '/?code=TEST_ONLY#access_token=TEST_ONLY&type=signup',
    'https://flow.asinfra.no/?code=TEST_ONLY#access_token=TEST_ONLY&type=signup'],
  ['encoded/duplicate query values', '/?a=%2f%2F&a=a+b&empty=&flag#%2Fsection',
    'https://flow.asinfra.no/?a=%2f%2F&a=a+b&empty=&flag#%2Fsection'],
];

for (const [label, path, expected] of cases) {
  test(label + ': both entry pages preserve URL components in one replace', () => {
    for (const script of scripts) {
      const result = run(script, 'https://study.asinfra.no' + path);
      assert.equal(result.buildRedirectTarget(new URL('https://study.asinfra.no' + path)), expected);
      assert.deepEqual(result.calls, [expected]);
      assert.deepEqual(result.writes, []);
    }
  });
}

test('fixed target rejects origin selection through next/hash/path/referrer', () => {
  const { buildRedirectTarget } = run(scripts[0], 'https://study.asinfra.no/');
  for (const pathname of ['/', '//evil.example/path', '/\\evil.example/', '/%2f%2fevil.example/', 'https://evil.example/']) {
    const target = new URL(buildRedirectTarget({ pathname, search: '?next=https://evil.example/', hash: '#https://evil.example/',
      get referrer() { throw new Error('Must not read referrer'); } }));
    assert.equal(target.origin, 'https://flow.asinfra.no');
    assert.equal(target.search, '?next=https://evil.example/');
    assert.equal(target.hash, '#https://evil.example/');
    assert.notEqual(target.hostname, 'study.asinfra.no');
  }
});

test('host guard never automatically navigates preview, localhost, lookalike hosts or Flow itself', () => {
  for (const host of ['andsolste.github.io/asinfra-study-redirect', 'localhost:8000', 'study.asinfra.no.evil.example', 'flow.asinfra.no']) {
    for (const script of scripts) {
      const result = run(script, 'https://' + host + '/?code=TEST_ONLY#access_token=TEST_ONLY');
      assert.deepEqual(result.calls, []);
      assert.ok(!JSON.stringify(result.writes).includes('TEST_ONLY'), 'Do not expose actual URL data in diagnostics');
      if (host === 'flow.asinfra.no') assert.deepEqual(Object.keys(result.listeners), []);
    }
  }
});

test('preview button is explicit and uses only the fixed synthetic example, not the current URL', () => {
  const result = run(scripts[0], 'https://andsolste.github.io/asinfra-study-redirect/?code=TEST_ONLY#TEST_ONLY');
  assert.deepEqual(result.calls, []);
  assert.ok(result.writes.some(([id, prop, value]) => id === 'test-panel' && prop === 'hidden' && value === false));
  result.listeners['test-redirect:click']();
  assert.deepEqual(result.calls, ['https://flow.asinfra.no/?foo=bar#section']);
});

test('index and 404 are identical and self-contained, with guarded no-JS fallback markup', () => {
  assert.equal(pages[0], pages[1], 'Update both pages together; do not introduce a separate 404 implementation');
  for (const html of pages) {
    assert.match(html, /rel="canonical" href="https:\/\/flow\.asinfra\.no\/"/);
    assert.match(html, /<noscript><meta http-equiv="refresh" content="0; url=https:\/\/flow\.asinfra\.no\/">\s*<\/noscript>/);
    assert.equal([...html.matchAll(/http-equiv="refresh"/g)].length, 1);
    assert.match(html, /<a href="https:\/\/flow\.asinfra\.no\/" rel="noreferrer">Åpne Flow/);
    assert.match(html, /name="referrer" content="no-referrer"/);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"|@import|\b(?:fetch|localStorage|sessionStorage)\s*\(/);
    assert.ok(scripts[0]);
  }
  for (const file of ['CNAME', 'package.json', 'package-lock.json', '.github/workflows']) {
    assert.equal(existsSync(resolve(root, file)), false, 'Unnecessary setup or premature domain binding: ' + file);
  }
  assert.equal(existsSync(resolve(root, '.nojekyll')), true);
});

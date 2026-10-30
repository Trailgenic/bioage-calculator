'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const M = require('../bioage/methodology.js');
const widgetSource = read('bioage/widget.js');
const indexHtml = read('bioage/index.html');

test('historical model preserves computation and rejects invalid observations', () => {
  const sample = { age: 53, rhr: 59, dist: 10.94, gain: 4140, time: 256, ahr: 122, maxhr: null, hrv: 31, fasted: true };
  assert.deepEqual(M.validate(sample).errors, []);
  const result = M.compute(sample);
  for (const field of ['bio', 'lo', 'hi', 'vo2']) assert.ok(Number.isFinite(result[field]), field);
  assert.ok(result.lo < result.hi);
  assert.ok(M.validate({ ...sample, dist: 0 }).errors.includes('distance'));
  assert.ok(M.validate({ ...sample, ahr: 70, rhr: 70 }).errors.includes('average HR above resting'));
});

test('the historical widget renders the result and revised warning, without claiming age reversal', () => {
  const nodes = new Map();
  const container = { innerHTML: '', querySelector(sel) { return node(sel.slice(1)); } };
  function node(id) {
    if (!nodes.has(id)) {
      const tail = container.innerHTML.split('id="' + id + '"')[1] || '';
      const tag = tail.split('>')[0]; const value = tag.includes('value="') ? tag.split('value="')[1].split('"')[0] : '';
      const classes = new Set(id === 'f-fasted' ? ['on'] : []);
      const listeners = {};
      nodes.set(id, {
        value, innerHTML: '', textContent: '',
        classList: { contains: c => classes.has(c), toggle(c) { if (classes.has(c)) classes.delete(c); else classes.add(c); } },
        setAttribute() {},
        addEventListener(event, callback) { listeners[event] = callback; },
        click() { if (listeners.click) listeners.click.call(this); },
        querySelectorAll() { return []; },
        querySelector() { return null; }
      });
    }
    return nodes.get(id);
  }
  const context = {
    window: { TGBioAge: M },
    document: { readyState: 'complete', getElementById(id) { return id === 'tg-bioage' ? container : null; } },
    requestAnimationFrame(callback) { callback(); },
    console
  };
  vm.runInNewContext(widgetSource, context, { timeout: 3000 });
  assert.ok(container.innerHTML.includes('Historical <b>Age-Like Model</b>'));
  assert.match(container.innerHTML, /ILLUSTRATIVE PREFILLED EXAMPLE/);
  assert.match(node('res').innerHTML, /RETIRED HISTORICAL EXPERIMENT/);
  assert.match(node('res').innerHTML, /not age reversal/);
  assert.doesNotMatch(node('res').innerHTML, /vs chronological/);
  node('f-ahr').value = '80';
  node('f-read').click();
  assert.match(node('f-err').innerHTML, /low-intensity sessions may produce misleading/);
  assert.doesNotMatch(node('f-err').innerHTML, /Bio-age needs/);
});

test('standalone metadata is unvalidated and structurally valid', () => {
  const block = indexHtml.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
  assert.ok(block, 'JSON-LD block');
  const graph = JSON.parse(block);
  assert.match(graph.description, /not establish independent clinical validation/);
  assert.match(indexHtml, /Historical Age-Like Model/);
  assert.doesNotMatch(indexHtml, /Your fitness age from one hike/);
});

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const script = fs.readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { value: '5', checked: false, innerHTML: '', style: {} });
  return elements.get(id);
}
let report = '';
const storage = new Map();
const context = vm.createContext({ assert, document: { querySelector: element },
  localStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) },
  open: () => ({ document: { write: text => { report = text; }, close() {} } }),
  crypto: require('node:crypto').webcrypto,
});
const split = script.indexOf("    $('#add').onclick");
vm.runInContext(script.slice(0, split), context);
vm.runInContext(`
  $('#days').value = '30'; $('#start').value = '0';
  $('#exactTarget').checked = true; $('#balanceSections').checked = true;
  for (const [er, icu] of [[5,5], [6,4], [4,6], [3,2], [0,5], [5,0]]) {
    $('#erCapacity').value = String(er); $('#icuCapacity').value = String(icu);
    const total = er + icu;
    people = Array.from({length: total * 2}, (_, i) => ({
      name: 'Person ' + i, target: 10, pair: -1, no: '',
      only: Array.from({length: 10}, (_, d) => 1 + (i < total ? 0 : 1) + d * 2).join(',')
    }));
    const ps = readPeople();
    assert.equal(validate(ps, 20).length, 0);
    const sol = buildOnce(ps, 20, 0, 1);
    assert.ok(!sol.fail, JSON.stringify(sol.fail));
    sol.sched.forEach(day => { assert.equal(day.er.length, er); assert.equal(day.icu.length, icu); });
    sol.section.forEach(count => {
      assert.equal(count[0] + count[1], 10);
      assert.ok(count[0] >= Math.floor(10 * icu / total) && count[0] <= Math.ceil(10 * icu / total));
    });
    updateCounts(); assert.equal($('#shiftCount').textContent, fa(30 * total));
    solutions = [sol]; exportInputPDF();
  }
  $('#erCapacity').value = '6'; $('#icuCapacity').value = '4';
  $('#balanceSections').checked = false; $('#exactTarget').checked = false;
  people = Array.from({length: 3}, (_, i) => ({name: 'P' + i, target: 1, no: '', only: '', pair: -1}));
  const partial = buildOnce(readPeople(), 1, 0, 1, true);
  assert.equal(partial.shortages, 7);
  assert.ok(partial.sched[0].er.length <= 6 && partial.sched[0].icu.length <= 4);
  capacityChanged(); assert.equal(solutions.length, 0); assert.equal($('#csv').disabled, true);
  for (const [er, icu] of [['', '5'], ['0','0'], ['-1','5'], ['2.5','5'], ['11','5']]) {
    $('#erCapacity').value = er; $('#icuCapacity').value = icu;
    assert.equal(capacities().valid, false);
    assert.equal(validate([], 30).length, 1);
  }
  renderPeople = () => {};
`, context);
vm.runInContext(script.slice(split), context);
assert.equal(element('#erCapacity').value, '6');
assert.equal(element('#icuCapacity').value, '4');
assert.ok(report.includes('ظرفیت روزانه:'));
console.log('PASS: 5/5, 6/4, 4/6, variable totals, zero capacity, proportional balance, partial schedules, validation, persistence and invalidation');

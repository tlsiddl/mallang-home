const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../extension.js'), 'utf8');
const clickCode = source.slice(source.indexOf('  function apClick(t) {'), source.indexOf('  function widClick(t) {'));
const footCode = source.slice(source.indexOf('  function widFoot() {'), source.indexOf('  const STICKERS ='));
const cards = Array.from({length: 4}, (_, i) => ({id: `old-${i}`, kind: 'credit', bal: i * 10}));
let saves = 0, next = 0;
const ctx = {cards, wid: () => cards, widById: id => cards.find(w => w.id === id), newWid: () => `new-${++next}`,
  savePrefs: () => saves++, render() {}, startOpen: true, widEdit: '', WID_MAX_PHOTO: 5,
  arranging: false, prefs: {}, playAt: () => 'top', padd: null, esc: x => x, tclock: () => '12:00'};
vm.createContext(ctx);
vm.runInContext(clickCode + '\n' + footCode + '\nglobalThis.click = apClick; globalThis.footer = widFoot;', ctx);
assert.match(ctx.footer(), /data-wa="addcredit"/);
const target = {closest: selector => selector === '[data-wa]' ? {dataset: {wa: 'addcredit'}} : null};
assert.equal(ctx.click(target), true);
assert.equal(ctx.click(target), true);
assert.equal(cards.length, 6);
assert.equal(new Set(cards.map(w => w.id)).size, 6);
assert.deepEqual(cards.slice(0, 4).map(w => w.bal), [0, 10, 20, 30]);
assert.equal(ctx.widEdit, 'new-2');
assert.equal(saves, 2);
ctx.startOpen = true;
assert.match(ctx.footer(), /data-wa="addcredit"/);
console.log('Multiple credit widgets preserve existing cards and remain addable: passed');

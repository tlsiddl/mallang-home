const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync(require('path').join(__dirname, '../extension.js'), 'utf8');
const code = source.slice(source.indexOf('  function recentForCredit('), source.indexOf('  const kTok ='));
const now = Date.parse('2026-11-15T12:00:00Z'), h = 3600000;
const ctx = { Date, Set, SEP: '␟', apModelName: m => m, data: {conns: [{id:'a',name:'72 아르곤'},{id:'b',name:'72 3.7'},{id:'c',name:'720 아르곤'},{id:'d',name:'기존'}]},
  ap: {recent: [ {t: now-h,id:'a',m:'known',p:10,o:5,n:1}, {t: now-2*h,id:'b',m:'unknown',p:7,o:2,n:1}, {t:now-h,id:'c',m:'known',p:50,o:50,n:1}, {t:now-25*h,id:'a',m:'known',p:50,o:50,n:1}, {t:now-h,id:'d',m:'known',p:50,o:50,n:1} ]},
  apCost: (m,p,o) => m.endsWith('␟known') ? p + o : null };
vm.createContext(ctx); vm.runInContext(code + '\nglobalThis.run = recentForCredit;', ctx);
const w = {hybridPrefix:'72',hybridStart:now-3*h,at:new Date(now-48*h).toISOString()};
const result = ctx.run(w,now); assert.equal(result.matchingConnections,2); assert.equal(result.p,17); assert.equal(result.o,7); assert.equal(result.cost,15); assert.equal(result.unpriced,1);
w.hybridStart=now-90*60000; const later=ctx.run(w,now); assert.equal(later.requests,1); assert.equal(later.p,10);
console.log('Recent usage respects account prefix, cutoff, activation and missing prices: passed');


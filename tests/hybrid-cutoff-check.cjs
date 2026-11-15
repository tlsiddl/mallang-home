const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../extension.js'), 'utf8');
const code = src.slice(src.indexOf('  async function gcMonLoad(w) {'), src.indexOf('  const monSum ='));
const now = Date.parse('2026-11-15T12:00:00Z'), calls = [];
class Clock extends Date { static now() { return now; } }
const ctx = {Date:Clock, Number, hasG: () => true, gTokens: async (w,start,end) => { calls.push({start,end}); return {}; }, addTok: (a,b) => ({...a,...b})};
vm.createContext(ctx); vm.runInContext(code + '\nglobalThis.load=gcMonLoad;',ctx);
(async()=>{ const w={at:new Date(now-2*86400000).toISOString(),hybridStart:now-3600000}; await ctx.load(w); assert.equal(calls.length,1); assert.equal(calls[0].end,now-86400000); assert.equal(w.mon.cutoff,calls[0].end); assert.equal(w.mon.hybrid,true); calls.length=0; const recent={at:new Date(now-3600000).toISOString(),hybridStart:now-1800000}; await ctx.load(recent); assert.equal(calls.length,0); assert.equal(recent.mon.cutoff,now-86400000); console.log('Google and recent chat intervals meet at the same cutoff: passed'); })().catch(e=>{console.error(e);process.exitCode=1});

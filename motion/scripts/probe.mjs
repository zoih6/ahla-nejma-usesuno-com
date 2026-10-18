/* Overlap + emptiness sweep: for every scene, is the type sitting on top of
   the cut-out, and does the frame actually contain anything? */
import { chromium } from 'playwright';
import url from 'url';
const FILE = url.pathToFileURL('/home/user/ilaf/templates/frame.build.html').href;
const b = await chromium.launch({args:['--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1']});
const p = await b.newPage({viewport:{width:1080,height:1920}, deviceScaleFactor:1});
await p.goto(FILE,{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>window.__boot());
const ov=(a,c)=>{const x=Math.max(0,Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x));
                 const y=Math.max(0,Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y)); return x*y;};
console.log('scene        t     textbox(y..y+h)   girlbox          overlap%  words');
const tl = await p.evaluate(()=>DATA.timeline);
for (const s of tl.scenes) {
  for (const frac of [0.25,0.55,0.85]) {
    const t = s.start + (s.end-s.start)*frac;
    await p.evaluate(tt=>window.__render(tt), t);
    const r = await p.evaluate(()=>{
      const bx=e=>{const b=e.getBoundingClientRect();
        return {x:b.x,y:b.y,w:b.width,h:b.height};};
      const vis=[];
      document.querySelectorAll('#stack .w[data-w]').forEach(e=>{
        if(parseFloat(getComputedStyle(e).opacity)>0.05) vis.push(bx(e));});
      let tx=null;
      vis.forEach(v=>{ if(!tx) tx={...v}; else {
        const x0=Math.min(tx.x,v.x), y0=Math.min(tx.y,v.y);
        tx={x:x0,y:y0,w:Math.max(tx.x+tx.w,v.x+v.w)-x0,h:Math.max(tx.y+tx.h,v.y+v.h)-y0};}});
      const h=bx(document.getElementById('girlHead')), bo=bx(document.getElementById('girlBody'));
      const hop=parseFloat(getComputedStyle(document.getElementById('girlHead')).opacity);
      let g=null;
      if(hop>0.05){ const x0=Math.min(h.x,bo.x), y0=Math.min(h.y,bo.y);
        g={x:x0,y:y0,w:Math.max(h.x+h.w,bo.x+bo.w)-x0,h:Math.max(h.y+h.h,bo.y+bo.h)-y0};}
      return {tx,g,n:vis.length};
    });
    let pc = (r.tx&&r.g) ? 100*ov(r.tx,r.g)/Math.max(1,r.tx.w*r.tx.h) : 0;
    const flag = pc>12 ? '  <-- TEXT ON FIGURE' : (r.n===0&&!r.g?'  <-- EMPTY':'');
    console.log(`${s.id.padEnd(10)} ${t.toFixed(1).padStart(6)}  ` +
      (r.tx?`${Math.round(r.tx.y)}..${Math.round(r.tx.y+r.tx.h)}`.padEnd(16):'--'.padEnd(16))+'  '+
      (r.g?`${Math.round(r.g.y)}..${Math.round(r.g.y+r.g.h)}`.padEnd(15):'--'.padEnd(15))+
      `  ${pc.toFixed(1).padStart(5)}%  ${String(r.n).padStart(3)}${flag}`);
  }
}
await b.close();

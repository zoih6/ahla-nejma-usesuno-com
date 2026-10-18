import { chromium } from 'playwright'; import url from 'url';
const b = await chromium.launch({args:['--disable-gpu','--hide-scrollbars']});
const p = await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
await p.goto(url.pathToFileURL('/home/user/ilaf/templates/frame.build.html').href,{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready); await p.evaluate(()=>window.__boot());
for (let t=13.0; t<=17.2; t+=0.8) {
  await p.evaluate(tt=>window.__render(tt), t);
  const r = await p.evaluate(()=>({
    world: document.getElementById('world').style.transform,
    body:  document.getElementById('girlBody').style.transform,
    head:  document.getElementById('girlHead').style.transform,
  }));
  console.log('t=' + t.toFixed(1));
  console.log('   world: ' + r.world);
  console.log('   body : ' + r.body);
  console.log('   head : ' + r.head);
}
await b.close();

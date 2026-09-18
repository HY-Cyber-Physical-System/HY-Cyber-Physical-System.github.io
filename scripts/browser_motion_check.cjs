const assert=require('node:assert/strict');
const {chromium,webkit,devices}=require(process.env.CPSLAB_PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.CPSLAB_TEST_URL||'http://localhost:8000/';
(async()=>{
 for(const engine of ['chromium','webkit']){
  const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const software of [false,true]){
   const context=await browser.newContext({...devices['iPhone 13'],reducedMotion:'reduce'});
   await context.addInitScript(({software})=>{
    localStorage.setItem('cpslab-motion','off');
    if(software){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return get.call(this,type,...args)};}
   },{software});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));
   await page.waitForTimeout(1300);
   const state=await page.evaluate(()=>({off:document.documentElement.classList.contains('motion-off'),renderer:document.querySelector('.logo-stage').dataset.renderer,position:getComputedStyle(document.querySelector('.logo-stage')).position,button:document.querySelector('.motion-toggle').textContent}));
   assert.equal(state.off,false);assert.equal(state.position,'sticky');assert.equal(state.renderer,software?'canvas2d':'webgl');assert.equal(state.button,'Pause motion');
   const canvas=page.locator('.logo-stage canvas');
   const before=await canvas.screenshot();await page.waitForTimeout(450);const after=await canvas.screenshot();
   assert.ok(!before.equals(after),'Canvas must move without a click or pointer input');
   await page.evaluate(()=>window.scrollTo(0,420));await page.waitForTimeout(650);
   const progress=await page.evaluate(()=>Number(document.querySelector('.logo-stage').style.getPropertyValue('--scatter')));
   assert.ok(progress>.3&&progress<1,'Touch-page scroll must disperse logo');
   await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(650);
   await page.getByRole('button',{name:'Pause motion'}).click();
   assert.ok(await page.evaluate(()=>document.documentElement.classList.contains('motion-off')));
   await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('motion-off')),false,'Reload must restart after pause');
   if(!software){
    await page.evaluate(()=>document.querySelector('.logo-stage canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(()=>document.querySelector('.logo-stage').dataset.renderer==='canvas2d');
    const a=await page.locator('.logo-stage canvas').screenshot();await page.waitForTimeout(300);const b=await page.locator('.logo-stage canvas').screenshot();assert.ok(!a.equals(b),'Context-loss fallback must animate');
   }
   assert.deepEqual(errors,[]);
   console.log('PASS',engine,software?'Canvas fallback':'WebGL + context-loss fallback','mobile autoplay, reduced-motion + saved-off override, live pixels, scroll, pause/reload');
   await context.close();
  }
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});

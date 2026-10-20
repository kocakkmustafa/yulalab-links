/* Real inline hub functions in an isolated VM. No browser/provider/network. */
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const locales = ['tr','en','es-419','pt-BR','de','fr','ja','ar'];
const keys = ['holding','bl','bf','lo','gravita','lissom','jablab','ostinato','choreia'];

function boot({locale='tr', stored=null, blockedStorage=false, network='pending', enabled=false, search='', hash='#lifeos'} = {}){
  const listeners = {}, windowListeners = {}, requests = [], beacons = [], writes = [], historyEntries = [];
  let location = new URL('https://links.yulalab.com/' + (search || '?lang='+locale) + hash);
  const metas = new Map(), alternatives = Array.from({length:7},()=>({content:''}));
  const pages = new Map();
  let doc;
  const app = {
    id:'app', text:'', focus(){doc.activeElement=this;}, querySelector(){return {textContent:''};},
    set innerHTML(value){
      this.text=value;pages.clear();
      for(const match of value.matchAll(/<section id="pg-([^"]+)"[\s\S]*?(?=<section id="pg-|$)/g)){
        const page={id:'pg-'+match[1],html:match[0],active:false,
          classList:{add(){page.active=true;},remove(){page.active=false;}},
          contains(node){return node && node.page===page;},
          querySelectorAll(){return [page.select];}};
        page.select={page,value:locale,hasAttribute(name){return name==='data-language';},getAttribute(){return null;},focus(){doc.activeElement=this;}};
        pages.set(page.id,page);
      }
    },
    get innerHTML(){return this.text;}
  };
  doc={documentElement:{lang:'tr',dir:'ltr'},title:'YULA Lab — Links',activeElement:null,
    getElementById(id){return id==='app'?app:pages.get(id)||null;},
    querySelector(selector){
      if(selector==='.page.active') return [...pages.values()].find(p=>p.active)||null;
      if(!metas.has(selector))metas.set(selector,{content:''});
      return metas.get(selector);
    },
    querySelectorAll(selector){return selector==='.page'?[...pages.values()]:selector==='meta[property="og:locale:alternate"]'?alternatives:[];},
    addEventListener(name,fn){(listeners[name]||=[]).push(fn);}
  };
  const saved = new Map(stored?[['yula.links.locale',stored]]:[]), session = new Map();
  const storage={getItem(k){if(blockedStorage)throw Error('storage unavailable');return saved.get(k)||null;},setItem(k,v){if(blockedStorage)throw Error('storage unavailable');saved.set(k,v);writes.push([k,v]);}};
  const history={pushState(state,title,url){historyEntries.push(location.href);location=new URL(url,location);},replaceState(state,title,url){location=new URL(url,location);}};
  const window={get location(){return location;},scrollX:0,scrollY:0,scrollTo(){},matchMedia(){return {matches:false};},addEventListener(name,fn){(windowListeners[name]||=[]).push(fn);}};
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-20T09:00:00Z']));}static now(){return Date.parse('2026-10-20T09:00:00Z');}}
  let resolveFetch, rejectFetch;
  const fetchResult = new Promise((resolve,reject)=>{resolveFetch=resolve;rejectFetch=reject;});
  const context={window,document:doc,history,localStorage:storage,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},URL,URLSearchParams,Intl,Date:FixedDate,Set,Map,TextEncoder,Uint8Array,Blob,
    crypto:{getRandomValues(b){b.fill(17);return b;}},
    navigator:{sendBeacon(url,body){beacons.push({url,body});return true;}},
    AbortSignal:{timeout(){return {testOnly:true};}},
    fetch(url,options){requests.push({url,options});return fetchResult;},console};
  let code=inline;
  if(enabled)code=code.replace('var ENABLED = false;', 'var ENABLED = true;');
  code=code.replace(/\}\)\(\);\s*$/,`globalThis.hub={get locale(){return locale;},L10N,SUPPORTED_LOCALES,canonicalLocale,localeFromLocation,changeLocale,siteUrl,languageHTML,holdingHTML,brandHTML,normaliseRegistry,normaliseProduct,applyRegistry,FALLBACK_REGISTRY,routeFromHash,refreshPages,registryStatusHTML,get state(){return registrySyncState;},get models(){return PRODUCT_MODELS;}};})();`);
  vm.createContext(context);vm.runInContext(code,context,{timeout:1500});
  const hub=context.hub;
  function response(data,type='application/json',ok=true){resolveFetch({ok,status:ok?200:503,headers:{get(){return type;}},text(){return Promise.resolve(typeof data==='string'?data:JSON.stringify(data));}});}
  if(network==='reject')rejectFetch(Error('synthetic offline'));
  return {hub,doc,app,pages,metas,alternatives,requests,beacons,writes,historyEntries,saved,session,listeners,windowListeners,response,
    get location(){return location;},setLocation(url){location=new URL(url,location);},reject:rejectFetch};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const locale of locales){
  test(locale+': actual nine route renderers, localized copy, direction and metadata',()=>{
    const b=boot({locale});const h=b.hub,c=h.L10N[locale];
    assert.equal(h.locale,locale);assert.equal(b.doc.documentElement.lang,locale);assert.equal(b.doc.documentElement.dir,locale==='ar'?'rtl':'ltr');
    assert.equal(Object.keys(c.ui).length,42);assert.equal(Object.keys(c.products).length,8);
    assert.ok(Object.values(c.ui).every(value=>typeof value==='string'&&value.trim()&&!/TODO|FIXME/.test(value)));
    assert.equal(b.pages.size,9);
    assert.ok(b.pages.get('pg-holding').html.includes(c.ui.title));
    for(const key of keys){
      const rendered=key==='holding'?h.holdingHTML():h.brandHTML(key);
      assert.ok(rendered.includes(c.ui.registryLoading));assert.ok(rendered.includes(c.ui.privacy));assert.ok(rendered.includes(c.ui.support));
      assert.ok(!/undefined|\[object Object\]/.test(rendered));
      assert.equal((rendered.match(/<option /g)||[]).length,8);
      assert.ok(rendered.includes('value="'+locale+'" lang="'+locale+'" dir="'+c.dir+'" selected'));
    }
    for(const model of h.models){assert.equal(model.sub,c.products[model.slug][0]);assert.ok(model.type.startsWith(c.products[model.slug][1]));}
    assert.equal(b.metas.get('meta[name="description"]').content,c.ui.description);
    assert.equal(b.metas.get('meta[property="og:locale"]').content,c.og);
    assert.equal(new Set(b.alternatives.map(m=>m.content)).size,7);assert.ok(!b.alternatives.some(m=>m.content===c.og));
    assert.equal(h.siteUrl('/privacy'),'https://yulalab.com'+(locale==='tr'?'':'/'+locale)+'/privacy');
    assert.ok(b.app.innerHTML.includes('dir="ltr"'));assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
  });

  test(locale+': rejected registry keeps the localized saved directory and stale status',async()=>{
    const b=boot({locale,network:'reject'});await flush();
    assert.equal(b.hub.state,'fallback');assert.equal(b.pages.size,9);
    assert.ok(b.hub.registryStatusHTML().includes(b.hub.L10N[locale].ui.registryUnavailable));
    const life=b.hub.models.find(m=>m.slug==='lifeos');
    assert.equal(life.storeStates.ios,'stale');assert.equal(life.stores.ios,null);
    assert.ok(life.type.includes(b.hub.L10N[locale].ui.verificationNeeded));
    assert.equal(b.requests.length,1);assert.equal(b.requests[0].options.credentials,'omit');
  });

  test(locale+': successful synthetic registry uses dated current links and local copy',async()=>{
    const b=boot({locale});const fixture=JSON.parse(JSON.stringify(b.hub.FALLBACK_REGISTRY));
    for(const p of fixture.products){p.updatedAt='2026-10-20';for(const item of [...p.surfaces,...p.claims]){item.verifiedAt='2026-10-20';item.expiresAt='2026-10-21';}}
    b.response(fixture);await flush();
    assert.equal(b.hub.state,'network');assert.ok(b.app.innerHTML.includes(b.hub.L10N[locale].ui.registryReady));
    assert.equal(b.hub.models.find(m=>m.slug==='lifeos').stores.ios,'https://apps.apple.com/app/id6771527233');
    assert.ok(b.hub.models.find(m=>m.slug==='braavolabs').stats.includes(b.hub.L10N[locale].ui.providers+': 14'));
  });

  test(locale+': attribution branch uses the current locale only under a synthetic enabled flag',async()=>{
    const b=boot({locale,enabled:true});assert.equal(b.beacons.length,1);
    assert.equal(JSON.parse(await b.beacons[0].body.text()).locale,locale);
    assert.equal(JSON.parse(await b.beacons[0].body.text()).product,'lifeos');
    assert.ok(/var ENABLED = false;/.test(inline));
  });
}

test('selection preserves hash/query, focus, stored preference and history route',()=>{
  const b=boot({search:'?utm_source=fixture&lang=tr',hash:'#lifeos'});
  for(const locale of locales.slice(1)){
    const page=b.pages.get('pg-lo');b.doc.activeElement=page.select;
    b.hub.changeLocale(locale);
    assert.equal(b.location.searchParams.get('lang'),locale);assert.equal(b.location.searchParams.get('utm_source'),'fixture');assert.equal(b.location.hash,'#lifeos');
    assert.equal(b.saved.get('yula.links.locale'),locale);assert.equal(b.doc.activeElement.page.id,'pg-lo');assert.equal(b.doc.documentElement.dir,locale==='ar'?'rtl':'ltr');
  }
  b.setLocation(b.historyEntries[0]);b.windowListeners.popstate.forEach(fn=>fn());assert.equal(b.hub.locale,'tr');assert.ok(b.pages.get('pg-lo').active);
  assert.equal(b.beacons.length,0);assert.ok(b.writes.every(([key])=>key==='yula.links.locale'));
});

test('URL choice wins, aliases normalize, unknown input and blocked storage remain bounded',()=>{
  assert.equal(boot({locale:'de',stored:'ar'}).hub.locale,'de');
  assert.equal(boot({search:'?lang=PT-br'}).hub.locale,'pt-BR');
  const preference=boot({search:'?utm_source=fixture',stored:'ja'});assert.equal(preference.hub.locale,'ja');assert.equal(preference.location.searchParams.get('lang'),'ja');
  assert.equal(boot({search:'?lang=xx',stored:'ar'}).hub.locale,'tr');
  const blocked=boot({blockedStorage:true});blocked.hub.changeLocale('ar');assert.equal(blocked.hub.locale,'ar');assert.equal(blocked.location.searchParams.get('lang'),'ar');
  blocked.hub.changeLocale('unsupported');assert.equal(blocked.hub.locale,'ar');
});

test('delegated native selection and in-hub navigation keep the locale contract wired',()=>{
  const b=boot({search:'?lang=de&utm_source=fixture'});
  b.listeners.change[0]({target:{value:'ar',matches:selector=>selector==='[data-language]'}});
  assert.equal(b.hub.locale,'ar');assert.equal(b.doc.documentElement.dir,'rtl');
  let prevented=false;
  b.listeners.click[0]({target:{closest:selector=>selector==='[data-nav]'?{getAttribute:()=> 'braavolabs'}:null},preventDefault(){prevented=true;}});
  assert.ok(prevented);assert.equal(b.location.hash,'#braavolabs');assert.equal(b.location.searchParams.get('lang'),'ar');assert.ok(b.pages.get('pg-bl').active);
  b.listeners.change[0]({target:{value:'en',matches:()=>false}});assert.equal(b.hub.locale,'ar');
  assert.equal(b.beacons.length,0);
});

test('non-JSON response fails into localized fallback without replacing the directory',async()=>{
  const b=boot({locale:'fr'});b.response('<html>offline</html>','text/html');await flush();
  assert.equal(b.hub.state,'fallback');assert.equal(b.pages.size,9);assert.ok(b.app.innerHTML.includes(b.hub.L10N.fr.ui.registryUnavailable));
});

test('synthetic attribution follows a later language change rather than the initial locale',async()=>{
  const b=boot({enabled:true});b.hub.changeLocale('ar');
  b.setLocation('#holding');b.windowListeners.hashchange.forEach(fn=>fn());
  b.setLocation('#lifeos');b.windowListeners.hashchange.forEach(fn=>fn());
  assert.equal(b.beacons.length,2);
  assert.equal(JSON.parse(await b.beacons[0].body.text()).locale,'tr');
  assert.equal(JSON.parse(await b.beacons[1].body.text()).locale,'ar');
});

test('same script digest is pinned in HTML, Netlify and Vercel; attribution remains off',()=>{
  const digest=crypto.createHash('sha256').update(inline).digest('base64');
  for(const name of ['index.html','_headers','vercel.json'])assert.ok(fs.readFileSync(path.join(repo,name),'utf8').includes("script-src 'sha256-"+digest+"'"),name);
  const vercel=JSON.parse(fs.readFileSync(path.join(repo,'vercel.json'),'utf8'));
  assert.equal(vercel.redirects.length,19);assert.equal((html.match(/<script>/g)||[]).length,1);
  assert.ok(!html.includes('locale:\'tr\', page:'));assert.ok(/var ENABLED = false;/.test(inline));
});

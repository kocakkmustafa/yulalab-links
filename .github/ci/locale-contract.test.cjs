/* Real inline hub functions in an isolated VM. No browser/provider/network. */
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const inline = scripts.find(script=>script.includes('const L10N = '));
const appearanceBoot = scripts.find(script=>script!==inline);
const locales = ['tr','en','es-419','pt-BR','de','fr','ja','ar','it','ko','id','pl','hi','zh-Hans'];
const keys = ['holding','bl','bf','lo','gravita','lissom','jablab','ostinato','choreia'];

function boot({locale='tr', stored=null, storedAppearance=null, blockedStorage=false, blockedStorageRead=false,
  blockedStorageWrite=false, network='pending', enabled=false, search, hash='#lifeos', browserLanguages,
  browserLanguage='tr', osDark=false, blockedHistory=false} = {}){
  const listeners = {}, windowListeners = {}, mediaListeners = [], requests = [], beacons = [], writes = [], historyEntries = [], historyWrites = [], scrolls = [];
  let location = new URL('https://links.yulalab.com/' + (search === undefined ? '?lang='+locale : search) + hash);
  let dark = osDark;
  const metas = new Map(), alternatives = Array.from({length:13},()=>({content:''}));
  const pages = new Map();
  let doc;
  function attributes(text){
    return Object.fromEntries([...text.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(match=>[match[1],match[2]??'']));
  }
  function node(tag, attrs, page){
    return {tagName:tag.toUpperCase(),page,attrs,value:'',textContent:'',
      hasAttribute(name){return Object.hasOwn(attrs,name);},getAttribute(name){return this.hasAttribute(name)?attrs[name]:null;},
      matches(selector){return /^\[[\w-]+\]$/.test(selector)&&this.hasAttribute(selector.slice(1,-1));},
      focus(){doc.activeElement=this;}};
  }
  const app = {
    id:'app', text:'', focus(){doc.activeElement=this;}, querySelector(){return {textContent:''};},
    set innerHTML(value){
      this.text=value;pages.clear();
      for(const match of value.matchAll(/<section id="pg-([^"]+)"[\s\S]*?(?=<section id="pg-|$)/g)){
        const page={id:'pg-'+match[1],html:match[0],active:false,
          classList:{add(){page.active=true;},remove(){page.active=false;}},
          contains(node){return node && node.page===page;},
          querySelectorAll(){return page.controls;},controls:[],statuses:[]};
        for(const select of match[0].matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){
          const control=node('select',attributes(select[1]),page);
          const options=[...select[2].matchAll(/<option\b([^>]*)>/g)].map(option=>attributes(option[1]));
          control.value=(options.find(option=>Object.hasOwn(option,'selected'))||options[0]||{}).value||'';
          page.controls.push(control);
          if(control.hasAttribute('data-language'))page.select=control;
          if(control.hasAttribute('data-appearance'))page.appearance=control;
        }
        for(const link of match[0].matchAll(/<a\b([^>]*)>/g))page.controls.push(node('a',attributes(link[1]),page));
        for(const status of match[0].matchAll(/<span\b([^>]*data-appearance-status[^>]*)>([\s\S]*?)<\/span>/g)){
          const control=node('span',attributes(status[1]),page);control.textContent=status[2];page.statuses.push(control);
        }
        pages.set(page.id,page);
      }
    },
    get innerHTML(){return this.text;}
  };
  const rootClasses=new Set();
  doc={documentElement:{lang:'tr',dir:'ltr',dataset:{},style:{},classList:{toggle(name,on){if(on)rootClasses.add(name);else rootClasses.delete(name);},contains:name=>rootClasses.has(name)}},title:'YULA Lab — Links',activeElement:null,
    getElementById(id){return id==='app'?app:pages.get(id)||null;},
    querySelector(selector){
      if(selector==='.page.active') return [...pages.values()].find(p=>p.active)||null;
      if(!metas.has(selector))metas.set(selector,{content:''});
      return metas.get(selector);
    },
    querySelectorAll(selector){
      if(selector==='.page')return [...pages.values()];
      if(selector==='meta[property="og:locale:alternate"]')return alternatives;
      if(selector==='[data-appearance]')return [...pages.values()].flatMap(page=>page.controls.filter(control=>control.hasAttribute('data-appearance')));
      if(selector==='[data-appearance-status]')return [...pages.values()].flatMap(page=>page.statuses);
      return [];
    },
    addEventListener(name,fn){(listeners[name]||=[]).push(fn);}
  };
  const saved = new Map(stored?[['yula.links.locale',stored]]:[]), session = new Map();
  if(storedAppearance!==null)saved.set('yula.appearance.v1',storedAppearance);
  const storage={getItem(k){if(blockedStorage||blockedStorageRead)throw Error('storage unavailable');return saved.get(k)||null;},setItem(k,v){if(blockedStorage||blockedStorageWrite)throw Error('storage unavailable');saved.set(k,v);writes.push([k,v]);}};
  const history={pushState(state,title,url){if(blockedHistory)throw Error('history unavailable');historyEntries.push(location.href);historyWrites.push(['push',String(url)]);location=new URL(url,location);},replaceState(state,title,url){if(blockedHistory)throw Error('history unavailable');historyWrites.push(['replace',String(url)]);location=new URL(url,location);}};
  const media={get matches(){return dark;},addEventListener(name,fn){if(name==='change')mediaListeners.push(fn);}};
  const window={get location(){return location;},scrollX:0,scrollY:0,scrollTo(value){scrolls.push(value);},matchMedia(query){return query==='(prefers-color-scheme: dark)'?media:{matches:false};},addEventListener(name,fn){(windowListeners[name]||=[]).push(fn);}};
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-20T09:00:00Z']));}static now(){return Date.parse('2026-10-20T09:00:00Z');}}
  let resolveFetch, rejectFetch;
  const fetchResult = new Promise((resolve,reject)=>{resolveFetch=resolve;rejectFetch=reject;});
  const context={window,document:doc,history,localStorage:storage,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},URL,URLSearchParams,Intl,Date:FixedDate,Set,Map,TextEncoder,Uint8Array,Blob,
    crypto:{getRandomValues(b){b.fill(17);return b;}},
    matchMedia:window.matchMedia,navigator:{languages:browserLanguages,language:browserLanguage,sendBeacon(url,body){beacons.push({url,body});return true;}},
    AbortSignal:{timeout(){return {testOnly:true};}},
    fetch(url,options){requests.push({url,options});return fetchResult;},console};
  let code=inline;
  if(enabled)code=code.replace('var ENABLED = false;', 'var ENABLED = true;');
  code=code.replace(/\}\)\(\);\s*$/,`globalThis.hub={get locale(){return locale;},L10N,SUPPORTED_LOCALES,canonicalLocale,localeFromLocation,localeFromBrowser,applyAppearance,appearanceHTML,changeLocale,siteUrl,languageHTML,holdingHTML,brandHTML,normaliseRegistry,normaliseProduct,applyRegistry,FALLBACK_REGISTRY,routeFromHash,refreshPages,registryStatusHTML,get state(){return registrySyncState;},get models(){return PRODUCT_MODELS;}};})();`);
  vm.createContext(context);vm.runInContext(appearanceBoot,context,{timeout:1500});vm.runInContext(code,context,{timeout:1500});
  const hub=context.hub;
  function response(data,type='application/json',ok=true){resolveFetch({ok,status:ok?200:503,headers:{get(){return type;}},text(){return Promise.resolve(typeof data==='string'?data:JSON.stringify(data));}});}
  if(network==='reject')rejectFetch(Error('synthetic offline'));
  return {hub,doc,app,pages,metas,alternatives,requests,beacons,writes,historyEntries,historyWrites,scrolls,saved,session,listeners,windowListeners,response,storage,
    dispatchChange(target){for(const fn of listeners.change||[])fn({target});},
    dispatchWindow(name,event={}){for(const fn of windowListeners[name]||[])fn(event);},
    setOSDark(value){dark=value;for(const fn of mediaListeners)fn({matches:value});},
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
      assert.equal((rendered.match(/<option /g)||[]).length,17);
      assert.ok(rendered.includes('value="'+locale+'" lang="'+locale+'" dir="'+c.dir+'" selected'));
    }
    for(const model of h.models){assert.equal(model.sub,c.products[model.slug][0]);assert.ok(model.type.startsWith(c.products[model.slug][1]));}
    assert.equal(b.metas.get('meta[name="description"]').content,c.ui.description);
    assert.equal(b.metas.get('meta[property="og:locale"]').content,c.og);
    assert.equal(new Set(b.alternatives.map(m=>m.content)).size,13);assert.ok(!b.alternatives.some(m=>m.content===c.og));
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

  test(locale+': native appearance selection updates all controls without navigation, refetch or attribution',()=>{
    const b=boot({locale,storedAppearance:'system',osDark:true,search:'?lang='+locale+'&utm_source=fixture'});
    const page=b.pages.get('pg-lo'), select=page.appearance;
    assert.ok(select.getAttribute('aria-label').trim());
    assert.ok([...b.pages.values()].every(item=>item.statuses.length===1));
    const url=b.location.href, historyCount=b.historyWrites.length;
    b.doc.activeElement=select;select.value='light';b.dispatchChange(select);
    assert.equal(b.doc.documentElement.dataset.themePreference,'light');
    assert.equal(b.doc.documentElement.dataset.theme,'light');
    assert.equal(b.doc.documentElement.style.colorScheme,'light');
    assert.equal(b.doc.documentElement.classList.contains('dark'),false);
    assert.equal(b.metas.get('meta[name="theme-color"]').content,'#f5f3ee');
    assert.equal(b.saved.get('yula.appearance.v1'),'light');
    assert.equal(b.doc.activeElement,select);assert.ok(page.active);
    assert.equal(b.location.href,url);assert.equal(b.historyWrites.length,historyCount);
    assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
    assert.ok([...b.pages.values()].every(item=>item.appearance.value==='light'));
    assert.ok([...b.pages.values()].every(item=>item.statuses.every(status=>status.textContent==='')));
    assert.deepEqual(b.writes,[['yula.appearance.v1','light']]);
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

test('URL, saved preference and ordered browser preferences have distinct precedence',()=>{
  assert.equal(boot({search:'?lang=pl',stored:'ar',browserLanguages:['ja-JP']}).hub.locale,'pl');
  assert.equal(boot({search:'',stored:'ko',browserLanguages:['ja-JP']}).hub.locale,'ko');
  assert.equal(boot({search:'',stored:'unknown',browserLanguages:['xx-YY','fr-CA','de-DE']}).hub.locale,'fr');
  assert.equal(boot({search:'',blockedStorage:true,browserLanguages:['pt-PT']}).hub.locale,'pt-BR');
  assert.equal(boot({search:'?lang=unknown',stored:'ko',browserLanguages:['ja-JP']}).hub.locale,'tr');
  assert.equal(boot({search:'?lang=',stored:'ko',browserLanguages:['ja-JP']}).hub.locale,'tr');
  const b=boot({search:'?utm_source=fixture',browserLanguages:['es-MX']});
  assert.equal(b.hub.locale,'es-419');assert.equal(b.location.searchParams.get('lang'),'es-419');
  assert.equal(b.location.searchParams.get('utm_source'),'fixture');assert.equal(b.writes.length,0);
});

for(const [input,expected] of [['it-IT','it'],['ko-KR','ko'],['id-ID','id'],['pl-PL','pl'],['hi-IN','hi'],['en-GB','en'],['de-AT','de'],['ar-EG','ar']]){
  test('ordered browser regional preference '+input+' selects '+expected,()=>{
    const b=boot({search:'',browserLanguages:['unsupported',input,'tr']});
    assert.equal(b.hub.locale,expected);assert.equal(b.location.searchParams.get('lang'),expected);
    assert.equal(b.doc.documentElement.dir,expected==='ar'?'rtl':'ltr');
  });
}

for(const alias of ['zh-Hans','zh-CN','zh-SG','zh-Hans-CN','zh-Hans-SG','ZH-hans-cn']){
  test('explicit Simplified Chinese '+alias+' normalizes in URL, storage and browser preferences',()=>{
    assert.equal(boot({search:'?lang='+alias}).hub.locale,'zh-Hans');
    assert.equal(boot({search:'',stored:alias,browserLanguages:['fr-FR']}).hub.locale,'zh-Hans');
    const b=boot({search:'',browserLanguages:[alias,'ko-KR']});
    assert.equal(b.hub.locale,'zh-Hans');assert.equal(b.location.searchParams.get('lang'),'zh-Hans');
  });
}

for(const unsupported of ['zh','zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-TW','zh-Hant-CN']){
  test('Traditional or unspecified Chinese '+unsupported+' does not imply Simplified Chinese',()=>{
    assert.equal(boot({search:'',browserLanguages:[unsupported,'pl-PL']}).hub.locale,'pl');
    assert.equal(boot({search:'',browserLanguages:[unsupported]}).hub.locale,'tr');
    assert.equal(boot({search:'',stored:unsupported,browserLanguages:['ko-KR']}).hub.locale,'ko');
    assert.equal(boot({search:'?lang='+unsupported,stored:'zh-Hans'}).hub.locale,'tr');
  });
}

test('a non-array browser language source uses navigator.language; malformed entries are skipped',()=>{
  assert.equal(boot({search:'',browserLanguage:'fr-CA'}).hub.locale,'fr');
  assert.equal(boot({search:'',browserLanguages:[null,17,'zh-TW','ko-KR']}).hub.locale,'ko');
  assert.equal(boot({search:'',browserLanguages:[],browserLanguage:'fr-CA'}).hub.locale,'tr');
});

test('prepaint and runtime honour saved appearance and follow system changes only in system mode',()=>{
  const b=boot({storedAppearance:'system',osDark:true});
  const select=b.pages.get('pg-lo').appearance;
  assert.equal(b.doc.documentElement.dataset.themePreference,'system');
  assert.equal(b.doc.documentElement.dataset.theme,'dark');
  assert.equal(b.metas.get('meta[name="theme-color"]').content,'#09060e');
  b.setOSDark(false);assert.equal(b.doc.documentElement.dataset.theme,'light');
  assert.equal(b.pages.get('pg-lo').appearance,select);assert.equal(select.value,'system');
  select.value='dark';b.dispatchChange(select);b.setOSDark(true);b.setOSDark(false);
  assert.equal(b.doc.documentElement.dataset.themePreference,'dark');assert.equal(b.doc.documentElement.dataset.theme,'dark');
  assert.equal(b.doc.documentElement.classList.contains('dark'),true);
  select.value='system';b.dispatchChange(select);assert.equal(b.doc.documentElement.dataset.theme,'light');
  assert.equal(b.saved.get('yula.appearance.v1'),'system');assert.equal(b.requests.length,1);
  assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
});

for(const [saved,osDark,expected] of [['light',true,'light'],['dark',false,'dark'],['unexpected',false,'light'],[null,true,'dark']]){
  test('saved appearance '+String(saved)+' resolves against the OS without writing storage',()=>{
    const b=boot({storedAppearance:saved,osDark});
    assert.equal(b.doc.documentElement.dataset.theme,expected);
    assert.equal(b.pages.get('pg-lo').appearance.value,saved==='light'||saved==='dark'?saved:'system');
    assert.equal(b.writes.length,0);assert.equal(b.requests.length,1);
  });
}

test('blocked storage keeps theme and language functional in the tab with localized status',()=>{
  const b=boot({locale:'ar',blockedStorage:true,osDark:false});
  const page=b.pages.get('pg-lo'),select=page.appearance;
  b.doc.activeElement=select;select.value='dark';b.dispatchChange(select);
  assert.equal(b.doc.documentElement.dataset.theme,'dark');assert.equal(b.doc.activeElement,select);
  assert.equal(b.saved.size,0);assert.equal(b.writes.length,0);
  assert.ok(page.statuses[0].textContent.trim());assert.ok(b.hub.appearanceHTML().includes(page.statuses[0].textContent));
  b.hub.changeLocale('pl');
  assert.equal(b.location.searchParams.get('lang'),'pl');assert.equal(b.location.hash,'#lifeos');
  assert.equal(b.doc.documentElement.dataset.theme,'dark');assert.equal(b.doc.documentElement.dir,'ltr');
  assert.equal(b.pages.get('pg-lo').appearance.value,'dark');assert.equal(b.doc.activeElement,b.pages.get('pg-lo').appearance);
  assert.ok(b.pages.get('pg-lo').statuses[0].textContent.trim());
  assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
});

test('write-only storage failure does not discard a readable stored preference',()=>{
  const b=boot({storedAppearance:'light',blockedStorageWrite:true,osDark:true});
  assert.equal(b.doc.documentElement.dataset.theme,'light');
  const select=b.pages.get('pg-lo').appearance;select.value='dark';b.dispatchChange(select);
  assert.equal(b.doc.documentElement.dataset.theme,'dark');assert.equal(b.saved.get('yula.appearance.v1'),'light');
  assert.ok(b.pages.get('pg-lo').statuses[0].textContent.trim());assert.equal(b.writes.length,0);
});

test('storage events synchronize appearance while foreign storage areas and unrelated keys are ignored',()=>{
  const b=boot({storedAppearance:'light',osDark:false});const url=b.location.href;
  b.dispatchWindow('storage',{key:'yula.appearance.v1',newValue:'dark',storageArea:{}});
  b.dispatchWindow('storage',{key:'unrelated',newValue:'dark',storageArea:b.storage});
  assert.equal(b.doc.documentElement.dataset.theme,'light');
  b.dispatchWindow('storage',{key:'yula.appearance.v1',newValue:'dark',storageArea:b.storage});
  assert.equal(b.doc.documentElement.dataset.theme,'dark');assert.equal(b.pages.get('pg-lo').appearance.value,'dark');
  b.dispatchWindow('storage',{key:'yula.appearance.v1',newValue:null,storageArea:b.storage});
  assert.equal(b.doc.documentElement.dataset.themePreference,'system');assert.equal(b.doc.documentElement.dataset.theme,'light');
  b.setOSDark(true);assert.equal(b.doc.documentElement.dataset.theme,'dark');
  b.dispatchWindow('storage',{key:null,newValue:null,storageArea:b.storage});
  assert.equal(b.pages.get('pg-lo').appearance.value,'system');assert.equal(b.writes.length,0);
  assert.equal(b.location.href,url);assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);
});

test('appearance focus and route survive locale and asynchronous directory refresh without another fetch',async()=>{
  const b=boot({storedAppearance:'system',osDark:false,search:'?lang=tr&utm_source=fixture'});
  const select=b.pages.get('pg-lo').appearance;b.doc.activeElement=select;select.value='dark';b.dispatchChange(select);
  b.hub.changeLocale('zh-Hans');
  const afterLocale=b.pages.get('pg-lo').appearance;
  assert.notEqual(afterLocale,select);assert.equal(b.doc.activeElement,afterLocale);assert.equal(afterLocale.value,'dark');
  const fixture=JSON.parse(JSON.stringify(b.hub.FALLBACK_REGISTRY));
  for(const product of fixture.products){product.updatedAt='2026-10-20';for(const item of [...product.surfaces,...product.claims]){item.verifiedAt='2026-10-20';item.expiresAt='2026-10-21';}}
  b.response(fixture);await flush();
  assert.equal(b.hub.state,'network');assert.ok(b.pages.get('pg-lo').active);
  assert.equal(b.doc.activeElement,b.pages.get('pg-lo').appearance);assert.notEqual(b.doc.activeElement,afterLocale);
  assert.equal(b.doc.activeElement.value,'dark');assert.equal(b.doc.documentElement.dataset.theme,'dark');
  assert.equal(b.location.hash,'#lifeos');assert.equal(b.location.searchParams.get('lang'),'zh-Hans');
  assert.equal(b.location.searchParams.get('utm_source'),'fixture');
  assert.ok(b.app.innerHTML.includes(b.hub.L10N['zh-Hans'].ui.registryReady));
  assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
});

test('offline directory refresh preserves appearance control focus and local-only preference',async()=>{
  const b=boot({locale:'ko',blockedStorage:true});const select=b.pages.get('pg-lo').appearance;
  b.doc.activeElement=select;select.value='light';b.dispatchChange(select);b.reject(Error('synthetic offline'));await flush();
  assert.equal(b.hub.state,'fallback');assert.equal(b.doc.activeElement,b.pages.get('pg-lo').appearance);
  assert.equal(b.doc.activeElement.value,'light');assert.equal(b.doc.documentElement.dataset.theme,'light');
  assert.ok(b.pages.get('pg-lo').statuses[0].textContent.trim());
  assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);assert.equal(b.writes.length,0);
});

test('popstate and hash routes change locale/page without resetting appearance or refetching',()=>{
  const b=boot({storedAppearance:'dark',search:'?lang=tr&utm_source=fixture'});
  b.hub.changeLocale('ar');
  b.setLocation('?lang=pl&utm_source=fixture#braavolabs');b.dispatchWindow('popstate');
  assert.equal(b.hub.locale,'pl');assert.ok(b.pages.get('pg-bl').active);assert.equal(b.doc.activeElement,b.app);
  assert.equal(b.doc.documentElement.dataset.theme,'dark');assert.equal(b.pages.get('pg-bl').appearance.value,'dark');
  b.setLocation('#ostinato');b.dispatchWindow('hashchange');
  assert.ok(b.pages.get('pg-ostinato').active);assert.equal(b.location.searchParams.get('lang'),'pl');
  assert.equal(b.doc.documentElement.dataset.theme,'dark');
  b.setLocation('#unknown-route');b.dispatchWindow('hashchange');assert.ok(b.pages.get('pg-holding').active);
  assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);assert.equal(b.session.size,0);
});

test('history failure leaves native locale/theme selection usable without extra requests',()=>{
  const b=boot({locale:'tr',blockedHistory:true});
  b.hub.changeLocale('ar');assert.equal(b.hub.locale,'ar');assert.equal(b.doc.documentElement.dir,'rtl');
  const select=b.pages.get('pg-lo').appearance;select.value='light';b.dispatchChange(select);
  assert.equal(b.doc.documentElement.dataset.theme,'light');assert.equal(b.historyWrites.length,0);
  assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);
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

for(const unsafeURL of ['javascript:alert(1)','https://apps.apple.com.attacker.invalid/app/fixture','https://fixture:fixture@apps.apple.com/app/fixture']){
  test('a synthetic disallowed registry URL is rejected without entering the rendered directory: '+unsafeURL,async()=>{
    const b=boot({locale:'pl'});const fixture=JSON.parse(JSON.stringify(b.hub.FALLBACK_REGISTRY));
    fixture.products.find(product=>product.slug==='lifeos').surfaces.find(surface=>surface.kind==='ios').url=unsafeURL;
    b.response(fixture);await flush();
    assert.equal(b.hub.state,'fallback');assert.equal(b.pages.size,9);
    assert.ok(!b.app.innerHTML.includes(unsafeURL));assert.equal(b.hub.models.find(model=>model.slug==='lifeos').stores.ios,null);
    assert.ok(b.app.innerHTML.includes(b.hub.L10N.pl.ui.registryUnavailable));
    assert.equal(b.requests.length,1);assert.equal(b.beacons.length,0);
  });
}

test('synthetic attribution follows a later language change rather than the initial locale',async()=>{
  const b=boot({enabled:true});b.hub.changeLocale('ar');
  b.setLocation('#holding');b.windowListeners.hashchange.forEach(fn=>fn());
  b.setLocation('#lifeos');b.windowListeners.hashchange.forEach(fn=>fn());
  assert.equal(b.beacons.length,2);
  assert.equal(JSON.parse(await b.beacons[0].body.text()).locale,'tr');
  assert.equal(JSON.parse(await b.beacons[1].body.text()).locale,'ar');
});

test('both exact script digests are pinned in HTML, Netlify and Vercel; attribution remains off',()=>{
  assert.equal(scripts.length,2);
  for(const name of ['index.html','_headers','vercel.json']){
    const source=fs.readFileSync(path.join(repo,name),'utf8');
    const directive=source.match(/script-src ([^;]+)/)[1];
    const actual=[...directive.matchAll(/'sha256-([^']+)'/g)].map(match=>match[1]);
    const expected=scripts.map(script=>crypto.createHash('sha256').update(script).digest('base64'));
    assert.deepEqual(actual,expected,name);
    assert.deepEqual(directive.trim().split(/\s+/),expected.map(digest=>"'sha256-"+digest+"'"),name+': no additional script sources');
    assert.ok(!/unsafe-inline|unsafe-eval|https?:/.test(directive),name);
  }
  const vercel=JSON.parse(fs.readFileSync(path.join(repo,'vercel.json'),'utf8'));
  assert.equal(vercel.redirects.length,19);
  assert.ok(!html.includes('locale:\'tr\', page:'));assert.ok(/var ENABLED = false;/.test(inline));
});

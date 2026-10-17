// SĂN GIÁ • Netlify Functions engine, ported from v2.1 server.mjs
// No fake prices; all offers are extracted from retailer pages.
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const DISABLE_NETWORK = process.env.DISABLE_NETWORK === '1';
const HTTP_TIMEOUT = Math.min(8000, Math.max(1500, Number(process.env.HTTP_TIMEOUT_MS||5000)));
const SEEDS = {"iphone 17 pro max": {"tgdd": [{"title": "iPhone 17 Pro Max 256GB - Thế Giới Di Động", "url": "https://www.thegioididong.com/dtdd/iphone-17-pro-max"}], "ddv": [{"title": "iPhone 17 Pro Max 256GB Chính Hãng - Di Động Việt", "url": "https://didongviet.vn/dien-thoai/iphone-17-pro-max-256gb.html"}], "ddm": [{"title": "iPhone 17 Pro Max 256GB LL/A - Di Động Mỹ", "url": "https://www.didongmy.com/iphone-17-pro-max-256gb"}, {"title": "iPhone 17 Pro Max 256GB Chính Hãng - Di Động Mỹ", "url": "https://www.didongmy.com/iphone-17-pro-max-256gb-chinh-hang"}], "mtm": [{"title": "iPhone 17 Pro Max 256GB chính hãng - Minh Tuấn Mobile", "url": "https://minhtuanmobile.com/iphone-17-pro-max/"}], "cps": [{"title": "iPhone 17 Pro Max 256GB chính hãng - CellphoneS", "url": "https://cellphones.com.vn/iphone-17-pro-max.html"}], "hhm": [{"title": "iPhone 17 Pro Max 256GB - Hoàng Hà Mobile", "url": "https://hoanghamobile.com/dien-thoai/iphone-17-pro-max"}], "mc": [{"title": "iPhone 17 Pro Max chính hãng - MobileCity", "url": "https://mobilecity.vn/dien-thoai/iphone-17-pro-max-chinh-hang.html"}]}};
const crawlDiagnostics = new Map();
const TTL = Math.max(5, Number(process.env.CACHE_MINUTES || 20)) * 60 * 1000;
const STORES = [
  {id:'tgdd', name:'Thế Giới Di Động', domain:'thegioididong.com', home:'https://www.thegioididong.com'},
  {id:'ddv', name:'Di Động Việt', domain:'didongviet.vn', home:'https://didongviet.vn'},
  {id:'ddm', name:'Di Động Mỹ', domain:'didongmy.com', home:'https://www.didongmy.com'},
  {id:'mtm', name:'Minh Tuấn Mobile', domain:'minhtuanmobile.com', home:'https://minhtuanmobile.com'},
  {id:'cps', name:'CellphoneS', domain:'cellphones.com.vn', home:'https://cellphones.com.vn'},
  {id:'hhm', name:'Hoàng Hà Mobile', domain:'hoanghamobile.com', home:'https://hoanghamobile.com'},
  {id:'mc', name:'MobileCity', domain:'mobilecity.vn', home:'https://mobilecity.vn'}
];
const BLACKLIST = /(?:\/tin-tuc\/|\/news\/|\/blog\/|\/bai-viet\/|\/tra-gop\/|\/chinh-sach\/|\/review\/|\/danh-gia\/|\/trade-in\/|\/thong-tin\/|\/thu-cu\/|\/so-sanh\/|\/huong-dan\/)/i;
const BRANDS = ['Apple','Samsung','Xiaomi','OPPO','vivo','realme','HONOR','Google','Nothing','POCO','Nokia','Motorola','OnePlus','Sony'];
const EXCLUDED = /(?:\bcũ\b|99%|98%|like\s*new|refurbish|đã qua sử dụng|đã kích hoạt|new active|máy active|hàng trưng bày|đổi bảo hành|màn hình|ốp lưng|cường lực|dán|sạc|cáp|adapter|đặt cọc|trả góp)/i;
const COLORS = [
  ['Cam vũ trụ',/(?:cam vũ trụ|cosmic orange|\bcam\b)/i],['Xanh đậm',/(?:xanh đậm|deep blue|\bxanh\b)/i],['Bạc',/(?:\bbạc\b|\bsilver\b)/i],
  ['Đen',/(?:\bđen\b|\bblack\b)/i],['Trắng',/(?:\btrắng\b|\bwhite\b)/i],['Xanh dương',/(?:xanh dương|blue)/i],
  ['Xanh lá',/(?:xanh lá|green)/i],['Tím',/(?:\btím\b|purple)/i],['Hồng',/(?:\bhồng\b|pink)/i],
  ['Vàng',/(?:\bvàng\b|gold)/i],['Titan tự nhiên',/(?:titan tự nhiên|natural titanium)/i],['Sa mạc',/(?:sa mạc|desert titanium)/i]
];
let catalog = [{"name": "iPhone 18 Pro Max", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB", "2TB"], "colors": []}, {"name": "iPhone 18 Pro", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB", "2TB"], "colors": []}, {"name": "iPhone 18", "brand": "Apple", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "iPhone 17 Pro Max", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB", "2TB"], "colors": ["Cam vũ trụ", "Xanh đậm", "Bạc"]}, {"name": "iPhone 17 Pro", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB"], "colors": ["Cam vũ trụ", "Xanh đậm", "Bạc"]}, {"name": "iPhone 17", "brand": "Apple", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "iPhone 17e", "brand": "Apple", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "iPhone Air", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "iPhone 16 Pro Max", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "iPhone 16 Pro", "brand": "Apple", "capacities": ["128GB", "256GB", "512GB", "1TB"], "colors": []}, {"name": "iPhone 16 Plus", "brand": "Apple", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "iPhone 16", "brand": "Apple", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "iPhone 15 Pro Max", "brand": "Apple", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "iPhone 15", "brand": "Apple", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy S26 Ultra", "brand": "Samsung", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "Samsung Galaxy S26+", "brand": "Samsung", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy S26", "brand": "Samsung", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy S25 Ultra", "brand": "Samsung", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "Samsung Galaxy S25+", "brand": "Samsung", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy S25", "brand": "Samsung", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy Z Fold7", "brand": "Samsung", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "Samsung Galaxy Z Flip7", "brand": "Samsung", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Samsung Galaxy A56 5G", "brand": "Samsung", "capacities": ["128GB", "256GB"], "colors": []}, {"name": "Samsung Galaxy A36 5G", "brand": "Samsung", "capacities": ["128GB", "256GB"], "colors": []}, {"name": "Xiaomi 17 Ultra", "brand": "Xiaomi", "capacities": ["512GB", "1TB"], "colors": []}, {"name": "Xiaomi 17", "brand": "Xiaomi", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Xiaomi 15 Ultra", "brand": "Xiaomi", "capacities": ["512GB", "1TB"], "colors": []}, {"name": "Xiaomi 15", "brand": "Xiaomi", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Redmi Note 15 Pro 5G", "brand": "Xiaomi", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Redmi Note 14 Pro 5G", "brand": "Xiaomi", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "OPPO Find X9 Pro", "brand": "OPPO", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "OPPO Reno15 5G", "brand": "OPPO", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "OPPO Reno14 5G", "brand": "OPPO", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "OPPO A6 Pro", "brand": "OPPO", "capacities": ["128GB", "256GB"], "colors": []}, {"name": "vivo X300 Pro", "brand": "vivo", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "vivo V60 5G", "brand": "vivo", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "realme GT 7 Pro", "brand": "realme", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "realme 15 Pro 5G", "brand": "realme", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "HONOR Magic7 Pro", "brand": "HONOR", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "HONOR 400", "brand": "HONOR", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "Google Pixel 10 Pro XL", "brand": "Google", "capacities": ["256GB", "512GB", "1TB"], "colors": []}, {"name": "Google Pixel 10 Pro", "brand": "Google", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "Google Pixel 9 Pro", "brand": "Google", "capacities": ["128GB", "256GB", "512GB"], "colors": []}, {"name": "Nothing Phone (3)", "brand": "Nothing", "capacities": ["256GB", "512GB"], "colors": []}, {"name": "POCO F7 Pro", "brand": "POCO", "capacities": ["256GB", "512GB"], "colors": []}];
let cache = new Map();
const running = new Map();
const recent = new Map();
let lastDiscovery = 0;
const clean = v => String(v||'').replace(/\s+/g,' ').trim();
const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9+]+/g,' ').trim();
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const htmlDecode = v => String(v||'').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27|#\d+);/gi,m=>{
  const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&#39;':"'",'&#x27;':"'"};
  return named[m.toLowerCase()] || (m.startsWith('&#') ? String.fromCharCode(parseInt(m.slice(2),10)||32) :m);
});
const stripTags = v=>htmlDecode(String(v||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const escXml = v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function parsePrice(v) {
  if(typeof v==='number') return Number.isFinite(v)&&v>=500000&&v<=150000000 ? Math.round(v):null;
  let text=clean(v); if(!text)return null;
  const matched=text.match(/(?:\d{1,3}(?:[.,]\d{3}){2,}|\d{7,9})(?:\s*(?:₫|đ|vnd))?/i);
  if(!matched)return null;
  let digits=matched[0].replace(/\D/g,'');
  const n=Number(digits);return n>=500000&&n<=150000000?n:null;
}
function colorOf(v){for(const [label,re] of COLORS){if(re.test(v||''))return label;}return null;}
function storageOf(v){const m=String(v||'').match(/(?:^|[^a-z0-9])([1-9]\d{0,3})\s*(gb|tb)(?:\b|$)/i);return m?m[1]+m[2].toUpperCase():null;}
function conditionOf(title){return EXCLUDED.test(title)?'other':(/(?:LL\/A|quốc tế|hàng mỹ|X\/A|nhập khẩu|VC\/A)/i.test(title)?'import':/(chính hãng|VN\/A|ZP\/A|Apple Việt Nam|đại lý uỷ quyền|Hàng VN)/i.test(title)?'vn':'unknown');}
function validHost(h, domain){return h===domain||h.endsWith('.'+domain);}
function validProductLink(url, store) {
 try {const u=new URL(url);if(u.protocol!=='https:' || !validHost(u.hostname,store.domain))return false;
  if(BLACKLIST.test(u.pathname))return false;
  if(u.pathname.split('/').filter(Boolean).length===0)return false;
  if(/\.(?:pdf|jpg|png|jpeg|webp|svg|xml|rss)$/i.test(u.pathname))return false;
  return true;} catch{return false;}
}
function matchQuality(title, wanted){
 const q=norm(wanted).split(' ').filter(Boolean), t=norm(title);
 if(!q.length || !q.every(token=>new RegExp(`(?:^| )${escapeRegex(token)}(?: |$)`,'i').test(t)))return -1;
 const mismatch = ['pro max','pro','plus','ultra','air','fold','flip'];
 const qm=norm(wanted), tm=t;
 for(const suffix of mismatch){if(tm.includes(suffix)&& !qm.includes(suffix) && (suffix!=='pro' || !qm.includes('pro'))) return -1;}
 if(EXCLUDED.test(title))return -1;
 return 100-(t.length-qm.length)*0.5;
}
async function fetchText(url,options={}){
 if(DISABLE_NETWORK)throw Error('Tắt truy cập mạng trong chế độ kiểm thử');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),HTTP_TIMEOUT);
 try {const r=await fetch(url,{redirect:'follow',headers:{'User-Agent':'SangiaPriceComparator/1.0 (+respect merchant robots and terms)','Accept':'text/html,application/xhtml+xml,application/xml,text/xml,application/json;q=0.8,*/*;q=0.4','Accept-Language':'vi-VN,vi;q=0.9,en;q=0.7',...options.headers},signal:controller.signal,...options});
  if(!r.ok)throw Error(`HTTP ${r.status}`);let body=await r.text();if(body.length>1500000)body=body.slice(0,1500000);return body;
 }finally{clearTimeout(timer)}
}
async function searchLinks(query,domain) {
 const q=`site:${domain} ${query} điện thoại giá`;
 if(SERPER_API_KEY){
  const body=await fetchText('https://google.serper.dev/search',{method:'POST',headers:{'X-API-KEY':SERPER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({q,gl:'vn',hl:'vi',num:8})});
  const data=JSON.parse(body);return (data.organic||[]).map(i=>({title:clean(i.title),url:i.link,snippet:clean(i.snippet)}));
 }
 // Free, keyless fallback. Bing may rate-limit or omit a shop; such misses are hidden, never fabricated.
 const rss=await fetchText(`https://www.bing.com/search?format=rss&cc=vn&q=${encodeURIComponent(q)}`);
 const links=[];const rx=/<item>([\s\S]*?)<\/item>/gi;let m;
 while((m=rx.exec(rss))){const part=m[1], el=tag=>htmlDecode((part.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'))||[])[1]||'').replace(/^<!\[CDATA\[|\]\]>$/g,'');links.push({title:el('title'),url:el('link'),snippet:stripTags(el('description'))});}
 return links;
}
function extractJsonLd(html){
 const arr=[];const rx=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;
 while((m=rx.exec(html))){try{const parsed=JSON.parse(htmlDecode(m[1]).replace(/&quot;/g,'"'));const walk=(o,depth=0)=>{if(depth>7||!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(x=>walk(x,depth+1));return;}arr.push(o);if(o['@graph'])walk(o['@graph'],depth+1);if(o.hasVariant)walk(o.hasVariant,depth+1);};walk(parsed);}catch{}}
 return arr;
}
function metaValue(html,names){
 for(const name of names){const safe=escapeRegex(name);const a=new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)=["']${safe}["'][^>]*content=["']([^"']+)["']`,'i');
  const b=new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${safe}["']`,'i');
  const m=html.match(a)||html.match(b);if(m)return htmlDecode(m[1]);}
 return null;
}
function offersFromProduct(html,linkTitle,linkUrl,store,wanted){
 const heading=stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
 const og=metaValue(html,['og:title','twitter:title']);
 const ld=extractJsonLd(html);
 const products=ld.filter(o=>/Product/i.test(String(o['@type']||'')));
 const title=clean(products[0]?.name||heading||og||linkTitle);
 if(matchQuality(title,wanted)<0 || EXCLUDED.test(title)) return [];
 const output=[];
 function record(raw,titleCandidate,colorCandidate,storageCandidate,source){
  const price=parsePrice(raw?.price??raw?.lowPrice??raw?.priceSpecification?.price??raw);
  if(!price)return;
  const currency=raw?.priceCurrency||'VND';if(currency!=='VND' && currency!=='₫')return;
  const avail=String(raw?.availability||''); if(/OutOfStock|Discontinued|SoldOut/i.test(avail))return;
  const listedColor=colorOf(colorCandidate)||colorOf(titleCandidate);
  output.push({storeId:store.id,storeName:store.name,url:linkUrl,title:titleCandidate||title,price,
    color:listedColor,capacity:storageOf(storageCandidate)||storageOf(titleCandidate)||storageOf(title),
    condition:conditionOf([titleCandidate||title,linkUrl,store.id==='ddm' ? (titleCandidate||'') : ''].join(' ')),stock:/InStock|LimitedAvailability/i.test(avail)?'in-stock':'unknown',
    source,checkedAt:new Date().toISOString()});
 }
 for(const obj of products){
  const productTitle=clean(obj.name||title);
  if(matchQuality(productTitle,wanted)<0 || EXCLUDED.test(productTitle))continue;
  const mainColor=obj.color||null;
  const offers=Array.isArray(obj.offers)?obj.offers:[obj.offers].filter(Boolean);
  for(const offer of offers){record(offer,productTitle,mainColor,productTitle,'structured');}
 }
 if(!output.length){
  const meta=metaValue(html,['product:price:amount','og:price:amount','price','product:price']);
  if(meta)record(meta,title,null,title,'metadata');
 }
 if(!output.length){
  // Fallback only to a clearly labelled *current product price* near the first H1.
  const afterH1=(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>([\s\S]{0,12000})/i)||[])[1]||'';
  const near=stripTags(afterH1.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')).slice(0,2500);
  const m=near.match(/(?:Giá bán|Giá tại|Giá sản phẩm)\s*(?:tại\s+[^\d]{0,35})?[:\s]{0,15}(\d{1,3}[.,]\d{3}[.,]\d{3})\s*(?:đ|₫)?/i);
  if(m)record({price:m[1],priceCurrency:'VND'},title,null,title,'labeled-visible-price');
 }
 // A few sellers show the price of each swatch in the HTML before JS runs.
 // Read only the FIRST swatch group near the H1, never editorial tables or review comments.
 const variantText=stripTags(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' '));
 const firstColor=variantText.search(/(?:Màu sắc|Chọn màu sắc|Màu máy)\s*:?/i);
 if(firstColor>=0 && firstColor<12000){
  const area=variantText.slice(firstColor,firstColor+1050);
  const matchedColors=new Set();
  const re=/(Cam Vũ Trụ|Xanh Đậm|Bạc|Cam|Xanh|Đen|Trắng|Tím|Hồng|Vàng)(?:\s+\1)?\s*[:\-]?\s*(\d{1,3}[.,]\d{3}[.,]\d{3})\s*(?:đ|₫|VND)?/gi;
  let m;
  while((m=re.exec(area))){
    const shade=colorOf(m[1]); if(!shade || matchedColors.has(shade))continue;
    matchedColors.add(shade);
    const cleanTitle=title;
    record({price:m[2],priceCurrency:'VND'},cleanTitle,shade,cleanTitle,'visible-swatch');
  }
 }
 // A price without an explicit color cannot undercut specific swatch prices.
 return output.some(o=>o.source==='visible-swatch')?output.filter(o=>o.color):output;
}
function productSeedLinks(store,wanted){
 const entry=SEEDS[norm(wanted)];
 return (entry?.[store.id]||[]).map(e=>({url:e.url,title:e.title||wanted,quality:150,seed:true})).filter(x=>validProductLink(x.url,store));
}
async function crawlStore(store,wanted){
 const seed=productSeedLinks(store,wanted);
 let links=[],discoveryError=null;
 if(!seed.length){try{links=await searchLinks(wanted,store.domain)}catch(e){discoveryError=e.message}}
 const found=links.filter(x=>validProductLink(x.url,store)).map(x=>({...x,quality:matchQuality(x.title,wanted)}))
   .filter(x=>x.quality>=0).sort((a,b)=>b.quality-a.quality).slice(0,3);
 const uniqueLinks=new Map();for(const x of [...seed,...found])uniqueLinks.set(x.url,x);
 const candidates=[...uniqueLinks.values()].slice(0,2);
 const out=[];let fetched=0,blocked=0;
 for(const candidate of candidates){
  try {
   const html=await fetchText(candidate.url);
   fetched++;
   out.push(...offersFromProduct(html,candidate.title,candidate.url,store,wanted));
   if(out.length>=5)break;
  }catch(e){blocked++;}
 }
 const uniq=new Map();for(const offer of out){
  const key=`${offer.storeId}|${offer.url}|${offer.capacity}|${offer.color}|${offer.condition}|${offer.price}`;
  if(!uniq.has(key))uniq.set(key,offer);
 }
 const status=out.length?'priced':!candidates.length?'no-listing':blocked?'unavailable':'no-readable-price';
 crawlDiagnostics.set(store.id,{status,links:candidates.length,checkedAt:new Date().toISOString(),discoveryError});
 return {storeId:store.id,offers:[...uniq.values()],status,links:candidates.length};
}

async function limitedMap(items,limit,fn){let idx=0;const out=[];await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(idx<items.length){const i=idx++;try{out[i]=await fn(items[i]);}catch(e){out[i]={error:clean(e.message)};}}}));return out;}
const cleanKey=(q)=>norm(q).slice(0,120);
function persistentCache(){ /* Ephemeral process cache: never persist user queries on disk */ }
async function compareBase(q,force=false){
 const key=cleanKey(q); const prev=cache.get(key);
 if(!force&&prev&&Date.now()-prev.timestamp<TTL)return {...prev.data,cached:true};
 if(running.has(key))return running.get(key);
 const p=(async()=>{
  const fetched=await limitedMap(STORES,7,async store=>await crawlStore(store,q));
  const offers=fetched.flatMap(x=>x?.offers||[]);
  const errors=fetched.filter(x=>x?.error).length;
  const checkedAt=new Date().toISOString();
  const data={query:q,offers,checkedAt,cached:false,storesChecked:STORES.length,storesWithOffers:new Set(offers.map(x=>x.storeId)).size,
   storesStatus:STORES.map((st,i)=>({id:st.id,name:st.name,status:fetched[i]?.status||'unavailable'})),
   limited:errors>0, discovery:SERPER_API_KEY?'serper + seed':'bing-rss + seed'};
  cache.set(key,{timestamp:Date.now(),data});persistentCache();recent.set(key,Date.now());
  for(const o of offers){const n=o.title.replace(/\s*\d+\s*(GB|TB).*$/i,'').replace(/\s*(chính hãng|VN\/A|new|quốc tế).*$/i,'').trim();
   if(n.length>=6&&n.length<65&&matchQuality(n,q)>=0 && !catalog.some(p=>norm(p.name)===norm(n))){
    catalog.push({name:n,brand:BRANDS.find(b=>norm(n).includes(norm(b)))||'Khác',capacities:[],colors:[]});
   }}
  return data;
 })().finally(()=>running.delete(key));running.set(key,p);return p;
}
function suggest(q){const s=norm(q);const list=catalog.map((p,i)=>{
 const n=norm(p.name),b=norm(p.brand);let score=0;
 if(!s)score=Math.max(1,40-i);else if(n===s)score=150;else if(n.startsWith(s))score=120;else if(n.includes(s))score=85;
 else if(s.split(' ').every(w=>n.includes(w)))score=70;
 else if(b===s)score=65;else if(b.startsWith(s))score=55;
 return {...p,score};}).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'vi'));
 const brands=BRANDS.filter(b=>s&&norm(b).startsWith(s)).slice(0,3).map(b=>({type:'brand',name:b}));
 return {suggestions:[...brands,...list.slice(0,12).map(({score,...p})=>({type:'phone',...p}))],count:list.length};
}

export { STORES, BRANDS, SEEDS, catalog, clean, norm, compareBase, suggest, offersFromProduct, parsePrice, matchQuality, colorOf, storageOf, conditionOf, validProductLink };

const $ = id => document.getElementById(id);
const STORES = [
  {id:'tgdd',name:'Thế Giới Di Động',logo:'TGDĐ',home:'https://www.thegioididong.com'},
  {id:'ddv',name:'Di Động Việt',logo:'DDV',home:'https://didongviet.vn'},
  {id:'ddm',name:'Di Động Mỹ',logo:'DDM',home:'https://www.didongmy.com'},
  {id:'mtm',name:'Minh Tuấn Mobile',logo:'MT',home:'https://minhtuanmobile.com'},
  {id:'cps',name:'CellphoneS',logo:'CPS',home:'https://cellphones.com.vn'},
  {id:'hhm',name:'Hoàng Hà Mobile',logo:'HH',home:'https://hoanghamobile.com'},
  {id:'mc',name:'MobileCity',logo:'MC',home:'https://mobilecity.vn'}
];
const COLORS={
  'Cam vũ trụ':'#e4a273','Xanh đậm':'#31445f','Bạc':'#c4ced6','Đen':'#232a33',
  'Trắng':'#faf9f6','Xanh dương':'#79a8df','Xanh lá':'#9bcea2','Tím':'#a997d7',
  'Hồng':'#e5a8c7','Vàng':'#ebcd81','Titan tự nhiên':'#adaca1','Sa mạc':'#bca382'
};
const STANDALONE=Boolean(window.__STANDALONE__);
const PRODUCT_LINKS=window.__PRODUCT_LINKS__||{};
const DEMO_BASE={tgdd:37990000,ddv:34590000,ddm:31390000,mtm:34690000,cps:35290000,hhm:33990000,mc:37450000};
const DEMO_ADJUST={'Cam vũ trụ':200000,'Xanh đậm':0,'Bạc':350000};
let catalog=[],currentPhone=null,allOffers=[],checkedAt=null,loaded=false,loading=false,selecting=false,searchSeq=0;
let mode='live',capacity='',color='',condition='all',sort='low',view='compare',sugs=[],focused=-1;
let saved=new Set(); try{saved=new Set(JSON.parse(localStorage.getItem('sangia-saved')||'[]'));}catch{}
const vnd=n=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const shortVnd=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(n/1000000)+'tr';
const nrm=s=>String(s||'').replace(/\bpromax\b/gi,'pro max').replace(/\bsansung\b/gi,'samsung').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9+]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eurl=s=>encodeURIComponent(s);
const storeBy=id=>STORES.find(s=>s.id===id)||{id:'unknown',name:id,logo:'SHOP'};
const dateFmt=d=>{if(!d)return 'Chưa có thời gian';const t=new Date(d);return isNaN(t)?'Không rõ':new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}).format(t);};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function setView(id){view=id;['compare','new','saved'].forEach(x=>{$(x+'View').classList.toggle('active',x===id)});
 document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('selected',el.dataset.view===id));
 document.querySelectorAll('[data-mobile-view]').forEach(el=>el.classList.toggle('active',el.dataset.mobileView===id));
 if(id==='new')renderNew();if(id==='saved')renderSaved();window.scrollTo({top:0,behavior:'smooth'});}
function syncSaved(){const has=currentPhone&&saved.has(currentPhone.name);$('saveHeart').textContent=has?'♥':'♡';$('saveText').textContent=has?'Đã lưu':'Lưu máy';$('savePhone').classList.toggle('saved',!!has);$('savedCount').textContent=saved.size;}
function toggleSave(){if(!currentPhone)return;const name=currentPhone.name;if(saved.has(name)){saved.delete(name);toast('Đã bỏ lưu '+name);}else{saved.add(name);toast('Đã lưu '+name+' vào danh sách.');}
 try{localStorage.setItem('sangia-saved',JSON.stringify([...saved]));}catch{}syncSaved();if(view==='saved')renderSaved();}
function drawBrands(){const brands=['Apple','Samsung','Xiaomi','OPPO','vivo','realme','HONOR'];$('sidebarBrands').innerHTML=brands.map(b=>`<button class="brand-button" data-brand="${esc(b)}"><span class="brand-logo">${b==='Apple'?'●':esc(b[0])}</span>${esc(b)}</button>`).join('');}
function drawTrending(){let chips=['iPhone 17 Pro Max','Samsung Galaxy S26 Ultra','Xiaomi 17 Ultra'];$('trendingChips').innerHTML=chips.map(x=>`<button data-phone="${esc(x)}">${esc(x)}</button>`).join('');}
function suggestedLocal(q){const s=nrm(q);let vals=catalog.map((p,i)=>{const n=nrm(p.name),brand=nrm(p.brand);let w=0;if(n===s)w=150;else if(n.startsWith(s))w=130;else if(n.includes(s))w=100;else if(s.split(' ').every(x=>n.includes(x)))w=90;else if(brand===s)w=70;else if(brand.startsWith(s))w=60;else if(!s)w=Math.max(1,35-i);return {...p,type:'phone',w};}).filter(x=>x.w>0).sort((a,b)=>b.w-a.w).slice(0,12);
 const brands=[...new Set(catalog.map(x=>x.brand))].filter(x=>s&&nrm(x).startsWith(s)).slice(0,2).map(x=>({type:'brand',name:x}));return [...brands,...vals];}
function drawSuggestions(items){sugs=items;focused=-1;const el=$('suggestions');if(!items.length){el.innerHTML='<div class="suggest-header">Không tìm thấy tên phù hợp. Bạn có thể tìm theo tên tự nhập.</div>';el.classList.remove('hidden');return;}
 el.innerHTML=`<div class="suggest-header">${$('searchInput').value.trim()?'GỢI Ý CHO BẠN':'GỢI Ý ĐƯỢC QUAN TÂM'}</div>`+items.slice(0,12).map((p,i)=>`<button class="suggest-row" data-suggestion="${i}" role="option" aria-selected="false"><span class="suggest-phone">${p.type==='brand'?'✦':'▯'}</span><span class="suggest-info"><strong>${esc(p.name)}</strong><small>${p.type==='brand'?'Xem các dòng máy '+esc(p.name):esc(p.brand||'Điện thoại')+' · '+(p.capacities||[]).join(' / ')}</small></span><span class="suggest-enter">↗</span></button>`).join('');el.classList.remove('hidden');$('searchInput').setAttribute('aria-expanded','true');}
function closeSuggestions(){$('suggestions').classList.add('hidden');$('searchInput').setAttribute('aria-expanded','false');focused=-1;}
function pickSuggestion(p){if(!p)return;if(p.type==='brand'){$('searchInput').value=p.name;drawSuggestions(suggestedLocal(p.name).filter(s=>s.type==='phone'));$('searchInput').focus();return;}
 $('searchInput').value=p.name;closeSuggestions();selectPhone(p.name);}
let suggestTimer;
async function updateSuggestions(){const q=$('searchInput').value;$('clearSearch').classList.toggle('hidden',!q);drawSuggestions(suggestedLocal(q));
 clearTimeout(suggestTimer);if(!q.trim()||STANDALONE)return;
 suggestTimer=setTimeout(async()=>{try{const r=await fetch('/api/suggest?q='+eurl(q));if(!r.ok)return;const data=await r.json();if($('searchInput').value===q && document.activeElement===$('searchInput')){
 const local=suggestedLocal(q),map=new Set(local.map(x=>nrm(x.name)));for(const p of data.suggestions||[])if(!map.has(nrm(p.name))){local.push(p);map.add(nrm(p.name));}drawSuggestions(local.slice(0,12));}}catch{}},140);
}
function submitSearch(){const q=$('searchInput').value.trim();if(!q)return $('searchInput').focus();
 const requestedCapacity=(q.match(/\b(128|256|512|64)\s*GB\b|\b([12])\s*TB\b/i)||[])[0]||'';
 const plain=q.replace(/\b\d{2,4}\s*(?:GB|TB)\b/gi,'').trim();
 const phone=catalog.find(p=>nrm(p.name)===nrm(q))||catalog.find(p=>nrm(p.name)===nrm(plain))||suggestedLocal(q).find(p=>p.type==='phone')||{name:plain||q,brand:'Khác',capacities:[],colors:[]};
 selectPhone(phone.name,requestedCapacity?{capacity:requestedCapacity.replace(/\s+/g,'').toUpperCase()}:{});
}
function selectPhone(name,opts={}){let p=catalog.find(x=>nrm(x.name)===nrm(name));if(!p){p={name,brand:'Khác',capacities:[],colors:[]};catalog.push(p);}currentPhone=p;capacity=opts.capacity||'';color='';condition='all';$('conditionFilter').value=condition;allOffers=[];loaded=false;checkedAt=null;$('heroPhone').textContent=p.name;$('searchInput').value=p.name;$('clearSearch').classList.remove('hidden');closeSuggestions();syncSaved();setView('compare');renderFilters();renderShopLinks(name);renderState('loading');if(mode==='demo'){loadDemo();}else{loadLive();}}
function colorChoices(){const list=[...(currentPhone?.colors||[])];allOffers.forEach(x=>{if(x.color&&!list.includes(x.color))list.push(x.color);});return list;}
function capacityChoices(){const arr=[...(currentPhone?.capacities||[])];allOffers.forEach(x=>{if(x.capacity&&!arr.includes(x.capacity))arr.push(x.capacity);});return arr;}
function renderFilters(){const caps=capacityChoices();$('capacityOptions').innerHTML=(['',...caps.filter(Boolean)]).map(c=>`<button data-cap="${esc(c)}" class="filter-pill ${c===capacity?'selected':''}">${esc(c||'Tất cả dung lượng')}</button>`).join('');
 const colors=colorChoices();$('colorOptions').innerHTML=`<button data-color="" class="filter-pill ${!color?'selected':''}">Tất cả màu</button>`+
 colors.map(c=>`<button data-color="${esc(c)}" class="filter-pill color-pill ${color===c?'selected':''}"><span class="color-dot" style="background:${COLORS[c]||'#cad8df'}"></span>${esc(c)}</button>`).join('');
}

function lookupUrl(store, name){return 'https://www.google.com/search?q='+encodeURIComponent('site:'+new URL(store.home).hostname+' '+name+' điện thoại mới giá');}
async function renderShopLinks(name,offers=[]){
 const token=name;
 const write=(links)=>{if(currentPhone?.name!==token)return;
 const cards=STORES.map(store=>{
   const u=links?.[store.id]?.[0]||null;
   const href=u||lookupUrl(store,name);
   return `<a class="shop-link" target="_blank" rel="noopener noreferrer" href="${esc(href)}"><span class="shop-logo ${esc(store.id)}">${esc(store.logo)}</span><span class="shop-link-info"><strong>${esc(store.name)}</strong><small>${u?'Mở trang sản phẩm đã xác minh':'Tìm tên máy trên Google trong website cửa hàng'}</small></span><span class="shop-arrow">↗</span></a>`;
 });
 $('shopLinks').innerHTML=cards.join('');
 };
 const known={...(PRODUCT_LINKS[nrm(name)]||{})};
 for(const o of offers){if(o.url&&STORES.some(s=>s.id===o.storeId)){known[o.storeId]=[o.url]}}
 write(known);
 if(STANDALONE)return;
 try{const res=await fetch('/api/product-links?q='+eurl(name));const data=await res.json();
  const links={...known};for(const sh of data.shops||[])if(sh.links?.length)links[sh.id]=sh.links;
  write(links);
 }catch{}
}

function demoOffers(){if(nrm(currentPhone?.name)!==nrm('iPhone 17 Pro Max'))return [];
 const arr=[];STORES.forEach(s=>{for(const [c,adj] of Object.entries(DEMO_ADJUST)){
  const price=DEMO_BASE[s.id]+adj+(s.id==='cps'&&c==='Bạc'?250000:0);
  arr.push({storeId:s.id,storeName:s.name,title:currentPhone.name+' '+capacity+' '+c,price,
   capacity:capacity||'256GB',color:c,condition:s.id==='ddm'?'import':'vn',stock:'unknown',source:'demo',url:'',checkedAt:null});
 }});return arr;}
function loadDemo(){allOffers=demoOffers();loaded=true;loading=false;checkedAt=null;renderFilters();renderAll();}
async function loadLive(force=false){if(!currentPhone)return;
 if(STANDALONE){allOffers=[];loaded=true;loading=false;checkedAt=null;renderFilters();renderAll();return;}const seq=++searchSeq;loading=true;loaded=false;renderState('loading');
 try{const res=await fetch('/api/compare?q='+eurl(currentPhone.name)+'&condition=all'+(force?'&refresh=1':''));const data=await res.json();if(seq!==searchSeq)return;
  if(!res.ok)throw Error(data.error||'Không nhận được kết quả');allOffers=data.offers||[];checkedAt=data.checkedAt;loaded=true;loading=false;renderShopLinks(currentPhone.name,allOffers);renderFilters();renderAll();
  if(!data.offers?.length)toast('Chưa xác minh được giá từ nguồn. Không hiển thị giá ước đoán.');
 }catch(e){if(seq!==searchSeq)return;loading=false;loaded=true;allOffers=[];checkedAt=null;renderFilters();renderAll();renderState('error',e.message);}}
function filteredOffers(){const filtered=allOffers.filter(o=>(!capacity||o.capacity===capacity)&&(!color||o.color===color)&&(condition==='all'||o.condition===condition));
 filtered.sort((a,b)=>sort==='high'?b.price-a.price:sort==='store'?a.storeName.localeCompare(b.storeName,'vi'):a.price-b.price);return filtered;}
function renderState(state,error=''){const el=$('resultState');if(state==='loading'){
 el.innerHTML='<div class="state-loading loading"><div class="loading-row"><i class="skeleton"></i><span class="skeleton"></span><em class="skeleton"></em></div><div class="loading-row"><i class="skeleton"></i><span class="skeleton"></span><em class="skeleton"></em></div></div>';
 $('resultsContent').style.display='none';return;}
 if(state==='error'){el.innerHTML=`<div class="state-card"><span class="state-ico">!</span><div><h4>Chưa kết nối được dữ liệu giá</h4><p>${esc(error)}. Có thể một số cửa hàng chặn hệ thống đọc dữ liệu, hoặc nguồn tìm kiếm đang không truy cập được.</p><button id="retryConnection">Thử lại</button></div></div>`;return;}
 if(state==='empty'){el.innerHTML=`<div class="state-card"><span class="state-ico">⌕</span><div><h4>Chưa tìm thấy giá được xác minh</h4><p>${mode==='demo'?'Mẫu này chưa có trong bộ dữ liệu mô phỏng. Nhấn “Kiểm tra giá thực tế” để tra cứu các cửa hàng.':STANDALONE?'Bản mở ngay không có máy chủ lấy giá. Hãy dùng 7 liên kết bên dưới để kiểm tra trực tiếp tại cửa hàng.':'Không đọc được giá đúng phiên bản từ nguồn. Cửa hàng không xuất hiện không có nghĩa là hết hàng; hãy mở liên kết tìm tại cửa hàng bên dưới.'}</p><button id="emptyAction">${mode==='demo'?'Kiểm tra giá thật':'Xoá lọc màu / phiên bản'}</button></div></div>`;return;}
 el.innerHTML='';}
function renderAll(){
 const offers=filteredOffers();$('resultsContent').style.display=offers.length?'block':'none';renderState(offers.length?'ok':'empty');if(!offers.length)return;
 const asc=[...offers].sort((a,b)=>a.price-b.price),cheapest=asc[0];
 const spread=asc.length>1?asc.at(-1).price-asc[0].price:0;
 $('minPrice').textContent=vnd(cheapest.price);$('minStore').textContent=storeBy(cheapest.storeId).name+(mode==='demo'?' · MÔ PHỎNG':'');
 $('priceSpread').textContent=vnd(spread);$('storesCount').innerHTML=`${new Set(offers.map(x=>x.storeId)).size} <small>/ 7</small>`;
 $('lastUpdated').textContent=mode==='demo'?'Giá minh hoạ — không phải báo giá':'Kiểm tra: '+dateFmt(checkedAt);
 // Rank shops by their cheapest matching variant. Show all verified color prices inside each shop.
 const grouped=new Map();
 for(const offer of offers){const key=offer.storeId;
  if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(offer);
 }
 const groups=[...grouped.values()].map(variants=>({variants:variants.sort((a,b)=>a.price-b.price),best:variants[0]}));
 groups.sort((a,b)=>sort==='high'?b.best.price-a.best.price:sort==='store'?a.best.storeName.localeCompare(b.best.storeName,'vi'):a.best.price-b.best.price);
 window._visibleRankedGroups=groups;
 $('rankList').innerHTML=groups.map((group,i)=>{
 const o=group.best,store=storeBy(o.storeId),winner=o.price===cheapest.price;
 const variants=group.variants,colors=variants.filter(x=>x.color),hasVariants=variants.length>1;
 const badges=[o.capacity,hasVariants?`${new Set(colors.map(x=>x.color)).size} màu có giá`:o.color||'Màu chưa xác minh',o.condition==='vn'?'Chính hãng VN':o.condition==='import'?'Hàng quốc tế':'Chưa rõ nguồn'];
 return `<article class="rank-card ${winner?'winner':''}">${winner?'<span class="winner-tag">✦ GIÁ TỐT NHẤT</span>':''}
   <span class="rank-no">${String(i+1).padStart(2,'0')}</span><span class="store-logo ${esc(store.id)}">${esc(store.logo)}</span>
   <div class="store-info"><div class="store-title">${esc(store.name)}</div><div class="store-badges">${badges.map((b,j)=>`<span class="mini-badge ${j===1&&colors.length?'green':''}">${esc(b)}</span>`).join('')}</div></div>
   <div class="rank-pricearea"><div class="price-bar"><span style="width:${Math.min(100,Math.max(14,100*cheapest.price/o.price)).toFixed(0)}%"></span></div>
   <div class="store-pricebox"><div class="store-price">${vnd(o.price)}</div><div class="store-sub">${mode==='demo'?'Giá MÔ PHỎNG':o.stock==='in-stock'?'Có báo còn hàng · '+dateFmt(o.checkedAt):'Tồn kho chưa xác minh'}</div></div></div>
   <button class="store-buy" data-offer="${i}" title="${mode==='demo'?'Chuyển sang dữ liệu thật':'Mở trang sản phẩm ở cửa hàng'}">${mode==='demo'?'Thử giá thật':'Đến mua'} <span>↗</span></button>
   ${hasVariants?`<details class="colors-expand"><summary>↳ Xem giá ${variants.length} lựa chọn màu <span>⌄</span></summary><div class="color-price-list">${variants.map(v=>`<div><span class="color-dot" style="background:${COLORS[v.color]||'#bdcbd7'}"></span><span>${esc(v.color||'Chưa xác minh màu')}</span><strong>${vnd(v.price)}</strong>${mode!=='demo'?`<a href="${esc(v.url)}" rel="noopener noreferrer" target="_blank" class="color-open" aria-label="Mở giá tại cửa hàng">↗</a>`:''}</div>`).join('')}</div></details>`:''}
 </article>`;}).join('');
}
function setMode(next){if(STANDALONE && next==='demo')return;searchSeq++;mode=next;$('modeAlert').classList.toggle('real',mode==='live');$('modeTitle').textContent=mode==='demo'?'Đang xem dữ liệu minh hoạ':'Chế độ kiểm tra giá từ nguồn bán';
 $('modeDesc').textContent=mode==='demo'?'Giá mô phỏng chỉ để thử giao diện — không phải báo giá bán.':STANDALONE?'Bản HTML mở được ngay — tra cứu qua liên kết 7 cửa hàng; để tự động xếp giá cần khởi chạy máy chủ.':'Chỉ có giá đọc được từ nguồn mới xuất hiện. Nhấp vào các liên kết bên dưới khi cửa hàng không cho đọc giá.';
 $('modeToggle').textContent='Đang kiểm tra giá thật';$('modeToggle').classList.add('hidden');if(STANDALONE)$('modeToggle').classList.add('hidden');try{localStorage.setItem('sangia-mode',mode);}catch{}
 if(currentPhone){allOffers=[];if(mode==='demo'){loadDemo()}else loadLive();}}
function renderNew(){const latest=catalog.slice(0,21);$('newDevices').innerHTML=latest.map((p,i)=>deviceCard(p,i)).join('')||'<p>Chưa có mẫu được liệt kê.</p>';}
function renderSaved(){const phones=[...saved].map(n=>catalog.find(p=>p.name===n)||{name:n,brand:'Khác',capacities:[],colors:[]});
 $('savedDevices').innerHTML=phones.length?phones.map((p,i)=>deviceCard(p,i)).join(''):'<div class="state-card"><span class="state-ico">♡</span><div><h4>Chưa có máy nào được lưu</h4><p>Vào So sánh giá và nhấn “Lưu máy” để tạo danh sách yêu thích.</p></div></div>';}
function deviceCard(p,i){return `<article class="device-card"><div class="device-deco"></div><span class="device-tag">${i<5?'✦ MẪU ĐANG QUAN TÂM':'ĐIỆN THOẠI'}</span><h4>${esc(p.name)}</h4><p>${esc(p.brand||'Điện thoại')} · ${esc(p.capacities?.slice(0,3).join(' / ')||'Chọn để xem')}</p><button data-device="${esc(p.name)}">So giá ngay ↗</button></article>`;}
function openOffer(o){if(mode==='demo'){setMode('live');toast('Đã chuyển sang chế độ kiểm tra giá thật.');return;}
 if(!o?.url){toast('Không có đường dẫn đã xác minh.');return;}
 try{const u=new URL(o.url);if(u.protocol!=='https:'||!STORES.some(s=>u.hostname===new URL(s.home).hostname||u.hostname===new URL(s.home).hostname.replace('www.','')||u.hostname.endsWith('.'+new URL(s.home).hostname.replace('www.','')))){toast('Đường dẫn không thuộc cửa hàng đã chọn.');return;}
 window.open(u.href,'_blank','noopener,noreferrer');}catch{toast('Đường dẫn sản phẩm không hợp lệ.');}
}
function bindEvents(){
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
 document.querySelectorAll('[data-mobile-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.mobileView)));
 $('searchInput').addEventListener('input',updateSuggestions);
 $('searchInput').addEventListener('focus',()=>drawSuggestions(suggestedLocal($('searchInput').value)));
 $('searchInput').addEventListener('keydown',e=>{if(e.key==='Escape'){closeSuggestions();return;}
  if(e.key==='ArrowDown'){e.preventDefault();focused=Math.min(sugs.length-1,focused+1);}else if(e.key==='ArrowUp'){e.preventDefault();focused=Math.max(0,focused-1);}else if(e.key==='Enter'){e.preventDefault();if(focused>=0&&sugs[focused])pickSuggestion(sugs[focused]);else submitSearch();return;}else return;
  document.querySelectorAll('.suggest-row').forEach((r,i)=>{r.classList.toggle('on',i===focused);r.setAttribute('aria-selected',String(i===focused));});
 });
 document.addEventListener('click',e=>{if(!e.target.closest('#searchWrap'))closeSuggestions();});
 $('suggestions').addEventListener('click',e=>{const b=e.target.closest('[data-suggestion]');if(b)pickSuggestion(sugs[+b.dataset.suggestion]);});
 $('searchSubmit').addEventListener('click',submitSearch);$('clearSearch').addEventListener('click',()=>{$('searchInput').value='';updateSuggestions();$('searchInput').focus();});
 $('trendingChips').addEventListener('click',e=>{const b=e.target.closest('[data-phone]');if(b)selectPhone(b.dataset.phone);});
 $('sidebarBrands').addEventListener('click',e=>{const b=e.target.closest('[data-brand]');if(b){$('searchInput').value=b.dataset.brand;setView('compare');$('searchInput').focus();drawSuggestions(suggestedLocal(b.dataset.brand).filter(p=>p.type==='phone'));}});
 $('modeToggle').addEventListener('click',()=>{});
 $('savePhone').addEventListener('click',toggleSave);
 $('capacityOptions').addEventListener('click',e=>{const b=e.target.closest('[data-cap]');if(!b)return;capacity=b.dataset.cap;if(mode==='demo')allOffers=demoOffers();renderFilters();renderAll();});
 $('colorOptions').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;color=b.dataset.color;renderFilters();renderAll();});
 $('conditionFilter').addEventListener('change',e=>{condition=e.target.value;renderAll();});
 $('sortFilter').addEventListener('change',e=>{sort=e.target.value;renderAll();});
 $('rankList').addEventListener('click',e=>{const btn=e.target.closest('[data-offer]');if(btn)openOffer(window._visibleRankedGroups?.[Number(btn.dataset.offer)]?.best);});
 $('refreshBtn').addEventListener('click',()=>{if(mode==='demo'){toast('Đang dùng dữ liệu minh hoạ. Chuyển sang giá thật để cập nhật.');}else loadLive(true);});
 $('resultState').addEventListener('click',e=>{if(e.target.closest('#retryConnection'))loadLive(true);if(e.target.closest('#emptyAction')){if(mode==='demo'){setMode('live')}else{color='';condition='all';capacity='';$('conditionFilter').value=condition;renderFilters();renderAll();}}});
 ['newDevices','savedDevices'].forEach(id=>$(id).addEventListener('click',e=>{const b=e.target.closest('[data-device]');if(b)selectPhone(b.dataset.device);}));
 $('aboutBtn').addEventListener('click',()=>$('infoDialog').showModal());$('closeDialog').addEventListener('click',()=>$('infoDialog').close());$('closeDialog2').addEventListener('click',()=>$('infoDialog').close());
 $('brandLink').addEventListener('click',e=>{e.preventDefault();setView('compare');});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setView('compare');$('searchInput').focus();$('searchInput').select();}});
}
let installPrompt=null;
async function installApp(){if(STANDALONE){toast('Cần đưa website lên HTTPS để cài PWA trên điện thoại.');return;}if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;if(choice?.outcome==='accepted')toast('Ứng dụng đã được gửi yêu cầu cài đặt.');return;}
 if(/iphone|ipad|ipod/i.test(navigator.userAgent)){toast('iPhone: mở Safari → Chia sẻ → Thêm vào Màn hình chính.');}
 else{toast('Mở web qua HTTPS bằng Chrome → ⋮ → Cài đặt ứng dụng.');}}
function setupPWA(){if(STANDALONE){['installSide','installTop','installMobile'].forEach(id=>$(id)?.addEventListener('click',installApp));return;}window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
 ['installSide','installTop','installMobile'].forEach(id=>$(id)?.addEventListener('click',installApp));
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
async function boot(){drawBrands();drawTrending();bindEvents();setupPWA();try{if(STANDALONE){catalog=window.__CATALOG__||[];}else{const res=await fetch('/api/catalog');const data=await res.json();catalog=data.catalog||[];}}catch{catalog=[
  {name:'iPhone 17 Pro Max',brand:'Apple',capacities:['256GB','512GB','1TB','2TB'],colors:['Cam vũ trụ','Xanh đậm','Bạc']},
  {name:'iPhone 18 Pro Max',brand:'Apple',capacities:['256GB','512GB','1TB','2TB'],colors:[]},
  {name:'Samsung Galaxy S26 Ultra',brand:'Samsung',capacities:['256GB','512GB'],colors:[]}
 ];}
 if(STANDALONE){$('engineState').textContent='Tra cứu thủ công';}else{try{const r=await fetch('/api/health');const d=await r.json();$('engineState').textContent='Máy chủ · '+(d.discovery||'Nguồn dự phòng');}catch{$('engineState').textContent='Chưa kết nối server';}}
 setMode('live');selectPhone('iPhone 17 Pro Max');renderNew();renderSaved();
}
boot();

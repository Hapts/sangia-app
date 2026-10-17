import { STORES, BRANDS, SEEDS, catalog, clean, norm, compareBase, suggest } from './engine.mjs';
const reply = (obj,status=200) => new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const err=(error,status=400)=>reply({error},status);
export async function endpoint(kind,req){
 if(req.method!=='GET') return err('Method not allowed',405);
 const u=new URL(req.url);
 if(kind==='health') return reply({ok:true,engine:'netlify-functions',live:true,discovery:process.env.SERPER_API_KEY?'serper + seed':'bing-rss + seed',stores:STORES.map(s=>s.name),cacheMinutes:Math.max(5,Number(process.env.CACHE_MINUTES||20)),serverTime:new Date().toISOString()});
 if(kind==='shops') return reply({shops:STORES.map(s=>({id:s.id,name:s.name,home:s.home}))});
 if(kind==='catalog') return reply({catalog,brands:BRANDS});
 if(kind==='suggest') return reply(suggest(clean(u.searchParams.get('q')).slice(0,90)));
 if(kind==='product-links'){
  const q=clean(u.searchParams.get('q')).slice(0,90),entry=SEEDS[norm(q)]||{};
  return reply({query:q,shops:STORES.map(s=>({id:s.id,name:s.name,home:s.home,links:(entry[s.id]||[]).map(x=>x.url)}))});
 }
 if(kind==='compare'){
  const q=clean(u.searchParams.get('q')).slice(0,90);if(q.length<3)return err('Nhập tên điện thoại từ 3 ký tự.');
  const cap=clean(u.searchParams.get('capacity')).toUpperCase(),color=norm(u.searchParams.get('color'));
  const condition=clean(u.searchParams.get('condition'))||'all';
  try{
   const base=await compareBase(q,u.searchParams.get('refresh')==='1');
   const offers=base.offers.filter(o=>(!cap||o.capacity===cap)&&(!color||(o.color&&norm(o.color)===color))&&(condition==='all'||o.condition===condition)).sort((a,b)=>a.price-b.price);
   return reply({...base,offers,unfilteredOffers:base.offers.length,selected:{capacity:cap||null,color:color||null,condition},difference:offers.length>1?offers.at(-1).price-offers[0].price:0});
  }catch(e){return err('Không thể đồng bộ nguồn giá lúc này. '+String(e.message).slice(0,90),502)}
 }
 return err('Not found',404);
}

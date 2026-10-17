import test from 'node:test';import assert from 'node:assert/strict';
import { endpoint } from '../netlify/lib/api.mjs';
import { offersFromProduct, STORES, parsePrice } from '../netlify/lib/engine.mjs';
const request=(name,query='')=>new Request('https://sangia.example/api/'+name+query);
test('health endpoint confirms backend and seven shops',async()=>{
 const r=await endpoint('health',request('health'));const d=await r.json();assert.equal(r.status,200);assert.equal(d.engine,'netlify-functions');assert.equal(d.stores.length,7);
});
test('catalog and suggestions include iPhone and Samsung',async()=>{
 const c=await (await endpoint('catalog',request('catalog'))).json();assert(c.catalog.length>30);
 const s=await (await endpoint('suggest',request('suggest','?q=samsung'))).json();assert(s.suggestions.some(i=>i.name?.includes('Samsung')));
});
test('seed shop links are valid',async()=>{
 const d=await (await endpoint('product-links',request('product-links','?q=iPhone%2017%20Pro%20Max'))).json();assert.equal(d.shops.length,7);assert(d.shops.some(x=>x.links.length));
});
test('invalid compare query rejects',async()=>{
 const r=await endpoint('compare',request('compare','?q=i'));assert.equal(r.status,400);
});
test('sample JSON-LD extracts only valid real-price candidate with unknown color',()=>{
 const shop=STORES.find(s=>s.id==='cps');const link='https://cellphones.com.vn/iphone-17-pro-max.html';
 const html=`<h1>iPhone 17 Pro Max 256GB</h1><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"iPhone 17 Pro Max 256GB","offers":{"@type":"Offer","price":"34990000","priceCurrency":"VND","availability":"https://schema.org/InStock"}}</script>`;
 const offers=offersFromProduct(html,'iPhone 17 Pro Max 256GB',link,shop,'iPhone 17 Pro Max');
 assert.equal(offers[0].price,34990000);assert.equal(offers[0].color,null);assert.equal(offers[0].stock,'in-stock');
});
test('price parser rejects implausible and missing amounts',()=>{assert.equal(parsePrice('Không có giá'),null);assert.equal(parsePrice('99000 ₫'),null);assert.equal(parsePrice('34.990.000 ₫'),34990000);});

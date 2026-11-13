const KEY='outfiti-smart-stock-v1';
const initial={products:[{id:'OUT-001',name:'Sneaker Omni 9',color:'Blanc / Argent / Bleu',cost:330,price:450,variants:[{name:'40',stock:1},{name:'41',stock:1},{name:'42',stock:1},{name:'43',stock:1},{name:'44',stock:1},{name:'45',stock:1}]}],sales:[]};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||initial;
const $=id=>document.getElementById(id), money=n=>`${Number(n||0).toFixed(0)} DH`;
function persist(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function totalStock(p){return p.variants.reduce((s,v)=>s+v.stock,0)}
function render(){
 const today=new Date().toDateString(), todays=db.sales.filter(s=>new Date(s.date).toDateString()===today);
 $('todaySales').textContent=money(todays.reduce((s,x)=>s+x.price*x.qty,0));
 $('todayProfit').textContent=money(todays.reduce((s,x)=>s+(x.price-x.cost)*x.qty,0));
 $('stockCount').textContent=db.products.reduce((s,p)=>s+totalStock(p),0);$('productCount').textContent=db.products.length;
 $('dashProducts').innerHTML=db.products.slice(0,4).map(p=>`<div class="product"><div><b>${p.name}</b><p>${p.color} · ${totalStock(p)} unités</p></div><strong>${money(p.price)}</strong></div>`).join('')||'<div class="empty">Aucun produit.</div>';
 $('stockList').innerHTML=db.products.map(p=>`<div class="product"><div><b>${p.name}</b><p>${p.color}<br>${p.variants.map(v=>`${v.name}: ${v.stock}`).join(' · ')}<br>Achat ${money(p.cost)} / Vente ${money(p.price)}</p></div><strong>${totalStock(p)} pcs</strong></div>`).join('')||'<div class="empty">Aucun produit.</div>';
 $('saleProduct').innerHTML=db.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
 updateVariants();
 $('historyList').innerHTML=db.sales.slice().reverse().map(s=>`<div class="sale-row"><b>${s.name} · ${s.variant}</b><p>${new Date(s.date).toLocaleString('fr-FR')} · ${s.seller}</p><p>${s.qty} × ${money(s.price)} · Marge ${money((s.price-s.cost)*s.qty)}</p></div>`).join('')||'<div class="empty">Aucune vente enregistrée.</div>';
}
function updateVariants(){const p=db.products.find(x=>x.id===$('saleProduct').value)||db.products[0];$('saleVariant').innerHTML=p?p.variants.map(v=>`<option value="${v.name}" ${v.stock<1?'disabled':''}>${v.name} — stock ${v.stock}</option>`).join(''):'';$('salePrice').value=p?.price??''}
$('saleProduct').addEventListener('change',updateVariants);
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')}));
$('salePhoto').addEventListener('change',e=>{const f=e.target.files[0];if(f){const img=$('photoPreview');img.src=URL.createObjectURL(f);img.hidden=false}});
$('saveSale').addEventListener('click',()=>{const p=db.products.find(x=>x.id===$('saleProduct').value),v=p?.variants.find(x=>x.name===$('saleVariant').value),qty=Number($('saleQty').value),price=Number($('salePrice').value);if(!p||!v||qty<1||qty>v.stock||price<0){$('saleMessage').textContent='Vérifiez le produit, la quantité et le stock disponible.';return}v.stock-=qty;db.sales.push({id:Date.now(),productId:p.id,name:p.name,variant:v.name,qty,price,cost:p.cost,seller:$('seller').value,date:new Date().toISOString()});persist();$('saleMessage').textContent='Vente enregistrée. Stock mis à jour.';$('saleQty').value=1;$('photoPreview').hidden=true;$('salePhoto').value=''});
$('addProductBtn').addEventListener('click',()=>$('productDialog').showModal());
$('productForm').addEventListener('submit',e=>{if(e.submitter?.id!=='createProduct')return;e.preventDefault();const f=new FormData(e.currentTarget),variants=String(f.get('variants')).split(',').map(x=>x.trim()).filter(Boolean).map(name=>({name,stock:Number(f.get('stock'))}));db.products.push({id:'OUT-'+String(Date.now()).slice(-6),name:f.get('name'),color:f.get('color'),cost:Number(f.get('cost')),price:Number(f.get('price')),variants});persist();$('productDialog').close();e.currentTarget.reset()});
render();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));

// OUTFITI SMART STOCK — Supabase cloud version
const SUPABASE_URL = 'https://bluwgamzyetcwlwckxeq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bNlCcIud_kLQ5Cq44bVBkg_g7Z1EAHk';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null, currentProfile = null, products = [], variants = [], sales = [];
const $ = id => document.getElementById(id);
const money = n => `${Number(n || 0).toFixed(0)} DH`;
const isAdmin = () => currentProfile?.role === 'admin';
function message(id, text, error=false){ const el=$(id); el.textContent=text; el.classList.toggle('error',error); }
function switchTab(tab){ document.querySelectorAll('.tab,.panel').forEach(x=>x.classList.remove('active')); document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active'); $(tab)?.classList.add('active'); }
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
function showLoggedIn(){ $('loginView').hidden=true; $('appView').hidden=false; $('logoutBtn').hidden=false; $('userLabel').textContent=isAdmin()?'ADMIN':'VENDEUR'; $('welcomeText').textContent=`Bienvenue ${currentProfile.full_name || ''} · ${isAdmin()?'Accès administrateur':'Espace vendeur'}`; $('addProductBtn').hidden=!isAdmin(); $('profitCard').hidden=!isAdmin(); }
function showLoggedOut(){ currentUser=null; currentProfile=null; products=[];variants=[];sales=[]; $('loginView').hidden=false; $('appView').hidden=true; $('logoutBtn').hidden=true; $('userLabel').textContent='CONNEXION'; }
async function loadData(){
 $('syncTag').textContent='SYNCHRONISATION…';
 const [pRes,vRes,sRes] = await Promise.all([
   isAdmin()?client.rpc('admin_get_products'):client.from('products').select('id,name,color,selling_price,created_at'),
   client.from('variants').select('id,product_id,size,quantity'),
   isAdmin()?client.rpc('admin_get_all_sales'):client.rpc('get_my_sales')
 ]);
 for(const r of [pRes,vRes,sRes]) if(r.error) throw r.error;
products=(pRes.data||[]).map(p=>({...p,id:p.id||p.product_id}));
variants=vRes.data||[];=(sRes.data||[]).map(normalizeSale); render(); $('syncTag').textContent='CLOUD CONNECTÉ';
}
function normalizeSale(s){return {...s, name:s.product_name||s.name||'Produit', variant:s.size||s.variant||'—', qty:Number(s.quantity??s.qty??0), price:Number(s.selling_price??s.price??0), cost:Number(s.purchase_price??s.cost??0), date:s.created_at||s.date};}
function stockFor(p){return variants.filter(v=>v.product_id===p.id).reduce((n,v)=>n+Number(v.quantity||0),0)}
function render(){
 const today=new Date().toDateString(), todays=sales.filter(s=>s.date&&new Date(s.date).toDateString()===today);
 $('todaySales').textContent=money(todays.reduce((n,s)=>n+s.price*s.qty,0));
 if(isAdmin()) $('todayProfit').textContent=money(todays.reduce((n,s)=>n+(s.price-s.cost)*s.qty,0));
 $('stockCount').textContent=products.reduce((n,p)=>n+stockFor(p),0); $('productCount').textContent=products.length;
 $('dashProducts').innerHTML=products.slice(0,5).map(p=>`<div class="product"><div><b>${esc(p.name)}</b><p>${esc(p.color||'')} · ${stockFor(p)} unités</p></div><strong>${money(p.selling_price)}</strong></div>`).join('')||'<div class="empty">Aucun produit.</div>';
 $('stockList').innerHTML=products.map(p=>{const vs=variants.filter(v=>String(v.product_id)===String(p.id));return `<div class="product stock-product"><div class="stock-product-info"><b>${esc(p.name)}</b><p>${esc(p.color||'')}</p><div class="variant-list">${vs.length?vs.map(v=>`<span class="variant-chip"><b>${esc(v.size)}</b><small>${Number(v.quantity)||0} pcs</small></span>`).join(''):'<span class="no-variants">Aucune taille enregistrée</span>'}</div><p class="stock-price">${isAdmin()?`Achat ${money(p.purchase_price)} / `:''}Vente ${money(p.selling_price)}</p></div><strong>${stockFor(p)} pcs</strong></div>`}).join('')||'<div class="empty">Aucun produit.</div>';
 $('saleProduct').innerHTML=products.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.color||'')}</option>`).join(''); updateVariants();
 $('historyList').innerHTML=sales.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>`<div class="sale-row"><b>${esc(s.name)} · ${esc(s.variant)}</b><p>${s.date?new Date(s.date).toLocaleString('fr-FR'):'—'}</p><p>${s.qty} × ${money(s.price)}${isAdmin()?` · Achat ${money(s.cost)} · Marge ${money((s.price-s.cost)*s.qty)}`:''}</p></div>`).join('')||'<div class="empty">Aucune vente enregistrée.</div>';
}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updateVariants(){const selectedId=String($('saleProduct').value||'');const p=products.find(x=>String(x.id)===selectedId)||products[0];const vs=p?variants.filter(v=>String(v.product_id)===String(p.id)):[];const available=vs.filter(v=>Number(v.quantity)>0);$('saleVariant').innerHTML=available.length?available.map(v=>`<option value="${v.id}">${esc(v.size)} — stock ${Number(v.quantity)}</option>`).join(''):'<option value="">Aucune pointure disponible</option>';$('saleVariant').disabled=!available.length;$('salePrice').value='';}
$('saleProduct').addEventListener('change',updateVariants);
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();message('loginMessage','Connexion…');const {data,error}=await client.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){message('loginMessage',error.message,true);return;}try{await initSession(data.user);}catch(err){await client.auth.signOut();showLoggedOut();message('loginMessage',`Profil ou données indisponibles : ${err.message}`,true);}});
async function initSession(user){currentUser=user;const {data:profile,error}=await client.from('profiles').select('full_name,role').eq('id',user.id).single();if(error)throw error;if(!['admin','seller'].includes(profile.role))throw new Error('Rôle utilisateur non autorisé.');currentProfile=profile;showLoggedIn();await loadData();}
$('logoutBtn').addEventListener('click',async()=>{await client.auth.signOut();showLoggedOut();});
$('salePhoto').addEventListener('change',e=>{const f=e.target.files[0];if(f){const img=$('photoPreview');img.src=URL.createObjectURL(f);img.hidden=false;}});
$('saveSale').addEventListener('click',async()=>{const variantId=$('saleVariant').value,qty=Number($('saleQty').value);if(!variantId||!Number.isInteger(qty)||qty<1){message('saleMessage','Choisissez une variante et une quantité valide.',true);return;}const btn=$('saveSale');btn.disabled=true;message('saleMessage','Enregistrement de la vente…');const {error}=await client.rpc('record_sale',{p_variant_id:variantId,p_quantity:qty});btn.disabled=false;if(error){message('saleMessage',error.message,true);return;}message('saleMessage','Vente enregistrée. Le stock a été mis à jour.');$('saleQty').value=1;$('photoPreview').hidden=true;$('salePhoto').value='';try{await loadData();}catch(err){message('saleMessage',`Vente enregistrée, actualisation impossible : ${err.message}`,true);}});
$('addProductBtn').addEventListener('click',()=>{$('productMessage').textContent='';$('productDialog').showModal();});
$('cancelProduct').addEventListener('click',()=>$('productDialog').close());
$('productForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),sizes=String(f.get('variants')).split(',').map(x=>x.trim()).filter(Boolean);if(!sizes.length){message('productMessage','Ajoutez au moins une taille ou pointure.',true);return;}const payload={p_name:String(f.get('name')).trim(),p_color:String(f.get('color')).trim(),p_purchase_price:Number(f.get('cost')),p_selling_price:String(f.get('price')||'').trim()===''?null:Number(f.get('price')),,p_variants:sizes.map(size=>({size,quantity:Number(f.get('stock'))}))};const {error}=await client.rpc('admin_create_product',payload);if(error){message('productMessage',error.message,true);return;}e.currentTarget.reset();$('productDialog').close();await loadData();});
client.auth.getSession().then(async({data,error})=>{if(error)return; if(data.session){try{await initSession(data.session.user);}catch(err){await client.auth.signOut();showLoggedOut();message('loginMessage',`Erreur de chargement : ${err.message}`,true);}}});
client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')showLoggedOut();});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));

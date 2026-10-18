const $ = (s) => document.querySelector(s);
const state = { products: [], cart: {}, category: "Barchasi", map: null, marker: null, coords: null, mapAddress: "" };
const money = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n)||0) + " so‘m";
const esc = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const imageMarkup = (p, cls="product-photo") => p.image ? `<img class="${cls}" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="product-placeholder">🥟</div>`;
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600)}
function quantity(id){return state.cart[id]||0}
function total(){return state.products.reduce((sum,p)=>sum+p.price*quantity(p.id),0)}
function drawProducts(){
 const q=$("#searchInput").value.trim().toLocaleLowerCase("uz");
 const list=state.products.filter(p=>(state.category==="Barchasi"||p.category===state.category)&&(!q||`${p.name} ${p.description||""} ${p.category||""}`.toLocaleLowerCase("uz").includes(q)));
 $("#menuStatus").textContent=list.length?`${list.length} ta mazali tanlov`:"Bu bo‘limda mahsulot topilmadi.";
 $("#productGrid").innerHTML=list.map(p=>`<article class="product-card">${imageMarkup(p)}<div class="product-info"><h3 class="product-name">${esc(p.name)}</h3>${p.description?`<p class="product-description">${esc(p.description)}</p>`:""}<p class="product-price">${money(p.price)}</p><div class="product-bottom">${quantity(p.id)?`<div class="quantity-control"><button data-minus="${esc(p.id)}" aria-label="Kamaytirish">−</button><strong>${quantity(p.id)}</strong><button data-plus="${esc(p.id)}" aria-label="Ko‘paytirish">+</button></div>`:`<button class="add-button" data-add="${esc(p.id)}">+ Savatga</button>`}</div></div></article>`).join("");
}
function drawCart(){
 const items=state.products.filter(p=>quantity(p.id)>0);
 $("#cartCount").textContent=items.reduce((n,p)=>n+quantity(p.id),0);
 $("#cartItems").innerHTML=items.length?items.map(p=>`<div class="cart-row">${p.image?`<img src="${esc(p.image)}" alt="">`:`<div class="cart-thumb">🥟</div>`}<div><h4>${esc(p.name)}</h4><p>${money(p.price*quantity(p.id))}</p><div class="mini-quantity"><button data-minus="${esc(p.id)}">−</button><span>${quantity(p.id)}</span><button data-plus="${esc(p.id)}">+</button></div></div><button class="icon-button" style="width:28px;height:28px;font-size:17px" data-remove="${esc(p.id)}" aria-label="O‘chirish">×</button></div>`).join(""):`<div class="empty-state"><span>🥟</span>Savatingiz hozircha bo‘sh.<br>Yoqtirgan somsangizni tanlang!</div>`;
 $("#cartTotal").textContent=money(total());$("#checkoutTotal").textContent=money(total());
}
function change(id,delta){const p=state.products.find(x=>x.id===id);if(!p)return;state.cart[id]=Math.max(0,quantity(id)+delta);if(!state.cart[id])delete state.cart[id];drawProducts();drawCart()}
function openCart(){$("#overlay").classList.add("visible");$("#cartDrawer").classList.add("open");document.body.style.overflow="hidden";drawCart()}
function closeCart(){$("#overlay").classList.remove("visible");$("#cartDrawer").classList.remove("open");document.body.style.overflow=""}
function openCheckout(){if(!total()){toast("Avval savatga mahsulot qo‘shing.");return}closeCart();$("#checkoutModal").classList.add("show");document.body.style.overflow="hidden";$("#checkoutTotal").textContent=money(total())}
function closeCheckout(){$("#checkoutModal").classList.remove("show");document.body.style.overflow=""}
async function loadProducts(){
 try{const r=await fetch("/.netlify/functions/api");if(!r.ok)throw Error("api");const data=await r.json();state.products=Array.isArray(data.products)?data.products:[]}
 catch(e){state.products=[];$("#menuStatus").innerHTML='<div class="error-box">Menyu hozircha yuklanmadi. Sayt Netlify’ga joylanib, server funksiyalari sozlangach mahsulotlar ko‘rinadi.</div>'}
 if(!state.products.length){$("#menuStatus").textContent="Hozircha menyuga mahsulot qo‘shilmagan.";$("#productGrid").innerHTML="";return}
 drawProducts();drawCart()
}
$("#categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;state.category=b.dataset.category;document.querySelectorAll(".category").forEach(x=>x.classList.toggle("active",x===b));drawProducts()});
$("#searchInput").addEventListener("input",drawProducts);
document.addEventListener("click",e=>{const a=e.target.closest("[data-add]");const plus=e.target.closest("[data-plus]");const minus=e.target.closest("[data-minus]");const remove=e.target.closest("[data-remove]");if(a)change(a.dataset.add,1);if(plus)change(plus.dataset.plus,1);if(minus)change(minus.dataset.minus,-1);if(remove)change(remove.dataset.remove,-999)});
$("#cartShortcut").onclick=openCart;$("#navCart").onclick=openCart;$("#overlay").onclick=closeCart;document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeCart);
$("#checkoutButton").onclick=openCheckout;$("#backToCart").onclick=()=>{closeCheckout();openCart()};$("#closeCheckout").onclick=closeCheckout;
$("#openMap").onclick=()=>{closeCheckout();$("#mapModal").classList.add("show");if(!state.map){setTimeout(initMap,80)}else setTimeout(()=>state.map.invalidateSize(),100)};
$("#closeMap").onclick=()=>{$("#mapModal").classList.remove("show");$("#checkoutModal").classList.add("show")};
function initMap(){
 if(state.map||!window.L)return;
 state.map=L.map("map").setView([41.2995,69.2401],12);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(state.map);
 state.map.on("click",e=>selectPoint(e.latlng));
 if(state.coords)selectPoint(state.coords);
}
function selectPoint(latlng){
 state.coords=latlng;
 if(state.marker)state.marker.setLatLng(latlng);else state.marker=L.marker(latlng,{draggable:true}).addTo(state.map);
 state.marker.off("dragend").on("dragend",e=>selectPoint(e.target.getLatLng()));
 state.mapAddress=`Xaritadagi nuqta: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
 $("#locationHint").textContent="Manzil belgilanmoqda: "+state.mapAddress;
}
$("#useMyLocation").onclick=()=>{
 if(!navigator.geolocation){toast("Qurilmangiz joylashuvni aniqlashni qo‘llamaydi.");return}
 $("#useMyLocation").textContent="Aniqlanmoqda…";
 navigator.geolocation.getCurrentPosition(pos=>{const ll={lat:pos.coords.latitude,lng:pos.coords.longitude};if(!state.map)initMap();state.map.setView(ll,16);selectPoint(ll);$("#useMyLocation").textContent="◎ Mening joylashuvim"},()=>{toast("Joylashuvga ruxsat berilmadi. Xaritadan qo‘lda tanlang.");$("#useMyLocation").textContent="◎ Mening joylashuvim"},{enableHighAccuracy:true,timeout:10000})
};
$("#confirmLocation").onclick=()=>{
 if(!state.coords){toast("Avval xaritada joy tanlang.");return}
 const coords=`${state.coords.lat.toFixed(6)}, ${state.coords.lng.toFixed(6)}`;
 const existing=$("#addressInput").value.trim();
 $("#addressInput").value=existing?`${existing} (xarita: ${coords})`:`Xaritadagi joy: ${coords}`;
 $("#locationHint").textContent="✓ Joylashuv tanlandi: "+coords;
 $("#mapModal").classList.remove("show");$("#checkoutModal").classList.add("show");
};
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!total()){toast("Savat bo‘sh.");return}
 const f=new FormData(e.currentTarget);const btn=$("#submitOrder");btn.disabled=true;btn.textContent="Yuborilmoqda…";
 const items=state.products.filter(p=>quantity(p.id)>0).map(p=>({id:p.id,name:p.name,price:p.price,quantity:quantity(p.id)}));
 const payload={name:f.get("name").trim(),phone:f.get("phone").trim(),address:f.get("address").trim(),payment:f.get("payment"),comment:f.get("comment").trim(),items,total:total(),location:state.coords?{lat:state.coords.lat,lng:state.coords.lng}:null};
 try{const r=await fetch("/.netlify/functions/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"order",order:payload})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||"Yuborilmadi");state.cart={};drawProducts();drawCart();closeCheckout();e.currentTarget.reset();state.coords=null;state.marker=null;toast("Buyurtmangiz qabul qilindi! Rahmat.");}
 catch(err){toast(err.message==="Telegram sozlanmagan"?"Buyurtma yuborilmadi: admin Telegram sozlamalarini tekshirishi kerak.":"Buyurtma yuborilmadi. Internetni tekshirib qayta urinib ko‘ring.");}
 finally{btn.disabled=false;btn.textContent="Buyurtmani tasdiqlash"}
});
loadProducts();
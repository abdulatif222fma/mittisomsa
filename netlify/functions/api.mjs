import { getStore } from "@netlify/blobs";

const json = (body, statusCode=200) => new Response(JSON.stringify(body), {
  status: statusCode,
  headers: { "Content-Type":"application/json; charset=utf-8", "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type", "Access-Control-Allow-Methods":"GET,POST,OPTIONS" }
});
const store = () => getStore({ name:"mittisomsa-products", consistency:"strong" });
const ordersStore = () => getStore({ name:"mittisomsa-orders", consistency:"strong" });
const adminsStore = () => getStore({ name:"mittisomsa-admins", consistency:"strong" });
async function getAdminIds(){ const seeded=(process.env.ADMIN_IDS||"").split(",").map(x=>x.trim()).filter(Boolean); const st=adminsStore(); let saved=await st.get("list",{type:"json"}); if(!Array.isArray(saved)){saved=seeded; await st.setJSON("list",saved);} return [...new Set(saved.map(String))]; }
async function getProducts(){
  const s=store(); const all=await s.get("catalog",{type:"json"});
  return Array.isArray(all)?all:[];
}
async function notifyAdmins(text){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const ids=await getAdminIds();
  if(!token||!ids.length) throw new Error("Telegram sozlanmagan");
  const results=await Promise.all(ids.map(chat_id=>fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id,text,parse_mode:"HTML",disable_web_page_preview:true})
  }).then(r=>r.json())));
  if(results.some(r=>!r.ok)) throw new Error("Telegramga yuborilmadi");
}
export default async (req) => {
  const method = req.method || req.httpMethod || "GET";
  if(method==="OPTIONS") return json({ok:true});
  try{
    if(method==="GET") return json({products:await getProducts()});
    if(method!=="POST") return json({error:"Method not allowed"},405);
    const body = typeof req.json === "function" ? await req.json() : JSON.parse(req.body||"{}");
    if(body.type!=="order"||!body.order) return json({error:"Noto‘g‘ri so‘rov"},400);
    const o=body.order;
    if(!o.name||!o.phone||!o.address||!Array.isArray(o.items)||!o.items.length) return json({error:"Ma’lumotlarni to‘liq kiriting"},400);
    if(o.items.length>50||String(o.name).length>70||String(o.address).length>350) return json({error:"Ma’lumotlar hajmi noto‘g‘ri"},400);
    const id=`MS-${Date.now().toString().slice(-8)}`;
    const clean={id,name:String(o.name),phone:String(o.phone),address:String(o.address),payment:String(o.payment||"Naqd pul"),comment:String(o.comment||""),items:o.items.map(i=>({name:String(i.name).slice(0,100),quantity:Math.max(1,Math.min(99,Number(i.quantity)||1)),price:Math.max(0,Number(i.price)||0)})),total:Math.max(0,Number(o.total)||0),location:o.location&&Number.isFinite(Number(o.location.lat))&&Number.isFinite(Number(o.location.lng))?o.location:null,createdAt:new Date().toISOString()};
    const os=ordersStore();await os.setJSON(id,clean);
    const lines=clean.items.map(i=>`• ${i.name} × ${i.quantity} — ${(i.price*i.quantity).toLocaleString("uz-UZ")} so‘m`).join("\n");
    const msg=`🛍 <b>YANGI BUYURTMA — MITTISOMSA</b>\n\n🧾 Raqam: <b>${id}</b>\n👤 Ism: ${escapeHtml(clean.name)}\n📞 Telefon: ${escapeHtml(clean.phone)}\n📍 Manzil: ${escapeHtml(clean.address)}\n\n🥟 <b>Buyurtma:</b>\n${lines}\n\n💰 Jami: <b>${clean.total.toLocaleString("uz-UZ")} so‘m</b>\n💳 To‘lov: ${escapeHtml(clean.payment)}${clean.comment?`\n💬 Izoh: ${escapeHtml(clean.comment)}`:""}${clean.location?`\n🗺 Xarita: https://maps.google.com/?q=${clean.location.lat},${clean.location.lng}`:""}`;
    await notifyAdmins(msg);
    if(clean.location){
      const token=process.env.TELEGRAM_BOT_TOKEN, ids=await getAdminIds();
      await Promise.all(ids.map(chat_id=>fetch(`https://api.telegram.org/bot${token}/sendLocation`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id,latitude:clean.location.lat,longitude:clean.location.lng})})));
    }
    return json({ok:true,orderId:id});
  }catch(e){console.error(e);return json({ok:false,error:e.message==="Telegram sozlanmagan"?"Telegram sozlanmagan":"Buyurtmani yuborishda xatolik"},500)}
};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export const config = { path:"/.netlify/functions/api" };
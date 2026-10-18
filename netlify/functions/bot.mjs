import { getStore } from "@netlify/blobs";
const tg=(method,body)=>fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json());
const envAdmins=()=>String(process.env.ADMIN_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
const adminStore=()=>getStore({name:"mittisomsa-admins",consistency:"strong"});
const ordersStore=()=>getStore({name:"mittisomsa-orders",consistency:"strong"});
const productsStore=()=>getStore({name:"mittisomsa-products",consistency:"strong"});
const safe=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n).toLocaleString("uz-UZ")+" so‘m";
async function getAdmins(){const s=adminStore();let a=await s.get("list",{type:"json"});if(!Array.isArray(a)){a=envAdmins();await s.setJSON("list",a)}return [...new Set(a.map(String))]}
async function saveAdmins(a){await (await adminStore()).setJSON("list",[...new Set(a.map(String))])}
async function isAdmin(id){return (await getAdmins()).includes(String(id))}
async function getProducts(){const a=await (await productsStore()).get("catalog",{type:"json"});return Array.isArray(a)?a:[]}
async function saveProducts(a){await (await productsStore()).setJSON("catalog",a)}
async function send(chat_id,text,extra={}){return tg("sendMessage",{chat_id,text,parse_mode:"HTML",...extra})}
async function allOrders(){const s=ordersStore();const listed=await s.list();const keys=(listed.blobs||[]).map(x=>x.key);const result=[];for(const key of keys){const o=await s.get(key,{type:"json"});if(o&&o.id&&o.createdAt)result.push(o)}return result}
function localDateKey(d){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
async function report(chat,period){const orders=await allOrders();const now=new Date();const today=localDateKey(now);const month=today.slice(0,7);const picked=orders.filter(o=>{const key=localDateKey(new Date(o.createdAt));return period==="day"?key===today:key.startsWith(month)});const total=picked.reduce((n,o)=>n+(Number(o.total)||0),0);const paidCash=picked.filter(o=>o.payment==="Naqd pul").reduce((n,o)=>n+(Number(o.total)||0),0);const paidCard=picked.filter(o=>o.payment==="Karta orqali").reduce((n,o)=>n+(Number(o.total)||0),0);const title=period==="day"?`KUNLIK HISOBOT — ${today}`:`OYLIK HISOBOT — ${month}`;const recent=picked.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8).map(o=>`• ${safe(o.id)} — ${money(o.total)} (${safe(o.name)})`).join("\n");return send(chat,`📊 <b>${title}</b>\n\n🧾 Buyurtmalar: <b>${picked.length} ta</b>\n💰 Jami savdo: <b>${money(total)}</b>\n💵 Naqd pul: ${money(paidCash)}\n💳 Karta orqali tanlangan: ${money(paidCard)}${recent?`\n\n<b>So‘nggi buyurtmalar:</b>\n${recent}`:"\n\nBu davrda buyurtma yo‘q."}\n\n<i>Hisobot buyurtma tushgan jami qiymatni ko‘rsatadi; bu foyda yoki tasdiqlangan to‘lov degani emas.</i>`)}
async function main(update){
 const msg=update.message,cb=update.callback_query;
 if(cb){const who=cb.from.id,chat=cb.message.chat.id,data=cb.data||"";await tg("answerCallbackQuery",{callback_query_id:cb.id});if(!await isAdmin(who))return;if(data.startsWith("del:")){const id=data.slice(4),ps=await getProducts(),p=ps.find(x=>x.id===id);if(!p)return send(chat,"Bu mahsulot topilmadi yoki avval o‘chirilgan.");await saveProducts(ps.filter(x=>x.id!==id));return send(chat,`🗑 <b>${safe(p.name)}</b> katalogdan o‘chirildi.`)}if(data==="list")return showProducts(chat);return}
 if(!msg)return;const chat=msg.chat.id,from=msg.from?.id;
 if(!await isAdmin(from))return send(chat,"⛔ Siz admin emassiz. Administrator sizning Telegram ID raqamingizni /addadmin orqali qo‘shishi kerak.");
 const text=String(msg.text||"").trim();
 if(text==="/start"||text==="/help")return send(chat,`🥟 <b>MittiSomsa — admin panel</b>\n\n<b>Mahsulot qo‘shish:</b> rasmni oddiy Photo qilib yuboring va izohiga yozing:\n<code>Go‘shtli somsa | 1 dona | 8000</code>\nTartib: <b>nomi | seti/miqdori | narxi</b>\n\n<b>Buyruqlar:</b>\n/catalog — katalog va o‘chirish\n/addadmin 123456789 — admin qo‘shish\n/removeadmin 123456789 — adminni olib tashlash\n/admins — adminlar ro‘yxati\n/kunlik — bugungi hisobot\n/oylik — joriy oy hisoboti\n/cancel — bekor qilish\n\n⚠️ Har bir admin boshqa admin qo‘sha oladi va olib tashlay oladi.`);
 if(text==="/cancel")return send(chat,"Amal bekor qilindi. Mahsulot qo‘shish uchun rasmni caption bilan yuboring.");
 if(text==="/catalog")return showProducts(chat);
 if(text==="/kunlik"||text.startsWith("/kunlik@"))return report(chat,"day");
 if(text==="/oylik"||text.startsWith("/oylik@"))return report(chat,"month");
 if(text==="/admins")return send(chat,"👥 <b>Adminlar ro‘yxati</b>\n\n"+(await getAdmins()).map((id,i)=>`${i+1}. <code>${safe(id)}</code>`).join("\n")+"\n\nQo‘shish: <code>/addadmin ID</code>\nOlib tashlash: <code>/removeadmin ID</code>");
 const add=text.match(/^\/addadmin(?:@\w+)?\s+(\d{5,15})$/);if(add){const id=add[1],a=await getAdmins();if(a.includes(id))return send(chat,"Bu ID allaqachon admin.");a.push(id);await saveAdmins(a);await send(chat,`✅ <code>${id}</code> admin sifatida qo‘shildi. U botga /start yuborsin.`);return send(Number(id),"🥟 Siz MittiSomsa admin paneliga qo‘shildingiz. /start ni bosing.").catch(()=>{});}
 const rem=text.match(/^\/removeadmin(?:@\w+)?\s+(\d{5,15})$/);if(rem){const id=rem[1],a=await getAdmins();if(!a.includes(id))return send(chat,"Bu ID adminlar ro‘yxatida yo‘q.");if(a.length<=1)return send(chat,"Oxirgi adminni o‘chirib bo‘lmaydi.");await saveAdmins(a.filter(x=>x!==id));return send(chat,`🗑 <code>${id}</code> adminlikdan olib tashlandi.`)}
 if(msg.photo?.length){const caption=String(msg.caption||"").trim(),parts=caption.split("|").map(x=>x.trim());if(parts.length<3||!parts[0]||!parts[1]||!parts[2]||!/^[\d\s.,]+$/.test(parts[2]))return send(chat,"⚠️ Caption formati noto‘g‘ri.\n<code>Go‘shtli somsa | 1 dona | 8000</code>");const price=Number(parts[2].replace(/\s/g,"").replace(",","."));if(!Number.isFinite(price)||price<=0||price>100000000)return send(chat,"Narx noto‘g‘ri. Masalan: <code>8000</code>");const photo=msg.photo[msg.photo.length-1],file=await tg("getFile",{file_id:photo.file_id});if(!file.ok||!file.result?.file_path)return send(chat,"Rasmni olishda xatolik. Qayta yuboring.");const response=await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.result.file_path}`);if(!response.ok)return send(chat,"Rasmni yuklab bo‘lmadi.");const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>1500000)return send(chat,"Rasm 1.5 MB dan kichik bo‘lsin. Telegramda oddiy Photo sifatida yuboring.");const mime=response.headers.get("content-type")||"image/jpeg",image=`data:${mime};base64,${bytes.toString("base64")}`;const category=/ichimlik|suv|cola|fanta|pepsi|choy/i.test(parts[0])?"Ichimliklar":/set|kombo/i.test(parts[1])?"Setlar":/tovuq/i.test(parts[0])?"Tovuqli":"Go‘shtli";const p={id:`p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,name:parts[0].slice(0,90),description:parts[1].slice(0,70),price:Math.round(price),category,image,createdAt:new Date().toISOString()};const ps=await getProducts();ps.unshift(p);await saveProducts(ps);return send(chat,`✅ <b>Mahsulot saytga qo‘shildi!</b>\n\n🥟 ${safe(p.name)}\n📦 ${safe(p.description)}\n💰 ${money(p.price)}`)}
 if(text.startsWith("/"))return send(chat,"Buyruq tushunilmadi. /help ni bosing.");return send(chat,"Mahsulot qo‘shish uchun rasmni caption bilan yuboring yoki /catalog buyrug‘ini bosing.");
}
async function showProducts(chat){const ps=await getProducts();if(!ps.length)return send(chat,"Katalog bo‘sh. Mahsulot rasmini caption bilan yuboring.");await send(chat,`📋 <b>MittiSomsa katalogi</b>\nJami: ${ps.length} ta mahsulot\nO‘chirish uchun kerakli tugmani bosing.`);for(const p of ps)await send(chat,`🥟 <b>${safe(p.name)}</b>\n📦 ${safe(p.description||"—")}\n💰 ${money(p.price)}\n🆔 <code>${p.id}</code>`,{reply_markup:{inline_keyboard:[[{text:"🗑 O‘chirish: "+p.name.slice(0,35),callback_data:"del:"+p.id}]]}})}
export default async req=>{
  const method = req.method || req.httpMethod || "GET";
  if(method!=="POST") return new Response("MittiSomsa bot webhook ishlayapti.", {status:200, headers:{"Content-Type":"text/plain; charset=utf-8"}});
  try {
    const update = typeof req.json === "function" ? await req.json() : JSON.parse(req.body||"{}");
    await main(update);
    return new Response("ok", {status:200});
  } catch(e) {
    console.error("Bot webhook error",e);
    return new Response("ok", {status:200});
  }
};
export const config={path:"/.netlify/functions/bot"};

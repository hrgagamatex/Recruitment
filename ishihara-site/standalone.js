import {mountIshihara} from './ishihara.js';
const cfg=window.APP_CONFIG;
const back=new URL('/#/quiz/ishihara/all',cfg.recruitmentOrigin);
const instructions=new URL('/#/instructions/ishihara',cfg.recruitmentOrigin);
document.querySelector('#returnRecruitment').href=instructions.href;
const app=document.querySelector('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layout=html=>{app.innerHTML=`<section class="card page-card participant-window"><div class="window-bar"><small>RECRUITMENT · GARUDA MAS SEMESTA</small><b>TES PENGLIHATAN WARNA</b></div><div class="window-body">${html}</div></section>`;};
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
async function call(name,params){const {data,error}=await db.rpc(name,params);if(error)throw error;return data;}
let dispose;
async function start(){
 const code=new URLSearchParams(location.hash.slice(1)).get('code');
 let access=sessionStorage.getItem('ishihara_access');
 if(code){
  // Clear the one-use code before external resource requests/navigation.
  history.replaceState(null,'',location.pathname);
  access=await call('exchange_ishihara_handoff',{p_code:code});
  sessionStorage.setItem('ishihara_access',access);
 }
 if(!access)throw new Error('Buka tes ini melalui tombol Mulai Tes di halaman recruitment.');
 const rpc=(name,params)=>{
  const {p_session_token,...rest}=params;
  if(name==='ishihara_session')return call('ishihara_external_session',{...rest,p_access_token:access});
  if(name==='save_ishihara_answers')return call('save_ishihara_external_answers',{...rest,p_access_token:access});
  throw new Error('Fungsi tes tidak dikenal');
 };
 dispose=await mountIshihara({rpc,token:access,layout,onComplete:()=>{sessionStorage.removeItem('ishihara_access');location.replace(back.href);}});
}
start().catch(error=>layout(`<h2>Tes belum dapat dibuka</h2><p>${escape(error.message)}</p><a class="btn btn-primary" href="${instructions.href}">Kembali ke recruitment</a>`));
window.addEventListener('pagehide',()=>dispose?.());

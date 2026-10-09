import {mountIshihara} from './ishihara.js?v=20261009-direct';
const cfg=window.APP_CONFIG;
const back=new URL('/#/quiz/ishihara/all',cfg.recruitmentOrigin);

const app=document.querySelector('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layout=html=>{app.innerHTML=`<section class="card page-card participant-window"><div class="window-bar"><small>RECRUITMENT · GARUDA MAS SEMESTA</small><b>TES PENGLIHATAN WARNA</b></div><div class="window-body">${html}</div></section>`;};
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
async function call(name,params){const {data,error}=await db.rpc(name,params);if(error)throw error;return data;}
let dispose;
function login(){
 layout(`<div class="ishihara-entry"><span class="eyebrow">GAMATEX</span><h1>Tes Penglihatan Warna</h1><form id="identityForm"><div class="field"><label for="fullName">Nama lengkap</label><input id="fullName" name="full_name" autocomplete="name" required maxlength="150"></div><div class="field"><label for="nik">NIK</label><input id="nik" name="nik" inputmode="numeric" pattern="[0-9]{16}" maxlength="16" required autocomplete="off"></div><p id="entryError" role="alert"></p><button type="submit" class="btn btn-primary">Mulai Tes</button></form></div>`);
 document.querySelector('#identityForm').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');
  button.disabled=true;button.textContent='Memulai tes…';
  try{
   const fields=new FormData(form),name=fields.get('full_name').trim();
   if(!name)throw new Error('Isi nama lengkap.');
   const data=await call('start_candidate_session',{p_full_name:name,p_nik:fields.get('nik')});
   const candidate=Array.isArray(data)?data[0]:data;
   if(!candidate?.session_token)throw new Error('Sesi peserta tidak tersedia.');
   const code=await call('create_ishihara_handoff',{p_session_token:candidate.session_token});
   const access=await call('exchange_ishihara_handoff',{p_code:code});
   sessionStorage.setItem('ishihara_access',access);
   sessionStorage.setItem('ishihara_mode','standalone');
   await start();
  }catch(error){login();document.querySelector('#entryError').textContent=error.message;}
 };
}
function finished(){
 const direct=sessionStorage.getItem('ishihara_mode')==='standalone';
 sessionStorage.removeItem('ishihara_access');sessionStorage.removeItem('ishihara_mode');
 if(!direct){location.replace(back.href);return;}
 layout('<div class="ishihara-entry"><h2>Tes selesai</h2><p>Terima kasih. Jawaban Anda sudah tersimpan.</p></div>');
}
async function start(){
 const code=new URLSearchParams(location.hash.slice(1)).get('code');
 let access=sessionStorage.getItem('ishihara_access');
 if(code){
  // Clear the one-use code before external resource requests/navigation.
  history.replaceState(null,'',location.pathname);
  access=await call('exchange_ishihara_handoff',{p_code:code});
  sessionStorage.setItem('ishihara_access',access);
  sessionStorage.setItem('ishihara_mode','recruitment');
 }
 if(!access){login();return;}
 const rpc=(name,params)=>{
  const {p_session_token,...rest}=params;
  if(name==='ishihara_session')return call('ishihara_external_session',{...rest,p_access_token:access});
  if(name==='save_ishihara_answers')return call('save_ishihara_external_answers',{...rest,p_access_token:access});
  throw new Error('Fungsi tes tidak dikenal');
 };
 dispose=await mountIshihara({rpc,token:access,layout,onComplete:finished,finishLabel:'Selesai'});
}
start().catch(error=>{sessionStorage.removeItem('ishihara_access');login();document.querySelector('#entryError').textContent=error.message;});
window.addEventListener('pagehide',()=>dispose?.());

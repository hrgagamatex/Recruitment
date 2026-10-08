export async function mountIshihara({rpc,token,layout,onComplete,isCurrent=()=>true}){
  layout('<p role="status">Memuat sesi tes penglihatan warna…</p>');
  let state=await rpc('ishihara_session',{p_session_token:token,p_start:true});
  if(!isCurrent())return ()=>{};
  if(state.status==='completed'){await onComplete();return ()=>{};}
  layout('<p id="ishiharaLoading" role="status">Memuat pelat tes…</p><p id="ishiharaTimer" role="timer"></p><iframe id="ishiharaFrame" title="Tes penglihatan warna" style="width:100%;height:1000px;border:0;background:transparent"></iframe>');
  const frame=document.querySelector('#ishiharaFrame');
  let busy=false,disposed=false,advancing=false;
  const complete=async()=>{if(advancing||disposed||!isCurrent())return;advancing=true;try{await onComplete();}catch(error){advancing=false;throw error;}};
  const offset=Date.parse(state.server_now)-Date.now();
  const deadline=state.deadline_at?Date.parse(state.deadline_at):null;
  const timer=setInterval(async()=>{
    if(disposed||!isCurrent())return;
    const label=document.querySelector('#ishiharaTimer');
    if(deadline===null){if(label)label.textContent='Tanpa batas waktu';return;}
    const remaining=Math.max(0,Math.ceil((deadline-Date.now()-offset)/1000));
    if(label)label.textContent='Sisa waktu '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
    if(remaining===0&&!busy&&!advancing){
      busy=true;
      try{state=await rpc('ishihara_session',{p_session_token:token,p_start:false});if(state.status==='completed')await complete();}
      catch{if(label)label.textContent='Waktu habis. Memeriksa penyimpanan…';}
      finally{busy=false;}
    }
  },1000);
  const loadingTimeout=setTimeout(()=>{
    const label=document.querySelector('#ishiharaLoading');
    if(label)label.textContent='Pelat tes belum dapat dimuat. Muat ulang halaman atau hubungi HR.';
  },15000);
  const listener=async event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||!isCurrent())return;
    const m=event.data;
    if(m?.type==='ishihara-ready'){
      clearTimeout(loadingTimeout);
      const label=document.querySelector('#ishiharaLoading');if(label)label.remove();
      frame.contentWindow.postMessage({type:'ishihara-init',answers:state.answers||Array(34).fill(null)},location.origin);
    }
    if(m?.type==='ishihara-height')frame.style.height=Math.min(5000,Math.max(600,Number(m.height)||1000))+'px';
    if(m?.type==='ishihara-complete'&&state.status==='completed')await complete();
    if(m?.type==='ishihara-save'){
      if(busy){frame.contentWindow.postMessage({type:'ishihara-ack',id:m.id,error:'Penyimpanan sedang berlangsung.'},location.origin);return;}
      busy=true;
      try{state=await rpc('save_ishihara_answers',{p_session_token:token,p_answers:m.answers,p_revision:state.revision,p_finish:!!m.finish});if(disposed)return;frame.contentWindow.postMessage({type:'ishihara-ack',id:m.id},location.origin);if(state.status==='completed'&&!m.finish)await complete();}
      catch(error){frame.contentWindow.postMessage({type:'ishihara-ack',id:m.id,error:error.message},location.origin);}
      finally{busy=false;}
    }
  };
  window.addEventListener('message',listener);
  // Attach the listener before navigation so a cached frame cannot race readiness.
  frame.src='ishihara-frame.html?v=20261008';
  return ()=>{disposed=true;clearTimeout(loadingTimeout);clearInterval(timer);window.removeEventListener('message',listener);};
}

export function renderIshiharaResult(attempt,rows){
  if(!attempt)return '<p>Peserta belum memulai tes ini.</p>';
  const keys=['9','6','8','3','5','2','7','4','1','0','6','3','8','2','5','7','4','9','3','6','2','5'];
  const answers=Array.from({length:34},(_,i)=>rows.find(r=>r.question_number===i+1)?.answer);
  const correct=keys.filter((k,i)=>answers[i]?.choice===k).length;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return '<h3>Skrining Penglihatan Warna</h3><p>Hasil deskriptif dari pelat digital demonstrasi; bukan diagnosis, klasifikasi klinis, atau dasar tunggal keputusan rekrutmen. Layar dan pencahayaan memengaruhi hasil.</p>'+
    '<p>Angka sesuai: '+correct+'/22. Jawaban jalur tersimpan: '+answers.slice(22).filter(Boolean).length+'/12.</p>'+
    '<table><thead><tr><th>Pelat</th><th>Jawaban / ketepatan</th></tr></thead><tbody>'+
    answers.map((a,i)=>'<tr><td>'+ (i<22?'Angka '+(i+1):'Jalur '+(i-21))+'</td><td>'+esc(i<22?a?.choice:(a?Math.round(Number(a.accuracy||0)*100)+'% dalam koridor; cakupan '+Math.round(Number(a.coverage||0)*100)+'%':''))+'</td></tr>').join('')+'</tbody></table>';
}

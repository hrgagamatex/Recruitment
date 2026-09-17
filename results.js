import {names,escapeHtml as e,scorePapi,scoreDisc,scoreTiu,mapPersonality} from './scoring.js';
import {papiChart,discChart,papiOrder,papiLabels} from './results-charts.js';
import {scoreMbti} from './mbti.js';
const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(v=>`<th>${e(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export function renderResult(code,attempt,rows,config){
 if(!attempt)return '<p class="notice">Peserta belum memulai tes ini.</p>';
 const total={test1:90,test2:24,tiu5:30,tiu6:40,mbti:70}[code];
 let values,issues=[];
 if(code.startsWith('test'))({values,issues}=mapPersonality(code,attempt,rows,config));
 else values=Array.from({length:total},(_,i)=>{const v=rows.find(r=>r.question_number===i+1)?.answer?.choice;return code==='tiu5'?(Number.isInteger(v)&&v>=1&&v<=5?v:null):(['B','S'].includes(v)?v:null);});
 let html=`<h3>${e(names[code])}</h3><p>${attempt.status==='completed'?'Selesai':'Dalam pengerjaan'} · ${values.filter(v=>v!==null).length}/${total} terisi</p>`;
 if(issues.length)html+=`<p class="notice">Soal ${issues.join(', ')} tidak cocok dengan versi acuan. Grafik belum dihitung; jawaban asli tersedia di bawah.</p>`;
 else if(values.every(v=>v===null))html+='<p class="notice">Belum ada jawaban untuk dihitung.</p>';
 else if(code==='test1'){
  const result=scorePapi(values,config.papi);
  html+=`<div class="papi-wrap">${papiChart(result.chart)}</div><p class="muted">Skala 0–9. Arah sumbu K dan Z dibalik mengikuti grafik Excel. Nilai tabel memakai skor aspek.</p>`;
  if(result.answered<90)html+='<p class="notice">Hasil sementara: jawaban belum lengkap.</p>';
  html+=table(['Aspek','Nilai','Uraian dari Excel'],papiOrder.map(k=>[`${k} — ${papiLabels[k]}`,result.raw[k],config.papi.descriptions[k][result.raw[k]].filter(v=>v&&v!==0).join(' ')]));
 }else if(code==='test2'){
  const r=scoreDisc(values,config.disc),titles=['Grafik I — Paling (P)','Grafik II — Kurang (K)','Grafik III — Selisih (P−K)'];
  html+=`<div class="disc-charts">${['most','least','difference'].map((line,i)=>discChart(r.scaled[line],titles[i])).join('')}</div>`;
  if(r.answered<24)html+='<p class="notice">Hasil sementara: kelompok jawaban belum lengkap.</p>';
  html+=table(['Hitungan','D','I','S','C','Netral (*)'],Object.entries(r.raw).map(([k,v],i)=>[titles[i],...Array.from('DISC',c=>v[c]),v['*']??'']));
  html+=['most','least','difference'].map((line,i)=>{const p=r.profiles[line];return `<section class="profile-note"><h4>${titles[i]} · ${e(p?.code||'Profil tidak tersedia dalam tabel')}</h4><p>${e(p?.name||'')}</p><p>${e(p?.description.filter(x=>typeof x==='string'&&x.trim()).join(' · ')||'')}</p></section>`;}).join('');
 }else if(code==='mbti'){
  const r=scoreMbti(values);
  html+=`<div class="mbti-result-head"><div class="mbti-type">${e(r.type)}</div><div><strong>Profil MBTI</strong><p>${r.answered}/70 soal terjawab</p></div></div><div class="mbti-bars">${[['E','I'],['S','N'],['T','F'],['J','P']].map(([a,b])=>`<div class="mbti-dimension"><div><b>${a}</b><span>${r.counts[a]}</span></div><div><b>${b}</b><span>${r.counts[b]}</span></div></div>`).join('')}</div><div class="profile-note"><h4>Uraian</h4><p>${e(r.description)}</p></div>`;
  html+=table(['Nomor','Jawaban'],values.map((v,i)=>[i+1,v===0?'A':v===1?'B':'']));
 }else{
  const r=scoreTiu(values,config[code]);
  html+=`<div class="result-stats"><div><strong>${r.correct}/${total}</strong><span>Jawaban benar</span></div><div><strong>${r.wrong}</strong><span>Salah</span></div><div><strong>${r.blank}</strong><span>Kosong</span></div></div><p><b>${r.categories.map(e).join(' / ')}</b></p>${r.categories.length>1?'<p class="notice">Skor ini tercantum dalam dua rentang kategori pada file acuan.</p>':''}<div class="score-scale" aria-label="Skala skor">${config[code].ranges.map(x=>`<div class="${r.categories.includes(x.label)?'selected':''}"><b>${e(x.label)}</b><span>${x.min}–${x.max}</span></div>`).join('')}</div><div class="progress" aria-label="Jawaban benar ${r.correct} dari ${total}"><span style="width:${100*r.correct/total}%"></span></div>`;
  html+=table(['Nomor','Jawaban','Kunci','Hasil'],values.map((v,i)=>[code==='tiu6'?`${Math.floor(i/5)+1}.${i%5+1}`:i+1,v??'',config[code].keys[i],v===null?'Kosong':v===config[code].keys[i]?'Benar':'Salah']));
 }
 if(code.startsWith('test'))html+=`<details><summary>Daftar jawaban peserta</summary>${table(code==='test1'?['Nomor','Pilihan']:['Nomor','Paling','Kurang'],Array.from({length:total},(_,i)=>{const a=rows.find(r=>r.question_number===i+1)?.answer;return code==='test1'?[i+1,Number.isInteger(a?.choice)?a.choice+1:'']:[i+1,Number.isInteger(a?.most)?a.most+1:'',Number.isInteger(a?.least)?a.least+1:''];}))}</details>`;
 return html;
}
export async function mountResults({db,shell}){
 shell('results','<h2>Hasil Tes</h2><p>Memuat daftar peserta…</p>');
 try{
  const [c,s]=await Promise.all([db.from('candidates').select('id,full_name,position,created_at').order('full_name'),db.from('scoring_config').select('config').eq('id','excel-2026-09-17').single()]);
  if(c.error)throw c.error;if(s.error)throw s.error;
  if(!location.hash.includes('/admin/'))return;
  shell('results',`<h2>Hasil Tes</h2><div class="field"><label for="resultCandidate">Pilih peserta</label><select id="resultCandidate"><option value="">Pilih nama peserta</option>${c.data.map(p=>`<option value="${e(p.id)}">${e(p.full_name)} — ${e(p.position||'Belum ada posisi')} · ${e(p.created_at.slice(0,10))}</option>`).join('')}</select></div><div class="segmented results-tabs" role="tablist">${Object.entries(names).map(([code,name],i)=>`<button type="button" role="tab" aria-selected="${i===0}" data-test="${code}" class="${i===0?'active':''}">${name}</button>`).join('')}</div><div id="resultContent"><p>Pilih peserta untuk melihat hasil pengerjaan.</p></div>`);
  let attempts=[],answers=[],code='test1',request=0;
  const panel=document.querySelector('#resultContent'),select=document.querySelector('#resultCandidate');
  const paint=()=>{if(!select.value){panel.innerHTML='<p>Pilih peserta untuk melihat hasil pengerjaan.</p>';return;}const a=attempts.find(a=>a.test_code===code),rows=answers.filter(r=>r.attempt_id===a?.id);panel.innerHTML=renderResult(code,a,rows,s.data.config);if(a){const b=document.createElement('button');b.className='btn btn-secondary';b.textContent='Unduh jawaban CSV';b.onclick=()=>{const total={test1:90,test2:24,tiu5:30,tiu6:40,mbti:70}[code];const text='\uFEFFnomor,jawaban,paling,kurang,habis_waktu\r\n'+Array.from({length:total},(_,i)=>{const r=rows.find(x=>x.question_number===i+1),v=r?.answer;return [i+1,code==='test1'?(Number.isInteger(v?.choice)?v.choice+1:''):v?.choice??'',Number.isInteger(v?.most)?v.most+1:'',Number.isInteger(v?.least)?v.least+1:'',r?.timed_out?'Ya':''].join(',');}).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`${code}-${a.id}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};panel.prepend(b);}};
  document.querySelectorAll('.results-tabs button').forEach(b=>b.onclick=()=>{code=b.dataset.test;document.querySelectorAll('.results-tabs button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});paint();});
  select.onchange=async()=>{const n=++request;attempts=[];answers=[];if(!select.value)return paint();panel.innerHTML='<p>Memuat jawaban…</p>';try{const a=await db.from('test_attempts').select('*').eq('candidate_id',select.value);if(a.error)throw a.error;const b=a.data.length?await db.from('test_answers').select('*').in('attempt_id',a.data.map(x=>x.id)):{data:[]};if(b.error)throw b.error;if(n!==request)return;attempts=a.data;answers=b.data;paint();}catch(err){if(n===request)panel.innerHTML=`<p class="notice">${e(err.message)}</p>`;}};
 }catch(err){shell('results',`<h2>Hasil Tes belum tersedia</h2><p>${e(err.message)}</p><p>Pastikan update-05-results.sql sudah dipasang dan akun memiliki akses HR.</p>`);}
}

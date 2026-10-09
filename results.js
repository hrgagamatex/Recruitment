import {renderIshiharaResult} from './ishihara.js?v=20261001';
import {names,escapeHtml as e,scorePapi,scoreDisc,scoreTiu,scoreWpt,mapPersonality} from './scoring.js?v=20261008-personality';
import {papiChart,discChart,papiOrder,papiLabels} from './results-charts.js';
import {discProfileDetail} from './disc-job-match.js?v=20260923-job-match';
import {scoreMbti} from './mbti.js';
const table=(heads,rows,className='')=>`<div class="table-wrap ${className}"><table><thead><tr>${heads.map(v=>`<th>${e(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
names.ishihara='Skrining Penglihatan Warna';
export function renderResult(code,attempt,rows,config){
 try{return renderResultContent(code,attempt,rows,config);}
 catch(error){return `<h3>${e(names[code]||code)}</h3><p class="notice">Hasil sesi ini belum dapat dihitung: ${e(error.message)}. Hasil sesi lain tetap tersedia.</p>${table(['Nomor','Jawaban tersimpan'],(rows||[]).map(r=>[r.question_number,JSON.stringify(r.answer??null)]))}`;}
}
function renderResultContent(code,attempt,rows,config){
 if(code==='ishihara')return renderIshiharaResult(attempt,rows);
 if(!attempt)return '<p class="notice">Peserta belum memulai tes ini.</p>';
 const total={test1:90,test2:24,tiu5:30,tiu6:40,mbti:70,wpt:50,ishihara:34}[code];
 let values,issues=[];
 if(code.startsWith('test'))({values,issues}=mapPersonality(code,attempt,rows,config));
 else if(code==='mbti')values=Array.from({length:total},(_,i)=>{const v=rows.find(r=>r.question_number===i+1)?.answer?.choice;return Number.isInteger(v)?v:null;});
 else if(code==='wpt')values=Array.from({length:total},(_,i)=>rows.find(r=>r.question_number===i+1)?.answer??null);
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
  const r=scoreDisc(values,config.disc),titles=['Grafik I — Paling (P)','Grafik II — Kurang (K)','Grafik III — Selisih (P−K)'],contexts=['Kepribadian Saat di Publik','Kepribadian Saat Mendapat Tekanan','Kepribadian Asli / Sesungguhnya'];
  html+=`<div class="disc-charts">${['most','least','difference'].map((line,i)=>discChart(r.scaled[line],titles[i])).join('')}</div>`;
  if(r.answered<24)html+='<p class="notice">Hasil sementara: kelompok jawaban belum lengkap.</p>';
  html+=table(['Hitungan','D','I','S','C','Netral (*)'],Object.entries(r.raw).map(([k,v],i)=>[titles[i],...Array.from('DISC',c=>v[c]),v['*']??'']));
  html+=['most','least','difference'].map((line,i)=>{const p=r.profiles[line],traits=p?.description?.filter(x=>typeof x==='string'&&x.trim())||[];return `<section class="profile-note disc-profile-note"><small>${e(contexts[i])}</small><h4>${e(p?.code||'Profil tidak tersedia dalam tabel')} · ${e(p?.name||'')}</h4>${traits.length?`<div class="disc-traits">${traits.map(x=>`<span>${e(x)}</span>`).join('')}</div>`:'<p>Profil belum dapat dipetakan.</p>'}</section>`;}).join('');
  const naturalProfile=r.profiles.difference,detail=discProfileDetail(naturalProfile);
  if(detail)html+=`<section class="disc-job-result"><div class="disc-job-heading"><span>Hasil berdasarkan Grafik III</span><h4>${e(detail.excelCode)} · ${e(detail.name)}</h4></div><div class="disc-job-grid"><article><h5>Deskripsi Kepribadian</h5><p>${e(detail.narrative)}</p></article><article><h5>Job Match</h5><p>${e(detail.jobMatch)}</p></article></div></section>`;
  else html+='<p class="notice">Job Match belum dapat ditampilkan karena profil kepribadian asli belum berhasil dipetakan.</p>';
 }else if(code==='mbti'){
  const r=scoreMbti(values);
  html+=`<div class="mbti-summary"><div class="mbti-type">${e(r.type)}</div><div><strong>Tipe Kepribadian MBTI</strong><p>${e(r.description||'')}</p></div></div><div class="mbti-bars">${[['E','I'],['S','N'],['T','F'],['J','P']].map(([a,b])=>`<div class="mbti-dimension"><div><b>${a}</b><span>${r.counts[a]}</span></div><div><b>${b}</b><span>${r.counts[b]}</span></div></div>`).join('')}</div>`;
 }else if(code==='wpt'){
  const r=scoreWpt(values,config.wpt||{});
  html+=`<div class="result-stats"><div><strong>${r.correct}/50</strong><span>Jawaban benar</span></div><div><strong>${r.points}</strong><span>Skor WPT</span></div><div><strong>${r.blank}</strong><span>Kosong</span></div></div><p><b>${e(r.category?.label||'Kategori belum tersedia')}</b></p>`;
  if(!r.ready)html+='<p class="notice">Kunci jawaban WPT belum lengkap sehingga skor belum final.</p>';
  html+=table(['Nomor','Jawaban','Hasil'],r.details.map(x=>[x.number,x.value??'',x.value===null?'Kosong':x.correct?'Benar':'Salah']),'result-answer-table');
 }else{
  const r=scoreTiu(values,config[code]);
  html+=`<div class="result-stats"><div><strong>${r.correct}/${total}</strong><span>Jawaban benar</span></div><div><strong>${r.wrong}</strong><span>Salah</span></div><div><strong>${r.blank}</strong><span>Kosong</span></div></div><p><b>${r.categories.map(e).join(' / ')}</b></p>${r.categories.length>1?'<p class="notice">Skor ini tercantum dalam dua rentang kategori pada file acuan.</p>':''}<div class="score-scale" aria-label="Skala skor">${config[code].ranges.map(x=>`<div class="${r.categories.includes(x.label)?'selected':''}"><b>${e(x.label)}</b><span>${x.min}–${x.max}</span></div>`).join('')}</div><div class="progress" aria-label="Jawaban benar ${r.correct} dari ${total}"><span style="width:${100*r.correct/total}%"></span></div>`;
  html+=table(['Nomor','Jawaban','Kunci','Hasil'],values.map((v,i)=>[code==='tiu6'?`${Math.floor(i/5)+1}.${i%5+1}`:i+1,v??'',config[code].keys[i],v===null?'Kosong':v===config[code].keys[i]?'Benar':'Salah']),'result-answer-table');
 }
 if(code.startsWith('test'))html+=`<details><summary>Daftar jawaban peserta</summary>${table(code==='test1'?['Nomor','Pilihan']:['Nomor','Paling','Kurang'],Array.from({length:total},(_,i)=>{const a=rows.find(r=>r.question_number===i+1)?.answer;return code==='test1'?[i+1,Number.isInteger(a?.choice)?a.choice+1:'']:[i+1,Number.isInteger(a?.most)?a.most+1:'',Number.isInteger(a?.least)?a.least+1:''];}))}</details>`;
 return html;
}

export function printResultReport(candidate,items,config,options={}){
 const ready=(items||[]).map(item=>({code:item.code,attempt:item.attempt||item.a,rows:item.rows||[]})).filter(item=>item.attempt);
 if(!ready.length)return false;
 const win=window.open('','_blank','width=1100,height=820');
 if(!win)return false;
 const identity=[['Nama',candidate?.full_name],['NIK',candidate?.nik],['Posisi',candidate?.position],['Tanggal',candidate?.created_at?new Date(candidate.created_at).toLocaleDateString('id-ID'):'-']];
 const applicationSource={...(candidate?.application||{}),...(candidate||{})};
 const applicationFields=[
  ['full_name','Nama lengkap'],['position','Posisi yang dilamar'],['birth_place_date','Tempat & tanggal lahir'],['gender','Jenis kelamin'],
  ['marital_status','Status perkawinan'],['religion','Agama'],['email','Alamat email'],['social_media','Akun media sosial'],
  ['height','Tinggi badan (cm)'],['weight','Berat badan (kg)'],['glasses','Berkacamata'],['medical_history','Riwayat penyakit yang pernah diderita'],
  ['ktp_address','Alamat sesuai KTP',true],['current_address','Alamat tempat tinggal',true],['education','Riwayat pendidikan',true],
  ['training','Pelatihan yang pernah diikuti',true],['experience','Pengalaman kerja',true],['special_skills','Keahlian khusus',true],
  ['strengths','Kelebihan',true],['weaknesses','Kekurangan',true],['motivation','Motivasi',true]
 ];
 const applicationSection=options.includeApplication?`<section class="application-report"><h2>Formulir Aplikasi Peserta</h2><div class="application-grid">${applicationFields.map(([key,label,wide])=>`<div class="${wide?'wide':''}"><small>${e(label)}</small><strong>${e(applicationSource[key]||'-')}</strong></div>`).join('')}</div></section>`:'';
 const sections=ready.map(item=>`<section class="report-test">${renderResult(item.code,item.attempt,item.rows,config)}</section>`).join('');
 win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hasil Tes - ${e(candidate?.full_name||'Peserta')}</title><link rel="stylesheet" href="result-report.css?v=20261009-compact-disc"></head><body><main class="report-page"><header class="report-head"><div><h1>PT. GARUDA MAS SEMESTA</h1><p>${options.includeApplication?'FORMULIR APLIKASI & HASIL TES RECRUITMENT':'HASIL TES RECRUITMENT'}</p></div><small>Dokumen HRGA</small></header><div class="report-meta">${identity.map(([label,value])=>`<div><small>${e(label)}</small><strong>${e(value||'-')}</strong></div>`).join('')}</div>${applicationSection}${sections}<button class="no-print" id="printReport">Print / Simpan PDF</button></main></body></html>`);
 win.document.close();
 const print=()=>{win.focus();win.print();};
 const button=win.document.querySelector("#printReport");if(button)button.onclick=print;
 // Wait for report CSS and fonts instead of racing a fixed 500ms timer.
 const loaded=()=>{const fonts=win.document.fonts?.ready||Promise.resolve();fonts.then(()=>{if(!win.closed)print();});};
 if(win.document.readyState==="complete")loaded();else win.addEventListener("load",loaded,{once:true});
 return true;
}
export async function mountResults({db,shell}){
 shell('results','<h2>Hasil Tes</h2><p>Memuat daftar peserta…</p>');
 try{
  const [c,s]=await Promise.all([db.from('candidates').select('*').order('full_name'),db.from('scoring_config').select('config').eq('id','excel-2026-09-17').single()]);
  if(c.error)throw c.error;if(s.error)throw s.error;
  if(!location.hash.includes('/admin/'))return;
  shell('results',`<h2>Hasil Tes</h2><div class="field"><label for="resultCandidate">Pilih peserta</label><select id="resultCandidate"><option value="">Pilih nama peserta</option>${c.data.map(p=>`<option value="${e(p.id)}">${e(p.full_name)} — ${e(p.position||'Belum ada posisi')} · ${e(p.created_at.slice(0,10))}</option>`).join('')}</select></div><div class="segmented results-tabs" role="tablist">${Object.entries(names).map(([code,name],i)=>`<button type="button" role="tab" aria-selected="${i===0}" data-test="${code}" class="${i===0?'active':''}">${name}</button>`).join('')}</div><div id="resultContent"><p>Pilih peserta untuk melihat hasil pengerjaan.</p></div>`);
  let attempts=[],answers=[],code='test1',request=0;
  const panel=document.querySelector('#resultContent'),select=document.querySelector('#resultCandidate');
  const paint=()=>{if(!select.value){panel.innerHTML='<p>Pilih peserta untuk melihat hasil pengerjaan.</p>';return;}const a=attempts.find(a=>a.test_code===code),rows=answers.filter(r=>r.attempt_id===a?.id);panel.innerHTML=renderResult(code,a,rows,s.data.config);if(a){const actions=document.createElement('div');actions.className='result-actions';const print=document.createElement('button');print.className='btn btn-primary';print.textContent='🖨 Print Hasil Tes';print.onclick=()=>{const candidate=c.data.find(x=>x.id===select.value);if(!printResultReport(candidate,[{code,attempt:a,rows}],s.data.config))alert('Izinkan pop-up browser untuk mencetak laporan.');};const b=document.createElement('button');b.className='btn btn-secondary';b.textContent='Unduh jawaban CSV';b.onclick=()=>{const total={test1:90,test2:24,tiu5:30,tiu6:40,mbti:70,wpt:50,ishihara:34}[code];const text='\uFEFFnomor,jawaban,paling,kurang,habis_waktu\r\n'+Array.from({length:total},(_,i)=>{const r=rows.find(x=>x.question_number===i+1),v=r?.answer;return [i+1,code==='test1'?(Number.isInteger(v?.choice)?v.choice+1:''):v?.choice??v?.text??(Array.isArray(v?.choices)?v.choices.join('|'):''),Number.isInteger(v?.most)?v.most+1:'',Number.isInteger(v?.least)?v.least+1:'',r?.timed_out?'Ya':''].join(',');}).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`${code}-${a.id}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};actions.append(print,b);panel.prepend(actions);}};
  document.querySelectorAll('.results-tabs button').forEach(b=>b.onclick=()=>{code=b.dataset.test;document.querySelectorAll('.results-tabs button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});paint();});
  select.onchange=async()=>{const n=++request;attempts=[];answers=[];if(!select.value)return paint();panel.innerHTML='<p>Memuat jawaban…</p>';try{const a=await db.from('test_attempts').select('*').eq('candidate_id',select.value);if(a.error)throw a.error;const b=a.data.length?await db.from('test_answers').select('*').in('attempt_id',a.data.map(x=>x.id)):{data:[]};if(b.error)throw b.error;if(n!==request)return;attempts=a.data;answers=b.data;paint();}catch(err){if(n===request)panel.innerHTML=`<p class="notice">${e(err.message)}</p>`;}};
 }catch(err){shell('results',`<h2>Hasil Tes belum tersedia</h2><p>${e(err.message)}</p><p>Pastikan update-05-results.sql sudah dipasang dan akun memiliki akses HR.</p>`);}
}

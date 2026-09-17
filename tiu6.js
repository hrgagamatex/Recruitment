export function normalizeAnswers(values) {
  if (!Array.isArray(values) || values.length !== 40 || values.some(x => x !== null && x !== 'B' && x !== 'S')) throw new Error('Data jawaban TIU 6 tidak valid.');
  return values.slice();
}

// Treat database SVG as untrusted markup; only the geometry used by this test is accepted.
export function safeSvg(source) {
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  const tags=new Set(['svg','title','defs','pattern','path','g','polygon','circle','text']);
  const attrs=new Set(['xmlns','viewBox','role','aria-labelledby','id','width','height','patternUnits','d','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','transform','points','fill','data-role','cx','cy','r','x','y','text-anchor','font-family','font-size']);
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('SVG TIU 6 tidak valid.');
  for(const el of doc.querySelectorAll('*')) {
    if(!tags.has(el.localName)||el.namespaceURI!=='http://www.w3.org/2000/svg')throw new Error('Elemen SVG tidak diizinkan.');
    for(const a of [...el.attributes]) {
      if(!attrs.has(a.name))throw new Error('Atribut SVG tidak diizinkan.');
      if(['fill','stroke'].includes(a.name)&&! /^(?:#[\da-f]{3,8}|white|none|currentColor|url\(#[\w-]+\))$/i.test(a.value))throw new Error('Warna SVG tidak diizinkan.');
    }
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export function questionMarkup(questions,readonly=false) {
  if(!Array.isArray(questions)||questions.length!==40)throw new Error('TIU 6 harus berisi 40 gambar.');
  const rows=[];
  for(let g=1;g<=8;g++) {
    const group=questions.filter(q=>q.visual?.group===g).sort((a,b)=>a.visual.item-b.visual.item);
    if(group.length!==5||group.some((q,i)=>q.number!==(g-1)*5+i+1||q.visual.item!==i+1))throw new Error('Urutan TIU 6 tidak valid.');
    rows.push(`<section class="tiu6-group"><h3>Kelompok ${g}</h3><div class="tiu6-row"><div class="tiu6-reference"><small>Bentuk acuan</small>${safeSvg(group[0].visual.reference_svg)}</div>${group.map(q=>`<div class="tiu6-item"><small>Gambar ${q.visual.item}</small><div class="tiu6-figure">${safeSvg(q.visual.net_svg)}<select data-number="${q.number}" aria-label="Kelompok ${g}, gambar ${q.visual.item}: B atau S" ${readonly?'disabled':''}><option value=""></option><option value="B">B</option><option value="S">S</option></select></div></div>`).join('')}</div></section>`);
  }
  return `<div class="tiu6">${rows.join('')}</div>`;
}

export async function mountTiu6({rpc,token,layout,setHeader,onComplete,onNotStarted,isCurrent=()=>true,code="tiu6",title="Tes",total=40,markup=questionMarkup}) {
  const normalize=values=>{if(!Array.isArray(values)||values.length!==total||values.some(v=>v!==null&&(code==='tiu5'?(!Number.isInteger(v)||v<1||v>5):!['B','S'].includes(v))))throw new Error('Jawaban tidak valid');return values.slice();};
  const state=await rpc(`${code}_session`,{p_session_token:token,p_start:false});
  if(!isCurrent())return ()=>{};
  if(state.status==='not_started'){onNotStarted();return ()=>{};}
  if(state.status==='completed'){
    layout(`<h2>${title} sudah selesai</h2><p>Jawaban Anda telah tersimpan.</p><button id="tiu6Continue" class="btn btn-primary">Lanjutkan</button>`);
    document.querySelector('#tiu6Continue').onclick=onComplete;return ()=>{};
  }
  let answers=normalize(state.answers),revision=state.revision;
  const draftKey=`rtg_${code}_${state.id}`;
  try {const draft=JSON.parse(localStorage.getItem(draftKey));if(draft?.revision===revision)answers=normalize(draft.answers);}catch{}
  let pending=false,dirty=JSON.stringify(answers)!==JSON.stringify(state.answers),wantFinish=false,disposed=false,expired=false,finished=false;
  let serverBase=Date.parse(state.server_now),clockBase=performance.now();
  const deadline=state.deadline_at?Date.parse(state.deadline_at):null;
  setHeader(`${title} · ${total} soal`);
  layout(`<div class="tiu-all-toolbar"><div><span class="eyebrow">Sesi Tes</span><h2>${title}</h2><span id="tiu6Count"></span></div><div id="tiu6Timer" class="timer"></div></div><div class="notice">${code==='tiu5'?'Pilih satu jawaban 1–5 untuk setiap soal.':'Pilih B jika jaring-jaring dapat membentuk bangun acuan, atau S jika tidak. Klik bulatan pada setiap gambar.'} Isian yang belum dijawab tetap kosong.</div><p id="tiu6SaveStatus" role="status"></p><form id="tiu6Form">${markup(state.questions)}<div class="actions"><button id="tiu6Finish" class="btn btn-primary">Selesai dan Simpan</button><button id="tiu6Retry" class="btn btn-secondary" type="button" hidden>Coba Simpan Lagi</button></div></form>`);
  const fields=[...document.querySelectorAll(code==='tiu5'?'.tiu-all-choice input':'.tiu6 select')],button=document.querySelector('#tiu6Finish'),retry=document.querySelector('#tiu6Retry'),status=document.querySelector('#tiu6SaveStatus'),timer=document.querySelector('#tiu6Timer');
  const paint=()=>{fields.forEach(f=>{const v=answers[Number(f.dataset.number)-1];if(code==='tiu5'){f.checked=v===Number(f.value);f.closest('label').classList.toggle('selected',f.checked);}else{f.value=v||'';f.classList.toggle('answered',!!f.value);}});document.querySelector('#tiu6Count').textContent=`${answers.filter(Boolean).length} / ${total} terisi`;};
  const persist=()=>{try{localStorage.setItem(draftKey,JSON.stringify({revision,answers}));}catch{}};
  const lock=value=>{fields.forEach(f=>f.disabled=value);button.disabled=value;};
  paint();status.textContent=dirty?'Memulihkan jawaban yang belum tersimpan…':'Jawaban tersimpan.';
  async function flush(finish=false) {
    wantFinish ||= finish;
    if(pending||disposed||finished)return;
    pending=true;retry.hidden=true;
    try {
      do {
        const sent=answers.slice(),sentFinish=wantFinish;dirty=false;
        if(sentFinish)lock(true);
        status.textContent='Menyimpan jawaban…';
        const saved=await rpc(`save_${code}_answers`,{p_session_token:token,p_answers:sent,p_revision:revision,p_finish:sentFinish});
        revision=saved.revision;serverBase=Date.parse(saved.server_now);clockBase=performance.now();
        if(saved.status==='completed') {
          finished=true;try{localStorage.removeItem(draftKey);}catch{}
          if(!disposed){answers=normalize(saved.answers);paint();lock(true);status.textContent='Seluruh jawaban tersimpan. Tes selesai.';onComplete();}return;
        }
        persist();if(!disposed)status.textContent=dirty?'Menyimpan perubahan berikutnya…':'Jawaban tersimpan.';
      } while(!disposed&&(dirty||wantFinish));
    } catch(error) {
      dirty=true;persist();
      if(!disposed){status.textContent=`Belum tersimpan: ${error.message||'Periksa koneksi internet.'}`;retry.hidden=false;if(!expired){wantFinish=false;lock(false);}}
    } finally {pending=false;}
  }
  fields.forEach(f=>f.onchange=()=>{if(expired||finished)return;answers[Number(f.dataset.number)-1]=code==='tiu5'?Number(f.value):f.value||null;dirty=true;paint();persist();void flush();});
  document.querySelector('#tiu6Form').onsubmit=e=>{e.preventDefault();const blank=answers.filter(x=>!x).length;if(blank&&!confirm(`${blank} gambar belum dijawab dan akan disimpan kosong. Selesaikan ${title}?`))return;void flush(true);};
  retry.onclick=()=>void flush(expired);
  function tick(){
    if(disposed||finished)return;
    if(!deadline){timer.textContent='Tanpa batas waktu';timer.classList.add('tiu6-no-limit');return;}
    const left=Math.max(0,Math.ceil((deadline-(serverBase+performance.now()-clockBase))/1000));
    timer.textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
    timer.classList.toggle('danger',left<=30);
    if(left===0&&!expired){expired=true;lock(true);status.textContent='Waktu habis. Mengakhiri sesi dengan jawaban yang sudah tersimpan.';void flush(true);}
  }
  tick();const interval=setInterval(tick,500);if(dirty&&!expired)void flush();
  return ()=>{disposed=true;clearInterval(interval);};
}

export function answersCsv(answers){
  const values=normalizeAnswers(answers);
  return '\uFEFFkelompok,gambar,jawaban\r\n'+values.map((v,i)=>`${Math.floor(i/5)+1},${i%5+1},${v||''}`).join('\r\n');
}

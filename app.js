import { mountResults } from './results.js';
import { renderTiuSvgQuestion } from './tiu5-svg-temp.js';
import { mountTiu6, questionMarkup, answersCsv } from './tiu6.js';

const { supabaseUrl, supabasePublishableKey } = window.APP_CONFIG;
const db = window.supabase.createClient(supabaseUrl, supabasePublishableKey);
const app = document.querySelector('#app');
const headerStatus = document.querySelector('#headerStatus');
let questionBank;
let timerId;
let disposeTiu6;

const session = {
  get token() { return localStorage.getItem('rtg_session_token'); },
  get name() { return localStorage.getItem('rtg_candidate_name'); },
  set(data) {
    localStorage.setItem('rtg_session_token', data.session_token);
    localStorage.setItem('rtg_candidate_name', data.full_name);
  },
  clear() {
    ['rtg_session_token', 'rtg_candidate_name', 'rtg_test_state'].forEach(k => localStorage.removeItem(k));
  }
};

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function setHeader(text = '') { headerStatus.textContent = text; }
function route(path) { location.hash = `#${path}`; }
function clearTimer() { if (timerId) clearInterval(timerId); timerId = null; }

async function loadTemporaryTiuCsv() {
  const response = await fetch('data/tiu5-questions.csv', { cache: 'no-store' });
  if (!response.ok) throw new Error('Data CSV TIU 5 tidak dapat dimuat.');
  const rows = (await response.text()).trim().split(/\r?\n/);
  const headers = rows.shift().split(',');
  return rows.map(row => {
    const values = row.split(',');
    const item = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    return {
      number: Number(item.number),
      type: item.type,
      prompt: item.prompt,
      duration: Number(item.duration),
      image_url: item.image_url,
      renderer: item.renderer
    };
  });
}

function imageChoiceHtml(q) {
  const temporarySvg = q.renderer === 'svg' ? renderTiuSvgQuestion(Number(q.number)) : null;
  if (!temporarySvg) {
    return `<div class="notice">SVG soal nomor ${q.number} belum tersedia di data CSV.</div>`;
  }
  return `<div class="image-question tiu-svg-question"><div class="image-labels"><span>A</span><span>B</span><span>C</span></div><div class="tiu-svg-prompt">${temporarySvg.prompt.map(symbol=>`<div class="tiu-svg-cell">${symbol}</div>`).join('')}</div></div><p class="choice-title">Pilih gambar jawaban:</p><div class="image-options">${temporarySvg.options.map((symbol,index)=>`<label class="image-option tiu-svg-option"><input type="radio" name="answer" value="${index+1}"><span class="radio-mark"></span><strong>${index+1}</strong>${symbol}</label>`).join('')}</div>`;
}

const testMeta={
  test1:{name:'PAPI Kostic',total:90,seconds:15,unit:'soal',description:'Setiap soal berisi dua pernyataan. Pilih satu yang paling sesuai dengan diri Anda.'},
  test2:{name:'DISC',total:24,seconds:30,unit:'kelompok',description:'Setiap kelompok berisi empat pernyataan. Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.'},
  tiu5:{name:'TIU 5',total:30,seconds:300,unit:'soal',description:'Perhatikan perubahan gambar A menjadi B. Terapkan perubahan yang sama pada gambar C, lalu pilih jawaban 1–5.'},
  tiu6:{name:'TIU 6',total:40,unit:'gambar',description:'Tentukan apakah setiap jaring-jaring dapat membentuk bangun acuan. Pilih B (benar) atau S (salah) untuk setiap gambar.'}
};

function tiuDemoSvg(body) {
  return `<svg class="tiu-symbol" viewBox="0 0 100 80" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

function tiuInstructionsHtml() {
  const circleLarge=tiuDemoSvg('<circle cx="50" cy="40" r="25"/>');
  const circleSmall=tiuDemoSvg('<circle cx="50" cy="40" r="15"/>');
  const squareLarge=tiuDemoSvg('<rect x="25" y="15" width="50" height="50"/>');
  const squareSmall=tiuDemoSvg('<rect x="35" y="25" width="30" height="30"/>');
  const arrowUp=tiuDemoSvg('<line x1="50" y1="64" x2="50" y2="19"/><path d="M42 28 L50 17 L58 28"/>');
  const arrowDown=tiuDemoSvg('<line x1="50" y1="16" x2="50" y2="61"/><path d="M42 52 L50 63 L58 52"/>');
  const topT=tiuDemoSvg('<line x1="50" y1="20" x2="50" y2="62"/><line x1="37" y1="20" x2="63" y2="20"/>');
  const bottomT=tiuDemoSvg('<line x1="50" y1="18" x2="50" y2="60"/><line x1="37" y1="60" x2="63" y2="60"/>');
  const example=(number,prompt,choices,correct)=>`<section class="tiu-example"><h3>Contoh ${number}</h3><div class="tiu-example-row"><div class="tiu-example-abc">${prompt.map((x,i)=>`<div><b>${'ABC'[i]}</b>${x}</div>`).join('')}</div><div class="tiu-example-choices">${choices.map((x,i)=>`<div class="${i+1===correct?'correct':''}"><b>${i+1}</b>${x}${i+1===correct?'<span>Jawaban benar</span>':''}</div>`).join('')}</div></div></section>`;
  return `<div class="tiu-instruction-examples">${example(1,[circleLarge,circleSmall,squareLarge],[circleLarge,squareSmall,squareLarge,circleSmall,tiuDemoSvg('<circle cx="50" cy="40" r="30"/>')],2)}${example(2,[arrowUp,arrowDown,topT],[topT,tiuDemoSvg('<line x1="50" y1="18" x2="50" y2="62"/>'),arrowDown,bottomT,arrowUp],4)}</div>`;
}

async function getTestSequence(){
  try{return await rpc('get_active_test_sequence')||['test1','test2','tiu5'];}
  catch{return ['test1','test2','tiu5'];}
}

async function participantTitle(code){const sequence=await getTestSequence();const i=sequence.indexOf(code);return i>=0?`Urutan Tes ${i+1}`:'Sesi Tes';}

function layout(content, compact = false) {
  app.innerHTML = `<section class="card ${compact ? '' : 'page-card'}">${content}</section>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function rpc(name, params = {}) {
  const { data, error } = await db.rpc(name, params);
  if (error) throw error;
  return data;
}

function loginPage() {
  setHeader('Portal Calon Karyawan');
  layout(`<div class="hero">
    <div>
      <span class="eyebrow">Seleksi Karyawan</span>
      <h1>Mulai perjalanan Anda bersama Gamatex.</h1>
      <p class="muted">Masukkan nama lengkap dan NIK sesuai identitas. Pastikan Anda berada di tempat yang tenang sebelum memulai tes.</p>
      <form id="loginForm" class="form-grid" autocomplete="off">
        <div class="field full"><label>Nama Peserta</label><input name="full_name" required minlength="3" placeholder="Nama lengkap sesuai KTP"></div>
        <div class="field full"><label>NIK</label><input name="nik" required inputmode="numeric" pattern="[0-9]{16}" maxlength="16" placeholder="16 digit NIK"></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Masuk dan lanjutkan</button></div>
      </form>
      <p class="muted" style="font-size:12px">Data Anda hanya digunakan untuk proses rekrutmen PT. Gamatex.</p>
      <a href="#/admin" class="muted" style="font-size:12px">Masuk sebagai HR</a>
    </div>
    <div class="hero-art"><div class="hero-icon">📝</div></div>
  </div>`);
  document.querySelector('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const button = e.submitter; button.disabled = true; button.textContent = 'Memeriksa...';
    const form = new FormData(e.currentTarget);
    try {
      const data = await rpc('start_candidate_session', { p_full_name: form.get('full_name').trim(), p_nik: form.get('nik') });
      session.set(Array.isArray(data) ? data[0] : data);
      route('/application');
    } catch (error) {
      toast(error.message || 'Tidak dapat masuk. Periksa koneksi dan coba lagi.');
      button.disabled = false; button.textContent = 'Masuk dan lanjutkan';
    }
  });
}

const applicationFields = [
  ['position','Posisi yang dilamar','text',true],['birth_place_date','Tempat dan tanggal lahir','text',true],
  ['gender','Jenis kelamin','select',true,['Laki-Laki','Perempuan']],['marital_status','Status perkawinan','select',true,['Menikah / pernah menikah','Belum Menikah']],
  ['religion','Agama','text',false],['ktp_address','Alamat sesuai KTP','textarea',false],['current_address','Alamat tempat tinggal','textarea',true],
  ['email','Alamat email','email',true],['social_media','Akun media sosial','text',false],['height','Tinggi badan (cm)','number',false],
  ['weight','Berat badan (kg)','number',false],['glasses','Apakah Anda berkacamata?','select',false,['Ya','Tidak']],
  ['education','Riwayat pendidikan: sekolah dan tahun kelulusan','textarea',true],['training','Pelatihan yang pernah diikuti','textarea',false],
  ['experience','Pengalaman kerja, jabatan, lama bekerja, dan alasan berhenti','textarea',false],['special_skills','Keahlian khusus','textarea',false],
  ['strengths','Kelebihan Anda','textarea',true],['weaknesses','Kekurangan Anda','textarea',true]
];

function fieldHtml([name, label, type, required, options]) {
  const req = required ? 'required' : '';
  const labelHtml = `<label>${label}${required ? ' *' : ''}</label>`;
  if (type === 'textarea') return `<div class="field full">${labelHtml}<textarea name="${name}" ${req}></textarea></div>`;
  if (type === 'select') return `<div class="field">${labelHtml}<select name="${name}" ${req}><option value="">Pilih</option>${options.map(x => `<option>${x}</option>`).join('')}</select></div>`;
  return `<div class="field">${labelHtml}<input name="${name}" type="${type}" ${req}></div>`;
}

function applicationPage() {
  if (!session.token) return route('/');
  setHeader(escapeHtml(session.name));
  layout(`<div class="section-title"><div><span class="eyebrow">Tahap 1 dari 3</span><h2 style="margin-top:10px">Formulir Aplikasi</h2><p class="muted">Lengkapi data diri sebelum memulai tes.</p></div></div>
    <form id="applicationForm" class="form-grid">${applicationFields.map(fieldHtml).join('')}
      <div class="field full"><div class="notice">Pastikan data benar. Setelah disimpan, Anda akan melihat petunjuk Tes 1.</div></div>
      <div class="field full"><button class="btn btn-primary" type="submit">Simpan dan lanjutkan</button></div>
    </form>`);
  document.querySelector('#applicationForm').addEventListener('submit', async e => {
    e.preventDefault(); const button=e.submitter; button.disabled=true; button.textContent='Menyimpan...';
    const values=Object.fromEntries(new FormData(e.currentTarget));
    try { await rpc('save_candidate_application',{p_session_token:session.token,p_application:values}); const sequence=await getTestSequence(); route(sequence.length?`/instructions/${sequence[0]}`:'/complete'); }
    catch(error){toast(error.message||'Data belum dapat disimpan.');button.disabled=false;button.textContent='Simpan dan lanjutkan';}
  });
}

async function instructionsPage(testCode) {
  if (!session.token) return route('/');
  if(testCode==='tiu6')return tiu6Instructions();
  const meta={...(testMeta[testCode]||testMeta.test1),name:await participantTitle(testCode)};
  setHeader(`${session.name} · ${meta.name}`);
  if(testCode==='tiu5'){
    const state=await rpc('tiu5_session',{p_session_token:session.token,p_start:false});
    const seconds=state.status==='in_progress'?(state.deadline_at?(Date.parse(state.deadline_at)-Date.parse(state.started_at))/1000:null):state.duration_seconds;
    const duration=seconds?`${seconds/60} menit`:'Tanpa batas waktu';
    layout(`<span class="eyebrow">Sesi Tes</span><h2 style="margin-top:12px">Petunjuk ${meta.name}</h2><p class="muted">${meta.description}</p>
      <div class="steps"><div class="step"><small>Jumlah</small><strong>30 soal</strong></div><div class="step"><small>Waktu total</small><strong>${duration}</strong></div><div class="step"><small>Tampilan</small><strong>Semua soal sekaligus</strong></div></div>
      ${tiuInstructionsHtml()}
      <div class="notice">Setelah tombol mulai ditekan, seluruh soal 1–30 akan tampil dan waktu pengerjaan ${duration} langsung berjalan. Jawaban yang belum dipilih akan disimpan kosong.</div>
      <div class="actions"><button id="startTest" class="btn btn-primary">Saya Mengerti · Mulai ${meta.name}</button></div>`);
  }else layout(`<span class="eyebrow">Sesi Tes</span>
    <h2 style="margin-top:12px">Petunjuk ${meta.name}</h2>
    <p class="muted">${meta.description}</p>
    <div class="steps"><div class="step"><small>Jumlah</small><strong>${meta.total} ${meta.unit}</strong></div><div class="step"><small>Waktu</small><strong>${meta.seconds} detik / soal</strong></div><div class="step"><small>Navigasi</small><strong>Tidak dapat kembali</strong></div></div>
    <div class="notice">Timer dimulai setelah tombol di bawah ditekan. Jika waktu habis, soal akan otomatis dilanjutkan.</div>
    <div class="actions"><button id="startTest" class="btn btn-primary">Mulai ${meta.name}</button></div>`);
  document.querySelector('#startTest').onclick=async()=>{
    try { if(testCode==='tiu5'){const state=await rpc('tiu5_session',{p_session_token:session.token,p_start:true});if(state.status==='completed')return finishTest('tiu5');route('/quiz/tiu5/all');return;} const snapshot=await rpc('start_test_attempt_v2',{p_session_token:session.token,p_test_code:testCode}); questionBank ||= {}; questionBank[testCode]=snapshot; localStorage.setItem('rtg_test_state',JSON.stringify({testCode,index:testCode==='tiu5'?'all':0})); route(testCode==='tiu5'?'/quiz/tiu5/all':`/quiz/${testCode}/0`); }
    catch(error){toast(error.message||'Tes belum dapat dimulai.');}
  };
}

async function tiu5AllPage(){
  if(!session.token)return route('/');
  const expectedHash=location.hash;
  try{
    const title=await participantTitle('tiu5');
    const markup=questions=>`<div class="tiu-all-list">${questions.map(q=>{const shapes=renderTiuSvgQuestion(q.number);if(!shapes)throw new Error('Soal belum tersedia');return `<section class="tiu-all-question"><strong class="tiu-number">${q.number}</strong><div class="tiu-all-row"><div class="tiu-abc-row">${shapes.prompt.map((shape,i)=>`<div class="tiu-shape"><b>${'ABC'[i]}</b>${shape}</div>`).join('')}</div><div class="tiu-choice-row">${shapes.options.map((shape,i)=>`<label class="tiu-all-choice"><b>${i+1}</b><input type="radio" data-number="${q.number}" name="tiu5_${q.number}" value="${i+1}">${shape}</label>`).join('')}</div></div></section>`;}).join('')}</div>`;
    const cleanup=await mountTiu6({rpc,token:session.token,layout,setHeader,title,code:'tiu5',total:30,markup,onComplete:()=>finishTest('tiu5'),onNotStarted:()=>route('/instructions/tiu5'),isCurrent:()=>location.hash===expectedHash});
    if(location.hash!==expectedHash)cleanup();else disposeTiu6=cleanup;
  }catch(error){layout(`<h2>Tes belum dapat dibuka</h2><p>${escapeHtml(error.message)}</p>`);}
}

async function quizPage(testCode, index) {
  if (!session.token) return route('/');
  clearTimer();
  questionBank ||= {};
  if(testCode==='tiu5'&&!questionBank[testCode]){
    try{questionBank[testCode]=await loadTemporaryTiuCsv();}
    catch(error){toast(error.message);}
  }
  if(!questionBank[testCode]){
    const snapshot=await rpc('get_test_snapshot',{p_session_token:session.token,p_test_code:testCode});
    if(snapshot) questionBank[testCode]=snapshot;
    else questionBank=await fetch('data/questions.json').then(r=>r.json());
  }
  const questions=questionBank[testCode];
  if (!questions || index >= questions.length) return finishTest(testCode);
  const q=questions[index]; let remaining=q.duration; let answer=null;
  const meta={...(testMeta[testCode]||testMeta.test1),name:await participantTitle(testCode)};
  setHeader(`${meta.name} · ${index+1}/${questions.length}`);
  const options=q.type==='paired_choice'
    ? `<div class="options">${q.options.map((option,i)=>`<label class="option"><input type="radio" name="answer" value="${i}"><span>${escapeHtml(option)}</span></label>`).join('')}</div>`
    : q.type==='image_choice'
      ? imageChoiceHtml(q)
      : `<div class="most-least"><div class="ml-row" style="border:0;padding-top:0"><span></span><span class="ml-head">Paling</span><span class="ml-head">Kurang</span></div>${q.options.map((option,i)=>`<div class="ml-row"><span>${escapeHtml(option)}</span><label class="ml-choice"><input type="radio" name="most" value="${i}" aria-label="Paling"></label><label class="ml-choice"><input type="radio" name="least" value="${i}" aria-label="Kurang"></label></div>`).join('')}</div>`;
  layout(`<div class="test-head"><div><span class="eyebrow">${meta.name}</span><h2 style="margin-top:10px">Soal ${index+1}</h2></div><div id="timer" class="timer">${remaining}</div></div>
    <div class="progress"><span style="width:${((index+1)/questions.length)*100}%"></span></div>
    <div class="question">${escapeHtml(q.prompt)}</div>${options}
    <div class="actions"><button id="nextQuestion" class="btn btn-primary" disabled>Jawab & Lanjutkan</button></div>`);
  const next=document.querySelector('#nextQuestion');
  if(q.type==='paired_choice'||q.type==='image_choice') document.querySelectorAll('[name=answer]').forEach(input=>input.onchange=()=>{answer={choice:Number(input.value)};next.disabled=false;document.querySelectorAll('.option,.image-option').forEach(x=>x.classList.toggle('selected',x.contains(input)));});
  else document.querySelectorAll('[name=most],[name=least]').forEach(input=>input.onchange=()=>{
    const most=document.querySelector('[name=most]:checked'); const least=document.querySelector('[name=least]:checked');
    if(most&&least&&most.value===least.value){input.checked=false;toast('Pilihan Paling dan Kurang harus berbeda.');return;}
    if(most&&least){answer={most:Number(most.value),least:Number(least.value)};next.disabled=false;}
  });
  let saving=false;
  const submit=async(timedOut=false)=>{if(saving)return;saving=true;clearTimer();next.disabled=true;next.textContent='Menyimpan...';try{await rpc('save_test_answer',{p_session_token:session.token,p_test_code:testCode,p_question_number:q.number,p_answer:answer,p_timed_out:timedOut,p_elapsed_seconds:q.duration-remaining});const newIndex=index+1;localStorage.setItem('rtg_test_state',JSON.stringify({testCode,index:newIndex}));if(newIndex>=questions.length)await finishTest(testCode);else route(`/quiz/${testCode}/${newIndex}`);}catch(error){saving=false;next.disabled=!answer;next.textContent='Coba Simpan Lagi';toast(error.message||'Jawaban belum tersimpan.');}};
  next.onclick=()=>submit(false);
  const timer=document.querySelector('#timer');
  timerId=setInterval(()=>{remaining--;timer.textContent=remaining;timer.classList.toggle('warning',remaining<=10);timer.classList.toggle('danger',remaining<=5);if(remaining<=0)submit(true);},1000);
}

async function finishTest(testCode){
  clearTimer();
  try{await rpc('complete_test_attempt',{p_session_token:session.token,p_test_code:testCode});localStorage.removeItem('rtg_test_state');const sequence=await getTestSequence();const next=sequence[sequence.indexOf(testCode)+1];route(next?`/instructions/${next}`:'/complete');}
  catch(error){toast(error.message||'Status tes belum tersimpan.');}
}

function completePage(){
  setHeader('Tes selesai');
  layout(`<div class="center"><div class="success-icon">✓</div><span class="eyebrow">Berhasil dikirim</span><h2 style="margin-top:14px">Terima kasih, ${escapeHtml(session.name||'Peserta')}.</h2><p class="muted">Formulir dan seluruh jawaban tes Anda telah tersimpan. Tim HR akan menghubungi Anda untuk proses berikutnya.</p><div class="actions" style="justify-content:center"><button id="logout" class="btn btn-secondary">Selesai dan keluar</button></div></div>`);
  document.querySelector('#logout').onclick=()=>{session.clear();route('/');};
}

function adminShell(active,content){
  const nav=[['dashboard','Dashboard'],['candidates','Data Peserta'],['results','Hasil Tes'],['questions','Bank Soal'],['settings','Pengaturan Tes']];
  layout(`<div class="admin-layout"><aside class="admin-nav"><div><span class="eyebrow">HR Recruitment</span><h3 style="margin:12px 0 20px">Panel Admin</h3></div>${nav.map(([id,label])=>`<a class="${active===id?'active':''}" href="#/admin/${id}">${label}</a>`).join('')}<button id="adminOut" class="btn btn-secondary">Keluar</button></aside><div class="admin-content">${content}</div></div>`);
  document.querySelector('#adminOut').onclick=()=>db.auth.signOut().then(()=>route('/admin'));
}

async function requireAdmin(){
  const {data:{session:authSession}}=await db.auth.getSession();
  if(authSession)return true;
  layout(`<span class="eyebrow">Akses HR</span><h2 style="margin-top:12px">Dashboard Recruitment</h2><p class="muted">Masuk menggunakan akun HR yang terdaftar di Supabase.</p><form id="adminLogin" class="form-grid"><div class="field full"><label>Email</label><input name="email" type="email" required></div><div class="field full"><label>Kata sandi</label><input name="password" type="password" required></div><div class="field full"><button class="btn btn-primary">Masuk</button></div></form>`);
  document.querySelector('#adminLogin').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)toast(error.message);else route('/admin/dashboard');};
  return false;
}

async function adminPage(section='dashboard'){
  setHeader('HR Recruitment'); if(!await requireAdmin())return;
  if(section==='questions')return adminQuestions();
  if(section==='settings')return adminSettings();
  if(section==='results'||section==='tiu6-results')return mountResults({db,shell:adminShell});
  const {data,error}=await db.from('admin_candidate_summary').select('*').order('created_at',{ascending:false});
  if(error)return adminShell(section,`<h2>Akses belum tersedia</h2><p class="muted">${escapeHtml(error.message)}</p>`);
  const rows=data||[],completed=rows.filter(x=>x.all_tests_completed===true).length;
  const table=`<div class="section-title"><div><h2>${section==='candidates'?'Data Peserta':'Ringkasan Peserta'}</h2><p class="muted">Pantau proses seleksi secara langsung.</p></div></div>${section==='dashboard'?`<div class="dashboard-grid"><div class="stat"><strong>${rows.length}</strong><span>Total peserta</span></div><div class="stat"><strong>${completed}</strong><span>Tes selesai</span></div><div class="stat"><strong>${rows.filter(x=>x.test_1_status==='in_progress').length}</strong><span>Sedang PAPI Kostic</span></div><div class="stat"><strong>${rows.filter(x=>x.test_2_status==='in_progress').length}</strong><span>Sedang DISC</span></div></div>`:''}<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Posisi</th><th>PAPI Kostic</th><th>DISC</th><th>Terdaftar</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${escapeHtml(x.full_name)}</strong></td><td>${escapeHtml(x.position||'-')}</td><td><span class="pill ${x.test_1_status==='completed'?'done':''}">${escapeHtml(x.test_1_status||'belum')}</span></td><td><span class="pill ${x.test_2_status==='completed'?'done':''}">${escapeHtml(x.test_2_status||'belum')}</span></td><td>${new Date(x.created_at).toLocaleDateString('id-ID')}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada peserta.</td></tr>'}</tbody></table></div>`;
  adminShell(section,table);
  const head=document.querySelector('.table-wrap thead tr');
  ['TIU 5','TIU 6'].forEach(label=>{const th=document.createElement('th');th.textContent=label;head.append(th);});
  document.querySelectorAll('.table-wrap tbody tr').forEach((tr,i)=>{if(!rows[i])return;for(const key of ['tiu5_status','tiu6_status']){const td=document.createElement('td');td.textContent=rows[i][key]||'belum';tr.append(td);}});
  if(rows.some(x=>x.all_tests_completed===undefined))toast('Jalankan update-04-tiu6.sql agar ringkasan sesi lengkap tersedia.');
}

async function adminQuestions(){
  const testCode=new URLSearchParams(location.hash.split('?')[1]||'').get('test')||'test1';
  if(testCode==='tiu6')return adminTiu6Bank();
  const {data,error}=await db.from('question_bank').select('*').eq('test_code',testCode).order('question_number');
  if(error)return adminShell('questions',`<h2>Bank Soal belum aktif</h2><p class="muted">Jalankan update-02-admin-question-bank.sql.</p>`);
  adminShell('questions',`<div class="section-title"><div><h2>Bank Soal</h2><p class="muted">Edit isi, durasi, urutan, dan status soal.</p></div><button id="addQuestion" class="btn btn-primary">+ Tambah Soal</button></div><div class="segmented"><a class="${testCode==='test1'?'active':''}" href="#/admin/questions?test=test1">PAPI Kostic</a><a class="${testCode==='test2'?'active':''}" href="#/admin/questions?test=test2">DISC</a><a class="${testCode==='tiu5'?'active':''}" href="#/admin/questions?test=tiu5">TIU 5</a></div><div class="question-list">${data.map(q=>`<div class="question-item ${q.active?'':'inactive'}"><div><small>Soal ${q.question_number} · ${q.duration_seconds} detik</small><strong>${escapeHtml(q.question_type==='image_choice'?(q.image_url||'Gambar belum diisi'):q.options.join(' / '))}</strong></div><div class="question-actions"><button class="btn btn-secondary edit-question" data-id="${q.id}">Edit</button><button class="btn btn-secondary toggle-question" data-id="${q.id}" data-active="${q.active}">${q.active?'Nonaktifkan':'Aktifkan'}</button></div></div>`).join('')}</div><div id="questionEditor"></div>`);
  document.querySelector('#addQuestion').onclick=()=>renderQuestionEditor(null,testCode,(data.at(-1)?.question_number||0)+1);
  document.querySelector('.segmented').insertAdjacentHTML('beforeend','<a href="#/admin/questions?test=tiu6">TIU 6</a>');
  document.querySelectorAll('.edit-question').forEach(b=>b.onclick=()=>renderQuestionEditor(data.find(q=>q.id===b.dataset.id),testCode));
  document.querySelectorAll('.toggle-question').forEach(b=>b.onclick=async()=>{const {error}=await db.from('question_bank').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.id);if(error)toast(error.message);else adminQuestions();});
}

function renderQuestionEditor(q,testCode,number){
  const isImage=testCode==='tiu5',count=testCode==='test1'?2:4,options=q?.options||Array(count).fill('');
  document.querySelector('#questionEditor').innerHTML=`<div class="editor-panel"><h3>${q?'Edit':'Tambah'} Soal</h3><form id="questionForm" class="form-grid"><div class="field"><label>Nomor urut</label><input name="question_number" type="number" value="${q?.question_number||number}" required></div><div class="field"><label>Durasi (detik)</label><input name="duration_seconds" type="number" min="5" max="600" value="${q?.duration_seconds||(isImage?45:testCode==='test1'?15:30)}" required></div>${isImage?`<div class="field full"><div class="notice">Soal TIU 5 versi sementara dikelola melalui CSV dan SVG.</div><input name="image_url" type="hidden" value=""> </div>`:options.map((x,i)=>`<div class="field full"><label>Pernyataan ${i+1}</label><textarea name="option_${i}" required>${escapeHtml(x)}</textarea></div>`).join('')}<div class="field full"><label><input name="active" type="checkbox" ${q?.active===false?'':'checked'}> Soal aktif</label></div><div class="field full actions"><button class="btn btn-primary">Simpan Soal</button><button type="button" id="cancelEdit" class="btn btn-secondary">Batal</button></div></form></div>`;
  document.querySelector('#questionEditor').scrollIntoView({behavior:'smooth'});document.querySelector('#cancelEdit').onclick=()=>document.querySelector('#questionEditor').innerHTML='';
  document.querySelector('#questionForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),payload={test_code:testCode,question_number:Number(f.get('question_number')),duration_seconds:Number(f.get('duration_seconds')),active:f.get('active')==='on',question_type:isImage?'image_choice':testCode==='test1'?'paired_choice':'most_least',prompt:isImage?'Pilih jawaban gambar yang tepat.':testCode==='test1'?'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.':'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.',options:isImage?[1,2,3,4,5]:options.map((_,i)=>f.get(`option_${i}`).trim()),image_url:isImage?f.get('image_url').trim():null};const query=q?db.from('question_bank').update(payload).eq('id',q.id):db.from('question_bank').insert(payload);const {error}=await query;if(error)toast(error.message);else{toast('Soal berhasil disimpan.');adminQuestions();}};
}

async function advanceTiu6(){
  localStorage.removeItem('rtg_test_state');
  try{const sequence=await rpc('get_active_test_sequence');const index=sequence.indexOf('tiu6');const next=index>=0?sequence[index+1]:null;route(next?`/instructions/${next}`:'/complete');}catch(error){toast(error.message);}
}

async function tiu6Instructions(){
  const title=await participantTitle('tiu6');
  setHeader(`${session.name} · ${title}`);
  try{
    const state=await rpc('tiu6_session',{p_session_token:session.token,p_start:false});
    const complete=state.status==='completed',started=state.status==='in_progress';
    const seconds=started?(state.deadline_at?Math.round((Date.parse(state.deadline_at)-Date.parse(state.started_at))/1000):null):state.duration_seconds;
    layout(`<span class="eyebrow">Sesi Tes</span><h2>Petunjuk ${title}</h2><p>${testMeta.tiu6.description}</p><div class="steps"><div class="step"><small>Jumlah</small><strong>8 kelompok · 40 gambar</strong></div><div class="step"><small>Waktu total</small><strong>${seconds?`${seconds/60} menit`:'Tanpa batas waktu'}</strong></div></div><div class="notice">Perhatikan bangun acuan di sebelah kiri. Nilai setiap gambar secara terpisah: B jika bisa membentuk bangun acuan, S jika tidak. Jumlah B pada setiap kelompok dapat berbeda. Klik bulatan untuk memilih jawaban. Anda boleh mengubah pilihan sebelum selesai. Isian kosong tetap kosong.</div><p>Jawaban disimpan otomatis. ${seconds?'Saat waktu habis, hanya jawaban yang sudah diterima server sebelum batas waktu yang digunakan.':'Pastikan keterangan “Jawaban tersimpan” muncul sebelum meninggalkan halaman.'}</p>${complete?'<p>Tes sudah selesai dan tersimpan.</p>':''}<button id="tiu6Start" class="btn btn-primary" ${state.active===false?'disabled':''}>${complete?'Lanjut ke sesi berikutnya':started?'Lanjutkan tes':'Saya mengerti · Mulai tes'}</button>`);
    document.querySelector('#tiu6Start').onclick=async e=>{if(complete)return advanceTiu6();e.currentTarget.disabled=true;try{await rpc('tiu6_session',{p_session_token:session.token,p_start:true});localStorage.setItem('rtg_test_state',JSON.stringify({testCode:'tiu6',index:'all'}));route('/quiz/tiu6/all');}catch(error){toast(error.message);document.querySelector('#tiu6Start').disabled=false;}};
  }catch(error){layout(`<h2>Tes belum tersedia</h2><p>${escapeHtml(error.message)}</p><p>Hubungi HR untuk memastikan sesi tes sudah tersedia.</p>`);}
}

async function adminTiu6Bank(){
  const {data,error}=await db.from('question_bank').select('*').eq('test_code','tiu6').order('question_number');
  if(error||data?.length!==40)return adminShell('questions','<h2>Bank TIU 6 belum lengkap</h2><p>Jalankan supabase/update-04-tiu6.sql untuk memasang 40 gambar.</p>');
  const questions=data.map(q=>({number:q.question_number,visual:q.visual_data}));
  try{adminShell('questions',`<h2>Bank Soal TIU 6</h2><div class="segmented"><a href="#/admin/questions?test=test1">PAPI Kostic</a><a href="#/admin/questions?test=test2">DISC</a><a href="#/admin/questions?test=tiu5">TIU 5</a><a class="active" href="#/admin/questions?test=tiu6">TIU 6</a></div><p>8 kelompok · 40 gambar B/S. Gambar mengikuti revisi yang sudah disetujui. Durasi dan posisi sesi dapat diatur di Pengaturan Tes.</p>${questionMarkup(questions,true)}`);}catch(e){adminShell('questions',`<p>${escapeHtml(e.message)}</p>`);}
}

async function adminTiu6Results(){
  const {data,error}=await db.from('test_attempts').select('id,status,started_at,completed_at,candidates(full_name,position)').eq('test_code','tiu6').order('started_at',{ascending:false});
  if(error)return adminShell('tiu6-results',`<h2>Hasil TIU 6</h2><p>${escapeHtml(error.message)}</p>`);
  adminShell('tiu6-results',`<h2>Hasil TIU 6</h2><p>Jawaban B/S peserta. Nilai benar/salah belum dihitung karena kunci jawaban belum ditetapkan.</p><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Posisi</th><th>Status</th><th>Jawaban</th></tr></thead><tbody>${data.map(a=>`<tr><td>${escapeHtml(a.candidates?.full_name||'-')}</td><td>${escapeHtml(a.candidates?.position||'-')}</td><td>${a.status==='completed'?'Selesai':'Dalam pengerjaan'}</td><td><button class="btn btn-secondary tiu6-detail" data-id="${a.id}">Lihat jawaban</button></td></tr>`).join('')||'<tr><td colspan="4">Belum ada peserta TIU 6.</td></tr>'}</tbody></table></div><div id="tiu6Detail" class="tiu6-results"></div>`);
  document.querySelectorAll('.tiu6-detail').forEach(button=>button.onclick=async()=>{
    const attempt=data.find(a=>a.id===button.dataset.id);
    const {data:rows,error}=await db.from('test_answers').select('question_number,answer,timed_out').eq('attempt_id',attempt.id).order('question_number');
    if(error)return toast(error.message);
    const answers=Array.from({length:40},(_,i)=>rows.find(r=>r.question_number===i+1)?.answer?.choice||null);
    const panel=document.querySelector('#tiu6Detail');
    panel.innerHTML=`<h3>${escapeHtml(attempt.candidates?.full_name||'Peserta')}</h3><p>${answers.filter(Boolean).length}/40 terisi · ${answers.filter(x=>!x).length} kosong</p><button id="tiu6Download" class="btn btn-secondary">Unduh CSV jawaban</button><div class="table-wrap"><table><thead><tr><th>Kelompok</th>${[1,2,3,4,5].map(n=>`<th>Gambar ${n}</th>`).join('')}</tr></thead><tbody>${Array.from({length:8},(_,g)=>`<tr><td>${g+1}</td>${answers.slice(g*5,g*5+5).map(v=>`<td>${v==='B'||v==='S'?v:''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    document.querySelector('#tiu6Download').onclick=()=>{const url=URL.createObjectURL(new Blob([answersCsv(answers)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`TIU6-jawaban-${attempt.id}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    panel.scrollIntoView({behavior:'smooth'});
  });
}

async function adminSettings(){
  const {data,error}=await db.from('test_settings').select('*').order('sort_order');
  if(error)return adminShell('settings',`<h2>Pengaturan belum aktif</h2><p class="muted">Jalankan update-02-admin-question-bank.sql.</p>`);
  adminShell('settings',`<div class="section-title"><div><h2>Urutan Sesi Tes</h2><p class="muted">Pindahkan posisi sesi. Urutan soal di dalam setiap sesi tetap.</p></div></div><div class="settings-grid">${data.map((s,i)=>`<form class="setting-card" data-code="${s.test_code}"><div class="setting-order"><strong>${i+1}</strong><div><h3>${escapeHtml(testMeta[s.test_code]?.name||s.display_name)}</h3><small>${escapeHtml(s.test_code)}</small></div></div><label><input name="active" type="checkbox" ${s.active?'checked':''}> Sesi aktif</label><div class="question-actions"><button type="button" class="btn btn-secondary move-session" data-direction="-1" ${i===0?'disabled':''}>↑ Naik</button><button type="button" class="btn btn-secondary move-session" data-direction="1" ${i===data.length-1?'disabled':''}>↓ Turun</button><button class="btn btn-primary">Simpan</button></div></form>`).join('')}</div>`);
  document.querySelectorAll('.setting-card').forEach(form=>{
    if(['tiu5','tiu6'].includes(form.dataset.code)){const s=data.find(x=>x.test_code===form.dataset.code);form.querySelector('.question-actions').insertAdjacentHTML('beforebegin',`<div class="field"><label>Waktu total ${testMeta[form.dataset.code].name} (menit)</label><input name="session_minutes" type="number" min="1" max="1440" step="1" value="${s.session_duration_seconds?s.session_duration_seconds/60:''}" placeholder="Kosong = tanpa batas waktu"><small>Berlaku untuk sesi yang baru dimulai.</small></div>`);}
    form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload={active:f.get('active')==='on',updated_at:new Date().toISOString()};if(['tiu5','tiu6'].includes(form.dataset.code))payload.session_duration_seconds=f.get('session_minutes')?Number(f.get('session_minutes'))*60:null;const {error}=await db.from('test_settings').update(payload).eq('test_code',form.dataset.code);toast(error?error.message:'Pengaturan berhasil disimpan.');};
    form.querySelectorAll('.move-session').forEach(button=>button.onclick=async()=>{const index=data.findIndex(x=>x.test_code===form.dataset.code),target=index+Number(button.dataset.direction);if(target<0||target>=data.length)return;const first=data[index],second=data[target];const updates=await Promise.all([db.from('test_settings').update({sort_order:second.sort_order}).eq('test_code',first.test_code),db.from('test_settings').update({sort_order:first.sort_order}).eq('test_code',second.test_code)]);const failed=updates.find(x=>x.error);if(failed)toast(failed.error.message);else adminSettings();});});
}

async function router(){
  if(disposeTiu6){disposeTiu6();disposeTiu6=null;}
  clearTimer(); const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  if(path[0]==='application') return applicationPage();
  if(path[0]==='instructions') return instructionsPage(path[1]||'test1');
  if(path[0]==='quiz'&&path[1]==='tiu5') return tiu5AllPage();
  if(path[0]==='quiz'&&path[1]==='tiu6') {
    if(!session.token)return route('/');
    const expectedHash=location.hash;
    try{const cleanup=await mountTiu6({rpc,token:session.token,layout,setHeader,title:await participantTitle('tiu6'),onComplete:advanceTiu6,onNotStarted:()=>route('/instructions/tiu6'),isCurrent:()=>location.hash===expectedHash});if(location.hash!==expectedHash)cleanup();else disposeTiu6=cleanup;}
    catch(error){layout(`<h2>Tes belum dapat dibuka</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-secondary" href="#/instructions/tiu6">Kembali ke petunjuk</a>`);}return;
  }
  if(path[0]==='quiz') return quizPage(path[1],Number(path[2]||0));
  if(path[0]==='complete') return completePage();
  if(path[0]==='admin') return adminPage((path[1]||'dashboard').split('?')[0]);
  if(session.token) return route('/application');
  return loginPage();
}

const navigate=()=>router().catch(error=>layout(`<h2>Halaman belum dapat dibuka</h2><p>${escapeHtml(error.message)}</p>`));
window.addEventListener('hashchange',navigate);
window.addEventListener('beforeunload',e=>{if(location.hash.includes('/quiz/')){e.preventDefault();e.returnValue='';}});
navigate();

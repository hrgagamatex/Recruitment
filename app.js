const { supabaseUrl, supabasePublishableKey } = window.APP_CONFIG;
const db = window.supabase.createClient(supabaseUrl, supabasePublishableKey);
const app = document.querySelector('#app');
const headerStatus = document.querySelector('#headerStatus');
let questionBank;
let timerId;

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
    try { await rpc('save_candidate_application',{p_session_token:session.token,p_application:values}); route('/instructions/test1'); }
    catch(error){toast(error.message||'Data belum dapat disimpan.');button.disabled=false;button.textContent='Simpan dan lanjutkan';}
  });
}

function instructionsPage(testCode) {
  if (!session.token) return route('/');
  const isFirst=testCode==='test1';
  const total=isFirst?90:24, seconds=isFirst?15:30;
  setHeader(`${session.name} · ${isFirst?'Tes 1':'Tes 2'}`);
  layout(`<span class="eyebrow">${isFirst?'Tahap 2 dari 3':'Tahap 3 dari 3'}</span>
    <h2 style="margin-top:12px">Petunjuk ${isFirst?'Tes 1':'Tes 2'}</h2>
    <p class="muted">${isFirst?'Setiap soal berisi dua pernyataan. Pilih satu yang paling sesuai dengan diri Anda.':'Setiap kelompok berisi empat pernyataan. Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.'}</p>
    <div class="steps"><div class="step"><small>Jumlah</small><strong>${total} ${isFirst?'soal':'kelompok'}</strong></div><div class="step"><small>Waktu</small><strong>${seconds} detik / soal</strong></div><div class="step"><small>Navigasi</small><strong>Tidak dapat kembali</strong></div></div>
    <div class="notice">Timer dimulai setelah tombol di bawah ditekan. Jika waktu habis, soal akan otomatis dilanjutkan.</div>
    <div class="actions"><button id="startTest" class="btn btn-primary">Mulai ${isFirst?'Tes 1':'Tes 2'}</button></div>`);
  document.querySelector('#startTest').onclick=async()=>{
    try { const snapshot=await rpc('start_test_attempt_v2',{p_session_token:session.token,p_test_code:testCode}); questionBank ||= {}; questionBank[testCode]=snapshot; localStorage.setItem('rtg_test_state',JSON.stringify({testCode,index:0})); route(`/quiz/${testCode}/0`); }
    catch(error){toast(error.message||'Tes belum dapat dimulai.');}
  };
}

async function quizPage(testCode, index) {
  if (!session.token) return route('/');
  clearTimer();
  questionBank ||= {};
  if(!questionBank[testCode]){
    const snapshot=await rpc('get_test_snapshot',{p_session_token:session.token,p_test_code:testCode});
    if(snapshot) questionBank[testCode]=snapshot;
    else questionBank=await fetch('data/questions.json').then(r=>r.json());
  }
  const questions=questionBank[testCode];
  if (!questions || index >= questions.length) return finishTest(testCode);
  const q=questions[index]; let remaining=q.duration; let answer=null;
  setHeader(`${testCode==='test1'?'Tes 1':'Tes 2'} · ${index+1}/${questions.length}`);
  const options=q.type==='paired_choice'
    ? `<div class="options">${q.options.map((option,i)=>`<label class="option"><input type="radio" name="answer" value="${i}"><span>${escapeHtml(option)}</span></label>`).join('')}</div>`
    : `<div class="most-least"><div class="ml-row" style="border:0;padding-top:0"><span></span><span class="ml-head">Paling</span><span class="ml-head">Kurang</span></div>${q.options.map((option,i)=>`<div class="ml-row"><span>${escapeHtml(option)}</span><label class="ml-choice"><input type="radio" name="most" value="${i}" aria-label="Paling"></label><label class="ml-choice"><input type="radio" name="least" value="${i}" aria-label="Kurang"></label></div>`).join('')}</div>`;
  layout(`<div class="test-head"><div><span class="eyebrow">${testCode==='test1'?'Tes 1':'Tes 2'}</span><h2 style="margin-top:10px">Soal ${index+1}</h2></div><div id="timer" class="timer">${remaining}</div></div>
    <div class="progress"><span style="width:${((index+1)/questions.length)*100}%"></span></div>
    <div class="question">${escapeHtml(q.prompt)}</div>${options}
    <div class="actions"><button id="nextQuestion" class="btn btn-primary" disabled>Jawab & Lanjutkan</button></div>`);
  const next=document.querySelector('#nextQuestion');
  if(q.type==='paired_choice') document.querySelectorAll('[name=answer]').forEach(input=>input.onchange=()=>{answer={choice:Number(input.value)};next.disabled=false;document.querySelectorAll('.option').forEach(x=>x.classList.toggle('selected',x.contains(input)));});
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
  try{await rpc('complete_test_attempt',{p_session_token:session.token,p_test_code:testCode});localStorage.removeItem('rtg_test_state');if(testCode==='test1')route('/instructions/test2');else route('/complete');}
  catch(error){toast(error.message||'Status tes belum tersimpan.');}
}

function completePage(){
  setHeader('Tes selesai');
  layout(`<div class="center"><div class="success-icon">✓</div><span class="eyebrow">Berhasil dikirim</span><h2 style="margin-top:14px">Terima kasih, ${escapeHtml(session.name||'Peserta')}.</h2><p class="muted">Formulir dan seluruh jawaban tes Anda telah tersimpan. Tim HR akan menghubungi Anda untuk proses berikutnya.</p><div class="actions" style="justify-content:center"><button id="logout" class="btn btn-secondary">Selesai dan keluar</button></div></div>`);
  document.querySelector('#logout').onclick=()=>{session.clear();route('/');};
}

function adminShell(active,content){
  const nav=[['dashboard','Dashboard'],['candidates','Data Peserta'],['questions','Bank Soal'],['settings','Pengaturan Tes']];
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
  const {data,error}=await db.from('admin_candidate_summary').select('*').order('created_at',{ascending:false});
  if(error)return adminShell(section,`<h2>Akses belum tersedia</h2><p class="muted">${escapeHtml(error.message)}</p>`);
  const rows=data||[],completed=rows.filter(x=>x.test_2_status==='completed').length;
  const table=`<div class="section-title"><div><h2>${section==='candidates'?'Data Peserta':'Ringkasan Peserta'}</h2><p class="muted">Pantau proses seleksi secara langsung.</p></div></div>${section==='dashboard'?`<div class="dashboard-grid"><div class="stat"><strong>${rows.length}</strong><span>Total peserta</span></div><div class="stat"><strong>${completed}</strong><span>Tes selesai</span></div><div class="stat"><strong>${rows.filter(x=>x.test_1_status==='in_progress').length}</strong><span>Sedang Tes 1</span></div><div class="stat"><strong>${rows.filter(x=>x.test_2_status==='in_progress').length}</strong><span>Sedang Tes 2</span></div></div>`:''}<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Posisi</th><th>Tes 1</th><th>Tes 2</th><th>Terdaftar</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${escapeHtml(x.full_name)}</strong></td><td>${escapeHtml(x.position||'-')}</td><td><span class="pill ${x.test_1_status==='completed'?'done':''}">${escapeHtml(x.test_1_status||'belum')}</span></td><td><span class="pill ${x.test_2_status==='completed'?'done':''}">${escapeHtml(x.test_2_status||'belum')}</span></td><td>${new Date(x.created_at).toLocaleDateString('id-ID')}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada peserta.</td></tr>'}</tbody></table></div>`;
  adminShell(section,table);
}

async function adminQuestions(){
  const testCode=new URLSearchParams(location.hash.split('?')[1]||'').get('test')||'test1';
  const {data,error}=await db.from('question_bank').select('*').eq('test_code',testCode).order('question_number');
  if(error)return adminShell('questions',`<h2>Bank Soal belum aktif</h2><p class="muted">Jalankan update-02-admin-question-bank.sql.</p>`);
  adminShell('questions',`<div class="section-title"><div><h2>Bank Soal</h2><p class="muted">Edit isi, durasi, urutan, dan status soal.</p></div><button id="addQuestion" class="btn btn-primary">+ Tambah Soal</button></div><div class="segmented"><a class="${testCode==='test1'?'active':''}" href="#/admin/questions?test=test1">Tes 1</a><a class="${testCode==='test2'?'active':''}" href="#/admin/questions?test=test2">Tes 2</a></div><div class="question-list">${data.map(q=>`<div class="question-item ${q.active?'':'inactive'}"><div><small>Soal ${q.question_number} · ${q.duration_seconds} detik</small><strong>${escapeHtml(q.options.join(' / '))}</strong></div><div class="question-actions"><button class="btn btn-secondary edit-question" data-id="${q.id}">Edit</button><button class="btn btn-secondary toggle-question" data-id="${q.id}" data-active="${q.active}">${q.active?'Nonaktifkan':'Aktifkan'}</button></div></div>`).join('')}</div><div id="questionEditor"></div>`);
  document.querySelector('#addQuestion').onclick=()=>renderQuestionEditor(null,testCode,(data.at(-1)?.question_number||0)+1);
  document.querySelectorAll('.edit-question').forEach(b=>b.onclick=()=>renderQuestionEditor(data.find(q=>q.id===b.dataset.id),testCode));
  document.querySelectorAll('.toggle-question').forEach(b=>b.onclick=async()=>{const {error}=await db.from('question_bank').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.id);if(error)toast(error.message);else adminQuestions();});
}

function renderQuestionEditor(q,testCode,number){
  const count=testCode==='test1'?2:4,options=q?.options||Array(count).fill('');
  document.querySelector('#questionEditor').innerHTML=`<div class="editor-panel"><h3>${q?'Edit':'Tambah'} Soal</h3><form id="questionForm" class="form-grid"><div class="field"><label>Nomor urut</label><input name="question_number" type="number" value="${q?.question_number||number}" required></div><div class="field"><label>Durasi (detik)</label><input name="duration_seconds" type="number" min="5" max="600" value="${q?.duration_seconds||(testCode==='test1'?15:30)}" required></div>${options.map((x,i)=>`<div class="field full"><label>Pernyataan ${i+1}</label><textarea name="option_${i}" required>${escapeHtml(x)}</textarea></div>`).join('')}<div class="field full"><label><input name="active" type="checkbox" ${q?.active===false?'':'checked'}> Soal aktif</label></div><div class="field full actions"><button class="btn btn-primary">Simpan Soal</button><button type="button" id="cancelEdit" class="btn btn-secondary">Batal</button></div></form></div>`;
  document.querySelector('#questionEditor').scrollIntoView({behavior:'smooth'});document.querySelector('#cancelEdit').onclick=()=>document.querySelector('#questionEditor').innerHTML='';
  document.querySelector('#questionForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),payload={test_code:testCode,question_number:Number(f.get('question_number')),duration_seconds:Number(f.get('duration_seconds')),active:f.get('active')==='on',question_type:testCode==='test1'?'paired_choice':'most_least',prompt:testCode==='test1'?'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.':'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.',options:options.map((_,i)=>f.get(`option_${i}`).trim())};const query=q?db.from('question_bank').update(payload).eq('id',q.id):db.from('question_bank').insert(payload);const {error}=await query;if(error)toast(error.message);else{toast('Soal berhasil disimpan.');adminQuestions();}};
}

async function adminSettings(){
  const {data,error}=await db.from('test_settings').select('*').order('test_code');
  if(error)return adminShell('settings',`<h2>Pengaturan belum aktif</h2><p class="muted">Jalankan update-02-admin-question-bank.sql.</p>`);
  adminShell('settings',`<div class="section-title"><div><h2>Pengaturan Tes</h2><p class="muted">Pengaturan berlaku untuk peserta yang baru memulai tes.</p></div></div><div class="settings-grid">${data.map(s=>`<form class="setting-card" data-code="${s.test_code}"><h3>${escapeHtml(s.display_name)}</h3><label><input name="randomize_questions" type="checkbox" ${s.randomize_questions?'checked':''}> Acak urutan soal</label><label><input name="randomize_options" type="checkbox" ${s.randomize_options?'checked':''}> Acak pilihan jawaban</label><label><input name="allow_back" type="checkbox" ${s.allow_back?'checked':''}> Izinkan kembali</label><label><input name="active" type="checkbox" ${s.active?'checked':''}> Tes aktif</label><button class="btn btn-primary">Simpan</button></form>`).join('')}</div>`);
  document.querySelectorAll('.setting-card').forEach(form=>form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload={randomize_questions:f.get('randomize_questions')==='on',randomize_options:f.get('randomize_options')==='on',allow_back:f.get('allow_back')==='on',active:f.get('active')==='on',updated_at:new Date().toISOString()};const {error}=await db.from('test_settings').update(payload).eq('test_code',form.dataset.code);toast(error?error.message:'Pengaturan berhasil disimpan.');});
}

async function router(){
  clearTimer(); const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  if(path[0]==='application') return applicationPage();
  if(path[0]==='instructions') return instructionsPage(path[1]||'test1');
  if(path[0]==='quiz') return quizPage(path[1],Number(path[2]||0));
  if(path[0]==='complete') return completePage();
  if(path[0]==='admin') return adminPage((path[1]||'dashboard').split('?')[0]);
  if(session.token) return route('/application');
  return loginPage();
}

window.addEventListener('hashchange',router);
window.addEventListener('beforeunload',e=>{if(location.hash.includes('/quiz/')){e.preventDefault();e.returnValue='';}});
router();

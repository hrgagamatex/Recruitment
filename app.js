import { mountResults, renderResult, printResultReport } from './results.js?v=20260925-application-print';
import { renderTiuSvgQuestion } from './tiu5-svg-temp.js';
import { mountTiu6, questionMarkup, answersCsv } from './tiu6.js';
import { MBTI_QUESTIONS, scoreMbti } from './mbti.js';
import { WPT_QUESTIONS } from './wpt.js';
import {resolveWpt,wptAnswerMarkup,wptPayload} from './wpt-ui.js?v=20260922-compact-editor';
window.__mbtiModule={scoreMbti};

const { supabaseUrl, supabasePublishableKey } = window.APP_CONFIG;
const db = window.supabase.createClient(supabaseUrl, supabasePublishableKey);
const app = document.querySelector('#app');
const headerStatus = document.querySelector('#headerStatus');
let questionBank;
let timerId;
let disposeTiu6;

function initAmbientGrid(){
  if(document.querySelector('.ambient-grid'))return;
  const grid=document.createElement('div');
  grid.className='ambient-grid';
  grid.setAttribute('aria-hidden','true');
  grid.innerHTML=Array.from({length:72},(_,index)=>`<span style="--tile-order:${index%24};--tile-drift:${index%2?'8px':'-8px'}"></span>`).join('');
  document.body.prepend(grid);
}

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

async function candidateSessionState(){
  if(!session.token)return null;
  try{return await rpc('get_candidate_session_state',{p_session_token:session.token});}
  catch{return null;}
}

async function continueCandidateSession(){
  if(!session.token)return loginPage();
  const state=await candidateSessionState();
  if(state?.all_tests_completed){
    session.clear();
    if(location.hash&&location.hash!=='#/' )history.replaceState(null,'',location.pathname+location.search+'#/');
    return loginPage();
  }
  if(!state?.application_saved)return route('/application');
  if(state?.next_test_code&&state?.has_any_attempt)return route(`/instructions/${state.next_test_code}`);
  return route('/notice');
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

const richTagNames={B:'strong',STRONG:'strong',I:'em',EM:'em',U:'u',S:'s',STRIKE:'s',BR:'br',DIV:'div',P:'p'};
function sanitizeRichText(value=''){
  const source=document.createElement('template');
  source.innerHTML=String(value??'');
  const output=document.createElement('div');
  const copy=(node,parent)=>{
    if(node.nodeType===Node.TEXT_NODE){parent.append(document.createTextNode(node.nodeValue||''));return;}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const tag=richTagNames[node.tagName];
    if(!tag){[...node.childNodes].forEach(child=>copy(child,parent));return;}
    const clean=document.createElement(tag);
    [...node.childNodes].forEach(child=>copy(child,clean));
    parent.append(clean);
  };
  [...source.content.childNodes].forEach(node=>copy(node,output));
  return output.innerHTML.trim();
}
function renderRichText(value=''){return sanitizeRichText(value);}
function richTextPlain(value=''){
  const holder=document.createElement('div');holder.innerHTML=sanitizeRichText(value);
  return (holder.textContent||'').replace(/\s+/g,' ').trim();
}
function richEditorField(name,label,value=''){
  return `<div class="field full rich-field"><label>${escapeHtml(label)}</label><div class="rich-toolbar" role="toolbar" aria-label="Format ${escapeHtml(label)}"><button type="button" data-command="bold" title="Bold"><b>B</b></button><button type="button" data-command="italic" title="Italic"><i>I</i></button><button type="button" data-command="underline" title="Underline"><u>U</u></button><button type="button" data-command="strikeThrough" title="Strikethrough"><s>S</s></button></div><div class="rich-editor" contenteditable="true" role="textbox" aria-label="${escapeHtml(label)}" data-rich-name="${escapeHtml(name)}">${renderRichText(value)}</div></div>`;
}
function initRichEditors(root=document){
  root.querySelectorAll('.rich-toolbar').forEach(toolbar=>toolbar.querySelectorAll('button').forEach(button=>{
    button.addEventListener('mousedown',event=>event.preventDefault());
    button.addEventListener('click',()=>{const editor=toolbar.nextElementSibling;editor?.focus();document.execCommand(button.dataset.command,false,null);});
  }));
}
function readRichEditor(form,name){
  const editor=form.querySelector(`[data-rich-name="${name}"]`);
  return sanitizeRichText(editor?.innerHTML||'');
}

function setHeader(text = '') { headerStatus.textContent = text; }
function route(path) {
  const destination=`#${path}`;
  if(location.hash!==destination)location.hash=destination;
}
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
  tiu6:{name:'TIU 6',total:40,unit:'gambar',description:'Tentukan apakah setiap jaring-jaring dapat membentuk bangun acuan. Pilih B (benar) atau S (salah) untuk setiap gambar.'},
  mbti:{name:'MBTI',total:70,seconds:20,unit:'soal',description:'Pilih satu dari dua pernyataan yang paling menggambarkan kecenderungan diri Anda, sesuai pengalaman hidup harian Anda setiap hari. Tidak ada jawaban benar atau salah.'},
  wpt:{name:'WPT',total:50,seconds:60,unit:'soal',description:'Kerjakan setiap soal sesuai petunjuk. Beberapa soal berupa pilihan jawaban dan beberapa memerlukan isian manual.'}
};

const testInstructions={
  test1:`
    <p class="instruction-segment">Pilihlah pernyataan di bawah ini sesuai dengan apa yang biasa Anda lakukan. Setiap soal memuat 4 (empat) kalimat pendek. Baca dengan teliti setiap kalimat dalam soal tersebut.</p>
    <p class="instruction-segment">Kemudian pilihlah satu respon <strong>PALING (P)</strong> dari kebiasaan yang paling tepat yang mencerminkan diri Anda, dan pilihlah respon <strong>KURANG (K)</strong> dari kebiasaan yang kurang tepat mencerminkan diri Anda.</p>
    <p class="instruction-segment"><strong>Kerjakanlah dengan cepat dan jangan banyak pertimbangan!</strong></p>`,
  test2:`
    <p class="instruction-segment">Pilihlah pernyataan di bawah ini sesuai dengan apa yang biasa Anda lakukan. Setiap soal memuat 4 (empat) kalimat pendek. Baca dengan teliti setiap kalimat dalam soal tersebut.</p>
    <p class="instruction-segment">Kemudian pilihlah satu respon <strong>PALING (P)</strong> dari kebiasaan yang paling tepat yang mencerminkan diri Anda, dan pilihlah respon <strong>KURANG (K)</strong> dari kebiasaan yang kurang tepat mencerminkan diri Anda.</p>
    <p class="instruction-segment"><strong>Kerjakanlah dengan cepat dan jangan banyak pertimbangan!</strong></p>`,
  mbti:`
    <p class="instruction-segment">Bacalah pertanyaan dan pernyataan di bawah ini dan jawablah sesuai dengan pengalaman hidup harian Anda setiap hari.</p>
    <p class="instruction-segment">Pilihlah salah satu jawaban yang menunjukkan diri Anda.</p>
    <p class="instruction-segment"><strong>Selamat mengerjakan!</strong></p>`,
  wpt:`
    <p class="instruction-segment">Ini merupakan tes untuk kemampuan memecahkan masalah. Tes ini berisi 50 pertanyaan yang secara bertahap menjadi semakin sulit. Anda tidak mungkin dapat menyelesaikan semua pertanyaan, tetapi selesaikan semampu Anda.</p>
    <p class="instruction-segment">Jawab yang benar sebanyak mungkin. Kerjakan dengan teliti, namun jangan menghabiskan waktu terlalu lama pada setiap pertanyaan. Jika belum menemukan jawabannya, lewati pertanyaan tersebut.</p>
    <div class="instruction-segment instruction-example">
      <strong>Perhatikan contoh pertanyaan yang terisi dengan benar:</strong>
      <p>MENUAI adalah lawan kata dari . . . . . .</p>
      <div class="instruction-choices"><span>1. Mendapatkan</span><span>2. Bersorak</span><span>3. Melanjutkan</span><span>4. Berada</span><span>5. Menabur</span></div>
      <p><em>Jawaban yang benar adalah “Menabur”. Maka, pilih angka 5.</em></p>
    </div>
    <div class="instruction-segment instruction-example">
      <p>Harga setiap kotak “paper clip” adalah 23 rupiah. Berapa harga 4 kotak?</p>
      <p><em>Jawabannya adalah Rp92. Tulis angka 92 dalam kotak jawaban.</em></p>
    </div>`,
  tiu6:`
    <p class="instruction-segment">Di sebelah kiri terdapat sebuah benda. Di sampingnya terdapat 5 buah guntingan karton. Beberapa di antaranya telah digunting dengan <strong>benar</strong>, sehingga dapat dibentuk seperti yang tergambar pada sisi kiri. Beberapa lainnya digunting <strong>salah</strong>, sehingga selalu ada sebuah sisi yang tetap terbuka. Bagian yang diarsir merupakan bidang yang terletak sebagai alas.</p>
    <p class="instruction-segment"><strong>Ingatlah: Semua sisi harus tertutup.</strong></p>
    <p class="instruction-segment">Pilihlah gambar yang betul dengan memilih <strong>B</strong>, dan gambar yang salah dengan memilih <strong>S</strong>.</p>`
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

function tiu6InstructionExampleHtml(){
  return `<figure class="tiu6-instruction-example" aria-labelledby="tiu6-example-caption">
    <figcaption id="tiu6-example-caption"><strong>Contoh pengisian</strong><span>Bulatan pada setiap gambar telah diisi dengan B atau S.</span></figcaption>
    <div class="tiu6-example-scroll">
      <svg class="tiu6-example-svg" viewBox="0 0 1180 440" role="img" aria-labelledby="tiu6-example-title tiu6-example-desc">
        <title id="tiu6-example-title">Contoh jawaban TIU 6</title>
        <desc id="tiu6-example-desc">Dua bentuk acuan, masing-masing diikuti lima guntingan karton dengan bulatan jawaban B atau S yang telah terisi.</desc>
        <defs><pattern id="tiu6-example-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2 L2 -2 M0 7 L7 0 M5 9 L9 5"/></pattern></defs>
        <g class="tiu6-example-line">
          <path d="M35 80 H100 V155 H35 Z M35 80 L60 64 H125 L100 80 Z M100 80 L125 64 V139 L100 155 Z"/><path class="tiu6-example-dashed" d="M60 80 V139 H125"/><path d="M168 35 V197"/>
          <g transform="translate(210 36)"><text class="tiu6-example-number" x="70" y="0">1</text><path d="M20 72 H70 V22 H110 V72 H160 V112 H110 V162 H70 V112 H20 Z"/><rect class="tiu6-example-hatch" x="70" y="72" width="40" height="40"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">B</text></g>
          <g transform="translate(390 36)"><text class="tiu6-example-number" x="70" y="0">2</text><path d="M20 72 H60 V22 H100 V72 H140 V112 H100 V152 H60 V112 H20 Z M20 112 V152 H60"/><rect class="tiu6-example-hatch" x="60" y="72" width="40" height="40"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">S</text></g>
          <g transform="translate(570 36)"><text class="tiu6-example-number" x="70" y="0">3</text><path d="M5 72 H45 V22 H85 V72 H165 V112 H85 V152 H45 V112 H5 Z"/><rect class="tiu6-example-hatch" x="5" y="72" width="40" height="40"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">B</text></g>
          <g transform="translate(750 36)"><text class="tiu6-example-number" x="70" y="0">4</text><path d="M0 72 H160 V112 H120 V152 H80 V112 H40 V152 H0 Z M120 72 V32 H160 V72"/><rect class="tiu6-example-hatch" x="40" y="72" width="40" height="40"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">S</text></g>
          <g transform="translate(930 36)"><text class="tiu6-example-number" x="70" y="0">5</text><path d="M25 22 H105 V62 H145 V102 H105 V142 H65 V102 H25 V62 H65 V22 M105 62 V102"/><rect class="tiu6-example-hatch" x="65" y="62" width="40" height="40"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">B</text></g>
          <path d="M80 250 L28 345 L80 385 L132 345 Z M80 250 V385"/><path class="tiu6-example-dashed" d="M28 345 H132"/><path d="M168 235 V415"/>
          <g transform="translate(210 246)"><text class="tiu6-example-number" x="70" y="0">1</text><polygon points="65,60 105,60 85,25"/><polygon class="tiu6-example-hatch" points="65,60 105,60 85,100"/><polygon points="65,60 85,100 25,91"/><polygon points="105,60 145,91 85,100"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">B</text></g>
          <g transform="translate(390 246)"><text class="tiu6-example-number" x="70" y="0">2</text><polygon class="tiu6-example-hatch" points="48,72 98,68 75,113"/><polygon points="48,72 75,113 10,124"/><polygon points="48,72 61,14 98,68"/><polygon points="61,14 119,16 98,68"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">S</text></g>
          <g transform="translate(570 246)"><text class="tiu6-example-number" x="70" y="0">3</text><polygon class="tiu6-example-hatch" points="48,72 93,75 68,116"/><polygon points="48,72 58,13 93,75"/><polygon points="58,13 138,51 93,75"/><polygon points="93,75 128,124 68,116"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">S</text></g>
          <g transform="translate(750 246)"><text class="tiu6-example-number" x="70" y="0">4</text><polygon class="tiu6-example-hatch" points="25,82 65,62 65,102"/><polygon points="65,62 105,42 125,82 65,102"/><path d="M65 62 L125 82 L105 122 L65 102 M105 42 L125 82"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">B</text></g>
          <g transform="translate(930 246)"><text class="tiu6-example-number" x="70" y="0">5</text><polygon points="45,58 85,22 125,22 105,58"/><polygon points="85,22 105,58 145,58 125,22"/><polygon class="tiu6-example-hatch" points="45,58 105,58 85,98"/><polygon points="85,98 125,98 105,58"/><circle class="tiu6-example-answer" cx="148" cy="151" r="23"/><text class="tiu6-example-letter" x="148" y="160">S</text></g>
        </g>
      </svg>
    </div>
  </figure>`;
}

async function getTestSequence(){
  try{return await rpc('get_active_test_sequence')||['test1','test2','tiu5','tiu6','mbti','wpt'];}
  catch{return ['test1','test2','tiu5','tiu6','mbti','wpt'];}
}

async function participantTitle(code){const sequence=await getTestSequence();const i=sequence.indexOf(code);return i>=0?`Urutan Tes ${i+1}`:'Sesi Tes';}

function startTypewriters(root=app,delay=180){
  root.querySelectorAll('[data-typewriter]').forEach(el=>{
    const text=el.dataset.typewriter||'';
    el.setAttribute('aria-label',text);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=text;el.classList.add('typing-complete');return;}
    el.textContent='';el.classList.add('typing-active');
    let index=0;
    const tick=()=>{el.textContent=text.slice(0,++index);if(index<text.length)setTimeout(tick,text[index-1]===','||text[index-1]==='.'?72:22);else el.classList.replace('typing-active','typing-complete');};
    setTimeout(tick,delay);
  });
  root.querySelectorAll('[data-typewriter-rich]').forEach(el=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(!node.nodeValue.trim()){node.nodeValue='';continue;}
      const segment=node.parentElement?.closest('.notice-segment,.instruction-segment')||node.parentElement?.closest('p,li')||null;
      nodes.push({node,text:node.nodeValue,segment:segment&&el.contains(segment)?segment:null});
    }
    const fullText=nodes.map(item=>item.text).join(' ').replace(/\s+/g,' ').trim();
    el.setAttribute('aria-label',fullText);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('typing-complete');el.closest('.window-body')?.querySelector('.typewriter-followup')?.classList.add('is-visible');return;}
    nodes.forEach(item=>{item.node.nodeValue='';});
    el.classList.add('typing-active');
    let nodeIndex=0,charIndex=0;
    const finish=()=>{
      el.classList.replace('typing-active','typing-complete');
      el.closest('.window-body')?.querySelector('.typewriter-followup')?.classList.add('is-visible');
    };
    const tick=()=>{
      if(nodeIndex>=nodes.length)return finish();
      const item=nodes[nodeIndex];
      if(charIndex>=item.text.length){nodeIndex++;charIndex=0;return setTimeout(tick,0);}
      if(item.segment&&!item.segment.classList.contains('is-revealed')){
        item.segment.classList.add('is-revealed');
        if(item.segment.tagName==='LI')item.segment.parentElement?.classList.add('is-revealed');
      }
      const character=item.text[charIndex++];
      item.node.nodeValue+=character;
      setTimeout(tick,/[.,!?;:]/.test(character)?30:8);
    };
    setTimeout(tick,delay);
  });
}

function instructionText(text,className='muted'){
  return `<p class="${className} typed-copy" data-typewriter="${escapeHtml(text)}"></p>`;
}

function instructionRichText(testCode,fallback){
  const content=testInstructions[testCode];
  return content?`<div class="session-instructions typed-copy typed-copy-rich" data-typewriter-rich>${content}</div>`:instructionText(fallback);
}

function panelLabelForRoute(){
  const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  if(!path.length)return 'Seleksi Karyawan';
  if(path[0]==='application')return 'Formulir Karyawan';
  if(path[0]==='notice')return 'Pemberitahuan';
  if(path[0]==='instructions'||path[0]==='quiz')return 'Sesi Tes';
  if(path[0]==='complete')return 'Tes Selesai';
  return 'Recruitment';
}

function shouldGlitchPanel(){
  const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  return path[0]==='instructions';
}

function shouldZoomFirstPanel(){
  const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  return path.length===0;
}

function layout(content, compact = false) {
  const participant=!location.hash.startsWith('#/admin');
  const glitch=participant&&shouldGlitchPanel();
  const zoom=participant&&shouldZoomFirstPanel();
  const label=escapeHtml(panelLabelForRoute());
  app.innerHTML = `<section class="card ${compact ? '' : 'page-card'} ${participant?'participant-window':''} ${glitch?'panel-glitch-pending':''} ${zoom?'panel-zoom-pending':''}">${participant?`<div class="window-bar" aria-hidden="true"><span class="window-dots"><i></i><i></i><i></i></span><small>RECRUITMENT · GARUDA MAS SEMESTA</small><b>${label}</b></div><div class="window-body">`:''}${content}${participant?'</div>':''}</section>`;
  const panel=app.querySelector('.participant-window');
  if(glitch&&panel){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      panel.classList.remove('panel-glitch-pending');
      panel.classList.add('panel-glitch-in');
    }));
  }else if(zoom&&panel){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      panel.classList.remove('panel-zoom-pending');
      panel.classList.add('panel-zoom-in');
    }));
  }
  startTypewriters(app,glitch?560:180);
  window.scrollTo({ top: 0, behavior: 'auto' });
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
      <h1>Mulai perjalanan Anda bersama Garuda Mas Semesta.</h1>
      <p class="muted">Masukkan nama lengkap dan NIK sesuai identitas. Pastikan Anda berada di tempat yang tenang sebelum memulai tes.</p>
      <form id="loginForm" class="form-grid" autocomplete="off">
        <div class="field full"><label>Nama Peserta</label><input name="full_name" required minlength="3" placeholder="Nama lengkap sesuai KTP"></div>
        <div class="field full"><label>NIK</label><input name="nik" required inputmode="numeric" pattern="[0-9]{16}" maxlength="16" placeholder="16 digit NIK"></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Masuk dan lanjutkan</button></div>
      </form>
      <p class="muted" style="font-size:12px">Data Anda hanya digunakan untuk proses rekrutmen PT. Garuda Mas Semesta.</p>
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
      await continueCandidateSession();
    } catch (error) {
      toast(error.message || 'Tidak dapat masuk. Periksa koneksi dan coba lagi.');
      button.disabled = false; button.textContent = 'Masuk dan lanjutkan';
    }
  });
}

const applicationFields = [
  ['position','Posisi yang dilamar','text',true],['birth_place','Tempat lahir','text',true],['birth_date','Tanggal lahir','date',true],
  ['gender','Jenis kelamin','select',true,['Laki-Laki','Perempuan']],['marital_status','Status perkawinan','select',true,['Menikah / pernah menikah','Belum Menikah']],
  ['religion','Agama','text',false],['ktp_address','Alamat sesuai KTP','textarea',false],['current_address','Alamat tempat tinggal','textarea',true],
  ['email','Alamat email','email',true],['social_media','Akun media sosial','text',false],['height','Tinggi badan (cm)','number',false],
  ['weight','Berat badan (kg)','number',false],['glasses','Apakah Anda berkacamata?','select',false,['Ya','Tidak']],
  ['medical_history','Riwayat penyakit yang pernah diderita','textarea',false],
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
  layout(`<div class="section-title"><div><h2 style="margin-top:10px">Formulir Aplikasi</h2><p class="muted">Lengkapi data diri sebelum memulai tes.</p></div></div>
    <form id="applicationForm" class="form-grid">${applicationFields.map(fieldHtml).join('')}
      <div class="field full"><div class="notice">Pastikan data benar. Setelah disimpan, Anda akan melihat pemberitahuan pelaksanaan sebelum petunjuk Tes 1.</div></div>
      <div class="field full"><button class="btn btn-primary" type="submit">Simpan dan lanjutkan</button></div>
    </form>`);
  document.querySelector('#applicationForm').addEventListener('submit', async e => {
    e.preventDefault(); const button=e.submitter; button.disabled=true; button.textContent='Menyimpan...';
    const values=Object.fromEntries(new FormData(e.currentTarget));
    if(values.birth_place && values.birth_date){
      const d=new Date(`${values.birth_date}T00:00:00`);
      const formatted=new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
      values.birth_place_date=`${values.birth_place}, ${formatted}`;
    }
    delete values.birth_place; delete values.birth_date;
    try { await rpc('save_candidate_application',{p_session_token:session.token,p_application:values}); route('/notice'); }
    catch(error){toast(error.message||'Data belum dapat disimpan.');button.disabled=false;button.textContent='Simpan dan lanjutkan';}
  });
}

function preTestNoticePage(){
  if(!session.token)return route('/');
  setHeader(`${session.name} · Pemberitahuan`);
  layout(`<div class="notice-compact"><h2 class="notice-title">Pemberitahuan Pelaksanaan Psikotes Online</h2>
    <div class="pretest-notice typed-copy typed-copy-rich" data-typewriter-rich>
      <div class="notice-segment notice-intro">Halo, sebelum memulai proses Psikotes Online, mohon diperhatikan beberapa hal berikut:</div>
      <div class="notice-points">
        <div class="notice-segment notice-point"><span>Psikotes terdiri dari beberapa jenis/tahapan tes, dan setiap tes memiliki waktu pengerjaan yang berbeda-beda. Pastikan membaca instruksi pada setiap tahap dengan teliti sebelum memulai.</span></div>
        <div class="notice-segment notice-point"><span>Pastikan Anda berada dalam kondisi senggang/free dan dapat berkonsentrasi penuh selama proses pengerjaan. Jangan mengerjakan psikotes sambil melakukan pekerjaan atau aktivitas lainnya, karena dapat memengaruhi hasil tes dan berisiko menyebabkan Anda tidak dapat menyelesaikan atau dinyatakan gagal dalam proses tes.</span></div>
        <div class="notice-segment notice-point"><span>Pastikan koneksi internet dalam kondisi stabil dan perangkat yang digunakan (laptop/komputer) siap digunakan hingga seluruh tahapan selesai.</span></div>
        <div class="notice-segment notice-point"><span>Ikuti setiap tahapan sesuai urutan dan petunjuk yang diberikan. Jangan melewati atau menutup halaman tes sebelum memastikan tahap tersebut telah selesai.</span></div>
        <div class="notice-segment notice-point"><span>Perhatikan waktu pengerjaan pada setiap tes. Setelah waktu habis, sistem dapat secara otomatis mengakhiri atau melanjutkan ke tahap berikutnya.</span></div>
      </div>
      <div class="notice-segment">Pastikan Anda telah mempersiapkan segala sesuatu yang diperlukan dan berada di tempat yang tenang, nyaman, serta minim gangguan.</div>
      <div class="notice-segment">Mohon pastikan Anda benar-benar siap dan memiliki waktu yang cukup sebelum menekan tombol “Mulai Tes”. Setelah tes dimulai, ikuti seluruh proses sampai selesai dan kerjakan dengan fokus serta sesuai dengan kondisi Anda yang sebenarnya.</div>
      <div class="notice-segment notice-closing"><strong>Selamat mengerjakan dan semoga berhasil! 😊</strong></div>
    </div>
    <div class="actions typewriter-followup"><button id="continueToInstructions" class="btn btn-primary">Saya Mengerti · Lanjut ke Petunjuk Tes</button></div></div>`);
  document.querySelector('#continueToInstructions').onclick=async e=>{
    e.currentTarget.disabled=true;
    const sequence=await getTestSequence();
    route(sequence.length?`/instructions/${sequence[0]}`:'/complete');
  };
}

async function instructionsPage(testCode) {
  if (!session.token) return route('/');
  if(testCode==='tiu6')return tiu6Instructions();
  const runtime=await rpc('get_test_runtime_config',{p_test_code:testCode}).catch(()=>null);
  const meta={...(testMeta[testCode]||testMeta.test1),name:await participantTitle(testCode)};
  if(runtime?.question_duration_seconds)meta.seconds=runtime.question_duration_seconds;
  setHeader(`${session.name} · ${meta.name}`);
  if(testCode==='tiu5'){
    const state=await rpc('tiu5_session',{p_session_token:session.token,p_start:false});
    const seconds=state.status==='in_progress'?(state.deadline_at?(Date.parse(state.deadline_at)-Date.parse(state.started_at))/1000:null):state.duration_seconds;
    const duration=seconds?`${seconds/60} menit`:'Tanpa batas waktu';
    layout(`<span class="eyebrow">Sesi Tes</span><h2 style="margin-top:12px">Petunjuk ${meta.name}</h2>${instructionText(meta.description)}
      <div class="steps"><div class="step"><small>Jumlah</small><strong>30 soal</strong></div><div class="step"><small>Waktu total</small><strong>${duration}</strong></div><div class="step"><small>Tampilan</small><strong>Semua soal sekaligus</strong></div></div>
      ${tiuInstructionsHtml()}
      <div class="notice">Setelah tombol mulai ditekan, seluruh soal 1–30 akan tampil dan waktu pengerjaan ${duration} langsung berjalan. Jawaban yang belum dipilih akan disimpan kosong.</div>
      <div class="actions"><button id="startTest" class="btn btn-primary">Saya Mengerti · Mulai ${meta.name}</button></div>`);
  }else layout(`<span class="eyebrow">Sesi Tes</span>
    <h2 style="margin-top:12px">Petunjuk ${meta.name}</h2>
    ${instructionRichText(testCode,meta.description)}
    <div class="steps"><div class="step"><small>Jumlah</small><strong>${meta.total} ${meta.unit}</strong></div><div class="step"><small>Waktu</small><strong>${meta.seconds} detik / soal</strong></div>${testCode==='wpt'?`<div class="step"><small>Urutan soal</small><strong>${runtime?.randomize_questions?'Diacak untuk setiap peserta':'Urutan tetap'}</strong></div>`:''}</div>
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

async function wptQuizPage(index) {
  if (!session.token) return route('/');
  clearTimer();questionBank ||= {};
  const snapshot=questionBank.wpt||await rpc('get_test_snapshot',{p_session_token:session.token,p_test_code:'wpt'});
  if(!Array.isArray(snapshot)||!snapshot.length)throw new Error('Mulai sesi tes dari halaman petunjuk terlebih dahulu.');
  const questions=questionBank.wpt=resolveWpt(snapshot);
  if(index>=questions.length)return finishTest('wpt');
  const q=questions[index],duration=q.duration_seconds;
  const meta={...testMeta.wpt,name:await participantTitle('wpt')};
  let remaining=duration,selection=null,saving=false;
  setHeader(`${meta.name} · ${index+1}/${questions.length}`);
  const displayedPrompt=renderRichText(q.prompt).replace(/^\s*\d+\s*[.)]\s*/, '');
  layout(`<div class="test-head"><div><span class="eyebrow">${meta.name}</span><h2 style="margin-top:10px">Soal ${index+1}</h2></div><div id="timer" class="timer">${remaining}</div></div><div class="progress"><span style="width:${((index+1)/questions.length)*100}%"></span></div><div class="question wpt-question-text rich-text">${displayedPrompt}</div>${wptAnswerMarkup(q)}<div class="actions"><button id="nextQuestion" class="btn btn-primary" disabled>Jawab & Lanjutkan</button></div>`);
  const next=document.querySelector('#nextQuestion');
  const update=()=>{next.disabled=!wptPayload(q,selection);};
  document.querySelectorAll('[name=wptAnswer]').forEach(x=>x.onchange=()=>{
    selection=q.response_type==='multi_choice'?[...document.querySelectorAll('[name=wptAnswer]:checked')].map(x=>Number(x.value)):Number(x.value);update();
  });
  const manual=document.querySelector('#wptAnswer');if(manual)manual.oninput=()=>{selection=manual.value;update();};
  const submit=async(timedOut=false)=>{
    if(saving)return;saving=true;clearTimer();next.disabled=true;next.textContent='Menyimpan...';
    document.querySelectorAll('[name=wptAnswer],#wptAnswer').forEach(x=>x.disabled=true);
    try{
      await rpc('save_test_answer',{p_session_token:session.token,p_test_code:'wpt',p_question_number:q.number,p_answer:timedOut?null:wptPayload(q,selection),p_timed_out:timedOut,p_elapsed_seconds:duration-remaining});
      const ni=index+1;localStorage.setItem('rtg_test_state',JSON.stringify({testCode:'wpt',index:ni}));if(ni>=questions.length)await finishTest('wpt');else route(`/quiz/wpt/${ni}`);
    }catch(error){saving=false;next.disabled=false;next.textContent='Coba Simpan Lagi';next.onclick=()=>submit(timedOut);toast(error.message||'Jawaban belum tersimpan.');}
  };
  next.onclick=()=>submit(false);
  const timer=document.querySelector('#timer');
  timerId=setInterval(()=>{remaining--;timer.textContent=remaining;timer.classList.toggle('warning',remaining<=10);timer.classList.toggle('danger',remaining<=5);if(remaining<=0)submit(true);},1000);
}

async function quizPage(testCode, index) {
  if (!session.token) return route('/');
  clearTimer();
  questionBank ||= {};
  if(testCode==='tiu5'&&!questionBank[testCode]){
    try{questionBank[testCode]=await loadTemporaryTiuCsv();}
    catch(error){toast(error.message);}
  }
  if(testCode==='wpt'&&!questionBank[testCode]){
    questionBank[testCode]=WPT_QUESTIONS.map(q=>({...q,duration:q.duration_seconds}));
  }
  if(!questionBank[testCode]){
    const snapshot=await rpc('get_test_snapshot',{p_session_token:session.token,p_test_code:testCode});
    if(snapshot) questionBank[testCode]=snapshot;
    else if(testCode==='mbti') questionBank[testCode]=MBTI_QUESTIONS.map(q=>({...q,type:'paired_choice',duration:20}));
    else questionBank=await fetch('data/questions.json').then(r=>r.json());
  }
  const questions=questionBank[testCode];
  if (!questions || index >= questions.length) return finishTest(testCode);
  const q=questions[index]; let remaining=q.duration; let answer=null;
  const meta={...(testMeta[testCode]||testMeta.test1),name:await participantTitle(testCode)};
  setHeader(`${meta.name} · ${index+1}/${questions.length}`);
  const options=q.type==='paired_choice'
    ? `<div class="options">${q.options.map((option,i)=>`<label class="option"><input type="radio" name="answer" value="${i}"><span class="rich-text">${renderRichText(option)}</span></label>`).join('')}</div>`
    : q.type==='image_choice'
      ? imageChoiceHtml(q)
      : `<div class="most-least"><div class="ml-row" style="border:0;padding-top:0"><span></span><span class="ml-head">Paling</span><span class="ml-head">Kurang</span></div>${q.options.map((option,i)=>`<div class="ml-row"><span class="rich-text">${renderRichText(option)}</span><label class="ml-choice"><input type="radio" name="most" value="${i}" aria-label="Paling"></label><label class="ml-choice"><input type="radio" name="least" value="${i}" aria-label="Kurang"></label></div>`).join('')}</div>`;
  layout(`<div class="test-head"><div><span class="eyebrow">${meta.name}</span><h2 style="margin-top:10px">Soal ${index+1}</h2></div><div id="timer" class="timer">${remaining}</div></div>
    <div class="progress"><span style="width:${((index+1)/questions.length)*100}%"></span></div>
    <div class="question rich-text">${renderRichText(q.prompt)}</div>${options}
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
  layout(`<div class="completion-screen center"><div class="completion-tab"><span>SELEKSI KARYAWAN</span><b>SELESAI</b></div><div class="completion-brand" aria-label="The Reliable Denim Company Garuda Mas Semesta"><span class="completion-brand-line completion-company" data-brand="The Reliable Denim Company">The Reliable Denim Company</span><strong class="completion-brand-line completion-gamatex" data-brand="GARUDA MAS SEMESTA">GARUDA MAS SEMESTA</strong></div><div class="success-icon">✓</div><span class="eyebrow">Semua jawaban tersimpan</span><h2 style="margin-top:14px">Terima kasih, ${escapeHtml(session.name||'Peserta')}.</h2><p class="completion-message">Terima kasih telah menyelesaikan tes.<br>Mohon menunggu proses seleksi.</p><p class="muted">Tim HR PT. Garuda Mas Semesta akan menghubungi Anda apabila proses berikutnya telah tersedia.</p><div class="actions" style="justify-content:center"><button id="logout" class="btn btn-secondary">Selesai dan keluar</button></div></div>`);
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
  if(section==='candidate'){
    const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    return candidateProfile(id);
  }
  const [{data,error},{data:attempts,error:attemptError},{data:questionCounts,error:questionError}]=await Promise.all([
    db.from('admin_candidate_summary').select('*').order('created_at',{ascending:false}),
    db.from('test_attempts').select('candidate_id,test_code,status'),
    db.from('question_bank').select('test_code,active').in('test_code',['tiu5','tiu6','mbti'])
  ]);
  if(error)return adminShell(section,`<h2>Akses belum tersedia</h2><p class="muted">${escapeHtml(error.message)}</p>`);
  const rows=data||[], attemptRows=attempts||[], qCounts=questionCounts||[];
  const statusByCandidate={};
  attemptRows.forEach(a=>(statusByCandidate[a.candidate_id] ||= {})[a.test_code]=a.status);
  const activeCount=code=>qCounts.filter(q=>q.test_code===code&&q.active).length;
  const completed=rows.filter(x=>x.all_tests_completed===true).length;
  const status=(x,code,key)=>statusByCandidate[x.id]?.[code]||x[key]||'belum';
  const candidateRows=rows.map(x=>`<tr class="candidate-row" data-id="${escapeHtml(x.id)}"><td><a class="candidate-link" href="#/admin/candidate?id=${encodeURIComponent(x.id)}"><strong>${escapeHtml(x.full_name)}</strong><small>${escapeHtml(x.position||'Posisi belum diisi')}</small></a></td><td>${escapeHtml(x.position||'-')}</td><td><span class="pill ${status(x,'test1','test_1_status')==='completed'?'done':''}">${escapeHtml(status(x,'test1','test_1_status'))}</span></td><td><span class="pill ${status(x,'test2','test_2_status')==='completed'?'done':''}">${escapeHtml(status(x,'test2','test_2_status'))}</span></td><td><span class="pill ${status(x,'tiu5','tiu5_status')==='completed'?'done':''}">${escapeHtml(status(x,'tiu5','tiu5_status'))}</span></td><td><span class="pill ${status(x,'tiu6','tiu6_status')==='completed'?'done':''}">${escapeHtml(status(x,'tiu6','tiu6_status'))}</span></td><td><span class="pill ${status(x,'mbti','mbti_status')==='completed'?'done':''}">${escapeHtml(status(x,'mbti','mbti_status'))}</span></td><td>${new Date(x.created_at).toLocaleDateString('id-ID')}</td></tr>`).join('')||'<tr><td colspan="8">Belum ada peserta.</td></tr>';
  const completedCount=code=>new Set(attemptRows.filter(a=>a.test_code===code&&a.status==='completed').map(a=>a.candidate_id)).size;
  const dashboardStats=section==='dashboard'?`<div class="dashboard-grid">
    <div class="stat"><strong>${rows.length}</strong><span>Total peserta</span></div>
    <div class="stat"><strong>${completedCount('test1')}</strong><span>PAPI selesai</span></div>
    <div class="stat"><strong>${completedCount('test2')}</strong><span>DISC selesai</span></div>
    <div class="stat"><strong>${completedCount('tiu5')}</strong><span>TIU 5 selesai</span></div>
    <div class="stat"><strong>${completedCount('tiu6')}</strong><span>TIU 6 selesai</span></div>
    <div class="stat"><strong>${completedCount('mbti')}</strong><span>MBTI selesai</span></div>
    <div class="stat"><strong>${completedCount('wpt')}</strong><span>WPT selesai</span></div>
  </div>`:'';
  const title=section==='candidates'?'Data Peserta':'Ringkasan Peserta';
  adminShell(section,`<div class="section-title"><div><h2>${title}</h2><p class="muted">Klik nama peserta untuk membuka identitas dan ringkasan seluruh hasil tes.</p></div></div>${dashboardStats}<div class="table-wrap"><table class="candidate-table"><thead><tr><th>Nama</th><th>Posisi</th><th>PAPI</th><th>DISC</th><th>TIU 5</th><th>TIU 6</th><th>MBTI</th><th>Terdaftar</th></tr></thead><tbody>${candidateRows}</tbody></table></div>`);
}

async function candidateProfile(id){
  if(!id)return adminShell('candidates','<h2>Peserta tidak dipilih</h2><a class="btn btn-secondary" href="#/admin/candidates">Kembali</a>');
  const [{data:candidate,error:cErr},{data:attempts,error:aErr},{data:config,error:sErr}]=await Promise.all([
    db.from('candidates').select('*').eq('id',id).single(),
    db.from('test_attempts').select('*').eq('candidate_id',id).order('started_at'),
    db.from('scoring_config').select('config').eq('id','excel-2026-09-17').single()
  ]);
  if(cErr)return adminShell('candidates',`<h2>Peserta tidak ditemukan</h2><p>${escapeHtml(cErr.message)}</p>`);
  if(aErr)return adminShell('candidates',`<h2>Hasil peserta belum tersedia</h2><p>${escapeHtml(aErr.message)}</p>`);
  if(sErr)return adminShell('candidates',`<h2>Konfigurasi hasil belum tersedia</h2><p>${escapeHtml(sErr.message)}</p>`);
  const ids=(attempts||[]).map(a=>a.id);
  const {data:answers,error:ansErr}=ids.length?await db.from('test_answers').select('*').in('attempt_id',ids):{data:[],error:null};
  if(ansErr)return adminShell('candidates',`<h2>Jawaban belum tersedia</h2><p>${escapeHtml(ansErr.message)}</p>`);
  const byCode=Object.fromEntries((attempts||[]).map(a=>[a.test_code,a]));
  const names=['test1','test2','tiu5','tiu6','mbti','wpt'];
  const summary=names.map(code=>{const a=byCode[code];const rows=(answers||[]).filter(r=>r.attempt_id===a?.id);return {code,a,rows};});
  const profile={...(candidate.application||{}),...candidate};
  const fieldLabels={full_name:'Nama Lengkap',nik:'NIK',position:'Posisi yang dilamar',birth_place_date:'Tempat & tanggal lahir',gender:'Jenis kelamin',marital_status:'Status perkawinan',religion:'Agama',ktp_address:'Alamat sesuai KTP',current_address:'Alamat tinggal',email:'Email',social_media:'Media sosial',height:'Tinggi badan',weight:'Berat badan',glasses:'Berkacamata',medical_history:'Riwayat penyakit yang pernah diderita',education:'Pendidikan',training:'Pelatihan',experience:'Pengalaman kerja',special_skills:'Keahlian khusus',strengths:'Kelebihan',weaknesses:'Kekurangan',motivation:'Motivasi'};
  const identity=Object.entries(fieldLabels).map(([key,label])=>profile[key]!==undefined&&profile[key]!==null&&profile[key]!==''?`<div class="profile-field"><small>${label}</small><strong>${escapeHtml(profile[key])}</strong></div>`:'').join('');
  const cards=summary.map(({code,a,rows})=>{let short='Belum dikerjakan'; if(a){if(code==='mbti'){const vals=Array.from({length:70},(_,i)=>{const v=rows.find(r=>r.question_number===i+1)?.answer?.choice;return Number.isInteger(v)?v:null});const r=scoreMbti(vals);short=a.status==='completed'&&r?`Tipe ${r.type} · ${r.answered}/70 terjawab`:`${r?.answered||0}/70 terjawab`;}else if(code==='wpt'){short=`${a.status==='completed'?'Selesai':'Dalam pengerjaan'} · ${rows.length}/50 jawaban tersimpan`;}else short=`${a.status==='completed'?'Selesai':'Dalam pengerjaan'} · ${rows.length} jawaban tersimpan`;} return `<article class="result-card"><div><span class="eyebrow">${escapeHtml(code==='test1'?'PAPI Kostic':code==='test2'?'DISC':code.toUpperCase())}</span><h3>${escapeHtml(a?'Tes tersedia':'Belum dikerjakan')}</h3><p class="muted">${escapeHtml(short)}</p></div><button class="btn btn-secondary profile-result" data-code="${code}">Lihat hasil</button></article>`;}).join('');
  adminShell('candidates',`<div class="profile-header"><div><a class="back-link" href="#/admin/candidates">← Kembali ke Data Peserta</a><span class="eyebrow">Profil Peserta</span><h2>${escapeHtml(candidate.full_name||'Peserta')}</h2><p class="muted">${escapeHtml(candidate.position||'Posisi belum diisi')}</p></div><button id="printProfile" class="btn btn-primary">🖨 Print Formulir & Hasil Tes</button></div><section class="profile-section"><h3>Formulir Aplikasi Peserta</h3><p class="muted">Data yang diisi peserta sebelum memulai rangkaian tes.</p><div class="profile-grid">${identity||'<p class="muted">Formulir aplikasi belum diisi.</p>'}</div></section><section class="profile-section"><h3>Ringkasan Hasil Tes</h3><div class="result-card-grid">${cards}</div></section><div id="profileResult" class="profile-result-panel"></div>`);
  document.querySelectorAll('.profile-result').forEach(btn=>btn.onclick=()=>{const item=summary.find(x=>x.code===btn.dataset.code);document.querySelector('#profileResult').innerHTML=renderResultForProfile(item,config.config);document.querySelector('#profileResult').scrollIntoView({behavior:'smooth'});});
  document.querySelector('#printProfile').onclick=()=>printCandidateReport(profile,summary,config.config);
}

function renderResultForProfile(item,config){
  // renderResult is imported in the results module; avoid duplicating scoring logic here by dispatching through a tiny DOM event.
  if(item.code==='mbti'){
    const vals=Array.from({length:70},(_,i)=>{const v=item.rows.find(r=>r.question_number===i+1)?.answer?.choice;return Number.isInteger(v)?v:null});
    const r=scoreMbti(vals); 
    return `<h3>MBTI</h3><div class="mbti-type">${r.type}</div><p>${r.answered}/70 terjawab</p><div class="mbti-bars">${[['E','I'],['S','N'],['T','F'],['J','P']].map(([a,b])=>`<div class="mbti-dimension"><div><b>${a}</b><span>${r.counts[a]}</span></div><div><b>${b}</b><span>${r.counts[b]}</span></div></div>`).join('')}</div><div class="profile-note"><p>${escapeHtml(r.description)}</p></div>`;
  }
  return `<p class="notice">Gunakan menu <b>Hasil Tes</b> untuk membuka tampilan lengkap ${escapeHtml(item.code)}.</p>`;
}

function printCandidateReport(candidate,summary,config){
  if(!printResultReport(candidate,summary,config,{includeApplication:true}))toast('Izinkan pop-up browser untuk mencetak laporan.');
}

async function adminQuestions(){
  const testCode=new URLSearchParams(location.hash.split('?')[1]||'').get('test')||'test1';
  if(testCode==='tiu6')return adminTiu6Bank();
  if(testCode==='tiu5')return adminTiu5Bank();
  if(testCode==='wpt')return adminWptBank();
  const {data,error}=await db.from('question_bank').select('*').eq('test_code',testCode).order('question_number');
  if(error)return adminShell('questions',`<h2>Bank Soal belum aktif</h2><p class="muted">Jalankan migrasi bank soal yang diperlukan.</p>`);
  const isTiu5=testCode==='tiu5', isMbti=testCode==='mbti';
  adminShell('questions',`<div class="section-title"><div><h2>Bank Soal ${escapeHtml(testCode==='test1'?'PAPI Kostic':testCode==='test2'?'DISC':testCode.toUpperCase())}</h2><p class="muted">Edit isi, format teks, durasi, urutan, dan status soal.</p></div><button id="addQuestion" class="btn btn-primary">+ Tambah Soal</button></div><div class="segmented"><a class="${testCode==='test1'?'active':''}" href="#/admin/questions?test=test1">PAPI Kostic</a><a class="${testCode==='test2'?'active':''}" href="#/admin/questions?test=test2">DISC</a><a class="${isTiu5?'active':''}" href="#/admin/questions?test=tiu5">TIU 5</a><a class="${testCode==='tiu6'?'active':''}" href="#/admin/questions?test=tiu6">TIU 6</a><a class="${isMbti?'active':''}" href="#/admin/questions?test=mbti">MBTI</a><a href="#/admin/questions?test=wpt">WPT</a></div>${isTiu5?'<div class="notice">TIU 5 menggunakan SVG. Preview di bawah mengikuti soal SVG yang digunakan peserta. Anda dapat mengubah teks, durasi, nomor, dan status tanpa mengubah gambar yang sudah disetujui.</div>':''}${isMbti?'<div class="notice">MBTI menggunakan dua pilihan dengan pemetaan scoring tetap berdasarkan nomor soal. Edit teks diperbolehkan; jangan menukar urutan pilihan A/B karena akan mengubah pemetaan dimensi.</div>':''}<div class="question-list">${data.map(q=>{const shapes=isTiu5?renderTiuSvgQuestion(Number(q.question_number)):null;const preview=isTiu5?'Pola SVG TIU 5':q.options?.length?q.options.map(renderRichText).join(' / '):renderRichText(q.prompt||'');return `<div class="question-item ${q.active?'':'inactive'} ${isTiu5?'question-item-visual':''}"><div class="question-main"><small>Soal ${q.question_number} · ${q.duration_seconds||20} detik · ${q.active?'Aktif':'Nonaktif'}</small><strong class="rich-text">${preview}</strong>${shapes?`<div class="bank-svg-preview"><div class="tiu-abc-row">${shapes.prompt.map((shape,i)=>`<div class="tiu-shape"><b>${'ABC'[i]}</b>${shape}</div>`).join('')}</div><div class="tiu-choice-row">${shapes.options.map((shape,i)=>`<div class="tiu-shape"><b>${i+1}</b>${shape}</div>`).join('')}</div></div>`:''}</div><div class="question-actions"><button class="btn btn-secondary edit-question" data-id="${q.id}">Edit</button><button class="btn btn-secondary toggle-question" data-id="${q.id}" data-active="${q.active}">${q.active?'Nonaktifkan':'Aktifkan'}</button></div></div>`;}).join('')||'<p class="muted">Belum ada soal.</p>'}</div><div id="questionEditor"></div>`);
  document.querySelector('#addQuestion').onclick=()=>renderQuestionEditor(null,testCode,(data.at(-1)?.question_number||0)+1);
  document.querySelectorAll('.edit-question').forEach(b=>b.onclick=()=>renderQuestionEditor(data.find(q=>q.id===b.dataset.id),testCode));
  document.querySelectorAll('.toggle-question').forEach(b=>b.onclick=async()=>{const {error}=await db.from('question_bank').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.id);if(error)toast(error.message);else adminQuestions();});
}

function renderQuestionEditor(q,testCode,number){
  const isImage=testCode==='tiu5', isMbti=testCode==='mbti', count=testCode==='test1'||isMbti?2:4, options=q?.options||Array(count).fill('');
  const svg= isImage && q ? renderTiuSvgQuestion(Number(q.question_number)) : null;
  document.querySelector('#questionEditor').innerHTML=`<div class="editor-panel"><h3>${q?'Edit':'Tambah'} Soal</h3><p class="muted rich-editor-help">Blok tulisan lalu pilih B, I, U, atau S. Format akan tersimpan bersama teks soal.</p>${svg?`<div class="bank-svg-editor-preview"><div class="tiu-abc-row">${svg.prompt.map((shape,i)=>`<div class="tiu-shape"><b>${'ABC'[i]}</b>${shape}</div>`).join('')}</div><div class="tiu-choice-row">${svg.options.map((shape,i)=>`<div class="tiu-shape"><b>${i+1}</b>${shape}</div>`).join('')}</div></div>`:''}<form id="questionForm" class="form-grid"><div class="field"><label>Nomor urut</label><input name="question_number" type="number" value="${q?.question_number||number}" required></div><div class="field"><label>Durasi (detik)</label><input name="duration_seconds" type="number" min="5" max="600" value="${q?.duration_seconds||(isImage?45:isMbti?20:testCode==='test1'?15:30)}" required></div>${isImage?`<div class="field full"><div class="notice">Gambar SVG ditentukan oleh nomor soal. Untuk menjaga kesesuaian dengan bank yang disetujui, editor tidak mengubah artwork SVG.</div></div>`:options.map((x,i)=>richEditorField(`option_${i}`,`Pernyataan ${i===0?'A':i===1?'B':i+1}`,x)).join('')}<div class="field full"><label><input name="active" type="checkbox" ${q?.active===false?'':'checked'}> Soal aktif</label></div><div class="field full actions"><button class="btn btn-primary">Simpan Soal</button><button type="button" id="cancelEdit" class="btn btn-secondary">Batal</button></div></form></div>`;
  initRichEditors(document.querySelector('#questionEditor'));
  document.querySelector('#questionEditor').scrollIntoView({behavior:'smooth'});document.querySelector('#cancelEdit').onclick=()=>document.querySelector('#questionEditor').innerHTML='';
  document.querySelector('#questionForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),formattedOptions=isImage?[1,2,3,4,5]:options.map((_,i)=>readRichEditor(form,`option_${i}`));if(!isImage&&formattedOptions.some(x=>!richTextPlain(x)))return toast('Semua pernyataan harus diisi.');const payload={test_code:testCode,question_number:Number(f.get('question_number')),duration_seconds:Number(f.get('duration_seconds')),active:f.get('active')==='on',question_type:isImage?'image_choice':(testCode==='test1'||isMbti)?'paired_choice':'most_least',prompt:isImage?'Pilih jawaban gambar yang tepat.':isMbti?'Pilih pernyataan yang paling sesuai dengan diri Anda.':testCode==='test1'?'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.':'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.',options:formattedOptions,image_url:null};const query=q?db.from('question_bank').update(payload).eq('id',q.id):db.from('question_bank').insert(payload);const {error}=await query;if(error)toast(error.message);else{toast('Soal dan format teks berhasil disimpan.');adminQuestions();}};
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
    layout(`<span class="eyebrow">Sesi Tes</span><h2>Petunjuk ${title}</h2>${instructionRichText('tiu6',testMeta.tiu6.description)}${tiu6InstructionExampleHtml()}<div class="steps"><div class="step"><small>Jumlah</small><strong>8 kelompok · 40 gambar</strong></div><div class="step"><small>Waktu total</small><strong>${seconds?`${seconds/60} menit`:'Tanpa batas waktu'}</strong></div></div><p>Jawaban disimpan otomatis. ${seconds?'Saat waktu habis, hanya jawaban yang sudah diterima server sebelum batas waktu yang digunakan.':'Pastikan keterangan “Jawaban tersimpan” muncul sebelum meninggalkan halaman.'} Isian yang tidak dijawab tetap kosong.</p>${complete?'<p>Tes sudah selesai dan tersimpan.</p>':''}<button id="tiu6Start" class="btn btn-primary" ${state.active===false?'disabled':''}>${complete?'Lanjut ke sesi berikutnya':started?'Lanjutkan tes':'Saya mengerti · Mulai tes'}</button>`);
    document.querySelector('#tiu6Start').onclick=async e=>{if(complete)return advanceTiu6();e.currentTarget.disabled=true;try{await rpc('tiu6_session',{p_session_token:session.token,p_start:true});localStorage.setItem('rtg_test_state',JSON.stringify({testCode:'tiu6',index:'all'}));route('/quiz/tiu6/all');}catch(error){toast(error.message);document.querySelector('#tiu6Start').disabled=false;}};
  }catch(error){layout(`<h2>Tes belum tersedia</h2><p>${escapeHtml(error.message)}</p><p>Hubungi HR untuk memastikan sesi tes sudah tersedia.</p>`);}
}

async function adminWptBank(){
  const {data,error}=await db.from('question_bank').select('*').eq('test_code','wpt').order('question_number');
  const dbCount=(data||[]).length;
  const byNo=Object.fromEntries((data||[]).map(q=>[q.question_number,q]));
  const sourceNote=error?'<div class="notice">Bank WPT belum dapat dibaca dari database. Jalankan update-07-wpt.sql terlebih dahulu.</div>':`<div class="notice">${dbCount}/50 soal WPT terdaftar di database. Teks, pilihan, durasi, dan status soal dapat diedit. Soal No. 49 mendukung pilihan lebih dari satu. SVG No. 7, 38, 42, dan 49 menggunakan artwork SVG yang disimpan di aplikasi.</div>`;
  adminShell('questions',`<div class="section-title"><div><h2>Bank Soal WPT</h2><p class="muted">50 soal · pilihan dan isian manual. Edit teks, format, durasi, atau status soal.</p></div></div><div class="segmented"><a href="#/admin/questions?test=test1">PAPI Kostic</a><a href="#/admin/questions?test=test2">DISC</a><a href="#/admin/questions?test=tiu5">TIU 5</a><a href="#/admin/questions?test=tiu6">TIU 6</a><a href="#/admin/questions?test=mbti">MBTI</a><a class="active" href="#/admin/questions?test=wpt">WPT</a></div>${sourceNote}<div class="question-list">${WPT_QUESTIONS.map(q=>{const dbq=byNo[q.number], prompt=dbq?.prompt??q.prompt, options=dbq?.options??q.options, duration=dbq?.duration_seconds??q.duration_seconds, active=dbq?.active!==false, type=q.response_type==='manual'?'Isian manual':q.response_type==='multi_choice'?'Pilihan lebih dari satu':'Pilihan tunggal';return `<div class="question-item question-item-visual ${active?'':'inactive'}"><div class="question-main"><small>Soal ${q.number} · ${type} · ${duration} detik · ${active?'Aktif':'Nonaktif'}</small><strong class="wpt-question-text rich-text">${renderRichText(prompt)}</strong>${q.visual?`<div class="bank-svg-preview wpt-bank-visual">${q.visual}</div>`:''}${options?.length?`<small class="rich-text">Pilihan: ${options.map(renderRichText).join(' · ')}</small>`:''}</div><div class="question-actions"><button class="btn btn-secondary edit-wpt-question" data-id="${dbq?.id||''}" data-number="${q.number}">Edit</button><button class="btn btn-secondary toggle-wpt-question" data-id="${dbq?.id||''}" data-active="${active}">${active?'Nonaktifkan':'Aktifkan'}</button></div></div>`;}).join('')}</div><div id="wptQuestionEditor"></div>`);
  document.querySelectorAll('.edit-wpt-question').forEach(b=>b.onclick=()=>renderWptQuestionEditor(byNo[Number(b.dataset.number)],WPT_QUESTIONS.find(q=>q.number===Number(b.dataset.number))));
  document.querySelectorAll('.toggle-wpt-question').forEach(b=>b.onclick=async()=>{if(!b.dataset.id){toast('Soal WPT belum terdaftar di database.');return;}const {error}=await db.from('question_bank').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.id);if(error)toast(error.message);else adminWptBank();});
}

function renderWptQuestionEditor(dbq,source){
  if(!dbq)return toast('Soal WPT belum terdaftar di database.');
  const manual=source?.response_type==='manual';
  const options=dbq.options||source?.options||[];
  document.querySelector('#wptQuestionEditor').innerHTML=`<div class="editor-panel"><h3>Edit Soal WPT No. ${dbq.question_number}</h3><p class="muted rich-editor-help">Blok tulisan lalu pilih B, I, U, atau S. Hanya format aman tersebut yang akan disimpan.</p>${source?.visual?`<div class="bank-svg-editor-preview"><div class="notice">Artwork SVG tidak diubah oleh editor ini.</div><div class="wpt-bank-visual">${source.visual}</div></div>`:''}<form id="wptQuestionForm" class="form-grid">${richEditorField('prompt','Pertanyaan',dbq.prompt||source?.prompt||'')}<div class="field"><label>Durasi (detik)</label><input name="duration_seconds" type="number" min="5" max="600" value="${dbq.duration_seconds||source?.duration_seconds||60}" required></div>${manual?'':options.map((x,i)=>richEditorField(`option_${i}`,`Pilihan ${i+1}`,x)).join('')}<div class="field full"><label><input name="active" type="checkbox" ${dbq.active===false?'':'checked'}> Soal aktif</label></div><div class="field full actions"><button class="btn btn-primary">Simpan Perubahan</button><button type="button" id="cancelWptEdit" class="btn btn-secondary">Batal</button></div></form></div>`;
  initRichEditors(document.querySelector('#wptQuestionEditor'));
  document.querySelector('#wptQuestionEditor').scrollIntoView({behavior:'smooth'});
  document.querySelector('#cancelWptEdit').onclick=()=>document.querySelector('#wptQuestionEditor').innerHTML='';
  document.querySelector('#wptQuestionForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),prompt=readRichEditor(form,'prompt'),formattedOptions=manual?null:options.map((_,i)=>readRichEditor(form,`option_${i}`));if(!richTextPlain(prompt))return toast('Pertanyaan harus diisi.');if(formattedOptions?.some(x=>!richTextPlain(x)))return toast('Semua pilihan harus diisi.');const payload={prompt,duration_seconds:Number(f.get('duration_seconds')),active:f.get('active')==='on',updated_at:new Date().toISOString()};if(formattedOptions)payload.options=formattedOptions;const {error}=await db.from('question_bank').update(payload).eq('id',dbq.id);if(error)toast(error.message);else{toast('Soal WPT dan format teks berhasil disimpan.');adminWptBank();}};
}

async function adminTiu5Bank(){
  const questions=Array.from({length:30},(_,i)=>({number:i+1,visual:renderTiuSvgQuestion(i+1)}));
  adminShell('questions',`<h2>Bank Soal TIU 5</h2><div class="segmented"><a href="#/admin/questions?test=test1">PAPI Kostic</a><a href="#/admin/questions?test=test2">DISC</a><a class="active" href="#/admin/questions?test=tiu5">TIU 5</a><a href="#/admin/questions?test=tiu6">TIU 6</a><a href="#/admin/questions?test=mbti">MBTI</a><a href="#/admin/questions?test=wpt">WPT</a></div><div class="notice">TIU 5 dikunci seperti TIU 6. Soal dan artwork SVG adalah versi yang disetujui dan tidak dapat diedit, ditambah, atau dinonaktifkan dari dashboard.</div><div class="question-list">${questions.map(q=>`<div class="question-item question-item-visual"><div class="question-main"><small>Soal ${q.number} · SVG · Terkunci</small><strong>Pola gambar TIU 5</strong><div class="bank-svg-preview"><div class="tiu-abc-row">${q.visual.prompt.map((shape,i)=>`<div class="tiu-shape"><b>${'ABC'[i]}</b>${shape}</div>`).join('')}</div><div class="tiu-choice-row">${q.visual.options.map((shape,i)=>`<div class="tiu-shape"><b>${i+1}</b>${shape}</div>`).join('')}</div></div></div><div class="question-actions"><span class="pill done">Terkunci</span></div></div>`).join('')}</div>`);
}

async function adminTiu6Bank(){
  const {data,error}=await db.from('question_bank').select('*').eq('test_code','tiu6').order('question_number');
  if(error||data?.length!==40)return adminShell('questions','<h2>Bank TIU 6 belum lengkap</h2><p>Jalankan supabase/update-04-tiu6.sql untuk memasang 40 gambar.</p>');
  const questions=data.map(q=>({number:q.question_number,visual:q.visual_data}));
  try{adminShell('questions',`<h2>Bank Soal TIU 6</h2><div class="segmented"><a href="#/admin/questions?test=test1">PAPI Kostic</a><a href="#/admin/questions?test=test2">DISC</a><a href="#/admin/questions?test=tiu5">TIU 5</a><a class="active" href="#/admin/questions?test=tiu6">TIU 6</a><a href="#/admin/questions?test=mbti">MBTI</a><a href="#/admin/questions?test=wpt">WPT</a></div><p>8 kelompok · 40 gambar B/S. Gambar mengikuti revisi yang sudah disetujui. Durasi dan posisi sesi dapat diatur di Pengaturan Tes.</p>${questionMarkup(questions,true)}`);}catch(e){adminShell('questions',`<p>${escapeHtml(e.message)}</p>`);}
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
  adminShell('settings',`<div class="section-title"><div><h2>Urutan Sesi Tes</h2><p class="muted">Pindahkan posisi sesi dan atur waktu. Pengacakan hanya tersedia untuk WPT; nomor asli tetap dipakai untuk penilaian.</p></div></div><div class="settings-grid">${data.map((s,i)=>`<form class="setting-card" data-code="${s.test_code}"><div class="setting-order"><strong>${i+1}</strong><div><h3>${escapeHtml(testMeta[s.test_code]?.name||s.display_name)}</h3><small>${escapeHtml(s.test_code)}</small></div></div><label><input name="active" type="checkbox" ${s.active?'checked':''}> Sesi aktif</label><div class="question-actions"><button type="button" class="btn btn-secondary move-session" data-direction="-1" ${i===0?'disabled':''}>↑ Naik</button><button type="button" class="btn btn-secondary move-session" data-direction="1" ${i===data.length-1?'disabled':''}>↓ Turun</button><button class="btn btn-primary">Simpan</button></div></form>`).join('')}</div>`);
  document.querySelectorAll('.setting-card').forEach(form=>{
    if(['tiu5','tiu6','mbti','wpt'].includes(form.dataset.code)){const s=data.find(x=>x.test_code===form.dataset.code);form.querySelector('.question-actions').insertAdjacentHTML('beforebegin',`<div class="field"><label>Waktu total ${testMeta[form.dataset.code].name} (menit)</label><input name="session_minutes" type="number" min="1" max="1440" step="1" value="${s.session_duration_seconds?s.session_duration_seconds/60:''}" placeholder="Kosong = tanpa batas waktu"><small>Berlaku untuk sesi yang baru dimulai.</small></div>`);}
    if(['test1','test2'].includes(form.dataset.code)){const s=data.find(x=>x.test_code===form.dataset.code);form.querySelector('.question-actions').insertAdjacentHTML('beforebegin',`<div class="field"><label>Waktu per soal (detik)</label><input name="question_seconds" type="number" min="5" max="600" step="1" value="${s.question_duration_seconds||testMeta[form.dataset.code].seconds}" required><small>Berlaku untuk attempt baru; attempt yang sudah dimulai mempertahankan waktunya.</small></div>`);}
    if(form.dataset.code==='wpt'){const s=data.find(x=>x.test_code==='wpt');form.querySelector('.question-actions').insertAdjacentHTML('beforebegin',`<label><input name="randomize_questions" type="checkbox" ${s.randomize_questions?'checked':''}> Acak urutan soal WPT untuk setiap peserta</label><small>Kunci jawaban tetap mengikuti nomor asli soal yang tersimpan.</small>`);}
    form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload={active:f.get('active')==='on',updated_at:new Date().toISOString()};if(['tiu5','tiu6','mbti','wpt'].includes(form.dataset.code))payload.session_duration_seconds=f.get('session_minutes')?Number(f.get('session_minutes'))*60:null;if(['test1','test2'].includes(form.dataset.code))payload.question_duration_seconds=Number(f.get('question_seconds'));if(form.dataset.code==='wpt')payload.randomize_questions=f.get('randomize_questions')==='on';const {error}=await db.from('test_settings').update(payload).eq('test_code',form.dataset.code);toast(error?error.message:'Pengaturan berhasil disimpan.');};
    form.querySelectorAll('.move-session').forEach(button=>button.onclick=async()=>{const index=data.findIndex(x=>x.test_code===form.dataset.code),target=index+Number(button.dataset.direction);if(target<0||target>=data.length)return;const first=data[index],second=data[target];const updates=await Promise.all([db.from('test_settings').update({sort_order:second.sort_order}).eq('test_code',first.test_code),db.from('test_settings').update({sort_order:first.sort_order}).eq('test_code',second.test_code)]);const failed=updates.find(x=>x.error);if(failed)toast(failed.error.message);else adminSettings();});});
}

async function router(){
  if(disposeTiu6){disposeTiu6();disposeTiu6=null;}
  clearTimer(); const path=(location.hash.slice(1)||'/').split('/').filter(Boolean);
  if(path[0]==='application') return applicationPage();
  if(path[0]==='notice') return preTestNoticePage();
  if(path[0]==='instructions') return instructionsPage(path[1]||'test1');
  if(path[0]==='quiz'&&path[1]==='tiu5') return tiu5AllPage();
  if(path[0]==='quiz'&&path[1]==='wpt') return wptQuizPage(Number(path[2]||0));
  if(path[0]==='quiz'&&path[1]==='tiu6') {
    if(!session.token)return route('/');
    const expectedHash=location.hash;
    try{const cleanup=await mountTiu6({rpc,token:session.token,layout,setHeader,title:await participantTitle('tiu6'),onComplete:advanceTiu6,onNotStarted:()=>route('/instructions/tiu6'),isCurrent:()=>location.hash===expectedHash});if(location.hash!==expectedHash)cleanup();else disposeTiu6=cleanup;}
    catch(error){layout(`<h2>Tes belum dapat dibuka</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-secondary" href="#/instructions/tiu6">Kembali ke petunjuk</a>`);}return;
  }
  if(path[0]==='quiz') return quizPage(path[1],Number(path[2]||0));
  if(path[0]==='complete') return completePage();
  if(path[0]==='admin') return adminPage((path[1]||'dashboard').split('?')[0]);
  if(session.token) return continueCandidateSession();
  return loginPage();
}

const navigate=()=>router().catch(error=>layout(`<h2>Halaman belum dapat dibuka</h2><p>${escapeHtml(error.message)}</p>`));
window.addEventListener('hashchange',navigate);
window.addEventListener('beforeunload',e=>{if(location.hash.includes('/quiz/')){e.preventDefault();e.returnValue='';}});
initAmbientGrid();
navigate();

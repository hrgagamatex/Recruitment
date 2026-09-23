import {WPT_QUESTIONS} from './wpt.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const richTags={B:'strong',STRONG:'strong',I:'em',EM:'em',U:'u',S:'s',STRIKE:'s',BR:'br',DIV:'div',P:'p'};
function safeRich(value=''){
 if(typeof document==='undefined')return esc(value);
 const source=document.createElement('template');source.innerHTML=String(value??'');
 const output=document.createElement('div');
 const copy=(node,parent)=>{if(node.nodeType===Node.TEXT_NODE){parent.append(document.createTextNode(node.nodeValue||''));return;}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=richTags[node.tagName];if(!tag){[...node.childNodes].forEach(child=>copy(child,parent));return;}const clean=document.createElement(tag);[...node.childNodes].forEach(child=>copy(child,clean));parent.append(clean);};
 [...source.content.childNodes].forEach(node=>copy(node,output));return output.innerHTML.trim();
}
function plain(value=''){if(typeof document==='undefined')return String(value??'').replace(/<[^>]*>/g,'').trim();const el=document.createElement('div');el.innerHTML=safeRich(value);return (el.textContent||'').replace(/\s+/g,' ').trim();}
export function resolveWpt(snapshot){
 return snapshot.map(q=>{
  const number=Number(q.number??q.question_number),current=WPT_QUESTIONS.find(x=>x.number===number);
  if(!current)throw new Error(`Nomor WPT ${number} belum memiliki acuan.`);
  return {
   ...q,
   number,
   prompt:q.prompt||current.prompt,
   options:Array.isArray(q.options)&&q.options.length?[...q.options]:[...(current.options||[])],
   duration_seconds:q.duration_seconds||q.duration||current.duration_seconds||60,
   response_type:current.response_type,
   multiline:current.multiline||false,
   visual:(current.visual||'').replace(/\\"/g,'"'),
   source_version:'google-form-2026-09-18'
  };
 });
}
function crop(svg,box,label){
 // Only use the trusted, checked-in SVG geometry. No database markup is inserted here.
 const inner=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'').replace(/<title[^>]*>[\s\S]*?<\/title>/g,'').replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
}
function choiceFigure(svg,box,label,number){
 const w=number===7?210:160,h=number===7?155:111;
 const inner=crop(svg,box,plain(label)).replace('<svg ',`<svg x="${(w-box[2])/2}" y="${(h-box[3])/2}" width="${box[2]}" height="${box[3]}" overflow="hidden" `);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
}
export function wptAnswerMarkup(q){
 if(q.response_type==='manual')return `${q.visual?`<div class="wpt-visual wpt-outline">${q.visual}</div>`:''}<div class="wpt-manual"><label for="wptAnswer">Jawaban Anda</label>${q.multiline?'<textarea id="wptAnswer" rows="3" autocomplete="off" spellcheck="false"></textarea>':'<input id="wptAnswer" type="text" autocomplete="off" spellcheck="false" placeholder="Tulis jawaban di sini">'}</div>`;
 const multi=q.response_type==='multi_choice';
 const special=q.source_version==='google-form-2026-09-18'&&[7,49].includes(q.number);
 const boxes=q.number===7?[[28,65,126,70],[178,42,107,103],[314,35,107,105],[480,70,196,62],[690,7,138,139]]:[[30,0,102,80],[217,5,84,97],[355,5,104,106],[559,2,98,105],[759,46,63,56]];
 let out=q.number===7&&special?`<aside class="wpt-example"><span>Contoh</span>${crop(q.visual,[850,0,228,155],'Dua bentuk contoh di dalam kurung; tidak dapat dipilih')}</aside>`:!special&&q.visual?`<div class="wpt-visual">${q.visual}</div>`:'';
 if(multi)out+='<p class="muted">Anda dapat memilih lebih dari satu gambar.</p>';
 return out+`<div class="${special?'wpt-figure-options':'options'}">${q.options.map((option,i)=>`<label class="${special?'wpt-figure-option':'option'}"><input type="${multi?'checkbox':'radio'}" name="wptAnswer" value="${i+1}">${special?choiceFigure(q.visual,boxes[i],plain(option),q.number):''}<span class="rich-text">${safeRich(option)}</span></label>`).join('')}</div>`;
}
export function wptPayload(q,selection){
 if(q.response_type==='manual')return typeof selection==='string'&&selection.trim()?{text:selection}:null;
 if(q.response_type==='multi_choice'){
  const choices=[...new Set((Array.isArray(selection)?selection:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=q.options.length))].sort((a,b)=>a-b);
  return choices.length?{choices}:null;
 }
 return Number.isInteger(selection)&&selection>=1&&selection<=q.options.length?{choice:selection,text:plain(q.options[selection-1])}:null;
}
export function wptDisplayAnswer(a){return Array.isArray(a?.choices)?a.choices.join(', '):a?.text??a?.choice??'';}

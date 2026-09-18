// Keys are fetched only after HR authentication; no answer keys are bundled here.
export const names={test1:'PAPI Kostic',test2:'DISC',tiu5:'TIU 5',tiu6:'TIU 6',mbti:'MBTI',wpt:'WPT'};
export const escapeHtml=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function scorePapi(values,cfg){
  const raw=Object.fromEntries(Object.entries(cfg.rules).map(([k,terms])=>[k,terms.filter(([q,v])=>values[q-1]===v).length]));
  const chart={...raw};for(const k of cfg.reversedChart)chart[k]=9-raw[k];
  return {raw,chart,answered:values.filter(v=>v===1||v===2).length};
}
export function scoreDisc(values,cfg){
  const most={D:0,I:0,S:0,C:0,'*':0},least={...most};let answered=0;
  values.forEach((v,i)=>{if(!v||!Number.isInteger(v.most)||!Number.isInteger(v.least)||v.most===v.least||v.most<0||v.most>3||v.least<0||v.least>3)return;answered++;most[cfg.rules[i].most[v.most]]++;least[cfg.rules[i].least[v.least]]++;});
  const difference=Object.fromEntries([... 'DISC'].map(k=>[k,most[k]-least[k]]));
  const raw={most,least,difference},scaled={},profiles={};
  for(const line of Object.keys(raw)){
    scaled[line]=[...'DISC'].map((k,i)=>cfg.scales[line].filter(row=>row[0]<=raw[line][k]).at(-1)?.[i+1]??null);
    const refs=Object.fromEntries(['BB','BC','BD','BE'].map((k,i)=>[k,scaled[line][i]]));
    profiles[line]=cfg.profiles.find(p=>p.conditions.every(([a,op,b])=>{const x=refs[a],y=b.startsWith('B')?refs[b.slice(0,2)]:Number(b);return ({'>':x>y,'<':x<y,'>=':x>=y,'<=':x<=y,'=':x===y})[op];}))||null;
  }
  return {raw,scaled,profiles,answered};
}
export function scoreWpt(values,cfg){
 const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
 const list=v=>{const a=Array.isArray(v)?v:typeof v==='string'?v.trim().split(/[\s,;\-/]+/):[];return a.length&&a.every(x=>/^[1-5]$/.test(String(x)))?[...new Set(a.map(Number))].sort((a,b)=>a-b):null;};
 let correct=0,answered=0;
 const keys=Array.isArray(cfg.keys)?cfg.keys:[];
 const details=Array.from({length:50},(_,i)=>{
  const v=values[i],multi=Array.isArray(v?.choices)?v.choices:Array.isArray(v)?v:null;
  const display=multi?multi.join(', '):v&&typeof v==='object'?v.text??v.choice??'':v;
  const ok=multi?multi.length>0:v!==null&&v!==undefined&&norm(display)!=='';
  if(ok)answered++;
  const key=keys[i];let good=false;
  if(ok&&key!==undefined&&key!==null){
   if(multi){const a=list(multi),b=list(key);good=!!a&&!!b&&JSON.stringify(a)===JSON.stringify(b);}
   else if(v&&typeof v==='object')good=norm(v.text)===norm(key)||(Number.isInteger(v.choice)&&norm(v.choice)===norm(key));
   else good=norm(v)===norm(key);
  }
  if(good)correct++;
  return {number:i+1,value:ok?display:null,correct:good,key};
 });
 const ready=keys.length===50&&keys.every(k=>k!==null&&k!==undefined&&norm(k)!=='');
 const points=correct===0?0:Number(cfg.conversion?.[correct-1]??correct);
 const category=cfg.categories?.find(x=>points>=x.min&&points<=x.max)||null;
 return {correct,answered,blank:50-answered,wrong:answered-correct,points,category,details,ready};
}

export function scoreTiu(values,cfg){
 const correct=cfg.keys.filter((k,i)=>values[i]===k).length,answered=values.filter(v=>v!==null&&v!==undefined).length;
 return {correct,answered,blank:cfg.keys.length-answered,wrong:answered-correct,categories:cfg.ranges.filter(r=>correct>=r.min&&correct<=r.max).map(r=>r.label)};
}
// Reconcile selected statements against the fixed scoring version, including reordered options.
export function mapPersonality(code,attempt,rows,config){
 const ref=config.reference[code],values=Array(ref.length).fill(null),issues=[];
 const norm=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase();
 for(const row of rows){
   if(!row.answer)continue;
   const q=attempt.question_snapshot?.find(q=>q.number===row.question_number);
   if(!q?.options){issues.push(row.question_number);continue;}
   const match=ref.find(r=>r.options.length===q.options.length&&r.options.every(o=>q.options.some(x=>norm(x)===norm(o))));
   if(!match){issues.push(row.question_number);continue;}
   const index=v=>Number.isInteger(v)&&q.options[v]!==undefined?match.options.findIndex(x=>norm(x)===norm(q.options[v])):-1;
   if(code==='test1'){const n=index(row.answer.choice);if(n>=0)values[match.number-1]=n+1;else issues.push(row.question_number);}
   else {const most=index(row.answer.most),least=index(row.answer.least);if(most>=0&&least>=0&&most!==least)values[match.number-1]={most,least};else issues.push(row.question_number);}
 }
 return {values,issues};
}


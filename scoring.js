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
 const numberSet=v=>{
  const source=Array.isArray(v)?v:String(v??'').match(/\d+/g)||[];
  const numbers=[...new Set(source.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
  return numbers.length?numbers:null;
 };
 const sameSet=(left,right)=>{
  const a=numberSet(left),b=numberSet(right);
  return !!a&&!!b&&a.length===b.length&&a.every((value,index)=>value===b[index]);
 };
 const keyReady=key=>{
  if(key===undefined||key===null)return false;
  if(typeof key==='object'&&!Array.isArray(key))return Array.isArray(key.values)&&key.values.length>0;
  return norm(key)!=='';
 };
 const matches=(display,multi,key,raw)=>{
  const candidates=[display];
  if(raw&&typeof raw==='object'&&Number.isInteger(raw.choice))candidates.push(raw.choice);
  if(typeof key==='object'&&key!==null&&!Array.isArray(key)){
   if(key.mode==='any')return key.values.some(value=>candidates.some(candidate=>norm(candidate)===norm(value)));
   if(key.mode==='set')return sameSet(multi??display,key.values);
  }
  if(multi)return sameSet(multi,key);
  return candidates.some(candidate=>norm(candidate)===norm(key));
 };
 let correct=0,answered=0;
 const keys=Array.isArray(cfg.keys)?cfg.keys:[];
 const details=Array.from({length:50},(_,i)=>{
  const value=values[i],multi=Array.isArray(value?.choices)?value.choices:Array.isArray(value)?value:null;
  const display=multi?multi.join(', '):value&&typeof value==='object'?value.text??value.choice??'':value;
  const filled=multi?multi.length>0:value!==null&&value!==undefined&&norm(display)!=='';
  if(filled)answered++;
  const key=keys[i];
  const good=filled&&keyReady(key)&&matches(display,multi,key,value);
  if(good)correct++;
  return {number:i+1,value:filled?display:null,correct:good,key};
 });
 const ready=keys.length===50&&keys.every(keyReady);
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

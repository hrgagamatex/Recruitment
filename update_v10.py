from pathlib import Path
import re
p=Path('/mnt/data/work/v10/wpt.js')
s=p.read_text()

def replace_visual(num, svg):
    global s
    # Replace visual field only inside object with matching number, non-greedy until next object
    pattern = rf'(\{{"number":{num}.*?"response_type":"[^"]+","visual":)"(?:[^"\\]|\\.)*"(\}})'
    repl = lambda m: m.group(1)+json.dumps(svg,separators=(',',':'))+m.group(2)
    ns,n=re.subn(pattern,repl,s,count=1,flags=re.S)
    if n!=1:
        raise RuntimeError(f'visual replace failed {num}: {n}')
    s=ns

import json
svg7='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 330" role="img" aria-label="Gambar WPT nomor 7"><rect width="1500" height="330" fill="#fff"/><g fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M70 175 L175 125 L285 175 L165 215 Z"/><path d="M70 175 L285 175"/><path d="M355 110 L485 35 L555 175 L425 250 Z"/><path d="M390 170 L515 100"/><path d="M650 175 L755 70 L875 175 L755 280 Z"/><path d="M650 175 L875 175"/><path d="M940 175 L1060 140 L1180 175 L1060 215 Z"/><path d="M940 175 L1180 175"/><path d="M1240 65 L1305 120 L1410 235 L1305 285 L1240 225 Z"/><path d="M1240 65 L1240 225"/></g><g font-family="Arial, sans-serif" font-size="34" fill="#111" text-anchor="middle"><text x="175" y="58">1</text><text x="455" y="30">2</text><text x="755" y="55">3</text><text x="1060" y="92">4</text><text x="1300" y="45">5</text></g></svg>'''
svg38='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 900" role="img" aria-label="Gambar WPT nomor 38"><rect width="1100" height="900" fill="#fff"/><path d="M205 355 L430 115 L700 135 L900 315 L770 675 L535 825 L250 625 Z" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="round"/><g font-family="Arial, sans-serif" font-size="36" fill="#111" text-anchor="middle"><text x="160" y="375">1</text><text x="415" y="90">2</text><text x="715" y="105">3</text><text x="935" y="310">4</text><text x="820" y="365">5</text><text x="795" y="735">6</text><text x="575" y="865">7</text><text x="485" y="760">8</text><text x="930" y="455">9</text><text x="925" y="570">10</text><text x="900" y="690">11</text><text x="785" y="835">12</text><text x="545" y="845">13</text><text x="285" y="690">14</text></g></svg>'''
# Use closer polygon and labels from supplied reference; labels identify boundary positions.
svg42='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1050" role="img" aria-label="Gambar WPT nomor 42"><rect width="1200" height="1050" fill="#fff"/><g fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M120 575 L260 430 L390 310 L520 420 L625 335 L545 215 L650 105 L825 235 L1025 455 L900 610 L735 720 L600 575 L455 485 L320 610 L215 550 Z"/><defs><marker id="a42" markerWidth="12" markerHeight="12" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z" fill="#111"/></marker></defs><path d="M120 575 L260 430 L390 310 L520 420 L625 335" marker-mid="url(#a42)"/><path d="M545 215 L650 105 L825 235 L1025 455" marker-mid="url(#a42)"/><path d="M1025 455 L900 610 L735 720 L600 575 L455 485" marker-mid="url(#a42)"/><path d="M455 485 L320 610 L215 550 L120 575" marker-mid="url(#a42)"/></g><g font-family="Arial, sans-serif" font-size="30" fill="#111" text-anchor="middle"><text x="80" y="610">1</text><text x="250" y="405">2</text><text x="375" y="285">3</text><text x="510" y="395">4</text><text x="510" y="195">5</text><text x="600" y="345">6</text><text x="565" y="470">7</text><text x="645" y="315">8</text><text x="555" y="250">9</text><text x="625" y="95">10</text><text x="650" y="45">11</text><text x="825" y="205">12</text><text x="860" y="270">13</text><text x="1035" y="435">14</text><text x="1040" y="500">15</text><text x="940" y="585">16</text><text x="875" y="650">17</text><text x="755" y="755">18</text><text x="700" y="820">19</text><text x="585" y="610">20</text><text x="435" y="520">21</text><text x="450" y="455">22</text><text x="300" y="575">23</text><text x="175" y="660">24</text></g></svg>'''
svg49='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1550 360" role="img" aria-label="Gambar pilihan WPT nomor 49"><rect width="1550" height="360" fill="#fff"/><g fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round"><path d="M45 300 L235 35 L235 300 Z"/><path d="M365 300 L365 160 L505 160 L505 55 L590 55 L590 300 Z"/><rect x="725" y="45" width="240" height="255"/><path d="M1065 55 L1065 300 L1305 300 Z"/><rect x="1400" y="125" width="105" height="105"/></g><g font-family="Arial, sans-serif" font-size="34" fill="#111" text-anchor="middle"><text x="140" y="330">1</text><text x="480" y="330">2</text><text x="845" y="330">3</text><text x="1185" y="330">4</text><text x="1452" y="270">5</text></g></svg>'''
replace_visual(7,svg7)
replace_visual(38,svg38)
replace_visual(42,svg42)
replace_visual(49,svg49)
# Mark 49 as multi choice.
s,n=re.subn(r'("number":49.*?"duration_seconds":60,"response_type":)"choice"',r'\1"multi_choice"',s,count=1,flags=re.S)
if n!=1: raise RuntimeError('response type 49 failed')
p.write_text(s)

# Patch WPT participant renderer for multi-choice. Keep existing image_choice behavior.
p=Path('/mnt/data/work/v10/app.js'); a=p.read_text()
old="""  else if(q.response_type==='choice' || q.response_type==='image_choice') body=`${visual}<div class=\"${q.visual ? 'image-options wpt-options' : 'options'}\">${q.options.map((o,i)=>q.visual ? `<label class=\"image-option\"><input type=\"radio\" name=\"wptAnswer\" value=\"${i+1}\"><span class=\"radio-mark\"></span><strong>${i+1}</strong></label>` : `<label class=\"option\"><input type=\"radio\" name=\"wptAnswer\" value=\"${escapeHtml(o)}\"><span>${escapeHtml(o)}</span></label>`).join('')}</div>`;\n  else body=visual;"""
new="""  else if(q.response_type==='choice' || q.response_type==='image_choice' || q.response_type==='multi_choice') {\n    const multi=q.response_type==='multi_choice';\n    body=`${visual}<div class=\"${q.visual ? 'image-options wpt-options' : 'options'} ${multi?'wpt-multi-options':''}\">${q.options.map((o,i)=>q.visual ? `<label class=\"image-option\"><input type=\"${multi?'checkbox':'radio'}\" name=\"wptAnswer\" value=\"${i+1}\"><span class=\"radio-mark\"></span><strong>${i+1}</strong></label>` : `<label class=\"option\"><input type=\"${multi?'checkbox':'radio'}\" name=\"wptAnswer\" value=\"${escapeHtml(o)}\"><span>${escapeHtml(o)}</span></label>`).join('')}</div>`;\n  } else body=visual;"""
if old not in a: raise RuntimeError('renderer block not found')
a=a.replace(old,new)
old2="""  document.querySelectorAll('[name=wptAnswer]').forEach(x=>x.onchange=()=>setAnswer(q.response_type==='image_choice'?Number(x.value):x.value));"""
new2="""  document.querySelectorAll('[name=wptAnswer]').forEach(x=>x.onchange=()=>{\n    if(q.response_type==='multi_choice'){\n      const selected=[...document.querySelectorAll('[name=wptAnswer]:checked')].map(el=>Number(el.value));\n      setAnswer(selected.length?selected:null);\n    } else setAnswer(q.response_type==='image_choice'?Number(x.value):x.value);\n  });"""
if old2 not in a: raise RuntimeError('handler block not found')
a=a.replace(old2,new2)
old3="""await rpc('save_test_answer',{p_session_token:session.token,p_test_code:'wpt',p_question_number:q.number,p_answer:q.response_type==='image_choice'?{choice:Number(answer)}:{text:String(answer??'')},p_timed_out:timedOut,p_elapsed_seconds:(q.duration_seconds||60)-remaining});"""
new3="""await rpc('save_test_answer',{p_session_token:session.token,p_test_code:'wpt',p_question_number:q.number,p_answer:q.response_type==='image_choice'?{choice:Number(answer)}:q.response_type==='multi_choice'?{choices:Array.isArray(answer)?answer:[]}:{text:String(answer??'')},p_timed_out:timedOut,p_elapsed_seconds:(q.duration_seconds||60)-remaining});"""
if old3 not in a: raise RuntimeError('save block not found')
a=a.replace(old3,new3)
p.write_text(a)

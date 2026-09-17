import {escapeHtml as e} from './scoring.js';
const order=[...'NGALPITVSBOXCDRZEKFW'];
// Twenty radial axes, matching the supplied PAPI reference (clockwise from N).
order.splice(0,order.length,...'NGALPITVSBOXCDRZEKFW');
const labels={N:'Tugas selesai',G:'Pekerja keras',A:'Berprestasi',L:'Memimpin',P:'Mengatur orang',I:'Keputusan',T:'Tempo kerja',V:'Aktif',S:'Pergaulan luas',B:'Kelompok',O:'Kedekatan',X:'Perhatian',C:'Teratur',D:'Rinci',R:'Teoritis',Z:'Perubahan',E:'Emosi',K:'Agresivitas',F:'Dukungan atasan',W:'Aturan'};
const pt=(r,a)=>[360+r*Math.sin(a*Math.PI/180),360-r*Math.cos(a*Math.PI/180)].map(x=>+x.toFixed(2));
function sector(r1,r2,a,b){const p=pt(r2,a),q=pt(r2,b),s=pt(r1,b),t=pt(r1,a);return `M${p} A${r2} ${r2} 0 0 1 ${q} L${s} A${r1} ${r1} 0 0 0 ${t} Z`;}
export function papiChart(scores){
 const groups=[['ARAH KERJA',0,3,'#df1522'],['KEPEMIMPINAN',3,6,'#ce08ca'],['AKTIVITAS',6,8,'#252be8'],['PERGAULAN',8,12,'#08a9cf'],['GAYA KERJA',12,15,'#00bd73'],['SIFAT',15,18,'#d7c900'],['KETAATAN',18,20,'#e98009']];
 let body='<rect width="720" height="720" fill="white"/>';
 for(let v=1;v<=9;v++)body+=`<circle cx="360" cy="360" r="${v*23}" fill="none" stroke="#d6dee8"/>`;
 for(let i=0;i<20;i++){
   const a=i*18,[x,y]=pt(207,a),[lx,ly]=pt(226,a),[tx,ty]=pt(268,a);
   body+=`<path d="${sector(210,246,a-9,a+9)}" fill="#58d00c" stroke="white" stroke-width="2"/><path d="${sector(247,293,a-9,a+9)}" fill="#fff9b8" stroke="white" stroke-width="2"/><path d="M360 360 L${x} ${y}" stroke="#d6dee8"/><text x="${lx}" y="${ly+7}" text-anchor="middle" font-size="24" font-weight="700">${order[i]}</text><text transform="translate(${tx} ${ty}) rotate(${a>90&&a<270?a+180:a})" text-anchor="middle" font-size="9">${e(labels[order[i]])}</text>`;
   for(let v=1;v<=9;v++){const [nx,ny]=pt(v*23,a);body+=`<text x="${nx+3}" y="${ny-3}" font-size="7" fill="#64748b">${['K','Z'].includes(order[i])?9-v:v}</text>`;}
 }
 groups.forEach(([name,start,end,color])=>{const a=start*18-9,b=end*18-9,mid=(a+b)/2,bottom=mid>90&&mid<270;body+=`<path d="${sector(294,344,a,b)}" fill="${color}" stroke="white" stroke-width="3"/>`;[...name].forEach((letter,i)=>{const angle=mid+(i-(name.length-1)/2)*3*(bottom?-1:1),[x,y]=pt(319,angle);body+=`<text transform="translate(${x} ${y}) rotate(${bottom?angle+180:angle})" text-anchor="middle" dominant-baseline="central" fill="white" font-size="20" font-weight="700">${letter}</text>`;});});
 body+=`<polygon points="${order.map((k,i)=>pt((scores[k]??0)*23,i*18).join(',')).join(' ')}" fill="#4b8de54a" stroke="#2478db" stroke-width="3"/>`;
 return `<svg class="papi-chart" viewBox="0 0 720 720" role="img" aria-label="Diagram PAPI Kostic 20 aspek" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Arial, sans-serif">${body}</svg>`;
}
export function discChart(values,title){
 const y=v=>220-v*22;let body='<rect width="310" height="420" fill="white"/>';
 for(let v=-8;v<=8;v++){body+=`<line x1="42" y1="${y(v)}" x2="282" y2="${y(v)}" stroke="${v===0?'#334155':'#e2e8f0'}"/><text x="32" y="${y(v)+4}" text-anchor="end" font-size="11">${v}</text>`;}
 const xs=[62,128,194,260];[...'DISC'].forEach((k,i)=>body+=`<text x="${xs[i]}" y="25" text-anchor="middle" font-size="18" font-weight="700">${k}</text><line x1="${xs[i]}" y1="44" x2="${xs[i]}" y2="396" stroke="#e2e8f0"/>`);
 body+=`<polyline points="${values.map((v,i)=>`${xs[i]},${y(v)}`).join(' ')}" fill="none" stroke="#2463b0" stroke-width="3"/>`;
 values.forEach((v,i)=>body+=`<circle cx="${xs[i]}" cy="${y(v)}" r="4" fill="#2463b0"/><text x="${xs[i]}" y="${y(v)-10}" text-anchor="middle" font-size="12">${v}</text>`);
 return `<section class="disc-plot"><h3>${e(title)}</h3><svg viewBox="0 0 310 420" role="img" aria-label="${e(title)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" font-family="Arial, sans-serif">${body}</svg></section>`;
}
export {order as papiOrder,labels as papiLabels};

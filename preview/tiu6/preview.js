
const fields=[...document.querySelectorAll('select')];
fields.forEach(f=>f.addEventListener('change',()=>{f.classList.toggle('answered',!!f.value);document.getElementById('status').textContent=fields.filter(x=>x.value).length+' / 40 terisi';}));
document.getElementById('export').addEventListener('click',()=>{const csv='item_id,answer\r\n'+fields.map(f=>f.dataset.item+','+f.value).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='TIU6-jawaban-percobaan.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

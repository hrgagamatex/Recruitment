(() => {
      const plates = [
        {answer:'9', bg:['#86b099','#95bba6','#78a68d'], fg:['#ed8442','#f59654','#db7136']},
        {answer:'6', bg:['#d4bd82','#c4aa6e','#e0ca91'], fg:['#749079','#66846d','#879e85']},
        {answer:'8', bg:['#a8b88a','#bbc39a','#96a979'], fg:['#d27752','#bb6245','#e18a63']},
        {answer:'3', bg:['#d1ac78','#c19865','#dbb987'], fg:['#71866d','#61775e','#82967b']},
        {answer:'5', bg:['#8eaf9d','#9dbbaa','#7ba18d'], fg:['#eb7e47','#f39358','#d96b37']},
        {answer:'2', bg:['#cbb37d','#dac38e','#bda66f'], fg:['#73917b','#66846f','#86a08b']},
        {answer:'7', bg:['#a3b88d','#b5c39f','#90aa7e'], fg:['#c96f4d','#da825d','#b95e40']},
        {answer:'4', bg:['#d1ad78','#c19865','#dbba87'], fg:['#718a74','#617a64','#849b85']},
        {answer:'1', bg:['#8fb2a0','#a2c0b0','#7fa590'], fg:['#ed7e46','#f59658','#da6c39']},
        {answer:'0', bg:['#cdb47e','#bea36d','#dbc48e'], fg:['#708c75','#617e68','#839b82']},
        {answer:'6', bg:['#a4b990','#b5c39f','#90a97f'], fg:['#c96f4e','#da825d','#b95e41']},
        {answer:'3', bg:['#d0ad79','#c19967','#dab986'], fg:['#728b75','#627b65','#849a83']},
        {answer:'8', bg:['#8fb2a0','#a2c0b0','#7fa590'], fg:['#ec7d46','#f49456','#da6b38']},
        {answer:'2', bg:['#ccb57f','#bea570','#dac38e'], fg:['#708d76','#617f69','#849b84']},
        {answer:'5', bg:['#a4b98f','#b6c49f','#91aa7f'], fg:['#c86e4d','#d9815b','#b85d40']},
        {answer:'7', bg:['#d0ac77','#c09764','#dbb986'], fg:['#728b75','#627b65','#849a83']},
        {answer:'4', bg:['#8eaf9d','#9fbcab','#7ca18e'], fg:['#eb7d46','#f49357','#d96a38']},
        {answer:'9', bg:['#cdb57f','#bea46e','#dac48e'], fg:['#718e77','#628069','#849c84']},
        {answer:'3', bg:['#a4b98f','#b5c39e','#90a97e'], fg:['#ca704f','#da825e','#ba5f42']},
        {answer:'6', bg:['#d0ad78','#c09865','#dbba87'], fg:['#708a73','#607a63','#839a82']},
        {answer:'2', bg:['#8fb2a0','#a2c0b0','#7fa590'], fg:['#ed7d46','#f49557','#da6b38']},
        {answer:'5', bg:['#cdb47f','#bea46f','#dbc48f'], fg:['#718d76','#627f69','#849c84']}
      ];

      let checkpointRows=Array(34).fill(null), saveId=0;
      const pending=new Map();
      function checkpoint(finish=false){
        return new Promise((resolve,reject)=>{
          const id=++saveId;pending.set(id,{resolve,reject});
          parent.postMessage({type:'ishihara-save',id,answers:checkpointRows,finish},location.origin);
        });
      }
      window.addEventListener('message',event=>{
        if(event.source!==parent||event.origin!==location.origin)return;
        const m=event.data;
        if(m?.type==='ishihara-ack'){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve();}
        if(m?.type==='ishihara-init'){
          checkpointRows=m.answers;
          for(let i=0;i<22;i++)if(m.answers[i])answers[i]=m.answers[i].choice;
          for(let i=22;i<34;i++)if(m.answers[i])lineResults[i-22]=m.answers[i];
          current=answers.findIndex(x=>x===undefined);if(current<0)current=answers.length;
          if(current>=22){calculateResult();lineCurrent=lineResults.findIndex(x=>x===undefined);if(lineCurrent<0)lineCurrent=lineResults.length;if(lineCurrent<12)startLine(false);else showCombinedResult();}
          else showNextPlate();
        }
      });
      const test = document.querySelector('.js-cbtTest');
      const brand = document.getElementById('testBrand');
      const image = document.querySelector('.js-cbtNumberImage');
      const svg = image.querySelector('svg');
      const dots = [...svg.querySelectorAll('circle')];
      const steps = [...document.querySelectorAll('.js-cbtStep')];
      const progress = document.querySelector('.cbt-progressbar');
      const progressFill = document.createElement('span');
      const buttons = [...document.querySelectorAll('.js-cbtAnswerButton')];
      const answers = [];
      let numberSummary = {correct:0, incorrect:0, uncertain:0, ratio:0, label:'', title:'', description:'', meaning:''};
      let current = 0;
      let locked = false;

      progress.dataset.step = '1';
      progressFill.className = 'cbt-progressbar-fill';
      progress.appendChild(progressFill);
      const status = document.createElement('p');
      status.className = 'answer-status';
      status.textContent = 'Pilih angka yang terlihat pada pelat.';
      document.querySelector('.cbtButtons').after(status);

      dots.forEach((dot, index) => {
        dot.dataset.x = dot.getAttribute('cx');
        dot.dataset.y = dot.getAttribute('cy');
        dot.dataset.radius = dot.getAttribute('r');
        dot.dataset.originalFill = dot.getAttribute('fill');
        dot.style.setProperty('--dot-delay', `${(index * 37) % 185}ms`);
      });

      function seeded(seed) {
        let value = seed >>> 0;
        return () => {
          value += 0x6D2B79F5;
          let t = value;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }

      function recolorPlate(index) {
        if (index === 0) {
          dots.forEach(dot => dot.setAttribute('fill', dot.dataset.originalFill));
          return;
        }
        const plate = plates[index];
        const rand = seeded(index * 104729 + 31);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 666;
        const context = canvas.getContext('2d', {willReadFrequently:true});
        context.fillStyle = '#000';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '900 430px Arial Black, Arial, sans-serif';
        context.fillText(plate.answer, 333, 355);
        const mask = context.getImageData(0,0,666,666).data;
        dots.forEach(dot => {
          const x = Math.max(0, Math.min(665, Math.round(Number(dot.dataset.x))));
          const y = Math.max(0, Math.min(665, Math.round(Number(dot.dataset.y))));
          const foreground = mask[(y * 666 + x) * 4 + 3] > 70;
          const palette = foreground ? plate.fg : plate.bg;
          dot.setAttribute('fill', palette[Math.floor(rand() * palette.length)]);
        });
      }

      function updateProgress() {
        progress.dataset.step = String(current + 1);
        progressFill.style.width = `${(current / (plates.length - 1)) * 100}%`;
        steps.forEach((step, index) => {
          step.classList.toggle('cbt-done', index < current);
          step.classList.toggle('cbt-active', index === current);
        });
      }

      function showNextPlate() {
        recolorPlate(current);
        updateProgress();
        image.classList.remove('is-hiding');
        image.classList.add('is-showing');
        setTimeout(() => image.classList.remove('is-showing'), 650);
      }

      function calculateResult() {
        const correct = answers.reduce((count, answer, index) => count + (answer === plates[index].answer ? 1 : 0), 0);
        const uncertain = answers.filter(answer => answer === 'Enter' || answer === 'Not sure').length;
        const incorrect = plates.length - correct - uncertain;
        const ratio = correct / plates.length;

        let label, title, description, meaning;
        if (ratio >= .82) {
          label = 'Tidak ditemukan indikasi kuat';
          title = 'Penglihatan warna dalam rentang umum';
          description = 'Sebagian besar pelat warna dapat Anda kenali dengan baik.';
          meaning = 'Pada rangkaian ini tidak tampak pola kesulitan warna yang konsisten. Hasil tetap dapat dipengaruhi layar dan pencahayaan.';
        } else if (ratio >= .59) {
          label = 'Perlu konfirmasi';
          title = 'Kemungkinan kesulitan warna ringan';
          description = 'Beberapa pelat belum dikenali secara konsisten.';
          meaning = 'Ulangi tes dengan filter malam dimatikan dan kecerahan yang nyaman. Bila pola yang sama berulang, lakukan pemeriksaan profesional.';
        } else {
          label = 'Ditemukan indikasi skrining';
          title = 'Kemungkinan kesulitan membedakan warna';
          description = 'Sejumlah pola pada pelat warna sulit dikenali.';
          meaning = 'Hasil ini belum dapat menentukan tipe Deutan, Protan, atau Tritan. Penentuan tipe memerlukan matriks skor dan pemeriksaan tervalidasi.';
        }
        numberSummary = {correct,incorrect,uncertain,ratio,label,title,description,meaning};
        test.classList.add('is-hidden');
        brand.classList.add('is-hidden');
        document.getElementById('lineTransition').classList.add('is-visible');
        window.scrollTo({top:0, behavior:'smooth'});
      }

      async function submitAnswer(value, button) {
        if (locked) return;
        locked = true;
        checkpointRows[current]={choice:value};
        try{await checkpoint();}catch(error){status.textContent='Belum tersimpan: '+error.message;locked=false;return;}
        answers[current] = value;
        button.classList.add('is-selected');
        status.textContent = value === 'Enter' ? 'Jawaban: tidak melihat angka' : value === 'Not sure' ? 'Jawaban: tidak yakin' : `Jawaban: ${value}`;
        setTimeout(() => image.classList.add('is-hiding'), 70);
        setTimeout(() => {
          button.classList.remove('is-selected');
          if (current === plates.length - 1) {
            calculateResult();
            locked = false;
            return;
          }
          current += 1;
          showNextPlate();
          status.textContent = 'Pilih angka yang terlihat pada pelat.';
          locked = false;
        }, 590);
      }

      function restart() {
        answers.length = 0;
        current = 0;
        locked = false;
        image.classList.remove('is-hiding','is-showing');
        buttons.forEach(button => button.classList.remove('is-selected'));
        test.classList.remove('is-hidden');
        brand.classList.remove('is-hidden');
        document.getElementById('resultScreen').classList.remove('is-visible');
        document.getElementById('lineTransition').classList.remove('is-visible');
        document.getElementById('lineTest').classList.remove('is-visible');
        document.getElementById('combinedResult').classList.remove('is-visible');
        status.textContent = 'Pilih angka yang terlihat pada pelat.';
        recolorPlate(0);
        updateProgress();
        window.scrollTo({top:0, behavior:'smooth'});
      }

      const linePlates = [
        {seed:11, path:'M48 302 C125 148 236 422 326 280 S470 168 552 315', bg:['#d7bd79','#c7a968','#e1cb8c'], line:['#6d9875','#598766','#82a184']},
        {seed:29, path:'M48 300 C130 428 206 150 300 302 S455 425 552 270', bg:['#94b398','#a7c0a4','#82a486'], line:['#cf714c','#e18459','#b95f42']},
        {seed:43, path:'M48 310 C148 215 185 405 282 330 C367 264 420 126 552 292', bg:['#d0ad77','#c09865','#ddba86'], line:['#6f8d73','#5e7d64','#829a82']},
        {seed:67, path:'M48 295 C142 112 220 184 255 315 S390 476 552 292', bg:['#9bb59a','#adc3aa','#89a789'], line:['#c9684b','#dc7d5a','#b55440']},
        {seed:89, path:'M48 308 C122 410 210 414 266 296 C325 171 430 188 552 302', bg:['#d2b37c','#c3a36c','#ddc08c'], line:['#708d75','#5e8068','#849c84']},
        {seed:103,path:'M48 325 C112 188 180 190 226 320 C273 452 359 442 392 306 C421 190 480 176 552 286',bg:['#a7bc98','#91aa85','#b8c8aa'],line:['#c96c54','#df8267','#b95b48']},
        {seed:127,path:'M52 250 C135 110 238 160 248 276 C258 390 178 438 117 363 C64 298 138 236 220 262 C319 293 310 464 427 430 C493 411 512 348 548 277',bg:['#d5b978','#c8aa68','#e0c789'],line:['#668f79','#54816b','#7ca08a']},
        {seed:149,path:'M50 333 C118 390 170 197 244 250 C318 302 303 442 388 404 C473 366 414 196 550 258',bg:['#94af94','#a9bda3','#82a184'],line:['#ce7252','#e18863','#b95a43']},
        {seed:173,path:'M50 282 C117 199 182 201 218 285 C250 359 184 414 137 369 C94 328 132 270 201 276 C284 284 295 384 369 386 C450 387 468 269 550 298',bg:['#d2b176','#c2a166','#dfc18a'],line:['#718d74','#5d7d66','#859e86']},
        {seed:191,path:'M50 347 C108 214 177 419 239 286 C299 158 363 406 421 277 C458 194 505 226 550 311',bg:['#9bb69a','#adc2a9','#88a588'],line:['#c5684d','#db7d5b','#b45541']},
        {seed:223,path:'M49 288 C114 168 195 156 250 236 C302 313 246 414 172 396 C111 381 110 304 168 276 C248 236 297 348 368 352 C446 357 470 249 551 294',bg:['#d6b97d','#c5a76c','#e2c88f'],line:['#688f77','#557f69','#80a089']},
        {seed:251,path:'M50 318 C105 408 176 410 216 327 C258 239 183 179 124 225 C75 263 109 328 169 326 C247 323 275 204 357 218 C438 231 445 377 550 294',bg:['#98b398','#abc1a7','#84a286'],line:['#ca6e51','#df8361','#b75a43']}
      ];
      const lineDots = document.getElementById('lineDots');
      const lineDrawSvg = document.getElementById('lineDrawSvg');
      const lineUserTrace = document.getElementById('lineUserTrace');
      const lineUserHalo = document.getElementById('lineUserHalo');
      const lineStatus = document.getElementById('lineStatus');
      const lineResults = [];
      let lineCurrent = 0;
      let lineTargetSamples = [];
      let lineDrawing = false;
      let lineUserPoints = [];
      let lineLocked = false;

      function lineDistance(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
      function linePointerPoint(event){
        const rect=lineDrawSvg.getBoundingClientRect();
        return {x:(event.clientX-rect.left)*600/rect.width,y:(event.clientY-rect.top)*600/rect.height};
      }
      function lineTargetPoints(pathData,count=160){
        const temp=document.createElementNS('http://www.w3.org/2000/svg','path');
        temp.setAttribute('d',pathData);lineDrawSvg.appendChild(temp);
        const length=temp.getTotalLength(),points=[];
        for(let i=0;i<count;i++){const p=temp.getPointAtLength(length*i/(count-1));points.push({x:p.x,y:p.y});}
        temp.remove();return points;
      }
      function renderLinePath(points){
        const d=points.length?'M '+points.map(p=>`${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '):'';
        lineUserTrace.setAttribute('d',d);lineUserHalo.setAttribute('d',d);
      }
      function buildLinePlate(index,animate=true){
        const plate=linePlates[index],rand=seeded(plate.seed),samples=lineTargetPoints(plate.path,190);
        lineTargetSamples=samples;
        const create=()=>{
          lineDots.replaceChildren();
          const spacing=18.5,rowHeight=spacing*.866;let row=0,dotIndex=0;
          for(let by=36;by<=564;by+=rowHeight,row++){
            const offset=row%2?spacing/2:0;
            for(let bx=36+offset;bx<=564;bx+=spacing){
              const x=bx+(rand()-.5)*7,y=by+(rand()-.5)*7;
              if((x-300)**2+(y-300)**2>273**2)continue;
              const near=samples.some((p,i)=>i%2===0&&lineDistance({x,y},p)<19);
              const palette=near?plate.line:plate.bg;
              const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
              dot.setAttribute('cx',x.toFixed(2));dot.setAttribute('cy',y.toFixed(2));dot.setAttribute('r',(3.6+rand()*5.3).toFixed(2));dot.setAttribute('fill',palette[Math.floor(rand()*palette.length)]);dot.style.setProperty('--dot-delay',`${(dotIndex*31)%155}ms`);lineDots.appendChild(dot);dotIndex++;
            }
          }
          if(animate){lineDots.classList.add('is-showing');setTimeout(()=>lineDots.classList.remove('is-showing'),570);}
        };
        if(animate&&lineDots.childElementCount){lineDots.classList.add('is-hiding');setTimeout(()=>{lineDots.classList.remove('is-hiding');create();},430);}else create();
        lineUserPoints=[];renderLinePath(lineUserPoints);
        lineStatus.textContent='Sentuh bagian mana saja pada pelat untuk mulai menggambar.';
        document.getElementById('lineProgressCopy').textContent=`Pelat ${index+1} dari ${linePlates.length}`;
        document.getElementById('lineProgressFill').style.width=`${((index+1)/linePlates.length)*100}%`;
      }
      function evaluateLine(){
        if(lineUserPoints.length<12)return {ok:false,coverage:0,accuracy:0,score:0};
        const corridor=30;
        const coverage=lineTargetSamples.filter(t=>lineUserPoints.some((u,i)=>i%2===0&&lineDistance(t,u)<corridor)).length/lineTargetSamples.length;
        const accuracy=lineUserPoints.filter(u=>lineTargetSamples.some((t,i)=>i%2===0&&lineDistance(u,t)<corridor)).length/lineUserPoints.length;
        const score=Math.round((coverage*.58+accuracy*.42)*100);
        return {ok:coverage>=.58&&accuracy>=.68&&score>=66,coverage,accuracy,score};
      }
      async function advanceLine(result){
        if(lineLocked)return;lineLocked=true;
        checkpointRows[22+lineCurrent]={...result,choice:'line',points:lineUserPoints.slice(0,2000)};
        try{await checkpoint(lineCurrent===11);}catch(error){lineStatus.textContent='Belum tersimpan: '+error.message;lineLocked=false;return;}
        lineResults[lineCurrent]=result;
        if(lineCurrent===linePlates.length-1){setTimeout(showCombinedResult,280);return;}
        lineCurrent++;buildLinePlate(lineCurrent,true);setTimeout(()=>lineLocked=false,570);
      }
      function startLine(reset=true){
        if(reset){lineCurrent=0;lineResults.length=0;}
        lineLocked=false;lineDrawing=false;
        document.getElementById('lineTransition').classList.remove('is-visible');
        document.getElementById('combinedResult').classList.remove('is-visible');
        document.getElementById('lineTest').classList.add('is-visible');
        buildLinePlate(lineCurrent,false);
        window.scrollTo({top:0,behavior:'smooth'});
      }
      function showCombinedResult(){
        const passed=lineResults.filter(r=>r&&r.ok).length;
        const attempted=lineResults.filter(r=>r&&typeof r.score==='number');
        const lineAverage=attempted.length?Math.round(attempted.reduce((sum,r)=>sum+r.score,0)/attempted.length):0;
        const numberPercent=Math.round(numberSummary.ratio*100);
        const combined=Math.round((numberPercent+lineAverage)/2);
        document.getElementById('lineTest').classList.remove('is-visible');
        document.getElementById('combinedResult').classList.add('is-visible');
        document.getElementById('combinedScoreValue').textContent=`${combined}%`;
        document.getElementById('combinedScoreRing').style.setProperty('--score',`${Math.round(combined*3.6)}deg`);
        document.getElementById('numberFinalScore').textContent=`${numberSummary.correct}/${plates.length}`;
        document.getElementById('numberFinalText').textContent=`${numberSummary.incorrect} tidak sesuai dan ${numberSummary.uncertain} tidak melihat atau tidak yakin.`;
        document.getElementById('lineFinalScore').textContent=`${passed}/${linePlates.length}`;
        document.getElementById('lineFinalText').textContent=`Rata-rata ketepatan lintasan ${lineAverage}%.`;
        let label,title,description;
        if(numberSummary.ratio>=.82&&passed>=10){label='Tidak ditemukan indikasi kuat';title='Penglihatan warna dalam rentang umum';description='Pelat angka dan sebagian besar jalur warna berhasil dikenali dengan baik.';}
        else if(numberSummary.ratio>=.59&&passed>=5){label='Perlu konfirmasi';title='Hasil skrining belum konsisten';description='Beberapa pelat angka atau jalur warna belum dikenali secara konsisten.';}
        else{label='Ditemukan indikasi skrining';title='Kemungkinan kesulitan membedakan warna';description='Sejumlah pelat angka dan/atau jalur warna sulit dikenali.';}
        document.getElementById('combinedLabel').textContent='Sesi selesai';
        document.getElementById('combinedTitle').textContent='Terima kasih telah menyelesaikan tes';
        document.getElementById('combinedDescription').textContent='Jawaban angka dan jalur telah tersimpan untuk ditinjau HR. Pelat ini merupakan demonstrasi digital, bukan alat diagnosis atau penentuan kelulusan.';
        document.getElementById('combinedScoreRing').style.display='none';
        lineLocked=false;window.scrollTo({top:0,behavior:'smooth'});
      }

      lineDrawSvg.addEventListener('pointerdown',event=>{if(lineLocked)return;lineDrawing=true;lineUserPoints=[linePointerPoint(event)];lineDrawSvg.setPointerCapture(event.pointerId);renderLinePath(lineUserPoints);lineStatus.textContent='Lanjutkan mengikuti seluruh jalur yang terlihat.';});
      lineDrawSvg.addEventListener('pointermove',event=>{if(!lineDrawing)return;const p=linePointerPoint(event),last=lineUserPoints[lineUserPoints.length-1];if(lineDistance(p,last)>3){lineUserPoints.push(p);renderLinePath(lineUserPoints);}});
      const stopLineDraw=event=>{if(!lineDrawing)return;lineDrawing=false;try{lineDrawSvg.releasePointerCapture(event.pointerId);}catch{}lineStatus.textContent='Pilih Periksa Jawaban untuk melanjutkan.';};
      lineDrawSvg.addEventListener('pointerup',stopLineDraw);lineDrawSvg.addEventListener('pointercancel',stopLineDraw);
      document.getElementById('checkLine').addEventListener('click',()=>{const result=evaluateLine();if(!lineUserPoints.length){lineStatus.textContent='Telusuri garis terlebih dahulu.';return;}lineStatus.textContent=result.ok?`Lintasan sesuai — ketepatan ${result.score}%.`:`Lintasan terlalu banyak keluar jalur — ketepatan ${result.score}%.`;advanceLine(result);});
      document.getElementById('clearLine').addEventListener('click',()=>{lineUserPoints=[];renderLinePath(lineUserPoints);lineStatus.textContent='Garis dihapus. Mulai kembali dari bagian mana saja.';});
      document.getElementById('noLine').addEventListener('click',()=>advanceLine({ok:false,coverage:0,accuracy:0,score:0}));
      document.getElementById('startLineTest').addEventListener('click',()=>startLine(true));
      document.getElementById('repeatLineOnly').addEventListener('click',()=>startLine(true));
      document.getElementById('repeatAllTests').addEventListener('click',restart);

      buttons.forEach(button => button.addEventListener('click', () => submitAnswer(button.dataset.value, button)));
      document.querySelector('.js-cbtRestartTest').addEventListener('click', event => { event.preventDefault(); restart(); });
      document.getElementById('repeatTest').addEventListener('click', restart);
      document.getElementById('finishTest').addEventListener('click', restart);
      document.getElementById('closeTest').addEventListener('click', restart);
      updateProgress();
      const done=document.createElement('button');done.className='cbt-answer-button';done.textContent='Lanjutkan ke sesi berikutnya';
      done.onclick=()=>parent.postMessage({type:'ishihara-complete'},location.origin);
      document.getElementById('combinedResult').append(done);
      new ResizeObserver(()=>parent.postMessage({type:'ishihara-height',height:document.body.scrollHeight},location.origin)).observe(document.body);
      parent.postMessage({type:'ishihara-ready'},location.origin);
    })();

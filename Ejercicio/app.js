const STORAGE_EXAM='aulaeval_exam_v1';
const STORAGE_EXAMS='aulaeval_exams_v1';
const STORAGE_RESULTS='aulaeval_results_v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let exam=readJSON(STORAGE_EXAM,null);
let exams=readJSON(STORAGE_EXAMS,exam?[exam]:[]);
let results=readJSON(STORAGE_RESULTS,[]);
const params=new URLSearchParams(location.search);
const studentMode=params.get('modo')==='alumno';

const sample=`DOCUMENTO 001
Evaluación Diagnóstica
Física
TSU en Tecnologías de la Información
Área Desarrollo de Software Multiplataforma

Nombre: ___________________________________________
Grupo: _______________
Fecha: ____ /____ /_____

Instrucciones:
Esta evaluación diagnóstica no tiene calificación. Su propósito es conocer los conocimientos con los que inicias el curso. Responde con honestidad. Si no conoces una respuesta, escribe "No lo sé".

SECCIÓN I
Conocimientos Matemáticos
1. Resuelve: 35 + 47 =
2. Resuelve: 9 × 8 =
3. Resuelve: 84 ÷ 7 =
4. ¿Cuánto es el 30 % de 250?
5. Convierte: 3 metros = __________ centímetros

SECCIÓN II
Conocimientos de Física
6. Con tus propias palabras, ¿qué estudia la Física?
7. ¿Qué diferencia existe entre masa y peso?
8. ¿Cuál de los siguientes ejemplos representa una magnitud física?
a) Alegría
b) Temperatura
c) Amor
d) Tristeza
9. ¿Cuál es la unidad de longitud en el Sistema Internacional?
a) Kilogramo
b) Metro
c) Segundo
d) Newton

SECCIÓN III
Sobre ti
10. Me gustan las matemáticas (escala 1 a 5)
11. Me gusta resolver problemas (escala 1 a 5)

SECCIÓN IV
Reflexión
12. ¿Qué esperas aprender en esta materia?
13. ¿Qué esperas de tu profesor para ayudarte a aprender mejor?`;

function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(){
  if(!studentMode&&exam){const key=exam.remoteId||exam.id;const at=exams.findIndex(x=>(x.remoteId||x.id)===key);if(at>=0)exams[at]=exam;else exams.push(exam);localStorage.setItem(STORAGE_EXAMS,JSON.stringify(exams));localStorage.setItem(STORAGE_EXAM,JSON.stringify(exam))}
  localStorage.setItem(STORAGE_RESULTS,JSON.stringify(results));updateCount();renderExamSelector()
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function updateCount(){$('#resultCount').textContent=results.length}
function renderExamSelector(){
  const select=$('#examSelector');if(!select)return;const active=exam?(exam.remoteId||exam.id):'';
  select.innerHTML='<option value="">Nueva evaluación</option>'+exams.map(x=>`<option value="${esc(x.remoteId||x.id)}">${esc(x.title||'Evaluación sin título')} · ${esc(x.subject||'Sin materia')}</option>`).join('');select.value=active;
}
function selectExam(id){exam=exams.find(x=>(x.remoteId||x.id)===id)||null;if(exam){localStorage.setItem(STORAGE_EXAM,JSON.stringify(exam));renderEditor();renderExam()}else{$('#editor').classList.add('hidden');$('#sourceText').value='';localStorage.removeItem(STORAGE_EXAM)}renderExamSelector();updateCount()}
function newExam(){exam=null;$('#sourceText').value='';$('#editor').classList.add('hidden');localStorage.removeItem(STORAGE_EXAM);renderExamSelector();toast('Lista para crear una evaluación nueva')}

function parseDocument(raw){
  const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const firstQ=lines.findIndex(l=>/^\d+[.)]\s*/.test(l));
  const pre=lines.slice(0,firstQ<0?lines.length:firstQ);
  const sectionAt=pre.findIndex(l=>/^SECCI[ÓO]N\b/i.test(l));
  const header=pre.slice(0,sectionAt<0?pre.length:sectionAt).filter(l=>!(/^(nombre|grupo|fecha)\s*:/i.test(l)));
  const instructionAt=header.findIndex(l=>/^instrucciones\s*:?/i.test(l));
  const meta=instructionAt>=0?header.slice(0,instructionAt):header;
  const instructions=instructionAt>=0?header.slice(instructionAt).join(' ').replace(/^instrucciones\s*:?\s*/i,''):'';
  let sections=[],current={id:uid(),label:'SECCIÓN I',title:'General',questions:[]},q=null;
  const pushQ=()=>{if(q){q.text=q.text.trim();current.questions.push(q);q=null}};
  const pushSection=()=>{pushQ();if(current.questions.length||current.title!=='General')sections.push(current)};
  for(let i=Math.max(0,sectionAt);i<lines.length;i++){
    const line=lines[i];
    if(/^SECCI[ÓO]N\b/i.test(line)){pushSection();current={id:uid(),label:line,title:(lines[i+1]&&!/^\d+[.)]/.test(lines[i+1])&&!/^SECCI[ÓO]N/i.test(lines[i+1]))?lines[++i]:'',questions:[]};continue}
    const qm=line.match(/^(\d+)[.)]\s*(.*)$/);
    if(qm){pushQ();q={id:uid(),text:qm[2],type:'open',options:[],correct:'',points:1};continue}
    const om=line.match(/^(?:\(\s*\)\s*)?([a-hA-H])[).]\s*(.*)$/);
    if(om&&q){q.type='multiple';q.options.push({id:uid(),text:om[2]});continue}
    if(q)q.text+=' '+line;
  }
  pushSection();
  if(!sections.length)sections=[current];
  sections.forEach(s=>s.questions.forEach(x=>{if(/escala\s*(?:del|de)?\s*1\s*a\s*5/i.test(x.text))x.type='scale'}));
  return {id:uid(),document:meta[0]||'Evaluación',title:meta[1]||meta[0]||'Evaluación',subject:meta[2]||'',program:meta.slice(3).join(' · '),instructions,sections,createdAt:new Date().toISOString()};
}

function renderEditor(){
  if(!exam)return;$('#editor').classList.remove('hidden');
  $('#examTitle').value=exam.title||'';$('#examSubject').value=exam.subject||'';$('#examProgram').value=exam.program||'';$('#examInstructions').value=exam.instructions||'';
  const wrap=$('#questionEditor');wrap.innerHTML='';
  exam.sections.forEach((s,si)=>{
    const section=document.createElement('div');section.className='section-editor';
    section.innerHTML=`<div class="section-heading"><span>${esc(s.label)}</span><h2>${esc(s.title)}</h2></div>`;
    s.questions.forEach((q,qi)=>section.appendChild(questionEditorNode(q,si,qi)));
    wrap.appendChild(section);
  });
}
function questionEditorNode(q,si,qi){
  const node=document.createElement('div');node.className='question-edit';node.dataset.id=q.id;
  node.innerHTML=`<div class="question-top"><span class="question-number">${qi+1}</span><strong>Pregunta</strong><select class="qtype"><option value="open">Respuesta abierta</option><option value="multiple">Opción múltiple</option><option value="scale">Escala 1–5</option></select><button class="icon-btn remove-q" title="Eliminar">×</button></div><textarea class="qtext" rows="2">${esc(q.text)}</textarea><div class="options-editor"></div>`;
  node.querySelector('.qtype').value=q.type;
  const opts=node.querySelector('.options-editor');
  const renderOpts=()=>{opts.innerHTML='';if(q.type==='multiple'){(q.options.length?q.options:[{id:uid(),text:''},{id:uid(),text:''}]).forEach((o,oi)=>{const row=document.createElement('div');row.className='option-line';row.innerHTML=`<span>${String.fromCharCode(97+oi)})</span><input class="opt-text" value="${esc(o.text)}" placeholder="Opción"><label class="correct-label"><input type="radio" name="correct-${q.id}" value="${oi}" ${String(q.correct)===String(oi)?'checked':''}> Correcta</label><button class="icon-btn remove-opt">×</button>`;row.querySelector('.remove-opt').onclick=()=>{row.remove();syncEditor()};opts.appendChild(row)});const add=document.createElement('button');add.type='button';add.className='btn ghost';add.textContent='+ Agregar opción';add.onclick=()=>{syncEditor();q.options.push({id:uid(),text:''});renderEditor()};opts.appendChild(add)}else if(q.type==='open'){opts.innerHTML=`<label>Respuesta correcta opcional (para calificación automática)<input class="open-correct" value="${esc(q.correct||'')}" placeholder="Deja vacío si requiere revisión manual"></label>`}}
  renderOpts();
  node.querySelector('.qtype').onchange=e=>{syncEditor();q.type=e.target.value;if(q.type==='multiple'&&!q.options.length)q.options=[{id:uid(),text:''},{id:uid(),text:''}];renderEditor()};
  node.querySelector('.remove-q').onclick=()=>{exam.sections[si].questions.splice(qi,1);renderEditor()};
  return node;
}
function syncEditor(){
  if(!exam)return;exam.title=$('#examTitle').value.trim();exam.subject=$('#examSubject').value.trim();exam.program=$('#examProgram').value.trim();exam.instructions=$('#examInstructions').value.trim();
  $$('.question-edit').forEach(node=>{const q=exam.sections.flatMap(s=>s.questions).find(x=>x.id===node.dataset.id);if(!q)return;q.text=node.querySelector('.qtext').value.trim();q.type=node.querySelector('.qtype').value;if(q.type==='multiple'){q.options=[...node.querySelectorAll('.option-line')].map((r,i)=>({id:q.options[i]?.id||uid(),text:r.querySelector('.opt-text').value.trim()}));q.correct=node.querySelector('input[type=radio]:checked')?.value??''}else if(q.type==='open')q.correct=node.querySelector('.open-correct')?.value.trim()||'';else q.correct=''})
}

function renderExam(){
  if(!exam){$('#emptyExam').classList.remove('hidden');$('#studentExam').classList.add('hidden');return}
  $('#emptyExam').classList.add('hidden');$('#studentExam').classList.remove('hidden');$('#submissionDone').classList.add('hidden');
  $('#examDoc').textContent=exam.document||'Evaluación';$('#renderTitle').textContent=exam.title;$('#renderSubject').textContent=exam.subject;$('#renderProgram').textContent=exam.program;$('#renderInstructions').textContent=exam.instructions||'Lee con atención y responde cada pregunta.';$('#studentDate').valueAsDate=new Date();
  const list=$('#questionList');list.innerHTML='';let n=0;
  exam.sections.forEach(s=>{const sec=document.createElement('section');sec.className='exam-section';sec.innerHTML=`<div class="section-heading"><span>${esc(s.label)}</span><h2>${esc(s.title)}</h2></div>`;s.questions.forEach(q=>{n++;const el=document.createElement('div');el.className='question';let input='';if(q.type==='multiple')input=`<div class="choices">${q.options.map((o,i)=>`<label class="choice"><input required type="radio" name="q-${q.id}" value="${i}"><span>${String.fromCharCode(97+i)}) ${esc(o.text)}</span></label>`).join('')}</div>`;else if(q.type==='scale')input=`<div class="scale">${[1,2,3,4,5].map(v=>`<label>${v}<input required type="radio" name="q-${q.id}" value="${v}"></label>`).join('')}</div>`;else input=`<textarea name="q-${q.id}" rows="3" required placeholder="Escribe tu respuesta..."></textarea>`;el.innerHTML=`<p class="question-title"><b>${n}.</b>${esc(q.text)}</p>${input}`;sec.appendChild(el)});list.appendChild(sec)});
}

async function submitExam(e){e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='Enviando...';const fd=new FormData(e.target);const answers={};let earned=0,total=0,autoCount=0;exam.sections.flatMap(s=>s.questions).forEach(q=>{const answer=fd.get(`q-${q.id}`)||'';let correct=null;if(!studentMode&&q.type==='multiple'&&q.correct!==''){correct=String(answer)===String(q.correct)}else if(!studentMode&&q.type==='open'&&q.correct){correct=normalize(answer)===normalize(q.correct)}if(correct!==null){total+=Number(q.points||1);autoCount++;if(correct)earned+=Number(q.points||1)}answers[q.id]={value:answer,correct}});const row={id:uid(),examId:exam.remoteId||exam.id,name:$('#studentName').value.trim(),group:$('#studentGroup').value.trim(),date:$('#studentDate').value,submittedAt:new Date().toISOString(),answers,earned,total,autoCount};try{if(exam.remoteId&&AulaEvalDB.configured){await AulaEvalDB.submit(exam.remoteId,row)}else{results.push(row);save()}e.target.reset();e.target.classList.add('hidden');$('#submissionDone').classList.remove('hidden');$('#submissionMessage').textContent=exam.remoteId?'Tus respuestas se enviaron correctamente al profesor.':total?`Tu resultado automático es ${earned} de ${total}. Las respuestas abiertas pueden requerir revisión.`:'Tus respuestas se guardaron en este dispositivo.';toast('Respuesta guardada')}catch(err){toast('No se pudo enviar: '+err.message)}finally{button.disabled=false;button.textContent='Entregar evaluación'}}
function normalize(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}

async function renderResults(filter=''){
  if(exam?.remoteId&&AulaEvalDB.configured){try{const remote=await AulaEvalDB.fetchResults(exam.remoteId);results=[...results.filter(r=>r.examId!==exam.remoteId),...remote];save()}catch(err){if(studentMode)return;toast('Inicia sesión para consultar resultados')}}
  updateCount();const activeExamId=exam?.remoteId||exam?.id;const relevant=results.filter(r=>!activeExamId||r.examId===activeExamId);const scored=relevant.filter(r=>r.total>0);const avg=scored.length?scored.reduce((a,r)=>a+(r.earned/r.total*100),0)/scored.length:0;
  $('#stats').innerHTML=`<div class="stat"><span>Respuestas</span><strong>${relevant.length}</strong></div><div class="stat"><span>Promedio automático</span><strong>${scored.length?avg.toFixed(1)+'%':'—'}</strong></div><div class="stat"><span>Grupos</span><strong>${new Set(relevant.map(r=>r.group)).size}</strong></div>`;
  const rows=relevant.filter(r=>(r.name+' '+r.group).toLowerCase().includes(filter.toLowerCase()));$('#emptyResults').classList.toggle('hidden',rows.length>0);$('#resultsTable').innerHTML=rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.group)}</td><td>${esc(r.date)}</td><td class="score">${r.total?`${r.earned}/${r.total} · ${Math.round(r.earned/r.total*100)}%`:'Por revisar'}</td><td><button class="text-btn view-detail" data-id="${r.id}">Ver respuestas</button></td></tr>`).join('');$$('.view-detail').forEach(b=>b.onclick=()=>showDetail(b.dataset.id));
}
function showDetail(id){const r=results.find(x=>x.id===id);if(!r||!exam)return;$('#detailName').textContent=`${r.name} · ${r.group}`;let n=0;$('#detailBody').innerHTML=exam.sections.flatMap(s=>s.questions).map(q=>{n++;const a=r.answers[q.id]||{value:''};let shown=a.value;if(q.type==='multiple')shown=q.options[Number(a.value)]?.text||'Sin respuesta';const state=a.correct===true?'<span class="correct">✓ Correcta</span>':a.correct===false?'<span class="incorrect">✕ Incorrecta</span>':'<span>Respuesta abierta</span>';return `<div class="answer-detail"><strong>${n}. ${esc(q.text)}</strong><p class="given">${esc(shown||'Sin respuesta')}</p><p>${state}</p></div>`}).join('');$('#detailDialog').showModal()}
function download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function studentLink(){
  syncEditor();
  const url=new URL(location.href);
  url.search='';
  url.searchParams.set('modo','alumno');
  if(exam.remoteId){url.searchParams.set('evaluacion',exam.remoteId);url.hash=''}
  else url.hash='evaluacion='+encodeURIComponent(JSON.stringify(exam));
  return url.href;
}
async function copyStudentLink(){
  if(!exam)return toast('Primero crea una evaluación');
  syncEditor();
  save();
  const link=studentLink();
  try{await navigator.clipboard.writeText(link);toast('Enlace para alumnos copiado')}catch{prompt('Copia este enlace para tus alumnos:',link)}
}
function showQr(){
  if(!exam?.remoteId)return toast('Publica primero la evaluación en Supabase');
  if(typeof QRCode==='undefined')return toast('No se pudo cargar el generador QR. Revisa tu conexión.');
  const link=studentLink(),box=$('#qrCode');box.innerHTML='';
  new QRCode(box,{text:link,width:256,height:256,colorDark:'#17232d',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  $('#qrExamTitle').textContent=exam.title||'Evaluación';$('#qrLink').value=link;$('#qrDialog').showModal();
}
function downloadQr(){
  const source=$('#qrCode canvas')||$('#qrCode img');if(!source)return toast('Primero genera el código QR');
  const a=document.createElement('a');a.download=`QR-${(exam.title||'evaluacion').replace(/[^a-z0-9áéíóúñ]+/gi,'-')}.png`;a.href=source.tagName==='CANVAS'?source.toDataURL('image/png'):source.src;a.click();
}
async function publishExam(){
  if(!AulaEvalDB.configured){$('#accountDialog').showModal();return toast('Configura primero Supabase en config.js')}
  syncEditor();const button=$('#publishExamBtn');button.disabled=true;button.textContent='Publicando...';
  try{const previousKey=exam.remoteId||exam.id;exam.remoteId=await AulaEvalDB.publish(exam);exams=exams.filter(x=>(x.remoteId||x.id)!==previousKey);save();toast('Evaluación publicada en Supabase');await copyStudentLink()}catch(err){toast(err.message);if(/sesión/i.test(err.message))$('#accountDialog').showModal()}finally{button.disabled=false;button.textContent='Publicar en Supabase'}
}
async function syncExams(){
  if(!AulaEvalDB.configured)return toast('Configura primero Supabase');
  const button=$('#syncExamsBtn');button.disabled=true;button.textContent='Actualizando...';
  try{const remote=await AulaEvalDB.listExams();for(const item of remote){const at=exams.findIndex(x=>(x.remoteId||x.id)===item.remoteId);if(at>=0)exams[at]={...exams[at],...item};else exams.push(item)}localStorage.setItem(STORAGE_EXAMS,JSON.stringify(exams));renderExamSelector();toast(`${remote.length} evaluaciones disponibles`)}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent='Actualizar desde Supabase'}
}
async function refreshAccount(){
  const note=$('#supabaseStatus'),u=await AulaEvalDB.user();
  if(!AulaEvalDB.configured){note.textContent='Falta configurar Project URL y clave pública en config.js.';note.className='connection-note error';$('#accountBtn').textContent='Configurar Supabase'}
  else if(u){note.textContent=`Sesión iniciada como ${u.email}`;note.className='connection-note online';$('#accountBtn').textContent=u.email;$('#signOutBtn').classList.remove('hidden')}
  else{note.textContent='Supabase está configurado. Inicia sesión o crea la cuenta docente.';note.className='connection-note';$('#accountBtn').textContent='Acceso docente';$('#signOutBtn').classList.add('hidden')}
}
function csvExport(){if(!results.length)return toast('No hay resultados para exportar');const qs=exam?.sections.flatMap(s=>s.questions)||[];const activeExamId=exam?.remoteId||exam?.id;const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const head=['Nombre','Grupo','Fecha','Puntos','Total',...qs.map((q,i)=>`${i+1}. ${q.text}`)];const rows=results.filter(r=>!activeExamId||r.examId===activeExamId).map(r=>[r.name,r.group,r.date,r.earned,r.total,...qs.map(q=>{const a=r.answers[q.id]?.value??'';return q.type==='multiple'?q.options[Number(a)]?.text||'':a})]);download('resultados-aulaeval.csv','\ufeff'+[head,...rows].map(row=>row.map(quote).join(',')).join('\n'),'text/csv;charset=utf-8')}
function importFile(input,handler){const f=input.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{handler(JSON.parse(reader.result));toast('Archivo importado')}catch{toast('El archivo no es válido')}};reader.readAsText(f);input.value=''}
function switchView(name){$$('.view').forEach(v=>v.classList.remove('active'));$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===name));$('#'+name+'View').classList.add('active');if(name==='exam')renderExam();if(name==='results')renderResults();scrollTo({top:0,behavior:'smooth'})}

$$('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));$('#sampleBtn').onclick=()=>{$('#sourceText').value=sample;toast('Ejemplo cargado')};$('#parseBtn').onclick=()=>{const raw=$('#sourceText').value.trim();if(!raw)return toast('Pega primero el contenido de la evaluación');exam=parseDocument(raw);renderEditor();$('#editor').scrollIntoView({behavior:'smooth'});toast(`${exam.sections.flatMap(s=>s.questions).length} preguntas detectadas`)};
$('#examSelector').onchange=e=>selectExam(e.target.value);$('#newExamBtn').onclick=newExam;$('#syncExamsBtn').onclick=syncExams;
$('#saveExamBtn').onclick=()=>{syncEditor();if(!exam.title)return toast('Escribe un título');save();renderExam();switchView('exam');toast('Evaluación guardada')};$('#publishExamBtn').onclick=publishExam;$('#copyStudentLinkBtn').onclick=copyStudentLink;$('#showQrBtn').onclick=showQr;$('#downloadExamBtn').onclick=()=>{syncEditor();download('evaluacion-aulaeval.json',JSON.stringify(exam,null,2))};$('#addQuestionBtn').onclick=()=>{syncEditor();if(!exam.sections.length)exam.sections.push({id:uid(),label:'SECCIÓN I',title:'General',questions:[]});exam.sections.at(-1).questions.push({id:uid(),text:'Nueva pregunta',type:'open',options:[],correct:'',points:1});renderEditor()};
$('#studentExam').onsubmit=submitExam;$('#newResponseBtn').onclick=()=>renderExam();$('#resultSearch').oninput=e=>renderResults(e.target.value);$('#exportCsvBtn').onclick=csvExport;$('#exportJsonBtn').onclick=()=>download('respaldo-aulaeval.json',JSON.stringify({exam,results,exportedAt:new Date().toISOString()},null,2));$('#clearResultsBtn').onclick=async()=>{if(results.length&&confirm('¿Borrar definitivamente todas las respuestas de esta evaluación?')){try{if(exam?.remoteId)await AulaEvalDB.deleteResults(exam.remoteId);const activeExamId=exam?.remoteId||exam?.id;results=results.filter(r=>r.examId!==activeExamId);save();await renderResults();toast('Resultados eliminados')}catch(err){toast('No se pudieron borrar: '+err.message)}}};
$('#importExamInput').onchange=e=>importFile(e.target,data=>{exam=data.exam||data;save();renderEditor()});$('#importResultsInput').onchange=e=>importFile(e.target,data=>{const incoming=Array.isArray(data)?data:data.results;if(!Array.isArray(incoming))throw Error();results=[...results,...incoming];save();renderResults()});$$('[data-close]').forEach(b=>b.onclick=()=>$('#detailDialog').close());
$('#accountBtn').onclick=async()=>{await refreshAccount();$('#accountDialog').showModal()};$$('[data-account-close]').forEach(b=>b.onclick=()=>$('#accountDialog').close());
$('#togglePasswordBtn').onclick=()=>{const input=$('#accountPassword'),button=$('#togglePasswordBtn'),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');button.title=show?'Ocultar contraseña':'Mostrar contraseña';button.querySelector('span').textContent=show?'⊘':'◉'};
$('#accountForm').onsubmit=async e=>{e.preventDefault();try{await AulaEvalDB.signIn($('#accountEmail').value,$('#accountPassword').value);await refreshAccount();toast('Sesión iniciada');$('#accountDialog').close()}catch(err){toast(err.message)}};
$('#signUpBtn').onclick=async()=>{try{await AulaEvalDB.signUp($('#accountEmail').value,$('#accountPassword').value);await refreshAccount();toast('Cuenta creada. Revisa tu correo si Supabase pide confirmación.')}catch(err){toast(err.message)}};
$('#signOutBtn').onclick=async()=>{await AulaEvalDB.signOut();await refreshAccount();toast('Sesión cerrada')};
$$('[data-qr-close]').forEach(b=>b.onclick=()=>$('#qrDialog').close());$('#downloadQrBtn').onclick=downloadQr;$('#copyQrLinkBtn').onclick=async()=>{try{await navigator.clipboard.writeText($('#qrLink').value);toast('Enlace copiado')}catch{$('#qrLink').select();document.execCommand('copy');toast('Enlace copiado')}};

(async function init(){
  if(studentMode){
    document.body.classList.add('student-only');$('#accountBtn').classList.add('hidden');$('#studentModeBanner').classList.remove('hidden');
    const remoteId=params.get('evaluacion');
    try{if(remoteId){exam=await AulaEvalDB.fetchExam(remoteId);exam.remoteId=remoteId}else{const packed=location.hash.match(/^#evaluacion=(.*)$/)?.[1];if(packed)exam=JSON.parse(decodeURIComponent(packed))}}catch(err){exam=null;toast('No se pudo cargar la evaluación: '+err.message)}
    switchView('exam');
  }else{updateCount();renderExamSelector();if(exam)renderEditor();await refreshAccount()}
})();

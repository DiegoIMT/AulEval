(function(){
  const cfg=window.AULAEVAL_CONFIG||{};
  const projectUrl=String(cfg.supabaseUrl||'').trim().replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
  const configured=/^https:\/\/.+\.supabase\.co$/.test(projectUrl)&&!String(cfg.supabaseAnonKey||'').startsWith('PEGA_');
  const client=configured&&window.supabase?window.supabase.createClient(projectUrl,cfg.supabaseAnonKey):null;

  async function user(){if(!client)return null;const {data}=await client.auth.getUser();return data.user}
  async function signIn(email,password){if(!client)throw Error('Supabase no está configurado');const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data.user}
  async function signUp(email,password){if(!client)throw Error('Supabase no está configurado');const {data,error}=await client.auth.signUp({email,password});if(error)throw error;return data.user}
  async function signOut(){if(client){const {error}=await client.auth.signOut();if(error)throw error}}

  function publicExam(exam){return {...exam,sections:exam.sections.map(s=>({...s,questions:s.questions.map(q=>({...q,correct:''}))}))}}
  function answerKeys(exam){return Object.fromEntries(exam.sections.flatMap(s=>s.questions).filter(q=>q.correct!==''&&q.correct!=null).map(q=>[q.id,String(q.correct)]))}

  async function publish(exam){
    const owner=await user();if(!owner)throw Error('Inicia sesión como docente');
    const id=/^[0-9a-f-]{36}$/i.test(exam.remoteId||'')?exam.remoteId:crypto.randomUUID();
    const row={id,owner_id:owner.id,title:exam.title,subject:exam.subject||'',public_data:publicExam({...exam,remoteId:id}),active:true};
    let {error}=await client.from('evaluations').upsert(row);if(error)throw error;
    ({error}=await client.from('answer_keys').upsert({evaluation_id:id,owner_id:owner.id,keys:answerKeys(exam)}));if(error)throw error;
    return id;
  }
  async function fetchExam(id){if(!client)throw Error('Supabase no está configurado');const {data,error}=await client.from('evaluations').select('public_data').eq('id',id).eq('active',true).single();if(error)throw error;return data.public_data}
  async function listExams(){
    const owner=await user();if(!owner)throw Error('Inicia sesión como docente');
    const {data,error}=await client.from('evaluations').select('id, public_data, updated_at, answer_keys(keys)').eq('owner_id',owner.id).order('updated_at',{ascending:false});if(error)throw error;
    return data.map(r=>{const item={...r.public_data,remoteId:r.id},keys=r.answer_keys?.[0]?.keys||r.answer_keys?.keys||{};item.sections?.forEach(s=>s.questions?.forEach(q=>{q.correct=keys[q.id]??''}));return item})
  }
  async function submit(evaluationId,row){if(!client)throw Error('Supabase no está configurado');const {error}=await client.from('submissions').insert({evaluation_id:evaluationId,student_name:row.name,student_group:row.group,student_date:row.date,answers:row.answers});if(error)throw error}
  async function fetchResults(evaluationId){
    if(!client)return[];let all=[],from=0;const pageSize=1000;
    while(true){const {data,error}=await client.from('submissions').select('*').eq('evaluation_id',evaluationId).order('submitted_at',{ascending:false}).range(from,from+pageSize-1);if(error)throw error;all.push(...data);if(data.length<pageSize)break;from+=pageSize}
    return all.map(r=>({id:r.id,examId:r.evaluation_id,name:r.student_name,group:r.student_group,date:r.student_date,submittedAt:r.submitted_at,answers:r.answers,earned:r.earned||0,total:r.total||0,autoCount:r.auto_count||0}))
  }
  async function deleteResults(evaluationId){if(!client)throw Error('Supabase no está configurado');const {error}=await client.from('submissions').delete().eq('evaluation_id',evaluationId);if(error)throw error}

  window.AulaEvalDB={configured,client,user,signIn,signUp,signOut,publish,fetchExam,listExams,submit,fetchResults,deleteResults};
})();

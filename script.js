const $=id=>document.getElementById(id),HOURS=Array.from({length:13},(_,i)=>`${String(i+8).padStart(2,'0')}:00`);
let ctx=null,barbers=[],appointments=[],currentWeek=startOfWeek(new Date()),started=false,appointmentSaving=false;
const statusLabel={confirmed:'Confirmado',pending:'Pendente',completed:'Concluído',cancelled:'Cancelado'};
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function startOfWeek(date){const d=new Date(date),day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));d.setHours(0,0,0,0);return d}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function localParts(iso){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return{date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}`}}
function toIso(date,time){return new Date(`${date}T${time}:00-03:00`).toISOString()}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function showToast(message){$('toast').textContent=message;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500)}
function setMessage(id,message,type='error'){const box=$(id);box.textContent=message;box.style.background=type==='success'?'#e9f6f0':'#fff0f0';box.style.color=type==='success'?'#15765a':'#9d3339';box.classList.remove('hidden')}
function clearMessage(id){$(id).classList.add('hidden')}

async function initialize(context){if(started)return;started=true;ctx=context;await loadBarbers();await loadAppointments();if(['owner','manager'].includes(ctx.role))await loadTeam();bindEvents()}
async function loadBarbers(){const{data,error}=await window.supabaseClient.from('barbers').select('id,name,user_id,active').eq('barbershop_id',ctx.shopId).eq('active',true).order('name');if(error){showToast('Não foi possível carregar os profissionais.');return}barbers=data||[];const filter=$('barberFilter'),select=$('appointmentBarber');filter.innerHTML='<option value="all">Todos os profissionais</option>';select.innerHTML='';barbers.forEach(b=>{filter.add(new Option(b.name,b.id));select.add(new Option(b.name,b.id))});if(ctx.role==='barber'&&ctx.barberId){filter.value=ctx.barberId;filter.disabled=true;select.value=ctx.barberId;select.disabled=true}}
async function loadAppointments(){
  $('calendarLoading').classList.remove('hidden');$('calendarScroll').classList.add('hidden');
  const start=dateKey(currentWeek),end=dateKey(addDays(currentWeek,7));
  // O * mantém compatibilidade com bancos antigos e também lê os campos de snapshot
  // quando a migração segura CORRECAO-NOMES-AGENDAMENTOS.sql já tiver sido executada.
  let query=window.supabaseClient.from('appointments').select('*,clients(name,phone),barbers(name)').eq('barbershop_id',ctx.shopId).gte('starts_at',toIso(start,'00:00')).lt('starts_at',toIso(end,'00:00')).order('starts_at');
  if(ctx.role==='barber'&&ctx.barberId)query=query.eq('barber_id',ctx.barberId);
  const{data,error}=await query;
  $('calendarLoading').classList.add('hidden');$('calendarScroll').classList.remove('hidden');
  if(error){appointments=[];showToast('Não foi possível carregar a agenda.')}else{
    // Proteção visual: uma mesma linha nunca é renderizada duas vezes caso uma resposta
    // seja repetida pelo cliente/rede. O banco não é alterado por esta proteção.
    const unique=[...new Map((data||[]).map(a=>[a.id,a])).values()];
    appointments=unique.map(a=>({...a,...localParts(a.starts_at),client:a.client_name_snapshot||a.clients?.name||'Cliente',phone:a.client_phone_snapshot||a.clients?.phone||'',barberName:a.barbers?.name||'Profissional'}));
  }
  render()
}
function render(){renderWeekLabel();renderStats();renderCalendar()}
function renderWeekLabel(){const end=addDays(currentWeek,6),f=d=>d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');$('weekLabel').textContent=`${f(currentWeek)} — ${f(end)} de ${end.getFullYear()}`}
function visibleAppointments(){const q=$('searchInput').value.trim().toLowerCase(),barber=$('barberFilter').value,status=$('statusFilter').value;return appointments.filter(a=>(barber==='all'||a.barber_id===barber)&&(status==='all'||a.status===status)&&(!q||a.client.toLowerCase().includes(q)||a.phone.includes(q)))}
function renderStats(){const list=appointments.filter(a=>a.status!=='cancelled'),today=list.filter(a=>a.date===dateKey(new Date()));const cards=[['Hoje',today.length,'agendamentos','#15765a'],['Na semana',list.length,'agendamentos','#c79a55'],['Pendentes',list.filter(a=>a.status==='pending').length,'para confirmar','#ad7311']];$('stats').innerHTML=cards.map(c=>`<article class="stat" style="--stat-color:${c[3]}"><small>${c[0]}</small><strong>${c[1]}</strong><em>${c[2]}</em></article>`).join('')}
function renderCalendar(){const days=Array.from({length:7},(_,i)=>addDays(currentWeek,i)),names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],list=visibleAppointments();let html='<div class="corner"></div>'+days.map((d,i)=>`<div class="day-head ${dateKey(d)===dateKey(new Date())?'today':''}"><small>${names[i]}</small><strong>${d.getDate()}</strong></div>`).join('');HOURS.forEach(hour=>{html+=`<div class="time">${hour}</div>`;days.forEach(day=>{const key=dateKey(day),items=list.filter(a=>a.date===key&&a.time.slice(0,2)===hour.slice(0,2));html+=`<div class="slot" data-date="${key}" data-time="${hour}">${items.map(a=>`<button class="appointment ${a.status}" data-id="${a.id}" title="${escapeHtml(a.client)}"><strong>${a.time} · ${escapeHtml(a.client)}</strong><span>${escapeHtml(a.barberName)} · ${statusLabel[a.status]}</span></button>`).join('')}</div>`})});$('calendar').innerHTML=html;document.querySelectorAll('.appointment').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();openAppointment(btn.dataset.id)}));document.querySelectorAll('.slot').forEach(slot=>slot.addEventListener('dblclick',()=>openAppointment(null,slot.dataset.date,slot.dataset.time)))}
function openDrawer(id){$('overlay').classList.remove('hidden');$(id).classList.add('open');$(id).setAttribute('aria-hidden','false')}
function closeDrawers(){$('overlay').classList.add('hidden');document.querySelectorAll('.drawer').forEach(d=>{d.classList.remove('open');d.setAttribute('aria-hidden','true')})}
function openAppointment(id=null,date=null,time=null){const a=appointments.find(x=>x.id===id);$('appointmentId').value=a?.id||'';$('clientId').value=a?.client_id||'';$('clientName').value=a?.client||'';$('clientPhone').value=a?.phone||'';$('appointmentDate').value=a?.date||date||dateKey(new Date());$('appointmentTime').value=a?.time||time||'09:00';$('appointmentBarber').value=a?.barber_id||ctx.barberId||barbers[0]?.id||'';$('appointmentStatus').value=a?.status||'confirmed';$('appointmentNotes').value=a?.notes||'';$('drawerTitle').textContent=a?'Editar agendamento':'Novo agendamento';$('deleteBtn').classList.toggle('hidden',!a||ctx.role==='barber');clearMessage('appointmentMessage');openDrawer('appointmentDrawer');setTimeout(()=>$('clientName').focus(),100)}
async function saveAppointment(event){
  event.preventDefault();
  if(appointmentSaving)return;
  appointmentSaving=true;
  clearMessage('appointmentMessage');
  const button=$('saveAppointmentBtn');button.disabled=true;button.textContent='Salvando...';
  try{
    const id=$('appointmentId').value,phone=$('clientPhone').value.trim(),name=$('clientName').value.trim();
    let clientId=$('clientId').value;
    const{data:client,error:clientError}=await window.supabaseClient.from('clients').upsert({id:clientId||undefined,barbershop_id:ctx.shopId,name,phone},{onConflict:'barbershop_id,phone'}).select('id').single();
    if(clientError)throw clientError;
    clientId=client.id;
    const starts=toIso($('appointmentDate').value,$('appointmentTime').value),ends=new Date(new Date(starts).getTime()+30*60000).toISOString();
    const basePayload={barbershop_id:ctx.shopId,client_id:clientId,barber_id:$('appointmentBarber').value,service_id:null,starts_at:starts,ends_at:ends,status:$('appointmentStatus').value,notes:$('appointmentNotes').value.trim()||null};
    // Cada horário guarda o nome/telefone utilizados naquele agendamento. Assim, reutilizar
    // um telefone em outro teste/cliente não altera o nome dos horários antigos.
    const payload={...basePayload,client_name_snapshot:name,client_phone_snapshot:phone};
    const result=id?await window.supabaseClient.from('appointments').update(payload).eq('id',id):await window.supabaseClient.from('appointments').insert(payload);
    if(result.error){
      const missingSnapshot=/client_(name|phone)_snapshot/i.test(`${result.error.message||''} ${result.error.details||''} ${result.error.hint||''}`);
      if(missingSnapshot){
        throw Object.assign(new Error('A correção segura de nomes ainda não foi aplicada no Supabase.'),{code:'SNAPSHOT_MIGRATION_REQUIRED'});
      }
      throw result.error;
    }
    closeDrawers();await loadAppointments();showToast(id?'Agendamento atualizado.':'Agendamento criado.');
  }catch(error){
    console.error('Erro ao salvar agendamento:',error);
    const message=error.code==='23P01'?'Esse profissional já possui um horário nesse período.':error.code==='SNAPSHOT_MIGRATION_REQUIRED'?'Execute o arquivo supabase/CORRECAO-NOMES-AGENDAMENTOS.sql uma única vez no SQL Editor do Supabase. Ele apenas adiciona dois campos e não altera suas tabelas atuais.':'Não foi possível salvar. Verifique os dados e tente novamente.';
    setMessage('appointmentMessage',message);
  }finally{
    appointmentSaving=false;button.disabled=false;button.textContent='Salvar';
  }
}
async function deleteAppointment(){const id=$('appointmentId').value;if(!id||!confirm('Excluir este agendamento?'))return;const{error}=await window.supabaseClient.from('appointments').delete().eq('id',id);if(error){setMessage('appointmentMessage','Não foi possível excluir o agendamento.');return}closeDrawers();await loadAppointments();showToast('Agendamento excluído.')}
async function loadTeam(){
  const{data,error}=await window.supabaseClient.from('members').select('user_id,role,active,created_at').eq('barbershop_id',ctx.shopId).eq('active',true).order('created_at');
  if(error){$('teamGrid').innerHTML='<div class="loading-state">Não foi possível carregar a equipe.</div>';return}
  const members=data||[],ids=members.map(m=>m.user_id);let profiles=[];
  if(ids.length){const result=await window.supabaseClient.from('profiles').select('id,full_name').in('id',ids);profiles=result.data||[]}
  const profileMap=new Map(profiles.map(p=>[p.id,p.full_name]));
  $('teamGrid').innerHTML=members.map(m=>{
    const name=profileMap.get(m.user_id)||'Colaborador',initials=name.split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
    const canRemove=m.role!=='owner'&&m.user_id!==ctx.user?.id;
    return`<article class="member-card"><div class="member-card-head"><span class="member-avatar">${escapeHtml(initials)}</span><div><strong>${escapeHtml(name)}</strong><small>${m.role==='owner'?'Conta proprietária':'Acesso individual à agenda'}</small></div></div><div class="member-meta"><div class="member-meta-left"><span class="role-pill">${m.role==='owner'?'Proprietário':m.role==='manager'?'Gerente':'Barbeiro'}</span><span class="status-active">Ativo</span></div>${canRemove?`<div class="member-actions"><button type="button" class="remove-member-btn" data-user-id="${escapeHtml(m.user_id)}" data-name="${escapeHtml(name)}">Remover</button></div>`:''}</div></article>`
  }).join('')||'<div class="loading-state">Nenhum colaborador cadastrado.</div>';
  document.querySelectorAll('.remove-member-btn').forEach(button=>button.addEventListener('click',()=>removeCollaborator(button.dataset.userId,button.dataset.name,button)));
}

async function removeCollaborator(userId,name,button){
  if(!userId||!['owner','manager'].includes(ctx.role)||userId===ctx.user?.id)return;
  const confirmed=confirm(`Remover ${name||'este colaborador'} da equipe?\n\nEle perderá o acesso ao dashboard. Os agendamentos antigos serão preservados.`);
  if(!confirmed)return;
  button.disabled=true;const original=button.textContent;button.textContent='Removendo...';
  try{
    const{data:affectedBarbers,error:barberError}=await window.supabaseClient.from('barbers').update({active:false}).eq('barbershop_id',ctx.shopId).eq('user_id',userId).select('id');
    if(barberError)throw barberError;
    const{error:memberError}=await window.supabaseClient.from('members').update({active:false}).eq('barbershop_id',ctx.shopId).eq('user_id',userId).neq('role','owner');
    if(memberError){
      if(affectedBarbers?.length)await window.supabaseClient.from('barbers').update({active:true}).eq('barbershop_id',ctx.shopId).eq('user_id',userId);
      throw memberError;
    }
    await loadBarbers();await loadTeam();await loadAppointments();showToast(`${name||'Colaborador'} foi removido da equipe.`);
  }catch(error){
    console.error('Erro ao remover colaborador:',error);showToast('Não foi possível remover o colaborador.');button.disabled=false;button.textContent=original;
  }
}
async function saveCollaborator(event){
  event.preventDefault();
  clearMessage('collaboratorMessage');
  const button=$('saveCollaboratorBtn');
  button.disabled=true;
  button.textContent='Criando...';
  try{
    const {data:sessionData,error:sessionError}=await window.supabaseClient.auth.getSession();
    const session=sessionData?.session;
    if(sessionError||!session?.access_token){
      setMessage('collaboratorMessage','Sua sessão expirou. Saia da conta e entre novamente.');
      return;
    }
    const {data,error}=await window.supabaseClient.functions.invoke('invite-collaborator',{
      body:{
        name:$('collaboratorName').value.trim(),
        email:$('collaboratorEmail').value.trim(),
        password:$('collaboratorPassword').value,
        barbershopId:ctx.shopId
      },
      headers:{Authorization:`Bearer ${session.access_token}`}
    });
    if(error||data?.error){
      setMessage('collaboratorMessage',data?.error||'Não foi possível criar o colaborador.');
      return;
    }
    setMessage('collaboratorMessage','Conta criada com sucesso.','success');
    $('collaboratorForm').reset();
    await loadBarbers();
    await loadTeam();
    setTimeout(closeDrawers,800);
  }catch(err){
    console.error('Erro ao criar colaborador:',err);
    setMessage('collaboratorMessage','Não foi possível criar o colaborador. Tente novamente.');
  }finally{
    button.disabled=false;
    button.textContent='Criar acesso';
  }
}
function showView(view){const team=view==='equipe';$('agendaView').classList.toggle('hidden',team);$('teamView').classList.toggle('hidden',!team);$('pageTitle').textContent=team?'Colaboradores':'Agenda';$('pageSubtitle').textContent=team?'Controle os acessos da sua equipe.':'Acompanhe e organize os horários da equipe.';$('newAppointmentBtn').classList.toggle('hidden',team);$('searchInput').closest('.search').classList.toggle('hidden',team);document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));closeMobileMenu();if(team)loadTeam()}
function closeMobileMenu(){$('sidebar').classList.remove('open');$('mobileShade').classList.add('hidden')}
function bindEvents(){$('appointmentForm').addEventListener('submit',saveAppointment);$('collaboratorForm').addEventListener('submit',saveCollaborator);$('deleteBtn').addEventListener('click',deleteAppointment);$('newAppointmentBtn').addEventListener('click',()=>openAppointment());$('newCollaboratorBtn').addEventListener('click',()=>{clearMessage('collaboratorMessage');openDrawer('collaboratorDrawer')});document.querySelectorAll('.close-drawer').forEach(b=>b.addEventListener('click',closeDrawers));$('overlay').addEventListener('click',closeDrawers);$('todayBtn').addEventListener('click',()=>{currentWeek=startOfWeek(new Date());loadAppointments()});$('prevBtn').addEventListener('click',()=>{currentWeek=addDays(currentWeek,-7);loadAppointments()});$('nextBtn').addEventListener('click',()=>{currentWeek=addDays(currentWeek,7);loadAppointments()});$('barberFilter').addEventListener('change',renderCalendar);$('statusFilter').addEventListener('change',renderCalendar);$('searchInput').addEventListener('input',renderCalendar);document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));$('menuBtn').addEventListener('click',()=>{$('sidebar').classList.add('open');$('mobileShade').classList.remove('hidden')});$('mobileShade').addEventListener('click',closeMobileMenu);document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawers();closeMobileMenu()}})}
window.addEventListener('app-ready',event=>initialize(event.detail));if(window.appContext)initialize(window.appContext);

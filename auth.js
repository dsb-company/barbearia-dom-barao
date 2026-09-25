(() => {
  const authScreen=document.getElementById('authScreen'),appShell=document.getElementById('appShell');
  const form=document.getElementById('loginForm'),errorBox=document.getElementById('loginError'),loginButton=document.getElementById('loginButton');
  const config=window.APP_CONFIG||{};
  const configured=/^https:\/\/.+\.supabase\.co$/.test(config.SUPABASE_URL||'')&&config.SUPABASE_PUBLISHABLE_KEY&&!config.SUPABASE_PUBLISHABLE_KEY.includes('COLE_AQUI');
  const showError=message=>{errorBox.textContent=message;errorBox.classList.remove('hidden')};
  const showLogin=()=>{appShell.classList.add('hidden');authScreen.classList.remove('hidden')};

  if(!configured||!window.supabase){showLogin();showError('Configure a Project URL e a chave pública no arquivo config.js.');form.querySelectorAll('input,button').forEach(c=>c.disabled=true);return}
  const client=window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.supabaseClient=client;

  async function openApp(user){
    const {data:membership,error}=await client.from('members').select('barbershop_id,role,active,barbershops(id,name)').eq('user_id',user.id).eq('active',true).limit(1).maybeSingle();
    if(error||!membership){showLogin();showError('Sua conta ainda não possui acesso a uma barbearia. Fale com o proprietário.');return}
    const {data:profile}=await client.from('profiles').select('full_name').eq('id',user.id).maybeSingle();
    const {data:barber}=await client.from('barbers').select('id,name').eq('barbershop_id',membership.barbershop_id).eq('user_id',user.id).maybeSingle();
    const fullName=profile?.full_name||barber?.name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Usuário';
    window.appContext={user,shopId:membership.barbershop_id,shopName:membership.barbershops?.name||'Art da Navalha',role:membership.role,barberId:barber?.id||null,fullName};
    document.getElementById('userName').textContent=fullName;
    document.getElementById('userAvatar').textContent=fullName.split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
    document.getElementById('userRole').textContent=membership.role==='owner'?'Proprietário':membership.role==='manager'?'Gerente':'Barbeiro';
    document.getElementById('shopName').textContent=window.appContext.shopName;
    const isOwner=['owner','manager'].includes(membership.role);
    document.querySelectorAll('.owner-only').forEach(item=>item.classList.toggle('hidden',!isOwner));
    authScreen.classList.add('hidden');appShell.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('app-ready',{detail:window.appContext}));
  }

  client.auth.getSession().then(({data,error})=>{if(error||!data.session)showLogin();else openApp(data.session.user)});
  client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||!session)showLogin();else if(event==='SIGNED_IN')setTimeout(()=>openApp(session.user),0)});
  form.addEventListener('submit',async event=>{event.preventDefault();errorBox.classList.add('hidden');loginButton.disabled=true;loginButton.textContent='Entrando...';const {error}=await client.auth.signInWithPassword({email:document.getElementById('loginEmail').value.trim(),password:document.getElementById('loginPassword').value});if(error)showError(error.message==='Invalid login credentials'?'E-mail ou senha incorretos.':'Não foi possível entrar. Tente novamente.');loginButton.disabled=false;loginButton.textContent='Entrar no painel'});
  document.getElementById('logoutBtn').addEventListener('click',async()=>{await client.auth.signOut();location.reload()});
  document.getElementById('togglePassword').addEventListener('click',event=>{const input=document.getElementById('loginPassword'),visible=input.type==='text';input.type=visible?'password':'text';event.currentTarget.textContent=visible?'Mostrar':'Ocultar'});
})();

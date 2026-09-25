import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      console.error('invite-collaborator: variáveis SUPABASE_URL/SERVICE_ROLE ausentes')
      return json({ error: 'Configuração interna indisponível.' }, 500)
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Sessão não encontrada.' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Valida diretamente o JWT recebido usando o cliente administrativo.
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userError || !user) {
      console.error('invite-collaborator: falha ao validar JWT', userError)
      return json({ error: 'Sessão inválida. Saia da conta e entre novamente.' }, 401)
    }

    const { name, email, password, barbershopId } = await req.json()
    const cleanName = String(name || '').trim()
    const cleanEmail = String(email || '').trim().toLowerCase()

    if (!cleanName || !cleanEmail || !password || !barbershopId || String(password).length < 8) {
      return json({ error: 'Preencha todos os campos corretamente.' }, 400)
    }

    // Verifica a permissão no servidor; nunca confia apenas na interface.
    const { data: membership, error: membershipError } = await admin
      .from('members')
      .select('role,active')
      .eq('user_id', user.id)
      .eq('barbershop_id', barbershopId)
      .eq('active', true)
      .maybeSingle()

    if (membershipError) {
      console.error('invite-collaborator: erro ao consultar members', membershipError)
      return json({ error: 'Não foi possível validar seu acesso.' }, 500)
    }

    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return json({ error: 'Somente o proprietário ou gerente pode adicionar colaboradores.' }, 403)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: cleanName, invited_to_shop: barbershopId },
    })

    if (createError || !created.user) {
      console.error('invite-collaborator: erro ao criar usuário', createError)
      const message = createError?.message?.toLowerCase().includes('already')
        ? 'Este e-mail já possui uma conta.'
        : 'Não foi possível criar a conta do colaborador.'
      return json({ error: message }, 400)
    }

    const userId = created.user.id

    const { error: memberError } = await admin.from('members').insert({
      barbershop_id: barbershopId,
      user_id: userId,
      role: 'barber',
      active: true,
    })

    const { error: barberError } = await admin.from('barbers').insert({
      barbershop_id: barbershopId,
      user_id: userId,
      name: cleanName,
      active: true,
    })

    if (memberError || barberError) {
      console.error('invite-collaborator: erro ao vincular colaborador', { memberError, barberError })
      await admin.auth.admin.deleteUser(userId)
      return json({ error: 'Não foi possível vincular o colaborador.' }, 500)
    }

    return json({ success: true })
  } catch (error) {
    console.error('invite-collaborator: erro inesperado', error)
    return json({ error: 'Erro inesperado ao criar o colaborador.' }, 500)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if admin already exists
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', 'admin@hse.digimons.local')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ message: 'Admin already exists' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@hse.digimons.local',
      password: 'hse123456',
      email_confirm: true,
      user_metadata: { name: 'Admin HSE', role: 'admin' },
    })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })

    return new Response(JSON.stringify({ message: 'Admin seeded', user_id: data.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders })
  }
})

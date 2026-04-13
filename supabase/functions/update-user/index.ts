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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: caller.id, _role: 'admin' })
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

    const { user_id, name, section, password } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: corsHeaders })
    }

    // Update auth user metadata and optionally password
    const updatePayload: any = {
      user_metadata: { name, section },
    }
    if (password && password.length >= 6) {
      updatePayload.password = password
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updatePayload)
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders })

    // Update profile table
    const profileUpdate: any = { name, section }
    if (password && password.length >= 6) {
      profileUpdate.default_password = password
    }
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user_id)
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders })
  }
})

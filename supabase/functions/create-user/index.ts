import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  nombre: string;
  activo?: boolean;
  roles?: Array<{ rol_id: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !requestingUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Request from user:', requestingUser.id);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const requestData: CreateUserRequest = await req.json();
    const { email, password, nombre, activo = true, roles = [] } = requestData;

    console.log('Creating user:', { email, nombre, activo });

    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({ error: 'Email, password y nombre son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Ya existe un usuario con este email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 1: Create auth user
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al crear usuario de autenticacion: ' + authError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authUserId = authData.user.id;
    console.log('Auth user created:', authUserId);

    // Step 2: Create usuario record
    console.log('Step 2: Creating usuario record...');
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUserId,
        nombre,
        email,
        activo,
        insert_by_user: requestingUser.id,
      })
      .select()
      .single();

    if (usuarioError) {
      console.error('Usuario insert error:', usuarioError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return new Response(
        JSON.stringify({ 
          error: 'Error al crear registro de usuario: ' + usuarioError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Usuario record created');

    // Step 3: Create notification config
    console.log('Step 3: Creating notification config...');
    const { error: notifError } = await supabaseAdmin
      .from('notificaciones_config')
      .insert({ user_id: authUserId })
      .select()
      .maybeSingle();

    if (notifError) {
      console.warn('Notification config error (non-fatal):', notifError);
    }

    // Step 4: Assign roles if provided
    if (roles && roles.length > 0) {
      console.log('Step 4: Assigning roles...');
      for (const rol of roles) {
        if (rol.rol_id) {
          const { error: roleError } = await supabaseAdmin
            .from('usuario_roles')
            .insert({
              usuario_id: authUserId,
              rol_id: rol.rol_id,
              activo: true,
              asignado_por: requestingUser.id,
            });

          if (roleError) {
            console.warn('Role assignment error (non-fatal):', roleError);
          }
        }
      }
    }

    console.log('User creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        usuario_id: usuarioData.id,
        message: 'Usuario creado exitosamente',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    // Verify caller is an admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const { data: callerProfile } = await callerClient
      .from("user_profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single()

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const { email, password, name, role, country, department } = await req.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Create user in Supabase Auth (admin API — does NOT affect caller's session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Create user profile record
    await adminClient.from("user_profiles").upsert({
      id: newUser.user.id,
      email,
      name: name || null,
      role: role || "standard_user",
      country: country || null,
      department: department || null,
      is_active: true,
    })

    // Send welcome email (non-fatal if it fails)
    try {
      const roleLabel = role === "admin" ? "Admin" : role === "standard_user" ? "Standard User" : "Guest"
      const welcomeHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#3b82f6;border-radius:12px;margin-bottom:10px;">
        <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-1px;">IT</span>
      </div>
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ITAMS</div>
      <div style="color:#4b5563;font-size:11px;margin-top:2px;">IT Asset Management · Trainocate</div>
    </div>
    <div style="background:#0d1526;border:1px solid #1a2744;border-radius:16px;overflow:hidden;">
      <div style="height:4px;background:#3b82f6;"></div>
      <div style="padding:28px 28px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:44px;margin-bottom:10px;">👋</div>
          <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Welcome to Trainocate ITAMS!</div>
          <p style="color:#9ca3af;font-size:14px;margin:0;">Your account has been created by your administrator.</p>
        </div>
        <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
          <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Your Login Details</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#6b7280;font-size:13px;padding:7px 0;border-bottom:1px solid #1a2744;">Login URL</td>
              <td style="font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #1a2744;"><a href="https://itams-seven.vercel.app" style="color:#3b82f6;text-decoration:none;">https://itams-seven.vercel.app</a></td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding:7px 0;border-bottom:1px solid #1a2744;">Email</td>
              <td style="color:#f9fafb;font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #1a2744;">${email}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding:7px 0;border-bottom:1px solid #1a2744;">Password</td>
              <td style="color:#f59e0b;font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #1a2744;">${password}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;font-size:13px;padding:7px 0;">Role</td>
              <td style="color:#f9fafb;font-size:13px;font-weight:600;text-align:right;padding:7px 0;">${roleLabel}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:20px;">
          <a href="https://itams-seven.vercel.app" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Login to ITAMS →</a>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">Best regards, Trainocate IT Team</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:20px;">
      <p style="color:#374151;font-size:11px;margin:0;">Automated notification from ITAMS · © 2026 Trainocate Singapore</p>
    </div>
  </div>
</body>
</html>`

      await adminClient.functions.invoke("send-email", {
        body: {
          to: [email],
          subject: "Welcome to Trainocate ITAMS!",
          html: welcomeHtml,
        },
      })
    } catch (emailErr) {
      console.error("Welcome email failed (non-fatal):", emailErr)
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})

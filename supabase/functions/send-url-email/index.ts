import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { to, customerName, url } = await req.json();

    if (!to || !url) {
      return new Response(
        JSON.stringify({ error: "to and url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not set – email not sent. URL:", url);
      return new Response(
        JSON.stringify({ ok: false, error: "RESEND_API_KEY が設定されていません。管理者にお問い合わせください。" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@resend.dev",
        to: [to],
        subject: "事前受付URLのご案内",
        html: `
          <p>${customerName ? `${customerName} 様` : "お客様"}</p>
          <p>この度はお手続きのご案内をお送りします。</p>
          <p>下記URLよりお手続きをお進めください。</p>
          <p><a href="${url}" style="color:#2563eb;">${url}</a></p>
          <p>URLの有効期限にご注意ください。</p>
          <br/>
          <p>ご不明な点がございましたら、店舗スタッフまでお問い合わせください。</p>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return new Response(
        JSON.stringify({ ok: false, error: `メール送信に失敗しました: ${body}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

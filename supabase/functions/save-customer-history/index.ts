import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { customerId } = await req.json();

    if (!customerId) {
      return new Response(JSON.stringify({ error: "customerId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the current customer data before overwrite
    const { data: customer, error: fetchErr } = await supabase
      .from("customers")
      .select("id, name, name_kana, tell, mail, address, remarks, remarks2, remarks3, last_enter_store_at")
      .eq("id", customerId)
      .maybeSingle();

    if (fetchErr || !customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save snapshot to customers_history
    const { error: insertErr } = await supabase.from("customers_history").insert({
      customer_id: customer.id,
      name: customer.name,
      name_kana: customer.name_kana,
      tell: customer.tell,
      mail: customer.mail,
      address: customer.address,
      remarks: customer.remarks,
      remarks2: customer.remarks2,
      remarks3: customer.remarks3,
      last_enter_store_at: customer.last_enter_store_at,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

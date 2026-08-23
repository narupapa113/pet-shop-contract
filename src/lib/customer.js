export async function findCustomerByPhone(client, phone) {
  if (!phone?.trim()) return null;
  const { data, error } = await client
    .from("customers")
    .select("id, name, name_kana, tell, mail, address")
    .eq("tell", phone.trim())
    .neq("is_delete", true)
    .order("create_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

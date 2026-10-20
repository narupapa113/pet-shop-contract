export async function findCustomerByPhone(client, phone, storeId) {
  if (!phone?.trim()) return null;
  if (!storeId) return null;
  const { data, error } = await client
    .from("customers")
    .select("id, name, name_kana, tell, mail, address")
    .eq("tell", phone.trim())
    .eq("store_id", storeId)
    .neq("is_delete", true)
    .order("create_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

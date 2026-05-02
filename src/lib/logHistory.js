import { supabase } from "./supabase"

export async function logHistory(assetId, action, details, changedBy = "Admin") {
  await supabase.from("asset_history").insert([{
    asset_id: assetId,
    action,
    details,
    changed_by: changedBy,
  }])
}
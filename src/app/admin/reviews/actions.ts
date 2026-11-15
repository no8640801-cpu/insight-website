"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setReviewStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdmin) redirect("/dashboard");

  const reviewId = String(formData.get("review_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");

  if (!reviewId || !["approved", "rejected"].includes(status)) {
    redirect("/admin/reviews?error=invalid");
  }

  const { error } = await supabase
    .from("customer_reviews")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) {
    console.error("Admin review update failed:", error.message);
    redirect("/admin/reviews?error=update-failed");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/dashboard/reviews");
  redirect("/admin/reviews?updated=1");
}

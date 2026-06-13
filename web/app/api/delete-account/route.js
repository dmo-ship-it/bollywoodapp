import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Verify the caller is authenticated
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Admin client to delete auth user (cascades to user data via FK or handled below)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Delete user data from all tables (in case FK cascades aren't set up)
  await Promise.all([
    admin.from("user_reactions").delete().eq("user_id", user.id),
    admin.from("user_watchlist").delete().eq("user_id", user.id),
    admin.from("user_badges").delete().eq("user_id", user.id),
    admin.from("user_points").delete().eq("user_id", user.id),
    admin.from("user_comparisons").delete().eq("user_id", user.id),
    admin.from("activity_feed").delete().eq("user_id", user.id),
    admin.from("community_posts").delete().eq("user_id", user.id),
    admin.from("community_votes").delete().eq("user_id", user.id),
    admin.from("community_comments").delete().eq("user_id", user.id),
  ]);

  await admin.from("user_profiles").delete().eq("user_id", user.id);

  // Delete avatar from storage
  await admin.storage.from("avatars").remove([`${user.id}.jpg`, `${user.id}.png`, `${user.id}.webp`]);

  // Delete the auth user
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import Link from "next/link";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600)  return `${Math.floor(s/60) || 1}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const TYPE_STYLES = { review: "bg-rose-100 text-rose-700", discussion: "bg-blue-100 text-blue-700" };
const TYPE_LABELS = { review: "Review", discussion: "Discussion" };

export default function MovieDiscussions({ movieId, movieTitle }) {
  const supabase = createClient();
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: rawPosts } = await supabase
        .from("community_posts")
        .select("id,title,post_type,upvotes,comment_count,created_at,user_id")
        .eq("movie_id", movieId)
        .order("upvotes", { ascending: false })
        .limit(3);

      if (!rawPosts?.length) { setLoading(false); return; }

      const userIds = [...new Set(rawPosts.map(p => p.user_id))];
      const { data: profiles } = await supabase.from("user_profiles")
        .select("user_id,display_name,email").in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      setPosts(rawPosts.map(p => ({ ...p, profile: profileMap[p.user_id] })));
      setLoading(false);
    }
    load();
  }, [movieId]);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Discussions</h2>
        <div className="flex gap-2">
          <Link
            href={`/community/new?type=review&movie=${movieId}`}
            className="text-xs bg-white border border-stone-200 text-stone-600 font-medium px-3 py-1.5 rounded-full hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            + Write review
          </Link>
          <Link
            href={`/community/new?type=discussion&movie=${movieId}`}
            className="text-xs bg-orange-600 text-white font-medium px-3 py-1.5 rounded-full hover:bg-orange-500 transition-colors"
          >
            + Discuss
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-xl shimmer"/>)}</div>
      ) : posts.length === 0 ? (
        <div className="bg-stone-100 border border-stone-200 rounded-2xl p-6 text-center">
          <p className="text-stone-500 text-sm mb-1">No discussions yet for {movieTitle}</p>
          <p className="text-stone-400 text-xs">Be the first to review or start a conversation</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => {
            const name = post.profile?.display_name || post.profile?.email?.split("@")[0] || "Someone";
            const ini  = name.slice(0,2).toUpperCase();
            return (
              <Link key={post.id} href={`/community/posts/${post.id}`}
                className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-3 hover:border-stone-300 transition-all group">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-black shrink-0">{ini}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_STYLES[post.post_type] ?? TYPE_STYLES.discussion}`}>
                      {TYPE_LABELS[post.post_type] ?? post.post_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-stone-900 group-hover:text-orange-600 transition-colors truncate">{post.title}</p>
                  <p className="text-[10px] text-stone-400">{name} · {timeAgo(post.created_at)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-[10px] text-stone-400">
                  <span>↑ {post.upvotes}</span>
                  <span>💬 {post.comment_count}</span>
                </div>
              </Link>
            );
          })}
          <Link href={`/community?movie=${movieId}`} className="block text-center text-xs text-orange-600 hover:underline pt-1">
            See all discussions →
          </Link>
        </div>
      )}
    </section>
  );
}

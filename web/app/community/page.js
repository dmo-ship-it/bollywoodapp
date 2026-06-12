"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { BADGES } from "../../lib/badges";
import WahWahButton from "../components/WahWahButton";
import Link from "next/link";
import { FeedContent } from "../feed/page";
import { LeaderboardsContent } from "../leaderboards/page";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en",{month:"short",day:"numeric"});
}

const TYPE_STYLES = {
  review:     "bg-rose-100 text-rose-700 border-rose-200",
  discussion: "bg-blue-100 text-blue-700 border-blue-200",
};
const TYPE_LABELS = { review: "Review", discussion: "Discussion" };

const FAN_COMMUNITIES = [
  {
    name: "👑 Bollywood Legends",
    description: "Celebrate the kings and queens of Hindi cinema",
    badges: ["srk_fan", "salman_fan", "amitabh_fan", "ddlj_forever"],
  },
  {
    name: "🎬 South Indian Cinema",
    description: "The fierce, passionate fandoms of Tamil, Telugu & Malayalam",
    badges: ["thalaivar", "thalapathy", "kamal_fan"],
  },
  {
    name: "🎞️ Iconic Films",
    description: "Devoted to timeless classics that define Indian cinema",
    badges: ["sholay_legend", "3idiots_dev"],
  },
  {
    name: "🎥 Director Devotion",
    description: "Follow visionary directors across Indian cinema",
    badges: ["mani_ratnam", "kashyap_fan"],
  },
  {
    name: "🇮🇳 Regional Pride",
    description: "Celebrate cinema from different regions of India",
    badges: ["tamil_pride", "malayalam_fan", "telugu_fan"],
  },
  {
    name: "🎨 Taste-Based",
    description: "Define yourself by your unique film taste",
    badges: ["90s_nostalgic", "masala_lover", "arthaus"],
  },
];

export default function CommunityPage() {
  const supabase = createClient();
  const [user,       setUser]       = useState(null);
  const [tab,        setTab]        = useState("feed");
  const [sort,       setSort]       = useState("new");
  const [posts,      setPosts]      = useState([]);
  const [lists,      setLists]      = useState([]);
  const [myVotes,    setMyVotes]    = useState(new Set());
  const [badgeStats, setBadgeStats] = useState({});
  const [earnedBadges, setEarnedBadges] = useState(new Set());
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch earned badges
        const { data: badges } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id);
        setEarnedBadges(new Set((badges ?? []).map(b => b.badge_id)));
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (tab === "feed" || tab === "leaderboards") return;
    if (tab === "communities") {
      loadCommunityStats();
    } else {
      load();
    }
  }, [tab, sort, user]);

  async function loadCommunityStats() {
    const allBadgeIds = FAN_COMMUNITIES.flatMap(c => c.badges);
    const { data: badgeUsers } = await supabase
      .from("user_badges")
      .select("badge_id")
      .in("badge_id", allBadgeIds);

    const stats = {};
    allBadgeIds.forEach(id => {
      stats[id] = (badgeUsers?.filter(b => b.badge_id === id) || []).length;
    });
    setBadgeStats(stats);
    setLoading(false);
  }

  async function load() {
    setLoading(true);

    if (tab === "discussions") {
      const { data: rawPosts } = await supabase
        .from("community_posts")
        .select("id,title,content,post_type,upvotes,comment_count,created_at,user_id,movie_id")
        .order(sort === "hot" ? "upvotes" : "created_at", { ascending: false })
        .limit(30);

      if (!rawPosts?.length) { setPosts([]); setLoading(false); return; }

      const userIds  = [...new Set(rawPosts.map(p => p.user_id))];
      const movieIds = [...new Set(rawPosts.map(p => p.movie_id).filter(Boolean))];

      const [{ data: profiles }, { data: movies }, { data: votes }] = await Promise.all([
        supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", userIds),
        movieIds.length ? supabase.from("movies").select("id,title,poster_url,year").in("id", movieIds) : { data: [] },
        user ? supabase.from("community_votes").select("target_id").eq("user_id", user.id).eq("target_type", "post") : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      const movieMap   = Object.fromEntries((movies ?? []).map(m => [m.id, m]));
      setMyVotes(new Set((votes ?? []).map(v => v.target_id)));
      setPosts(rawPosts.map(p => ({ ...p, profile: profileMap[p.user_id], movie: p.movie_id ? movieMap[p.movie_id] : null })));

    } else {
      const { data: rawLists } = await supabase
        .from("community_lists")
        .select("id,title,description,is_ranked,upvotes,created_at,user_id")
        .order(sort === "hot" ? "upvotes" : "created_at", { ascending: false })
        .limit(30);

      if (!rawLists?.length) { setLists([]); setLoading(false); return; }

      const userIds = [...new Set(rawLists.map(l => l.user_id))];
      const listIds = rawLists.map(l => l.id);

      const [{ data: profiles }, { data: items }, { data: votes }] = await Promise.all([
        supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", userIds),
        supabase.from("community_list_items").select("list_id,movies(id,poster_url)").in("list_id", listIds).order("position").limit(200),
        user ? supabase.from("community_votes").select("target_id").eq("user_id", user.id).eq("target_type", "list") : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      const itemsByList = {};
      (items ?? []).forEach(i => { if (!itemsByList[i.list_id]) itemsByList[i.list_id] = []; itemsByList[i.list_id].push(i); });
      setMyVotes(new Set((votes ?? []).map(v => v.target_id)));
      setLists(rawLists.map(l => ({ ...l, profile: profileMap[l.user_id], items: itemsByList[l.id] ?? [] })));
    }
    setLoading(false);
  }

  async function toggleVote(type, id, count, voted) {
    if (!user) { window.location.href = "/login"; return; }
    const table  = type === "post" ? "community_posts" : "community_lists";
    const newSet = new Set(myVotes);
    if (voted) {
      await supabase.from("community_votes").delete().eq("user_id", user.id).eq("target_type", type).eq("target_id", id);
      await supabase.from(table).update({ upvotes: Math.max(0, count - 1) }).eq("id", id);
      newSet.delete(id);
    } else {
      await supabase.from("community_votes").insert({ user_id: user.id, target_type: type, target_id: id });
      await supabase.from(table).update({ upvotes: count + 1 }).eq("id", id);
      newSet.add(id);
    }
    setMyVotes(newSet);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 mb-0.5">Community</h1>
          <p className="text-stone-500 text-sm">Lists, reviews and discussions</p>
        </div>
        <Link
          href="/community/new"
          className="bg-orange-600 text-white font-bold text-sm px-4 py-2 rounded-full hover:bg-orange-500 transition-colors"
        >
          + Create
        </Link>
      </div>

      {/* Tabs + Sort */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 flex-wrap">
          {[
            { id: "feed",         label: "Feed"         },
            { id: "discussions",  label: "Discussions"  },
            { id: "lists",        label: "Lists"        },
            { id: "leaderboards", label: "Leaderboards" },
            { id: "communities",  label: "🎭 Communities" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {(tab === "discussions" || tab === "lists") && (
          <div className="flex gap-1 mt-2">
            {["new","hot"].map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sort === s ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:text-stone-700"}`}>
                {s === "hot" ? "🔥 Hot" : "✨ New"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "feed" ? (
        <FeedContent />
      ) : tab === "leaderboards" ? (
        <LeaderboardsContent />
      ) : loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-24 rounded-2xl shimmer"/>)}</div>
      ) : tab === "communities" ? (
        <div className="space-y-8">
          {FAN_COMMUNITIES.map((category, idx) => (
            <div key={idx}>
              <h2 className="text-lg font-bold text-stone-900 mb-4">{category.name}</h2>
              <p className="text-stone-600 text-sm mb-4">{category.description}</p>
              <div className="space-y-2">
                {category.badges.map(badgeId => {
                  const badge = BADGES.find(b => b.id === badgeId);
                  const hasEarned = earnedBadges.has(badgeId);
                  const members = badgeStats[badgeId] || 0;

                  if (!badge) return null;

                  return (
                    <Link key={badgeId} href={`/fans/${badgeId}`}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        hasEarned
                          ? "bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200 hover:shadow-md"
                          : "bg-white border-stone-200 hover:border-orange-300"
                      }`}>
                      <div className="text-3xl shrink-0">{badge.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold ${hasEarned ? "text-stone-900" : "text-stone-700"}`}>
                          {badge.label}
                        </h3>
                        <p className="text-xs text-stone-500">{badge.desc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {hasEarned && (
                          <span className="text-xs text-orange-600 font-bold block mb-1">✓ You</span>
                        )}
                        <p className="text-sm text-stone-600 font-semibold">
                          {members} fan{members !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : tab === "discussions" ? (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl text-stone-400">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-medium text-stone-600 mb-1">No discussions yet</p>
              <p className="text-sm mb-4">Be the first to start a conversation</p>
              <Link href="/community/new" className="text-orange-600 text-sm hover:underline">Create post →</Link>
            </div>
          ) : posts.map(post => {
            const name   = post.profile?.display_name || post.profile?.email?.split("@")[0] || "Someone";
            const voted  = myVotes.has(post.id);
            const initials = name.slice(0,2).toUpperCase();
            return (
              <div key={post.id} className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-300 transition-all">
                <div className="flex items-start gap-3">
                  {/* Wah Wah */}
                  <div className="shrink-0 pt-0.5">
                    <WahWahButton targetType="post" targetId={post.id} initialCount={post.upvotes} initialVoted={myVotes.has(post.id)} size="sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_STYLES[post.post_type] ?? TYPE_STYLES.discussion}`}>
                        {TYPE_LABELS[post.post_type] ?? post.post_type}
                      </span>
                      {post.movie && (
                        <Link href={`/movies/${post.movie.id}`}
                          className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full hover:text-orange-600 transition-colors">
                          {post.movie.poster_url && <img src={post.movie.poster_url} className="w-3 h-4 rounded object-cover" alt=""/>}
                          {post.movie.title}
                        </Link>
                      )}
                    </div>

                    <Link href={`/community/posts/${post.id}`}>
                      <h3 className="font-semibold text-stone-900 hover:text-orange-600 transition-colors text-sm leading-snug mb-1">{post.title}</h3>
                    </Link>
                    <p className="text-stone-500 text-xs line-clamp-2 mb-2">{post.content}</p>

                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                      <Link href={`/people/${post.user_id}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[8px] font-black">{initials}</div>
                        {name}
                      </Link>
                      <span>{timeAgo(post.created_at)}</span>
                      <Link href={`/community/posts/${post.id}`} className="flex items-center gap-1 hover:text-stone-600 transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {post.comment_count}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {lists.length === 0 ? (
            <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl text-stone-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium text-stone-600 mb-1">No lists yet</p>
              <p className="text-sm mb-4">Create the first community list</p>
              <Link href="/community/new?type=list" className="text-orange-600 text-sm hover:underline">Create list →</Link>
            </div>
          ) : lists.map(list => {
            const name  = list.profile?.display_name || list.profile?.email?.split("@")[0] || "Someone";
            const voted = myVotes.has(list.id);
            const initials = name.slice(0,2).toUpperCase();
            const posters = list.items.slice(0,5).map(i => i.movies?.poster_url).filter(Boolean);
            return (
              <div key={list.id} className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-300 transition-all">
                <div className="flex items-start gap-3">
                  {/* Wah Wah */}
                  <div className="shrink-0 pt-0.5">
                    <WahWahButton targetType="list" targetId={list.id} initialCount={list.upvotes} initialVoted={myVotes.has(list.id)} size="sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {list.is_ranked && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Ranked</span>}
                    </div>
                    <Link href={`/community/lists/${list.id}`}>
                      <h3 className="font-semibold text-stone-900 hover:text-orange-600 transition-colors text-sm mb-1">{list.title}</h3>
                    </Link>
                    {list.description && <p className="text-stone-500 text-xs line-clamp-1 mb-2">{list.description}</p>}

                    {/* Poster strip */}
                    {posters.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {posters.map((url,i) => (
                          <div key={i} className="w-8 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover"/>
                          </div>
                        ))}
                        {list.items.length > 5 && (
                          <div className="w-8 h-11 rounded-md bg-stone-100 flex items-center justify-center text-[9px] text-stone-500 font-bold shrink-0">
                            +{list.items.length - 5}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                      <Link href={`/people/${list.user_id}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[8px] font-black">{initials}</div>
                        {name}
                      </Link>
                      <span>{list.items.length} films</span>
                      <span>{timeAgo(list.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

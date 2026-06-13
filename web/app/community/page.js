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
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800)return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const POST_STYLES = {
  review:     "bg-rose-100 text-rose-700 border-rose-200",
  discussion: "bg-blue-100 text-blue-700 border-blue-200",
  list:       "bg-amber-100 text-amber-700 border-amber-200",
  poll:       "bg-violet-100 text-violet-700 border-violet-200",
};
const POST_LABELS = {
  review:     "⭐ Review",
  discussion: "💬 Discussion",
  list:       "📋 List",
  poll:       "📊 Poll",
};

const FAN_COMMUNITIES = [
  { name: "👑 Bollywood Legends",   description: "Celebrate the kings and queens of Hindi cinema",              badges: ["srk_fan","salman_fan","amitabh_fan","ddlj_forever"] },
  { name: "🎬 South Indian Cinema", description: "The fierce, passionate fandoms of Tamil, Telugu & Malayalam",  badges: ["thalaivar","thalapathy","kamal_fan"] },
  { name: "🎞️ Iconic Films",        description: "Devoted to timeless classics that define Indian cinema",       badges: ["sholay_legend","3idiots_dev"] },
  { name: "🎥 Director Devotion",   description: "Follow visionary directors across Indian cinema",              badges: ["mani_ratnam","kashyap_fan"] },
  { name: "🇮🇳 Regional Pride",      description: "Celebrate cinema from different regions of India",            badges: ["tamil_pride","malayalam_fan","telugu_fan"] },
  { name: "🎨 Taste-Based",         description: "Define yourself by your unique film taste",                   badges: ["90s_nostalgic","masala_lover","arthaus"] },
];

export default function CommunityPage() {
  const supabase = createClient();
  const [user,         setUser]         = useState(null);
  const [tab,          setTab]          = useState("feed");
  const [sort,         setSort]         = useState("new");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [showFilter,   setShowFilter]   = useState(false);
  const [items,        setItems]        = useState([]);   // merged posts + lists + polls
  const [myVotes,      setMyVotes]      = useState(new Set());
  const [badgeStats,   setBadgeStats]   = useState({});
  const [earnedBadges, setEarnedBadges] = useState(new Set());
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setUser(u);
      if (u) {
        const { data: badges } = await supabase.from("user_badges").select("badge_id").eq("user_id", u.id);
        setEarnedBadges(new Set((badges ?? []).map(b => b.badge_id)));
      }
    });
  }, []);

  useEffect(() => {
    if (tab === "feed" || tab === "leaderboards") return;
    if (tab === "communities") { loadCommunityStats(); return; }
    load();
  }, [tab, sort, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCommunityStats() {
    const allBadgeIds = FAN_COMMUNITIES.flatMap(c => c.badges);
    const { data: badgeUsers } = await supabase.from("user_badges").select("badge_id").in("badge_id", allBadgeIds);
    const stats = {};
    allBadgeIds.forEach(id => { stats[id] = (badgeUsers?.filter(b => b.badge_id === id) || []).length; });
    setBadgeStats(stats);
    setLoading(false);
  }

  async function load() {
    setLoading(true);
    const sortCol = sort === "new" ? "created_at" : "upvotes";

    // Fetch posts, lists, and polls in parallel
    const [
      { data: rawPosts },
      { data: rawLists },
      { data: rawPolls },
    ] = await Promise.all([
      supabase.from("community_posts")
        .select("id,title,content,post_type,upvotes,comment_count,created_at,user_id,movie_id")
        .order(sortCol, { ascending: false }).limit(30),
      supabase.from("community_lists")
        .select("id,title,description,is_ranked,upvotes,created_at,user_id")
        .order(sortCol, { ascending: false }).limit(30),
      supabase.from("community_polls")
        .select("id,title,description,max_picks,upvotes,response_count,created_at,user_id")
        .order(sortCol, { ascending: false }).limit(30),
    ]);

    // Collect all user IDs for profile lookup
    const userIds = [...new Set([
      ...(rawPosts  ?? []).map(p => p.user_id),
      ...(rawLists  ?? []).map(l => l.user_id),
      ...(rawPolls  ?? []).map(p => p.user_id),
    ])];
    const movieIds = [...new Set((rawPosts ?? []).map(p => p.movie_id).filter(Boolean))];
    const listIds  = (rawLists ?? []).map(l => l.id);
    const pollIds  = (rawPolls ?? []).map(p => p.id);

    const [
      { data: profiles },
      { data: movies },
      { data: listItems },
      { data: postVotes },
      { data: listVotes },
      { data: myPollResponses },
    ] = await Promise.all([
      supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", userIds),
      movieIds.length ? supabase.from("movies").select("id,title,poster_url,year").in("id", movieIds) : { data: [] },
      listIds.length  ? supabase.from("community_list_items").select("list_id,movies(id,poster_url)").in("list_id", listIds).order("position").limit(300) : { data: [] },
      user ? supabase.from("community_votes").select("target_id").eq("user_id", user.id).eq("target_type", "post") : { data: [] },
      user ? supabase.from("community_votes").select("target_id").eq("user_id", user.id).eq("target_type", "list") : { data: [] },
      user && pollIds.length ? supabase.from("community_poll_responses").select("poll_id").eq("user_id", user.id).in("poll_id", pollIds) : { data: [] },
    ]);

    const profileMap    = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
    const movieMap      = Object.fromEntries((movies   ?? []).map(m => [m.id, m]));
    const itemsByList   = {};
    (listItems ?? []).forEach(i => { if (!itemsByList[i.list_id]) itemsByList[i.list_id] = []; itemsByList[i.list_id].push(i); });
    const respondedPolls = new Set((myPollResponses ?? []).map(r => r.poll_id));

    const allVotes = new Set([
      ...(postVotes ?? []).map(v => v.target_id),
      ...(listVotes ?? []).map(v => v.target_id),
    ]);
    setMyVotes(allVotes);

    // Build unified items array
    const merged = [
      ...(rawPosts ?? []).map(p => ({
        _type: "post", _kind: p.post_type,
        id: p.id, title: p.title, excerpt: p.content, upvotes: p.upvotes,
        created_at: p.created_at, user_id: p.user_id,
        profile: profileMap[p.user_id],
        movie: p.movie_id ? movieMap[p.movie_id] : null,
        comment_count: p.comment_count,
        href: `/community/posts/${p.id}`,
      })),
      ...(rawLists ?? []).map(l => ({
        _type: "list", _kind: "list",
        id: l.id, title: l.title, excerpt: l.description, upvotes: l.upvotes,
        created_at: l.created_at, user_id: l.user_id,
        profile: profileMap[l.user_id],
        is_ranked: l.is_ranked,
        posters: (itemsByList[l.id] ?? []).slice(0, 5).map(i => i.movies?.poster_url).filter(Boolean),
        filmCount: (itemsByList[l.id] ?? []).length,
        href: `/community/lists/${l.id}`,
      })),
      ...(rawPolls ?? []).map(p => ({
        _type: "poll", _kind: "poll",
        id: p.id, title: p.title, excerpt: p.description, upvotes: p.upvotes,
        created_at: p.created_at, user_id: p.user_id,
        profile: profileMap[p.user_id],
        max_picks: p.max_picks, response_count: p.response_count,
        hasResponded: respondedPolls.has(p.id),
        href: `/community/polls/${p.id}`,
      })),
    ].sort((a, b) =>
      sort === "new"
        ? new Date(b.created_at) - new Date(a.created_at)
        : b.upvotes - a.upvotes
    );

    setItems(merged);
    setLoading(false);
  }

  const filtered = items.filter(item => {
    if (typeFilter !== "all" && item._kind !== typeFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !item.title?.toLowerCase().includes(q) && !item.excerpt?.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 mb-0.5">Community</h1>
          <p className="text-stone-500 text-sm">Discussions, lists, polls & more</p>
        </div>
        <Link href="/community/new" className="bg-orange-600 text-white font-bold text-sm px-4 py-2 rounded-full hover:bg-orange-500 transition-colors">
          + Create
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-4 overflow-x-auto scroll-hide">
        {[
          { id: "feed",         label: "Feed"         },
          { id: "discussions",  label: "Discussions"  },
          { id: "leaderboards", label: "Leaderboards" },
          { id: "communities",  label: "Communities"  },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setShowFilter(false); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Filter bar (discussions only) */}
      {tab === "discussions" && (
        <div className="mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search discussions, lists, polls…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-colors"/>
            </div>
            <div className="relative">
              <button onClick={() => setShowFilter(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${showFilter || sort !== "new" || typeFilter !== "all" ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-300"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
                <span>Filter</span>
                {(sort !== "new" || typeFilter !== "all") && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"/>}
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-stone-200 rounded-2xl shadow-lg z-10 p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Sort by</p>
                    <div className="flex flex-col gap-1">
                      {[{ id:"new",label:"Newest first"},{id:"hot",label:"Most upvoted"}].map(s => (
                        <button key={s.id} onClick={() => setSort(s.id)}
                          className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all ${sort === s.id ? "bg-orange-50 text-orange-700 font-medium" : "text-stone-600 hover:bg-stone-50"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Type</p>
                    <div className="flex flex-col gap-1">
                      {[{id:"all",label:"All"},{id:"discussion",label:"💬 Discussions"},{id:"review",label:"⭐ Reviews"},{id:"list",label:"📋 Lists"},{id:"poll",label:"📊 Polls"}].map(t => (
                        <button key={t.id} onClick={() => setTypeFilter(t.id)}
                          className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all ${typeFilter === t.id ? "bg-orange-50 text-orange-700 font-medium" : "text-stone-600 hover:bg-stone-50"}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab content */}
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
              <h2 className="text-lg font-bold text-stone-900 mb-2">{category.name}</h2>
              <p className="text-stone-600 text-sm mb-3">{category.description}</p>
              <div className="space-y-2">
                {category.badges.map(badgeId => {
                  const badge    = BADGES.find(b => b.id === badgeId);
                  const hasEarned = earnedBadges.has(badgeId);
                  const members  = badgeStats[badgeId] || 0;
                  if (!badge) return null;
                  return (
                    <Link key={badgeId} href={`/fans/${badgeId}`}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${hasEarned ? "bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200 hover:shadow-md" : "bg-white border-stone-200 hover:border-orange-300"}`}>
                      <div className="text-3xl shrink-0">{badge.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold ${hasEarned ? "text-stone-900" : "text-stone-700"}`}>{badge.label}</h3>
                        <p className="text-xs text-stone-500">{badge.desc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {hasEarned && <span className="text-xs text-orange-600 font-bold block mb-1">✓ You</span>}
                        <p className="text-sm text-stone-600 font-semibold">{members} fan{members !== 1 ? "s" : ""}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Discussions tab — posts + lists + polls merged */
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl text-stone-400">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-medium text-stone-600 mb-1">{items.length === 0 ? "Nothing here yet" : "No results found"}</p>
              <p className="text-sm mb-4">{items.length === 0 ? "Be the first to post, start a poll, or make a list" : "Try a different search or filter"}</p>
              {items.length === 0 && <Link href="/community/new" className="text-orange-600 text-sm hover:underline">Create something →</Link>}
            </div>
          ) : filtered.map(item => {
            const name     = item.profile?.display_name || item.profile?.email?.split("@")[0] || "Someone";
            const initials = name.slice(0, 2).toUpperCase();

            return (
              <div key={`${item._type}-${item.id}`} className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-300 transition-all">
                <div className="flex items-start gap-3">
                  {/* Upvote */}
                  <div className="shrink-0 pt-0.5">
                    <WahWahButton
                      targetType={item._type === "list" ? "list" : "post"}
                      targetId={item.id}
                      initialCount={item.upvotes}
                      initialVoted={myVotes.has(item.id)}
                      size="sm"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Type badge row */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${POST_STYLES[item._kind] ?? POST_STYLES.discussion}`}>
                        {POST_LABELS[item._kind] ?? item._kind}
                      </span>
                      {item.is_ranked && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Ranked</span>
                      )}
                      {item.movie && (
                        <Link href={`/movies/${item.movie.id}`}
                          className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full hover:text-orange-600 transition-colors">
                          {item.movie.poster_url && <img src={item.movie.poster_url} className="w-3 h-4 rounded object-cover" alt=""/>}
                          {item.movie.title}
                        </Link>
                      )}
                    </div>

                    {/* Title */}
                    <Link href={item.href}>
                      <h3 className="font-semibold text-stone-900 hover:text-orange-600 transition-colors text-sm leading-snug mb-1">{item.title}</h3>
                    </Link>

                    {/* Excerpt */}
                    {item.excerpt && <p className="text-stone-500 text-xs line-clamp-2 mb-2">{item.excerpt}</p>}

                    {/* List poster strip */}
                    {item._type === "list" && item.posters?.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {item.posters.map((url, i) => (
                          <div key={i} className="w-8 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover"/>
                          </div>
                        ))}
                        {item.filmCount > 5 && (
                          <div className="w-8 h-11 rounded-md bg-stone-100 flex items-center justify-center text-[9px] text-stone-500 font-bold shrink-0">
                            +{item.filmCount - 5}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Poll CTA */}
                    {item._type === "poll" && (
                      <div className="mb-2">
                        <Link href={item.href}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${item.hasResponded ? "bg-stone-100 text-stone-600 hover:bg-stone-200" : "bg-violet-600 text-white hover:bg-violet-500"}`}>
                          {item.hasResponded ? "📊 See results" : `🗳️ Vote · pick ${item.max_picks > 1 ? `up to ${item.max_picks}` : "1"}`}
                        </Link>
                        {item.response_count > 0 && (
                          <span className="text-[10px] text-stone-400 ml-2">{item.response_count} response{item.response_count !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    )}

                    {/* Footer meta */}
                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                      <Link href={`/people/${item.user_id}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[8px] font-black">{initials}</div>
                        {name}
                      </Link>
                      <span>{timeAgo(item.created_at)}</span>
                      {item._type === "post" && (
                        <Link href={item.href} className="flex items-center gap-1 hover:text-stone-600 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {item.comment_count}
                        </Link>
                      )}
                      {item._type === "list" && <span>{item.filmCount} films</span>}
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

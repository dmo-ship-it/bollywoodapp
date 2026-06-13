"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-browser";
import WahWahButton from "../../../components/WahWahButton";
import Link from "next/link";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"});
}

const TYPE_STYLES = { review: "bg-rose-100 text-rose-700 border-rose-200", discussion: "bg-blue-100 text-blue-700 border-blue-200" };
const TYPE_LABELS = { review: "Review", discussion: "Discussion" };

export default function PostPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const commentRef = useRef(null);

  const [user,           setUser]           = useState(null);
  const [post,           setPost]           = useState(null);
  const [comments,       setComments]       = useState([]);
  const [movie,          setMovie]          = useState(null);
  const [authorProfile,  setAuthorProfile]  = useState(null);
  const [voted,          setVoted]          = useState(false);
  const [newComment,     setNewComment]     = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [loading,        setLoading]        = useState(true);

  // Post editing
  const [editing,        setEditing]        = useState(false);
  const [editTitle,      setEditTitle]      = useState("");
  const [editContent,    setEditContent]    = useState("");
  const [savingEdit,     setSavingEdit]     = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  // Comment editing
  const [editingComment, setEditingComment] = useState(null); // comment id
  const [editCommentText,setEditCommentText]= useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [{ data: postData }, { data: { user } }] = await Promise.all([
      supabase.from("community_posts").select("*").eq("id", id).single(),
      supabase.auth.getUser(),
    ]);

    if (!postData) { setLoading(false); return; }
    setPost(postData);
    setUser(user);

    const [{ data: comments }, { data: profiles }, movieRes, voteRes] = await Promise.all([
      supabase.from("community_comments").select("*").eq("post_id", id).order("created_at"),
      supabase.from("user_profiles").select("user_id,display_name,email").in("user_id",
        [...new Set([postData.user_id])]),
      postData.movie_id ? supabase.from("movies").select("id,title,year,poster_url,genres,tmdb_rating").eq("id", postData.movie_id).single() : { data: null },
      user ? supabase.from("community_votes").select("id").eq("user_id", user.id).eq("target_type","post").eq("target_id", id).single() : { data: null },
    ]);

    // Enrich comments with profiles
    const commentUserIds = [...new Set((comments ?? []).map(c => c.user_id))];
    const { data: commentProfiles } = commentUserIds.length
      ? await supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", commentUserIds)
      : { data: [] };

    const profileMap = Object.fromEntries([...(profiles ?? []), ...(commentProfiles ?? [])].map(p => [p.user_id, p]));

    setAuthorProfile(profileMap[postData.user_id]);
    setMovie(movieRes.data);
    setVoted(!!voteRes.data);
    setComments((comments ?? []).map(c => ({ ...c, profile: profileMap[c.user_id] })));
    setLoading(false);
  }

  async function toggleVote() {
    if (!user) { router.push("/login"); return; }
    if (voted) {
      await supabase.from("community_votes").delete().eq("user_id",user.id).eq("target_type","post").eq("target_id",id);
      await supabase.from("community_posts").update({ upvotes: Math.max(0, post.upvotes - 1) }).eq("id", id);
      setPost(p => ({ ...p, upvotes: Math.max(0, p.upvotes - 1) }));
      setVoted(false);
    } else {
      await supabase.from("community_votes").insert({ user_id: user.id, target_type: "post", target_id: id });
      await supabase.from("community_posts").update({ upvotes: post.upvotes + 1 }).eq("id", id);
      setPost(p => ({ ...p, upvotes: p.upvotes + 1 }));
      setVoted(true);
    }
  }

  async function saveEdit() {
    if (!editTitle.trim() || savingEdit) return;
    setSavingEdit(true);
    await supabase.from("community_posts")
      .update({ title: editTitle.trim(), content: editContent.trim() })
      .eq("id", id);
    setPost(p => ({ ...p, title: editTitle.trim(), content: editContent.trim() }));
    setEditing(false);
    setSavingEdit(false);
  }

  async function deletePost() {
    await supabase.from("community_posts").delete().eq("id", id);
    router.push("/community");
  }

  async function saveEditComment(commentId) {
    if (!editCommentText.trim()) return;
    await supabase.from("community_comments")
      .update({ content: editCommentText.trim() })
      .eq("id", commentId);
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editCommentText.trim() } : c));
    setEditingComment(null);
  }

  async function deleteComment(commentId) {
    await supabase.from("community_comments").delete().eq("id", commentId);
    await supabase.from("community_posts").update({ comment_count: Math.max(0, post.comment_count - 1) }).eq("id", id);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setPost(p => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    setSubmitting(true);

    const { data: comment } = await supabase.from("community_comments").insert({
      post_id: id, user_id: user.id, content: newComment.trim()
    }).select("*").single();

    await supabase.from("community_posts").update({ comment_count: post.comment_count + 1 }).eq("id", id);

    const { data: profile } = await supabase.from("user_profiles").select("user_id,display_name,email").eq("user_id", user.id).single();
    setComments(prev => [...prev, { ...comment, profile }]);
    setPost(p => ({ ...p, comment_count: p.comment_count + 1 }));
    setNewComment("");
    setSubmitting(false);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-3xl animate-pulse mb-3">💬</div>Loading…
    </div>
  );
  if (!post) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center text-stone-400">
      <p className="text-4xl mb-3">💬</p>
      <p className="text-stone-600 font-medium">Post not found</p>
      <Link href="/community" className="text-orange-600 hover:underline mt-3 block">← Community</Link>
    </div>
  );

  const authorName = authorProfile?.display_name || authorProfile?.email?.split("@")[0] || "Someone";
  const initials   = authorName.slice(0,2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">
      <Link href="/community" className="text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6 block">← Community</Link>

      {/* Post */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 shadow-sm">

        {/* Type + movie */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_STYLES[post.post_type] ?? TYPE_STYLES.discussion}`}>
            {TYPE_LABELS[post.post_type] ?? post.post_type}
          </span>
          {movie && (
            <Link href={`/movies/${movie.id}`}
              className="flex items-center gap-1.5 text-[10px] bg-stone-100 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full hover:text-orange-600 transition-colors">
              {movie.poster_url && <img src={movie.poster_url} className="w-3 h-4 rounded object-cover" alt=""/>}
              {movie.title} · {movie.year}
            </Link>
          )}
          {user?.id === post.user_id && !editing && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditing(true); }}
                className="text-[11px] text-stone-400 hover:text-orange-600 font-medium transition-colors">
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="text-[11px] text-stone-400 hover:text-red-500 font-medium transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3 mb-4">
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-xl font-black text-stone-900 border-b border-stone-300 focus:outline-none focus:border-orange-400 pb-1 bg-transparent"
            />
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={6}
              className="w-full text-sm text-stone-700 border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-orange-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={!editTitle.trim() || savingEdit}
                className="bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-full hover:bg-orange-500 transition-colors disabled:opacity-40">
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium px-4 py-2 rounded-full border border-stone-200 hover:border-stone-300 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-black text-stone-900 mb-3">{post.title}</h1>

            {/* Movie card for reviews */}
            {movie && post.post_type === "review" && (
              <Link href={`/movies/${movie.id}`} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3 mb-4 hover:border-orange-200 transition-colors group">
                {movie.poster_url && <img src={movie.poster_url} className="w-10 h-14 rounded-lg object-cover" alt=""/>}
                <div>
                  <p className="font-semibold text-stone-900 text-sm group-hover:text-orange-600 transition-colors">{movie.title}</p>
                  <p className="text-xs text-stone-400">{movie.year} · {movie.genres?.slice(0,2).join(", ")}</p>
                  {movie.tmdb_rating > 0 && <p className="text-xs text-stone-400">{Math.round(movie.tmdb_rating * 10)}</p>}
                </div>
              </Link>
            )}

            {/* Content */}
            <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
          </>
        )}

        {/* Author + meta */}
        {!editing && (
          <div className="flex items-center justify-between">
            <Link href={`/people/${post.user_id}`} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-black">{initials}</div>
              <div>
                <p className="text-xs font-semibold text-stone-700 group-hover:text-orange-600 transition-colors">{authorName}</p>
                <p className="text-[10px] text-stone-400">{timeAgo(post.created_at)}</p>
              </div>
            </Link>

            {/* Wah Wah */}
            <WahWahButton targetType="post" targetId={id} initialCount={post.upvotes} initialVoted={voted} size="md" />
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-stone-900 mb-2">Delete post?</h3>
            <p className="text-sm text-stone-500 mb-5">This can't be undone. All comments will also be removed.</p>
            <div className="flex gap-3">
              <button onClick={deletePost}
                className="flex-1 bg-red-500 text-white font-bold text-sm py-2 rounded-full hover:bg-red-600 transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-stone-200 text-stone-600 font-medium text-sm py-2 rounded-full hover:bg-stone-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-stone-700 mb-3">{post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}</h2>
        <div className="space-y-3">
          {comments.map(c => {
            const name = c.profile?.display_name || c.profile?.email?.split("@")[0] || "Someone";
            const ini  = name.slice(0,2).toUpperCase();
            const isOwn = user?.id === c.user_id;
            return (
              <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-black">{ini}</div>
                  <span className="text-xs font-semibold text-stone-700">{name}</span>
                  <span className="text-[10px] text-stone-400">{timeAgo(c.created_at)}</span>
                  {isOwn && editingComment !== c.id && (
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }}
                        className="text-[10px] text-stone-400 hover:text-orange-600 font-medium transition-colors">Edit</button>
                      <button onClick={() => deleteComment(c.id)}
                        className="text-[10px] text-stone-400 hover:text-red-500 font-medium transition-colors">Delete</button>
                    </div>
                  )}
                </div>
                {editingComment === c.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editCommentText}
                      onChange={e => setEditCommentText(e.target.value)}
                      rows={3}
                      className="w-full text-sm text-stone-900 border border-stone-200 rounded-lg p-2 focus:outline-none focus:border-orange-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEditComment(c.id)} disabled={!editCommentText.trim()}
                        className="bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded-full hover:bg-orange-500 transition-colors disabled:opacity-40">
                        Save
                      </button>
                      <button onClick={() => setEditingComment(null)}
                        className="text-xs text-stone-500 hover:text-stone-800 font-medium">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                )}
              </div>
            );
          })}
          {comments.length === 0 && (
            <p className="text-stone-400 text-sm text-center py-6">No comments yet — be the first!</p>
          )}
        </div>
      </div>

      {/* Add comment */}
      {user ? (
        <form onSubmit={submitComment} ref={commentRef} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none resize-none mb-3"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={!newComment.trim() || submitting}
              className="bg-orange-600 text-white font-bold text-xs px-5 py-2 rounded-full hover:bg-orange-500 transition-colors disabled:opacity-40">
              {submitting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
          <p className="text-sm text-stone-600 mb-2">Sign in to join the discussion</p>
          <Link href="/login" className="text-orange-600 text-sm font-semibold hover:underline">Sign in →</Link>
        </div>
      )}
    </div>
  );
}

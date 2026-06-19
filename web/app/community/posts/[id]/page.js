"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-browser";
import VoteButton from "../../../components/VoteButton";
import Link from "next/link";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"});
}

const TYPE_STYLES = {
  review:     "bg-rose-100 text-rose-700 border-rose-200",
  discussion: "bg-blue-100 text-blue-700 border-blue-200",
};
const TYPE_LABELS = { review: "Review", discussion: "Discussion" };

function Avatar({ name, size = "sm" }) {
  const ini = (name || "?").slice(0, 2).toUpperCase();
  const sz  = size === "sm" ? 20 : 28;
  const fs  = size === "sm" ? 8  : 10;
  return (
    <div style={{ width: sz, height: sz, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: fs, flexShrink: 0 }}>
      {ini}
    </div>
  );
}

export default function PostPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const bottomRef = useRef(null);

  const [user,          setUser]          = useState(null);
  const [post,          setPost]          = useState(null);
  const [comments,      setComments]      = useState([]);
  const [movie,         setMovie]         = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Voting
  const [myPostVote,    setMyPostVote]    = useState(null); // null | 'up' | 'down'
  const [commentVotes,  setCommentVotes]  = useState({});   // {commentId: 'up'|'down'}

  // Composing
  const [newComment,    setNewComment]    = useState("");
  const [replyingTo,    setReplyingTo]    = useState(null); // comment id
  const [replyText,     setReplyText]     = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  // Editing post
  const [editing,       setEditing]       = useState(false);
  const [editTitle,     setEditTitle]     = useState("");
  const [editContent,   setEditContent]   = useState("");
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editing comments
  const [editingComment,  setEditingComment]  = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const [{ data: postData }, { data: authData }] = await Promise.all([
      supabase.from("community_posts").select("*").eq("id", id).single(),
      supabase.auth.getUser(),
    ]);

    if (!postData) { setLoading(false); return; }
    const u = authData?.user ?? null;
    setPost(postData);
    setUser(u);

    const [
      { data: rawComments },
      { data: authorProfiles },
      movieRes,
      postVoteRes,
    ] = await Promise.all([
      supabase.from("community_comments").select("*").eq("post_id", id).order("created_at"),
      supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", [postData.user_id]),
      postData.movie_id
        ? supabase.from("movies").select("id,title,year,poster_url,genres,tmdb_rating").eq("id", postData.movie_id).single()
        : { data: null },
      u ? supabase.from("community_votes").select("vote_type")
            .eq("user_id", u.id).eq("target_type","post").eq("target_id", id).maybeSingle()
        : { data: null },
    ]);

    setAuthorProfile((authorProfiles ?? [])[0] ?? null);
    setMovie(movieRes.data);
    setMyPostVote(postVoteRes.data?.vote_type ?? null);

    const commentIds    = (rawComments ?? []).map(c => c.id);
    const commentUserIds = [...new Set((rawComments ?? []).map(c => c.user_id))];

    const [{ data: commentProfiles }, { data: myCommentVotes }] = await Promise.all([
      commentUserIds.length
        ? supabase.from("user_profiles").select("user_id,display_name,email").in("user_id", commentUserIds)
        : { data: [] },
      u && commentIds.length
        ? supabase.from("comment_votes").select("comment_id,vote_type").eq("user_id", u.id).in("comment_id", commentIds)
        : { data: [] },
    ]);

    const profileMap = Object.fromEntries([...(authorProfiles ?? []), ...(commentProfiles ?? [])].map(p => [p.user_id, p]));
    const cvMap      = Object.fromEntries((myCommentVotes ?? []).map(v => [v.comment_id, v.vote_type]));

    setCommentVotes(cvMap);
    setComments((rawComments ?? []).map(c => ({ ...c, profile: profileMap[c.user_id] })));
    setLoading(false);
  }

  // ── Post voting ──────────────────────────────────────────────────────────
  async function votePost(type) {
    if (!user) { router.push("/login"); return; }
    const prev    = myPostVote;
    const newVote = prev === type ? null : type;

    let upDelta = 0, downDelta = 0;
    if (prev === "up")    upDelta--;
    if (prev === "down")  downDelta--;
    if (newVote === "up")   upDelta++;
    if (newVote === "down") downDelta++;

    const newUp   = Math.max(0, (post.upvotes   ?? 0) + upDelta);
    const newDown = Math.max(0, (post.downvotes  ?? 0) + downDelta);

    setMyPostVote(newVote);
    setPost(p => ({ ...p, upvotes: newUp, downvotes: newDown }));

    await supabase.from("community_votes").delete()
      .eq("user_id", user.id).eq("target_type","post").eq("target_id", id);
    if (newVote) {
      await supabase.from("community_votes")
        .insert({ user_id: user.id, target_type:"post", target_id: id, vote_type: newVote });
    }
    await supabase.from("community_posts")
      .update({ upvotes: newUp, downvotes: newDown }).eq("id", id);
  }

  // ── Comment voting ───────────────────────────────────────────────────────
  async function voteComment(commentId, type) {
    if (!user) { router.push("/login"); return; }
    const prev    = commentVotes[commentId] ?? null;
    const newVote = prev === type ? null : type;

    let upDelta = 0, downDelta = 0;
    if (prev === "up")    upDelta--;
    if (prev === "down")  downDelta--;
    if (newVote === "up")   upDelta++;
    if (newVote === "down") downDelta++;

    setCommentVotes(cv => ({ ...cv, [commentId]: newVote }));
    setComments(prev => prev.map(c => c.id !== commentId ? c : {
      ...c,
      upvotes:   Math.max(0, (c.upvotes   ?? 0) + upDelta),
      downvotes: Math.max(0, (c.downvotes ?? 0) + downDelta),
    }));

    const comment = comments.find(c => c.id === commentId);
    const newUp   = Math.max(0, (comment?.upvotes   ?? 0) + upDelta);
    const newDown = Math.max(0, (comment?.downvotes ?? 0) + downDelta);

    await supabase.from("comment_votes").delete()
      .eq("user_id", user.id).eq("comment_id", commentId);
    if (newVote) {
      await supabase.from("comment_votes")
        .insert({ user_id: user.id, comment_id: commentId, vote_type: newVote });
    }
    await supabase.from("community_comments")
      .update({ upvotes: newUp, downvotes: newDown }).eq("id", commentId);
  }

  // ── Post edit / delete ───────────────────────────────────────────────────
  async function saveEdit() {
    if (!editTitle.trim() || savingEdit) return;
    setSavingEdit(true);
    await supabase.from("community_posts")
      .update({ title: editTitle.trim(), content: editContent.trim() }).eq("id", id);
    setPost(p => ({ ...p, title: editTitle.trim(), content: editContent.trim() }));
    setEditing(false);
    setSavingEdit(false);
  }

  async function deletePost() {
    await supabase.from("community_posts").delete().eq("id", id);
    router.push("/community");
  }

  // ── Comment edit / delete ────────────────────────────────────────────────
  async function saveEditComment(commentId) {
    if (!editCommentText.trim()) return;
    await supabase.from("community_comments")
      .update({ content: editCommentText.trim() }).eq("id", commentId);
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editCommentText.trim() } : c));
    setEditingComment(null);
  }

  async function deleteComment(commentId) {
    await supabase.from("community_comments").delete().eq("id", commentId);
    await supabase.from("community_posts")
      .update({ comment_count: Math.max(0, (post.comment_count ?? 0) - 1) }).eq("id", id);
    setComments(prev => prev.filter(c => c.id !== commentId && c.parent_comment_id !== commentId));
    setPost(p => ({ ...p, comment_count: Math.max(0, (p.comment_count ?? 0) - 1) }));
  }

  // ── Submitting comments / replies ────────────────────────────────────────
  async function submitComment(e) {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;
    setSubmitting(true);
    const { data: comment } = await supabase.from("community_comments")
      .insert({ post_id: id, user_id: user.id, content: newComment.trim() })
      .select("*").single();
    await supabase.from("community_posts")
      .update({ comment_count: (post.comment_count ?? 0) + 1 }).eq("id", id);
    const { data: profile } = await supabase.from("user_profiles")
      .select("user_id,display_name,email").eq("user_id", user.id).single();
    setComments(prev => [...prev, { ...comment, profile }]);
    setPost(p => ({ ...p, comment_count: (p.comment_count ?? 0) + 1 }));
    setNewComment("");
    setSubmitting(false);
  }

  async function submitReply(parentId) {
    if (!user || !replyText.trim() || submitting) return;
    setSubmitting(true);
    const { data: comment } = await supabase.from("community_comments")
      .insert({ post_id: id, user_id: user.id, content: replyText.trim(), parent_comment_id: parentId })
      .select("*").single();
    await supabase.from("community_posts")
      .update({ comment_count: (post.comment_count ?? 0) + 1 }).eq("id", id);
    const { data: profile } = await supabase.from("user_profiles")
      .select("user_id,display_name,email").eq("user_id", user.id).single();
    setComments(prev => [...prev, { ...comment, profile }]);
    setPost(p => ({ ...p, comment_count: (p.comment_count ?? 0) + 1 }));
    setReplyText("");
    setReplyingTo(null);
    setSubmitting(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer"/>)}</div>
    </div>
  );
  if (!post) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: "var(--ink-mute)" }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 12 }}>Post not found</p>
      <Link href="/community" style={{ color: "var(--brand)", textDecoration: "none", fontSize: 13 }}>← Community</Link>
    </div>
  );

  const authorName = authorProfile?.display_name || authorProfile?.email?.split("@")[0] || "Someone";
  const postScore  = (post.upvotes ?? 0) - (post.downvotes ?? 0);

  // Build comment tree: top-level + replies grouped by parent
  const topLevel  = comments.filter(c => !c.parent_comment_id);
  const repliesOf = {};
  comments.filter(c => c.parent_comment_id).forEach(c => {
    if (!repliesOf[c.parent_comment_id]) repliesOf[c.parent_comment_id] = [];
    repliesOf[c.parent_comment_id].push(c);
  });

  const totalComments = comments.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <Link href="/community" style={{ color: "var(--ink-mute)", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 24 }}>← Community</Link>

      {/* ── Post card ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "var(--shadow-card)" }}>
        <div className="flex gap-3">

          {/* Vote column */}
          <VoteButton
            score={postScore}
            myVote={myPostVote}
            onVote={votePost}
            layout="vertical"
          />

          {/* Post content */}
          <div className="flex-1 min-w-0">

            {/* Type badge + movie + owner actions */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${TYPE_STYLES[post.post_type] ?? TYPE_STYLES.discussion}`}>
                {TYPE_LABELS[post.post_type] ?? post.post_type}
              </span>
              {movie && (
                <Link href={`/movies/${movie.id}`}
                  className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full transition-colors"
                  style={{ background: "var(--sunk)", border: "1px solid var(--line)", color: "var(--ink-soft)" }}>
                  {movie.poster_url && <img src={movie.poster_url} className="w-3 h-4 rounded object-cover" alt=""/>}
                  {movie.title} · {movie.year}
                </Link>
              )}
              {user?.id === post.user_id && !editing && (
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditing(true); }}
                    style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Edit</button>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }} className="hover:text-red-500 transition-colors">Delete</button>
                </div>
              )}
            </div>

            {/* Editing mode */}
            {editing ? (
              <div className="space-y-3 mb-3">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-lg font-black text-stone-900 border-b border-stone-300 focus:outline-none pb-1 bg-transparent"
                  style={{ borderBottom: "1px solid var(--line)" }}/>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  rows={5} className="w-full text-sm text-stone-700 rounded-xl p-3 focus:outline-none resize-none"
                  style={{ border: "1px solid var(--line)" }}/>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={!editTitle.trim() || savingEdit}
                    style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: (!editTitle.trim() || savingEdit) ? 0.4 : 1 }}>
                    {savingEdit ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="text-xs text-stone-500 border border-stone-200 px-4 py-2 rounded-full hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-stone-900 mb-2">{post.title}</h1>

                {movie && post.post_type === "review" && (
                  <Link href={`/movies/${movie.id}`}
                    className="flex items-center gap-3 rounded-xl p-3 mb-3 transition-colors group"
                    style={{ background: "var(--sunk)", border: "1px solid var(--line)", textDecoration: "none" }}>
                    {movie.poster_url && <img src={movie.poster_url} className="w-10 h-14 rounded-lg object-cover" alt=""/>}
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{movie.title}</p>
                      <p className="text-xs text-stone-400">{movie.year} · {movie.genres?.slice(0,2).join(", ")}</p>
                    </div>
                  </Link>
                )}

                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
              </>
            )}

            {/* Author row */}
            {!editing && (
              <div className="flex items-center gap-2 text-[10px] text-stone-400">
                <Link href={`/people/${post.user_id}`} className="flex items-center gap-1.5 transition-colors" style={{ color: "inherit", textDecoration: "none" }}>
                  <Avatar name={authorName}/>
                  <span className="font-semibold text-stone-600">{authorName}</span>
                </Link>
                <span>{timeAgo(post.created_at)}</span>
                <span className="ml-auto">{totalComments} comment{totalComments !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "var(--shadow-card)" }}>
            <h3 className="font-bold text-stone-900 mb-2">Delete post?</h3>
            <p className="text-sm text-stone-500 mb-5">This can't be undone. All comments will also be removed.</p>
            <div className="flex gap-3">
              <button onClick={deletePost}
                className="flex-1 bg-red-500 text-white font-bold text-sm py-2 rounded-full hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-stone-200 text-stone-600 font-medium text-sm py-2 rounded-full hover:bg-stone-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add comment ── */}
      {user ? (
        <form onSubmit={submitComment} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginBottom: 20, boxShadow: "var(--shadow-card)" }}>
          <div className="flex gap-2 items-start">
            <Avatar name={user.email?.split("@")[0] || "?"} size="sm"/>
            <div className="flex-1">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment…" rows={2}
                className="w-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none resize-none"/>
              {newComment.trim() && (
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={submitting}
                    style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: submitting ? 0.4 : 1 }}>
                    {submitting ? "Posting…" : "Comment"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div style={{ background: "rgba(225,75,51,0.04)", border: "1px solid rgba(225,75,51,0.12)", borderRadius: 16, padding: 16, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>Sign in to join the discussion</p>
          <Link href="/login" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Sign in →</Link>
        </div>
      )}

      {/* ── Comments ── */}
      <div className="space-y-3" ref={bottomRef}>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide px-1">
          {totalComments} comment{totalComments !== 1 ? "s" : ""}
        </p>

        {topLevel.length === 0 && (
          <p style={{ fontSize: 13, textAlign: "center", padding: "32px 16px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, color: "var(--ink-mute)" }}>
            No comments yet — be the first!
          </p>
        )}

        {topLevel.map(c => (
          <CommentThread
            key={c.id}
            comment={c}
            replies={repliesOf[c.id] ?? []}
            user={user}
            myVote={commentVotes[c.id] ?? null}
            replyVotes={Object.fromEntries((repliesOf[c.id] ?? []).map(r => [r.id, commentVotes[r.id] ?? null]))}
            replyingTo={replyingTo}
            replyText={replyText}
            editingComment={editingComment}
            editCommentText={editCommentText}
            submitting={submitting}
            onVote={voteComment}
            onReply={(cid) => { setReplyingTo(replyingTo === cid ? null : cid); setReplyText(""); }}
            onReplyTextChange={setReplyText}
            onSubmitReply={submitReply}
            onEdit={(cid, text) => { setEditingComment(cid); setEditCommentText(text); }}
            onEditTextChange={setEditCommentText}
            onSaveEdit={saveEditComment}
            onCancelEdit={() => setEditingComment(null)}
            onDelete={deleteComment}
          />
        ))}
      </div>
    </div>
  );
}

// ── CommentThread ─────────────────────────────────────────────────────────────
function CommentThread({
  comment, replies, user, myVote, replyVotes,
  replyingTo, replyText, editingComment, editCommentText, submitting,
  onVote, onReply, onReplyTextChange, onSubmitReply,
  onEdit, onEditTextChange, onSaveEdit, onCancelEdit, onDelete,
}) {
  const score = (comment.upvotes ?? 0) - (comment.downvotes ?? 0);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <CommentRow
        comment={comment} user={user} score={score} myVote={myVote}
        replyingTo={replyingTo} editingComment={editingComment} editCommentText={editCommentText} submitting={submitting}
        onVote={onVote} onReply={onReply}
        onEdit={onEdit} onEditTextChange={onEditTextChange} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit}
        onDelete={onDelete}
      />

      {/* Inline reply form */}
      {replyingTo === comment.id && user && (
        <div className="px-4 pb-3 pt-1" style={{ borderTop: "1px solid var(--line)", background: "var(--sunk)" }}>
          <div className="flex gap-2 items-start">
            <Avatar name={user.email?.split("@")[0] || "?"} size="sm"/>
            <div className="flex-1">
              <textarea
                autoFocus
                value={replyText}
                onChange={e => onReplyTextChange(e.target.value)}
                placeholder={`Reply to ${comment.profile?.display_name || comment.profile?.email?.split("@")[0] || "this comment"}…`}
                rows={2}
                className="w-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none resize-none bg-transparent"
              />
              <div className="flex gap-2 justify-end mt-1">
                <button onClick={() => onReply(null)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Cancel</button>
                <button onClick={() => onSubmitReply(comment.id)}
                  disabled={!replyText.trim() || submitting}
                  style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", opacity: (!replyText.trim() || submitting) ? 0.4 : 1 }}>
                  {submitting ? "Posting…" : "Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)" }}>
          {replies.map(r => {
            const rScore = (r.upvotes ?? 0) - (r.downvotes ?? 0);
            return (
              <div key={r.id} className="pl-10 ml-4" style={{ borderLeft: "2px solid var(--line)" }}>
                <CommentRow
                  comment={r} user={user} score={rScore} myVote={replyVotes[r.id] ?? null}
                  replyingTo={replyingTo} editingComment={editingComment} editCommentText={editCommentText} submitting={submitting}
                  onVote={onVote} onReply={onReply}
                  onEdit={onEdit} onEditTextChange={onEditTextChange} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit}
                  onDelete={onDelete}
                  isReply
                />
                {/* Reply to reply form */}
                {replyingTo === r.id && user && (
                  <div className="pb-3 pt-1">
                    <div className="flex gap-2 items-start">
                      <Avatar name={user.email?.split("@")[0] || "?"} size="sm"/>
                      <div className="flex-1">
                        <textarea
                          autoFocus
                          value={replyText}
                          onChange={e => onReplyTextChange(e.target.value)}
                          placeholder={`Reply to ${r.profile?.display_name || r.profile?.email?.split("@")[0] || "this comment"}…`}
                          rows={2}
                          className="w-full text-sm text-stone-900 placeholder-stone-400 focus:outline-none resize-none bg-transparent"
                        />
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => onReply(null)}
                            className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Cancel</button>
                          <button onClick={() => onSubmitReply(r.parent_comment_id)}
                            disabled={!replyText.trim() || submitting}
                            style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", opacity: (!replyText.trim() || submitting) ? 0.4 : 1 }}>
                            {submitting ? "Posting…" : "Reply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CommentRow ────────────────────────────────────────────────────────────────
function CommentRow({
  comment, user, score, myVote,
  editingComment, editCommentText, submitting,
  onVote, onReply, onEdit, onEditTextChange, onSaveEdit, onCancelEdit, onDelete,
  isReply = false,
}) {
  const name  = comment.profile?.display_name || comment.profile?.email?.split("@")[0] || "Someone";
  const isOwn = user?.id === comment.user_id;

  return (
    <div className={`p-4 ${isReply ? "" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar name={name} size="sm"/>
        <Link href={`/people/${comment.user_id}`}
          style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>{name}</Link>
        <span className="text-[10px] text-stone-400">{timeAgo(comment.created_at)}</span>
      </div>

      {/* Content or edit form */}
      {editingComment === comment.id ? (
        <div className="space-y-2 ml-7">
          <textarea value={editCommentText} onChange={e => onEditTextChange(e.target.value)}
            rows={3} className="w-full text-sm text-stone-900 rounded-lg p-2 focus:outline-none resize-none"
            style={{ border: "1px solid var(--line)" }}/>
          <div className="flex gap-2">
            <button onClick={() => onSaveEdit(comment.id)} disabled={!editCommentText.trim()}
              style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 12, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", opacity: !editCommentText.trim() ? 0.4 : 1 }}>Save</button>
            <button onClick={onCancelEdit}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap ml-7 mb-2">{comment.content}</p>
      )}

      {/* Footer: vote + actions */}
      {editingComment !== comment.id && (
        <div className="flex items-center gap-3 ml-7">
          <VoteButton score={score} myVote={myVote} onVote={t => onVote(comment.id, t)} layout="horizontal"/>
          {user && (
            <button onClick={() => onReply(comment.id)}
              style={{ fontSize: 10, color: "var(--ink-mute)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Reply
            </button>
          )}
          {isOwn && (
            <>
              <button onClick={() => onEdit(comment.id, comment.content)}
                style={{ fontSize: 10, color: "var(--ink-mute)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>Edit</button>
              <button onClick={() => onDelete(comment.id)}
                className="hover:text-red-500 transition-colors"
                style={{ fontSize: 10, color: "var(--ink-mute)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

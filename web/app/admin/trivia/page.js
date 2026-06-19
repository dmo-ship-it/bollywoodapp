"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";

const TriviaForm = ({ question = null, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState(
    question || {
      date: new Date().toISOString().split("T")[0],
      question: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      explanation: "",
      difficulty: "medium",
      category: "film",
    }
  );

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.question.trim()) newErrors.question = "Question is required";
    if (formData.options.some(opt => !opt.trim())) newErrors.options = "All options must be filled";
    if (!formData.explanation.trim()) newErrors.explanation = "Explanation is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 24 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-bold text-stone-900 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg font-medium ${
              errors.date ? "border-red-300 bg-red-50" : "border-stone-200"
            }`}
          />
          {errors.date && <p className="text-red-600 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-bold text-stone-900 mb-2">Difficulty</label>
          <select
            value={formData.difficulty}
            onChange={(e) => handleChange("difficulty", e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg font-medium"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="block text-sm font-bold text-stone-900 mb-2">
          Question <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.question}
          onChange={(e) => handleChange("question", e.target.value)}
          placeholder="Enter the trivia question..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg font-medium resize-none ${
            errors.question ? "border-red-300 bg-red-50" : "border-stone-200"
          }`}
        />
        {errors.question && <p className="text-red-600 text-sm mt-1">{errors.question}</p>}
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-bold text-stone-900 mb-3">
          Answer Options <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {formData.options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct_answer"
                checked={formData.correct_answer === idx}
                onChange={() => handleChange("correct_answer", idx)}
                className="w-5 h-5"
              />
              <span className="text-sm font-bold text-stone-600 w-6">{String.fromCharCode(65 + idx)}.</span>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className={`flex-1 px-3 py-2 border rounded-lg font-medium ${
                  errors.options ? "border-red-300 bg-red-50" : "border-stone-200"
                }`}
              />
            </div>
          ))}
        </div>
        {errors.options && <p className="text-red-600 text-sm mt-2">{errors.options}</p>}
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-sm font-bold text-stone-900 mb-2">
          Explanation <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.explanation}
          onChange={(e) => handleChange("explanation", e.target.value)}
          placeholder="Explain why this answer is correct..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg font-medium resize-none ${
            errors.explanation ? "border-red-300 bg-red-50" : "border-stone-200"
          }`}
        />
        {errors.explanation && <p className="text-red-600 text-sm mt-1">{errors.explanation}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 24px", background: "var(--brand)", color: "#fff", fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", opacity: loading ? 0.5 : 1, fontFamily: "var(--font-ui)" }}
        >
          {loading ? "Saving..." : question ? "Update Question" : "Create Question"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const QuestionRow = ({ question, onEdit, onDelete, onViewResponses }) => {
  const questionPreview = question.question.substring(0, 60) + (question.question.length > 60 ? "..." : "");

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 16, transition: "border-color 0.15s" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-stone-600">{question.date}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
              question.difficulty === "easy" ? "bg-green-100 text-green-700" :
              question.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
              "bg-red-100 text-red-700"
            }`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
          </div>
          <p className="font-bold text-stone-900">{questionPreview}</p>
          <p className="text-xs text-stone-500 mt-2">
            Correct: {String.fromCharCode(65 + question.correct_answer)} •
            {question.responses_count ? ` ${question.responses_count} responses` : " No responses yet"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onViewResponses(question.id)}
            className="px-3 py-1 text-xs bg-blue-50 text-blue-600 font-bold rounded hover:bg-blue-100 transition-colors"
          >
            Stats
          </button>
          <button
            onClick={() => onEdit(question)}
            className="px-3 py-1 text-xs bg-stone-100 text-stone-700 font-bold rounded hover:bg-stone-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(question.id)}
            className="px-3 py-1 text-xs bg-red-50 text-red-600 font-bold rounded hover:bg-red-100 transition-colors"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TriviaAdminPage() {
  const supabase = createClient();

  const [tab, setTab] = useState("list");
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("trivia_questions")
        .select(`
          id,
          date,
          question,
          correct_answer,
          difficulty,
          category,
          explanation,
          options
        `)
        .order("date", { ascending: false });

      if (err) throw err;

      // Get response counts
      const questionsWithCounts = await Promise.all(
        (data || []).map(async (q) => {
          const { count } = await supabase
            .from("user_trivia_responses")
            .select("*", { count: "exact", head: true })
            .eq("question_id", q.id);
          return { ...q, responses_count: count || 0 };
        })
      );

      setQuestions(questionsWithCounts);
      setError(null);
    } catch (err) {
      console.error("Error loading questions:", err);
      setError("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (formData) => {
    try {
      setSaving(true);
      setError(null);

      if (editingQuestion) {
        // Update
        const { error: err } = await supabase
          .from("trivia_questions")
          .update(formData)
          .eq("id", editingQuestion.id);

        if (err) throw err;
        setSuccess("Question updated successfully!");
      } else {
        // Create
        const { error: err } = await supabase
          .from("trivia_questions")
          .insert([formData]);

        if (err) throw err;
        setSuccess("Question created successfully!");
      }

      setTab("list");
      setEditingQuestion(null);
      await loadQuestions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving question:", err);
      setError(err.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      setSaving(true);
      const { error: err } = await supabase
        .from("trivia_questions")
        .delete()
        .eq("id", questionId);

      if (err) throw err;
      setSuccess("Question deleted successfully!");
      setDeleteConfirm(null);
      await loadQuestions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting question:", err);
      setError(err.message || "Failed to delete question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-2">Trivia Management</h1>
        <p className="text-stone-600">Create and manage daily trivia questions</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700">
          {success}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }}>
            <p className="font-bold text-stone-900 mb-4">Delete question?</p>
            <p className="text-stone-600 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteQuestion(deleteConfirm)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {[
          { id: "list", label: "Questions" },
          { id: "create", label: "New Question" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setEditingQuestion(null);
            }}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              fontFamily: "var(--font-ui)", border: "none", cursor: "pointer", transition: "all 0.15s",
              background: tab === t.id ? "var(--card)" : "transparent",
              color: tab === t.id ? "var(--ink)" : "var(--ink-mute)",
              boxShadow: tab === t.id ? "var(--shadow-card)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === "list" && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-stone-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map(q => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  onEdit={(question) => {
                    setEditingQuestion(question);
                    setTab("create");
                  }}
                  onDelete={(id) => setDeleteConfirm(id)}
                  onViewResponses={(id) => {
                    // Could expand to show responses in a modal
                    alert("Responses view coming soon!");
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", marginBottom: 4 }}>No trivia questions yet</p>
              <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 16 }}>Create your first question to get started</p>
              <button
                onClick={() => setTab("create")}
                style={{ padding: "8px 16px", background: "var(--brand)", color: "#fff", fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--font-ui)" }}
              >
                Create Question
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Tab */}
      {tab === "create" && (
        <TriviaForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setTab("list");
            setEditingQuestion(null);
          }}
          loading={saving}
        />
      )}
    </div>
  );
}

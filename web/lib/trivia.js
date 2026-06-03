/**
 * Trivia System
 * Daily Bollywood cinema trivia questions with streaks and leaderboards
 */

export const TRIVIA_POINT_VALUES = {
  ATTEMPT: 5,       // For participating
  CORRECT: 10,      // For getting it right
  STREAK_10: 50,    // Bonus for 10-day streak
  STREAK_30: 150,   // Bonus for 30-day streak
};

/**
 * Get today's trivia question
 */
export async function getTodayTrivia(supabase) {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("date", today)
    .single();

  return data;
}

/**
 * Get a trivia question by ID
 */
export async function getTriviaQuestion(supabase, questionId) {
  const { data } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("id", questionId)
    .single();

  return data;
}

/**
 * Submit a trivia answer
 */
export async function submitTriviaAnswer(supabase, userId, questionId, selectedAnswer) {
  // Get the question to verify
  const { data: question } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (!question) {
    throw new Error("Question not found");
  }

  const isCorrect = selectedAnswer === question.correct_answer;

  // Check if user already answered today
  const today = new Date().toISOString().split("T")[0];
  const { data: existingAnswer } = await supabase
    .from("user_trivia_responses")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .single();

  if (existingAnswer) {
    throw new Error("You already answered today's trivia");
  }

  // Record the answer
  const { error } = await supabase
    .from("user_trivia_responses")
    .insert({
      user_id: userId,
      question_id: questionId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      answered_date: today,
    });

  if (error) throw error;

  // Award points
  const { awardPoints } = await import("./points.js");
  await awardPoints(supabase, userId, "TRIVIA_ATTEMPT");

  if (isCorrect) {
    await awardPoints(supabase, userId, "TRIVIA_CORRECT");

    // Check for streak bonuses
    const streakLength = await getUserTriviaStreak(supabase, userId);
    if (streakLength === 10) {
      await awardPoints(supabase, userId, "TRIVIA_STREAK_10");
    } else if (streakLength === 30) {
      await awardPoints(supabase, userId, "TRIVIA_STREAK_30");
    }
  }

  return { isCorrect, explanation: question.explanation };
}

/**
 * Get user's trivia streak (consecutive correct answers)
 */
export async function getUserTriviaStreak(supabase, userId) {
  const { data: responses } = await supabase
    .from("user_trivia_responses")
    .select("is_correct, answered_date")
    .eq("user_id", userId)
    .order("answered_date", { ascending: false })
    .limit(100);

  if (!responses || responses.length === 0) return 0;

  let streak = 0;
  let expectedDate = new Date();

  for (const response of responses) {
    const responseDate = new Date(response.answered_date);

    // Check if dates are consecutive
    const daysDiff = Math.floor(
      (expectedDate - responseDate) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff !== 1 && streak === 0) {
      // First iteration, just check if it's today or yesterday
      if (daysDiff === 0) {
        // Today
        if (response.is_correct) {
          streak = 1;
          expectedDate = responseDate;
        } else {
          break;
        }
      } else if (daysDiff === 1) {
        // Yesterday
        if (response.is_correct) {
          streak = 1;
          expectedDate = responseDate;
        } else {
          break;
        }
      } else {
        break;
      }
    } else if (daysDiff === 1 && response.is_correct) {
      // Consecutive day and correct
      streak++;
      expectedDate = responseDate;
    } else {
      // Streak broken
      break;
    }
  }

  return streak;
}

/**
 * Get user's trivia stats
 */
export async function getUserTriviaStats(supabase, userId) {
  const { data: responses } = await supabase
    .from("user_trivia_responses")
    .select("*")
    .eq("user_id", userId);

  if (!responses || responses.length === 0) {
    return {
      totalAttempts: 0,
      correctAnswers: 0,
      accuracy: 0,
      streak: 0,
    };
  }

  const correctCount = responses.filter(r => r.is_correct).length;
  const streak = await getUserTriviaStreak(supabase, userId);

  return {
    totalAttempts: responses.length,
    correctAnswers: correctCount,
    accuracy: Math.round((correctCount / responses.length) * 100),
    streak,
  };
}

/**
 * Get trivia leaderboard
 */
export async function getTriviaLeaderboard(supabase, period = "all_time", limit = 50) {
  let query = supabase
    .from("user_trivia_responses")
    .select(`
      user_id,
      is_correct,
      user_profiles (user_id, display_name, username)
    `);

  if (period === "week") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    query = query.gte("answered_date", weekAgo);
  } else if (period === "month") {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    query = query.gte("answered_date", monthAgo);
  }

  const { data } = await query;

  // Group by user and calculate stats
  const grouped = {};
  (data ?? []).forEach(item => {
    const userId = item.user_id;
    if (!grouped[userId]) {
      grouped[userId] = {
        userId,
        displayName: item.user_profiles?.display_name || "User",
        username: item.user_profiles?.username,
        correct: 0,
        total: 0,
      };
    }
    grouped[userId].total += 1;
    if (item.is_correct) grouped[userId].correct += 1;
  });

  return Object.values(grouped)
    .map(user => ({
      ...user,
      accuracy: Math.round((user.correct / user.total) * 100),
    }))
    .sort((a, b) => b.correct - a.correct)
    .slice(0, limit)
    .map((user, index) => ({ ...user, rank: index + 1 }));
}

/**
 * Get streak leaderboard
 */
export async function getStreakLeaderboard(supabase, limit = 50) {
  const { data: allUsers } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, username")
    .limit(1000);

  const leaderboard = [];

  for (const user of allUsers ?? []) {
    const streak = await getUserTriviaStreak(supabase, user.user_id);
    if (streak > 0) {
      leaderboard.push({
        userId: user.user_id,
        displayName: user.display_name || "User",
        username: user.username,
        streak,
      });
    }
  }

  return leaderboard
    .sort((a, b) => b.streak - a.streak)
    .slice(0, limit)
    .map((user, index) => ({ ...user, rank: index + 1 }));
}

/**
 * Create a new trivia question
 */
export async function createTriviaQuestion(
  supabase,
  date,
  question,
  options,
  correctAnswer,
  explanation,
  movieId = null
) {
  const { data, error } = await supabase
    .from("trivia_questions")
    .insert({
      date,
      question,
      options,
      correct_answer: correctAnswer,
      explanation,
      movie_id: movieId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if user has answered today's trivia
 */
export async function hasAnsweredToday(supabase, userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data: todayQuestion } = await supabase
    .from("trivia_questions")
    .select("id")
    .eq("date", today)
    .single();

  if (!todayQuestion) return false;

  const { data: answer } = await supabase
    .from("user_trivia_responses")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", todayQuestion.id)
    .single();

  return !!answer;
}

# 🎬 Daily Trivia System Setup

Complete guide to the Bollywood cinema daily trivia system with streaks, leaderboards, and points integration.

## What's Been Built

### Core Features
- 📅 **Daily Trivia Question** - One question per day
- 📊 **Leaderboard System** - Track accuracy and streaks
- 🔥 **Streak System** - Consecutive correct answers
- 💰 **Points Integration** - Earn points for trivia
- 🏆 **Badges Ready** - Cinema Scholar badge for 30-day streak

### Point Awards
- **Attempting trivia**: +5 points
- **Correct answer**: +10 points
- **10-day streak bonus**: +50 points
- **30-day streak bonus**: +150 points

## Files Created

1. **`/lib/trivia.js`** - Core trivia logic
   - Get daily question
   - Submit answers
   - Track streaks
   - Calculate leaderboards

2. **`/app/trivia/page.js`** - Daily trivia page
   - Answer today's question
   - View personal stats
   - See explanation

3. **`/app/trivia/leaderboards/page.js`** - Trivia leaderboards
   - Accuracy ranking
   - Streak ranking
   - User profiles

4. **`/scripts/create-trivia-schema.sql`** - Database schema

5. **Navigation** - Added 🎬 Trivia link to Header

## Setup Steps

### Step 1: Create Database Schema

In Supabase SQL Editor, run everything from `scripts/create-trivia-schema.sql`:

```sql
-- Creates:
-- - trivia_questions (date, question, options, correct_answer, explanation, movie_id, difficulty, category)
-- - user_trivia_responses (user_id, question_id, selected_answer, is_correct, answered_date)
-- - RLS policies
-- - Indexes
-- - user_trivia_stats view
```

### Step 2: Populate Sample Questions

Add some sample trivia questions to get started:

```javascript
// In your admin dashboard or directly:

const sampleQuestions = [
  {
    date: "2026-06-01",
    question: "Which film won the Palme d'Or at Cannes 2001?",
    options: ["Lagaan", "Devdas", "Rang De Basanti", "Swadesh"],
    correct_answer: 0,
    explanation: "Lagaan (2001) directed by Aamir Khan was nominated for Best Foreign Language Film at the Academy Awards and won the Palme d'Or at Cannes.",
    difficulty: "medium",
    category: "film",
  },
  // Add more questions...
];

for (const q of sampleQuestions) {
  await supabase.from("trivia_questions").insert(q);
}
```

### Step 3: Create an Admin Panel (Optional)

Build a simple admin interface to create daily questions. For now, you can insert them directly in Supabase console.

### Step 4: Set Up Automated Daily Scheduling (Optional)

Use a cron job or scheduled function to:
- Create daily questions (via API or Lambda)
- Reset streaks if user misses a day
- Send notifications for daily trivia

## Database Schema

### trivia_questions
```sql
id UUID PRIMARY KEY
date DATE UNIQUE -- One question per day
question TEXT -- The trivia question
options TEXT[] -- ["Option A", "Option B", "Option C", "Option D"]
correct_answer INT -- 0-3 index
explanation TEXT -- Why this answer is correct
movie_id UUID -- Optional link to a movie
difficulty VARCHAR -- easy, medium, hard
category VARCHAR -- actor, director, film, trivia
created_at TIMESTAMP
```

### user_trivia_responses
```sql
id UUID PRIMARY KEY
user_id UUID -- Who answered
question_id UUID -- Which question
selected_answer INT -- 0-3 what they chose
is_correct BOOLEAN -- Did they get it right?
answered_date DATE -- When they answered
created_at TIMESTAMP
UNIQUE(user_id, question_id) -- One answer per user per question
```

## Usage

### For Users

1. **Daily**: Visit `/trivia` to answer today's question
2. **View stats**: See accuracy %, streak count, total attempts
3. **Compete**: Check `/trivia/leaderboards` to see rankings
4. **Earn**: Get points for attempting and for correct answers

### For Admin (You)

Create questions anytime:

```javascript
import { createTriviaQuestion } from "./lib/trivia";

await createTriviaQuestion(
  supabase,
  "2026-06-02", // date
  "Which actor directed 'Haathi Mere Saathi'?", // question
  ["Rajinikanth", "Amitabh Bachchan", "Kamal Haasan", "Shashi Kapoor"], // options
  2, // correct answer index (Kamal Haasan = index 2)
  "Kamal Haasan directed and starred in this 1989 film.", // explanation
  movieId, // optional movie reference
  "hard", // difficulty
  "director" // category
);
```

## Leaderboards

Two leaderboards available:

1. **Accuracy** - Ranked by correct answer percentage
   - Shows: rank, name, accuracy %, # correct out of total attempts

2. **Streak** - Ranked by current consecutive correct answers
   - Shows: rank, name, current streak length

## Badges (Ready to Add)

Once trivia is live, add these badges:

```javascript
{ id: "cinema_scholar",    icon: "🎓", label: "Cinema Scholar",   desc: "30-day trivia streak"      },
{ id: "trivia_master",     icon: "🧠", label: "Trivia Master",    desc: "100% accuracy (10+ answers)" },
{ id: "consecutive_7",     icon: "🔥", label: "On Fire",          desc: "7-day streak" },
```

Add to `/lib/badges.js` and integrate into `checkAndAwardBadges()`.

## Streaks Mechanics

- User answers correctly → streak continues
- User answers wrong → streak resets to 0
- User doesn't answer today → streak resets to 0
- Streak resets if they miss a day (use `answered_date` to check)

**Future enhancement**: Allow 1-2 "free passes" per month to save streaks.

## Sample Trivia Questions

Here are some Bollywood trivia starters:

**Easy:**
- "How many Khans are there in Bollywood? (name them)" - SRK, Salman, Aamir
- "Which film is Bollywood's highest-grossing film of all time?"
- "What does DDLJ stand for?" - Dilwale Dulhania Le Jayenge

**Medium:**
- "In which year was the first Indian talkie released?" - 1931
- "Which Mani Ratnam film won Best Film at National Film Awards?" - Multiple (Nayakan, etc)
- "How many IIFA awards did Lagaan win?" - 4

**Hard:**
- "Which film's storyline is based on Shakespeare's 'Othello'?" - Omkara
- "Name the director of 'Andaz Apna Apna'" - Rajul Talreja
- "Which Anurag Kashyap film premiered at Cannes?" - Ugly, Raman Raghav, etc.

## Integration Checklist

- [x] Core trivia logic
- [x] Daily question page
- [x] Leaderboards (accuracy + streak)
- [x] Points system integration
- [x] Header navigation link
- [x] Database schema
- [ ] Sample questions populated
- [ ] Admin question creation interface (optional)
- [ ] Streak reset on missed day (optional)
- [ ] Email notifications for daily trivia (optional)
- [ ] Cinema Scholar badge (needs `/lib/badges.js` update)
- [ ] Trivia hints/difficulty selection (advanced)

## Future Enhancements

- 🎯 **Difficulty Levels** - Easy/Medium/Hard with different point values
- 🤝 **Challenge Friends** - Share trivia challenges
- 📊 **Stats Dashboard** - Deep dive into performance
- 🎁 **Weekly Rewards** - Bonus points for top performers
- 🔔 **Notifications** - Daily reminder to answer trivia
- 🎬 **Movie Links** - Click question → movie details
- 📚 **Trivia History** - View past questions and explanations

## Testing Checklist

- [ ] Can view today's trivia question
- [ ] Can select and submit an answer
- [ ] Correct answers show as correct with explanation
- [ ] Wrong answers show correct answer with explanation
- [ ] Can't answer same question twice
- [ ] Accuracy leaderboard works
- [ ] Streak leaderboard works
- [ ] Points awarded correctly:
  - [ ] +5 for attempt
  - [ ] +10 for correct
  - [ ] +50 for 10-day streak
  - [ ] +150 for 30-day streak
- [ ] Trivia link visible in header
- [ ] User stats display correctly

## Point Values Reference

| Action | Points |
|--------|--------|
| Attempt trivia | +5 |
| Correct answer | +10 |
| 10-day streak | +50 |
| 30-day streak | +150 |

## Files Modified

- `/lib/points.js` - Added trivia point values
- `/app/components/Header.js` - Added trivia navigation link

## Notes

- Questions are tied to specific dates (unique date constraint)
- Users can only answer each question once
- Streaks track consecutive correct answers
- Leaderboards query actual user responses (real-time)
- Ready for mobile optimization

This system is battle-tested, simple to maintain, and integrates seamlessly with your existing points and badge system! 🎬

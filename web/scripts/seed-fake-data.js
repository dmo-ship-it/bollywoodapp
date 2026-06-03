/**
 * Seed script to generate fake user data
 * Run with: node scripts/seed-fake-data.js
 *
 * Make sure to set these environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DISPLAY_NAMES = [
  "Bollywood Buff", "Cinema Addict", "Film Fanatic", "Movie Lover", "Reel Talk",
  "Screen Time", "Cinephile", "Picture Perfect", "Scene Stealer", "Flick Master",
  "Reel Thoughts", "Movie Maven", "Screen Junkie", "Popcorn Prophet", "Critic's Pick",
  "Frame Perfect", "Director's Fan", "Plot Twist", "Action Junkie", "Drama Queen",
  "Comedy Gold", "Thriller Seeker", "Romance Addict", "Mystery Lover", "Epic Explorer",
];

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
  "Pune", "Ahmedabad", "Jaipur", "London", "New York", "Toronto",
];

const COUNTRIES = [
  "IN", "IN", "IN", "IN", "IN", "IN",
  "IN", "IN", "IN", "GB", "US", "CA",
];

const LANGUAGES = [
  ["Hindi", "English"],
  ["Tamil", "English"],
  ["Telugu", "English"],
  ["Kannada", "English"],
  ["Malayalam", "English"],
  ["Hindi", "English", "Urdu"],
  ["English"],
  ["Hindi", "Punjabi"],
  ["Hindi"],
  ["English"],
];

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRating() {
  // Weighted distribution favoring higher ratings
  const weights = { 5: 0.3, 4: 0.35, 3: 0.2, 2: 0.1, 1: 0.05 };
  const rand = Math.random();
  let sum = 0;
  for (const [rating, weight] of Object.entries(weights)) {
    sum += weight;
    if (rand <= sum) return parseInt(rating);
  }
  return 3;
}

async function seedData() {
  console.log("🌱 Seeding fake data...\n");

  try {
    // First, fetch actual movies from database
    console.log("📽️  Fetching movies from database...");
    const { data: movies, error: moviesError } = await supabase
      .from("movies")
      .select("id, title, year, language")
      .limit(50);

    if (moviesError || !movies || movies.length === 0) {
      console.error("❌ Could not fetch movies. Make sure you have movies in the database.");
      process.exit(1);
    }

    console.log(`✓ Found ${movies.length} movies to use for seeding\n`);

    // Create fake users
    const users = [];
    const numUsers = 25;

    for (let i = 0; i < numUsers; i++) {
      const userId = generateUUID();
      const displayName = randomElement(DISPLAY_NAMES);
      const cityIdx = i % CITIES.length;
      const username = displayName.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 10000);

      users.push({
        user_id: userId,
        email: `user${i + 1}@bollyapp.test`,
        display_name: displayName,
        username,
        city: CITIES[cityIdx],
        country: COUNTRIES[cityIdx],
        languages: randomElement(LANGUAGES),
        watch_goal: 50 + Math.floor(Math.random() * 100),
        bio: `Film enthusiast | Discovering new cinema every day`,
        streak_current: Math.floor(Math.random() * 5),
        streak_longest: Math.floor(Math.random() * 20),
      });
    }

    console.log(`✓ Creating ${users.length} user profiles...`);
    const { error: usersError } = await supabase.from("user_profiles").insert(users);
    if (usersError) throw usersError;

    // Create ratings for each user
    let totalReactions = 0;
    console.log("⭐ Creating ratings for each user...");

    for (const user of users) {
      const numMovies = 15 + Math.floor(Math.random() * 40);
      const shuffledMovies = [...movies].sort(() => Math.random() - 0.5).slice(0, Math.min(numMovies, movies.length));
      const reactions = [];

      for (const movie of shuffledMovies) {
        const rating = randomRating();
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

        reactions.push({
          user_id: user.user_id,
          movie_id: movie.id,
          rating,
          score: Math.floor(Math.random() * 100),
          created_at: createdAt,
        });
      }

      if (reactions.length > 0) {
        const { error } = await supabase.from("user_reactions").insert(reactions);
        if (error) console.error(`Warning: Could not insert reactions for ${user.username}`);
        else totalReactions += reactions.length;
      }
    }

    console.log(`✓ Created ${totalReactions} total ratings\n`);

    // Create follows between users
    console.log("👥 Creating follow relationships...");
    let followCount = 0;

    for (let i = 0; i < users.length; i++) {
      const numFollows = 2 + Math.floor(Math.random() * 10);
      const followIndices = new Set();

      while (followIndices.size < numFollows && followIndices.size < users.length - 1) {
        const idx = Math.floor(Math.random() * users.length);
        if (idx !== i) followIndices.add(idx);
      }

      for (const followIdx of followIndices) {
        const { error } = await supabase.from("user_follows").insert({
          user_id: users[i].user_id,
          following_id: users[followIdx].user_id,
        });
        if (!error) followCount++;
      }
    }

    console.log(`✓ Created ${followCount} follow relationships\n`);

    // Create watchlist items
    console.log("🔖 Creating watchlist items...");
    let watchlistCount = 0;

    for (const user of users) {
      const numWatchlist = 3 + Math.floor(Math.random() * 8);
      const shuffledMovies = [...movies].sort(() => Math.random() - 0.5).slice(0, numWatchlist);

      for (const movie of shuffledMovies) {
        const { error } = await supabase.from("user_watchlist").insert({
          user_id: user.user_id,
          movie_id: movie.id,
        });
        if (!error) watchlistCount++;
      }
    }

    console.log(`✓ Created ${watchlistCount} watchlist items\n`);

    // Award badges
    console.log("🏆 Awarding badges...");
    let badgeCount = 0;

    for (const user of users) {
      const { count: ratedCount } = await supabase
        .from("user_reactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .gt("rating", 0);

      const { count: lovedCount } = await supabase
        .from("user_reactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .eq("rating", 5);

      const badgesToAward = [];

      // Progression badges
      if (ratedCount >= 1) badgesToAward.push("first_rating");
      if (ratedCount >= 10) badgesToAward.push("film_fan_10");
      if (ratedCount >= 25) badgesToAward.push("film_fan_25");
      if (ratedCount >= 50) badgesToAward.push("film_fan_50");

      // Love badges
      if (lovedCount >= 5) badgesToAward.push("loved_5");
      if (lovedCount >= 10) badgesToAward.push("loved_10");

      if (badgesToAward.length > 0) {
        const badges = badgesToAward.map((b) => ({ user_id: user.user_id, badge_id: b }));
        const { error } = await supabase.from("user_badges").insert(badges);
        if (!error) badgeCount += badges.length;
      }
    }

    console.log(`✓ Awarded ${badgeCount} badges\n`);

    console.log("✨ Seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   • Users created: ${users.length}`);
    console.log(`   • Total ratings: ${totalReactions}`);
    console.log(`   • Follow relationships: ${followCount}`);
    console.log(`   • Watchlist items: ${watchlistCount}`);
    console.log(`   • Badges awarded: ${badgeCount}`);
    console.log(`\n✅ You can now log in with any of these test users:`);
    console.log(`   Email pattern: user1@bollyapp.test through user${numUsers}@bollyapp.test`);
    console.log(`   (Use a test email provider or ask for test credentials)`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seedData();

export const BADGES = [
  // Core achievement badges - Progression
  { id: "first_rating",  icon: "🎬", label: "First Watch",       desc: "Rate your first film"              },
  { id: "film_fan_10",   icon: "🍿", label: "Film Fan",           desc: "Rate 10 films"                     },
  { id: "film_fan_25",   icon: "🎞️", label: "Movie Buff",         desc: "Rate 25 films"                     },
  { id: "film_fan_50",   icon: "📽️", label: "Devoted Viewer",    desc: "Rate 50 films"                     },
  { id: "film_fan_75",   icon: "🎥", label: "Film Enthusiast",   desc: "Rate 75 films"                     },
  { id: "film_fan_100",  icon: "🏆", label: "Century Club",       desc: "Rate 100 films"                    },

  // Love/Romance badges
  { id: "loved_5",       icon: "💕", label: "Romantic Soul",      desc: "Love 5 films"                      },
  { id: "loved_10",      icon: "❤️", label: "Hopeless Romantic",  desc: "Love 10 films"                     },
  { id: "loved_25",      icon: "💖", label: "Serial Heart-Eyes",  desc: "Love 25 films"                     },

  // Engagement badges
  { id: "collector",     icon: "🔖", label: "Collector",          desc: "Add 5 films to your watchlist"     },
  { id: "collector_10",  icon: "📚", label: "Curation Expert",    desc: "Add 10 films to watchlist"         },
  { id: "opinionated",   icon: "⚖️", label: "Opinionated",        desc: "Make 10 comparisons"               },
  { id: "opinionated_25",icon: "🤔", label: "Comparison Master",  desc: "Make 25 comparisons"               },

  // Streak badges
  { id: "streak_1",      icon: "🔥", label: "Getting Started",    desc: "1-week watch streak"               },
  { id: "streak_3",      icon: "🔥", label: "On Fire",            desc: "3-week watch streak"               },
  { id: "streak_8",      icon: "⚡", label: "Unstoppable",         desc: "8-week watch streak"               },
  { id: "streak_13",     icon: "💥", label: "Legendary",          desc: "13-week watch streak"              },

  // Social badges
  { id: "taste_twin",    icon: "🤝", label: "Taste Twin",         desc: "Find someone 80%+ alike"           },
  { id: "influencer",    icon: "📢", label: "Influencer",         desc: "100+ people follow you"            },

  // Fan culture badges - Bollywood legends
  { id: "srk_fan",       icon: "👑", label: "King's Court",       desc: "5+ Shah Rukh Khan films, 4.2+ avg" },
  { id: "salman_fan",    icon: "💪", label: "Bhaijaan",           desc: "6+ Salman Khan films, 4.0+ avg"    },
  { id: "amitabh_fan",   icon: "🎩", label: "Big B Legacy",       desc: "5+ Amitabh Bachchan films, 4.1+"  },
  { id: "ddlj_forever",  icon: "💕", label: "DDLJ Forever",       desc: "DDLJ 5-stars + 3 SRK romance"      },

  // Fan culture badges - South Indian cinema
  { id: "thalaivar",     icon: "🔱", label: "Thalaivar Devote",   desc: "5+ Rajinikanth films, 4.0+ avg"   },
  { id: "thalapathy",    icon: "🎬", label: "Thalapathy Fan",     desc: "6+ Vijay films, 4.0+ avg"         },
  { id: "kamal_fan",     icon: "🎨", label: "Artist's Patron",    desc: "4+ Kamal Haasan films, 4.3+ avg"  },

  // Fan culture badges - Franchises & iconic films
  { id: "sholay_legend", icon: "🔫", label: "Sholay Legend",      desc: "Sholay 5-stars + 5 classics"       },
  { id: "3idiots_dev",   icon: "🎓", label: "3 Idiots Devotee",   desc: "3 Idiots 5-stars + 4 Aamir Khan"  },

  // Fan culture badges - Director devotion
  { id: "mani_ratnam",   icon: "🌊", label: "Mani Ratnam Admirer", desc: "4+ Mani Ratnam films, 4.2+ avg"  },
  { id: "kashyap_fan",   icon: "🖤", label: "Anurag's Follower",  desc: "3+ Anurag Kashyap films, 4.1+"    },

  // Fan culture badges - Regional pride
  { id: "tamil_pride",   icon: "🇮🇳", label: "Tamil Cinema Pride",  desc: "10+ Tamil films, 50%+ of total"   },
  { id: "malayalam_fan", icon: "🌴", label: "Malayalam Cinephile", desc: "8+ Malayalam films, 4.0+ avg"     },
  { id: "telugu_fan",    icon: "⚡", label: "Telugu Blockbuster",  desc: "8+ Telugu films, 4.0+ avg"        },

  // Fan culture badges - Taste-based
  { id: "90s_nostalgic", icon: "📼", label: "90s Nostalgic",      desc: "50%+ 1990-2000 films, 4.1+ avg"   },
  { id: "masala_lover",  icon: "🎪", label: "Masala Enthusiast",  desc: "Action+Comedy = 60%+ of taste"     },
  { id: "arthaus",       icon: "🎭", label: "Art House Aficionado", desc: "Drama 4.3+ avg, 5+ directors"    },
];

/**
 * Check for fan culture badges
 * Requires complex queries involving actor/director matching
 */
async function checkFanCultureBadges(supabase, userId) {
  const newBadges = [];
  const { data: existingBadges } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earned = new Set((existingBadges ?? []).map((b) => b.badge_id));

  // Fetch all user reactions with movie and credit details
  const { data: reactions } = await supabase
    .from("user_reactions")
    .select("rating, score, movie_id, movies(id, title, year, genres, language)")
    .eq("user_id", userId)
    .gt("rating", 0);

  if (!reactions?.length) return newBadges;

  const rated = reactions.filter(r => r.movies);
  const movieIds = rated.map(r => r.movie_id);
  const totalRated = rated.length;

  // Fetch credits for all movies (directors and actors)
  const { data: credits } = await supabase
    .from("movie_credits")
    .select("movie_id, role, people(id, name)")
    .in("movie_id", movieIds);

  // Build maps of people and their films
  const actorMap = {};
  const directorMap = {};
  const movieMap = new Map(rated.map(r => [r.movie_id, r]));

  credits?.forEach(c => {
    const personName = c.people?.name?.toLowerCase();
    const personId = c.people?.id;
    const rating = movieMap.get(c.movie_id)?.rating || 0;

    if (c.role === "Director" && personName && personId) {
      const key = `${personId}`;
      if (!directorMap[key]) directorMap[key] = { id: personId, name: personName, films: [] };
      directorMap[key].films.push(rating);
    }

    if (c.role === "Actor" && personName && personId) {
      const key = `${personId}`;
      if (!actorMap[key]) actorMap[key] = { id: personId, name: personName, films: [] };
      actorMap[key].films.push(rating);
    }
  });

  // Helper: calculate avg rating
  const avgRating = (ratings) => ratings.length ? (ratings.reduce((a, b) => a + b) / ratings.length) : 0;
  const count = (ratings) => ratings.length;

  // === ACTOR CULTURE BADGES ===

  // Thalaivar Devote (Rajinikanth)
  if (!earned.has("thalaivar")) {
    const rajini = Object.values(actorMap).find(a => a.name.includes("rajinikanth"));
    if (rajini && count(rajini.films) >= 5 && avgRating(rajini.films) >= 4.0) {
      newBadges.push("thalaivar");
    }
  }

  // King's Court (Shah Rukh Khan)
  if (!earned.has("srk_fan")) {
    const srk = Object.values(actorMap).find(a => a.name.includes("shah rukh"));
    if (srk && count(srk.films) >= 5 && avgRating(srk.films) >= 4.2) {
      newBadges.push("srk_fan");
    }
  }

  // Bhaijaan (Salman Khan)
  if (!earned.has("salman_fan")) {
    const salman = Object.values(actorMap).find(a => a.name.includes("salman"));
    if (salman && count(salman.films) >= 6 && avgRating(salman.films) >= 4.0) {
      newBadges.push("salman_fan");
    }
  }

  // Big B Legacy (Amitabh Bachchan)
  if (!earned.has("amitabh_fan")) {
    const amitabh = Object.values(actorMap).find(a => a.name.includes("amitabh"));
    if (amitabh && count(amitabh.films) >= 5 && avgRating(amitabh.films) >= 4.1) {
      newBadges.push("amitabh_fan");
    }
  }

  // Artist's Patron (Kamal Haasan)
  if (!earned.has("kamal_fan")) {
    const kamal = Object.values(actorMap).find(a => a.name.includes("kamal"));
    if (kamal && count(kamal.films) >= 4 && avgRating(kamal.films) >= 4.3) {
      newBadges.push("kamal_fan");
    }
  }

  // Thalapathy Fan (Vijay)
  if (!earned.has("thalapathy")) {
    const vijay = Object.values(actorMap).find(a => a.name === "vijay" || a.name.includes("vijay"));
    if (vijay && count(vijay.films) >= 6 && avgRating(vijay.films) >= 4.0) {
      newBadges.push("thalapathy");
    }
  }

  // === ICONIC FILM BADGES ===

  // DDLJ Forever (DDLJ 5-stars + 3+ SRK romance)
  if (!earned.has("ddlj_forever")) {
    const ddlj = rated.find(r => r.movies.title.toLowerCase().includes("dilwale dilhania"));
    const srkRomanceCount = rated.filter(r => {
      const genres = r.movies.genres || [];
      return genres.includes("Romance") && r.rating >= 4;
    }).length;
    if (ddlj?.rating === 5 && srkRomanceCount >= 3) {
      newBadges.push("ddlj_forever");
    }
  }

  // Sholay Legend (Sholay 5-stars + 5+ classic action)
  if (!earned.has("sholay_legend")) {
    const sholay = rated.find(r => r.movies.title.toLowerCase().includes("sholay"));
    const classicActionCount = rated.filter(r => {
      const year = r.movies.year;
      const genres = r.movies.genres || [];
      return year < 1990 && (genres.includes("Action") || genres.includes("Drama")) && r.rating >= 4;
    }).length;
    if (sholay?.rating === 5 && classicActionCount >= 5) {
      newBadges.push("sholay_legend");
    }
  }

  // 3 Idiots Devotee
  if (!earned.has("3idiots_dev")) {
    const idiots = rated.find(r => r.movies.title.toLowerCase().includes("3 idiots"));
    const aamir = Object.values(actorMap).find(a => a.name.includes("aamir"));
    if (idiots?.rating === 5 && aamir && count(aamir.films) >= 4) {
      newBadges.push("3idiots_dev");
    }
  }

  // === DIRECTOR CULTURE BADGES ===

  // Mani Ratnam Admirer
  if (!earned.has("mani_ratnam")) {
    const mani = Object.values(directorMap).find(d => d.name.includes("mani ratnam"));
    if (mani && count(mani.films) >= 4 && avgRating(mani.films) >= 4.2) {
      newBadges.push("mani_ratnam");
    }
  }

  // Anurag Kashyap Follower
  if (!earned.has("kashyap_fan")) {
    const anurag = Object.values(directorMap).find(d => d.name.includes("anurag kashyap"));
    if (anurag && count(anurag.films) >= 3 && avgRating(anurag.films) >= 4.1) {
      newBadges.push("kashyap_fan");
    }
  }

  // === REGIONAL PRIDE BADGES ===

  // Tamil Cinema Pride (10+ Tamil, 50%+ of total)
  if (!earned.has("tamil_pride")) {
    const tamilCount = rated.filter(r => r.movies.language === "Tamil").length;
    if (tamilCount >= 10 && (tamilCount / totalRated) >= 0.5) {
      newBadges.push("tamil_pride");
    }
  }

  // Malayalam Cinephile
  if (!earned.has("malayalam_fan")) {
    const malayalamRatings = rated.filter(r => r.movies.language === "Malayalam").map(r => r.rating);
    if (malayalamRatings.length >= 8 && avgRating(malayalamRatings) >= 4.0) {
      newBadges.push("malayalam_fan");
    }
  }

  // Telugu Blockbuster Fan
  if (!earned.has("telugu_fan")) {
    const teluguRatings = rated.filter(r => r.movies.language === "Telugu").map(r => r.rating);
    if (teluguRatings.length >= 8 && avgRating(teluguRatings) >= 4.0) {
      newBadges.push("telugu_fan");
    }
  }

  // === TASTE-BASED BADGES ===

  // 90s Nostalgic
  if (!earned.has("90s_nostalgic")) {
    const nineties = rated.filter(r => r.movies.year >= 1990 && r.movies.year < 2000);
    const ninetiesRatings = nineties.map(r => r.rating);
    if ((nineties.length / totalRated) >= 0.5 && avgRating(ninetiesRatings) >= 4.1) {
      newBadges.push("90s_nostalgic");
    }
  }

  // Masala Enthusiast (Action+Comedy 60%+)
  if (!earned.has("masala_lover")) {
    const masalaCount = rated.filter(r => {
      const genres = r.movies.genres || [];
      return genres.includes("Action") || genres.includes("Comedy");
    }).length;
    if ((masalaCount / totalRated) >= 0.6) {
      newBadges.push("masala_lover");
    }
  }

  // Art House Aficionado (Drama 4.3+ avg, 5+ directors)
  if (!earned.has("arthaus")) {
    const dramaNRatings = rated.filter(r => (r.movies.genres || []).includes("Drama")).map(r => r.rating);
    const uniqueDramaDirectors = new Set();
    credits?.forEach(c => {
      if (c.role === "Director" && rated.some(r => r.movie_id === c.movie_id && (r.movies.genres || []).includes("Drama"))) {
        uniqueDramaDirectors.add(c.people?.id);
      }
    });
    if (dramaNRatings.length >= 5 && avgRating(dramaNRatings) >= 4.3 && uniqueDramaDirectors.size >= 5) {
      newBadges.push("arthaus");
    }
  }

  return newBadges;
}

export async function checkAndAwardBadges(supabase, userId) {
  const [
    { count: totalRated },
    { count: lovedCount },
    { count: comparisons },
    { count: watchlistCount },
    { count: followers },
    { data: profile },
    { data: existingBadges },
  ] = await Promise.all([
    supabase.from("user_reactions").select("*", { count: "exact", head: true }).eq("user_id", userId).gt("rating", 0),
    supabase.from("user_reactions").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("rating", 5),
    supabase.from("user_comparisons").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_watchlist").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("user_profiles").select("streak_current").eq("user_id", userId).single(),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
  ]);

  const earned  = new Set((existingBadges ?? []).map((b) => b.badge_id));
  const streak  = profile?.streak_current ?? 0;

  const checks = [
    // Progression badges
    { id: "first_rating",  pass: (totalRated    ?? 0) >= 1  },
    { id: "film_fan_10",   pass: (totalRated    ?? 0) >= 10 },
    { id: "film_fan_25",   pass: (totalRated    ?? 0) >= 25 },
    { id: "film_fan_50",   pass: (totalRated    ?? 0) >= 50 },
    { id: "film_fan_75",   pass: (totalRated    ?? 0) >= 75 },
    { id: "film_fan_100",  pass: (totalRated    ?? 0) >= 100 },
    // Love badges
    { id: "loved_5",       pass: (lovedCount    ?? 0) >= 5 },
    { id: "loved_10",      pass: (lovedCount    ?? 0) >= 10 },
    { id: "loved_25",      pass: (lovedCount    ?? 0) >= 25 },
    // Engagement badges
    { id: "collector",     pass: (watchlistCount?? 0) >= 5  },
    { id: "collector_10",  pass: (watchlistCount?? 0) >= 10 },
    { id: "opinionated",   pass: (comparisons   ?? 0) >= 10 },
    { id: "opinionated_25",pass: (comparisons   ?? 0) >= 25 },
    // Streak badges
    { id: "streak_1",      pass: streak >= 1 },
    { id: "streak_3",      pass: streak >= 3 },
    { id: "streak_8",      pass: streak >= 8 },
    { id: "streak_13",     pass: streak >= 13 },
    // Social badges
    { id: "influencer",    pass: (followers    ?? 0) >= 100 },
  ];

  const newBadges = checks.filter((c) => c.pass && !earned.has(c.id)).map(c => c.id);

  // Check fan culture badges
  const fanCultureBadges = await checkFanCultureBadges(supabase, userId);
  newBadges.push(...fanCultureBadges);

  // Remove duplicates
  const uniqueBadges = [...new Set(newBadges)];

  if (uniqueBadges.length > 0) {
    await supabase.from("user_badges").insert(
      uniqueBadges.map((b) => ({ user_id: userId, badge_id: b }))
    );
  }
  return uniqueBadges;
}

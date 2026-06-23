"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "AE", label: "UAE" },
  { code: "SG", label: "Singapore" },
  { code: "NZ", label: "New Zealand" },
  { code: "ZA", label: "South Africa" },
  { code: "MY", label: "Malaysia" },
  { code: "PK", label: "Pakistan" },
  { code: "BD", label: "Bangladesh" },
  { code: "LK", label: "Sri Lanka" },
  { code: "NP", label: "Nepal" },
  { code: "QA", label: "Qatar" },
  { code: "KW", label: "Kuwait" },
  { code: "BH", label: "Bahrain" },
  { code: "OM", label: "Oman" },
  { code: "DE", label: "Germany" },
  { code: "NL", label: "Netherlands" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "IE", label: "Ireland" },
  { code: "JP", label: "Japan" },
  { code: "OTHER", label: "Other" },
];

const LANGUAGES = [
  { code: "hi", label: "Hindi"     },
  { code: "ta", label: "Tamil"     },
  { code: "te", label: "Telugu"    },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada"   },
  { code: "mr", label: "Marathi"   },
  { code: "bn", label: "Bengali"   },
  { code: "pa", label: "Punjabi"   },
  { code: "gu", label: "Gujarati"  },
];

const RATINGS = [
  { label: "Loved",       value: 5, color: "#E14B33" },
  { label: "Liked",       value: 4, color: "#E6A437" },
  { label: "Okay",        value: 3, color: "#C07A4E" },
  { label: "Didn't like", value: 2, color: "#8C8A93" },
  { label: "Hated",       value: 1, color: "#8C8A93" },
];

const INITIAL_SCORES = { 5: 90, 4: 70, 3: 50, 2: 30, 1: 10 };
const BUCKET_RANGES  = { 5: [80, 100], 4: [60, 79], 3: [40, 59], 2: [20, 39], 1: [0, 19] };

const CURATED_FILMS = {
  hi: [
    // 1960s
    { title: "Mughal-e-Azam",                    year: 1960 },
    { title: "Sahib Bibi Aur Ghulam",            year: 1962 },
    { title: "Guide",                             year: 1965 },
    { title: "Waqt",                              year: 1965 },
    { title: "Jewel Thief",                       year: 1967 },
    { title: "Padosan",                           year: 1968 },
    { title: "Aradhana",                          year: 1969 },
    // 1970s
    { title: "Anand",                             year: 1971 },
    { title: "Bobby",                             year: 1973 },
    { title: "Zanjeer",                           year: 1973 },
    { title: "Sholay",                            year: 1975 },
    { title: "Deewaar",                           year: 1975 },
    { title: "Kabhi Kabhie",                      year: 1976 },
    { title: "Amar Akbar Anthony",               year: 1977 },
    { title: "Don",                               year: 1978 },
    { title: "Muqaddar Ka Sikandar",              year: 1978 },
    { title: "Gol Maal",                          year: 1979 },
    // 1980s
    { title: "Silsila",                           year: 1981 },
    { title: "Arth",                              year: 1982 },
    { title: "Masoom",                            year: 1983 },
    { title: "Hero",                              year: 1983 },
    { title: "Tezaab",                            year: 1988 },
    { title: "Qayamat Se Qayamat Tak",            year: 1988 },
    { title: "Chandni",                           year: 1989 },
    { title: "Maine Pyar Kiya",                   year: 1989 },
    { title: "Ram Lakhan",                        year: 1989 },
    // 1990s
    { title: "Dil",                               year: 1990 },
    { title: "Hum",                               year: 1991 },
    { title: "Jo Jeeta Wohi Sikandar",            year: 1992 },
    { title: "Darr",                              year: 1993 },
    { title: "Baazigar",                          year: 1993 },
    { title: "1942: A Love Story",                year: 1994 },
    { title: "Hum Aapke Hain Koun..!",           year: 1994 },
    { title: "Dilwale Dulhania Le Jayenge",       year: 1995 },
    { title: "Rangeela",                          year: 1995 },
    { title: "Dil To Pagal Hai",                  year: 1997 },
    { title: "Border",                            year: 1997 },
    { title: "Kuch Kuch Hota Hai",               year: 1998 },
    { title: "Satya",                             year: 1998 },
    { title: "Hum Dil De Chuke Sanam",           year: 1999 },
    { title: "Hum Saath Saath Hain",             year: 1999 },
    { title: "Taal",                              year: 1999 },
    // 2000s
    { title: "Mohabbatein",                       year: 2000 },
    { title: "Lagaan: Once Upon a Time in India", year: 2001 },
    { title: "Kabhi Khushi Kabhie Gham",         year: 2001 },
    { title: "Devdas",                            year: 2002 },
    { title: "Kal Ho Naa Ho",                     year: 2003 },
    { title: "Main Hoon Na",                      year: 2004 },
    { title: "Veer-Zaara",                        year: 2004 },
    { title: "Bunty Aur Babli",                  year: 2005 },
    { title: "Black",                             year: 2005 },
    { title: "Rang De Basanti",                   year: 2006 },
    { title: "Lage Raho Munna Bhai",             year: 2006 },
    { title: "Dhoom 2",                           year: 2006 },
    { title: "Taare Zameen Par",                  year: 2007 },
    { title: "Chak De! India",                    year: 2007 },
    { title: "Jab We Met",                        year: 2007 },
    { title: "Om Shanti Om",                      year: 2007 },
    { title: "Kaminey",                           year: 2009 },
    { title: "3 Idiots",                          year: 2009 },
    // 2010s
    { title: "Dabangg",                           year: 2010 },
    { title: "Udaan",                             year: 2010 },
    { title: "Zindagi Na Milegi Dobara",          year: 2011 },
    { title: "Rockstar",                          year: 2011 },
    { title: "Gangs of Wasseypur - Part 1",      year: 2012 },
    { title: "Kahaani",                           year: 2012 },
    { title: "Barfi!",                            year: 2012 },
    { title: "English Vinglish",                  year: 2012 },
    { title: "Bhaag Milkha Bhaag",               year: 2013 },
    { title: "Queen",                             year: 2014 },
    { title: "PK",                                year: 2014 },
    { title: "Haider",                            year: 2014 },
    { title: "Highway",                           year: 2014 },
    { title: "Bajrangi Bhaijaan",                year: 2015 },
    { title: "Piku",                              year: 2015 },
    { title: "Bajirao Mastani",                   year: 2015 },
    { title: "Dil Dhadakne Do",                   year: 2015 },
    { title: "Dangal",                            year: 2016 },
    { title: "Sultan",                            year: 2016 },
    { title: "Ae Dil Hai Mushkil",               year: 2016 },
    { title: "Udta Punjab",                       year: 2016 },
    { title: "Raazi",                             year: 2018 },
    { title: "Andhadhun",                         year: 2018 },
    { title: "Sanju",                             year: 2018 },
    { title: "Gully Boy",                         year: 2019 },
    { title: "Article 15",                        year: 2019 },
    { title: "Kabir Singh",                       year: 2019 },
    { title: "Chhichhore",                        year: 2019 },
    // 2020s
    { title: "Shershaah",                         year: 2021 },
    { title: "Sardar Udham",                      year: 2021 },
    { title: "Gangubai Kathiawadi",               year: 2022 },
    { title: "Drishyam 2",                        year: 2022 },
    { title: "The Kashmir Files",                 year: 2022 },
    { title: "Pathaan",                           year: 2023 },
    { title: "Jawan",                             year: 2023 },
    { title: "Animal",                            year: 2023 },
    { title: "12th Fail",                         year: 2023 },
    { title: "Rocky Aur Rani Kii Prem Kahaani",  year: 2023 },
    { title: "Stree 2",                           year: 2024 },
  ],

  ta: [
    { title: "Parasakthi",                        year: 1952 },
    { title: "Ninaithaale Inikkum",               year: 1979 },
    { title: "Moondram Pirai",                    year: 1982 },
    { title: "Nayakan",                           year: 1987 },
    { title: "Agni Natchathiram",                 year: 1988 },
    { title: "Apoorva Sagodharargal",             year: 1989 },
    { title: "Thalapathi",                        year: 1991 },
    { title: "Roja",                              year: 1992 },
    { title: "Thevar Magan",                      year: 1992 },
    { title: "Bombay",                            year: 1995 },
    { title: "Baasha",                            year: 1995 },
    { title: "Indian",                            year: 1996 },
    { title: "Iruvar",                            year: 1997 },
    { title: "Padayappa",                         year: 1999 },
    { title: "Alaipayuthey",                      year: 2000 },
    { title: "Anbe Sivam",                        year: 2003 },
    { title: "Virumaandi",                        year: 2004 },
    { title: "Ghilli",                            year: 2004 },
    { title: "Anniyan",                           year: 2005 },
    { title: "Chandramukhi",                      year: 2005 },
    { title: "Ghajini",                           year: 2005 },
    { title: "Sivaji: The Boss",                  year: 2007 },
    { title: "Vaaranam Aayiram",                  year: 2008 },
    { title: "Dasavatharam",                      year: 2008 },
    { title: "Enthiran",                          year: 2010 },
    { title: "Singam",                            year: 2010 },
    { title: "Vinnaithaandi Varuvaayaa",          year: 2010 },
    { title: "Aadukalam",                         year: 2011 },
    { title: "3",                                 year: 2012 },
    { title: "Thuppakki",                         year: 2012 },
    { title: "Pizza",                             year: 2012 },
    { title: "Soodhu Kavvum",                     year: 2013 },
    { title: "Jigarthanda",                       year: 2014 },
    { title: "Velaiyilla Pattathari",             year: 2014 },
    { title: "Kaaka Muttai",                      year: 2015 },
    { title: "Thani Oruvan",                      year: 2015 },
    { title: "O Kadhal Kanmani",                  year: 2015 },
    { title: "Papanasam",                         year: 2015 },
    { title: "Kabali",                            year: 2016 },
    { title: "Theri",                             year: 2016 },
    { title: "Dhuruvangal Pathinaaru",            year: 2016 },
    { title: "Visaranai",                         year: 2016 },
    { title: "24",                                year: 2016 },
    { title: "Vikram Vedha",                      year: 2017 },
    { title: "Mersal",                            year: 2017 },
    { title: "Aruvi",                             year: 2017 },
    { title: "Theeran Adhigaaram Ondru",          year: 2017 },
    { title: "96",                                year: 2018 },
    { title: "Pariyerum Perumal",                 year: 2018 },
    { title: "Vada Chennai",                      year: 2018 },
    { title: "Ratsasan",                          year: 2018 },
    { title: "Asuran",                            year: 2019 },
    { title: "Super Deluxe",                      year: 2019 },
    { title: "Kaithi",                            year: 2019 },
    { title: "Bigil",                             year: 2019 },
    { title: "Soorarai Pottru",                   year: 2020 },
    { title: "Master",                            year: 2021 },
    { title: "Jai Bhim",                          year: 2021 },
    { title: "Karnan",                            year: 2021 },
    { title: "Sarpatta Parambarai",               year: 2021 },
    { title: "Doctor",                            year: 2021 },
    { title: "Vikram",                            year: 2022 },
    { title: "Ponniyin Selvan: Part I",           year: 2022 },
    { title: "Leo",                               year: 2023 },
    { title: "Jailer",                            year: 2023 },
    { title: "Amaran",                            year: 2024 },
    { title: "Maharaja",                          year: 2024 },
  ],

  te: [
    { title: "Mayabazar",                         year: 1957 },
    { title: "Sankarabharanam",                   year: 1980 },
    { title: "Sagara Sangamam",                   year: 1983 },
    { title: "Swarnakamalam",                     year: 1988 },
    { title: "Geethanjali",                       year: 1989 },
    { title: "Siva",                              year: 1989 },
    { title: "Kshana Kshanam",                    year: 1991 },
    { title: "Muta Mestri",                       year: 1993 },
    { title: "Allari Premikudu",                  year: 1994 },
    { title: "Ninne Pelladatha",                  year: 1996 },
    { title: "Okkadu",                            year: 2003 },
    { title: "Aarya",                             year: 2004 },
    { title: "Athadu",                            year: 2005 },
    { title: "Pokiri",                            year: 2006 },
    { title: "Bommarillu",                        year: 2006 },
    { title: "Magadheera",                        year: 2009 },
    { title: "Vedam",                             year: 2010 },
    { title: "Dookudu",                           year: 2011 },
    { title: "Eega",                              year: 2012 },
    { title: "Businessman",                       year: 2012 },
    { title: "Atharintiki Daaredi",               year: 2013 },
    { title: "Manam",                             year: 2014 },
    { title: "Race Gurram",                       year: 2014 },
    { title: "Son of Satyamurthy",               year: 2015 },
    { title: "Srimanthudu",                       year: 2015 },
    { title: "B\u0101hubali: The Beginning",     year: 2015 },
    { title: "Pelli Choopulu",                    year: 2016 },
    { title: "Sarrainodu",                        year: 2016 },
    { title: "B\u0101hubali 2: The Conclusion",  year: 2017 },
    { title: "Arjun Reddy",                       year: 2017 },
    { title: "DJ: Duvvada Jagannadham",           year: 2017 },
    { title: "Bharat Ane Nenu",                   year: 2018 },
    { title: "Rangasthalam",                      year: 2018 },
    { title: "Mahanati",                          year: 2018 },
    { title: "Geetha Govindam",                   year: 2018 },
    { title: "Taxiwala",                          year: 2018 },
    { title: "Jersey",                            year: 2019 },
    { title: "Dear Comrade",                      year: 2019 },
    { title: "Agent Sai Srinivasa Athreya",       year: 2019 },
    { title: "Ala Vaikunthapurramuloo",           year: 2020 },
    { title: "Pushpa: The Rise",                  year: 2021 },
    { title: "Shyam Singha Roy",                  year: 2021 },
    { title: "RRR",                               year: 2022 },
    { title: "Sita Ramam",                        year: 2022 },
    { title: "Ante... Sundaraniki!",              year: 2022 },
    { title: "Viraata Parvam",                    year: 2022 },
    { title: "Hi Nanna",                          year: 2023 },
    { title: "Kalki 2898-AD",                     year: 2024 },
    { title: "Lucky Baskhar",                     year: 2024 },
  ],

  ml: [
    { title: "Chemmeen",                          year: 1965 },
    { title: "Swayamvaram",                       year: 1972 },
    { title: "Nirmalyam",                         year: 1973 },
    { title: "Nadodikkattu",                      year: 1987 },
    { title: "Kireedam",                          year: 1989 },
    { title: "Ramji Rao Speaking",                year: 1989 },
    { title: "In Harihar Nagar",                  year: 1990 },
    { title: "Kilukkam",                          year: 1991 },
    { title: "Sandhesam",                         year: 1991 },
    { title: "Manichitrathazhu",                  year: 1993 },
    { title: "Devasuram",                         year: 1993 },
    { title: "Spadikam",                          year: 1995 },
    { title: "Arabikkatha",                       year: 2007 },
    { title: "Salt N\' Pepper",                  year: 2011 },
    { title: "Ustad Hotel",                       year: 2012 },
    { title: "Drishyam",                          year: 2013 },
    { title: "Bangalore Days",                    year: 2014 },
    { title: "Premam",                            year: 2015 },
    { title: "Charlie",                           year: 2015 },
    { title: "Maheshinte Prathikaaram",           year: 2016 },
    { title: "Pulimurugan",                       year: 2016 },
    { title: "Kammatti Paadam",                   year: 2016 },
    { title: "Thondimuthalum Driksakshiyum",      year: 2017 },
    { title: "Angamaly Diaries",                  year: 2017 },
    { title: "Take Off",                          year: 2017 },
    { title: "Mayaanadhi",                        year: 2017 },
    { title: "Ee.Ma.Yau.",                        year: 2018 },
    { title: "Lucifer",                           year: 2019 },
    { title: "Kumbalangi Nights",                 year: 2019 },
    { title: "Jallikattu",                        year: 2019 },
    { title: "Virus",                             year: 2019 },
    { title: "Ayyappanum Koshiyum",               year: 2020 },
    { title: "Joji",                              year: 2021 },
    { title: "Minnal Murali",                     year: 2021 },
    { title: "The Great Indian Kitchen",          year: 2021 },
    { title: "Nayattu",                           year: 2021 },
    { title: "Drishyam 2",                        year: 2021 },
    { title: "Jana Gana Mana",                    year: 2022 },
    { title: "Hridayam",                          year: 2022 },
    { title: "2018",                              year: 2023 },
    { title: "Romancham",                         year: 2023 },
    { title: "Aavesham",                          year: 2024 },
    { title: "Manjummel Boys",                    year: 2024 },
    { title: "Bramayugam",                        year: 2024 },
    { title: "The Goat Life",                     year: 2024 },
    { title: "Premalu",                           year: 2024 },
  ],
};

function buildDNA(selected) {
  const rated = selected.filter((s) => s.rating > 0);
  const avg   = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
  const arcs  = [];
  if (avg >= 4)
    arcs.push({ label: "Cinephile",        pct: 35 });
  if (rated.some((r) => r.movie.genres?.includes("Action")))
    arcs.push({ label: "Mass Action Fan",  pct: 30 });
  if (rated.some((r) => r.movie.genres?.includes("Romance")))
    arcs.push({ label: "Romance Lover",    pct: 25 });
  if (rated.some((r) => r.movie.genres?.includes("Drama")))
    arcs.push({ label: "Drama Seeker",     pct: 20 });
  arcs.push(    { label: "Hidden Gem Hunter", pct: 15 });
  return arcs.slice(0, 4);
}

function generatePairs(selected) {
  const buckets = {};
  selected.filter((s) => s.rating != null).forEach((s) => {
    if (!buckets[s.rating]) buckets[s.rating] = [];
    buckets[s.rating].push(s.movie);
  });
  const pairs = [];
  Object.values(buckets).forEach((movies) => {
    for (let i = 0; i < movies.length - 1; i++) {
      pairs.push([movies[i], movies[i + 1]]);
    }
  });
  return pairs;
}

function computeScores(selected, compResults) {
  const buckets = {};
  selected.filter((s) => s.rating != null).forEach((s) => {
    if (!buckets[s.rating]) buckets[s.rating] = [];
    buckets[s.rating].push({ id: s.movie.id, rating: s.rating, wins: 0 });
  });

  compResults.forEach(({ winnerId }) => {
    Object.values(buckets).forEach((bucket) => {
      const m = bucket.find((b) => b.id === winnerId);
      if (m) m.wins++;
    });
  });

  const scores = {};
  Object.entries(buckets).forEach(([rating, movies]) => {
    const [min, max] = BUCKET_RANGES[Number(rating)];
    const sorted = [...movies].sort((a, b) => b.wins - a.wins);
    sorted.forEach((m, i) => {
      scores[m.id] = sorted.length === 1
        ? INITIAL_SCORES[Number(rating)]
        : Math.round(max - (i / (sorted.length - 1)) * (max - min));
    });
  });
  return scores;
}

const inputStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--line)",
  borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 14,
  fontFamily: "var(--font-ui)", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  boxSizing: "border-box",
};

const btnPrimary = (disabled) => ({
  width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700,
  padding: "14px 0", borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 14, fontFamily: "var(--font-ui)", opacity: disabled ? 0.4 : 1,
  boxShadow: "var(--shadow-brand)", transition: "opacity 0.15s",
});

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,            setStep]            = useState(0);
  const [user,            setUser]            = useState(null);
  const [displayName,     setDisplayName]     = useState("");
  const [username,        setUsername]        = useState("");
  const [country,         setCountry]         = useState("");
  const [city,            setCity]            = useState("");
  const [countrySearch,   setCountrySearch]   = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [languageRanking, setLanguageRanking] = useState([]);
  const [gridMovies,      setGridMovies]      = useState([]);
  const [gridLoading,     setGridLoading]     = useState(false);
  const [selected,        setSelected]        = useState(new Set());
  const [ratedFilms,      setRatedFilms]      = useState([]);
  const [pairs,           setPairs]           = useState([]);
  const [pairIdx,         setPairIdx]         = useState(0);
  const [compResults,     setCompResults]     = useState([]);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_complete, display_name, username")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_complete) { router.replace("/"); return; }

      const meta = user.user_metadata || {};
      const nameFromMeta = meta.full_name || meta.name || "";
      const nameFromEmail = user.email?.split("@")[0] ?? "";
      const defaultName = profile?.display_name || nameFromMeta || nameFromEmail;
      const defaultUsername = profile?.username ||
        (nameFromMeta || nameFromEmail).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);

      setDisplayName(defaultName);
      setUsername(defaultUsername);
    }
    init();
  }, []);

  async function fetchCuratedFilms(langs) {
    const selectedLangs = langs?.length > 0 ? langs : ["hi"];
    const perLang = await Promise.all(
      selectedLangs.map(async (code) => {
        const films = CURATED_FILMS[code] || [];
        if (!films.length) return [];
        const titles = [...new Set(films.map(f => f.title))];
        const { data } = await supabase
          .from("movies")
          .select("id, title, year, poster_url, genres")
          .in("title", titles)
          .eq("language", code)
          .limit(500);
        return data || [];
      })
    );
    const all = perLang.flat();
    if (!all.length) return [];
    return all.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  function handleIdentityContinue() { setStep(1); }
  function handleLocationContinue() { setStep(2); }

  async function handleLanguageContinue() {
    setStep(3);
    setGridLoading(true);
    const movies = await fetchCuratedFilms(languageRanking.slice(0, 1));
    setGridMovies(movies);
    setGridLoading(false);
  }

  function handleGridContinue() {
    const selectedMovies = gridMovies.filter(m => selected.has(m.id));
    setRatedFilms(selectedMovies.map(m => ({ movie: m, rating: null })));
    setStep(4);
  }

  function setRating(movieId, rating) {
    setRatedFilms(prev => prev.map(s => s.movie.id === movieId ? { ...s, rating } : s));
  }

  function handleRatingContinue() {
    const rated = ratedFilms.filter(s => s.rating != null);
    const p = generatePairs(rated);
    if (p.length > 0) {
      setPairs(p);
      setStep(5);
    } else {
      handleFinish(rated, []);
    }
  }

  function handleCompare(winnerId, currentCompResults) {
    const updatedCompResults = winnerId != null
      ? [...currentCompResults, { winnerId, loserId: pairs[pairIdx].find((m) => m.id !== winnerId)?.id }]
      : currentCompResults;

    if (pairIdx < pairs.length - 1) {
      setCompResults(updatedCompResults);
      setPairIdx(i => i + 1);
    } else {
      handleFinish(ratedFilms, updatedCompResults);
    }
  }

  async function handleFinish(sel = ratedFilms, cr = compResults) {
    setSaving(true);
    const currentUser = user || (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      console.error("handleFinish: no authenticated user");
      router.push("/login");
      return;
    }

    const scores    = computeScores(sel, cr);
    const reactions = sel
      .filter((s) => s.rating != null)
      .map((s) => ({
        user_id:  currentUser.id,
        movie_id: s.movie.id,
        rating:   s.rating,
        score:    scores[s.movie.id] ?? INITIAL_SCORES[s.rating],
      }));

    console.log(`[onboarding] saving ${reactions.length} reactions for user ${currentUser.id}`);

    if (reactions.length) {
      const { error: reactErr } = await supabase
        .from("user_reactions")
        .upsert(reactions, { onConflict: "user_id,movie_id" });
      if (reactErr) {
        console.error("[onboarding] user_reactions upsert failed:", JSON.stringify(reactErr));
        // Surface to user so it's visible in UI testing
        alert(`Save error (reactions): ${reactErr.message || reactErr.code || JSON.stringify(reactErr)}`);
      }
    }

    const { error: profileErr } = await supabase.from("user_profiles").upsert(
      {
        user_id:             currentUser.id,
        display_name:        displayName.trim() || null,
        username:            username.trim().toLowerCase() || null,
        dna:                 buildDNA(sel),
        onboarding_complete: true,
        email:               currentUser.email,
        country:             country || null,
        city:                city.trim() || null,
      },
      { onConflict: "user_id" }
    );
    if (profileErr) console.error("[onboarding] user_profiles core upsert failed:", JSON.stringify(profileErr));

    const meta = currentUser.user_metadata || {};
    await supabase.from("user_profiles").upsert(
      {
        user_id:             currentUser.id,
        full_name:           meta.full_name || meta.name || displayName.trim() || null,
        profile_picture_url: meta.avatar_url || meta.picture || null,
        preferred_languages: languageRanking.length > 0 ? languageRanking : null,
      },
      { onConflict: "user_id" }
    );

    router.push("/");
  }

  const kicker = (text) => (
    <p style={{ color: "var(--brand)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{text}</p>
  );

  // ── Step 0: Identity ──
  if (step === 0) {
    const initials  = displayName.slice(0, 2).toUpperCase() || "?";
    const canContinue = displayName.trim().length >= 2 && username.trim().length >= 2;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        {kicker("Step 1 of 4")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Create your profile</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 32 }}>How you'll appear to others on Rasika</p>

        <div className="flex justify-center mb-8">
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 900, fontFamily: "var(--font-ui)", userSelect: "none", boxShadow: "var(--shadow-brand)" }}>
            {initials}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be known"
              maxLength={32}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Username
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", fontSize: 14, userSelect: "none" }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="yourhandle"
                maxLength={20}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            <p style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 6 }}>Letters, numbers and underscores only</p>
          </div>
        </div>

        <button onClick={handleIdentityContinue} disabled={!canContinue} style={btnPrimary(!canContinue)}>
          Continue →
        </button>
      </div>
    );
  }

  // ── Step 1: Location ──
  if (step === 1) {
    const filteredCountries = countrySearch.trim()
      ? COUNTRIES.filter((c) => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
      : COUNTRIES;
    const selectedCountryLabel = COUNTRIES.find((c) => c.code === country)?.label;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        {kicker("Step 2 of 4")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Where are you based?</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>Helps us surface locally relevant films and showtimes.</p>

        <div className="mb-4">
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Country</label>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowCountryDrop((v) => !v)}
              style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            >
              <span style={{ color: selectedCountryLabel ? "var(--ink)" : "var(--ink-mute)", fontWeight: selectedCountryLabel ? 500 : 400 }}>
                {selectedCountryLabel || "Select your country"}
              </span>
              <span style={{ color: "var(--ink-mute)", fontSize: 11 }}>▾</span>
            </button>

            {showCountryDrop && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 50, boxShadow: "var(--shadow-card)" }}>
                <div style={{ padding: 8, borderBottom: "1px solid var(--line)" }}>
                  <input
                    autoFocus
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search…"
                    style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, border: "none", background: "var(--sunk)" }}
                  />
                </div>
                <div style={{ maxHeight: 210, overflowY: "auto" }}>
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onMouseDown={() => {
                        setCountry(c.code);
                        setCountrySearch("");
                        setShowCountryDrop(false);
                      }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, cursor: "pointer", background: "none", border: "none", color: country === c.code ? "var(--brand)" : "var(--ink-soft)", fontWeight: country === c.code ? 600 : 400 }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            City <span style={{ color: "var(--line)", textTransform: "none", fontWeight: 400, fontSize: 11 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai, London, Toronto…"
            style={inputStyle}
          />
        </div>

        <button onClick={handleLocationContinue} disabled={!country} style={btnPrimary(!country)}>
          Continue →
        </button>

        <button onClick={handleLocationContinue} style={{ width: "100%", marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 12 }}>
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 2: Language Ranking ──
  if (step === 2) {
    const toggleLanguage = (code) => {
      setLanguageRanking((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
    };

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        {kicker("Step 3 of 4")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Which languages do you watch most?</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>Select in order — most-watched first. We'll show those films at the top of your feed.</p>

        {languageRanking.length > 0 && (
          <div style={{ marginBottom: 24, padding: 16, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-card)" }}>
            <p style={{ fontSize: 10, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 12 }}>Your order</p>
            <div className="space-y-2">
              {languageRanking.map((code, idx) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand)", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{lang?.label}</span>
                    <button
                      onClick={() => toggleLanguage(code)}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 18, lineHeight: 1, padding: "0 4px" }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-8">
          {LANGUAGES.map((lang) => {
            const rank = languageRanking.indexOf(lang.code);
            const isSelected = rank !== -1;
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
                  border: `1px solid ${isSelected ? "var(--brand)" : "var(--line)"}`,
                  background: isSelected ? "rgba(225,75,51,0.06)" : "var(--card)",
                  color: "var(--ink)", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{lang.label}</span>
                {isSelected && (
                  <span style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: "var(--brand)", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {rank + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={handleLanguageContinue} disabled={languageRanking.length === 0} style={btnPrimary(languageRanking.length === 0)}>
          {languageRanking.length > 0
            ? `Continue with ${languageRanking.length} language${languageRanking.length !== 1 ? "s" : ""} →`
            : "Select at least one language"}
        </button>

        <button onClick={handleLanguageContinue} style={{ width: "100%", marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 12 }}>
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 3: Selection Grid ──
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 pb-36">
        {kicker("Step 4 of 4")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Which of these have you seen?</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>Tap any film you've watched — we'll show you the greatest movies of each era</p>

        {gridLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gridMovies.map(movie => {
              const seen = selected.has(movie.id);
              return (
                <button
                  key={movie.id}
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(movie.id)) next.delete(movie.id); else next.add(movie.id);
                    setSelected(next);
                  }}
                  style={{
                    position: "relative", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden",
                    background: "var(--sunk)", border: "none", padding: 0, cursor: "pointer",
                    outline: seen ? `2px solid var(--brand)` : "none",
                    outlineOffset: seen ? 2 : 0,
                    transform: seen ? "scale(0.97)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}

                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)", padding: "24px 6px 6px" }}>
                    <p style={{ fontSize: 9, color: "#fff", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{movie.title}</p>
                  </div>

                  {seen && (
                    <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}

                  {seen && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(225,75,51,0.10)", pointerEvents: "none" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 16px 24px", background: "rgba(250,247,241,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)" }}>
          <div className="max-w-lg mx-auto">
            {selected.size > 0 && (
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-mute)", marginBottom: 12 }}>
                {selected.size} film{selected.size !== 1 ? "s" : ""} selected
              </p>
            )}
            <button onClick={handleGridContinue} disabled={selected.size === 0} style={btnPrimary(selected.size === 0)}>
              {selected.size > 0
                ? `Rate ${selected.size} film${selected.size !== 1 ? "s" : ""} →`
                : "Tap films you've watched"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Rating ──
  if (step === 4) {
    const ratedCount = ratedFilms.filter(s => s.rating != null).length;

    return (
      <div className="max-w-lg mx-auto px-4 pt-10 pb-36">
        {kicker("Last step")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>How did you feel about them?</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>
          {ratedCount === 0
            ? `Rate the ${ratedFilms.length} films you've seen`
            : `${ratedCount} of ${ratedFilms.length} rated`}
        </p>

        <div className="space-y-3">
          {ratedFilms.map(({ movie, rating }) => (
            <div
              key={movie.id}
              style={{
                background: "var(--card)", borderRadius: 16, padding: 16, boxShadow: "var(--shadow-card)",
                border: `1px solid ${rating != null ? "var(--line)" : "rgba(225,75,51,0.25)"}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 40, height: 56, borderRadius: 8, overflow: "hidden", background: "var(--sunk)", flexShrink: 0 }}>
                  {movie.poster_url && <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{movie.title}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>{movie.year}</p>
                  {rating == null && (
                    <p style={{ fontSize: 10, color: "var(--brand)", marginTop: 2 }}>Tap to rate ↓</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRating(movie.id, r.value)}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "8px 4px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${rating === r.value ? r.color : "var(--line)"}`,
                      background: rating === r.value ? `${r.color}15` : "var(--sunk)",
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "28%", background: r.color }} />
                    <span style={{ fontSize: 9, color: "var(--ink-mute)", lineHeight: 1.2, textAlign: "center" }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 16px 24px", background: "rgba(250,247,241,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--line)" }}>
          <div className="max-w-lg mx-auto">
            <button onClick={handleRatingContinue} disabled={ratedCount === 0} style={btnPrimary(ratedCount === 0)}>
              {ratedCount > 0
                ? `Continue with ${ratedCount} rating${ratedCount !== 1 ? "s" : ""} →`
                : "Rate at least one film"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 5: Pairwise Compare ──
  if (step === 5) {
    const pair = pairs[pairIdx];

    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        {kicker("Final refinement")}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Refine your ranking</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 4 }}>You rated these the same — which did you prefer?</p>
        <p style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 32 }}>{pairIdx + 1} of {pairs.length}</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 32 }}>
          {pairs.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < pairIdx ? "var(--brand)" : i === pairIdx ? "var(--ink)" : "var(--line)", transition: "background 0.2s" }} />
          ))}
        </div>

        {pair && (
          <div className="flex items-center gap-3">
            <button
              key={pair[0].id}
              onClick={() => handleCompare(pair[0].id, compResults)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, cursor: "pointer", transition: "all 0.15s", boxShadow: "var(--shadow-card)" }}
            >
              <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: "var(--sunk)" }}>
                {pair[0].poster_url && <img src={pair[0].poster_url} alt={pair[0].title} className="w-full h-full object-cover" />}
              </div>
              <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{pair[0].title}</p>
              <p style={{ color: "var(--ink-mute)", fontSize: 11 }}>{pair[0].year}</p>
            </button>

            <div style={{ flexShrink: 0, color: "var(--ink-mute)", fontWeight: 900, fontSize: 18 }}>VS</div>

            <button
              key={pair[1].id}
              onClick={() => handleCompare(pair[1].id, compResults)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, cursor: "pointer", transition: "all 0.15s", boxShadow: "var(--shadow-card)" }}
            >
              <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: "var(--sunk)" }}>
                {pair[1].poster_url && <img src={pair[1].poster_url} alt={pair[1].title} className="w-full h-full object-cover" />}
              </div>
              <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{pair[1].title}</p>
              <p style={{ color: "var(--ink-mute)", fontSize: 11 }}>{pair[1].year}</p>
            </button>
          </div>
        )}

        <button
          onClick={() => handleCompare(null, compResults)}
          style={{ marginTop: 24, background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 12 }}
        >
          Too close to call — skip
        </button>

        {saving && (
          <p style={{ marginTop: 16, color: "var(--ink-mute)", fontSize: 12 }}>Saving your taste profile…</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10 text-center">
      <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Setting up your profile…</p>
    </div>
  );
}

#!/usr/bin/env python3
"""
Bollywood Recommender — Matrix Factorization Pipeline

Builds per-user movie recommendations using SVD on a ratings matrix seeded with:
  Row 0       — IMDB average rating (public dataset, matched via imdb_id)
  Row 1       — TMDB average rating (already in DB)
  Rows 2–N   — MovieLens Bollywood users (real ratings, matched via imdb_id)
  Rows N+1+  — Real app users

Usage:
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your_key python3 scripts/build_recommendations.py

Optional env:
  MOVIELENS_DIR  Path to the collaborative/ folder from the Kaggle archive
                 (default: data/archive/collaborative)
"""

import os
import sys
import csv
import gzip
import urllib.request
import json
import io
import numpy as np
from scipy.sparse import lil_matrix
from sklearn.decomposition import TruncatedSVD

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
MOVIELENS_DIR = os.environ.get(
    "MOVIELENS_DIR",
    os.path.join(os.path.dirname(__file__), "../data/archive/collaborative"),
)
IMDB_RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz"
N_FACTORS = 20
N_RECOMMENDATIONS = 20
BATCH_SIZE = 500

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌  Missing SUPABASE_URL or SUPABASE_KEY")
    print("    Run as: SUPABASE_URL=... SUPABASE_KEY=... python3 scripts/build_recommendations.py")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())


def supabase_post(path, data, prefer="resolution=merge-duplicates"):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode()
    headers = {**HEADERS, "Prefer": prefer}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            return res.status
    except urllib.error.HTTPError as e:
        print(f"\n  ⚠️  Supabase error {e.code}: {e.read().decode()[:200]}")
        return e.code


def fetch_all(path, select):
    rows = []
    offset = 0
    while True:
        batch = supabase_get(path, f"?select={select}&limit=1000&offset={offset}")
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def download_imdb_ratings(local_path=None):
    if local_path and os.path.exists(local_path):
        print(f"📂  Loading IMDB ratings from {local_path}...")
        opener = gzip.open(local_path, "rt", encoding="utf-8")
    else:
        print("📥  Downloading IMDB ratings dataset (~8MB)...")
        req = urllib.request.Request(IMDB_RATINGS_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as res:
            compressed = res.read()
        opener = gzip.open(io.BytesIO(compressed), "rt", encoding="utf-8")

    ratings = {}
    with opener as f:
        next(f)  # skip header
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                try:
                    ratings[parts[0]] = float(parts[1])
                except ValueError:
                    pass

    print(f"  ✅  {len(ratings):,} IMDB ratings loaded")
    return ratings


def load_movielens(movielens_dir):
    """
    Load MovieLens Bollywood ratings and return:
      - ml_user_ratings: dict of {ml_user_id: {our_imdb_id: rating_0_10}}
      - matched_count: how many movies matched our DB
    MovieLens imdb_id is numeric (e.g. 43306); ours is "tt0043306".
    """
    links_path = os.path.join(movielens_dir, "links.csv")
    ratings_path = os.path.join(movielens_dir, "ratings.csv")

    if not os.path.exists(links_path) or not os.path.exists(ratings_path):
        print(f"  ⚠️  MovieLens files not found in {movielens_dir}, skipping.")
        return {}, 0

    print(f"📂  Loading MovieLens data from {movielens_dir}...")

    # Build MovieLens movie_id → our imdb_id format ("tt0043306")
    ml_movie_to_imdb = {}
    with open(links_path, newline="") as f:
        for row in csv.DictReader(f):
            try:
                imdb_id = f"tt{int(row['imdb_id']):07d}"
                ml_movie_to_imdb[row["movie_id"]] = imdb_id
            except (ValueError, KeyError):
                pass

    # Load ratings, convert 0.5–5.0 → 0–10
    ml_user_ratings = {}
    skipped = 0
    with open(ratings_path, newline="") as f:
        for row in csv.DictReader(f):
            ml_id = row["movie_id"]
            imdb_id = ml_movie_to_imdb.get(ml_id)
            if not imdb_id:
                skipped += 1
                continue
            uid = row["user_id"]
            rating = float(row["rating"]) * 2.0  # 0.5–5.0 → 1–10
            if uid not in ml_user_ratings:
                ml_user_ratings[uid] = {}
            ml_user_ratings[uid][imdb_id] = rating

    print(f"  ✅  {len(ml_user_ratings):,} MovieLens users, {skipped} unmatched ratings skipped")
    return ml_user_ratings


def main():
    # 1. Fetch all movies from Supabase
    print("\n🎬  Fetching movies from Supabase...")
    movies = fetch_all("movies", "id,imdb_id,tmdb_rating")
    print(f"  ✅  {len(movies)} movies")

    movie_id_to_idx = {m["id"]: i for i, m in enumerate(movies)}
    imdb_to_idx = {}
    for i, m in enumerate(movies):
        if m.get("imdb_id"):
            imdb_to_idx[m["imdb_id"]] = i
    n_movies = len(movies)

    # 2. IMDB ratings
    imdb_ratings = download_imdb_ratings(local_path="/tmp/imdb_ratings.tsv.gz")

    # 3. MovieLens seed users
    ml_user_ratings = load_movielens(MOVIELENS_DIR)
    ml_user_ids = list(ml_user_ratings.keys())
    n_ml_users = len(ml_user_ids)

    # 4. Real app user ratings
    print("\n👥  Fetching real user ratings from Supabase...")
    reactions = fetch_all("user_reactions", "user_id,movie_id,score,rating")
    print(f"  ✅  {len(reactions)} ratings")

    real_user_ids = list({r["user_id"] for r in reactions})
    print(f"  ✅  {len(real_user_ids)} real users")

    # Row layout:
    #   0             — IMDB pseudo-user
    #   1             — TMDB pseudo-user
    #   2 .. N+1      — MovieLens users
    #   N+2 ..        — Real app users
    PSEUDO = 2
    ml_uid_to_row = {uid: PSEUDO + i for i, uid in enumerate(ml_user_ids)}
    real_uid_to_row = {uid: PSEUDO + n_ml_users + i for i, uid in enumerate(real_user_ids)}
    n_users = PSEUDO + n_ml_users + len(real_user_ids)

    # 5. Build sparse matrix
    print(f"\n🔢  Building {n_users} × {n_movies} ratings matrix...")
    mat = lil_matrix((n_users, n_movies), dtype=np.float32)

    # IMDB + TMDB pseudo-users
    imdb_hits, tmdb_hits = 0, 0
    for i, movie in enumerate(movies):
        iid = movie.get("imdb_id")
        if iid and iid in imdb_ratings:
            mat[0, i] = imdb_ratings[iid]
            imdb_hits += 1
        if movie.get("tmdb_rating"):
            mat[1, i] = float(movie["tmdb_rating"])
            tmdb_hits += 1

    print(f"  Pseudo-user 0 (IMDB):       {imdb_hits:,} ratings")
    print(f"  Pseudo-user 1 (TMDB):       {tmdb_hits:,} ratings")

    # MovieLens users
    ml_placed = 0
    for uid, film_ratings in ml_user_ratings.items():
        row = ml_uid_to_row[uid]
        for imdb_id, rating in film_ratings.items():
            col = imdb_to_idx.get(imdb_id)
            if col is not None:
                mat[row, col] = rating
                ml_placed += 1

    print(f"  MovieLens users ({n_ml_users:,}):    {ml_placed:,} ratings placed")

    # Real app users
    app_placed = 0
    for r in reactions:
        uid, mid = r["user_id"], r["movie_id"]
        if uid not in real_uid_to_row or mid not in movie_id_to_idx:
            continue
        row = real_uid_to_row[uid]
        col = movie_id_to_idx[mid]
        if r.get("score") is not None:
            mat[row, col] = float(r["score"]) / 10.0
        elif r.get("rating"):
            mat[row, col] = float(r["rating"]) * 2.0
        app_placed += 1

    print(f"  Real app users ({len(real_user_ids):,}):       {app_placed:,} ratings placed")

    mat_csr = mat.tocsr()
    density = mat_csr.nnz / (n_users * n_movies)
    print(f"  Matrix density: {density:.4%} non-zero entries")

    # 6. SVD
    n_factors = min(N_FACTORS, min(mat_csr.shape) - 1)
    print(f"\n🔬  Running SVD with {n_factors} latent factors...")
    svd = TruncatedSVD(n_components=n_factors, random_state=42, n_iter=10)
    user_factors = svd.fit_transform(mat_csr)   # (n_users, k)
    movie_factors = svd.components_.T            # (n_movies, k)
    print(f"  ✅  Explained variance: {svd.explained_variance_ratio_.sum():.1%}")

    # 7. Recommendations for real app users only
    print(f"\n🎯  Computing top {N_RECOMMENDATIONS} recommendations per user...")
    seen_by_user = {}
    for r in reactions:
        seen_by_user.setdefault(r["user_id"], set()).add(r["movie_id"])

    all_recommendations = []
    for uid, row in real_uid_to_row.items():
        user_vec = user_factors[row]
        predicted = movie_factors @ user_vec
        seen = seen_by_user.get(uid, set())

        ranked = sorted(
            [(movies[i]["id"], float(predicted[i])) for i in range(n_movies) if movies[i]["id"] not in seen],
            key=lambda x: -x[1],
        )[:N_RECOMMENDATIONS]

        for rank, (movie_id, score) in enumerate(ranked):
            all_recommendations.append({
                "user_id": uid,
                "movie_id": movie_id,
                "score": round(score, 4),
                "rank": rank + 1,
            })

    print(f"  ✅  {len(all_recommendations)} recommendations for {len(real_user_ids)} users")

    # 8. Write to Supabase
    print(f"\n💾  Writing to Supabase (batches of {BATCH_SIZE})...")
    for i in range(0, len(all_recommendations), BATCH_SIZE):
        batch = all_recommendations[i: i + BATCH_SIZE]
        supabase_post("user_recommendations", batch)
        done = min(i + BATCH_SIZE, len(all_recommendations))
        print(f"  {done}/{len(all_recommendations)} ✓", end="\r")

    print(f"\n\n🎉  Done! Recommendations are live in the user_recommendations table.")


if __name__ == "__main__":
    main()

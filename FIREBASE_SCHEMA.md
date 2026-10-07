# Cinema Firebase data model

## Current compatible model
The upgraded app remains compatible with the existing `users/{uid}` documents and adds:

- `watchlist[]` — compact TMDB movie/show objects
- `ratings{}` — keyed by `movie_ID` / `tv_ID`, values 1–5
- `reviews[]` — user's review records
- `diary[]` — dated viewing logs
- `activities[]` — latest social actions (capped client-side)
- existing: `favorites[]`, `watchedList[]`, `watchedEpisodes[]`, `following[]`

## Recommended production model
For larger usage, migrate high-growth arrays to subcollections:

- `users/{uid}` profile + counters + preferences
- `users/{uid}/diary/{entryId}`
- `users/{uid}/ratings/{mediaKey}`
- `users/{uid}/watchlist/{mediaKey}`
- `users/{uid}/following/{targetUid}`
- `reviews/{reviewId}` with `uid`, `mediaKey`, `rating`, `text`, timestamps
- `reviews/{reviewId}/likes/{uid}`
- `reviews/{reviewId}/comments/{commentId}`
- `activities/{activityId}` for a fan-out/fan-in feed strategy
- `lists/{listId}` and `lists/{listId}/items/{mediaKey}`

Use Firestore Security Rules so users can only edit their own private/user-owned documents, while public profiles/reviews/lists can be read according to privacy settings.

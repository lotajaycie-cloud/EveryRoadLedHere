# JC &amp; MJ — Wedding Website

Static wedding site for **8 December 2026, Club Punta Fuego, Nasugbu, Batangas**.
No build step, no framework, no dependencies — plain HTML, CSS and JavaScript.
Push it to GitHub, point Vercel at it, done.

---

## Contents

| Path | What it is |
| --- | --- |
| `index.html` | The whole site. All CSS and JS are inline. |
| `dashboard.html` | Private RSVP viewer — stats, search, sort, CSV export. |
| `gallery/album-1..5/` | 49 prenup photos. `thumb-NN.jpg` feeds the reel, `photo-NN.jpg` the full-screen viewer. |
| `images/` | Six full-bleed section backgrounds (2200–2600px). |
| `audio/bawat-daan.mp3` | Background track, starts when the envelope opens. |
| `backend/google-apps-script.gs` | Google Apps Script that turns a Sheet into the RSVP backend. |
| `vercel.json` | Caching and security headers. |

Everything is referenced with **relative paths**, so the site works from any
subdirectory and from `file://` as well as a real host.

---

## Deploying

### GitHub

```bash
cd site
git init
git add .
git commit -m "JC & MJ wedding site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

The repo is roughly **37 MB**, mostly photographs. That is well inside GitHub's
limits (no single file is anywhere near the 100 MB cap), so Git LFS is not needed.

### Vercel

1. <https://vercel.com/new> → **Import Git Repository** → pick the repo.
2. Framework preset: **Other**. Leave build command and output directory blank —
   it is already static.
3. **Deploy.**

Vercel serves `index.html` at the root automatically. Every push to `main`
redeploys. To use your own domain, go to *Project → Settings → Domains*.

> Deploying without Git? `npm i -g vercel` then run `vercel` from this folder.

### GitHub Pages (alternative)

*Settings → Pages → Deploy from a branch → `main` / root.* Add an empty
`.nojekyll` file first so the folders are served as-is.

---

## RSVP → Google Sheet

The form already works. Until you connect a Sheet it saves responses to the
visitor's own browser (`localStorage`, key `jcmj_rsvps`) so nothing is lost while
you test, and `dashboard.html` will read from there and say it is in demo mode.

Connecting the Sheet is three edits:

### 1. Create the backend

1. New spreadsheet at <https://sheets.google.com> — name it anything.
2. **Extensions → Apps Script**, delete the placeholder, paste all of
   `backend/google-apps-script.gs`.
3. Change `DASHBOARD_KEY` at the top to your own secret string.
4. **Deploy → New deployment → Web app**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
5. Authorise when prompted, then copy the **Web app URL** (it ends in `/exec`).

The `RSVPs` sheet and its header row are created automatically on first write.

### 2. Point the site at it

In **`index.html`**, find `CONFIG` (search for `rsvpEndpoint`, around line 1534):

```js
rsvpEndpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

### 3. Point the dashboard at it

In **`dashboard.html`**, same two keys near the top:

```js
rsvpEndpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
dashboardKey: 'the-same-secret-you-set-in-the-script',
```

Commit, push, and Vercel redeploys. Nothing else needs to change.

**If you edit the Apps Script later**, you must publish a new version —
*Deploy → Manage deployments → edit → New version* — or the live URL keeps
serving the old code.

### How a submission travels

```
guest submits
   ↓  POST, Content-Type: text/plain   ← deliberate: avoids a CORS preflight
   │                                     that Apps Script cannot answer
   ↓
doPost() appends a row:
   timestamp | name | attending | guests | message
   ↓
dashboard.html  GET ?key=…  →  doGet()  →  JSON  →  table + CSV
```

If the network call fails the response is still written to `localStorage` rather
than being dropped, and the guest still sees the thank-you card. The submit
button is disabled while sending, so a double tap cannot post twice.

---

## Guest codes

Each invitation carries a short code. A guest types it into the RSVP and the
form opens with their household's name filled in and the guest number capped at
the seats you actually reserved, which is what stops a party of two arriving as
five.

Edit the list near the top of the `<script>` block in `index.html`:

```js
var GUESTS = {
  'JCMJ01': { names: 'The Sample Family',      seats: 4 },
  'JCMJ02': { names: 'Juan & Maria Dela Cruz', seats: 2 },
  'JCMJ03': { names: 'Ana Reyes',              seats: 1 }
};
```

One line per household. The key is the code printed on that household's
invitation. Matching ignores case, spaces, dashes and dots, so `jcmj 01` and
`JCMJ-01` both open the same record.

Three things worth knowing:

- **Empty list means no gate.** Delete every entry and the RSVP behaves exactly
  as it did before, so nothing breaks while you are still building the list.
- **A code is a courtesy, not a lock.** The list sits in the page source, so
  anyone curious can read it. Keep private notes out of the `names` field.
- **The code travels to the sheet.** Three extra columns are recorded with each
  reply: Guest Code, Household, and Seats Reserved. If your sheet already has
  the old five headers, add these three to the right of Message, or delete the
  header row and let the script rebuild it.

Once a guest passes the gate their code is remembered in that browser, so
returning to the page does not ask again. The "Not you?" link clears it.

## Editing the site

Everything lives in `index.html`.

| To change | Look for |
| --- | --- |
| Date, venues, map coordinates | the `CONFIG` block |
| Prenup film | `prenupVideoUrl` — paste any YouTube or Vimeo link |
| Background music | `musicUrl` |
| Gallery chapters, order, counts | the `ALBUMS` array in the reel script |
| Day-of schedule | the `.tl-item` blocks |
| Gift funds, FAQ, dress code | plain markup in their sections |

### Two timings that are deliberately tuned

**The opening sequence.** The music cue is set against the fade-to-white and is
marked `LOCKED TIMING` in the code: music at 650 ms, veil begins 1150 ms, site
swaps in 2080 ms, white releases 2550 ms. The track opens with about a second of
quiet, so cueing it early is what lands the first line on the white peak.
Shifting any one value pulls it out of sync.

**The gallery reel.** It drifts continuously through all five chapters and loops
seamlessly. Speed is locked to the song's tempo — 76 BPM, measured from the
audio — via `BEATS_PER_PHOTO` (currently `6`, about 4.7 s per photo). Lower it to
speed the reel up; it stays on tempo either way.

### Adding or removing photos

1. Drop files into `gallery/album-N/` as `thumb-NN.jpg` (620×620) and
   `photo-NN.jpg` (long edge 2400px), numbered consecutively from `01`.
2. Update that album's `total` in the `ALBUMS` array.

The reel and viewer pick the change up from `total` — nothing else to edit.

---

## Notes

- The envelope background is the one image still embedded in `index.html`. Its
  opening flap is cut with a `clip-path` traced from that exact crop, so it must
  not be re-cropped or swapped without redoing the trace.
- Browsers will not play audio before a visitor interacts with the page. Opening
  the envelope supplies that interaction; a fallback listener covers anyone
  arriving straight at a `#section` link.
- `dashboard.html` is unlisted, not secured. Anyone with the URL and the key can
  read responses — keep both private.
- Please keep the licensing of the background track in mind before making the
  site public.

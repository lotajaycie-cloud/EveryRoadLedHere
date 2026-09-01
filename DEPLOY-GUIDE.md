# Deploy guide — Claude → GitHub → Vercel

## The mental model

Three places, each with one job:

| | What it is | What it does |
| --- | --- | --- |
| **Claude** | where edits get made | I change the files |
| **GitHub** | the storage / history | keeps every version of the site |
| **Vercel** | the web host | watches GitHub, publishes automatically |

The chain runs one way: **edit → commit → push → live.**
You only ever do the middle bits. Vercel needs no attention once connected.

---

# PART 1 — One-time setup

Do this once. Maybe 15 minutes.

## Step 0 — Move the folder somewhere permanent ⚠️ do this first

The folder currently sits inside Claude's session folder, and that path contains
a **session id** — it is not a permanent home and may disappear later.

Open Terminal (`Cmd + Space`, type `Terminal`, Enter) and paste this **as one
block**:

```bash
mkdir -p ~/Documents/wedding
cp -R "/Users/jayciesorianolota/Library/Application Support/Claude/local-agent-mode-sessions/82529ac9-54bb-4254-ad7f-234c0a8228bd/641b170c-9f5e-4c27-ad8d-84b096bee92e/local_1d639973-5431-4736-afe0-2933e13ad8f1/outputs/jcmj-wedding-site" ~/Documents/wedding/
cd ~/Documents/wedding/jcmj-wedding-site
git log --oneline
```

You should see one line ending in `JC & MJ wedding site`. That is the commit I
already made — the history came with it.

**From here on, `~/Documents/wedding/jcmj-wedding-site` is your project folder.**

## Step 1 — Install the GitHub CLI (easiest auth)

```bash
brew install gh
```

No Homebrew? Install it from <https://brew.sh> first, or skip to the
"Without the CLI" note at the bottom of Part 1.

## Step 2 — Log in to GitHub

```bash
gh auth login
```

Answer: **GitHub.com** → **HTTPS** → **Yes** (authenticate Git) →
**Login with a web browser**. Copy the code shown, press Enter, paste it in the
browser that opens.

## Step 3 — Create the repo and push

```bash
cd ~/Documents/wedding/jcmj-wedding-site
gh repo create jcmj-wedding --private --source=. --remote=origin --push
```

That makes the repo on GitHub *and* uploads everything. It is ~37 MB of
photographs, so give it a minute or two.

Want guests to be able to see the source? Use `--public` instead of `--private`.
Private is fine — Vercel can still deploy it.

## Step 4 — Connect Vercel

1. Go to <https://vercel.com/new> and sign in **with GitHub**.
2. Find `jcmj-wedding` in the list → **Import**.
3. Settings:
   - Framework Preset: **Other**
   - Build Command: **leave empty**
   - Output Directory: **leave empty**
   - Install Command: **leave empty**
4. **Deploy.**

There is genuinely nothing to build — it is plain HTML. Vercel just serves the
folder.

After about a minute you get a URL like `jcmj-wedding.vercel.app`. **That is your
live site.** Open it on your phone and test.

## Step 5 — Custom domain (optional, later)

Vercel → your project → **Settings → Domains → Add**. Vercel tells you which DNS
records to create wherever you bought the domain.

---

### Without the GitHub CLI

If you skipped `gh`: create an empty repo at <https://github.com/new> — **no**
README, **no** .gitignore, this project already has both — then:

```bash
cd ~/Documents/wedding/jcmj-wedding-site
git remote add origin https://github.com/<your-username>/jcmj-wedding.git
git push -u origin main
```

When it asks for a password, that is a **personal access token**, not your GitHub
password (GitHub retired password auth). Make one at
*GitHub → Settings → Developer settings → Personal access tokens → Tokens
(classic) → Generate new token*, tick **repo**, copy it, paste it as the password.

---

# PART 2 — The everyday loop

Once Part 1 is done, every future change is the same three steps.

## Step 1 — Ask me for the change

Same as always: *"make the RSVP button bigger"*, *"swap photo 3 in Camping"*.

## Step 2 — Get the updated files into your folder

**The tidy way (recommended — ask me once):** I can edit your project folder
directly, so this step disappears entirely. Say *"connect my wedding folder"* and
I will request access to `~/Documents/wedding/jcmj-wedding-site`. After that my
edits land straight in your repo and you skip to Step 3 forever.

**The manual way:** I hand you the changed file, you drop it into the folder,
replacing the old one.

## Step 3 — Commit and push

```bash
cd ~/Documents/wedding/jcmj-wedding-site
git add -A
git commit -m "describe what changed"
git push
```

That's it. Vercel notices the push and republishes within a minute or so.
Refresh your live URL to see it.

> **Tip:** if you dislike the terminal, install **GitHub Desktop**
> (<https://desktop.github.com>). Add this folder, and Steps 3 becomes: type a
> message, click *Commit*, click *Push*. Same result, buttons instead of typing.

---

# Part 3 — Connecting the RSVP sheet

Not deployment, but it is the one remaining setup job. Full instructions are in
`README.md`; the short version:

1. New Google Sheet → **Extensions → Apps Script** → paste
   `backend/google-apps-script.gs` → set your own `DASHBOARD_KEY`.
2. **Deploy → New deployment → Web app**, *Execute as: Me*,
   *Who has access: Anyone*. Copy the `/exec` URL.
3. Paste that URL into `index.html` (`rsvpEndpoint`) and into `dashboard.html`
   (`rsvpEndpoint` + the same `dashboardKey`).
4. Commit and push as in Part 2.

Until you do this, RSVPs save into each visitor's own browser rather than
anywhere you can read — fine for testing the design, **not** fine once you send
the link to guests.

---

# Cheat sheet

```bash
# every time you want to publish changes
cd ~/Documents/wedding/jcmj-wedding-site
git add -A
git commit -m "what changed"
git push
```

| Problem | Fix |
| --- | --- |
| `not a git repository` | You are in the wrong folder — run the `cd` line first. |
| Asks for a password forever | It wants a token, not your password. See the note above. |
| Pushed but site looks unchanged | Give Vercel a minute, then hard-refresh (`Cmd+Shift+R`). |
| Deployment failed on Vercel | Check that Build Command and Output Directory are **empty**. |
| Photos missing on the live site | `gallery/`, `images/`, `audio/` must be committed — run `git status` to check nothing is untracked. |

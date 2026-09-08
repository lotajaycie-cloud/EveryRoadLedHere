# Connecting the RSVP to your Google Sheet

These are the steps that connect the RSVP form to your spreadsheet. They are
kept here as a record of the setup, and for when the script needs changing
later.

**Status:** the endpoint is deployed and wired in. See *Where this got to*
below for what was checked and the one setting still outstanding.

---

## Step 1 — Open the script editor

Open your guest list spreadsheet, then **Extensions → Apps Script**.

A new tab opens with a file called `Code.gs` containing a stub
`function myFunction() {}`.

## Step 2 — Paste the script

Select everything in `Code.gs` and delete it. Open
`backend/google-apps-script.gs` from this project, copy the whole file, and
paste it in.

Click the **save icon** (or `Cmd + S`).

## Step 3 — Check two settings at the top

```js
var GUEST_SHEET   = 'Sheet1';
var DASHBOARD_KEY = 'change-this-secret-key';
```

- `GUEST_SHEET` must match the **tab name** at the bottom of your spreadsheet.
  If your tab is called something else, change it here. If you get it wrong the
  script falls back to the first tab, which is probably right anyway.
- `DASHBOARD_KEY` — replace with any phrase of your own. It only guards the
  read-only dashboard, not the form.

Save again.

## Step 4 — Deploy it as a web app

Click **Deploy → New deployment**.

1. Click the **gear icon** next to "Select type" and choose **Web app**.
2. Fill in:
   - **Description:** anything, e.g. `RSVP`
   - **Execute as:** **Me** *(so the script can write to your sheet)*
   - **Who has access:** **Anyone** *(guests are not signed in to Google)*
3. Click **Deploy**.

**"Who has access: Anyone" does not make your sheet public.** It means anyone
can send a reply to the script. The script itself only ever writes column C.

## Step 5 — Authorise, and copy the URL

Google will ask for permission the first time.

1. Click **Authorize access**, choose your Google account.
2. You will see **"Google hasn't verified this app"**. This is expected: you
   wrote the script yourself minutes ago. Click **Advanced**, then
   **Go to (your project name) (unsafe)**.
3. Click **Allow**.

You now get a **Web app URL** ending in `/exec`. Copy it. It looks like:

```
https://script.google.com/macros/s/AKfycb...../exec
```

## Step 6 — Put that URL into the site

Open `index.html`, search for `rsvpEndpoint`, and paste the URL between the
quotes:

```js
rsvpEndpoint: 'https://script.google.com/macros/s/AKfycb...../exec',
```

Save, then commit and push so Vercel picks it up:

```bash
git add -A
git commit -m "Connect the RSVP to the sheet"
git push
```

## Step 7 — Test it with a real code

Open the live site on your phone, go to the RSVP and enter a code you can
verify, for example `G452` (Carl Allen Lim, one person).

Then look at your spreadsheet:

- **Column C** on that guest's row should now read `Yes` or `No`.
- A new tab called **RSVP Log** should have appeared with a timestamped row.

Set column C back to blank afterwards so the real reply is not pre-filled.

---

## ⚠️ The script changed — redeploy it

Guests can now correct a reply, and that needed changes to the Apps Script.
**The copy running in your sheet is the old one.** Paste the current
`backend/google-apps-script.gs` over it, then:

**Deploy → Manage deployments → pencil → Version: New version → Deploy.**

The URL does not change. Until you do this, corrections will still overwrite
column C correctly, but the RSVP Log will gain a second row for that household
instead of rewriting the first, and reopening the form on a different device
will not show what was already sent.

---

## Guests changing their reply

Plans change, so the thank you screen now offers **Change your reply**, and the
form reopens with their previous answers already selected.

What happens on the second send:

- **Column C** is overwritten for each person. It always holds the latest
  answer, never a duplicate.
- **The RSVP Log** rewrites that household's existing row rather than appending
  a new one, so the log reads as current truth. A **Revisions** count and a
  **First replied** date keep the part of the history that matters.
- The form asks the sheet what it already holds when a guest reopens it, so a
  reply sent on a phone appears when they return on a laptop, and a correction
  you make by hand in the sheet is not overwritten by a stale copy in their
  browser.

This means **you can safely edit column C yourself**. If you correct someone by
hand and they later reopen the form, they will see your correction rather than
their old answer.

## Where this got to

Two checks were run against the deployed URL.

**First attempt** returned a Google sign-in page. That meant *Who has access*
was not set to **Anyone**, so a guest's browser would follow the redirect, the
post would never arrive, and the site would quietly store the answer locally
and thank them anyway. A silent success.

**Second attempt**, after that was changed, returned:

```json
{"ok":false,"error":"unauthorised"}
```

That is the right answer and the setup is working. The script is now reachable
without a Google login, which is the part guests need. `unauthorised` refers
only to the reading key, and **the RSVP form never sends a key** — only the
dashboard does. In the script, `doPost` has no mention of `DASHBOARD_KEY` at
all; only `doGet` checks it.

So replies from the site should now be reaching column C.

### The one thing still to set

`dashboard.html` has:

```js
dashboardKey: 'change-this-secret-key',
```

Change that to whatever you set `DASHBOARD_KEY` to in the Apps Script. They
have to match, and that is the only thing the `unauthorised` message was about.
It does not affect guests replying.

### Proving it end to end

Nobody has posted a real reply yet, so the write path is untested against your
live sheet. Two minutes:

1. Open the live site, RSVP, enter **G452** (Carl Allen Lim, one person).
2. Choose either answer and send.
3. In the spreadsheet, his row in **column C** should read `Yes` or `No`, and a
   new **RSVP Log** tab should have appeared with a timestamped row.
4. Clear column C afterwards so his real reply is not pre-filled.

If column C stays blank but the log tab appears, look at the log's **Not
matched** column: that names anyone whose row could not be found, almost always
a trailing space in column A.

---

## If it doesn't work

**Nothing appears in the sheet, and the site still says thank you.**
That is the fallback doing its job: the form always thanks the guest so nobody
is left staring at an error, and stores the answer locally instead. So a
silent success is the symptom to look for. Check `rsvpEndpoint` is actually
filled in on the *deployed* site, not just on your computer, by opening the
live page and using View Source to search for `rsvpEndpoint`.

**Column C stays blank but the RSVP Log tab fills up.**
The log's **Not matched** column will name the guests it could not find. That
means the name on the site does not match the name in column A, usually a
trailing space or a changed spelling. Fix the sheet, or regenerate the guest
list in `index.html` from the sheet.

**You changed the script after deploying.**
A saved change is not a deployed change. Go to **Deploy → Manage deployments**,
click the **pencil**, set Version to **New version**, and click **Deploy**. The
URL stays the same.

**You want to check the script by itself.**
Paste the `/exec` URL into a browser with `?key=` and your `DASHBOARD_KEY`:

```
https://script.google.com/macros/s/AKfycb...../exec?key=your-secret
```

You should get a wall of JSON listing every guest with their confirmation, plus
counts of yes, no and pending. If you get `{"ok":false,"error":"unauthorised"}`
the key does not match. If you get an HTML error page, the deployment is not
set to "Anyone".

---

## Changing the guest list later

Edit the spreadsheet, then ask for the `GUESTS` block in `index.html` to be
regenerated from it. Do not hand-edit that block: if the two lists drift apart,
a guest can pass the gate and then fail to match a row, and their answer will
land in the log's Not matched column instead of column C.

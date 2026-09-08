# Connecting the RSVP to your Google Sheet

These are the steps that connect the RSVP form to your spreadsheet. They are
kept here as a record of the setup, and for when the script needs changing
later.

**Status: confirmed working.** The script is deployed, running the current
version, and wired into the site. See *Where this got to* for what was checked
and the two things left to do.

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

The guest sheet now takes six columns rather than three, and guests can correct
a reply. Both needed changes to the Apps Script.

```
A  Main Guest    B  Code     C  Confirmation
D  Contact Number    E  Email    F  Message
```

Contact details are given once per household, so **every person on that code
gets the same three values on their own row**. Each row is then complete by
itself and you can sort or filter by any column without a guest losing their
number. Headers for D, E and F are written automatically, but only into cells
that are empty, so anything you have put there yourself is left alone.

Paste the current `backend/google-apps-script.gs` over the copy in your sheet,
then **Deploy → Manage deployments → pencil → Version: New version → Deploy.**

Editing the existing deployment keeps the same URL. Creating a *new* deployment
instead gives you a different URL, which then has to be pasted into the site
again. Either works; the second is just more steps. Until you do this, corrections will still overwrite
column C correctly, but the RSVP Log will gain a second row for that household
instead of rewriting the first, and reopening the form on a different device
will not show what was already sent.

---

## Adding a guest later

Add the name and their code to the spreadsheet. That is the whole job: no
rebuild of `index.html`, no redeploy of the script, no push.

The form asks the sheet for whoever holds the code that a guest types, so a
name saved in the spreadsheet is live the moment you save it. Adding someone
to an existing household works the same way; they appear on that code's form.

Two details worth knowing:

- **A code already in the page opens immediately**, then quietly corrects
  itself from the sheet a moment later. Guests never wait on the network for
  the eighty-eight households that existed when the page was built. A code the
  page does not recognise shows "Checking your code…" while it asks.
- **If the sheet cannot be reached**, the form falls back to the list built
  into the page, so a guest is never stuck because Google is slow. The
  consequence is that a *newly added* guest could not open the form during an
  outage, where an existing one still could.

The copy of the guest list inside `index.html` is now a fallback rather than
the source of truth. It is still worth regenerating occasionally so the
fallback does not drift far from the sheet, but nothing breaks if you do not.

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

Three checks, each ruling something out.

**One.** The URL returned a Google sign-in page. That meant *Who has access*
was not **Anyone**, so a guest's browser would follow the redirect, the reply
would never arrive, and the site would store it locally and thank them anyway.
A silent success, which is the hardest kind of failure to notice.

**Two.** After that was changed it returned `{"ok":false,"error":"unauthorised"}`.
Reachable without a login, which is the part guests need. That message is only
about the reading key; the form never sends one.

**Three.** After the redeploy, `?code=G401` returned:

```json
{"ok":true,"code":"G401","party":[
  {"name":"Raquel Verano-Lim","confirmation":"","phone":"","email":"","message":""},
  {"name":"Jhep Lim","confirmation":"","phone":"","email":"","message":""}]}
```

Everything worth knowing is in that one response:

- `ok:true` and no login prompt, so access is right.
- The correct household came back for that code, so the script is reading the
  guest sheet and `GUEST_SHEET` matches the real tab.
- `phone`, `email` and `message` are present as keys. Those exist only in the
  current version of the script, so the deployment is running the latest code
  and columns D, E and F will be written.
- All values are empty, which is correct: nobody has replied yet.

### The two things left

**Set the dashboard key.** In `dashboard.html`, change
`dashboardKey: 'change-this-secret-key'` to match `DASHBOARD_KEY` in the script.
This only affects the dashboard you use; guests are unaffected.

**Prove the write.** Everything above tests reading. Nothing has been written to
the sheet yet, because posting a test would put a row in your real guest data.
On the live site, RSVP with **G452** (Carl Allen Lim, one person), fill in a
number, and send. Then check his row:

| C | D | E | F |
|---|---|---|---|
| Yes or No | the number | the email | the message |

and a new **RSVP Log** tab. Clear those cells afterwards so his real reply is
not pre-filled.

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

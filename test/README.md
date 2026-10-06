# Portal UI harness

Runs the **real** portal bundle inside `jsdom`, against the **real**
backend and the **real** MySQL database — React effects run, `fetch` is
live, and every assertion reads only what React actually rendered into
`#root`.

It exists because this environment has no browser available. It is not a
replacement for clicking through the app yourself; it's a fast regression
check that the pages mount, the API contracts still match, and the
account-type rules still hold.

## Running it

With MySQL running, the backend on `:5000`, and `npm run build` done:

```
cd "student & alumni portal"
npm install --no-save jsdom@24     # test-only dependency
node test/build-bundle.mjs         # bundles as IIFE — jsdom has no ES module loader
node test/ui-harness.mjs
```

## What it checks (41 assertions)

- The shared sign-in renders, offers Student / Alumni options, and offers no registration path
- A student signs in and lands on the **student** dashboard, with student
  navigation and no alumni links
- Document Queue lists only that student's own tickets, expands one, and
  shows its guidance, e-signature routing progress, and final signed copy
- A student opening an **alumni** URL is redirected to their own home
- Scholarships shows open postings, marks a passed deadline, and marks an
  already-filed application
- SAA Chat loads both sides of the thread, shows an unsent placeholder,
  and sends a new message from the UI
- Every remaining student page mounts without error
- The **same login panel** then signs in an alumni account, which lands on
  the **alumni** dashboard with alumni navigation and no student links
- The tracer profile loads its saved values into the form fields
- An alumni opening a **student** URL is redirected away

A note on a trap worth remembering: an early version of this harness read
`document.body.textContent`, which includes the contents of `<script>`
elements. Assertions "passed" by matching strings inside the bundle's own
source while React had not rendered at all. It now evaluates the bundle
and reads only `#root`.


## `ui-new-features.mjs` — the revision round

Checks the newer behaviour (floating FAQ box, real author names on Campus Feed,
photo picker / Settings logo / Student Leaders branding, chat photos). Unlike
`ui-harness.mjs` it does **not** need a pristine database; point it at any
running backend:

```
node test/build-bundle.mjs
BACKEND=http://localhost:5000 STUDENT_PASSWORD=... node test/ui-new-features.mjs
```

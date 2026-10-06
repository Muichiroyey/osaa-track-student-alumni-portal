// Runs the REAL built portal bundle inside jsdom, against the REAL backend.
// Effects run, fetch is real, React renders — the closest thing to a browser
// available in this environment.
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";

const DIST = "../dist";
const BACKEND = "http://localhost:5000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e.detail?.stack || e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost:5174/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
  resources: undefined,
});
const { window } = dom;

// Node's fetch, with relative /api URLs pointed at the live backend.
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const target = url.startsWith("/") ? BACKEND + url : url;
  try {
    const res = await fetch(target, init);
    console.log(`   [fetch] ${init?.method || "GET"} ${target} -> ${res.status}`);
    return res;
  } catch (e) {
    console.log(`   [fetch FAILED] ${target}: ${e.message}`);
    throw e;
  }
};
window.URL.createObjectURL = () => "blob:mock";
window.URL.revokeObjectURL = () => {};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });

// Execute the IIFE bundle. Evaluated rather than injected as a <script>
// element, so the bundle's own source text can never be mistaken for
// rendered page content by the assertions below.
const bundle = fs.readFileSync("harness-bundle.js", "utf8");
window.eval(bundle);

const text = () => (window.document.getElementById("root")?.textContent || "").replace(/\s+/g, " ").trim();
const q = (sel) => window.document.getElementById("root")?.querySelector(sel) || null;
const byText = (tag, t) =>
  [...(window.document.getElementById("root")?.querySelectorAll(tag) || [])].find((el) => el.textContent.trim().toLowerCase().includes(t.toLowerCase()));

function set(el, value) {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}
const click = (el) => {
  if (!el) throw new Error("click(): element not found");
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
};
const submitForm = () => q("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
async function signIn(email, password, accountType) {
  // The sign-in page makes the person pick Student or Alumni first.
  const radio = q(`input[name="accountType"][value="${accountType}"]`);
  if (!radio) throw new Error("account type option not found: " + accountType);
  radio.click();
  await sleep(100);
  set(q("#email"), email);
  set(q("#password"), password);
  await sleep(150);
  if (q("#email").value !== email) throw new Error("controlled input did not take the value");
  submitForm();
  await sleep(2500);
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? " — " + detail : ""}`);
};

await sleep(1200);
console.log("\n── Login screen ──");
check("renders the shared sign-in", text().includes("Sign In"), "");
check("labelled for both user types", text().includes("STUDENT & ALUMNI"));
check("offers Student and Alumni options", !!q('input[name="accountType"][value="student"]') && !!q('input[name="accountType"][value="alumni"]'));
check("no registration offered", !text().toLowerCase().includes("create an account") && !text().toLowerCase().includes("sign up"));

console.log("\n── Signing in as a STUDENT ──");
console.log("   inputs found:", [...window.document.getElementById("root").querySelectorAll("input")].map(i=>i.id||i.type).join(", ") || "(none)");
console.log("   forms:", window.document.getElementById("root").querySelectorAll("form").length, "buttons:", window.document.querySelectorAll("button").length);
await signIn("demo.student@psu.edu.ph", "portal123", "student");

console.log("   after sign-in, #root text:", text().slice(0, 1200) || "(empty)");
console.log("   token stored:", Boolean(window.localStorage.getItem("osaa_track_portal_token") || window.sessionStorage.getItem("osaa_track_portal_token")));
const t1 = text();
check("lands on the student dashboard", t1.includes("Welcome back"), t1.match(/Welcome back, \w+/)?.[0] || "");
check("header badge reads Student", t1.includes("Student"));
check("student navigation present", ["Scholarships", "My Achievements", "Campus Feed", "Student Leaders Directory"].every((l) => t1.includes(l)));
check("alumni-only nav absent", !t1.includes("Job Opportunities") && !t1.includes("Alumni Profile"));
check("dashboard cards rendered", t1.includes("Document Queue") && t1.includes("Announcements"));
check("activity feed rendered", t1.includes("Activity updates"));

console.log("\n── Student: Document Queue ──");
window.history.pushState({}, "", "/document-queue");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await sleep(1500);
let t = text();
check("document queue loads own tickets", t.includes("#SAA-14"), "");
check("counts row rendered", t.includes("Pending SAA") && t.includes("Needs revision"));
check("submit action available", Boolean(byText("button", "Submit a document")));

click([...(window.document.getElementById("root")?.querySelectorAll("button") || [])].find((b) => b.textContent.includes("#SAA-14")));
await sleep(1200);
t = text();
check("ticket expands with guidance", t.includes("Signed and released") || t.includes("Approved"), "");
check("shows e-signature routing office", t.includes("CCS (Dean)"));
check("final signed copy offered", t.includes("Final signed copy"));

console.log("\n── Student: type gate on an alumni URL ──");
window.history.pushState({}, "", "/jobs");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await sleep(1200);
t = text();
check("student redirected away from /jobs", !t.includes("Verified vacancies"), "landed on: " + (t.includes("Welcome back") ? "own dashboard" : "?"));

console.log("\n── Student: Scholarships ──");
window.history.pushState({}, "", "/scholarships");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await sleep(1500);
t = text();
check("open scholarships listed", t.includes("PSU Academic Excellence Grant"));
check("closed posting marked", t.includes("Deadline passed"));
check("already-applied state shown", t.includes("Already applied"));

console.log("\n── Student: SAA Chat ──");
window.history.pushState({}, "", "/saa-chat");
window.dispatchEvent(new window.PopStateEvent("popstate"));
await sleep(2000);
t = text();
check("chat thread loads", t.includes("Office of Student and Alumni Affairs"));
check("shows earlier student message", t.includes("Good morning po"));
check("shows SAA reply", t.includes("approved for e-signing"));
check("unsent message placeholder", t.includes("You unsent a message"));

const ta = q("textarea");
if (ta) {
  set(ta, "Testing from the portal UI.");
  await sleep(200);
  const sendBtn = [...(window.document.getElementById("root")?.querySelectorAll("button") || [])].filter((b) => !b.disabled).pop();
  click(sendBtn);
  await sleep(2000);
  check("sent a new message from the UI", text().includes("Testing from the portal UI"));
}

console.log("\n── Student: other pages render ──");
for (const [route, needle] of [
  ["/announcements", "Announcements"],
  ["/campus-feed", "Campus Feed"],
  ["/achievements", "My Achievements"],
  ["/student-leaders", "Student Leaders Directory"],
  ["/faq", "Frequently Asked Questions"],
  ["/settings", "Change password"],
]) {
  window.history.pushState({}, "", route);
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await sleep(1300);
  check(`${route} renders`, text().includes(needle));
}

console.log("\n── Switching to the ALUMNI account (same login panel) ──");
const signOut = byText("button", "Sign out") || (click(q("header button:last-of-type")), await sleep(300), byText("button", "Sign out"));
if (signOut) click(signOut);
await sleep(1500);
if (!q("#email")) {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/login");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await sleep(800);
}
if (q("#email")) {
  await signIn("demo.alumni@psu.edu.ph", "portal123", "alumni");
  t = text();
  check("alumni lands on their own dashboard", t.includes("Welcome back"));
  check("header badge reads Alumni", t.includes("Alumni"));
  check("alumni navigation present", t.includes("Job Opportunities") && t.includes("Alumni Profile"));
  check("student-only nav absent", !t.includes("Scholarships") && !t.includes("My Achievements") && !t.includes("Campus Feed"));

  window.history.pushState({}, "", "/jobs");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await sleep(1500);
  check("alumni can open Job Opportunities", text().includes("Junior Software Developer"));

  window.history.pushState({}, "", "/profile");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await sleep(1500);
  // Form values live in input.value, not textContent — read the fields.
  const fieldValues = [...(window.document.getElementById("root")?.querySelectorAll("input, select, textarea") || [])].map((el) => el.value);
  console.log("   profile field values:", JSON.stringify(fieldValues));
  check("tracer profile loads saved employer", fieldValues.includes("Bank of the Philippine Islands"));
  check("tracer profile loads saved batch year", fieldValues.includes("2021"));
  check("tracer profile loads employment status", fieldValues.includes("Employed"));
  check("employer field only shown when employed", text().includes("Employer / company"));

  window.history.pushState({}, "", "/scholarships");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await sleep(1200);
  check("alumni redirected away from /scholarships", !text().includes("Open scholarships"));
} else {
  check("could reach login again for alumni", false, "sign-out did not return to login");
}

console.log("\n══ SUMMARY ══");
const passed = results.filter((r) => r.ok).length;
console.log(`${passed}/${results.length} checks passed`);
const failed = results.filter((r) => !r.ok);
if (failed.length) console.log("FAILED:\n" + failed.map((f) => "  - " + f.name).join("\n"));
if (errors.length) {
  console.log("\nRUNTIME ERRORS:");
  [...new Set(errors)].slice(0, 12).forEach((e) => console.log("  " + e.slice(0, 260)));
} else {
  console.log("\n✓ no uncaught runtime errors");
}
process.exit(0);

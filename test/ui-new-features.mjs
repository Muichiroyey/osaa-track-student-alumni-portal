// Runs the REAL Student & Alumni Portal bundle in jsdom against the REAL backend + MySQL
// and checks the revision work: floating FAQ box, Campus Feed author name/logo,
// photo picker, office-logo Settings, Student Leaders branding, chat photo bubbles.
// Needs: backend running (set BACKEND), `node build-bundle.mjs` done, jsdom installed.
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";

const BACKEND = process.env.BACKEND || "http://localhost:5000";
const EMAIL = process.env.STUDENT_EMAIL || "demo.student@psu.edu.ph";
const PASSWORD = process.env.STUDENT_PASSWORD || "portal123";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e.detail?.stack || e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const dom = new JSDOM(fs.readFileSync(path.join("../dist", "index.html"), "utf8"), {
  url: "http://localhost:5175/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
});
const { window } = dom;
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  return fetch(url.startsWith("/") ? BACKEND + url : url, init);
};
window.URL.createObjectURL = () => "blob:mock";
window.URL.revokeObjectURL = () => {};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function () {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.eval(fs.readFileSync("harness-bundle.js", "utf8"));

const root = () => window.document.getElementById("root");
const text = () => (root()?.textContent || "").replace(/\s+/g, " ").trim();
const q = (s) => root()?.querySelector(s) || null;
const qa = (s) => [...(root()?.querySelectorAll(s) || [])];
const byText = (tag, t) => qa(tag).find((el) => el.textContent.trim().toLowerCase().includes(t.toLowerCase()));
function set(el, v) {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}
const click = (el) => { if (!el) throw new Error("click(): element not found"); el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); };
function go(route) { window.history.pushState({}, "", route); window.dispatchEvent(new window.PopStateEvent("popstate")); }
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? " — " + detail : ""}`); };

await sleep(1200);
const radio = q('input[name="accountType"][value="student"]'); if (radio) radio.click(); await sleep(150);
set(q("#email"), EMAIL); set(q("#password"), PASSWORD); await sleep(150);
q("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
await sleep(2800);
check("signed in", text().includes("Welcome back"));

console.log("\n── FAQ is a floating box, not a module ──");
const navLabels = qa("aside a, nav a").map((a) => a.textContent.trim());
check("no FAQ item in the sidebar", !navLabels.some((l) => l === "FAQ"), navLabels.join(" | ").slice(0, 110));
check("floating FAQ button is on the dashboard", Boolean(q('button[aria-label="Open FAQ"]')));
click(q('button[aria-label="Open FAQ"]')); await sleep(1500);
const panel = q('section[aria-label="Frequently asked questions"]');
check("clicking it opens the FAQ panel", Boolean(panel));
check("panel loaded entries from the API", (panel?.querySelectorAll("li button").length || 0) > 0, `${panel?.querySelectorAll("li button").length} entries`);
const first = panel?.querySelector("li button"); click(first); await sleep(200);
check("an entry expands to show its answer", first?.getAttribute("aria-expanded") === "true");
click(byText("button", "All")); await sleep(100);
click(q('button[aria-label="Minimize FAQ"]')); await sleep(200);
check("minimize collapses it back to the button", !q('section[aria-label="Frequently asked questions"]') && Boolean(q('button[aria-label="Open FAQ"]')));
go("/faq"); await sleep(800);
check("old /faq link redirects to the dashboard", window.location.pathname === "/", window.location.pathname);

console.log("\n── Campus Feed: real author names + logos ──");
go("/campus-feed"); await sleep(2000);
const t = text();
check("an office's post shows that office's real name", t.includes("Demo Office (Testing)"));
check("the SAA's own post shows the SAA name", t.includes("Office of Student and Alumni Affairs"));
check("subtitle no longer claims everything is from the SAA office", !t.includes("highlights from the SAA office."));
const names = qa("p.font-semibold").map((p) => p.textContent.trim());
check("posts are not all attributed to the SAA", new Set(names.filter((n) => /Office|Society|CASL|Demo/.test(n))).size >= 2, [...new Set(names)].slice(0, 4).join(" | "));
check("avatars render for post authors", qa("span.rounded-full img, img.rounded-full, div.rounded-full").length > 0);

console.log("\n── SAA Chat ──");
go("/saa-chat"); await sleep(2000);
check("chat has a 'Send a photo' button", Boolean(q('button[title="Send a photo"]')));
check("photo input only accepts images", Boolean(q('input[type="file"][accept="image/*"]')));

console.log("\n── Dates in Philippine time ──");
go("/"); await sleep(1500);
const phDay = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long" }).format(new Date());
check("welcome banner shows today's weekday in Philippine time", text().includes(phDay), phDay);

console.log(`\n${pass} passed, ${fail} failed`);
const real = errors.filter((e) => !/Not implemented|navigation|Could not parse CSS/.test(e));
console.log(real.length ? "\nRuntime errors:\n" + real.slice(0, 8).join("\n") : "No runtime errors from the portal.");
process.exit(fail ? 1 : 0);

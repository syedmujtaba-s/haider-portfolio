"use strict";
/* Shared helpers for the portfolio access-request API (Firestore + Resend). */

const crypto = require("crypto");
const admin = require("firebase-admin");

/* ---------- Firebase Admin (lazy singleton) ---------- */
function getDb() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
    let creds;
    try {
      creds = JSON.parse(raw);
    } catch (e) {
      // allow the key to be provided base64-encoded
      creds = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    }
    if (creds.private_key && creds.private_key.indexOf("\\n") !== -1) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }
  return admin.firestore();
}

/* ---------- Tokens / sanitising ---------- */
function token(bytes) {
  return crypto.randomBytes(bytes || 24).toString("hex");
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function isEmail(s) {
  return typeof s === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 200;
}

/* ---------- Request body / base URL ---------- */
function readJson(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") {
      try { return resolve(JSON.parse(req.body || "{}")); } catch (e) { return resolve({}); }
    }
    var data = "";
    req.on("data", function (c) { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", function () { try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); } });
    req.on("error", function () { resolve({}); });
  });
}

function baseUrl(req) {
  var proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  var host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return proto + "://" + host;
}

function clientIp(req) {
  var fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket && req.socket.remoteAddress || "unknown";
}

/* ---------- Rate limit (Firestore transaction) ---------- */
async function rateLimitOk(db, bucket, max, windowMs) {
  var ref = db.collection("rateLimits").doc(String(bucket).replace(/[^\w.:-]/g, "_").slice(0, 200));
  try {
    return await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var now = Date.now();
      var count = 0;
      var windowStart = now;
      if (snap.exists) {
        var d = snap.data();
        if (now - d.windowStart < windowMs) { count = d.count; windowStart = d.windowStart; }
      }
      if (count >= max) return false;
      tx.set(ref, { count: count + 1, windowStart: windowStart });
      return true;
    });
  } catch (e) {
    // fail open on limiter errors so a real visitor is never wrongly blocked
    return true;
  }
}

/* ---------- Email (Resend REST) ---------- */
async function sendOwnerEmail(opts) {
  var key = process.env.RESEND_API_KEY;
  var to = process.env.OWNER_EMAIL;
  var from = process.env.FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  if (!key || !to) throw new Error("Email is not configured (RESEND_API_KEY / OWNER_EMAIL)");
  var r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: from, to: to, subject: opts.subject, html: opts.html })
  });
  if (!r.ok) {
    var t = await r.text();
    throw new Error("Resend error " + r.status + ": " + t);
  }
  return r.json();
}

/* ---------- Small HTML page (owner-facing approve/deny result) ---------- */
function htmlPage(title, body, color) {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(title) + "</title>" +
    "<style>body{font-family:Segoe UI,Arial,Helvetica,sans-serif;background:#f3f7fa;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}" +
    ".card{background:#fff;max-width:460px;width:100%;padding:40px;border-radius:16px;box-shadow:0 14px 40px rgba(16,47,78,.12);text-align:center}" +
    "h1{margin:0 0 12px;color:" + color + ";font-size:1.6rem}p{color:#5d6e79;line-height:1.6;margin:.4rem 0}</style></head>" +
    '<body><div class="card"><h1>' + escapeHtml(title) + "</h1>" + body + "</div></body></html>"
  );
}

module.exports = {
  getDb: getDb,
  token: token,
  escapeHtml: escapeHtml,
  isEmail: isEmail,
  readJson: readJson,
  baseUrl: baseUrl,
  clientIp: clientIp,
  rateLimitOk: rateLimitOk,
  sendOwnerEmail: sendOwnerEmail,
  htmlPage: htmlPage
};

"use strict";
/* GET /api/approve?id=...&s=...  -> owner approves; mints a 72h download token. */

const { getDb, token, escapeHtml, htmlPage } = require("../lib/util.js");

const DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = String((req.query && req.query.id) || "").trim();
    const s = String((req.query && req.query.s) || "").trim();
    if (!id || !s) return res.status(400).send(htmlPage("Invalid link", "<p>This approval link is incomplete.</p>", "#e06363"));

    const db = getDb();
    const ref = db.collection("accessRequests").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(410).send(htmlPage("Request not found", "<p>This request has expired or no longer exists.</p>", "#e06363"));

    const r = snap.data();
    if (r.approveSecret !== s) return res.status(403).send(htmlPage("Invalid link", "<p>This approval link is not valid.</p>", "#e06363"));

    if (r.status !== "approved") {
      await ref.update({
        status: "approved",
        downloadToken: token(24),
        decidedAt: Date.now(),
        downloadExpiresAt: Date.now() + DOWNLOAD_TTL_MS
      });
    }

    return res.status(200).send(
      htmlPage(
        "Approved ✓",
        "<p>You approved access for <b>" + escapeHtml(r.name) + "</b><br>(" + escapeHtml(r.email) + ").</p>" +
        "<p>Their download unlocks on the website automatically and stays valid for 72 hours.</p>",
        "#1f9d57"
      )
    );
  } catch (e) {
    console.error("approve error:", e && e.message);
    return res.status(500).send(htmlPage("Something went wrong", "<p>Could not process this approval. Please try the link again.</p>", "#e06363"));
  }
};

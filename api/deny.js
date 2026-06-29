"use strict";
/* GET /api/deny?id=...&s=...  -> owner denies the request. */

const { getDb, escapeHtml, htmlPage } = require("../lib/util.js");

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = String((req.query && req.query.id) || "").trim();
    const s = String((req.query && req.query.s) || "").trim();
    if (!id || !s) return res.status(400).send(htmlPage("Invalid link", "<p>This link is incomplete.</p>", "#e06363"));

    const db = getDb();
    const ref = db.collection("accessRequests").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(410).send(htmlPage("Request not found", "<p>This request has expired or no longer exists.</p>", "#e06363"));

    const r = snap.data();
    if (r.approveSecret !== s) return res.status(403).send(htmlPage("Invalid link", "<p>This link is not valid.</p>", "#e06363"));

    if (r.status !== "denied") {
      await ref.update({ status: "denied", decidedAt: Date.now(), downloadToken: "", downloadExpiresAt: 0 });
    }

    return res.status(200).send(
      htmlPage(
        "Request denied",
        "<p>You declined access for <b>" + escapeHtml(r.name) + "</b><br>(" + escapeHtml(r.email) + ").</p>" +
        "<p>They will be told the request was not approved.</p>",
        "#102f4e"
      )
    );
  } catch (e) {
    console.error("deny error:", e && e.message);
    return res.status(500).send(htmlPage("Something went wrong", "<p>Could not process this action. Please try the link again.</p>", "#e06363"));
  }
};

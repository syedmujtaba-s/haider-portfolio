"use strict";
/* GET /api/status?id=...  -> { status, downloadUrl? }  (id is the visitor's secret) */

const { getDb } = require("../lib/util.js");

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = String((req.query && req.query.id) || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const db = getDb();
    const snap = await db.collection("accessRequests").doc(id).get();
    if (!snap.exists) return res.status(200).json({ status: "expired" });

    const r = snap.data();
    if (r.status === "approved") {
      if (r.downloadExpiresAt && Date.now() > r.downloadExpiresAt) {
        return res.status(200).json({ status: "expired" });
      }
      return res.status(200).json({
        status: "approved",
        downloadUrl: "/api/download?id=" + id + "&t=" + r.downloadToken
      });
    }
    if (r.status === "denied") {
      return res.status(200).json({
        status: "denied",
        deniedAt: r.deniedAt || r.decidedAt || 0,
        consecutiveDenials: r.consecutiveDenials || 1
      });
    }
    return res.status(200).json({ status: r.status || "pending" });
  } catch (e) {
    console.error("status error:", e && e.message);
    return res.status(500).json({ error: "Could not check status." });
  }
};

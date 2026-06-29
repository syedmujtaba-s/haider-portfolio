"use strict";
/* GET /api/download?id=...&t=...  -> validates the token, then streams the private PDF. */

const fs = require("fs");
const path = require("path");
const { getDb } = require("../lib/util.js");

const PDF_PATH = path.join(process.cwd(), "private", "Haider-Ali-BIM-Portfolio.pdf");

module.exports = async function (req, res) {
  try {
    const id = String((req.query && req.query.id) || "").trim();
    const t = String((req.query && req.query.t) || "").trim();
    if (!id || !t) return res.status(400).send("Missing download token.");

    const db = getDb();
    const snap = await db.collection("accessRequests").doc(id).get();
    if (!snap.exists) return res.status(403).send("This download link is no longer valid.");

    const r = snap.data();
    const valid =
      r.status === "approved" &&
      r.downloadToken &&
      r.downloadToken === t &&
      (!r.downloadExpiresAt || Date.now() <= r.downloadExpiresAt);

    if (!valid) return res.status(403).send("This download link is invalid or has expired.");

    let buf;
    try {
      buf = fs.readFileSync(PDF_PATH);
    } catch (e) {
      console.error("download read error:", e && e.message);
      return res.status(500).send("File temporarily unavailable.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Haider-Ali-BIM-Portfolio.pdf"');
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(buf);
  } catch (e) {
    console.error("download error:", e && e.message);
    return res.status(500).send("Could not process the download.");
  }
};

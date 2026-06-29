"use strict";
/* POST /api/request-access  -> creates a pending request and emails the owner. */

const { getDb, token, emailKey, escapeHtml, isEmail, readJson, publicBaseUrl, clientIp, rateLimitOk, sendOwnerEmail } = require("../lib/util.js");

const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000; // 2 days between requests after a denial
const MAX_CONSECUTIVE_DENIALS = 3;

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const db = getDb();

    // Light abuse protection: max 5 requests per IP per hour, plus a global
    // backstop so spoofed IPs cannot flood the owner's inbox without bound.
    const ok = await rateLimitOk(db, "req:" + clientIp(req), 5, 60 * 60 * 1000);
    if (!ok) return res.status(429).json({ error: "Too many requests. Please try again in a little while." });
    const okGlobal = await rateLimitOk(db, "global:email", 60, 60 * 60 * 1000);
    if (!okGlobal) return res.status(429).json({ error: "The site is handling a lot of requests right now. Please try again later." });

    const body = await readJson(req);
    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().slice(0, 200);
    const reason = String(body.reason || "").trim().slice(0, 1000);

    if (!name) return res.status(400).json({ error: "Please enter your name." });
    if (!isEmail(email)) return res.status(400).json({ error: "Please enter a valid email address." });

    // Per-email policy: lock after consecutive denials, and enforce the cooldown
    // after a denial. Enforced server-side so clearing the browser cannot bypass it.
    const rkey = emailKey(email);
    const rsnap = await db.collection("requesters").doc(rkey).get();
    if (rsnap.exists) {
      const rd = rsnap.data();
      if ((rd.consecutiveDenials || 0) >= MAX_CONSECUTIVE_DENIALS) {
        return res.status(403).json({ error: "You have reached the request limit for this email. Please get in touch through the contact section and we can sort it out." });
      }
      if (rd.lastDeniedAt && Date.now() < rd.lastDeniedAt + COOLDOWN_MS) {
        const when = new Date(rd.lastDeniedAt + COOLDOWN_MS);
        return res.status(429).json({ error: "This email was recently declined. You can send a new request after " + when.toDateString() + "." });
      }
    }

    // Supersede this email's earlier still-pending requests so the owner only
    // ever has one live request per person, and old approval emails go dead.
    try {
      const prior = await db.collection("accessRequests").where("email", "==", email).get();
      const batch = db.batch();
      let superseded = 0;
      prior.forEach(function (doc) {
        if (doc.data().status === "pending") {
          batch.update(doc.ref, { status: "superseded", supersededAt: Date.now() });
          superseded++;
        }
      });
      if (superseded > 0) await batch.commit();
    } catch (e) {
      console.error("supersede error:", e && e.message); // non-fatal
    }

    const id = token(16);
    const approveSecret = token(16);

    await db.collection("accessRequests").doc(id).set({
      name: name,
      email: email,
      reason: reason,
      status: "pending",
      approveSecret: approveSecret,
      createdAt: Date.now(),
      ip: clientIp(req)
    });

    const base = publicBaseUrl();
    const approveUrl = base + "/api/approve?id=" + id + "&s=" + approveSecret;
    const denyUrl = base + "/api/deny?id=" + id + "&s=" + approveSecret;

    await sendOwnerEmail({
      subject: "Portfolio access request from " + name,
      html:
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#16242e">' +
        '<h2 style="color:#102f4e">New portfolio access request</h2>' +
        "<p><b>Name:</b> " + escapeHtml(name) + "</p>" +
        "<p><b>Email:</b> " + escapeHtml(email) + "</p>" +
        "<p><b>Reason:</b> " + (escapeHtml(reason) || "<i>(none given)</i>") + "</p>" +
        '<p style="margin:26px 0">' +
        '<a href="' + escapeHtml(approveUrl) + '" style="background:#2f7fc4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Approve</a>' +
        "&nbsp;&nbsp;&nbsp;" +
        '<a href="' + escapeHtml(denyUrl) + '" style="background:#e06363;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Deny</a>' +
        "</p>" +
        '<p style="color:#8a98a3;font-size:12px">After you click Approve, the requester sees their download unlock automatically. This request expires in 7 days.</p>' +
        "</div>"
    });

    return res.status(200).json({ id: id });
  } catch (e) {
    console.error("request-access error:", e && e.message);
    return res.status(500).json({ error: "Could not submit your request right now. Please try again later." });
  }
};

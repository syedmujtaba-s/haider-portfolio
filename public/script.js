/* ============================================================
   Haider Ali, portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Gallery data (PDF page renders) ---------- */
  var PAGES = "assets/pages/page-";
  function pageSrc(n) { return PAGES + (n < 10 ? "0" + n : n) + ".jpg"; }

  var GALLERIES = {
    office:        { title: "Commercial Office Building",        pages: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
    tahir:         { title: "Tahir Residency",                   pages: [15, 14, 16, 17, 18, 19] },
    tower:         { title: "Mount Khalid Tower 04 (Internship)", pages: [38] },
    masjid:        { title: "Jamia Masjid Islamgarh (Final Year Project)", pages: [40] },
    eight:         { title: "8-Storey Mixed-Use Building",        pages: [39] },
    parametric:    { title: "Parametric Revit Families",          pages: [20, 21, 22, 23, 24, 25, 26] },
    reinforcement: { title: "Structure Reinforcement Detailing",  pages: [29, 30, 31, 32, 33, 34] },
    dynamo:        { title: "Dynamo Automation Scripts",          pages: [35, 36] },
    solar:         { title: "Solar Study",                        pages: [27, 28] },
    scheduling:    { title: "Scheduling & Cost Estimation",       pages: [37] },
    certs:         { title: "Certifications & Internship",        pages: [4] }
  };

  /* ---------- Header scroll state ---------- */
  var header = $("#header");
  var toTop = $("#toTop");
  function onScroll() {
    var y = window.pageYOffset;
    header.classList.toggle("scrolled", y > 60);
    toTop.classList.toggle("show", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var nav = $("#nav");
  var navToggle = $("#navToggle");
  function closeNav() {
    nav.classList.remove("open");
    navToggle.classList.remove("active");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }
  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    navToggle.classList.toggle("active", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  });
  $$(".nav-link").forEach(function (a) { a.addEventListener("click", closeNav); });

  /* ---------- Active nav link on scroll ---------- */
  var sections = $$("section[id]");
  var navLinks = $$(".nav-link");
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var id = e.target.id;
        navLinks.forEach(function (l) {
          l.classList.toggle("active", l.getAttribute("href") === "#" + id);
        });
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(function (s) { spy.observe(s); });

  /* ---------- Reveal on scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$("[data-reveal]").forEach(function (el, i) {
    // tiny stagger for grids
    var d = (i % 4) * 60;
    el.style.transitionDelay = d + "ms";
    revealObs.observe(el);
  });

  /* ---------- Stat count-up ---------- */
  var counted = false;
  var statBand = $(".stats-band");
  function runCounts() {
    if (counted) return; counted = true;
    $$("[data-count]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1600, start = null;
      function fmt(n) { return n >= 1000 ? n.toLocaleString("en-US") : String(n); }
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.floor(eased * target)) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target) + suffix;
      }
      requestAnimationFrame(step);
    });
  }
  if (statBand) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounts(); obs.disconnect(); } });
    }, { threshold: 0.4 }).observe(statBand);
  }

  /* ---------- Project filters ---------- */
  var filters = $$(".filter");
  var cards = $$(".project-card");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      cards.forEach(function (c) {
        var show = f === "all" || c.getAttribute("data-cat") === f;
        c.classList.toggle("hide", !show);
      });
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox");
  var lbImg = $("#lbImage");
  var lbCap = $("#lbCaption");
  var lbCounter = $("#lbCounter");
  var lbPrev = $("#lbPrev");
  var lbNext = $("#lbNext");
  var current = null, index = 0;

  function renderSlide() {
    if (!current) return;
    var n = current.pages[index];
    lbImg.src = pageSrc(n);
    lbImg.alt = current.title + ", sheet " + (index + 1);
    lbCap.textContent = current.title;
    lbCounter.textContent = (index + 1) + " / " + current.pages.length;
    var single = current.pages.length < 2;
    lbPrev.style.display = single ? "none" : "";
    lbNext.style.display = single ? "none" : "";
    lbCounter.style.display = single ? "none" : "";
  }
  function openGallery(key) {
    current = GALLERIES[key];
    if (!current) return;
    index = 0;
    renderSlide();
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.classList.add("nav-open");
  }
  function closeLb() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("nav-open");
    setTimeout(function () { lbImg.src = ""; }, 250);
  }
  function move(d) {
    if (!current) return;
    index = (index + d + current.pages.length) % current.pages.length;
    renderSlide();
  }

  $$("[data-gallery]").forEach(function (el) {
    el.addEventListener("click", function () { openGallery(el.getAttribute("data-gallery")); });
  });
  lbPrev.addEventListener("click", function () { move(-1); });
  lbNext.addEventListener("click", function () { move(1); });
  $("#lbClose").addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
  });

  /* basic swipe on touch */
  var tx = 0;
  lb.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- Contact form (mailto, no backend) ---------- */
  var form = $("#contactForm");
  var note = $("#formNote");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#cf-name").value.trim();
      var email = $("#cf-email").value.trim();
      var subject = $("#cf-subject").value.trim();
      var message = $("#cf-message").value.trim();
      if (!name || !email || !message) {
        note.textContent = "Please fill in your name, email and a message.";
        note.className = "form-note err";
        return;
      }
      var body = "Name: " + name + "\nEmail: " + email + "\n\n" + message;
      var mail = "mailto:official.haider.ali.001@gmail.com" +
        "?subject=" + encodeURIComponent(subject || ("Portfolio enquiry from " + name)) +
        "&body=" + encodeURIComponent(body);
      window.location.href = mail;
      note.textContent = "Opening your email app… if nothing happens, email official.haider.ali.001@gmail.com directly.";
      note.className = "form-note ok";
      form.reset();
    });
  }

  /* ---------- Portfolio access request (gated download) ---------- */
  var rqModal = $("#rqModal");
  if (rqModal) {
    var rqViews = { form: $("#rqForm"), pending: $("#rqPending"), approved: $("#rqApproved"), denied: $("#rqDenied") };
    var rqForm = $("#rqAccessForm");
    var rqNote = $("#rqNote");
    var rqDownload = $("#rqDownload");
    var rqLive = $("#rqLive");
    var rqPoll = null;
    var rqCurrentId = null;
    var rqSubmitting = false;
    var rqTrigger = null;
    var STORE_KEY = "haiderPortfolioReqId";

    function rqAnnounce(m) { if (rqLive) rqLive.textContent = m; }
    function rqShow(view) {
      Object.keys(rqViews).forEach(function (k) { if (rqViews[k]) rqViews[k].hidden = (k !== view); });
    }
    function rqStopPoll() { if (rqPoll) { clearInterval(rqPoll); rqPoll = null; } }
    function rqGetId() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
    function rqSetId(id) { try { id ? localStorage.setItem(STORE_KEY, id) : localStorage.removeItem(STORE_KEY); } catch (e) {} }

    function rqOpen() {
      rqTrigger = document.activeElement;
      rqModal.classList.add("open");
      rqModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-open");
      var id = rqGetId();
      if (id) { rqShow("pending"); rqCheck(id); rqStartPoll(id); }
      else { rqShow("form"); }
      setTimeout(function () {
        var f = (rqViews.form && !rqViews.form.hidden && $("#rq-name")) || $("#rqClose");
        if (f && f.focus) f.focus();
      }, 30);
    }
    function rqClose() {
      rqModal.classList.remove("open");
      rqModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("nav-open");
      rqStopPoll();
      if (rqDownload) rqDownload.href = "#";
      if (rqTrigger && rqTrigger.focus) rqTrigger.focus();
    }
    function rqStartPoll(id) { rqCurrentId = id; rqStopPoll(); rqPoll = setInterval(function () { rqCheck(id); }, 5000); }
    function rqCheck(id) {
      fetch("/api/status?id=" + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d) return;
          if (d.status === "approved" && d.downloadUrl) {
            rqStopPoll(); rqDownload.href = d.downloadUrl; rqShow("approved");
            rqAnnounce("Access approved. Your download is ready.");
            if (rqDownload.focus) rqDownload.focus();
          } else if (d.status === "denied") {
            rqStopPoll(); if (rqDownload) rqDownload.href = "#"; rqShow("denied");
            rqAnnounce("Your request was not approved.");
          } else if (d.status === "expired" || d.status === "superseded") {
            rqStopPoll(); rqSetId(null); rqCurrentId = null;
            if (rqDownload) rqDownload.href = "#"; rqShow("form");
          } else {
            rqShow("pending");
          }
        })
        .catch(function () { /* stay on current view, retry next tick */ });
    }

    $$("[data-request-access]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); rqOpen(); });
    });
    $("#rqClose").addEventListener("click", rqClose);
    rqModal.addEventListener("click", function (e) { if (e.target === rqModal) rqClose(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && rqModal.classList.contains("open")) rqClose(); });

    var rqCheckBtn = $("#rqCheck");
    if (rqCheckBtn) rqCheckBtn.addEventListener("click", function () {
      var id = rqGetId();
      if (id) { rqCheck(id); rqStartPoll(id); }
    });

    // Pause polling while the tab is hidden; resume with an immediate check when visible.
    document.addEventListener("visibilitychange", function () {
      if (!rqModal.classList.contains("open")) return;
      if (document.hidden) { rqStopPoll(); return; }
      if (rqCurrentId && rqViews.pending && !rqViews.pending.hidden) { rqCheck(rqCurrentId); rqStartPoll(rqCurrentId); }
    });

    if (rqForm) {
      rqForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (rqSubmitting) return;
        var name = $("#rq-name").value.trim();
        var email = $("#rq-email").value.trim();
        var reason = $("#rq-reason").value.trim();
        if (!name || !email) { rqNote.textContent = "Please enter your name and email."; rqNote.className = "form-note err"; return; }
        rqSubmitting = true;
        rqNote.textContent = "Sending request..."; rqNote.className = "form-note";
        var btn = rqForm.querySelector("button[type=submit]");
        if (btn) btn.disabled = true;
        fetch("/api/request-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, email: email, reason: reason })
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            rqSubmitting = false;
            if (btn) btn.disabled = false;
            if (res.ok && res.d && res.d.id) {
              rqSetId(res.d.id); rqNote.textContent = ""; rqForm.reset();
              rqShow("pending"); rqAnnounce("Request sent. Waiting for approval."); rqStartPoll(res.d.id);
            } else {
              rqNote.textContent = (res.d && res.d.error) || "Something went wrong. Please try again.";
              rqNote.className = "form-note err";
            }
          })
          .catch(function () {
            rqSubmitting = false;
            if (btn) btn.disabled = false;
            rqNote.textContent = "Network error. Please try again."; rqNote.className = "form-note err";
          });
      });
    }
  }

  /* ---------- Footer year ---------- */
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();
})();

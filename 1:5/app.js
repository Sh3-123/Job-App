// Job Notification Tracker – dashboard with job data, filters, save, and apply.

(function () {
  const SAVED_STORAGE_KEY = "jnt_saved_job_ids";
  const PREFERENCES_STORAGE_KEY = "jobTrackerPreferences";

  function getJobs() {
    return (window.JOB_NOTIFICATION_TRACKER_JOBS || []).slice();
  }

  function getPreferences() {
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : null;
    } catch (_) {
      return null;
    }
  }

  function setPreferences(prefs) {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch (_) { }
  }

  function getDefaultPreferences() {
    return {
      roleKeywords: "",
      preferredLocations: [],
      preferredMode: [],
      experienceLevel: "",
      skills: "",
      minMatchScore: 40
    };
  }

  function getSavedIds() {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function setSavedIds(ids) {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(ids));
    } catch (_) { }
  }

  function saveJobId(id) {
    const ids = getSavedIds();
    if (ids.includes(id)) return;
    setSavedIds(ids.concat(id));
  }

  function unsaveJobId(id) {
    setSavedIds(getSavedIds().filter(function (s) { return s !== id; }));
  }

  function isSaved(id) {
    return getSavedIds().includes(id);
  }

  function formatPostedDaysAgo(days) {
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days <= 10) return days + " days ago";
    return days + " days ago";
  }

  function sourceBadgeClass(source) {
    const s = (source || "").toLowerCase();
    if (s === "linkedin") return "kn-badge--source-linkedin";
    if (s === "naukri") return "kn-badge--source-naukri";
    if (s === "indeed") return "kn-badge--source-indeed";
    return "";
  }

  function computeMatchScore(job, prefs) {
    if (!prefs) return 0;
    var score = 0;
    var title = (job.title || "").toLowerCase();
    var desc = (job.description || "").toLowerCase();
    var roleKw = (prefs.roleKeywords || "").toLowerCase().split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var i;
    for (i = 0; i < roleKw.length; i++) {
      if (title.indexOf(roleKw[i]) >= 0) { score += 25; break; }
    }
    for (i = 0; i < roleKw.length; i++) {
      if (desc.indexOf(roleKw[i]) >= 0) { score += 15; break; }
    }
    var prefLocs = prefs.preferredLocations || [];
    if (prefLocs.length && prefLocs.indexOf(job.location || "") >= 0) score += 15;
    var prefMode = prefs.preferredMode || [];
    if (prefMode.length && prefMode.indexOf(job.mode || "") >= 0) score += 10;
    if ((prefs.experienceLevel || "") && (job.experience || "") === prefs.experienceLevel) score += 10;
    var userSkills = (prefs.skills || "").split(",").map(function (s) { return (s || "").trim().toLowerCase(); }).filter(Boolean);
    var jobSkills = (job.skills || []).map(function (s) { return (s || "").toLowerCase(); });
    var skillMatch = false;
    for (i = 0; i < userSkills.length && !skillMatch; i++) {
      for (var j = 0; j < jobSkills.length; j++) {
        if (jobSkills[j].indexOf(userSkills[i]) >= 0 || userSkills[i].indexOf(jobSkills[j]) >= 0) {
          score += 15;
          skillMatch = true;
          break;
        }
      }
    }
    var days = job.postedDaysAgo != null ? job.postedDaysAgo : 99;
    if (days <= 2) score += 5;
    if ((job.source || "").toLowerCase() === "linkedin") score += 5;
    return Math.min(100, score);
  }

  function matchScoreBadgeClass(score) {
    if (score >= 80) return "kn-badge--match-high";
    if (score >= 60) return "kn-badge--match-mid";
    if (score >= 40) return "kn-badge--match-neutral";
    return "kn-badge--match-low";
  }

  function filterAndSortJobs(jobs, filters, prefs) {
    var pairs = jobs.slice().map(function (j) {
      return { job: j, score: prefs ? computeMatchScore(j, prefs) : 0 };
    });
    if (filters.showOnlyMatches && prefs && (prefs.minMatchScore != null)) {
      var minSc = Math.max(0, Math.min(100, prefs.minMatchScore));
      pairs = pairs.filter(function (p) { return p.score >= minSc; });
    }
    var kw = (filters.keyword || "").trim().toLowerCase();
    if (kw) {
      pairs = pairs.filter(function (p) {
        var j = p.job;
        return (j.title || "").toLowerCase().indexOf(kw) >= 0 || (j.company || "").toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (filters.location) {
      pairs = pairs.filter(function (p) { return (p.job.location || "") === filters.location; });
    }
    if (filters.mode) {
      pairs = pairs.filter(function (p) { return (p.job.mode || "") === filters.mode; });
    }
    if (filters.experience) {
      pairs = pairs.filter(function (p) { return (p.job.experience || "") === filters.experience; });
    }
    if (filters.source) {
      pairs = pairs.filter(function (p) { return (p.job.source || "") === filters.source; });
    }
    var sortBy = filters.sort || "latest";
    if (sortBy === "latest") {
      pairs.sort(function (a, b) {
        return ((a.job.postedDaysAgo ?? 99) - (b.job.postedDaysAgo ?? 99));
      });
    } else if (sortBy === "salary") {
      pairs.sort(function (a, b) {
        var pa = (a.job.salaryRange || "").replace(/[^0-9]/g, "") || "0";
        var pb = (b.job.salaryRange || "").replace(/[^0-9]/g, "") || "0";
        return parseInt(pb, 10) - parseInt(pa, 10);
      });
    } else if (sortBy === "match") {
      pairs.sort(function (a, b) { return b.score - a.score; });
    }
    return { list: pairs.map(function (p) { return p.job; }), scores: pairs.map(function (p) { return p.score; }) };
  }

  function getFilterOptions(jobs) {
    const locations = [], modes = [], experiences = [], sources = [];
    const locSet = new Set(), modeSet = new Set(), expSet = new Set(), srcSet = new Set();
    jobs.forEach(function (j) {
      if (j.location) locSet.add(j.location);
      if (j.mode) modeSet.add(j.mode);
      if (j.experience) expSet.add(j.experience);
      if (j.source) srcSet.add(j.source);
    });
    return {
      locations: Array.from(locSet).sort(),
      modes: Array.from(modeSet).sort(),
      experiences: Array.from(expSet).sort(),
      sources: Array.from(srcSet).sort()
    };
  }

  function renderJobCard(job, opts) {
    opts = opts || {};
    var saved = opts.saved !== undefined ? opts.saved : isSaved(job.id);
    var showUnsave = opts.showUnsave === true;
    var sourceClass = sourceBadgeClass(job.source);
    var posted = formatPostedDaysAgo(job.postedDaysAgo ?? 0);
    var locationMode = [job.location, job.mode].filter(Boolean).join(" · ");
    var saveLabel = saved ? "Saved" : "Save";
    var saveAction = showUnsave && saved ? "unsave" : (saved ? "" : "save");
    var matchScore = opts.matchScore !== undefined ? opts.matchScore : (job._matchScore != null ? job._matchScore : 0);
    var matchBadge = opts.matchScore !== undefined ? "<span class=\"kn-badge kn-badge--match " + matchScoreBadgeClass(matchScore) + "\">" + matchScore + "% match</span>" : "";

    return (
      "<div class=\"kn-job-card\" data-job-id=\"" + (job.id || "") + "\">" +
      "<div class=\"kn-job-card__header\">" +
      "<h2 class=\"kn-job-card__title\">" + (job.title || "—") + "</h2>" +
      "<div class=\"kn-job-card__badges\">" + matchBadge + "<span class=\"kn-badge kn-badge--source " + sourceClass + "\">" + (job.source || "—") + "</span></div>" +
      "</div>" +
      "<div class=\"kn-job-card__meta\">" +
      "<span class=\"kn-job-card__company\">" + (job.company || "—") + "</span>" +
      (locationMode ? "<span class=\"kn-job-card__location-mode\">" + locationMode + "</span>" : "") +
      (job.experience ? "<span> · " + (job.experience) + "</span>" : "") +
      "</div>" +
      "<div class=\"kn-job-card__footer\">" +
      "<span class=\"kn-job-card__posted\">" + posted + "</span>" +
      (job.salaryRange ? "<span class=\"kn-job-card__salary\">" + (job.salaryRange) + "</span>" : "") +
      "<div class=\"kn-job-card__actions\">" +
      "<button type=\"button\" class=\"kn-button kn-button--secondary kn-button--compact\" data-action=\"view\">View</button>" +
      "<button type=\"button\" class=\"kn-button kn-button--secondary kn-button--compact\" data-action=\"" + saveAction + "\" " + (saved && !showUnsave ? " disabled" : "") + ">" + saveLabel + "</button>" +
      "<a href=\"" + (job.applyUrl || "#") + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"kn-button kn-button--primary kn-button--compact\" data-action=\"apply\">Apply</a>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function openJobModal(job) {
    var existing = document.getElementById("kn-job-modal-backdrop");
    if (existing) existing.remove();
    var skills = (job.skills || []).slice();
    var skillsHtml = skills.map(function (s) {
      return "<span class=\"kn-modal__skill\">" + (s || "") + "</span>";
    }).join("");
    var backdrop = document.createElement("div");
    backdrop.id = "kn-job-modal-backdrop";
    backdrop.className = "kn-modal-backdrop";
    backdrop.innerHTML =
      "<div class=\"kn-modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"kn-modal-title\">" +
      "<div class=\"kn-modal__header\">" +
      "<h2 class=\"kn-modal__title\" id=\"kn-modal-title\">" + (job.title || "—") + "</h2>" +
      "<p class=\"kn-modal__subtitle\">" + (job.company || "—") + "</p>" +
      "</div>" +
      "<div class=\"kn-modal__body\">" +
      "<div class=\"kn-modal__section\">" +
      "<span class=\"kn-modal__label\">Description</span>" +
      "<p class=\"kn-modal__description\">" + (job.description || "No description.") + "</p>" +
      "</div>" +
      (skills.length ? "<div class=\"kn-modal__section\">" +
        "<span class=\"kn-modal__label\">Skills</span>" +
        "<div class=\"kn-modal__skills\">" + skillsHtml + "</div>" +
        "</div>" : "") +
      "</div>" +
      "<div class=\"kn-modal__footer\">" +
      "<button type=\"button\" class=\"kn-button kn-button--secondary\" data-modal-close>Close</button>" +
      "<a href=\"" + (job.applyUrl || "#") + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"kn-button kn-button--primary\">Apply</a>" +
      "</div>" +
      "</div>";
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeJobModal();
    });
    var closeBtn = backdrop.querySelector("[data-modal-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeJobModal);
    document.body.appendChild(backdrop);
  }

  function closeJobModal() {
    var el = document.getElementById("kn-job-modal-backdrop");
    if (el) el.remove();
  }

  const routes = {
    "/": { key: "home", title: "Job Notification Tracker" },
    "/dashboard": { key: "dashboard", title: "Dashboard – Job Notification Tracker" },
    "/saved": { key: "saved", title: "Saved – Job Notification Tracker" },
    "/digest": { key: "digest", title: "Digest – Job Notification Tracker" },
    "/settings": { key: "settings", title: "Settings – Job Notification Tracker" },
    "/proof": { key: "proof", title: "Proof – Job Notification Tracker" },
  };

  function resolveRoute(pathname) {
    if (routes[pathname]) return routes[pathname];
    return routes["/"];
  }

  function updateActiveLink(routeKey) {
    const links = document.querySelectorAll(".kn-nav__link");
    links.forEach((link) => {
      const key = link.getAttribute("data-route-key");
      if (key === routeKey) {
        link.classList.add("kn-nav__link--active");
      } else {
        link.classList.remove("kn-nav__link--active");
      }
    });
  }

  function closeMobileNav(navElement, toggleButton) {
    if (!navElement || !toggleButton) return;
    navElement.classList.remove("kn-nav--open");
    toggleButton.setAttribute("aria-expanded", "false");
  }

  function renderLanding(container) {
    container.innerHTML = `
      <section class="kn-landing" aria-labelledby="landing-heading">
        <div class="kn-landing__content">
          <p class="kn-eyebrow">KODNEST PREMIUM / JOB DISCOVERY</p>
          <h1 class="kn-landing__headline" id="landing-heading">
            Stop Missing The Right Jobs.
          </h1>
          <p class="kn-landing__subtext">
            Precision-matched job discovery delivered daily at 9AM.
          </p>
          <div class="kn-landing__actions">
            <a href="/settings" class="kn-button kn-button--primary" data-route-key="settings">
              Start Tracking
            </a>
          </div>
        </div>
      </section>
    `;
  }

  function renderDashboard(container) {
    var jobs = getJobs();
    var opts = getFilterOptions(jobs);
    var locationsOptions = opts.locations.map(function (l) { return "<option value=\"" + l + "\">" + l + "</option>"; }).join("");
    var modesOptions = opts.modes.map(function (m) { return "<option value=\"" + m + "\">" + m + "</option>"; }).join("");
    var expOptions = opts.experiences.map(function (e) { return "<option value=\"" + e + "\">" + e + "</option>"; }).join("");
    var srcOptions = opts.sources.map(function (s) { return "<option value=\"" + s + "\">" + s + "</option>"; }).join("");

    container.innerHTML =
      "<div class=\"kn-route kn-route--dashboard\">" +
      "<header class=\"kn-route__header\">" +
      "<h1 class=\"kn-heading-1\">Dashboard</h1>" +
      "<p class=\"kn-route__subtext\">Browse and save roles that match your criteria.</p>" +
      "</header>" +
      "<div id=\"kn-prefs-banner\" class=\"kn-route__banner\" aria-live=\"polite\"></div>" +
      "<div class=\"kn-filters\">" +
      "<div class=\"kn-filters__search\">" +
      "<input type=\"text\" class=\"kn-input\" id=\"kn-filter-keyword\" placeholder=\"Search title or company\" aria-label=\"Search jobs\">" +
      "</div>" +
      "<div class=\"kn-filters__group\">" +
      "<label class=\"kn-filters__toggle\"><input type=\"checkbox\" id=\"kn-filter-show-matches\" class=\"kn-checkbox\"> Show only jobs above my threshold</label>" +
      "<div class=\"kn-filters__select\">" +
      "<select id=\"kn-filter-location\" class=\"kn-input\" aria-label=\"Location\">" +
      "<option value=\"\">All locations</option>" + locationsOptions +
      "</select>" +
      "</div>" +
      "<div class=\"kn-filters__select\">" +
      "<select id=\"kn-filter-mode\" class=\"kn-input\" aria-label=\"Mode\">" +
      "<option value=\"\">All modes</option>" + modesOptions +
      "</select>" +
      "</div>" +
      "<div class=\"kn-filters__select\">" +
      "<select id=\"kn-filter-experience\" class=\"kn-input\" aria-label=\"Experience\">" +
      "<option value=\"\">All experience</option>" + expOptions +
      "</select>" +
      "</div>" +
      "<div class=\"kn-filters__select\">" +
      "<select id=\"kn-filter-source\" class=\"kn-input\" aria-label=\"Source\">" +
      "<option value=\"\">All sources</option>" + srcOptions +
      "</select>" +
      "</div>" +
      "<div class=\"kn-filters__select\">" +
      "<select id=\"kn-filter-sort\" class=\"kn-input\" aria-label=\"Sort\">" +
      "<option value=\"latest\">Latest</option>" +
      "<option value=\"match\">Match Score</option>" +
      "<option value=\"salary\">Salary</option>" +
      "</select>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "<div class=\"kn-jobs\" id=\"kn-dashboard-jobs\"></div>" +
      "</div>";
    updateDashboardJobList(container);
    attachDashboardFilters(container);
    attachDashboardCardActions(container);
  }

  function getDashboardFilters(container) {
    var root = container.querySelector(".kn-route--dashboard") || container;
    var toggleEl = root.querySelector("#kn-filter-show-matches");
    return {
      keyword: (root.querySelector("#kn-filter-keyword") || {}).value,
      location: (root.querySelector("#kn-filter-location") || {}).value,
      mode: (root.querySelector("#kn-filter-mode") || {}).value,
      experience: (root.querySelector("#kn-filter-experience") || {}).value,
      source: (root.querySelector("#kn-filter-source") || {}).value,
      sort: (root.querySelector("#kn-filter-sort") || {}).value || "latest",
      showOnlyMatches: toggleEl ? toggleEl.checked : false
    };
  }

  function updatePreferencesBanner(container) {
    var bannerEl = container.querySelector("#kn-prefs-banner");
    if (!bannerEl) return;
    var prefs = getPreferences();
    bannerEl.innerHTML = !prefs
      ? "<div class=\"kn-alert kn-alert--info\" role=\"status\"><p class=\"kn-alert__body\">Set your preferences to activate intelligent matching.</p></div>"
      : "";
  }

  function updateDashboardJobList(container) {
    updatePreferencesBanner(container);
    var listEl = container.querySelector("#kn-dashboard-jobs");
    if (!listEl) return;
    var jobs = getJobs();
    var filters = getDashboardFilters(container);
    var prefs = getPreferences();
    var result = filterAndSortJobs(jobs, filters, prefs);
    var list = result.list;
    var scores = result.scores;
    var savedIds = getSavedIds();
    var html = list.length
      ? list.map(function (j, idx) { return renderJobCard(j, { saved: savedIds.indexOf(j.id) >= 0, matchScore: scores[idx] }); }).join("")
      : "<div class=\"kn-empty kn-empty--premium\"><p class=\"kn-empty__title\">No roles match your criteria.</p><p class=\"kn-empty__body\">Adjust filters or lower your threshold.</p></div>";
    listEl.innerHTML = html;
    attachDashboardCardActions(container);
  }

  function attachDashboardFilters(container) {
    var root = container.querySelector(".kn-route--dashboard") || container;
    var inputs = root.querySelectorAll("#kn-filter-keyword, #kn-filter-location, #kn-filter-mode, #kn-filter-experience, #kn-filter-source, #kn-filter-sort, #kn-filter-show-matches");
    function onChange() { updateDashboardJobList(container); }
    inputs.forEach(function (el) {
      if (el) {
        if (el.id === "kn-filter-keyword") el.addEventListener("input", onChange);
        else el.addEventListener("change", onChange);
      }
    });
  }

  function attachDashboardCardActions(container) {
    var listEl = container.querySelector("#kn-dashboard-jobs");
    if (!listEl) return;
    listEl.addEventListener("click", function (e) {
      var card = e.target.closest(".kn-job-card");
      if (!card) return;
      var jobId = card.getAttribute("data-job-id");
      var btn = e.target.closest("button[data-action], a[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var jobs = getJobs();
      var job = jobs.find(function (j) { return j.id === jobId; });
      if (!job) return;
      if (action === "view") {
        e.preventDefault();
        openJobModal(job);
        return;
      }
      if (action === "save") {
        e.preventDefault();
        saveJobId(jobId);
        updateDashboardJobList(container);
        return;
      }
      if (action === "unsave") {
        e.preventDefault();
        unsaveJobId(jobId);
        updateDashboardJobList(container);
        return;
      }
      if (action === "apply") {
        return;
      }
    });
  }

  function renderSettings(container) {
    container.innerHTML = `
      <header class="kn-route__header">
        <h1 class="kn-heading-1">Settings</h1>
        <p class="kn-route__subtext">
          Define how “the right job” looks for you. These are placeholder fields only – no logic is wired up yet.
        </p>
      </header>
      <section class="kn-settings">
        <form class="kn-settings__form" aria-label="Job notification preferences">
          <div class="kn-field">
            <label class="kn-field__label" for="role-keywords">Role keywords</label>
            <input
              id="role-keywords"
              class="kn-input"
              type="text"
              placeholder="e.g. Senior Backend Engineer, Staff Data Scientist"
              aria-describedby="role-keywords-hint"
            />
            <p class="kn-field__hint" id="role-keywords-hint">
              Pure placeholder. In the next step, this will inform how roles are matched to your profile.
            </p>
          </div>

          <div class="kn-field kn-field--stacked">
            <label class="kn-field__label" for="preferred-locations">Preferred locations</label>
            <input
              id="preferred-locations"
              class="kn-input"
              type="text"
              placeholder="e.g. Berlin, Remote within EU, Bay Area"
              aria-describedby="preferred-locations-hint"
            />
            <p class="kn-field__hint" id="preferred-locations-hint">
              You might combine cities, regions, or time zones here. Nothing is persisted yet.
            </p>
          </div>

          <div class="kn-field kn-field--stacked">
            <label class="kn-field__label" for="mode">Mode</label>
            <select id="mode" class="kn-input" aria-describedby="mode-hint">
              <option value="">Select mode</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
            <p class="kn-field__hint" id="mode-hint">
              Remote, hybrid, or onsite – this will later refine which roles surface in your digest.
            </p>
          </div>

          <div class="kn-field kn-field--stacked">
            <label class="kn-field__label" for="experience-level">Experience level</label>
            <select id="experience-level" class="kn-input" aria-describedby="experience-level-hint">
              <option value="">Select level</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
              <option value="principal">Principal / Staff</option>
            </select>
            <p class="kn-field__hint" id="experience-level-hint">
              This is only a UI shell. In a later step, experience bands will tune which roles make it into your 9AM email.
            </p>
          </div>

          <div class="kn-settings__footer">
            <button type="submit" class="kn-button kn-button--primary">Save preferences</button>
            <button type="button" class="kn-button kn-button--secondary" id="kn-clear-preferences">Clear preferences</button>
          </div>
        </form>
      </section>
    `;
    var prefs = getPreferences();
    var def = getDefaultPreferences();
    if (!prefs) prefs = def;
    var jobs = getJobs();
    var opts = getFilterOptions(jobs);
    var locInput = container.querySelector("#preferred-locations");
    if (locInput && locInput.tagName === "INPUT") {
      var sel = document.createElement("select");
      sel.id = "preferred-locations";
      sel.className = "kn-input";
      sel.multiple = true;
      opts.locations.forEach(function (l) {
        var opt = document.createElement("option");
        opt.value = l;
        opt.textContent = l;
        if ((prefs.preferredLocations || []).indexOf(l) >= 0) opt.selected = true;
        sel.appendChild(opt);
      });
      locInput.parentNode.replaceChild(sel, locInput);
    }
    var modeSelect = container.querySelector("#mode");
    if (modeSelect && modeSelect.tagName === "SELECT") {
      var modeWrap = document.createElement("div");
      modeWrap.className = "kn-checkbox-group";
      ["Remote", "Hybrid", "Onsite"].forEach(function (v) {
        var id = "mode-" + v.toLowerCase();
        var lab = document.createElement("label");
        lab.className = "kn-checkbox-label";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "kn-checkbox";
        cb.id = id;
        cb.value = v;
        if ((prefs.preferredMode || []).indexOf(v) >= 0) cb.checked = true;
        var sp = document.createElement("span");
        sp.textContent = v;
        lab.appendChild(cb);
        lab.appendChild(sp);
        modeWrap.appendChild(lab);
      });
      modeSelect.parentNode.replaceChild(modeWrap, modeSelect);
    }
    var expDiv = container.querySelector("#experience-level");
    if (expDiv) {
      var expSelect = expDiv.closest ? expDiv.closest(".kn-field") : expDiv.parentElement;
      if (expSelect) {
        var expOpts = ["Fresher", "0-1", "1-3", "3-5", "5+", "Junior", "Mid-level", "Senior", "Lead", "Principal / Staff"];
        var expSel = container.querySelector("#experience-level");
        if (expSel && expSel.tagName === "SELECT") {
          expSel.innerHTML = "<option value=\"\">Select level</option>";
          expOpts.forEach(function (e) {
            var o = document.createElement("option");
            o.value = e;
            o.textContent = e;
            if ((prefs.experienceLevel || "") === e) o.selected = true;
            expSel.appendChild(o);
          });
        }
        var skillsField = document.createElement("div");
        skillsField.className = "kn-field kn-field--stacked";
        skillsField.innerHTML = "<label class=\"kn-field__label\" for=\"skills\">Skills</label><input id=\"skills\" class=\"kn-input\" type=\"text\" placeholder=\"e.g. React, Python, SQL\"><p class=\"kn-field__hint\" id=\"skills-hint\">Comma-separated. Overlap with job skills increases score.</p>";
        var skillsInput = skillsField.querySelector("#skills");
        if (skillsInput) skillsInput.value = prefs.skills != null ? prefs.skills : "";
        expSelect.parentNode.insertBefore(skillsField, expSelect.nextSibling);
        var minField = document.createElement("div");
        minField.className = "kn-field kn-field--stacked";
        var minSc = Math.max(0, Math.min(100, prefs.minMatchScore != null ? prefs.minMatchScore : 40));
        minField.innerHTML = "<label class=\"kn-field__label\" for=\"min-match-score\">Minimum match score</label><input id=\"min-match-score\" class=\"kn-input kn-input--range\" type=\"range\" min=\"0\" max=\"100\" value=\"" + minSc + "\"><span class=\"kn-field__range-value\" id=\"min-match-score-value\">" + minSc + "</span><p class=\"kn-field__hint\" id=\"min-match-score-hint\">Used by Show only jobs above my threshold on Dashboard (0–100).</p>";
        expSelect.parentNode.insertBefore(minField, skillsField.nextSibling);
      }
    }
    var roleEl = container.querySelector("#role-keywords");
    if (roleEl) roleEl.value = prefs.roleKeywords != null ? prefs.roleKeywords : "";
    var expEl = container.querySelector("#experience-level");
    if (expEl) expEl.value = prefs.experienceLevel != null ? prefs.experienceLevel : "";
    attachSettingsForm(container);
  }

  function attachSettingsForm(container) {
    var form = container.querySelector(".kn-settings__form");
    var rangeEl = container.querySelector("#min-match-score");
    var rangeValEl = container.querySelector("#min-match-score-value");
    var clearBtn = container.querySelector("#kn-clear-preferences");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        try {
          localStorage.removeItem(PREFERENCES_STORAGE_KEY);
        } catch (_) { }
        navigateTo("/dashboard");
      });
    }
    if (!form) return;
    if (rangeEl && rangeValEl) {
      function upd() { rangeValEl.textContent = rangeEl.value; }
      rangeEl.addEventListener("input", upd);
      upd();
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var roleEl = container.querySelector("#role-keywords");
      var locEl = container.querySelector("#preferred-locations");
      var expEl = container.querySelector("#experience-level");
      var skillsEl = container.querySelector("#skills");
      var minEl = container.querySelector("#min-match-score");
      var preferredMode = [];
      ["mode-remote", "mode-hybrid", "mode-onsite"].forEach(function (id) {
        var cb = container.querySelector("#" + id);
        if (cb && cb.checked) preferredMode.push(cb.value);
      });
      var locations = [];
      if (locEl && locEl.options) {
        for (var i = 0; i < locEl.options.length; i++) {
          if (locEl.options[i].selected) locations.push(locEl.options[i].value);
        }
      }
      var prefs = {
        roleKeywords: roleEl ? (roleEl.value || "").trim() : "",
        preferredLocations: locations,
        preferredMode: preferredMode,
        experienceLevel: expEl ? (expEl.value || "").trim() : "",
        skills: skillsEl ? (skillsEl.value || "").trim() : "",
        minMatchScore: minEl ? Math.max(0, Math.min(100, parseInt(minEl.value, 10) || 40)) : 40
      };
      setPreferences(prefs);
    });
  }

  function renderSaved(container) {
    var savedIds = getSavedIds();
    var jobs = getJobs();
    var savedJobs = jobs.filter(function (j) { return savedIds.indexOf(j.id) >= 0; });
    var cardsHtml;
    if (savedJobs.length === 0) {
      cardsHtml =
        "<div class=\"kn-empty kn-empty--saved\">" +
        "<div class=\"kn-empty__icon\" aria-hidden=\"true\">★</div>" +
        "<p class=\"kn-empty__title\">Your shortlist is empty</p>" +
        "<p class=\"kn-empty__body\">Save roles from the Dashboard to review them here. A calm, deliberate list of opportunities worth your time.</p>" +
        "<a href=\"/dashboard\" class=\"kn-button kn-button--primary\" data-route-key=\"dashboard\">Browse jobs</a>" +
        "</div>";
    } else {
      cardsHtml = "<div class=\"kn-jobs\" id=\"kn-saved-jobs\">" +
        savedJobs.map(function (j) { return renderJobCard(j, { saved: true, showUnsave: true }); }).join("") +
        "</div>";
    }
    container.innerHTML =
      "<header class=\"kn-route__header\">" +
      "<h1 class=\"kn-heading-1\">Saved</h1>" +
      "<p class=\"kn-route__subtext\">A quiet, deliberate shortlist of roles you actually care about.</p>" +
      "</header>" +
      cardsHtml;
    if (savedJobs.length > 0) {
      attachSavedCardActions(container);
    }
  }

  function attachSavedCardActions(container) {
    var listEl = container.querySelector("#kn-saved-jobs");
    if (!listEl) return;
    listEl.addEventListener("click", function (e) {
      var card = e.target.closest(".kn-job-card");
      if (!card) return;
      var jobId = card.getAttribute("data-job-id");
      var btn = e.target.closest("button[data-action], a[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var jobs = getJobs();
      var job = jobs.find(function (j) { return j.id === jobId; });
      if (!job) return;
      if (action === "view") {
        e.preventDefault();
        openJobModal(job);
        return;
      }
      if (action === "unsave") {
        e.preventDefault();
        unsaveJobId(jobId);
        renderSaved(container);
        return;
      }
      if (action === "apply") {
        return;
      }
    });
  }

  function renderDigest(container) {
    const prefs = getPreferences();
    const today = new Date();
    const dateKey = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    const digestKey = 'jobTrackerDigest_' + dateKey;

    const todayFormatted = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    container.innerHTML = `
    <header class="kn-route__header">
      <h1 class="kn-heading-1">Digest</h1>
      <p class="kn-route__subtext">
        A single, predictable touchpoint for new opportunities – delivered daily at 9AM.
      </p>
    </header>
    <div id="digest-container"></div>
  `;

    const digestContainer = container.querySelector('#digest-container');

    // Check if preferences are set
    if (!prefs) {
      digestContainer.innerHTML = `
      <div class="kn-alert kn-alert--info" style="margin-top: var(--kn-space-3);">
        <p class="kn-alert__title">Set preferences to generate a personalized digest.</p>
        <p class="kn-alert__body">
          Please configure your job preferences in <a href="/settings" data-route-key="settings" style="color: var(--kn-color-accent); text-decoration: underline;">Settings</a> to receive personalized job recommendations.
        </p>
      </div>
    `;
      // Attach navigation to settings link
      const settingsLink = digestContainer.querySelector('a[data-route-key="settings"]');
      if (settingsLink) {
        settingsLink.addEventListener('click', function (e) {
          e.preventDefault();
          navigateTo('/settings');
        });
      }
      return;
    }

    // Check if digest already exists for today
    let digestData = null;
    try {
      const stored = localStorage.getItem(digestKey);
      if (stored) {
        digestData = JSON.parse(stored);
      }
    } catch (e) {
      // ignore parse errors
    }

    // Button to generate digest
    digestContainer.innerHTML = `
    <div style="margin-top: var(--kn-space-3); margin-bottom: var(--kn-space-3);">
      <button class="kn-button kn-button--primary" id="generate-digest-btn">
        Generate Today's 9AM Digest (Simulated)
      </button>
      <p style="font-size: 12px; color: rgba(17, 17, 17, 0.6); margin-top: var(--kn-space-1); margin-bottom: 0;">
        Demo Mode: Daily 9AM trigger simulated manually.
      </p>
    </div>
    <div id="digest-output"></div>
  `;

    const generateBtn = digestContainer.querySelector('#generate-digest-btn');
    const outputContainer = digestContainer.querySelector('#digest-output');

    // Function to generate digest
    function generateDigest() {
      const jobs = getJobs();
      const jobsWithScores = jobs.map(function (job) {
        return {
          job: job,
          score: computeMatchScore(job, prefs)
        };
      });

      // Sort by matchScore descending, then postedDaysAgo ascending
      jobsWithScores.sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const daysA = a.job.postedDaysAgo != null ? a.job.postedDaysAgo : 99;
        const daysB = b.job.postedDaysAgo != null ? b.job.postedDaysAgo : 99;
        return daysA - daysB;
      });

      // Take top 10
      const top10 = jobsWithScores.slice(0, 10);

      // Filter jobs based on minimum match score threshold
      // Use the user's minMatchScore preference, or default to 20 for digest quality
      const minThreshold = prefs.minMatchScore != null ? Math.max(0, Math.min(100, prefs.minMatchScore)) : 20;
      const matchedJobs = top10.filter(function (item) {
        return item.score >= minThreshold;
      });

      if (matchedJobs.length === 0) {
        // Store empty digest state so it persists when navigating away and back
        const emptyDigest = {
          date: dateKey,
          dateFormatted: todayFormatted,
          jobs: [],
          noMatches: true
        };
        localStorage.setItem(digestKey, JSON.stringify(emptyDigest));
        digestData = emptyDigest;

        outputContainer.innerHTML = `
        <div class="kn-empty kn-empty--premium">
          <p class="kn-empty__title">No matching roles today.</p>
          <p class="kn-empty__body">Check again tomorrow for new opportunities.</p>
        </div>
      `;
        return;
      }

      // Store digest
      const digest = {
        date: dateKey,
        dateFormatted: todayFormatted,
        jobs: matchedJobs.map(function (item) {
          return {
            id: item.job.id,
            title: item.job.title,
            company: item.job.company,
            location: item.job.location,
            experience: item.job.experience,
            mode: item.job.mode,
            matchScore: item.score,
            link: item.job.link
          };
        })
      };

      localStorage.setItem(digestKey, JSON.stringify(digest));
      digestData = digest;
      renderDigestOutput();
    }

    // Function to render digest output
    function renderDigestOutput() {
      if (!digestData) return;

      // Handle no matches case
      if (digestData.noMatches || digestData.jobs.length === 0) {
        outputContainer.innerHTML = `
        <div class="kn-empty kn-empty--premium">
          <p class="kn-empty__title">No matching roles today.</p>
          <p class="kn-empty__body">Check again tomorrow for new opportunities.</p>
        </div>
      `;
        return;
      }

      let jobsHTML = '';
      digestData.jobs.forEach(function (job) {
        const scoreClass = matchScoreBadgeClass(job.matchScore);
        jobsHTML += `
        <div class="digest-job-item">
          <div class="digest-job-header">
            <h3 class="digest-job-title">${job.title}</h3>
            <span class="kn-badge ${scoreClass}">${job.matchScore}% Match</span>
          </div>
          <div class="digest-job-meta">
            <span class="digest-job-company">${job.company}</span>
            <span class="digest-job-separator">•</span>
            <span>${job.location}</span>
            <span class="digest-job-separator">•</span>
            <span>${job.experience}</span>
            ${job.mode ? '<span class="digest-job-separator">•</span><span>' + job.mode + '</span>' : ''}
          </div>
          <div class="digest-job-actions">
            <a href="${job.link}" target="_blank" rel="noopener noreferrer" class="kn-button kn-button--primary kn-button--compact">
              Apply
            </a>
          </div>
        </div>
      `;
      });

      outputContainer.innerHTML = `
      <div class="digest-email-card">
        <div class="digest-header">
          <h2 class="digest-title">Top ${digestData.jobs.length} Jobs For You — 9AM Digest</h2>
          <p class="digest-date">${digestData.dateFormatted}</p>
        </div>
        
        <div class="digest-jobs-list">
          ${jobsHTML}
        </div>
        
        <div class="digest-footer">
          <p>This digest was generated based on your preferences.</p>
        </div>
      </div>

      <div class="digest-actions">
        <button class="kn-button kn-button--secondary" id="copy-digest-btn">
          Copy Digest to Clipboard
        </button>
        <button class="kn-button kn-button--secondary" id="email-digest-btn">
          Create Email Draft
        </button>
      </div>
    `;

      // Attach copy button
      const copyBtn = outputContainer.querySelector('#copy-digest-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          const plainText = createPlainTextDigest();
          navigator.clipboard.writeText(plainText).then(function () {
            copyBtn.textContent = '✓ Copied!';
            copyBtn.classList.add('kn-button--success');
            setTimeout(function () {
              copyBtn.textContent = 'Copy Digest to Clipboard';
              copyBtn.classList.remove('kn-button--success');
            }, 2000);
          }).catch(function (err) {
            alert('Failed to copy to clipboard');
          });
        });
      }

      // Attach email button
      const emailBtn = outputContainer.querySelector('#email-digest-btn');
      if (emailBtn) {
        emailBtn.addEventListener('click', function () {
          const plainText = createPlainTextDigest();
          const subject = encodeURIComponent('My 9AM Job Digest');
          const body = encodeURIComponent(plainText);
          window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
        });
      }
    }

    // Function to create plain text version
    function createPlainTextDigest() {
      if (!digestData) return '';

      let text = 'Top ' + digestData.jobs.length + ' Jobs For You — 9AM Digest\n';
      text += digestData.dateFormatted + '\n';
      text += '='.repeat(60) + '\n\n';

      digestData.jobs.forEach(function (job, idx) {
        text += (idx + 1) + '. ' + job.title + '\n';
        text += '   Company: ' + job.company + '\n';
        text += '   Location: ' + job.location + '\n';
        text += '   Experience: ' + job.experience + '\n';
        if (job.mode) {
          text += '   Mode: ' + job.mode + '\n';
        }
        text += '   Match Score: ' + job.matchScore + '%\n';
        text += '   Apply: ' + job.link + '\n\n';
      });

      text += '='.repeat(60) + '\n';
      text += 'This digest was generated based on your preferences.\n';

      return text;
    }

    // Attach generate button
    generateBtn.addEventListener('click', generateDigest);

    // If digest already exists, render it
    if (digestData) {
      renderDigestOutput();
    }
  }

  function renderProof(container) {
    container.innerHTML = `
      <header class="kn-route__header">
        <h1 class="kn-heading-1">Proof</h1>
        <p class="kn-route__subtext">
          Placeholder for artifact collection – offers, interviews, and real‑world signals that your system is working.
        </p>
      </header>
      <section class="kn-proof">
        <div class="kn-card kn-card--panel">
          <div class="kn-card__header">
            <h2 class="kn-heading-3">Artifact collection shell</h2>
            <p class="kn-card__subtitle">
              This area will later collect structured proof of impact. For now, it simply sketches the surface area.
            </p>
          </div>
          <div class="kn-card__body kn-card__body--stacked">
            <div class="kn-field">
              <label class="kn-field__label" for="proof-notes">Notes (placeholder)</label>
              <textarea
                id="proof-notes"
                class="kn-input kn-input--textarea kn-input--proof"
                placeholder="e.g. 3 interviews scheduled from last week’s digest…"
              ></textarea>
              <p class="kn-field__hint">
                Nothing entered here is stored or processed. It’s a visual preview of the future artifact workflow.
              </p>
            </div>
            <button type="button" class="kn-button kn-button--secondary" disabled>
              Add artifact (coming soon)
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function renderRoute(pathname) {
    const route = resolveRoute(pathname);
    const container = document.getElementById("route-root");
    if (!container) return;

    if (route.key === "home") {
      renderLanding(container);
    } else if (route.key === "dashboard") {
      renderDashboard(container);
    } else if (route.key === "settings") {
      renderSettings(container);
    } else if (route.key === "saved") {
      renderSaved(container);
    } else if (route.key === "digest") {
      renderDigest(container);
    } else if (route.key === "proof") {
      renderProof(container);
    }

    document.title = route.title;
    updateActiveLink(route.key === "home" ? "dashboard" : route.key);
  }

  function navigateTo(pathname, options) {
    const resolved = resolveRoute(pathname);
    const targetPath = routes[pathname] ? pathname : "/";

    renderRoute(targetPath);

    if (!options || !options.skipHistory) {
      window.history.pushState({ path: targetPath }, "", targetPath);
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".kn-nav");
    const toggle = document.querySelector(".kn-nav__toggle");

    // Initial route render based on current location
    navigateTo(window.location.pathname || "/", { skipHistory: true });

    // Global click delegation for all internal links (including dynamic CTA)
    document.addEventListener("click", function (event) {
      // Respect modifier keys / middle-click for normal browser behavior
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = event.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/")) return;

      event.preventDefault();
      navigateTo(href);
      closeMobileNav(nav, toggle);
    });

    // Hamburger toggle
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        const isOpen = nav.classList.toggle("kn-nav--open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    // Browser navigation (back/forward)
    window.addEventListener("popstate", function (event) {
      const path = (event.state && event.state.path) || window.location.pathname;
      navigateTo(path, { skipHistory: true });
    });
  });
})();


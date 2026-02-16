// Job Notification Tracker – dashboard with job data, filters, save, and apply.

(function () {
  const SAVED_STORAGE_KEY = "jnt_saved_job_ids";

  function getJobs() {
    return (window.JOB_NOTIFICATION_TRACKER_JOBS || []).slice();
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
    } catch (_) {}
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

  function filterAndSortJobs(jobs, filters) {
    let list = jobs.slice();
    const kw = (filters.keyword || "").trim().toLowerCase();
    if (kw) {
      list = list.filter(function (j) {
        return (j.title || "").toLowerCase().indexOf(kw) >= 0 ||
          (j.company || "").toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (filters.location) {
      list = list.filter(function (j) { return (j.location || "") === filters.location; });
    }
    if (filters.mode) {
      list = list.filter(function (j) { return (j.mode || "") === filters.mode; });
    }
    if (filters.experience) {
      list = list.filter(function (j) { return (j.experience || "") === filters.experience; });
    }
    if (filters.source) {
      list = list.filter(function (j) { return (j.source || "") === filters.source; });
    }
    const sortBy = filters.sort || "latest";
    if (sortBy === "latest") {
      list.sort(function (a, b) {
        return (a.postedDaysAgo ?? 99) - (b.postedDaysAgo ?? 99);
      });
    } else if (sortBy === "salary") {
      list.sort(function (a, b) {
        const pa = (a.salaryRange || "").replace(/[^0-9]/g, "") || "0";
        const pb = (b.salaryRange || "").replace(/[^0-9]/g, "") || "0";
        return parseInt(pb, 10) - parseInt(pa, 10);
      });
    }
    return list;
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
    const saved = opts.saved !== undefined ? opts.saved : isSaved(job.id);
    const showUnsave = opts.showUnsave === true;
    const sourceClass = sourceBadgeClass(job.source);
    const posted = formatPostedDaysAgo(job.postedDaysAgo ?? 0);
    const locationMode = [job.location, job.mode].filter(Boolean).join(" · ");
    const saveLabel = saved ? "Saved" : "Save";
    const saveAction = showUnsave && saved ? "unsave" : (saved ? "" : "save");

    return (
      "<div class=\"kn-job-card\" data-job-id=\"" + (job.id || "") + "\">" +
        "<div class=\"kn-job-card__header\">" +
          "<h2 class=\"kn-job-card__title\">" + (job.title || "—") + "</h2>" +
          "<span class=\"kn-badge kn-badge--source " + sourceClass + "\">" + (job.source || "—") + "</span>" +
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
        "<div class=\"kn-filters\">" +
          "<div class=\"kn-filters__search\">" +
            "<input type=\"text\" class=\"kn-input\" id=\"kn-filter-keyword\" placeholder=\"Search title or company\" aria-label=\"Search jobs\">" +
          "</div>" +
          "<div class=\"kn-filters__group\">" +
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
    return {
      keyword: (root.querySelector("#kn-filter-keyword") || {}).value,
      location: (root.querySelector("#kn-filter-location") || {}).value,
      mode: (root.querySelector("#kn-filter-mode") || {}).value,
      experience: (root.querySelector("#kn-filter-experience") || {}).value,
      source: (root.querySelector("#kn-filter-source") || {}).value,
      sort: (root.querySelector("#kn-filter-sort") || {}).value || "latest"
    };
  }

  function updateDashboardJobList(container) {
    var listEl = container.querySelector("#kn-dashboard-jobs");
    if (!listEl) return;
    var jobs = getJobs();
    var filters = getDashboardFilters(container);
    var filtered = filterAndSortJobs(jobs, filters);
    var savedIds = getSavedIds();
    var html = filtered.length
      ? filtered.map(function (j) { return renderJobCard(j, { saved: savedIds.indexOf(j.id) >= 0 }); }).join("")
      : "<div class=\"kn-empty\"><p class=\"kn-empty__title\">No jobs match your filters.</p><p class=\"kn-empty__body\">Try adjusting the filters or search.</p></div>";
    listEl.innerHTML = html;
    attachDashboardCardActions(container);
  }

  function attachDashboardFilters(container) {
    var root = container.querySelector(".kn-route--dashboard") || container;
    var inputs = root.querySelectorAll("#kn-filter-keyword, #kn-filter-location, #kn-filter-mode, #kn-filter-experience, #kn-filter-source, #kn-filter-sort");
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
            <button type="button" class="kn-button kn-button--secondary" disabled>
              Save preferences (coming soon)
            </button>
          </div>
        </form>
      </section>
    `;
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
    container.innerHTML = `
      <header class="kn-route__header">
        <h1 class="kn-heading-1">Digest</h1>
        <p class="kn-route__subtext">
          A single, predictable touchpoint for new opportunities – delivered daily at 9AM.
        </p>
      </header>
      <div class="kn-empty">
        <p class="kn-empty__title">No digests generated yet.</p>
        <p class="kn-empty__body">
          Digest logic is intentionally not implemented. In the upcoming step, this view will render a realistic, time‑boxed stream of job recommendations.
        </p>
      </div>
    `;
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


// Lightweight client-side router for Job Notification Tracker
// Only renders premium skeleton states – no datasets or matching logic.

(function () {
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
    container.innerHTML = `
      <header class="kn-route__header">
        <h1 class="kn-heading-1">Dashboard</h1>
        <p class="kn-route__subtext">
          No jobs yet. In the next step, you will load a realistic dataset.
        </p>
      </header>
      <div class="kn-empty">
        <p class="kn-empty__title">Your job stream is calm for now.</p>
        <p class="kn-empty__body">
          Once preferences are configured and data is connected, this dashboard will surface a focused,
          noise-free list of roles worth your time.
        </p>
      </div>
    `;
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
    container.innerHTML = `
      <header class="kn-route__header">
        <h1 class="kn-heading-1">Saved</h1>
        <p class="kn-route__subtext">
          A quiet, deliberate shortlist of roles you actually care about.
        </p>
      </header>
      <div class="kn-empty">
        <p class="kn-empty__title">Nothing saved yet.</p>
        <p class="kn-empty__body">
          In the next step, you will be able to pin high-signal roles from your dashboard into this calm, review‑ready list.
        </p>
      </div>
    `;
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


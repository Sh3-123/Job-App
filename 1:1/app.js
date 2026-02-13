// Minimal client-side routing shell for Job Notification Tracker

(function () {
  const routes = {
    "/": { key: "dashboard", name: "Dashboard" },
    "/dashboard": { key: "dashboard", name: "Dashboard" },
    "/saved": { key: "saved", name: "Saved" },
    "/digest": { key: "digest", name: "Digest" },
    "/settings": { key: "settings", name: "Settings" },
    "/proof": { key: "proof", name: "Proof" },
  };

  function resolveRoute(pathname) {
    if (routes[pathname]) return routes[pathname];
    return routes["/dashboard"];
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

  function navigateTo(pathname, options) {
    const route = resolveRoute(pathname);
    const headingEl = document.getElementById("route-heading");
    const subtextEl = document.getElementById("route-subtext");

    if (headingEl && route) {
      headingEl.textContent = route.name;
    }
    if (subtextEl) {
      subtextEl.textContent = "This section will be built in the next step.";
    }

    document.title = route.name + " – Job Notification Tracker";
    updateActiveLink(route.key);

    if (!options || !options.skipHistory) {
      const targetPath = Object.keys(routes).includes(pathname) ? pathname : "/dashboard";
      window.history.pushState({ path: targetPath }, "", targetPath);
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector(".kn-nav");
    const toggle = document.querySelector(".kn-nav__toggle");
    const links = document.querySelectorAll(".kn-nav__link");

    // Initial route render based on current location
    const initialRoute = resolveRoute(window.location.pathname);
    navigateTo(window.location.pathname, { skipHistory: true });

    // Nav link handling
    links.forEach((link) => {
      link.addEventListener("click", function (event) {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("/")) return;

        event.preventDefault();
        navigateTo(href);
        closeMobileNav(nav, toggle);
      });
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


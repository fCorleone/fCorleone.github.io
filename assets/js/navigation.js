// Close the mobile menu after choosing a destination, including page anchors.
(() => {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  navbar.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("a.nav-link")) return;
    const toggle = navbar.querySelector(".navbar-toggler");
    if (toggle && toggle.getAttribute("aria-expanded") === "true") toggle.click();
  });
})();

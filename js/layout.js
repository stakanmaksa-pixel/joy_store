/**
 * Подключает общую шапку и подвал на любую страницу сайта.
 * Использование: на каждой странице добавь
 *   <div id="site-header"></div>
 *   ...контент страницы...
 *   <div id="site-footer"></div>
 *   <script src="/js/layout.js"></script>
 *
 * Чтобы подсветить активный пункт меню, укажи на теге <body>:
 *   <body data-page="guarantee">
 * Значение должно совпадать с data-page у нужной ссылки в partials/header.html
 */

async function loadPartial(url, mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    mount.innerHTML = await res.text();
  } catch (err) {
    console.error(`Не удалось загрузить ${url}`, err);
  }
}

async function initLayout() {
  await Promise.all([
    loadPartial("partials/header.html", "site-header"),
    loadPartial("partials/footer.html", "site-footer"),
  ]);

  // Подсветка активного пункта меню
  const currentPage = document.body.dataset.page;
  if (currentPage) {
    const link = document.querySelector(`.main-nav a[data-page="${currentPage}"]`);
    if (link) link.classList.add("active");
  }

  // Год в подвале
  const yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Мобильное меню (бургер)
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("mainNav");
  if (burger && nav) {
    burger.addEventListener("click", () => nav.classList.toggle("open"));
  }

  // Заглушки для корзины/избранного - подключим в следующей фазе
  const cartBtn = document.getElementById("cartBtn");
  const favBtn = document.getElementById("favoritesBtn");
  if (cartBtn) cartBtn.addEventListener("click", () => alert("Корзина скоро будет здесь"));
  if (favBtn) favBtn.addEventListener("click", () => alert("Избранное скоро будет здесь"));
}

document.addEventListener("DOMContentLoaded", initLayout);

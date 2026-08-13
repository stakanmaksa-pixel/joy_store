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

  // Год в подвале — диапазон с года основания до текущего
  const yearEl = document.getElementById("footerYear");
  if (yearEl) {
    const currentYear = new Date().getFullYear();
    yearEl.textContent = currentYear > 2023 ? `2023–${currentYear}` : "2023";
  }

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

  await initMegaMenu();
}

async function initMegaMenu() {
  const brandsCol = document.getElementById("megaBrands");
  const subCol = document.getElementById("megaSub");
  const modelsCol = document.getElementById("megaModels");
  if (!brandsCol) return; // на этой странице меню каталога не подключено

  let catalog;
  try {
    const res = await fetch("data/catalog.json", { cache: "no-store" });
    catalog = await res.json();
  } catch (err) {
    console.error("Не удалось загрузить каталог для меню", err);
    return;
  }

  function clearCol(col){ col.innerHTML = ""; }

  function showModels(catKey, subKey, products){
    clearCol(modelsCol);
    if (!products.length){
      modelsCol.innerHTML = `<div class="mega-link" style="color:var(--muted);cursor:default;">Скоро появятся</div>`;
      return;
    }
    products.forEach(product => {
      const model = product.name;
      const href = subKey
        ? `index.html?cat=${encodeURIComponent(catKey)}&sub=${encodeURIComponent(subKey)}&model=${encodeURIComponent(model)}`
        : `index.html?cat=${encodeURIComponent(catKey)}&model=${encodeURIComponent(model)}`;
      const a = document.createElement("a");
      a.className = "mega-link";
      a.href = href;
      a.textContent = model;
      modelsCol.appendChild(a);
    });
  }

  function showBrand(catKey){
    const brand = catalog[catKey];
    clearCol(subCol);
    clearCol(modelsCol);

    brandsCol.querySelectorAll(".mega-brand").forEach(el => {
      el.classList.toggle("active", el.dataset.cat === catKey);
    });

    if (brand.subcategories){
      Object.entries(brand.subcategories).forEach(([subKey, sub]) => {
        const a = document.createElement("a");
        a.className = "mega-brand";
        a.href = `index.html?cat=${encodeURIComponent(catKey)}&sub=${encodeURIComponent(subKey)}`;
        a.dataset.sub = subKey;
        a.innerHTML = `${sub.name} <span class="arrow">›</span>`;
        a.addEventListener("mouseenter", () => {
          subCol.querySelectorAll(".mega-brand").forEach(el => el.classList.toggle("active", el === a));
          showModels(catKey, subKey, sub.products);
        });
        subCol.appendChild(a);
      });
      // Автоматически показываем модели первой подкатегории
      const [firstSubKey, firstSub] = Object.entries(brand.subcategories)[0];
      showModels(catKey, firstSubKey, firstSub.products);
      subCol.querySelector(".mega-brand")?.classList.add("active");
    } else {
      showModels(catKey, null, brand.products);
    }
  }

  Object.entries(catalog).forEach(([catKey, brand], i) => {
    const hasChildren = brand.subcategories || brand.products.length;
    const a = document.createElement("a");
    a.className = "mega-brand";
    a.href = `index.html?cat=${encodeURIComponent(catKey)}`;
    a.dataset.cat = catKey;
    a.innerHTML = `${brand.name} <span class="arrow">›</span>`;
    a.addEventListener("mouseenter", () => showBrand(catKey));
    brandsCol.appendChild(a);
    if (i === 0) showBrand(catKey); // показываем первый бренд сразу при открытии меню
  });
}

document.addEventListener("DOMContentLoaded", initLayout);

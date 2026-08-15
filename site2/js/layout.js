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

  function modelsPanelHTML(catKey, subKey, products){
    if (!products.length){
      return `<div class="mega-link" style="color:var(--muted);cursor:default;">Скоро появятся</div>`;
    }
    return products.map(product => {
      const href = subKey
        ? `index.html?cat=${encodeURIComponent(catKey)}&sub=${encodeURIComponent(subKey)}&model=${encodeURIComponent(product.name)}`
        : `index.html?cat=${encodeURIComponent(catKey)}&model=${encodeURIComponent(product.name)}`;
      return `<a class="mega-link" href="${href}">${product.name}</a>`;
    }).join("");
  }

  // Строим ВСЁ меню один раз целиком (все панели сразу в DOM, скрытые кроме активной) -
  // это важно: если пересобирать содержимое колонок при каждом наведении, ссылка под
  // курсором может быть уничтожена и создана заново в момент клика, и клик не сработает.
  // Здесь элементы никогда не удаляются - только переключается видимость через класс "shown".
  let brandsHTML = "";
  let subPanelsHTML = "";
  let modelPanelsHTML = "";
  let firstCatKey = null;

  Object.entries(catalog).forEach(([catKey, brand], i) => {
    if (i === 0) firstCatKey = catKey;
    brandsHTML += `<a class="mega-brand${i === 0 ? ' active' : ''}" href="index.html?cat=${encodeURIComponent(catKey)}" data-cat="${catKey}">${brand.name} <span class="arrow">›</span></a>`;

    if (brand.subcategories){
      const subEntries = Object.entries(brand.subcategories);
      let subLinksHTML = "";
      subEntries.forEach(([subKey, sub], j) => {
        subLinksHTML += `<a class="mega-brand${j === 0 ? ' active' : ''}" href="index.html?cat=${encodeURIComponent(catKey)}&sub=${encodeURIComponent(subKey)}" data-cat="${catKey}" data-sub="${subKey}">${sub.name} <span class="arrow">›</span></a>`;
        modelPanelsHTML += `<div class="mega-model-panel${i === 0 && j === 0 ? ' shown' : ''}" data-cat="${catKey}" data-sub="${subKey}">${modelsPanelHTML(catKey, subKey, sub.products)}</div>`;
      });
      subPanelsHTML += `<div class="mega-sub-panel${i === 0 ? ' shown' : ''}" data-cat="${catKey}">${subLinksHTML}</div>`;
    } else {
      modelPanelsHTML += `<div class="mega-model-panel${i === 0 ? ' shown' : ''}" data-cat="${catKey}">${modelsPanelHTML(catKey, null, brand.products)}</div>`;
    }
  });

  brandsCol.innerHTML = brandsHTML;
  subCol.innerHTML = subPanelsHTML;
  modelsCol.innerHTML = modelPanelsHTML;

  function showOnly(container, selector, matchEl){
    container.querySelectorAll(selector).forEach(el => el.classList.toggle("shown", el === matchEl));
  }
  function activateOnly(container, selector, matchEl){
    container.querySelectorAll(selector).forEach(el => el.classList.toggle("active", el === matchEl));
  }

  brandsCol.querySelectorAll(".mega-brand").forEach(el => {
    el.addEventListener("mouseenter", () => {
      const catKey = el.dataset.cat;
      activateOnly(brandsCol, ".mega-brand", el);
      showOnly(subCol, ".mega-sub-panel", subCol.querySelector(`.mega-sub-panel[data-cat="${catKey}"]`));

      const subPanel = subCol.querySelector(`.mega-sub-panel[data-cat="${catKey}"]`);
      if (subPanel){
        // бренд с подкатегориями - показываем модели первой подкатегории
        const firstSub = subPanel.querySelector(".mega-brand");
        if (firstSub){
          activateOnly(subPanel, ".mega-brand", firstSub);
          showOnly(modelsCol, ".mega-model-panel", modelsCol.querySelector(`.mega-model-panel[data-cat="${catKey}"][data-sub="${firstSub.dataset.sub}"]`));
        }
      } else {
        // плоский бренд - модели сразу в третьей колонке, подкатегорий нет
        showOnly(modelsCol, ".mega-model-panel", modelsCol.querySelector(`.mega-model-panel[data-cat="${catKey}"]:not([data-sub])`));
      }
    });
  });

  subCol.querySelectorAll(".mega-brand[data-sub]").forEach(el => {
    el.addEventListener("mouseenter", () => {
      const catKey = el.dataset.cat;
      const subKey = el.dataset.sub;
      const panel = el.closest(".mega-sub-panel");
      activateOnly(panel, ".mega-brand", el);
      showOnly(modelsCol, ".mega-model-panel", modelsCol.querySelector(`.mega-model-panel[data-cat="${catKey}"][data-sub="${subKey}"]`));
    });
  });
}

document.addEventListener("DOMContentLoaded", initLayout);

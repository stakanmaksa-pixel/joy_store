/**
 * Корзина и избранное - хранятся в localStorage браузера покупателя (без бэкенда).
 * Публичный API: window.iJoyCart / window.iJoyFavorites, используется:
 *  - на карточках товаров: сердечко "в избранное" с атрибутом data-fav-toggle='{...JSON...}'
 *  - на странице товара: кнопка "В корзину" с атрибутом data-cart-add='{...JSON...}'
 *  - в шапке: кнопки #cartBtn / #favoritesBtn открывают попапы #popup-cart / #popup-favorites
 *    (сами попапы подключены в partials/popups.html)
 */
(function () {
  const CART_KEY = "ijoy_cart_v1";
  const FAV_KEY = "ijoy_favorites_v1";

  function readList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function writeList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* хранилище недоступно - тихо игнорируем */ }
  }

  function fmt(n) {
    if (typeof n !== "number") return n || "Цена уточняется";
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  }

  function getCart() { return readList(CART_KEY); }
  function setCart(list) { writeList(CART_KEY, list); updateBadges(); }
  function getFavorites() { return readList(FAV_KEY); }
  function setFavorites(list) { writeList(FAV_KEY, list); updateBadges(); }

  function cartTotal() {
    return getCart().reduce((sum, i) => sum + (typeof i.price === "number" ? i.price * i.qty : 0), 0);
  }

  window.iJoyCart = {
    add(item) {
      const cart = getCart();
      const existing = cart.find(i => i.id === item.id);
      if (existing) existing.qty += 1;
      else cart.push(Object.assign({ qty: 1 }, item));
      setCart(cart);
      renderCartPopup();
    },
    remove(id) {
      setCart(getCart().filter(i => i.id !== id));
      renderCartPopup();
    },
    setQty(id, qty) {
      const cart = getCart();
      const it = cart.find(i => i.id === id);
      if (it) { it.qty = Math.max(1, qty); setCart(cart); renderCartPopup(); }
    },
  };

  window.iJoyFavorites = {
    toggle(item) {
      const favs = getFavorites();
      const idx = favs.findIndex(i => i.id === item.id);
      if (idx >= 0) favs.splice(idx, 1);
      else favs.push(item);
      setFavorites(favs);
      renderFavoritesPopup();
    },
    isFav(id) { return getFavorites().some(i => i.id === id); },
  };

  function updateBadges() {
    const cartBadge = document.getElementById("cartBadge");
    const favBadge = document.getElementById("favBadge");
    const cartCount = getCart().reduce((s, i) => s + i.qty, 0);
    const favCount = getFavorites().length;
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.style.display = cartCount > 0 ? "flex" : "none";
    }
    if (favBadge) {
      favBadge.textContent = favCount;
      favBadge.style.display = favCount > 0 ? "flex" : "none";
    }
  }

  function syncFavHearts() {
    document.querySelectorAll("[data-fav-toggle]").forEach(el => {
      try {
        const item = JSON.parse(el.dataset.favToggle.replace(/&#39;/g, "'"));
        el.classList.toggle("active", window.iJoyFavorites.isFav(item.id));
      } catch (e) { /* битые данные - пропускаем */ }
    });
  }

  function renderCartPopup() {
    const el = document.getElementById("cartContent");
    if (!el) return;
    const cart = getCart();
    if (!cart.length) {
      el.innerHTML = `<p class="popup-sub">Корзина пуста — добавляйте товары со страницы товара кнопкой «В корзину».</p>`;
      return;
    }
    el.innerHTML = `
      <div class="cart-list">
        ${cart.map(i => `
          <div class="cart-row" data-id="${i.id}">
            <div class="cart-row-info">
              <div class="cart-row-name">${i.name}</div>
              ${i.subtitle ? `<div class="cart-row-sub">${i.subtitle}</div>` : ""}
              <div class="cart-row-price">${fmt(i.price)}</div>
            </div>
            <div class="cart-row-actions">
              <div class="qty-control">
                <button type="button" data-qty-minus aria-label="Меньше">−</button>
                <span>${i.qty}</span>
                <button type="button" data-qty-plus aria-label="Больше">+</button>
              </div>
              <button type="button" class="cart-remove" data-remove>Удалить</button>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="cart-total">Итого: <strong>${fmt(cartTotal())}</strong></div>
      <button type="button" class="btn-pill" id="cartCheckoutBtn" style="width:100%; margin-top:14px;">Оформить заказ</button>
    `;
    el.querySelectorAll("[data-qty-minus]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".cart-row").dataset.id;
        const item = getCart().find(i => i.id === id);
        if (item) window.iJoyCart.setQty(id, item.qty - 1);
      });
    });
    el.querySelectorAll("[data-qty-plus]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".cart-row").dataset.id;
        const item = getCart().find(i => i.id === id);
        if (item) window.iJoyCart.setQty(id, item.qty + 1);
      });
    });
    el.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => window.iJoyCart.remove(btn.closest(".cart-row").dataset.id));
    });
    const checkoutBtn = document.getElementById("cartCheckoutBtn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        const items = getCart().map(i => `${i.name}${i.subtitle ? ", " + i.subtitle : ""} × ${i.qty} — ${fmt(i.price)}`).join("\n");
        location.href = "order.html?item=" + encodeURIComponent(items);
      });
    }
  }

  function renderFavoritesPopup() {
    const el = document.getElementById("favoritesContent");
    if (!el) return;
    const favs = getFavorites();
    if (!favs.length) {
      el.innerHTML = `<p class="popup-sub">Пока пусто — нажимайте на ♡ на карточках товаров.</p>`;
      return;
    }
    el.innerHTML = `
      <div class="cart-list">
        ${favs.map(i => `
          <div class="cart-row" data-id="${i.id}">
            <a class="cart-row-info" href="${i.href || "#"}" style="text-decoration:none; color:inherit;">
              <div class="cart-row-name">${i.name}</div>
              ${i.subtitle ? `<div class="cart-row-sub">${i.subtitle}</div>` : ""}
              <div class="cart-row-price">${fmt(i.price)}</div>
            </a>
            <div class="cart-row-actions">
              <button type="button" class="cart-remove" data-remove>Удалить</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
    el.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => window.iJoyFavorites.toggle({ id: btn.closest(".cart-row").dataset.id }));
    });
  }

  // Открытие корзины/избранного по клику на иконки в шапке, сердечко "в избранное"
  // на карточках товаров, кнопка "В корзину" на странице товара - всё через одну
  // делегированную обработку на body, поэтому работает даже для контента,
  // подгруженного в DOM позже (шапка/попапы через partials).
  document.body.addEventListener("click", (e) => {
    if (e.target.closest("#cartBtn")) {
      renderCartPopup();
      const overlay = document.getElementById("popup-cart");
      if (overlay) overlay.classList.add("open");
      return;
    }
    if (e.target.closest("#favoritesBtn")) {
      renderFavoritesPopup();
      const overlay = document.getElementById("popup-favorites");
      if (overlay) overlay.classList.add("open");
      return;
    }
    const favToggle = e.target.closest("[data-fav-toggle]");
    if (favToggle) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const item = JSON.parse(favToggle.dataset.favToggle.replace(/&#39;/g, "'"));
        window.iJoyFavorites.toggle(item);
        favToggle.classList.toggle("active", window.iJoyFavorites.isFav(item.id));
      } catch (err) { console.error("Некорректные данные избранного", err); }
      return;
    }
    const cartAdd = e.target.closest("[data-cart-add]");
    if (cartAdd) {
      try {
        const item = JSON.parse(cartAdd.dataset.cartAdd.replace(/&#39;/g, "'"));
        window.iJoyCart.add(item);
        const original = cartAdd.textContent;
        cartAdd.textContent = "Добавлено ✓";
        setTimeout(() => { cartAdd.textContent = original; }, 1500);
      } catch (err) { console.error("Некорректные данные корзины", err); }
    }
  });

  function init() { updateBadges(); syncFavHearts(); }
  document.addEventListener("DOMContentLoaded", init);
  // partials (шапка/карточки) иногда подгружаются чуть позже DOMContentLoaded - подстрахуемся
  window.addEventListener("load", init);
  window.iJoySyncFavHearts = syncFavHearts;
})();

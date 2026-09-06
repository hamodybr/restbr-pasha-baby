(() => {
  if (window.__RESTBR_LIVE_PRICES_V2__) return;
  window.__RESTBR_LIVE_PRICES_V2__ = true;

  const PAGE_SIZE = 1000;
  const MAX_ROWS = 50000;
  let channel = null;
  let started = false;
  let activeChoiceProductId = null;
  let syncInFlight = null;

  const client = () =>
    typeof supabaseClient !== "undefined"
      ? supabaseClient
      : null;

  const lang = () =>
    window.RESTBR_LANG
      ? window.RESTBR_LANG()
      : (localStorage.getItem("RESTBR_LANG_V1") || "ar");

  const money = value => {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toLocaleString("en-US") + " " + (lang() === "en" ? "IQD" : "د.ع");
  };

  const db = () => window.RESTBR_DB;

  function productById(productId) {
    return db()?.products?.find(
      product => String(product.id) === String(productId)
    ) || null;
  }

  function optionById(product, optionId) {
    return product?.options?.find(
      option => String(option.id) === String(optionId)
    ) || null;
  }

  function productCard(productId) {
    return [...document.querySelectorAll("[data-product-card]")].find(
      card => String(card.dataset.productCard) === String(productId)
    ) || null;
  }

  function retailPrice(product, originalPrice) {
    const original = Number(originalPrice);
    if (!Number.isFinite(original) || original < 0) return null;

    const percent = Math.max(
      0,
      Math.min(100, Number(product?.discountPercent || 0))
    );

    if (!percent) return original;
    return Math.max(0, Math.round(original * (100 - percent) / 100));
  }

  function refreshProductDom(productId) {
    const product = productById(productId);
    const card = productCard(productId);

    if (product && card) {
      const rows = [...card.querySelectorAll(".sm-option")];

      (product.options || []).forEach((option, index) => {
        const row = rows[index];
        const price = row?.querySelector(".sm-price");
        if (price) price.textContent = money(option.price);

        const old = row?.querySelector(".pb-old-price");
        const original = Number(option.originalPrice ?? option.__retailOriginalPrice);
        const current = Number(option.price);

        if (old && Number.isFinite(original) && original > current) {
          old.textContent = money(original);
        }
      });
    }

    if (
      product &&
      activeChoiceProductId !== null &&
      String(activeChoiceProductId) === String(productId)
    ) {
      const choiceRows = [...document.querySelectorAll("#smChoiceList .sm-choice-option")];

      (product.options || []).forEach((option, index) => {
        const price = choiceRows[index]?.querySelector("b");
        if (price) price.textContent = money(option.price);
      });
    }
  }

  function notifyPriceUpdate(detail = {}) {
    window.dispatchEvent(
      new CustomEvent("restbr:prices-updated", { detail })
    );
  }

  function applyRow(row, notify = true) {
    if (!row || row.id === undefined || row.product_id === undefined) return false;

    const product = productById(row.product_id);
    const option = optionById(product, row.id);
    if (!product || !option) return false;

    const originalPrice = Number(row.price);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) return false;

    const nextPrice = retailPrice(product, originalPrice);
    if (!Number.isFinite(nextPrice)) return false;

    const previousPrice = Number(option.price);
    const previousOriginal = Number(option.originalPrice ?? option.__retailOriginalPrice);
    const changed = previousPrice !== nextPrice || previousOriginal !== originalPrice;

    option.__retailOriginalPrice = originalPrice;
    option.originalPrice = originalPrice;
    option.price = nextPrice;

    if (changed) refreshProductDom(product.id);

    if (changed && notify) {
      notifyPriceUpdate({
        productId: product.id,
        optionId: option.id,
        price: nextPrice,
        originalPrice,
        discountPercent: Number(product.discountPercent || 0)
      });
    }

    return changed;
  }

  async function fetchAllPriceRows() {
    const sb = client();
    if (!sb) return [];

    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await sb
        .from("product_options")
        .select("id,product_id,price")
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const page = Array.isArray(data) ? data : [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;

      if (from >= MAX_ROWS) {
        throw new Error(`product_options exceeded ${MAX_ROWS} row live-price safety limit`);
      }
    }

    return rows;
  }

  async function syncAllPrices() {
    if (syncInFlight) return syncInFlight;

    syncInFlight = (async () => {
      const sb = client();
      if (!sb || !db()?.products) return false;

      let data;
      try {
        data = await fetchAllPriceRows();
      } catch (error) {
        console.warn("Live price sync failed:", error?.message || error);
        return false;
      }

      const touchedProducts = new Set();
      let changed = false;

      data.forEach(row => {
        const didChange = applyRow(row, false);
        if (didChange) {
          changed = true;
          touchedProducts.add(String(row.product_id));
        }
      });

      touchedProducts.forEach(refreshProductDom);

      if (changed) {
        notifyPriceUpdate({
          bulk: true,
          rows: data.length,
          retailDiscountAware: true
        });
      }

      return changed;
    })().finally(() => {
      syncInFlight = null;
    });

    return syncInFlight;
  }

  function start() {
    const sb = client();
    if (started || !sb || !db()?.products) return;
    started = true;

    void syncAllPrices();

    channel = sb
      .channel("restbr-live-prices-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_options"
        },
        payload => {
          if (payload.eventType === "DELETE") {
            void syncAllPrices();
            return;
          }

          applyRow(payload.new, true);
        }
      )
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          void syncAllPrices();
        }
      });

    // Safety sync in case a mobile browser briefly drops the realtime socket.
    window.setInterval(() => void syncAllPrices(), 30000);
  }

  document.addEventListener("click", event => {
    const choose = event.target.closest(".sm-choose-options");
    if (choose) {
      activeChoiceProductId = choose.dataset.productId || null;
    }

    if (event.target.closest("#smChoiceClose,#smChoiceBackdrop")) {
      activeChoiceProductId = null;
    }
  }, true);

  window.addEventListener("online", () => void syncAllPrices());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncAllPrices();
  });

  // The commerce layer can replace the initial truncated catalog with its full
  // paginated version. Re-sync prices afterwards so every option stays current.
  window.addEventListener("restbr:catalog-expanded", () => void syncAllPrices());
  window.addEventListener("restbr:commerce-ready", () => void syncAllPrices());

  window.addEventListener("restbr:ready", start, { once: true });

  if (db()?.products) {
    start();
  }
})();

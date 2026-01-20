(() => {
  if (window.ShawqCartRewardAutoAdd) {
    return;
  }

  window.ShawqCartRewardAutoAdd = true;

  const SELECTOR = '[data-shawq-gwp="true"]';
  const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  let busy = false;
  let timer;

  const getConfig = () => document.querySelector(SELECTOR);

  const fetchCart = async () => {
    const response = await fetch(`${root}cart.js`, {
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cart');
    }

    return response.json();
  };

  const addReward = async (variantId) => {
    const response = await fetch(`${root}cart/add.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
        properties: {
          _shawq_reward: 'true'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add reward');
    }

    return response.json();
  };

  const removeReward = async (lineKey) => {
    const response = await fetch(`${root}cart/change.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        id: lineKey,
        quantity: 0
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove reward');
    }

    return response.json();
  };

  const refreshDrawer = () => {
    document.dispatchEvent(new CustomEvent('cart:refresh'));
  };

  const ensureReward = async () => {
    const config = getConfig();
    if (!config) {
      return;
    }

    const enabled = config.dataset.gwpEnabled === 'true';
    const threshold = Number(config.dataset.gwpThreshold || 0);
    const productId = Number(config.dataset.gwpProductId || 0);
    const variantId = Number(config.dataset.gwpVariantId || 0);
    const removeBelow = config.dataset.gwpRemove === 'true';

    if (!enabled || !threshold || !variantId || !productId) {
      return;
    }

    if (busy) {
      return;
    }

    busy = true;

    try {
      const cart = await fetchCart();
      const rewardItem = cart.items.find((item) => item.product_id === productId);
      const rewardIsMarked = rewardItem && rewardItem.properties && rewardItem.properties._shawq_reward === 'true';
      let eligibleSubtotal = cart.items_subtotal_price;

      if (rewardIsMarked) {
        eligibleSubtotal -= rewardItem.original_line_price || 0;
      }

      const eligible = eligibleSubtotal >= threshold;

      if (eligible && !rewardItem) {
        await addReward(variantId);
        refreshDrawer();
      } else if (!eligible && removeBelow && rewardIsMarked && rewardItem && rewardItem.key) {
        await removeReward(rewardItem.key);
        refreshDrawer();
      }
    } catch (error) {
      console.error('[Shawq reward]', error);
    } finally {
      busy = false;
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(ensureReward, 120);
  };

  document.addEventListener('cart:change', schedule);
  document.addEventListener('cart:refresh', schedule);
  document.addEventListener('cart-drawer:refreshed', schedule);
  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('pageshow', schedule);

  schedule();
})();

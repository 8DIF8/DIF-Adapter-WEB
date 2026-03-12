(() => {
  // TODO: ЗАМЕНИ ЭТО НА СВОЙ URL БЭКЕНДА (ГДЕ PHP И MYSQL)
  const API_BASE = 'https://difsleepy4.temp.swtest.ru/backend';

  const MIN_LENGTH = 8;
  const MAX_LENGTH = 600;
  const MIN_RATING = 1;
  const MAX_RATING = 5;

  function htmlEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'omit'
    });
    if (!res.ok) throw new Error('API GET failed');
    return res.json();
  }

  async function apiPost(path, payload) {
    const res = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });
    if (!res.ok) throw new Error('API POST failed');
    return res.json();
  }

  function renderPublicList(container, reviews) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(reviews) || !reviews.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = 'Пока никто не написал отзыв. Будешь первым.';
      container.appendChild(empty);
      return;
    }
    reviews.forEach((item) => {
      const el = document.createElement('article');
      el.className = 'review-item';
      const body = document.createElement('div');
      body.innerHTML = htmlEscape(item.text || '');
      const meta = document.createElement('div');
      meta.className = 'review-meta';
      const rating = typeof item.rating === 'number' ? item.rating : null;
      const ratingPart = rating ? `★ ${rating}/5 • ` : '';
      const dateStr = item.created_at || '';
      meta.textContent = `${ratingPart}аноним • ${dateStr}`;
      el.appendChild(body);
      el.appendChild(meta);
      container.appendChild(el);
    });
  }

  function renderAdminList(container, reviews, onDelete) {
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(reviews) || !reviews.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = 'Пока нет отзывов для модерации.';
      container.appendChild(empty);
      return;
    }
    reviews.forEach((item) => {
      const wrap = document.createElement('article');
      wrap.className = 'review-admin-item';
      const body = document.createElement('div');
      body.innerHTML = htmlEscape(item.text || '');
      const meta = document.createElement('div');
      meta.className = 'review-admin-meta';
      const left = document.createElement('span');
      const rating = typeof item.rating === 'number' ? item.rating : null;
      const ratingPart = rating ? `★ ${rating}/5 • ` : '';
      left.textContent = `${ratingPart}${item.created_at || ''}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost btn-danger';
      btn.textContent = 'удалить';
      btn.addEventListener('click', () => {
        if (typeof onDelete === 'function') onDelete(item.id);
      });
      meta.appendChild(left);
      meta.appendChild(btn);
      wrap.appendChild(body);
      wrap.appendChild(meta);
      container.appendChild(wrap);
    });
  }

  async function loadAndRenderReviews() {
    const listEl = document.querySelector('[data-reviews-list]');
    try {
      const data = await apiGet('reviews_list.php');
      if (!data || !data.ok) throw new Error('bad response');
      renderPublicList(listEl, data.reviews || []);
    } catch {
      if (listEl) {
        listEl.innerHTML = '';
        const err = document.createElement('p');
        err.className = 'error-text';
        err.textContent = 'Не удалось загрузить отзывы. Попробуй обновить позже.';
        listEl.appendChild(err);
      }
    }
  }

  function initReviewsPage() {
    const form = document.querySelector('[data-review-form]');
    const textarea = document.querySelector('[data-review-text]');
    const errorEl = document.querySelector('[data-review-error]');
    const helperEl = document.querySelector('[data-review-helper]');
    const ratingInputs = document.querySelectorAll('[data-review-rating]');

    if (helperEl) {
      helperEl.textContent = `Анонимно, от ${MIN_LENGTH} до ${MAX_LENGTH} символов. Оценка от 1 до 5★ обязательна.`;
    }

    loadAndRenderReviews();

    if (!form || !textarea) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;

      if (text.length < MIN_LENGTH) {
        if (errorEl) errorEl.textContent = `Минимум ${MIN_LENGTH} символов.`;
        return;
      }
      if (text.length > MAX_LENGTH) {
        if (errorEl) errorEl.textContent = `Максимум ${MAX_LENGTH} символов.`;
        return;
      }

      let rating = null;
      ratingInputs.forEach((input) => {
        if (input.checked) {
          const v = parseInt(input.value, 10);
          if (v >= MIN_RATING && v <= MAX_RATING) rating = v;
        }
      });
      if (rating === null) {
        if (errorEl) errorEl.textContent = 'Поставь оценку от 1 до 5★.';
        return;
      }

      try {
        if (errorEl) errorEl.textContent = '';
        await apiPost('reviews_add.php', { text, rating });
        textarea.value = '';
        ratingInputs.forEach((i) => {
          i.checked = false;
        });
        await loadAndRenderReviews();
      } catch {
        if (errorEl) errorEl.textContent = 'Не удалось отправить отзыв. Попробуй ещё раз позже.';
      }
    });
  }

  function initHomePage() {
    const avgEl = document.querySelector('[data-rating-avg]');
    const countEl = document.querySelector('[data-rating-count]');
    if (!avgEl || !countEl) return;
    apiGet('reviews_list.php')
      .then((data) => {
        if (!data || !data.ok || !Array.isArray(data.reviews)) {
          avgEl.textContent = '—';
          countEl.textContent = 'нет оценок';
          return;
        }
        const reviews = data.reviews;
        if (!reviews.length) {
          avgEl.textContent = '—';
          countEl.textContent = 'нет оценок';
          return;
        }
        const rated = reviews.filter(
          (r) =>
            typeof r.rating === 'number' &&
            r.rating >= MIN_RATING &&
            r.rating <= MAX_RATING
        );
        if (!rated.length) {
          avgEl.textContent = '—';
          countEl.textContent = 'нет оценок';
          return;
        }
        const sum = rated.reduce((acc, r) => acc + r.rating, 0);
        const avg = sum / rated.length;
        const rounded = Math.round(avg * 10) / 10;
        avgEl.textContent = rounded.toFixed(1);
        countEl.textContent = `${rated.length} отзыв(ов)`;
      })
      .catch(() => {
        avgEl.textContent = '—';
        countEl.textContent = 'нет оценок';
      });
  }

  function initAdminPage() {
    const loginFormWrap = document.querySelector('[data-admin-login]');
    const loginError = document.querySelector('[data-admin-error]');
    const sectionProtected = document.querySelector('[data-admin-protected]');
    const listEl = document.querySelector('[data-admin-reviews]');

    if (!loginFormWrap || !sectionProtected || !listEl) return;

    const form = loginFormWrap.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = form.querySelector('input[name="username"]');
      const pass = form.querySelector('input[name="password"]');
      if (!user || !pass) return;

      const uname = String(user.value || '').trim();
      const pwd = String(pass.value || '');

      if (uname !== 'WhiteHatDIF' || !pwd) {
        if (loginError) loginError.textContent = 'Неверная пара логин/пароль.';
        return;
      }

      if (loginError) loginError.textContent = '';
      loginFormWrap.hidden = true;
      sectionProtected.hidden = false;

      async function refresh() {
        try {
          const data = await apiGet('reviews_list.php');
          if (!data || !data.ok) throw new Error();
          renderAdminList(listEl, data.reviews || [], async (id) => {
            try {
              await apiPost('reviews_delete.php', { id, password: pwd });
              await refresh();
            } catch {
              if (loginError) loginError.textContent = 'Ошибка при удалении.';
            }
          });
        } catch {
          listEl.innerHTML = '';
          const err = document.createElement('p');
          err.className = 'error-text';
          err.textContent = 'Не удалось загрузить отзывы.';
          listEl.appendChild(err);
        }
      }

      refresh();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.getAttribute('data-page');
    if (page === 'reviews') {
      initReviewsPage();
    } else if (page === 'home') {
      initHomePage();
    } else if (page === 'admin') {
      initAdminPage();
    }
  });
})();


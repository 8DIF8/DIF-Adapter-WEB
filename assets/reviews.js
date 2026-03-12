(() => {
  const STORAGE_KEY = 'dif_reviews_v1';
  const MAX_LENGTH = 600;
  const MIN_LENGTH = 8;
  const MAX_PER_SESSION = 5;
  const SESSION_KEY = 'dif_reviews_session_count';

  function htmlEscape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadReviews() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 200);
    } catch {
      return [];
    }
  }

  function saveReviews(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch {
      /* ignore quota errors */
    }
  }

  function getSessionCount() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  function incrementSessionCount() {
    try {
      const next = getSessionCount() + 1;
      sessionStorage.setItem(SESSION_KEY, String(next));
      return next;
    } catch {
      return MAX_PER_SESSION + 1;
    }
  }

  function formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function renderPublicList(container) {
    if (!container) return;
    const list = loadReviews();
    container.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = 'Пока никто не написал отзыв. Будешь первым.';
      container.appendChild(empty);
      return;
    }
    list
      .slice()
      .reverse()
      .forEach((item) => {
        const el = document.createElement('article');
        el.className = 'review-item';
        const body = document.createElement('div');
        body.innerHTML = htmlEscape(item.text);
        const meta = document.createElement('div');
        meta.className = 'review-meta';
        meta.textContent = `аноним • ${formatDate(item.createdAt)}`;
        el.appendChild(body);
        el.appendChild(meta);
        container.appendChild(el);
      });
  }

  function renderAdminList(container) {
    if (!container) return;
    const list = loadReviews();
    container.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = 'Пока нет отзывов для модерации.';
      container.appendChild(empty);
      return;
    }
    list
      .slice()
      .reverse()
      .forEach((item) => {
        const wrap = document.createElement('article');
        wrap.className = 'review-admin-item';
        const body = document.createElement('div');
        body.innerHTML = htmlEscape(item.text);
        const meta = document.createElement('div');
        meta.className = 'review-admin-meta';
        const left = document.createElement('span');
        left.textContent = formatDate(item.createdAt);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost btn-danger';
        btn.textContent = 'удалить';
        btn.addEventListener('click', () => {
          const all = loadReviews();
          const filtered = all.filter((r) => r.id !== item.id);
          saveReviews(filtered);
          renderAdminList(container);
        });
        meta.appendChild(left);
        meta.appendChild(btn);
        wrap.appendChild(body);
        wrap.appendChild(meta);
        container.appendChild(wrap);
      });
  }

  async function hashPassword(input) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // SHA-256("dAbZjGPZ777") precomputed offline
  const ADMIN_HASH = '32a8f55c37ff3989aaf0ada1aaadd601cb5186619c971e918462b41986038ca6';

  function initPublicPage() {
    const listEl = document.querySelector('[data-reviews-list]');
    const form = document.querySelector('[data-review-form]');
    const textarea = document.querySelector('[data-review-text]');
    const errorEl = document.querySelector('[data-review-error]');
    const helperEl = document.querySelector('[data-review-helper]');

    if (helperEl) {
      helperEl.textContent = `Анонимно, от ${MIN_LENGTH} до ${MAX_LENGTH} символов. Без ссылок и личных данных.`;
    }

    renderPublicList(listEl);

    if (!form || !textarea) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = textarea.value.trim();
      if (!raw) return;

      if (raw.length < MIN_LENGTH) {
        if (errorEl) errorEl.textContent = `Минимум ${MIN_LENGTH} символов.`;
        return;
      }
      if (raw.length > MAX_LENGTH) {
        if (errorEl) errorEl.textContent = `Максимум ${MAX_LENGTH} символов.`;
        return;
      }

      const current = getSessionCount();
      if (current >= MAX_PER_SESSION) {
        if (errorEl) errorEl.textContent = 'Лимит отзывов за сессию исчерпан. Попробуй позже.';
        return;
      }
      const next = incrementSessionCount();
      if (next > MAX_PER_SESSION) {
        if (errorEl) errorEl.textContent = 'Лимит отзывов за сессию исчерпан. Попробуй позже.';
        return;
      }

      const list = loadReviews();
      const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: raw,
        createdAt: Date.now()
      };
      list.push(item);
      saveReviews(list);
      textarea.value = '';
      if (errorEl) errorEl.textContent = '';
      renderPublicList(listEl);
    });
  }

  function initAdminPage() {
    const loginForm = document.querySelector('[data-admin-login]');
    const loginError = document.querySelector('[data-admin-error]');
    const sectionProtected = document.querySelector('[data-admin-protected]');
    const listEl = document.querySelector('[data-admin-reviews]');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = loginForm.querySelector('input[name="username"]');
      const pass = loginForm.querySelector('input[name="password"]');
      if (!user || !pass) return;

      const uname = String(user.value || '').trim();
      const pwd = String(pass.value || '');
      if (uname !== 'WhiteHatDIF') {
        if (loginError) loginError.textContent = 'Неверная пара логин/пароль.';
        return;
      }

      try {
        const hash = await hashPassword(pwd);
        if (hash !== ADMIN_HASH) {
          if (loginError) loginError.textContent = 'Неверная пара логин/пароль.';
          return;
        }
      } catch {
        if (loginError) loginError.textContent = 'Браузер не поддерживает безопасную проверку пароля.';
        return;
      }

      if (loginError) loginError.textContent = '';
      if (sectionProtected) {
        sectionProtected.hidden = false;
      }
      loginForm.hidden = true;
      renderAdminList(listEl);
    });

    if (sectionProtected && listEl && !sectionProtected.hidden) {
      renderAdminList(listEl);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.getAttribute('data-page');
    if (page === 'reviews') {
      initPublicPage();
    } else if (page === 'admin') {
      initAdminPage();
    }
  });
})();


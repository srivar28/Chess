
(async () => {
  const host = document.querySelector('#sidebar');
  if (!host) return;

  try {
    const res = await fetch('/partials/sidebar.html', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load sidebar: ${res.status}`);
    host.innerHTML = await res.text();

    let isAuthed = false;
    try {
      const me = await fetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
      isAuthed = me.ok;
    } catch { }

    const loginLink = host.querySelector('a.nav-link[href="/login.html"]');
    const logoutBtn = host.querySelector('#logoutBtn');

    if (isAuthed) {
      loginLink?.closest('li')?.remove();
      if (logoutBtn) {
        logoutBtn.classList.remove('d-none');
        logoutBtn.addEventListener('click', async () => {
          try {
            const r = await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Accept': 'application/json' }
            });
            window.location.replace('/login.html');
          } catch {
          }
        });
      }
    } else {
      logoutBtn?.classList.add('d-none');
    }

    const current = location.pathname.replace(/\/$/, '') || '/index.html';
    host.querySelectorAll('a.nav-link').forEach(a => {
      const href = (a.getAttribute('href') || '').replace(/\/$/, '');
      if (href === current) a.classList.add('active');
    });
  } catch (err) {
    console.error(err);
    host.innerHTML = '<div class="text-danger p-3">Sidebar failed to load.</div>';
  }
})();

// /js/joinGame.js
const form = document.querySelector('form[action="/api/joinGame"]');
const codeInput = document.getElementById('gameCode');
const msgEl = document.getElementById('joinMsg');
const accountNameEl = document.getElementById('accountName');

function showError(text) {
    if (!msgEl) return alert(text);
    msgEl.textContent = text || 'Something went wrong.';
    msgEl.style.display = '';
}
function showInfo(text) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.style.display = text ? '' : 'none';
}
function clearError() { showInfo(''); }

const urlCode = new URLSearchParams(location.search).get('code');
const storedCode = sessionStorage.getItem('pendingJoinCode');
if (codeInput && !codeInput.value) {
    codeInput.value = (urlCode || storedCode || '').trim();
}
if (urlCode) {
    sessionStorage.setItem('pendingJoinCode', urlCode.trim());
}

(async () => {
    try {
        const res = await fetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            if (codeInput?.value) sessionStorage.setItem('pendingJoinCode', codeInput.value.trim());
            window.location.href = '/login.html';
            return;
        }
        const { username } = await res.json();
        if (accountNameEl && username) accountNameEl.textContent = username;

        const pending = (sessionStorage.getItem('pendingJoinCode') || '').trim();
        if (form && codeInput && pending && !urlCode) {
            codeInput.value = pending;
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    } catch {
        if (codeInput?.value) sessionStorage.setItem('pendingJoinCode', codeInput.value.trim());
        window.location.href = '/login.html';
    }
})();

if (form && codeInput) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        const btn = form.querySelector('button[type="submit"]');
        const gameCode = (codeInput.value || '').trim().toLowerCase();

        if (!gameCode) return showError('Please enter a game code.');

        btn?.setAttribute('disabled', 'disabled');
        showInfo('Joining…');

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ gameCode })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to join game');
            if (!data.joinCode) throw new Error('Invalid or expired game code.');

            sessionStorage.removeItem('pendingJoinCode');
            window.location.href = `/game.html?code=${encodeURIComponent(data.joinCode)}`;
        } catch (err) {
            showError(err.message || 'Error joining game');
            btn?.removeAttribute('disabled');
        }
    });
}

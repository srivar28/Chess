const colorEl = document.getElementById('colorSelect');
const form = document.querySelector('form[action="/api/gameSetup"]');
const msgEl = document.getElementById('setupMsg');

const accountNameEl = document.getElementById('accountName');


function showError(text) {
    if (!msgEl) return alert(text);
    msgEl.textContent = text;
    msgEl.style.display = '';
}

(async () => {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Accept': 'application/json' }
        })

        if (!res.ok) {
            window.location.href = '/login.html'
            return
        }

        const { username } = await res.json()
        if (accountNameEl) {
            if (accountNameEl) accountNameEl.textContent = username;
        }
    } catch {
        window.location.href = '/login.html'
    }
})()

if (form && colorEl) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const payload = {
            color: colorEl.value,
        }
        try {
            const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create game');
            }

            const data = await res.json();
            sessionStorage.setItem('joinCode', data.joinCode);
            window.location.href = `/game.html?code=${encodeURIComponent(data.joinCode)}`;

        } catch (err) {
            showError(err.message || 'Error creating game');
        }

    })
}

const nameEl = document.getElementById('accountName');

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
        if (nameEl) {
            nameEl.textContent = username
        }
    } catch {
        window.location.href = '/login.html'
    }
})()
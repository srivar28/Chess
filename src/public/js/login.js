//login.js

const form = document.querySelector('form[action="/api/auth/login"]') || document.querySelector('form');
const msg = document.getElementById('loginMsg');

if (form && msg) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        hide()

        const username = (form.elements['username']?.value || '').trim()
        const password = form.elements['password']?.value || ''

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (res.ok) {
                window.location.href = '/'
                return
            }

            let message = 'Invalid username or password.'
            try {
                const data = await res.json()
                if (data && typeof data.error === 'string') message = data.error
            } catch { }
            show(message)
        } catch {
            show('Network error. Try again.')
        }
    })
}

function show(text) {
    msg.textContent = text
    msg.style.display = 'block'
}

function hide() {
    msg.textContent = ''
    msg.style.display = 'none'
}

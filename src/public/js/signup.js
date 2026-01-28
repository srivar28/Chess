const form = document.querySelector('form');
const pwd = document.getElementById('password');
const confirm = document.getElementById('confirmPassword');
const msg = document.getElementById('signupMsg');

function validateMatch() {
    if (confirm.value && confirm.value !== pwd.value) {
        confirm.setCustomValidity('Passwords do not match');
    } else {
        confirm.setCustomValidity('');
    }
}

pwd.addEventListener('input', validateMatch);
confirm.addEventListener('input', validateMatch);

form.addEventListener('submit', (e) => {
    validateMatch();
    if (!form.checkValidity()) {
        e.preventDefault();
        form.classList.add('was-validated');
    }
});

const username = document.getElementById('usernameInput')

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        hide()

        // ensure validity before posting
        validateMatch();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return; // <-- prevent fetch on invalid form
        }

        const username = (form.elements['username']?.value || '').trim()
        const newPassword = form.elements['newPassword']?.value || ''  // <-- define this

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ username, newPassword })        // <-- use newPassword
            })

            if (res.ok) {
                window.location.href = '/index.html'
                returni
            }

            let message = 'Username is Already Taken'

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
    if (!msg) return
    msg.textContent = text
    msg.style.display = 'block'
}

function hide() {
    if (!msg) return
    msg.textContent = ''
    msg.style.display = 'none'
}

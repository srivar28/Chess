import { fenToMap, isDark, squareAt } from './chessUtils.js'


const nameEl = document.getElementById('player-name')
const statusEl = document.getElementById('gameStatus')
const oppNameEl = document.getElementById('opponentName')
const userDotEl = document.getElementById('user-color-dot')
const oppDotEl = document.getElementById('opponent-color-dot')
const joinBadgeEl = document.getElementById('joinCodeBadge')
const msgEl = document.getElementById('gameMsg')
const boardEl = document.getElementById('chessboard')
const turnEl = document.getElementById('gameTurn')
const feedbackEl = document.getElementById('gameFeedback')
const moveListEl = document.getElementById('moveList')
const opponentCapturedEl = document.getElementById('opponentCaptured')
const userCapturedEl = document.getElementById('userCaptured')
const resignBtn = document.getElementById('resignBtn')

let socket = null
let currentGame = null
let currentCode = null
let selectedSquare = null
let currentUsername = null

function setupSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO client not loaded')
        return
    }

    socket = io()

    socket.on('connect', () => {
        if (!currentCode) return;
        socket.emit('game:join', { joinCode: currentCode })
    })

    socket.on('game:update', (serverGame) => {
        if (!serverGame) return

        const seat = currentGame?.seat
        currentGame = { ...serverGame, seat: seat || serverGame.seat }

        render(currentGame, currentUsername)
    })

    socket.on('disconnect', () => {
        console.log('Socket disconnected')
    })
}

function clearSelection() {
    if (!boardEl) return
    boardEl.querySelectorAll('.square.selected').forEach(el => {
        el.classList.remove('selected')
    })
}

const START_COUNTS = {
    white: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    black: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
}


function computeCapturedFromFen(fen) {
    const map = fenToMap(fen)
    const counts = {
        white: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
        black: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    }

    for (const sq in map) {
        const piece = map[sq]
        if (!piece) continue
        const side = piece === piece.toUpperCase() ? 'white' : 'black'
        const type = piece.toLowerCase()
        if (counts[side][type] != null) {
            counts[side][type]++
        }
    }

    const whiteCaptured = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
    const blackCaptured = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }

    for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const missingBlack = (START_COUNTS.black[t] || 0) - (counts.black[t] || 0)
        const missingWhite = (START_COUNTS.white[t] || 0) - (counts.white[t] || 0)
        whiteCaptured[t] = Math.max(0, missingBlack)
        blackCaptured[t] = Math.max(0, missingWhite)
    }

    return { whiteCaptured, blackCaptured }
}

function capturedGlyphs(captured, capturedFromSide) {
    const order = ['q', 'r', 'b', 'n', 'p']

    return order.reduce((result, t) => {
        const count = captured[t] || 0
        if (!count) return result

        const glyphKey = capturedFromSide === 'white' ? t.toUpperCase() : t.toLowerCase()
        const glyphChar = GLYPH[glyphKey] || ''

        return result + glyphChar.repeat(count)
    }, '')
}

function renderCaptured(game) {
    if (!opponentCapturedEl && !userCapturedEl) return
    if (!game.fen) return

    const { whiteCaptured, blackCaptured } = computeCapturedFromFen(game.fen)

    const whiteHasCaptured = capturedGlyphs(whiteCaptured, 'black')
    const blackHasCaptured = capturedGlyphs(blackCaptured, 'white')

    if (game.seat === 'black') {
        if (userCapturedEl) userCapturedEl.textContent = blackHasCaptured
        if (opponentCapturedEl) opponentCapturedEl.textContent = whiteHasCaptured
    } else {
        if (userCapturedEl) userCapturedEl.textContent = whiteHasCaptured
        if (opponentCapturedEl) opponentCapturedEl.textContent = blackHasCaptured
    }
}


function renderMoves(game) {
    if (!moveListEl) return

    const moves = game.moves || []
    moveListEl.innerHTML = ''

    const movePairs = []
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push([moves[i], moves[i + 1]])
    }

    const items = movePairs.map(([whiteMove, blackMove]) => {
        const li = document.createElement('li')
        li.className = 'move-list-item'

        let text = ''
        if (whiteMove) text += ' ' + (whiteMove.san || `${whiteMove.from}-${whiteMove.to}`)
        if (blackMove) text += ' ' + (blackMove.san || `${blackMove.from}-${blackMove.to}`)

        li.textContent = text
        return li
    })

    items.forEach(li => moveListEl.appendChild(li))

    if (moveListEl.lastElementChild) {
        moveListEl.lastElementChild.scrollIntoView({ block: 'end' })
    }
}

function showMsg(text) {
    if (msgEl) {
        msgEl.textContent = text || ''
        msgEl.style.display = text ? '' : 'none'
    }

    if (feedbackEl) {
        const msg = text || ''
        feedbackEl.textContent = msg

        feedbackEl.classList.remove('bg-secondary', 'bg-warning', 'bg-danger', 'text-dark', 'text-light')

        if (!msg) {
            feedbackEl.classList.add('bg-secondary')
        } else {
            feedbackEl.classList.add('bg-danger', 'text-light')
        }
    }
}

function setDot(el, color) {
    if (!el) return;
    if (!color) {
        el.style.backgroundColor = 'transparent';
        el.style.border = 'none';
        el.hidden = true;
        el.removeAttribute('aria-label');
        return;
    }
    el.hidden = false;
    el.style.backgroundColor = color === 'white' ? '#fff' : '#000';
    el.style.border = color === 'white' ? '1px solid #000' : '1px solid #fff';
    el.title = color;
    el.setAttribute('aria-label', `Player color: ${color}`);
}
function getJoinCode() {
    const p = new URLSearchParams(location.search);
    let joinCode =
        (p.get('code') || sessionStorage.getItem('joinCode') || sessionStorage.getItem('pendingJoinCode') || '')
            .trim()
            .toLowerCase()
    return joinCode
}

async function requireAuth() {
    const res = await fetch('/api/auth/me', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
        location.href = '/login.html';
        return null;
    }
    const { username } = await res.json();
    if (nameEl) nameEl.textContent = username;
    return username;
}

async function loadGame(code) {
    const res = await fetch(`/api/game/${encodeURIComponent(code)}`, {
        headers: { 'Accept': 'application/json' }
    });
    if (res.status === 401) {
        location.href = '/login.html';
        return null;
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || 'Failed to load game')
    }
    return data;
}
const FILES = 'abcdefgh'.split('')
const RANKS_DESC = ['8', '7', '6', '5', '4', '3', '2', '1']
const RANKS_ASC = ['1', '2', '3', '4', '5', '6', '7', '8']
const GLYPH = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' }


function sizePieces() {
    if (!boardEl) return
    const sq = boardEl.clientWidth / 8;
    boardEl.querySelectorAll('.piece').forEach(el => {
        el.style.fontSize = `${sq * 0.78}px`;
    })
}

const PIECE_NAME = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };

function drawBoard(fen, seat) {
    if (!boardEl) return;
    const map = fenToMap(fen);
    boardEl.classList.add('w-100', 'h-100', 'rounded');
    boardEl.innerHTML = '';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = squareAt(c, r, seat);
            const [file, rank] = [sq[0], sq[1]];

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `square ${isDark(file, rank) ? 'dark' : 'light'} d-flex align-items-center justify-content-center`;
            btn.dataset.square = sq;

            let label = `Empty square ${sq}`;
            const piece = map[sq];

            if (piece) {
                const span = document.createElement('span');
                span.className = 'piece';
                span.dataset.piece = piece;
                span.textContent = GLYPH[piece] || '';
                span.setAttribute('aria-hidden', 'true');
                btn.appendChild(span);

                const color = piece === piece.toUpperCase() ? 'White' : 'Black';
                const name = PIECE_NAME[piece.toLowerCase()];
                label = `${color} ${name} on ${sq}`;
            }

            btn.setAttribute('aria-label', label);
            boardEl.appendChild(btn);
        }
    }
    sizePieces();
}

async function handleSquareClick(e) {
    const { square, piece } = e.detail

    if (!selectedSquare) {
        if (!piece) return
        selectedSquare = square
        clearSelection()
        const sqEl = boardEl.querySelector(`.square[data-square="${square}"]`)
        if (sqEl) {
            sqEl.classList.add('selected')
        }
        return
    }

    const from = selectedSquare
    const to = square

    clearSelection()
    selectedSquare = null

    if (from === to) return

    try {
        await sendMove(from, to)
    } catch (err) {
        console.error(err)
        showMsg(err.message || 'Error making move.')
    }
}

async function sendMove(from, to) {
    if (!currentCode) return
    const res = await fetch(`/api/game/${encodeURIComponent(currentCode)}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ from, to }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) throw new Error(data.error || 'Move failed')
    currentGame = data
    showMsg('')
    render(currentGame, currentUsername)
}

function onBoardClick(e) {

    const squareEl = e.target.closest('.square')
    if (!squareEl || !boardEl.contains(squareEl)) return

    const pieceEl = e.target.closest('.piece') || squareEl.querySelector('.piece')
    const square = squareEl.dataset.square
    const pieceCode = pieceEl ? pieceEl.dataset.piece : null


    if (pieceCode) {
        const color = pieceCode === pieceCode.toUpperCase() ? 'white' : 'black'
        const name = PIECE_NAME[pieceCode.toLowerCase()]
        console.log(`Clicked ${color} ${name} on ${square}`, { square, pieceCode, color, name })

    } else {
        console.log(`Clicked empty square ${square}`, { square })
    }

    boardEl.dispatchEvent(new CustomEvent('board:squareclick', {
        detail: { square, piece: pieceCode }, bubbles: true
    }))
}

async function onResign() {
    if (!currentCode || !currentGame) return

    if (!['Waiting', 'Active'].includes(currentGame.status)) {
        showMsg('Game is already finished.')
        return
    }

    if (!['white', 'black'].includes(currentGame.seat)) {
        showMsg('Only players can resign.')
        return
    }

    const confirmed = window.confirm('Are you sure you want to resign?')
    if (!confirmed) return

    try {
        const res = await fetch(`/api/game/${encodeURIComponent(currentCode)}/resign`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            throw new Error(data.error || 'Could not resign.')
        }

        currentGame = data
        showMsg('')
        render(currentGame, currentUsername)
    } catch (err) {
        console.error(err)
        showMsg(err.message || 'Error resigning.')
    }
}


//page rendering
function render(game, username) {
    if (joinBadgeEl) joinBadgeEl.textContent = game.joinCode || ''
    if (statusEl) {
        if (game.status === 'Resigned' && game.result) {
            let winnerText = ''
            if (game.result === '1-0') {
                winnerText = 'White wins (Black resigned)'
            } else if (game.result === '0-1') {
                winnerText = 'Black wins (White resigned)'
            } else {
                winnerText = 'Game over (Resigned)'
            }
            statusEl.textContent = winnerText
        } else {
            statusEl.textContent = game.status || ''
        }
    }


    if (turnEl) {
        const fen = game.fen || ''
        const parts = fen.split(' ')
        const side = parts[1] === 'b' ? 'Black' : 'White'
        turnEl.textContent = side


        turnEl.classList.remove('bg-secondary', 'bg-dark', 'text-light')
        turnEl.classList.add('bg-secondary')

        if (parts[1] === 'w') {
            turnEl.classList.add('text-dark', 'bg-white', 'border', 'border-dark')
        } else if (parts[1] === 'b') {
            turnEl.classList.add('bg-dark', 'text-light', 'border', 'border-white')
        }
    }

    renderMoves(game)
    renderCaptured(game)

    if (feedbackEl) {
        const hasError = !!(msgEl && msgEl.textContent)
        if (!hasError) {
            feedbackEl.classList.remove('bg-secondary', 'bg-warning', 'bg-danger', 'text-dark', 'text-light')

            if (game.inCheck) {
                feedbackEl.textContent = 'Check'
                feedbackEl.classList.add('bg-warning', 'text-dark')
            } else {
                feedbackEl.textContent = ''
                feedbackEl.classList.add('bg-secondary')
            }
        }
    }

    const isPlayer = ['white', 'black'].includes(game.seat)
    const isFinished = ['Checkmate', 'Stalemate', 'Draw', 'Resigned'].includes(game.status)

    if (resignBtn) {
        resignBtn.disabled = !isPlayer || isFinished
    }

    if (!isPlayer) {
        showMsg('You are not a player in this game.')
        setTimeout(() => { location.href = '/joinGame.html'; }, 600)
        return;
    }


    if (game.seat === 'white') {
        if (oppNameEl) oppNameEl.textContent = game.blackName || 'Waiting for opponent…'
        setDot(userDotEl, 'white')
        setDot(oppDotEl, 'black')
    } else {
        if (oppNameEl) oppNameEl.textContent = game.whiteName || 'Waiting for opponent…'
        setDot(userDotEl, 'black')
        setDot(oppDotEl, 'white')
    }
    drawBoard(game.fen, game.seat)
}

(async () => {
    try {
        const username = await requireAuth(); if (!username) return
        currentUsername = username

        const joinCode = getJoinCode()
        if (!joinCode) { showMsg('Missing game code.'); location.href = '/joinGame.html'; return }

        currentCode = joinCode


        let game = await loadGame(joinCode); if (!game) return
        render(game, username)

        currentGame = game

        setupSocket()

    } catch (err) {
        console.error(err);
        showMsg(err.message || 'Something went wrong loading the game.');
    }
})()
boardEl.addEventListener('click', onBoardClick)
boardEl.addEventListener('board:squareclick', handleSquareClick)
window.addEventListener('resize', sizePieces)
resignBtn.addEventListener('click', onResign)

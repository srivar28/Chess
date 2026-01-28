// app.mjs
import 'dotenv/config';
import './db.mjs';
import bcrypt from 'bcryptjs';
import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Chess } from 'chess.js';

const User = mongoose.model('User')
const Game = mongoose.model('Game')
const Move = mongoose.model('Move')

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
})

const { DSN, SESSION_SECRET, NODE_ENV } = process.env;
const isProd = NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(session({
  name: 'sid',
  secret: SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: DSN }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function serializeGame(game) {
  return {
    joinCode: game.joinCode,
    status: game.status,
    result: game.result ?? null,
    whiteName: game.whiteName,
    blackName: game.blackName,
    fen: game.fen,
    pgn: game.pgn,
    moves: game.moves,
    drawOfferedBy: game.drawOfferedBy ?? null,
  }
}

function emitGameUpdate(game) {
  if (!game || !game.joinCode) return
  const payload = serializeGame(game)
  io.to(game.joinCode).emit('game:update', payload)
}


app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+passwordHash");
  const invalid = !user || !(await bcrypt.compare(password, user.passwordHash));
  if (invalid) return res.status(401).json({ error: "Invalid username or password." });

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Session regenerate failed" });
    req.session.userId = user._id;
    req.session.save(err2 => {
      if (err2) return res.status(500).json({ error: "Session save failed" });

      const wantsJSON = req.headers.accept?.includes('application/json') || req.xhr;
      if (wantsJSON) return res.json({ ok: true });
      return res.redirect('/index.html');
    });
  });
});


app.post("/api/auth/signup", async (req, res) => {
  const { username, newPassword } = req.body;
  const exists = await User.findOne({ username }).lean();
  if (exists) return res.status(401).json({ error: "Username is Already Taken" });

  const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
  const user = new User({ username, passwordHash: hash });
  await user.save();

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Session regenerate failed" });
    req.session.userId = user._id;
    req.session.save(err2 => {
      if (err2) return res.status(500).json({ error: "Session save failed" });
      res.redirect('/index.html');
    });
  });
});

app.get("/api/auth/me", async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });

  const user = await User.findById(req.session.userId).select("username").lean();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  res.json({ username: user.username });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Logout failed" })
    res.clearCookie('sid', { path: '/', sameSite: 'lax', secure: isProd })
    res.json({ ok: true });
  });

})
function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

async function generateJoinCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const pick = () => Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  let code;
  do {
    code = pick();
  } while (await Game.findOne({ joinCode: code }).lean());
  return code;
}

app.post('/api/gameSetup', requireAuth, async (req, res) => {
  try {
    const colorRaw = (req.body.color || '').toLowerCase();
    if (!['white', 'black'].includes(colorRaw)) {
      return res.status(400).json({ error: 'Invalid color' });
    }

    const baseMin = Number(req.body.baseMin) || 5;

    const user = await User.findById(req.session.userId).select('username').lean();
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const joinCode = await generateJoinCode();
    const isWhite = colorRaw === 'white';

    const game = await mongoose.model('Game').create({
      whiteUser: isWhite ? req.session.userId : null,
      blackUser: isWhite ? null : req.session.userId,
      whiteName: isWhite ? user.username : 'Waiting for player',
      blackName: isWhite ? 'Waiting for player' : user.username,
      joinCode,
      status: 'Waiting',
      result: null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',
      moves: []
    })

    emitGameUpdate(game)

    res.json({
      ok: true,
      gameId: game._id.toString(),
      joinCode,
      color: colorRaw,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating game' });
  }
});

app.post('/api/joinGame', requireAuth, async (req, res) => {
  try {
    const raw = req.body || {}
    const code = (raw.gameCode || raw.code || raw.codeEl || '').toString().trim().toLowerCase()
    if (!code) return res.status(400).json({ error: 'Game code required' })


    const user = await User.findById(req.session.userId).select('username').lean()
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const game = await mongoose.model('Game').findOne({ joinCode: code })
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const userId = String(req.session.userId);

    const seatIsWhite = game.whiteUser && String(game.whiteUser) === userId;
    const seatIsBlack = game.blackUser && String(game.blackUser) === userId;
    if (seatIsWhite || seatIsBlack) {
      return res.json({
        ok: true,
        gameId: game._id.toString(),
        joinCode: game.joinCode,
        status: game.status,
        seat: seatIsWhite ? 'white' : 'black',
        whiteName: game.whiteName,
        blackName: game.blackName
      });
    }


    if (!game.whiteUser) {
      game.whiteUser = req.session.userId;
      game.whiteName = user.username;
    } else if (!game.blackUser) {
      game.blackUser = req.session.userId;
      game.blackName = user.username;
    } else {
      return res.status(409).json({ error: 'Game already has two players' })
    }

    if (game.whiteUser && game.blackUser) {
      game.status = 'Active'
    }

    await game.save()


    emitGameUpdate(game)

    res.json({
      ok: true,
      gameId: game._id.toString(),
      status: game.status,
      joinCode: game.joinCode,
      whiteName: game.whiteName,
      blackName: game.blackName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error joining game' });
  }
});

app.get('/api/game/:joinCode', requireAuth, async (req, res) => {
  try {
    const code = (req.params.joinCode || '').toLowerCase().trim();
    if (!code) return res.status(400).json({ error: 'Game code required' });

    const game = await Game.findOne({ joinCode: code }).lean();
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const userId = String(req.session.userId);
    const seat =
      game.whiteUser && String(game.whiteUser) === userId ? 'white' :
        game.blackUser && String(game.blackUser) === userId ? 'black' :
          'spectator';

    res.json({
      ok: true,
      seat,
      joinCode: game.joinCode,
      status: game.status,
      result: game.result || null,
      whiteName: game.whiteName,
      blackName: game.blackName,
      fen: game.fen,
      pgn: game.pgn,
      moves: game.moves
    });
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error fetching game' })
  }
})


app.post('/api/game/:joinCode/move', requireAuth, async (req, res) => {
  try {
    const { from, to, promotion } = req.body || {}
    const code = (req.params.joinCode || '').toLowerCase().trim()

    if (!code || !from || !to) {
      return res.status(400).json({ error: 'move not defined' })
    }

    const game = await Game.findOne({ joinCode: code })
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const userId = String(req.session.userId)

    const playerColor =
      game.whiteUser && String(game.whiteUser) === userId ? 'white' :
        game.blackUser && String(game.blackUser) === userId ? 'black' :
          null

    if (!playerColor) {
      return res.status(400).json({ error: 'You are not a player in this game' })
    }

    if (game.status !== 'Active' && game.status !== 'Waiting') {
      return res.status(400).json({ error: 'Game is not active' })
    }

    const chess = new Chess(game.fen)
    const turnColor = chess.turn() === 'w' ? 'white' : 'black'

    if (turnColor !== playerColor) {
      return res.status(400).json({ error: 'Not your turn' })
    }

    const move = chess.move({ from, to, promotion })
    if (!move) return res.status(400).json({ error: 'Illegal move' })

    game.fen = chess.fen()
    game.pgn = chess.pgn()
    game.status = 'Active'
    game.moves.push({
      san: move.san,
      from: move.from,
      to: move.to,
    })

    game.drawOfferedBy = null

    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        game.status = 'Checkmate'
        const winner = chess.turn() === 'w' ? 'black' : 'white'
        game.result = winner === 'white' ? '1-0' : '0-1'
      } else {
        game.status = 'Draw'
        game.result = '1/2-1/2'
      }
    }

    await game.save()
    emitGameUpdate(game)

    res.json({
      ok: true,
      seat: playerColor,
      joinCode: game.joinCode,
      status: game.status,
      result: game.result,
      whiteName: game.whiteName,
      blackName: game.blackName,
      fen: game.fen,
      pgn: game.pgn,
      moves: game.moves,
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Invalid Move' })
  }
})

app.post('/api/game/:joinCode/resign', requireAuth, async (req, res) => {
  try {
    const code = (req.params.joinCode || '').toLowerCase().trim()
    if (!code) return res.status(400).json({ error: 'Game code required' })

    const game = await Game.findOne({ joinCode: code })
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const userId = String(req.session.userId)
    const playerColor = game.whiteUser && String(game.whiteUser) === userId ? 'white' : game.blackUser && String(game.blackUser) === userId ? 'black' : null

    if (!playerColor) {
      return res.status(400).json({ error: 'You are not a player in this game' })
    }

    if (['Checkmate', 'Stalemate', 'Draw', 'Resigned'].includes(game.status)) {
      return res.status(400).json({ error: 'Game is already finished' })
    }

    const winner = playerColor === 'white' ? 'black' : 'white'
    game.status = 'Resigned'
    game.result = winner === 'white' ? '1-0' : '0-1'

    await game.save()
    emitGameUpdate(game)

    const seat = playerColor

    res.json({
      ok: true,
      seat,
      joinCode: game.joinCode,
      status: game.status,
      result: game.result || null,
      whiteName: game.whiteName,
      blackName: game.blackName,
      fen: game.fen,
      pgn: game.pgn,
      moves: game.moves,
    });
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error resigning game' })
  }
})



io.on('connection', (socket) => {
  console.log('Socket connected', socket.id)

  socket.on('game:join', ({ joinCode }) => {
    const code = (joinCode || '').toString().trim().toLowerCase()
    if (!code) return
    socket.join(code)
    console.log(`Socket ${socket.id} joined room ${code}`)
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
  })
})


const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));


# Two Player Chess

## Overview

Two player chess. Uses a game code to so players can join the same session. The server is authoritative for move legality and clocks. 


## [Link to App](https://final-project-srivar28.onrender.com/login.html)

## Data Model

The app stores Games with embedded Moves.

One Game has two player, a joinCode, server-authoritative state (FEN/PGN), clocks, and an array of Move subdocuments.
Each Move records SAN, from/to, optional promotion, resulting FEN, and timestamp.

An Example User:

```javascript
{
  username: "chessplayer001",
  hash: // a password hash,
  lists: // an array of references to Games
}
```

An Example Game:

```javascript
{
  _id: "671a...abc",
  whiteName: "Alice",
  blackName: null,
  joinCode: "k3p9x",
  status: "waiting",                 // waiting | active | checkmate | stalemate | draw | resigned | timeout
  result: null,                      // "1-0" | "0-1" | "1/2-1/2"
  fen: "startpos",                   // or full FEN after first move
  pgn: "",
  moves: [],
}
```

## Site map

Home page → Create Game (options for game setup) → Game
Home page → Join Game (enter existing join code) → Game
Login / Signup → redirects to Home once authenticated

## User Stories or Use Cases

1. As a new user, I can create an account and log in so that my games are associated with my username.
2. As a logged-in user, I can create a private game and receive a join code so I can invite an opponent.
3. As a logged-in user, I can join an existing game by entering a join code.
4. As a player, I can resign, and the game immediately records the result on the server.
5. As a player, I can reload the game page and the game state (FEN/PGN/moves) is restored from the database.

## Research Topics

* Unit testing (Vitest)
Used Vitest to test client-side chess utility functions (fenToMap, isDark, squareAt)

* CSS Framework (Bootstrap)
Used Bootstrap layout and components (grid, cards, forms, navbar/sidebar).
Customized a dark theme in styles.css.

* Real-time communication (Socket.io)
Used Socket.io on the server to manage WebSocket connections and rooms keyed by joinCode.
Clients join a room for their game and receive updates whenever the game changes.

* Server-side library (chess.js)
Used chess.js in the /api/game/:joinCode/move route to validate moves on the server.
After each legal move, updates the FEN and PGN stored on the Game document.

## [Link to Initial Main Project File](src/app.mjs) 


## Annotations / References Used

[Link to Bootstrap Docs](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
Most of the css classes that are used in the repo are from these docs. The board, forms and side bar are designed using classes from these docs. 

[chess.js](https://jhlywa.github.io/chess.js/)
Documentation for server-side chess move validation and FEN handling




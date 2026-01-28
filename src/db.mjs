//db.mjs
import mongoose from 'mongoose';
import mongooseSlugPlugin from 'mongoose-slug-plugin';

mongoose.connect(process.env.DSN);

const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  games: [{ type: Schema.Types.ObjectId, ref: "Game", index: true }], // past games
});

const MoveSchema = new Schema(
  {
    san: { type: String, required: true },  // algebraic notation, e.g. "e4"
    from: { type: String, required: true }, // from square
    to: { type: String, required: true }, // to square
  },
  { _id: false }
);

const GameSchema = new Schema({
  whiteUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  blackUser: { type: Schema.Types.ObjectId, ref: "User", default: null },

  whiteName: { type: String, required: true }, // displayName of user playing as white
  blackName: { type: String, default: null },  // displayName of user playing as black

  joinCode: { type: String, required: true, index: true, unique: true }, // unique code to join game

  status: {
    type: String,
    enum: ["Waiting", "Active", "Checkmate", "Stalemate", "Draw", "Resigned"],
    default: "Waiting",
  },
  result: { type: String, default: null },

  fen: { type: String, default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  pgn: { type: String, default: "" },

  moves: { type: [MoveSchema], default: [] },

});

mongoose.model("User", UserSchema);
mongoose.model("Game", GameSchema);
mongoose.model("Move", MoveSchema);

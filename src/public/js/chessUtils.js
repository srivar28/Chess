const FILES = 'abcdefgh'.split('')
const RANKS_DESC = ['8', '7', '6', '5', '4', '3', '2', '1']
const RANKS_ASC = ['1', '2', '3', '4', '5', '6', '7', '8']
const GLYPH = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' }

export function fenToMap(fen) {
    const placement = (fen || '').split(' ')[0];
    const rows = placement.split('/');
    if (rows.length !== 8) throw new Error('Invalid FEN: must have 8 ranks');

    const map = {};
    let rank = 8;

    for (const row of rows) {
        let fileIdx = 0;
        for (const ch of row) {
            if (ch >= '1' && ch <= '8') {
                // valid FEN counts are only 1..8
                fileIdx += ch.charCodeAt(0) - 48; // '0'→48
            } else if (/[prnbqk]/i.test(ch)) {
                if (fileIdx > 7) throw new Error(`Invalid FEN: too many squares on rank ${rank}`);
                map[`${FILES[fileIdx]}${rank}`] = ch;
                fileIdx++;
            } else {
                throw new Error(`Invalid FEN character "${ch}" on rank ${rank}`);
            }
        }
        if (fileIdx !== 8) throw new Error(`Invalid FEN: rank ${rank} does not have 8 squares`);
        rank--;
    }
    return map;
}

export function isDark(file, rank) {
    return (FILES.indexOf(file) + parseInt(rank, 10)) % 2 == 1
}

export function squareAt(col, row, seat) {
    const files = seat === 'black' ? [...FILES].reverse() : FILES;
    const ranks = seat === 'black' ? RANKS_ASC : RANKS_DESC;
    return `${files[col]}${ranks[row]}`;
}
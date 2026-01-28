import { describe, it, expect } from 'vitest'
import { fenToMap, squareAt, isDark } from '../src/public/js/chessUtils.js'

describe('isDark', () => {
    it('knows corner squares', () => {
        expect(isDark('a', '1')).toBe(true)
        expect(isDark('h', '8')).toBe(true)
        expect(isDark('a', '8')).toBe(false)
        expect(isDark('h', '1')).toBe(false)
    })

    it('matches known colors for a few random squares', () => {
        expect(isDark('d', '4')).toBe(true)
        expect(isDark('c', '4')).toBe(false)
        expect(isDark('e', '5')).toBe(true)
        expect(isDark('b', '2')).toBe(true)
        expect(isDark('f', '7')).toBe(false)
    })
})

describe('squareAt', () => {
    it('maps correctly for white player at board corners', () => {
        expect(squareAt(0, 0, 'white')).toBe('a8')
        expect(squareAt(7, 0, 'white')).toBe('h8')
        expect(squareAt(0, 7, 'white')).toBe('a1')
        expect(squareAt(7, 7, 'white')).toBe('h1')
    });

    it('maps correctly for black player at board corners', () => {
        expect(squareAt(0, 0, 'black')).toBe('h1')
        expect(squareAt(7, 0, 'black')).toBe('a1')
        expect(squareAt(0, 7, 'black')).toBe('h8')
        expect(squareAt(7, 7, 'black')).toBe('a8')
    });

    it('maps center squares correctly for white player', () => {
        expect(squareAt(3, 3, 'white')).toBe('d5')
        expect(squareAt(3, 4, 'white')).toBe('d4')
        expect(squareAt(4, 3, 'white')).toBe('e5')
        expect(squareAt(4, 4, 'white')).toBe('e4')

    })

    it('maps center squares correctly for black player', () => {
        expect(squareAt(3, 3, 'black')).toBe('e4')
        expect(squareAt(3, 4, 'black')).toBe('e5')
        expect(squareAt(4, 3, 'black')).toBe('d4')
        expect(squareAt(4, 4, 'black')).toBe('d5')

    })
})

describe('fenToMap', () => {
    it('parses the initial chess position', () => {
        const map = fenToMap(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        );

        expect(map['a1']).toBe('R')
        expect(map['e1']).toBe('K')
        expect(map['a8']).toBe('r')
        expect(map['e8']).toBe('k')
    })

    it('works for an empty board FEN', () => {
        const map = fenToMap('8/8/8/8/8/8/8/8 w - - 0 1');
        expect(Object.keys(map).length).toBe(0)
    })

    it('maps all 64 squares when they are occupied', () => {
        const map = fenToMap(
            'pppppppp/pppppppp/pppppppp/pppppppp/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w - - 0 1'
        )
        expect(Object.keys(map).length).toBe(64)
    })

    it('throws error if it does not have 8 ranks', () => {
        expect(() => fenToMap('8/8/8/8/8/8/8')).toThrowError()
    })

    it('throws error if a rank has too many squares', () => {
        // first rank says "9" squares, which is invalid
        expect(() => fenToMap('9/8/8/8/8/8/8/8 w - - 0 1')).toThrowError()
    })

    it('throws error if a rank has too few squares', () => {
        // last rank has only 7 squares worth of content
        expect(() =>
            fenToMap('8/8/8/8/8/8/8/7 w - - 0 1')
        ).toThrowError()
    })

    it('throws error on invalid characters', () => {
        expect(() =>
            fenToMap('rnbqkbnx/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
        ).toThrowError()
    })
})
// js/sudoku/constants.js
export const Difficulty = Object.freeze({
    EASY: 46,
    MEDIUM: 37,
    HARD: 32,
    IMPOSSIBLE: 22 // Let's give impossible a baseline, adjust as needed
});

export const Modes = Object.freeze({
    NORMAL: 0,
    MARKING: 1,
    FOCUS: 2
});

export const Platform = Object.freeze({
    Mobile: 0,
    Desktop: 1
});

// Add other constants if needed, e.g., board size
export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;
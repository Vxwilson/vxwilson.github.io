// js/sudoku/persistence.js
import { BOARD_SIZE } from './constants.js';
import { copyToClipboard } from './utils.js'; // Assuming utils.js is in the same folder

const SAVE_KEY_PREFIX = 'sudokuApp_';
const BOARD_STATE_KEY = SAVE_KEY_PREFIX + 'boardState';
const TIMER_KEY = SAVE_KEY_PREFIX + 'timerElapsed';
const SETTINGS_KEY = SAVE_KEY_PREFIX + 'settings';
const HAS_SAVE_KEY = SAVE_KEY_PREFIX + 'hasSaveData';

// Base62 - kept as is from original, could be replaced if desired
const base62 = {
    charset: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    encode: integer => { /* ... (keep original implementation) ... */ },
    decode: chars => { /* ... (keep original implementation) ... */ }
};


/**
 * Encodes the board state (grid + initial grid) into a string.
 * Format: N P N P ... where N is digit (0-9), P is prefilled (1 or 0). Total 162 chars.
 * @param {number[][]} grid - The current grid.
 * @param {number[][]} initialGrid - The initial grid state.
 * @returns {string} The encoded board string.
 */
export function encodeBoardToString(grid, initialGrid) {
    let boardString = '';
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            boardString += grid[i][j];
            boardString += (initialGrid[i][j] !== 0) ? '1' : '0';
        }
    }
    return boardString;
    // Consider Base62 encoding if desired for shorter shareable strings
    // return base62.encode(BigInt(boardString)); // Need BigInt for large numbers
}

/**
 * Decodes a board string back into grid and initialGrid.
 * @param {string} boardString - The encoded board string (162 chars).
 * @returns {{grid: number[][], initialGrid: number[][]}|null} Decoded state or null if invalid.
 */
export function decodeBoardFromString(boardString) {
     // Consider Base62 decoding if using it in encode
     // try { boardString = base62.decode(boardString).toString(); } catch { return null; }

    if (typeof boardString !== 'string' || boardString.length !== BOARD_SIZE * BOARD_SIZE * 2) {
        console.error("Invalid board string length:", boardString?.length);
        return null;
    }

    const grid = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    const initialGrid = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

    try {
        for (let i = 0; i < boardString.length; i += 2) {
            const row = Math.floor(i / 2 / BOARD_SIZE);
            const col = (i / 2) % BOARD_SIZE;
            const valueChar = boardString[i];
            const prefilledChar = boardString[i + 1];

            const value = parseInt(valueChar, 10);
            if (isNaN(value) || value < 0 || value > 9) {
                 console.error(`Invalid value char at index ${i}: ${valueChar}`);
                 return null;
            }
             if (prefilledChar !== '0' && prefilledChar !== '1') {
                console.error(`Invalid prefilled char at index ${i+1}: ${prefilledChar}`);
                 return null;
            }

            grid[row][col] = value;
            if (prefilledChar === '1') {
                initialGrid[row][col] = value; // Store the value if prefilled
            } else {
                 initialGrid[row][col] = 0; // Ensure non-prefilled initial is 0
            }
        }
         return { grid, initialGrid };
    } catch (error) {
         console.error("Error decoding board string:", error);
         return null;
    }
}

/**
 * Saves the game state to localStorage.
 * @param {object} gameState - Object containing board, timer, settings.
 * @param {SudokuBoard} gameState.board - The SudokuBoard instance.
 * @param {Timer} gameState.timer - The Timer instance.
 * @param {object} gameState.settings - Settings object { difficulty, autoPencilMarks, saveDifficulty }.
 */
export function saveGameState(gameState) {
    try {
        const boardState = {
            grid: gameState.board.getGrid(),
            initialGrid: gameState.board.getInitialGrid(),
            // Consider saving pencil marks if needed:
            // pencilMarks: gameState.board.getAllPencilMarks()
        };
        const settingsToSave = {
            difficulty: gameState.settings.difficulty,
            autoPencilMarks: gameState.settings.autoPencilMarks,
            saveDifficulty: gameState.settings.saveDifficulty
        };

        localStorage.setItem(BOARD_STATE_KEY, JSON.stringify(boardState));
        localStorage.setItem(TIMER_KEY, gameState.timer.getElapsedTime().toString());
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
        localStorage.setItem(HAS_SAVE_KEY, 'true');
        // console.log("Game state saved.");
    } catch (error) {
        console.error("Failed to save game state:", error);
    }
}

/**
 * Loads game state from localStorage.
 * @returns {object|null} Loaded state { boardState, elapsedTime, settings } or null if no save data.
 */
export function loadGameState() {
    if (localStorage.getItem(HAS_SAVE_KEY) !== 'true') {
        return null;
    }

    try {
        const boardState = JSON.parse(localStorage.getItem(BOARD_STATE_KEY) || '{}');
        const elapsedTime = parseInt(localStorage.getItem(TIMER_KEY) || '0', 10);
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

        // Basic validation
        if (!boardState.grid || !boardState.initialGrid || !settings.difficulty) {
             console.warn("Loaded save data seems corrupted. Starting fresh.");
             clearSavedGameState(); // Clear potentially bad data
             return null;
        }

        console.log("Game state loaded.");
        return { boardState, elapsedTime, settings };

    } catch (error) {
        console.error("Failed to load game state:", error);
        clearSavedGameState(); // Clear potentially bad data on error
        return null;
    }
}

/**
 * Clears all saved game data from localStorage.
 */
export function clearSavedGameState() {
    localStorage.removeItem(BOARD_STATE_KEY);
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(HAS_SAVE_KEY);
    console.log("Cleared saved game state.");
}

// --- Export/Import specific functions ---

export function exportBoardToString(grid, initialGrid) {
    const encoded = encodeBoardToString(grid, initialGrid);
    // Potentially show in UI first before copying
    copyToClipboard(encoded);
    return encoded; // Return for potential display
}

export function importBoardFromString(boardString) {
    return decodeBoardFromString(boardString);
    // The game logic will handle applying this decoded state
}
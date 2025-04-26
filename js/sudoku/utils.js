// js/sudoku/utils.js
import { BOARD_SIZE, BOX_SIZE } from './constants.js';

/**
 * Checks if placing 'input' at [row, col] is valid according to Sudoku rules.
 * @param {number[][]} board - The Sudoku board state.
 * @param {number} row - Row index (0-8).
 * @param {number} col - Column index (0-8).
 * @param {number} input - The number to check (1-9).
 * @returns {boolean} True if the placement is valid, false otherwise.
 */
export function checkInputValid(board, row, col, input) {
    // Check row
    for (let i = 0; i < BOARD_SIZE; i++) {
        // Don't check the cell itself if it already contains the input
        // This is useful if you call this *after* tentatively placing the number
        // if (i !== col && board[row][i] === input) {
        // Or simpler, just check all cells in the row
        if (board[row][i] === input) {
            return false;
        }
    }

    // Check column
    for (let j = 0; j < BOARD_SIZE; j++) {
        // if (j !== row && board[j][col] === input) {
         if (board[j][col] === input) {
            return false;
        }
    }

    // Check 3x3 box
    const boxRowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxColStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let i = boxRowStart; i < boxRowStart + BOX_SIZE; i++) {
        for (let j = boxColStart; j < boxColStart + BOX_SIZE; j++) {
            // if ((i !== row || j !== col) && board[i][j] === input) {
            if (board[i][j] === input) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Finds the coordinates of the next empty cell (0).
 * @param {number[][]} board - The Sudoku board state.
 * @returns {number[]|null} Coordinates [row, col] or null if no empty cell.
 */
export function findNextEmptyCell(board) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === 0) {
                return [i, j];
            }
        }
    }
    return null;
}

/**
 * Creates a deep copy of a 2D array.
 * @param {Array<Array<any>>} array - The array to copy.
 * @returns {Array<Array<any>>} A deep copy of the array.
 */
export function deepCopy2DArray(array) {
    return array.map(arr => arr.slice());
    // For more complex nested structures, consider JSON parse/stringify:
    // return JSON.parse(JSON.stringify(array));
}

/**
 * Creates a deep copy of the 3D pencil mark array.
 * @param {Array<Array<Array<boolean>>>} array - The pencil mark array.
 * @returns {Array<Array<Array<boolean>>>} A deep copy.
 */
export function deepCopyPencilMarks(array) {
     return array.map(row => row.map(cell => cell.slice()));
}

/**
 * Copies text to the clipboard.
 * @param {string} text - The text to copy.
 */
export function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Make the textarea non-editable and invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        console.log('Code copied to clipboard'); // Optional feedback
    } catch (err) {
        console.error('Failed to copy code: ', err); // Error handling
    }
    document.body.removeChild(textArea);
}
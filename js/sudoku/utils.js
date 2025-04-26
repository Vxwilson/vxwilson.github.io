// js/sudoku/utils.js
import { BOARD_SIZE, BOX_SIZE } from './constants.js';

/**
 * Checks if placing 'input' at [row, col] is valid according to Sudoku rules.
 * @param {number[][]} board - The Sudoku board state.
 * @param {number} row - Row index (0-8).
 * @param {number} col - Column index (0-8).
 * @param {number} input - The number to check (1-9).
 * @param {boolean} [ignoreCell=false] - Whether to ignore the cell itself if it already contains the input.
 * @returns {boolean} True if the placement is valid, false otherwise.
 */
export function checkInputValid(board, row, col, input, ignoreCell = false) {
    // Check row
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[row][i] === input && !(ignoreCell && i === col)) {
            return false;
        }
    }

    // Check column
    for (let j = 0; j < BOARD_SIZE; j++) {
        // if (j !== row && board[j][col] === input) {
         if (board[j][col] === input && !(ignoreCell && j === row)) {
            return false;
        }
    }

    // Check 3x3 box
    const boxRowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxColStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let i = boxRowStart; i < boxRowStart + BOX_SIZE; i++) {
        for (let j = boxColStart; j < boxColStart + BOX_SIZE; j++) {
            // if ((i !== row || j !== col) && board[i][j] === input) {
            if (board[i][j] === input && !(ignoreCell && i === row && j === col)) {
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

export function getPeers(row, col) {
    const peers = [];
    const peerSet = new Set(); // Use a set to avoid duplicates easily

    // Row peers
    for (let c = 0; c < BOARD_SIZE; c++) {
        if (c !== col) peerSet.add(`${row}-${c}`);
    }
    // Column peers
    for (let r = 0; r < BOARD_SIZE; r++) {
        if (r !== row) peerSet.add(`${r}-${col}`);
    }
    // Box peers
    const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
            const peerRow = startRow + r;
            const peerCol = startCol + c;
            if (peerRow !== row || peerCol !== col) {
                peerSet.add(`${peerRow}-${peerCol}`);
            }
        }
    }
    // Convert back to [r, c] pairs
    peerSet.forEach(p => peers.push(p.split('-').map(Number)));
    return peers;
}

// js/sudoku/utils.js (Add this function)

// ... (other functions like getPeers, BOARD_SIZE, etc.)

/**
 * Finds cells that are peers of BOTH cell1 and cell2.
 * @param {number} r1 Row of first cell
 * @param {number} c1 Col of first cell
 * @param {number} r2 Row of second cell
 * @param {number} c2 Col of second cell
 * @returns {Set<string>} A Set of cell keys ('r-c') that are common peers.
 */
export function getCommonPeers(r1, c1, r2, c2) {
    const peers1 = getPeers(r1, c1);
    const peers2 = getPeers(r2, c2);
    const commonPeers = new Set();

    const peers1Keys = new Set(peers1.map(([r, c]) => `${r}-${c}`));
    peers2.forEach(([r, c]) => {
        const key = `${r}-${c}`;
        if (peers1Keys.has(key)) {
            commonPeers.add(key);
        }
    });
    return commonPeers;
}

/**
 * Checks if two cells can "see" each other (are peers).
 * @param {number} r1 Row of first cell
 * @param {number} c1 Col of first cell
 * @param {number} r2 Row of second cell
 * @param {number} c2 Col of second cell
 * @returns {boolean} True if they are peers, false otherwise.
 */
export function cellsSeeEachOther(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return true; // Same cell

    // Check row, column, and box
    if (r1 === r2) return true;
    if (c1 === c2) return true;

    const boxR1 = Math.floor(r1 / BOX_SIZE);
    const boxC1 = Math.floor(c1 / BOX_SIZE);
    const boxR2 = Math.floor(r2 / BOX_SIZE);
    const boxC2 = Math.floor(c2 / BOX_SIZE);
    if (boxR1 === boxR2 && boxC1 === boxC2) return true;

    return false;
}

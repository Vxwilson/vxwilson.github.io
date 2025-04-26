// js/sudoku/solver_basic.js
import { BOARD_SIZE } from './constants.js';
import { checkInputValid, findNextEmptyCell, deepCopy2DArray } from './utils.js';

/**
 * Solves the Sudoku board using backtracking. Modifies the board in place.
 * @param {number[][]} board - The Sudoku board state.
 * @param {number[]} [digitArray=[1-9]] - Order of digits to try.
 * @returns {boolean} True if a solution is found, false otherwise.
 */
export function solve(board, digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const emptyCell = findNextEmptyCell(board);
    if (!emptyCell) {
        return true; // Board is full, solved
    }

    const [row, col] = emptyCell;

    for (let i = 0; i < digitArray.length; i++) {
        const num = digitArray[i];
        if (checkInputValid(board, row, col, num)) {
            board[row][col] = num;

            if (solve(board, digitArray)) {
                return true; // Found a solution
            }

            board[row][col] = 0; // Backtrack
        }
    }
    return false; // No valid number found for this cell
}

/**
 * Counts the number of solutions for a given board state.
 * Stops counting if more than one solution is found.
 * IMPORTANT: Modifies the board, use a copy if original state is needed.
 * @param {number[][]} board - The Sudoku board state (will be modified).
 * @returns {number} 0, 1, or 2 (representing >= 2 solutions).
 */
export function countSolutions(board) {
    const emptyCell = findNextEmptyCell(board);
    if (!emptyCell) {
        return 1; // Found one complete solution
    }

    const [row, col] = emptyCell;
    let solutions = 0;
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Standard order for counting

    for (const num of digits) {
        if (checkInputValid(board, row, col, num)) {
            board[row][col] = num;

            solutions += countSolutions(board);

            // Optimization: Stop early if we know there's more than one solution
            if (solutions > 1) {
                board[row][col] = 0; // Backtrack before returning
                return 2;
            }

            board[row][col] = 0; // Backtrack
        }
    }
    return solutions;
}


/**
 * Generates a new Sudoku puzzle board.
 * @param {number} clues - The number of cells to leave filled (approximate difficulty).
 * @returns {{puzzle: number[][], solution: number[][]}} The generated puzzle and its unique solution.
 */
export function generate(clues = 40) {
    let board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

    // 1. Generate a fully solved board
    let digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    digitArray.sort(() => Math.random() - 0.5); // Shuffle starting digits
    solve(board, digitArray);
    const solution = deepCopy2DArray(board); // Keep the solution

    // 2. Remove cells (add holes)
    let cells = [];
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) { cells.push(i); }
    cells.sort(() => Math.random() - 0.5); // Randomize removal order

    let removedCount = 0;
    const targetRemoved = BOARD_SIZE * BOARD_SIZE - clues;

    for (let i = 0; i < cells.length && removedCount < targetRemoved; i++) {
        const row = Math.floor(cells[i] / BOARD_SIZE);
        const col = cells[i] % BOARD_SIZE;

        if (board[row][col] === 0) continue; // Already removed

        const tempValue = board[row][col];
        board[row][col] = 0;

        // Check if the puzzle still has a unique solution
        const boardCopy = deepCopy2DArray(board);
        const numSolutions = countSolutions(boardCopy);

        if (numSolutions !== 1) {
            // If removing the cell makes the puzzle ambiguous or unsolvable, put it back
            board[row][col] = tempValue;
        } else {
            // Successfully removed
            removedCount++;
        }
    }

    // Sometimes, due to the random order, we might not reach the exact clue count.
    // This is generally acceptable. If strict clue count is needed, refine the removal loop.
    console.log(`Generated board with ${BOARD_SIZE * BOARD_SIZE - removedCount} clues (target: ${clues})`);

    return { puzzle: board, solution: solution };
}

// --- Real-time solving (kept for reference, might move to UI/Game logic later) ---

/**
 * Solves the Sudoku board step-by-step with visual updates.
 * Needs callbacks to update the UI.
 * @param {number[][]} board - The Sudoku board state (modified in place).
 * @param {Function} displayCallback - Function to call to update the UI.
 * @param {number} delay - Delay in ms between steps.
 * @returns {Promise<boolean>} True if solved, false otherwise.
 */
export async function solveVisual(board, displayCallback, delay = 50) {
     const emptyCell = findNextEmptyCell(board);
    if (!emptyCell) {
        return true; // Board is full, solved
    }
    const [row, col] = emptyCell;

    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Standard order

    for (const num of digits) {
        if (checkInputValid(board, row, col, num)) {
            board[row][col] = num;
            await displayCallback(); // Update UI after placing number
            await new Promise(resolve => setTimeout(resolve, delay));

            if (await solveVisual(board, displayCallback, delay)) {
                return true; // Solution found down this path
            }

            // Backtrack
            board[row][col] = 0;
            await displayCallback(); // Update UI after backtracking
            await new Promise(resolve => setTimeout(resolve, Math.max(5, delay / 5))); // Smaller delay for backtrack
        }
    }

    return false; // No valid number found for this cell
}
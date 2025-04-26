// js/sudoku/solver_advanced.js
import { BOARD_SIZE, BOX_SIZE } from './constants.js';
import { checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray } from './utils.js'; // Added imports
// Assuming you have the basic solver for generation/full solve placeholders
import * as SolverBasic from './solver_basic.js';


/**
 * @typedef {'found_step' | 'stuck' | 'solved' | 'error'} SolverStatus
 */

/**
 * @typedef {Object} HighlightInfo
 * @property {number} row
 * @property {number} col
 * @property {number[]} candidates - The specific candidates (1-9) to highlight within the cell. Empty array if just highlighting the cell itself or its placed value.
 */

/**
 * @typedef {Object} Step
 * @property {string} technique - Name of the technique (e.g., 'Naked Single', 'Hidden Single Row').
 * @property {[number, number]} [cell] - The target cell [row, col] to place the value (for singles).
 * @property {number} [value] - The value to be placed (for singles).
 * @property {{cell: [number, number], values: number[]}[]} [eliminated] - Candidates eliminated by this step (optional).
 * @property {string} description - Human-readable description.
 * @property {HighlightInfo[]} highlights - Info for UI highlighting.
 */

/**
 * @typedef {Object} SolverResult
 * @property {SolverStatus} status
 * @property {Step[]} steps - Usually just one step for the hint function.
 * @property {string} [message] - Error or status message.
 * @property {number[][]} [board] - Final board state (for full solve).
 */


// --- Candidate Initialization ---
/**
 * Generates the initial candidate set for each empty cell.
 * @param {number[][]} board - The current board grid.
 * @returns {Map<string, Set<number>> | null} A map where key is "r-c" and value is the Set of candidates, or null if contradiction.
 */
function initializeCandidatesMap(board) {
    /** @type {Map<string, Set<number>>} */
    const candidatesMap = new Map();
    let contradiction = false;

    // Optional: Initial board validation
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const value = board[r][c];
            if (value !== 0) {
                if (!checkInputValid(board, r, c, value, true)) { // Check if pre-filled number is valid against others
                    console.error(`Invalid initial board: Value ${value} at [${r}, ${c}] conflicts with peers.`);
                    return null; // Contradiction in input board
                }
            }
        }
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) {
                const cellKey = `${r}-${c}`;
                const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

                // Check against existing numbers in peers
                const peers = getPeers(r, c);
                peers.forEach(([pr, pc]) => {
                    const peerValue = board[pr][pc];
                    if (peerValue !== 0) {
                        possible.delete(peerValue);
                    }
                });

                if (possible.size === 0) {
                    console.error(`Contradiction: Cell [${r}, ${c}] has no candidates initially.`);
                    contradiction = true;
                    // Continue processing to find all empty cells, maybe return partial map?
                    // For now, let's signal error immediately for hints.
                     return null;
                }
                candidatesMap.set(cellKey, possible);
            }
        }
    }

    return contradiction ? null : candidatesMap;
}


// --- Solving Techniques ---

/**
 * Finds the first Naked Single using the candidate map.
 * @param {Map<string, Set<number>>} candidatesMap - The current candidate map.
 * @returns {Step | null} The step found, or null.
 */
function findNakedSinglesMap(candidatesMap) {
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.size === 1) {
            const [r, c] = key.split('-').map(Number);
            const value = candidates.values().next().value;
            return {
                technique: 'Naked Single',
                cell: [r, c],
                value: value,
                description: `Cell R${r + 1}C${c + 1} must be ${value} (only candidate left).`,
                // Highlight the cell and the single candidate within it
                highlights: [{ row: r, col: c, candidates: [value] }]
            };
        }
    }
    return null;
}


/**
 * Finds the first Hidden Single in any row, column, or box using the map.
 * @param {Map<string, Set<number>>} candidatesMap - The current candidate map.
 * @param {number[][]} board - The current board (to know which cells are empty).
 * @returns {Step | null} The step found, or null.
 */
function findHiddenSinglesMap(candidatesMap, board) {
    const units = [];
    // Rows, Columns, Boxes (same definition as before)
     // Rows
    for (let r = 0; r < BOARD_SIZE; r++) {
        units.push({ type: 'Row', index: r + 1, cells: Array.from({ length: BOARD_SIZE }, (_, c) => [r, c]) });
    }
    // Columns
    for (let c = 0; c < BOARD_SIZE; c++) {
        units.push({ type: 'Column', index: c + 1, cells: Array.from({ length: BOARD_SIZE }, (_, r) => [r, c]) });
    }
    // Boxes
    for (let br = 0; br < BOX_SIZE; br++) {
        for (let bc = 0; bc < BOX_SIZE; bc++) {
            const boxCells = [];
            const startRow = br * BOX_SIZE;
            const startCol = bc * BOX_SIZE;
            for (let r = 0; r < BOX_SIZE; r++) {
                for (let c = 0; c < BOX_SIZE; c++) {
                    boxCells.push([startRow + r, startCol + c]);
                }
            }
            units.push({ type: 'Box', index: br * BOX_SIZE + bc + 1, cells: boxCells });
        }
    }

    // Check each unit
    for (const unit of units) {
        for (let n = 1; n <= BOARD_SIZE; n++) {
            let foundCount = 0;
            let foundCellCoords = null;
            let foundCellKey = null;

            for (const [r, c] of unit.cells) {
                 // Only check empty cells that have candidates
                 const cellKey = `${r}-${c}`;
                 if (board[r][c] === 0 && candidatesMap.has(cellKey)) {
                    if (candidatesMap.get(cellKey)?.has(n)) {
                        foundCount++;
                        foundCellCoords = [r, c];
                        foundCellKey = cellKey;
                    }
                 }
                 if (foundCount > 1) break; // Optimization
            }

            if (foundCount === 1) {
                const [r, c] = foundCellCoords;
                // Check it's not also a Naked Single (already handled if size > 1)
                if (candidatesMap.get(foundCellKey)?.size > 1) {
                     return {
                        technique: `Hidden Single (${unit.type} ${unit.index})`,
                        cell: [r, c],
                        value: n,
                        description: `Cell R${r + 1}C${c + 1} must be ${n} (only place in ${unit.type.toLowerCase()} ${unit.index}).`,
                        // Highlight the cell containing the hidden single and the candidate itself.
                        // Also highlight all other cells in the unit for context.
                        highlights: [
                            { row: r, col: c, candidates: [n] }, // The key cell/candidate
                            ...unit.cells
                                 .filter(([ur, uc]) => ur !== r || uc !== c) // Exclude the key cell itself
                                 .map(([ur, uc]) => ({ row: ur, col: uc, candidates: [] })) // Highlight other unit cells
                        ]
                    };
                }
            }
        }
    }
    return null;
}


// --- Main Solver Functions ---

/**
 * Attempts to find the next logical step using basic techniques.
 * @param {number[][]} board - The current board state.
 * @returns {SolverResult} The result of the search.
 */
export function solveSingleStep(board) {
    if (!findNextEmptyCell(board)) {
        return { status: 'solved', steps: [], message: 'Board is already solved.' };
    }

    // Use Map-based candidate management
    const candidatesMap = initializeCandidatesMap(board);
    if (!candidatesMap) {
        // Check if it was an invalid input board vs. a solvable board reaching a contradiction
        // For hints, assume invalid input board if null is returned initially.
        return { status: 'error', steps: [], message: 'Board has an immediate contradiction or is invalid.' };
    }

    let step = null;

    // Technique 1: Naked Singles
    step = findNakedSinglesMap(candidatesMap);
    if (step) {
        return { status: 'found_step', steps: [step] };
    }

    // Technique 2: Hidden Singles
    step = findHiddenSinglesMap(candidatesMap, board);
    if (step) {
        return { status: 'found_step', steps: [step] };
    }

    // Add calls to other techniques here using candidatesMap...

    return { status: 'stuck', steps: [], message: 'No simple hint available with current techniques.' };
}


// --- Placeholder Full Solve & Generate ---
// Replace these with your actual implementations or keep using SolverBasic

/**
 * Generates a Sudoku puzzle. Replace with your preferred generation logic.
 * @param {number} difficulty - Target number of clues (approx).
 * @returns {{puzzle: number[][], solution: number[][]}}
 */
export function generatePuzzle(difficulty = 40) {
    console.warn("Using basic solver for puzzle generation.");
    return SolverBasic.generate(difficulty); // Use the basic generator
}

/**
 * Solves the entire Sudoku board. Replace with your preferred solver.
 * @param {number[][]} board - The board to solve (will be modified if using basic solver).
 * @param {number[][]} [initialBoard] - Optional initial state if needed by solver.
 * @returns {SolverResult} Result including status and final board.
 */
export function solve(board, initialBoard = null) {
    console.warn("Using basic backtracking solver for full solve.");
    // The basic solver modifies the board in place, so create a copy
    let boardCopy = deepCopy2DArray(board);
    const success = SolverBasic.solve(boardCopy); // Basic solve function
    return {
        status: success ? 'solved' : 'error', // Or 'unsolvable'
        board: success ? boardCopy : board, // Return solved copy or original
        steps: [], // Not tracking steps for basic solve
        message: success ? 'Board solved using backtracking.' : 'Backtracking failed to find a solution.'
    };
}
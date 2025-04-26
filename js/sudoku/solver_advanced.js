
import { BOARD_SIZE, BOX_SIZE } from './constants.js';
import { checkInputValid, getPeers, findNextEmptyCell } from './utils.js'; // Make sure getPeers is exported from utils.js

/**
 * @typedef {'found_step' | 'stuck' | 'solved' | 'error'} SolverStatus
 */

/**
 * @typedef {Object} Step
 * @property {string} technique - Name of the technique (e.g., 'Naked Single', 'Hidden Single Row').
 * @property {[number, number]} [cell] - The target cell [row, col] to place the value (for singles).
 * @property {number} [value] - The value to be placed (for singles).
 * @property {{cell: [number, number], values: number[]}[]} [eliminated] - Candidates eliminated by this step.
 * @property {string} description - Human-readable description.
 * @property {{row: number, col: number, candidates: number[]}[]} [highlights] - Optional: Info for UI highlighting (cells and/or candidates).
 */

/**
 * @typedef {Object} SolverResult
 * @property {SolverStatus} status
 * @property {Step[]} steps - Usually just one step for the hint function.
 * @property {string} [message] - Error or status message.
 */

/**
 * Generates the initial candidate set for each empty cell.
 * @param {number[][]} board - The current board grid.
 * @returns {Set<number>[][] | null} The 9x9 candidate grid, or null if an immediate contradiction is found.
 */


function initializeCandidates(board) {
    /** @type {Set<number>[][]} */
    const candidates = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => new Set())
    );
    let contradiction = false;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) {
                // Start with all candidates for empty cells
                for (let n = 1; n <= BOARD_SIZE; n++) {
                    // Check if placing 'n' would be valid *ignoring the cell itself*
                    // This prevents pre-filled rule violations from causing issues here,
                    // but we still need to check if the input board itself is valid initially.
                    if (checkInputValid(board, r, c, n, true)) { // Use ignoreSelf=true if needed, but simply checking peers is better
                         candidates[r][c].add(n);
                    }
                }
                // Check against existing numbers in peers
                const peers = getPeers(r, c);
                peers.forEach(([pr, pc]) => {
                    const peerValue = board[pr][pc];
                    if (peerValue !== 0) {
                        candidates[r][c].delete(peerValue);
                    }
                });

                // Check for immediate contradiction
                if (candidates[r][c].size === 0) {
                     console.error(`Contradiction: Cell [${r}, ${c}] has no candidates initially.`);
                     contradiction = true;
                     // return null; // Or return the grid and let the caller handle
                }
            }
        }
    }
    // Optional: Add a full board validation here using checkInputValid for all filled cells
    // to catch invalid initial board states passed to the solver.

    return contradiction ? null : candidates;
}

/**
 * Attempts to find the next logical step using basic techniques.
 * @param {number[][]} board - The current board state.
 * @returns {SolverResult} The result of the search.
 */
export function solveSingleStep(board) {
    // 1. Check if already solved
    if (!findNextEmptyCell(board)) {
        return { status: 'solved', steps: [], message: 'Board is already solved.' };
    }

    // 2. Initialize Candidates
    const candidates = initializeCandidates(board);
    if (!candidates) {
        return { status: 'error', steps: [], message: 'Board has an immediate contradiction (cell with no candidates).' };
    }

    // 3. Apply Techniques in Order
    let step = null;

    // Technique 1: Naked Singles
    step = findNakedSingles(candidates);
    if (step) {
        return { status: 'found_step', steps: [step] };
    }

    // Technique 2: Hidden Singles
    step = findHiddenSingles(candidates);
    if (step) {
        return { status: 'found_step', steps: [step] };
    }

    // Add calls to other techniques here later...
    // step = findLockedCandidates(candidates); if (step) return ...
    // step = findNakedPairs(candidates); if (step) return ...

    // 4. If no technique found a step
    return { status: 'stuck', steps: [], message: 'No simple hint available with current techniques.' };
}




// --- Basic Techniques ---

/**
 * Finds the first Naked Single.
 * @param {Set<number>[][]} candidates - The current candidate grid.
 * @returns {Step | null} The step found, or null.
 */
function findNakedSingles(candidates) {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (candidates[r][c] && candidates[r][c].size === 1) {
                const value = candidates[r][c].values().next().value;
                return {
                    technique: 'Naked Single',
                    cell: [r, c],
                    value: value,
                    description: `Cell R${r + 1}C${c + 1} is a Naked Single for ${value}. It's the only candidate left in this cell.`,
                    highlights: [{ row: r, col: c, candidates: [value] }]
                };
            }
        }
    }
    return null;
}

/**
 * Finds the first Hidden Single in any row, column, or box.
 * @param {Set<number>[][]} candidates - The current candidate grid.
 * @returns {Step | null} The step found, or null.
 */
function findHiddenSingles(candidates) {
    const units = [];
    // Rows
    for (let r = 0; r < BOARD_SIZE; r++) {
        units.push({ type: 'Row', index: r, cells: Array.from({ length: BOARD_SIZE }, (_, c) => [r, c]) });
    }
    // Columns
    for (let c = 0; c < BOARD_SIZE; c++) {
        units.push({ type: 'Column', index: c, cells: Array.from({ length: BOARD_SIZE }, (_, r) => [r, c]) });
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
            units.push({ type: 'Box', index: br * BOX_SIZE + bc, cells: boxCells });
        }
    }

    // Check each unit
    for (const unit of units) {
        for (let n = 1; n <= BOARD_SIZE; n++) {
            let foundCount = 0;
            let foundCell = null;
            for (const [r, c] of unit.cells) {
                if (candidates[r]?.[c]?.has(n)) {
                    foundCount++;
                    foundCell = [r, c];
                }
                if (foundCount > 1) break; // Optimization: No need to check further for this number in this unit
            }

            if (foundCount === 1) {
                const [r, c] = foundCell;
                // Make sure it's not also a Naked Single (optional, but good practice)
                if (candidates[r][c].size > 1) {
                     return {
                        technique: `Hidden Single (${unit.type} ${unit.type === 'Box' ? Math.floor(r/3)*3+Math.floor(c/3)+1 : (unit.type === 'Row' ? r+1 : c+1)})`,
                        cell: [r, c],
                        value: n,
                        description: `Cell R${r + 1}C${c + 1} is a Hidden Single for ${n}. It's the only place for ${n} in this ${unit.type.toLowerCase()}.`,
                        highlights: [{ row: r, col: c, candidates: [n] }, ...unit.cells.filter(([ur,uc]) => ur !== r || uc !== c).map(([ur, uc]) => ({row: ur, col: uc, candidates: []}))] // Highlight cell and unit
                    };
                }
            }
        }
    }
    return null;
}
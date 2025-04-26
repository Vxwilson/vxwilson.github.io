import { BOARD_SIZE, BOX_SIZE } from './constants.js';
import { findNextEmptyCell, deepCopy2DArray, getPeers, checkInputValid } from './utils.js'; // Assuming utils has/will have getPeers

/**
 * Represents the state and result of the advanced solver.
 * @typedef {object} SolverResult
 * @property {SolverStep[]} steps - Array of steps taken.
 * @property {number[][]} finalBoard - The board state after solving attempt.
 * @property {'solved' | 'stuck' | 'error'} status - The outcome of the solver.
 * @property {string} [message] - Optional message, especially for 'stuck' or 'error'.
 * @property {Set<number>[][]} [finalCandidates] - The final state of candidates.
 */

/**
 * Represents a single step taken by the solver.
 * @typedef {object} SolverStep
 * @property {string} technique - Name of the technique used.
 * @property {[number, number]} [cell] - Target cell [row, col] for placement.
 * @property {number} [value] - Value placed in the cell.
 * @property {Array<{cell: [number, number], values: number[]}>} eliminated - Candidates eliminated by this step.
 * @property {string} description - Human-readable description.
 */


/**
 * Initializes the candidate map based on the current board state.
 * @param {number[][]} board - The Sudoku board.
 * @returns {Set<number>[][]} candidates - The 9x9 grid of candidate sets.
 * @throws {Error} if the initial board has contradictions.
 */
function initializeCandidates(board) {
    const candidates = Array(BOARD_SIZE).fill(null).map(() =>
        Array(BOARD_SIZE).fill(null).map(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    );

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const value = board[r][c];
            if (value !== 0) {
                // Basic validation of the initial board
                if (!checkInputValid(board, r, c, value, true)) { // Check against other initial numbers
                     throw new Error(`Initialization Error: Initial board is invalid. Conflict found for value ${value} at (${r + 1},${c + 1}).`);
                }

                candidates[r][c] = new Set(); // Clear candidates for filled cells
                const peers = getPeers(r, c);
                for (const [pr, pc] of peers) {
                    candidates[pr][pc].delete(value);
                    // Check for immediate contradiction caused by initial setup
                    if (board[pr][pc] === 0 && candidates[pr][pc].size === 0) {
                         throw new Error(`Initialization Error: Cell (${pr + 1},${pc + 1}) has no candidates due to conflicting value ${value} at (${r + 1},${c + 1}).`);
                    }
                }
            }
        }
    }
     // Final check: ensure no empty cell was left with zero candidates initially
     for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0 && candidates[r][c].size === 0) {
                 // This case should ideally be caught by the peer check above, but double-check
                 throw new Error(`Initialization Error: Cell (${r + 1},${c + 1}) has no candidates after processing initial board.`);
            }
        }
    }

    return candidates;
}

/**
 * Updates candidates in peer cells after a number is placed.
 * Checks for contradictions (a peer cell having no candidates left).
 * @param {number[][]} board - The current board state (needed to check if a peer is empty).
 * @param {Set<number>[][]} candidates - The candidate grid (will be modified).
 * @param {number} row - Row index of the placed cell.
 * @param {number} col - Column index of the placed cell.
 * @param {number} value - The value placed.
 * @returns {Array<{cell: [number, number], values: number[]}>} Array of cells and the single removed candidate value.
 * @throws {Error} if an elimination leads to a contradiction (empty candidate set in an empty cell).
 */
function updatePeerCandidates(board, candidates, row, col, value) {
    const eliminated = [];
    const peers = getPeers(row, col);

    for (const [pr, pc] of peers) {
        if (candidates[pr][pc].has(value)) {
            candidates[pr][pc].delete(value);
            eliminated.push({ cell: [pr, pc], values: [value] });
            // Check for contradiction: If the peer cell is empty AND now has no candidates
            if (board[pr][pc] === 0 && candidates[pr][pc].size === 0) {
                 throw new Error(`Contradiction: Placing ${value} at (${row + 1},${col + 1}) removes last candidate from empty cell (${pr + 1},${pc + 1}).`);
            }
        }
    }
    return eliminated;
}

/**
 * Finds and applies Naked Singles.
 * A Naked Single occurs when a cell has only one candidate left.
 * @param {number[][]} board - The board (will be modified).
 * @param {Set<number>[][]} candidates - Candidates (will be modified).
 * @returns {SolverStep | null} Step object if found, otherwise null.
 */
function findNakedSingles(board, candidates) {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0 && candidates[r][c].size === 1) {
                const value = candidates[r][c].values().next().value; // Get the single candidate
                board[r][c] = value;
                candidates[r][c].clear(); // Cell is now filled

                const step = {
                    technique: 'Naked Single',
                    cell: [r, c],
                    value: value,
                    eliminated: [], // Eliminations handled by updatePeerCandidates after this returns
                    description: `Cell (${r + 1},${c + 1}) can only be ${value}. Placed ${value}.`
                };
                // Note: updatePeerCandidates is called *after* this function returns successfully
                return step;
            }
        }
    }
    return null;
}

/**
 * Finds and applies Hidden Singles.
 * A Hidden Single occurs when a candidate number appears only once within a specific unit (row, column, or box).
 * @param {number[][]} board - The board (will be modified).
 * @param {Set<number>[][]} candidates - Candidates (will be modified).
 * @returns {SolverStep | null} Step object if found, otherwise null.
 */
function findHiddenSingles(board, candidates) {
    // Check Rows
    for (let r = 0; r < BOARD_SIZE; r++) {
        const step = findHiddenSinglesInUnit(board, candidates, getRowCells(r), `Row ${r + 1}`);
        if (step) return step;
    }

    // Check Columns
    for (let c = 0; c < BOARD_SIZE; c++) {
        const step = findHiddenSinglesInUnit(board, candidates, getColCells(c), `Column ${c + 1}`);
        if (step) return step;
    }

    // Check Boxes
    for (let br = 0; br < BOARD_SIZE; br += BOX_SIZE) {
        for (let bc = 0; bc < BOARD_SIZE; bc += BOX_SIZE) {
            const step = findHiddenSinglesInUnit(board, candidates, getBoxCells(br, bc), `Box at (${br + 1},${bc + 1})`);
            if (step) return step;
        }
    }

    return null;
}

/** Helper for findHiddenSingles: Checks a specific unit (row, col, or box) */
function findHiddenSinglesInUnit(board, candidates, unitCells, unitName) {
    for (let num = 1; num <= BOARD_SIZE; num++) {
        let foundCell = null;
        let count = 0;
        for (const [r, c] of unitCells) {
            // Only consider empty cells that have 'num' as a candidate
            if (board[r][c] === 0 && candidates[r][c].has(num)) {
                count++;
                if (count > 1) break; // More than one place for this number in this unit
                foundCell = [r, c];
            }
        }

        // If exactly one cell in the unit can hold 'num'
        if (count === 1 && foundCell) {
            const [r, c] = foundCell;
            board[r][c] = num;
            candidates[r][c].clear(); // Cell is now filled

            const step = {
                technique: 'Hidden Single',
                cell: [r, c],
                value: num,
                eliminated: [], // Eliminations handled by updatePeerCandidates after this returns
                description: `Cell (${r + 1},${c + 1}) is the only place for ${num} in ${unitName}. Placed ${num}.`
            };
            return step;
        }
    }
    return null;
}

// --- Helper functions to get cell coordinates for units ---
// (These could also live in utils.js if used elsewhere)
function getRowCells(r) {
    const cells = [];
    for (let c = 0; c < BOARD_SIZE; c++) cells.push([r, c]);
    return cells;
}
function getColCells(c) {
    const cells = [];
    for (let r = 0; r < BOARD_SIZE; r++) cells.push([r, c]);
    return cells;
}
function getBoxCells(startRow, startCol) {
    const cells = [];
    // Ensure startRow/startCol are the top-left of the box
    const boxR = Math.floor(startRow / BOX_SIZE) * BOX_SIZE;
    const boxC = Math.floor(startCol / BOX_SIZE) * BOX_SIZE;
    for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
            cells.push([boxR + r, boxC + c]);
        }
    }
    return cells;
}


/**
 * Solves the Sudoku using human-like techniques, step-by-step.
 * @param {number[][]} initialBoard - The starting Sudoku board grid.
 * @returns {SolverResult}
 */
export function solveAdvanced(initialBoard) {
    const board = deepCopy2DArray(initialBoard);
    const steps = [];
    let candidates;
    let status = 'stuck'; // Default status if loop finishes without solving

    try {
        candidates = initializeCandidates(board); // Can throw error

        let iteration = 0; // Safety break
        const MAX_ITERATIONS = 500; // Prevent infinite loops

        while (iteration < MAX_ITERATIONS) {
            iteration++;
            let progressMade = false;

            // Check if solved before trying techniques
            if (findNextEmptyCell(board) === null) {
                status = 'solved';
                break;
            }

            // --- Apply Techniques (Prioritized Order) ---
            let stepFound = null;

            // 1. Naked Singles
            stepFound = findNakedSingles(board, candidates);
            if (stepFound) {
                 progressMade = true;
            } else {
                // 2. Hidden Singles
                stepFound = findHiddenSingles(board, candidates);
                if (stepFound) {
                    progressMade = true;
                }
            }

            // --- (Add calls to other techniques here in order of complexity/effectiveness) ---
            // else {
            //    stepFound = findLockedCandidates(board, candidates); // Example
            //    if (stepFound) progressMade = true;
            // }
            // ... etc ...


            // --- Process Step Found ---
            if (progressMade && stepFound) {
                steps.push(stepFound);
                const { cell: [r, c], value } = stepFound;

                // Update peers and collect eliminations. This can throw an error.
                const eliminations = updatePeerCandidates(board, candidates, r, c, value);
                stepFound.eliminated = eliminations; // Add eliminations to the step object

                // Continue to next iteration, restarting technique search from the beginning
            } else {
                // No progress made in this iteration by any implemented technique
                status = 'stuck'; // Explicitly set stuck if loop terminates here
                break; // Exit the while loop
            }
        } // End while loop

        // --- Final Status Check ---
        if (status !== 'solved') {
             if (findNextEmptyCell(board) === null) {
                 // It might have been solved on the very last step
                 status = 'solved';
             } else if (iteration >= MAX_ITERATIONS) {
                 status = 'error';
                 steps.push({ technique: 'Error', eliminated: [], description: `Solver exceeded maximum iterations (${MAX_ITERATIONS}). Possible infinite loop or requires techniques not yet implemented.` });
             }
             // else status remains 'stuck'
        }

    } catch (error) {
        console.error("Sudoku Advanced Solver Error:", error);
        // Ensure candidates exists, even if partially initialized, for debugging
        if (!candidates) {
             candidates = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null).map(() => new Set()));
        }
        return {
            steps: steps,
            finalBoard: board,
            status: 'error',
            message: error.message || 'An unexpected error occurred during solving.',
            finalCandidates: candidates // Include candidates for debugging
        };
    }

    // --- Return Result ---
    const result = {
        steps: steps,
        finalBoard: board,
        status: status,
        finalCandidates: candidates
    };
    if (status === 'stuck') {
        result.message = 'Solver stuck. Requires more advanced techniques or the puzzle might be invalid/have multiple solutions.';
    } else if (status === 'solved') {
         result.message = `Solved successfully in ${steps.length} steps.`;
    }

    return result;
}


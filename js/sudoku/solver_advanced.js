import { BOARD_SIZE, DifficultyLevel, getTechniqueScore, getDifficultyLevelFromScore } from './constants.js';
import {
    checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray, keyToCoords, coordsToKey
} from './utils.js';
// --- Import technique functions ---
import { findFullHouse, findNakedSinglesMap, findHiddenSinglesMap } from './techniques/singles.js';
import { findNakedPairs, findNakedTriples, findHiddenPairs, findHiddenTriples } from './techniques/subsets.js';
import { findLockedCandidates } from './techniques/intersections.js';
import { findXWing, findSkyscraper, find2StringKite, findSwordfish } from './techniques/fish.js';
import { findYWing, findWWing } from './techniques/wings.js';
import { findEmptyRectangle } from './techniques/rectangles.js';

export const techniqueFinders = {
    "Full House": findFullHouse,
    "Naked Single": findNakedSinglesMap,
    "Hidden Single": findHiddenSinglesMap,
    "Locked Candidates": findLockedCandidates,
    "Naked Pair": findNakedPairs,
    "Hidden Pair": findHiddenPairs,
    "Naked Triplet": findNakedTriples,
    "Hidden Triplet": findHiddenTriples,
    "X-Wing": findXWing,
    "Swordfish": findSwordfish,
    "Skyscraper": findSkyscraper,
    "2-String Kite": find2StringKite,
    "Y-Wing": findYWing,
    "W-Wing": findWWing,
    "Empty Rectangle": findEmptyRectangle
};

// Modify below to change the order of techniques used in FindNextLogicalStep()
export const techniqueCheckOrder = [
    'Full House',                     // Score: 10
    'Hidden Single',                  // * variable score
    'Naked Single',                   // Score: 23
    'Locked Candidates',              // * variable score
    'Naked Pair',                     // Score: 29
    'Hidden Pair',                    // Score: 31
    'X-Wing',                         // Score: 32
    'Naked Triplet',                  // Score: 36
    'Swordfish',                      // Score: 38
    'Hidden Triplet',                 // Score: 40
    'Skyscraper',                     // Score: 40
    '2-String Kite',                  // Score: 41
    'Y-Wing',                         // Score: 41
    // 'Crane',                          // Score: 42
    // 'Hidden Quad',                    // Score: 43
    'W-Wing',                         // Score: 45
    'Empty Rectangle',                // Score: 45
    // 'Naked Quad',                     // Score: 50
];




/**
 * @typedef {'found_step' | 'stuck' | 'solved' | 'error'} SolverStatus
 */
/**
 * @typedef {Object} HighlightInfo
 * @property {number} row
 * @property {number} col
 * @property {number[]} candidates - Candidates to highlight within the cell (e.g., the pair's numbers, the eliminated number).
 * @property {('defining' | 'eliminated' | 'target' | 'unit')} [type='defining'] - Optional type for more specific CSS styling (e.g., 'defining' for the pair cells, 'eliminated' for cells/candidates being removed, 'target' for the cell where a single is placed, 'unit' for general unit highlighting).
 */
/**
 * @typedef {Object} Step
 * @property {string} technique - Name of the technique.
 * @property {[number, number]} [cell] - Target cell [row, col] for placement (Singles).
 * @property {number} [value] - Value to be placed (Singles).
 * @property {{cell: [number, number], values: number[]}[]} [eliminations] - Candidates eliminated *by this specific step* (for elimination techniques).
 * @property {string} description - Human-readable description.
 * @property {HighlightInfo[]} highlights - Info for UI highlighting.
 */
/**
 * @typedef {Object} SolverResult
 * @property {SolverStatus} status
 * @property {Step[]} steps 
 * @property {string} [message] 
 * @property {number[][]} [board]
 */


// --- Candidate Initialization 
/** @returns {Map<string, Set<number>> | null} */
export function initializeCandidatesMap(board) {
    const candidatesMap = new Map();
    // Optional: Initial board validation
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const value = board[r][c];
            if (value !== 0) {
                // Use imported checkInputValid
                if (!checkInputValid(board, r, c, value, true)) {
                    console.error(`Invalid initial board: Value ${value} at [${r}, ${c}] conflicts with peers.`);
                    return null;
                }
            }
        }
    }
    // Fill candidates
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) {
                const cellKey = coordsToKey(r, c); // Use util
                const possible = new Set(Array.from({ length: BOARD_SIZE }, (_, i) => i + 1));
                // Use imported getPeers
                const peers = getPeers(r, c);
                peers.forEach(([pr, pc]) => {
                    const peerValue = board[pr][pc];
                    if (peerValue !== 0) {
                        possible.delete(peerValue);
                    }
                });
                if (possible.size === 0) {
                    console.error(`Contradiction: Cell R${r + 1}C${c + 1} has no candidates initially.`);
                    return null; // Signal contradiction immediately
                }
                candidatesMap.set(cellKey, possible);
            }
        }
    }
    return candidatesMap;
}

/**
 * Applies eliminations to the candidate map.
 * @param {Map<string, Set<number>>} candidatesMap - The map to modify.
 * @param {Array<{cellKey: string, values: number[]}>} eliminations - What to eliminate.
 * @returns {boolean} - True if any elimination was actually performed, false otherwise.
 * @throws {Error} - If an elimination leads to a contradiction (empty candidate set).
 */
export function applyEliminations(candidatesMap, eliminations) { // <-- EXPORT for generator (used in its rating logic)
    let eliminationOccurred = false;
    for (const elim of eliminations) {
        const { cellKey, values } = elim;
        const candidates = candidatesMap.get(cellKey);
        if (candidates) {
            for (const value of values) {
                if (candidates.has(value)) {
                    candidates.delete(value);
                    eliminationOccurred = true;
                    const [r_log, c_log] = keyToCoords(cellKey); // Use util
                    if (candidates.size === 0) {
                        throw new Error(`Contradiction: Applying elimination of ${value} left cell R${r_log + 1}C${c_log + 1} with no candidates.`);
                    }
                }
            }
        }
    }
    return eliminationOccurred;
}

/// --- Solver Logic ---
export function findNextLogicalStep(board, currentCandidatesMap, prioritizedTechnique = null) {

    if (!findNextEmptyCell(board)) {
        return { status: 'solved', steps: [], message: 'Board is already solved.' };
    }

    let candidatesMap;
    if (currentCandidatesMap) {
        // Create a *copy* of the map for internal checks
        candidatesMap = new Map();
        for (const [key, valueSet] of currentCandidatesMap.entries()) {
            candidatesMap.set(key, new Set(valueSet));
        }
    } else {
        console.log("Solver initializing candidates map from board.");
        candidatesMap = initializeCandidatesMap(board); 
        if (!candidatesMap) {
            return { status: 'error', steps: [], message: 'Board has an immediate contradiction or is invalid.' };
        }
    }

    // Basic check
    let hasAnyCandidates = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0 && candidatesMap.has(coordsToKey(r, c))) {
                hasAnyCandidates = true;
                break;
            }
        }
        if (hasAnyCandidates) break;
    }
    if (!hasAnyCandidates && findNextEmptyCell(board)) { // Use util
        console.log("Solver stuck: No candidates available in the provided/generated map for empty cells.");
        return { status: 'stuck', steps: [], message: 'No candidates available to analyze.' };
    }

    // --- Determine Technique Check Order ---
    let finalCheckOrder = [...techniqueCheckOrder]; // Start with a copy of the default
    if (prioritizedTechnique && techniqueFinders[prioritizedTechnique]) {
        finalCheckOrder = finalCheckOrder.filter(t => t !== prioritizedTechnique);
        // Add it to the front
        finalCheckOrder.unshift(prioritizedTechnique);
        console.log(`[Solver] Prioritizing ${prioritizedTechnique}.`);
    } else if (prioritizedTechnique) {
        console.warn(`[Solver] Prioritized technique '${prioritizedTechnique}' not found or invalid. Using default order.`);
    }
    // console.log("[Solver] Effective check order:", finalCheckOrder); // Optional debug log


    // --- Technique Check Loop ---
    try {
        for (const techniqueName of finalCheckOrder) {
            const finderFunction = techniqueFinders[techniqueName];

            // console.log(`[Solver] Checking for: ${techniqueName}`); // Optional debug log
            const result = finderFunction(candidatesMap, board);

            let effectiveStep = null;

            // Check for Placement Techniques (Singles, Full House)
            if (result && result.technique && result.cell && result.value !== undefined) {
                effectiveStep = result; 
            }
            // Check for Elimination Techniques
            else if (result && result.stepInfo && result.eliminations && result.eliminations.length > 0) {
                let checkMap = new Map();
                const mapToCheckAgainst = candidatesMap;
                // const mapToCheckAgainst = currentCandidatesMapInput || candidatesMap;
                for (const [key, valueSet] of mapToCheckAgainst.entries()) {
                    checkMap.set(key, new Set(valueSet));
                }

                // Check if applying the eliminations IS effective on the current state
                if (applyEliminations(checkMap, result.eliminations)) {
                    effectiveStep = result.stepInfo; 
                }
                // else { console.log(`[Solver] Found potential ${techniqueName}, but no eliminations possible in current state.`); }
            }

            if (effectiveStep) {
                console.log(`[Solver] Found Step: ${effectiveStep.technique}`);
                return { status: 'found_step', steps: [effectiveStep] };
            }
        }

    } catch (error) {
        console.error("[Solver] Caught contradiction during solving:", error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        return { status: 'error', steps: [], message: error.message || 'Contradiction found during solving.' };
    }

    console.log("Solver stuck: No placement or effective elimination found.");
    return { status: 'stuck', steps: [], message: 'No further progress possible with implemented techniques.' };
}


/**
 * Public function to get a single hint step. Uses the provided candidate map.
 * @param {number[][]} board - The current board state.
 * @param {Map<string, Set<number>> | null} candidatesMap - The current candidate map from game state, or null to trigger initialization.
 * @returns {SolverResult} The result of the search.
 */
export function solveSingleStep(board, candidatesMap, prioritizedTechnique = null) {
    // The `findNextLogicalStep` function now correctly uses a copy internally
    // and checks for effectiveness before returning elimination steps.
    return findNextLogicalStep(board, candidatesMap, prioritizedTechnique);
}


import { BOARD_SIZE, DifficultyLevel, getTechniqueScore, getDifficultyLevelFromScore } from './constants.js';
import {
    checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray, keyToCoords, coordsToKey // Keep core utils
} from './utils.js';
// --- Import technique functions ---
import { findFullHouse, findNakedSinglesMap, findHiddenSinglesMap } from './techniques/singles.js';
import { findNakedPairs, findNakedTriples, findHiddenPairs, findHiddenTriples } from './techniques/subsets.js';
import { findLockedCandidates } from './techniques/intersections.js';
import { findXWing, findSkyscraper, find2StringKite } from './techniques/fish.js';
import { findYWing, findWWing } from './techniques/wings.js';

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
 * @property {Step[]} steps - Contains exactly one step if status is 'found_step'.
 * @property {string} [message] - Error or status message.
 * @property {number[][]} [board] - Final board state (only relevant for full solve).
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
export function findNextLogicalStep(board, currentCandidatesMap) {

    if (!findNextEmptyCell(board)) { // Use util
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
        candidatesMap = initializeCandidatesMap(board); // Use exported function
        if (!candidatesMap) {
            return { status: 'error', steps: [], message: 'Board has an immediate contradiction or is invalid.' };
        }
    }

    // Basic check
    let hasAnyCandidates = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0 && candidatesMap.has(coordsToKey(r, c))) { // Use util
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

    try {
        // --- Technique Order (Remains the same) ---
        const fullHouseStep = findFullHouse(board, candidatesMap);
        if (fullHouseStep) return { status: 'found_step', steps: [fullHouseStep] };

        const hiddenSingleStep = findHiddenSinglesMap(candidatesMap, board);
        if (hiddenSingleStep) return { status: 'found_step', steps: [hiddenSingleStep] };

        const nakedSingleStep = findNakedSinglesMap(candidatesMap);
        if (nakedSingleStep) return { status: 'found_step', steps: [nakedSingleStep] };

        const lockedResult = findLockedCandidates(candidatesMap);
        if (lockedResult.stepInfo) {
            //  // Test if the step *would* cause eliminations on a fresh copy of the map
            //  let tempMap = new Map(JSON.parse(JSON.stringify(Array.from(candidatesMap)))); 
            //  tempMap.forEach((val, key) => tempMap.set(key, new Set(val)));
            //  if (applyEliminations(tempMap, lockedResult.eliminations)) { 
            //      let checkMap = new Map(); 
            //      for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            //      if (applyEliminations(checkMap, lockedResult.eliminations)) {
            //         // The step IS effective. Return it.
            //         console.log(`Found ${lockedResult.stepInfo.technique}`);
            //         return { status: 'found_step', steps: [lockedResult.stepInfo] };
            //      }
            //  }

            if (applyEliminations(candidatesMap, lockedResult.eliminations)) {
                console.log(`Found ${lockedResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [lockedResult.stepInfo] };
            }
        }

        const nakedPairResult = findNakedPairs(candidatesMap);
        if (nakedPairResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, nakedPairResult.eliminations)) {
                console.log(`Found ${nakedPairResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [nakedPairResult.stepInfo] };
            }
        }

        const hiddenPairResult = findHiddenPairs(candidatesMap, board);
        if (hiddenPairResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, hiddenPairResult.eliminations)) {
                console.log(`Found ${hiddenPairResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [hiddenPairResult.stepInfo] };
            }
        }

        const xWingResult = findXWing(candidatesMap);
        if (xWingResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, xWingResult.eliminations)) {
                console.log(`Found ${xWingResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [xWingResult.stepInfo] };
            }
        }

        const nakedTripleResult = findNakedTriples(candidatesMap);
        if (nakedTripleResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, nakedTripleResult.eliminations)) {
                console.log(`Found ${nakedTripleResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [nakedTripleResult.stepInfo] };
            }
        }

        const hiddenTripleResult = findHiddenTriples(candidatesMap, board);
        if (hiddenTripleResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, hiddenTripleResult.eliminations)) {
                console.log(`Found ${hiddenTripleResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [hiddenTripleResult.stepInfo] };
            }
        }

        const skyscraperResult = findSkyscraper(candidatesMap);
        if (skyscraperResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, skyscraperResult.eliminations)) {
                console.log(`Found ${skyscraperResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [skyscraperResult.stepInfo] };
            }
        }

        const kiteResult = find2StringKite(candidatesMap);
        if (kiteResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, kiteResult.eliminations)) {
                console.log(`Found ${kiteResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [kiteResult.stepInfo] };
            }
        }

        const yWingResult = findYWing(candidatesMap);
        if (yWingResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, yWingResult.eliminations)) {
                console.log(`Found ${yWingResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [yWingResult.stepInfo] };
            }
        }


        const wWingResult = findWWing(candidatesMap);
        if (wWingResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, wWingResult.eliminations)) {
                console.log(`Found ${wWingResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [wWingResult.stepInfo] };
            }
        }

        // other techniques...

    } catch (error) {
        console.error("Solver caught contradiction:", error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        return { status: 'error', steps: [], message: error.message || 'Contradiction found during solving.' };
    }

    // --- If no step was found ---
    console.log("Solver stuck: No placement or effective elimination found.");
    return { status: 'stuck', steps: [], message: 'No further progress possible with implemented techniques.' };
}
/**
 * Public function to get a single hint step. Uses the provided candidate map.
 * @param {number[][]} board - The current board state.
 * @param {Map<string, Set<number>> | null} candidatesMap - The current candidate map from game state, or null to trigger initialization.
 * @returns {SolverResult} The result of the search.
 */
export function solveSingleStep(board, candidatesMap) {
    // The `findNextLogicalStep` function now correctly uses a copy internally
    // and checks for effectiveness before returning elimination steps.
    return findNextLogicalStep(board, candidatesMap);
}


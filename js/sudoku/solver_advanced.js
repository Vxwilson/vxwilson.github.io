// js/sudoku/solver_advanced.js
import { BOARD_SIZE, BOX_SIZE } from './constants.js';
import { checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray } from './utils.js';
import * as SolverBasic from './solver_basic.js'; // Keep for generation/solve placeholders

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

// --- Candidate Initialization (remains the same) ---
/** @returns {Map<string, Set<number>> | null} */
function initializeCandidatesMap(board) {
    const candidatesMap = new Map();
    // Optional: Initial board validation
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const value = board[r][c];
            if (value !== 0) {
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
                const cellKey = `${r}-${c}`;
                const possible = new Set(Array.from({ length: BOARD_SIZE }, (_, i) => i + 1));
                const peers = getPeers(r, c);
                peers.forEach(([pr, pc]) => {
                    const peerValue = board[pr][pc];
                    if (peerValue !== 0) {
                        possible.delete(peerValue);
                    }
                });
                if (possible.size === 0) {
                    console.error(`Contradiction: Cell [${r}, ${c}] has no candidates initially.`);
                    return null; // Signal contradiction immediately
                }
                candidatesMap.set(cellKey, possible);
            }
        }
    }
    return candidatesMap;
}


// --- Utility: Get Units (remains the same) ---
function getUnits() {
    const units = [];
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
    return units;
}
const allUnits = getUnits(); // Cache units for reuse

// --- Utility: Apply Eliminations (remains the same, including logging/error check) ---
/**
 * Applies eliminations to the candidate map.
 * @param {Map<string, Set<number>>} candidatesMap - The map to modify.
 * @param {Array<{cellKey: string, values: number[]}>} eliminations - What to eliminate.
 * @returns {boolean} - True if any elimination was actually performed, false otherwise.
 * @throws {Error} - If an elimination leads to a contradiction (empty candidate set).
 */
function applyEliminations(candidatesMap, eliminations) {
    let eliminationOccurred = false;
    for (const elim of eliminations) {
        const { cellKey, values } = elim;
        const candidates = candidatesMap.get(cellKey);
        if (candidates) {
            for (const value of values) {
                if (candidates.has(value)) {
                    candidates.delete(value);
                    eliminationOccurred = true;
                    const [r_log, c_log] = cellKey.split('-').map(Number);
                    console.log(`Elimination applied at R${r_log + 1}C${c_log + 1}: Removed ${value}`);
                    if (candidates.size === 0) {
                        throw new Error(`Contradiction: Applying elimination of ${value} left cell R${r_log+1}C${c_log+1} with no candidates.`);
                    }
                }
            }
        }
    }
    return eliminationOccurred;
}


// --- Placement Techniques ---

/** @returns {Step | null} */
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
                highlights: [
                    { row: r, col: c, candidates: [value], type: 'target' } // Highlight the cell and the candidate being placed
                ]
            };
        }
    }
    return null;
}

/** @returns {Step | null} */
function findHiddenSinglesMap(candidatesMap, board) {
    for (const unit of allUnits) {
        for (let n = 1; n <= BOARD_SIZE; n++) {
            let foundCount = 0;
            let foundCellCoords = null;
            let foundCellKey = null;

            for (const [r, c] of unit.cells) {
                 const cellKey = `${r}-${c}`;
                 if (board[r][c] === 0 && candidatesMap.has(cellKey)) {
                    if (candidatesMap.get(cellKey)?.has(n)) {
                        foundCount++;
                        foundCellCoords = [r, c];
                        foundCellKey = cellKey;
                    }
                 }
                 if (foundCount > 1) break;
            }

            if (foundCount === 1) {
                const [r, c] = foundCellCoords;
                // Ensure it's not also a Naked Single (which would be found first anyway)
                // but check just in case the order changes later. Size > 1 means it's hidden.
                if (candidatesMap.get(foundCellKey)?.size > 1) {
                     return {
                        technique: `Hidden Single (${unit.type} ${unit.index})`,
                        cell: [r, c],
                        value: n,
                        description: `Cell R${r + 1}C${c + 1} must be ${n} (only place for ${n} in ${unit.type.toLowerCase()} ${unit.index}).`,
                        highlights: [
                            // Highlight the target cell showing the hidden single candidate
                            { row: r, col: c, candidates: [n], type: 'target' },
                            // Highlight other cells in the unit (without specific candidates)
                            ...unit.cells
                                 .filter(([ur, uc]) => !(ur === r && uc === c))
                                 .map(([ur, uc]) => ({ row: ur, col: uc, candidates: [], type: 'unit' }))
                        ]
                    };
                }
            }
        }
    }
    return null; // No hidden single found
}

// --- Elimination Techniques ---

/**
 * Finds the FIRST Locked Candidate situation (Pointing or Claiming)
 * that results in actual eliminations. Returns step info if found.
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findLockedCandidates(candidatesMap) {
    // console.log("--- Starting findLockedCandidates ---");

    // --- Part 1: Check Boxes for Pointing ---
    for (let br = 0; br < BOX_SIZE; br++) {
        for (let bc = 0; bc < BOX_SIZE; bc++) {
            const boxCellKeys = new Set();
            const boxCells = [];
            const startRow = br * BOX_SIZE;
            const startCol = bc * BOX_SIZE;
            const boxIndex = br * BOX_SIZE + bc + 1;
            for (let r = 0; r < BOX_SIZE; r++) {
                for (let c = 0; c < BOX_SIZE; c++) {
                    const row = startRow + r;
                    const col = startCol + c;
                    boxCells.push([row, col]);
                    boxCellKeys.add(`${row}-${col}`);
                }
            }

            for (let n = 1; n <= BOARD_SIZE; n++) {
                const cellsWithN = boxCells.filter(([r, c]) => candidatesMap.get(`${r}-${c}`)?.has(n));
                if (cellsWithN.length < 2) continue;
                const cellKeysWithN = new Set(cellsWithN.map(([r,c]) => `${r}-${c}`));
                const rows = new Set(cellsWithN.map(([r, c]) => r));
                const cols = new Set(cellsWithN.map(([r, c]) => c));

                // Pointing Row
                if (rows.size === 1) {
                    const row = rows.values().next().value;
                    const pointingElims = [];
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        const targetCellKey = `${row}-${c}`;
                        if (!boxCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                            pointingElims.push({ cellKey: targetCellKey, values: [n] });
                        }
                    }
                    if (pointingElims.length > 0) {
                        const stepInfo = {
                            technique: 'Locked Candidates (Pointing Row)',
                            description: `Digit ${n} in Box ${boxIndex} is confined to Row ${row + 1}. Removed from other cells in Row ${row + 1}.`,
                            eliminations: pointingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                            highlights: [
                                // Highlight the defining cells in the box showing the candidate 'n'
                                ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight the cells where 'n' is being eliminated
                                ...pointingElims.map(elim => {
                                    const [er, ec] = elim.cellKey.split('-').map(Number);
                                    return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                                })
                            ]
                        };
                        console.log(`  >> Found Potential Pointing Row (${n} in Box ${boxIndex} -> Row ${row+1}). Eliminations:`, pointingElims.map(e=>e.cellKey));
                        return { eliminations: pointingElims, stepInfo: stepInfo };
                    }
                }

                // Pointing Column
                if (cols.size === 1) {
                    const col = cols.values().next().value;
                    const pointingElims = [];
                    for (let r = 0; r < BOARD_SIZE; r++) {
                        const targetCellKey = `${r}-${col}`;
                         if (!boxCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                            pointingElims.push({ cellKey: targetCellKey, values: [n] });
                        }
                    }
                    if (pointingElims.length > 0) {
                        const stepInfo = {
                            technique: 'Locked Candidates (Pointing Col)',
                            description: `Digit ${n} in Box ${boxIndex} is confined to Col ${col + 1}. Removed from other cells in Col ${col + 1}.`,
                            eliminations: pointingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                            highlights: [
                                // Highlight the defining cells in the box showing the candidate 'n'
                                ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight the cells where 'n' is being eliminated
                                ...pointingElims.map(elim => {
                                    const [er, ec] = elim.cellKey.split('-').map(Number);
                                    return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                                })
                            ]
                        };
                         console.log(`  >> Found Potential Pointing Col (${n} in Box ${boxIndex} -> Col ${col+1}). Eliminations:`, pointingElims.map(e=>e.cellKey));
                        return { eliminations: pointingElims, stepInfo: stepInfo };
                    }
                }
            } // End digit loop
        } // End box col loop
    } // End box row loop

    // --- Part 2: Check Rows/Cols for Claiming ---
    for (const unit of allUnits) {
        if (unit.type === 'Box') continue; // Only Rows and Columns

        for (let n = 1; n <= BOARD_SIZE; n++) {
            const cellsWithN = unit.cells.filter(([r, c]) => candidatesMap.get(`${r}-${c}`)?.has(n));
            if (cellsWithN.length < 2) continue;
            const cellKeysWithN = new Set(cellsWithN.map(([r,c]) => `${r}-${c}`));
            const boxes = new Set(cellsWithN.map(([r, c]) => Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE)));

            // Claiming Check
            if (boxes.size === 1) {
                const boxLinearIndex = boxes.values().next().value;
                const boxStartRow = Math.floor(boxLinearIndex / BOX_SIZE) * BOX_SIZE;
                const boxStartCol = (boxLinearIndex % BOX_SIZE) * BOX_SIZE;
                const boxIndexUI = boxLinearIndex + 1;
                const claimingElims = [];
                const unitCellKeys = new Set(unit.cells.map(([r, c]) => `${r}-${c}`));

                for (let r_offset = 0; r_offset < BOX_SIZE; r_offset++) {
                    for (let c_offset = 0; c_offset < BOX_SIZE; c_offset++) {
                        const box_r = boxStartRow + r_offset;
                        const box_c = boxStartCol + c_offset;
                        const targetCellKey = `${box_r}-${box_c}`;
                        if (!unitCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                            claimingElims.push({ cellKey: targetCellKey, values: [n] });
                        }
                    }
                }

                if (claimingElims.length > 0) {
                    const stepInfo = {
                         technique: `Locked Candidates (Claiming ${unit.type})`,
                         description: `Digit ${n} in ${unit.type} ${unit.index} is confined to Box ${boxIndexUI}. Removed from other cells in Box ${boxIndexUI}.`,
                         eliminations: claimingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                         highlights: [
                             // Highlight the defining cells in the line showing the candidate 'n'
                             ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                             // Highlight the cells in the box where 'n' is being eliminated
                             ...claimingElims.map(elim => {
                                 const [er, ec] = elim.cellKey.split('-').map(Number);
                                 return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                             })
                         ]
                    };
                     console.log(`  >> Found Potential Claiming (${n} in ${unit.type} ${unit.index} -> Box ${boxIndexUI}). Eliminations:`, claimingElims.map(e=>e.cellKey));
                    return { eliminations: claimingElims, stepInfo: stepInfo };
                }
            } // End Claiming Check
        } // End digit loop
    } // End unit loop (Rows/Cols)

    // console.log("--- Finished findLockedCandidates (No effective step found) ---");
    return { eliminations: [], stepInfo: null };
}

// Helper for combinations (remains the same)
function getCombinations(arr, size) {
    const result = [];
    function combine(start, currentCombo) {
        if (currentCombo.length === size) {
            result.push([...currentCombo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            currentCombo.push(arr[i]);
            combine(i + 1, currentCombo);
            currentCombo.pop();
        }
    }
    combine(0, []);
    return result;
}


/**
 * Finds the FIRST Naked Pair within any unit that results in actual eliminations.
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findNakedPairs(candidatesMap) { // Renamed for clarity
    for (const unit of allUnits) {
        const potentialPairCells = unit.cells
            .map(([r, c]) => ({ key: `${r}-${c}`, candidates: candidatesMap.get(`${r}-${c}`) }))
            .filter(cell => cell.candidates && cell.candidates.size === 2);

        if (potentialPairCells.length < 2) continue;

        const combinations = getCombinations(potentialPairCells, 2);

        for (const combo of combinations) {
            const union = new Set([...combo[0].candidates, ...combo[1].candidates]);

            if (union.size === 2) { // It's a Naked Pair
                const subsetValues = Array.from(union); // The two candidates (e.g., [5, 6])
                const subsetKeys = new Set(combo.map(cell => cell.key));
                const unitElims = [];

                for (const [r, c] of unit.cells) {
                    const cellKey = `${r}-${c}`;
                    if (!subsetKeys.has(cellKey)) {
                        const cellCandidates = candidatesMap.get(cellKey);
                        if (cellCandidates) {
                            const elimValues = subsetValues.filter(val => cellCandidates.has(val));
                            if (elimValues.length > 0) {
                                unitElims.push({ cellKey: cellKey, values: elimValues });
                            }
                        }
                    }
                }

                if (unitElims.length > 0) {
                    const subsetCellsCoords = combo.map(c => c.key.split('-').map(Number));
                    const stepInfo = {
                        technique: `Naked Pair (${unit.type} ${unit.index})`,
                        description: `Cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] form a Naked Pair of (${subsetValues.join(', ')}). These digits can be removed from other cells in ${unit.type.toLowerCase()} ${unit.index}.`,
                        eliminations: unitElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                        highlights: [
                            // Highlight the two cells forming the pair, showing the pair's candidates
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: subsetValues, type: 'defining' })),
                            // Highlight the specific candidates being eliminated in peer cells
                            ...unitElims.map(elim => {
                                const [er, ec] = elim.cellKey.split('-').map(Number);
                                return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                            })
                        ]
                    };
                    console.log(`  >> Found Potential Naked Pair (${subsetValues.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

/**
 * Finds the FIRST Hidden Pair within any unit that results in actual eliminations.
 * @param {Map<string, Set<number>>} candidatesMap
 * @param {number[][]} board
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findHiddenPairs(candidatesMap, board) { // Renamed for clarity
    for (const unit of allUnits) {
        const unitCellKeys = unit.cells
            .filter(([r, c]) => board[r][c] === 0)
            .map(([r, c]) => `${r}-${c}`)
            .filter(key => candidatesMap.has(key));

        if (unitCellKeys.length < 2) continue;

        const digitLocations = new Map();
        for (let n = 1; n <= BOARD_SIZE; n++) {
            digitLocations.set(n, new Set());
        }
        unitCellKeys.forEach(key => {
            candidatesMap.get(key)?.forEach(n => {
                digitLocations.get(n).add(key);
            });
        });

        const possiblePairDigits = Array.from(digitLocations.keys()).filter(n => digitLocations.get(n).size === 2);
        if (possiblePairDigits.length < 2) continue;

        const digitCombinations = getCombinations(possiblePairDigits, 2);

        for (const digitCombo of digitCombinations) { // e.g., [5, 7]
            const cellsForDigit1 = digitLocations.get(digitCombo[0]);
            const cellsForDigit2 = digitLocations.get(digitCombo[1]);

            // Check if they appear in the *exact same* two cells
            if (cellsForDigit1.size === 2 && cellsForDigit2.size === 2) {
                 const cellUnion = new Set([...cellsForDigit1, ...cellsForDigit2]);

                 if (cellUnion.size === 2) { // It's a Hidden Pair
                     const subsetCellKeys = Array.from(cellUnion); // The keys of the two cells
                     const unitElims = [];

                     // Eliminate candidates *other than* the pair's digits from these two cells
                     for (const cellKey of subsetCellKeys) {
                         const candidates = candidatesMap.get(cellKey);
                         if (candidates) {
                             const elimValues = [...candidates].filter(cand => !digitCombo.includes(cand));
                             if (elimValues.length > 0) {
                                 unitElims.push({ cellKey: cellKey, values: elimValues });
                             }
                         }
                     }

                     if (unitElims.length > 0) {
                         const subsetCellsCoords = subsetCellKeys.map(k => k.split('-').map(Number));
                         const stepInfo = {
                             technique: `Hidden Pair (${unit.type} ${unit.index})`,
                             description: `Digits (${digitCombo.join(', ')}) only appear in cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] within ${unit.type.toLowerCase()} ${unit.index}. Other candidates removed from these two cells.`,
                             eliminations: unitElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                             highlights: [
                                 // Highlight the two cells forming the pair, showing *only* the hidden pair candidates
                                 ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: digitCombo, type: 'defining' })),
                                 // Optionally, highlight the eliminated values *within* the pair cells - can be noisy
                                 // ...unitElims.map(elim => {
                                 //     const [er, ec] = elim.cellKey.split('-').map(Number);
                                 //     return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                                 // })
                             ]
                         };
                         console.log(`  >> Found Potential Hidden Pair (${digitCombo.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                         return { eliminations: unitElims, stepInfo: stepInfo };
                     }
                 }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}


// --- Main Solver Step Function ---
/**
 * Finds the single next logical step (placement or elimination).
 * Uses the provided candidatesMap, falling back to initialization if null.
 * @param {number[][]} board - The current board state (needed for some techniques).
 * @param {Map<string, Set<number>> | null} currentCandidatesMap - The candidate map reflecting current pencil marks. If null, it will be initialized.
 * @returns {SolverResult} The result, containing either the step, stuck, solved, or error.
 */
function findNextLogicalStep(board, currentCandidatesMap) {
    if (!findNextEmptyCell(board)) {
        return { status: 'solved', steps: [], message: 'Board is already solved.' };
    }

    let candidatesMap;
    if (currentCandidatesMap) {
        // Create a *copy* of the passed map to avoid modifying the game's state directly
        // during the solver's internal 'applyEliminations' checks.
        candidatesMap = new Map();
        for (const [key, valueSet] of currentCandidatesMap.entries()) {
            candidatesMap.set(key, new Set(valueSet));
        }
        console.log("Solver using pre-generated candidates map.");
    } else {
        // Fallback: Initialize if no map was provided (e.g., first hint on empty board)
        console.log("Solver initializing candidates map from board.");
        candidatesMap = initializeCandidatesMap(board);
        if (!candidatesMap) {
            return { status: 'error', steps: [], message: 'Board has an immediate contradiction or is invalid.' };
        }
    }

     // Basic check: If the map has no entries for any empty cells, we are stuck.
     let hasAnyCandidates = false;
     for (let r = 0; r < BOARD_SIZE; r++) {
         for (let c = 0; c < BOARD_SIZE; c++) {
             if (board[r][c] === 0 && candidatesMap.has(`${r}-${c}`)) {
                 hasAnyCandidates = true;
                 break;
             }
         }
         if (hasAnyCandidates) break;
     }
     if (!hasAnyCandidates && findNextEmptyCell(board)) {
         console.log("Solver stuck: No candidates available in the provided/generated map for empty cells.");
         return { status: 'stuck', steps: [], message: 'No candidates available to analyze. Try auto-filling pencil marks?' };
     }


    // --- 1. Check for Placement Techniques ---
    const nakedSingleStep = findNakedSinglesMap(candidatesMap); // Pass the map
    if (nakedSingleStep) {
        console.log("Found Naked Single");
        return { status: 'found_step', steps: [nakedSingleStep] };
    }

    const hiddenSingleStep = findHiddenSinglesMap(candidatesMap, board); // Pass map and board
    if (hiddenSingleStep) {
        console.log("Found Hidden Single");
        return { status: 'found_step', steps: [hiddenSingleStep] };
    }

    // --- 2. Check for Elimination Techniques ---
    try {
        // Locked Candidates
        const lockedResult = findLockedCandidates(candidatesMap); // Pass the map
        if (lockedResult.stepInfo && lockedResult.eliminations.length > 0) {
            // Try applying the eliminations to our *local copy* of the map
            if (applyEliminations(candidatesMap, lockedResult.eliminations)) {
                console.log("Applied Locked Candidates - Returning Step");
                // Return the stepInfo derived from the *original* state before applyEliminations
                return { status: 'found_step', steps: [lockedResult.stepInfo] };
            } else {
                 console.log("Locked Candidates found, but caused no effective eliminations on current map.");
            }
        }

        // Naked Pairs
        const nakedPairResult = findNakedPairs(candidatesMap); // Pass the map
        if (nakedPairResult.stepInfo && nakedPairResult.eliminations.length > 0) {
             if (applyEliminations(candidatesMap, nakedPairResult.eliminations)) {
                console.log("Applied Naked Pair - Returning Step");
                return { status: 'found_step', steps: [nakedPairResult.stepInfo] };
             } else {
                 console.log("Naked Pair found, but caused no effective eliminations on current map.");
            }
        }

         // Hidden Pairs
         const hiddenPairResult = findHiddenPairs(candidatesMap, board); // Pass map and board
         if (hiddenPairResult.stepInfo && hiddenPairResult.eliminations.length > 0) {
              if (applyEliminations(candidatesMap, hiddenPairResult.eliminations)) {
                 console.log("Applied Hidden Pair - Returning Step");
                 return { status: 'found_step', steps: [hiddenPairResult.stepInfo] };
              } else {
                 console.log("Hidden Pair found, but caused no effective eliminations on current map.");
             }
         }

        // --- Add more elimination techniques here ---

    } catch (error) {
        console.error("Solver caught contradiction:", error);
        return { status: 'error', steps: [], message: error.message || 'Contradiction found during solving.' };
    }

    // --- 3. If no step was found ---
    console.log("Solver stuck: No placement or effective elimination found based on current candidates.");
    return { status: 'stuck', steps: [], message: 'No further progress possible with implemented techniques on the current candidate state.' };
}

/**
 * Public function to get a single hint step. Uses the provided candidate map.
 * @param {number[][]} board - The current board state.
 * @param {Map<string, Set<number>> | null} candidatesMap - The current candidate map from game state, or null to trigger initialization.
 * @returns {SolverResult} The result of the search.
 */
export function solveSingleStep(board, candidatesMap) {
    return findNextLogicalStep(board, candidatesMap);
}



// --- Placeholder Functions for Generation and Full Solve ---
// These functions are placeholders and should be replaced with actual implementations


/** Placeholder: Generates a Sudoku puzzle. */
export function generatePuzzle(difficulty = 40) {
    console.warn("Using basic solver for puzzle generation.");
    return SolverBasic.generate(difficulty);
}

/** Placeholder: Solves the entire Sudoku board using backtracking. */
export function solve(board, initialBoard = null) {
    console.warn("Using basic backtracking solver for full solve.");
    let boardCopy = deepCopy2DArray(board);
    // Backtracking might need the *initial* board to respect clues?
    // If SolverBasic.solve doesn't use initialBoard, that's fine.
    const success = SolverBasic.solve(boardCopy); // Adjust if SolverBasic needs initialBoard
    return {
        status: success ? 'solved' : 'error',
        board: success ? boardCopy : board, // Return solved board or original on failure
        steps: [],
        message: success ? 'Board solved using backtracking.' : 'Backtracking failed to find a solution.'
    };
}
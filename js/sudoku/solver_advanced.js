// js/sudoku/solver_advanced.js
import { BOARD_SIZE, BOX_SIZE, DifficultyLevel, DIFFICULTY_THRESHOLDS, getTechniqueScore, getDifficultyLevelFromScore} from './constants.js';
import { checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray, getCommonPeers, cellsSeeEachOther } from './utils.js';
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
                        throw new Error(`Contradiction: Applying elimination of ${value} left cell R${r_log + 1}C${c_log + 1} with no candidates.`);
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
                const cellKeysWithN = new Set(cellsWithN.map(([r, c]) => `${r}-${c}`));
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
                        console.log(`  >> Found Potential Pointing Row (${n} in Box ${boxIndex} -> Row ${row + 1}). Eliminations:`, pointingElims.map(e => e.cellKey));
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
                        console.log(`  >> Found Potential Pointing Col (${n} in Box ${boxIndex} -> Col ${col + 1}). Eliminations:`, pointingElims.map(e => e.cellKey));
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
            const cellKeysWithN = new Set(cellsWithN.map(([r, c]) => `${r}-${c}`));
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
                    console.log(`  >> Found Potential Claiming (${n} in ${unit.type} ${unit.index} -> Box ${boxIndexUI}). Eliminations:`, claimingElims.map(e => e.cellKey));
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

// --- Elimination Techniques (Continued) ---

/**
 * Finds the FIRST X-Wing pattern (Row or Column based) that results in actual eliminations.
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findXWing(candidatesMap) {
    // Iterate through each digit 1-9
    for (let n = 1; n <= BOARD_SIZE; n++) {

        // --- Check for Row-based X-Wing ---
        const candidateRows = new Map(); // Map<rowIndex, colIndices[]>
        for (let r = 0; r < BOARD_SIZE; r++) {
            const colsWithN = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (candidatesMap.get(`${r}-${c}`)?.has(n)) {
                    colsWithN.push(c);
                }
            }
            // Store row only if 'n' appears exactly twice
            if (colsWithN.length === 2) {
                candidateRows.set(r, colsWithN);
            }
        }

        if (candidateRows.size >= 2) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 2); // Get pairs of rows

            for (const [r1, r2] of rowCombinations) {
                const cols1 = candidateRows.get(r1);
                const cols2 = candidateRows.get(r2);

                // Check if the columns are the same for both rows
                if (cols1[0] === cols2[0] && cols1[1] === cols2[1]) {
                    const [c1, c2] = cols1; // The two columns forming the X-Wing sides
                    const xWingElims = [];
                    const definingCellsCoords = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
                    const definingCellsKeys = new Set(definingCellsCoords.map(([r, c]) => `${r}-${c}`));

                    // Check for eliminations in the two columns (c1, c2), excluding the X-Wing rows (r1, r2)
                    for (const targetCol of [c1, c2]) {
                        for (let targetRow = 0; targetRow < BOARD_SIZE; targetRow++) {
                            const targetCellKey = `${targetRow}-${targetCol}`;
                            // Eliminate if it's NOT a defining cell AND has candidate 'n'
                            if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                xWingElims.push({ cellKey: targetCellKey, values: [n] });
                            }
                        }
                    }

                    // If eliminations were found, create the step and return
                    if (xWingElims.length > 0) {
                        const stepInfo = {
                            technique: `X-Wing (Rows, Digit ${n})`,
                            description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms an X-Wing in Columns ${c1 + 1} and ${c2 + 1}. Digit ${n} can be removed from other cells in these columns.`,
                            eliminations: xWingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                            highlights: [
                                // Highlight the 4 defining "corner" cells
                                ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight the candidates being eliminated
                                ...xWingElims.map(elim => {
                                    const [er, ec] = elim.cellKey.split('-').map(Number);
                                    return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                })
                            ]
                        };
                        console.log(`  >> Found Potential Row X-Wing (${n} in R${r1 + 1},R${r2 + 1} / C${c1 + 1},C${c2 + 1}). Eliminations:`, xWingElims);
                        return { eliminations: xWingElims, stepInfo: stepInfo };
                    }
                }
            }
        } // End Row-based check for digit n

        // --- Check for Column-based X-Wing ---
        const candidateCols = new Map(); // Map<colIndex, rowIndices[]>
        for (let c = 0; c < BOARD_SIZE; c++) {
            const rowsWithN = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (candidatesMap.get(`${r}-${c}`)?.has(n)) {
                    rowsWithN.push(r);
                }
            }
            // Store col only if 'n' appears exactly twice
            if (rowsWithN.length === 2) {
                candidateCols.set(c, rowsWithN);
            }
        }

        if (candidateCols.size >= 2) {
            const colIndices = Array.from(candidateCols.keys());
            const colCombinations = getCombinations(colIndices, 2); // Get pairs of columns

            for (const [c1, c2] of colCombinations) {
                const rows1 = candidateCols.get(c1);
                const rows2 = candidateCols.get(c2);

                // Check if the rows are the same for both columns
                if (rows1[0] === rows2[0] && rows1[1] === rows2[1]) {
                    const [r1, r2] = rows1; // The two rows forming the X-Wing sides
                    const xWingElims = [];
                    const definingCellsCoords = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
                    const definingCellsKeys = new Set(definingCellsCoords.map(([r, c]) => `${r}-${c}`));

                    // Check for eliminations in the two rows (r1, r2), excluding the X-Wing columns (c1, c2)
                    for (const targetRow of [r1, r2]) {
                        for (let targetCol = 0; targetCol < BOARD_SIZE; targetCol++) {
                            const targetCellKey = `${targetRow}-${targetCol}`;
                            // Eliminate if it's NOT a defining cell AND has candidate 'n'
                            if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                xWingElims.push({ cellKey: targetCellKey, values: [n] });
                            }
                        }
                    }

                    // If eliminations were found, create the step and return
                    if (xWingElims.length > 0) {
                        const stepInfo = {
                            technique: `X-Wing (Cols, Digit ${n})`,
                            description: `Digit ${n} in Columns ${c1 + 1} and ${c2 + 1} forms an X-Wing in Rows ${r1 + 1} and ${r2 + 1}. Digit ${n} can be removed from other cells in these rows.`,
                            eliminations: xWingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                            highlights: [
                                // Highlight the 4 defining "corner" cells
                                ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight the candidates being eliminated
                                ...xWingElims.map(elim => {
                                    const [er, ec] = elim.cellKey.split('-').map(Number);
                                    return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                })
                            ]
                        };
                        console.log(`  >> Found Potential Col X-Wing (${n} in C${c1 + 1},C${c2 + 1} / R${r1 + 1},R${r2 + 1}). Eliminations:`, xWingElims);
                        return { eliminations: xWingElims, stepInfo: stepInfo };
                    }
                }
            }
        } // End Col-based check for digit n

    } // End loop through digits

    // No X-Wing found that resulted in eliminations
    return { eliminations: [], stepInfo: null };
}

// --- Elimination Techniques (Continued) ---


// /**
//  * Helper for W-Wing: Checks if assuming 'candidate' is eliminated from cells
//  * seeing cell1 or cell2 would leave no place for 'candidate' in a specific unit.
//  * This attempts to verify a "strong link" based on the provided comment logic.
//  *
//  * @param {Map<string, Set<number>>} candidatesMap - The current full candidate map.
//  * @param {string} cell1Key - Key of the first bivalue cell ('r-c').
//  * @param {string} cell2Key - Key of the second bivalue cell ('r-c').
//  * @param {number} candidate - The candidate value to check the strong link for (e.g., the 'B' if checking elim for 'A').
//  * @returns {boolean} True if the condition (elimination + no remaining spots) is met for ANY unit, false otherwise.
//  */
// function WWingFindInvalidUnitHelper(candidatesMap, cell1Key, cell2Key, candidate) {
//     const [r1, c1] = cell1Key.split('-').map(Number);
//     const [r2, c2] = cell2Key.split('-').map(Number);
//     // console.log(`  Helper checking link for ${candidate} between ${cell1Key} and ${cell2Key}`);

//     for (const unit of allUnits) {
//         // Get the keys of cells within this unit
//         const unitCellKeys = new Set(unit.cells.map(([r, c]) => `${r}-${c}`));

//         // --- Simulation within this unit ---
//         let eliminationHappenedInUnit = false;
//         const possibleLocationsForCandidate = new Set(); // Track where 'candidate' COULD be in this unit initially

//         // 1. Find initial possible locations for 'candidate' within this unit
//         for (const [r_unit, c_unit] of unit.cells) {
//             const key = `${r_unit}-${c_unit}`;
//             if (candidatesMap.get(key)?.has(candidate)) {
//                 possibleLocationsForCandidate.add(key);
//             }
//         }

//         // If the candidate doesn't even exist in this unit initially, this unit cannot prove the link.
//         if (possibleLocationsForCandidate.size === 0) {
//             // console.log(`    Helper: Unit ${unit.type} ${unit.index} has no ${candidate} initially.`);
//             continue;
//         }

//         const initialSize = possibleLocationsForCandidate.size;
//         // console.log(`    Helper: Unit ${unit.type} ${unit.index} initially has ${candidate} in ${initialSize} cells: [${Array.from(possibleLocationsForCandidate).join(', ')}]`);

//         // 2. Simulate eliminations: Remove 'candidate' from unit cells that see cell1 OR cell2
//         const keysToRemove = new Set();
//         for (const unitCellKey of possibleLocationsForCandidate) {
//             // We only care about cells *currently* in our possibleLocationsForCandidate set
//             const [r_unit, c_unit] = unitCellKey.split('-').map(Number);

//             // Check if this unit cell sees either of the W-Wing endpoint cells
//             // Note: A cell doesn't "see" itself in the peer sense, but it might see the *other* wing cell.
//             // We need to be careful not to eliminate candidate from cell1 or cell2 based on seeing *itself*.
//             // The `cellsSeeEachOther` function handles row/col/box peer checks.
//             let seesWingEndpoint = false;
//             if (unitCellKey !== cell1Key && cellsSeeEachOther(r_unit, c_unit, r1, c1)) {
//                  seesWingEndpoint = true;
//                 // console.log(`      Helper: ${unitCellKey} sees ${cell1Key}`);
//             }
//             if (unitCellKey !== cell2Key && cellsSeeEachOther(r_unit, c_unit, r2, c2)) {
//                  seesWingEndpoint = true;
//                 // console.log(`      Helper: ${unitCellKey} sees ${cell2Key}`);
//             }


//             if (seesWingEndpoint) {
//                 // If this cell (which initially has 'candidate') sees one of the wing cells,
//                 // mark it for removal from our temporary set.
//                 keysToRemove.add(unitCellKey);
//                 // console.log(`      Helper: Marked ${unitCellKey} for removal (sees wing endpoint).`);
//             }
//         }

//         // Perform the removals
//         if (keysToRemove.size > 0) {
//             eliminationHappenedInUnit = true; // At least one hypothetical elimination occurred
//             keysToRemove.forEach(key => possibleLocationsForCandidate.delete(key));
//         }

//         // 3. Check the condition: Was an elimination made AND no spots left?
//         const finalSize = possibleLocationsForCandidate.size;
//         // console.log(`    Helper: Unit ${unit.type} ${unit.index} after hypothetical elims has ${finalSize} cells for ${candidate}: [${Array.from(possibleLocationsForCandidate).join(', ')}]. Elimination happened: ${eliminationHappenedInUnit}`);

//         if (eliminationHappenedInUnit && finalSize === 0) {
//             // If *any* candidate was removed due to the 'seeing' rule,
//             // AND the unit now has zero places left for that candidate,
//             // then the condition is met for this unit.
//             // console.log(`  Helper: Strong link for ${candidate} CONFIRMED via unit ${unit.type} ${unit.index}.`);
//             return true;
//         }
//         // else {
//             // console.log(`  Helper: Strong link for ${candidate} NOT confirmed by unit ${unit.type} ${unit.index}. (Elimination: ${eliminationHappenedInUnit}, Final Size: ${finalSize})`);
//         // }

//     } // End loop through units

//     // console.log(`  Helper: Strong link for ${candidate} NOT confirmed by ANY unit.`);
//     return false; // Condition not met for any unit
// }

/**
 * Helper for W-Wing: Checks if assuming 'candidate' is eliminated from cells
 * seeing cell1 or cell2 would leave no place for 'candidate' in a specific unit.
 * This attempts to verify a "strong link" based on the provided comment logic.
 *
 * @param {Map<string, Set<number>>} candidatesMap - The current full candidate map.
 * @param {string} cell1Key - Key of the first bivalue cell ('r-c').
 * @param {string} cell2Key - Key of the second bivalue cell ('r-c').
 * @param {number} candidate - The candidate value to check the strong link for (e.g., the 'B' if checking elim for 'A').
 * @returns {object | null} The unit object ({type, index, cells}) if the link condition is met in that unit, otherwise null.
 */
function WWingFindInvalidUnitHelper(candidatesMap, cell1Key, cell2Key, candidate) {
    const [r1, c1] = cell1Key.split('-').map(Number);
    const [r2, c2] = cell2Key.split('-').map(Number);
    // console.log(`  Helper checking link for ${candidate} between ${cell1Key} and ${cell2Key}`);

    for (const unit of allUnits) { // unit is { type, index, cells }
        const unitCellKeys = new Set(unit.cells.map(([r, c]) => `${r}-${c}`));

        // --- Simulation within this unit ---
        let eliminationHappenedInUnit = false;
        const possibleLocationsForCandidate = new Set();

        // 1. Find initial possible locations for 'candidate' within this unit
        for (const [r_unit, c_unit] of unit.cells) {
            const key = `${r_unit}-${c_unit}`;
            if (candidatesMap.get(key)?.has(candidate)) {
                possibleLocationsForCandidate.add(key);
            }
        }

        if (possibleLocationsForCandidate.size === 0) {
            continue; // Candidate not present in this unit initially
        }

        // const initialSize = possibleLocationsForCandidate.size;
        // console.log(`    Helper: Unit ${unit.type} ${unit.index} initially has ${candidate} in ${initialSize} cells: [${Array.from(possibleLocationsForCandidate).join(', ')}]`);

        // 2. Simulate eliminations
        const keysToRemove = new Set();
        for (const unitCellKey of possibleLocationsForCandidate) {
            const [r_unit, c_unit] = unitCellKey.split('-').map(Number);
            let seesWingEndpoint = false;
            if (unitCellKey !== cell1Key && cellsSeeEachOther(r_unit, c_unit, r1, c1)) {
                seesWingEndpoint = true;
            }
            if (!seesWingEndpoint && unitCellKey !== cell2Key && cellsSeeEachOther(r_unit, c_unit, r2, c2)) { // Use 'else if' structure potentially slightly faster? no, need to check both independently. check changed logic
                seesWingEndpoint = true; // Correction: Check separately, a cell might see both
            }
            // Re-checking original separate logic - A cell seeing EITHER is enough
            let seesWing1 = unitCellKey !== cell1Key && cellsSeeEachOther(r_unit, c_unit, r1, c1);
            let seesWing2 = unitCellKey !== cell2Key && cellsSeeEachOther(r_unit, c_unit, r2, c2);


            if (seesWing1 || seesWing2) { // If it sees EITHER wing cell
                keysToRemove.add(unitCellKey);
            }
        }

        // Perform the removals
        if (keysToRemove.size > 0) {
            eliminationHappenedInUnit = true;
            keysToRemove.forEach(key => possibleLocationsForCandidate.delete(key));
        }

        // 3. Check the condition: Was an elimination made AND no spots left?
        const finalSize = possibleLocationsForCandidate.size;
        // console.log(`    Helper: Unit ${unit.type} ${unit.index} after hypothetical elims has ${finalSize} cells for ${candidate}. Elimination happened: ${eliminationHappenedInUnit}`);

        if (eliminationHappenedInUnit && finalSize === 0) {
            // Condition met! Return the unit object itself.
            // console.log(`  Helper: Strong link for ${candidate} CONFIRMED via unit ${unit.type} ${unit.index}.`);
            return unit; // <<< CHANGE: Return the unit object
        }
    } // End loop through units

    // console.log(`  Helper: Strong link for ${candidate} NOT confirmed by ANY unit.`);
    return null; // <<< CHANGE: Return null if no unit confirmed the link
}

/**
 * Finds the FIRST W-Wing pattern (Type 1 - bivalue cells) that results in actual eliminations
 * from a common peer, using the WWingFindInvalidUnitHelper to check the strong link.
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findWWing(candidatesMap) {
    // 1. Find all bivalue cells (same as before)
    const bivalueCells = [];
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.size === 2) {
            const [r, c] = key.split('-').map(Number);
            bivalueCells.push({ key, r, c, candidatesList: Array.from(candidates) });
        }
    }
    if (bivalueCells.length < 2) return { eliminations: [], stepInfo: null };

    // 2. Iterate through pairs (same as before)
    const combinations = getCombinations(bivalueCells, 2);

    for (const [cell1, cell2] of combinations) {
        // 3. Check conditions (same as before)
        const [candA, candB] = cell1.candidatesList;
        const c2Candidates = cell2.candidatesList;
        if (
            !((candA === c2Candidates[0] && candB === c2Candidates[1]) ||
              (candA === c2Candidates[1] && candB === c2Candidates[0])) ||
            cellsSeeEachOther(cell1.r, cell1.c, cell2.r, cell2.c)
        ) {
            continue;
        }

        // 4. Find common peers (same as before)
        const commonPeersKeys = getCommonPeers(cell1.r, cell1.c, cell2.r, cell2.c);
        if (commonPeersKeys.size === 0) continue;

        // console.log(`Checking W-Wing potential: ${cell1.key}(${candA}/${candB}) and ${cell2.key}(${candA}/${candB}). Peers: [${Array.from(commonPeersKeys).join(', ')}]`);

        // 5. Iterate through common peers to check for eliminations
        const wingElims = [];
        let identifiedLinkValue = null;
        let identifiedElimValue = null;
        let linkUnit = null; // <<< To store the unit confirming the link

        // Check Hypothesis 1: Strong link on candB? -> Eliminate candA from peers
        linkUnit = WWingFindInvalidUnitHelper(candidatesMap, cell1.key, cell2.key, candB);
        if (linkUnit) { // <<< Check if a unit was returned
             // console.log(`  Strong link confirmed for ${candB} via ${linkUnit.type} ${linkUnit.index}. Checking peers for ${candA}...`);
            for (const peerKey of commonPeersKeys) {
                if (candidatesMap.get(peerKey)?.has(candA)) {
                    wingElims.push({ cellKey: peerKey, values: [candA] });
                    identifiedLinkValue = candB;
                    identifiedElimValue = candA;
                    // console.log(`    Elimination found: Remove ${candA} from ${peerKey}`);
                }
            }
            // Keep linkUnit if eliminations were found, otherwise clear it
            if (wingElims.length === 0) linkUnit = null;
        }

        // Check Hypothesis 2: Strong link on candA? -> Eliminate candB from peers
        // Only if Hypothesis 1 didn't yield eliminations
        if (wingElims.length === 0) {
            linkUnit = WWingFindInvalidUnitHelper(candidatesMap, cell1.key, cell2.key, candA);
            if (linkUnit) { // <<< Check if a unit was returned
                // console.log(`  Strong link confirmed for ${candA} via ${linkUnit.type} ${linkUnit.index}. Checking peers for ${candB}...`);
                for (const peerKey of commonPeersKeys) {
                    if (candidatesMap.get(peerKey)?.has(candB)) {
                        wingElims.push({ cellKey: peerKey, values: [candB] });
                        identifiedLinkValue = candA;
                        identifiedElimValue = candB;
                        // console.log(`    Elimination found: Remove ${candB} from ${peerKey}`);
                    }
                }
                 // Keep linkUnit if eliminations were found, otherwise clear it
                if (wingElims.length === 0) linkUnit = null;
            }
        }


        // 6. If eliminations were found, build step and return
        if (wingElims.length > 0 && linkUnit) { // <<< Ensure linkUnit is valid
             const firstElim = wingElims[0];
             const eliminatedPeerCoords = firstElim.cellKey.split('-').map(Number);

             const stepInfo = {
                technique: `W-Wing`,
                // <<< Update description to include the unit type/index
                description: `Cells R${cell1.r + 1}C${cell1.c + 1} and R${cell2.r + 1}C${cell2.c + 1} (both ${candA}/${candB}) form a W-Wing. A strong link on ${identifiedLinkValue} exists between them (verified in ${linkUnit.type} ${linkUnit.index}). Candidate ${identifiedElimValue} can be removed from common peer(s) like R${eliminatedPeerCoords[0]+1}C${eliminatedPeerCoords[1]+1}.`,
                eliminations: wingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                highlights: [
                    // Highlight the two wing cells (defining)
                    { row: cell1.r, col: cell1.c, candidates: [candA, candB], type: 'defining' },
                    { row: cell2.r, col: cell2.c, candidates: [candA, candB], type: 'defining' },
                    // Highlight ALL common peers where elimination occurs (eliminated)
                    ...wingElims.map(elim => {
                        const [er, ec] = elim.cellKey.split('-').map(Number);
                        return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                    }),
                    // <<< Highlight the cells in the unit that confirmed the strong link
                    ...(linkUnit.cells
                        // Optional: Filter out the main wing cells if you want different styling?
                        // .filter(([ur, uc]) => !([cell1.key, cell2.key].includes(`${ur}-${uc}`)))
                        .map(([ur, uc]) => ({
                            row: ur,
                            col: uc,
                            candidates: [], // Or maybe highlight the link candidate: [identifiedLinkValue]?
                            type: 'unit' // Use 'unit' type for general unit highlighting
                        }))
                    )
                ]
            };
            console.log(`  >> Found W-Wing between ${cell1.key} and ${cell2.key} (Link ${identifiedLinkValue} in ${linkUnit.type} ${linkUnit.index}, Elim ${identifiedElimValue}). Eliminations:`, wingElims.map(e=>e.cellKey));
            return { eliminations: wingElims, stepInfo: stepInfo };
        } else {
            // console.log(`  No effective W-Wing eliminations found for pair ${cell1.key}/${cell2.key}.`);
        }
    } // End loop through wing pair combinations

    return { eliminations: [], stepInfo: null }; // No W-Wing found
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

        // --- X-Wing --- << ADDED HERE
        const xWingResult = findXWing(candidatesMap);
        if (xWingResult.stepInfo && xWingResult.eliminations.length > 0) {
            if (applyEliminations(candidatesMap, xWingResult.eliminations)) {
                console.log("Applied X-Wing - Returning Step");
                return { status: 'found_step', steps: [xWingResult.stepInfo] };
            } else {
                console.log("X-Wing found, but caused no effective eliminations on current map.");
            }
        }

        // --- W-Wing --- << ADDED HERE
        const wWingResult = findWWing(candidatesMap);
        if (wWingResult.stepInfo && applyEliminations(candidatesMap, wWingResult.eliminations)) {
            console.log("Applied W-Wing - Returning Step");
            return { status: 'found_step', steps: [wWingResult.stepInfo] };
        }

        console.log("Solver: No effective step found with w");

        // --- Add more complex elimination techniques here ---
        // e.g., findSwordfish, findJellyfish, findSkyscraper...

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


// /** Placeholder: Generates a Sudoku puzzle. */
// export function generatePuzzle(difficulty = 40) {
//     console.warn("Using basic solver for puzzle generation.");
//     return SolverBasic.generate(difficulty);
// }

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

// HELPER for generating difficulty puzzles
// --- Replace the old placeholder ---
/**
 * Generates a Sudoku puzzle based on desired logical difficulty.
 * @param {DifficultyLevel} difficultyLevel - The target difficulty level enum/constant.
 * @returns {Promise<{puzzle: number[][], solution: number[][]}|null>}
 */
export async function generatePuzzle(difficultyLevel = DifficultyLevel.MEDIUM) {
    // Define approximate clue ranges per level (optional, adjust as needed)
    let minClues = 22, maxClues = 50; // Default wide range
    switch(difficultyLevel) {
        case DifficultyLevel.BEGINNER: minClues = 42; maxClues = 54; break;
        case DifficultyLevel.EASY:     minClues = 32; maxClues = 40; break;
        case DifficultyLevel.MEDIUM:   minClues = 28; maxClues = 34; break;
        case DifficultyLevel.HARD:     minClues = 25; maxClues = 30; break;
        case DifficultyLevel.EXPERT:   minClues = 22; maxClues = 30; break;
    }

   const result = await generatePuzzleAdvanced(difficultyLevel, 100, minClues, maxClues); // 100 attempts

   if (result) {
       // Return in the format expected by the old basic generator's caller if needed
       return { puzzle: result.puzzle, solution: result.solution };
   } else {
       // Fallback or error handling
       console.warn("Advanced generation failed, falling back to basic (if available/desired) or returning null");
       // Optionally, call SolverBasic.generate as a fallback:
       // return SolverBasic.generate(35); // Fallback difficulty
        return null;
   }
}

/**
 * Generates a Sudoku puzzle targeting a specific difficulty level by iteratively removing clues.
 *
 * @param {DifficultyLevel} desiredLevel - The target difficulty level enum/string.
 * @param {number} maxAttempts - Maximum number of full generation attempts.
 * @param {number} minClues - The minimum number of clues the final puzzle must have.
 * @param {number} maxClues - Aim to start the hardening phase around this many clues (approximate).
 * @param {number} maxHardenSteps - Max clues to remove during the hardening phase for a single attempt.
 * @returns {Promise<{puzzle: number[][], solution: number[][], difficulty: DifficultyLevel, score: number, techniques: Set<string>} | null>} The generated puzzle and its info, or null if failed.
 */
export async function generatePuzzleAdvanced(
    desiredLevel,
    maxAttempts = 100,
    minClues = 25, // Hard lower limit
    maxClues = 45, // Target for initial removal phase
    maxHardenSteps = 20 // Limit additional removals per attempt
) {
    console.log(`--- Generating Puzzle: Target Level = ${desiredLevel}, Clues=[${minClues}-${maxClues}] ---`);

    if (!DIFFICULTY_THRESHOLDS[desiredLevel]) {
        console.error(`Invalid desiredLevel: ${desiredLevel}`);
        return null;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Generation Attempt ${attempt}/${maxAttempts}`);
        let board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

        // 1. Generate a fully solved board
        let digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        digitArray.sort(() => Math.random() - 0.5);
        if (!SolverBasic.solve(board, digitArray)) {
            console.warn("Attempt Failed: Could not create initial solved board.");
            continue;
        }
        const solution = deepCopy2DArray(board);
        // console.log("Generated Solution:", solution);

        // 2. Initial Clue Removal Phase
        let potentialPuzzle = deepCopy2DArray(solution);
        let initialClueIndices = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i);
        initialClueIndices.sort(() => Math.random() - 0.5); // Randomize removal order

        let removedCount = 0;
        const totalCells = BOARD_SIZE * BOARD_SIZE;
        let currentClueCount = totalCells;

        for (const cellIndex of initialClueIndices) {
            if (currentClueCount <= maxClues) {
                // Stop initial removal once we are in the target clue range
                // Or maybe stop slightly above maxClues? e.g., maxClues + 5
                console.log(`Reached approx maxClues (${maxClues}), stopping initial removal at ${currentClueCount} clues.`);
                break;
            }
             if (currentClueCount <= minClues) {
                 // Should not happen if maxClues > minClues, but safety break
                 console.warn(`Reached minClues (${minClues}) during initial removal. Stopping.`);
                 break;
             }

            const r = Math.floor(cellIndex / BOARD_SIZE);
            const c = cellIndex % BOARD_SIZE;

            if (potentialPuzzle[r][c] === 0) continue; // Already removed

            const tempValue = potentialPuzzle[r][c];
            potentialPuzzle[r][c] = 0;

            // Check uniqueness
            const boardCheckCopy = deepCopy2DArray(potentialPuzzle);
            if (SolverBasic.countSolutions(boardCheckCopy) !== 1) {
                potentialPuzzle[r][c] = tempValue; // Put back if it breaks uniqueness
            } else {
                removedCount++; // Successfully removed
                currentClueCount = totalCells - removedCount;
                // console.log(`Removed ${r}-${c}, Clues: ${currentClueCount}`);
            }
        }

        console.log(`Initial removal done. Candidate puzzle has ${currentClueCount} clues.`);

        // 3. Rate the initial puzzle candidate
        let ratingResult = await ratePuzzleDifficulty(potentialPuzzle);

        if (!ratingResult) {
            console.log("-> Initial puzzle rating failed. Discarding attempt.");
            continue; // Try next full attempt
        }
        console.log(`-> Initial Rating: ${ratingResult.difficulty} (Score: ${ratingResult.score})`);

        // 4. Check if initial puzzle matches or needs hardening
        if (ratingResult.difficulty === desiredLevel && currentClueCount >= minClues) {
            console.log(`--- Success! Initial puzzle matches ${desiredLevel} on attempt ${attempt} ---`);
            return {
                puzzle: potentialPuzzle,
                solution: solution,
                difficulty: ratingResult.difficulty,
                score: ratingResult.score,
                techniques: ratingResult.techniques
            };
        } else if (ratingResult.difficulty > desiredLevel) {
             console.log("-> Initial puzzle is harder than desired. Discarding attempt.");
             continue; // Try next full attempt
        } else if (currentClueCount <= minClues) {
            console.log("-> Initial puzzle is too easy but already at min clues. Discarding attempt.");
            continue; // Try next full attempt
        }

        // 5. Hardening Phase (if initial puzzle was too easy and has clues > minClues)
        console.log("--- Entering Hardening Phase ---");
        let currentHardeningPuzzle = deepCopy2DArray(potentialPuzzle);
        let hardenSteps = 0;

        // Find indices of remaining clues to potentially remove
        let remainingClueIndices = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentHardeningPuzzle[r][c] !== 0) {
                    remainingClueIndices.push([r, c]);
                }
            }
        }
        remainingClueIndices.sort(() => Math.random() - 0.5); // Randomize hardening removal order

        for (const [r, c] of remainingClueIndices) {
            if (hardenSteps >= maxHardenSteps) {
                 console.log("-> Reached max hardening steps. Discarding attempt.");
                 break; // Stop hardening this attempt
            }
            if (currentClueCount <= minClues) {
                 console.log("-> Reached min clues during hardening. Discarding attempt.");
                 break; // Stop hardening this attempt
            }

            // console.log(`Hardening: Trying to remove ${r}-${c} (Clues: ${currentClueCount})`);
            const tempValue = currentHardeningPuzzle[r][c];
            if (tempValue === 0) continue; // Should not happen if list is correct, but safe check

            currentHardeningPuzzle[r][c] = 0;

            // Check uniqueness
            const boardCheckCopy = deepCopy2DArray(currentHardeningPuzzle);
            if (SolverBasic.countSolutions(boardCheckCopy) !== 1) {
                currentHardeningPuzzle[r][c] = tempValue; // Put back
                // console.log(` -> Cannot remove ${r}-${c}, breaks uniqueness.`);
            } else {
                // Successfully removed a clue during hardening
                currentClueCount--;
                hardenSteps++;
                console.log(` -> Hardening removal #${hardenSteps}: Removed ${r}-${c}. Clues remaining: ${currentClueCount}`);

                // Re-rate the puzzle
                ratingResult = await ratePuzzleDifficulty(currentHardeningPuzzle);

                if (!ratingResult) {
                    console.log(" -> Hardening rating failed. Discarding attempt.");
                    break; // Stop hardening this attempt
                }
                 console.log(` -> Hardening Rating: ${ratingResult.difficulty} (Score: ${ratingResult.score})`);


                if (ratingResult.difficulty === desiredLevel && currentClueCount >= minClues) {
                    console.log(`--- Success! Hardened puzzle matches ${desiredLevel} on attempt ${attempt}. \nFinal Clue Count: ${currentClueCount}`);
                    return {
                        puzzle: currentHardeningPuzzle,
                        solution: solution,
                        difficulty: ratingResult.difficulty,
                        score: ratingResult.score,
                        techniques: ratingResult.techniques
                    };
                } else if (ratingResult.difficulty > desiredLevel) {
                    console.log(" -> Hardening overshot difficulty. Discarding attempt.");
                    break; // Stop hardening this attempt
                }
                // If still too easy (ratingResult.difficulty < desiredLevel), continue hardening loop
            }
        } // End hardening loop

        // If hardening loop finished without success
        console.log("-> Hardening phase finished without reaching target level. Discarding attempt.");

    } // End attempts loop

    console.error(`Failed to generate a puzzle of level ${desiredLevel} after ${maxAttempts} attempts.`);
    return null;
}

// /**
//  * Generates a Sudoku puzzle targeting a specific difficulty level.
//  *
//  * @param {DifficultyLevel} desiredLevel - The target difficulty level (e.g., DifficultyLevel.MEDIUM).
//  * @param {number} maxAttempts - Maximum number of puzzles to generate and rate before giving up.
//  * @param {number} minClues - Optional minimum clues desired (approximate).
//  * @param {number} maxClues - Optional maximum clues desired (approximate).
//  * @returns {{puzzle: number[][], solution: number[][], difficulty: DifficultyLevel, score: number, techniques: Set<string>} | null} The generated puzzle and its info, or null if failed.
//  */
// export async function generatePuzzleAdvanced(desiredLevel, maxAttempts = 100, minClues = 25, maxClues = 40) {
//     console.log(`--- Generating Puzzle: Target Level = ${desiredLevel} ---`);

//     if (!DIFFICULTY_THRESHOLDS[desiredLevel]) {
//         console.error(`Invalid desiredLevel: ${desiredLevel}`);
//         return null;
//     }

//     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//         console.log(`Generation Attempt ${attempt}/${maxAttempts}`);
//         let board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

//         // 1. Generate a fully solved board (using basic solver is fine)
//         let digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
//         digitArray.sort(() => Math.random() - 0.5);


//         if (!SolverBasic.solve(board, digitArray)) {
//         // if (!basicSolve(board, digitArray)) {
//              console.warn("Generation Error: Failed to create initial solved board.");
//              continue; // Try next attempt
//         }
//         const solution = deepCopy2DArray(board);
//         //log the solution if needed
//         console.log("Generated Solution:", solution);

//         // 2. Remove cells (adapted from basic generator)
//         let cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i);
//         cells.sort(() => Math.random() - 0.5); // Randomize removal order

//         let currentPuzzle = deepCopy2DArray(solution);
//         let removedCount = 0;
//         const totalCells = BOARD_SIZE * BOARD_SIZE;

//         for (const cellIndex of cells) {
//             const row = Math.floor(cellIndex / BOARD_SIZE);
//             const col = cellIndex % BOARD_SIZE;

//             if (currentPuzzle[row][col] === 0) continue;

//             const tempValue = currentPuzzle[row][col];
//             currentPuzzle[row][col] = 0;
//             removedCount++;

//             // Check uniqueness
//             const boardCheckCopy = deepCopy2DArray(currentPuzzle);
//             const numSolutions = SolverBasic.countSolutions(boardCheckCopy);

//             if (numSolutions !== 1) {
//                 // Put back if it breaks uniqueness
//                 currentPuzzle[row][col] = tempValue;
//                 removedCount--;
//                  // console.log(`Could not remove ${row}-${col}, breaks uniqueness.`);
//             } else {
//                 // break if barely less than maxClues
//                 let clueCount = totalCells - removedCount;
//                 if (clueCount < maxClues) {
//                     console.log(`Removed ${removedCount} cells, stopping removal.`);
//                     break; // Stop removing clues if we reach the desired range
//                 }
//             }
                
//         }

//         const finalClueCount = totalCells - removedCount;
//         console.log(`Generated candidate puzzle with ${finalClueCount} clues.`);

//         // 3. Rate the generated puzzle
//         const ratingResult = await ratePuzzleDifficulty(currentPuzzle); // Use the async wrapper if needed

//         if (ratingResult && ratingResult.difficulty === desiredLevel) {
//              // Additional Check: Ensure the number of clues is reasonable for the level? (Optional)
//              // e.g., if (finalClueCount > someMaxForHard && desiredLevel === DifficultyLevel.HARD) continue;

//             console.log(`--- Success! Found ${desiredLevel} puzzle on attempt ${attempt} ---`);
//             return {
//                 puzzle: currentPuzzle,
//                 solution: solution,
//                 difficulty: ratingResult.difficulty,
//                 score: ratingResult.score,
//                 techniques: ratingResult.techniques
//             };
//         } else if (ratingResult) {
//              console.log(`-> Puzzle rated as ${ratingResult.difficulty} (Score: ${ratingResult.score}). Discarding.`);
//         } else {
//             console.log("-> Puzzle rating failed (invalid/error). Discarding.");
//         }

//     } // End attempts loop

//     console.error(`Failed to generate a puzzle of level ${desiredLevel} after ${maxAttempts} attempts.`);
//     return null;
// }

/**
 * Simulates solving a puzzle step-by-step using only the implemented logical techniques.
 * Does NOT use backtracking. Records techniques used and maximum difficulty score.
 *
 * @param {number[][]} board - The puzzle board state.
 * @param {Function} getTechniqueScoreFn - Function to get score from technique name.
 * @returns {{
*   status: SolverStatus,
*   maxScore: number,
*   techniquesUsed: Set<string>,
*   stepsTaken: number
* } | { status: 'error', message: string }}
*/
function ratePuzzleDifficultyInternal(board, getTechniqueScoreFn) {
   let currentBoard = deepCopy2DArray(board);
   let candidatesMap = initializeCandidatesMap(currentBoard);
   const techniquesUsed = new Set();
   let maxScore = 0;
   let stepsTaken = 0;
   const MAX_SOLVER_STEPS = 200; // Safety break

   if (!candidatesMap) {
       return { status: 'error', message: 'Initial board state has contradiction.' };
   }

   while (stepsTaken < MAX_SOLVER_STEPS) {
       const emptyCell = findNextEmptyCell(currentBoard);
       if (!emptyCell) {
           return { status: 'solved', maxScore, techniquesUsed, stepsTaken }; // Solved logically
       }

       // Use a *local copy* of the map for findNextLogicalStep to check eliminations
       let tempCandidatesMap = new Map();
       for (const [key, valueSet] of candidatesMap.entries()) {
           tempCandidatesMap.set(key, new Set(valueSet));
       }

       // *** IMPORTANT: findNextLogicalStep needs to be able to run without applying changes
       // to the main candidatesMap passed to it, OR we need a different structure.
       // Let's assume findNextLogicalStep is primarily for *finding* the step,
       // and we apply changes *here* in the rating loop.

       // Find the next step based on the *temporary* map state
       const result = findNextLogicalStep(currentBoard, tempCandidatesMap); // Pass temp map

       if (result.status === 'found_step') {
           stepsTaken++;
           const step = result.steps[0];
           const techniqueBaseName = step.technique.split(' (')[0]; // Get base name like "X-Wing"
           techniquesUsed.add(techniqueBaseName);
           maxScore = Math.max(maxScore, getTechniqueScoreFn(step.technique));

           console.log(`Rating Step ${stepsTaken}: ${step.technique} (Score: ${getTechniqueScoreFn(step.technique)}, Max: ${maxScore})`);


           // Apply the step's changes to the *main* board and candidatesMap for the next iteration
           try {
               if (step.value !== undefined && step.cell) { // Placement step (Singles)
                   const [r, c] = step.cell;
                   if (currentBoard[r][c] !== 0) {
                        console.error(`Rating Error: Trying to place ${step.value} in already filled cell [${r},${c}]`);
                        return { status: 'error', message: 'Solver tried to overwrite cell during rating.' };
                   }
                   currentBoard[r][c] = step.value;
                   candidatesMap.delete(`${r}-${c}`); // Remove candidates for placed cell

                   // Eliminate placed value from peers' candidates
                   const peers = getPeers(r, c);
                   peers.forEach(([pr, pc]) => {
                       candidatesMap.get(`${pr}-${pc}`)?.delete(step.value);
                   });
                    // Check for resulting contradictions immediately? (Optional but safer)
                    for(const [pr, pc] of peers) {
                        if (currentBoard[pr][pc] === 0 && candidatesMap.get(`${pr}-${pc}`)?.size === 0) {
                           return { status: 'error', message: `Contradiction after placing ${step.value} at [${r},${c}] - cell [${pr},${pc}] has no candidates.` };
                        }
                    }

               } else if (step.eliminations && step.eliminations.length > 0) { // Elimination step
                   const elimsForApply = step.eliminations.map(e => ({
                       cellKey: `${e.cell[0]}-${e.cell[1]}`,
                       values: e.values
                   }));
                   if (!applyEliminations(candidatesMap, elimsForApply)) {
                       // This shouldn't happen if findNextLogicalStep reported eliminations,
                       // but check just in case.
                       console.warn("Rating Warning: Found step reported eliminations, but applyEliminations had no effect.");
                   }
               } else {
                    console.error("Rating Error: Found step had no placement or eliminations.");
                    return { status: 'error', message: 'Solver step invalid during rating.' };
               }
           } catch (error) {
                console.error("Rating Error: Contradiction during step application.", error);
                return { status: 'error', message: `Contradiction found during rating: ${error.message}` };
           }

       } else if (result.status === 'stuck') {
           console.log(`Rating Stuck after ${stepsTaken} steps. Max Score: ${maxScore}`);
           return { status: 'stuck', maxScore, techniquesUsed, stepsTaken }; // Stuck logically

       } else if (result.status === 'error') {
           console.error("Rating Error: Solver returned error.", result.message);
           return { status: 'error', message: `Solver error during rating: ${result.message}` };

       } else if (result.status === 'solved') {
            // Should have been caught by findNextEmptyCell, but handle anyway
           return { status: 'solved', maxScore, techniquesUsed, stepsTaken };
       }

   } // End while loop

   console.warn("Rating Warning: Exceeded max steps.");
   return { status: 'stuck', maxScore, techniquesUsed, stepsTaken }; // Stuck due to complexity or max steps
}

// --- Public function to be called by generator ---
/**
* Rates the difficulty of a given Sudoku puzzle based on logical techniques.
* @param {number[][]} board - The puzzle board.
* @returns {{difficulty: DifficultyLevel, score: number, techniques: Set<string>}|null} Difficulty level, max score, techniques used, or null if invalid/unsolvable by logic.
*/
export function ratePuzzleDifficulty(board) {
    // Import needed constants/helpers here or pass them in

   const ratingResult = ratePuzzleDifficultyInternal(board, getTechniqueScore);

   if (ratingResult.status === 'solved' || ratingResult.status === 'stuck') {
        // If stuck, the rating reflects the hardest technique found *before* getting stuck.
        // This is usually desired - we rate based on what the *logical* solver can do.
       const difficulty = getDifficultyLevelFromScore(ratingResult.maxScore);
       console.log(`Puzzle Rating: ${difficulty} (Max Score: ${ratingResult.maxScore}, Solved: ${ratingResult.status === 'solved'}, Techniques: ${Array.from(ratingResult.techniquesUsed).join(', ')})`);
       return {
           difficulty: difficulty,
           score: ratingResult.maxScore,
           techniques: ratingResult.techniquesUsed
       };
   } else {
       // Error during rating
       console.error(`Puzzle Rating Failed: ${ratingResult.message}`);
       return null;
   }
}
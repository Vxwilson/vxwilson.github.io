// js/sudoku/solver_advanced.js
import { BOARD_SIZE, BOX_SIZE, DifficultyLevel, DIFFICULTY_THRESHOLDS, getTechniqueScore, getDifficultyLevelFromScore } from './constants.js';
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

// UTILITY
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

// SINGLES/TUPLES

// Finds the simplest step: a unit (row, col, box) with only one empty cell.
function findFullHouse(board, candidatesMap) {
    for (const unit of allUnits) {
        let emptyCellsInUnit = [];
        let unitValues = new Set();

        for (const [r, c] of unit.cells) {
            if (board[r][c] === 0) {
                emptyCellsInUnit.push([r, c]);
            } else {
                unitValues.add(board[r][c]);
            }
        }

        if (emptyCellsInUnit.length === 1) {
            const [r, c] = emptyCellsInUnit[0];
            let missingValue = -1;
            for (let n = 1; n <= BOARD_SIZE; n++) {
                if (!unitValues.has(n)) {
                    missingValue = n;
                    break;
                }
            }

            if (missingValue !== -1) {
                // Double-check: Does the candidate map agree? (Should normally match)
                const cellKey = `${r}-${c}`;
                if (candidatesMap.has(cellKey) && !candidatesMap.get(cellKey)?.has(missingValue)) {
                     console.warn(`Full House contradiction: Cell R${r+1}C${c+1} should be ${missingValue} for ${unit.type} ${unit.index}, but candidate not present in map.`);
                     // Optionally return null or throw error, depending on desired strictness
                     continue; // Skip this potential Full House if map disagrees
                }

                 // Ensure it's not *also* a Naked Single (which would have a higher SE score)
                 // A Full House *might* also be a Naked Single if all other candidates were eliminated previously.
                 // The SE scale prioritizes the *reason* it's solvable. If it's the last empty cell in a house, it's Full House.
                 // We rely on the order in findNextLogicalStep to find Full House first.

                return {
                    technique: 'Full House',
                    cell: [r, c],
                    value: missingValue,
                    description: `Cell R${r + 1}C${c + 1} is the last empty cell in ${unit.type.toLowerCase()} ${unit.index}, must be ${missingValue}.`,
                    highlights: [
                        { row: r, col: c, candidates: [missingValue], type: 'target' },
                        ...unit.cells
                            .filter(([ur, uc]) => !(ur === r && uc === c))
                            .map(([ur, uc]) => ({ row: ur, col: uc, candidates: [], type: 'unit' }))
                    ]
                };
            }
        }
    }
    return null;
}

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

function findNakedTriples(candidatesMap) {
    const N = 3; // Size of the subset
    for (const unit of allUnits) {
        const potentialTripleCells = unit.cells
            .map(([r, c]) => ({ key: `${r}-${c}`, candidates: candidatesMap.get(`${r}-${c}`) }))
            .filter(cell => cell.candidates && cell.candidates.size > 0 && cell.candidates.size <= N); // Cells with N or fewer candidates

        if (potentialTripleCells.length < N) continue;

        const combinations = getCombinations(potentialTripleCells, N); // Get combinations of size N

        for (const combo of combinations) { // combo is an array of N cells
            const union = new Set();
            combo.forEach(cell => cell.candidates.forEach(cand => union.add(cand)));

            if (union.size === N) { // It's a Naked Triple (exactly N candidates across N cells)
                const subsetValues = Array.from(union); // The N candidates
                const subsetKeys = new Set(combo.map(cell => cell.key));
                const unitElims = [];

                // Find eliminations in other cells of the unit
                for (const [r, c] of unit.cells) {
                    const cellKey = `${r}-${c}`;
                    if (!subsetKeys.has(cellKey)) { // If it's not one of the triple cells
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
                        technique: `Naked Triplet`, // Specific name for scoring
                        description: `Cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] form a Naked Triplet of (${subsetValues.join(', ')}). These digits removed from other cells in ${unit.type.toLowerCase()} ${unit.index}.`,
                        eliminations: unitElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                        highlights: [
                            // Highlight the defining cells
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: subsetValues, type: 'defining' })), // Highlight N candidates in N cells
                            // Highlight the eliminations
                            ...unitElims.map(elim => {
                                const [er, ec] = elim.cellKey.split('-').map(Number);
                                return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                            })
                        ]
                    };
                    console.log(`  >> Found Potential Naked Triplet (${subsetValues.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findHiddenSinglesMap(candidatesMap, board) {
    for (const unit of allUnits) {
        for (let n = 1; n <= BOARD_SIZE; n++) {
            let foundCount = 0;
            let foundCellCoords = null;
            let foundCellKey = null;

            for (const [r, c] of unit.cells) {
                if (board[r][c] !== 0) continue;
                const cellKey = `${r}-${c}`;
                const candidates = candidatesMap.get(cellKey);
                if (!candidates || !candidates.has(n)) continue;

                // Found a potential location for 'n'
                foundCount++;
                foundCellCoords = [r, c];
                foundCellKey = cellKey;
                if (foundCount > 1) break;
            }

            if (foundCount === 1) {
                const [r, c] = foundCellCoords;
                // Ensure it's not also a Naked Single (handled by technique order)
                // Check size > 1 to confirm it's "hidden"
                if (candidatesMap.get(foundCellKey)?.size > 1) {
                    // --- Determine specific technique name based on unit type ---
                    let techniqueName = 'Hidden Single'; // Fallback
                    if (unit.type === 'Box') {
                        techniqueName = 'Hidden Single (Box)';
                    } else if (unit.type === 'Row') {
                        techniqueName = 'Hidden Single (Row)';
                    } else if (unit.type === 'Column') {
                        techniqueName = 'Hidden Single (Col)';
                    }
                    // --- ---

                    return {
                        // Use the specific name for scoring
                        technique: techniqueName,
                        cell: [r, c],
                        value: n,
                        description: `Cell R${r + 1}C${c + 1} must be ${n} (only place for ${n} in ${unit.type.toLowerCase()} ${unit.index}).`,
                        highlights: [
                            { row: r, col: c, candidates: [n], type: 'target' },
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

function findHiddenTriples(candidatesMap, board) {
    const N = 3; // Size of the subset
    for (const unit of allUnits) {
        const unitCellKeys = unit.cells
            .filter(([r, c]) => board[r][c] === 0)
            .map(([r, c]) => `${r}-${c}`)
            .filter(key => candidatesMap.has(key));

        if (unitCellKeys.length < N) continue;

        // Map: digit -> Set<cellKey> where digit is a candidate
        const digitLocations = new Map();
        for (let n = 1; n <= BOARD_SIZE; n++) {
            digitLocations.set(n, new Set());
        }
        unitCellKeys.forEach(key => {
            candidatesMap.get(key)?.forEach(n => {
                digitLocations.get(n).add(key);
            });
        });

        // Find digits that appear as candidates in 2 or N cells within the unit
        const possibleTripleDigits = Array.from(digitLocations.keys())
            .filter(n => digitLocations.get(n).size >= 2 && digitLocations.get(n).size <= N);

        if (possibleTripleDigits.length < N) continue;

        // Get combinations of N digits
        const digitCombinations = getCombinations(possibleTripleDigits, N);

        for (const digitCombo of digitCombinations) { // e.g., [1, 4, 9]
            // Find all cells where *any* of these N digits appear
            const cellsUnion = new Set();
            digitCombo.forEach(digit => {
                digitLocations.get(digit).forEach(cellKey => cellsUnion.add(cellKey));
            });

            // Check if these N digits are restricted to exactly N cells
            if (cellsUnion.size === N) {
                // Now, verify that *each* of the N digits is actually present within this set of N cells
                let allDigitsPresentInUnion = true;
                for(const digit of digitCombo) {
                    const locationsForDigit = digitLocations.get(digit);
                    if (![...locationsForDigit].some(loc => cellsUnion.has(loc))) {
                        allDigitsPresentInUnion = false;
                        break;
                    }
                    // Also ensure the digit doesn't appear *outside* these N cells within the unit
                    if ([...locationsForDigit].some(loc => !cellsUnion.has(loc))) {
                         allDigitsPresentInUnion = false; // This check might be redundant due to cellsUnion.size === N logic, but safer
                         break;
                    }
                }

                if (!allDigitsPresentInUnion) continue;


                // It's a Hidden Triple
                const subsetCellKeys = Array.from(cellsUnion); // The keys of the N cells
                const unitElims = [];

                // Eliminate candidates *other than* the triple's digits from these N cells
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
                        technique: `Hidden Triplet`, // Specific name for scoring
                        description: `Digits (${digitCombo.join(', ')}) only appear in cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] within ${unit.type.toLowerCase()} ${unit.index}. Other candidates removed from these ${N} cells.`,
                        eliminations: unitElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                        highlights: [
                            // Highlight the N cells forming the triple, showing *only* the hidden triple candidates
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: digitCombo, type: 'defining' })),
                            // Highlight the specific candidates being eliminated within those N cells
                            // (Alternative: Could highlight the eliminated candidates in the UI differently)
                        ]
                    };
                    console.log(`  >> Found Potential Hidden Triplet (${digitCombo.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

// LOCKED CANDIDATES

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
                 
                    u_type = unit.type === 'Row' ? 'Row' : 'Col';
                    const stepInfo = {
                        technique: `Locked Candidates (Claiming ${u_type})`,
                        description: `Digit ${n} in ${u_type} ${unit.index} is confined to Box ${boxIndexUI}. Removed from other cells in Box ${boxIndexUI}.`,
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
                    console.log(`  >> Found Potential Claiming (${n} in ${u_type} ${unit.index} -> Box ${boxIndexUI}). Eliminations:`, claimingElims.map(e => e.cellKey));
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

// WINGS

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
        if (eliminationHappenedInUnit && finalSize === 0) {
            return unit;
        }
    }

    return null;
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
                description: `Cells R${cell1.r + 1}C${cell1.c + 1} and R${cell2.r + 1}C${cell2.c + 1} (both ${candA}/${candB}) form a W-Wing. A strong link on ${identifiedLinkValue} exists between them (verified in ${linkUnit.type} ${linkUnit.index}). Candidate ${identifiedElimValue} can be removed from common peer(s) like R${eliminatedPeerCoords[0] + 1}C${eliminatedPeerCoords[1] + 1}.`,
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
            console.log(`  >> Found W-Wing between ${cell1.key} and ${cell2.key} (Link ${identifiedLinkValue} in ${linkUnit.type} ${linkUnit.index}, Elim ${identifiedElimValue}). Eliminations:`, wingElims.map(e => e.cellKey));
            return { eliminations: wingElims, stepInfo: stepInfo };
        } else {
            // console.log(`  No effective W-Wing eliminations found for pair ${cell1.key}/${cell2.key}.`);
        }
    } // End loop through wing pair combinations

    return { eliminations: [], stepInfo: null }; // No W-Wing found
}

/**
 * Finds the FIRST Y-Wing pattern that results in actual eliminations.
 * Structure: Pivot(AB), Wing1(AC), Wing2(BC), where Wings see Pivot.
 * Eliminate C from common peers of Wing1 and Wing2.
 *
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findYWing(candidatesMap) {
    // 1. Find all bivalue cells
    const bivalueCells = [];
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.size === 2) {
            const [r, c] = key.split('-').map(Number);
            bivalueCells.push({ key, r, c, candidatesList: Array.from(candidates) });
        }
    }
    if (bivalueCells.length < 3) return { eliminations: [], stepInfo: null }; // Need at least 3 bivalue cells

    // 2. Iterate through potential pivots
    for (const pivot of bivalueCells) {
        const [candA, candB] = pivot.candidatesList; // Pivot candidates {A, B}

        // 3. Find potential wings (bivalue cells that see the pivot)
        const potentialWings = bivalueCells.filter(wing =>
            wing.key !== pivot.key && cellsSeeEachOther(wing.r, wing.c, pivot.r, pivot.c)
        );

        if (potentialWings.length < 2) continue; // Need at least two wings seeing the pivot

        // 4. Iterate through pairs of potential wings
        const wingCombinations = getCombinations(potentialWings, 2);

        for (const [wing1, wing2] of wingCombinations) {
            const wing1Cands = wing1.candidatesList; // Wing1 candidates {?, ?}
            const wing2Cands = wing2.candidatesList; // Wing2 candidates {?, ?}

            // 5. Check the specific Y-Wing candidate pattern
            let candC = -1; // The elimination candidate
            let foundPattern = false;

            // Case 1: Wing1={A, C}, Wing2={B, C}
            if (wing1Cands.includes(candA) && !wing1Cands.includes(candB) &&
                wing2Cands.includes(candB) && !wing2Cands.includes(candA)) {
                const commonCandW1 = wing1Cands.find(c => c !== candA);
                const commonCandW2 = wing2Cands.find(c => c !== candB);
                if (commonCandW1 === commonCandW2 && commonCandW1 !== candA && commonCandW1 !== candB) {
                    candC = commonCandW1;
                    foundPattern = true;
                }
            }
            // Case 2: Wing1={B, C}, Wing2={A, C} (swap roles of A/B compared to pivot)
            else if (wing1Cands.includes(candB) && !wing1Cands.includes(candA) &&
                wing2Cands.includes(candA) && !wing2Cands.includes(candB)) {
                const commonCandW1 = wing1Cands.find(c => c !== candB);
                const commonCandW2 = wing2Cands.find(c => c !== candA);
                if (commonCandW1 === commonCandW2 && commonCandW1 !== candA && commonCandW1 !== candB) {
                    candC = commonCandW1;
                    foundPattern = true;
                    // Note: We are still consistent here. The pivot has A, B.
                    // Wing1 has B, C. Wing2 has A, C. The logic holds.
                }
            }

            if (foundPattern && candC !== -1) {
                // 6. Found a valid Y-Wing structure. Find common peers of the TWO WINGS.
                const commonPeersKeys = getCommonPeers(wing1.r, wing1.c, wing2.r, wing2.c);
                const yWingElims = [];

                for (const peerKey of commonPeersKeys) {
                    // Important: Do not eliminate from the pivot itself
                    if (peerKey === pivot.key) continue;

                    if (candidatesMap.get(peerKey)?.has(candC)) {
                        yWingElims.push({ cellKey: peerKey, values: [candC] });
                    }
                }

                // 7. If eliminations were found, create step and return
                if (yWingElims.length > 0) {
                    // Determine the actual A', B' used for description clarity
                    // A' is the one shared by pivot and wing1, B' shared by pivot and wing2
                    const actualCandA_prime = wing1Cands.find(c => c === candA || c === candB);
                    const actualCandB_prime = wing2Cands.find(c => c === candA || c === candB);

                    const stepInfo = {
                        technique: `Y-Wing`,
                        description: `Pivot R${pivot.r + 1}C${pivot.c + 1} (${actualCandA_prime}, ${actualCandB_prime}), Wing1 R${wing1.r + 1}C${wing1.c + 1} (${actualCandA_prime}, ${candC}), Wing2 R${wing2.r + 1}C${wing2.c + 1} (${actualCandB_prime}, ${candC}) form a Y-Wing. Candidate ${candC} can be removed from cells seeing both wings.`,
                        eliminations: yWingElims.map(elim => ({ cell: elim.cellKey.split('-').map(Number), values: elim.values })),
                        highlights: [
                            // Highlight the pivot
                            { row: pivot.r, col: pivot.c, candidates: [candA, candB], type: 'defining' }, // Show original pivot candidates
                            // Highlight wing 1
                            { row: wing1.r, col: wing1.c, candidates: wing1Cands, type: 'defining' }, // Show original wing candidates
                            // Highlight wing 2
                            { row: wing2.r, col: wing2.c, candidates: wing2Cands, type: 'defining' }, // Show original wing candidates
                            // Highlight the candidates being eliminated
                            ...yWingElims.map(elim => {
                                const [er, ec] = elim.cellKey.split('-').map(Number);
                                return { row: er, col: ec, candidates: [candC], type: 'eliminated' };
                            })
                        ]
                    };
                    console.log(`  >> Found Potential Y-Wing (Pivot ${pivot.key}, Wings ${wing1.key}, ${wing2.key}, Elim ${candC}). Eliminations:`, yWingElims.map(e => e.cellKey));
                    return { eliminations: yWingElims, stepInfo: stepInfo };
                }
            } // End if foundPattern
        } // End loop wing combinations
    } // End loop pivots

    return { eliminations: [], stepInfo: null }; // No Y-Wing found
}

// FISH
// helper
/**
 * Gets all locations (as 'r-c' keys) for a specific candidate digit.
 * @param {Map<string, Set<number>>} candidatesMap
 * @param {number} digit
 * @returns {Set<string>} A set of 'r-c' keys.
 */
function getCandidateLocations(candidatesMap, digit) {
    const locations = new Set();
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.has(digit)) {
            locations.add(key);
        }
    }
    return locations;
}

/**
 * Groups candidate locations by unit (row, column, box).
 * @param {Set<string>} locations - Set of 'r-c' keys for a digit.
 * @returns {{rows: Map<number, Set<string>>, cols: Map<number, Set<string>>, boxes: Map<number, Set<string>>}}
 */
function groupLocationsByUnit(locations) {
    const rows = new Map();
    const cols = new Map();
    const boxes = new Map();

    for (const key of locations) {
        const [r, c] = key.split('-').map(Number);
        const boxIndex = Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE);

        if (!rows.has(r)) rows.set(r, new Set());
        rows.get(r).add(key);

        if (!cols.has(c)) cols.set(c, new Set());
        cols.get(c).add(key);

        if (!boxes.has(boxIndex)) boxes.set(boxIndex, new Set());
        boxes.get(boxIndex).add(key);
    }
    return { rows, cols, boxes };
}

/**
 * Converts a 'r-c' key string to [r, c] coordinates.
 * @param {string} key
 * @returns {[number, number]}
 */
function keyToCoords(key) {
    return key.split('-').map(Number);
}

/**
 * Converts [r, c] coordinates to a 'r-c' key string.
 * @param {number} r
 * @param {number} c
 * @returns {string}
 */
function coordsToKey(r, c) {
    return `${r}-${c}`;
}

// [solver_advanced.js] - Add after findYWing or findXWing

/**
 * Finds the FIRST Skyscraper pattern that results in actual eliminations.
 * Looks for two rows (or two columns) with exactly two candidates for a digit,
 * where two candidates align in one column (or row) - the "base".
 * Eliminations occur for candidates seeing the other two candidates (the "roof").
 *
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function findSkyscraper(candidatesMap) {
    for (let n = 1; n <= BOARD_SIZE; n++) {
        const locations = getCandidateLocations(candidatesMap, n);
        if (locations.size < 4) continue; // Need at least 4 candidates for a Skyscraper
        const { rows, cols } = groupLocationsByUnit(locations);

        // --- Check for Row-based Skyscraper (Base in a Column) ---
        const candidateRows = new Map(); // Map<rowIndex, [col1Key, col2Key]>
        for (const [r, rowLocations] of rows.entries()) {
            if (rowLocations.size === 2) {
                candidateRows.set(r, Array.from(rowLocations));
            }
        }

        if (candidateRows.size >= 2) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 2);

            for (const [r1, r2] of rowCombinations) {
                const [key1a, key1b] = candidateRows.get(r1); // e.g., 'r1-c1a', 'r1-c1b'
                const [key2a, key2b] = candidateRows.get(r2); // e.g., 'r2-c2a', 'r2-c2b'
                const [, c1a] = keyToCoords(key1a);
                const [, c1b] = keyToCoords(key1b);
                const [, c2a] = keyToCoords(key2a);
                const [, c2b] = keyToCoords(key2b);

                let baseCol = -1;
                let roofKey1 = null;
                let roofKey2 = null;

                // Find base and roof
                if (c1a === c2a && c1b !== c2b) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (c1a === c2b && c1b !== c2a) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (c1b === c2a && c1a !== c2b) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (c1b === c2b && c1a !== c2a) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseCol !== -1) {
                    const [roof_r1, roof_c1] = keyToCoords(roofKey1);
                    const [roof_r2, roof_c2] = keyToCoords(roofKey2);

                    // Find common peers of the two ROOF cells
                    const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2);
                    const skyscraperElims = [];

                    for (const peerKey of commonPeersKeys) {
                        // Ensure not eliminating from the base or roof cells themselves
                        if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                            if (candidatesMap.get(peerKey)?.has(n)) {
                                skyscraperElims.push({ cellKey: peerKey, values: [n] });
                            }
                        }
                    }

                    if (skyscraperElims.length > 0) {
                        const baseKey1 = coordsToKey(r1, baseCol);
                        const baseKey2 = coordsToKey(r2, baseCol);
                        const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)];
                        const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)];

                        const stepInfo = {
                            technique: `Skyscraper (Rows, Digit ${n})`,
                            description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms a Skyscraper with base in Col ${baseCol + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
                            eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                            highlights: [
                                // Highlight base cells
                                ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight roof cells
                                ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight eliminations
                                ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' }))
                            ]
                        };
                        console.log(`  >> Found Row Skyscraper (Digit ${n}, Base Col ${baseCol + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
                        return { eliminations: skyscraperElims, stepInfo: stepInfo };
                    }
                }
            }
        } // End Row-based check

        // --- Check for Column-based Skyscraper (Base in a Row) ---
        const candidateCols = new Map(); // Map<colIndex, [row1Key, row2Key]>
        for (const [c, colLocations] of cols.entries()) {
            if (colLocations.size === 2) {
                candidateCols.set(c, Array.from(colLocations));
            }
        }

        if (candidateCols.size >= 2) {
            const colIndices = Array.from(candidateCols.keys());
            const colCombinations = getCombinations(colIndices, 2);

            for (const [c1, c2] of colCombinations) {
                const [key1a, key1b] = candidateCols.get(c1); // 'r1a-c1', 'r1b-c1'
                const [key2a, key2b] = candidateCols.get(c2); // 'r2a-c2', 'r2b-c2'
                const [r1a,] = keyToCoords(key1a);
                const [r1b,] = keyToCoords(key1b);
                const [r2a,] = keyToCoords(key2a);
                const [r2b,] = keyToCoords(key2b);

                let baseRow = -1;
                let roofKey1 = null;
                let roofKey2 = null;

                // Find base and roof
                if (r1a === r2a && r1b !== r2b) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (r1a === r2b && r1b !== r2a) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (r1b === r2a && r1a !== r2b) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (r1b === r2b && r1a !== r2a) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseRow !== -1) {
                    const [roof_r1, roof_c1] = keyToCoords(roofKey1);
                    const [roof_r2, roof_c2] = keyToCoords(roofKey2);

                    // Find common peers of the two ROOF cells
                    const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2);
                    const skyscraperElims = [];

                    for (const peerKey of commonPeersKeys) {
                        if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                            if (candidatesMap.get(peerKey)?.has(n)) {
                                skyscraperElims.push({ cellKey: peerKey, values: [n] });
                            }
                        }
                    }

                    if (skyscraperElims.length > 0) {
                        const baseKey1 = coordsToKey(baseRow, c1);
                        const baseKey2 = coordsToKey(baseRow, c2);
                        const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)];
                        const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)];

                        const stepInfo = {
                            technique: `Skyscraper (Cols, Digit ${n})`,
                            description: `Digit ${n} in Cols ${c1 + 1} and ${c2 + 1} forms a Skyscraper with base in Row ${baseRow + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
                            eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                            highlights: [
                                ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' }))
                            ]
                        };
                        console.log(`  >> Found Col Skyscraper (Digit ${n}, Base Row ${baseRow + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
                        return { eliminations: skyscraperElims, stepInfo: stepInfo };
                    }
                }
            }
        } // End Col-based check

    } // End digit loop

    return { eliminations: [], stepInfo: null };
}

// [solver_advanced.js] - Add after findSkyscraper

/**
 * Finds the FIRST 2-String Kite pattern that results in actual eliminations.
 * Looks for a row and a column each with exactly two candidates for a digit.
 * One candidate from the row must share a box with one candidate from the column (but not be the same cell).
 * Eliminations occur for candidates seeing the other two "end" candidates.
 *
 * @param {Map<string, Set<number>>} candidatesMap
 * @returns {{eliminations: Array<{cellKey: string, values: number[]}>, stepInfo: Step | null}}
 */
function find2StringKite(candidatesMap) {
    for (let n = 1; n <= BOARD_SIZE; n++) {
        const locations = getCandidateLocations(candidatesMap, n);
        if (locations.size < 4) continue;
        const { rows, cols } = groupLocationsByUnit(locations);

        const candidateRows = []; // Array of { r: number, keys: [string, string] }
        for (const [r, rowLocations] of rows.entries()) {
            if (rowLocations.size === 2) {
                candidateRows.push({ r, keys: Array.from(rowLocations) });
            }
        }

        const candidateCols = []; // Array of { c: number, keys: [string, string] }
        for (const [c, colLocations] of cols.entries()) {
            if (colLocations.size === 2) {
                candidateCols.push({ c, keys: Array.from(colLocations) });
            }
        }

        if (candidateRows.length === 0 || candidateCols.length === 0) continue;

        for (const rowInfo of candidateRows) {
            const r = rowInfo.r;
            const [keyR1, keyR2] = rowInfo.keys; // e.g., 'r-c1', 'r-c2'
            const [r1, c1] = keyToCoords(keyR1);
            const [r2, c2] = keyToCoords(keyR2); // r1 === r2 === r
            const boxR1 = Math.floor(r1 / BOX_SIZE) * BOX_SIZE + Math.floor(c1 / BOX_SIZE);
            const boxR2 = Math.floor(r2 / BOX_SIZE) * BOX_SIZE + Math.floor(c2 / BOX_SIZE);

            for (const colInfo of candidateCols) {
                const c = colInfo.c;
                // Avoid trivial case where row and column are the same cell's units
                if (c === c1 && r === r2) continue; // Should be redundant due to checks below
                if (c === c2 && r === r1) continue;

                const [keyC1, keyC2] = colInfo.keys; // e.g., 'rA-c', 'rB-c'
                const [rA, cA] = keyToCoords(keyC1); // cA === c === c
                const [rB, cB] = keyToCoords(keyC2); // cB === c === c
                const boxC1 = Math.floor(rA / BOX_SIZE) * BOX_SIZE + Math.floor(cA / BOX_SIZE);
                const boxC2 = Math.floor(rB / BOX_SIZE) * BOX_SIZE + Math.floor(cB / BOX_SIZE);

                let linkKeyRow = null;
                let linkKeyCol = null;
                let endKeyRow = null;
                let endKeyCol = null;

                // Check for the box link (one cell from row pair shares box with one from col pair, but not the same cell)
                if (keyR1 !== keyC1 && boxR1 === boxC1) { linkKeyRow = keyR1; linkKeyCol = keyC1; endKeyRow = keyR2; endKeyCol = keyC2; }
                else if (keyR1 !== keyC2 && boxR1 === boxC2) { linkKeyRow = keyR1; linkKeyCol = keyC2; endKeyRow = keyR2; endKeyCol = keyC1; }
                else if (keyR2 !== keyC1 && boxR2 === boxC1) { linkKeyRow = keyR2; linkKeyCol = keyC1; endKeyRow = keyR1; endKeyCol = keyC2; }
                else if (keyR2 !== keyC2 && boxR2 === boxC2) { linkKeyRow = keyR2; linkKeyCol = keyC2; endKeyRow = keyR1; endKeyCol = keyC1; }

                if (linkKeyRow) { // Found a valid kite structure
                    const [endR_r, endR_c] = keyToCoords(endKeyRow);
                    const [endC_r, endC_c] = keyToCoords(endKeyCol);

                    // Cannot eliminate from the 4 defining cells
                    const definingKeys = new Set([keyR1, keyR2, keyC1, keyC2]);

                    // Find common peers of the two END cells
                    const commonPeersKeys = getCommonPeers(endR_r, endR_c, endC_r, endC_c);
                    const kiteElims = [];

                    for (const peerKey of commonPeersKeys) {
                        if (!definingKeys.has(peerKey) && candidatesMap.get(peerKey)?.has(n)) {
                            kiteElims.push({ cellKey: peerKey, values: [n] });
                        }
                    }

                    if (kiteElims.length > 0) {
                        const [lr_r, lr_c] = keyToCoords(linkKeyRow);
                        const [lc_r, lc_c] = keyToCoords(linkKeyCol);
                        const definingCoords = [keyToCoords(keyR1), keyToCoords(keyR2), keyToCoords(keyC1), keyToCoords(keyC2)];

                        const stepInfo = {
                            technique: `2-String Kite (Digit ${n})`,
                            description: `Digit ${n} forms a 2-String Kite. Row ${r + 1} has candidates at C${c1 + 1}, C${c2 + 1}. Column ${c + 1} has candidates at R${rA + 1}, R${rB + 1}. Link between R${lr_r + 1}C${lr_c + 1} and R${lc_r + 1}C${lc_c + 1} via their box. Candidate ${n} removed from cells seeing both ends R${endR_r + 1}C${endR_c + 1} and R${endC_r + 1}C${endC_c + 1}.`,
                            eliminations: kiteElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                            highlights: [
                                // Highlight the 4 defining cells
                                ...definingCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                // Highlight eliminations
                                ...kiteElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' }))
                            ]
                        };
                        console.log(`  >> Found 2-String Kite (Digit ${n}, Row ${r + 1}, Col ${c + 1}, Ends ${endKeyRow}/${endKeyCol}). Eliminations:`, kiteElims.map(e => e.cellKey));
                        return { eliminations: kiteElims, stepInfo: stepInfo };
                    }
                }
            }
        } // End row loop
    } // End digit loop

    return { eliminations: [], stepInfo: null };
}

// findCrane here

// PUZZLE SOLVER

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

    try {
        // --- Technique Order (Ascending SE Score) ---

        // SE ~1.0
        const fullHouseStep = findFullHouse(board, candidatesMap); // Pass the *copied* map
        if (fullHouseStep) {
             console.log("Found Full House");
             return { status: 'found_step', steps: [fullHouseStep] };
        }


        // SE 1.2 / 1.5
        const hiddenSingleStep = findHiddenSinglesMap(candidatesMap, board);
        if (hiddenSingleStep) {
             console.log(`Found ${hiddenSingleStep.technique}`);
             return { status: 'found_step', steps: [hiddenSingleStep] };
        }

        // SE 2.3
        const nakedSingleStep = findNakedSinglesMap(candidatesMap);
        if (nakedSingleStep) {
             console.log("Found Naked Single");
             return { status: 'found_step', steps: [nakedSingleStep] };
        }

        // SE 2.6 / 2.8
        const lockedResult = findLockedCandidates(candidatesMap);
        if (lockedResult.stepInfo && applyEliminations(candidatesMap, lockedResult.eliminations)) {
            console.log(`Applied ${lockedResult.stepInfo.technique} - Returning Step`);
            return { status: 'found_step', steps: [lockedResult.stepInfo] };
        }

        // SE 3.0
        const nakedPairResult = findNakedPairs(candidatesMap);
        if (nakedPairResult.stepInfo && applyEliminations(candidatesMap, nakedPairResult.eliminations)) {
            console.log("Applied Naked Pair - Returning Step");
            return { status: 'found_step', steps: [nakedPairResult.stepInfo] };
        }

        // SE 3.1
        const wWingResult = findWWing(candidatesMap);
        if (wWingResult.stepInfo && applyEliminations(candidatesMap, wWingResult.eliminations)) {
            console.log("Applied W-Wing - Returning Step");
            return { status: 'found_step', steps: [wWingResult.stepInfo] };
        }

        // SE 3.2
        const xWingResult = findXWing(candidatesMap);
        if (xWingResult.stepInfo && applyEliminations(candidatesMap, xWingResult.eliminations)) {
            console.log("Applied X-Wing - Returning Step");
            return { status: 'found_step', steps: [xWingResult.stepInfo] };
        }

        // SE 3.4
        const hiddenPairResult = findHiddenPairs(candidatesMap, board);
        if (hiddenPairResult.stepInfo && applyEliminations(candidatesMap, hiddenPairResult.eliminations)) {
            console.log("Applied Hidden Pair - Returning Step");
            return { status: 'found_step', steps: [hiddenPairResult.stepInfo] };
        }

        // SE 3.6 (Requires findNakedTriples)
        const nakedTripleResult = findNakedTriples(candidatesMap);
        if (nakedTripleResult.stepInfo && applyEliminations(candidatesMap, nakedTripleResult.eliminations)) {
            console.log("Applied Naked Triplet - Returning Step");
            return { status: 'found_step', steps: [nakedTripleResult.stepInfo] };
        }

        // SE 3.8 (Requires findSwordfish)
        // ...

        // SE 4.0 (Requires findHiddenTriples)
        const hiddenTripleResult = findHiddenTriples(candidatesMap, board);
        if (hiddenTripleResult.stepInfo && applyEliminations(candidatesMap, hiddenTripleResult.eliminations)) {
            console.log("Applied Hidden Triplet - Returning Step");
            return { status: 'found_step', steps: [hiddenTripleResult.stepInfo] };
        }

         // SE 4.0 (Skyscraper)
         const skyscraperResult = findSkyscraper(candidatesMap);
         if (skyscraperResult.stepInfo && applyEliminations(candidatesMap, skyscraperResult.eliminations)) {
             console.log("Applied Skyscraper - Returning Step");
             return { status: 'found_step', steps: [skyscraperResult.stepInfo] };
         }
 
         // SE 4.0 (2-String Kite)
         const kiteResult = find2StringKite(candidatesMap);
         if (kiteResult.stepInfo && applyEliminations(candidatesMap, kiteResult.eliminations)) {
             console.log("Applied 2-String Kite - Returning Step");
             return { status: 'found_step', steps: [kiteResult.stepInfo] };
         }


        // SE 4.2
        const yWingResult = findYWing(candidatesMap);
        if (yWingResult.stepInfo && applyEliminations(candidatesMap, yWingResult.eliminations)) {
             console.log("Applied Y-Wing - Returning Step");
             return { status: 'found_step', steps: [yWingResult.stepInfo] };
        }

        // SE 4.3 (Requires findHiddenQuads)
        // ...

        // SE 4.4 (Crane)
        // const craneResult = findCrane(candidatesMap);
        // if (craneResult.stepInfo && applyEliminations(candidatesMap, craneResult.eliminations)) {
        //     console.log("Applied Crane - Returning Step");
        //     return { status: 'found_step', steps: [craneResult.stepInfo] };
        // }

        // Add other techniques in order of increasing SE score...

    } catch (error) {
        // ... (error handling remains the same) ...
        console.error("Solver caught contradiction:", error);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
        return { status: 'error', steps: [], message: error.message || 'Contradiction found during solving.' };
    }

    // --- If no step was found ---
    console.log("Solver stuck: No placement or effective elimination found based on current candidates (SE Ordered).");
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


// PUZZLE GENERATION 

// helper for solve; simple backtracking algo
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

/**
 * Generates a Sudoku puzzle based on desired logical difficulty.
 * @param {DifficultyLevel} difficultyLevel - The target difficulty level enum/constant.
 * @returns {Promise<{puzzle: number[][], solution: number[][]}|null>}
 */
export async function generatePuzzle(difficultyLevel = DifficultyLevel.MEDIUM) {
    // Define approximate clue ranges per level (optional, adjust as needed)
    let minClues = 22, maxClues = 50; // Default wide range
    switch (difficultyLevel) {
        case DifficultyLevel.BABY: minClues = 42; maxClues = 50; break;
        case DifficultyLevel.EASY: minClues = 32; maxClues = 38; break;
        case DifficultyLevel.MEDIUM: minClues = 28; maxClues = 31; break;
        case DifficultyLevel.HARD: minClues = 25; maxClues = 29; break;
        case DifficultyLevel.VERY_HARD: minClues = 22; maxClues = 27; break;
        case DifficultyLevel.EXTREME: minClues = 20; maxClues = 26; break;
    }

    const result = await generatePuzzleAdvanced(difficultyLevel, 65, minClues, maxClues); // 100 attempts

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
    maxAttempts = 20,
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
        // check with score
        } else if(ratingResult.score > DIFFICULTY_THRESHOLDS[desiredLevel].score) {
        // } else if (ratingResult.difficulty > desiredLevel) {
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
                }else if(ratingResult.score > DIFFICULTY_THRESHOLDS[desiredLevel].score) {
                // } else if (ratingResult.difficulty > desiredLevel) {
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
                    for (const [pr, pc] of peers) {
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

    if (ratingResult.status === 'solved') {
        // if (ratingResult.status === 'solved' || ratingResult.status === 'stuck') {
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
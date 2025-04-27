import { BOARD_SIZE, BOX_SIZE, DifficultyLevel, getTechniqueScore, getDifficultyLevelFromScore } from './constants.js';
import {
    checkInputValid, getPeers, findNextEmptyCell, deepCopy2DArray, getCommonPeers, cellsSeeEachOther,
    getCombinations, 
    allUnits,
    getCandidateLocations, groupLocationsByUnit, keyToCoords, coordsToKey
} from './utils.js';

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


// --- Candidate Initialization & Manipulation (Core Solver Operations) ---
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


// --- Technique Finding Functions ---
function findFullHouse(board, candidatesMap) {
    // Use imported allUnits
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
                const cellKey = coordsToKey(r, c); // Use util
                if (candidatesMap.has(cellKey) && !candidatesMap.get(cellKey)?.has(missingValue)) {
                     console.warn(`Full House contradiction: Cell R${r+1}C${c+1} should be ${missingValue} for ${unit.type} ${unit.index}, but candidate not present in map.`);
                     continue;
                }
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
            const [r, c] = keyToCoords(key); // Use util
            const value = candidates.values().next().value;
            return {
                technique: 'Naked Single',
                cell: [r, c],
                value: value,
                description: `Cell R${r + 1}C${c + 1} must be ${value} (only candidate left).`,
                highlights: [ { row: r, col: c, candidates: [value], type: 'target' } ]
            };
        }
    }
    return null;
}

function findNakedPairs(candidatesMap) {
    // Use imported allUnits and getCombinations
    for (const unit of allUnits) {
        const potentialPairCells = unit.cells
            .map(([r, c]) => ({ key: coordsToKey(r, c), candidates: candidatesMap.get(coordsToKey(r, c)) })) // Use util
            .filter(cell => cell.candidates && cell.candidates.size === 2);

        if (potentialPairCells.length < 2) continue;

        const combinations = getCombinations(potentialPairCells, 2); // Use util

        for (const combo of combinations) {
            const union = new Set([...combo[0].candidates, ...combo[1].candidates]);

            if (union.size === 2) { // It's a Naked Pair
                const subsetValues = Array.from(union);
                const subsetKeys = new Set(combo.map(cell => cell.key));
                const unitElims = [];

                for (const [r, c] of unit.cells) {
                    const cellKey = coordsToKey(r, c); // Use util
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
                    const subsetCellsCoords = combo.map(c => keyToCoords(c.key)); // Use util
                    const stepInfo = {
                        technique: `Naked Pair (${unit.type} ${unit.index})`,
                        description: `Cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] form a Naked Pair of (${subsetValues.join(', ')}). These digits can be removed from other cells in ${unit.type.toLowerCase()} ${unit.index}.`,
                        eliminations: unitElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                        highlights: [
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: subsetValues, type: 'defining' })),
                            ...unitElims.map(elim => {
                                const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                            })
                        ]
                    };
                    // console.log(`  >> Found Potential Naked Pair (${subsetValues.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findNakedTriples(candidatesMap) {
    const N = 3;
    // Use imported allUnits and getCombinations
    for (const unit of allUnits) {
        const potentialTripleCells = unit.cells
            .map(([r, c]) => ({ key: coordsToKey(r, c), candidates: candidatesMap.get(coordsToKey(r, c)) })) // Use util
            .filter(cell => cell.candidates && cell.candidates.size > 0 && cell.candidates.size <= N);

        if (potentialTripleCells.length < N) continue;

        const combinations = getCombinations(potentialTripleCells, N); // Use util

        for (const combo of combinations) {
            const union = new Set();
            combo.forEach(cell => cell.candidates.forEach(cand => union.add(cand)));

            if (union.size === N) {
                const subsetValues = Array.from(union);
                const subsetKeys = new Set(combo.map(cell => cell.key));
                const unitElims = [];

                for (const [r, c] of unit.cells) {
                    const cellKey = coordsToKey(r, c); // Use util
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
                    const subsetCellsCoords = combo.map(c => keyToCoords(c.key)); // Use util
                    const stepInfo = {
                        technique: `Naked Triplet`,
                        description: `Cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] form a Naked Triplet of (${subsetValues.join(', ')}). These digits removed from other cells in ${unit.type.toLowerCase()} ${unit.index}.`,
                        eliminations: unitElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                        highlights: [
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: subsetValues, type: 'defining' })),
                            ...unitElims.map(elim => {
                                const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                            })
                        ]
                    };
                    // console.log(`  >> Found Potential Naked Triplet (${subsetValues.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findHiddenSinglesMap(candidatesMap, board) {
    // Use imported allUnits
    for (const unit of allUnits) {
        for (let n = 1; n <= BOARD_SIZE; n++) {
            let foundCount = 0;
            let foundCellCoords = null;
            let foundCellKey = null;

            for (const [r, c] of unit.cells) {
                if (board[r][c] !== 0) continue;
                const cellKey = coordsToKey(r, c); // Use util
                const candidates = candidatesMap.get(cellKey);
                if (!candidates || !candidates.has(n)) continue;

                foundCount++;
                foundCellCoords = [r, c];
                foundCellKey = cellKey;
                if (foundCount > 1) break;
            }

            if (foundCount === 1) {
                const [r, c] = foundCellCoords;
                if (candidatesMap.get(foundCellKey)?.size > 1) {
                    let techniqueName = 'Hidden Single';
                    if (unit.type === 'Box') techniqueName = 'Hidden Single (Box)';
                    else if (unit.type === 'Row') techniqueName = 'Hidden Single (Row)';
                    else if (unit.type === 'Column') techniqueName = 'Hidden Single (Col)';

                    return {
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
    return null;
}

function findHiddenPairs(candidatesMap, board) {
    // Use imported allUnits and getCombinations
    for (const unit of allUnits) {
        const unitCellKeys = unit.cells
            .filter(([r, c]) => board[r][c] === 0)
            .map(([r, c]) => coordsToKey(r,c)) // Use util
            .filter(key => candidatesMap.has(key));

        if (unitCellKeys.length < 2) continue;

        const digitLocations = new Map();
        for (let n = 1; n <= BOARD_SIZE; n++) digitLocations.set(n, new Set());
        unitCellKeys.forEach(key => {
            candidatesMap.get(key)?.forEach(n => {
                digitLocations.get(n).add(key);
            });
        });

        const possiblePairDigits = Array.from(digitLocations.keys()).filter(n => digitLocations.get(n).size === 2);
        if (possiblePairDigits.length < 2) continue;

        const digitCombinations = getCombinations(possiblePairDigits, 2); // Use util

        for (const digitCombo of digitCombinations) {
            const cellsForDigit1 = digitLocations.get(digitCombo[0]);
            const cellsForDigit2 = digitLocations.get(digitCombo[1]);

            if (cellsForDigit1.size === 2 && cellsForDigit2.size === 2) {
                const cellUnion = new Set([...cellsForDigit1, ...cellsForDigit2]);
                if (cellUnion.size === 2) {
                    const subsetCellKeys = Array.from(cellUnion);
                    const unitElims = [];

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
                        const subsetCellsCoords = subsetCellKeys.map(k => keyToCoords(k)); // Use util
                        const stepInfo = {
                            technique: `Hidden Pair (${unit.type} ${unit.index})`,
                            description: `Digits (${digitCombo.join(', ')}) only appear in cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] within ${unit.type.toLowerCase()} ${unit.index}. Other candidates removed from these two cells.`,
                            eliminations: unitElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: digitCombo, type: 'defining' })),
                            ]
                        };
                        // console.log(`  >> Found Potential Hidden Pair (${digitCombo.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                        return { eliminations: unitElims, stepInfo: stepInfo };
                    }
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findHiddenTriples(candidatesMap, board) {
    const N = 3;
     // Use imported allUnits and getCombinations
    for (const unit of allUnits) {
        const unitCellKeys = unit.cells
            .filter(([r, c]) => board[r][c] === 0)
            .map(([r, c]) => coordsToKey(r, c)) // Use util
            .filter(key => candidatesMap.has(key));

        if (unitCellKeys.length < N) continue;

        const digitLocations = new Map();
        for (let n = 1; n <= BOARD_SIZE; n++) digitLocations.set(n, new Set());
        unitCellKeys.forEach(key => {
            candidatesMap.get(key)?.forEach(n => {
                digitLocations.get(n).add(key);
            });
        });

        const possibleTripleDigits = Array.from(digitLocations.keys())
            .filter(n => digitLocations.get(n).size >= 2 && digitLocations.get(n).size <= N);
        if (possibleTripleDigits.length < N) continue;

        const digitCombinations = getCombinations(possibleTripleDigits, N); // Use util

        for (const digitCombo of digitCombinations) {
            const cellsUnion = new Set();
            digitCombo.forEach(digit => {
                digitLocations.get(digit).forEach(cellKey => cellsUnion.add(cellKey));
            });

            if (cellsUnion.size === N) {
                let allDigitsPresentInUnion = true;
                for(const digit of digitCombo) {
                    const locationsForDigit = digitLocations.get(digit);
                    if (![...locationsForDigit].some(loc => cellsUnion.has(loc)) ||
                        [...locationsForDigit].some(loc => !cellsUnion.has(loc))) {
                         allDigitsPresentInUnion = false;
                         break;
                    }
                }
                if (!allDigitsPresentInUnion) continue;

                const subsetCellKeys = Array.from(cellsUnion);
                const unitElims = [];
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
                    const subsetCellsCoords = subsetCellKeys.map(k => keyToCoords(k)); // Use util
                    const stepInfo = {
                        technique: `Hidden Triplet`,
                        description: `Digits (${digitCombo.join(', ')}) only appear in cells [${subsetCellsCoords.map(([r, c]) => `R${r + 1}C${c + 1}`).join(', ')}] within ${unit.type.toLowerCase()} ${unit.index}. Other candidates removed from these ${N} cells.`,
                        eliminations: unitElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                        highlights: [
                            ...subsetCellsCoords.map(([r, c]) => ({ row: r, col: c, candidates: digitCombo, type: 'defining' })),
                        ]
                    };
                    // console.log(`  >> Found Potential Hidden Triplet (${digitCombo.join(',')} in ${unit.type} ${unit.index}). Eliminations:`, unitElims);
                    return { eliminations: unitElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findLockedCandidates(candidatesMap) {
     // Use imported allUnits, keyToCoords, coordsToKey
    for (let br = 0; br < BOX_SIZE; br++) {
        for (let bc = 0; bc < BOX_SIZE; bc++) {
            const boxCellKeys = new Set();
            const boxCells = [];
            const startRow = br * BOX_SIZE; const startCol = bc * BOX_SIZE;
            const boxIndex = br * BOX_SIZE + bc + 1;
            for (let r = 0; r < BOX_SIZE; r++) {
                for (let c = 0; c < BOX_SIZE; c++) {
                    const row = startRow + r; const col = startCol + c;
                    boxCells.push([row, col]);
                    boxCellKeys.add(coordsToKey(row, col)); // Use util
                }
            }

            for (let n = 1; n <= BOARD_SIZE; n++) {
                const cellsWithN = boxCells.filter(([r, c]) => candidatesMap.get(coordsToKey(r, c))?.has(n)); // Use util
                if (cellsWithN.length < 2) continue;
                const rows = new Set(cellsWithN.map(([r, c]) => r));
                const cols = new Set(cellsWithN.map(([r, c]) => c));

                // Pointing Row
                if (rows.size === 1) {
                    const row = rows.values().next().value;
                    const pointingElims = [];
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        const targetCellKey = coordsToKey(row, c); // Use util
                        if (!boxCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                            pointingElims.push({ cellKey: targetCellKey, values: [n] });
                        }
                    }
                    if (pointingElims.length > 0) {
                        const stepInfo = {
                            technique: 'Locked Candidates (Pointing Row)',
                            description: `Digit ${n} in Box ${boxIndex} is confined to Row ${row + 1}. Removed from other cells in Row ${row + 1}.`,
                            eliminations: pointingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...pointingElims.map(elim => {
                                    const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                    return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                                })
                            ]
                        };
                        // console.log(`  >> Found Potential Pointing Row (${n} in Box ${boxIndex} -> Row ${row + 1}). Eliminations:`, pointingElims.map(e => e.cellKey));
                        return { eliminations: pointingElims, stepInfo: stepInfo };
                    }
                }

                // Pointing Column (similar logic using coordsToKey/keyToCoords)
                if (cols.size === 1) {
                     const col = cols.values().next().value;
                     const pointingElims = [];
                     for (let r = 0; r < BOARD_SIZE; r++) {
                         const targetCellKey = coordsToKey(r, col); // Use util
                         if (!boxCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                             pointingElims.push({ cellKey: targetCellKey, values: [n] });
                         }
                     }
                     if (pointingElims.length > 0) {
                         const stepInfo = {
                             technique: 'Locked Candidates (Pointing Col)',
                             description: `Digit ${n} in Box ${boxIndex} is confined to Col ${col + 1}. Removed from other cells in Col ${col + 1}.`,
                             eliminations: pointingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                             highlights: [
                                 ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                 ...pointingElims.map(elim => {
                                     const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                     return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                                 })
                             ]
                         };
                        //  console.log(`  >> Found Potential Pointing Col (${n} in Box ${boxIndex} -> Col ${col + 1}). Eliminations:`, pointingElims.map(e => e.cellKey));
                         return { eliminations: pointingElims, stepInfo: stepInfo };
                     }
                }
            }
        }
    }

    // Part 2: Claiming
    for (const unit of allUnits) {
        if (unit.type === 'Box') continue;

        for (let n = 1; n <= BOARD_SIZE; n++) {
            const cellsWithN = unit.cells.filter(([r, c]) => candidatesMap.get(coordsToKey(r, c))?.has(n)); // Use util
            if (cellsWithN.length < 2) continue;
            const boxes = new Set(cellsWithN.map(([r, c]) => Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE)));

            if (boxes.size === 1) {
                const boxLinearIndex = boxes.values().next().value;
                const boxStartRow = Math.floor(boxLinearIndex / BOX_SIZE) * BOX_SIZE;
                const boxStartCol = (boxLinearIndex % BOX_SIZE) * BOX_SIZE;
                const boxIndexUI = boxLinearIndex + 1;
                const claimingElims = [];
                const unitCellKeys = new Set(unit.cells.map(([r, c]) => coordsToKey(r, c))); // Use util

                for (let r_offset = 0; r_offset < BOX_SIZE; r_offset++) {
                    for (let c_offset = 0; c_offset < BOX_SIZE; c_offset++) {
                        const box_r = boxStartRow + r_offset; const box_c = boxStartCol + c_offset;
                        const targetCellKey = coordsToKey(box_r, box_c); // Use util
                        if (!unitCellKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                            claimingElims.push({ cellKey: targetCellKey, values: [n] });
                        }
                    }
                }

                if (claimingElims.length > 0) {
                    const u_type = unit.type === 'Row' ? 'Row' : 'Col';
                    const stepInfo = {
                        technique: `Locked Candidates (Claiming ${u_type})`,
                        description: `Digit ${n} in ${u_type} ${unit.index} is confined to Box ${boxIndexUI}. Removed from other cells in Box ${boxIndexUI}.`,
                        eliminations: claimingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                        highlights: [
                            ...cellsWithN.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                            ...claimingElims.map(elim => {
                                const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                            })
                        ]
                    };
                    // console.log(`  >> Found Potential Claiming (${n} in ${u_type} ${unit.index} -> Box ${boxIndexUI}). Eliminations:`, claimingElims.map(e => e.cellKey));
                    return { eliminations: claimingElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findXWing(candidatesMap) {
     // Use imported getCombinations, coordsToKey, keyToCoords
    for (let n = 1; n <= BOARD_SIZE; n++) {
        // Row-based X-Wing
        const candidateRows = new Map();
        for (let r = 0; r < BOARD_SIZE; r++) {
            const colsWithN = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (candidatesMap.get(coordsToKey(r, c))?.has(n)) { // Use util
                    colsWithN.push(c);
                }
            }
            if (colsWithN.length === 2) candidateRows.set(r, colsWithN);
        }
        if (candidateRows.size >= 2) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 2); // Use util
            for (const [r1, r2] of rowCombinations) {
                const cols1 = candidateRows.get(r1); const cols2 = candidateRows.get(r2);
                if (cols1[0] === cols2[0] && cols1[1] === cols2[1]) {
                    const [c1, c2] = cols1;
                    const xWingElims = [];
                    const definingCellsCoords = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
                    const definingCellsKeys = new Set(definingCellsCoords.map(([r, c]) => coordsToKey(r, c))); // Use util
                    for (const targetCol of [c1, c2]) {
                        for (let targetRow = 0; targetRow < BOARD_SIZE; targetRow++) {
                            const targetCellKey = coordsToKey(targetRow, targetCol); // Use util
                            if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                xWingElims.push({ cellKey: targetCellKey, values: [n] });
                            }
                        }
                    }
                    if (xWingElims.length > 0) {
                        const stepInfo = {
                            technique: `X-Wing (Rows, Digit ${n})`,
                            description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms an X-Wing in Columns ${c1 + 1} and ${c2 + 1}. Digit ${n} can be removed from other cells in these columns.`,
                            eliminations: xWingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...xWingElims.map(elim => {
                                    const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                    return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                })
                            ]
                        };
                        // console.log(`  >> Found Potential Row X-Wing (${n} in R${r1 + 1},R${r2 + 1} / C${c1 + 1},C${c2 + 1}). Eliminations:`, xWingElims);
                        return { eliminations: xWingElims, stepInfo: stepInfo };
                    }
                }
            }
        }

        // Column-based X-Wing (similar logic using coordsToKey/keyToCoords)
        const candidateCols = new Map();
        for (let c = 0; c < BOARD_SIZE; c++) {
             const rowsWithN = [];
             for (let r = 0; r < BOARD_SIZE; r++) {
                 if (candidatesMap.get(coordsToKey(r, c))?.has(n)) { // Use util
                     rowsWithN.push(r);
                 }
             }
             if (rowsWithN.length === 2) candidateCols.set(c, rowsWithN);
        }
        if (candidateCols.size >= 2) {
             const colIndices = Array.from(candidateCols.keys());
             const colCombinations = getCombinations(colIndices, 2); // Use util
             for (const [c1, c2] of colCombinations) {
                 const rows1 = candidateCols.get(c1); const rows2 = candidateCols.get(c2);
                 if (rows1[0] === rows2[0] && rows1[1] === rows2[1]) {
                     const [r1, r2] = rows1;
                     const xWingElims = [];
                     const definingCellsCoords = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
                     const definingCellsKeys = new Set(definingCellsCoords.map(([r, c]) => coordsToKey(r, c))); // Use util
                     for (const targetRow of [r1, r2]) {
                         for (let targetCol = 0; targetCol < BOARD_SIZE; targetCol++) {
                             const targetCellKey = coordsToKey(targetRow, targetCol); // Use util
                             if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                 xWingElims.push({ cellKey: targetCellKey, values: [n] });
                             }
                         }
                     }
                     if (xWingElims.length > 0) {
                         const stepInfo = {
                             technique: `X-Wing (Cols, Digit ${n})`,
                             description: `Digit ${n} in Columns ${c1 + 1} and ${c2 + 1} forms an X-Wing in Rows ${r1 + 1} and ${r2 + 1}. Digit ${n} can be removed from other cells in these rows.`,
                             eliminations: xWingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                             highlights: [
                                 ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                 ...xWingElims.map(elim => {
                                     const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                     return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                 })
                             ]
                         };
                        //  console.log(`  >> Found Potential Col X-Wing (${n} in C${c1 + 1},C${c2 + 1} / R${r1 + 1},R${r2 + 1}). Eliminations:`, xWingElims);
                         return { eliminations: xWingElims, stepInfo: stepInfo };
                     }
                 }
             }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function WWingFindInvalidUnitHelper(candidatesMap, cell1Key, cell2Key, candidate) {
    // Use imported allUnits, keyToCoords, cellsSeeEachOther, coordsToKey
    const [r1, c1] = keyToCoords(cell1Key); // Use util
    const [r2, c2] = keyToCoords(cell2Key); // Use util

    for (const unit of allUnits) { // unit is { type, index, cells }
        const possibleLocationsForCandidate = new Set();
        for (const [r_unit, c_unit] of unit.cells) {
            const key = coordsToKey(r_unit, c_unit); // Use util
            if (candidatesMap.get(key)?.has(candidate)) {
                possibleLocationsForCandidate.add(key);
            }
        }
        if (possibleLocationsForCandidate.size === 0) continue;

        const keysToRemove = new Set();
        let eliminationHappenedInUnit = false;
        for (const unitCellKey of possibleLocationsForCandidate) {
            const [r_unit, c_unit] = keyToCoords(unitCellKey); // Use util
            let seesWing1 = unitCellKey !== cell1Key && cellsSeeEachOther(r_unit, c_unit, r1, c1); // Use util
            let seesWing2 = unitCellKey !== cell2Key && cellsSeeEachOther(r_unit, c_unit, r2, c2); // Use util
            if (seesWing1 || seesWing2) {
                keysToRemove.add(unitCellKey);
            }
        }

        if (keysToRemove.size > 0) {
            eliminationHappenedInUnit = true;
            keysToRemove.forEach(key => possibleLocationsForCandidate.delete(key));
        }

        if (eliminationHappenedInUnit && possibleLocationsForCandidate.size === 0) {
            return unit;
        }
    }
    return null;
}

function findWWing(candidatesMap) {
    // Use imported getCombinations, keyToCoords, cellsSeeEachOther, getCommonPeers, coordsToKey
    const bivalueCells = [];
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.size === 2) {
            const [r, c] = keyToCoords(key); // Use util
            bivalueCells.push({ key, r, c, candidatesList: Array.from(candidates) });
        }
    }
    if (bivalueCells.length < 2) return { eliminations: [], stepInfo: null };

    const combinations = getCombinations(bivalueCells, 2); // Use util

    for (const [cell1, cell2] of combinations) {
        const [candA, candB] = cell1.candidatesList;
        const c2Candidates = cell2.candidatesList;
        if (!((candA === c2Candidates[0] && candB === c2Candidates[1]) || (candA === c2Candidates[1] && candB === c2Candidates[0])) ||
            cellsSeeEachOther(cell1.r, cell1.c, cell2.r, cell2.c)) { // Use util
            continue;
        }

        const commonPeersKeys = getCommonPeers(cell1.r, cell1.c, cell2.r, cell2.c); // Use util
        if (commonPeersKeys.size === 0) continue;

        const wingElims = [];
        let identifiedLinkValue = null;
        let identifiedElimValue = null;
        let linkUnit = null;

        linkUnit = WWingFindInvalidUnitHelper(candidatesMap, cell1.key, cell2.key, candB);
        if (linkUnit) {
            for (const peerKey of commonPeersKeys) {
                if (candidatesMap.get(peerKey)?.has(candA)) {
                    wingElims.push({ cellKey: peerKey, values: [candA] });
                    identifiedLinkValue = candB; identifiedElimValue = candA;
                }
            }
            if (wingElims.length === 0) linkUnit = null;
        }

        if (wingElims.length === 0) {
            linkUnit = WWingFindInvalidUnitHelper(candidatesMap, cell1.key, cell2.key, candA);
            if (linkUnit) {
                for (const peerKey of commonPeersKeys) {
                    if (candidatesMap.get(peerKey)?.has(candB)) {
                        wingElims.push({ cellKey: peerKey, values: [candB] });
                        identifiedLinkValue = candA; identifiedElimValue = candB;
                    }
                }
                if (wingElims.length === 0) linkUnit = null;
            }
        }

        if (wingElims.length > 0 && linkUnit) {
            const firstElim = wingElims[0];
            const eliminatedPeerCoords = keyToCoords(firstElim.cellKey); // Use util
            const stepInfo = {
                technique: `W-Wing`,
                description: `Cells R${cell1.r + 1}C${cell1.c + 1} and R${cell2.r + 1}C${cell2.c + 1} (both ${candA}/${candB}) form a W-Wing. Strong link on ${identifiedLinkValue} (verified in ${linkUnit.type} ${linkUnit.index}). Remove ${identifiedElimValue} from common peer(s) like R${eliminatedPeerCoords[0] + 1}C${eliminatedPeerCoords[1] + 1}.`,
                eliminations: wingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                highlights: [
                    { row: cell1.r, col: cell1.c, candidates: [candA, candB], type: 'defining' },
                    { row: cell2.r, col: cell2.c, candidates: [candA, candB], type: 'defining' },
                    ...wingElims.map(elim => {
                        const [er, ec] = keyToCoords(elim.cellKey); // Use util
                        return { row: er, col: ec, candidates: elim.values, type: 'eliminated' };
                    }),
                    ...(linkUnit.cells.map(([ur, uc]) => ({ row: ur, col: uc, candidates: [], type: 'unit' })))
                ]
            };
            // console.log(`  >> Found W-Wing between ${cell1.key} and ${cell2.key} (Link ${identifiedLinkValue} in ${linkUnit.type} ${linkUnit.index}, Elim ${identifiedElimValue}). Eliminations:`, wingElims.map(e => e.cellKey));
            return { eliminations: wingElims, stepInfo: stepInfo };
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findYWing(candidatesMap) {
    // Use imported getCombinations, keyToCoords, cellsSeeEachOther, getCommonPeers
    const bivalueCells = [];
    for (const [key, candidates] of candidatesMap.entries()) {
        if (candidates.size === 2) {
            const [r, c] = keyToCoords(key); // Use util
            bivalueCells.push({ key, r, c, candidatesList: Array.from(candidates) });
        }
    }
    if (bivalueCells.length < 3) return { eliminations: [], stepInfo: null };

    for (const pivot of bivalueCells) {
        const [candA, candB] = pivot.candidatesList;
        const potentialWings = bivalueCells.filter(wing =>
            wing.key !== pivot.key && cellsSeeEachOther(wing.r, wing.c, pivot.r, pivot.c) // Use util
        );
        if (potentialWings.length < 2) continue;

        const wingCombinations = getCombinations(potentialWings, 2); // Use util

        for (const [wing1, wing2] of wingCombinations) {
            const wing1Cands = wing1.candidatesList; const wing2Cands = wing2.candidatesList;
            let candC = -1; let foundPattern = false;

            // Case 1
            if (wing1Cands.includes(candA) && !wing1Cands.includes(candB) && wing2Cands.includes(candB) && !wing2Cands.includes(candA)) {
                const commonCandW1 = wing1Cands.find(c => c !== candA); const commonCandW2 = wing2Cands.find(c => c !== candB);
                if (commonCandW1 === commonCandW2 && commonCandW1 !== candA && commonCandW1 !== candB) { candC = commonCandW1; foundPattern = true; }
            }
            // Case 2
            else if (wing1Cands.includes(candB) && !wing1Cands.includes(candA) && wing2Cands.includes(candA) && !wing2Cands.includes(candB)) {
                 const commonCandW1 = wing1Cands.find(c => c !== candB); const commonCandW2 = wing2Cands.find(c => c !== candA);
                 if (commonCandW1 === commonCandW2 && commonCandW1 !== candA && commonCandW1 !== candB) { candC = commonCandW1; foundPattern = true; }
            }

            if (foundPattern && candC !== -1) {
                const commonPeersKeys = getCommonPeers(wing1.r, wing1.c, wing2.r, wing2.c); // Use util
                const yWingElims = [];
                for (const peerKey of commonPeersKeys) {
                    if (peerKey === pivot.key) continue;
                    if (candidatesMap.get(peerKey)?.has(candC)) {
                        yWingElims.push({ cellKey: peerKey, values: [candC] });
                    }
                }

                if (yWingElims.length > 0) {
                    const actualCandA_prime = wing1Cands.find(c => c === candA || c === candB);
                    const actualCandB_prime = wing2Cands.find(c => c === candA || c === candB);
                    const stepInfo = {
                        technique: `Y-Wing`,
                        description: `Pivot R${pivot.r + 1}C${pivot.c + 1} (${actualCandA_prime}, ${actualCandB_prime}), Wing1 R${wing1.r + 1}C${wing1.c + 1} (${actualCandA_prime}, ${candC}), Wing2 R${wing2.r + 1}C${wing2.c + 1} (${actualCandB_prime}, ${candC}) form a Y-Wing. Candidate ${candC} can be removed from cells seeing both wings.`,
                        eliminations: yWingElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                        highlights: [
                            { row: pivot.r, col: pivot.c, candidates: [candA, candB], type: 'defining' },
                            { row: wing1.r, col: wing1.c, candidates: wing1Cands, type: 'defining' },
                            { row: wing2.r, col: wing2.c, candidates: wing2Cands, type: 'defining' },
                            ...yWingElims.map(elim => {
                                const [er, ec] = keyToCoords(elim.cellKey); // Use util
                                return { row: er, col: ec, candidates: [candC], type: 'eliminated' };
                            })
                        ]
                    };
                    // console.log(`  >> Found Potential Y-Wing (Pivot ${pivot.key}, Wings ${wing1.key}, ${wing2.key}, Elim ${candC}). Eliminations:`, yWingElims.map(e => e.cellKey));
                    return { eliminations: yWingElims, stepInfo: stepInfo };
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function findSkyscraper(candidatesMap) {
    // Use imported utils: getCandidateLocations, groupLocationsByUnit, getCombinations, keyToCoords, coordsToKey, getCommonPeers
    for (let n = 1; n <= BOARD_SIZE; n++) {
        const locations = getCandidateLocations(candidatesMap, n); // Use util
        if (locations.size < 4) continue;
        const { rows, cols } = groupLocationsByUnit(locations); // Use util

        // Row-based Skyscraper
        const candidateRows = new Map();
        for (const [r, rowLocations] of rows.entries()) {
            if (rowLocations.size === 2) candidateRows.set(r, Array.from(rowLocations));
        }
        if (candidateRows.size >= 2) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 2); // Use util
            for (const [r1, r2] of rowCombinations) {
                const [key1a, key1b] = candidateRows.get(r1);
                const [key2a, key2b] = candidateRows.get(r2);
                const [, c1a] = keyToCoords(key1a); const [, c1b] = keyToCoords(key1b); // Use util
                const [, c2a] = keyToCoords(key2a); const [, c2b] = keyToCoords(key2b); // Use util
                let baseCol = -1; let roofKey1 = null; let roofKey2 = null;
                if (c1a === c2a && c1b !== c2b) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (c1a === c2b && c1b !== c2a) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (c1b === c2a && c1a !== c2b) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (c1b === c2b && c1a !== c2a) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseCol !== -1) {
                    const [roof_r1, roof_c1] = keyToCoords(roofKey1); // Use util
                    const [roof_r2, roof_c2] = keyToCoords(roofKey2); // Use util
                    const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2); // Use util
                    const skyscraperElims = [];
                    for (const peerKey of commonPeersKeys) {
                        if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                            if (candidatesMap.get(peerKey)?.has(n)) {
                                skyscraperElims.push({ cellKey: peerKey, values: [n] });
                            }
                        }
                    }
                    if (skyscraperElims.length > 0) {
                        const baseKey1 = coordsToKey(r1, baseCol); const baseKey2 = coordsToKey(r2, baseCol); // Use util
                        const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)]; // Use util
                        const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)]; // Use util
                        const stepInfo = {
                            technique: `Skyscraper (Rows, Digit ${n})`,
                            description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms a Skyscraper with base in Col ${baseCol + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
                            eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' })) // Use util
                            ]
                        };
                        // console.log(`  >> Found Row Skyscraper (Digit ${n}, Base Col ${baseCol + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
                        return { eliminations: skyscraperElims, stepInfo: stepInfo };
                    }
                }
            }
        }

        // Column-based Skyscraper (similar logic using utils)
        const candidateCols = new Map();
        for (const [c, colLocations] of cols.entries()) {
            if (colLocations.size === 2) candidateCols.set(c, Array.from(colLocations));
        }
        if (candidateCols.size >= 2) {
            const colIndices = Array.from(candidateCols.keys());
            const colCombinations = getCombinations(colIndices, 2); // Use util
            for (const [c1, c2] of colCombinations) {
                const [key1a, key1b] = candidateCols.get(c1);
                const [key2a, key2b] = candidateCols.get(c2);
                const [r1a,] = keyToCoords(key1a); const [r1b,] = keyToCoords(key1b); // Use util
                const [r2a,] = keyToCoords(key2a); const [r2b,] = keyToCoords(key2b); // Use util
                let baseRow = -1; let roofKey1 = null; let roofKey2 = null;
                if (r1a === r2a && r1b !== r2b) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (r1a === r2b && r1b !== r2a) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (r1b === r2a && r1a !== r2b) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (r1b === r2b && r1a !== r2a) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseRow !== -1) {
                    const [roof_r1, roof_c1] = keyToCoords(roofKey1); // Use util
                    const [roof_r2, roof_c2] = keyToCoords(roofKey2); // Use util
                    const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2); // Use util
                    const skyscraperElims = [];
                    for (const peerKey of commonPeersKeys) {
                        if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                            if (candidatesMap.get(peerKey)?.has(n)) {
                                skyscraperElims.push({ cellKey: peerKey, values: [n] });
                            }
                        }
                    }
                    if (skyscraperElims.length > 0) {
                        const baseKey1 = coordsToKey(baseRow, c1); const baseKey2 = coordsToKey(baseRow, c2); // Use util
                        const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)]; // Use util
                        const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)]; // Use util
                        const stepInfo = {
                            technique: `Skyscraper (Cols, Digit ${n})`,
                            description: `Digit ${n} in Cols ${c1 + 1} and ${c2 + 1} forms a Skyscraper with base in Row ${baseRow + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
                            eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' })) // Use util
                            ]
                        };
                        // console.log(`  >> Found Col Skyscraper (Digit ${n}, Base Row ${baseRow + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
                        return { eliminations: skyscraperElims, stepInfo: stepInfo };
                    }
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

function find2StringKite(candidatesMap) {
    // Use imported utils: getCandidateLocations, groupLocationsByUnit, keyToCoords, getCommonPeers
    for (let n = 1; n <= BOARD_SIZE; n++) {
        const locations = getCandidateLocations(candidatesMap, n); // Use util
        if (locations.size < 4) continue;
        const { rows, cols } = groupLocationsByUnit(locations); // Use util

        const candidateRows = [];
        for (const [r, rowLocations] of rows.entries()) {
            if (rowLocations.size === 2) candidateRows.push({ r, keys: Array.from(rowLocations) });
        }
        const candidateCols = [];
        for (const [c, colLocations] of cols.entries()) {
            if (colLocations.size === 2) candidateCols.push({ c, keys: Array.from(colLocations) });
        }
        if (candidateRows.length === 0 || candidateCols.length === 0) continue;

        for (const rowInfo of candidateRows) {
            const r = rowInfo.r; const [keyR1, keyR2] = rowInfo.keys;
            const [r1, c1] = keyToCoords(keyR1); const [r2, c2] = keyToCoords(keyR2); // Use util
            const boxR1 = Math.floor(r1 / BOX_SIZE) * BOX_SIZE + Math.floor(c1 / BOX_SIZE);
            const boxR2 = Math.floor(r2 / BOX_SIZE) * BOX_SIZE + Math.floor(c2 / BOX_SIZE);

            for (const colInfo of candidateCols) {
                const c = colInfo.c;
                if ((c === c1 && r === r2) || (c === c2 && r === r1)) continue; // Avoid overlap
                const [keyC1, keyC2] = colInfo.keys;
                const [rA, cA] = keyToCoords(keyC1); const [rB, cB] = keyToCoords(keyC2); // Use util
                const boxC1 = Math.floor(rA / BOX_SIZE) * BOX_SIZE + Math.floor(cA / BOX_SIZE);
                const boxC2 = Math.floor(rB / BOX_SIZE) * BOX_SIZE + Math.floor(cB / BOX_SIZE);
                let linkKeyRow = null; let linkKeyCol = null; let endKeyRow = null; let endKeyCol = null;

                if (keyR1 !== keyC1 && boxR1 === boxC1) { linkKeyRow = keyR1; linkKeyCol = keyC1; endKeyRow = keyR2; endKeyCol = keyC2; }
                else if (keyR1 !== keyC2 && boxR1 === boxC2) { linkKeyRow = keyR1; linkKeyCol = keyC2; endKeyRow = keyR2; endKeyCol = keyC1; }
                else if (keyR2 !== keyC1 && boxR2 === boxC1) { linkKeyRow = keyR2; linkKeyCol = keyC1; endKeyRow = keyR1; endKeyCol = keyC2; }
                else if (keyR2 !== keyC2 && boxR2 === boxC2) { linkKeyRow = keyR2; linkKeyCol = keyC2; endKeyRow = keyR1; endKeyCol = keyC1; }

                if (linkKeyRow) {
                    const [endR_r, endR_c] = keyToCoords(endKeyRow); // Use util
                    const [endC_r, endC_c] = keyToCoords(endKeyCol); // Use util
                    const definingKeys = new Set([keyR1, keyR2, keyC1, keyC2]);
                    const commonPeersKeys = getCommonPeers(endR_r, endR_c, endC_r, endC_c); // Use util
                    const kiteElims = [];
                    for (const peerKey of commonPeersKeys) {
                        if (!definingKeys.has(peerKey) && candidatesMap.get(peerKey)?.has(n)) {
                            kiteElims.push({ cellKey: peerKey, values: [n] });
                        }
                    }
                    if (kiteElims.length > 0) {
                        const [lr_r, lr_c] = keyToCoords(linkKeyRow); const [lc_r, lc_c] = keyToCoords(linkKeyCol); // Use util
                        const definingCoords = [keyToCoords(keyR1), keyToCoords(keyR2), keyToCoords(keyC1), keyToCoords(keyC2)]; // Use util
                        const stepInfo = {
                            technique: `2-String Kite (Digit ${n})`,
                            description: `Digit ${n} forms a 2-String Kite. Row ${r + 1} (C${c1 + 1},C${c2 + 1}), Col ${c + 1} (R${rA + 1},R${rB + 1}). Link R${lr_r + 1}C${lr_c + 1}/R${lc_r + 1}C${lc_c + 1}. Remove ${n} from cells seeing ends R${endR_r + 1}C${endR_c + 1} and R${endC_r + 1}C${endC_c + 1}.`,
                            eliminations: kiteElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
                            highlights: [
                                ...definingCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...kiteElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' })) // Use util
                            ]
                        };
                        // console.log(`  >> Found 2-String Kite (Digit ${n}, Row ${r + 1}, Col ${c + 1}, Ends ${endKeyRow}/${endKeyCol}). Eliminations:`, kiteElims.map(e => e.cellKey));
                        return { eliminations: kiteElims, stepInfo: stepInfo };
                    }
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}


// --- Solver Orchestration ---
function findNextLogicalStep(board, currentCandidatesMap) {

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
             // Test if the step *would* cause eliminations on a fresh copy of the map
             let tempMap = new Map(JSON.parse(JSON.stringify(Array.from(candidatesMap)))); 
             tempMap.forEach((val, key) => tempMap.set(key, new Set(val)));
             if (applyEliminations(tempMap, lockedResult.eliminations)) { 
                 let checkMap = new Map(); 
                 for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
                 if (applyEliminations(checkMap, lockedResult.eliminations)) {
                    // The step IS effective. Return it.
                    console.log(`Found ${lockedResult.stepInfo.technique}`);
                    return { status: 'found_step', steps: [lockedResult.stepInfo] };
                 }
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

        const wWingResult = findWWing(candidatesMap);
         if (wWingResult.stepInfo) {
             let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
             if (applyEliminations(checkMap, wWingResult.eliminations)) {
                 console.log(`Found ${wWingResult.stepInfo.technique}`);
                 return { status: 'found_step', steps: [wWingResult.stepInfo] };
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

        const hiddenPairResult = findHiddenPairs(candidatesMap, board);
        if (hiddenPairResult.stepInfo) {
            let checkMap = new Map(); for (const [key, valueSet] of currentCandidatesMap.entries()) { checkMap.set(key, new Set(valueSet)); }
            if (applyEliminations(checkMap, hiddenPairResult.eliminations)) {
                console.log(`Found ${hiddenPairResult.stepInfo.technique}`);
                return { status: 'found_step', steps: [hiddenPairResult.stepInfo] };
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


// --- Public Solver API ---

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


// --- Puzzle Rating Logic (Used by Generator) ---

/**
 * Simulates solving a puzzle step-by-step using only the implemented logical techniques.
 * Does NOT use backtracking. Records techniques used and maximum difficulty score.
 * Internal function called by ratePuzzleDifficulty.
 *
 * @param {number[][]} board - The puzzle board state.
 * @param {Function} getTechniqueScoreFn - Function to get score from technique name.
 * @returns {{ status: SolverStatus, maxScore: number, techniquesUsed: Set<string>, stepsTaken: number } | { status: 'error', message: string }}
 */
function ratePuzzleDifficultyInternal(board, getTechniqueScoreFn) {
    // Uses imported utils, initializeCandidatesMap, findNextLogicalStep, applyEliminations
    let currentBoard = deepCopy2DArray(board); // Use util
    let candidatesMap = initializeCandidatesMap(currentBoard); // Use exported function
    const techniquesUsed = new Set();
    let maxScore = 0;
    let stepsTaken = 0;
    const MAX_SOLVER_STEPS = 200; // Safety break

    if (!candidatesMap) {
        return { status: 'error', message: 'Initial board state has contradiction.' };
    }

    while (stepsTaken < MAX_SOLVER_STEPS) {
        const emptyCell = findNextEmptyCell(currentBoard); // Use util
        if (!emptyCell) {
            return { status: 'solved', maxScore, techniquesUsed, stepsTaken }; // Solved logically
        }

        // Find the next *effective* step using the current state
        const result = findNextLogicalStep(currentBoard, candidatesMap);

        if (result.status === 'found_step') {
            stepsTaken++;
            const step = result.steps[0];
            const techniqueBaseName = step.technique.split(' (')[0]; // Get base name like "X-Wing"
            techniquesUsed.add(techniqueBaseName);
            maxScore = Math.max(maxScore, getTechniqueScoreFn(step.technique));

            // Apply the step's changes to the *main* board and candidatesMap for the next iteration
            try {
                if (step.value !== undefined && step.cell) { // Placement step (Singles)
                    const [r, c] = step.cell;
                    if (currentBoard[r][c] !== 0) {
                        console.error(`Rating Error: Trying to place ${step.value} in already filled cell [${r},${c}]`);
                        return { status: 'error', message: 'Solver tried to overwrite cell during rating.' };
                    }
                    currentBoard[r][c] = step.value;
                    candidatesMap.delete(coordsToKey(r, c)); // Use util - Remove candidates for placed cell

                    // Eliminate placed value from peers' candidates
                    const peers = getPeers(r, c); // Use util
                    let contradictionFound = false;
                    peers.forEach(([pr, pc]) => {
                        const peerKey = coordsToKey(pr, pc); // Use util
                        const peerCands = candidatesMap.get(peerKey);
                        if (peerCands?.has(step.value)) {
                           peerCands.delete(step.value);
                           if (currentBoard[pr][pc] === 0 && peerCands.size === 0) {
                                contradictionFound = true;
                                console.error(`Contradiction after placing ${step.value} at R${r + 1}C${c + 1} - peer R${pr + 1}C${pc + 1} has no candidates.`);
                           }
                        }
                    });
                     if (contradictionFound) {
                        return { status: 'error', message: `Contradiction found during rating after placement.` };
                    }

                } else if (step.eliminations && step.eliminations.length > 0) { // Elimination step
                    const elimsForApply = step.eliminations.map(e => ({
                        cellKey: coordsToKey(e.cell[0], e.cell[1]), // Use util
                        values: e.values
                    }));
                    // Apply the eliminations found by findNextLogicalStep
                    applyEliminations(candidatesMap, elimsForApply); // Use exported function
                } else {
                    // Should not happen if findNextLogicalStep returns found_step
                    console.error("Rating Error: Found step had no placement or valid eliminations.");
                    return { status: 'error', message: 'Solver step invalid during rating.' };
                }
            } catch (error) {
                // Catch contradictions from applyEliminations
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

/**
 * Public function to be called by generator: Rates the difficulty of a given Sudoku puzzle.
 * @param {number[][]} board - The puzzle board.
 * @returns {{difficulty: DifficultyLevel, score: number, techniques: Set<string>}|null} Difficulty level, max score, techniques used, or null if invalid/unsolvable by logic.
 */
export function ratePuzzleDifficulty(board) { // <-- EXPORT for generator
    const ratingResult = ratePuzzleDifficultyInternal(board, getTechniqueScore); // Uses internal function

    // Rate 'stuck' puzzles based on the hardest technique encountered before getting stuck
    if (ratingResult.status === 'solved' || ratingResult.status === 'stuck') {
        const difficulty = getDifficultyLevelFromScore(ratingResult.maxScore);
        console.log(`Puzzle Rating: ${difficulty} (Max Score: ${ratingResult.maxScore}, Status: ${ratingResult.status}, Techniques: ${Array.from(ratingResult.techniquesUsed).join(', ')})`);
        return {
            difficulty: difficulty,
            score: ratingResult.maxScore,
            techniques: ratingResult.techniquesUsed // Return the set
        };
    } else {
        // Error during rating
        console.error(`Puzzle Rating Failed: ${ratingResult.message}`);
        return null;
    }
}

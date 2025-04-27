import { BOARD_SIZE } from '../constants.js';
import { allUnits, getCombinations, coordsToKey, keyToCoords } from '../utils.js';


export function findNakedPairs(candidatesMap) {
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

export function findNakedTriples(candidatesMap) {
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

export function findHiddenPairs(candidatesMap, board) {
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

export function findHiddenTriples(candidatesMap, board) {
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

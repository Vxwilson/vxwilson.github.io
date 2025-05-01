import { BOARD_SIZE, BOX_SIZE } from '../constants.js';
import { allUnits, keyToCoords, coordsToKey } from '../utils.js';


export function findFullHouse(candidatesMap, board) {
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

export function findNakedSinglesMap(candidatesMap) {
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

export function findHiddenSinglesMap(candidatesMap, board) {
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


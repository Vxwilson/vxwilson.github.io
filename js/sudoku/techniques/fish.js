import { BOARD_SIZE, BOX_SIZE } from '../constants.js';
import {
    getCommonPeers, getCombinations, getCandidateLocations, groupLocationsByUnit, keyToCoords, coordsToKey 
} from '../utils.js';

export function findXWing(candidatesMap) {
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

// this is wrong; roof must be on the same side from the base
// export function findSkyscraper_OLD(candidatesMap) {
//     // Use imported utils: getCandidateLocations, groupLocationsByUnit, getCombinations, keyToCoords, coordsToKey, getCommonPeers
//     for (let n = 1; n <= BOARD_SIZE; n++) {
//         const locations = getCandidateLocations(candidatesMap, n); // Use util
//         if (locations.size < 4) continue;
//         const { rows, cols } = groupLocationsByUnit(locations); // Use util

//         // Row-based Skyscraper
//         const candidateRows = new Map();
//         for (const [r, rowLocations] of rows.entries()) {
//             if (rowLocations.size === 2) candidateRows.set(r, Array.from(rowLocations));
//         }
//         if (candidateRows.size >= 2) {
//             const rowIndices = Array.from(candidateRows.keys());
//             const rowCombinations = getCombinations(rowIndices, 2); // Use util
//             for (const [r1, r2] of rowCombinations) {
//                 const [key1a, key1b] = candidateRows.get(r1);
//                 const [key2a, key2b] = candidateRows.get(r2);
//                 const [, c1a] = keyToCoords(key1a); const [, c1b] = keyToCoords(key1b); // Use util
//                 const [, c2a] = keyToCoords(key2a); const [, c2b] = keyToCoords(key2b); // Use util
//                 let baseCol = -1; let roofKey1 = null; let roofKey2 = null;
//                 if (c1a === c2a && c1b !== c2b) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2b; }
//                 else if (c1a === c2b && c1b !== c2a) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2a; }
//                 else if (c1b === c2a && c1a !== c2b) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2b; }
//                 else if (c1b === c2b && c1a !== c2a) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2a; }

//                 if (baseCol !== -1) {
//                     const [roof_r1, roof_c1] = keyToCoords(roofKey1); // Use util
//                     const [roof_r2, roof_c2] = keyToCoords(roofKey2); // Use util
//                     const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2); // Use util
//                     const skyscraperElims = [];
//                     for (const peerKey of commonPeersKeys) {
//                         if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
//                             if (candidatesMap.get(peerKey)?.has(n)) {
//                                 skyscraperElims.push({ cellKey: peerKey, values: [n] });
//                             }
//                         }
//                     }
//                     if (skyscraperElims.length > 0) {
//                         const baseKey1 = coordsToKey(r1, baseCol); const baseKey2 = coordsToKey(r2, baseCol); // Use util
//                         const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)]; // Use util
//                         const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)]; // Use util
//                         const stepInfo = {
//                             technique: `Skyscraper (Rows, Digit ${n})`,
//                             description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms a Skyscraper with base in Col ${baseCol + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
//                             eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
//                             highlights: [
//                                 ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
//                                 ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
//                                 ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' })) // Use util
//                             ]
//                         };
//                         // console.log(`  >> Found Row Skyscraper (Digit ${n}, Base Col ${baseCol + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
//                         return { eliminations: skyscraperElims, stepInfo: stepInfo };
//                     }
//                 }
//             }
//         }

//         // Column-based Skyscraper (similar logic using utils)
//         const candidateCols = new Map();
//         for (const [c, colLocations] of cols.entries()) {
//             if (colLocations.size === 2) candidateCols.set(c, Array.from(colLocations));
//         }
//         if (candidateCols.size >= 2) {
//             const colIndices = Array.from(candidateCols.keys());
//             const colCombinations = getCombinations(colIndices, 2); // Use util
//             for (const [c1, c2] of colCombinations) {
//                 const [key1a, key1b] = candidateCols.get(c1);
//                 const [key2a, key2b] = candidateCols.get(c2);
//                 const [r1a,] = keyToCoords(key1a); const [r1b,] = keyToCoords(key1b); // Use util
//                 const [r2a,] = keyToCoords(key2a); const [r2b,] = keyToCoords(key2b); // Use util
//                 let baseRow = -1; let roofKey1 = null; let roofKey2 = null;
//                 if (r1a === r2a && r1b !== r2b) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2b; }
//                 else if (r1a === r2b && r1b !== r2a) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2a; }
//                 else if (r1b === r2a && r1a !== r2b) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2b; }
//                 else if (r1b === r2b && r1a !== r2a) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2a; }

//                 if (baseRow !== -1) {
//                     const [roof_r1, roof_c1] = keyToCoords(roofKey1); // Use util
//                     const [roof_r2, roof_c2] = keyToCoords(roofKey2); // Use util
//                     const commonPeersKeys = getCommonPeers(roof_r1, roof_c1, roof_r2, roof_c2); // Use util
//                     const skyscraperElims = [];
//                     for (const peerKey of commonPeersKeys) {
//                         if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
//                             if (candidatesMap.get(peerKey)?.has(n)) {
//                                 skyscraperElims.push({ cellKey: peerKey, values: [n] });
//                             }
//                         }
//                     }
//                     if (skyscraperElims.length > 0) {
//                         const baseKey1 = coordsToKey(baseRow, c1); const baseKey2 = coordsToKey(baseRow, c2); // Use util
//                         const baseCoords = [keyToCoords(baseKey1), keyToCoords(baseKey2)]; // Use util
//                         const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)]; // Use util
//                         const stepInfo = {
//                             technique: `Skyscraper (Cols, Digit ${n})`,
//                             description: `Digit ${n} in Cols ${c1 + 1} and ${c2 + 1} forms a Skyscraper with base in Row ${baseRow + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1 + 1}C${roof_c1 + 1} and R${roof_r2 + 1}C${roof_c2 + 1}.`,
//                             eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })), // Use util
//                             highlights: [
//                                 ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
//                                 ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
//                                 ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' })) // Use util
//                             ]
//                         };
//                         // console.log(`  >> Found Col Skyscraper (Digit ${n}, Base Row ${baseRow + 1}, Roof ${roofKey1}/${roofKey2}). Eliminations:`, skyscraperElims.map(e => e.cellKey));
//                         return { eliminations: skyscraperElims, stepInfo: stepInfo };
//                     }
//                 }
//             }
//         }
//     }
//     return { eliminations: [], stepInfo: null };
// }

export function findSkyscraper(candidatesMap) {
    // Use imported utils: getCandidateLocations, groupLocationsByUnit, getCombinations, keyToCoords, coordsToKey, getCommonPeers
    for (let n = 1; n <= BOARD_SIZE; n++) {
        const locations = getCandidateLocations(candidatesMap, n);
        if (locations.size < 4) continue;
        const { rows, cols } = groupLocationsByUnit(locations);

        // Row-based Skyscraper
        const candidateRows = new Map();
        for (const [r, rowLocations] of rows.entries()) {
            if (rowLocations.size === 2) candidateRows.set(r, Array.from(rowLocations));
        }
        if (candidateRows.size >= 2) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 2);
            for (const [r1, r2] of rowCombinations) {
                const [key1a, key1b] = candidateRows.get(r1); // e.g., key for (r1, c1a) and (r1, c1b)
                const [key2a, key2b] = candidateRows.get(r2); // e.g., key for (r2, c2a) and (r2, c2b)
                const [, c1a] = keyToCoords(key1a); const [, c1b] = keyToCoords(key1b);
                const [, c2a] = keyToCoords(key2a); const [, c2b] = keyToCoords(key2b);
                let baseCol = -1; let roofKey1 = null; let roofKey2 = null;

                if (c1a === c2a && c1b !== c2b) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (c1a === c2b && c1b !== c2a) { baseCol = c1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (c1b === c2a && c1a !== c2b) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (c1b === c2b && c1a !== c2a) { baseCol = c1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseCol !== -1) {
                    const [, current_roof_c1] = keyToCoords(roofKey1);
                    const [, current_roof_c2] = keyToCoords(roofKey2);

                    // --- MODIFICATION START: Apply "same direction" constraint ---
                    const dir1_sign = Math.sign(current_roof_c1 - baseCol);
                    const dir2_sign = Math.sign(current_roof_c2 - baseCol);

                    // Roofs must be on the same side of the base.
                    // dir_sign will be -1 (left/top), 0 (on base line), or 1 (right/bottom).
                    // We need dir_sign to be non-zero (roof not on base line) and same for both.
                    // Since key1a/key1b are distinct in a row, current_roof_c1 will not be baseCol if baseCol was c1a.
                    // So dir1_sign and dir2_sign will not be 0 here.
                    if (dir1_sign === dir2_sign) { // Both -1 or both 1
                        // --- MODIFICATION END ---

                        const [roof_r1_coord, roof_c1_coord] = keyToCoords(roofKey1);
                        const [roof_r2_coord, roof_c2_coord] = keyToCoords(roofKey2);
                        const commonPeersKeys = getCommonPeers(roof_r1_coord, roof_c1_coord, roof_r2_coord, roof_c2_coord);
                        const skyscraperElims = [];

                        for (const peerKey of commonPeersKeys) {
                            // Ensure the peer is not one of the 4 cells forming the Skyscraper
                            if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                                if (candidatesMap.get(peerKey)?.has(n)) {
                                    skyscraperElims.push({ cellKey: peerKey, values: [n] });
                                }
                            }
                        }

                        if (skyscraperElims.length > 0) {
                            const finalBaseKey1 = coordsToKey(r1, baseCol);
                            const finalBaseKey2 = coordsToKey(r2, baseCol);
                            const baseCoords = [keyToCoords(finalBaseKey1), keyToCoords(finalBaseKey2)];
                            const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)];
                            const stepInfo = {
                                technique: `Skyscraper (Rows, Digit ${n})`,
                                description: `Digit ${n} in Rows ${r1 + 1} and ${r2 + 1} forms a Skyscraper with base in Col ${baseCol + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1_coord + 1}C${roof_c1_coord + 1} and R${roof_r2_coord + 1}C${roof_c2_coord + 1}.`,
                                eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                                highlights: [
                                    ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                    ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                    ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' }))
                                ]
                            };
                            return { eliminations: skyscraperElims, stepInfo: stepInfo };
                        }
                    } // End "same direction" check
                }
            }
        }

        // Column-based Skyscraper
        const candidateCols = new Map();
        for (const [c, colLocations] of cols.entries()) {
            if (colLocations.size === 2) candidateCols.set(c, Array.from(colLocations));
        }
        if (candidateCols.size >= 2) {
            const colIndices = Array.from(candidateCols.keys());
            const colCombinations = getCombinations(colIndices, 2);
            for (const [c1, c2] of colCombinations) {
                const [key1a, key1b] = candidateCols.get(c1);
                const [key2a, key2b] = candidateCols.get(c2);
                const [r1a,] = keyToCoords(key1a); const [r1b,] = keyToCoords(key1b);
                const [r2a,] = keyToCoords(key2a); const [r2b,] = keyToCoords(key2b);
                let baseRow = -1; let roofKey1 = null; let roofKey2 = null;

                if (r1a === r2a && r1b !== r2b) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2b; }
                else if (r1a === r2b && r1b !== r2a) { baseRow = r1a; roofKey1 = key1b; roofKey2 = key2a; }
                else if (r1b === r2a && r1a !== r2b) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2b; }
                else if (r1b === r2b && r1a !== r2a) { baseRow = r1b; roofKey1 = key1a; roofKey2 = key2a; }

                if (baseRow !== -1) {
                    const [current_roof_r1,] = keyToCoords(roofKey1);
                    const [current_roof_r2,] = keyToCoords(roofKey2);

                    // --- MODIFICATION START: Apply "same direction" constraint ---
                    const dir1_sign = Math.sign(current_roof_r1 - baseRow);
                    const dir2_sign = Math.sign(current_roof_r2 - baseRow);
                    
                    if (dir1_sign === dir2_sign) { // Both -1 or both 1
                    // --- MODIFICATION END ---

                        const [roof_r1_coord, roof_c1_coord] = keyToCoords(roofKey1);
                        const [roof_r2_coord, roof_c2_coord] = keyToCoords(roofKey2);
                        const commonPeersKeys = getCommonPeers(roof_r1_coord, roof_c1_coord, roof_r2_coord, roof_c2_coord);
                        const skyscraperElims = [];
                        for (const peerKey of commonPeersKeys) {
                            if (peerKey !== key1a && peerKey !== key1b && peerKey !== key2a && peerKey !== key2b) {
                                if (candidatesMap.get(peerKey)?.has(n)) {
                                    skyscraperElims.push({ cellKey: peerKey, values: [n] });
                                }
                            }
                        }
                        if (skyscraperElims.length > 0) {
                            const finalBaseKey1 = coordsToKey(baseRow, c1);
                            const finalBaseKey2 = coordsToKey(baseRow, c2);
                            const baseCoords = [keyToCoords(finalBaseKey1), keyToCoords(finalBaseKey2)];
                            const roofCoords = [keyToCoords(roofKey1), keyToCoords(roofKey2)];
                            const stepInfo = {
                                technique: `Skyscraper (Cols, Digit ${n})`,
                                description: `Digit ${n} in Cols ${c1 + 1} and ${c2 + 1} forms a Skyscraper with base in Row ${baseRow + 1}. Candidate ${n} removed from cells seeing both roof cells R${roof_r1_coord + 1}C${roof_c1_coord + 1} and R${roof_r2_coord + 1}C${roof_c2_coord + 1}.`,
                                eliminations: skyscraperElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                                highlights: [
                                    ...baseCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                    ...roofCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                    ...skyscraperElims.map(elim => ({ row: keyToCoords(elim.cellKey)[0], col: keyToCoords(elim.cellKey)[1], candidates: [n], type: 'eliminated' }))
                                ]
                            };
                            return { eliminations: skyscraperElims, stepInfo: stepInfo };
                        }
                    } // End "same direction" check
                }
            }
        }
    }
    return { eliminations: [], stepInfo: null };
}

export function find2StringKite(candidatesMap) {
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

export function findSwordfish(candidatesMap) {
    // Use imported getCombinations, coordsToKey, keyToCoords
    for (let n = 1; n <= BOARD_SIZE; n++) {
        // --- Row-based Swordfish ---
        const candidateRows = new Map(); // Map<rowIndex, colIndices[]>
        for (let r = 0; r < BOARD_SIZE; r++) {
            const colsWithN = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (candidatesMap.get(coordsToKey(r, c))?.has(n)) {
                    colsWithN.push(c);
                }
            }
            // Swordfish allows 2 or 3 candidates per defining unit
            if (colsWithN.length === 2 || colsWithN.length === 3) {
                candidateRows.set(r, colsWithN);
            }
        }

        if (candidateRows.size >= 3) {
            const rowIndices = Array.from(candidateRows.keys());
            const rowCombinations = getCombinations(rowIndices, 3); // Combinations of 3 rows

            for (const [r1, r2, r3] of rowCombinations) {
                const cols1 = candidateRows.get(r1);
                const cols2 = candidateRows.get(r2);
                const cols3 = candidateRows.get(r3);

                const allCols = new Set([...cols1, ...cols2, ...cols3]);

                // Check if these candidates span exactly 3 columns
                if (allCols.size === 3) {
                    const swordfishCols = Array.from(allCols);
                    const [c1, c2, c3] = swordfishCols;
                    const swordfishElims = [];
                    const definingCellsCoords = []; // Store coords for highlighting

                    // Identify defining cells (where the candidate MUST be)
                    const definingCellsKeys = new Set();
                     for (const r of [r1, r2, r3]) {
                        for (const c of swordfishCols) {
                            const key = coordsToKey(r,c);
                            if (candidatesMap.get(key)?.has(n)){
                                // Check if this cell is actually one of the candidates forming the pattern
                                const colsForRow = candidateRows.get(r);
                                if (colsForRow.includes(c)) {
                                    definingCellsKeys.add(key);
                                    definingCellsCoords.push([r,c]);
                                }
                            }
                        }
                    }


                    // Find eliminations: Check other cells in the 3 columns
                    for (const targetCol of swordfishCols) {
                        for (let targetRow = 0; targetRow < BOARD_SIZE; targetRow++) {
                            const targetCellKey = coordsToKey(targetRow, targetCol);
                            // Eliminate if it's in one of the columns, HAS the candidate, but is NOT one of the defining cells
                            if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                swordfishElims.push({ cellKey: targetCellKey, values: [n] });
                            }
                        }
                    }

                    if (swordfishElims.length > 0) {
                        const stepInfo = {
                            technique: `Swordfish (Rows, Digit ${n})`,
                            description: `Digit ${n} in Rows ${r1 + 1}, ${r2 + 1}, and ${r3 + 1} forms a Swordfish in Columns ${c1 + 1}, ${c2 + 1}, and ${c3 + 1}. Digit ${n} can be removed from other cells in these columns.`,
                            eliminations: swordfishElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                            highlights: [
                                ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...swordfishElims.map(elim => {
                                    const [er, ec] = keyToCoords(elim.cellKey);
                                    return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                })
                            ]
                        };
                        // console.log(`  >> Found Row Swordfish (${n} in R${r1 + 1},R${r2 + 1},R${r3 + 1} / C${c1 + 1},C${c2 + 1},C${c3 + 1}). Elims:`, swordfishElims.map(e=>e.cellKey));
                        return { eliminations: swordfishElims, stepInfo: stepInfo };
                    }
                }
            }
        }

        // --- Column-based Swordfish ---
        const candidateCols = new Map(); // Map<colIndex, rowIndices[]>
        for (let c = 0; c < BOARD_SIZE; c++) {
            const rowsWithN = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                if (candidatesMap.get(coordsToKey(r, c))?.has(n)) {
                    rowsWithN.push(r);
                }
            }
            if (rowsWithN.length === 2 || rowsWithN.length === 3) {
                candidateCols.set(c, rowsWithN);
            }
        }

        if (candidateCols.size >= 3) {
            const colIndices = Array.from(candidateCols.keys());
            const colCombinations = getCombinations(colIndices, 3); // Combinations of 3 columns

            for (const [c1, c2, c3] of colCombinations) {
                const rows1 = candidateCols.get(c1);
                const rows2 = candidateCols.get(c2);
                const rows3 = candidateCols.get(c3);

                const allRows = new Set([...rows1, ...rows2, ...rows3]);

                // Check if these candidates span exactly 3 rows
                if (allRows.size === 3) {
                    const swordfishRows = Array.from(allRows);
                    const [r1, r2, r3] = swordfishRows;
                    const swordfishElims = [];
                    const definingCellsCoords = [];

                    const definingCellsKeys = new Set();
                    for (const c of [c1, c2, c3]) {
                        for (const r of swordfishRows) {
                           const key = coordsToKey(r,c);
                           if (candidatesMap.get(key)?.has(n)) {
                                const rowsForCol = candidateCols.get(c);
                                if (rowsForCol.includes(r)){
                                    definingCellsKeys.add(key);
                                    definingCellsCoords.push([r,c]);
                                }
                           }
                        }
                    }


                    // Find eliminations: Check other cells in the 3 rows
                    for (const targetRow of swordfishRows) {
                        for (let targetCol = 0; targetCol < BOARD_SIZE; targetCol++) {
                            const targetCellKey = coordsToKey(targetRow, targetCol);
                            if (!definingCellsKeys.has(targetCellKey) && candidatesMap.get(targetCellKey)?.has(n)) {
                                swordfishElims.push({ cellKey: targetCellKey, values: [n] });
                            }
                        }
                    }

                    if (swordfishElims.length > 0) {
                        const stepInfo = {
                            technique: `Swordfish (Cols, Digit ${n})`,
                            description: `Digit ${n} in Columns ${c1 + 1}, ${c2 + 1}, and ${c3 + 1} forms a Swordfish in Rows ${r1 + 1}, ${r2 + 1}, and ${r3 + 1}. Digit ${n} can be removed from other cells in these rows.`,
                            eliminations: swordfishElims.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                            highlights: [
                                ...definingCellsCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [n], type: 'defining' })),
                                ...swordfishElims.map(elim => {
                                    const [er, ec] = keyToCoords(elim.cellKey);
                                    return { row: er, col: ec, candidates: [n], type: 'eliminated' };
                                })
                            ]
                        };
                        // console.log(`  >> Found Col Swordfish (${n} in C${c1 + 1},C${c2 + 1},C${c3 + 1} / R${r1 + 1},R${r2 + 1},R${r3 + 1}). Elims:`, swordfishElims.map(e=>e.cellKey));
                        return { eliminations: swordfishElims, stepInfo: stepInfo };
                    }
                }
            }
        }
    }

    // No Swordfish found
    return { eliminations: [], stepInfo: null };
}

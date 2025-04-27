import { BOARD_SIZE, BOX_SIZE } from '../constants.js';
import { allUnits, coordsToKey, keyToCoords } from '../utils.js';

export function findLockedCandidates(candidatesMap) {
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

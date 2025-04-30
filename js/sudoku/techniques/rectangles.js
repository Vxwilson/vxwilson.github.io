// js/sudoku/techniques/rectangles.js
import { BOARD_SIZE, BOX_SIZE } from '../constants.js';
import { keyToCoords, coordsToKey, isCellInBox, getBoxIndex} from '../utils.js';

/**
 * Finds a specific Empty Rectangle pattern variation.
 * If exactly one arm forms a strong link with the intersection point,
 * the candidate is eliminated from the *other* (weak) arm.
 * @param {Map<string, Set<number>>} candidatesMap The current map of candidates.
 * @returns {{eliminations: {cellKey: string, values: number[]}[], stepInfo: Step | null}}
 */
export function findEmptyRectangle(candidatesMap) {
    // 1. Go through each 3x3 box.
    for (let b = 0; b < BOARD_SIZE; b++) {
        const boxStartRow = Math.floor(b / BOX_SIZE) * BOX_SIZE;
        const boxStartCol = (b % BOX_SIZE) * BOX_SIZE;

        // 2. Foreach box B, loop through row r and col c (intersecting the box)
        for (let i = 0; i < BOX_SIZE; i++) {
            const r = boxStartRow + i; // Row index within the grid
            for (let j = 0; j < BOX_SIZE; j++) {
                const c = boxStartCol + j; // Column index within the grid

                // 3. Foreach r and c, loop through digits (candidates) 1-9 d.
                for (let d = 1; d <= BOARD_SIZE; d++) {
                    // 4. Check the core condition
                    let countInRowInBox = 0;
                    let countInColInBox = 0;
                    let presentInRectangle = false;
                    const definingRowCellsInBox = [];
                    const definingColCellsInBox = [];

                    // Check row r within the box for digit d
                    for (let k = 0; k < BOX_SIZE; k++) {
                        const currentCol = boxStartCol + k;
                        const cellKey = coordsToKey(r, currentCol);
                        if (candidatesMap.get(cellKey)?.has(d)) {
                            countInRowInBox++;
                            definingRowCellsInBox.push(cellKey);
                        }
                    }

                    // Check col c within the box for digit d
                    for (let k = 0; k < BOX_SIZE; k++) {
                        const currentRow = boxStartRow + k;
                        const cellKey = coordsToKey(currentRow, c);
                        if (candidatesMap.get(cellKey)?.has(d)) {
                            countInColInBox++;
                            if (currentRow !== r) {
                                definingColCellsInBox.push(cellKey);
                            }
                        }
                    }

                    // Check the "remaining 4 cells" (the rectangle) within the box
                    for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset++) {
                        const rectRow = boxStartRow + rowOffset;
                        if (rectRow === r) continue;
                        for (let colOffset = 0; colOffset < BOX_SIZE; colOffset++) {
                            const rectCol = boxStartCol + colOffset;
                            if (rectCol === c) continue;
                            const rectCellKey = coordsToKey(rectRow, rectCol);
                            if (candidatesMap.get(rectCellKey)?.has(d)) {
                                presentInRectangle = true;
                                break;
                            }
                        }
                        if (presentInRectangle) break;
                    }

                    // Evaluate condition from Step 4
                    if (!presentInRectangle && (countInRowInBox >= 2 || countInColInBox >= 2)) {

                        // 5. In row r, find all cells OUTSIDE box B where candidate d exists.
                        const rowCandidatesOutsideBox = [];
                        for (let col_k = 0; col_k < BOARD_SIZE; col_k++) {
                            if (!isCellInBox(r, col_k, b)) {
                                const cellKey = coordsToKey(r, col_k);
                                if (candidatesMap.get(cellKey)?.has(d)) {
                                    // Store the object { key, r, c }
                                    rowCandidatesOutsideBox.push({ key: cellKey, r: r, c: col_k });
                                }
                            }
                        }

                        // 6. In col c, find all cells OUTSIDE box B where candidate d exists.
                        const colCandidatesOutsideBox = [];
                        for (let row_k = 0; row_k < BOARD_SIZE; row_k++) {
                            if (!isCellInBox(row_k, c, b)) {
                                const cellKey = coordsToKey(row_k, c);
                                if (candidatesMap.get(cellKey)?.has(d)) {
                                     // Store the object { key, r, c }
                                    colCandidatesOutsideBox.push({ key: cellKey, r: row_k, c: c });
                                }
                            }
                        }

                        // 7. & 8. Check intersection points and apply new logic
                        if (rowCandidatesOutsideBox.length > 0 && colCandidatesOutsideBox.length > 0) {
                            for (const r_p of rowCandidatesOutsideBox) { // r_p = { key, r: r, c: c_row }
                                const c_row = r_p.c; // Column of the row candidate outside (arm 1)
                                for (const c_p of colCandidatesOutsideBox) { // c_p = { key, r: r_col, c: c }
                                    const r_col = c_p.r; // Row of the column candidate outside (arm 2)

                                    // Intersection point (potential target, but not for elim in this version)
                                    const targetCellKey = coordsToKey(r_col, c_row);
                                    const targetRow = r_col;
                                    const targetCol = c_row;

                                    // If the intersection point cell is in the box, skip
                                    if (isCellInBox(targetRow, targetCol, b)) {
                                        continue;
                                    }

                                    // Check if candidate d exists in the intersection point cell
                                    if (candidatesMap.get(targetCellKey)?.has(d)) {

                                        // --- Calculate Strong Link Count ---
                                        let strongLinkCount = 0;
                                        let r_p_is_strong = false;
                                        let c_p_is_strong = false;

                                        // Check 1: Strong link between target(targetRow, targetCol) and r_p(r, targetCol) in COLUMN targetCol
                                        let countInSharedCol = 0;
                                        for (let checkRow = 0; checkRow < BOARD_SIZE; checkRow++) {
                                            if (candidatesMap.get(coordsToKey(checkRow, targetCol))?.has(d)) {
                                                countInSharedCol++;
                                            }
                                        }
                                        // Check if the only two candidates are the target cell and r_p itself
                                        if (countInSharedCol === 2 && candidatesMap.get(r_p.key)?.has(d)) {
                                             strongLinkCount++;
                                             r_p_is_strong = true;
                                        }

                                        // Check 2: Strong link between target(targetRow, targetCol) and c_p(targetRow, c) in ROW targetRow
                                        let countInSharedRow = 0;
                                        for (let checkCol = 0; checkCol < BOARD_SIZE; checkCol++) {
                                            if (candidatesMap.get(coordsToKey(targetRow, checkCol))?.has(d)) {
                                                countInSharedRow++;
                                            }
                                        }
                                         // Check if the only two candidates are the target cell and c_p itself
                                        if (countInSharedRow === 2 && candidatesMap.get(c_p.key)?.has(d)) {
                                             strongLinkCount++;
                                             c_p_is_strong = true;
                                        }
                                        // --- End Strong Link Count ---


                                        // --- NEW ELIMINATION LOGIC ---
                                        if (strongLinkCount === 1) {
                                            let eliminationCellKey = null;
                                            let weakArmCoords = null;
                                            let weakArmKey = '';
                                            let strongArmCoords = null;


                                            if (r_p_is_strong && !c_p_is_strong) {
                                                // Eliminate from c_p (the weak arm)
                                                eliminationCellKey = c_p.key;
                                                weakArmCoords = [c_p.r, c_p.c];
                                                weakArmKey = c_p.key;
                                                strongArmCoords = [r_p.r, r_p.c];
                                            } else if (c_p_is_strong && !r_p_is_strong) {
                                                // Eliminate from r_p (the weak arm)
                                                eliminationCellKey = r_p.key;
                                                weakArmCoords = [r_p.r, r_p.c];
                                                weakArmKey = r_p.key;
                                                strongArmCoords = [c_p.r, c_p.c];
                                            }

                                            // Ensure we found a weak arm and it actually has the candidate
                                            if (eliminationCellKey && candidatesMap.get(eliminationCellKey)?.has(d)) {
                                                const eliminations = [{ cellKey: eliminationCellKey, values: [d] }];
                                                // Defining coords include box candidates, both arms, and the intersection point
                                                const definingCoords = [
                                                    ...definingRowCellsInBox.map(key => keyToCoords(key)),
                                                    ...definingColCellsInBox.map(key => keyToCoords(key)),
                                                    [r_p.r, r_p.c], // Arm 1
                                                    [c_p.r, c_p.c], // Arm 2
                                                    [targetRow, targetCol] // Intersection point
                                                ];
                                                const eliminatedCoords = [weakArmCoords]; // The weak arm cell

                                                const stepInfo = {
                                                    // Name reflects the action
                                                    technique: `Empty Rectangle (Digit ${d}, Box ${b + 1})`,
                                                    description: `Digit ${d} forms an ER structure in Box ${b + 1} (R${r + 1}/C${c + 1}). Intersection R${targetRow + 1}C${targetCol + 1}. Strong link with arm R${strongArmCoords[0]+1}C${strongArmCoords[1]+1}. Eliminating candidate ${d} from weak arm R${weakArmCoords[0] + 1}C${weakArmCoords[1] + 1}.`,
                                                    eliminations: eliminations.map(elim => ({ cell: keyToCoords(elim.cellKey), values: elim.values })),
                                                    highlights: [
                                                        // Highlight defining candidates + intersection point
                                                        ...definingCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [d], type: 'defining' })),
                                                        // Highlight eliminated candidate on the weak arm
                                                        ...eliminatedCoords.map(([hr, hc]) => ({ row: hr, col: hc, candidates: [d], type: 'eliminated' }))
                                                    ]
                                                };
                                                console.log(`  >> Found ${stepInfo.technique}`);
                                                return { eliminations, stepInfo };
                                            }
                                        }
                                        // If strongLinkCount is 0 or 2, we do nothing and continue the loop.
                                        // --- END NEW ELIMINATION LOGIC ---

                                    } // end if target has candidate d
                                } // end loop c_p
                            } // end loop r_p
                        } // end if candidates outside box exist
                    } // end if step 4 condition met
                } // End digit loop
            } // End col loop
        } // End row loop
    } // End box loop

    // No suitable pattern found
    return { eliminations: [], stepInfo: null };
}
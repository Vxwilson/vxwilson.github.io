import { BOARD_SIZE, BOX_SIZE } from '../constants.js';
import {
    getCombinations, coordsToKey, keyToCoords, cellsSeeEachOther, getCommonPeers, allUnits
} from '../utils.js';

export function WWingFindInvalidUnitHelper(candidatesMap, cell1Key, cell2Key, candidate) {
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

export function findWWing(candidatesMap) {
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

export function findYWing(candidatesMap) {
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

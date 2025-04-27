// js/sudoku/solver_rating.js
import { DifficultyLevel, getTechniqueScore, getDifficultyLevelFromScore } from './constants.js';
import { deepCopy2DArray, findNextEmptyCell, getPeers, coordsToKey } from './utils.js';
import { initializeCandidatesMap, applyEliminations, findNextLogicalStep } from './solver_advanced.js';


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
export function ratePuzzleDifficulty(board) { 
    const ratingResult = ratePuzzleDifficultyInternal(board, getTechniqueScore); 

    // Rate 'stuck' puzzles based on the hardest technique encountered before getting stuck
    if (ratingResult.status === 'solved') {
        // if (ratingResult.status === 'solved' || ratingResult.status === 'stuck') {
        const difficulty = getDifficultyLevelFromScore(ratingResult.maxScore);
        console.log(`Puzzle Rating: ${difficulty} (Max Score: ${ratingResult.maxScore}, Status: ${ratingResult.status}, Techniques: ${Array.from(ratingResult.techniquesUsed).join(', ')})`);
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

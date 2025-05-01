import { BOARD_SIZE, BOX_SIZE, DifficultyLevel, DIFFICULTY_THRESHOLDS } from './constants.js';
import { deepCopy2DArray, checkInputValid, findNextEmptyCell, coordsToKey, getPeers, keyToCoords} from './utils.js';
import * as SolverBasic from './solver_basic.js';
import { ratePuzzleDifficulty } from './solver_rating.js';
import { /* ... other imports ... */ findNextLogicalStep, initializeCandidatesMap, applyEliminations } from './solver_advanced.js'; // 




console.log('[Worker] Initializing Sudoku Generator Worker...');
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// --- Generation Algorithm ---
async function generatePuzzleAdvanced(
    desiredLevel,
    maxAttempts = 20,
    onProgressCallback = null
) {

    let minClues, maxClues;
    switch (desiredLevel) {
        case DifficultyLevel.BABY: minClues = 42; maxClues = 50; break;
        case DifficultyLevel.EASY: minClues = 32; maxClues = 38; break;
        case DifficultyLevel.MEDIUM: minClues = 28; maxClues = 31; break;
        case DifficultyLevel.HARD: minClues = 25; maxClues = 29; break;
        case DifficultyLevel.VERY_HARD: minClues = 22; maxClues = 27; break;
        case DifficultyLevel.EXTREME: minClues = 20; maxClues = 26; break;
        default: minClues = 25; maxClues = 35;
    }
    let maxHardenSteps = 20; // Limit extra removals in hardening

    console.log(`[Worker] --- Generating Puzzle: Target Level = ${desiredLevel}, Clues=[${minClues}-${maxClues}], Max Attempts=${maxAttempts} ---`);
    if (!DIFFICULTY_THRESHOLDS[desiredLevel]) {
        console.error(`[Worker] Invalid desiredLevel: ${desiredLevel}`);
        return null;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (onProgressCallback) onProgressCallback(attempt, maxAttempts, ""); // Initial progress report

        console.log(`[Worker] Generation Attempt ${attempt}/${maxAttempts}`);
        let board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
        let digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        digitArray.sort(() => Math.random() - 0.5);

        // 1. Generate a fully solved board using Basic Solver
        if (!SolverBasic.solve(board, digitArray)) {
            console.warn("[Worker] Attempt Failed: Could not create initial solved board.");
            continue;
        }
        const solution = deepCopy2DArray(board);

        // 2. Initial Clue Removal Phase
        let potentialPuzzle = deepCopy2DArray(solution);
        let initialClueIndices = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i);
        initialClueIndices.sort(() => Math.random() - 0.5);
        let removedCount = 0;
        const totalCells = BOARD_SIZE * BOARD_SIZE;
        let currentClueCount = totalCells;

        for (const cellIndex of initialClueIndices) {
            // Stop removing if we reach target range or minimum clues
            if (currentClueCount <= maxClues || currentClueCount <= minClues) break;

            const r = Math.floor(cellIndex / BOARD_SIZE);
            const c = cellIndex % BOARD_SIZE;
            if (potentialPuzzle[r][c] === 0) continue;

            const tempValue = potentialPuzzle[r][c];
            potentialPuzzle[r][c] = 0;

            // Check uniqueness using Basic Solver's countSolutions
            const boardCheckCopy = deepCopy2DArray(potentialPuzzle);
            if (SolverBasic.countSolutions(boardCheckCopy) !== 1) {
                potentialPuzzle[r][c] = tempValue; // Put back if it breaks uniqueness
            } else {
                removedCount++;
                currentClueCount = totalCells - removedCount;
            }
        }
        console.log(`[Worker] Initial removal done. Candidate puzzle has ${currentClueCount} clues.`);

        // 3. Rate the initial puzzle candidate 
        let ratingResult = ratePuzzleDifficulty(potentialPuzzle);

        if (!ratingResult) {
            console.log("[Worker] -> Initial puzzle rating failed. Discarding attempt.");
            continue;
        }
        console.log(`[Worker] -> Initial Rating: ${ratingResult.difficulty} (Score: ${ratingResult.score})`);

        // Report progress with initial difficulty
        if (onProgressCallback) onProgressCallback(attempt, maxAttempts, ratingResult.difficulty);

        // 4. Check if initial puzzle matches or needs hardening
        if (ratingResult.difficulty === desiredLevel && currentClueCount >= minClues) {
            console.log(`[Worker] --- Success! Initial puzzle matches ${desiredLevel} on attempt ${attempt} ---`);
            return {
                puzzle: potentialPuzzle,
                solution: solution,
                difficulty: ratingResult.difficulty,
                score: ratingResult.score,
                techniques: ratingResult.techniques
            };
        } else if (ratingResult.score > DIFFICULTY_THRESHOLDS[desiredLevel].score) {
            console.log("[Worker] -> Initial puzzle is harder than desired. Discarding attempt.");
            continue;
        } else if (currentClueCount <= minClues) {
            console.log("[Worker] -> Initial puzzle is too easy but already at min clues. Discarding attempt.");
            continue;
        }

        // 5. Hardening Phase
        console.log("[Worker] --- Entering Hardening Phase ---");
        let currentHardeningPuzzle = deepCopy2DArray(potentialPuzzle);
        let hardenSteps = 0;
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
                console.log("[Worker] -> Reached max hardening steps."); break;
            }
            if (currentClueCount <= minClues) {
                console.log("[Worker] -> Reached min clues during hardening."); break;
            }

            const tempValue = currentHardeningPuzzle[r][c];
            if (tempValue === 0) continue;

            currentHardeningPuzzle[r][c] = 0;

            // Check uniqueness
            const boardCheckCopy = deepCopy2DArray(currentHardeningPuzzle);
            if (SolverBasic.countSolutions(boardCheckCopy) !== 1) {
                currentHardeningPuzzle[r][c] = tempValue; // Put back
            } else {
                // Successfully removed a clue during hardening
                currentClueCount--;
                hardenSteps++;
                console.log(`[Worker] -> Hardening removal #${hardenSteps}: Removed ${r}-${c}. Clues: ${currentClueCount}`);

                // Re-rate the puzzle
                ratingResult = ratePuzzleDifficulty(currentHardeningPuzzle);

                if (!ratingResult) {
                    console.log("[Worker] -> Hardening rating failed. Breaking hardening.");
                    break; // Stop hardening this attempt
                }
                console.log(`[Worker] -> Hardening Rating: ${ratingResult.difficulty} (Score: ${ratingResult.score})`);
                // Report progress with current difficulty
                if (onProgressCallback) onProgressCallback(attempt, maxAttempts, ratingResult.difficulty);

                if (ratingResult.difficulty === desiredLevel && currentClueCount >= minClues) {
                    console.log(`[Worker] --- Success! Hardened puzzle matches ${desiredLevel} on attempt ${attempt}. Clues: ${currentClueCount}`);
                    return {
                        puzzle: currentHardeningPuzzle,
                        solution: solution,
                        difficulty: ratingResult.difficulty,
                        score: ratingResult.score,
                        techniques: ratingResult.techniques // Keep the Set
                    };
                } else if (ratingResult.score > DIFFICULTY_THRESHOLDS[desiredLevel].score) {
                    console.log("[Worker] -> Hardening overshot difficulty. Breaking hardening.");
                    break; // Stop hardening this attempt
                }
            }
        } // End hardening loop
        console.log("[Worker] -> Hardening phase finished without reaching target level for this attempt.");
    } // End attempts loop

    console.error(`[Worker] Failed to generate puzzle of level ${desiredLevel} after ${maxAttempts} attempts.`);
    return null;
}

async function generateTrainingPuzzle(targetTechnique, maxAttempts = 50, onProgressCallback = null) {
    console.log(`[Worker] --- Generating Training Puzzle: Target = ${targetTechnique}, Max Attempts=${maxAttempts} ---`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (onProgressCallback) onProgressCallback(attempt, maxAttempts, "");

        // 1. Generate a fully solved board (same as before)
        let board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
        let digitArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        digitArray.sort(() => Math.random() - 0.5);
        if (!SolverBasic.solve(board, digitArray)) {
            console.warn("[Worker] Training Attempt Failed: Could not create initial solved board.");
            continue;
        }
        const solution = deepCopy2DArray(board);

        // 2. Create a Candidate Puzzle (similar to initial removal, maybe less aggressive)
        //    Goal is just to get *a* valid puzzle, not necessarily specific difficulty yet.
        let puzzle = deepCopy2DArray(solution);
        let indices = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
        let clues = 81;
        let minCluesForTraining = 30; // Adjust as needed, just needs to be solvable

        for (const index of indices) {
            if (clues <= minCluesForTraining) break; // Stop removing early
            const r = Math.floor(index / 9);
            const c = index % 9;
            if (puzzle[r][c] === 0) continue;

            const temp = puzzle[r][c];
            puzzle[r][c] = 0;

            if (SolverBasic.countSolutions(deepCopy2DArray(puzzle)) !== 1) {
                puzzle[r][c] = temp; // Put back if multiple solutions
            } else {
                clues--;
            }
        }
         console.log(`[Worker] Training Attempt ${attempt}: Generated candidate with ${clues} clues.`);

        // 3. Simulate Forward Solving to find the target state
        let currentBoardState = deepCopy2DArray(puzzle);
        let currentCandidatesMap = initializeCandidatesMap(currentBoardState);
        if (!currentCandidatesMap) {
             console.warn(`[Worker] Training Attempt ${attempt}: Initial candidate has contradiction.`);
             continue; // Try next attempt
        }

        let stepsTaken = 0;
        const MAX_FORWARD_STEPS = 100; // Safety limit

        while (stepsTaken < MAX_FORWARD_STEPS) {
            if (!findNextEmptyCell(currentBoardState)) { // Solved before finding technique
                 console.log(`[Worker] Training Attempt ${attempt}: Solved before reaching ${targetTechnique}.`);
                break; // Exit while loop, go to next attempt
            }

            console.log(`[Worker] Training Attempt ${attempt}: Simulation Step ${stepsTaken + 1}`);

            // Use the MODIFIED solver, prioritizing the target technique
            const result = findNextLogicalStep(currentBoardState, currentCandidatesMap, targetTechnique);

            if (result.status === 'found_step') {
                const step = result.steps[0];
                const stepTechniqueBase = step.technique.split(' (')[0]; // "Locked Candidates (Pointing Row)" -> "Locked Candidates"

                // **** CHECK IF THIS IS THE TARGET STEP ****
                if (stepTechniqueBase === targetTechnique) {
                     console.log(`[Worker] --- Success! Found state requiring ${targetTechnique} on attempt ${attempt} after ${stepsTaken} steps ---`);

                     // The *current* board state and *current* candidates map ARE the training puzzle setup.
                     // We need to return the board state *before* applying this step.
                     // The `step` object contains the action the user needs to take.

                     // Generate the pencil marks *as they should be* just before the step
                     const finalCandidatesMap = initializeCandidatesMap(currentBoardState); // Recalculate based on current numbers
                     if (!finalCandidatesMap) {
                         console.warn("[Worker] Contradiction when finalizing candidates map for training puzzle. Skipping.");
                         break; // Skip this attempt
                     }


                     // Prepare the initial pencil marks for the UI
                     const initialPencilMarks = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(false)));
                     for(let r=0; r<BOARD_SIZE; r++){
                         for(let c=0; c<BOARD_SIZE; c++){
                             if(currentBoardState[r][c] === 0){
                                 const key = coordsToKey(r,c);
                                 const candidates = finalCandidatesMap.get(key);
                                 if(candidates){
                                     candidates.forEach(num => {
                                         initialPencilMarks[r][c][num-1] = true;
                                     });
                                 }
                             }
                         }
                     }


                     return {
                         puzzle: currentBoardState, // Board state *before* the target step
                         initialPencilMarks: initialPencilMarks, // Pencil marks *before* the target step
                         targetStep: step,          // The step the user needs to apply
                         solution: solution,        // Full solution (optional, maybe for later check)
                         technique: targetTechnique
                     };
                }

                // If it's *not* the target step, apply it and continue simulation
                stepsTaken++;
                try {
                     if (step.value !== undefined && step.cell) { // Apply placement
                         const [r, c] = step.cell;
                         currentBoardState[r][c] = step.value;
                         currentCandidatesMap.delete(coordsToKey(r, c));
                         const peers = getPeers(r, c);
                          let contradictionFound = false;
                            peers.forEach(([pr, pc]) => {
                                const peerKey = coordsToKey(pr, pc);
                                const peerCands = currentCandidatesMap.get(peerKey);
                                if (peerCands?.has(step.value)) {
                                peerCands.delete(step.value);
                                if (currentBoardState[pr][pc] === 0 && peerCands.size === 0) {
                                    contradictionFound = true;
                                }
                                }
                            });
                            if(contradictionFound) throw new Error("Contradiction applying placement step during training gen simulation.");

                     } else if (step.eliminations && step.eliminations.length > 0) { // Apply eliminations
                         const elimsForApply = step.eliminations.map(e => ({
                             cellKey: coordsToKey(e.cell[0], e.cell[1]), values: e.values
                         }));
                         applyEliminations(currentCandidatesMap, elimsForApply);
                     }
                } catch (error) {
                     console.warn(`[Worker] Training Attempt ${attempt}: Contradiction applying step '${step.technique}' during simulation.`, error.message);
                     break; // Go to next attempt
                }

            } else { // Solver stuck or error before finding target technique
                console.log(`[Worker] Training Attempt ${attempt}: Solver status ${result.status} before reaching ${targetTechnique}.`);
                break; // Go to next attempt
            }
        } // End while simulation loop
    } // End attempts loop

    console.error(`[Worker] Failed to generate training puzzle for ${targetTechnique} after ${maxAttempts} attempts.`);
    return null; // Failed to generate
}


// --- Worker Message Handler
self.onmessage = async (event) => {
    console.log('[Worker] Received message:', event.data);
    const { type, difficulty, maxAttempts, selectedTechnique } = event.data; // Add selectedTechnique

    if (type === 'generate') {
        try {
            // Define the progress reporting function for the worker
            const reportProgress = (current, total, currentDifficulty) => {
                self.postMessage({ type: 'progress', current: current, total: total, difficulty: currentDifficulty });
            }
            // Call the local generatePuzzleAdvanced, passing the progress callback
            const result = await generatePuzzleAdvanced(difficulty, maxAttempts, reportProgress);

            if (result) {
                // Send the successful result back
                console.log('[Worker] Generation successful, posting result.');
                result.techniques = Array.from(result.techniques || []); // Convert Set to Array
                self.postMessage({ type: 'result', payload: result });
            } else {
                console.log('[Worker] Generation failed, posting error.');
                self.postMessage({ type: 'error', message: `Failed to generate ${difficulty} puzzle after ${maxAttempts} attempts.` });
            }
        } catch (error) {
            console.error('[Worker] Error during generation:', error);
            self.postMessage({ type: 'error', message: error.message || 'An unknown error occurred in the generator worker.' });
        }
    } else if (type === 'generate_training') { // NEW type
        if (!selectedTechnique) {
            self.postMessage({ type: 'error', message: 'No technique selected for training puzzle generation.' });
            return;
        }
        try {
            const reportProgress = (current, total, currentDifficulty) => { // Can reuse progress reporting
                self.postMessage({ type: 'progress', current: current, total: total, difficulty: `Training: ${selectedTechnique}` });
            };

            // Call a new generation function for training
            const result = await generateTrainingPuzzle(selectedTechnique, maxAttempts || 50, reportProgress); // Use a reasonable default

            if (result) {
                console.log('[Worker] Training generation successful, posting result.');
                // No need to convert Set for techniques here as we return the specific step
                self.postMessage({ type: 'result_training', payload: result }); // New result type
            } else {
                console.log('[Worker] Training generation failed, posting error.');
                self.postMessage({ type: 'error', message: `Failed to generate training puzzle for ${selectedTechnique} after ${maxAttempts || 50} attempts.` });
            }
        } catch (error) {
            console.error('[Worker] Error during training generation:', error);
            self.postMessage({ type: 'error', message: error.message || 'An unknown error occurred in the training generator worker.' });
        }
    } else {
        console.warn('[Worker] Received unknown message type:', type);
    }
};

console.log('[Worker] Worker script loaded and ready.');
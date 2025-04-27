import {BOARD_SIZE, BOX_SIZE, DifficultyLevel, DIFFICULTY_THRESHOLDS} from './constants.js'; // getTechniqueScore might not be needed here anymore
import {deepCopy2DArray} from './utils.js';
import * as SolverBasic from './solver_basic.js';
import {ratePuzzleDifficulty } from './solver_rating.js';




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


// --- Worker Message Handler
self.onmessage = async (event) => {
    console.log('[Worker] Received message:', event.data);
    const { type, difficulty, maxAttempts } = event.data;

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
    } else {
        console.warn('[Worker] Received unknown message type:', type);
    }
};

console.log('[Worker] Worker script loaded and ready.');
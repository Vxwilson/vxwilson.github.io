// js/sudoku/training_game.js
import { SudokuBoard } from './board.js';
import { TrainingUI } from './training_ui.js'; // Assuming a separate UI class for training
import * as Persistence from './persistence.js'; // If needed for settings
import { Modes, Platform, BOARD_SIZE, DifficultyLevel } from './constants.js';
import { checkInputValid, findNextEmptyCell, deepCopy2DArray, keyToCoords, coordsToKey } from './utils.js';
import { celebrate, triggerMiniConfetti } from './confetti.js';

export class SudokuTrainingGame {
    constructor() {
        this.board = new SudokuBoard();
        this.ui = new TrainingUI(this._getUICallbacks()); // Reuse UI class for now

        this.currentState = {
            mode: Modes.NORMAL, // Default to normal for placement, switch for elimination
            platform: Platform.Desktop,
            selectedRow: null,
            selectedCol: null,
            focusedDigits: new Set(),
            hintStage: 0, // 0: inactive, 2: cells shown, 3: candidates shown
            isTrainingActive: false,
            selectedTechnique: null,
            targetStep: null, // Stores the step the user needs to make
            initialBoardState: null, // Store the board state received from worker
            initialPencilMarks: null, // Store the marks received from worker
            settings: { // Load default/saved settings if needed
                autoPencilMarks: false, // Probably disable auto-marks for training eliminations
            },
        };

        this.generationWorker = null;
        this._initializeWorker(); // Reuse worker initialization

        // Initial setup
        this._detectPlatform();
        // Load settings if needed
        // const loadedSettings = Persistence.loadSettings();
        // if (loadedSettings) this.currentState.settings = loadedSettings;
        // this.ui.applySettings(this.currentState.settings);

        // Disable buttons until technique selected
        const nextButton = document.getElementById('next-training-puzzle');
        if (nextButton) nextButton.disabled = true;
        // Disable board interaction initially
    }

    _initializeWorker() {
        // identical to game.js _initializeWorker, but handle 'result_training' message type
        if (window.Worker) {
            console.log("[Training] Initializing generation worker...");
            try {
                this.generationWorker = new Worker(new URL('./sudoku_generator.worker.js', import.meta.url), { type: 'module' });

                this.generationWorker.onmessage = (event) => {
                    this._handleWorkerMessage(event.data);
                };
                this.generationWorker.onerror = (error) => { /* ... error handling ... */ };
                console.log("[Training] Generation worker initialized.");
            } catch (err) { /* ... error handling ... */ }
        } else { /* ... error handling ... */ }
    }

    _handleWorkerMessage(data) {
        console.log("[Training] Received message from worker:", data);
        switch (data.type) {
            case 'progress':
                this.ui.updateLoadingProgress(data.current, data.total, data.difficulty); // Can reuse UI update
                break;
            case 'result_training': // Handle the new result type
                this.ui.hideLoading();
                const result = data.payload;
                if (result && result.puzzle && result.targetStep) {
                    console.log(`[Training] Worker successfully generated training puzzle for ${result.technique}.`);
                    this.board.clearBoard();
                    this.board.setGrid(result.puzzle, false); // Set puzzle, NOT as initial grid
                    this.board.setAllPencilMarks(result.initialPencilMarks); // Set the specific pencil marks

                    // Store the state needed for verification
                    this.currentState.targetStep = result.targetStep;
                    this.currentState.initialBoardState = deepCopy2DArray(result.puzzle);
                    this.currentState.initialPencilMarks = deepCopy2DArray(result.initialPencilMarks);
                    this.currentState.isTrainingActive = true;

                    // Update UI
                    this._setSelectedCell(null, null); // Deselect
                    this._updateUI();

                    // Enable interaction
                    const nextButton = document.getElementById('next-training-puzzle');
                    if (nextButton) nextButton.disabled = false;

                    // Potentially highlight the area of interest based on targetStep.highlights
                    // this.ui.applyHintHighlight(result.targetStep.highlights, false); // Show cells involved?

                } else {
                    console.error("[Training] Worker sent invalid training result:", result);
                    alert("Failed to prepare training puzzle. Please try again or select a different technique.");
                    this.currentState.isTrainingActive = false;
                    const nextButton = document.getElementById('next-training-puzzle');
                    if (nextButton) nextButton.disabled = true;
                }
                break;
            case 'error':
                this.ui.hideLoading();
                console.error("[Training] Worker reported error:", data.message);
                alert(`Failed to generate training puzzle: ${data.message}`);
                this.currentState.isTrainingActive = false;
                const nextButton = document.getElementById('next-training-puzzle');
                if (nextButton) nextButton.disabled = true;
                break;
            default:
                console.warn("[Training] Received unknown message type from worker:", data.type);
        }
    }

    startTraining(technique) {
        if (!technique) return;
        console.log(`[Training] Starting training for: ${technique}`);
        this.currentState.selectedTechnique = technique;
        this.currentState.isTrainingActive = false; // Reset active state
        this.currentState.targetStep = null;
        this.ui.clearHintHighlight();
        this._resetHintState();

        // Update technique display
        const techDisplay = document.getElementById('training-technique-display');
        if (techDisplay) techDisplay.textContent = `Technique: ${technique}`;

        this.requestNextPuzzle(); // Request the first puzzle for this technique
    }

    requestNextPuzzle() {
        if (!this.currentState.selectedTechnique) {
            alert("Please select a technique first.");
            return;
        }
        if (!this.generationWorker) {
            alert("Generator component not ready.");
            return;
        }

        console.log(`[Training] Requesting new puzzle for ${this.currentState.selectedTechnique}`);
        this.ui.showLoading("Generating...");
        const nextButton = document.getElementById('next-training-puzzle');
        if (nextButton) nextButton.disabled = true;
        this.ui.clearHintHighlight();

        this._resetHintState();

        // Send message to worker
        this.generationWorker.postMessage({
            type: 'generate_training',
            selectedTechnique: this.currentState.selectedTechnique,
            maxAttempts: 50
        });
    }

    // _updateUI() {
    //     // Similar to game.js, but might hide/show different things
    //     this.ui.displayBoard({
    //         grid: this.board.getGrid(),
    //         initialGrid: this.board.getInitialGrid(),
    //         // initialGrid: this.currentState.initialBoardState || [], // Example: Style initial clues
    //         pencilMarks: this.board.getAllPencilMarks()
    //     });
    //     this.ui.updateModeButtons(this.currentState.mode);
    //     // Hide/disable irrelevant buttons in training UI update if needed
    //     this.ui.selectCell(this.currentState.selectedRow, this.currentState.selectedCol, null, null);
    //     this._updateNumPadVisibility(); // Reuse numpad logic

    //     // Clear hint highlights if not showing specific areas initially
    //     // this.ui.clearHintHighlight(); // Or apply highlights based on targetStep
    //     this.ui.clearFocusHighlight(); // No focus mode needed here?
    // }

    // In training_game.js
    _updateUI() {
        this.ui.displayBoard({
            grid: this.board.getGrid(),
            // Use initialBoardState for prefilled styling IF you want that distinction visually
            // Otherwise, keep initialGrid empty or use the board's default initialGrid
            initialGrid: this.currentState.initialBoardState || [], // Example: Style initial clues
            pencilMarks: this.board.getAllPencilMarks()
        });
        this.ui.updateModeButtons(this.currentState.mode);
        this.ui.selectCell(this.currentState.selectedRow, this.currentState.selectedCol, null, null);
        this._updateNumPadVisibility();

        // --- Handle Highlights ---
        // Only clear hint highlights if the hint state is inactive
        if (this.currentState.hintStage === 0) {
            // Don't clear hint highlights just because UI updated if a hint is active
            // Highlighting handled by _handleHintRequest or _checkTrainingStepCompletion
        }

        // Apply Focus Highlights based on mode
        if (this.currentState.mode === Modes.FOCUS) {
            this.ui.applyFocusHighlight(this.currentState.focusedDigits); // Apply persistent focus highlights
        } else {
            // Apply auto-focus based on selected cell in Normal/Marking mode
            // (Optional for training, but keeps consistency)
            const { selectedRow, selectedCol } = this.currentState;
            if (selectedRow !== null && selectedCol !== null) {
                const value = this.board.getValue(selectedRow, selectedCol);
                if (value > 0) {
                    this.ui.applyFocusHighlight(value); // Highlight selected number
                } else {
                    this.ui.clearFocusHighlight(); // Clear if empty cell selected
                }
            } else {
                this.ui.clearFocusHighlight(); // Clear if no cell selected
            }
        }
    }

    _setSelectedCell(row, col) {
        // Simplified selection logic
        const prevRow = this.currentState.selectedRow;
        const prevCol = this.currentState.selectedCol;
        this.currentState.selectedRow = row;
        this.currentState.selectedCol = col;
        this.ui.selectCell(row, col, prevRow, prevCol);
        this._updateNumPadVisibility(); // Update numpad based on selection

                // Update auto-focus highlights only if not in persistent Focus mode
                if (this.currentState.mode !== Modes.FOCUS) {
                    const value = (row !== null && col !== null) ? this.board.getValue(row, col) : 0;
                    if (value > 0) {
                        this.ui.applyFocusHighlight(value);
                    } else {
                        this.ui.clearFocusHighlight();
                    }
                }
    }

    _updateNumPadVisibility() {
        // Mostly reused from game.js, but adapted for training context
        const { selectedRow, selectedCol, mode } = this.currentState;
        if (selectedRow !== null && selectedCol !== null) {
            // In training, all cells are conceptually 'user input'
            const isPrefilled = false; // Treat as not prefilled for interaction
            let validInputs = []; // Not needed if we allow any input and verify later
            let canErase = this.board.getValue(selectedRow, selectedCol) !== 0;

            this.ui.updateNumPad(validInputs, canErase, mode === Modes.MARKING, isPrefilled);
        } else {
            this.ui.updateNumPad([], false, false, false); // No cell selected
        }
    }

    // _setMode(newMode) {
    //     // Allow switching between Normal and Marking
    //     if (this.currentState.mode === newMode) {
    //         this.currentState.mode = Modes.NORMAL; // Toggle off
    //     } else {
    //         this.currentState.mode = newMode;
    //     }
    //     this._updateUI();
    // }
    // In training_game.js
    _setMode(newMode) {
        this._resetHintStateIfNeeded(); // Reset hint on mode change

        const oldMode = this.currentState.mode;
        if (oldMode === newMode) {
            // Clicking the same mode button again toggles it off (back to NORMAL)
            if (newMode !== Modes.NORMAL) {
                this.currentState.mode = Modes.NORMAL;
            }
        } else {
            this.currentState.mode = newMode;
        }
        const currentMode = this.currentState.mode;

        console.log("[Training] Mode changed from", oldMode, "to:", currentMode);

        // --- Handle Focus Mode State ---
        if (oldMode === Modes.FOCUS && currentMode !== Modes.FOCUS) {
            console.log("[Training] Exiting Focus Mode: Clearing focused digits and highlights.");
            this.currentState.focusedDigits.clear();
            this.ui.clearFocusHighlight(); // Clear persistent highlights explicitly
        } else if (currentMode === Modes.FOCUS) {
            console.log("[Training] Entering Focus Mode: Clearing potential auto-focus.");
            this.ui.clearFocusHighlight(); // Clear auto-highlights based on selection
            // Re-apply persistent highlights if any exist from previous focus session
            this.ui.applyFocusHighlight(this.currentState.focusedDigits);
        }

        // --- General UI Update ---
        // Update button styles and potentially other UI elements affected by mode
        // _updateUI will handle applying the correct focus highlights based on the new mode
        this._updateUI();
    }


    _handleCellInput(value) {
        // this._resetHintStateIfNeeded(); // <-- ADD THIS LINE

        if (!this.currentState.isTrainingActive || !this.currentState.targetStep) return; // Ignore input if not ready

        const { selectedRow, selectedCol, mode, targetStep } = this.currentState;
        if (selectedRow === null || selectedCol === null) return;

        let actionTaken = false;

        if (mode === Modes.MARKING) {
            // User is toggling pencil marks (for elimination techniques)
            if (value >= 1 && value <= BOARD_SIZE) {
                this.board.togglePencilMark(selectedRow, selectedCol, value);
                actionTaken = true;
            } else if (value === 0) {
                // Could potentially add 'clear all marks in cell' here if needed
            }
        } else { // Normal Mode (for placement techniques like Full House/Singles)
            if (value >= 0 && value <= BOARD_SIZE) { // Allow 0 for erase
                this.board.setValue(selectedRow, selectedCol, value);
                // Clear pencil marks if a number is placed
                if (value !== 0) this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                actionTaken = true;
            }
        }

        if (actionTaken) {
            this._updateUI(); // Show the change immediately
            this._checkTrainingStepCompletion(); // Verify if the step is done
        }
    }

    _checkTrainingStepCompletion() {
        const { targetStep } = this.currentState;
        if (!targetStep) return;

        let isComplete = false;

        // --- Verification Logic ---
        if (targetStep.value !== undefined && targetStep.cell) {
            // --- Placement Technique Verification (Singles, Full House) ---
            const [targetRow, targetCol] = targetStep.cell;
            const currentValue = this.board.getValue(targetRow, targetCol);
            if (currentValue === targetStep.value) {
                // Check if *only* the target cell was changed from initial state (optional strictness)
                // For simplicity, just check the target cell value
                isComplete = true;
                console.log("[Training] Placement step correctly applied!");
            }

        } else if (targetStep.eliminations && targetStep.eliminations.length > 0) {
            // --- Elimination Technique Verification ---
            // This is more complex. Compare current pencil marks against initial + expected elims.
            isComplete = true; // Assume complete initially
            const currentMarks = this.board.getAllPencilMarks();
            const initialMarks = this.currentState.initialPencilMarks;

            for (const elim of targetStep.eliminations) {
                const [r, c] = elim.cell;
                for (const val of elim.values) {
                    // Check if the candidate *was* present initially and is *now* absent
                    if (initialMarks[r][c][val - 1] && currentMarks[r][c][val - 1]) {
                        // If an expected elimination is still present, the step is not complete
                        isComplete = false;
                        break;
                    }
                    // Optional: Check if *other* candidates in the cell were *not* removed (stricter)
                }
                if (!isComplete) break;
            }

            // Optional Strictness: Check if *only* the expected eliminations were made
            // Iterate through all cells/candidates, compare initial vs current, ensuring
            // only the target eliminations differ. This prevents accidental removals.
            if (isComplete) {
                this._resetHintState();
                console.log("[Training] Elimination step appears correctly applied!");
            }
        }

        // --- Handle Completion ---
        if (isComplete) {
            console.log(`[Training] Technique ${targetStep.technique} completed!`);
            this.currentState.isTrainingActive = false;
            triggerMiniConfetti();

            // Highlight the completed step clearly
            // this.ui.applyHintHighlight(targetStep.highlights, true); // Show cells and candidates involved

            // Consider adding a visual confirmation message
            // Maybe automatically request next puzzle after a short delay? Or wait for button press.
            const nextButton = document.getElementById('next-training-puzzle');
            if (nextButton) nextButton.focus(); // Focus the next button
        }
    }

    // --- Callback Getter ---
    _getUICallbacks() {
        // Adapt callbacks for training mode
        return {
            onCellClick: (row, col) => this._setSelectedCell(row, col),
            onClickOutside: () => this._setSelectedCell(null, null),
            onNumberInput: (num) => this._handleCellInput(num),
            onKeydown: (event) => this._handleKeydown(event), // Reuse or adapt keydown
            onModeToggleRequest: (mode) => this._setMode(mode),
            // Disable/remove callbacks not used in training:
            // onPauseToggle: () => {},
            // onDifficultyCycle: () => {},
            // onNewGameRequest: () => {},
            // onResetRequest: () => {},
            // onSolveRequest: () => {},
            onHintRequest: () => this._handleHintRequest(),
            // onUndoRequest: () => {}, // Maybe add later?
            // onAutoMarkRequest: () => {}, // Maybe allow manual fill?
            // ... other callbacks ...
            onResize: () => this._detectPlatform(),
        };
    }

    // _handleKeydown(event) {
    //     // Reuse keydown logic from game.js, but simplify/adapt
    //     const key = event.key;

    //     // Define keys that *shouldn't* reset the hint state during progression
    //     const keysToIgnoreForReset = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'F5', 'F12'];
    //     const isCtrl = event.ctrlKey || event.metaKey;
    //     const shouldResetHint = !keysToIgnoreForReset.includes(key) && !(isCtrl && ['c', 'v', 'x'].includes(key.toLowerCase()));

    //     if (shouldResetHint) {
    //         //    this._resetHintStateIfNeeded(); // <-- ADD THIS LINE (conditionally)
    //     }


    //     const { selectedRow, selectedCol } = this.currentState;

    //     // Basic Navigation
    //     if (key.startsWith('Arrow')) {
    //         event.preventDefault();
    //         let nextRow = selectedRow !== null ? selectedRow : 0; // Default to top-left if none selected
    //         let nextCol = selectedCol !== null ? selectedCol : 0;
    //         // ... (arrow key logic from game.js) ...
    //         if (selectedRow === null || selectedCol === null) { // if nothing was selected, start at 0,0
    //             this._setSelectedCell(0, 0);
    //         } else if (nextRow !== selectedRow || nextCol !== selectedCol) {
    //             this._setSelectedCell(nextRow, nextCol);
    //         }
    //         return;
    //     }

    //     if (selectedRow === null || selectedCol === null) return; // Need selection for input

    //     // Input / Erase
    //     if (key >= '0' && key <= '9') {
    //         this._handleCellInput(parseInt(key, 10));
    //     } else if (key === 'Backspace' || key === 'Delete') {
    //         this._handleCellInput(0); // Erase
    //     }

    //     // Mode Toggle
    //     if (key.toLowerCase() === 'm') {
    //         this._setMode(Modes.MARKING);
    //     }
    //     if (key === 'Escape') {
    //         this._setSelectedCell(null, null); // Deselect
    //     }
    // }

    // In training_game.js
    _handleKeydown(event) {
        const key = event.key;
        const isCtrl = event.ctrlKey || event.metaKey; // Keep ctrl check if needed

        // Define keys that *shouldn't* reset the hint state during progression
        const keysToIgnoreForReset = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'F5', 'F12'];
        const shouldResetHint = !keysToIgnoreForReset.includes(key) && !(isCtrl && ['c', 'v', 'x'].includes(key.toLowerCase()));

        if (shouldResetHint) {
            this._resetHintStateIfNeeded(); // Reset hint if needed
        }

        // --- Global Shortcuts (Keep simple ones if desired) ---
        // if (isCtrl && key.toLowerCase() === 'z') { /* Add undo if implemented */ return; }

        // --- Mode Toggles ---
        if (key === 'm' && !isCtrl) { this._setMode(Modes.MARKING); return; }
        if (key === 'f' && !isCtrl) { this._setMode(Modes.FOCUS); return; } // <-- ADD FOCUS TOGGLE

        // --- Escape Key ---
        if (key === 'Escape') {
            event.preventDefault();
            this._resetHintState(); // Reset hints on escape
            if (this.currentState.mode === Modes.FOCUS) {
                this._setMode(Modes.NORMAL); // Exit focus mode first
            } else if (this.currentState.mode === Modes.MARKING) {
                this._setMode(Modes.NORMAL); // Exit marking mode
            }
            this._setSelectedCell(null, null); // Deselect cell
            return;
        }

        // --- Persistent Focus Mode Input (Digits 1-9, Backspace/Delete) ---
        if (this.currentState.mode === Modes.FOCUS) {
            if (key >= '1' && key <= '9') {
                const digit = parseInt(key, 10);
                // Toggle digit in the set
                if (this.currentState.focusedDigits.has(digit)) {
                    this.currentState.focusedDigits.delete(digit);
                } else {
                    this.currentState.focusedDigits.add(digit);
                }
                console.log("[Training] Focused digits:", this.currentState.focusedDigits);
                // Update UI immediately
                this.ui.applyFocusHighlight(this.currentState.focusedDigits);
                return; // Consume key press, don't treat as cell input
            } else if (key === 'Backspace' || key === 'Delete') {
                this.currentState.focusedDigits.clear(); // Clear all focused digits
                console.log("[Training] Cleared focused digits");
                this.ui.clearFocusHighlight(); // Update UI
                return; // Consume key press
            }
            // Allow arrow keys to pass through even in focus mode for navigation
            if (key.startsWith('Arrow')) {
                // Arrow key navigation logic (same as below, extracted for clarity)
                event.preventDefault();
                const { selectedRow, selectedCol } = this.currentState;
                let nextRow = selectedRow !== null ? selectedRow : 0;
                let nextCol = selectedCol !== null ? selectedCol : 0;
                if (key === 'ArrowUp' && nextRow > 0) nextRow--;
                else if (key === 'ArrowDown' && nextRow < BOARD_SIZE - 1) nextRow++;
                else if (key === 'ArrowLeft' && nextCol > 0) nextCol--;
                else if (key === 'ArrowRight' && nextCol < BOARD_SIZE - 1) nextCol++;

                if (selectedRow === null || selectedCol === null || nextRow !== selectedRow || nextCol !== selectedCol) {
                    this._setSelectedCell(nextRow, nextCol); // Allow selection change
                }
                return; // Consume arrow key after handling navigation
            }
            // Ignore other keys in Focus mode? Or let them pass? For now, let others pass.
        }


        // --- Cell Input / Navigation (Requires selected cell, NOT in Focus Mode ideally) ---
        const { selectedRow, selectedCol } = this.currentState;
        if (selectedRow === null || selectedCol === null) return; // Ignore input if no cell selected

        // Number Input (Normal/Marking mode)
        if (key >= '1' && key <= '9') {
            this._handleCellInput(parseInt(key, 10));
        }
        // Erase Input (Normal/Marking mode)
        else if (key === 'Backspace' || key === 'Delete' || key === '0') {
            this._handleCellInput(0);
        }
        // Arrow Key Navigation (Normal/Marking mode - also handled above for Focus consistency)
        else if (key.startsWith('Arrow')) {
            event.preventDefault(); // Already handled above if in focus mode, but prevent default anyway
            let nextRow = selectedRow;
            let nextCol = selectedCol;
            if (key === 'ArrowUp' && selectedRow > 0) nextRow--;
            else if (key === 'ArrowDown' && selectedRow < BOARD_SIZE - 1) nextRow++;
            else if (key === 'ArrowLeft' && selectedCol > 0) nextCol--;
            else if (key === 'ArrowRight' && selectedCol < BOARD_SIZE - 1) nextCol++;

            if (nextRow !== selectedRow || nextCol !== selectedCol) {
                this._setSelectedCell(nextRow, nextCol);
            }
        }
    }

    _resetHintState() {
        if (this.currentState.hintStage !== 0) {
            console.log("[Training] Resetting hint state.");
            this.currentState.hintStage = 0;
            this.ui.clearHintHighlight(false); // Clear board highlights BUT NOT the technique text
        }
    }

    /**
      * Calls _resetHintState only if a hint is currently active (stage > 0).
      */
    _resetHintStateIfNeeded() {
        if (this.currentState.hintStage > 0) {
            console.log("[Training] Resetting hint state due to new action.");
            this._resetHintState();
        }
    }

    _handleHintRequest() {
        // Check if training is active and we have the target step information
        if (!this.currentState.isTrainingActive || !this.currentState.targetStep) {
            console.log("[Training] Hint ignored: Training not active or target step missing.");
            this._resetHintState(); // Ensure UI is clear
            return;
        }

        console.log(`[Training] Hint requested. Current stage: ${this.currentState.hintStage}`);
        const targetStep = this.currentState.targetStep;
        const highlights = targetStep.highlights;
        const currentStage = this.currentState.hintStage;

        // --- Progression Logic (Starts from Stage 0 -> 2) ---
        if (currentStage === 0) {
            // --- Stage 0 -> 2: Show Cells ---
            if (!highlights || highlights.length === 0) {
                console.warn("[Training] Hint error: Target step has no highlights defined.");
                this._resetHintState();
                return;
            }
            console.log("[Training] Hint Stage 0 -> 2: Highlighting cells...");
            this.ui.applyHintHighlight(highlights, false); // false = cells only
            this.currentState.hintStage = 2;
            // Main technique name remains displayed

        } else if (currentStage === 2) {
            // --- Stage 2 -> 3: Show Candidates ---
            if (!highlights || highlights.length === 0) { // Safety check
                console.warn("[Training] Hint error at stage 2: Target step has no highlights defined.");
                this._resetHintState();
                return;
            }
            console.log("[Training] Hint Stage 2 -> 3: Highlighting candidates...");
            this.ui.applyHintHighlight(highlights, true); // true = cells and candidates
            this.currentState.hintStage = 3;
            // Main technique name remains displayed

        } else if (currentStage === 3) {
            // --- Stage 3 -> 0: Reset ---
            console.log("[Training] Hint Stage 3 -> 0: Resetting hint visuals.");
            this._resetHintState(); // Clicking again resets visuals
        }
    }

    _detectPlatform() { // Reused from game.js
        this.currentState.platform = window.innerWidth < 768 ? Platform.Mobile : Platform.Desktop;
        document.body.classList.toggle('is-mobile', this.currentState.platform === Platform.Mobile);
        document.body.classList.toggle('is-desktop', this.currentState.platform === Platform.Desktop);
    }
}
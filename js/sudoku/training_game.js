import { SudokuBoard } from './board.js';
import { TrainingUI } from './training_ui.js'; // Use the specific training UI class
import * as Persistence from './persistence.js';
import { Modes, Platform, BOARD_SIZE, DifficultyLevel } from './constants.js'; // Added DifficultyLevel just in case
import { checkInputValid, findNextEmptyCell, deepCopy2DArray, keyToCoords, coordsToKey, getPeers } from './utils.js'; // Added getPeers
import { celebrate, triggerMiniConfetti } from './confetti.js'; // Keep confetti for success

// Removed MAX_UNDO_STEPS as undo isn't implemented here yet
const MAX_UNDO_STEPS = 20;

export class SudokuTrainingGame {
    constructor() {
        this.board = new SudokuBoard();
        // Instantiate TrainingUI, passing the callbacks
        this.ui = new TrainingUI(this._getUICallbacks());

        this.currentState = {
            mode: Modes.NORMAL,
            platform: Platform.Desktop,
            selectedRow: null,
            selectedCol: null,
            focusedDigits: new Set(), // <-- ADDED for focus mode
            hintStage: 0, // 0: inactive, 2: cells shown, 3: candidates shown
            isTrainingActive: false,
            selectedTechnique: null,
            targetStep: null,
            initialBoardState: null,
            initialPencilMarks: null,
            settings: {
                autoPencilMarks: false, // Keep false for training
                saveDifficulty: false, // Not relevant here
                showHintAlert: true, // Can keep if hints have alerts
            },
            // --- Added from game.js (though not all used yet) ---
            currentHintStep: null, // Store hint details if needed beyond targetStep
        };

        this.undoStack = []; // <-- ADDED: Initialize undo stack

        this.generationWorker = null;
        this._initializeWorker();

        this._detectPlatform();
        // Load settings (optional, if TrainingUI uses them)
        // const loadedSettings = Persistence.loadSettings();
        // if (loadedSettings) { ... apply settings ... }
        // this.ui.applySettings(this.currentState.settings); // If UI needs them

        // Initial UI state
        this.requestTechniqueList(); // Ask worker for available techniques
        this._disableInteraction(); // Disable board/buttons initially
        this._updateUI(); // Initial draw (empty board)
    }

    _initializeWorker() {
        if (window.Worker) {
            console.log("[Training] Initializing generation worker...");
            try {
                this.generationWorker = new Worker(new URL('./sudoku_generator.worker.js', import.meta.url), { type: 'module' });

                this.generationWorker.onmessage = (event) => {
                    this._handleWorkerMessage(event.data);
                };

                this.generationWorker.onerror = (error) => {
                    console.error("[Training] Error initializing generation worker:", error.message, error);
                    alert(`Failed to load the training component. Please try reloading. Error: ${error.message}`);
                    this.ui.hideLoading();
                    this._disableInteraction();
                };
                console.log("[Training] Generation worker initialized.");

            } catch (err) {
                console.error("[Training] Caught error creating worker:", err);
                alert(`Failed to create the training component. Error: ${err.message}`);
                this.generationWorker = null;
                this._disableInteraction();
            }
        } else {
            console.error("[Training] Web Workers are not supported in this browser.");
            alert("Sorry, your browser doesn't support a feature required for training generation.");
            this._disableInteraction();
        }
    }

    _handleWorkerMessage(data) {
        console.log("[Training] Received message from worker:", data);
        switch (data.type) {
            case 'progress': // Reuse progress update
                this.ui.updateLoadingProgress(data.current, data.total, data.difficulty || ""); // Pass empty string if no difficulty
                break;
            case 'technique_list': // Populate the dropdown
                if (data.payload && data.payload.techniques) {
                    this.ui.populateTechniqueSelector(data.payload.techniques);
                    // Enable the selector now
                    const selector = document.getElementById('technique-select');
                    if (selector) selector.disabled = false;
                    // Set default selection prompt
                    const defaultOption = document.getElementById('technique-option');
                    if (defaultOption) defaultOption.textContent = 'Select Technique...';
                } else {
                    console.error("[Training] Invalid technique list received from worker.");
                    alert("Could not load the list of training techniques.");
                }
                break;
            case 'result_training':
                this.ui.hideLoading();
                const result = data.payload;
                if (result && result.puzzle && result.targetStep && result.initialPencilMarks) { // Ensure marks are received
                    console.log(`[Training] Worker successfully generated training puzzle for ${result.technique}.`);
                    this.board.clearBoard();
                    // Set the grid, but don't mark it as 'initial' in the Board class sense
                    this.board.setGrid(result.puzzle, false); // false = don't set as initial grid
                    this.board.setAllPencilMarks(result.initialPencilMarks);

                    // Store state needed for verification and display
                    this.currentState.targetStep = result.targetStep;
                    // Store the specific grid state *as provided by the worker* for display styling
                    this.currentState.initialBoardState = deepCopy2DArray(result.puzzle);
                    this.currentState.initialPencilMarks = result.initialPencilMarks.map(row => row.map(cellMarks => [...cellMarks])); // Deep copy
                    this.currentState.isTrainingActive = true;
                    this.currentState.selectedTechnique = result.technique; // Ensure selected technique is stored

                    // Update UI
                    this._setSelectedCell(null, null); // Deselect any previously selected cell
                    this._resetHintState(); // Clear any previous hint visuals
                    this.currentState.focusedDigits.clear(); // Clear focus from previous puzzle
                    this._updateUI(); // Full redraw

                    this.ui.updateUndoRedoButtons(false, false);
                    this._enableInteraction(); // Enable buttons/board

                    // Optional: Auto-show hint stage 1 (technique name) or stage 2 (cells)?
                    // this._handleHintRequest(); // Auto-show first hint stage

                } else {
                    console.error("[Training] Worker sent invalid training result:", result);
                    alert("Failed to prepare training puzzle. Please try again or select a different technique.");
                    this.currentState.isTrainingActive = false;
                    this._disableInteraction(); // Re-disable interaction
                }
                break;
            case 'error':
                this.ui.hideLoading();
                console.error("[Training] Worker reported error:", data.message);
                alert(`Failed to generate training puzzle: ${data.message}`);
                this.currentState.isTrainingActive = false;
                this._disableInteraction();
                break;
            default:
                console.warn("[Training] Received unknown message type from worker:", data.type);
        }
    }

    requestTechniqueList() {
        if (this.generationWorker) {
            console.log("[Training] Requesting technique list from worker.");
            this.generationWorker.postMessage({ type: 'get_techniques' });
        } else {
            // Retry or show error?
            console.error("[Training] Worker not ready to request technique list.");
            // Maybe disable selector permanently or show an error message.
            const selector = document.getElementById('technique-select');
            if (selector) selector.disabled = true;
            const defaultOption = document.getElementById('technique-option');
            if (defaultOption) defaultOption.textContent = 'Generator Error';

        }
    }

    // Called when the user selects a technique from the dropdown
    startTraining(technique) {
        if (!technique) return;
        console.log(`[Training] Starting training for: ${technique}`);
        this.currentState.selectedTechnique = technique;
        this.currentState.isTrainingActive = false; // Reset active state until puzzle arrives
        this.currentState.targetStep = null;
        this.currentState.focusedDigits.clear(); // Clear focus
        this.ui.clearHintHighlight(); // Clear visual hints
        this._resetHintState(); // Reset hint stage

        // Update UI or display if needed (e.g., show selected technique name)
        // const techDisplay = document.getElementById('training-technique-display');
        // if (techDisplay) techDisplay.textContent = `Technique: ${technique}`;

        this.requestNextPuzzle(); // Request the first puzzle for this technique
    }

    // Requests the next puzzle from the worker (used initially and by the 'Next' button)
    requestNextPuzzle() {
        if (!this.currentState.selectedTechnique) {
            // This shouldn't happen if the 'Next' button calls it, but good safety check
            alert("Internal error: No technique selected.");
            return;
        }
        if (!this.generationWorker) {
            alert("Generator component not ready. Please reload.");
            return;
        }

        console.log(`[Training] Requesting new puzzle for ${this.currentState.selectedTechnique}`);
        this.ui.showLoading("Generating..."); // Show loading indicator
        this._disableInteraction(); // Disable buttons/board while loading
        this.ui.clearHintHighlight(); // Clear hints from previous puzzle
        this._resetHintState(); // Reset hint stage
        this.currentState.focusedDigits.clear(); // Clear focus

        // Send message to worker
        this.generationWorker.postMessage({
            type: 'generate_training',
            // Send the *value* of the selected technique
            selectedTechnique: this.currentState.selectedTechnique,
            maxAttempts: 50 // Or adjust as needed
        });
    }

    _disableInteraction() {
        const nextButton = document.getElementById('next-training-puzzle');
        if (nextButton) nextButton.disabled = true;
        this.ui.gridContainer.classList.add('disabled'); // Add class to grey out/disable board clicks via CSS
        // Disable numpad buttons too? Yes.
        this.ui.numButtons.forEach(btn => btn.disabled = true);
        // Disable mode buttons
        this.ui.pencilModeButton.disabled = true;
        this.ui.focusModeButton.disabled = true;
        this.ui.hintButton.disabled = true;
        // ... disable others like solve/reset if they exist and aren't hidden ...
    }

    _enableInteraction() {
        const nextButton = document.getElementById('next-training-puzzle');
        if (nextButton) nextButton.disabled = false; // Enable 'Next' only AFTER completion? Or always if puzzle loaded? Let's enable here.
        this.ui.gridContainer.classList.remove('disabled'); // Allow board clicks
        // Numpad state will be handled by _updateNumPadVisibility based on selection/mode
        // Enable mode buttons
        this.ui.pencilModeButton.disabled = false;
        this.ui.focusModeButton.disabled = false;
        this.ui.hintButton.disabled = false;

        this._updateNumPadVisibility(); // Explicitly update numpad state
    }

    // --- State Update and UI Sync (Adapted from game.js) ---
    _updateUI() {
        this.ui.displayBoard({
            grid: this.board.getGrid(),
            // Use initialBoardState for styling prefilled numbers *from the specific training puzzle*
            initialGrid: this.currentState.initialBoardState || [],
            pencilMarks: this.board.getAllPencilMarks()
        });
        this.ui.updateModeButtons(this.currentState.mode); // Handles Pencil/Focus button selection state
        // Hide/disable irrelevant buttons in training (e.g., difficulty, timer handled by TrainingUI constructor/CSS)
        this.ui.selectCell(this.currentState.selectedRow, this.currentState.selectedCol, null, null); // Update selection highlight

        // --- Handle Highlights ---
        // Hint highlights are managed by _handleHintRequest or _checkTrainingStepCompletion
        // We only need to reapply them if UI updates for other reasons while a hint is active.
        // Focus highlights need to be applied based on mode.

        if (this.currentState.mode === Modes.FOCUS) {
            // Apply persistent focus highlights from the set
            this.ui.applyFocusHighlight(this.currentState.focusedDigits);
        } else {
            // Apply auto-focus based on selected cell value in Normal/Marking mode
            const { selectedRow, selectedCol } = this.currentState;
            if (selectedRow !== null && selectedCol !== null) {
                const value = this.board.getValue(selectedRow, selectedCol);
                if (value > 0) {
                    this.ui.applyFocusHighlight(value); // Highlight cells with the same number
                } else {
                    this.ui.clearFocusHighlight(); // Clear if cell is empty
                }
            } else {
                this.ui.clearFocusHighlight(); // Clear if no cell selected
            }
        }

        // Update Numpad state *after* updating highlights/selection
        this._updateNumPadVisibility();
    }

    _setSelectedCell(row, col) {
        // Reset hint if user clicks somewhere *unexpected* during hint display?
        // For now, let hint progression handle visual resets.
        // this._resetHintStateIfNeeded(); // Maybe only if clicking outside highlighted hint cells?

        const prevRow = this.currentState.selectedRow;
        const prevCol = this.currentState.selectedCol;
        if (row === prevRow && col === prevCol) return;

        this.currentState.selectedRow = row;
        this.currentState.selectedCol = col;

        // Update UI for cell selection itself (e.g., background color)
        // this.ui.selectCell handles the visual change.
        // Call full UI update to synchronize highlights and numpad.
        this._updateUI();
    }

    // --- MODIFIED: Update Numpad Visibility/State (Adapted from game.js) ---
    _updateNumPadVisibility() {
        const { selectedRow, selectedCol, mode, isTrainingActive } = this.currentState;

        // If training is not active, disable everything
        if (!isTrainingActive) {
            this.ui.updateNumPad([], false, false, false, mode);
            return;
        }

        // --- Handle FOCUS mode separately - Always enable focus toggling ---
        if (mode === Modes.FOCUS) {
            const validInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            const canErase = true; // Erase button clears focus
            // Pass mode, ignore cell selection/prefilled status for enabling buttons
            this.ui.updateNumPad(validInputs, canErase, false, false, mode);
            return; // Focus mode numpad handled
        }

        // --- For NORMAL and MARKING modes, visibility depends on selection ---
        if (selectedRow === null || selectedCol === null) {
            // No cell selected AND not in Focus mode: Disable numpad
            this.ui.updateNumPad([], false, false, false, mode); // Pass current mode (Normal/Marking)
            return;
        }

        // --- Cell IS selected, handle Normal/Marking modes ---
        // In training, all cells are interactable (conceptually not 'prefilled')
        const isPrefilled = false; // Treat cells as interactable
        let validInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Enable all numbers
        let canErase = false;

        if (mode === Modes.MARKING) {
            // Marking Mode: Enable 1-9 for toggling marks.
            // Enable erase only if marks exist in the cell? Or always? Let's always enable erase for marks.
            canErase = this.board.getPencilMarksForCell(selectedRow, selectedCol).some(mark => mark); // Enable only if marks exist
            // Or: canErase = true; // Always allow clearing marks
            this.ui.updateNumPad(validInputs, canErase, true, isPrefilled, mode);

        } else { // NORMAL Mode (for placement)
            // Normal Mode: Enable 1-9 for placement.
            // Enable erase if the cell has a value.
            canErase = this.board.getValue(selectedRow, selectedCol) !== 0;
            this.ui.updateNumPad(validInputs, canErase, false, isPrefilled, mode);
        }
    }

    // --- MODIFIED: Set Mode (Adapted from game.js) ---
    _setMode(newMode) {
        // Don't reset hint on mode change in training, as focus might be used *during* analysis
        // this._resetHintStateIfNeeded();

        const oldMode = this.currentState.mode;
        let targetMode = newMode;

        if (oldMode === newMode && newMode !== Modes.NORMAL) {
            // Clicking the same mode button again toggles it off (back to NORMAL)
            targetMode = Modes.NORMAL;
        }
        // Allow switching directly between MARKING and FOCUS
        this.currentState.mode = targetMode;
        const currentMode = this.currentState.mode;

        console.log("[Training] Mode changed from", oldMode, "to:", currentMode);

        // --- Handle Focus Mode State Transitions ---
        if (oldMode === Modes.FOCUS && currentMode !== Modes.FOCUS) {
            console.log("[Training] Exiting Focus Mode: Clearing visual highlights.");
            // Keep the focusedDigits set, just clear the visual effect.
            this.ui.clearFocusHighlight();
        }
        // Entering focus mode visual update is handled by _updateUI

        // --- General UI Update ---
        this._updateUI(); // Updates button styles, highlights, and numpad
    }

    // --- MODIFIED: Handle Cell Input (Adapted from game.js + Training Logic) ---
    // _handleCellInput(value) {
    //     const { mode } = this.currentState; // Get mode first

    //     // --- FOCUS Mode Input (Overrides regular input, works without cell selection) ---
    //     if (mode === Modes.FOCUS) {
    //         // Don't reset hint when just toggling focus
    //         // this._resetHintStateIfNeeded();

    //         if (value >= 1 && value <= BOARD_SIZE) {
    //             // Toggle focus for the digit
    //             const digit = value;
    //             if (this.currentState.focusedDigits.has(digit)) {
    //                 this.currentState.focusedDigits.delete(digit);
    //             } else {
    //                 this.currentState.focusedDigits.add(digit);
    //             }
    //             console.log("[Training] Toggled focus digit:", digit, " | Current focus:", Array.from(this.currentState.focusedDigits));
    //             this.ui.applyFocusHighlight(this.currentState.focusedDigits); // Update visual highlights
    //         } else if (value === 0) { // Erase button (or Backspace/Delete) in focus mode
    //             // Clear *all* focused digits
    //             if (this.currentState.focusedDigits.size > 0) {
    //                 console.log("[Training] Clearing all focused digits.");
    //                 this.currentState.focusedDigits.clear();
    //                 this.ui.clearFocusHighlight(); // Update UI
    //             }
    //         }
    //         // Update the numpad state after focus change
    //         this._updateNumPadVisibility();
    //         return; // Focus mode input handled, stop here.
    //     }

    //     // --- For Normal/Marking modes, require training to be active and a cell selected ---
    //     if (!this.currentState.isTrainingActive || !this.currentState.targetStep) {
    //          console.log("[Training] Input ignored: Training not active.");
    //          return;
    //     }
    //     const { selectedRow, selectedCol } = this.currentState;
    //     if (selectedRow === null || selectedCol === null) {
    //          console.log("[Training] Input ignored: No cell selected (and not in Focus Mode).");
    //          return;
    //     }

    //     // Reset hint state only if a non-focus input action is taken
    //     this._resetHintStateIfNeeded();

    //     let actionTaken = false;

    //     // --- MARKING Mode Input (for Elimination Training) ---
    //     if (mode === Modes.MARKING) {
    //         if (value >= 1 && value <= BOARD_SIZE) {
    //             // Check if the target cell *had* this candidate initially (optional strictness)
    //             // const initialMark = this.currentState.initialPencilMarks[selectedRow][selectedCol][value - 1];
    //             // if (!initialMark) { console.log("Attempted to toggle a mark not initially present."); return; }

    //             this.board.togglePencilMark(selectedRow, selectedCol, value);
    //             actionTaken = true;
    //         } else if (value === 0) {
    //             // Clear all marks in the selected cell?
    //              if (this.board.getPencilMarksForCell(selectedRow, selectedCol).some(mark => mark)) {
    //                 // Maybe add undo state here if implementing undo for training
    //                 this.board.clearPencilMarksForCell(selectedRow, selectedCol);
    //                 actionTaken = true; // Count clearing as an action
    //             }
    //         }
    //     }
    //     // --- NORMAL Mode Input (for Placement Training) ---
    //     else { // mode === Modes.NORMAL
    //         if (value >= 0 && value <= BOARD_SIZE) { // Allow 0 for erase
    //             const currentValue = this.board.getValue(selectedRow, selectedCol);
    //             if (currentValue !== value) {
    //                  // Maybe add undo state here if implementing undo for training
    //                 this.board.setValue(selectedRow, selectedCol, value);
    //                 // Clear pencil marks automatically if a number is placed (standard Sudoku behavior)
    //                 if (value !== 0) this.board.clearPencilMarksForCell(selectedRow, selectedCol);
    //                 actionTaken = true;
    //             }
    //         }
    //     }

    //     if (actionTaken) {
    //         this._updateUI(); // Show the change immediately
    //         // Check completion *after* the UI updates
    //         // Use setTimeout to allow UI to render before potential alert/confetti
    //         setTimeout(() => this._checkTrainingStepCompletion(), 0);
    //     }
    // }

    // --- MODIFIED: Handle Cell Input (Adapted from game.js + Training Logic) ---
    _handleCellInput(value) {
        const { mode } = this.currentState; // Get mode first

        // --- FOCUS Mode Input --- (No board change, no undo needed here)
        if (mode === Modes.FOCUS) {
            // ... focus logic ...
            return;
        }

        // --- For Normal/Marking modes, require training to be active and a cell selected ---
        if (!this.currentState.isTrainingActive || !this.currentState.targetStep) {
            // console.log("[Training] Input ignored: Training not active.");
            return;
        }
        const { selectedRow, selectedCol } = this.currentState;
        if (selectedRow === null || selectedCol === null) {
            // console.log("[Training] Input ignored: No cell selected (and not in Focus Mode).");
            return;
        }

        // Reset hint state only if a non-focus input action is taken
        this._resetHintStateIfNeeded();

        let actionTaken = false;
        let boardChanged = false; // Track if the actual board state will change

        // --- MARKING Mode Input (for Elimination Training) ---
        if (mode === Modes.MARKING) {
            if (value >= 1 && value <= BOARD_SIZE) {
                const currentlyMarked = this.board.getPencilMarksForCell(selectedRow, selectedCol)[value - 1];
                // Add undo state *before* toggling
                this._addUndoState(); // Assume toggle will happen
                this.board.togglePencilMark(selectedRow, selectedCol, value);
                actionTaken = true;
                boardChanged = true;
            } else if (value === 0) {
                // Clear all marks in the selected cell
                if (this.board.getPencilMarksForCell(selectedRow, selectedCol).some(mark => mark)) {
                    this._addUndoState(); // Add undo state before clearing
                    this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                    actionTaken = true;
                    boardChanged = true;
                }
            }
        }
        // --- NORMAL Mode Input (for Placement Training) ---
        else { // mode === Modes.NORMAL
            if (value >= 0 && value <= BOARD_SIZE) { // Allow 0 for erase
                const currentValue = this.board.getValue(selectedRow, selectedCol);
                if (currentValue !== value) {
                    this._addUndoState(); // Add undo state before setting value
                    this.board.setValue(selectedRow, selectedCol, value);
                    if (value !== 0) this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                    actionTaken = true;
                    boardChanged = true;
                }
            }
        }

        if (actionTaken) {
            this._updateUI(); // Show the change immediately
            // Check completion only if the board actually changed state
            if (boardChanged) {
                setTimeout(() => this._checkTrainingStepCompletion(), 0);
            }
        }
    }

    _checkTrainingStepCompletion() {
        const { targetStep, initialBoardState } = this.currentState;
        if (!targetStep || !this.currentState.isTrainingActive) return; // Only check if active and step exists

        let isComplete = false;
        const currentGrid = this.board.getGrid();
        const currentMarks = this.board.getAllPencilMarks();

        // --- Verification Logic ---
        if (targetStep.value !== undefined && targetStep.cell) {
            // --- Placement Technique Verification (e.g., Singles, Full House) ---
            const [targetRow, targetCol] = targetStep.cell;
            const placedValue = currentGrid[targetRow][targetCol];

            if (placedValue === targetStep.value) {
                // Basic check: Is the correct value in the target cell?
                isComplete = true;

                // Stricter check (Optional): Ensure no *other* cells were changed from the initial state
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        if (r === targetRow && c === targetCol) continue; // Skip the target cell
                        if (currentGrid[r][c] !== initialBoardState[r][c]) {
                            console.log("[Training] Incorrect: Other cells were modified.");
                            isComplete = false; // Failed strict check
                            // Maybe flash error on the incorrect cell (r, c)?
                            // this.ui.showBoardError(r,c);
                            break;
                        }
                    }
                    if (!isComplete) break;
                }
            } else {
                // console.log(`[Training] Placement check failed: Expected ${targetStep.value} at [${targetRow},${targetCol}], found ${placedValue}`);
            }

        } else if (targetStep.eliminations && targetStep.eliminations.length > 0) {
            // --- Elimination Technique Verification ---
            isComplete = true; // Assume complete initially
            const initialMarks = this.currentState.initialPencilMarks;

            // 1. Check if all expected eliminations *are* gone
            for (const elim of targetStep.eliminations) {
                const [r, c] = elim.cell;
                for (const val of elim.values) {
                    // Check if the candidate is *now* absent (currentMarks[r][c][val-1] is false)
                    if (currentMarks[r][c][val - 1]) {
                        console.log(`[Training] Elimination check failed: Candidate ${val} still present at [${r},${c}].`);
                        isComplete = false;
                        break;
                    }
                }
                if (!isComplete) break;
            }

            // 2. Stricter check (Optional): Ensure no *other* pencil marks were changed
            if (isComplete) {
                for (let r = 0; r < BOARD_SIZE; r++) {
                    for (let c = 0; c < BOARD_SIZE; c++) {
                        for (let val = 1; val <= BOARD_SIZE; val++) {
                            const isTargetElimination = targetStep.eliminations.some(elim =>
                                elim.cell[0] === r && elim.cell[1] === c && elim.values.includes(val)
                            );
                            // If it's NOT a target elimination, its state should match the initial state
                            if (!isTargetElimination && currentMarks[r][c][val - 1] !== initialMarks[r][c][val - 1]) {
                                console.log(`[Training] Incorrect: Non-target pencil mark ${val} at [${r},${c}] was changed.`);
                                isComplete = false;
                                // Maybe flash error on the specific pencil mark?
                                // this.ui.showPencilMarkError(r, c, val);
                                break;
                            }
                        }
                        if (!isComplete) break;
                    }
                    if (!isComplete) break;
                }
            }
        }

        // --- Handle Completion ---
        if (isComplete) {
            console.log(`[Training] Technique ${targetStep.technique} completed!`);
            this.currentState.isTrainingActive = false; // Mark as inactive AFTER check
            triggerMiniConfetti(); // Celebrate!
            this._resetHintState(); // Clear hint visuals

            // OPTIONAL: reapply to stage 2 (without candidates)
            this.ui.applyHintHighlight(targetStep.highlights, false); // Show cells only

            // Re-enable the 'Next' button and disable the board/numpad until next puzzle requested
            this._disableInteraction(); // Disable board input etc.
            const nextButton = document.getElementById('next-training-puzzle');
            if (nextButton) {
                nextButton.disabled = false; // Explicitly enable Next
                nextButton.focus(); // Focus the next button
            }
        } else {
            // console.log("[Training] Step not yet complete.");
        }
    }

    // --- Callback 
    _getUICallbacks() {
        const game = this; 
        return {
            onCellClick: (row, col) => game._setSelectedCell(row, col),
            onClickOutside: () => {
                game._setSelectedCell(null, null);
            },
            onNumberInput: (num) => game._handleCellInput(num),
            onKeydown: (event) => game._handleKeydown(event),
            onModeToggleRequest: (mode) => game._setMode(mode),
            // onPauseToggle: null,
            // onAutoMarkRequest: null,
            onHintRequest: () => game._handleHintRequest(),
            onUndoRequest: () => game._undo(),
            onResetRequest: () => game._resetTrainingBoard(),
            onTechniqueSelect: (techniqueValue) => game.startTraining(techniqueValue),
            onNextPuzzleRequest: () => game.requestNextPuzzle(),
            onResize: () => game._detectPlatform(),

            onSettingsOpen: () => game.ui.showSettingsPanel(),
            onSettingsSave: () => { // Save only settings if needed
                game.ui.hideSettingsPanel();
                // Persistence.saveSettings(game.currentState.settings); // Example
            },
            onSettingChange: (settingName, value) => {
                if (game.currentState.settings.hasOwnProperty(settingName)) {
                    game.currentState.settings[settingName] = value;
                    console.log(`[Training] Setting ${settingName} changed to ${value}`);
                    // Apply immediate UI changes if necessary
                }
            },
            onExportRequest: () => console.warn("[Training] Export not implemented."),
            onLoadRequest: () => console.warn("[Training] Load not implemented."),
        };
    }

    _handleKeydown(event) {
        const key = event.key;
        const isCtrl = event.ctrlKey || event.metaKey;

        // --- Hint Reset Logic ---
        const keysToIgnoreForReset = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'F5', 'F12', 'Tab'];
        const isModifierOnly = ['Shift', 'Control', 'Alt', 'Meta'].includes(key);
        const isKnownShortcut = isCtrl && ['c', 'v', 'x', 'z', 'y'].includes(key.toLowerCase()); // Removed training irrelevant shortcuts
        const shouldResetHint = !isModifierOnly && !keysToIgnoreForReset.includes(key) && !isKnownShortcut;

        if (shouldResetHint && this.currentState.mode !== Modes.FOCUS) { // Don't reset hint if just toggling focus
            this._resetHintStateIfNeeded();
        }

        // --- Prevent Default Actions ---
        // Basic prevention (Space scroll, Arrows if cell selected, Backspace nav)
        if (key === ' ' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)) {
            event.preventDefault();
        }
        if (key.startsWith('Arrow') && this.currentState.selectedRow !== null) {
            event.preventDefault();
        }
        // Prevent backspace only if not in an input field
        if ((key === 'Backspace' || key === 'Delete') && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)) {
            if (this.currentState.selectedRow !== null) { // Prevent if cell selected too
                event.preventDefault();
            }
        }

        // --- Global/Mode Shortcuts ---
        // No Undo/Redo/AutoMark shortcuts needed for now
        if (key.toLowerCase() === 'm' && !isCtrl) { this._setMode(Modes.MARKING); return; }
        if (key.toLowerCase() === 'f' && !isCtrl) { this._setMode(Modes.FOCUS); return; } // <-- ADDED FOCUS TOGGLE
        if (key === 'Escape') {
            event.preventDefault();
            this._resetHintState(); // Reset hint always on Escape
            if (this.currentState.mode === Modes.FOCUS) {
                this._setMode(Modes.NORMAL); // Exit focus mode first
            } else if (this.currentState.mode === Modes.MARKING) {
                this._setMode(Modes.NORMAL); // Exit marking mode
            } else if (this.currentState.selectedRow !== null) {
                this._setSelectedCell(null, null); // Deselect cell if in normal mode
            }
            return;
        }
        // No Pause shortcut needed

        // --- Persistent Focus Mode Keyboard Input (Adapted from game.js) ---
        if (this.currentState.mode === Modes.FOCUS) {
            // Pass focus key presses to _handleCellInput logic
            if (key >= '1' && key <= '9') {
                this._handleCellInput(parseInt(key, 10));
                return; // Consume key press
            } else if (key === 'Backspace' || key === 'Delete') {
                this._handleCellInput(0); // 0 signals clear focus
                return; // Consume key press
            }
            // Allow arrow keys for navigation even in focus mode
            if (key.startsWith('Arrow')) {
                // Arrow key navigation logic extracted for reuse
                this._handleArrowNavigation(key);
                return; // Consume arrow key
            }
            // Ignore other keys while in focus mode? Or let them pass? Let's ignore for now.
            console.log("[Training] Key ignored in Focus Mode:", key);
            return;
        }

        // --- Cell Input / Navigation (Requires cell selection, NOT in Focus Mode) ---
        const { selectedRow, selectedCol } = this.currentState;

        // Handle Arrow Key Navigation (if cell is selected)
        if (key.startsWith('Arrow')) {
            if (selectedRow !== null) {
                this._handleArrowNavigation(key);
            } else { // If no cell selected, select 0,0 on first arrow press
                this._setSelectedCell(0, 0);
            }
            return; // Navigation handled
        }

        // If no cell selected after checking arrows, ignore remaining input keys
        if (selectedRow === null || selectedCol === null) return;

        // Handle Number/Delete Input (Cell selected, NOT in Focus Mode)
        if (key >= '1' && key <= '9') {
            this._handleCellInput(parseInt(key, 10));
        }
        else if (key === 'Backspace' || key === 'Delete' || key === '0') {
            this._handleCellInput(0); // 0 signals erase in Normal/Marking
        }
    }

    // Helper for arrow key navigation
    _handleArrowNavigation(key) {
        const { selectedRow, selectedCol } = this.currentState;
        // If nothing selected, start at 0,0 (handled in _handleKeydown)
        let nextRow = selectedRow !== null ? selectedRow : 0;
        let nextCol = selectedCol !== null ? selectedCol : 0;

        if (key === 'ArrowUp' && nextRow > 0) nextRow--;
        else if (key === 'ArrowDown' && nextRow < BOARD_SIZE - 1) nextRow++;
        else if (key === 'ArrowLeft' && nextCol > 0) nextCol--;
        else if (key === 'ArrowRight' && nextCol < BOARD_SIZE - 1) nextCol++;

        // Only update selection if it actually changed
        if (nextRow !== selectedRow || nextCol !== selectedCol) {
            this._setSelectedCell(nextRow, nextCol);
        }
    }

    // --- HINT SYSTEM LOGIC (Adapted for Training) ---
    _resetHintState() {
        // Only reset the stage and clear board visuals
        // Keep the technique name displayed if provided by UI separately
        if (this.currentState.hintStage !== 0) {
            console.log("[Training] Resetting hint visuals.");
            this.currentState.hintStage = 0;
            // currentHintStep is not used in the same way, maybe clear it too
            this.currentState.currentHintStep = null;
            this.ui.clearHintHighlight(false); // false = don't clear technique text display
        }
    }

    _resetHintStateIfNeeded() {
        // Reset if currently showing hints (stage > 0) and an action occurs
        if (this.currentState.hintStage > 0) {
            console.log("[Training] Resetting hint visuals due to new action.");
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
        const highlights = targetStep.highlights; // Assumes highlights are always present in targetStep
        const currentStage = this.currentState.hintStage;

        // --- Progression Logic (Starts from Stage 0 -> 2) ---
        if (currentStage === 0) {
            // --- Stage 0 -> 2: Show Cells ---
            if (!highlights || highlights.length === 0) {
                console.warn("[Training] Hint error: Target step has no highlights defined.");
                this._resetHintState();
                this.ui.displayHintTechnique("Hint unavailable"); // Show error
                return;
            }
            console.log("[Training] Hint Stage 0 -> 2: Highlighting cells...");
            this.ui.applyHintHighlight(highlights, false); // false = cells only
            this.currentState.hintStage = 2;
            // Technique name (from targetStep.technique) should ideally be shown by UI

        } else if (currentStage === 2) {
            // --- Stage 2 -> 3: Show Candidates/Value ---
            if (!highlights || highlights.length === 0) {
                console.warn("[Training] Hint error at stage 2: Target step has no highlights defined.");
                this._resetHintState(); return;
            }
            console.log("[Training] Hint Stage 2 -> 3: Highlighting candidates/value...");
            // Pass the full targetStep to applyHintHighlight so it can check .value for placement hints
            this.ui.applyHintHighlight(highlights, true, targetStep); // true = show candidates/value
            this.currentState.hintStage = 3;

        } else if (currentStage === 3) {
            // --- Stage 3 -> 0: Reset ---
            console.log("[Training] Hint Stage 3 -> 0: Resetting hint visuals.");
            this._resetHintState(); // Clicking again resets visuals
        }
    }

    _addUndoState() {
        // Only save state if training is active and a target step exists
        if (!this.currentState.isTrainingActive || !this.currentState.targetStep) {
            return;
        }
        // Create a deep copy of the grid and pencil marks
        const state = {
            grid: deepCopy2DArray(this.board.getGrid()),
            pencilMarks: this.board.getAllPencilMarks().map(row => row.map(cellMarks => [...cellMarks])),
            // We don't need to save hint/focus state for simple board undo in training
        };
        this.undoStack.push(state);
        if (this.undoStack.length > MAX_UNDO_STEPS) {
            this.undoStack.shift(); // Remove the oldest state
        }
        // No redo stack clear needed unless implementing redo
        // Update UI button state (e.g., enable undo button)
        this.ui.updateUndoRedoButtons(this.undoStack.length > 0, false); 
        console.log("[Training] Undo state added. Stack size:", this.undoStack.length);
    }

    _undo() {
        if (!this.currentState.isTrainingActive || this.undoStack.length === 0) {
            console.log("[Training] Undo ignored: Training inactive or stack empty.");
            return; // Cannot undo if training isn't active or stack is empty
        }

        const previousState = this.undoStack.pop();

        // Restore the board state
        this.board.setGrid(previousState.grid); // Assumes setGrid uses the provided array directly
        this.board.setAllPencilMarks(previousState.pencilMarks); // Assumes setAllPencilMarks uses the provided array

        console.log("[Training] Undo performed. Stack size:", this.undoStack.length);

        // Update everything: board display, highlights (will be cleared/reapplied), numpad
        this._updateUI();

        // Update UI button state
        this.ui.updateUndoRedoButtons(this.undoStack.length > 0, false);
    }

    // --- Reset Board Logic ---
    _resetTrainingBoard() {
        // Check if there's actually a state to reset to
        if (!this.currentState.initialBoardState || !this.currentState.initialPencilMarks) {
            console.warn("[Training] Cannot reset: Initial state not available.");
            return;
        }

        // Check if the board is already in the initial state to avoid unnecessary resets/confirmations
        const currentGrid = this.board.getGrid();
        const currentMarks = this.board.getAllPencilMarks();
        let isChanged = false;
        if (JSON.stringify(currentGrid) !== JSON.stringify(this.currentState.initialBoardState) ||
            JSON.stringify(currentMarks) !== JSON.stringify(this.currentState.initialPencilMarks)) {
            isChanged = true;
        }

        if (!isChanged) {
            console.log("[Training] Board is already in initial state. Reset skipped.");
            // Optionally show a brief message?
            return;
        }


        // Show confirmation dialog
        this.ui.showConfirm("Reset this step to the beginning?", () => {
            console.log("[Training] Resetting board to initial step state.");

            // Restore the initial grid and pencil marks
            this.board.setGrid(this.currentState.initialBoardState); // Use initial state
            this.board.setAllPencilMarks(this.currentState.initialPencilMarks); // Use initial marks

            // Clear undo stack for this puzzle attempt
            this.undoStack = [];
            // this.redoStack = []; // Clear redo if implemented

            // Reset UI states
            this._setSelectedCell(null, null); // Deselect cell
            this.currentState.focusedDigits.clear(); // Clear focus highlights
            this._resetHintState(); // Reset hint progression
            this.currentState.isTrainingActive = true; // Ensure training is marked active after reset

            // Update UI to show the reset board
            this._updateUI();

            // Update undo/redo button states (disabled)
            this.ui.updateUndoRedoButtons(false, false);

            // Re-enable interaction if it was disabled upon completion
            this._enableInteraction();

        }, () => {
            console.log("[Training] Reset cancelled.");
        });
    }

    _detectPlatform() { // Reused from game.js
        this.currentState.platform = window.innerWidth < 768 ? Platform.Mobile : Platform.Desktop;
        document.body.classList.toggle('is-mobile', this.currentState.platform === Platform.Mobile);
        document.body.classList.toggle('is-desktop', this.currentState.platform === Platform.Desktop);
    }
}
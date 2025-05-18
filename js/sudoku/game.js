// js/sudoku/game.js
import { SudokuBoard } from './board.js'; // Correct path if board.js is in the same folder
import { SudokuUI } from './ui.js';
import { Timer } from './timer.js';
import * as SolverAdvanced from './solver_advanced.js';
import * as Persistence from './persistence.js';
import { copyToClipboard, getPeers } from './utils.js';
import { DifficultyLevel, Modes, Platform, BOARD_SIZE } from './constants.js';
import { checkInputValid, findNextEmptyCell, deepCopy2DArray } from './utils.js';
import { celebrate, isNumberSetComplete, triggerMiniConfetti } from './confetti.js';

const MAX_UNDO_STEPS = 50;

export class SudokuGame {
    constructor() {
        this.board = new SudokuBoard();
        this.ui = new SudokuUI(this._getUICallbacks());
        this.timer = new Timer((time) => this.ui.updateTimer(time));

        this.currentState = {
            mode: Modes.NORMAL,
            difficulty: DifficultyLevel.EASY,
            platform: Platform.Desktop,
            selectedRow: null,
            selectedCol: null,
            isPaused: false,
            focusedDigits: new Set(), // New: For persistent focus mode
            settings: {
                autoPencilMarks: true,
                saveDifficulty: true,
                showHintAlert: true,
            },
            // --- NEW Hint State ---
            hintStage: 0, // 0: inactive, 1: technique name, 2: cells, 3: candidates
            currentHintStep: null, // Stores the result from solveSingleStep
        };

        this.undoStack = [];
        this.redoStack = [];
        this.saveInterval = null;

        this.generationWorker = null;
        this._initializeWorker();

        this._initializeGame();
    }

    // WORKER for puzzle generation
    _initializeWorker() {
        if (window.Worker) {
            console.log("Initializing generation worker...");
            try {
                this.generationWorker = new Worker(new URL('./sudoku_generator.worker.js', import.meta.url), { type: 'module' });

                this.generationWorker.onmessage = (event) => {
                    this._handleWorkerMessage(event.data);
                };

                this.generationWorker.onerror = (error) => {
                    console.error("Error initializing generation worker:", error.message, error);
                    alert(`Failed to load the puzzle generator component. Please try reloading the page. Error: ${error.message}`);
                    this.ui.hideLoading();
                };
                console.log("Generation worker initialized.");

            } catch (err) {
                console.error("Caught error creating worker:", err);
                alert(`Failed to create the puzzle generator. This might be due to browser settings or extensions. Error: ${err.message}`);
                this.generationWorker = null;
            }

        } else {
            console.error("Web Workers are not supported in this browser.");
            alert("Sorry, your browser doesn't support a feature required for puzzle generation.");
        }
    }

    _handleWorkerMessage(data) {
        console.log("Received message from worker:", data);
        switch (data.type) {
            case 'progress':
                this.ui.updateLoadingProgress(data.current, data.total, data.difficulty);
                break;
            case 'result':
                this.ui.hideLoading();
                const result = data.payload;
                if (result && result.puzzle) {
                    console.log(`[Main] Worker successfully generated ${result.difficulty} board.`);
                    this.board.clearBoard();
                    this.board.setGrid(result.puzzle, true);
                    // We might not get the solution back if not needed, adapt if you send it
                    // this.board.setSolution(result.solution);
                    this._setSelectedCell(null, null);
                    this._startTimerAndUnpause();
                    this._updateUI();
                    this.ui.updateUndoRedoButtons(false, false);
                    this.startAutoSave();
                    this._saveGame();
                } else {
                    console.error("[Main] Worker sent invalid result:", result);
                    alert("The generator returned an invalid result. Please try again.");
                    this.board.clearBoard();
                    this._updateUI();
                    this.timer.pause();
                    this.currentState.isPaused = true;
                    this.ui.updatePauseButton(true);
                }
                break;
            case 'error':
                this.ui.hideLoading();
                console.error("[Main] Worker reported error:", data.message);
                alert(`Failed to generate puzzle: ${data.message}`);
                this.board.clearBoard();
                this._updateUI();
                this.timer.pause();
                this.currentState.isPaused = true;
                this.ui.updatePauseButton(true);
                break;
            default:
                console.warn("[Main] Received unknown message type from worker:", data.type);
        }
    }

    _initializeGame() {
        console.log("Initializing Sudoku Game...");
        this._detectPlatform();
        this._resetHintState(); // Ensure hints are reset on load/new game

        let successfullyLoaded = false;
        const urlHash = window.location.hash;

        // --- Try loading from URL Hash first ---
        if (urlHash && urlHash.length > 1) {
            const encodedString = urlHash.substring(1);
            console.log("Attempting to load state from URL hash:", encodedString);
            const decodedState = Persistence.importGameState(encodedString);

            if (decodedState) {
                console.log("Successfully decoded state from URL hash.");
                this.board.setGrid(decodedState.grid);
                this.board.setInitialGrid(decodedState.initialGrid);
                this.board.setAllPencilMarks(decodedState.pencilMarks);
                this.currentState.difficulty = decodedState.difficulty;

                // Settings are not typically in hash, keep defaults or load from localStorage below

                this.timer.reset();
                this.timer.start(decodedState.elapsedTime);
                // Load settings from localStorage *after* potentially loading board from hash
                const loadedSettings = Persistence.loadSettings(); // Assume a function to load only settings
                if (loadedSettings) {
                    this.currentState.settings = loadedSettings;
                }
                this.ui.applySettings(this.currentState.settings); // Apply potentially loaded settings
                this.ui.updateDifficultyButton(this.currentState.difficulty);
                this._updateUI();

                successfullyLoaded = true;
                history.replaceState(null, null, window.location.pathname + window.location.search);
                console.log("URL hash cleared after successful load.");

            } else {
                console.warn("Failed to decode state from URL hash. Falling back to localStorage/new game.");
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        }

        // --- If not loaded from URL, try localStorage ---
        if (!successfullyLoaded) {
            const loadedData = Persistence.loadGameState(); // Assumes this loads board, time, difficulty, AND settings
            if (loadedData) {
                console.log("Loading saved state from localStorage...");
                this.board.setGrid(loadedData.grid);
                this.board.setInitialGrid(loadedData.initialGrid);
                this.board.setAllPencilMarks(loadedData.pencilMarks);
                this.currentState.difficulty = loadedData.difficulty;
                this.currentState.settings = loadedData.settings; // Load settings from localStorage save
                this.timer.start(loadedData.elapsedTime);
                this.ui.applySettings(this.currentState.settings);
                this.ui.updateDifficultyButton(this.currentState.difficulty);
                successfullyLoaded = true;
            }
        }

        // --- If nothing loaded, generate a new board ---
        if (!successfullyLoaded) {
            console.log("No valid state found, generating new board...");
            // Load default/saved settings even for a new game
            const loadedSettings = Persistence.loadSettings();
            if (loadedSettings) {
                this.currentState.settings = loadedSettings;
            }
            this._generateNewBoard(this.currentState.difficulty); // Generates board, starts timer
            this.ui.applySettings(this.currentState.settings); // Apply default/loaded settings to UI
            this.ui.updateDifficultyButton(this.currentState.difficulty);
        }

        this._updateUI(); // Draw the newly generated board state if needed

        // log difficulty and settings
        console.log("Current difficulty:", this.currentState.difficulty);
        this.startAutoSave();
        console.log("Game Initialized.");
    }

    _detectPlatform() {
        this.currentState.platform = window.innerWidth < 768 ? Platform.Mobile : Platform.Desktop;
        console.log("Platform detected:", this.currentState.platform === Platform.Mobile ? "Mobile" : "Desktop");
        document.body.classList.toggle('is-mobile', this.currentState.platform === Platform.Mobile);
        document.body.classList.toggle('is-desktop', this.currentState.platform === Platform.Desktop);
    }

    startAutoSave(interval = 5000) {
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.saveInterval = setInterval(() => {
            this._saveGame();
        }, interval);
        console.log(`Auto-save started every ${interval / 1000}s`);
    }

    stopAutoSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
            console.log("Auto-save stopped.");
        }
    }

    _saveGame() {
        const gameStateToSave = {
            board: this.board, // board class handles getting its own data structure
            difficulty: this.currentState.difficulty,
            elapsedTime: this.timer.getElapsedTime(),
            settings: this.currentState.settings
        };
        Persistence.saveGameState(gameStateToSave); // Assumes saveGameState saves everything including settings
    }

    _generateNewBoard(difficultyValue) {
        if (!this.generationWorker) {
            alert("Puzzle generator is not available. Cannot create a new board.");
            console.error("Attempted to generate board but worker is not initialized.");
            return;
        }

        this.stopAutoSave();
        this.timer.reset();
        this.undoStack = [];
        this.redoStack = [];
        this.currentState.focusedDigits.clear();
        this.ui.updateUndoRedoButtons(this.undoStack.length > 0, false); 

        console.log(`[Main] Requesting new board from worker: ${difficultyValue}`);

        // Show Loading Indicator 
        const maxAttempts = 100;
        this.ui.showLoading(`1 of ${maxAttempts}`);

        // Send message to worker to start generation
        this.generationWorker.postMessage({
            type: 'generate',
            difficulty: difficultyValue,
            maxAttempts: maxAttempts
        });

        console.log("[Main] Generation request sent to worker.");
    }

    // --- State Update and UI Sync ---
    _updateUI() {
        this.ui.displayBoard({
            grid: this.board.getGrid(),
            initialGrid: this.board.getInitialGrid(),
            pencilMarks: this.board.getAllPencilMarks()
        });
        this.ui.updateModeButtons(this.currentState.mode);
        this.ui.updateDifficultyButton(this.currentState.difficulty);
        this.ui.updatePauseButton(this.currentState.isPaused);
        this.ui.selectCell(this.currentState.selectedRow, this.currentState.selectedCol, null, null); // Reselect cell visualization
        this._updateNumPadVisibility();

        // --- Handle Highlights ---
        // this.ui.clearHintHighlight(); // Clear hint highlights on general UI update
        // new: only clear hint highlights if the hint state is inactive
        if (this.currentState.hintStage === 0) {
            this.ui.clearHintHighlight(); // Clear visual board highlights
            this.ui.clearHintTechnique(); // Clear text display
        } else {
            this._reapplyHintVisuals();
        }

        if (this.currentState.mode === Modes.FOCUS) {
            this.ui.applyFocusHighlight(this.currentState.focusedDigits); // Apply persistent focus highlights
        } else {
            // Apply auto-focus based on selected cell in Normal mode
            const { selectedRow, selectedCol } = this.currentState;
            if (selectedRow !== null && selectedCol !== null) {
                const value = this.board.getValue(selectedRow, selectedCol);
                if (value > 0) {
                    this.ui.applyFocusHighlight(value);
                } else {
                    this.ui.clearFocusHighlight();
                }
            } else {
                this.ui.clearFocusHighlight();
            }
        }

        this._updateNumPadVisibility(); // Update numpad visibility based on current state
    }

    _setSelectedCell(row, col) {
        // Reset hint if a hint was active and user clicks *somewhere else*
        // (Don't reset if they click *on* a highlighted hint cell, perhaps?)
        // Simple approach: reset on any new cell selection.
        // this._resetHintStateIfNeeded(); // Reset if a hint was active

        const prevRow = this.currentState.selectedRow;
        const prevCol = this.currentState.selectedCol;
        if (row === prevRow && col === prevCol) return;

        this.currentState.selectedRow = row;
        this.currentState.selectedCol = col;

        // Update UI for cell selection itself (e.g., background color)
        this.ui.selectCell(row, col, prevRow, prevCol);
        this._updateUI(); // Call full UI update to handle highlights and numpad correctly
    }

        _updateNumPadVisibility() {
            const { selectedRow, selectedCol, mode } = this.currentState;
    
            // --- Handle FOCUS mode separately - Always enable focus toggling ---
            if (mode === Modes.FOCUS) {
                const validInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                const canErase = true; // Erase button clears focus
                // Pass mode, but tell UI numpad it doesn't matter if cell is selected/prefilled for enabling buttons
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
            const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);
            let validInputs = [];
            let canErase = false;
    
            if (mode === Modes.MARKING) {
                // Marking Mode: Enable 1-9 and Erase if not prefilled
                if (!isPrefilled) {
                    validInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    canErase = this.board.getPencilMarksForCell(selectedRow, selectedCol).some(mark => mark); // Only enable erase if marks exist? Or always? Let's say if marks exist.
                    // Or always allow erase? canErase = true;
                } else {
                    // Prefilled cell: Can't mark/erase marks
                    validInputs = [];
                    canErase = false;
                }
                this.ui.updateNumPad(validInputs, canErase, true, isPrefilled, mode);
    
            } else { // NORMAL Mode
                // Normal Mode: Enable valid numbers and Erase if not prefilled
                if (!isPrefilled) {
                    const currentGrid = this.board.getGrid();
                    for (let num = 1; num <= BOARD_SIZE; num++) {
                        // Consider just enabling all 1-9 and let input handler show error?
                        // Or enable only valid ones:
                        // if (checkInputValid(currentGrid, selectedRow, selectedCol, num)) {
                        //     validInputs.push(num);
                        // }
                        // Let's enable all 1-9 for faster input, error shown on invalid press
                        validInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    }
                    canErase = this.board.getValue(selectedRow, selectedCol) !== 0;
                } else {
                    // Prefilled cell: Can't input/erase
                    validInputs = [];
                    canErase = false;
                }
                this.ui.updateNumPad(validInputs, canErase, false, isPrefilled, mode);
            }
        }

    _setMode(newMode) {
        this._resetHintStateIfNeeded(); // Reset hint on mode change

        const oldMode = this.currentState.mode;
        let targetMode = newMode;

        if (oldMode === newMode && newMode !== Modes.NORMAL) {
            // Clicking the same mode button again toggles it off (back to NORMAL)
            targetMode = Modes.NORMAL;
        }
        // Allow switching directly between MARKING and FOCUS? Yes.
        this.currentState.mode = targetMode;
        const currentMode = this.currentState.mode;

        console.log("Mode changed from", oldMode, "to:", currentMode);

        // --- Handle Focus Mode State Transitions ---
        if (oldMode === Modes.FOCUS && currentMode !== Modes.FOCUS) {
            console.log("Exiting Focus Mode: Clearing focused digits and persistent highlights.");
            // Don't clear the set here if we want it to persist when temporarily switching
            // Let's *keep* the focusedDigits set, but clear the *visual* highlights.
            // The highlights will be reapplied if Focus Mode is re-entered.
            // this.currentState.focusedDigits.clear(); // Keep the set populated
            this.ui.clearFocusHighlight(); // Clear visual highlights only
        }
        // No special action needed *entering* focus mode here, _updateUI handles it.

        // --- General UI Update ---
        this._updateUI(); // Updates button styles, highlights, and numpad
    }


    _cycleDifficulty() {
        // Make sure this cycles through DifficultyLevel values/keys
        const difficulties = Object.values(DifficultyLevel).filter(d => d !== DifficultyLevel.UNKNOWN); // Get actual level values
        const currentIndex = difficulties.indexOf(this.currentState.difficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        this.currentState.difficulty = difficulties[nextIndex]; // Set the actual level value

        //log
        console.log("Difficulty changed to:", this.currentState.difficulty);
        this.ui.updateDifficultyButton(this.currentState.difficulty); // UI needs to handle displaying the string
        if (this.currentState.settings.saveDifficulty) {
            this._saveGame();
            //  Persistence.saveSettings(this.currentState.settings); // Save only settings on difficulty change if needed
        }
    }

    _handleCellInput(value) {
        const { mode } = this.currentState; // Get mode first

        // --- FOCUS Mode Input (Overrides regular input, works even without cell selection) ---
        if (mode === Modes.FOCUS) {
            // Reset hint state if focus is changed
            this._resetHintStateIfNeeded();

            if (value >= 1 && value <= BOARD_SIZE) {
                // Toggle focus for the digit
                const digit = value;
                if (this.currentState.focusedDigits.has(digit)) {
                    this.currentState.focusedDigits.delete(digit);
                } else {
                    this.currentState.focusedDigits.add(digit);
                }
                console.log("Toggled focus digit:", digit, " | Current focus:", Array.from(this.currentState.focusedDigits));
                // Update visual highlights immediately
                this.ui.applyFocusHighlight(this.currentState.focusedDigits);
            } else if (value === 0) { // Erase button (or Backspace/Delete) in focus mode
                // Clear *all* focused digits
                if (this.currentState.focusedDigits.size > 0) {
                    console.log("Clearing all focused digits.");
                    this.currentState.focusedDigits.clear();
                    this.ui.clearFocusHighlight(); // Update UI
                }
            }
            // Update the numpad state after focus change
            this._updateNumPadVisibility();
            return; // Important: Focus mode input handled, stop here.
        }

        // --- For Normal/Marking modes, require a selected cell ---
        const { selectedRow, selectedCol } = this.currentState; // Get selection state now
        if (selectedRow === null || selectedCol === null) {
            console.log("Input ignored: No cell selected (and not in Focus Mode).");
            return; // No cell selected, and not in focus mode, do nothing.
        }

        // Reset hint state on *any* input action that modifies the board
        this._resetHintStateIfNeeded();

        const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);

        // --- MARKING Mode Input ---
        if (mode === Modes.MARKING) {
            if (isPrefilled) {
                console.log("Cannot place pencil marks in prefilled cell.");
                this.ui.showBoardError(selectedRow, selectedCol);
                return;
            }
            if (value === 0) { // Erase in marking mode clears marks for the cell
                if (this.board.getPencilMarksForCell(selectedRow, selectedCol).some(mark => mark)) {
                    this._addUndoState();
                    this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                    this._updateUI();
                }
            } else if (value >= 1 && value <= BOARD_SIZE) { // Toggle mark
                this._addUndoState();
                this.board.togglePencilMark(selectedRow, selectedCol, value);
                this._updateUI();
            }
            return; // Stop processing after marking input
        }

        // --- NORMAL Mode Input ---
        // (isPrefilled check remains relevant)
        if (isPrefilled) {
            console.log("Cannot change prefilled cell.");
            this.ui.showBoardError(selectedRow, selectedCol);
            return;
        }

        const currentValue = this.board.getValue(selectedRow, selectedCol);

        if (value === 0) { // Erasing number
            if (currentValue !== 0) {
                this._addUndoState();
                this.board.setValue(selectedRow, selectedCol, 0);
                this._updateUI();
            }
        } else if (value >= 1 && value <= BOARD_SIZE) { // Placing number
            if (currentValue === value) return; // No change

            if (checkInputValid(this.board.getGrid(), selectedRow, selectedCol, value)) {
                this._addUndoState();
                this.board.setValue(selectedRow, selectedCol, value);

                if (this.currentState.settings.autoPencilMarks) {
                    this._updateAffectedPencilMarks(selectedRow, selectedCol, value);
                }

                this._updateUI();

                if (isNumberSetComplete(this.board.getGrid(), value)) {
                    triggerMiniConfetti();
                }
                if (!findNextEmptyCell(this.board.getGrid())) {
                    this._handleWin();
                }
            } else {
                console.log(`Invalid move: ${value} at [${selectedRow}, ${selectedCol}]`);
                this.ui.showBoardError(selectedRow, selectedCol);
            }
        }
    }

    _handleWin() {
        this._resetHintState(); // Clear hint on win
        console.log("Congratulations! Board Solved!");
        this.timer.pause();
        this.currentState.isPaused = true; // Reflect pause state
        this._setSelectedCell(null, null); // Deselect
        // this.ui.updatePauseButton(true);
        // this.ui.clearFocusHighlight(); // Clear any focus
        // this.ui.clearHintHighlight(); // Clear any hints
        celebrate();
    }

    _updateAffectedPencilMarks(row, col, placedValue) {
        const peers = getPeers(row, col);
        peers.forEach(([r, c]) => {
            if (this.board.getValue(r, c) === 0) {
                this.board.setPencilMark(r, c, placedValue, false);
            }
        });
        this.board.clearPencilMarksForCell(row, col);
    }

    _autoFillPencilMarks() {
        this._resetHintStateIfNeeded();
        console.log("Auto-filling pencil marks...");
        this._addUndoState();
        const currentGrid = this.board.getGrid();
        let changed = false;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const currentCellValue = currentGrid[r][c];
                if (currentCellValue === 0) {
                    const currentMarksInCell = this.board.getPencilMarksForCell(r, c);
                    const newMarks = new Array(BOARD_SIZE).fill(false);
                    let cellChanged = false;
                    for (let num = 1; num <= BOARD_SIZE; num++) {
                        if (checkInputValid(currentGrid, r, c, num)) {
                            newMarks[num - 1] = true;
                        }
                    }
                    // Compare new marks with existing ones
                    for (let i = 0; i < BOARD_SIZE; i++) {
                        if (currentMarksInCell[i] !== newMarks[i]) {
                            this.board.setPencilMark(r, c, i + 1, newMarks[i]);
                            cellChanged = true;
                        }
                    }
                    if (cellChanged) changed = true;

                } else {
                    // Clear marks from filled cells if they have any
                    if (this.board.getPencilMarksForCell(r, c).some(mark => mark)) {
                        this.board.clearPencilMarksForCell(r, c);
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            this._updateUI();
        } else {
            console.log("No pencil marks needed changing.");
            this.undoStack.pop(); // No change, remove undo state
        }
    }


    _clearAllPencilMarks() {
        this._resetHintStateIfNeeded();
        let hasMarks = false;
        // Efficiently check if any marks exist
        outerLoop:
        for (let r = 0; r < BOARD_SIZE; ++r) {
            for (let c = 0; c < BOARD_SIZE; ++c) {
                if (this.board.getValue(r, c) === 0 && this.board.getPencilMarksForCell(r, c).some(mark => mark)) {
                    hasMarks = true;
                    break outerLoop;
                }
            }
        }

        if (hasMarks) {
            this.ui.showConfirm("Clear all pencil marks?", () => {
                this._addUndoState();
                this.board.clearAllPencilMarks();
                this._updateUI();
            });
        } else {
            console.log("No pencil marks to clear. Auto-filling instead.");
            this._autoFillPencilMarks(); // Auto-fill if none exist
        }
    }

    // --- Undo/Redo ---
    _addUndoState() {
        const state = {
            grid: this.board.getGrid(),
            pencilMarks: this.board.getAllPencilMarks(),
            // --- Store Hint State for Undo ---
            hintStage: this.currentState.hintStage,
            currentHintStep: this.currentState.currentHintStep ? JSON.parse(JSON.stringify(this.currentState.currentHintStep)) : null // 
        };
        this.undoStack.push(state);
        if (this.undoStack.length > MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }

        this.ui.updateUndoRedoButtons(this.undoStack.length > 0, false); 
        this.redoStack = [];
        // Update UI button state if necessary
    }

    _undo() {
        if (this.undoStack.length === 0) return;
        const previousState = this.undoStack.pop();
        this.board.setGrid(previousState.grid);
        this.board.setAllPencilMarks(previousState.pencilMarks);

        // --- Restore Hint State ---
        this.currentState.hintStage = previousState.hintStage;
        this.currentState.currentHintStep = previousState.currentHintStep;
        console.log("Undo performed.");
        this._updateUI(); // Redraw and update highlights

        // --- Re-apply hint visuals based on restored state ---
        // This is crucial after undo
        if (this.currentState.hintStage === 1) {
            this.ui.clearHintHighlight(); // Clear board visuals
            this.ui.displayHintTechnique(this.currentState.currentHintStep.steps[0].technique);
        } else if (this.currentState.hintStage === 2) {
            this.ui.displayHintTechnique(this.currentState.currentHintStep.steps[0].technique);
            this.ui.applyHintHighlight(this.currentState.currentHintStep.steps[0].highlights, false); // Cells only
        } else if (this.currentState.hintStage === 3) {
            this.ui.displayHintTechnique(this.currentState.currentHintStep.steps[0].technique);
            this.ui.applyHintHighlight(this.currentState.currentHintStep.steps[0].highlights, true); // Cells and candidates
        } else {
            // If stage is 0, _updateUI would have already cleared everything.
            this.ui.clearHintHighlight();
            this.ui.clearHintTechnique();
        }

        this.ui.updateUndoRedoButtons(this.undoStack.length > 0, false); 
    }

    // --- UI Callback Getters ---
    _getUICallbacks() {
        return {
            onCellClick: (row, col) => {
                // Clear hint highlights when a cell is clicked
                // this.ui.clearHintHighlight();
                this._setSelectedCell(row, col);
            },
            onClickOutside: () => {
                // Clear hint highlights when clicking outside
                // this.ui.clearHintHighlight();
                this._resetHintStateIfNeeded();
                this._setSelectedCell(null, null);
            },
            onNumberInput: (num) => this._handleCellInput(num), // Already clears hints
            onKeydown: (event) => this._handleKeydown(event),
            onModeToggleRequest: (mode) => this._setMode(mode),
            onPauseToggle: () => {
                const isNowPaused = this.timer.togglePause();
                this.currentState.isPaused = isNowPaused;
                this.ui.updatePauseButton(isNowPaused);
                // Clear highlights when pausing/unpausing
                this._resetHintState();
                // this.ui.clearFocusHighlight();
                // this.ui.clearHintHighlight();
                this._updateUI(); // Redraw board which might hide numbers if needed
            },
            onDifficultyCycle: () => this._cycleDifficulty(),
            onNewGameRequest: () => {
                this.ui.showConfirm("Start a new game?", () => {
                    this._resetHintState();
                    this._generateNewBoard(this.currentState.difficulty);
                });
            },
            onResetRequest: () => {
                this.ui.showConfirm("Reset the board?", () => {
                    this.timer.reset();
                    this._resetHintState();
                    this._addUndoState();
                    this.board.resetToInitial();
                    this.currentState.focusedDigits.clear(); // Clear focus
                    this.undoStack = [];
                    this.redoStack = [];
                    this._startTimerAndUnpause();
                    this._updateUI(); // Redraw, clears highlights
                });
            },
            onSolveRequest: (visual) => { // Kept for full solve, not hint
                this.ui.showConfirm("Show solution? Current state will be overwritten.", async () => {
                    this._resetHintState();
                    this.timer.pause();
                    this.currentState.isPaused = true;
                    this.ui.updatePauseButton(true);
                    this.currentState.focusedDigits.clear(); // Clear focus
                    this.ui.clearFocusHighlight();
                    this.ui.clearHintHighlight();

                    const boardCopy = this.board.getGrid(); // Work on a copy for non-visual solve
                    const initialBoard = this.board.getInitialGrid(); // Needed for some solvers

                    // Use a solver that returns the solved grid
                    // Assuming SolverAdvanced has a 'solve' function now
                    const solveResult = SolverAdvanced.solve(boardCopy, initialBoard); // Adapt as needed

                    if (solveResult.status === 'solved') {
                        console.log("Solving instantly...");
                        this.board.setGrid(solveResult.board); // Apply solution
                        this._updateUI();
                        celebrate();
                        this._handleWin(); // Trigger win state properly
                    } else if (solveResult.status === 'visual_success' && visual) {
                        // If you implement visual solve in SolverAdvanced
                        console.log("Visual solve completed.");
                        this.board.setGrid(solveResult.board);
                        this._updateUI();
                        celebrate();
                        this._handleWin();
                    } else {
                        console.log("No solution found or visual solve failed.");
                        alert("Could not find a solution for the current board.");
                        this._startTimerAndUnpause();
                    }
                });
            },
            onHintRequest: () => this._handleHintRequest(),
            onUndoRequest: () => this._undo(),
            onAutoMarkRequest: () => this._clearAllPencilMarks(),
            onExportRequest: () => {
                const gameStateToExport = {
                    board: this.board,
                    difficulty: this.currentState.difficulty,
                    elapsedTime: this.timer.getElapsedTime()
                };
                const code = Persistence.encodeGameStateToString(gameStateToExport); // Use the new encoder
                if (code) {
                    this.ui.showExportBox(code);
                } else {
                    alert("Error creating export code.");
                }
            },
            onExportConfirm: (code) => {
                copyToClipboard(code);
                this.ui.hideExportBox();
                // Maybe show a temporary "Copied!" message
            },
            onExportConfirmURL: (code) => {
                const currentOrigin = 'https://vxwilson.github.io'
                // const currentOrigin = window.location.origin;
                const baseUrl = currentOrigin + window.location.pathname; // e.g., "https://vxwilson.github.io/sudoku/"
                const shareUrl = `${baseUrl}#${code}`;
                console.log("Shareable URL:", shareUrl);
                copyToClipboard(shareUrl); // Copy the full URL
                this.ui.hideExportBox();
                // Maybe show a temporary "Copied URL!" message
            },
            onLoadRequest: () => {
                this.ui.showLoadBox();
            },
            onLoadConfirm: (code) => {
                // ... (load logic mostly unchanged, but ensure focus/hints cleared)
                this.ui.hideLoadBox();
                const decodedState = Persistence.importGameState(code);
                if (decodedState) {
                    this.ui.showConfirm("Load this board state? Current progress will be lost.", () => {
                        this.stopAutoSave();
                        this._resetHintState();
                        this.timer.reset();
                        this.board.setGrid(decodedState.grid);
                        this.board.setInitialGrid(decodedState.initialGrid);
                        this.board.setAllPencilMarks(decodedState.pencilMarks);
                        this.currentState.difficulty = decodedState.difficulty;
                        // Load settings if available in decodedState, otherwise keep current
                        if (decodedState.settings) { this.currentState.settings = decodedState.settings; }
                        this.currentState.focusedDigits.clear(); // Clear focus

                        this._setSelectedCell(null, null);
                        this.timer.start(decodedState.elapsedTime);
                        this.ui.applySettings(this.currentState.settings);
                        this.ui.updateDifficultyButton(this.currentState.difficulty);
                        this._updateUI(); // Full redraw, clears highlights
                        this.startAutoSave();
                    });
                } else {
                    alert("Invalid or corrupted board code provided.");
                }
            },
            onSettingsOpen: () => this.ui.showSettingsPanel(),
            onSettingsSave: () => {
                this.ui.hideSettingsPanel();
                this._saveGame();
            },
            onSettingChange: (settingName, value) => {
                if (this.currentState.settings.hasOwnProperty(settingName)) {
                    this.currentState.settings[settingName] = value;
                    console.log(`Setting ${settingName} changed to ${value}`);
                    // Auto-pencil mark setting might trigger immediate action if desired
                    // if (settingName === 'autoPencilMarks' && value) {
                    //     this._autoFillPencilMarks();
                    // }
                } else {
                    console.warn(`Setting ${settingName} does not exist.`);
                }
            },
            onResize: () => this._detectPlatform(),
        };
    }

    _startTimerAndUnpause() {
        this.timer.start();
        this.currentState.isPaused = false;
        this.ui.updatePauseButton(false);
    }

    // --- Keyboard Handling ---
    _handleKeydown(event) {
        const key = event.key;
        const isCtrl = event.ctrlKey || event.metaKey;

        // Keys that generally shouldn't reset hints immediately
        const keysToIgnoreForReset = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'F5', 'F12', 'Tab'];
        const isModifierOnly = ['Shift', 'Control', 'Alt', 'Meta'].includes(key);
        // Don't reset on copy/paste/undo/redo shortcuts
        const isKnownShortcut = isCtrl && ['c', 'v', 'x', 'z', 'y', 'r', 'n', 'm', 'f'].includes(key.toLowerCase());

        const shouldResetHint = !isModifierOnly && !keysToIgnoreForReset.includes(key) && !isKnownShortcut;

        if (shouldResetHint) {
            this._resetHintStateIfNeeded();
        }

        // Prevent browser shortcuts / default actions
        if (isCtrl && ['z', 'y', 'r', 'n', 'm', 'f'].includes(key.toLowerCase())) {
            event.preventDefault();
        }
        if (key === ' ' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) { // Prevent space scroll only if not in input field
            event.preventDefault();
        }
        if (key.startsWith('Arrow') && this.currentState.selectedRow !== null) { // Prevent arrow scroll if cell selected
            event.preventDefault();
        }
        if ((key === 'Backspace' || key === 'Delete') && this.currentState.selectedRow !== null) { // Prevent backspace navigation if cell selected
            event.preventDefault();
        }


        // --- Global Shortcuts ---
        if (isCtrl && key.toLowerCase() === 'z') { this._undo(); return; }
        if (isCtrl && key.toLowerCase() === 'y') { this._redo(); return; }
        if (isCtrl && key.toLowerCase() === 'm') { this._clearAllPencilMarks(); return; } // Consider if this should be toggle auto-fill

        if (key.toLowerCase() === 'n' && !isCtrl) { this._setMode(Modes.NORMAL); return; } // Explicit normal mode key?
        if (key.toLowerCase() === 'm' && !isCtrl) { this._setMode(Modes.MARKING); return; }
        if (key.toLowerCase() === 'f' && !isCtrl) { this._setMode(Modes.FOCUS); return; }
        if (key === 'Escape') {
            event.preventDefault();
            this._resetHintState(); // Clear hint always on Escape
            if (this.currentState.mode !== Modes.NORMAL) {
                this._setMode(Modes.NORMAL); // Exit current mode
            } else if (this.currentState.selectedRow !== null) {
                this._setSelectedCell(null, null); // Deselect cell if in normal mode
            }
            return;
        }
        if (key === ' ' && !isCtrl) {
            // Use the callback reference from _getUICallbacks storage
            this.ui.callbacks.onPauseToggle();
            return;
        }


        // --- Persistent Focus Mode Keyboard Input ---
        if (this.currentState.mode === Modes.FOCUS) {
            // Pass focus key presses to _handleCellInput logic
            if (key >= '1' && key <= '9') {
                this._handleCellInput(parseInt(key, 10));
                return; // Consume key press
            } else if (key === 'Backspace' || key === 'Delete') {
                this._handleCellInput(0); // 0 signals clear focus in focus mode
                return; // Consume key press
            }
            // Allow arrow keys etc. to pass through for selection if desired,
            // but handle them *after* the focus-specific keys.
        }


        // --- Cell Input / Navigation (Requires selected cell) ---
        const { selectedRow, selectedCol } = this.currentState;

        // Handle Arrow Key Navigation (if cell is selected)
        if (key.startsWith('Arrow') && selectedRow !== null) {
            // event.preventDefault(); // Already done above
            let nextRow = selectedRow;
            let nextCol = selectedCol;
            if (key === 'ArrowUp' && selectedRow > 0) nextRow--;
            else if (key === 'ArrowDown' && selectedRow < BOARD_SIZE - 1) nextRow++;
            else if (key === 'ArrowLeft' && selectedCol > 0) nextCol--;
            else if (key === 'ArrowRight' && selectedCol < BOARD_SIZE - 1) nextCol++;

            if (nextRow !== selectedRow || nextCol !== selectedCol) {
                this._setSelectedCell(nextRow, nextCol); // This updates UI and highlights
            }
            return; // Navigation handled
        }

        // If no cell selected after checking arrows, ignore remaining input keys
        if (selectedRow === null || selectedCol === null) return;

        // Handle Number/Delete Input (if cell selected and NOT in Focus Mode)
        // Focus mode input is handled above now via _handleCellInput call
        if (this.currentState.mode !== Modes.FOCUS) {
            if (key >= '1' && key <= '9') {
                this._handleCellInput(parseInt(key, 10));
            }
            else if (key === 'Backspace' || key === 'Delete' || key === '0') {
                // event.preventDefault(); // Already done above
                this._handleCellInput(0); // 0 signals erase
            }
        }
    }

    /**
 * Creates a candidate map based on the current grid and pencil marks.
 * Performs basic validation.
 * @returns {Map<string, Set<number>> | null} The candidate map or null if an immediate contradiction is found.
 */
    _getCurrentCandidatesMap() {
        const grid = this.board.getGrid();
        const pencilMarks = this.board.getAllPencilMarks();
        /** @type {Map<string, Set<number>>} */
        const candidatesMap = new Map();
        let contradictionFound = false;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (grid[r][c] === 0) {
                    const cellKey = `${r}-${c}`;
                    const currentCellMarks = pencilMarks[r][c]; // Array of booleans
                    const possible = new Set();

                    for (let n = 1; n <= BOARD_SIZE; n++) {
                        if (currentCellMarks[n - 1]) {
                            // **Basic Validation:** Check if this pencil mark conflicts with a placed peer
                            if (!checkInputValid(grid, r, c, n, false)) { // Check against peers ONLY
                                console.warn(`User pencil mark ${n} at [${r},${c}] conflicts with a placed peer. Ignoring for solver.`);
                                // Optional: Decide whether to ignore the mark or flag error
                            } else {
                                possible.add(n);
                            }
                        }
                    }

                    // Check for contradiction (empty set based on *current* marks)
                    if (possible.size === 0) {
                        // Check if the cell *should* have possibilities if calculated fresh
                        // This distinguishes user error from an inherently bad board state
                        const freshPossible = new Set(Array.from({ length: BOARD_SIZE }, (_, i) => i + 1));
                        const peers = getPeers(r, c);
                        peers.forEach(([pr, pc]) => {
                            const peerValue = grid[pr][pc];
                            if (peerValue !== 0) freshPossible.delete(peerValue);
                        });

                        if (freshPossible.size > 0) {
                            console.error(`Contradiction due to user marks: Cell R${r + 1}C${c + 1} has no candidates based on current pencil marks, but should have possibilities.`);
                            // You might want to return a specific error message here
                            contradictionFound = true;
                            // break; // Can break inner loop
                        } else {
                            // If fresh calculation also yields no candidates, it's an invalid board state
                            console.error(`Contradiction in board state: Cell R${r + 1}C${c + 1} has no candidates possible.`);
                            contradictionFound = true;
                            // break;
                        }
                    }

                    if (contradictionFound) break; // Break outer loop if contradiction found

                    candidatesMap.set(cellKey, possible);
                }
            }
            if (contradictionFound) break;
        }

        if (contradictionFound) {
            // Optionally return a more specific error status/message if needed later
            return null;
        }

        console.log("Generated candidatesMap from current board/pencil marks.");
        return candidatesMap;
    }

    // --- HINT SYSTEM LOGIC ---
    /**
     * Resets the hint state and clears UI indicators.
     */
    _reapplyHintVisuals() {
        // Called by _updateUI to ensure hint highlights/text are correct
        if (!this.currentState.currentHintStep || this.currentState.hintStage === 0) {
            // This case is handled by _updateUI clearing hints
            return;
        }

        const step = this.currentState.currentHintStep.steps[0];
        const highlights = step.highlights;
        const baseTechnique = step.technique.split(' (')[0];

        // Always display technique name if stage > 0
        this.ui.displayHintTechnique(baseTechnique);

        if (this.currentState.hintStage === 1) {
            // Stage 1: Only technique name is shown, no board highlights yet
            this.ui.clearHintHighlight(); // Ensure board is clear
        } else if (this.currentState.hintStage === 2) {
            // Stage 2: Show cells
            this.ui.applyHintHighlight(highlights, false); // false = cells only
        } else if (this.currentState.hintStage === 3) {
            // Stage 3: Show cells and candidates
            this.ui.applyHintHighlight(highlights, true); // true = cells and candidates
        }
    }

    _resetHintState() {
        if (this.currentState.hintStage !== 0 || this.currentState.currentHintStep !== null) {
            console.log("Resetting hint state.");
            this.currentState.hintStage = 0;
            this.currentState.currentHintStep = null;
            this.ui.clearHintHighlight(); // Clear board highlights
            this.ui.clearHintTechnique(); // Clear text display
        }
    }

    /**
      * Calls _resetHintState only if a hint is currently active (stage > 0).
      * Used before actions that should interrupt an ongoing hint sequence.
      */
    _resetHintStateIfNeeded() {
        if (this.currentState.hintStage > 0) {
            console.log("Resetting hint state due to new action.");
            this._resetHintState();
        }
    }

    /**
     * Handles progressive hint requests.
     */
    _handleHintRequest() {
        console.log(`Hint requested. Current stage: ${this.currentState.hintStage}`);
        const currentGrid = this.board.getGrid();

        if (this.currentState.isPaused || !findNextEmptyCell(currentGrid)) {
            console.log("Hint ignored (paused or solved).");
            this._resetHintState(); // Ensure hint UI is cleared if board is solved/paused
            return;
        }

        // --- Clear persistent focus highlights if focus mode is active ---
        if (this.currentState.mode === Modes.FOCUS) {
            this.currentState.focusedDigits.clear();
            // this.ui.clearFocusHighlight();
            // Maybe switch back to normal mode? Optional.
            // this._setMode(Modes.NORMAL);
        }
        // We don't clear hint highlights here initially, as we progress stages.
        // Resetting happens when starting stage 0->1 or via _resetHintState.

        // --- Progression Logic ---
        const currentStage = this.currentState.hintStage;

        if (currentStage === 0) {
            // --- Stage 0 -> 1: Find Hint & Show Technique Name ---
            console.log("Hint Stage 0 -> 1: Finding step...");
            // this.ui.clearHintHighlight(); // Clear any previous board highlights
            // this.ui.clearHintTechnique(); // Clear previous text

            const currentCandidatesMap = this._getCurrentCandidatesMap(); // Use map based on board state, ignoring invalid user marks now

            if (!currentCandidatesMap) {
                console.error("Cannot generate hint: Contradiction found in board state.");
                // Error message should have been displayed by _getCurrentCandidatesMap
                this._resetHintState(); // Ensure state is reset
                return;
            }

            // Call solver with the grid and the *generated* map based on valid candidates
            const result = SolverAdvanced.solveSingleStep(currentGrid, currentCandidatesMap);
            console.log("Solver Result:", result);

            if (result.status === 'found_step' && result.steps && result.steps.length > 0) {
                const step = result.steps[0];
                this.currentState.currentHintStep = result; // Store the whole result
                this.currentState.hintStage = 1;

                const baseTechnique = step.technique.split(' (')[0];
                // USE BASE TECHNIQUE NAME to hide specifics, only show the name of the technique
                this.ui.displayHintTechnique(baseTechnique);
                // this.ui.displayHintTechnique(step.technique); 
                console.log(`Hint found: ${step.technique}. Stage set to 1.`);
            } else {
                // Handle 'stuck', 'error', 'solved'
                let message = "Hint Error";
                if (result.status === 'stuck') message = result.message || "No simple hint found.";
                else if (result.status === 'error') message = result.message || "Solver error.";
                else if (result.status === 'solved') message = "Board is solved!";

                console.log(`Hint request outcome: ${result.status} - ${message}`);
                this.ui.displayHintTechnique(message); // Display status message
                this.currentState.currentHintStep = null; // No step stored
                this.currentState.hintStage = 0; // Remain at stage 0
                // Optional: Auto-clear the message after a delay?
                // setTimeout(() => { if (this.currentState.hintStage === 0 && !this.currentState.currentHintStep) this.ui.clearHintTechnique(); }, 3000);
            }

        } else if (currentStage === 1) {
            // --- Stage 1 -> 2: Show Cells ---
            if (!this.currentState.currentHintStep) { // Safety check
                console.error("Hint Stage 1 error: No current hint step stored.");
                this._resetHintState();
                return;
            }
            console.log("Hint Stage 1 -> 2: Highlighting cells...");
            const highlights = this.currentState.currentHintStep.steps[0].highlights;
            this.ui.applyHintHighlight(highlights, false); // false = cells only
            this.currentState.hintStage = 2;
            // Technique name remains displayed from previous stage

        } else if (currentStage === 2) {
            // --- Stage 2 -> 3: Show Candidates ---
            if (!this.currentState.currentHintStep) { // Safety check
                console.error("Hint Stage 2 error: No current hint step stored.");
                this._resetHintState();
                return;
            }
            console.log("Hint Stage 2 -> 3: Highlighting candidates...");
            const highlights = this.currentState.currentHintStep.steps[0].highlights;
            this.ui.applyHintHighlight(highlights, true); // true = cells and candidates
            this.currentState.hintStage = 3;
            // Technique name remains displayed

        } else if (currentStage === 3) {
            // --- Stage 3 -> 0: Reset ---
            console.log("Hint Stage 3 -> 0: Resetting hint.");
            this._resetHintState(); // Clicking again resets
        }
    }
}

// js/sudoku/game.js
import { SudokuBoard } from './board.js'; // Correct path if board.js is in the same folder
import { SudokuUI } from './ui.js';
import { Timer } from './timer.js';
// import * as Solver from './solver_basic.js'; // No longer used for hints
import * as SolverAdvanced from './solver_advanced.js';
import * as Persistence from './persistence.js';
import { copyToClipboard, getPeers} from './utils.js';
import { Difficulty, Modes, Platform, BOARD_SIZE } from './constants.js';
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
            difficulty: Difficulty.EASY,
            platform: Platform.Desktop,
            selectedRow: null,
            selectedCol: null,
            isPaused: false,
            focusedDigits: new Set(), // New: For persistent focus mode
            settings: {
                autoPencilMarks: true,
                saveDifficulty: true,
                showHintAlert: true, 
            }
        };

        this.undoStack = [];
        this.redoStack = [];
        this.saveInterval = null;

        this._initializeGame();
    }

    _initializeGame() {
        console.log("Initializing Sudoku Game...");
        this._detectPlatform();

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
            // Timer already started in _generateNewBoard
        }

        // --- Final steps ---
        // _updateUI is called within _initializeGame logic branches now
        if (!successfullyLoaded) {
            this._updateUI(); // Draw the newly generated board state if needed
        } else if (!urlHash) { // Only call updateUI again if we loaded from localStorage (hash load calls it)
             this._updateUI(); // Initial UI draw based on loaded state
        }


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
        this.stopAutoSave();
        this.timer.reset();
        this.undoStack = [];
        this.redoStack = [];
        this.currentState.focusedDigits.clear(); // Clear focus state

        // TODO: Replace with a call to your preferred generator if different
        // const { puzzle, solution } = Solver.generate(difficultyValue); // If using basic solver's gen

        const { puzzle /*, solution */ } = SolverAdvanced.generatePuzzle(difficultyValue); // Assuming generate exists in SolverAdvanced or SolverBasic


        this.board.clearBoard();
        this.board.setGrid(puzzle, true); // Set puzzle grid as initial grid

        this._setSelectedCell(null, null);
        this._updateUI(); // This will clear highlights and draw board
        this.timer.start();
        this.startAutoSave();
        this._saveGame();
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
        this.ui.clearHintHighlight(); // Clear hint highlights on general UI update

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
    }

    _setSelectedCell(row, col) {
        const prevRow = this.currentState.selectedRow;
        const prevCol = this.currentState.selectedCol;
        if (row === prevRow && col === prevCol) return;

        this.currentState.selectedRow = row;
        this.currentState.selectedCol = col;

        // Update UI for cell selection itself (e.g., background color)
        this.ui.selectCell(row, col, prevRow, prevCol);

        // Update numpad based on new selection
        this._updateNumPadVisibility();

        // Update auto-focus highlights only if not in persistent Focus mode
        if (this.currentState.mode !== Modes.FOCUS) {
            const value = (row !== null && col !== null) ? this.board.getValue(row, col) : 0;
            if (value > 0) {
                this.ui.applyFocusHighlight(value);
            } else {
                this.ui.clearFocusHighlight();
            }
        }
        // In Focus mode, highlights are managed by key presses or mode changes, not selection.
    }

    _updateNumPadVisibility() {
        const { selectedRow, selectedCol, mode, platform } = this.currentState;

        // Simplified: Numpad visibility managed by CSS based on platform, just manage button states
        if (selectedRow !== null && selectedCol !== null) {
            const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);
            let validInputs = [];
            let canErase = this.board.getValue(selectedRow, selectedCol) !== 0 && !isPrefilled;

            if (!isPrefilled && mode !== Modes.MARKING) {
                const currentGrid = this.board.getGrid();
                for (let num = 1; num <= BOARD_SIZE; num++) {
                    if (checkInputValid(currentGrid, selectedRow, selectedCol, num)) {
                        validInputs.push(num);
                    }
                }
            }

            this.ui.updateNumPad(validInputs, canErase, mode === Modes.MARKING, isPrefilled);
        } else {
             this.ui.updateNumPad([], false, false, false); // No cell selected, disable all
        }
    }

    _setMode(newMode) {
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

        console.log("Mode changed from", oldMode, "to:", currentMode);

        // --- Handle Focus Mode State ---
        if (oldMode === Modes.FOCUS && currentMode !== Modes.FOCUS) {
             console.log("Exiting Focus Mode: Clearing focused digits and highlights.");
             this.currentState.focusedDigits.clear();
             this.ui.clearFocusHighlight(); // Clear persistent highlights explicitly
        } else if (currentMode === Modes.FOCUS) {
             console.log("Entering Focus Mode: Clearing potential auto-focus.");
             this.ui.clearFocusHighlight(); // Clear auto-highlights
             // Re-apply persistent highlights if any exist
             this.ui.applyFocusHighlight(this.currentState.focusedDigits);
        }

        // --- General UI Update ---
        this._updateUI(); // Updates button styles, re-evaluates auto-focus if now in Normal mode
    }

     _cycleDifficulty() {
        const difficulties = Object.values(Difficulty);
        const currentIndex = difficulties.indexOf(this.currentState.difficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        this.currentState.difficulty = difficulties[nextIndex];
        this.ui.updateDifficultyButton(this.currentState.difficulty);
         if (this.currentState.settings.saveDifficulty) {
             this._saveGame();
         }
    }

    _handleCellInput(value) {
        const { selectedRow, selectedCol, mode } = this.currentState;
        if (selectedRow === null || selectedCol === null) return;

        const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);

        // --- Clear Hint Highlights on any input ---
        this.ui.clearHintHighlight();

        // Handle Marking Mode
        if (mode === Modes.MARKING) {
            if (value === 0) {
                 this._addUndoState();
                 this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                 this._updateUI(); // Redraw needed to show cleared marks
            } else if (value >= 1 && value <= BOARD_SIZE) {
                 this._addUndoState();
                 this.board.togglePencilMark(selectedRow, selectedCol, value);
                 this._updateUI(); // Redraw needed to show toggled mark
            }
            return;
        }

        // Handle Normal Mode (or Focus mode - input acts normally)
        if (isPrefilled) {
             console.log("Cannot change prefilled cell.");
             this.ui.showBoardError(selectedRow, selectedCol);
             return;
        }

        const currentValue = this.board.getValue(selectedRow, selectedCol);

        if (value === 0) { // Erasing
            if (currentValue !== 0) {
                this._addUndoState();
                this.board.setValue(selectedRow, selectedCol, 0);
                this._updateUI(); // Update board display and auto-focus
            }
        } else if (value >= 1 && value <= BOARD_SIZE) { // Placing number
            if (currentValue === value) return; // No change

             if (checkInputValid(this.board.getGrid(), selectedRow, selectedCol, value)) {
                 this._addUndoState();
                 this.board.setValue(selectedRow, selectedCol, value);

                 if (this.currentState.settings.autoPencilMarks) {
                     this._updateAffectedPencilMarks(selectedRow, selectedCol, value);
                 }

                 this._updateUI(); // Update board display and auto-focus

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
         console.log("Congratulations! Board Solved!");
         this.timer.pause();
         this.currentState.isPaused = true; // Reflect pause state
         this._setSelectedCell(null, null); // Deselect
         this.ui.updatePauseButton(true);
         this.ui.clearFocusHighlight(); // Clear any focus
         this.ui.clearHintHighlight(); // Clear any hints
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
        console.log("Auto-filling pencil marks...");
        this._addUndoState();
        const currentGrid = this.board.getGrid();
        let changed = false;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentGrid[r][c] === 0) {
                    const currentMarksInCell = this.board.getPencilMarksForCell(r,c);
                    const newMarks = new Array(BOARD_SIZE).fill(false);
                    for (let num = 1; num <= BOARD_SIZE; num++) {
                         if (checkInputValid(currentGrid, r, c, num)) {
                            newMarks[num - 1] = true;
                         }
                    }
                    // Check if marks actually changed before setting
                    if (currentMarksInCell.some((mark, i) => mark !== newMarks[i])) {
                         // Set all marks for the cell at once might be slightly cleaner
                         // if board class had a setPencilMarksForCell method.
                         // Otherwise, set individually:
                         for(let num = 1; num <= BOARD_SIZE; num++) {
                             this.board.setPencilMark(r, c, num, newMarks[num-1]);
                         }
                         changed = true;
                    }
                } else {
                    // Clear marks from filled cells
                    if (this.board.getPencilMarksForCell(r,c).some(mark => mark)) {
                         this.board.clearPencilMarksForCell(r,c);
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
         let hasMarks = false;
         // Efficiently check if any marks exist
         outerLoop:
         for(let r=0; r<BOARD_SIZE; ++r) {
             for(let c=0; c<BOARD_SIZE; ++c) {
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
            pencilMarks: this.board.getAllPencilMarks()
        };
        this.undoStack.push(state);
        if (this.undoStack.length > MAX_UNDO_STEPS) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        // Update UI button state if necessary
    }

    _undo() {
        if (this.undoStack.length === 0) return;
        const previousState = this.undoStack.pop();
        this.board.setGrid(previousState.grid);
        this.board.setAllPencilMarks(previousState.pencilMarks);
        console.log("Undo performed.");
        this._updateUI(); // Redraw and update highlights
    }

    // --- Focus Mode Handling --- - REMOVED (now integrated)

     // --- Hint Request ---
    async _handleHintRequest() {
        console.log("Hint requested...");
        const currentGrid = this.board.getGrid();

        if (this.currentState.isPaused || !findNextEmptyCell(currentGrid)) {
            console.log("Hint ignored (paused or solved).");
            return;
        }

        // Clear persistent focus and its highlights before getting hint
        if (this.currentState.mode === Modes.FOCUS) {
             this.currentState.focusedDigits.clear();
             this.ui.clearFocusHighlight();
        }
         // Also clear any previous hint highlights
         this.ui.clearHintHighlight();

        const result = SolverAdvanced.solveSingleStep(currentGrid);
        console.log("Solver Result:", result);

        let alertMessage = "";

        switch (result.status) {
            case 'error':
                alertMessage = `Error: ${result.message || 'Board state is invalid.'}`;
                break;
            case 'solved':
                alertMessage = "Board is already solved!";
                break;
            case 'stuck':
                alertMessage = result.message || "No simple hint could be found with current techniques.";
                break;
            case 'found_step':
                const step = result.steps[0];
                alertMessage = `Hint (${step.technique}):\n${step.description}`;
                 // Use setTimeout to allow the alert to close before applying highlights
                 setTimeout(() => {
                     console.log("Applying hint highlights for:", step.technique);
                     this.ui.applyHintHighlight(step.highlights); // Pass highlights to UI
                 }, 0);
                break;
        }

        // Show the alert message
        if (this.currentState.settings.showHintAlert && alertMessage) {
            alert(alertMessage); // Using basic alert
        } else if (alertMessage) {
            // If alert is disabled, maybe log the message instead?
            console.log("Hint Info (Alert Disabled):", alertMessage);
        }
        // alert(alertMessage);

    }

    // (Optional) Keep _applyHintStep if you want a separate button to apply the hint later
    // _applyHintStep(step) { ... }


    // --- UI Callback Getters ---
    _getUICallbacks() {
        return {
            onCellClick: (row, col) => {
                // Clear hint highlights when a cell is clicked
                this.ui.clearHintHighlight();
                this._setSelectedCell(row, col);
            },
            onClickOutside: () => {
                 // Clear hint highlights when clicking outside
                 this.ui.clearHintHighlight();
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
                 this.ui.clearFocusHighlight();
                 this.ui.clearHintHighlight();
                 this._updateUI(); // Redraw board which might hide numbers if needed
            },
            onDifficultyCycle: () => this._cycleDifficulty(),
            onNewGameRequest: () => {
                 this.ui.showConfirm("Start a new game?", () => {
                    this._generateNewBoard(this.currentState.difficulty);
                 });
            },
            onResetRequest: () => {
                this.ui.showConfirm("Reset the board?", () => {
                     this.timer.reset();
                     this._addUndoState();
                     this.board.resetToInitial();
                     this.currentState.focusedDigits.clear(); // Clear focus
                     this.undoStack = [];
                     this.redoStack = [];
                     this._updateUI(); // Redraw, clears highlights
                     this.timer.start();
                 });
            },
            // onSolveRequest: (visual) => {
            //     // Note: Basic solver modifies the board directly.
            //     // Consider creating a copy if you want to preserve the user's state.
            //      this.ui.showConfirm("Show solution?", async () => {
            //          this.timer.pause(); // Pause timer while solving
            //          this.currentState.isPaused = true;
            //          this.ui.updatePauseButton(true);
            //          const boardCopy = this.board.getGrid(); // Work on a copy

            //          if (visual) {
            //              console.log("Solving visually...");
            //               // solveVisual needs the board passed directly to modify it
            //               const solveSuccess = await Solver.solveVisual(boardCopy,
            //                 async () => {
            //                     // This callback updates the UI during visual solve
            //                     // We need to temporarily update the main board's grid for display
            //                     this.board.setGrid(boardCopy); // Update board for UI
            //                     this._updateUI(); // Redraw
            //                 }, 50); // Adjust delay as needed

            //              if (solveSuccess) {
            //                  this.board.setGrid(boardCopy); // Keep solved state on board
            //                  this._updateUI();
            //                  celebrate();
            //              } else {
            //                  console.log("Visual solver couldn't find a solution (or was interrupted).");
            //                  // Optionally restore original board state here
            //              }

            //          } else {
            //              console.log("Solving instantly...");
            //              if (Solver.solve(boardCopy)) {
            //                  this.board.setGrid(boardCopy); // Apply solution
            //                  this._updateUI();
            //                  celebrate();
            //              } else {
            //                  console.log("No solution found.");
            //                   // Optionally show a message to the user
            //                   alert("Could not find a solution for the current board.");
            //              }
            //          }
            //      });
            // },
            onSolveRequest: (visual) => { // Kept for full solve, not hint
                 this.ui.showConfirm("Show solution? Current state will be overwritten.", async () => {
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
                         // Optionally restore original state if needed, though usually not for 'solve'
                         this.timer.start(); // Resume timer if solve failed? Or leave paused?
                         this.currentState.isPaused = false; // Decide if solve failure unpauses
                         this.ui.updatePauseButton(false);
                     }
                 });
            },
            onHintRequest: () => this._handleHintRequest(), // Add hint request callback
            onUndoRequest: () => this._undo(),
            onAutoMarkRequest: () => this._clearAllPencilMarks(),
            onAutoMarkRequest: () => this._clearAllPencilMarks(), // Current button toggles clear/auto-fill
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
                        this.timer.reset();
                        this.board.setGrid(decodedState.grid);
                        this.board.setInitialGrid(decodedState.initialGrid);
                        this.board.setAllPencilMarks(decodedState.pencilMarks);
                        this.currentState.difficulty = decodedState.difficulty;
                        // Load settings if available in decodedState, otherwise keep current
                         if(decodedState.settings){ this.currentState.settings = decodedState.settings; }
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
                 }else {
                     console.warn(`Setting ${settingName} does not exist.`);
                 }
             },
             onResize: () => this._detectPlatform(),
        };
    }

    // --- Keyboard Handling ---
    _handleKeydown(event) {
        const key = event.key;
        const isCtrl = event.ctrlKey || event.metaKey;

        // --- Clear Hint Highlights on most key presses ---
        // (Except maybe arrow keys or modifier keys alone)
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
            this.ui.clearHintHighlight();
        }

        // Prevent browser shortcuts
        if (isCtrl && ['z', 'y', 'r', 'n', 'm', 'f'].includes(key.toLowerCase())) { // Added 'f' for focus toggle maybe
            event.preventDefault();
        }

        // --- Global Shortcuts ---
        if (isCtrl && key.toLowerCase() === 'z') { this._undo(); return; }
        // if (isCtrl && key.toLowerCase() === 'y') { this._redo(); return; } // If implemented
        if (isCtrl && key.toLowerCase() === 'm') { this._clearAllPencilMarks(); return; }

        if (key === 'm' && !isCtrl) { this._setMode(Modes.MARKING); return; }
        if (key === 'f' && !isCtrl) { this._setMode(Modes.FOCUS); return; } // Toggle focus mode
        if (key === 'Escape') { // Escape key exits modes, clears selection/highlights
             event.preventDefault();
             this.ui.clearHintHighlight();
             if (this.currentState.mode === Modes.FOCUS) {
                 this._setMode(Modes.NORMAL); // Exit focus mode
             } else if (this.currentState.mode === Modes.MARKING) {
                 this._setMode(Modes.NORMAL); // Exit marking mode
             }
             this._setSelectedCell(null, null); // Deselect cell
             return;
        }
         if (key === ' ') {
            event.preventDefault();
            this.callbacks.onPauseToggle(); // Use the stored callbacks reference
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
                 console.log("Focused digits:", this.currentState.focusedDigits);
                 // Update UI immediately
                 this.ui.applyFocusHighlight(this.currentState.focusedDigits);
                 return; // Consume key press
             } else if (key === 'Backspace' || key === 'Delete') {
                  this.currentState.focusedDigits.clear(); // Clear all focused digits
                  console.log("Cleared focused digits");
                  this.ui.clearFocusHighlight(); // Update UI
                  return; // Consume key press
             }
             // Allow arrow keys etc. to pass through in focus mode if needed for selection?
             // Currently, selection doesn't affect focus highlights in FOCUS mode.
         }


        // --- Cell Input / Navigation (Requires selected cell) ---
        const { selectedRow, selectedCol } = this.currentState;
        if (selectedRow === null || selectedCol === null) return; // Ignore input if no cell selected

        if (key >= '1' && key <= '9') {
            this._handleCellInput(parseInt(key, 10));
        }
        else if (key === 'Backspace' || key === 'Delete' || key === '0') { // '0' also erases
            this._handleCellInput(0);
        }
        else if (key.startsWith('Arrow')) {
             event.preventDefault();
             let nextRow = selectedRow;
             let nextCol = selectedCol;
             if (key === 'ArrowUp' && selectedRow > 0) nextRow--;
             else if (key === 'ArrowDown' && selectedRow < BOARD_SIZE - 1) nextRow++;
             else if (key === 'ArrowLeft' && selectedCol > 0) nextCol--;
             else if (key === 'ArrowRight' && selectedCol < BOARD_SIZE - 1) nextCol++;

             if (nextRow !== selectedRow || nextCol !== selectedCol) {
                 this._setSelectedCell(nextRow, nextCol); // This updates UI and highlights
             }
        }
    }
}

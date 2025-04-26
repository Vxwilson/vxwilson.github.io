// js/sudoku/game.js
import { SudokuBoard } from './board.js';
import { SudokuUI } from './ui.js';
import { Timer } from './timer.js';
import * as Solver from './solver_basic.js'; // Using current basic solver
// import * as SolverAdvanced from './solver_advanced.js'; // For later
import * as Persistence from './persistence.js';
// copytoclipboard from utils.js
import { copyToClipboard } from './utils.js'; // If needed
import { Difficulty, Modes, Platform, BOARD_SIZE } from './constants.js';
import { checkInputValid, findNextEmptyCell, deepCopy2DArray } from './utils.js';
import { celebrate, isNumberSetComplete, triggerMiniConfetti } from './confetti.js'; // Assuming confetti logic is separate

const MAX_UNDO_STEPS = 50; // Limit undo history

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
            settings: {
                autoPencilMarks: true,
                saveDifficulty: true,
            }
        };

        this.undoStack = [];
        this.redoStack = []; // Basic redo could be added later

        this.saveInterval = null;

        this._initializeGame();
    }

    _initializeGame() {
        console.log("Initializing Sudoku Game...");
        this._detectPlatform();

        const loadedState = Persistence.loadGameState();
        if (loadedState) {
            console.log("Loading saved state...");
            this.board.setGrid(loadedState.boardState.grid);
            this.board.setInitialGrid(loadedState.boardState.initialGrid);
            // Load pencil marks if saved: this.board.setAllPencilMarks(loadedState.boardState.pencilMarks);

            // Apply loaded settings carefully
            this.currentState.settings = {
                ...this.currentState.settings, // Keep defaults if something is missing
                ...loadedState.settings
            };
            // Only override difficulty if saveDifficulty was enabled
            if (this.currentState.settings.saveDifficulty && loadedState.settings.difficulty) {
                 this.currentState.difficulty = loadedState.settings.difficulty;
            }

            this.timer.start(loadedState.elapsedTime);
            this.ui.applySettings(this.currentState.settings); // Update UI toggles

        } else {
            console.log("No saved state found, generating new board...");
            this._generateNewBoard(this.currentState.difficulty);
            this.timer.start();
        }

        this._updateUI(); // Initial UI draw
        this.startAutoSave(); // Start auto-save timer
        console.log("Game Initialized.");
    }

     _detectPlatform() {
        // Simple check, refine if needed
        this.currentState.platform = window.innerWidth < 768 ? Platform.Mobile : Platform.Desktop;
        console.log("Platform detected:", this.currentState.platform === Platform.Mobile ? "Mobile" : "Desktop");
        // Add/remove classes or adjust UI based on platform if necessary
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
        const gameState = {
            board: this.board,
            timer: this.timer,
            settings: {
                difficulty: this.currentState.difficulty, // Always save current difficulty setting
                ...this.currentState.settings // Include other settings like autoPencil
            }
        };
        // Only save actual difficulty value if 'saveDifficulty' setting is true
        if (!this.currentState.settings.saveDifficulty) {
            // If not saving difficulty, maybe save a default or skip it?
            // For simplicity, we'll still save it here, but loading logic checks the flag.
        }
        Persistence.saveGameState(gameState);
    }

     _generateNewBoard(difficultyValue) {
        this.stopAutoSave(); // Stop saving during generation
        this.timer.reset();
        this.undoStack = [];
        this.redoStack = [];

        const { puzzle, solution } = Solver.generate(difficultyValue); // Use the enum value
        this.board.clearBoard(); // Clear everything first
        this.board.setGrid(puzzle, true); // Set puzzle grid as initial grid

        // Optional: Store the full solution separately if needed for hints/solve
        // this.currentSolution = solution;
        this._setSelectedCell(null, null); // Deselect cell
        this._updateUI();
        this.timer.start();
        this.startAutoSave();
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
        this.ui.selectCell(this.currentState.selectedRow, this.currentState.selectedCol, null, null); // Reselect cell
        this._updateNumPadVisibility(); // Update numpad based on selection/mode

        // Update undo/redo button states maybe
        // this.ui.undoButton.disabled = this.undoStack.length === 0;
        // this.ui.redoButton.disabled = this.redoStack.length === 0;

        // Apply focus if needed
        if (this.currentState.mode === Modes.FOCUS) {
            this._handleFocus();
        } else {
             this.ui.clearFocus();
        }
    }

    _setSelectedCell(row, col) {
        const prevRow = this.currentState.selectedRow;
        const prevCol = this.currentState.selectedCol;
        if (row === prevRow && col === prevCol) return; // No change

        this.currentState.selectedRow = row;
        this.currentState.selectedCol = col;

        this.ui.selectCell(row, col, prevRow, prevCol);
        this._updateNumPadVisibility();

        // Handle focus mode update if a cell is selected/deselected
         if (this.currentState.mode === Modes.FOCUS) {
            this._handleFocus();
        }
    }

    _updateNumPadVisibility() {
        const { selectedRow, selectedCol, mode, platform } = this.currentState;

        if (platform === Platform.Desktop || selectedRow === null || selectedCol === null) {
             // Hide or disable numpad on desktop? Or always show but disable buttons?
             // For now, just manage button states.
             // Consider adding logic to show/hide the numpad container if needed.
        }

        if (selectedRow !== null && selectedCol !== null) {
            const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);
            let validInputs = [];
            let canErase = this.board.getValue(selectedRow, selectedCol) !== 0 && !isPrefilled;

            if (!isPrefilled && mode !== Modes.MARKING) {
                const currentGrid = this.board.getGrid(); // Get a copy
                for (let num = 1; num <= BOARD_SIZE; num++) {
                    // Check validity against the current state *before* placing num
                    if (checkInputValid(currentGrid, selectedRow, selectedCol, num)) {
                        validInputs.push(num);
                    }
                }
            }
            // If marking mode, all numbers 1-9 are technically "valid" for toggling
            // Erase (0) is handled by canErase

            this.ui.updateNumPad(validInputs, canErase, mode === Modes.MARKING, isPrefilled);
        } else {
             // No cell selected, disable all numpad buttons
             this.ui.updateNumPad([], false, false, false);
        }

    }

    _setMode(newMode) {
        if (this.currentState.mode === newMode) {
             // If clicking the same mode button again, toggle it off (back to NORMAL)
             if (newMode !== Modes.NORMAL) {
                 this.currentState.mode = Modes.NORMAL;
             }
        } else {
            this.currentState.mode = newMode;
        }

        // Clear focus when leaving focus mode
         if (this.currentState.mode !== Modes.FOCUS) {
             this.ui.clearFocus();
         } else {
             this._handleFocus(); // Apply focus if entering focus mode
         }

        this._updateUI(); // Update button styles etc.
        console.log("Mode changed to:", Object.keys(Modes).find(key => Modes[key] === this.currentState.mode));
    }

     _cycleDifficulty() {
        const difficulties = Object.values(Difficulty);
        const currentIndex = difficulties.indexOf(this.currentState.difficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        this.currentState.difficulty = difficulties[nextIndex];
        this.ui.updateDifficultyButton(this.currentState.difficulty);
        // Optionally save settings if difficulty changed and saveDifficulty is on
         if (this.currentState.settings.saveDifficulty) {
             this._saveGame(); // Quick save setting
         }
    }

    _handleCellInput(value) {
        const { selectedRow, selectedCol, mode } = this.currentState;
        if (selectedRow === null || selectedCol === null) return; // No cell selected

        const isPrefilled = this.board.isPrefilled(selectedRow, selectedCol);

        // Handle Marking Mode
        if (mode === Modes.MARKING) {
            if (value === 0) { // Erase all marks in cell
                 this._addUndoState(); // Save state before clearing marks
                 this.board.clearPencilMarksForCell(selectedRow, selectedCol);
                 this._updateUI();
            } else if (value >= 1 && value <= BOARD_SIZE) {
                 this._addUndoState(); // Save state before toggling mark
                 this.board.togglePencilMark(selectedRow, selectedCol, value);
                 this._updateUI();
            }
            return; // Input handled for marking mode
        }

        // Handle Normal Mode (or Focus mode, input acts normally)
        if (isPrefilled) {
             console.log("Cannot change prefilled cell.");
             // Optional: provide visual feedback like a shake or red flash
             this.ui.showBoardError(selectedRow, selectedCol);
             return;
        }

        const currentValue = this.board.getValue(selectedRow, selectedCol);

        if (value === 0) { // Erasing the cell
            if (currentValue !== 0) {
                this._addUndoState();
                this.board.setValue(selectedRow, selectedCol, 0);
                // When erasing, maybe recalculate potential pencil marks for neighbors?
                // This depends on how sophisticated you want auto-pencil marks to be.
                // For now, just clear the value.
                this._updateUI();
            }
        } else if (value >= 1 && value <= BOARD_SIZE) { // Placing a number
            if (currentValue === value) return; // No change

             // Check validity before setting
             if (checkInputValid(this.board.getGrid(), selectedRow, selectedCol, value)) {
                 this._addUndoState();
                 this.board.setValue(selectedRow, selectedCol, value);

                 // Auto-update pencil marks in related cells if setting is enabled
                 if (this.currentState.settings.autoPencilMarks) {
                     this._updateAffectedPencilMarks(selectedRow, selectedCol, value);
                 }

                 this._updateUI();

                 // Check for number set completion
                 if (isNumberSetComplete(this.board.getGrid(), value)) {
                    console.log(`Set for number ${value} complete!`);
                    triggerMiniConfetti();
                 }

                 // Check for win condition
                 if (!findNextEmptyCell(this.board.getGrid())) {
                     this._handleWin();
                 }
             } else {
                  console.log(`Invalid move: ${value} at [${selectedRow}, ${selectedCol}]`);
                   this.ui.showBoardError(selectedRow, selectedCol);
                  // Maybe flash the cell red?
             }
        }
    }

     _handleWin() {
         console.log("Congratulations! Board Solved!");
         this.timer.pause(); // Stop the timer
         this.ui.updatePauseButton(true); // Show play icon
         this._setSelectedCell(null, null); // Deselect cell
         celebrate(); // Trigger confetti
         // Maybe show a win message/modal
     }

    _updateAffectedPencilMarks(row, col, placedValue) {
        // Remove 'placedValue' as a possibility from row, column, and box peers

        // Row
        for (let c = 0; c < BOARD_SIZE; c++) {
             if (c !== col) this.board.setPencilMark(row, c, placedValue, false);
        }
        // Column
        for (let r = 0; r < BOARD_SIZE; r++) {
             if (r !== row) this.board.setPencilMark(r, col, placedValue, false);
        }
        // Box
        const boxRowStart = Math.floor(row / 3) * 3;
        const boxColStart = Math.floor(col / 3) * 3;
        for (let r = boxRowStart; r < boxRowStart + 3; r++) {
            for (let c = boxColStart; c < boxColStart + 3; c++) {
                if (r !== row || c !== col) {
                    this.board.setPencilMark(r, c, placedValue, false);
                }
            }
        }
        // No need to call _updateUI here, it's called after _handleCellInput finishes
    }

    _autoFillPencilMarks() {
        // Fills pencil marks for all empty cells based on current board state
        console.log("Auto-filling pencil marks...");
        this._addUndoState(); // Save state before potentially large change
        const currentGrid = this.board.getGrid();
        let changed = false;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentGrid[r][c] === 0) { // Only for empty cells
                    for (let num = 1; num <= BOARD_SIZE; num++) {
                         const isValid = checkInputValid(currentGrid, r, c, num);
                         // Update the board's pencil mark state directly
                         const currentMark = this.board.getPencilMark(r,c,num);
                         if (currentMark !== isValid) {
                              this.board.setPencilMark(r, c, num, isValid);
                              changed = true;
                         }
                    }
                } else {
                    // Ensure filled cells have no pencil marks
                    const currentMarks = this.board.getPencilMarksForCell(r,c);
                    if (currentMarks.some(mark => mark)) { // Check if any mark is true
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
             // Remove the last undo state if nothing changed
             this.undoStack.pop();
        }
    }

     _clearAllPencilMarks() {
         // Check if there are any marks to clear first
         let hasMarks = false;
         const allMarks = this.board.getAllPencilMarks();
         for(let r=0; r<BOARD_SIZE && !hasMarks; ++r) {
             for(let c=0; c<BOARD_SIZE && !hasMarks; ++c) {
                 if (allMarks[r][c].some(mark => mark)) {
                     hasMarks = true;
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
             console.log("No pencil marks to clear.");
             // If no marks, maybe trigger auto-fill instead?
             this._autoFillPencilMarks();
         }
     }

    // --- Undo/Redo ---
    _addUndoState() {
        const state = {
            grid: this.board.getGrid(),
            pencilMarks: this.board.getAllPencilMarks()
            // Could also save selected cell, mode, etc. if needed for undo
        };
        this.undoStack.push(state);
        if (this.undoStack.length > MAX_UNDO_STEPS) {
            this.undoStack.shift(); // Remove oldest state
        }
        this.redoStack = []; // Clear redo stack on new action
        // console.log("Undo state added. Stack size:", this.undoStack.length);
        // Update UI for undo button enable/disable?
    }

    _undo() {
        if (this.undoStack.length === 0) {
            console.log("Nothing to undo.");
            return;
        }
        const previousState = this.undoStack.pop();
        // Maybe add current state to redo stack here if implementing redo
        this.board.setGrid(previousState.grid); // Restore grid
        this.board.setAllPencilMarks(previousState.pencilMarks); // Restore marks
        console.log("Undo performed.");
        this._updateUI();
    }

     // --- Focus Mode ---
     _handleFocus() {
         if (this.currentState.mode !== Modes.FOCUS) {
              this.ui.clearFocus();
              return;
         }

         let focusValue = null;
         if (this.currentState.selectedRow !== null && this.currentState.selectedCol !== null) {
             focusValue = this.board.getValue(this.currentState.selectedRow, this.currentState.selectedCol);
         }

         if (focusValue && focusValue > 0) {
             this.ui.applyFocus(focusValue);
         } else {
              this.ui.clearFocus();
              // If cell is empty or no cell selected, maybe defocus or switch mode?
              // For now, just clears visual focus.
               // Optionally switch back to normal mode if focus target is lost
              // this._setMode(Modes.NORMAL);
         }
     }

      _focusDigit(value) {
           if (this.currentState.mode === Modes.FOCUS) {
                if (value >= 0 && value <= 9) { // 0 clears focus
                    this.ui.applyFocus(value); // Update UI directly
                    console.log("Focusing digit:", value);
                }
           }
     }

    // --- UI Callback Getters ---
    // This pattern keeps the UI class decoupled from the Game class internals
    _getUICallbacks() {
        return {
            onCellClick: (row, col) => this._setSelectedCell(row, col),
            onClickOutside: () => this._setSelectedCell(null, null),
            onNumberInput: (num) => this._handleCellInput(num),
            onKeydown: (event) => this._handleKeydown(event),
            onModeToggleRequest: (mode) => this._setMode(mode),
            onPauseToggle: () => {
                 const isNowPaused = this.timer.togglePause();
                 this.currentState.isPaused = isNowPaused;
                 this.ui.updatePauseButton(isNowPaused);
                 // Maybe hide digits or overlay if paused? Add later if needed.
                 // this.ui.toggleDigitVisibility(!isNowPaused);
            },
            onDifficultyCycle: () => this._cycleDifficulty(),
            onNewGameRequest: () => {
                 this.ui.showConfirm("Start a new game?", () => {
                    this._generateNewBoard(this.currentState.difficulty);

                 });
            },
            onResetRequest: () => {
                this.ui.showConfirm("Reset the board?", () => {
                     this.timer.reset(); // Reset timer
                     this._addUndoState(); // Allow undoing a reset
                     this.board.resetToInitial();
                     this.undoStack = []; // Or maybe keep undo stack? Decide behavior.
                     this.redoStack = [];
                     this._updateUI();
                     this.timer.start(); // Restart timer
                 });
            },
            onSolveRequest: (visual) => {
                // Note: Basic solver modifies the board directly.
                // Consider creating a copy if you want to preserve the user's state.
                 this.ui.showConfirm("Show solution?", async () => {
                     this.timer.pause(); // Pause timer while solving
                     this.currentState.isPaused = true;
                     this.ui.updatePauseButton(true);
                     const boardCopy = this.board.getGrid(); // Work on a copy

                     if (visual) {
                         console.log("Solving visually...");
                          // solveVisual needs the board passed directly to modify it
                          const solveSuccess = await Solver.solveVisual(boardCopy,
                            async () => {
                                // This callback updates the UI during visual solve
                                // We need to temporarily update the main board's grid for display
                                this.board.setGrid(boardCopy); // Update board for UI
                                this._updateUI(); // Redraw
                            }, 50); // Adjust delay as needed

                         if (solveSuccess) {
                             this.board.setGrid(boardCopy); // Keep solved state on board
                             this._updateUI();
                             celebrate();
                         } else {
                             console.log("Visual solver couldn't find a solution (or was interrupted).");
                             // Optionally restore original board state here
                         }

                     } else {
                         console.log("Solving instantly...");
                         if (Solver.solve(boardCopy)) {
                             this.board.setGrid(boardCopy); // Apply solution
                             this._updateUI();
                             celebrate();
                         } else {
                             console.log("No solution found.");
                              // Optionally show a message to the user
                              alert("Could not find a solution for the current board.");
                         }
                     }
                 });
            },
            onUndoRequest: () => this._undo(),
            // onRedoRequest: () => this._redo(), // Add if implemented
            onAutoMarkRequest: () => this._clearAllPencilMarks(), // Current button toggles clear/auto-fill

            // Persistence Callbacks
            onExportRequest: () => {
                const code = Persistence.encodeBoardToString(this.board.getGrid(), this.board.getInitialGrid());
                this.ui.showExportBox(code);
            },
            onExportConfirm: (code) => {
                    // Copy to clipboar
                    copyToClipboard(code);
                 this.ui.hideExportBox();
                 // Maybe show a temporary "Copied!" message
            },
             onLoadRequest: () => {
                this.ui.showLoadBox();
            },
            onLoadConfirm: (code) => {
                console.log("Loading board from code:", code);
                this.ui.hideLoadBox();
                const decoded = Persistence.decodeBoardFromString(code);
                if (decoded) {
                     this.ui.showConfirm("Load this board? Current progress will be lost.", () => {
                        this.stopAutoSave();
                        this.timer.reset();
                        this.undoStack = [];
                        this.redoStack = [];
                        this.board.setGrid(decoded.grid);
                        this.board.setInitialGrid(decoded.initialGrid);
                        this.board.clearAllPencilMarks(); // Clear marks on load
                        this._setSelectedCell(null, null); // Deselect
                        this._updateUI();
                        this.timer.start();
                        this.startAutoSave();
                     });
                } else {
                     alert("Invalid board code provided.");
                     // this.ui.showError("Invalid board code.");
                }
            },

             // Settings Callbacks
             onSettingsOpen: () => this.ui.showSettingsPanel(),
             onSettingsSave: () => {
                // Settings are updated via onSettingChange, just hide panel
                this.ui.hideSettingsPanel();
                this._saveGame(); // Save settings immediately
             },
             onSettingChange: (settingName, value) => {
                 if (this.currentState.settings.hasOwnProperty(settingName)) {
                     this.currentState.settings[settingName] = value;
                     console.log(`Setting ${settingName} changed to ${value}`);
                      // Some settings might require immediate action
                      // e.g., if autoPencilMarks is turned on, maybe run _autoFillPencilMarks?
                      // For now, just update the state. Save happens on panel close or auto-save.
                 }
             },

             // Other UI Callbacks
             onResize: () => this._detectPlatform(),
        };
    }

    // --- Keyboard Handling ---
    _handleKeydown(event) {
        const { selectedRow, selectedCol, mode } = this.currentState;
        const key = event.key;
        const isCtrl = event.ctrlKey || event.metaKey; // Meta for Mac Cmd key

        // Prevent browser shortcuts if modifier keys used
        if (isCtrl && ['z', 'y', 'r', 'n', 'm'].includes(key.toLowerCase())) {
            event.preventDefault();
        }

        // --- Global Shortcuts ---
        if (isCtrl && key.toLowerCase() === 'z') {
            this._undo();
            return;
        }
         if (isCtrl && key.toLowerCase() === 'y') {
             // this._redo(); // Add if implemented
             return;
         }
         if (isCtrl && key.toLowerCase() === 'm') {
              this._clearAllPencilMarks(); // Ctrl+M for auto-mark/clear
              return;
         }
        if (key === 'm' && !isCtrl) { // Toggle marking mode (lowercase 'm')
            this._setMode(Modes.MARKING);
            return;
        }
         if (key === 'f' && !isCtrl) { // Toggle focus mode (lowercase 'f')
             this._setMode(Modes.FOCUS);
             return;
         }
         if (key === ' ') { // Spacebar for pause/play
            event.preventDefault(); // Prevent page scroll
            this.callbacks.onPauseToggle(); // Use the callback method
            return;
         }

        // --- Cell Input / Navigation (Requires selected cell) ---

        // Focus Mode Digit Input
         if (mode === Modes.FOCUS && key >= '0' && key <= '9') {
             this._focusDigit(parseInt(key, 10));
             return;
         }
          if (mode === Modes.FOCUS && (key === 'Backspace' || key === 'Delete')) {
              this._focusDigit(0); // Clear focus
              return;
          }

        // No cell selected, ignore input keys
        if (selectedRow === null || selectedCol === null) return;

        // Number Input (1-9)
        if (key >= '1' && key <= '9') {
            this._handleCellInput(parseInt(key, 10));
        }
        // Erase Input (Backspace/Delete)
        else if (key === 'Backspace' || key === 'Delete') {
            this._handleCellInput(0);
        }
        // Arrow Key Navigation
        else if (key.startsWith('Arrow')) {
             event.preventDefault(); // Prevent page scroll
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
}
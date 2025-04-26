// js/sudoku/ui.js
import { BOARD_SIZE, Modes, Difficulty } from './constants.js';

export class SudokuUI {
    constructor(callbacks) {
        // Callbacks from Game instance to notify about user interactions
        this.callbacks = callbacks; // e.g., { onCellClick, onNumberInput, onModeToggle, ... }

        // Cache DOM elements
        this.gridContainer = document.querySelector('.sudoku');
        this.cells = []; // Will be populated in createGrid
        this.timerText = document.querySelector('.timer .timer-text');
        this.pauseButtonIcon = document.querySelector('.play-pause i');
        this.pencilModeButton = document.getElementById('pencil_button');
        this.focusModeButton = document.getElementById('focus_button');
        this.difficultyButton = document.getElementById('difficultyButton');
        this.numButtons = document.querySelectorAll('.num-button'); // Mobile numpad
        this.undoButton = document.getElementById('undo');
        // this.redoButton = document.getElementById('redo'); // Uncomment if needed

        // Modals / Floating Boxes
        this.settingsPanel = document.getElementById('settingsPanel');
        this.exportBox = document.getElementById('exportBox');
        this.loadBox = document.getElementById('loadBox');
        this.confirmBox = document.getElementById('confirmBox');
        this.exportCodeDisplay = document.getElementById('exportcodedisplay');
        this.loadCodeInput = document.getElementById('code');
        this.confirmText = document.getElementById('confirmText');
        this.confirmButton = document.getElementById('confirmButton');
        this.cancelButton = document.getElementById('cancelButton');

        // Settings Toggles
        this.pencilmarkToggle = document.getElementById('pencilmark-toggle');
        this.saveDifficultyToggle = document.getElementById('save-difficulty-toggle');

        this._createGridDOM(); // Create the cell structure
        this._attachEventListeners();
    }

    // --- Grid Creation ---

    _createGridDOM() {
        this.gridContainer.innerHTML = ''; // Clear existing content
        this.cells = []; // Reset internal cell cache

        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sudoku-row';
            const rowCells = [];

            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'sudoku-cell default'; // Start as default
                cellDiv.dataset.row = r; // Use 0-based index internally
                cellDiv.dataset.col = c;

                // Main number display
                const cellText = document.createElement('span');
                cellText.className = 'cell-text';
                cellDiv.appendChild(cellText);

                // Pencil marks grid
                const pencilMarksDiv = document.createElement('div');
                pencilMarksDiv.className = 'pencil-marks';
                pencilMarksDiv.style.pointerEvents = 'none'; // Non-interactive

                for (let pr = 0; pr < 3; pr++) {
                    const pencilRow = document.createElement('div');
                    pencilRow.className = 'pencil-row';
                    for (let pc = 0; pc < 3; pc++) {
                        const num = pr * 3 + pc + 1;
                        const pencilMark = document.createElement('div');
                        pencilMark.className = 'pencil-mark';
                        pencilMark.dataset.num = num;
                        pencilMark.textContent = num;
                        pencilRow.appendChild(pencilMark);
                    }
                    pencilMarksDiv.appendChild(pencilRow);
                }
                cellDiv.appendChild(pencilMarksDiv);

                rowDiv.appendChild(cellDiv);
                rowCells.push(cellDiv);
            }
            this.gridContainer.appendChild(rowDiv);
            this.cells.push(rowCells);
        }
        console.log("Sudoku Grid DOM created.");
    }

    getCellElement(row, col) {
         if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            return this.cells[row][col];
         }
         return null;
    }

    // --- Display Updates ---

    displayBoard(boardData) {
        // boardData: { grid: number[][], initialGrid: number[][], pencilMarks: boolean[][][] }
        const { grid, initialGrid, pencilMarks } = boardData;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.getCellElement(r, c);
                if (!cell) continue;

                const value = grid[r][c];
                const isPrefilled = initialGrid[r][c] !== 0;

                // Update main value
                const cellText = cell.querySelector('.cell-text');
                cellText.textContent = value === 0 ? '' : value;

                // Update cell style (prefilled, default, etc.)
                cell.classList.toggle('prefilled', isPrefilled);
                cell.classList.toggle('default', !isPrefilled);
                cell.classList.remove('error'); // Clear previous errors maybe

                // Update pencil marks
                const pencilMarksDiv = cell.querySelector('.pencil-marks');
                if (value !== 0) {
                    pencilMarksDiv.style.display = 'none'; // Hide if cell has value
                } else {
                    pencilMarksDiv.style.display = ''; // Show if cell is empty
                    const cellPencilMarks = pencilMarks[r][c]; // Array[9] of booleans
                    for (let num = 1; num <= BOARD_SIZE; num++) {
                        const markElement = cell.querySelector(`.pencil-mark[data-num="${num}"]`);
                        if (markElement) {
                            markElement.classList.toggle('marked', cellPencilMarks[num - 1]);
                        }
                    }
                }
            }
        }
    }

    updateTimer(formattedTime) {
        if (this.timerText) {
            this.timerText.textContent = formattedTime;
        }
    }

    updatePauseButton(isPaused) {
        if (!this.pauseButtonIcon) return;
        if (isPaused) {
            this.pauseButtonIcon.classList.remove('fa-pause');
            this.pauseButtonIcon.classList.add('fa-play');
        } else {
            this.pauseButtonIcon.classList.remove('fa-play');
            this.pauseButtonIcon.classList.add('fa-pause');
        }
    }

     updateModeButtons(currentMode) {
        this.pencilModeButton?.classList.toggle('selected', currentMode === Modes.MARKING);
        this.focusModeButton?.classList.toggle('selected', currentMode === Modes.FOCUS);
        // If other buttons need updating based on mode
    }

     updateDifficultyButton(difficultyValue) {
         if(!this.difficultyButton) return;
         let text = 'easy';
         switch(difficultyValue) {
             case Difficulty.MEDIUM: text = 'medium'; break;
             case Difficulty.HARD: text = 'hard'; break;
             case Difficulty.IMPOSSIBLE: text = '!?'; break;
         }
         this.difficultyButton.textContent = text;
     }

     selectCell(row, col, prevRow, prevCol) {
        // Deselect previous cell
        if (prevRow !== null && prevCol !== null) {
            this.getCellElement(prevRow, prevCol)?.classList.remove('selected');
        }
         // Select new cell
        if (row !== null && col !== null) {
            this.getCellElement(row, col)?.classList.add('selected');
        }
    }

     updateNumPad(validInputs, canErase, isMarkingMode, isPrefilled) {
        this.numButtons.forEach(button => {
            const num = parseInt(button.dataset.num, 10);
            let isDisabled = true; // Default to disabled

            if (isPrefilled && !isMarkingMode) { // Can't change prefilled in normal mode
                 isDisabled = true;
            } else if (num === 0) { // Erase button
                isDisabled = !canErase;
            } else if (isMarkingMode) { // Marking mode
                isDisabled = false; // Always allow marking toggles 1-9
            } else { // Normal mode, non-prefilled cell
                isDisabled = !validInputs.includes(num);
            }
            button.disabled = isDisabled;
        });
    }

    // Highlight cells with a specific number or pencil mark
    applyFocus(value) {
        this.clearFocus(); // Clear previous focus first

        if (value < 1 || value > 9) return; // Only focus 1-9

        this.cells.flat().forEach(cell => {
            const cellText = cell.querySelector('.cell-text');
            const cellValue = parseInt(cellText.textContent, 10);

            if (cellValue === value) {
                cell.classList.add('focused');
            } else {
                // Check pencil marks if cell is empty
                const pencilMark = cell.querySelector(`.pencil-mark[data-num="${value}"].marked`);
                if (pencilMark) {
                    pencilMark.classList.add('focused'); // Focus the specific mark
                    // Optionally highlight the cell containing the focused mark
                    // cell.classList.add('focused-pencil');
                }
            }
        });
    }

    clearFocus() {
        this.cells.flat().forEach(cell => {
            cell.classList.remove('focused');
            // cell.classList.remove('focused-pencil');
            cell.querySelectorAll('.pencil-mark.focused').forEach(mark => {
                mark.classList.remove('focused');
            });
        });
    }

    showBoardError(row, col) { // Example: flash cell red on invalid input attempt
        const cell = this.getCellElement(row, col);
        if (cell) {
            cell.classList.add('error');
            setTimeout(() => cell.classList.remove('error'), 500); // Temporary feedback
        }
    }

    // --- Modals / Popups ---

    showConfirm(prompt, confirmCallback, cancelCallback) {
        this.confirmText.textContent = prompt;
        // Clone and replace to remove previous listeners
        const newConfirmButton = this.confirmButton.cloneNode(true);
        this.confirmButton.parentNode.replaceChild(newConfirmButton, this.confirmButton);
        this.confirmButton = newConfirmButton;

        const newCancelButton = this.cancelButton.cloneNode(true);
        this.cancelButton.parentNode.replaceChild(newCancelButton, this.cancelButton);
        this.cancelButton = newCancelButton;

        this.confirmButton.onclick = () => {
            this.hideConfirm();
            if (confirmCallback) confirmCallback();
        };
        this.cancelButton.onclick = () => {
            this.hideConfirm();
            if (cancelCallback) cancelCallback();
        };
        this.confirmBox.classList.add('show');
    }

    hideConfirm() {
        this.confirmBox.classList.remove('show');
        this.confirmButton.onclick = null; // Clean up listener
        this.cancelButton.onclick = null;  // Clean up listener
    }

    showExportBox(code) {
        this.exportCodeDisplay.textContent = code;
        this.exportBox.classList.add('show');
    }

    hideExportBox() {
        this.exportBox.classList.remove('show');
    }

     showLoadBox() {
        this.loadCodeInput.value = ''; // Clear previous input
        this.loadBox.classList.add('show');
    }

    hideLoadBox() {
        this.loadBox.classList.remove('show');
    }

     showSettingsPanel() {
        this.settingsPanel.classList.add('show');
    }

     hideSettingsPanel() {
         this.settingsPanel.classList.remove('show');
     }

    // --- Event Listeners Setup ---
    _attachEventListeners() {
        // Grid Clicks (Event Delegation)
        this.gridContainer.addEventListener('click', (event) => {
            const cell = event.target.closest('.sudoku-cell');
            if (cell && this.callbacks.onCellClick) {
                const row = parseInt(cell.dataset.row, 10);
                const col = parseInt(cell.dataset.col, 10);
                this.callbacks.onCellClick(row, col);
            }
        });

        // Click outside grid to deselect
         document.addEventListener('click', (event) => {
            if (!event.target.closest('.sudoku') && // Clicked outside grid
                !event.target.closest('.num-button') && // Not on numpad
                !event.target.closest('.mode-button') && // Not on mode buttons
                !event.target.closest('.floatingBox') && // Not inside floating boxes
                 this.callbacks.onClickOutside)
            {
                this.callbacks.onClickOutside();
            }
        });


        // Mobile Numpad
        this.numButtons.forEach(button => {
            button.addEventListener('click', () => {
                const num = parseInt(button.dataset.num, 10);
                if (this.callbacks.onNumberInput) {
                    this.callbacks.onNumberInput(num);
                }
            });
        });

        // Keyboard Input
        document.addEventListener('keydown', (event) => {
            if (this.callbacks.onKeydown) {
                this.callbacks.onKeydown(event); // Let Game logic handle key interpretation
            }
        });

        // --- Top Buttons ---
        document.querySelector('.header-button-container button[onclick*="home"]').onclick = () => window.location.href='/';
        document.querySelector('.header-button-container button[onclick*="openSettingsPanel"]').onclick = () => this.callbacks.onSettingsOpen();
        document.querySelector('.header-button-container button[onclick*="tryExport"]').onclick = () => this.callbacks.onExportRequest();
        document.querySelector('.header-button-container button[onclick*="tryLoad"]').onclick = () => this.callbacks.onLoadRequest();

        // --- Mode Buttons ---
        this.pencilModeButton.onclick = () => this.callbacks.onModeToggleRequest(Modes.MARKING);
        this.focusModeButton.onclick = () => this.callbacks.onModeToggleRequest(Modes.FOCUS);
        document.querySelector('button[onclick*="trySolveBoard"]').onclick = () => this.callbacks.onSolveRequest(false); // false = not visual
        document.querySelector('button[onclick*="hintBoard"]').onclick = () => this.callbacks.onHintRequest(); // false = not visual

        // --- Bottom Buttons ---
        this.undoButton.onclick = () => this.callbacks.onUndoRequest();
        // Add redo if implemented: this.redoButton.onclick = () => this.callbacks.onRedoRequest();
        document.getElementById('automark').onclick = () => this.callbacks.onAutoMarkRequest();
        document.querySelector('button[onclick*="resetboard"]').onclick = () => this.callbacks.onResetRequest();
        document.querySelector('button[onclick*="randomboard"]').onclick = () => this.callbacks.onNewGameRequest();
        this.difficultyButton.onclick = () => this.callbacks.onDifficultyCycle();

        // --- Floating Box Buttons ---
        // Settings
        document.querySelector('#settingsPanel button[onclick*="closeAndSaveSettings"]').onclick = () => this.callbacks.onSettingsSave();
        // Export
        document.querySelector('#exportBox button[onclick*="copyCode"]').onclick = () => this.callbacks.onExportConfirm(this.exportCodeDisplay.textContent); // Pass code to copy
        document.querySelector('#exportBox button[onclick*="copyURL"]').onclick = () => this.callbacks.onExportConfirmURL(this.exportCodeDisplay.textContent); // Pass code to copy
         // Assuming close is handled by copy button now
        // Load
        document.querySelector('#loadBox button[onclick*="loadBoard"]').onclick = () => this.callbacks.onLoadConfirm(this.loadCodeInput.value);
        document.querySelector('#loadBox button[onclick*="closeLoad"]').onclick = () => this.hideLoadBox(); // Simple hide

        // --- Settings Toggles ---
        this.pencilmarkToggle.onchange = (e) => this.callbacks.onSettingChange('autoPencilMarks', e.target.checked);
        this.saveDifficultyToggle.onchange = (e) => this.callbacks.onSettingChange('saveDifficulty', e.target.checked);

        // --- Timer Pause/Play ---
        document.querySelector('.play-pause').onclick = () => this.callbacks.onPauseToggle();

        // Window Resize
        window.addEventListener('resize', () => {
            if (this.callbacks.onResize) {
                this.callbacks.onResize();
            }
        });

        console.log("UI Event Listeners attached.");
    }

    // Update settings checkboxes based on loaded settings
    applySettings(settings) {
        this.pencilmarkToggle.checked = settings.autoPencilMarks;
        this.saveDifficultyToggle.checked = settings.saveDifficulty;
        this.updateDifficultyButton(settings.difficulty);
    }
}
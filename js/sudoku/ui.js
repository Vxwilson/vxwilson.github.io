// js/sudoku/ui.js
import { BOARD_SIZE, Modes, DifficultyLevel } from './constants.js';

export class SudokuUI {
    constructor(callbacks) {
        this.callbacks = callbacks;

        // Cache DOM elements
        this.gridContainer = document.querySelector('.sudoku');
        this.cells = [];
        this.timerText = document.querySelector('.timer .timer-text');
        this.pauseButtonIcon = document.querySelector('.play-pause i');
        this.pencilModeButton = document.getElementById('pencil_button');
        this.focusModeButton = document.getElementById('focus_button');
        this.difficultyButton = document.getElementById('difficultyButton');
        this.numButtons = document.querySelectorAll('.num-button');
        this.undoButton = document.getElementById('undo');
        this.hintButton = document.getElementById('hintButton'); // Added hint button

        this.hintDisplayElement = document.getElementById('hint-display'); // Added hint display element

        // Modals / Floating Boxes (assuming IDs match HTML)
        this.settingsPanel = document.getElementById('settingsPanel');
        this.exportBox = document.getElementById('exportBox');
        this.loadBox = document.getElementById('loadBox');
        this.confirmBox = document.getElementById('confirmBox');
        this.exportCodeDisplay = document.getElementById('exportcodedisplay');
        this.loadCodeInput = document.getElementById('code');
        this.confirmText = document.getElementById('confirmText');
        this.confirmButton = document.getElementById('confirmButton');
        this.cancelButton = document.getElementById('cancelButton');

        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.loadingProgressText = document.getElementById('loadingProgressText');

        // Settings Toggles
        this.pencilmarkToggle = document.getElementById('pencilmark-toggle');
        this.saveDifficultyToggle = document.getElementById('save-difficulty-toggle');
        this.showHintAlertToggle = document.getElementById('show-hint-alert-toggle');

        this.updateUndoRedoButtons(false, false);
        
        this._createGridDOM();
        this._attachEventListeners();
    }

    // --- Grid Creation ---
    _createGridDOM() {
        // ... (DOM creation logic remains the same)
        this.gridContainer.innerHTML = '';
        this.cells = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sudoku-row';
            const rowCells = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'sudoku-cell default';
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                const cellText = document.createElement('span');
                cellText.className = 'cell-text';
                cellDiv.appendChild(cellText);

                const pencilMarksDiv = document.createElement('div');
                pencilMarksDiv.className = 'pencil-marks';
                pencilMarksDiv.style.pointerEvents = 'none';
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
        const { grid, initialGrid, pencilMarks } = boardData;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.getCellElement(r, c);
                if (!cell) continue;
                const value = grid[r][c];
                const isPrefilled = initialGrid[r][c] !== 0;
                const cellText = cell.querySelector('.cell-text');
                cellText.textContent = value === 0 ? '' : value;
                cell.classList.toggle('prefilled', isPrefilled);
                cell.classList.toggle('default', !isPrefilled && value !== 0); // Added value check for default
                cell.classList.remove('error');
                const pencilMarksDiv = cell.querySelector('.pencil-marks');
                if (value !== 0) {
                    pencilMarksDiv.style.display = 'none';
                } else {
                    pencilMarksDiv.style.display = '';
                    const cellPencilMarks = pencilMarks[r][c];
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
        this.pauseButtonIcon.classList.toggle('fa-pause', !isPaused);
        this.pauseButtonIcon.classList.toggle('fa-play', isPaused);
    }

    updateModeButtons(currentMode) {
        this.pencilModeButton?.classList.toggle('selected', currentMode === Modes.MARKING);
        this.focusModeButton?.classList.toggle('selected', currentMode === Modes.FOCUS);
    }

    updateDifficultyButton(difficultyValue) {
        if (this.difficultyButton) {
            this.difficultyButton.textContent = String(difficultyValue || DifficultyLevel.MEDIUM); // Provide a default if null/undefined
        }
    }

    selectCell(row, col, prevRow, prevCol) {
        // Deselect previous cell
        if (prevRow !== null && prevCol !== null) {
            this.getCellElement(prevRow, prevCol)?.classList.remove('selected');
        }
        // Deselect all currently selected (safer if state gets out of sync)
        this.gridContainer.querySelectorAll('.sudoku-cell.selected').forEach(c => c.classList.remove('selected'));

        // Select new cell
        if (row !== null && col !== null) {
            this.getCellElement(row, col)?.classList.add('selected');
        }
    }

    // updateNumPad(validInputs, canErase, isMarkingMode, isPrefilled) {
    //     this.numButtons.forEach(button => {
    //         const num = parseInt(button.dataset.num, 10);
    //         let isDisabled = true;

    //         if (num === 0) { // Erase button
    //             isDisabled = !canErase || isPrefilled; // Cannot erase prefilled
    //         } else if (isMarkingMode) { // Marking mode
    //             isDisabled = isPrefilled; // Cannot add pencil marks to prefilled cells
    //         } else { // Normal input mode
    //             isDisabled = isPrefilled; // Cannot change prefilled cell value
    //             // If not prefilled, enable if input is valid OR always enable (let game logic handle validation feedback)
    //             // Let's enable all 1-9, Game logic shows error if invalid
    //             if (!isPrefilled) isDisabled = false;
    //             // OR if you want to pre-disable based on validity:
    //             // isDisabled = isPrefilled || !validInputs.includes(num);
    //         }
    //         button.disabled = isDisabled;
    //     });
    // }

    updateNumPad(validInputs, canErase, isMarking, isPrefilled, mode) {
        // Get references to your numpad buttons (e.g., by data attribute)
        const numpadButtons = this.numButtons; 
        // const eraseButton = this.numpadContainer.querySelector('[data-value="0"]'); // Assuming 0 is erase
    
        numpadButtons.forEach(button => {
            const value = parseInt(button.dataset.num, 10);
            let isDisabled = true; // Default to disabled
    
            if (value === 0) {
                // Handle Erase button
                isDisabled = !canErase;
                // --- NEW: Change erase button appearance in Focus mode ---
                if (mode === Modes.FOCUS) {
                    //  button.textContent = 'Clear Focus'; // Or set an icon/class
                     // Ensure it's visually distinct if needed
                     button.classList.add('numpad-button--focus-clear');
                } else {
                    //  button.textContent = 'Erase'; // Or set default icon/class
                     button.classList.remove('numpad-button--focus-clear');
                }
                 // --- End New ---
            } else if (value >= 1 && value <= 9) {
                // Handle Number buttons
                if (mode === Modes.FOCUS) {
                    // Always enabled in focus mode
                     isDisabled = false;
                } else if (isMarking) {
                    // Enabled if not prefilled (validInputs check might be redundant here if always 1-9)
                     isDisabled = isPrefilled || !validInputs.includes(value);
                } else { // Normal Mode
                     // Disabled if prefilled OR not a valid input number
                     isDisabled = isPrefilled || !validInputs.includes(value);
                }
            }
    
            button.disabled = isDisabled;
            // Optional: Add/remove classes for styling disabled/active states
            button.classList.toggle('numpad-button--disabled', isDisabled);
            button.classList.toggle('numpad-button--active', !isDisabled); // Example active class
            // Optional: Add specific styling for prefilled cells affecting numpad
            // Handled by isDisabled logic now, but you could add a class:
            // button.classList.toggle('numpad-button--prefilled-target', isPrefilled && value !== 0);
    
        });
    
         // Example: Add a class to the container based on mode
        //  this.numpadContainer.classList.toggle('focus-mode', mode === Modes.FOCUS);
        //  this.numpadContainer.classList.toggle('marking-mode', mode === Modes.MARKING);
        //  this.numpadContainer.classList.toggle('normal-mode', mode === Modes.NORMAL);
    }

    showBoardError(row, col) {
        const cell = this.getCellElement(row, col);
        if (cell) {
            cell.classList.add('error');
            // Ensure removal even if another error happens quickly
            cell.errorTimeout = setTimeout(() => {
                cell.classList.remove('error');
                delete cell.errorTimeout;
            }, 500);
        }
    }

    // --- Modals / Popups ---
    showConfirm(prompt, confirmCallback, cancelCallback) {
        this.confirmText.textContent = prompt;
        const newConfirmButton = this.confirmButton.cloneNode(true);
        this.confirmButton.parentNode.replaceChild(newConfirmButton, this.confirmButton);
        this.confirmButton = newConfirmButton;

        const newCancelButton = this.cancelButton.cloneNode(true);
        this.cancelButton.parentNode.replaceChild(newCancelButton, this.cancelButton);
        this.cancelButton = newCancelButton;

        this.confirmButton.onclick = () => {
            this.hideConfirm();
            setTimeout(() => { if (confirmCallback) confirmCallback(); }, 0);
        };
        this.cancelButton.onclick = () => {
            this.hideConfirm();
            if (cancelCallback) cancelCallback();
        };

        this.confirmBox.classList.add('show');
    }

    hideConfirm() {
        this.confirmBox.classList.remove('show');
        if (this.confirmButton) this.confirmButton.onclick = null;
        if (this.cancelButton) this.cancelButton.onclick = null;
    }

    showExportBox(code) { /* ... */ this.exportCodeDisplay.textContent = code; this.exportBox.classList.add('show'); }
    hideExportBox() { /* ... */ this.exportBox.classList.remove('show'); }
    showLoadBox() { /* ... */ this.loadCodeInput.value = ''; this.loadBox.classList.add('show'); }
    hideLoadBox() { /* ... */ this.loadBox.classList.remove('show'); }
    showSettingsPanel() { /* ... */ this.settingsPanel.classList.add('show'); }
    hideSettingsPanel() { /* ... */ this.settingsPanel.classList.remove('show'); }

    // Loading Indicator Methods
    showLoading(initialText = "attempt ") {
        if (this.loadingIndicator && this.loadingProgressText) {
            this.loadingProgressText.textContent = initialText;
            this.loadingIndicator.classList.add('show');
            console.log("Showing loading indicator.");
        } else {
            console.error("Loading indicator elements not found!");
        }
    }

    updateLoadingProgress(currentAttempt, totalAttempts, difficulty) {
        if (this.loadingProgressText) {
            // check if difficulty is a not null or undefined
            if (difficulty === "") {
                this.loadingProgressText.textContent = `[${currentAttempt}]`;
                // console.log("loading progress: Difficulty is null or undefined, showing attempt progress.");
            }
            else {
                this.loadingProgressText.textContent = `[${currentAttempt}] ${difficulty}`;
            }

            // this.loadingProgressText.textContent = `${currentAttempt} of ${totalAttempts}`;
            console.log(`Loading progress: ${currentAttempt}/${totalAttempts}, difficulty: ${difficulty}`);
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
            console.log("Hiding loading indicator.");
        }
    }

    // --- Focus Highlighting (Keep separate from Hint) ---
    applyFocusHighlight(focusTarget) {
        this.clearFocusHighlight();
        if (focusTarget === null || focusTarget === undefined) return;
        const numbersToFocus = (typeof focusTarget === 'number') ? new Set([focusTarget]) : focusTarget;
        if (numbersToFocus.size === 0) return;

        this.cells.flat().forEach(cell => {
            if (!cell) return;
            const cellText = cell.querySelector('.cell-text');
            const cellValue = parseInt(cellText.textContent, 10) || 0;

            if (cellValue !== 0 && numbersToFocus.has(cellValue)) {
                cell.classList.add('focus-highlight-cell');
            }
            if (cellValue === 0) {
                const pencilMarksDiv = cell.querySelector('.pencil-marks');
                numbersToFocus.forEach(num => {
                    const markElement = pencilMarksDiv?.querySelector(`.pencil-mark[data-num="${num}"].marked`);
                    if (markElement) {
                        markElement.classList.add('focus-highlight-pencil');
                    }
                });
            }
        });
    }

    clearFocusHighlight() {
        this.gridContainer.querySelectorAll('.focus-highlight-cell').forEach(c => c.classList.remove('focus-highlight-cell'));
        this.gridContainer.querySelectorAll('.focus-highlight-pencil').forEach(m => m.classList.remove('focus-highlight-pencil'));
    }


    // --- NEW/MODIFIED Hint Logic ---

    /**
     * Displays the hint technique name in the designated area.
     * @param {string} techniqueName - The name of the technique found.
     */
    displayHintTechnique(techniqueName) {
        if (this.hintDisplayElement) {
            this.hintDisplayElement.textContent = techniqueName || '';
            // Add 'visible' class only if there's text to display
            this.hintDisplayElement.classList.toggle('visible', !!techniqueName);
        } else {
            console.warn("Hint display element not found.");
        }
    }

    /**
     * Clears the hint technique name display area.
     */
    clearHintTechnique() {
        if (this.hintDisplayElement) {
            this.hintDisplayElement.textContent = '';
            this.hintDisplayElement.classList.remove('visible');
        }
    }

    /**
         * Applies visual highlights to the board for hints.
         * @param {Array<Object>} highlights - Array of highlight objects from the solver step.
         *                                     Expected format: { row: number, col: number, candidates: number[], type: string }
         * @param {boolean} showCandidates - If true, highlight specific candidates within cells.
         */
    applyHintHighlight(highlights, showCandidates) {
        console.log(`Applying highlights (Show Cands: ${showCandidates})`, highlights);
        // Clear previous board highlights *but keep the text display*
        this.clearHintHighlight(false);

        if (!highlights || highlights.length === 0) {
            console.log("No highlights provided to apply.");
            return;
        }

        highlights.forEach(hl => {
            const cell = this.getCellElement(hl.row, hl.col);
            if (!cell) {
                console.warn(`Hint highlight skipped: Cell R${hl.row}C${hl.col} not found.`);
                return;
            }

            const highlightTypeClass = `hint-${hl.type || 'involved'}`; // e.g., hint-target, hint-unit
            cell.classList.add('hint-highlight', highlightTypeClass);

            // Apply candidate highlights if requested and applicable
            if (showCandidates && hl.candidates && hl.candidates.length > 0) {
                const pencilMarksDiv = cell.querySelector('.pencil-marks');
                if (pencilMarksDiv) { // Check if pencil marks container exists
                    hl.candidates.forEach(cand => {
                        const markElement = pencilMarksDiv.querySelector(`.pencil-mark[data-num="${cand}"]`);
                        if (markElement) {
                            markElement.classList.add('hint-highlight-candidate');
                            // Add stronger highlight for the single candidate in placement hints
                            if (hl.type === 'target' && hl.candidates.length === 1 && cand === hl.value) { // Assuming step result includes 'value' for placement
                                markElement.classList.add('hint-highlight-candidate-strong');
                                cell.classList.add('hint-placement'); // Extra class on cell for placement
                            }
                        } else {
                            // console.warn(`Hint highlight: Pencil mark ${cand} not found in R${hl.row}C${hl.col}`);
                        }
                    });
                }
            } else if (showCandidates && hl.type === 'target' && hl.value) {
                // Handle Full House/Single placement highlight directly on the cell text
                const cellText = cell.querySelector('.cell-text');
                if (cellText && !cellText.textContent) { // Only if cell is visually empty
                    // Maybe add a temporary visual indicator for the number to be placed?
                    // Or rely on the 'hint-placement' class on the cell.
                    cell.classList.add('hint-placement');
                }
            }
        });
    }

    /**
         * Clears all visual hint highlights from the board (cells and candidates).
         * @param {boolean} [alsoClearText=true] - Whether to also clear the technique text display.
         */
    clearHintHighlight(alsoClearText = true) {
        const board = this.gridContainer; // Use cached grid container

        // Remove cell background highlights
        board.querySelectorAll('.hint-highlight').forEach(cell => {
            // Remove all possible hint type classes efficiently
            cell.className = cell.className.replace(/\bhint-(highlight|target|unit|defining|causing|involved|elimination|placement)\b/g, '').trim();
        });

        // Remove candidate highlights
        board.querySelectorAll('.hint-highlight-candidate, .hint-highlight-candidate-strong').forEach(mark => {
            mark.classList.remove('hint-highlight-candidate', 'hint-highlight-candidate-strong');
        });

        // Clear text display if requested
        if (alsoClearText) {
            this.clearHintTechnique();
        }
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
            const target = event.target;
            // Check if the click is outside the grid AND relevant controls
            if (!target.closest('.sudoku') &&           // Not inside grid container
                !target.closest('.num-button') &&       // Not on numpad button
                !target.closest('.mode-button') &&      // Not on Pencil/Focus mode button
                !target.closest('.buttons .sudoku-button') && // Not on bottom action buttons (Undo, Reset etc)
                !target.closest('.header-button-container button') && // Not on top header buttons (Home, Settings etc)
                !target.closest('.timer .play-pause') && // Not on the pause button
                !target.closest('#hintButton') &&       // *** ADDED: Not on the Hint button itself ***
                !target.closest('.floatingBox') &&      // Not inside any floating box
                this.callbacks.onClickOutside) {
                console.log("Click outside detected, target:", target);
                this.callbacks.onClickOutside();
            }
            // Removed console.log from previous step if present
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
        document.querySelector('.header-button-container button[onclick*="home"]').onclick = () => window.location.href = '/';
        document.querySelector('.header-button-container button[onclick*="openSettingsPanel"]').onclick = () => this.callbacks.onSettingsOpen();
        document.querySelector('.header-button-container button[onclick*="training"]').onclick = () => window.location.href = '/sudoku/training.html';
        document.querySelector('.header-button-container button[onclick*="tryExport"]').onclick = () => this.callbacks.onExportRequest();
        document.querySelector('.header-button-container button[onclick*="tryLoad"]').onclick = () => this.callbacks.onLoadRequest();

        // --- Mode Buttons ---
        this.pencilModeButton.onclick = () => this.callbacks.onModeToggleRequest(Modes.MARKING);
        this.focusModeButton.onclick = () => this.callbacks.onModeToggleRequest(Modes.FOCUS);
        document.querySelector('button[onclick*="trySolveBoard"]').onclick = () => this.callbacks.onSolveRequest(false); // false = not visual
        document.querySelector('button[onclick*="hintBoard"]').onclick = () => this.callbacks.onHintRequest(); // false = not visual
        // this.hintButton.onclick = () => this.callbacks.onHintRequest(); // Added Hint button listener

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
        // Load
        document.querySelector('#loadBox button[onclick*="loadBoard"]').onclick = () => this.callbacks.onLoadConfirm(this.loadCodeInput.value);
        document.querySelector('#loadBox button[onclick*="closeLoad"]').onclick = () => this.hideLoadBox(); // Simple hide

        // --- Settings Toggles ---
        this.pencilmarkToggle.onchange = (e) => this.callbacks.onSettingChange('autoPencilMarks', e.target.checked);
        this.saveDifficultyToggle.onchange = (e) => this.callbacks.onSettingChange('saveDifficulty', e.target.checked);
        this.showHintAlertToggle.onchange = (e) => this.callbacks.onSettingChange('showHintAlert', e.target.checked);

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
        this.showHintAlertToggle.checked = settings.showHintAlert;
        this.updateDifficultyButton(settings.difficulty);
    }

    // Add this method to the TrainingUI class
    updateUndoRedoButtons(canUndo, canRedo) {
    if (this.undoButton) {
        this.undoButton.disabled = !canUndo;
        // Add/remove a class for styling if desired
        this.undoButton.classList.toggle('disabled', !canUndo);
    }
    // Handle redo button if you add it later
    // if (this.redoButton) {
    //     this.redoButton.disabled = !canRedo;
    //     this.redoButton.classList.toggle('disabled', !canRedo);
    // }
}
}
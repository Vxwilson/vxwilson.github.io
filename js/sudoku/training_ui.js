import { BOARD_SIZE, Modes, DifficultyLevel } from './constants.js'; // Include constants

export class TrainingUI {
    constructor(callbacks) {
        this.callbacks = callbacks;

        // Cache DOM elements specific to training or reused
        this.gridContainer = document.querySelector('.sudoku');
        this.cells = [];
        // Timer elements might not exist or be hidden by CSS
        // this.timerText = document.querySelector('.timer .timer-text');
        // this.pauseButtonIcon = document.querySelector('.play-pause i');

        // Mode Buttons
        this.pencilModeButton = document.getElementById('pencil_button');
        this.focusModeButton = document.getElementById('focus_button'); // <-- ADDED

        // Training Specific Elements
        this.techniqueSelect = document.getElementById('technique-select');
        // this.trainingTechniqueDisplay = document.getElementById('training-technique-display'); // Optional display area
        this.nextPuzzleButton = document.getElementById('next-training-puzzle');
        this.hintButton = document.getElementById('hintButton'); // Keep hint button

        // Numpad Buttons
        this.numButtonsContainer = document.querySelector('.mobile-numpad')?.parentElement; // Get container if needed
        this.numButtons = document.querySelectorAll('.num-button');

        // Action Buttons (if different from game)
        this.undoButton = document.getElementById('undo'); // Keep undo if styling exists
        this.resetButton = document.getElementById('reset');

        // Hint Display (if used)
        this.hintDisplayElement = document.getElementById('hint-display'); // Assuming exists or you add it

        // Modals / Floating Boxes (Reuse IDs if HTML is similar)
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

        // Settings Toggles (If settings panel exists in training.html)
        this.pencilmarkToggle = document.getElementById('pencilmark-toggle');
        this.saveDifficultyToggle = document.getElementById('save-difficulty-toggle');
        this.showHintAlertToggle = document.getElementById('show-hint-alert-toggle');

        this.updateUndoRedoButtons(false, false);

        this._createGridDOM(); // Create the grid
        this._attachEventListeners(); // Attach listeners
    }

    // --- Grid Creation ---
    _createGridDOM() {
        // Identical to game.js _createGridDOM
        this.gridContainer.innerHTML = ''; // Clear existing grid
        this.cells = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sudoku-row';
            const rowCells = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'sudoku-cell default'; // Start as default
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                const cellText = document.createElement('span');
                cellText.className = 'cell-text';
                cellDiv.appendChild(cellText);

                const pencilMarksDiv = document.createElement('div');
                pencilMarksDiv.className = 'pencil-marks';
                pencilMarksDiv.style.pointerEvents = 'none'; // Prevent clicks on marks div itself
                for (let pr = 0; pr < 3; pr++) {
                    const pencilRow = document.createElement('div');
                    pencilRow.className = 'pencil-row';
                    for (let pc = 0; pc < 3; pc++) {
                        const num = pr * 3 + pc + 1;
                        const pencilMark = document.createElement('div');
                        pencilMark.className = 'pencil-mark';
                        pencilMark.dataset.num = num;
                        pencilMark.textContent = num; // Keep number visible for styling
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
        console.log("[Training] Sudoku Grid DOM created.");
    }

    getCellElement(row, col) {
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            // Ensure cells array is populated
            if (this.cells && this.cells[row]) {
                 return this.cells[row][col];
            }
        }
        // console.warn(`[Training] Cell element not found for row ${row}, col ${col}`);
        return null;
    }

    // --- Display Updates ---
    displayBoard(boardData) {
        const { grid, initialGrid, pencilMarks } = boardData; // Use initialGrid for styling
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.getCellElement(r, c);
                if (!cell) continue; // Skip if cell doesn't exist

                const value = grid[r][c];
                // Check against the specific initial state for *this training puzzle*
                const isInitial = initialGrid && initialGrid[r] && initialGrid[r][c] !== 0 && initialGrid[r][c] === value;
                const cellText = cell.querySelector('.cell-text');

                cellText.textContent = value === 0 ? '' : value;
                // Apply 'prefilled' style to numbers present at the start of the training step
                cell.classList.toggle('prefilled', !!isInitial); // Use !! to ensure boolean
                cell.classList.toggle('default', !isInitial && value !== 0);
                cell.classList.remove('error'); // Clear previous errors

                const pencilMarksDiv = cell.querySelector('.pencil-marks');
                if (value !== 0) {
                    pencilMarksDiv.style.display = 'none'; // Hide marks if number is present
                } else {
                    pencilMarksDiv.style.display = ''; // Show marks container if empty
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

    updateTimer(formattedTime) { /* No timer in training usually */ }
    updatePauseButton(isPaused) { /* No pause button in training usually */ }

    updateModeButtons(currentMode) {
        // Use optional chaining in case buttons don't exist
        this.pencilModeButton?.classList.toggle('selected', currentMode === Modes.MARKING);
        this.focusModeButton?.classList.toggle('selected', currentMode === Modes.FOCUS);
    }

    // Difficulty button not used in training
    // updateDifficultyButton(difficultyValue) { }

    selectCell(row, col, prevRow, prevCol) {
        // Deselect previous cell if valid coordinates were provided
        if (prevRow !== null && prevCol !== null) {
            this.getCellElement(prevRow, prevCol)?.classList.remove('selected');
        }
        // Safer: Deselect all currently selected cells first
        this.gridContainer.querySelectorAll('.sudoku-cell.selected').forEach(c => c.classList.remove('selected'));

        // Select new cell if valid coordinates are provided
        if (row !== null && col !== null) {
            this.getCellElement(row, col)?.classList.add('selected');
        }
    }

    // --- MODIFIED: Update Numpad (Adapted from game.js UI) ---
    updateNumPad(validInputs, canErase, isMarkingMode, isPrefilled, mode) { // Added 'mode'
        if (!this.numButtons || this.numButtons.length === 0) return; // Guard if numpad doesn't exist

        this.numButtons.forEach(button => {
            const value = parseInt(button.dataset.num, 10); // Use dataset.num
            let isDisabled = true; // Default to disabled

            if (mode === Modes.FOCUS) {
                // FOCUS MODE: Enable all number toggles (1-9) and Clear Focus (0)
                 isDisabled = false; // Everything is enabled
                 if (value === 0) {
                     // Change erase button appearance
                     button.innerHTML = '<i class="fa fa-ban"></i>'; // Example: Clear Focus icon
                     // Add class for specific styling if needed
                     button.classList.add('numpad-button--focus-clear');
                 } else {
                      // Ensure regular numbers look normal
                     button.textContent = value; // Set text content back to number
                     button.classList.remove('numpad-button--focus-clear');
                 }

            } else { // NORMAL or MARKING Mode (non-Focus)
                 // Revert erase button appearance if needed
                 if (value === 0) {
                      button.innerHTML = '<i class="fa fa-eraser"></i>'; // Default erase icon
                      button.classList.remove('numpad-button--focus-clear');
                      isDisabled = !canErase; // Enable based on canErase flag
                 } else {
                     // Handle number buttons 1-9
                     // In training, isPrefilled is effectively always false for interaction
                     // Enable based on mode logic from TrainingGame._updateNumPadVisibility
                      isDisabled = !validInputs.includes(value);
                 }
                 // In training, we ignore the `isPrefilled` parameter from the game logic,
                 // as interactability is determined by `isTrainingActive` and selection.
                 // The `validInputs` array passed from TrainingGame controls enablement here.
            }

            button.disabled = isDisabled;
            // Optional: Add/remove classes for visual styling
            button.classList.toggle('numpad-button--disabled', isDisabled);
            button.classList.toggle('numpad-button--active', !isDisabled);
        });

         // Optional: Add class to container based on mode
         if (this.numButtonsContainer) {
            this.numButtonsContainer.classList.toggle('focus-mode', mode === Modes.FOCUS);
            this.numButtonsContainer.classList.toggle('marking-mode', mode === Modes.MARKING);
            this.numButtonsContainer.classList.toggle('normal-mode', mode === Modes.NORMAL);
         }
    }

    showBoardError(row, col, message = null) { // Added optional message
        const cell = this.getCellElement(row, col);
        if (cell) {
            cell.classList.add('error');
            // Add tooltip/message if provided?
            if (message) cell.setAttribute('title', message);

            // Use existing timeout mechanism if present, otherwise create one
            if (cell.errorTimeout) clearTimeout(cell.errorTimeout);

            cell.errorTimeout = setTimeout(() => {
                cell.classList.remove('error');
                if (message) cell.removeAttribute('title');
                delete cell.errorTimeout;
            }, 600); // Slightly longer timeout
        }
    }

    // --- Modals / Popups (Largely unchanged if HTML structure is same) ---
    showConfirm(prompt, confirmCallback, cancelCallback) {
        if (!this.confirmBox || !this.confirmText || !this.confirmButton || !this.cancelButton) return;
        this.confirmText.textContent = prompt;

        // Clone and replace buttons to remove old listeners reliably
        const newConfirmButton = this.confirmButton.cloneNode(true);
        this.confirmButton.parentNode.replaceChild(newConfirmButton, this.confirmButton);
        this.confirmButton = newConfirmButton;

        const newCancelButton = this.cancelButton.cloneNode(true);
        this.cancelButton.parentNode.replaceChild(newCancelButton, this.cancelButton);
        this.cancelButton = newCancelButton;

        // Add new listeners
        this.confirmButton.onclick = () => {
            this.hideConfirm();
            // Use setTimeout to avoid issues if callback modifies DOM immediately
            setTimeout(() => { if (confirmCallback) confirmCallback(); }, 0);
        };
        this.cancelButton.onclick = () => {
            this.hideConfirm();
            if (cancelCallback) cancelCallback();
        };

        this.confirmBox.classList.add('show');
    }

    hideConfirm() {
        if (!this.confirmBox) return;
        this.confirmBox.classList.remove('show');
        // Remove listeners explicitly
        if (this.confirmButton) this.confirmButton.onclick = null;
        if (this.cancelButton) this.cancelButton.onclick = null;
    }

    // Keep modal show/hide functions if elements exist
    showExportBox(code) { if (this.exportBox) { this.exportCodeDisplay.textContent = code; this.exportBox.classList.add('show'); } }
    hideExportBox() { if (this.exportBox) this.exportBox.classList.remove('show'); }
    showLoadBox() { if (this.loadBox) { this.loadCodeInput.value = ''; this.loadBox.classList.add('show'); } }
    hideLoadBox() { if (this.loadBox) this.loadBox.classList.remove('show'); }
    showSettingsPanel() { if (this.settingsPanel) this.settingsPanel.classList.add('show'); }
    hideSettingsPanel() { if (this.settingsPanel) this.settingsPanel.classList.remove('show'); }

    // --- Loading Indicator ---
    showLoading(initialText = "Generating...") { // Default text for training
        if (this.loadingIndicator && this.loadingProgressText) {
            this.loadingProgressText.textContent = initialText;
            this.loadingIndicator.classList.add('show');
        }
    }

    updateLoadingProgress(currentAttempt, totalAttempts, difficultyOrTechnique) { // Parameter name change
        if (this.loadingProgressText) {
            // Show attempt count and technique name if provided
             if (difficultyOrTechnique) {
                this.loadingProgressText.textContent = `[${currentAttempt}] ${difficultyOrTechnique}`;
            } else {
                 this.loadingProgressText.textContent = `[${currentAttempt}]`;
            }
            // console.log(`[Training] Loading progress: ${currentAttempt}`);
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
        }
    }

    // --- Focus Highlighting (Reused from game.js UI) ---
    applyFocusHighlight(focusTarget) {
        this.clearFocusHighlight();
        if (focusTarget === null || focusTarget === undefined) return;
        // Ensure focusTarget is a Set
        const numbersToFocus = (typeof focusTarget === 'number') ? new Set([focusTarget]) : (focusTarget instanceof Set ? focusTarget : new Set());

        if (numbersToFocus.size === 0) return;

        this.cells.flat().forEach(cell => {
            if (!cell) return;
            const cellText = cell.querySelector('.cell-text');
            const cellValue = parseInt(cellText?.textContent || '0', 10); // Use optional chaining and default

            // Highlight matching numbers
            if (cellValue !== 0 && numbersToFocus.has(cellValue)) {
                cell.classList.add('focus-highlight-cell');
            }
            // Highlight matching pencil marks in empty cells
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

    // --- Hint Display & Highlighting (Reused/Adapted from game.js UI) ---
    displayHintTechnique(techniqueName) {
        if (this.hintDisplayElement) {
            this.hintDisplayElement.textContent = techniqueName || '';
            this.hintDisplayElement.classList.toggle('visible', !!techniqueName);
        }
    }

    clearHintTechnique() {
        if (this.hintDisplayElement) {
            this.hintDisplayElement.textContent = '';
            this.hintDisplayElement.classList.remove('visible');
        }
    }

    // Modified applyHintHighlight to accept optional step data
    applyHintHighlight(highlights, showCandidates, step = null) {
         console.log(`[Training] Applying highlights (Show Cands: ${showCandidates})`, highlights, step);
        // Clear previous board highlights *but keep the text display*
        this.clearHintHighlight(false);

        if (!highlights || highlights.length === 0) {
            console.log("[Training] No highlights provided.");
            return;
        }

        highlights.forEach(hl => {
            const cell = this.getCellElement(hl.row, hl.col);
            if (!cell) return;

            // Basic hint highlight and type class
            const highlightTypeClass = `hint-${hl.type || 'involved'}`;
            cell.classList.add('hint-highlight', highlightTypeClass);

            // Candidate/Value highlighting
            if (showCandidates) {
                 if (hl.candidates && hl.candidates.length > 0) { // Elimination highlights
                     const pencilMarksDiv = cell.querySelector('.pencil-marks');
                     hl.candidates.forEach(cand => {
                         const markElement = pencilMarksDiv?.querySelector(`.pencil-mark[data-num="${cand}"]`);
                         if (markElement) {
                             markElement.classList.add('hint-highlight-candidate');
                             // Optional: Add stronger highlight based on type?
                             // if (hl.type === 'elimination') markElement.classList.add('hint-highlight-candidate-strong');
                         }
                     });
                 } else if (step && step.value !== undefined && hl.row === step.cell[0] && hl.col === step.cell[1]) { // Placement highlight
                     // If it's the target placement cell, add specific class
                     cell.classList.add('hint-placement');
                     // Highlight the number to be placed (if cell is empty)
                     // This might be complex to show visually, maybe just rely on cell highlight
                     const cellText = cell.querySelector('.cell-text');
                     if(cellText && !cellText.textContent) {
                         // Maybe add a faint placeholder? Too complex?
                     }
                 }
            }
        });
    }


    clearHintHighlight(alsoClearText = true) {
        const board = this.gridContainer;
        if (!board) return;

        // Remove cell background highlights based on common prefixes/classes
        board.querySelectorAll('.hint-highlight, .hint-target, .hint-unit, .hint-defining, .hint-causing, .hint-involved, .hint-elimination, .hint-placement').forEach(cell => {
             // More robust removal
             cell.className = cell.className.replace(/\bhint-[\w-]+\b/g, '').replace(/\bhint-highlight\b/g, '').trim();
        });

        // Remove candidate highlights
        board.querySelectorAll('.hint-highlight-candidate, .hint-highlight-candidate-strong').forEach(mark => {
            mark.classList.remove('hint-highlight-candidate', 'hint-highlight-candidate-strong');
        });

        if (alsoClearText) {
            this.clearHintTechnique();
        }
    }

    // --- Populate Technique Selector ---
    populateTechniqueSelector(techniques) {
        if (!this.techniqueSelect) return;

        this.techniqueSelect.innerHTML = ''; // Clear existing options

        // Add default disabled option
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Technique...";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.id = 'technique-option'; // Give it an ID if needed elsewhere
        this.techniqueSelect.appendChild(defaultOption);


        // Add techniques from the list
        techniques.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.id; // Use a unique ID if available, otherwise name
            option.textContent = tech.name; // Display name
            this.techniqueSelect.appendChild(option);
        });

        // Initialize Materialize select if used (uncomment if needed)
        // M.FormSelect.init(this.techniqueSelect);
    }


    // --- Event Listeners Setup ---
    _attachEventListeners() {
        // Grid Clicks (Event Delegation)
        this.gridContainer?.addEventListener('click', (event) => {
            // Check if grid is disabled (while loading/completed)
            if (this.gridContainer.classList.contains('disabled')) return;
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
            // Check if click is outside relevant interactive areas
            if (!target.closest('.sudoku') &&
                !target.closest('.num-button') &&
                !target.closest('.mode-button') &&
                !target.closest('.buttons .sudoku-button') && // Bottom row buttons
                !target.closest('.header-button-container button') && // Header buttons
                !target.closest('.second-row button, .second-row select') && // Technique select/buttons row
                !target.closest('.floatingBox') &&
                this.callbacks.onClickOutside) {
                 console.log("[Training] Click outside detected, target:", target);
                this.callbacks.onClickOutside();
            }
        });

        // Mobile Numpad
        this.numButtons?.forEach(button => {
            button.addEventListener('click', () => {
                 // Check if button itself is disabled
                if (button.disabled) return;
                const num = parseInt(button.dataset.num, 10);
                if (this.callbacks.onNumberInput) {
                    this.callbacks.onNumberInput(num);
                }
            });
        });

        // Keyboard Input
        document.addEventListener('keydown', (event) => {
            // Prevent input if focus is on the technique selector
            if (document.activeElement === this.techniqueSelect) return;
            if (this.callbacks.onKeydown) {
                this.callbacks.onKeydown(event);
            }
        });

        // --- Top Buttons ---
        document.querySelector('.header-button-container button[onclick*="home"]').onclick = () => window.location.href = '/';
        var sudoku = document.querySelector('.header-button-container button[onclick*="sudoku"]')
        if (sudoku) {
            sudoku.onclick = () => window.location.href = '/sudoku/index.html';
        } else {
            console.warn("Sudoku button not found in header.");
        }

        // --- Training Specific Controls ---
        this.techniqueSelect?.addEventListener('change', (event) => {
            if (this.callbacks.onTechniqueSelect) {
                this.callbacks.onTechniqueSelect(event.target.value);
            }
        });

        this.nextPuzzleButton?.addEventListener('click', () => {
             if (this.callbacks.onNextPuzzleRequest) {
                 this.callbacks.onNextPuzzleRequest();
             }
        });

        // --- Mode Buttons ---
        this.pencilModeButton?.addEventListener('click', () => this.callbacks.onModeToggleRequest(Modes.MARKING));
        this.focusModeButton?.addEventListener('click', () => this.callbacks.onModeToggleRequest(Modes.FOCUS)); // <-- ADDED

        // --- Hint Button ---
        this.hintButton?.addEventListener('click', () => this.callbacks.onHintRequest());

        // --- Optional Buttons (Undo/Reset) ---
        this.undoButton?.addEventListener('click', () => {
             if (this.callbacks.onUndoRequest) this.callbacks.onUndoRequest();
             else console.warn("[Training] Undo callback not implemented.");
        });
        this.resetButton?.addEventListener('click', () => {
             if (this.callbacks.onResetRequest) this.callbacks.onResetRequest();
             else console.warn("[Training] Reset callback not implemented (use Next).");
        });


        // --- Re-add listeners for floating boxes if used ---
         // Settings (if settings panel is used)
         document.querySelector('#settingsPanel button[onclick*="closeAndSaveSettings"]')?.addEventListener('click', () => this.callbacks.onSettingsSave());
         // Export (if export is used)
         document.querySelector('#exportBox button[onclick*="copyCode"]')?.addEventListener('click', () => this.callbacks.onExportConfirm(this.exportCodeDisplay?.textContent || ''));
         document.querySelector('#exportBox button[onclick*="copyURL"]')?.addEventListener('click', () => this.callbacks.onExportConfirmURL(this.exportCodeDisplay?.textContent || ''));
         // Load (if load is used)
         document.querySelector('#loadBox button[onclick*="loadBoard"]')?.addEventListener('click', () => this.callbacks.onLoadConfirm(this.loadCodeInput?.value || ''));
         document.querySelector('#loadBox button[onclick*="closeLoad"]')?.addEventListener('click', () => this.hideLoadBox());

          // --- Settings Toggles (if used) ---
          this.pencilmarkToggle?.addEventListener('change', (e) => this.callbacks.onSettingChange('autoPencilMarks', e.target.checked));
          this.saveDifficultyToggle?.addEventListener('change', (e) => this.callbacks.onSettingChange('saveDifficulty', e.target.checked));
          this.showHintAlertToggle?.addEventListener('change', (e) => this.callbacks.onSettingChange('showHintAlert', e.target.checked));


        // Window Resize
        window.addEventListener('resize', () => {
            if (this.callbacks.onResize) {
                this.callbacks.onResize();
            }
        });

        console.log("[Training] UI Event Listeners attached.");
    }

    // Update settings checkboxes based on loaded settings (if needed)
    applySettings(settings) {
        if (this.pencilmarkToggle) this.pencilmarkToggle.checked = settings.autoPencilMarks;
        if (this.saveDifficultyToggle) this.saveDifficultyToggle.checked = settings.saveDifficulty;
        if (this.showHintAlertToggle) this.showHintAlertToggle.checked = settings.showHintAlert;
        // Difficulty button not relevant here
    }

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
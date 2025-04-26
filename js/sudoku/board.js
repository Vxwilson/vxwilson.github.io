// js/sudoku/board.js
import { BOARD_SIZE } from './constants.js';
import { deepCopy2DArray, deepCopyPencilMarks } from './utils.js';

export class SudokuBoard {
    constructor() {
        this.grid = this.createEmptyGrid();
        this.initialGrid = this.createEmptyGrid();
        this.pencilMarks = this.createEmptyPencilMarks();
    }

    createEmptyGrid() {
        return Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    }

    createEmptyPencilMarks() {
        const marks = new Array(BOARD_SIZE);
        for (let i = 0; i < BOARD_SIZE; i++) {
            marks[i] = new Array(BOARD_SIZE);
            for (let j = 0; j < BOARD_SIZE; j++) {
                // Each cell has an array for numbers 1-9 (indices 0-8)
                marks[i][j] = new Array(BOARD_SIZE).fill(false);
            }
        }
        return marks;
    }

    getValue(row, col) {
        if (this.isValidCoord(row, col)) {
            return this.grid[row][col];
        }
        return undefined; // Or throw error
    }

    setValue(row, col, value, isInitial = false) {
        if (this.isValidCoord(row, col) && value >= 0 && value <= BOARD_SIZE) {
            this.grid[row][col] = value;
            if (isInitial) {
                this.initialGrid[row][col] = value;
            }
            // When a value is set, clear pencil marks for that cell
            if (value !== 0) {
                this.clearPencilMarksForCell(row, col);
            }
            return true;
        }
        return false;
    }

    isPrefilled(row, col) {
        return this.isValidCoord(row, col) && this.initialGrid[row][col] !== 0;
    }

    getGrid() {
        return deepCopy2DArray(this.grid); // Return a copy to prevent mutation
    }

    setGrid(newGrid, setAsInitial = false) {
        if (newGrid && newGrid.length === BOARD_SIZE && newGrid[0].length === BOARD_SIZE) {
            this.grid = deepCopy2DArray(newGrid);
            if (setAsInitial) {
                this.initialGrid = deepCopy2DArray(newGrid);
            }
        } else {
            console.error("Invalid grid format provided to setGrid");
        }
    }

    setInitialGrid(initialGrid) {
         if (initialGrid && initialGrid.length === BOARD_SIZE && initialGrid[0].length === BOARD_SIZE) {
            this.initialGrid = deepCopy2DArray(initialGrid);
        } else {
            console.error("Invalid grid format provided to setInitialGrid");
        }
    }

    getInitialGrid() {
        return deepCopy2DArray(this.initialGrid);
    }

     resetToInitial() {
        this.grid = deepCopy2DArray(this.initialGrid);
        this.clearAllPencilMarks(); // Typically pencil marks are cleared on reset
    }

    clearBoard() {
        this.grid = this.createEmptyGrid();
        this.initialGrid = this.createEmptyGrid();
        this.clearAllPencilMarks();
    }

    // --- Pencil Mark Methods ---

    getPencilMark(row, col, num) {
        // num is 1-9
        if (this.isValidCoord(row, col) && num >= 1 && num <= BOARD_SIZE) {
            return this.pencilMarks[row][col][num - 1];
        }
        return undefined;
    }

    setPencilMark(row, col, num, value) {
        // num is 1-9, value is boolean
         if (this.isValidCoord(row, col) && num >= 1 && num <= BOARD_SIZE) {
            this.pencilMarks[row][col][num - 1] = !!value; // Ensure boolean
            return true;
         }
         return false;
    }

    togglePencilMark(row, col, num) {
        if (this.isValidCoord(row, col) && num >= 1 && num <= BOARD_SIZE) {
            // Only toggle if the main cell value is 0
            if (this.grid[row][col] === 0) {
                 this.pencilMarks[row][col][num - 1] = !this.pencilMarks[row][col][num - 1];
                 return true;
            }
        }
        return false;
    }

    clearPencilMarksForCell(row, col) {
        if (this.isValidCoord(row, col)) {
            this.pencilMarks[row][col].fill(false);
        }
    }

    clearAllPencilMarks() {
        this.pencilMarks = this.createEmptyPencilMarks();
    }

    getPencilMarksForCell(row, col) {
        if (this.isValidCoord(row, col)) {
            return [...this.pencilMarks[row][col]]; // Return copy
        }
        return [];
    }

    getAllPencilMarks() {
        return deepCopyPencilMarks(this.pencilMarks);
    }

    setAllPencilMarks(marks) {
         if (marks && marks.length === BOARD_SIZE && marks[0].length === BOARD_SIZE && marks[0][0].length === BOARD_SIZE) {
             this.pencilMarks = deepCopyPencilMarks(marks);
         } else {
             console.error("Invalid pencil mark data provided");
         }
    }

    // --- Helper ---
    isValidCoord(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }
}
// js/main.js
import { SudokuGame } from './game.js';

// Ensure the DOM is fully loaded before starting the game
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Starting Sudoku...");
    const game = new SudokuGame();
    // Make game instance accessible globally for debugging if needed
     window.sudokuGame = game;
     console.log("Sudoku game instance created and assigned to window.sudokuGame");
});
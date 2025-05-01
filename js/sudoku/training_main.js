// js/sudoku/training_main.js
import { SudokuTrainingGame } from './training_game.js';
// import { TrainingUI } from './training_ui.js';
import { techniqueFinders } from './solver_advanced.js'; // Import the finders map

// --- Technique List 
const availableTechniques = Object.keys(techniqueFinders);

// --- Initialize ---
let trainingGame; // Make accessible globally if needed

document.addEventListener('DOMContentLoaded', () => {
    trainingGame = new SudokuTrainingGame(); // UI instance created inside

    // --- Populate Dropdown ---
    const selectElement = document.getElementById('technique-select');
    if (selectElement) {
        availableTechniques.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech;
            option.textContent = tech;
            selectElement.appendChild(option);
        });
        // start training with the first technique
        if (availableTechniques.length > 0) {
            trainingGame.startTraining(availableTechniques[0]);
        }
        
        selectElement.onchange = (event) => {
            trainingGame.startTraining(event.target.value);
        };
    } else {
        console.error("Technique select dropdown not found!");
    }

    // --- Attach other listeners ---
    const nextButton = document.getElementById('next-training-puzzle');
    if (nextButton) {
        nextButton.onclick = () => trainingGame.requestNextPuzzle();
    }
    // Map any other necessary global functions if using onclick in HTML
    // window.trainingPress = (num) => trainingGame.callbacks.onNumberInput(num);
     // window.trainingToggleMarkingMode = () => trainingGame.callbacks.onModeToggleRequest(Modes.MARKING);

    console.log("Training Mode Initialized");
});
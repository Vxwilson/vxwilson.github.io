
// #region HEADER
// Sudoku game
// Author: VeiXhen
// #endregion HEADER

// #region INITIALIZATION

let sudokuBoard = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 0
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 1
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 2
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 6
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 7
    [0, 0, 0, 0, 0, 0, 0, 0, 0]  // row 8
];
let pencilMarks = new Array(9); // each cell has a 9x9 array of pencil marks

// we need to keep track of the initial state of the board
let startingBoard = [];

// undostack and redostack
let undoStack = [];
let redoStack = [];

// pause and timer
let paused = false;
let startTime = 0;
let interval = 0;
let pausedTime = 0;

// enums
const Difficulty = {
    EASY: 46,
    MEDIUM: 37,
    HARD: 32,
    IMPOSSIBLE: -1 // impossible means all cells that can be removed, are removed
};

const Modes = {
    NORMAL: 0,
    MARKING: 1,
    FOCUS: 2
};

const Platform = {
    Mobile: 0,
    Desktop: 1
}

let mode = Modes.NORMAL;
let difficulty = Difficulty.EASY;
let platformMode = Platform.Desktop;

// settings to store boolean values
let autoPencilMarks = true;
let saveDifficulty = true;

// get cells and markings
const sudokuCells = document.querySelectorAll('.sudoku-cell');

let selectedCell = null;

// modify HTML to create child elements in our sudoku grid
function createTextGrid() {
    //in each grid, create a text span
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => {
        const cellText = document.createElement('span');
        cellText.className = 'cell-text';
        cell.appendChild(cellText);
    });

}
function createPencilGrid() {
    // Select all sudoku cells
    const cells = document.querySelectorAll('.sudoku-cell');

    // Iterate over each cell

    cells.forEach(cell => {
        // Create pencil marks div
        const pencilMarks = document.createElement('div');
        pencilMarks.className = 'pencil-marks';

        // disable mouse events for pencil marks
        pencilMarks.style.pointerEvents = 'none';

        // Create 3 pencil rows
        for (let i = 0; i < 3; i++) {
            const pencilRow = document.createElement('div');
            pencilRow.className = 'pencil-row';

            // Create 3 pencil marks in each row
            for (let j = 0; j < 3; j++) {
                const pencilMark = document.createElement('div');
                pencilMark.className = 'pencil-mark';
                pencilRow.appendChild(pencilMark);

                // add data attribute (row and col)to pencil mark
                pencilMark.dataset.num = i * 3 + j + 1;

                // set pencil mark text to the correct number
                pencilMark.textContent = i * 3 + j + 1;

            }

            pencilMarks.appendChild(pencilRow);
        }

        // Append pencil marks to cell
        cell.append(pencilMarks);
    });
}
// #endregion INITIALIZATION

// #region UNDO-REDO
function updateStack(row, col, new_value, initial_value = 0) {
    undoStack.push([row, col, new_value, initial_value]);
    redoStack = [];
}

function undo() {
    if (undoStack.length > 0) {
        let [row, col, new_value, initial_value] = undoStack.pop();
        redoStack.push([row, col, initial_value, new_value]);
        sudokuBoard[row][col] = initial_value;
        displayBoard();

        // update the selected cell
        replaceSelectedCell(getCellFromCoords(row, col));
    }
}

function redo() {
    if (redoStack.length > 0) {
        let [row, col, new_value, initial_value] = redoStack.pop();
        undoStack.push([row, col, initial_value, new_value]);
        sudokuBoard[row][col] = initial_value;
        displayBoard();

        // update the selected cell
        replaceSelectedCell(getCellFromCoords(row, col));
    }
}

// #endregion UNDO-REDO

// #region SUDOKU-LOGIC

function trySetValue(row, col, value) {
    // sets value if valid, returns a boolean indicating if successful
    let prefilled = getCellFromCoords(row - 1, col - 1).classList.contains('prefilled');

    if (prefilled) return false;

    row = row - 1;
    col = col - 1;
    // if value is 0, then clearing the cell is always valid
    if (value === 0 || checkInputValid(sudokuBoard, row, col, value)) {
        // now save the state
        updateStack(row, col, value, getValueAtCell(row, col));
        sudokuBoard[row][col] = value;

        // succeded, now update markings
        if (value !== 0) {
            updateMarkings(row, col, value);
        }

        return true;
    }

    // handle invalid input
    return false;
}

function solve(board, digitarray = [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    // if the parameter digitarray is provided, it acts as a seed and can be used as a part of generating a random board

    let emptyCell = findNextEmptyCell(board);
    if (!emptyCell) {
        return true;
    }

    for (let i = 0; i < 9; i++) {
        if (checkInputValid(board, emptyCell[0], emptyCell[1], digitarray[i])) {
            board[emptyCell[0]][emptyCell[1]] = digitarray[i];

            if (solve(board, digitarray)) {
                return true;
            }
            board[emptyCell[0]][emptyCell[1]] = 0;
        }
    }
    return false;
}

async function solveInRealTime(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (checkInputValid(board, row, col, num)) {
                        board[row][col] = num;
                        displayBoard();
                        await new Promise((resolve) => setTimeout(resolve, 75)); // Delay 0.1s
                        if (await solveInRealTime(board)) {
                            return true;
                        }
                        board[row][col] = 0;
                        displayBoard();
                        await new Promise((resolve) => setTimeout(resolve, 3)); // Delay 0.1s
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// called by user button press
function trySolveBoard(visual = false) {
    if (visual) {
        solveInRealTime(sudokuBoard);
    }
    else {
        board_temp = sudokuBoard;
        if (!solve(sudokuBoard)) { // no solution found, restore the board
            sudokuBoard = board_temp;
            // console.log("No solution found");
        }
        displayBoard();
    }

    stopStopwatch();

}

function generateNewBoard() {
    // generate a random array of 9 digits
    let digitarray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    digitarray.sort(() => Math.random() - 0.5);

    solve(sudokuBoard, digitarray);

    // remove some numbers based on difficulty
    sudokuBoard = addHolesToBoard(difficulty);

    // save the starting state
    startingBoard = JSON.parse(JSON.stringify(sudokuBoard));
}

function getSolutionCount(board) {
    // helper function to get number of solutions in current board
    let digitarray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let emptyCell = findNextEmptyCell(board);

    let solutions = 0;

    if (!emptyCell) {
        return 1;
    }

    for (let i = 0; i < 9; i++) {
        if (checkInputValid(board, emptyCell[0], emptyCell[1], digitarray[i])) {
            board[emptyCell[0]][emptyCell[1]] = digitarray[i];

            let result = getSolutionCount(board);
            solutions += result;

            // at any point if we have more than 1 solution, we can stop
            // remove below line to find all solutions
            if (solutions > 1) {
                return 2;
            }

            board[emptyCell[0]][emptyCell[1]] = 0;
        }
    }
    return solutions;
}

function addHolesToBoard(clues = 40) {
    // for each cell, try to remove it and see if the board is still solvable with only 1 solution

    let max = 81 - clues;

    let cells = [];
    for (let i = 0; i < 81; i++) { cells.push(i); }
    cells.sort(() => Math.random() - 0.5); // randomize the cells position array

    // now we try to remove each cell
    var removed = 0;

    for (let i = 0; i < 81; i++) {
        // check if we have removed enough cells
        if (removed >= max) {
            break;
        }

        let row = Math.floor(cells[i] / 9);
        let col = cells[i] % 9;

        // save the value of the cell
        let temp = sudokuBoard[row][col];
        sudokuBoard[row][col] = 0;

        // check if the board is still solvable
        var board_temp = JSON.parse(JSON.stringify(sudokuBoard));
        if (getSolutionCount(board_temp) > 1) {
            // console.log("we have more than 1 solution after removing cell " + row + ", " + col + "");
            // if not, restore the cell value
            sudokuBoard[row][col] = temp;
        }
        else {
            removed++;
        }

    }
    return sudokuBoard;
}

// #endregion SUDOKU-LOGIC

// #region LOAD-SAVE 

// auto save and load
// window.onload = function () {
//     //check if previous data exists
//     loadSavedData();
//     // updatePreview();
// }

window.saveData = function () {
    console.log("saving data");
    localStorage.setItem("hasSavedData", true);
    localStorage.setItem("sudokuBoardString", exportBoard());

    // store time data
    let timeElapsed = new Date().getTime() - startTime;
    // console.log(timeElapsed);
    localStorage.setItem("timeElapsed", timeElapsed);

    // store settings
    // saveSettings();

    // store difficulty's key
    // Get the key of the enum you want to update;

    // Set the new value in the localStorage
    localStorage.setItem("difficulty", JSON.stringify(difficulty));
}

// calls saveData every 5 seconds
setInterval(saveData, 2000);

function saveSettings() {
    localStorage.setItem("autoPencilMarks", JSON.stringify(autoPencilMarks));
    localStorage.setItem("saveDifficulty", JSON.stringify(saveDifficulty));
}

function loadSavedData() {
    var hasSavedData = localStorage.getItem("hasSavedData");
    if (hasSavedData) {
        // load sudoku board string
        sudokuBoardString = localStorage.getItem("sudokuBoardString");

        // rebuild the board from string
        loadBoard(sudokuBoardString);

        // load time data in seconds
        let timeElapsed = localStorage.getItem("timeElapsed");
        pausedTime = timeElapsed;

        // set settings
        autoPencilMarks = JSON.parse(localStorage.getItem("autoPencilMarks"));
        saveDifficulty = JSON.parse(localStorage.getItem("saveDifficulty"));

        // update checkbox
        document.getElementById("pencilmark-toggle").checked = autoPencilMarks;
        document.getElementById("save-difficulty-toggle").checked = saveDifficulty;

        if (saveDifficulty) {
            difficulty = JSON.parse(localStorage.getItem("difficulty"));
            console.log("difficulty is " + difficulty);
            updateDifficultyButton();
        }
        return true;
    }
    return false;
}


function tryLoad() {
    // called by user button press
    document.getElementById("loadBox").classList.toggle('show');
}

function closeLoad() {
    document.getElementById("loadBox").classList.toggle("show");
}

function loadBoard(value = null) {
    // load the board from a string
    if (!value) {
        var value = document.getElementById('code').value;
        console.log(value);
    }

    // let decoded = base62.decode(value);
    if (!isValidCode(value)) {
        console.log("Invalid code");
        return false;
    }

    // clear the board
    clearboard();

    for (let i = 0; i < 162; i += 2) {
        let row = Math.floor(i / 2 / 9);
        let col = i / 2 % 9;

        let cell = document.querySelector(`.sudoku-cell[data-row="${row + 1}"][data-col="${col + 1}"]`);

        if (value[i + 1] == '1') {
            cell.classList.add('prefilled');
            cell.classList.remove('default');
        } else {
            cell.classList.remove('prefilled');
            cell.classList.add('default');
        }

        // console.log('this is row ' + row + ' and col ' + col + ' and value ' + value[i] + ' and prefilled ' + value[i + 1]);
        sudokuBoard[row][col] = parseInt(value[i]);
    }

    displayBoard();
}

function isValidCode(value) {
    // check if the code is valid
    if (value.length != 162) {
        console.log("Invalid length");
        return false;
    }

    for (let i = 0; i < 162; i += 2) {
        if (value[i] < '0' || value[i] > '9') {
            console.log("Not a number");
            return false;
        }
    }
    for (let i = 1; i < 162; i += 2) {
        if (value[i] !== '0' && value[i] !== '1') {
            console.log("Invalid prefilled value");
            return false;
        }
    }
    return true;
}
const base62 = {
    charset: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .split(''),
    encode: integer => {
        if (integer === 0) {
            return 0;
        }
        let s = [];
        while (integer > 0) {
            s = [base62.charset[integer % 62], ...s];
            integer = Math.floor(integer / 62);
        }
        return s.join('');
    },
    decode: chars => chars.split('').reverse().reduce((prev, curr, i) =>
        prev + (base62.charset.indexOf(curr) * (62 ** i)), 0)
};

function tryExport() {
    document.getElementById("exportBox").classList.toggle("show");
}

function exportBoard() {
    // export the board to a string, remembering the prefilled cells
    // string is alternate of value pair of cell value and prefilled; such as 50 41 30 21 10 00 ... (no space in the real string)
    let boardString = '';
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            boardString += sudokuBoard[i][j];
            // check if the cell is prefilled
            if (document.querySelector(`.sudoku-cell[data-row="${i + 1}"][data-col="${j + 1}"]`).classList.contains('prefilled')) {
                boardString += '1';
            } else {
                boardString += '0';
            }
        }
    }

    // let encoded = base62.encode(parseInt(boardString));
    // console.log(boardString);

    // document.getElementById("exportcodedisplay").textContent = encoded;
    document.getElementById("exportcodedisplay").textContent = boardString;

    return boardString;
}

function closeExport() {
    document.getElementById("exportBox").classList.toggle("show");
}

function copyCode() {
    var copyText = document.getElementById("exportcodedisplay");
    copyToClipboard(copyText.textContent);
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}

// #endregion LOAD-SAVE

// #region UI

// settings menu
function openSettingsPanel() {
    document.getElementById("settingsPanel").classList.toggle("show");
}

function closeAndSaveSettings() {
    document.getElementById("settingsPanel").classList.toggle("show");
    saveSettings();
    // save settings
}

var checkboxSettings = document.querySelectorAll("input[type='checkbox']");

checkboxSettings.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        var option = this.dataset.option;
        console.log(option);

        switch (Number(option)) {
            case 1:
                // auto pencil marks
                autoPencilMarks = this.checked;
                // console.log("auto pencil marks is " + autoPencilMarks);
                break;
            case 2:
                // save difficulty
                saveDifficulty = this.checked;
                // console.log("save difficulty is " + saveDifficulty);
                break;
            default:
                console.log(option);
                break;
        }
        saveSettings();
    })
});

function clearboard() {
    // only used new board; not used for reset
    sudokuBoard = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 0
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 1
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 2
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 3
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 4
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 5
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 6
        [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 7
        [0, 0, 0, 0, 0, 0, 0, 0, 0]  // row 8
    ]

    clearAllMarkings();
    // Clear the undo and redo stacks
    undoStack = [];
    redoStack = [];
}

function resetboard() {
    // Reset the board to the starting state, keeping prefilled cells
    sudokuBoard = JSON.parse(JSON.stringify(startingBoard));

    // Clear the undo and redo stacks
    undoStack = [];
    redoStack = [];

    clearAllMarkings();
    displayBoard();
}

function displayBoard(prefilled = false) {
    // Given the grid, display the board on the screen to correspond to the grid
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            // let cell = document.getElementById(`cell-${i + 1}-${j + 1}`);
            let cell = document.querySelector(`.sudoku-cell[data-row="${i + 1}"][data-col="${j + 1}"]`);
            if (sudokuBoard[i][j] !== 0) {
                // cell.textContent = sudokuBoard[i][j];
                setCellText(cell, sudokuBoard[i][j]);
                if (prefilled) {
                    cell.classList.add('prefilled');
                    cell.classList.remove('default');
                }
            } else {
                // cell.textContent = '';
                setCellText(cell, '', unmark = false);
                cell.classList.remove('prefilled');
                cell.classList.add('default');
            }
        }
    }
}

// #endregion UI

// #region PAUSE and TIMER
function resetStopwatch() {
    // reset
    stopStopwatch();
    pausedTime = 0;
    paused = false;

    document.querySelector(".timer .timer-text").textContent = "00:00";
}

function startStopwatch() {
    // start     
    let timer = document.querySelector(".timer .timer-text");
    startTime = pausedTime === 0 ? new Date().getTime() : new Date().getTime() - pausedTime;

    button = document.querySelector(".play-pause i");
    button.classList.remove("fa-play");
    button.classList.add("fa-pause");

    interval = setInterval(function () {
        const time = new Date().getTime() - startTime;
        const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((time % (1000 * 60)) / 1000);

        // in the form of 00:00
        timer.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

    }, 250);

}

function stopStopwatch() {
    // stop
    pausedTime = new Date().getTime() - startTime;
    clearInterval(interval);
    interval = 0;
    button = document.querySelector(".play-pause i");
    button.classList.remove("fa-pause");
    button.classList.add("fa-play");
}

function togglepause() {
    if (paused) {
        paused = false;
        startStopwatch();
        toggleHideDigits(hide = false);
    }
    else {
        paused = true;
        stopStopwatch();
        // toggleHideDigits(hide = true);
    }
}

// Function to hide all digits when paused
function toggleHideDigits(hide = true) {
    if (hide) {
        let cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => cell.classList.add('paused'));
    } else {
        let cells = document.querySelectorAll('.sudoku-cell');
        cells.forEach(cell => cell.classList.remove('paused'));
    }
}
// #endregion  

// #region MARKING
function markToggleSelectedCell(value, cell = selectedCell, toggle = true, addMark = false, clearCell = true) {
    // addmark is only considered if toggle is false
    // if toggle is false, then addmark determines whether to add or remove the mark


    // return if cell is prefilled
    if (cell.classList.contains('prefilled')) return;


    // try to remove cell value 
    if (clearCell && trySetValue(cell.dataset.row, cell.dataset.col, 0)) {
        cell.querySelector('.cell-text').textContent = "";
    }

    // if value is 0, clear all pencil marks
    if (value === 0) {
        let pencilMarks = cell.querySelectorAll('.pencil-mark');
        pencilMarks.forEach(mark => mark.classList.remove('marked'));
        return;
    }

    let row = cell.dataset.row - 1;
    let col = cell.dataset.col - 1;
    pencilMarks[row][col][value - 1] = !pencilMarks[row][col][value - 1];

    let pencilMark = cell.querySelector(`.pencil-mark[data-num="${value}"]`);

    if (toggle) {

        if (pencilMarks[row][col][value - 1]) {
            pencilMark.classList.add('marked');
        } else {
            pencilMark.classList.remove('marked');
        }
        return;
    }

    if (addMark) {
        pencilMark.classList.add('marked');
    }
    else {
        pencilMark.classList.remove('marked');
    }
}

function autoMarkAll() {
    // auto mark all cells with basic exclusion method
    // for each cell, determine which numbers are possible

    let cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => {
        // check if the cell has no value
        if (sudokuBoard[cell.dataset.row - 1][cell.dataset.col - 1] !== 0) {
            return;
        }

        let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // use checkValid to determine which numbers are possible
        nums = nums.filter(num => checkInputValid(sudokuBoard, cell.dataset.row - 1, cell.dataset.col - 1, num));
        console.log(`Cell ${cell.dataset.row}, ${cell.dataset.col} can be ${nums}`);

        // now mark the numbers
        nums.forEach(num => {
            markToggleSelectedCell(num, cell, toggle = false, addMark = true);
        });

        // unmark all other numbers
        let filteredNums = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(num => !nums.includes(num));
        filteredNums.forEach(num => {
            markToggleSelectedCell(num, cell, toggle = false, addMark = false);
        });

    });
}

function updateMarkings(row, col, value) {
    // update the pencil marks of the neighboring cells of the given cell
    // used when the value of the cell is changed
    if (!autoPencilMarks) return;

    // for all neighbors in the same row, remove the pencil mark
    for (let i = 0; i < 9; i++) {
        markToggleSelectedCell(value, getCellFromCoords(row, i), toggle = false, addMark = false, clearCell = false);
    }

    // for all neighbors in the same column, remove the pencil mark
    for (let i = 0; i < 9; i++) {
        markToggleSelectedCell(value, getCellFromCoords(i, col), toggle = false, addMark = false, clearCell = false);
    }

    // for all neighbors in the same box, remove the pencil mark
    let boxRow = Math.floor(row / 3) * 3; // 0, 3, 6
    let boxCol = Math.floor(col / 3) * 3; // 0, 3, 6
    for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
            markToggleSelectedCell(value, getCellFromCoords(i, j), toggle = false, addMark = false, clearCell = false);
        }
    }

}

function clearAllMarkings() {
    // clear all pencil marks
    let cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(cell => {
        let pencilMarks = cell.querySelectorAll('.pencil-mark');
        pencilMarks.forEach(mark => mark.classList.remove('marked'));
    });

    // update the pencil marks array
    pencilMarks = new Array(9);
    for (let i = 0; i < 9; i++) {
        pencilMarks[i] = new Array(9);
        for (let j = 0; j < 9; j++) {
            pencilMarks[i][j] = [false, false, false, false, false, false, false, false, false];
        }
    }
}

function toggleMarkingMode() {
    let button = document.getElementById("pencil_button");

    if (mode === Modes.MARKING) {
        mode = Modes.NORMAL;
        button.classList.remove("selected");
    }
    else { // if normal or focus mode, go to marking mode 
        mode = Modes.MARKING;

        // try to unfocus
        focusDigit(-1, clear = true);

        // remove selected from all other .mode-button
        let buttons = document.querySelectorAll(".mode-button");
        buttons.forEach(button => {
            button.classList.remove("selected");
        });

        button.classList.add("selected");
    }

    // try to update number if on mobile
    if (platformMode === Platform.Mobile) {
        updateNumButtons(selectedCell);
    }
}

// focus
function focusDigit(value, clear = false) {
    if (clear) {
        value = -1; // no cells has this value
    }

    // highlight all cell with the dights with red
    sudokuCells.forEach(cell => {
        let text = cell.querySelector('.cell-text');
        if (parseInt(text.textContent) === value) {
            cell.classList.add('focused');
        } else {
            cell.classList.remove('focused');
        }
    }
    );
    // go through every marking with data-num = value, and highlight all markings with the value with red
    let pencilMarks = document.querySelectorAll('.pencil-mark');
    let focusPencilMarks = document.querySelectorAll(`.pencil-mark[data-num="${value}"]`);

    pencilMarks.forEach(mark => {
        mark.classList.remove('focused');
    });

    focusPencilMarks.forEach(mark => {
        mark.classList.add('focused');
    });

}

function toggleFocusMode() {
    let button = document.getElementById("focus_button");

    if (mode === Modes.FOCUS) {
        mode = Modes.NORMAL;
        button.classList.remove("selected");

        // remove all focused cells
        focusDigit(-1, clear = true);
    }
    else { // if normal or marking mode, go to focus mode 
        mode = Modes.FOCUS;
        let buttons = document.querySelectorAll(".mode-button");
        buttons.forEach(button => {
            button.classList.remove("selected");
        });

        button.classList.add("selected");

        // see if any cell is selected
        if (selectedCell) {
            console.log("focus mode on value " + selectedCell.querySelector('.cell-text').textContent);
            let value = parseInt(selectedCell.querySelector('.cell-text').textContent);
            focusDigit(value);
        }
    }
}

// #endregion MARKING

// #region HELPER
function setCellText(cell, value, unmark = true) {
    let cellText = cell.querySelector('.cell-text');
    cellText.textContent = value;

    // unmark all pencil marks in the cell
    if (unmark) {
        let pencilMarks = cell.querySelectorAll('.pencil-mark');
        pencilMarks.forEach(mark => mark.classList.remove('marked'));
    }
}

// get cell from row and col
function getCellFromCoords(row, col) {
    return document.querySelector(`.sudoku-cell[data-row="${row + 1}"][data-col="${col + 1}"]`);
}

// get cell value from row and col
function getValueAtCell(row, col) {
    return sudokuBoard[row][col];
}

function checkInputValid(board, row, col, input) {
    // goes through each neighbor of the cell and checks if the input is valid

    // check row
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === input) {
            return false;
        }
    }

    // check column
    for (let j = 0; j < 9; j++) {
        if (board[j][col] === input) {
            return false;
        }
    }

    // check 3x3 box
    let boxRow = Math.floor(row / 3) * 3; // 0, 3, 6
    let boxCol = Math.floor(col / 3) * 3; // 0, 3, 6
    for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
            if (board[i][j] === input) {
                return false;
            }
        }
    }

    return true;
}

function findNextEmptyCell(board) {
    // finds the next empty cell, following the order of row 0, 1, 2, ... 8
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) {
                return [i, j];
            }
        }
    }
    return null;
}

// wrapper function to check if the player has won
const hasPlayerWon = (board) => !findNextEmptyCell(board);

function replaceSelectedCell(newCell) {
    // simply handles the graphical changes of selecting a new cell
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    selectedCell = newCell;
    selectedCell.classList.add('selected');

    // try to focus if in focus mode
    if (mode === Modes.FOCUS) {
        let value = parseInt(selectedCell.querySelector('.cell-text').textContent);
        focusDigit(value);
    }

    // debug
    // console.log(`Selected cell ${selectedCell.dataset.row}, ${selectedCell.dataset.col} replaced`);
}

function checkPlayingMode() {
    // determine playing mode
    if (window.innerWidth < 600) {
        platformMode = Platform.Mobile;
        if (selectedCell) {
            updateNumButtons(selectedCell);
        }
    }
    else {
        platformMode = Platform.Desktop;
    }
}

function toggleDifficulty() {
    let button = document.getElementById("difficultyButton");

    if (difficulty === Difficulty.EASY) {
        difficulty = Difficulty.MEDIUM;
        button.textContent = "medium";
    }
    else if (difficulty === Difficulty.MEDIUM) {
        difficulty = Difficulty.HARD;
        button.textContent = "hard";
    }
    else if (difficulty === Difficulty.HARD) {
        difficulty = Difficulty.IMPOSSIBLE;
        button.textContent = "!?";
    }
    else if (difficulty === Difficulty.IMPOSSIBLE) {
        difficulty = Difficulty.EASY;
        button.textContent = "easy";
    }
}

function updateDifficultyButton() {
    let button = document.getElementById("difficultyButton");

    if (difficulty === Difficulty.EASY) {
        button.textContent = "easy";
    }
    else if (difficulty === Difficulty.MEDIUM) {
        button.textContent = "medium";
    }
    else if (difficulty === Difficulty.HARD) {
        button.textContent = "hard";
    }
    else if (difficulty === Difficulty.IMPOSSIBLE) {
        button.textContent = "!?";
    }

}

// #endregion HELPER

// #region LISTENERS
window.addEventListener('resize', function () {
    checkPlayingMode();
}, true);

// shortcuts
document.addEventListener('keydown', function (event) {
    switch (event.key) {
        case 'z':
            // if ctrl is pressed
            if (event.ctrlKey) {
                undo();
            }
            break;
        case 'y':
            if (event.ctrlKey) {
                redo();
            }
            break;
        // s for shuffle
        case 'n':
            // randomboard();
            break;
        // r for reset
        case 'r':
            // if (event.ctrlKey) {
            // resetboard();
            // }
            break;
        // m for marking mode
        case 'm':
            if (event.ctrlKey) {
                autoMarkAll();
            } else {
                toggleMarkingMode();
            }
            break;
        case 'f':
            toggleFocusMode();
            break;
        // arrow keys to navigate the selected cell
        // case 'w':
        //     if (selectedCell) {
        //         let row = selectedCell.dataset.row;
        //         let col = selectedCell.dataset.col;
        //         if (row > 1) {
        //             replaceSelection(getCellFromCoords(row - 2, col - 1));
        //         }
        //     }
        //     break;
        // case 's':
        //     if (selectedCell) {
        //         let row = selectedCell.dataset.row;
        //         let col = selectedCell.dataset.col;
        //         if (row < 9) {
        //             replaceSelection(getCellFromCoords(row, col - 1));
        //         }
        //     }
        //     break;
        // case 'a':
        //     if (selectedCell) {
        //         let row = selectedCell.dataset.row;
        //         let col = selectedCell.dataset.col;
        //         if (col > 1) {
        //             replaceSelection(getCellFromCoords(row - 1, col - 2));
        //         }
        //     }
        //     break;
        // case 'd':
        //     if (selectedCell) {
        //         let row = selectedCell.dataset.row;
        //         let col = selectedCell.dataset.col;
        //         if (col < 9) {
        //             replaceSelection(getCellFromCoords(row - 1, col));
        //         }
        //     }
        //     break;
        // space to pause
        case ' ':
            // prevent scrolling
            event.preventDefault();
            togglepause();
            break;
    }
});

// updates selected cell
function handleCellClick(event) {
    // replaceSelectedCell(event.target)
    replaceSelectedCell(event);
    if (platformMode === Platform.Mobile) {
        updateNumButtons(selectedCell);
    }
}

function handleOutsideClick(event) {
    if (selectedCell && !event.target.classList.contains('.sudoku-cell')  && (!event.target.closest('.sudoku-cell')) && (!event.target.closest('.num-button')) && (!event.target.classList.contains('.sudoku-button')) && !event.target.closest('.num-button')) {
        // console.log(event.target.classList);
        // console.log("clicked outside");
        selectedCell.classList.remove('selected');
        selectedCell = null;
    }
}

$('.sudoku-cell').on('click', function (e) {
    // get parent cell even if the user clicks on the text
    let cell = e.target.closest('.sudoku-cell');
    handleCellClick(cell);
});

document.addEventListener("click", handleOutsideClick);

//MOBILE section//
function press(num) {
    // check if we are in marking mode

    if (selectedCell) {
        if (mode === Modes.MARKING) {
            if (num !== 0) {
                markToggleSelectedCell(num);
            }
        } else {
            if (num >= 1 && num <= 9) {
                if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, num)) {
                    // selectedCell.textContent = num;
                    setCellText(selectedCell, num);
                }

                // check if the board is solved
                if (hasPlayerWon(sudokuBoard)) {
                    stopStopwatch();
                    // alert("You solved the board!");
                }
            } else if (num === 0) {
                // selectedCell.textContent = '';
                setCellText(selectedCell, '');
                trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, 0);
            }
        }

        updateNumButtons(selectedCell);
    }
}

function updateNumButtons(cell) {
    const row = cell.dataset.row - 1;
    const col = cell.dataset.col - 1;

    const numButtons = document.querySelectorAll('.num-button');
    // check if marking mode is on
    if (mode === Modes.MARKING) {
        numButtons.forEach(button => {
            if (button.dataset.num === '0') {
                // button.disabled = true;

                // commented because erase can be used to clear all markings
            } else {
                button.disabled = false;
            }
        });
        return;
    }


    // check if cell is prefilled
    let prefilled = selectedCell.classList.contains('prefilled');

    numButtons.forEach(button => {

        if (prefilled) {
            button.disabled = true;
            return;
        }

        const num_ = button.dataset.num;

        // convert string to int
        const num = parseInt(num_);
        if (num === 0) {
            if (getValueAtCell(row, col) === 0) {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        }

        else if (checkInputValid(sudokuBoard, row, col, num)) {
            button.disabled = false;
            // console.log("button " + num + " is valid");
        } else {
            button.disabled = true;
            // console.log("button " + num + " is invalid");
        }
    });
}
//MOBILE end///


// DESKTOP, listener for numbers 1-9
document.addEventListener('keydown', function (event) {
    if (mode === Modes.FOCUS) {
        if (event.key >= 0 && event.key <= 9) { // 0 acts as clear
            focusDigit(parseInt(event.key));
            console.log("focus digit " + event.key);
        }
    }
    else if (selectedCell) {
        if (mode === Modes.MARKING) {
            if (event.key >= 1 && event.key <= 9) {
                markToggleSelectedCell(parseInt(event.key));
            }

        }
        else {
            if (event.key >= 1 && event.key <= 9) {
                // convert to number
                num = parseInt(event.key);
                if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, num)) {
                    // update UI

                    // selectedCell.textContent = num;
                    setCellText(selectedCell, num);
                    updateNumButtons(selectedCell);

                    // try to resume stopwatch
                    if (paused) {
                        paused = false;
                        startStopwatch();
                    }
                    // check if board is solved
                    if (hasPlayerWon(sudokuBoard)) {
                        // alert("You solved the board!");
                        stopStopwatch();
                    }
                } else {
                    // handle invalid input or ignore
                }
            }
        }
    }
});

// listener for delete key
document.addEventListener('keydown', function (event) {

    if (event.key === 'Backspace') {
        if (mode === Modes.FOCUS){
            focusDigit(-1, clear = true);
        }
        else if (selectedCell) {

            if (mode === Modes.MARKING) {
                markToggleSelectedCell(0);
                return;
            }
            if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, 0)) {
                // selectedCell.textContent = '';
                setCellText(selectedCell, '');
                updateNumButtons(selectedCell);

            };
        }
    }
});

//#endregion

function randomboard() {
    // generate a random board
    clearboard();
    resetStopwatch();
    generateNewBoard();
    displayBoard(prefilled = true);
    startStopwatch();
}

function initializePage() {
    // check playing mode on load
    checkPlayingMode();

    // pencilmarks
    for (let i = 0; i < 9; i++) {
        pencilMarks[i] = new Array(9);
        for (let j = 0; j < 9; j++) {
            pencilMarks[i][j] = new Array(9).fill(false); // Initialize all values as false
        }
    }

    createTextGrid();
    createPencilGrid();

    resetStopwatch();
    clearboard();

    // check if we have saved data
    if (loadSavedData()) {
        displayBoard();
    }
    else {
        generateNewBoard();
        displayBoard(prefilled = true);
    }

    startStopwatch();
}
initializePage();

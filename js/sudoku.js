// INTERNAL: Sudoku game logic

// Sudoku board is a 9x9 grid
// initialize board as a 9x9 array
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

// undostack and redostack
let undoStack = [];
let redoStack = [];

function trySetValue(row, col, value) {
    row = row - 1;
    col = col - 1;
    // if value is 0, then clearing the cell is always valid
    if (value === 0 || checkValid(sudokuBoard, row, col, value)) {
        sudokuBoard[row][col] = value;
        return true;
    }
    // handle invalid input
    return false;
}

function getValue(row, col) {
    return sudokuBoard[row][col];
}

function checkValid(board, row, col, num) {
    // check row
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) {
            return false;
        }
    }

    // check column
    for (let j = 0; j < 9; j++) {
        if (board[j][col] === num) {
            return false;
        }
    }

    // check 3x3 box
    let boxRow = Math.floor(row / 3) * 3; // 0, 3, 6
    let boxCol = Math.floor(col / 3) * 3; // 0, 3, 6
    for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
            if (board[i][j] === num) {
                return false;
            }
        }
    }

    return true;
}

function isBoardSolved(board) {
    // check if any cell is empty
    let emptyCell = findEmptyCell(board);
    if (emptyCell) {
        return false;
    }
    return true;
}

function solve(board) { // TODO show real time backtrack solving
    // find empty cell
    let emptyCell = findEmptyCell(board);
    if (!emptyCell) {
        return true;
    }
    for (let i = 1; i <= 9; i++) {
        console.log(`Trying ${i} at ${emptyCell[0]}, ${emptyCell[1]}`);
        if (checkValid(board, emptyCell[0], emptyCell[1], i)) {
            board[emptyCell[0]][emptyCell[1]] = i;
            if (solve(board)) {
                return true;
            }
            board[emptyCell[0]][emptyCell[1]] = 0;
        }
    }
    return false;
}

function randomized_solve(board, digitarray) { // digit array is an array of 9 digits, in random order
    // find empty cell
    let emptyCell = findEmptyCell(board);
    if (!emptyCell) {
        return true;
    }
    for (let i = 0; i < 9; i++) {
        if (checkValid(board, emptyCell[0], emptyCell[1], digitarray[i])) {
            board[emptyCell[0]][emptyCell[1]] = digitarray[i];

            if (randomized_solve(board, digitarray)) {
                return true;
            }
            board[emptyCell[0]][emptyCell[1]] = 0;
        }
    }
    return false;
}

// Backtracking algorithm
async function solvevisual(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (checkValid(board, row, col, num)) {
                        board[row][col] = num;
                        displayBoard();
                        await new Promise((resolve) => setTimeout(resolve, 75)); // Delay 0.1s
                        if (await solvevisual(board)) {
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


function findEmptyCell(board) {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) {
                return [i, j];
            }
        }
    }
    return null;
}

function try_solve(board) {
    board_temp = board;
    result = solve(board);
    if (!result) {
        board = board_temp;

        // display error message
        console.log("No solution found");
    } else {
        // do nothing
    }
}

function generateChallengeFromBoard(board, num) {
    for (let i = 0; i < num; i++) {
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);
        // retry while the cell is not empty
        while (board[row][col] === 0) {
            row = Math.floor(Math.random() * 9);
            col = Math.floor(Math.random() * 9);
        }
        board[row][col] = 0;
    }
    return board;
}


function betterGenerateBoard() {
    clearboard();

    // generate a random array of 9 digits
    let digitarray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    digitarray.sort(() => Math.random() - 0.5);

    // solve the board
    randomized_solve(sudokuBoard, digitarray);

    // remove 42 cells
    sudokuBoard = generateChallengeFromBoard(sudokuBoard, 42);
}


function displayBoard(prefilled = false) {
    // Given the grid, display the board on the screen to correspond to the grid
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            // let cell = document.getElementById(`cell-${i + 1}-${j + 1}`);
            let cell = document.querySelector(`.sudoku-cell[data-row="${i + 1}"][data-col="${j + 1}"]`);
            if (sudokuBoard[i][j] !== 0) {
                cell.textContent = sudokuBoard[i][j];
                if (prefilled) {
                    cell.classList.add('prefilled');
                }
            } else {
                cell.textContent = '';
                cell.classList.remove('prefilled');
            }
        }
    }
}


function isValidCode(value) {
    // check if the code is valid
    if (value.length != 162) {
        console.log("Invalid length");
        return false;
    }

    for (let i = 0; i < 162; i+=2){
        if (value[i] < '0' || value[i] > '9') {
            console.log("Not a number");
            return false;
        }
    }
    for (let i = 1; i < 162; i+=2){
        if (value[i] !== '0' && value[i] !== '1') {
            console.log("Invalid prefilled value");
            return false;
        }
    }
    return true;
}

function tryLoad(){
    document.getElementById("loadBox").classList.toggle('show');
}

function loadBoard() {
    // load the board from a string
    var value = document.getElementById('code').value;
    console.log(value);

    if(!isValidCode(value)){
        // display error message
        console.log("Invalid code");
        return false;
    }

    // clear the board
    clearboard();

    for (let i = 0; i < 162; i+=2){
        let row = Math.floor(i/2 / 9);
        let col = i/2  % 9;

        if(value[i+1] == '1'){
            document.querySelector(`.sudoku-cell[data-row="${row + 1}"][data-col="${col + 1}"]`).classList.add('prefilled');
        }
        
        console.log('this is row ' + row + ' and col ' + col + ' and value ' + value[i] + ' and prefilled ' + value[i+1]);
        sudokuBoard[row][col] = parseInt(value[i]);
    }  
    
    closeLoad();
    displayBoard();
}

function exportBoard(){
    // export the board to a string, remembering the prefilled cells
    // string is alternate of value pair of cell value and prefilled; such as 50 41 30 21 10 00 ... (no space in the real string)
    let boardString = '';
    for (let i = 0; i < 9; i++){
        for (let j = 0; j < 9; j++){
            boardString += sudokuBoard[i][j];
            // check if the cell is prefilled
            if (document.querySelector(`.sudoku-cell[data-row="${i + 1}"][data-col="${j + 1}"]`).classList.contains('prefilled')){
                boardString += '1';
            } else {
                boardString += '0';
            }
        }
    }
    
    // console.log(boardString);
    document.getElementById("exportBox").classList.toggle("show");

    document.getElementById("exportcodedisplay").textContent = boardString;
}

function closeExport(){
    document.getElementById("exportBox").classList.toggle("show");
}

function copyCode(){
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

function closeLoad(){
    document.getElementById("loadBox").classList.toggle("show");
}



// UI
const sudokuCells = document.querySelectorAll('.sudoku-cell');

let selectedCell = null;

function undo() {

}

function redo() {

}

function clearboard() {
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
    displayBoard();
}

function randomboard() {
    resetStopwatch();
    clearboard();
    disableundoredo();
    betterGenerateBoard();
    displayBoard(prefilled = true);
    startStopwatch();
}

function disableundoredo() {
    document.getElementById("undo").disabled = true;
    document.getElementById("redo").disabled = true;
}

let paused = false;
let startTime = 0;
let interval = 0;
let pausedTime = 0;

function startStopwatch() {
    // start     
    let timer = document.querySelector(".timer .timer-text");
    startTime = startTime === 0 ? new Date().getTime(): new Date().getTime() - pausedTime;

    button = document.querySelector(".play-pause i");
    button.classList.remove("fa-play");
    button.classList.add("fa-pause");

    interval = setInterval(function () {
        const time = new Date().getTime() - startTime;
        const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((time % (1000 * 60)) / 1000);

        // in the form of 00:00
        timer.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

    }, 1000);

}

function resetStopwatch() {
    // reset
    stopStopwatch();
    pausedTime = 0;
    paused = false;

    document.querySelector(".timer .timer-text").textContent = "00:00";
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
    }
    else {
        paused = true;
        stopStopwatch();

    }
}


function solveboard(visual = false) {
    if (visual) {
        // console.log("visual");
        solvevisual(sudokuBoard);
    }
    else {
        // console.log("non-visual");
        try_solve(sudokuBoard);
        displayBoard();
    }

    stopStopwatch();
    
}




// listeners
function handleCellClick(event) {
    if (selectedCell) {
        selectedCell.style.backgroundColor = 'rgba(217, 228, 228, 0.5)';
    }
    selectedCell = event.target;
    selectedCell.style.backgroundColor = '#e5e2de';
}

sudokuCells.forEach(cell => cell.addEventListener('click', handleCellClick));


function handleOutsideClick(event) {
    // list out classlist
    console.log(event.target.classList);
    if (selectedCell && !event.target.classList.contains('sudoku-cell') && (!event.target.classList.contains('num-button')) && !event.target.closest('.num-button')) {
        selectedCell.style.backgroundColor = 'rgba(217, 228, 228, 0.5)';
        selectedCell = null;
    }
}

document.addEventListener("click", handleOutsideClick);

// mobile num press
function press(num) {
    if (selectedCell) {
        if (num >= 1 && num <= 9) {
            if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, num)) {
                selectedCell.textContent = num;
            }

            // check if the board is solved
            if (isBoardSolved(sudokuBoard)) {
                stopStopwatch();
                // alert("You solved the board!");
            }
        } else if (num === 0) {
            selectedCell.textContent = '';
            trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, 0);
        }
    }
}

// listener for numbers 1-9
document.addEventListener('keydown', function (event) {
    if (selectedCell) {
        if (event.key >= 1 && event.key <= 9) {
            // convert to number
            num = parseInt(event.key);
            if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, num)) {
                // update UI
                selectedCell.textContent = num;

                // check if board is solved
                if (isBoardSolved(sudokuBoard)) {
                    // alert("You solved the board!");
                    stopStopwatch();
                }
            } else {
                // handle invalid input or ignore
            }
        }
    }
});

// listener for delete key
document.addEventListener('keydown', function (event) {
    if (selectedCell) {
        if (event.key === 'Backspace') {
            trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, 0);
            // update UI
            selectedCell.textContent = '';
        }
    }
});


// init
randomboard();

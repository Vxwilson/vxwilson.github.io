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
    console.log(digitarray);
    // find empty cell
    let emptyCell = findEmptyCell(board);
    if (!emptyCell) {
        return true;
    }
    for (let i = 0; i < 9; i++) {
        console.log(`Trying ${digitarray[i]} at ${emptyCell[0]}, ${emptyCell[1]}`);
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
                        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay 0.1s
                        if (await solvevisual(board)) {
                            return true;
                        }
                        board[row][col] = 0;
                        displayBoard();
                        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay 0.1s
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
}


function betterGenerateBoard() {
    clearboard();

    // generate a random array of 9 digits
    let digitarray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    digitarray.sort(() => Math.random() - 0.5);

    // solve the board
    randomized_solve(sudokuBoard, digitarray);

    // remove 40 cells
    generateChallengeFromBoard(sudokuBoard, 40);
}

function generateBoard() {
    for (let i = 0; i < 17; i++) {
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);
        let value = Math.floor(Math.random() * 9) + 1;
        // retry while the value is not valid or the cell is not empty
        while (sudokuBoard[row][col] !== 0 || !checkValid(sudokuBoard, row, col, value)) {
            row = Math.floor(Math.random() * 9);
            col = Math.floor(Math.random() * 9);
            value = Math.floor(Math.random() * 9) + 1;
        }
        // if (i > 17 && solvable(board)){
        sudokuBoard[row][col] = value;
        // }
    }
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
    // sudokuCells.forEach(cell => cell.textContent = '');
}

function randomboard() {
    clearboard();
    // generateBoard();
    betterGenerateBoard();
    displayBoard(prefilled = true);
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
}

// mobile num press
function press(num) {
    if (selectedCell) {
        if (num >= 1 && num <= 9) {
            if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, num)) {
                selectedCell.textContent = num;
            }
        } else if (num === 0) {
            selectedCell.textContent = '';
        }
    }
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

// listener for numbers 1-9
document.addEventListener('keydown', function (event) {
    if (selectedCell) {
        if (event.key >= 1 && event.key <= 9) {
            if (trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, event.key)) {
                // update UI
                selectedCell.textContent = event.key;
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

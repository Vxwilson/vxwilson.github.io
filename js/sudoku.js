// INTERNAL: Sudoku game logic

// Sudoku board is a 9x9 grid
// initialize board as a 9x9 array
const sudokuBoard = [
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

function trySetValue(row, col, value){
    row = row - 1;
    col = col - 1;
    // if value is 0, then clearing the cell is always valid
    if (value === 0 || checkValid(sudokuBoard, row, col, value)){
        sudokuBoard[row][col] = value;
        return true;
    }
    // handle invalid input
    return false;
}

function getValue(row, col){
    return sudokuBoard[row][col];
}

function checkValid(board, row, col, num){
    // check row
    for (let i = 0; i < 9; i++){
        if (board[row][i] === num){
            return false;
        }
    }

    // check column
    for (let j = 0; j < 9; j++){
        if (board[j][col] === num){
            return false;
        }      
    }

    // check 3x3 box
    let boxRow = Math.floor(row / 3) * 3; // 0, 3, 6
    let boxCol = Math.floor(col / 3) * 3; // 0, 3, 6
    for (let i = boxRow; i < boxRow + 3; i++){
        for (let j = boxCol; j < boxCol + 3; j++){
            if (board[i][j] === num){
                return false;
            }
        }
    }

    return true;
}

function generateBoard(){

}

function displayBoard(){
    // Given the grid, display the board on the screen to correspond to the grid
}



// UI

const sudokuCells = document.querySelectorAll('.sudoku-cell');

let selectedCell = null;

function handleCellClick(event){
    if (selectedCell){
        selectedCell.style.backgroundColor = 'rgb(217, 228, 228)';
    }
    selectedCell = event.target;
    selectedCell.style.backgroundColor = 'rgb(173, 189, 189)';
}

sudokuCells.forEach(cell => cell.addEventListener('click', handleCellClick));

function handleOutsideClick(event){
    if (selectedCell && !event.target.classList.contains('sudoku-cell')){
        selectedCell.style.backgroundColor = 'rgb(217, 228, 228)';
        selectedCell = null;
    }
}

document.addEventListener("click", handleOutsideClick);

// listener for numbers 1-9
document.addEventListener('keydown', function(event){
    if (selectedCell){
        if (event.key >= 1 && event.key <= 9){
            if(trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, event.key)){
                // update UI
                selectedCell.textContent = event.key;
            }else{
                // handle invalid input or ignore
            }
        }
    }
});

// listener for delete key
document.addEventListener('keydown', function(event){
    if(selectedCell){
        if(event.key === 'Backspace'){
            trySetValue(selectedCell.dataset.row, selectedCell.dataset.col, 0);
            // update UI
            selectedCell.textContent = '';
        }
    }
});

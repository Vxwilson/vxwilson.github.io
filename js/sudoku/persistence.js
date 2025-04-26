// // js/sudoku/persistence.js
// import { BOARD_SIZE } from './constants.js';
// import { copyToClipboard } from './utils.js'; // Assuming utils.js is in the same folder

// const SAVE_KEY_PREFIX = 'sudokuApp_';
// const BOARD_STATE_KEY = SAVE_KEY_PREFIX + 'boardState';
// const TIMER_KEY = SAVE_KEY_PREFIX + 'timerElapsed';
// const SETTINGS_KEY = SAVE_KEY_PREFIX + 'settings';
// const HAS_SAVE_KEY = SAVE_KEY_PREFIX + 'hasSaveData';
// const REQUIRED_STRING_LENGTH = BOARD_SIZE * BOARD_SIZE * 2; // 162

// // Base62, used for encoding/decoding large numbers into a shorter string
// const base62 = {
//     charset: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
//     encode: integer => {
//         if (typeof integer !== 'bigint') {
//             console.error("Base62 encode expects a BigInt");
//             return ''; // Or throw error
//         }
//         if (integer === BigInt(0)) return base62.charset[0]; // Handle zero case explicitly

//         let result = '';
//         const base = BigInt(62);
//         while (integer > 0) {
//             const remainder = integer % base;
//             result = base62.charset[Number(remainder)] + result; // Remainder is safe for Number()
//             integer = integer / base; // BigInt division
//         }
//         return result;
//     },
//     decode: chars => {
//         if (typeof chars !== 'string' || chars.length === 0) {
//              console.error("Base62 decode expects a non-empty string");
//              throw new Error("Invalid input for Base62 decode"); // Throw error on invalid input
//         }
//         let result = BigInt(0);
//         const base = BigInt(62);
//         for (let i = 0; i < chars.length; i++) {
//             const index = base62.charset.indexOf(chars[i]);
//             if (index === -1) throw new Error(`Invalid Base62 character: ${chars[i]}`);
//             result = result * base + BigInt(index);
//         }
//         return result;
//     }
// };

// /**
//  * Encodes the board state (grid + initial grid) into a Base62 string.
//  * First creates a 162-character numeric string, then encodes it.
//  * @param {number[][]} grid - The current grid.
//  * @param {number[][]} initialGrid - The initial grid state.
//  * @returns {string} The Base62 encoded board string.
//  */
// export function encodeBoardToString(grid, initialGrid) {
//     let numericString = '';
//     for (let i = 0; i < BOARD_SIZE; i++) {
//         for (let j = 0; j < BOARD_SIZE; j++) {
//             // Ensure values are single digits
//             numericString += String(grid[i][j] ?? 0); // Use 0 if null/undefined
//             numericString += (initialGrid[i][j] !== 0) ? '1' : '0';
//         }
//     }

//     if (numericString.length !== REQUIRED_STRING_LENGTH) {
//         console.error(`Internal error: Generated numeric string length is ${numericString.length}, expected ${REQUIRED_STRING_LENGTH}`);
//         return ''; // Return empty string on error
//     }

//     try {
//         // Convert the long numeric string to BigInt and then encode
//         const bigIntValue = BigInt(numericString);
//         return base62.encode(bigIntValue);
//     } catch (error) {
//         console.error("Error during Base62 encoding:", error);
//         return ''; // Return empty string on error
//     }
// }

// /**
//  * Decodes a Base62 board string back into grid and initialGrid.
//  * @param {string} encodedString - The Base62 encoded board string.
//  * @returns {{grid: number[][], initialGrid: number[][]}|null} Decoded state or null if invalid.
//  */
// export function decodeBoardFromString(encodedString) {
//     let numericString;
//     try {
//         // Decode the Base62 string back to a BigInt
//         const bigIntValue = base62.decode(encodedString);
//         // Convert BigInt back to string
//         numericString = bigIntValue.toString();
//         // IMPORTANT: Pad the string with leading zeros to ensure it's 162 characters long
//         numericString = numericString.padStart(REQUIRED_STRING_LENGTH, '0');

//     } catch (error) {
//         console.error("Invalid Base62 string for decoding:", encodedString, error);
//         return null; // Error during Base62 decoding
//     }

//     // Now validate the length of the *decoded and padded* string
//     if (numericString.length !== REQUIRED_STRING_LENGTH) {
//         console.error(`Decoded string length is incorrect after padding: ${numericString.length}, expected ${REQUIRED_STRING_LENGTH}. Original encoded: ${encodedString}`);
//         return null;
//     }

//     // Proceed with parsing the 162-character numeric string
//     const grid = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
//     const initialGrid = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

//     try {
//         for (let i = 0; i < numericString.length; i += 2) {
//             const flatIndex = i / 2;
//             const row = Math.floor(flatIndex / BOARD_SIZE);
//             const col = flatIndex % BOARD_SIZE;

//             const valueChar = numericString[i];
//             const prefilledChar = numericString[i + 1];

//             const value = parseInt(valueChar, 10);

//             // Validate parsed characters
//             if (isNaN(value) || value < 0 || value > 9) {
//                  console.error(`Invalid value character '${valueChar}' at index ${i} in decoded string: ${numericString}`);
//                  return null; // Invalid digit
//             }
//              if (prefilledChar !== '0' && prefilledChar !== '1') {
//                 console.error(`Invalid prefilled character '${prefilledChar}' at index ${i+1} in decoded string: ${numericString}`);
//                  return null; // Invalid prefilled flag
//             }

//             grid[row][col] = value;
//             if (prefilledChar === '1') {
//                  // Ensure the initial grid value matches the grid value if prefilled
//                  if (value === 0) {
//                       console.warn(`Prefilled flag set for cell [${row},${col}] but value is 0 in decoded string.`);
//                       initialGrid[row][col] = 0; // Treat as not prefilled if value is 0
//                  } else {
//                      initialGrid[row][col] = value;
//                  }
//             } else {
//                  initialGrid[row][col] = 0; // Ensure non-prefilled initial is 0
//             }
//         }
//          return { grid, initialGrid }; // Success
//     } catch (error) {
//          // This catch block might be redundant if inner checks return null,
//          // but it's safe to keep for unexpected parsing errors.
//          console.error("Error parsing decoded numeric string:", error);
//          return null;
//     }
// }

// /**
//  * Saves the game state to localStorage.
//  * @param {object} gameState - Object containing board, timer, settings.
//  * @param {SudokuBoard} gameState.board - The SudokuBoard instance.
//  * @param {Timer} gameState.timer - The Timer instance.
//  * @param {object} gameState.settings - Settings object { difficulty, autoPencilMarks, saveDifficulty }.
//  */
// export function saveGameState(gameState) {
//     try {
//         const boardState = {
//             grid: gameState.board.getGrid(),
//             initialGrid: gameState.board.getInitialGrid(),
//             // Consider saving pencil marks if needed:
//             // pencilMarks: gameState.board.getAllPencilMarks()
//         };
//         const settingsToSave = {
//             difficulty: gameState.settings.difficulty,
//             autoPencilMarks: gameState.settings.autoPencilMarks,
//             saveDifficulty: gameState.settings.saveDifficulty
//         };

//         localStorage.setItem(BOARD_STATE_KEY, JSON.stringify(boardState));
//         localStorage.setItem(TIMER_KEY, gameState.timer.getElapsedTime().toString());
//         localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
//         localStorage.setItem(HAS_SAVE_KEY, 'true');
//         // console.log("Game state saved.");
//     } catch (error) {
//         console.error("Failed to save game state:", error);
//     }
// }

// /**
//  * Loads game state from localStorage.
//  * @returns {object|null} Loaded state { boardState, elapsedTime, settings } or null if no save data.
//  */
// export function loadGameState() {
//     if (localStorage.getItem(HAS_SAVE_KEY) !== 'true') {
//         return null;
//     }

//     try {
//         const boardState = JSON.parse(localStorage.getItem(BOARD_STATE_KEY) || '{}');
//         const elapsedTime = parseInt(localStorage.getItem(TIMER_KEY) || '0', 10);
//         const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

//         // Basic validation
//         if (!boardState.grid || !boardState.initialGrid || !settings.difficulty) {
//              console.warn("Loaded save data seems corrupted. Starting fresh.");
//              clearSavedGameState(); // Clear potentially bad data
//              return null;
//         }

//         console.log("Game state loaded.");
//         return { boardState, elapsedTime, settings };

//     } catch (error) {
//         console.error("Failed to load game state:", error);
//         clearSavedGameState(); // Clear potentially bad data on error
//         return null;
//     }
// }

// /**
//  * Clears all saved game data from localStorage.
//  */
// export function clearSavedGameState() {
//     localStorage.removeItem(BOARD_STATE_KEY);
//     localStorage.removeItem(TIMER_KEY);
//     localStorage.removeItem(SETTINGS_KEY);
//     localStorage.removeItem(HAS_SAVE_KEY);
//     console.log("Cleared saved game state.");
// }

// // --- Export/Import specific functions ---

// export function exportBoardToString(grid, initialGrid) {
//     const encoded = encodeBoardToString(grid, initialGrid);
//     // Potentially show in UI first before copying
//     copyToClipboard(encoded);
//     return encoded; // Return for potential display
// }

// export function importBoardFromString(boardString) {
//     return decodeBoardFromString(boardString);
//     // The game logic will handle applying this decoded state
// }

// js/sudoku/persistence.js
import { BOARD_SIZE } from './constants.js';
import { copyToClipboard } from './utils.js';

// LocalStorage Keys (remain the same)
const SAVE_KEY_PREFIX = 'sudokuApp_';
const BOARD_STATE_KEY = SAVE_KEY_PREFIX + 'boardState'; // Will store more data now
const TIMER_KEY = SAVE_KEY_PREFIX + 'timerElapsed'; // Might become redundant if time is in boardState
const SETTINGS_KEY = SAVE_KEY_PREFIX + 'settings'; // Might become redundant if settings are in boardState
const HAS_SAVE_KEY = SAVE_KEY_PREFIX + 'hasSaveData';

// Version for the exported/saved format
const DATA_FORMAT_VERSION = 1;

// --- Encoding/Decoding for Export/Import ---

/**
 * Encodes the full game state into a compressed Base64 string.
 * @param {object} gameState - Object containing board, difficulty, time.
 * @param {SudokuBoard} gameState.board - The SudokuBoard instance.
 * @param {number} gameState.difficulty - The current difficulty value.
 * @param {number} gameState.elapsedTime - Current time elapsed in ms.
 * @returns {string} The compressed, Base64 encoded game state string, or empty string on error.
 */
export function encodeGameStateToString(gameState) {
    try {
        const stateObject = {
            v: DATA_FORMAT_VERSION,
            g: gameState.board.getGrid(),
            i: gameState.board.getInitialGrid(),
            p: gameState.board.getAllPencilMarks(), // Include pencil marks
            d: gameState.difficulty,               // Include difficulty
            t: gameState.elapsedTime,              // Include time elapsed
            // Add any other state elements you want to export here later
        };

        // 1. Stringify the state object
        const jsonString = JSON.stringify(stateObject);

        // 2. Compress the JSON string using pako (deflate)
        // The output is Uint8Array
        const compressedData = pako.deflate(jsonString, { level: 9 }); // level 9 for max compression

        // 3. Encode the compressed binary data to Base64URL
        // Base64URL is safer for URLs than standard Base64 (+ becomes -, / becomes _)
        // Need a helper function for Uint8Array -> Base64URL
        const base64String = uint8ArrayToBase64Url(compressedData);

        return base64String;

    } catch (error) {
        console.error("Error encoding game state:", error);
        return ''; // Return empty string on failure
    }
}

/**
 * Decodes a compressed Base64 string back into a full game state object.
 * @param {string} encodedString - The compressed, Base64 encoded game state string.
 * @returns {object|null} Decoded state { grid, initialGrid, pencilMarks, difficulty, elapsedTime } or null if invalid.
 */
export function decodeGameStateFromString(encodedString) {
    try {
        // 1. Decode Base64URL string back to Uint8Array
        const compressedData = base64UrlToUint8Array(encodedString);

        // 2. Decompress the data using pako (inflate)
        // Specify 'to: "string"' to get the JSON string directly
        const jsonString = pako.inflate(compressedData, { to: 'string' });

        // 3. Parse the JSON string
        const stateObject = JSON.parse(jsonString);

        // 4. Validate the parsed object (basic checks)
        if (!stateObject || typeof stateObject !== 'object') {
             throw new Error("Decoded data is not an object.");
        }
        if (stateObject.v !== DATA_FORMAT_VERSION) {
            // Handle version mismatch if needed in the future (e.g., migration)
            console.warn(`Decoded data version mismatch. Expected ${DATA_FORMAT_VERSION}, got ${stateObject.v}. Attempting to load anyway.`);
             // For now, we'll try to load it assuming structure is compatible enough.
        }
        if (!stateObject.g || !stateObject.i || !stateObject.p || stateObject.d === undefined || stateObject.t === undefined) {
            throw new Error("Decoded object missing required fields (g, i, p, d, t).");
        }
        // Add more validation if necessary (e.g., check array dimensions)

        // 5. Return the relevant parts
        return {
            grid: stateObject.g,
            initialGrid: stateObject.i,
            pencilMarks: stateObject.p,
            difficulty: stateObject.d,
            elapsedTime: stateObject.t,
            // Extract other fields if they were added
        };

    } catch (error) {
        console.error("Error decoding game state:", error);
        return null; // Return null on any failure
    }
}


// --- Helper functions for Base64URL ---

function uint8ArrayToBase64Url(uint8Array) {
    // Convert Uint8Array to binary string
    let binaryString = '';
    uint8Array.forEach(byte => {
        binaryString += String.fromCharCode(byte);
    });
    // Use btoa for Base64 encoding
    let base64String = btoa(binaryString);
    // Convert to Base64URL: replace + with -, / with _, remove padding =
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64UrlString) {
    // Convert back from Base64URL: replace - with +, _ with /
    let base64String = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding back if necessary (length must be multiple of 4)
    while (base64String.length % 4) {
        base64String += '=';
    }
    // Use atob to decode Base64
    const binaryString = atob(base64String);
    // Convert binary string to Uint8Array
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}


// --- Local Storage Saving/Loading ---
// Option 1: Keep saving uncompressed JSON (easier to inspect in localStorage)
// Option 2: Save the compressed Base64 string (consistent with export)
// Let's go with Option 1 for now for easier debugging.

/**
 * Saves the relevant game state parts to localStorage as JSON.
 * Includes grid, initialGrid, pencilMarks, difficulty, and time.
 * @param {object} gameState - Object containing board, difficulty, elapsedTime, settings.
 * @param {SudokuBoard} gameState.board - The SudokuBoard instance.
 * @param {number} gameState.difficulty - Current difficulty value.
 * @param {number} gameState.elapsedTime - Current time elapsed in ms.
 * @param {object} gameState.settings - Full settings object { autoPencilMarks, saveDifficulty }
 */
export function saveGameState(gameState) {
    try {
        const stateToSave = {
             v: DATA_FORMAT_VERSION, // Good practice to version save data too
             grid: gameState.board.getGrid(),
             initialGrid: gameState.board.getInitialGrid(),
             pencilMarks: gameState.board.getAllPencilMarks(),
             difficulty: gameState.difficulty, // Save current difficulty
             elapsedTime: gameState.elapsedTime, // Save current time
             settings: gameState.settings // Save the settings object directly
        };

        localStorage.setItem(BOARD_STATE_KEY, JSON.stringify(stateToSave));
        // We don't strictly need separate TIMER_KEY and SETTINGS_KEY anymore
        // but keep HAS_SAVE_KEY to quickly check if data exists.
        localStorage.removeItem(TIMER_KEY); // Clean up old keys if desired
        localStorage.removeItem(SETTINGS_KEY); // Clean up old keys if desired
        localStorage.setItem(HAS_SAVE_KEY, 'true');
        // console.log("Game state saved (expanded JSON).");

    } catch (error) {
        console.error("Failed to save game state:", error);
    }
}

/**
 * Loads game state from localStorage (expects expanded JSON format).
 * @returns {object|null} Loaded state { grid, initialGrid, pencilMarks, difficulty, elapsedTime, settings } or null.
 */
export function loadGameState() {
    if (localStorage.getItem(HAS_SAVE_KEY) !== 'true') {
        return null;
    }

    try {
        const savedJson = localStorage.getItem(BOARD_STATE_KEY);
        if (!savedJson) return null;

        const loadedState = JSON.parse(savedJson);

        // --- Validation ---
        if (!loadedState || typeof loadedState !== 'object') {
             throw new Error("Saved state is not a valid object.");
        }
        // Check version if needed (like in decode)
        if (loadedState.v !== DATA_FORMAT_VERSION) {
             console.warn(`Saved state version mismatch. Expected ${DATA_FORMAT_VERSION}, got ${loadedState.v}. Attempting migration or reset.`);
             // Implement migration logic here if versions differ significantly
             // For now, we might just discard the old save
             clearSavedGameState();
             return null;
        }
        // Check for essential fields
        if (!loadedState.grid || !loadedState.initialGrid || !loadedState.pencilMarks || loadedState.difficulty === undefined || loadedState.elapsedTime === undefined || !loadedState.settings ) {
            throw new Error("Saved state object missing required fields.");
        }

        console.log("Game state loaded from localStorage.");

        // Return the structured object
        return {
            grid: loadedState.grid,
            initialGrid: loadedState.initialGrid,
            pencilMarks: loadedState.pencilMarks,
            difficulty: loadedState.difficulty,
            elapsedTime: loadedState.elapsedTime,
            settings: loadedState.settings,
        };

    } catch (error) {
        console.error("Failed to load or parse game state:", error);
        clearSavedGameState(); // Clear corrupted data
        return null;
    }
}

/**
 * Clears all saved game data from localStorage.
 */
export function clearSavedGameState() {
    localStorage.removeItem(BOARD_STATE_KEY);
    localStorage.removeItem(TIMER_KEY); // Remove old keys too
    localStorage.removeItem(SETTINGS_KEY); // Remove old keys too
    localStorage.removeItem(HAS_SAVE_KEY);
    console.log("Cleared saved game state.");
}

// --- Export/Import Function Wrappers (using new encoding/decoding) ---

/**
 * Gets the full game state and returns the encoded string for export.
 * Also copies the string to the clipboard.
 * @param {object} fullGameState - The object from game.js holding board, difficulty, time etc.
 * @returns {string} The encoded string.
 */
export function exportGameState(fullGameState) {
    const encoded = encodeGameStateToString(fullGameState);
    if (encoded) {
        copyToClipboard(encoded);
        console.log("Game state encoded and copied to clipboard.");
    } else {
        console.error("Failed to encode game state for export.");
    }
    return encoded; // Return for potential display in UI
}

/**
 * Takes an encoded string and decodes it.
 * @param {string} encodedString - The string to import.
 * @returns {object|null} The decoded game state object or null on failure.
 */
export function importGameState(encodedString) {
    const decodedState = decodeGameStateFromString(encodedString);
    if (decodedState) {
        console.log("Game state successfully decoded from string.");
    } else {
        console.error("Failed to decode game state string.");
    }
    return decodedState;
    // The game logic will handle applying this decoded state
}
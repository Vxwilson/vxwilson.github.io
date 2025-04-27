
// export const Modes = Object.freeze({
//     NORMAL: 0,
//     MARKING: 1,
//     FOCUS: 2
// });

// export const Platform = Object.freeze({
//     Mobile: 0,
//     Desktop: 1
// });

// // Add other constants if needed, e.g., board size
// export const BOARD_SIZE = 9;
// export const BOX_SIZE = 3;


// // DIFFICULTY LEVELS

// export const Difficulty = Object.freeze({
//     EASY: 46,
//     MEDIUM: 37,
//     HARD: 32,
//     IMPOSSIBLE: 22 // Let's give impossible a baseline, adjust as needed
// });


// // js/sudoku/constants.js (or a new file like difficulty.js)
// export const DifficultyLevel = Object.freeze({
//     BEGINNER: 'Beginner', // Only Naked/Hidden Singles
//     EASY: 'Easy',         // Adds Locked Candidates (Pointing/Claiming)
//     MEDIUM: 'Medium',       // Adds Naked/Hidden Pairs
//     HARD: 'Hard',         // Adds X-Wing or W-Wing
//     // EXPERT: 'Expert',       // Both W-Wing and X-Wing for now
//     // Add more levels like FIENDISH, etc. as you add techniques
//     UNKNOWN: 'Unknown'
// });

// // Map techniques (use consistent base names from your find* functions)
// // to a numerical difficulty score or directly to the level name.
// // Using numbers allows easier comparison (<, >).
// const TECHNIQUE_SCORES = {
//     'Naked Single': 10,
//     'Hidden Single': 20, // Slightly harder to spot
//     'Locked Candidates': 30, // Covers Pointing/Claiming
//     'Naked Pair': 40,
//     'Hidden Pair': 50,
//     'X-Wing': 60,
//     'W-Wing': 60,
//     // Add scores for Swordfish, Skyscraper, etc.
// };

// // Map DifficultyLevel Enum/Constants to the *maximum score* allowed for that level.
// // A puzzle's rating is determined by the highest score of any technique *required* to solve it.
// export const DIFFICULTY_THRESHOLDS = {
//     [DifficultyLevel.BEGINNER]: 19, // just naked singles
//     [DifficultyLevel.EASY]:     29, // up to hidden singles
//     [DifficultyLevel.MEDIUM]:   51, // up to hidden pairs + locked candidates
//     [DifficultyLevel.HARD]:     69, // advanced techniques (x-wing, w-wings)
//     // [DifficultyLevel.EXPERT]:   79, 
//      // Adjust scores/thresholds based on perceived difficulty
// };

// // Helper to get score for a technique name (handles variations)
// export function getTechniqueScore(techniqueName) {
//     if (!techniqueName) return 0;
//     if (techniqueName.startsWith('Naked Single')) return TECHNIQUE_SCORES['Naked Single'];
//     if (techniqueName.startsWith('Hidden Single')) return TECHNIQUE_SCORES['Hidden Single'];
//     if (techniqueName.startsWith('Locked Candidates')) return TECHNIQUE_SCORES['Locked Candidates'];
//     if (techniqueName.startsWith('Naked Pair')) return TECHNIQUE_SCORES['Naked Pair'];
//     if (techniqueName.startsWith('Hidden Pair')) return TECHNIQUE_SCORES['Hidden Pair'];
//     if (techniqueName.startsWith('X-Wing')) return TECHNIQUE_SCORES['X-Wing'];
//     if (techniqueName.startsWith('W-Wing')) return TECHNIQUE_SCORES['W-Wing'];
//     // Add other base techniques
//     console.warn(`Unknown technique for scoring: ${techniqueName}`);
//     return 0; // Default score for unknown techniques
// }

// // Helper to get DifficultyLevel enum from score
// export function getDifficultyLevelFromScore(maxScore) {
//     if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.BEGINNER]) return DifficultyLevel.BEGINNER;
//     if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EASY]) return DifficultyLevel.EASY;
//     if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.MEDIUM]) return DifficultyLevel.MEDIUM;
//     if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.HARD]) return DifficultyLevel.HARD;
//     // if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EXPERT]) return DifficultyLevel.EXPERT;
//     // Add higher levels
//     return DifficultyLevel.HARD; 
//     // return DifficultyLevel.EXPERT; 
// }

// js/sudoku/constants.js

// --- Basic Board Constants ---
export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;

// --- UI Modes/Platform (Keep if used) ---
export const Modes = Object.freeze({
    NORMAL: 0,
    MARKING: 1,
    FOCUS: 2
});
export const Platform = Object.freeze({
    Mobile: 0,
    Desktop: 1
});

// --- Difficulty Levels (Aligned with common SE ranges) ---
export const DifficultyLevel = Object.freeze({
    // Approximate SE Range Endpoints (inclusive)
    BABY: 'Baby',       // <= 1.3 (Full House/Hidden Singles in Box)
    EASY: 'Easy',         // <= 2.4 (naked/hidden)
    MEDIUM: 'Medium',       // <= 2.9 (Locked Candidates)
    HARD: 'Hard',         // <= 4.2 (X-Wing, W-Wing)
    VERY_HARD: '?!', // <= 5.0 (Swordfish, Skyscraper)
    // EXTREME: '?!!',     // <= 6.0 (XYZ-Wing, etc.)
    // UNFAIR: '?!!!',       
    UNKNOWN: 'Unknown'
});

// --- SE Scores (Multiplied by 10 for Integer Handling) ---
// Based on the provided list and common SE ratings. Add more as needed.
const SE_SCORES = {
    // Singles
    'Full House': 10,                  // Approx SE 1.0
    'Hidden Single (Box)': 12,         // SE 1.2
    'Hidden Single (Row)': 15,         // SE 1.5
    'Hidden Single (Col)': 15,         // SE 1.5
    'Naked Single': 23,                // SE 2.3

    // Locked Candidates
    // Note: "Direct" versions (1.7, 1.9) are hard to detect without simulation.
    // We'll use the standard scores for now. Generator might create puzzles
    // where these act "directly", but rating uses the base technique score.
    'Locked Candidates (Pointing Row)': 26, // SE 2.6
    'Locked Candidates (Pointing Col)': 26, // SE 2.6
    'Locked Candidates (Claiming Row)': 28, // SE 2.8
    'Locked Candidates (Claiming Column)': 28,// SE 2.8

    // Subsets (Pairs)
    // Note: Direct Hidden Pair (2.0) - using standard Hidden Pair score for now.
    'Naked Pair': 30,                  // SE 3.0
    'Hidden Pair': 34,                 // SE 3.4

    // Fish / Wings
    'W-Wing': 31,                      // SE 3.1 (Note: SE lists lower than X-Wing)
    'X-Wing': 32,                      // SE 3.2
    'Y-Wing': 42,                      // SE 4.2 (XY-Wing)

    // Subsets (Triples) - Requires implementing findNakedTriples/findHiddenTriples
    'Naked Triplet': 36,               // SE 3.6
    'Hidden Triplet': 40,              // SE 4.0

    // Subsets (Quads) - Requires implementing findNakedQuads/findHiddenQuads
    'Naked Quad': 50,                  // Approx SE 5.0 (example value)
    'Hidden Quad': 43,                 // SE 4.3

    // Add other techniques here as you implement them
    // 'Swordfish': 38,                // SE 3.8
    // 'XYZ-Wing': 44,                 // SE 4.4
    // ... etc
};

// --- Difficulty Thresholds (Based on MAX score for the level) ---
export const DIFFICULTY_THRESHOLDS = {
    // Corresponds to the *highest* SE score allowed IN that level
    [DifficultyLevel.BABY]: 15,   
    [DifficultyLevel.EASY]: 24,   
    [DifficultyLevel.MEDIUM]: 29,
    [DifficultyLevel.HARD]: 40,  
    [DifficultyLevel.VERY_HARD]: 50, 
    // [DifficultyLevel.EXTREME]: 50, 
    // [DifficultyLevel.UNFAIR]: Infinity 
};

// --- Helper Functions ---

/**
 * Gets the SE score (x10) for a specific technique name.
 * @param {string} techniqueName - The precise name returned by solver functions.
 * @returns {number} The integer score (SE * 10), or 0 if unknown.
 */
export function getTechniqueScore(techniqueName) {
    if (!techniqueName) return 0;

    // Direct mapping based on expected names from solver functions
    const score = SE_SCORES[techniqueName];
    if (score !== undefined) {
        return score;
    }

    // Fallback for potential variations (e.g., X-Wing (Rows, Digit 5))
    // You might not need this if functions return consistent base names + type
    const baseTechnique = techniqueName.split(' (')[0];
    const fallbackScore = SE_SCORES[baseTechnique];
    if (fallbackScore !== undefined) {
        console.warn(`Used fallback score for technique: ${techniqueName} -> ${baseTechnique}`);
        return fallbackScore;
    }


    console.warn(`Unknown technique for scoring: ${techniqueName}`);
    return 0; // Default score for unknown techniques
}

/**
 * Determines the DifficultyLevel based on the maximum SE score needed.
 * @param {number} maxScore - The highest SE score (x10) encountered.
 * @returns {DifficultyLevel}
 */
export function getDifficultyLevelFromScore(maxScore) {
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.BABY]) return DifficultyLevel.BABY; 
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EASY]) return DifficultyLevel.EASY; 
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.MEDIUM]) return DifficultyLevel.MEDIUM;
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.HARD]) return DifficultyLevel.HARD;
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.VERY_HARD]) return DifficultyLevel.VERY_HARD;
    // if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EXTREME]) return DifficultyLevel.EXTREME;
    // if (maxScore > DIFFICULTY_THRESHOLDS[DifficultyLevel.EXTREME]) return DifficultyLevel.UNFAIR;

    // Default fallback (shouldn't normally be reached if thresholds cover up to UNFAIR)
    return DifficultyLevel.UNKNOWN;
}

export const Modes = Object.freeze({
    NORMAL: 0,
    MARKING: 1,
    FOCUS: 2
});

export const Platform = Object.freeze({
    Mobile: 0,
    Desktop: 1
});

// Add other constants if needed, e.g., board size
export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;


// DIFFICULTY LEVELS

export const Difficulty = Object.freeze({
    EASY: 46,
    MEDIUM: 37,
    HARD: 32,
    IMPOSSIBLE: 22 // Let's give impossible a baseline, adjust as needed
});


// js/sudoku/constants.js (or a new file like difficulty.js)
export const DifficultyLevel = Object.freeze({
    BEGINNER: 'Beginner', // Only Naked/Hidden Singles
    EASY: 'Easy',         // Adds Locked Candidates (Pointing/Claiming)
    MEDIUM: 'Medium',       // Adds Naked/Hidden Pairs
    HARD: 'Hard',         // Adds X-Wing or W-Wing
    // EXPERT: 'Expert',       // Both W-Wing and X-Wing for now
    // Add more levels like FIENDISH, etc. as you add techniques
    UNKNOWN: 'Unknown'
});

// Map techniques (use consistent base names from your find* functions)
// to a numerical difficulty score or directly to the level name.
// Using numbers allows easier comparison (<, >).
const TECHNIQUE_SCORES = {
    'Naked Single': 10,
    'Hidden Single': 20, // Slightly harder to spot
    'Locked Candidates': 30, // Covers Pointing/Claiming
    'Naked Pair': 40,
    'Hidden Pair': 50,
    'X-Wing': 60,
    'W-Wing': 60,
    // Add scores for Swordfish, Skyscraper, etc.
};

// Map DifficultyLevel Enum/Constants to the *maximum score* allowed for that level.
// A puzzle's rating is determined by the highest score of any technique *required* to solve it.
export const DIFFICULTY_THRESHOLDS = {
    [DifficultyLevel.BEGINNER]: 19, // just naked singles
    [DifficultyLevel.EASY]:     29, // up to hidden singles
    [DifficultyLevel.MEDIUM]:   51, // up to hidden pairs + locked candidates
    [DifficultyLevel.HARD]:     69, // advanced techniques (x-wing, w-wings)
    // [DifficultyLevel.EXPERT]:   79, 
     // Adjust scores/thresholds based on perceived difficulty
};

// Helper to get score for a technique name (handles variations)
export function getTechniqueScore(techniqueName) {
    if (!techniqueName) return 0;
    if (techniqueName.startsWith('Naked Single')) return TECHNIQUE_SCORES['Naked Single'];
    if (techniqueName.startsWith('Hidden Single')) return TECHNIQUE_SCORES['Hidden Single'];
    if (techniqueName.startsWith('Locked Candidates')) return TECHNIQUE_SCORES['Locked Candidates'];
    if (techniqueName.startsWith('Naked Pair')) return TECHNIQUE_SCORES['Naked Pair'];
    if (techniqueName.startsWith('Hidden Pair')) return TECHNIQUE_SCORES['Hidden Pair'];
    if (techniqueName.startsWith('X-Wing')) return TECHNIQUE_SCORES['X-Wing'];
    if (techniqueName.startsWith('W-Wing')) return TECHNIQUE_SCORES['W-Wing'];
    // Add other base techniques
    console.warn(`Unknown technique for scoring: ${techniqueName}`);
    return 0; // Default score for unknown techniques
}

// Helper to get DifficultyLevel enum from score
export function getDifficultyLevelFromScore(maxScore) {
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.BEGINNER]) return DifficultyLevel.BEGINNER;
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EASY]) return DifficultyLevel.EASY;
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.MEDIUM]) return DifficultyLevel.MEDIUM;
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.HARD]) return DifficultyLevel.HARD;
    // if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EXPERT]) return DifficultyLevel.EXPERT;
    // Add higher levels
    return DifficultyLevel.HARD; 
    // return DifficultyLevel.EXPERT; 
}
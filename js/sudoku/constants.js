
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
    BABY: 'Baby',      
    EASY: 'Easy',        
    MEDIUM: 'Medium',     
    HARD: 'Hard',       
    VERY_HARD: '?!',
    EXTREME: '?!!',   
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
    'Naked Pair': 29,                  // SE 3.0
    'Hidden Pair': 31,                 // SE 3.4

    // Fish / Wings
    'X-Wing': 32,                      // SE 3.2   
    'Swordfish': 38,                   // SE 3.8
             
    'Skyscraper': 40,                  // SE 4.0 
    '2-String Kite': 41,               // SE 4.0 
    'Y-Wing': 41,                      // SE 4.2 (XY-Wing)
    'Crane': 42,                       // SE 4.4
    'W-Wing': 45,                      // SE 4.5   

    // Subsets (Triples) - Requires implementing findNakedTriples/findHiddenTriples
    'Naked Triplet': 36,               // SE 3.6
    'Hidden Triplet': 40,              // SE 4.0

    // Subsets (Quads) - Requires implementing findNakedQuads/findHiddenQuads
    'Naked Quad': 50,                  // Approx SE 5.0 (example value)
    'Hidden Quad': 43,                 // SE 4.3

    // Rectangles
    'Empty Rectangle': 45,             // SE 4.5
};

// --- Difficulty Thresholds (Based on MAX score for the level) ---
export const DIFFICULTY_THRESHOLDS = {
    // Corresponds to the *highest* SE score allowed IN that level
    // That one CANNOT EXCEED
    [DifficultyLevel.BABY]: 15,   
    [DifficultyLevel.EASY]: 24,   
    [DifficultyLevel.MEDIUM]: 31,
    [DifficultyLevel.HARD]: 40,  
    [DifficultyLevel.VERY_HARD]: 43,
    [DifficultyLevel.EXTREME]: 55,
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
    if (maxScore <= DIFFICULTY_THRESHOLDS[DifficultyLevel.EXTREME]) return DifficultyLevel.EXTREME;
    // if (maxScore > DIFFICULTY_THRESHOLDS[DifficultyLevel.EXTREME]) return DifficultyLevel.UNFAIR;

    // Default fallback (shouldn't normally be reached if thresholds cover up to UNFAIR)
    return DifficultyLevel.UNKNOWN;
}
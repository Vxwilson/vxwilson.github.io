// js/sudoku/confetti.js

// Ensure confetti library is loaded globally or handle import if it's modular
// Assuming it's loaded globally via CDN for now.

let heartShape = null;
let skullShape = null;

function createShapes() {
    try {
        if (typeof confetti === 'function' && typeof confetti.shapeFromText === 'function') {
            heartShape = confetti.shapeFromText({ text: '❤️', scalar: 1 });
            skullShape = confetti.shapeFromText({ text: '💀', scalar: 1 });
            console.log("Confetti shapes created successfully.");
        } else {
            console.warn("confetti.shapeFromText not available.");
        }
    } catch (error) {
        console.error("Error creating confetti shapes:", error);
    }
}

// Call this once when the module loads
createShapes();

export function triggerConfetti() {
    const randomParticleCount = Math.floor(Math.random() * (250 - 120 + 1)) + 120;
    const randomTicks = Math.floor(Math.random() * (400 - 200 + 1)) + 200;
    const randomSpread = Math.floor(Math.random() * (90 - 50 + 1)) + 50;

    console.log(`Confetti: Count=${randomParticleCount}, Ticks=${randomTicks}, Spread=${randomSpread}`);

    // Main Burst
    confetti({
        particleCount: randomParticleCount,
        spread: randomSpread,
        origin: { y: 0.6 },
        ticks: randomTicks,
    });
    // Side bursts
    setTimeout(() => {
        confetti({
            particleCount: Math.floor(randomParticleCount / 3),
            spread: 60, origin: { y: 0.7, x: 0.3 }, angle: 120, scalar: 0.8,
            colors: ['#bb0000', '#ffffff', '#00ff00'], ticks: randomTicks
         });
    }, 150);
    setTimeout(() => {
        confetti({
            particleCount: Math.floor(randomParticleCount / 3),
            spread: 60, origin: { y: 0.7, x: 0.7 }, angle: 60, scalar: 0.8,
            colors: ['#0000ff', '#ffff00', '#ff00ff'], ticks: randomTicks
         });
    }, 150);
}

export function triggerMiniConfetti() {
    if (typeof confetti !== 'function') return;
    const randomParticleCount = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
    const randomTicks = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    const randomSpread = Math.floor(Math.random() * (40 - 15 + 1)) + 15; // Slightly wider spread

    confetti({
        particleCount: randomParticleCount,
        spread: randomSpread,
        origin: { y: 0.6 },
        ticks: randomTicks,
        gravity: 0.8 // Slightly faster fall maybe
    });
}

export function triggerHeartConfetti() {
    if (typeof confetti !== 'function') return;
    const shapesToUse = heartShape ? [heartShape] : ['circle']; // Fallback
    const colors = ['#FF69B4', '#FF1493', '#DC143C', '#FFFFFF'];

    // Central burst
    confetti({
        particleCount: 100, spread: 90, origin: { y: 0.6 },
        ticks: 300, gravity: 0.6, decay: 0.93, scalar: 1.5,
        shapes: shapesToUse, colors: colors
    });
    // Side bursts
    setTimeout(() => {
        confetti({
            particleCount: 50, spread: 60, origin: { y: 0.7, x: 0.3 }, angle: 120,
            scalar: heartShape ? 1.6 : 0.8, shapes: shapesToUse, colors: colors, ticks: 300
        });
    }, 100);
    setTimeout(() => {
        confetti({
            particleCount: 50, spread: 60, origin: { y: 0.7, x: 0.7 }, angle: 60,
            scalar: heartShape ? 1.6 : 0.8, shapes: shapesToUse, colors: colors, ticks: 300
        });
    }, 100);
}

export function triggerSkullConfetti() {
     if (typeof confetti !== 'function') return;
    const shapesToUse = skullShape ? [skullShape] : ['circle'];
    const colors = ['#000000', '#444444', '#FFFFFF'];
    const randomParticleCount = Math.floor(Math.random() * (150 - 70 + 1)) + 70; // Fewer skulls
    const randomTicks = Math.floor(Math.random() * (450 - 250 + 1)) + 250;
    const randomSpread = Math.floor(Math.random() * (100 - 60 + 1)) + 60;

    confetti({
        particleCount: randomParticleCount, spread: randomSpread, origin: { y: 0.6 },
        ticks: randomTicks, gravity: 0.7, decay: 0.92, scalar: 2,
        shapes: shapesToUse, colors: colors
    });
     // Optional smaller bursts
    setTimeout(() => {
        confetti({
            particleCount: Math.floor(randomParticleCount / 2.5), spread: 60,
            origin: { y: 0.7, x: 0.3 }, angle: 120, scalar: 1.2,
            shapes: shapesToUse, colors: colors, ticks: randomTicks
         });
    }, 150);
     setTimeout(() => {
        confetti({
            particleCount: Math.floor(randomParticleCount / 2.5), spread: 60,
            origin: { y: 0.7, x: 0.7 }, angle: 60, scalar: 1.2,
             shapes: shapesToUse, colors: colors, ticks: randomTicks
         });
    }, 150);
}

export function celebrate() {
    if (typeof confetti !== 'function') {
        console.log("Win! (Confetti not available)");
        return;
    }
    // Randomly choose which celebration
    const randomNum = Math.random(); // 0.0 to < 1.0
    if (randomNum < 0.03 && skullShape) { // 3% chance for skulls (if available)
        triggerSkullConfetti();
    } else if (randomNum < 0.15 && heartShape) { // 12% chance for hearts (if available)
         triggerHeartConfetti();
    } else { // 85% chance for standard
        triggerConfetti();
    }
}

/**
 * Checks if all 9 instances of a number are placed on the board.
 * @param {number[][]} boardGrid - The current board state.
 * @param {number} num - The number (1-9) to check.
 * @returns {boolean} True if the number set is complete.
 */
export function isNumberSetComplete(boardGrid, num) {
    if (num < 1 || num > 9) return false;
    let count = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (boardGrid[r][c] === num) {
                count++;
            }
        }
    }
    return count === 9;
}
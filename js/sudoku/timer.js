// js/sudoku/timer.js

export class Timer {
    constructor(updateCallback) {
        this.startTime = 0;
        this.elapsedPaused = 0; // Time elapsed while paused
        this.intervalId = null;
        this.isPaused = false;
        this.updateCallback = updateCallback; // Function to update the timer display
    }

    _formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }

    _tick() {
        const now = Date.now();
        const elapsed = now - this.startTime;
        this.updateCallback(this._formatTime(elapsed));
    }

    start(initialElapsed = 0) {
        if (this.intervalId) return; // Already running

        this.elapsedPaused = initialElapsed; // Load saved time if provided
        this.startTime = Date.now() - this.elapsedPaused;
        this.isPaused = false;

        this._tick(); // Initial update
        this.intervalId = setInterval(() => this._tick(), 1000); // Update every second
        console.log("Timer started");
    }

    stop() {
        if (!this.intervalId) return; // Already stopped

        clearInterval(this.intervalId);
        this.intervalId = null;
        // Keep track of total elapsed time *before* pausing
        this.elapsedPaused = Date.now() - this.startTime;
        console.log("Timer stopped");
    }

    reset() {
        this.stop();
        this.startTime = 0;
        this.elapsedPaused = 0;
        this.isPaused = false;
        this.updateCallback(this._formatTime(0)); // Reset display
        console.log("Timer reset");
    }

    pause() {
        if (this.isPaused || !this.intervalId) return;
        this.stop(); // Stops the interval and records elapsed time
        this.isPaused = true;
        console.log("Timer paused");
    }

    resume() {
        if (!this.isPaused || this.intervalId) return;
        // Restart the timer, subtracting the time already elapsed *before* the pause
        this.start(this.elapsedPaused);
        console.log("Timer resumed");
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
        return this.isPaused;
    }

    getElapsedTime() {
        if (!this.isPaused && this.intervalId) {
            // Timer is running
            return Date.now() - this.startTime;
        } else {
            // Timer is paused or stopped, return the last recorded elapsed time
            return this.elapsedPaused;
        }
    }
}
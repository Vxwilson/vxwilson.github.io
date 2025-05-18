// FILE: SudokuCspSolver.js
import { BOARD_SIZE, BOX_SIZE } from './constants.js'; // Assuming these are relevant
import { coordsToKey, keyToCoords, getPeers as getPeersUtil } from './utils.js'; // Assuming getPeers is from utils

class SudokuCspSolver {
    constructor(gridStringOrBoard) {
        this.variables = []; // Array of cell keys e.g., "0-0", "0-1", ...
        this.domains = new Map(); // Map<string, Set<number>>: key -> {1,2,3...}
        this.constraints = []; // Array of Sets of cell keys (each set is a unit)
        this.peers = new Map(); // Map<string, Set<string>>: key -> Set of peer keys

        this._initialize(gridStringOrBoard);
    }

    _initialize(gridStringOrBoard) {
        let board2D;
        if (typeof gridStringOrBoard === 'string') {
            board2D = [];
            for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += BOARD_SIZE) {
                const rowStr = gridStringOrBoard.substring(i, i + BOARD_SIZE);
                board2D.push(Array.from(rowStr).map(c => (c === '.' || c === '0' ? 0 : parseInt(c))));
            }
        } else { // Assuming it's number[][]
            board2D = gridStringOrBoard.map(row => [...row]); // Deep copy
        }

        const allPossibleDigits = new Set();
        for (let i = 1; i <= BOARD_SIZE; i++) allPossibleDigits.add(i);

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const key = coordsToKey(r, c);
                this.variables.push(key);
                if (board2D[r][c] !== 0) {
                    this.domains.set(key, new Set([board2D[r][c]]));
                } else {
                    this.domains.set(key, new Set(allPossibleDigits));
                }
            }
        }

        // Define constraints (units) & peers
        // Rows
        for (let r = 0; r < BOARD_SIZE; r++) {
            const unit = new Set();
            for (let c = 0; c < BOARD_SIZE; c++) unit.add(coordsToKey(r, c));
            this.constraints.push(unit);
        }
        // Cols
        for (let c = 0; c < BOARD_SIZE; c++) {
            const unit = new Set();
            for (let r = 0; r < BOARD_SIZE; r++) unit.add(coordsToKey(r, c));
            this.constraints.push(unit);
        }
        // Boxes
        const boxSize = Math.sqrt(BOARD_SIZE); // Should be BOX_SIZE from constants
        for (let br = 0; br < BOARD_SIZE; br += boxSize) {
            for (let bc = 0; bc < BOARD_SIZE; bc += boxSize) {
                const unit = new Set();
                for (let r = br; r < br + boxSize; r++) {
                    for (let c = bc; c < bc + boxSize; c++) unit.add(coordsToKey(r, c));
                }
                this.constraints.push(unit);
            }
        }

        // Populate peers map
        for (const key of this.variables) {
            const [r, c] = keyToCoords(key);
            // Use your existing getPeersUtil if it returns keys or adapt it.
            // For simplicity here, deriving from constraints:
            const cellPeers = new Set();
            for (const unit of this.constraints) {
                if (unit.has(key)) {
                    unit.forEach(peerKey => {
                        if (peerKey !== key) cellPeers.add(peerKey);
                    });
                }
            }
            this.peers.set(key, cellPeers);
        }
        
        // Initial propagation from givens (simplified AC-3 start for givens)
        let changedInInit = true;
        while(changedInInit){
            changedInInit = false;
            for (const key of this.variables) {
                const domain = this.domains.get(key);
                if (domain.size === 1) {
                    const valueToPropagate = Array.from(domain)[0];
                    this.peers.get(key).forEach(peerKey => {
                        const peerDomain = this.domains.get(peerKey);
                        if (peerDomain.has(valueToPropagate)) {
                            peerDomain.delete(valueToPropagate);
                            changedInInit = true;
                            if (peerDomain.size === 0) {
                                // This means the initial board is inconsistent.
                                // Set a flag or throw, for now clear all domains to show failure.
                                this.domains.forEach(d => d.clear());
                                changedInInit = false; // stop loop
                                return;
                            }
                        }
                    });
                }
            }
        }
    }

    _deepCopyDomains(domains) {
        const newDomains = new Map();
        domains.forEach((valueSet, key) => {
            newDomains.set(key, new Set(valueSet));
        });
        return newDomains;
    }

    _revise(xiKey, xjKey, domains) {
        let revised = false;
        const domainXi = domains.get(xiKey);
        const domainXj = domains.get(xjKey);

        // If any value in domainXi has no consistent value in domainXj, remove it.
        // For Sudoku (Xi != Xj): if domainXj is a singleton {v}, and v is in domainXi, remove v from domainXi.
        if (domainXj.size === 1) {
            const valueInXj = Array.from(domainXj)[0];
            if (domainXi.has(valueInXj)) {
                domainXi.delete(valueInXj);
                revised = true;
            }
        }
        return revised;
    }

    ac3(queue = null, domains = this.domains) {
        if (!queue) {
            queue = []; // Use array as a queue (shift/push)
            for (const xiKey of this.variables) {
                this.peers.get(xiKey).forEach(xjKey => {
                    queue.push([xiKey, xjKey]);
                });
            }
        }

        while (queue.length > 0) {
            const [xiKey, xjKey] = queue.shift();
            if (this._revise(xiKey, xjKey, domains)) {
                if (domains.get(xiKey).size === 0) return false; // Inconsistency

                this.peers.get(xiKey).forEach(xkKey => {
                    if (xkKey !== xjKey) {
                        queue.push([xkKey, xiKey]); // Add (Xk, Xi)
                    }
                });
            }
        }
        return true;
    }

    _isSolved(domains) {
        for (const key of this.variables) {
            if (domains.get(key).size !== 1) return false;
        }
        return true;
    }

    _selectUnassignedVariableMRV(domains) {
        let minDomainSize = BOARD_SIZE + 1;
        let bestVarKey = null;
        for (const key of this.variables) {
            const domainSize = domains.get(key).size;
            if (domainSize > 1 && domainSize < minDomainSize) {
                minDomainSize = domainSize;
                bestVarKey = key;
            }
        }
        return bestVarKey;
    }

    // --- Main method for uniqueness check ---
    countSolutions(limit = 2) {
        let solutionsFound = 0;

        // Operate on a copy for the solving process
        const workingDomains = this._deepCopyDomains(this.domains);

        // Initial AC-3 pass. If it fails, 0 solutions.
        // Check if any domain is empty (means initial setup was bad)
        let initiallyConsistent = true;
        workingDomains.forEach(domain => {
            if (domain.size === 0) initiallyConsistent = false;
        });
        if(!initiallyConsistent) return 0;


        if (!this.ac3(null, workingDomains)) {
            return 0; // Inconsistent after initial AC-3
        }

        if (this._isSolved(workingDomains)) {
            return 1; // Solved by AC-3 alone
        }

        const backtrack = (currentDomains) => {
            if (solutionsFound >= limit) {
                return;
            }

            if (this._isSolved(currentDomains)) {
                solutionsFound++;
                return;
            }

            const varKey = this._selectUnassignedVariableMRV(currentDomains);
            if (!varKey) { // Should be caught by isSolved, but safety
                if (this._isSolved(currentDomains)) solutionsFound++; // ensure solved is counted
                return;
            }

            const originalDomainValues = Array.from(currentDomains.get(varKey)); // Iterate over a copy

            for (const value of originalDomainValues) {
                if (solutionsFound >= limit) break;

                const newDomains = this._deepCopyDomains(currentDomains);
                newDomains.get(varKey).clear();
                newDomains.get(varKey).add(value); // Assign value

                const ac3Queue = [];
                this.peers.get(varKey).forEach(peerKey => {
                    ac3Queue.push([peerKey, varKey]); // Check (Peer, AssignedVar)
                });

                if (this.ac3(ac3Queue, newDomains)) { // If consistent after propagation
                    backtrack(newDomains);
                }
                // newDomains is local to this iteration, so no explicit un-assignment needed before next loop val
            }
        };

        backtrack(workingDomains);
        return solutionsFound;
    }
    
    // Optional: A method to get one full solution (board array)
    solveBoard() {
        const workingDomains = this._deepCopyDomains(this.domains);
        if (!this.ac3(null, workingDomains)) return null;
        if (this._isSolved(workingDomains)) return this._domainsToBoardArray(workingDomains);

        let solutionDomains = null;

        const backtrackSolve = (currentDomains) => {
            if (solutionDomains) return; // Found one already

            if (this._isSolved(currentDomains)) {
                solutionDomains = currentDomains;
                return;
            }

            const varKey = this._selectUnassignedVariableMRV(currentDomains);
            if (!varKey) return;

            const originalDomainValues = Array.from(currentDomains.get(varKey));
            for (const value of originalDomainValues) {
                if (solutionDomains) break;

                const newDomains = this._deepCopyDomains(currentDomains);
                newDomains.get(varKey).clear(); newDomains.get(varKey).add(value);
                
                const ac3Queue = [];
                this.peers.get(varKey).forEach(peerKey => ac3Queue.push([peerKey, varKey]));

                if (this.ac3(ac3Queue, newDomains)) {
                    backtrackSolve(newDomains);
                }
            }
        };
        
        backtrackSolve(workingDomains);
        return solutionDomains ? this._domainsToBoardArray(solutionDomains) : null;
    }

    _domainsToBoardArray(domains) {
        const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const key = coordsToKey(r, c);
                const domain = domains.get(key);
                if (domain && domain.size === 1) {
                    board[r][c] = Array.from(domain)[0];
                }
            }
        }
        return board;
    }
}

// Export the class
// If using modules:
export { SudokuCspSolver };
// If using in a worker directly, it might be available globally or attached to self.
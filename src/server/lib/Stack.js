export class Stack {
    constructor(limit = Infinity) {
        this.limit = Number.isFinite(limit) ? Math.max(0, limit) : Infinity;
        this.items = [];
    }

    push(value) {
        if (this.limit !== Infinity && this.items.length >= this.limit) {
            this.items.shift();
        }
        this.items.push(value);
    }

    pop() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items.pop();
    }

    peek() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[this.items.length - 1];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items.length = 0;
    }
}

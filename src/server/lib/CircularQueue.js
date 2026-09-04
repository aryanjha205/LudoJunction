export class CircularQueue {
    constructor(items = []) {
        this.items = [...items];
        this.currentIndex = 0;
    }

    isEmpty() {
        return this.items.length === 0;
    }

    peek() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[this.currentIndex];
    }

    next() {
        if (this.isEmpty()) {
            return undefined;
        }
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        return this.peek();
    }

    reset() {
        this.currentIndex = 0;
        return this.peek();
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    size() {
        return this.items.length;
    }
}

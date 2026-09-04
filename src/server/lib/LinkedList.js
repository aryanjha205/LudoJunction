
export class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

export class DoublyNode extends Node {
    constructor(value) {
        super(value);
        this.prev = null;
    }
}

export class SinglyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    append(value) {
        const newNode = new Node(value);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.length++;
        return this;
    }

    find(value) {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.value === value) {
                return currentNode;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    getNodeAtIndex(index) {
        if (index < 0 || index >= this.length) {
            return null;
        }
        let currentNode = this.head;
        let count = 0;
        while (count < index) {
            currentNode = currentNode.next;
            count++;
        }
        return currentNode;
    }
}

export class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    append(value) {
        const newNode = new DoublyNode(value);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            newNode.prev = this.tail;
            this.tail = newNode;
        }
        this.length++;
        return this;
    }

    find(value) {
        let currentNode = this.head;
        while (currentNode) {
            if (currentNode.value === value) {
                return currentNode;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    getNodeAtIndex(index) {
        if (index < 0 || index >= this.length) {
            return null;
        }
        let currentNode = this.head;
        let count = 0;
        while (count < index) {
            currentNode = currentNode.next;
            count++;
        }
        return currentNode;
    }
}

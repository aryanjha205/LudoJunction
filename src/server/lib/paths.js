import { DoublyLinkedList, SinglyLinkedList } from './LinkedList.js';

const MAIN_PATH_INDICES = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

export const mainPath = new DoublyLinkedList();
MAIN_PATH_INDICES.forEach(index => mainPath.append(index));
// Make it circular
mainPath.tail.next = mainPath.head;
mainPath.head.prev = mainPath.tail;


const P1_HOME_PATH_INDICES = [100, 101, 102, 103, 104, 105];
export const p1HomePath = new SinglyLinkedList();
P1_HOME_PATH_INDICES.forEach(index => p1HomePath.append(index));

const P2_HOME_PATH_INDICES = [200, 201, 202, 203, 204, 205];
export const p2HomePath = new SinglyLinkedList();
P2_HOME_PATH_INDICES.forEach(index => p2HomePath.append(index));

export const PATHS = {
    'P1': p1HomePath,
    'P2': p2HomePath
}

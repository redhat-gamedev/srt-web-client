declare module '*.svg' {
    const content: any;
    export default content;
}

interface Window {
    game: Phaser.Game
}

interface Position {
    x: number,
    y: number,
}

interface Body {
    position: Position,
}

interface Player {
    body: Body,
    stuff: any
}

interface Players {
    [key: string]: Player
}


declare module '*.svg' {
    const content: any;
    export default content;
}

interface Window {
    game: Phaser.Game
}

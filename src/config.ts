import 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MenuScene from './scenes/MenuScene';
import MainScene from './scenes/MainScene';

const config = {
    // Network config
    BROKER_ENDPOINT : 'ws://10.88.0.2:5672',
    FORCE_MULTIPLIER: 200,


    // Phaser config object to pass when creating the game
    PHASER_GAME_CONFIG: {
        type           : Phaser.WEBGL,
        backgroundColor: '#ffffff',
        scale          : {
            parent: 'phaser-game',
            mode  : Phaser.Scale.RESIZE,
        },
        physics: {
            default: 'arcade',
            arcade : {
                debug: true,
            },
        },
        scene: [PreloadScene, MenuScene, MainScene],
    },
};

export default config;

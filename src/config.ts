import 'phaser';
import PreloadScene from './scenes/preloadScene';
import MenuScene from './scenes/menuScene';
import MainScene from './scenes/mainScene';

const config = {
    type           : Phaser.WEBGL,
    backgroundColor: '#ffffff',
    scale          : {
        parent: 'phaser-game',
        mode  : Phaser.Scale.RESIZE,
    },
    physics: {
        default: 'arcade',
        arcade : {
            gravity: { y: 200 },
        },
    },
    scene: [PreloadScene, MenuScene, MainScene],
};

export default config;

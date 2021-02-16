/**
 * PreloadScene loads all the static assets and initializes the game
 */
export default class PreloadScene extends Phaser.Scene {

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'PreloadScene' });
    }

    /**
     * preload the game assets i.e. images, audio, animations
     */
    preload():void {
        console.log('[PreloadScene] loading assets...');

        this.load.setBaseURL('assets');

        // Load images
        this.load.image('starfield', 'images/starfield.jpg');

        // Load audio
        this.load.audio('gameplay_track_1', [
            'audio/music_srt_gameplay_singularity.mp3',
            'audio/music_srt_gameplay_singularity.ogg',
        ]);
    }

    /**
     * Pre-create any static objects that will be used in the game e.g. animations
     */
    create():void {
        this.scene.start('MenuScene');
    }
}

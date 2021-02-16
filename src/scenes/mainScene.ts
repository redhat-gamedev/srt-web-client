/**
 * MainScene is the main scene of the game where game play happens
 */
export default class MainScene extends Phaser.Scene {
    private tickNum:number; // TODO: remove this, just and example to see the game loop running

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MainScene' });
        this.tickNum = 0;
    }

    /**
     * Create the games main play scene
     */
    create():void {
        console.log('[MainScene] create');

        // Add the background star field image
        this.add.tileSprite(
            0,
            0,
            this.game.scale.width,
            this.game.scale.height,
            'starfield')
            .setOrigin(0);

        // Start the game play music
        const music = this.sound.add('gameplay_track_1');
        music.play();
    }

    /**
     * Main game loop
     */
    update():void {
        this.tickNum++;

        if (this.tickNum % 100 === 0) {
            // TODO: remove this, just an example to see the main game loop updating
            console.log('ticks:', this.tickNum);
        }
    }
}

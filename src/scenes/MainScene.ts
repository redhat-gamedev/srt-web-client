import config from '../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * MainScene is the main scene of the game where game play happens
 */
export default class MainScene extends Phaser.Scene {
    private players:any; // TODO: Define the players Type
    private myuuid:string;
    private player_uuid:string;
    private force_multiplier:number;

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MainScene' });

        // Initialize properties
        this.players = {};
        this.myuuid = uuidv4();
        this.player_uuid = '';
        this.force_multiplier = config.FORCE_MULTIPLIER;
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
    // update():void {
    //
    // }
}

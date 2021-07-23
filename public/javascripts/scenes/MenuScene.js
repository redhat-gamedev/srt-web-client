// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
*/
// Hat tip for button stuff: https://blog.ourcade.co/posts/2020/phaser-3-ui-menu-selection-cursor-selector/

/**
 * MenuScene is the scene of the main menu of the game
 */
export default class MenuScene extends Phaser.Scene {

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MenuScene' });
    }

    /**
     * init
     *
     * init does
     */
    init() {
        console.log('MenuScene::init');

        this.cursors = this.input.keyboard.createCursorKeys();
        this.buttons = [];
        this.buttonSelector = Phaser.GameObjects.Image;
        this.selectedButtonIndex = 0;
    }

    /**
     * selectButton
     *
     * @param {index} index does
     */
    selectButton(index) {
        console.log('MenuScene::selectButton');

        const currentButton = this.buttons[this.selectedButtonIndex];

        // set the current selected button to a white tint
        currentButton.setTint(0xffffff);

        const button = this.buttons[index];

        // set the newly selected button to a green tint
        button.setTint(0x66ff7f);

        // move the hand cursor to the right edge
        this.buttonSelector.x = button.x + button.displayWidth * 0.5;
        this.buttonSelector.y = button.y + 10;

        // store the new selected index
        this.selectedButtonIndex = index;
    }

    /**
     * selectNextButton
     *
     * @param {number} change does
     */
    selectNextButton(change = 1) {
        console.log('MenuScene::selectNextButton');
        let index = this.selectedButtonIndex + change;

        // wrap the index to the front or end of array
        if (index >= this.buttons.length) {
            index = 0;
        }
        else if (index < 0) {
            index = this.buttons.length - 1;
        }

        this.selectButton(index);
    }

    /**
     * confirmSelection
     *
     * confirmSelection does
     */
    confirmSelection() {
        console.log('MenuScene::confirmSelection');
        // get the currently selected button
        const button = this.buttons[this.selectedButtonIndex];

        // emit the 'selected' event
        button.emit('selected');

        if (0 == this.selectedButtonIndex) {
            this.client.init();
            this.scene.start('MainScene', { client: this.client, model: this.model });
        }

        if (3 == this.selectedButtonIndex) {
            window.location.href = '/quit';
        }
    }

    /**
     * Create the games Main Menu
     *
     * @param {object} data generic data to pass between scenes
     */
    create(data) {
        console.log('[MenuScene] create');

        this.client = data.client;
        this.model = data.model;
        const { width, height } = this.scale;
        this.cameras.main.backgroundColor.setTo(0, 0, 0);

        this.add.text(10, 10, 'Up/Down and SPACE to select!', { fontSize: '20px' });

        // Play button
        const playButton = this.add.image(width * 0.5, height * 0.6, 'glass-panel')
            .setDisplaySize(150, 50);
        this.add.text(playButton.x, playButton.y, 'Join')
            .setOrigin(0.5);
        this.buttons.push(playButton);
        playButton.on('selected', () => {
            console.log('join');
        });

        // Settings button
        const settingsButton = this.add.image(playButton.x, playButton.y + playButton.displayHeight + 10, 'glass-panel')
            .setDisplaySize(150, 50);
        this.add.text(settingsButton.x, settingsButton.y, 'Settings', { color: '#7f7f7f' })
            .setOrigin(0.5);
        this.buttons.push(settingsButton);
        settingsButton.on('selected', () => {
            console.log('settings');
        });

        // Credits button
        const creditsButton = this.add.image(settingsButton.x, settingsButton.y + settingsButton.displayHeight + 10, 'glass-panel')
            .setDisplaySize(150, 50);
        this.add.text(creditsButton.x, creditsButton.y, 'Credits', { color: '#7f7f7f' })
            .setOrigin(0.5);
        this.buttons.push(creditsButton);
        creditsButton.on('selected', () => {
            console.log('credits');
        });

        // Quit button
        const quitButton = this.add.image(creditsButton.x, creditsButton.y + creditsButton.displayHeight + 10, 'glass-panel')
            .setDisplaySize(150, 50);
        this.add.text(quitButton.x, quitButton.y, 'Quit', { color: '#7f7f7f' })
            .setOrigin(0.5);
        this.buttons.push(quitButton);
        quitButton.on('selected', () => {
            console.log('quit');
        });

        this.buttonSelector = this.add.image(0, 0, 'cursor-hand');
        this.selectButton(0);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            playButton.off('selected');
            settingsButton.off('selected');
            creditsButton.off('selected');
            quitButton.off('selected');
        });
    }

    /**
     * Main scene loop
     *
     * @param {number} time current time
     * @param {number} delta time since last loop in ms
     */
    update(time, delta) {
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down);
        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);

        if (upJustPressed) {
            this.selectNextButton(-1);
        }
        else if (downJustPressed) {
            this.selectNextButton(1);
        }
        else if (spaceJustPressed) {
            this.confirmSelection();
        }
    }
}

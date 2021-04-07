/*
global protobuf
*/

/**
 * A AMQP Game Client that wraps a generic client like Rhea or Stomp
 */
export default class AMQPGameClient {

    /**
     * Construct the client initialize instance variables
     *
     * @param {string} brokerEndpoint websocket endpoint to connect to the broker
     * @param {object} model holds the state of the game
     * @param {string} uuid the uuid of this client's player
     */
    constructor(brokerEndpoint, model, uuid) {
        this.brokerEndpoint = brokerEndpoint;
        this.model = model;
        this.uuid = uuid;
    }

    /**
     * Load the protobufs
     */
    async loadProtobufs() {
        try {
            const loadCommandBuffer = await protobuf.load('/network/proto/CommandBuffer.proto');
            this.CommandBuffer = loadCommandBuffer.lookupType('redhatgamedev.srt.CommandBuffer');

            const loadSecurityCommandBuffer = await protobuf.load('/network/proto/SecurityCommandBuffer.proto');
            this.SecurityCommandBuffer = loadSecurityCommandBuffer.lookupType('redhatgamedev.srt.SecurityCommandBuffer');

            const loadGameEventBuffer = await protobuf.load('/network/proto/GameEventBuffer.proto');
            this.GameEventBuffer = loadGameEventBuffer.lookupType('redhatgamedev.srt.GameEventBuffer');

            const loadEntityGameEventBuffer = await protobuf.load('/network/proto/EntityGameEventBuffer.proto');
            this.EntityGameEventBuffer = loadEntityGameEventBuffer.lookupType('redhatgamedev.srt.EntityGameEventBuffer');

            const loadRawInputCommandBuffer = await protobuf.load('/network/proto/RawInputCommandBuffer.proto');
            this.RawInputCommandBuffer = loadRawInputCommandBuffer.lookupType('redhatgamedev.srt.RawInputCommandBuffer');
        }
        catch (e) {
            console.error('Error while loading protobufs');
            throw e;
        }
    }

    /**
     * Set all the event handlers for the AMQP client events
     */
    async init() {
        // First load the protobuffs
        await this.loadProtobufs();

        // AMQP messaging initialization. Connect and register event listeners
        this.rhea = require('rhea');
        this.ws = this.rhea.websocket_connect(WebSocket);
        this.connection = this.rhea.connect({
            'connection_details': this.ws(this.brokerEndpoint),
            'reconnect'         : false,
        });
        this.mainGameEventReceiver = this.connection.open_receiver('GAME.EVENT.OUT');
        this.personalGameEventReceiver = this.connection.open_receiver('COMMAND.OUT.' + this.uuid);
        this.sender = this.connection.open_sender('COMMAND.IN');

        this.rhea.on('connection_open', () => {
            console.log('AMQP connection open to', this.brokerEndpoint);
        });

        this.rhea.on('receiver_open', (context) => {
            console.log('receiver_open: ' + context.receiver.source.address);
        });

        this.rhea.on('sender_open', () => {
            console.log('sender_open');
        });

        // i.e. we have credit to do a send
        this.rhea.on('sendable', () => {
            console.log('sendable');
        });

        this.rhea.on('disconnected', () => {
            console.log('disconnected');
        });

        try {
            // there can be only one -- join, that is
            const sbcJoin = { type: 1, securityCommandBuffer: { type: 1, UUID: this.uuid } };
            const scbJoinMessage = this.CommandBuffer.create(sbcJoin);
            const scbJoinBuffer = this.CommandBuffer.encode(scbJoinMessage).finish();

            // AMQP stuff
            const amqpMessage = this.rhea.message;
            const body = amqpMessage.data_section(scbJoinBuffer);
            this.sender.send({ body });

            const playerInitialize = (UUID) => {
                this.model.players[UUID] = { uuid: UUID, body: null, stuff: {} };
            };

            const playerDestroy = (UUID) => {
                delete this.model.players[UUID];
            };

            const processSecurityGameEvent = function(buffer) {
                switch (buffer.type) {
                    case 1:
                        console.log('a player joined: ' + buffer.joinSecurityGameEventBuffer.UUID);
                        // a security game event with a type of 1 is a player join
                        // create an entity in the player array with the incoming uuid
                        playerInitialize(buffer.joinSecurityGameEventBuffer.UUID);
                        break;
                    case 2:
                        console.log('a player left: ' + buffer.leaveSecurityGameEventBuffer.UUID);
                        // player-destroy
                        playerDestroy(buffer.leaveSecurityGameEventBuffer.UUID);
                        break;
                }
            };

            const processEntityGameEvent = (buffer) => {
                console.log('known players: ' + Object.keys(this.model.players));
                if (this.model.players[buffer.UUID] == null) {
                    // EJ: this probably shouldn't happen. I think this only happens when the client
                    // first starts up because the client doesn't receive its own join as a message
                    // we probably should instead initialize the player array with our own UUID when
                    // the client first starts
                    console.log('found a player we don\'t know about');
                    playerInitialize(buffer.UUID);
                }
                // just store the pbbody details for the player
                this.model.players[buffer.UUID].body = buffer.body;
            };

            // the function when game event messages are received
            const gameEventMessageCallback = (message) => {
                console.log('gameEventMessageCallback');

                if (message.body) {

                    const decodedEventMessage = this.GameEventBuffer.decode(message.body);

                    // check on what type of game event we received
                    switch (decodedEventMessage.type) {
                        case 2:
                            // security message
                            processSecurityGameEvent(decodedEventMessage.securityGameEventBuffer);
                            break;
                        case 1:
                            // entity game event buffer is about a specific player
                            processEntityGameEvent(decodedEventMessage.entityGameEventBuffer);
                            break;
                        default:
                            console.log('gemc got a default');
                    }
                }
                else {
                    console.log('for some reason we got a message with no binary body');
                }
            };

            // AMQP stuff
            // i.e. received a message
            this.mainGameEventReceiver.on('message', (context) => {
                // console.log('received ' + context.message.body);
                gameEventMessageCallback(context.message);
            });

            const commandMessageCallback = (message) => {
                console.log('got a command message');
                if (message.binaryBody) {
                    // the command message is just our unique player UUID
                    this.model.playerUuid = new TextDecoder('utf-8').decode(message.binaryBody);
                    console.log('unique player uuid: ' + this.model.playerUuid);
                }
            };

            this.personalGameEventReceiver.on('message', function(context) {
                commandMessageCallback(context.message);
            });

        }
        catch (e) {
            console.error('Error during client initialization');
            throw e;
            /* handle error */
        }
    }

    /**
     * Send a move command to the server
     *
     * @param {number} x position
     * @param {number} y position
     */
    sendMove(x, y) {
        const keyboardInput = {
            type                 : 2,
            rawInputCommandBuffer: {
                type                          : 1,
                UUID                          : this.uuid,
                dualStickRawInputCommandBuffer: {
                    pbv2Move: {
                        x: x, y: y,
                    },
                    pbv2Shoot: {
                        x: 0, y: 0,
                    },
                },
            },
        };

        console.log('sending input:', keyboardInput);

        const keyboardMessage = this.CommandBuffer.create(keyboardInput);
        const keyboardBuffer = this.CommandBuffer.encode(keyboardMessage).finish();
        const amqpMessage = this.rhea.message;
        const body = amqpMessage.data_section(keyboardBuffer);
        this.sender.send({ body });
    }

    /**
     * Send a leave command to the server
     *
     */
    sendLeave() {
        console.log('user clicked leave button');
        const sbcLeave = { type: 1, securityCommandBuffer: { type: 2, UUID: this.uuid } };
        const scbLeaveMessage = this.CommandBuffer.create(sbcLeave);
        const scbLeaveBuffer = this.CommandBuffer.encode(scbLeaveMessage).finish();

        // AMQP stuff
        const amqpMessage = this.rhea.message;
        const body = amqpMessage.data_section(scbLeaveBuffer);
        this.sender.send({ body });
    }
}

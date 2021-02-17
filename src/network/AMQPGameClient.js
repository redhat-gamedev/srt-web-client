/*
global uuidv4, protobuf
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
     */
    constructor(brokerEndpoint, model) {
        this.brokerEndpoint = brokerEndpoint;
        this.model = model;
        this.uuid = uuidv4();
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

        // const brokerEndpoint = this.brokerEndpoint;
        // const players = this.model.players;
        // const player_uuid = this.player_uuid;
        // const GameEventBuffer = this.GameEventBuffer;

        this.rhea.on('connection_open', () => {
            console.log('AMQP connection open to', this.brokerEndpoint);
        });

        this.rhea.on('receiver_open', (context) => {
            console.log('receiver_open: ' + context.receiver.source.address);
        });

        this.rhea.on('sender_open', () => {
            console.log('sender_open');
        });

        // // i.e. received a message
        // client.on('message', function (context) {
        //     console.log('received ' + context.message.body);
        // });

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

            // STOMP stuff
            // client.publish({
            //     destination: 'COMMAND.IN',
            //     binaryBody: scbJoinBuffer,
            //     headers: {
            //         'content-type': 'application/octet-stream',
            //         'reply-to': 'COMMAND.OUT.' + myuuid
            //     },
            // });

            // AMQP stuff
            const amqpMessage = this.rhea.message;
            const body = amqpMessage.data_section(scbJoinBuffer);
            this.sender.send({ body });

            const playerInitialize = (UUID) => {
                this.model.players[UUID] = { body: null, stuff: {} };
            };

            const processSecurityGameEvent = function(buffer) {
                switch (buffer.type) {
                    case 1:
                        console.log('a player joined: ' + buffer.joinSecurityGameEventBuffer.UUID);
                        // a security game event with a type of 1 is a player join
                        // create an entity in the player array with the incoming uuid
                        playerInitialize(buffer.joinSecurityGameEventBuffer.UUID);
                        break;
                }
            };

            const processEntityGameEvent = (buffer) => {
                if (this.model.players[buffer.UUID] == null) {
                    console.log('found a player we don\'t know about');
                    playerInitialize(buffer.UUID);
                }
                // just store the pbbody details for the player
                this.model.players[buffer.UUID].body = buffer.body;
            };

            // the function when game event messages are received
            const gameEventMessageCallback = (message) => {
                console.log('gameEventMessageCallback');
                // called when the client receives a STOMP message from the server
                // if (message.binaryBody) {
                if (message.body) {
                    // console.log("gemc has message.body");
                    // we always receive a gameevent
                    // const decodedEventMessage = GameEventBuffer.decode(message.binaryBody);
                    // console.log("gemc message is " + message);
                    // console.log("gemc message.body is " + message.body);
                    // console.log("gemc message.body.contentType is " + message.body.contentType);
                    // console.log("gemc message.body.content is " + message.body.content);
                    // // console.log("gemc message.body Uint8Array is " + Uint8Array(message.body));
                    // var u8a = new Uint8Array(message.body);
                    // console.log("gemc message.body Uint8Array is " + u8a);
                    // console.log("gemc message body typecode " + message.body.typecode);
                    // // console.log("qemc message.body.content.length is " + message.body.content.length);
                    // console.log("qemc message.body.content is " + message.body.content);
                    // console.log("qemc message.content is " + message.content);
                    // console.log("gemc message.body.data is " + message.body.data);
                    // console.log("gemc message.body.data_section is " + message.body.data_section);
                    // console.log("gemc message.binary is " + message.binary);
                    // console.log("qemc message.typecode is " + message.typecode);


                    // var decoded = client.decode(message);
                    // console.log("gemc message decoded is " + decoded);
                    // var binaryBody = message.body.data;
                    // const decodedEventMessage = GameEventBuffer.decode(message.body);
                    const decodedEventMessage = this.GameEventBuffer.decode(message.body);
                    // console.log("gemc after decoding message.body - dem is " + decodedEventMessage);
                    // console.log(decodedEventMessage);)

                    // check on what type of game event we received
                    switch (decodedEventMessage.type) {
                        case 2:
                            // console.log('got a security event');
                            // console.log(decodedEventMessage);
                            // security message
                            processSecurityGameEvent(decodedEventMessage.securityGameEventBuffer);
                            break;
                        case 1:
                            // console.log("gemc got an entity game event");
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
                    this.playerUuid = new TextDecoder('utf-8').decode(message.binaryBody);
                    console.log('unique player uuid: ' + this.playerUuid);
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
}

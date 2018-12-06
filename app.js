var express = require("express");
var http = require("http");
var websocket = require("ws");

var Game = require("./game");
var messages = require("./public/javascripts/messages");

// route path
var indexRouter = require("./routes/index.js");

var port = process.argv[2];
var app = express();

app.use(express.static(__dirname + "/public"));

// routes
app.use('/', indexRouter);
app.use('/play', indexRouter);


// TBD: Move this stat in GameStatus JS file
var gamesInitialized = 0;
// -------------------------------

// --- WebSockets ---
var websockets = []; // array keeping track of websockets
var connectionID = 0; // keep track of next unique WebSocket Connection ID
var currentGame = new Game(gamesInitialized); // keep track of current game

// Server Creation
var server = http.createServer(app).listen(port); // create server on port
const wss = new websocket.Server( {server} ); // create WebSocket server

// Listen for incoming WebSocket connections
wss.on("connection", function connection(ws) {
    let connection = ws; // reference connection to ws
    connection.id = connectionID++; // assign unique ID, increment it for use for next connections   
    if(connection.id%2==0&&connection.id>1){
        gamesInitialized+=1;
        currentGame = new Game(gamesInitialized);
        }
    let playerType = currentGame.addPlayer(connection); // true for White, false for Black
    websockets[connection.id] = currentGame; // assign game to connection ID in WebSockets array

    // debug
    console.log("Player %s placed in game %s as %s", connection.id, currentGame.id, (playerType ? "White" : "Black"));


    // inform the client about the pieces that will be controlled by the client (constructing the message accordingly beforehand)
    let playerTypeJSON = messages.O_PLAYER_TYPE;
    playerTypeJSON.data = playerType;
    connection.send(JSON.stringify(playerTypeJSON));

    // Get incoming messages from WebSockets
    connection.on("message", function incoming(message)
    {
        // Parse message
        var incomingMSG = JSON.parse(message);

        // Receive Click Event from WebSocket
        if (incomingMSG.type === messages.O_TILE_CLICK_BY.type)
        {
            // Generate click response according to game state
            var clickResponse = currentGame.gameState.getClick(incomingMSG.tile, incomingMSG.player, incomingMSG.selected);

            // Click response is valid
            if (clickResponse != null)
            {
                if (clickResponse.type === messages.O_MOVE_PIECE.type) // Moved piece successfully
                {
                    // clear O_SELECT_PIECE variables & send the message to the client that executed the move (effectively deselecting the piece)
                    messages.O_SELECT_PIECE.tile = "";
                    messages.O_SELECT_PIECE.validMoves = [];
                    connection.send(JSON.stringify(messages.O_SELECT_PIECE));
                    
                    // Update board for both players
                    currentGame.p1.send(JSON.stringify(clickResponse));
                    currentGame.p2.send(JSON.stringify(clickResponse));
                }
                else // Select piece
                {
                    // Send response to client containing info required for piece selection
                    connection.send(JSON.stringify(clickResponse));
                }
            }
        }
    });
});
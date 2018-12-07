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
var res = 0;
// Listen for incoming WebSocket connections
wss.on("connection", function connection(ws) {
    let connection = ws; // reference connection to ws
    connection.id = connectionID++; // assign unique ID, increment it for use for next connections   

    if(connection.id%2==res&&connection.id>1)
    {
        gamesInitialized+=1;
        currentGame = new Game(gamesInitialized);
    }

    let playerType = currentGame.addPlayer(connection); // true for White, false for Black
    websockets[connection.id] = currentGame; // assign game to connection ID in WebSockets array

    // debug
    console.log("Player %s placed in game %s as %s", connection.id, currentGame.id, (playerType ? "White" : "Black"));

    // inform the client about the pieces that will be controlled by the client (constructing the message accordingly beforehand)
    let playerTypeJSON = messages.cloneMessage(messages.O_PLAYER_TYPE);
    playerTypeJSON.data = playerType;
    connection.send(JSON.stringify(playerTypeJSON));

    connection.on("close", function (code) {
        let gameObj = websockets[connection.id];
        console.log(connection.id + " disconnected");
        if(!gameObj.hasTwoPlayers){
            gameObj.p1=null;
            gamesInitialized--;
            if(res==0) res = 1;
            else res = 0;
        }
        else{    
        if (code == "1001"&&gameObj.p1&&gameObj.p2) {
                if(connection.id%2!=res){
                    gameObj.p1.send(JSON.stringify(messages.O_GAME_ABORTED));
                    gameObj.p2=null;
                }                
                else{
                    gameObj.p2.send(JSON.stringify(messages.O_GAME_ABORTED));
                    gameObj.p1=null;
                }                              
            }
        }
    });

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
                    // send standard blank O_SELECT_PIECE the message to the client that executed the move (effectively deselecting the piece)
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

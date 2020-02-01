// SOCKET.IO VARIABLES
var io = require('socket.io');
var async = require('async');
var server = io.listen(3000);
var gameserver = server.of('/game');
var chatserver = server.of('/chat');

var connectedUsers = [];
let run = {};
let loopStartTime;
let loopEndTime;
let waitTime;
let rooms = [];
let roomsPlayers = {};
//console.log("Now listening on port 3000");

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

 function runGameLoop(room){
    async.whilst(
        function (callbackFunction) {
            // start loop
            loopStartTime = Date.now();
            // console.log(run[room]);
            callbackFunction(null, run[room] >= 0);
        },
        function (callback) {
            //console.log(Date.now());
            //logic
            for(i=0;i<roomsPlayers[room].length;i++){
                var tempUser = connectedUsers[roomsPlayers[room][i]];
                
                //Update current ghost
                if(!tempUser.ghosts[tempUser.ghostCount]){
                    tempUser.ghosts[tempUser.ghostCount] = [];
                }
                tempUser.ghosts[tempUser.ghostCount].push(tempUser.coords);
                var tempUserTickOffset = run[room] - tempUser.tickTime;
                //Broadcast previous ghosts
                if(tempUser.ghostCount>0){
                    var ghostBundle = [];
                    for(j=0;j<tempUser.ghostCount;j++){
                        if(tempUser.ghosts[j][tempUserTickOffset]){
                            ghostBundle.push([j,tempUser.ghosts[j][tempUserTickOffset]])
                        }
                    }
                    var ghostData = {};
                    ghostData.player = roomsPlayers[room][i];
                    ghostData.amount = tempUser.ghostCount;
                    ghostData.ghostBundle = ghostBundle;
                    gameserver.to(room).emit('ghosts', ghostData);
                }
                //console.log(connectedUsers[Object.keys(connectedUsers)[i]]);
            }
            // end loop
            run[room]++;
            loopEndTime = Date.now();
            waitTime = 25 - (loopEndTime - loopStartTime);
            setTimeout(callback, waitTime);
        }
    )
 }


// USER CONNECT
gameserver.on('connection', function(socket) {
    var clientData = {};
    clientData.id = socket.id;
    socket.emit('connected', clientData);
    // JOIN ROOM 
    socket.on('join room', function(joinData) {
        console.log(joinData);
        if(joinData.room == false){
            var room = 0;
            var roomIdLength = 4;
            while(room === 0 || rooms.includes(room)){
                room = makeid(roomIdLength);
                roomIdLength++;
            }
            console.log("new room");
            
        } else {
            var room = joinData.room;
            console.log("joined room");
        }
        if(!rooms.includes(room)){
            rooms.push(room);
            roomsPlayers[room] = [];
        }
        if(!roomsPlayers[room].includes(socket.id)){
            roomsPlayers[room].push(socket.id);
        }
        socket.join(room);
        console.log(room);
        connectedUsers[socket.id] = {};
        connectedUsers[socket.id].ghosts = [];
        connectedUsers[socket.id].ghostCount = 0;
        connectedUsers[socket.id].lastReset = 0;
        connectedUsers[socket.id].room = room;
        //console.log(socket.id + " joined the room!")

        // Start game loop
        if(joinData.room == false){
            run[room] = 0;
            runGameLoop(room);
        }
    });
    socket.on('player move', function(move) {
        if(connectedUsers[socket.id]){
            connectedUsers[socket.id].coords = move;
        }
    });
    socket.on('reset', function(){
        if(Date.now()-connectedUsers[socket.id].lastReset>500){
            connectedUsers[socket.id].lastReset = Date.now();
            connectedUsers[socket.id].ghostCount++;
            connectedUsers[socket.id].tickTime = run[connectedUsers[socket.id].room];
            var resetData = {};
            resetData.id = socket.id;
            gameserver.to(connectedUsers[socket.id].room).emit('reset', resetData);
        }
    })
    // DISCONNECT
    socket.on('disconnect', function() {
        if(connectedUsers[socket.id]){
            console.log("disconnect");
            for( var i = 0; i < roomsPlayers[connectedUsers[socket.id].room].length; i++){ 
                if ( roomsPlayers[connectedUsers[socket.id].room][i] === socket.id) {
                    roomsPlayers[connectedUsers[socket.id].room].splice(i, 1); 
                }
             }
            delete connectedUsers[socket.id]
        }

    });
});
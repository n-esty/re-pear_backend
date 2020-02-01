// SOCKET.IO VARIABLES
var io = require('socket.io');
var async = require('async');
var server = io.listen(3000);
var gameserver = server.of('/game');
var chatserver = server.of('/chat');

var connectedUsers = [];
let run = 0;
let loopStartTime;
let loopEndTime;
let waitTime;
//console.log("Now listening on port 3000");

// USER CONNECT
gameserver.on('connection', function(socket) {
    // Game server 20 tick
    //console.log(Date.now());
    async.whilst(
        function (callbackFunction) {
            // start loop
            loopStartTime = Date.now();
            callbackFunction(null, run >= 0);
        },
        function (callback) {
            //console.log(Date.now());
            //logic
            for(i=0;i<Object.keys(connectedUsers).length;i++){
                var tempUser = connectedUsers[Object.keys(connectedUsers)[i]];
                
                //Update current ghost
                if(!tempUser.ghosts[tempUser.ghostCount]){
                    tempUser.ghosts[tempUser.ghostCount] = [];
                }
                tempUser.ghosts[tempUser.ghostCount].push(tempUser.coords);
                var tempUserTickOffset = run - tempUser.tickTime;
                //Broadcast previous ghosts
                if(tempUser.ghostCount>0){
                    var ghostBundle = [];
                    for(j=0;j<tempUser.ghostCount;j++){
                        if(tempUser.ghosts[j][tempUserTickOffset]){
                            ghostBundle.push([j,tempUser.ghosts[j][tempUserTickOffset]])
                        }
                    }
                    socket.emit('ghosts', ghostBundle)
                }
                //console.log(connectedUsers[Object.keys(connectedUsers)[i]]);
            }
            // end loop
            run++;
            loopEndTime = Date.now();
            waitTime = 50 - (loopEndTime - loopStartTime);
            setTimeout(callback, waitTime);
        }
    )
    //console.log(Date.now());
    
    // JOIN ROOM 
    socket.on('join room', function() {
        connectedUsers[socket.id] = {};
        connectedUsers[socket.id].ghosts = [];
        connectedUsers[socket.id].ghostCount = 0;
        connectedUsers[socket.id].lastReset = 0;
        //console.log(socket.id + " joined the room!")
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
            connectedUsers[socket.id].tickTime = run;
            socket.emit('ghosts', "test");
            socket.emit('ghosts', JSON.stringify(connectedUsers[socket.id].ghosts));
            //console.log(connectedUsers[socket.id]);
        }
    })
    // DISCONNECT
    socket.on('disconnect', function() {
        delete connectedUsers[socket.id]
    });
});


/**
 * 
 * END OF QUEUE SYSTEM
 * 
 * START OF CHAT SERVER
 * 
 */

chatserver.on('connection', function(socket) {
    socket.on('join room', function(data) {
        socket["user"] = data.user;
        var room = data.room;
        socket["chatroom"] = room;
        socket.join(room);
        if(chatHistory[room] != null){
            socket.emit('chat history', chatHistory[room]);
        } else {
            socket.emit('chat history', []);
        }
    });

    socket.on('msg', function(msg){
        if(chatHistory[socket.chatroom] == null){
            chatHistory[socket.chatroom] = [];
        }
        msg = `<b>${socket.user}:</b> &nbsp;${msg}`
        chatHistory[socket.chatroom].push(msg);
        chatserver.in(socket.chatroom).emit('msg', msg);
    });

    socket.on('disconnect', function() {
    });
});
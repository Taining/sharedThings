var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {'Default': {}};
var locked = {'Default': []};
var locationArray = {};
var connections = {};
var connectionCounter = 0;

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

wss.broadcastWorldsName = function (){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	for (var i in this.clients) {
		this.clients[i].send(JSON.stringify(response));
	};
}

wss.broadcastLocations = function(){
	var locations = [];
	for (var key in locationArray){
		locations.push(locationArray[key]);
	}
	var response = {'action': 'updateLocations', 'locations': locations};
	console.log(JSON.stringify(response));
	for (var i in this.clients) {
		this.clients[i].send(JSON.stringify(response));
	};
}

function sendWorld(ws, worldName){
	if (worldArray[worldName]) {
		var response = {'action': 'updateWholeWorld', 'world': worldArray[worldName], 'locked':locked[worldName]};
		ws.send(JSON.stringify(response));
	}
}

function sendWorldsNameForNewClient(ws){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	ws.send(JSON.stringify(response));
}

function setIndexForNewClient(ws){
	ws.id = connectionCounter++;
	connections[ws.id] = ws;
}

wss.on('connection', function(ws) {
	// sendWorld(ws, 'Default');
	sendWorldsNameForNewClient(ws);
	setIndexForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);
        var worldName = request['worldName'];

		if (request['action'] == "update") {
			var objectID = request['objectID'];
			worldArray[worldName][objectID] = request['position'];
			wss.broadcast(message);
		} else if (request['action'] == "save") {
			worldArray[worldName] = request['world'];
            locked[worldName] = request['locked'];
			wss.broadcastWorldsName();
		} else if (request['action'] == "requestWorld") {
			sendWorld(ws, worldName);
		} else if (request['action'] == 'setLocation'){
			var location = request['location'];
			locationArray[ws.id] = location;
			wss.broadcastLocations();
        } else if(request['action'] == "lock") {
            var worldName = request['worldName'];
            var objectID = 	request['objectID'];
            locked[worldName][objectID] = true;
            wss.broadcast(message);

        } else if(request['action'] == "unlock") {
            var worldName = request['worldName'];
            var objectID = 	request['objectID'];
            locked[worldName][objectID] = false;
            wss.broadcast(message);

        } else if(request['action'] == "getLockArray") {
            if(locked['Default'].length == 0) {
                // first client
                console.log("locked array is empty, accept proposed locked array");
                console.log(JSON.stringify(request['proposedArray']));
                locked['Default'] = request['proposedArray'];
                return;
            }
            var message = {'action': 'sendLockArray', 'array': locked['Default']};
            ws.send(JSON.stringify(message));

        } else if(request['action'] == "resetWorld") {
        	console.log("reset world");
            worldArray[worldName] = request['world'];
            locked[worldName] = request['lockedArray'];
            wss.broadcast(message);

        } else if(request['action'] == "getDefaultWorld") {
            if(worldArray['Default'].length == 0) {
                // first client
                console.log("first client");
                worldArray['Default'] = request['proposedWorld'];
                wss.broadcast(message);
            } else {
                sendWorld(ws, 'Default');
            }
        }
	});

	ws.on('close', function(reasonCode, description) {
		delete connections[ws.id];
		delete locationArray[ws.id];
		wss.broadcastLocations();
	});
});
















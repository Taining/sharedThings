var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {'Default': {}};
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
	for (var i in this.clients) {
		this.clients[i].send(JSON.stringify(response));
	};
}

function sendWorld(ws, worldName){
	if (worldArray[worldName]) {
		var response = {'action': 'updateWholeWorld', 'worldName': worldName, 'world': worldArray[worldName]};
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
	sendWorld(ws, 'Default');
	sendWorldsNameForNewClient(ws);
	setIndexForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);

		if (request['action'] == "update") {
			var worldName = request['worldName'];
			var objectID = request['objectID'];
			worldArray[worldName][objectID] = request['position'];
			wss.broadcast(message);
		} else if (request['action'] == "save") {
			var worldName = request['worldName'];
			worldArray[worldName] = request['world'];
			wss.broadcastWorldsName();
		} else if (request['action'] == "requestWorld") {
			var worldName = request['worldName'];
			sendWorld(ws, worldName);
		} else if (request['action'] == 'setLocation'){
			var location = request['location'];
			locationArray[ws.id] = location;
			wss.broadcastLocations();
		}
	});

	ws.on('close', function(reasonCode, description) {
		delete connections[ws.id];
		delete locationArray[ws.id];
		wss.broadcastLocations();
	});
});
















var map;
var socket;
var myLatlng;
var worldName = "Default";
var markers = [];
var world = {};
var originalWorld = {}; 	// for restarting game
var locked = {};	// array of boolean
var holdLock = [];	// array of boolean

function initializeMap() {
	var mapOptions = {
		center: new google.maps.LatLng(1.2951070999999998, 103.77401559999998),
		zoom: 16
	};
	map = new google.maps.Map(document.getElementById("map-canvas"),mapOptions);
}

var options = {
	enableHighAccuracy: true,
	timeout: 5000,
	maximumAge: 0
};

function setMarker(location){
	var marker = new google.maps.Marker({
		position: location,
	});
	marker.setMap(map);
	markers.push(marker);
}

function success(pos) {
	var crd = pos.coords;
	myLatlng = new google.maps.LatLng(crd.latitude,crd.longitude);
	var request = {'action': 'setLocation', 'location': myLatlng};
	socket.send(JSON.stringify(request));
};

function error(err) {
	console.warn('ERROR(' + err.code + '): ' + err.message);
};

function handleDrag(event, ui){
	var objectID = event.target.id;
	if(locked[objectID] && !holdLock[objectID]) {
		return;
	}
	var position = ui.position;
	var request = {'action': 'update', 'worldName': worldName, 'objectID': objectID, 'position': ui.position};
	socket.send(JSON.stringify(request)); 
}

function handleDragStart(event, ui){
	var objectID = event.target.id;
	if(locked[objectID]) {
		$("#message").html("Someone else is dragging this");

		setTimeout(function () {
			$("#message").html("");
		}, 2000);

		return;
	}
	holdLock[objectID] = true;
	var request = {'action': 'lock', 'worldName': worldName, 'objectID': objectID};
	socket.send(JSON.stringify(request));

	handleDrag(event, ui);
}

function handleDragEnd(event, ui){
	var objectID = event.target.id;
	if(locked[objectID] && !holdLock[objectID]) {
		$("#message").html("Someone else is dragging this");
		return;
	}
	var request = {'action': 'unlock', 'worldName': worldName, 'objectID': objectID};	
	socket.send(JSON.stringify(request)); 		

	handleDrag(event, ui);
	holdLock[objectID] = false;
}

function updateWholeWorld(){
	for(var elementId in world){
		var position = world[elementId];
		$("#"+elementId).css({
			'top': position["top"],
			'left': position["left"]
		});
	}
}

function updateWorld(message) {
	var elementId = message['objectID'];
	var position = message['position'];
	world[elementId] = message['position'];

	$("#"+elementId).css({
		'top': position["top"],
		'left': position["left"]
	});

	checkOutOfWindowDragging(elementId, position);
}

function checkOutOfWindowDragging(elementId, position) {
	var top = position["top"];
	var left = position["left"];
	var width = $(window).width();
	var height = $(window).height();

	if(left > width || top > height) {
		$("#message").html("Someone is dragging outside of the window");

		setTimeout(function () {
			$("#message").html("");
		}, 1000);				
	}
}

function chooseWorld(e){
	$('.collapse').collapse('hide');	// collapse nav bar for small screen
	
	worldName = e.html();
	$("#world-id").html("Welcome to world '" + worldName + "'!");

	var request = {'action': 'requestWorld', 'worldName': worldName};
	socket.send(JSON.stringify(request));
}

function setupSocket(){
	socket = new WebSocket("ws://cp3101b-1.comp.nus.edu.sg:" + port);
	
	socket.onopen = function (event) {
		navigator.geolocation.getCurrentPosition(success, error, options);
		$(".draggable").each(function() {
			holdLock[$(this).attr("id")] = false;
			locked[$(this).attr("id")] = false;
			console.log($(this).attr("id"));
			console.log("locked array to be proposed: "+JSON.stringify(locked));
			world[$(this).attr("id")] = $(this).position();
		});
		getLockArray();
		getDefaultWorld();
	};

	socket.onclose = function (event) {
		alert("closed code:" + event.code + " reason:" +event.reason + " wasClean:"+event.wasClean);
	};

	socket.onmessage = function (event) {
		var message = JSON.parse(event.data);

		if (message['action'] == 'displayWorlds') {
			var worldNames = message['worlds'];
			displayWorlds(worldNames);
		} else if (message['action'] == 'update' && message['worldName'] == worldName) {
			updateWorld(message);
		} else if (message['action'] == 'updateWholeWorld') {
			world = message['world'];
			updateWholeWorld();
		} else if (message['action'] == 'updateLocations') {
			for (var key in markers){
				markers[key].setMap(null);
			}
			markers = [];
			var locations = message['locations'];
			for(var key in locations){
				var location = locations[key];
				location = new google.maps.LatLng(location.k,location.A);
				setMarker(location);
			}
			$("#status").html(locations.length + " online users at this moment.");
		} else if(message['action'] == 'lock') {
			if(message['worldName'] != worldName) return;
			var objectID = message['objectID'];
			locked[objectID] = true;
			$("#"+objectID).draggable( 'disable' );
		} else if(message['action'] == 'unlock') {
			if(message['worldName'] != worldName) return;
			var objectID = message['objectID'];
			locked[objectID] = false;
			$("#"+objectID).draggable( 'enable' );
		} else if(message['action'] == 'sendLockArray') {
			locked = message['array'];
		} else if(message['action'] == 'resetWorld') {
			if(message['worldName'] != worldName) return;
			world = message['world'];
			locked = message['lockedArray'];
			updateWholeWorld();
			$(".draggable").draggable( 'enable' );
			$(".draggable").each(function(key, value){
				holdLock[$(this).attr("id")] = false;
			});
		} else if(message['action'] == 'getDefaultWorld') {
			if(message['worldName'] != worldName) return;
			world = message['proposedWorld'];         
		}
	};
}

function displayWorlds(worldNames){
	var html = "";
	for(var name in worldNames){
		html += "<li><a href='#' onclick='chooseWorld($(this))'>" + worldNames[name] + "</a></li>";
	}
	$("#world-list").html(html);		
}

function saveWorld(){
	if ($("#world-name").val()) {
		worldName = $("#world-name").val();
		$("#world-id").html("Welcome to world '" + worldName + "'!");
		$("#world-name").val("");
		$(".draggable").each(function() {
			holdLock[$(this).attr("id")] = false;
			locked[$(this).attr("id")] = false;
		});

		var request = {'action': 'save', 'worldName': worldName, 'world': world, 'locked':locked};
		socket.send(JSON.stringify(request));
	} else {
		$("#world-name").popover('show');
	}
}

function getLockArray() {
	var request = {'action': 'getLockArray', 'proposedArray': locked};
	socket.send(JSON.stringify(request));
}

function restartGame() {
	world = originalWorld;
	updateWholeWorld();
	$(".draggable").each(function() {
		holdLock[$(this).attr("id")] = false;
		locked[$(this).attr("id")] = false;
	});
	var request = {'action': 'resetWorld', 'worldName': worldName, 'lockedArray': locked, 'world':world};
	socket.send(JSON.stringify(request));
}

function shakeEventDidOccur () {
	restartGame();
}

function getDefaultWorld() {
	originalWorld = JSON.parse(JSON.stringify(world));
	var request = {'action':'getDefaultWorld', 'proposedWorld':world};
	socket.send(JSON.stringify(request));
}

function switchView(option){
	if (option == "instruction") {
		$(".row").hide();
		$("#instruction").show();
		$("#instr").addClass("active");
		$("#home").removeClass("active");
	} else if (option == "home"){
		$(".row").show();
		$("#instruction").hide();
		$("#home").addClass("active");
		$("#instr").removeClass("active");
	}
}

$(function() { 
	initializeMap();
	setupSocket();

	$("#world-id").html("Welcome to world '" + worldName + "'!");

	$("a").click(function(event){
		event.preventDefault();
	});

	$(".draggable").draggable({
		containment: 'parent'
	});

	$(".draggable").each(function(key, value){
		world[$(this).attr("id")] = $(this).position();
	});

	$(".draggable").draggable();
	$(".draggable").on("dragstart", function(event, ui) { handleDragStart(event, ui); });
	$(".draggable").on("dragstop" , function(event, ui) { handleDragEnd(event, ui); });
	$(".draggable").on("drag"     , function(event, ui) { handleDrag(event, ui); });

	window.addEventListener('shake', shakeEventDidOccur, false);
});








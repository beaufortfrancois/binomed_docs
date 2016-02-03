(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
var rvModel = require('../model/rivetsModel'),
	utils = require('../utils/utils'),
	gameModel = require('../model/gameModel'),
	compat = require('../utils/compat'), 	
	questions = require('../questions/questions'),
	shake = require('../shake/shake'),
	visibility = require('../sensors/visibility'),
	//notification = require('../sensors/notifications'),
	socket = null;



function initController(){
  
	if (!compat()){
		rvModel.hideMessage = true;
		rvModel.showQuestion = false; 
		rvModel.notcompatible = true;
		return;
	}


	rvModel.gameQuestion = !localStorage['game'] || localStorage['game'] === "questions";
	rvModel.gameShake = localStorage['game'] === "shake";
	if (rvModel.gameShake){
		rvModel.showChoice = !localStorage['team'];
		rvModel.showPhone = localStorage['team'];
	}
	

	if (location.port && location.port === "3000"){
		socket = io.connect("http://localhost:8000");
	}else{ 
		socket = io.connect("http://binomed.fr:8000");
	}	

	visibility.init(socket);
	questions.init(socket);
	shake.init(socket);
	//notification.init(socket);
	

}

module.exports = {
	initController : initController
}
},{"../model/gameModel":3,"../model/rivetsModel":4,"../questions/questions":5,"../sensors/visibility":8,"../shake/shake":9,"../utils/compat":10,"../utils/utils":11}],2:[function(require,module,exports){
'use strict'


function pageLoad(){
	rivets.bind(document.querySelector('#content'), require('./model/rivetsModel'));
	
	require('./controler/controller').initController();
}

window.addEventListener('load', pageLoad);


},{"./controler/controller":1,"./model/rivetsModel":4}],3:[function(require,module,exports){
'use strict'

var idUser = localStorage['userId'] ? localStorage['userId'] : 'user'+new Date().getTime();
localStorage['userId'] = idUser;

module.exports = {
	id : idUser,
	allowResp : true
}
},{}],4:[function(require,module,exports){
'use strict'

module.exports = {
	showQuestion : true, 
	hideMessage : true,
	notcompatible : false,
	gameQuestion : true,
	gameShake : false,
	showChoice : true,
	showPhone : false,
	repA : 'reponse A',
	repB : 'reponse B',
	repC : 'reponse C',
	repD : 'reponse D',
	respASelect : false,
	respBSelect : false,
	respCSelect : false,
	respDSelect : false
}
},{}],5:[function(require,module,exports){
'use strict'

let rvModel = require('../model/rivetsModel'),
	gameModel = require('../model/gameModel'),
	vibration = require('../sensors/vibration'),
	socket = null,
	value = null;

function clickResp(event){
 
 	if (!rvModel.hideMessage){
 		return;
 	}
	let elt = event.srcElement;
	let sendMessage = true;
	let type = 'newResp';
	switch (elt.id){
		case "respA":
			value = 'A';
			if (rvModel.respBSelect 
				|| rvModel.respCSelect 
				|| rvModel.respDSelect){
				type = 'reSend';
				rvModel.respASelect = true;
				rvModel.respBSelect = false;
				rvModel.respCSelect = false;
				rvModel.respDSelect = false;
			}else if (rvModel.respASelect){
				sendMessage = false;
			}else{
				rvModel.respASelect = true;
			}
		break;
		case "respB":
			value = 'B';
			if (rvModel.respASelect 
				|| rvModel.respCSelect 
				|| rvModel.respDSelect){
				type = 'reSend';
				rvModel.respASelect = false;
				rvModel.respBSelect = true;
				rvModel.respCSelect = false;
				rvModel.respDSelect = false;
			}else if (rvModel.respBSelect){
				sendMessage = false;
			}else{
				rvModel.respBSelect = true;
			}
		break;
		case "respC":
			value = 'C';
			if (rvModel.respASelect 
				|| rvModel.respBSelect 
				|| rvModel.respDSelect){
				type = 'reSend';
				rvModel.respASelect = false;
				rvModel.respBSelect = false;
				rvModel.respCSelect = true;
				rvModel.respDSelect = false;
			}else if (rvModel.respCSelect){
				sendMessage = false;
			}else{
				rvModel.respCSelect = true;
			}
		break;
		case "respD":
			value = 'D';
			if (rvModel.respASelect 
				|| rvModel.respBSelect 
				|| rvModel.respCSelect){
				type = 'reSend';
				rvModel.respASelect = false;
				rvModel.respBSelect = false;
				rvModel.respCSelect = false;
				rvModel.respDSelect = true;
			}else if (rvModel.respDSelect){
				sendMessage = false;
			}else{
				rvModel.respDSelect = true;
			}
		break;
	}

	if (sendMessage){
		socket.emit('config',{
			type : 'game',
			id : gameModel.id,
			eventType : type,
			resp : value
		});
	}

}


function init(socketToSet){
	socket = socketToSet;
	rvModel.clickResp = clickResp;

	let myHeaders = new Headers();
	let myInit = { method: 'GET',
	       headers: myHeaders,
	       mode: 'cors',
	       cache: 'default' };

	socket.on('config', function (data) {
		if (data.type === 'game' && data.eventType === 'changeQuestion'){
			localStorage['game'] = "questions";
			rvModel.gameQuestion = true;
			rvModel.gameShake = false;
			rvModel.hideMessage = true;
			rvModel.showQuestion = true;
			rvModel.repA = data.repA;
			rvModel.repB = data.repB;
			rvModel.repC = data.repC;
			rvModel.repD = data.repD;
			value = null;
		}else if (data.type === 'game' && data.eventType === 'hideQuestion'){
			localStorage['game'] = "questions";
			rvModel.hideMessage = false;
			rvModel.showQuestion = false;
			rvModel.gameQuestion = true;
			rvModel.gameShake = false;
		}else if (data.type === 'game' && data.eventType === 'answer'){
			if (value === data.value){
				vibration.vibrate([200,100,200]);
			}else{
				vibration.vibrate([1000]);
			}
		}
	});

	let protocol = '';
    let scheme = ''
    let basicHost = ''
    if (location.host && location.host.indexOf('localhost') === -1){
    	protocol = 'http';
    	scheme = '://';
    	basicHost = 'binomed.fr:8000';
    }

	let myRequest = new Request(`${protocol}${scheme}${basicHost}/currentState`,myInit);
	fetch(myRequest)
	.then(function(response){
		return response.json();
	})
	.then(function(json){
		if (json.hideQuestion){
			rvModel.hideMessage = !json.hideQuestion;
			rvModel.showQuestion = rvModel.hideMessage;
		}
		if (json.score && json.score.users && json.score.users[gameModel.id]){
			switch(json.score.users[gameModel.id]){
				case 'A':
					rvModel.respASelect = true;
					rvModel.respBSelect = false;
					rvModel.respCSelect = false;
					rvModel.respDSelect = false;
					break;
				case 'B':
					rvModel.respASelect = false;
					rvModel.respBSelect = true;
					rvModel.respCSelect = false;
					rvModel.respDSelect = false;
					break;
				case 'C':
					rvModel.respASelect = false;
					rvModel.respBSelect = false;
					rvModel.respCSelect = true;
					rvModel.respDSelect = false;
					break;
				case 'D':
					rvModel.respASelect = false;
					rvModel.respBSelect = false;
					rvModel.respCSelect = false;
					rvModel.respDSelect = true;
					break;
			}
		}		
	});
}

module.exports = {
	init : init
};
},{"../model/gameModel":3,"../model/rivetsModel":4,"../sensors/vibration":7}],6:[function(require,module,exports){
'use strict';

let callback = null;

// Listener of devieMotion
var deviceMotionListener = function(event){        
	var x = event.acceleration.x;
	var y = event.acceleration.y;
	var z = event.acceleration.z;
	callback(Math.abs(x));
	//updatePercent();
}

// We add the listener
function register(){
	window.addEventListener('devicemotion', deviceMotionListener, false);
}

function unregister(){
	window.removeEventListener('devicemotion', deviceMotionListener, false);        
}

function init(callbackMotion){
	callback = callbackMotion
}


module.exports = {
	register : register,
	unregister : unregister,
	init : init
}
},{}],7:[function(require,module,exports){
'use strict';

 	// We vibrate according to the sequence
	function vibrate(arrayOfVibration){
		window.navigator.vibrate(arrayOfVibration);
	}

	function unregister(){
		navigator.vibrate(0);        
	}


module.exports = {
	vibrate : vibrate,
	unregister : unregister
}
},{}],8:[function(require,module,exports){
'use strict'

var socket = null;

function manageVisibility(){
	// Set the name of the hidden property and the change event for visibility
	var hidden, visibilityChange; 
	if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
	  hidden = "hidden";
	  visibilityChange = "visibilitychange";
	} else if (typeof document.mozHidden !== "undefined") {
	  hidden = "mozHidden";
	  visibilityChange = "mozvisibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
	  hidden = "msHidden";
	  visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
	  hidden = "webkitHidden";
	  visibilityChange = "webkitvisibilitychange";
	}
	 
	// Warn if the browser doesn't support addEventListener or the Page Visibility API
	if (typeof document.addEventListener === "undefined" || 
	  typeof document[hidden] === "undefined") {
	  alert("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
	} else {
		// Handle page visibility change   
		document.addEventListener(visibilityChange, function handleVisibilityChange(){
			if (document[hidden]) {
				socket.disconnect();
			} else {
				socket.connect();
				//socket.io.reconnect();
			}
		}, false);
	    
	  
	}
}

function init(socketToSet){
	socket = socketToSet;

	manageVisibility();
}


module.exports = {
	init : init	
}
},{}],9:[function(require,module,exports){
'use strict'

let rvModel = require('../model/rivetsModel'),
	gameModel = require('../model/gameModel'),
	motion = require('../sensors/devicemotion'),
	socket = null;

function choiceTeam(event){
	if (event.srcElement.classList.contains('chrome')){
		localStorage['team'] = 2;
	}else{
		localStorage['team'] = 1;
	}

	rvModel.showChoice = false;
	rvModel.showPhone = true;
	motion.register();
}


function callBackMotion(move){
	let team = localStorage['team'];
	socket.emit('sensor', {
		id : gameModel.id,
		type:'devicemotion',
		'team' : team,
		value: move
	});
}

function init(socketToSet){

	socket = socketToSet;
	rvModel.choiceTeam = choiceTeam;

	motion.init(callBackMotion);

	socket.on('config', function (data) {
		if (data.type === 'game' && data.eventType === 'battery'){
			localStorage['game'] = "shake";
			rvModel.gameQuestion = !data.show;
			rvModel.gameShake = data.show;	
			rvModel.showChoice = !localStorage['team'];
			rvModel.showPhone = localStorage['team'];
			if (localStorage['team']){				
				if (data.show){
					motion.register();
				}else{
					motion.unregister();
				}
			}
		}
	});

	if (rvModel.gameShake){
		motion.register(); 
	}

}

module.exports = {
	init : init
};
},{"../model/gameModel":3,"../model/rivetsModel":4,"../sensors/devicemotion":6}],10:[function(require,module,exports){
'use strict'



/*****************************
******************************
* Apis exposed
******************************
******************************
*/

function deviceMotionAvailable(){
	return window.DeviceMotionEvent;
}

function vibrationAvailable(){
	return navigator.vibrate;
}

function proximityAvailable(){
	return window.DeviceProximityEvent;
}

function visibilityAvailable(){
	return typeof document.hidden != "undefined"
			|| typeof document.mozHidden != "undefined"
			|| typeof document.msHidden != "undefined"
			|| typeof document.webkitHidden != "undefined"
}

function isCompat(){
	console.log('Device Motion : %s', deviceMotionAvailable());
	console.log('Vibration : %s', vibrationAvailable());
	console.log('Visibility : %s', visibilityAvailable());
	//console.log('Proximity : %s', proximityAvailable());
	return deviceMotionAvailable()
	 && vibrationAvailable()
	 && visibilityAvailable();
	 //&& proximityAvailable();
}

module.exports = isCompat;
},{}],11:[function(require,module,exports){
'use strict'

function rippleEffect(event){
	let elt = event.srcElement;
	if (!elt.classList.contains('fab'))
		return;

      
    var divParent = document.createElement('DIV'),
    	div = document.createElement('DIV'),
    	xPos = event.pageX - elt.offsetLeft,
      	yPos = event.pageY - elt.offsetTop;
      
    divParent.classList.add('ripple');
    divParent.style.height = elt.clientHeight+"px";
    divParent.style.top = -(elt.clientHeight / 2)+"px";
    divParent.style.width = elt.clientWidth+"px";
      
    div.classList.add('ripple-effect'); 
    div.style.height = elt.clientHeight+"px";
    div.style.width = elt.clientHeight+"px";
    div.style.top = (yPos - (elt.clientHeight/2))+"px";
    div.style.left = (xPos - (elt.clientHeight/2))+"px";
    div.style.background =  "#438844";
      
    divParent.appendChild(div);
    elt.appendChild(divParent);

      window.setTimeout(function(){
        elt.removeChild(divParent);
      }, 2000);
}

module.exports = {
	rippleEffect : rippleEffect
}
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvY29udHJvbGVyL2NvbnRyb2xsZXIuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvZ2FtZS5qcyIsImFkZG9uL3NjcmlwdHMvZ2FtZS9tb2RlbC9nYW1lTW9kZWwuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvbW9kZWwvcml2ZXRzTW9kZWwuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvcXVlc3Rpb25zL3F1ZXN0aW9ucy5qcyIsImFkZG9uL3NjcmlwdHMvZ2FtZS9zZW5zb3JzL2RldmljZW1vdGlvbi5qcyIsImFkZG9uL3NjcmlwdHMvZ2FtZS9zZW5zb3JzL3ZpYnJhdGlvbi5qcyIsImFkZG9uL3NjcmlwdHMvZ2FtZS9zZW5zb3JzL3Zpc2liaWxpdHkuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvc2hha2Uvc2hha2UuanMiLCJhZGRvbi9zY3JpcHRzL2dhbWUvdXRpbHMvY29tcGF0LmpzIiwiYWRkb24vc2NyaXB0cy9nYW1lL3V0aWxzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0J1xudmFyIHJ2TW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9yaXZldHNNb2RlbCcpLFxuXHR1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyksXG5cdGdhbWVNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVsL2dhbWVNb2RlbCcpLFxuXHRjb21wYXQgPSByZXF1aXJlKCcuLi91dGlscy9jb21wYXQnKSwgXHRcblx0cXVlc3Rpb25zID0gcmVxdWlyZSgnLi4vcXVlc3Rpb25zL3F1ZXN0aW9ucycpLFxuXHRzaGFrZSA9IHJlcXVpcmUoJy4uL3NoYWtlL3NoYWtlJyksXG5cdHZpc2liaWxpdHkgPSByZXF1aXJlKCcuLi9zZW5zb3JzL3Zpc2liaWxpdHknKSxcblx0Ly9ub3RpZmljYXRpb24gPSByZXF1aXJlKCcuLi9zZW5zb3JzL25vdGlmaWNhdGlvbnMnKSxcblx0c29ja2V0ID0gbnVsbDtcblxuXG5cbmZ1bmN0aW9uIGluaXRDb250cm9sbGVyKCl7XG4gIFxuXHRpZiAoIWNvbXBhdCgpKXtcblx0XHRydk1vZGVsLmhpZGVNZXNzYWdlID0gdHJ1ZTtcblx0XHRydk1vZGVsLnNob3dRdWVzdGlvbiA9IGZhbHNlOyBcblx0XHRydk1vZGVsLm5vdGNvbXBhdGlibGUgPSB0cnVlO1xuXHRcdHJldHVybjtcblx0fVxuXG5cblx0cnZNb2RlbC5nYW1lUXVlc3Rpb24gPSAhbG9jYWxTdG9yYWdlWydnYW1lJ10gfHwgbG9jYWxTdG9yYWdlWydnYW1lJ10gPT09IFwicXVlc3Rpb25zXCI7XG5cdHJ2TW9kZWwuZ2FtZVNoYWtlID0gbG9jYWxTdG9yYWdlWydnYW1lJ10gPT09IFwic2hha2VcIjtcblx0aWYgKHJ2TW9kZWwuZ2FtZVNoYWtlKXtcblx0XHRydk1vZGVsLnNob3dDaG9pY2UgPSAhbG9jYWxTdG9yYWdlWyd0ZWFtJ107XG5cdFx0cnZNb2RlbC5zaG93UGhvbmUgPSBsb2NhbFN0b3JhZ2VbJ3RlYW0nXTtcblx0fVxuXHRcblxuXHRpZiAobG9jYXRpb24ucG9ydCAmJiBsb2NhdGlvbi5wb3J0ID09PSBcIjMwMDBcIil7XG5cdFx0c29ja2V0ID0gaW8uY29ubmVjdChcImh0dHA6Ly9sb2NhbGhvc3Q6ODAwMFwiKTtcblx0fWVsc2V7IFxuXHRcdHNvY2tldCA9IGlvLmNvbm5lY3QoXCJodHRwOi8vYmlub21lZC5mcjo4MDAwXCIpO1xuXHR9XHRcblxuXHR2aXNpYmlsaXR5LmluaXQoc29ja2V0KTtcblx0cXVlc3Rpb25zLmluaXQoc29ja2V0KTtcblx0c2hha2UuaW5pdChzb2NrZXQpO1xuXHQvL25vdGlmaWNhdGlvbi5pbml0KHNvY2tldCk7XG5cdFxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0Q29udHJvbGxlciA6IGluaXRDb250cm9sbGVyXG59IiwiJ3VzZSBzdHJpY3QnXG5cblxuZnVuY3Rpb24gcGFnZUxvYWQoKXtcblx0cml2ZXRzLmJpbmQoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnRlbnQnKSwgcmVxdWlyZSgnLi9tb2RlbC9yaXZldHNNb2RlbCcpKTtcblx0XG5cdHJlcXVpcmUoJy4vY29udHJvbGVyL2NvbnRyb2xsZXInKS5pbml0Q29udHJvbGxlcigpO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHBhZ2VMb2FkKTtcblxuIiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBpZFVzZXIgPSBsb2NhbFN0b3JhZ2VbJ3VzZXJJZCddID8gbG9jYWxTdG9yYWdlWyd1c2VySWQnXSA6ICd1c2VyJytuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmxvY2FsU3RvcmFnZVsndXNlcklkJ10gPSBpZFVzZXI7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpZCA6IGlkVXNlcixcblx0YWxsb3dSZXNwIDogdHJ1ZVxufSIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0c2hvd1F1ZXN0aW9uIDogdHJ1ZSwgXG5cdGhpZGVNZXNzYWdlIDogdHJ1ZSxcblx0bm90Y29tcGF0aWJsZSA6IGZhbHNlLFxuXHRnYW1lUXVlc3Rpb24gOiB0cnVlLFxuXHRnYW1lU2hha2UgOiBmYWxzZSxcblx0c2hvd0Nob2ljZSA6IHRydWUsXG5cdHNob3dQaG9uZSA6IGZhbHNlLFxuXHRyZXBBIDogJ3JlcG9uc2UgQScsXG5cdHJlcEIgOiAncmVwb25zZSBCJyxcblx0cmVwQyA6ICdyZXBvbnNlIEMnLFxuXHRyZXBEIDogJ3JlcG9uc2UgRCcsXG5cdHJlc3BBU2VsZWN0IDogZmFsc2UsXG5cdHJlc3BCU2VsZWN0IDogZmFsc2UsXG5cdHJlc3BDU2VsZWN0IDogZmFsc2UsXG5cdHJlc3BEU2VsZWN0IDogZmFsc2Vcbn0iLCIndXNlIHN0cmljdCdcblxubGV0IHJ2TW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9yaXZldHNNb2RlbCcpLFxuXHRnYW1lTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9nYW1lTW9kZWwnKSxcblx0dmlicmF0aW9uID0gcmVxdWlyZSgnLi4vc2Vuc29ycy92aWJyYXRpb24nKSxcblx0c29ja2V0ID0gbnVsbCxcblx0dmFsdWUgPSBudWxsO1xuXG5mdW5jdGlvbiBjbGlja1Jlc3AoZXZlbnQpe1xuIFxuIFx0aWYgKCFydk1vZGVsLmhpZGVNZXNzYWdlKXtcbiBcdFx0cmV0dXJuO1xuIFx0fVxuXHRsZXQgZWx0ID0gZXZlbnQuc3JjRWxlbWVudDtcblx0bGV0IHNlbmRNZXNzYWdlID0gdHJ1ZTtcblx0bGV0IHR5cGUgPSAnbmV3UmVzcCc7XG5cdHN3aXRjaCAoZWx0LmlkKXtcblx0XHRjYXNlIFwicmVzcEFcIjpcblx0XHRcdHZhbHVlID0gJ0EnO1xuXHRcdFx0aWYgKHJ2TW9kZWwucmVzcEJTZWxlY3QgXG5cdFx0XHRcdHx8IHJ2TW9kZWwucmVzcENTZWxlY3QgXG5cdFx0XHRcdHx8IHJ2TW9kZWwucmVzcERTZWxlY3Qpe1xuXHRcdFx0XHR0eXBlID0gJ3JlU2VuZCc7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcEFTZWxlY3QgPSB0cnVlO1xuXHRcdFx0XHRydk1vZGVsLnJlc3BCU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcENTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0cnZNb2RlbC5yZXNwRFNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0fWVsc2UgaWYgKHJ2TW9kZWwucmVzcEFTZWxlY3Qpe1xuXHRcdFx0XHRzZW5kTWVzc2FnZSA9IGZhbHNlO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcEFTZWxlY3QgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdGJyZWFrO1xuXHRcdGNhc2UgXCJyZXNwQlwiOlxuXHRcdFx0dmFsdWUgPSAnQic7XG5cdFx0XHRpZiAocnZNb2RlbC5yZXNwQVNlbGVjdCBcblx0XHRcdFx0fHwgcnZNb2RlbC5yZXNwQ1NlbGVjdCBcblx0XHRcdFx0fHwgcnZNb2RlbC5yZXNwRFNlbGVjdCl7XG5cdFx0XHRcdHR5cGUgPSAncmVTZW5kJztcblx0XHRcdFx0cnZNb2RlbC5yZXNwQVNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRydk1vZGVsLnJlc3BCU2VsZWN0ID0gdHJ1ZTtcblx0XHRcdFx0cnZNb2RlbC5yZXNwQ1NlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRydk1vZGVsLnJlc3BEU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHR9ZWxzZSBpZiAocnZNb2RlbC5yZXNwQlNlbGVjdCl7XG5cdFx0XHRcdHNlbmRNZXNzYWdlID0gZmFsc2U7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0cnZNb2RlbC5yZXNwQlNlbGVjdCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0YnJlYWs7XG5cdFx0Y2FzZSBcInJlc3BDXCI6XG5cdFx0XHR2YWx1ZSA9ICdDJztcblx0XHRcdGlmIChydk1vZGVsLnJlc3BBU2VsZWN0IFxuXHRcdFx0XHR8fCBydk1vZGVsLnJlc3BCU2VsZWN0IFxuXHRcdFx0XHR8fCBydk1vZGVsLnJlc3BEU2VsZWN0KXtcblx0XHRcdFx0dHlwZSA9ICdyZVNlbmQnO1xuXHRcdFx0XHRydk1vZGVsLnJlc3BBU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcEJTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0cnZNb2RlbC5yZXNwQ1NlbGVjdCA9IHRydWU7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcERTZWxlY3QgPSBmYWxzZTtcblx0XHRcdH1lbHNlIGlmIChydk1vZGVsLnJlc3BDU2VsZWN0KXtcblx0XHRcdFx0c2VuZE1lc3NhZ2UgPSBmYWxzZTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRydk1vZGVsLnJlc3BDU2VsZWN0ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRicmVhaztcblx0XHRjYXNlIFwicmVzcERcIjpcblx0XHRcdHZhbHVlID0gJ0QnO1xuXHRcdFx0aWYgKHJ2TW9kZWwucmVzcEFTZWxlY3QgXG5cdFx0XHRcdHx8IHJ2TW9kZWwucmVzcEJTZWxlY3QgXG5cdFx0XHRcdHx8IHJ2TW9kZWwucmVzcENTZWxlY3Qpe1xuXHRcdFx0XHR0eXBlID0gJ3JlU2VuZCc7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcEFTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0cnZNb2RlbC5yZXNwQlNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRydk1vZGVsLnJlc3BDU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcERTZWxlY3QgPSB0cnVlO1xuXHRcdFx0fWVsc2UgaWYgKHJ2TW9kZWwucmVzcERTZWxlY3Qpe1xuXHRcdFx0XHRzZW5kTWVzc2FnZSA9IGZhbHNlO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHJ2TW9kZWwucmVzcERTZWxlY3QgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdGJyZWFrO1xuXHR9XG5cblx0aWYgKHNlbmRNZXNzYWdlKXtcblx0XHRzb2NrZXQuZW1pdCgnY29uZmlnJyx7XG5cdFx0XHR0eXBlIDogJ2dhbWUnLFxuXHRcdFx0aWQgOiBnYW1lTW9kZWwuaWQsXG5cdFx0XHRldmVudFR5cGUgOiB0eXBlLFxuXHRcdFx0cmVzcCA6IHZhbHVlXG5cdFx0fSk7XG5cdH1cblxufVxuXG5cbmZ1bmN0aW9uIGluaXQoc29ja2V0VG9TZXQpe1xuXHRzb2NrZXQgPSBzb2NrZXRUb1NldDtcblx0cnZNb2RlbC5jbGlja1Jlc3AgPSBjbGlja1Jlc3A7XG5cblx0bGV0IG15SGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XG5cdGxldCBteUluaXQgPSB7IG1ldGhvZDogJ0dFVCcsXG5cdCAgICAgICBoZWFkZXJzOiBteUhlYWRlcnMsXG5cdCAgICAgICBtb2RlOiAnY29ycycsXG5cdCAgICAgICBjYWNoZTogJ2RlZmF1bHQnIH07XG5cblx0c29ja2V0Lm9uKCdjb25maWcnLCBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdGlmIChkYXRhLnR5cGUgPT09ICdnYW1lJyAmJiBkYXRhLmV2ZW50VHlwZSA9PT0gJ2NoYW5nZVF1ZXN0aW9uJyl7XG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2dhbWUnXSA9IFwicXVlc3Rpb25zXCI7XG5cdFx0XHRydk1vZGVsLmdhbWVRdWVzdGlvbiA9IHRydWU7XG5cdFx0XHRydk1vZGVsLmdhbWVTaGFrZSA9IGZhbHNlO1xuXHRcdFx0cnZNb2RlbC5oaWRlTWVzc2FnZSA9IHRydWU7XG5cdFx0XHRydk1vZGVsLnNob3dRdWVzdGlvbiA9IHRydWU7XG5cdFx0XHRydk1vZGVsLnJlcEEgPSBkYXRhLnJlcEE7XG5cdFx0XHRydk1vZGVsLnJlcEIgPSBkYXRhLnJlcEI7XG5cdFx0XHRydk1vZGVsLnJlcEMgPSBkYXRhLnJlcEM7XG5cdFx0XHRydk1vZGVsLnJlcEQgPSBkYXRhLnJlcEQ7XG5cdFx0XHR2YWx1ZSA9IG51bGw7XG5cdFx0fWVsc2UgaWYgKGRhdGEudHlwZSA9PT0gJ2dhbWUnICYmIGRhdGEuZXZlbnRUeXBlID09PSAnaGlkZVF1ZXN0aW9uJyl7XG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2dhbWUnXSA9IFwicXVlc3Rpb25zXCI7XG5cdFx0XHRydk1vZGVsLmhpZGVNZXNzYWdlID0gZmFsc2U7XG5cdFx0XHRydk1vZGVsLnNob3dRdWVzdGlvbiA9IGZhbHNlO1xuXHRcdFx0cnZNb2RlbC5nYW1lUXVlc3Rpb24gPSB0cnVlO1xuXHRcdFx0cnZNb2RlbC5nYW1lU2hha2UgPSBmYWxzZTtcblx0XHR9ZWxzZSBpZiAoZGF0YS50eXBlID09PSAnZ2FtZScgJiYgZGF0YS5ldmVudFR5cGUgPT09ICdhbnN3ZXInKXtcblx0XHRcdGlmICh2YWx1ZSA9PT0gZGF0YS52YWx1ZSl7XG5cdFx0XHRcdHZpYnJhdGlvbi52aWJyYXRlKFsyMDAsMTAwLDIwMF0pO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdHZpYnJhdGlvbi52aWJyYXRlKFsxMDAwXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHRsZXQgcHJvdG9jb2wgPSAnJztcbiAgICBsZXQgc2NoZW1lID0gJydcbiAgICBsZXQgYmFzaWNIb3N0ID0gJydcbiAgICBpZiAobG9jYXRpb24uaG9zdCAmJiBsb2NhdGlvbi5ob3N0LmluZGV4T2YoJ2xvY2FsaG9zdCcpID09PSAtMSl7XG4gICAgXHRwcm90b2NvbCA9ICdodHRwJztcbiAgICBcdHNjaGVtZSA9ICc6Ly8nO1xuICAgIFx0YmFzaWNIb3N0ID0gJ2Jpbm9tZWQuZnI6ODAwMCc7XG4gICAgfVxuXG5cdGxldCBteVJlcXVlc3QgPSBuZXcgUmVxdWVzdChgJHtwcm90b2NvbH0ke3NjaGVtZX0ke2Jhc2ljSG9zdH0vY3VycmVudFN0YXRlYCxteUluaXQpO1xuXHRmZXRjaChteVJlcXVlc3QpXG5cdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRyZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbihqc29uKXtcblx0XHRpZiAoanNvbi5oaWRlUXVlc3Rpb24pe1xuXHRcdFx0cnZNb2RlbC5oaWRlTWVzc2FnZSA9ICFqc29uLmhpZGVRdWVzdGlvbjtcblx0XHRcdHJ2TW9kZWwuc2hvd1F1ZXN0aW9uID0gcnZNb2RlbC5oaWRlTWVzc2FnZTtcblx0XHR9XG5cdFx0aWYgKGpzb24uc2NvcmUgJiYganNvbi5zY29yZS51c2VycyAmJiBqc29uLnNjb3JlLnVzZXJzW2dhbWVNb2RlbC5pZF0pe1xuXHRcdFx0c3dpdGNoKGpzb24uc2NvcmUudXNlcnNbZ2FtZU1vZGVsLmlkXSl7XG5cdFx0XHRcdGNhc2UgJ0EnOlxuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcEFTZWxlY3QgPSB0cnVlO1xuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcEJTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0XHRydk1vZGVsLnJlc3BDU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0cnZNb2RlbC5yZXNwRFNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdCJzpcblx0XHRcdFx0XHRydk1vZGVsLnJlc3BBU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0cnZNb2RlbC5yZXNwQlNlbGVjdCA9IHRydWU7XG5cdFx0XHRcdFx0cnZNb2RlbC5yZXNwQ1NlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcERTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnQyc6XG5cdFx0XHRcdFx0cnZNb2RlbC5yZXNwQVNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcEJTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0XHRydk1vZGVsLnJlc3BDU2VsZWN0ID0gdHJ1ZTtcblx0XHRcdFx0XHRydk1vZGVsLnJlc3BEU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ0QnOlxuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcEFTZWxlY3QgPSBmYWxzZTtcblx0XHRcdFx0XHRydk1vZGVsLnJlc3BCU2VsZWN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0cnZNb2RlbC5yZXNwQ1NlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdHJ2TW9kZWwucmVzcERTZWxlY3QgPSB0cnVlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cdFx0XG5cdH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXRcbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5sZXQgY2FsbGJhY2sgPSBudWxsO1xuXG4vLyBMaXN0ZW5lciBvZiBkZXZpZU1vdGlvblxudmFyIGRldmljZU1vdGlvbkxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQpeyAgICAgICAgXG5cdHZhciB4ID0gZXZlbnQuYWNjZWxlcmF0aW9uLng7XG5cdHZhciB5ID0gZXZlbnQuYWNjZWxlcmF0aW9uLnk7XG5cdHZhciB6ID0gZXZlbnQuYWNjZWxlcmF0aW9uLno7XG5cdGNhbGxiYWNrKE1hdGguYWJzKHgpKTtcblx0Ly91cGRhdGVQZXJjZW50KCk7XG59XG5cbi8vIFdlIGFkZCB0aGUgbGlzdGVuZXJcbmZ1bmN0aW9uIHJlZ2lzdGVyKCl7XG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCBkZXZpY2VNb3Rpb25MaXN0ZW5lciwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyKCl7XG5cdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCBkZXZpY2VNb3Rpb25MaXN0ZW5lciwgZmFsc2UpOyAgICAgICAgXG59XG5cbmZ1bmN0aW9uIGluaXQoY2FsbGJhY2tNb3Rpb24pe1xuXHRjYWxsYmFjayA9IGNhbGxiYWNrTW90aW9uXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHJlZ2lzdGVyIDogcmVnaXN0ZXIsXG5cdHVucmVnaXN0ZXIgOiB1bnJlZ2lzdGVyLFxuXHRpbml0IDogaW5pdFxufSIsIid1c2Ugc3RyaWN0JztcblxuIFx0Ly8gV2UgdmlicmF0ZSBhY2NvcmRpbmcgdG8gdGhlIHNlcXVlbmNlXG5cdGZ1bmN0aW9uIHZpYnJhdGUoYXJyYXlPZlZpYnJhdGlvbil7XG5cdFx0d2luZG93Lm5hdmlnYXRvci52aWJyYXRlKGFycmF5T2ZWaWJyYXRpb24pO1xuXHR9XG5cblx0ZnVuY3Rpb24gdW5yZWdpc3Rlcigpe1xuXHRcdG5hdmlnYXRvci52aWJyYXRlKDApOyAgICAgICAgXG5cdH1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0dmlicmF0ZSA6IHZpYnJhdGUsXG5cdHVucmVnaXN0ZXIgOiB1bnJlZ2lzdGVyXG59IiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBzb2NrZXQgPSBudWxsO1xuXG5mdW5jdGlvbiBtYW5hZ2VWaXNpYmlsaXR5KCl7XG5cdC8vIFNldCB0aGUgbmFtZSBvZiB0aGUgaGlkZGVuIHByb3BlcnR5IGFuZCB0aGUgY2hhbmdlIGV2ZW50IGZvciB2aXNpYmlsaXR5XG5cdHZhciBoaWRkZW4sIHZpc2liaWxpdHlDaGFuZ2U7IFxuXHRpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gXCJ1bmRlZmluZWRcIikgeyAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydCBcblx0ICBoaWRkZW4gPSBcImhpZGRlblwiO1xuXHQgIHZpc2liaWxpdHlDaGFuZ2UgPSBcInZpc2liaWxpdHljaGFuZ2VcIjtcblx0fSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubW96SGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdCAgaGlkZGVuID0gXCJtb3pIaWRkZW5cIjtcblx0ICB2aXNpYmlsaXR5Q2hhbmdlID0gXCJtb3p2aXNpYmlsaXR5Y2hhbmdlXCI7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1zSGlkZGVuICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdCAgaGlkZGVuID0gXCJtc0hpZGRlblwiO1xuXHQgIHZpc2liaWxpdHlDaGFuZ2UgPSBcIm1zdmlzaWJpbGl0eWNoYW5nZVwiO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09IFwidW5kZWZpbmVkXCIpIHtcblx0ICBoaWRkZW4gPSBcIndlYmtpdEhpZGRlblwiO1xuXHQgIHZpc2liaWxpdHlDaGFuZ2UgPSBcIndlYmtpdHZpc2liaWxpdHljaGFuZ2VcIjtcblx0fVxuXHQgXG5cdC8vIFdhcm4gaWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IGFkZEV2ZW50TGlzdGVuZXIgb3IgdGhlIFBhZ2UgVmlzaWJpbGl0eSBBUElcblx0aWYgKHR5cGVvZiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyID09PSBcInVuZGVmaW5lZFwiIHx8IFxuXHQgIHR5cGVvZiBkb2N1bWVudFtoaWRkZW5dID09PSBcInVuZGVmaW5lZFwiKSB7XG5cdCAgYWxlcnQoXCJUaGlzIGRlbW8gcmVxdWlyZXMgYSBicm93c2VyLCBzdWNoIGFzIEdvb2dsZSBDaHJvbWUgb3IgRmlyZWZveCwgdGhhdCBzdXBwb3J0cyB0aGUgUGFnZSBWaXNpYmlsaXR5IEFQSS5cIik7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gSGFuZGxlIHBhZ2UgdmlzaWJpbGl0eSBjaGFuZ2UgICBcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHZpc2liaWxpdHlDaGFuZ2UsIGZ1bmN0aW9uIGhhbmRsZVZpc2liaWxpdHlDaGFuZ2UoKXtcblx0XHRcdGlmIChkb2N1bWVudFtoaWRkZW5dKSB7XG5cdFx0XHRcdHNvY2tldC5kaXNjb25uZWN0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzb2NrZXQuY29ubmVjdCgpO1xuXHRcdFx0XHQvL3NvY2tldC5pby5yZWNvbm5lY3QoKTtcblx0XHRcdH1cblx0XHR9LCBmYWxzZSk7XG5cdCAgICBcblx0ICBcblx0fVxufVxuXG5mdW5jdGlvbiBpbml0KHNvY2tldFRvU2V0KXtcblx0c29ja2V0ID0gc29ja2V0VG9TZXQ7XG5cblx0bWFuYWdlVmlzaWJpbGl0eSgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdFx0XG59IiwiJ3VzZSBzdHJpY3QnXG5cbmxldCBydk1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWwvcml2ZXRzTW9kZWwnKSxcblx0Z2FtZU1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWwvZ2FtZU1vZGVsJyksXG5cdG1vdGlvbiA9IHJlcXVpcmUoJy4uL3NlbnNvcnMvZGV2aWNlbW90aW9uJyksXG5cdHNvY2tldCA9IG51bGw7XG5cbmZ1bmN0aW9uIGNob2ljZVRlYW0oZXZlbnQpe1xuXHRpZiAoZXZlbnQuc3JjRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2Nocm9tZScpKXtcblx0XHRsb2NhbFN0b3JhZ2VbJ3RlYW0nXSA9IDI7XG5cdH1lbHNle1xuXHRcdGxvY2FsU3RvcmFnZVsndGVhbSddID0gMTtcblx0fVxuXG5cdHJ2TW9kZWwuc2hvd0Nob2ljZSA9IGZhbHNlO1xuXHRydk1vZGVsLnNob3dQaG9uZSA9IHRydWU7XG5cdG1vdGlvbi5yZWdpc3RlcigpO1xufVxuXG5cbmZ1bmN0aW9uIGNhbGxCYWNrTW90aW9uKG1vdmUpe1xuXHRsZXQgdGVhbSA9IGxvY2FsU3RvcmFnZVsndGVhbSddO1xuXHRzb2NrZXQuZW1pdCgnc2Vuc29yJywge1xuXHRcdGlkIDogZ2FtZU1vZGVsLmlkLFxuXHRcdHR5cGU6J2RldmljZW1vdGlvbicsXG5cdFx0J3RlYW0nIDogdGVhbSxcblx0XHR2YWx1ZTogbW92ZVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gaW5pdChzb2NrZXRUb1NldCl7XG5cblx0c29ja2V0ID0gc29ja2V0VG9TZXQ7XG5cdHJ2TW9kZWwuY2hvaWNlVGVhbSA9IGNob2ljZVRlYW07XG5cblx0bW90aW9uLmluaXQoY2FsbEJhY2tNb3Rpb24pO1xuXG5cdHNvY2tldC5vbignY29uZmlnJywgZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRpZiAoZGF0YS50eXBlID09PSAnZ2FtZScgJiYgZGF0YS5ldmVudFR5cGUgPT09ICdiYXR0ZXJ5Jyl7XG5cdFx0XHRsb2NhbFN0b3JhZ2VbJ2dhbWUnXSA9IFwic2hha2VcIjtcblx0XHRcdHJ2TW9kZWwuZ2FtZVF1ZXN0aW9uID0gIWRhdGEuc2hvdztcblx0XHRcdHJ2TW9kZWwuZ2FtZVNoYWtlID0gZGF0YS5zaG93O1x0XG5cdFx0XHRydk1vZGVsLnNob3dDaG9pY2UgPSAhbG9jYWxTdG9yYWdlWyd0ZWFtJ107XG5cdFx0XHRydk1vZGVsLnNob3dQaG9uZSA9IGxvY2FsU3RvcmFnZVsndGVhbSddO1xuXHRcdFx0aWYgKGxvY2FsU3RvcmFnZVsndGVhbSddKXtcdFx0XHRcdFxuXHRcdFx0XHRpZiAoZGF0YS5zaG93KXtcblx0XHRcdFx0XHRtb3Rpb24ucmVnaXN0ZXIoKTtcblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0bW90aW9uLnVucmVnaXN0ZXIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0aWYgKHJ2TW9kZWwuZ2FtZVNoYWtlKXtcblx0XHRtb3Rpb24ucmVnaXN0ZXIoKTsgXG5cdH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXRcbn07IiwiJ3VzZSBzdHJpY3QnXG5cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKiBBcGlzIGV4cG9zZWRcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4qL1xuXG5mdW5jdGlvbiBkZXZpY2VNb3Rpb25BdmFpbGFibGUoKXtcblx0cmV0dXJuIHdpbmRvdy5EZXZpY2VNb3Rpb25FdmVudDtcbn1cblxuZnVuY3Rpb24gdmlicmF0aW9uQXZhaWxhYmxlKCl7XG5cdHJldHVybiBuYXZpZ2F0b3IudmlicmF0ZTtcbn1cblxuZnVuY3Rpb24gcHJveGltaXR5QXZhaWxhYmxlKCl7XG5cdHJldHVybiB3aW5kb3cuRGV2aWNlUHJveGltaXR5RXZlbnQ7XG59XG5cbmZ1bmN0aW9uIHZpc2liaWxpdHlBdmFpbGFibGUoKXtcblx0cmV0dXJuIHR5cGVvZiBkb2N1bWVudC5oaWRkZW4gIT0gXCJ1bmRlZmluZWRcIlxuXHRcdFx0fHwgdHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPSBcInVuZGVmaW5lZFwiXG5cdFx0XHR8fCB0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT0gXCJ1bmRlZmluZWRcIlxuXHRcdFx0fHwgdHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPSBcInVuZGVmaW5lZFwiXG59XG5cbmZ1bmN0aW9uIGlzQ29tcGF0KCl7XG5cdGNvbnNvbGUubG9nKCdEZXZpY2UgTW90aW9uIDogJXMnLCBkZXZpY2VNb3Rpb25BdmFpbGFibGUoKSk7XG5cdGNvbnNvbGUubG9nKCdWaWJyYXRpb24gOiAlcycsIHZpYnJhdGlvbkF2YWlsYWJsZSgpKTtcblx0Y29uc29sZS5sb2coJ1Zpc2liaWxpdHkgOiAlcycsIHZpc2liaWxpdHlBdmFpbGFibGUoKSk7XG5cdC8vY29uc29sZS5sb2coJ1Byb3hpbWl0eSA6ICVzJywgcHJveGltaXR5QXZhaWxhYmxlKCkpO1xuXHRyZXR1cm4gZGV2aWNlTW90aW9uQXZhaWxhYmxlKClcblx0ICYmIHZpYnJhdGlvbkF2YWlsYWJsZSgpXG5cdCAmJiB2aXNpYmlsaXR5QXZhaWxhYmxlKCk7XG5cdCAvLyYmIHByb3hpbWl0eUF2YWlsYWJsZSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQ29tcGF0OyIsIid1c2Ugc3RyaWN0J1xuXG5mdW5jdGlvbiByaXBwbGVFZmZlY3QoZXZlbnQpe1xuXHRsZXQgZWx0ID0gZXZlbnQuc3JjRWxlbWVudDtcblx0aWYgKCFlbHQuY2xhc3NMaXN0LmNvbnRhaW5zKCdmYWInKSlcblx0XHRyZXR1cm47XG5cbiAgICAgIFxuICAgIHZhciBkaXZQYXJlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdESVYnKSxcbiAgICBcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0RJVicpLFxuICAgIFx0eFBvcyA9IGV2ZW50LnBhZ2VYIC0gZWx0Lm9mZnNldExlZnQsXG4gICAgICBcdHlQb3MgPSBldmVudC5wYWdlWSAtIGVsdC5vZmZzZXRUb3A7XG4gICAgICBcbiAgICBkaXZQYXJlbnQuY2xhc3NMaXN0LmFkZCgncmlwcGxlJyk7XG4gICAgZGl2UGFyZW50LnN0eWxlLmhlaWdodCA9IGVsdC5jbGllbnRIZWlnaHQrXCJweFwiO1xuICAgIGRpdlBhcmVudC5zdHlsZS50b3AgPSAtKGVsdC5jbGllbnRIZWlnaHQgLyAyKStcInB4XCI7XG4gICAgZGl2UGFyZW50LnN0eWxlLndpZHRoID0gZWx0LmNsaWVudFdpZHRoK1wicHhcIjtcbiAgICAgIFxuICAgIGRpdi5jbGFzc0xpc3QuYWRkKCdyaXBwbGUtZWZmZWN0Jyk7IFxuICAgIGRpdi5zdHlsZS5oZWlnaHQgPSBlbHQuY2xpZW50SGVpZ2h0K1wicHhcIjtcbiAgICBkaXYuc3R5bGUud2lkdGggPSBlbHQuY2xpZW50SGVpZ2h0K1wicHhcIjtcbiAgICBkaXYuc3R5bGUudG9wID0gKHlQb3MgLSAoZWx0LmNsaWVudEhlaWdodC8yKSkrXCJweFwiO1xuICAgIGRpdi5zdHlsZS5sZWZ0ID0gKHhQb3MgLSAoZWx0LmNsaWVudEhlaWdodC8yKSkrXCJweFwiO1xuICAgIGRpdi5zdHlsZS5iYWNrZ3JvdW5kID0gIFwiIzQzODg0NFwiO1xuICAgICAgXG4gICAgZGl2UGFyZW50LmFwcGVuZENoaWxkKGRpdik7XG4gICAgZWx0LmFwcGVuZENoaWxkKGRpdlBhcmVudCk7XG5cbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgIGVsdC5yZW1vdmVDaGlsZChkaXZQYXJlbnQpO1xuICAgICAgfSwgMjAwMCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRyaXBwbGVFZmZlY3QgOiByaXBwbGVFZmZlY3Rcbn0iXX0=

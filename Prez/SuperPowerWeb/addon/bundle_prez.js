(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

function calculateAddress(){
	if (location.port && (location.port === "3000")){
		return "http://localhost:8000"
	}else if (location.port && location.port === "8000"){
		return "https://binomed.fr:8000";
	}else{
		return null;	
	} 
}

var address = calculateAddress();
var local = location.port && location.port === "3000";

module.exports = {
	address : address,
	local : local
}
},{}],2:[function(require,module,exports){
'use strict'

var context = null,
	PUBLIC = 1,
	WAIT = 2,
	RESP = 3,
	publicBuffer = null,
	waitBuffer = null,
	respBuffer = null,
	currentSource = null;

try{
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	context = new AudioContext();
}catch(e){
	context = null;
	console.log("No WebAPI dectect");
}

function loadSound(url, bufferToUse){
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	// Decode asynchronously
	request.onload = function() {
		context.decodeAudioData(request.response, function(buffer) {
			if (bufferToUse === PUBLIC){
		  		publicBuffer = buffer;
			}else if (bufferToUse === WAIT){
		  		waitBuffer = buffer;
			}else if (bufferToUse === RESP){
		  		respBuffer = buffer;
			}
		}, function(e){
			console.log('Error decoding file', e);
		});
	}
	request.send();
}

function loadPublicSound(){
	if(context)
		loadSound("assets/sounds/question_public_courte.mp3", PUBLIC);
}

function loadWaitSound(){
	if (context)
		loadSound("assets/sounds/attente_reponse_courte.mp3", WAIT);
}

function loadRespSound(){
	if (context)
		loadSound("assets/sounds/bonne_reponse.mp3", RESP);
}

function playSound(buffer){
	var source = context.createBufferSource(); // creates a sound source
	source.buffer = buffer;                    // tell the source which sound to play
	source.connect(context.destination);       // connect the source to the context's destination (the speakers)
	source.start(0);                           // play the source now
	return source;
}

loadPublicSound();
loadWaitSound();
loadRespSound();

/*****************************
******************************
* Apis exposed
******************************
******************************
*/

function playPublic(){
	if (context){
		stop();
		currentSource = playSound(publicBuffer);
	}
}

function playWait(){
	if (context){
		stop();
		currentSource = playSound(waitBuffer);
	}
}

function playResp(){
	if (context){
		stop();
		currentSource = playSound(respBuffer);
	}
}

function stop(){
	if (currentSource && currentSource.stop){
		currentSource.stop(0);
	}
}



module.exports = {
	playPublic : playPublic,
	playWait : playWait,
	playResp : playResp,
	stop : stop
}
},{}],3:[function(require,module,exports){
'use strict'

var config = require('../config/config'),
	audio = require('./audio'),
	socket = null,
	scoreIndex = {};



function hideQuestion(){	
	audio.stop();
	socket.emit('config',{
		type : 'game',
		eventType : 'hideQuestion'
	});
}

function changeQuestion(index){
	audio.playPublic();
	socket.emit('config',{
		type : 'game',
		eventType : 'changeQuestion',
		'index' : index,
		repA : document.querySelector(`[data-state=question-${index}] .resp.repA`).innerHTML,
		repB : document.querySelector(`[data-state=question-${index}] .resp.repB`).innerHTML,
		repC : document.querySelector(`[data-state=question-${index}] .resp.repC`).innerHTML,
		repD : document.querySelector(`[data-state=question-${index}] .resp.repD`).innerHTML,

	});
	socket.emit('config',{
		type : 'game',
		eventType : 'showNotification'		

	});
}

function processScore(index){
	let myHeaders = new Headers();
	let myInit = { method: 'GET',
           headers: myHeaders,
           mode: 'cors',
           cache: 'default' };

	let myRequest = new Request(`${config.address}/score/${index}`,myInit);
	fetch(myRequest)
	.then(function(response){
		return response.json();
	})
	.then(function(json){
		audio.playWait();
		// On ne retraire pas une question déjà traitée
		if (scoreIndex[`question_${index}`]){
			return;
		}
		
		let total = json.repA + json.repB + json.repC + json.repD;
		var ctx = document.getElementById(`chart_question_${index}`).getContext("2d");

		var data = {
		    labels: ["A", "B", "C", "D"],
		    datasets: [
		        {
		            label: "A",
		            fillColor: "rgba(220,220,220,0.5)",
		            strokeColor: "rgba(220,220,220,0.8)",
		            highlightFill: "rgba(220,220,220,0.75)",
		            highlightStroke: "rgba(220,220,220,1)",
		            data: [Math.round((json.repA / total) * 100), 
		            		Math.round((json.repB / total) * 100), 
		            		Math.round((json.repC / total) * 100), 
		            		Math.round((json.repD / total) * 100)]
		        }
		    ]
		};
		var myBarChart = new Chart(ctx).Bar(data, {
			 //Boolean - Whether grid lines are shown across the chart
	    	scaleShowGridLines : false,
	    	// String - Scale label font colour
	    	scaleFontColor: "orange",
		});

		setTimeout(function() {
			audio.playResp();
			let goodAnswerElt = document.querySelector(`[data-state=resp-question-${index}] .resp.good`);
			let anwser = goodAnswerElt.classList.contains('repA') ? 'A' :
						 goodAnswerElt.classList.contains('repB') ? 'B' :
						 goodAnswerElt.classList.contains('repC') ? 'C' : 'D';
			socket.emit('config',{
				type : 'game',
				eventType : 'answer',
				value : anwser
			});			 
			goodAnswerElt.classList.add('show');
		}, 5000);


	});
}

function init(socketToSet){
	socket = socketToSet;
	hideQuestion();

	Reveal.addEventListener('question-1', function(){
		changeQuestion(1);
	});
	Reveal.addEventListener('resp-question-1', function(){
		hideQuestion();
		processScore(1);
	});

	Reveal.addEventListener('question-2', function(){
		changeQuestion(2);
	});
	Reveal.addEventListener('resp-question-2', function(){
		hideQuestion();
		processScore(2);
	});

	Reveal.addEventListener('question-3', function(){
		changeQuestion(3);
	});
	Reveal.addEventListener('resp-question-3', function(){
		hideQuestion();
		processScore(3);
	});
	Reveal.addEventListener('quit-question', hideQuestion);

}

module.exports = {
	init : init
}
},{"../config/config":1,"./audio":2}],4:[function(require,module,exports){
'use strict'

var config = require('./config/config');

function postProdCodeHilight(){
	var array = document.querySelectorAll('code.toHilight');
	for (var i =0; i <array.length; i++){
		var length = 0;
		var textCode = array[i].innerHTML;
		do{
			length = textCode.length;
			textCode = textCode.replace('&lt;mark&gt;', '<mark>');
			textCode = textCode.replace('&lt;mark class="dilluate"&gt;', '<mark class="dilluate">');
			textCode = textCode.replace('&lt;/mark&gt;', '</mark>');
		}while(length != textCode.length);
		array[i].innerHTML = textCode;

	}
}

Reveal.addEventListener( 'ready', function( event ) {
    // event.currentSlide, event.indexh, event.indexv
	console.log('RevealJS Ready');
    
	setTimeout(function() {
    	postProdCodeHilight();
	}, 500);
	
	let inIFrame = window.top != window.self;
	
    
	if (!inIFrame && io && config.address){
        console.log("Go to condition !");
		let socketGame = io.connect(config.address);
		require('./game/prez_game').init(socketGame);
		let socketPrez = null;
		if (config.local){
			socketPrez = socketGame;   
		}else{
			socketPrez = io.connect(config.address);
		}
 
 		//setTimeout(function() {
             console.log("Before light");
			require('./sensors/light').init(socketPrez);
             console.log("Before Orientation");
			require('./sensors/orientation').init(socketPrez);
             console.log("Before DeviceMotion");
			require('./sensors/devicemotion').init(socketPrez);
             console.log("Before Voice");
			require('./sensors/voice').init(socketPrez);
             console.log("Before UserMedia");
			require('./sensors/usermedia').init(socketPrez);
 			
 		//}, 1000);
	}	
 
	
} );

},{"./config/config":1,"./game/prez_game":3,"./sensors/devicemotion":5,"./sensors/light":6,"./sensors/orientation":7,"./sensors/usermedia":8,"./sensors/voice":9}],5:[function(require,module,exports){
'use strict'

let motionEnable = false,
	motionElt = null,
	battery1Elt = null,
	battery2Elt = null,
	chargeBattery1 = 0,
	chargeBattery2 = 0,
	winner = null,
	fullValue1 = 10000,
	fullValue2 = 10000,
	mapUsersActiv = {};




function batUpdate(team, charge) {
	let col = [],
	elt = null;
  if (team === "1") {
  	elt = battery1Elt;
    // Red - Danger!
    col = ["#750900", "#c6462b", "#b74424", "#df0a00", "#590700"];
  } /*else if (charge < 40) {
    // Yellow - Might wanna charge soon...
    col = ["#754f00", "#f2bb00", "#dbb300", "#df8f00", "#593c00"];
  } */else {
  	elt = battery2Elt;
    // Green - All good!
    col = ["#316d08", "#60b939", "#51aa31", "#64ce11", "#255405"];
  }
  elt.style["background-image"] = "linear-gradient(to right, transparent 5%, " + col[0] + " 5%, " + col[0] + " 7%, " + col[1] + " 8%, " + col[1] + " 10%, " + col[2] + " 11%, " + col[2] + " " + (charge - 3) + "%, " + col[3] + " " + (charge - 2) + "%, " + col[3] + " " + charge + "%, " + col[4] + " " + charge + "%, black " + (charge + 5) + "%, black 95%, transparent 95%), linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.4) 4%, rgba(255,255,255,0.2) 7%, rgba(255,255,255,0.2) 14%, rgba(255,255,255,0.8) 14%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 41%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0.4) 86%, rgba(255,255,255,0.6) 90%, rgba(255,255,255,0.1) 92%, rgba(255,255,255,0.1) 95%, rgba(255,255,255,0.5) 98%)";
}


function init(socket){

	socket.on('sensor', function(msg){
		if (motionEnable && msg.type === 'devicemotion'){
			if (!winner && msg.team){
				let tmpUserTeam = mapUsersActiv[msg.id];
				if (!tmpUserTeam){
					mapUsersActiv[msg.id] = msg.team;
					if (msg.team === "1"){
						fullValue1+= 10000;
					}else if (msg.team === "2"){
						fullValue2+= 10000;
					}
				}				
				let percent = 0;
				if (msg.team === "1"){
					chargeBattery1+= msg.value;
					percent = Math.round((chargeBattery1 / fullValue1) *100);
				}else{
					chargeBattery2+= msg.value;
					percent = Math.round((chargeBattery2 / fullValue2) *100);
				}

				batUpdate(msg.team, Math.min(percent,90));
				if (!winner && Math.min(percent,90) === 90){
					winner = true;
					if (msg.team === "1"){
						document.querySelector('.devicemotion .win.firefox').classList.add("show");
					}else{
						document.querySelector('.devicemotion .win.chrome').classList.add("show");
					}
				}
			}
			
		}
	});
	battery1Elt = document.querySelector('#battery-1');
	battery2Elt = document.querySelector('#battery-2');

	batUpdate("1",0);
	batUpdate("2",0);

	Reveal.addEventListener( 'start-devicemotion', function(){
		socket.emit('config', {
			type:"game",
			eventType:"battery", 
			show:true
		});
		motionEnable = true;
	});

	Reveal.addEventListener( 'stop-devicemotion', function(){
		socket.emit('config', {
			type:"game",
			eventType:"battery", 
			show:false
		});
		motionEnable = false;
	});

}

module.exports = {
	init : init
}
},{}],6:[function(require,module,exports){
'use strict'

let lightEnable = false,
	lightElt = null;


// We update the css Style
function updateLight(data){
	let prefixLight = '-webkit-';
	let percent = data;
	var style = prefixLight+'radial-gradient(center, '
	    +' ellipse cover, '
	    +' rgba(198,197,145,1) 0%,'
	    +' rgba(0,0,0,1) '+percent+'%)'
	    ;
	lightElt.style.background = style;
}

function init(socket){

	socket.on('sensor', function(msg){
		if (lightEnable && msg.type === 'light'){
			updateLight(msg.value);
		}
	});
	lightElt = document.querySelector('.light-bg');

	Reveal.addEventListener( 'start-light', function(){
		lightEnable = true;
	});

	Reveal.addEventListener( 'stop-light', function(){
		lightEnable = false;
	});

}

module.exports = {
	init : init
}
},{}],7:[function(require,module,exports){
'use strict'

let orientationEnable = false, 
	lockElt = null,
	resElt = null,
	open = false;

const values = { first : {value: 50, found: false}, 
				second : {value: 80, found: false}, 
				third : {value : 10, found : false}
			};


// According to the number of unlock, we just turn the image or we open the door
function updateRotation(zAlpha, firstValue){
	if (!open){
		let delta = firstValue - zAlpha;
		let rotation = delta;
		if (delta < 0){
			rotation = firstValue+360-zAlpha;
		}		
		lockElt.style.transform = 'rotateZ('+rotation+'deg)';

		let currentValue = 100 - Math.round((rotation*100)/360);
		resElt.innerHTML = currentValue;
		if (values.first.found 
			&& values.second.found
			&& values.third.found){			
			open = true;
			document.querySelector('.sensorExample .orientation').classList.add("open");
		}else if (!values.first.found) {
			if (currentValue === values.first.value){				
				let iElt = document.querySelector('.sensorExample .orientation .resp .chevrons .first');
				iElt.classList.remove("fa-times-circle");
				iElt.classList.add("fa-chevron-down");
				values.first.found = true;
			}
		}else if (!values.second.found) {
			if (currentValue === values.second.value){
				let iElt = document.querySelector('.sensorExample .orientation .resp .chevrons .second');
				iElt.classList.remove("fa-times-circle");
				iElt.classList.add("fa-chevron-down");
				values.second.found = true;
			}
		}else if (!values.third.found) {
			if (currentValue === values.third.value){
				let iElt = document.querySelector('.sensorExample .orientation .resp .chevrons .third');
				iElt.classList.remove("fa-times-circle");
				iElt.classList.add("fa-chevron-down");
				values.third.found = true;
			}
		}
	}
	
}

function init(socket){

	socket.on('sensor', function(msg){
		if (orientationEnable && msg.type === 'orientation'){
			updateRotation(msg.value, msg.firstValue);
		}
	});

	lockElt = document.querySelector('.safe_lock');
	resElt = document.querySelector('.orientation .resp .value');

	Reveal.addEventListener( 'start-orientation', function(){
		orientationEnable = true;
	});

	Reveal.addEventListener( 'stop-orientation', function(){
		orientationEnable = false;
	});	

}


module.exports = {
	init : init
};
},{}],8:[function(require,module,exports){
'use strict'

let usermediaEnable = false,
	usermediaElt = null;



function init(socket){

	socket.on('sensor', function(msg){
		if (usermediaEnable && msg.type === 'usermedia'){
			document.getElementById('photoStream').setAttribute('src', msg.value);
		}
	});
	usermediaElt = document.querySelector('.usermedia-bg');

	Reveal.addEventListener( 'start-usermedia', function(){
		usermediaEnable = true;
	});

	Reveal.addEventListener( 'stop-usermedia', function(){
		usermediaEnable = false;
	});

}

module.exports = {
	init : init
}
},{}],9:[function(require,module,exports){
'use strict'

let voiceEnable = false,
    voiceFR = null,
    synth = null,
    recognition = null;

function populateVoiceList(){    
    let voices= synth.getVoices();    
    for(var i = 0; i < voices.length; i++){
        if (voices[i].lang === 'fr-FR'){
            voiceFR = voices[i];
            console.log("%s, %O ",voices[i].lang, voices[i]);
        }        
    }
}

function handleVoiceResults(event){
  // The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
  // The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
  // It has a getter so it can be accessed like an array
  // The first [0] returns the SpeechRecognitionResult at position 0.
  // Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
  // These also have getters so they can be accessed like arrays.
  // The second [0] returns the SpeechRecognitionAlternative at position 0.
  // We then return the transcript property of the SpeechRecognitionAlternative object 
  var finalStr = event.results[0][0].transcript;
  //diagnostic.textContent = 'Result received: ' + color + '.';
  //bg.style.backgroundColor = color;
  console.log('Confidence: ' + finalStr);
  if (finalStr.indexOf('suivant') != -1){
  	speak("Bonjour JF, j'ai compris que tu voulais passer au slide suivant, est ce que c'est bien ça ?")
    .then(()=>{
        recognition.start();
    })
    .catch(()=>{
        console.error("No voiceFR"); 
    });
  }else if (finalStr.indexOf('oui') != -1){
  	Reveal.next();
  }
}

function handleVoiceEnd(){
    // We detect the end of speechRecognition process
    console.log('End of recognition')
    recognition.stop();
};

// We detect errors
function handleVoiceError(event) {
    if (event.error == 'no-speech') {
        console.log('No Speech');
    }
    if (event.error == 'audio-capture') {
        console.log('No microphone')
    }
    if (event.error == 'not-allowed') {
        console.log('Not Allowed');
    }
};     

function speak(value, callbackEnd){
    return new Promise(function(resolve, reject){
        
        if (!voiceFR){
            reject();
        }
        var utterThis = new SpeechSynthesisUtterance(value);
        utterThis.voice = voiceFR;
        utterThis.pitch = 1;
        utterThis.rate = 1;
        utterThis.onend = function(){
            resolve();
        }
        synth.speak(utterThis);
    });
}


function init(socket){

    // Initialisation de la partie reconnaissance vocale
    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
    var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
    var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
    recognition = new SpeechRecognition();
    var grammar = '#JSGF V1.0; grammar binomed; public <binomed> = suivant | précédent | precedent | slide | diapositive | suivante | oui ;';
    var speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.continuous = true;
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.onresult = handleVoiceResults;
    recognition.onend = handleVoiceEnd;
    recognition.onerror = handleVoiceError;

    // Initialisation de la partie synthèse vocale
    synth = window.speechSynthesis;
    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    
    
    // Initialisation de la partie communuication
	socket.on('sensor', function(msg){
		if (voiceEnable && msg.type === 'voice'){
            if (msg.value === 'start'){
                recognition.start();
            }else if (msg.value === 'stop'){
                recognition.stop();
            }
		}
	});
	
	Reveal.addEventListener( 'start-webspeech', function(){
        voiceEnable = true;
        
	});

	Reveal.addEventListener( 'stop-webspeech', function(){
		voiceEnable = false;
	});

}

module.exports = {
	init : init
}
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZGRvbi9zY3JpcHRzL3ByZXovY29uZmlnL2NvbmZpZy5qcyIsImFkZG9uL3NjcmlwdHMvcHJlei9nYW1lL2F1ZGlvLmpzIiwiYWRkb24vc2NyaXB0cy9wcmV6L2dhbWUvcHJlel9nYW1lLmpzIiwiYWRkb24vc2NyaXB0cy9wcmV6L3ByZXpfc3VwZXJfcG93ZXIuanMiLCJhZGRvbi9zY3JpcHRzL3ByZXovc2Vuc29ycy9kZXZpY2Vtb3Rpb24uanMiLCJhZGRvbi9zY3JpcHRzL3ByZXovc2Vuc29ycy9saWdodC5qcyIsImFkZG9uL3NjcmlwdHMvcHJlei9zZW5zb3JzL29yaWVudGF0aW9uLmpzIiwiYWRkb24vc2NyaXB0cy9wcmV6L3NlbnNvcnMvdXNlcm1lZGlhLmpzIiwiYWRkb24vc2NyaXB0cy9wcmV6L3NlbnNvcnMvdm9pY2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnXG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUFkZHJlc3MoKXtcblx0aWYgKGxvY2F0aW9uLnBvcnQgJiYgKGxvY2F0aW9uLnBvcnQgPT09IFwiMzAwMFwiKSl7XG5cdFx0cmV0dXJuIFwiaHR0cDovL2xvY2FsaG9zdDo4MDAwXCJcblx0fWVsc2UgaWYgKGxvY2F0aW9uLnBvcnQgJiYgbG9jYXRpb24ucG9ydCA9PT0gXCI4MDAwXCIpe1xuXHRcdHJldHVybiBcImh0dHBzOi8vYmlub21lZC5mcjo4MDAwXCI7XG5cdH1lbHNle1xuXHRcdHJldHVybiBudWxsO1x0XG5cdH0gXG59XG5cbnZhciBhZGRyZXNzID0gY2FsY3VsYXRlQWRkcmVzcygpO1xudmFyIGxvY2FsID0gbG9jYXRpb24ucG9ydCAmJiBsb2NhdGlvbi5wb3J0ID09PSBcIjMwMDBcIjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGFkZHJlc3MgOiBhZGRyZXNzLFxuXHRsb2NhbCA6IGxvY2FsXG59IiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBjb250ZXh0ID0gbnVsbCxcblx0UFVCTElDID0gMSxcblx0V0FJVCA9IDIsXG5cdFJFU1AgPSAzLFxuXHRwdWJsaWNCdWZmZXIgPSBudWxsLFxuXHR3YWl0QnVmZmVyID0gbnVsbCxcblx0cmVzcEJ1ZmZlciA9IG51bGwsXG5cdGN1cnJlbnRTb3VyY2UgPSBudWxsO1xuXG50cnl7XG5cdHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG5cdGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG59Y2F0Y2goZSl7XG5cdGNvbnRleHQgPSBudWxsO1xuXHRjb25zb2xlLmxvZyhcIk5vIFdlYkFQSSBkZWN0ZWN0XCIpO1xufVxuXG5mdW5jdGlvbiBsb2FkU291bmQodXJsLCBidWZmZXJUb1VzZSl7XG5cdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcblx0cmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuXG5cdC8vIERlY29kZSBhc3luY2hyb25vdXNseVxuXHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuXHRcdFx0aWYgKGJ1ZmZlclRvVXNlID09PSBQVUJMSUMpe1xuXHRcdCAgXHRcdHB1YmxpY0J1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH1lbHNlIGlmIChidWZmZXJUb1VzZSA9PT0gV0FJVCl7XG5cdFx0ICBcdFx0d2FpdEJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH1lbHNlIGlmIChidWZmZXJUb1VzZSA9PT0gUkVTUCl7XG5cdFx0ICBcdFx0cmVzcEJ1ZmZlciA9IGJ1ZmZlcjtcblx0XHRcdH1cblx0XHR9LCBmdW5jdGlvbihlKXtcblx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciBkZWNvZGluZyBmaWxlJywgZSk7XG5cdFx0fSk7XG5cdH1cblx0cmVxdWVzdC5zZW5kKCk7XG59XG5cbmZ1bmN0aW9uIGxvYWRQdWJsaWNTb3VuZCgpe1xuXHRpZihjb250ZXh0KVxuXHRcdGxvYWRTb3VuZChcImFzc2V0cy9zb3VuZHMvcXVlc3Rpb25fcHVibGljX2NvdXJ0ZS5tcDNcIiwgUFVCTElDKTtcbn1cblxuZnVuY3Rpb24gbG9hZFdhaXRTb3VuZCgpe1xuXHRpZiAoY29udGV4dClcblx0XHRsb2FkU291bmQoXCJhc3NldHMvc291bmRzL2F0dGVudGVfcmVwb25zZV9jb3VydGUubXAzXCIsIFdBSVQpO1xufVxuXG5mdW5jdGlvbiBsb2FkUmVzcFNvdW5kKCl7XG5cdGlmIChjb250ZXh0KVxuXHRcdGxvYWRTb3VuZChcImFzc2V0cy9zb3VuZHMvYm9ubmVfcmVwb25zZS5tcDNcIiwgUkVTUCk7XG59XG5cbmZ1bmN0aW9uIHBsYXlTb3VuZChidWZmZXIpe1xuXHR2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTsgLy8gY3JlYXRlcyBhIHNvdW5kIHNvdXJjZVxuXHRzb3VyY2UuYnVmZmVyID0gYnVmZmVyOyAgICAgICAgICAgICAgICAgICAgLy8gdGVsbCB0aGUgc291cmNlIHdoaWNoIHNvdW5kIHRvIHBsYXlcblx0c291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7ICAgICAgIC8vIGNvbm5lY3QgdGhlIHNvdXJjZSB0byB0aGUgY29udGV4dCdzIGRlc3RpbmF0aW9uICh0aGUgc3BlYWtlcnMpXG5cdHNvdXJjZS5zdGFydCgwKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5IHRoZSBzb3VyY2Ugbm93XG5cdHJldHVybiBzb3VyY2U7XG59XG5cbmxvYWRQdWJsaWNTb3VuZCgpO1xubG9hZFdhaXRTb3VuZCgpO1xubG9hZFJlc3BTb3VuZCgpO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKiBBcGlzIGV4cG9zZWRcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4qL1xuXG5mdW5jdGlvbiBwbGF5UHVibGljKCl7XG5cdGlmIChjb250ZXh0KXtcblx0XHRzdG9wKCk7XG5cdFx0Y3VycmVudFNvdXJjZSA9IHBsYXlTb3VuZChwdWJsaWNCdWZmZXIpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBsYXlXYWl0KCl7XG5cdGlmIChjb250ZXh0KXtcblx0XHRzdG9wKCk7XG5cdFx0Y3VycmVudFNvdXJjZSA9IHBsYXlTb3VuZCh3YWl0QnVmZmVyKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwbGF5UmVzcCgpe1xuXHRpZiAoY29udGV4dCl7XG5cdFx0c3RvcCgpO1xuXHRcdGN1cnJlbnRTb3VyY2UgPSBwbGF5U291bmQocmVzcEJ1ZmZlcik7XG5cdH1cbn1cblxuZnVuY3Rpb24gc3RvcCgpe1xuXHRpZiAoY3VycmVudFNvdXJjZSAmJiBjdXJyZW50U291cmNlLnN0b3Ape1xuXHRcdGN1cnJlbnRTb3VyY2Uuc3RvcCgwKTtcblx0fVxufVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHBsYXlQdWJsaWMgOiBwbGF5UHVibGljLFxuXHRwbGF5V2FpdCA6IHBsYXlXYWl0LFxuXHRwbGF5UmVzcCA6IHBsYXlSZXNwLFxuXHRzdG9wIDogc3RvcFxufSIsIid1c2Ugc3RyaWN0J1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnL2NvbmZpZycpLFxuXHRhdWRpbyA9IHJlcXVpcmUoJy4vYXVkaW8nKSxcblx0c29ja2V0ID0gbnVsbCxcblx0c2NvcmVJbmRleCA9IHt9O1xuXG5cblxuZnVuY3Rpb24gaGlkZVF1ZXN0aW9uKCl7XHRcblx0YXVkaW8uc3RvcCgpO1xuXHRzb2NrZXQuZW1pdCgnY29uZmlnJyx7XG5cdFx0dHlwZSA6ICdnYW1lJyxcblx0XHRldmVudFR5cGUgOiAnaGlkZVF1ZXN0aW9uJ1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gY2hhbmdlUXVlc3Rpb24oaW5kZXgpe1xuXHRhdWRpby5wbGF5UHVibGljKCk7XG5cdHNvY2tldC5lbWl0KCdjb25maWcnLHtcblx0XHR0eXBlIDogJ2dhbWUnLFxuXHRcdGV2ZW50VHlwZSA6ICdjaGFuZ2VRdWVzdGlvbicsXG5cdFx0J2luZGV4JyA6IGluZGV4LFxuXHRcdHJlcEEgOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1zdGF0ZT1xdWVzdGlvbi0ke2luZGV4fV0gLnJlc3AucmVwQWApLmlubmVySFRNTCxcblx0XHRyZXBCIDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgW2RhdGEtc3RhdGU9cXVlc3Rpb24tJHtpbmRleH1dIC5yZXNwLnJlcEJgKS5pbm5lckhUTUwsXG5cdFx0cmVwQyA6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXN0YXRlPXF1ZXN0aW9uLSR7aW5kZXh9XSAucmVzcC5yZXBDYCkuaW5uZXJIVE1MLFxuXHRcdHJlcEQgOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1zdGF0ZT1xdWVzdGlvbi0ke2luZGV4fV0gLnJlc3AucmVwRGApLmlubmVySFRNTCxcblxuXHR9KTtcblx0c29ja2V0LmVtaXQoJ2NvbmZpZycse1xuXHRcdHR5cGUgOiAnZ2FtZScsXG5cdFx0ZXZlbnRUeXBlIDogJ3Nob3dOb3RpZmljYXRpb24nXHRcdFxuXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzU2NvcmUoaW5kZXgpe1xuXHRsZXQgbXlIZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcblx0bGV0IG15SW5pdCA9IHsgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgaGVhZGVyczogbXlIZWFkZXJzLFxuICAgICAgICAgICBtb2RlOiAnY29ycycsXG4gICAgICAgICAgIGNhY2hlOiAnZGVmYXVsdCcgfTtcblxuXHRsZXQgbXlSZXF1ZXN0ID0gbmV3IFJlcXVlc3QoYCR7Y29uZmlnLmFkZHJlc3N9L3Njb3JlLyR7aW5kZXh9YCxteUluaXQpO1xuXHRmZXRjaChteVJlcXVlc3QpXG5cdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRyZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuXHR9KVxuXHQudGhlbihmdW5jdGlvbihqc29uKXtcblx0XHRhdWRpby5wbGF5V2FpdCgpO1xuXHRcdC8vIE9uIG5lIHJldHJhaXJlIHBhcyB1bmUgcXVlc3Rpb24gZMOpasOgIHRyYWl0w6llXG5cdFx0aWYgKHNjb3JlSW5kZXhbYHF1ZXN0aW9uXyR7aW5kZXh9YF0pe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgdG90YWwgPSBqc29uLnJlcEEgKyBqc29uLnJlcEIgKyBqc29uLnJlcEMgKyBqc29uLnJlcEQ7XG5cdFx0dmFyIGN0eCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBjaGFydF9xdWVzdGlvbl8ke2luZGV4fWApLmdldENvbnRleHQoXCIyZFwiKTtcblxuXHRcdHZhciBkYXRhID0ge1xuXHRcdCAgICBsYWJlbHM6IFtcIkFcIiwgXCJCXCIsIFwiQ1wiLCBcIkRcIl0sXG5cdFx0ICAgIGRhdGFzZXRzOiBbXG5cdFx0ICAgICAgICB7XG5cdFx0ICAgICAgICAgICAgbGFiZWw6IFwiQVwiLFxuXHRcdCAgICAgICAgICAgIGZpbGxDb2xvcjogXCJyZ2JhKDIyMCwyMjAsMjIwLDAuNSlcIixcblx0XHQgICAgICAgICAgICBzdHJva2VDb2xvcjogXCJyZ2JhKDIyMCwyMjAsMjIwLDAuOClcIixcblx0XHQgICAgICAgICAgICBoaWdobGlnaHRGaWxsOiBcInJnYmEoMjIwLDIyMCwyMjAsMC43NSlcIixcblx0XHQgICAgICAgICAgICBoaWdobGlnaHRTdHJva2U6IFwicmdiYSgyMjAsMjIwLDIyMCwxKVwiLFxuXHRcdCAgICAgICAgICAgIGRhdGE6IFtNYXRoLnJvdW5kKChqc29uLnJlcEEgLyB0b3RhbCkgKiAxMDApLCBcblx0XHQgICAgICAgICAgICBcdFx0TWF0aC5yb3VuZCgoanNvbi5yZXBCIC8gdG90YWwpICogMTAwKSwgXG5cdFx0ICAgICAgICAgICAgXHRcdE1hdGgucm91bmQoKGpzb24ucmVwQyAvIHRvdGFsKSAqIDEwMCksIFxuXHRcdCAgICAgICAgICAgIFx0XHRNYXRoLnJvdW5kKChqc29uLnJlcEQgLyB0b3RhbCkgKiAxMDApXVxuXHRcdCAgICAgICAgfVxuXHRcdCAgICBdXG5cdFx0fTtcblx0XHR2YXIgbXlCYXJDaGFydCA9IG5ldyBDaGFydChjdHgpLkJhcihkYXRhLCB7XG5cdFx0XHQgLy9Cb29sZWFuIC0gV2hldGhlciBncmlkIGxpbmVzIGFyZSBzaG93biBhY3Jvc3MgdGhlIGNoYXJ0XG5cdCAgICBcdHNjYWxlU2hvd0dyaWRMaW5lcyA6IGZhbHNlLFxuXHQgICAgXHQvLyBTdHJpbmcgLSBTY2FsZSBsYWJlbCBmb250IGNvbG91clxuXHQgICAgXHRzY2FsZUZvbnRDb2xvcjogXCJvcmFuZ2VcIixcblx0XHR9KTtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRhdWRpby5wbGF5UmVzcCgpO1xuXHRcdFx0bGV0IGdvb2RBbnN3ZXJFbHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBbZGF0YS1zdGF0ZT1yZXNwLXF1ZXN0aW9uLSR7aW5kZXh9XSAucmVzcC5nb29kYCk7XG5cdFx0XHRsZXQgYW53c2VyID0gZ29vZEFuc3dlckVsdC5jbGFzc0xpc3QuY29udGFpbnMoJ3JlcEEnKSA/ICdBJyA6XG5cdFx0XHRcdFx0XHQgZ29vZEFuc3dlckVsdC5jbGFzc0xpc3QuY29udGFpbnMoJ3JlcEInKSA/ICdCJyA6XG5cdFx0XHRcdFx0XHQgZ29vZEFuc3dlckVsdC5jbGFzc0xpc3QuY29udGFpbnMoJ3JlcEMnKSA/ICdDJyA6ICdEJztcblx0XHRcdHNvY2tldC5lbWl0KCdjb25maWcnLHtcblx0XHRcdFx0dHlwZSA6ICdnYW1lJyxcblx0XHRcdFx0ZXZlbnRUeXBlIDogJ2Fuc3dlcicsXG5cdFx0XHRcdHZhbHVlIDogYW53c2VyXG5cdFx0XHR9KTtcdFx0XHQgXG5cdFx0XHRnb29kQW5zd2VyRWx0LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHR9LCA1MDAwKTtcblxuXG5cdH0pO1xufVxuXG5mdW5jdGlvbiBpbml0KHNvY2tldFRvU2V0KXtcblx0c29ja2V0ID0gc29ja2V0VG9TZXQ7XG5cdGhpZGVRdWVzdGlvbigpO1xuXG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCdxdWVzdGlvbi0xJywgZnVuY3Rpb24oKXtcblx0XHRjaGFuZ2VRdWVzdGlvbigxKTtcblx0fSk7XG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCdyZXNwLXF1ZXN0aW9uLTEnLCBmdW5jdGlvbigpe1xuXHRcdGhpZGVRdWVzdGlvbigpO1xuXHRcdHByb2Nlc3NTY29yZSgxKTtcblx0fSk7XG5cblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoJ3F1ZXN0aW9uLTInLCBmdW5jdGlvbigpe1xuXHRcdGNoYW5nZVF1ZXN0aW9uKDIpO1xuXHR9KTtcblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc3AtcXVlc3Rpb24tMicsIGZ1bmN0aW9uKCl7XG5cdFx0aGlkZVF1ZXN0aW9uKCk7XG5cdFx0cHJvY2Vzc1Njb3JlKDIpO1xuXHR9KTtcblxuXHRSZXZlYWwuYWRkRXZlbnRMaXN0ZW5lcigncXVlc3Rpb24tMycsIGZ1bmN0aW9uKCl7XG5cdFx0Y2hhbmdlUXVlc3Rpb24oMyk7XG5cdH0pO1xuXHRSZXZlYWwuYWRkRXZlbnRMaXN0ZW5lcigncmVzcC1xdWVzdGlvbi0zJywgZnVuY3Rpb24oKXtcblx0XHRoaWRlUXVlc3Rpb24oKTtcblx0XHRwcm9jZXNzU2NvcmUoMyk7XG5cdH0pO1xuXHRSZXZlYWwuYWRkRXZlbnRMaXN0ZW5lcigncXVpdC1xdWVzdGlvbicsIGhpZGVRdWVzdGlvbik7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0XG59IiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy9jb25maWcnKTtcblxuZnVuY3Rpb24gcG9zdFByb2RDb2RlSGlsaWdodCgpe1xuXHR2YXIgYXJyYXkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdjb2RlLnRvSGlsaWdodCcpO1xuXHRmb3IgKHZhciBpID0wOyBpIDxhcnJheS5sZW5ndGg7IGkrKyl7XG5cdFx0dmFyIGxlbmd0aCA9IDA7XG5cdFx0dmFyIHRleHRDb2RlID0gYXJyYXlbaV0uaW5uZXJIVE1MO1xuXHRcdGRve1xuXHRcdFx0bGVuZ3RoID0gdGV4dENvZGUubGVuZ3RoO1xuXHRcdFx0dGV4dENvZGUgPSB0ZXh0Q29kZS5yZXBsYWNlKCcmbHQ7bWFyayZndDsnLCAnPG1hcms+Jyk7XG5cdFx0XHR0ZXh0Q29kZSA9IHRleHRDb2RlLnJlcGxhY2UoJyZsdDttYXJrIGNsYXNzPVwiZGlsbHVhdGVcIiZndDsnLCAnPG1hcmsgY2xhc3M9XCJkaWxsdWF0ZVwiPicpO1xuXHRcdFx0dGV4dENvZGUgPSB0ZXh0Q29kZS5yZXBsYWNlKCcmbHQ7L21hcmsmZ3Q7JywgJzwvbWFyaz4nKTtcblx0XHR9d2hpbGUobGVuZ3RoICE9IHRleHRDb2RlLmxlbmd0aCk7XG5cdFx0YXJyYXlbaV0uaW5uZXJIVE1MID0gdGV4dENvZGU7XG5cblx0fVxufVxuXG5SZXZlYWwuYWRkRXZlbnRMaXN0ZW5lciggJ3JlYWR5JywgZnVuY3Rpb24oIGV2ZW50ICkge1xuICAgIC8vIGV2ZW50LmN1cnJlbnRTbGlkZSwgZXZlbnQuaW5kZXhoLCBldmVudC5pbmRleHZcblx0Y29uc29sZS5sb2coJ1JldmVhbEpTIFJlYWR5Jyk7XG4gICAgXG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgXHRwb3N0UHJvZENvZGVIaWxpZ2h0KCk7XG5cdH0sIDUwMCk7XG5cdFxuXHRsZXQgaW5JRnJhbWUgPSB3aW5kb3cudG9wICE9IHdpbmRvdy5zZWxmO1xuXHRcbiAgICBcblx0aWYgKCFpbklGcmFtZSAmJiBpbyAmJiBjb25maWcuYWRkcmVzcyl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiR28gdG8gY29uZGl0aW9uICFcIik7XG5cdFx0bGV0IHNvY2tldEdhbWUgPSBpby5jb25uZWN0KGNvbmZpZy5hZGRyZXNzKTtcblx0XHRyZXF1aXJlKCcuL2dhbWUvcHJlel9nYW1lJykuaW5pdChzb2NrZXRHYW1lKTtcblx0XHRsZXQgc29ja2V0UHJleiA9IG51bGw7XG5cdFx0aWYgKGNvbmZpZy5sb2NhbCl7XG5cdFx0XHRzb2NrZXRQcmV6ID0gc29ja2V0R2FtZTsgICBcblx0XHR9ZWxzZXtcblx0XHRcdHNvY2tldFByZXogPSBpby5jb25uZWN0KGNvbmZpZy5hZGRyZXNzKTtcblx0XHR9XG4gXG4gXHRcdC8vc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJlZm9yZSBsaWdodFwiKTtcblx0XHRcdHJlcXVpcmUoJy4vc2Vuc29ycy9saWdodCcpLmluaXQoc29ja2V0UHJleik7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJCZWZvcmUgT3JpZW50YXRpb25cIik7XG5cdFx0XHRyZXF1aXJlKCcuL3NlbnNvcnMvb3JpZW50YXRpb24nKS5pbml0KHNvY2tldFByZXopO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmVmb3JlIERldmljZU1vdGlvblwiKTtcblx0XHRcdHJlcXVpcmUoJy4vc2Vuc29ycy9kZXZpY2Vtb3Rpb24nKS5pbml0KHNvY2tldFByZXopO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmVmb3JlIFZvaWNlXCIpO1xuXHRcdFx0cmVxdWlyZSgnLi9zZW5zb3JzL3ZvaWNlJykuaW5pdChzb2NrZXRQcmV6KTtcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJlZm9yZSBVc2VyTWVkaWFcIik7XG5cdFx0XHRyZXF1aXJlKCcuL3NlbnNvcnMvdXNlcm1lZGlhJykuaW5pdChzb2NrZXRQcmV6KTtcbiBcdFx0XHRcbiBcdFx0Ly99LCAxMDAwKTtcblx0fVx0XG4gXG5cdFxufSApO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmxldCBtb3Rpb25FbmFibGUgPSBmYWxzZSxcblx0bW90aW9uRWx0ID0gbnVsbCxcblx0YmF0dGVyeTFFbHQgPSBudWxsLFxuXHRiYXR0ZXJ5MkVsdCA9IG51bGwsXG5cdGNoYXJnZUJhdHRlcnkxID0gMCxcblx0Y2hhcmdlQmF0dGVyeTIgPSAwLFxuXHR3aW5uZXIgPSBudWxsLFxuXHRmdWxsVmFsdWUxID0gMTAwMDAsXG5cdGZ1bGxWYWx1ZTIgPSAxMDAwMCxcblx0bWFwVXNlcnNBY3RpdiA9IHt9O1xuXG5cblxuXG5mdW5jdGlvbiBiYXRVcGRhdGUodGVhbSwgY2hhcmdlKSB7XG5cdGxldCBjb2wgPSBbXSxcblx0ZWx0ID0gbnVsbDtcbiAgaWYgKHRlYW0gPT09IFwiMVwiKSB7XG4gIFx0ZWx0ID0gYmF0dGVyeTFFbHQ7XG4gICAgLy8gUmVkIC0gRGFuZ2VyIVxuICAgIGNvbCA9IFtcIiM3NTA5MDBcIiwgXCIjYzY0NjJiXCIsIFwiI2I3NDQyNFwiLCBcIiNkZjBhMDBcIiwgXCIjNTkwNzAwXCJdO1xuICB9IC8qZWxzZSBpZiAoY2hhcmdlIDwgNDApIHtcbiAgICAvLyBZZWxsb3cgLSBNaWdodCB3YW5uYSBjaGFyZ2Ugc29vbi4uLlxuICAgIGNvbCA9IFtcIiM3NTRmMDBcIiwgXCIjZjJiYjAwXCIsIFwiI2RiYjMwMFwiLCBcIiNkZjhmMDBcIiwgXCIjNTkzYzAwXCJdO1xuICB9ICovZWxzZSB7XG4gIFx0ZWx0ID0gYmF0dGVyeTJFbHQ7XG4gICAgLy8gR3JlZW4gLSBBbGwgZ29vZCFcbiAgICBjb2wgPSBbXCIjMzE2ZDA4XCIsIFwiIzYwYjkzOVwiLCBcIiM1MWFhMzFcIiwgXCIjNjRjZTExXCIsIFwiIzI1NTQwNVwiXTtcbiAgfVxuICBlbHQuc3R5bGVbXCJiYWNrZ3JvdW5kLWltYWdlXCJdID0gXCJsaW5lYXItZ3JhZGllbnQodG8gcmlnaHQsIHRyYW5zcGFyZW50IDUlLCBcIiArIGNvbFswXSArIFwiIDUlLCBcIiArIGNvbFswXSArIFwiIDclLCBcIiArIGNvbFsxXSArIFwiIDglLCBcIiArIGNvbFsxXSArIFwiIDEwJSwgXCIgKyBjb2xbMl0gKyBcIiAxMSUsIFwiICsgY29sWzJdICsgXCIgXCIgKyAoY2hhcmdlIC0gMykgKyBcIiUsIFwiICsgY29sWzNdICsgXCIgXCIgKyAoY2hhcmdlIC0gMikgKyBcIiUsIFwiICsgY29sWzNdICsgXCIgXCIgKyBjaGFyZ2UgKyBcIiUsIFwiICsgY29sWzRdICsgXCIgXCIgKyBjaGFyZ2UgKyBcIiUsIGJsYWNrIFwiICsgKGNoYXJnZSArIDUpICsgXCIlLCBibGFjayA5NSUsIHRyYW5zcGFyZW50IDk1JSksIGxpbmVhci1ncmFkaWVudCh0byBib3R0b20sIHJnYmEoMjU1LDI1NSwyNTUsMC41KSAwJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjQpIDQlLCByZ2JhKDI1NSwyNTUsMjU1LDAuMikgNyUsIHJnYmEoMjU1LDI1NSwyNTUsMC4yKSAxNCUsIHJnYmEoMjU1LDI1NSwyNTUsMC44KSAxNCUsIHJnYmEoMjU1LDI1NSwyNTUsMC4yKSA0MCUsIHJnYmEoMjU1LDI1NSwyNTUsMCkgNDElLCByZ2JhKDI1NSwyNTUsMjU1LDApIDgwJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjIpIDgwJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjQpIDg2JSwgcmdiYSgyNTUsMjU1LDI1NSwwLjYpIDkwJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjEpIDkyJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjEpIDk1JSwgcmdiYSgyNTUsMjU1LDI1NSwwLjUpIDk4JSlcIjtcbn1cblxuXG5mdW5jdGlvbiBpbml0KHNvY2tldCl7XG5cblx0c29ja2V0Lm9uKCdzZW5zb3InLCBmdW5jdGlvbihtc2cpe1xuXHRcdGlmIChtb3Rpb25FbmFibGUgJiYgbXNnLnR5cGUgPT09ICdkZXZpY2Vtb3Rpb24nKXtcblx0XHRcdGlmICghd2lubmVyICYmIG1zZy50ZWFtKXtcblx0XHRcdFx0bGV0IHRtcFVzZXJUZWFtID0gbWFwVXNlcnNBY3Rpdlttc2cuaWRdO1xuXHRcdFx0XHRpZiAoIXRtcFVzZXJUZWFtKXtcblx0XHRcdFx0XHRtYXBVc2Vyc0FjdGl2W21zZy5pZF0gPSBtc2cudGVhbTtcblx0XHRcdFx0XHRpZiAobXNnLnRlYW0gPT09IFwiMVwiKXtcblx0XHRcdFx0XHRcdGZ1bGxWYWx1ZTErPSAxMDAwMDtcblx0XHRcdFx0XHR9ZWxzZSBpZiAobXNnLnRlYW0gPT09IFwiMlwiKXtcblx0XHRcdFx0XHRcdGZ1bGxWYWx1ZTIrPSAxMDAwMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHRsZXQgcGVyY2VudCA9IDA7XG5cdFx0XHRcdGlmIChtc2cudGVhbSA9PT0gXCIxXCIpe1xuXHRcdFx0XHRcdGNoYXJnZUJhdHRlcnkxKz0gbXNnLnZhbHVlO1xuXHRcdFx0XHRcdHBlcmNlbnQgPSBNYXRoLnJvdW5kKChjaGFyZ2VCYXR0ZXJ5MSAvIGZ1bGxWYWx1ZTEpICoxMDApO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRjaGFyZ2VCYXR0ZXJ5Mis9IG1zZy52YWx1ZTtcblx0XHRcdFx0XHRwZXJjZW50ID0gTWF0aC5yb3VuZCgoY2hhcmdlQmF0dGVyeTIgLyBmdWxsVmFsdWUyKSAqMTAwKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhdFVwZGF0ZShtc2cudGVhbSwgTWF0aC5taW4ocGVyY2VudCw5MCkpO1xuXHRcdFx0XHRpZiAoIXdpbm5lciAmJiBNYXRoLm1pbihwZXJjZW50LDkwKSA9PT0gOTApe1xuXHRcdFx0XHRcdHdpbm5lciA9IHRydWU7XG5cdFx0XHRcdFx0aWYgKG1zZy50ZWFtID09PSBcIjFcIil7XG5cdFx0XHRcdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZGV2aWNlbW90aW9uIC53aW4uZmlyZWZveCcpLmNsYXNzTGlzdC5hZGQoXCJzaG93XCIpO1xuXHRcdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmRldmljZW1vdGlvbiAud2luLmNocm9tZScpLmNsYXNzTGlzdC5hZGQoXCJzaG93XCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0fVxuXHR9KTtcblx0YmF0dGVyeTFFbHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYmF0dGVyeS0xJyk7XG5cdGJhdHRlcnkyRWx0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2JhdHRlcnktMicpO1xuXG5cdGJhdFVwZGF0ZShcIjFcIiwwKTtcblx0YmF0VXBkYXRlKFwiMlwiLDApO1xuXG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCAnc3RhcnQtZGV2aWNlbW90aW9uJywgZnVuY3Rpb24oKXtcblx0XHRzb2NrZXQuZW1pdCgnY29uZmlnJywge1xuXHRcdFx0dHlwZTpcImdhbWVcIixcblx0XHRcdGV2ZW50VHlwZTpcImJhdHRlcnlcIiwgXG5cdFx0XHRzaG93OnRydWVcblx0XHR9KTtcblx0XHRtb3Rpb25FbmFibGUgPSB0cnVlO1xuXHR9KTtcblxuXHRSZXZlYWwuYWRkRXZlbnRMaXN0ZW5lciggJ3N0b3AtZGV2aWNlbW90aW9uJywgZnVuY3Rpb24oKXtcblx0XHRzb2NrZXQuZW1pdCgnY29uZmlnJywge1xuXHRcdFx0dHlwZTpcImdhbWVcIixcblx0XHRcdGV2ZW50VHlwZTpcImJhdHRlcnlcIiwgXG5cdFx0XHRzaG93OmZhbHNlXG5cdFx0fSk7XG5cdFx0bW90aW9uRW5hYmxlID0gZmFsc2U7XG5cdH0pO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRpbml0IDogaW5pdFxufSIsIid1c2Ugc3RyaWN0J1xuXG5sZXQgbGlnaHRFbmFibGUgPSBmYWxzZSxcblx0bGlnaHRFbHQgPSBudWxsO1xuXG5cbi8vIFdlIHVwZGF0ZSB0aGUgY3NzIFN0eWxlXG5mdW5jdGlvbiB1cGRhdGVMaWdodChkYXRhKXtcblx0bGV0IHByZWZpeExpZ2h0ID0gJy13ZWJraXQtJztcblx0bGV0IHBlcmNlbnQgPSBkYXRhO1xuXHR2YXIgc3R5bGUgPSBwcmVmaXhMaWdodCsncmFkaWFsLWdyYWRpZW50KGNlbnRlciwgJ1xuXHQgICAgKycgZWxsaXBzZSBjb3ZlciwgJ1xuXHQgICAgKycgcmdiYSgxOTgsMTk3LDE0NSwxKSAwJSwnXG5cdCAgICArJyByZ2JhKDAsMCwwLDEpICcrcGVyY2VudCsnJSknXG5cdCAgICA7XG5cdGxpZ2h0RWx0LnN0eWxlLmJhY2tncm91bmQgPSBzdHlsZTtcbn1cblxuZnVuY3Rpb24gaW5pdChzb2NrZXQpe1xuXG5cdHNvY2tldC5vbignc2Vuc29yJywgZnVuY3Rpb24obXNnKXtcblx0XHRpZiAobGlnaHRFbmFibGUgJiYgbXNnLnR5cGUgPT09ICdsaWdodCcpe1xuXHRcdFx0dXBkYXRlTGlnaHQobXNnLnZhbHVlKTtcblx0XHR9XG5cdH0pO1xuXHRsaWdodEVsdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodC1iZycpO1xuXG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCAnc3RhcnQtbGlnaHQnLCBmdW5jdGlvbigpe1xuXHRcdGxpZ2h0RW5hYmxlID0gdHJ1ZTtcblx0fSk7XG5cblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoICdzdG9wLWxpZ2h0JywgZnVuY3Rpb24oKXtcblx0XHRsaWdodEVuYWJsZSA9IGZhbHNlO1xuXHR9KTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXRcbn0iLCIndXNlIHN0cmljdCdcblxubGV0IG9yaWVudGF0aW9uRW5hYmxlID0gZmFsc2UsIFxuXHRsb2NrRWx0ID0gbnVsbCxcblx0cmVzRWx0ID0gbnVsbCxcblx0b3BlbiA9IGZhbHNlO1xuXG5jb25zdCB2YWx1ZXMgPSB7IGZpcnN0IDoge3ZhbHVlOiA1MCwgZm91bmQ6IGZhbHNlfSwgXG5cdFx0XHRcdHNlY29uZCA6IHt2YWx1ZTogODAsIGZvdW5kOiBmYWxzZX0sIFxuXHRcdFx0XHR0aGlyZCA6IHt2YWx1ZSA6IDEwLCBmb3VuZCA6IGZhbHNlfVxuXHRcdFx0fTtcblxuXG4vLyBBY2NvcmRpbmcgdG8gdGhlIG51bWJlciBvZiB1bmxvY2ssIHdlIGp1c3QgdHVybiB0aGUgaW1hZ2Ugb3Igd2Ugb3BlbiB0aGUgZG9vclxuZnVuY3Rpb24gdXBkYXRlUm90YXRpb24oekFscGhhLCBmaXJzdFZhbHVlKXtcblx0aWYgKCFvcGVuKXtcblx0XHRsZXQgZGVsdGEgPSBmaXJzdFZhbHVlIC0gekFscGhhO1xuXHRcdGxldCByb3RhdGlvbiA9IGRlbHRhO1xuXHRcdGlmIChkZWx0YSA8IDApe1xuXHRcdFx0cm90YXRpb24gPSBmaXJzdFZhbHVlKzM2MC16QWxwaGE7XG5cdFx0fVx0XHRcblx0XHRsb2NrRWx0LnN0eWxlLnRyYW5zZm9ybSA9ICdyb3RhdGVaKCcrcm90YXRpb24rJ2RlZyknO1xuXG5cdFx0bGV0IGN1cnJlbnRWYWx1ZSA9IDEwMCAtIE1hdGgucm91bmQoKHJvdGF0aW9uKjEwMCkvMzYwKTtcblx0XHRyZXNFbHQuaW5uZXJIVE1MID0gY3VycmVudFZhbHVlO1xuXHRcdGlmICh2YWx1ZXMuZmlyc3QuZm91bmQgXG5cdFx0XHQmJiB2YWx1ZXMuc2Vjb25kLmZvdW5kXG5cdFx0XHQmJiB2YWx1ZXMudGhpcmQuZm91bmQpe1x0XHRcdFxuXHRcdFx0b3BlbiA9IHRydWU7XG5cdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2Vuc29yRXhhbXBsZSAub3JpZW50YXRpb24nKS5jbGFzc0xpc3QuYWRkKFwib3BlblwiKTtcblx0XHR9ZWxzZSBpZiAoIXZhbHVlcy5maXJzdC5mb3VuZCkge1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PT0gdmFsdWVzLmZpcnN0LnZhbHVlKXtcdFx0XHRcdFxuXHRcdFx0XHRsZXQgaUVsdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zZW5zb3JFeGFtcGxlIC5vcmllbnRhdGlvbiAucmVzcCAuY2hldnJvbnMgLmZpcnN0Jyk7XG5cdFx0XHRcdGlFbHQuY2xhc3NMaXN0LnJlbW92ZShcImZhLXRpbWVzLWNpcmNsZVwiKTtcblx0XHRcdFx0aUVsdC5jbGFzc0xpc3QuYWRkKFwiZmEtY2hldnJvbi1kb3duXCIpO1xuXHRcdFx0XHR2YWx1ZXMuZmlyc3QuZm91bmQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1lbHNlIGlmICghdmFsdWVzLnNlY29uZC5mb3VuZCkge1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PT0gdmFsdWVzLnNlY29uZC52YWx1ZSl7XG5cdFx0XHRcdGxldCBpRWx0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNlbnNvckV4YW1wbGUgLm9yaWVudGF0aW9uIC5yZXNwIC5jaGV2cm9ucyAuc2Vjb25kJyk7XG5cdFx0XHRcdGlFbHQuY2xhc3NMaXN0LnJlbW92ZShcImZhLXRpbWVzLWNpcmNsZVwiKTtcblx0XHRcdFx0aUVsdC5jbGFzc0xpc3QuYWRkKFwiZmEtY2hldnJvbi1kb3duXCIpO1xuXHRcdFx0XHR2YWx1ZXMuc2Vjb25kLmZvdW5kID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9ZWxzZSBpZiAoIXZhbHVlcy50aGlyZC5mb3VuZCkge1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PT0gdmFsdWVzLnRoaXJkLnZhbHVlKXtcblx0XHRcdFx0bGV0IGlFbHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2Vuc29yRXhhbXBsZSAub3JpZW50YXRpb24gLnJlc3AgLmNoZXZyb25zIC50aGlyZCcpO1xuXHRcdFx0XHRpRWx0LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS10aW1lcy1jaXJjbGVcIik7XG5cdFx0XHRcdGlFbHQuY2xhc3NMaXN0LmFkZChcImZhLWNoZXZyb24tZG93blwiKTtcblx0XHRcdFx0dmFsdWVzLnRoaXJkLmZvdW5kID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG59XG5cbmZ1bmN0aW9uIGluaXQoc29ja2V0KXtcblxuXHRzb2NrZXQub24oJ3NlbnNvcicsIGZ1bmN0aW9uKG1zZyl7XG5cdFx0aWYgKG9yaWVudGF0aW9uRW5hYmxlICYmIG1zZy50eXBlID09PSAnb3JpZW50YXRpb24nKXtcblx0XHRcdHVwZGF0ZVJvdGF0aW9uKG1zZy52YWx1ZSwgbXNnLmZpcnN0VmFsdWUpO1xuXHRcdH1cblx0fSk7XG5cblx0bG9ja0VsdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zYWZlX2xvY2snKTtcblx0cmVzRWx0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm9yaWVudGF0aW9uIC5yZXNwIC52YWx1ZScpO1xuXG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCAnc3RhcnQtb3JpZW50YXRpb24nLCBmdW5jdGlvbigpe1xuXHRcdG9yaWVudGF0aW9uRW5hYmxlID0gdHJ1ZTtcblx0fSk7XG5cblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoICdzdG9wLW9yaWVudGF0aW9uJywgZnVuY3Rpb24oKXtcblx0XHRvcmllbnRhdGlvbkVuYWJsZSA9IGZhbHNlO1xuXHR9KTtcdFxuXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0XG59OyIsIid1c2Ugc3RyaWN0J1xuXG5sZXQgdXNlcm1lZGlhRW5hYmxlID0gZmFsc2UsXG5cdHVzZXJtZWRpYUVsdCA9IG51bGw7XG5cblxuXG5mdW5jdGlvbiBpbml0KHNvY2tldCl7XG5cblx0c29ja2V0Lm9uKCdzZW5zb3InLCBmdW5jdGlvbihtc2cpe1xuXHRcdGlmICh1c2VybWVkaWFFbmFibGUgJiYgbXNnLnR5cGUgPT09ICd1c2VybWVkaWEnKXtcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwaG90b1N0cmVhbScpLnNldEF0dHJpYnV0ZSgnc3JjJywgbXNnLnZhbHVlKTtcblx0XHR9XG5cdH0pO1xuXHR1c2VybWVkaWFFbHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudXNlcm1lZGlhLWJnJyk7XG5cblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoICdzdGFydC11c2VybWVkaWEnLCBmdW5jdGlvbigpe1xuXHRcdHVzZXJtZWRpYUVuYWJsZSA9IHRydWU7XG5cdH0pO1xuXG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCAnc3RvcC11c2VybWVkaWEnLCBmdW5jdGlvbigpe1xuXHRcdHVzZXJtZWRpYUVuYWJsZSA9IGZhbHNlO1xuXHR9KTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0aW5pdCA6IGluaXRcbn0iLCIndXNlIHN0cmljdCdcblxubGV0IHZvaWNlRW5hYmxlID0gZmFsc2UsXG4gICAgdm9pY2VGUiA9IG51bGwsXG4gICAgc3ludGggPSBudWxsLFxuICAgIHJlY29nbml0aW9uID0gbnVsbDtcblxuZnVuY3Rpb24gcG9wdWxhdGVWb2ljZUxpc3QoKXsgICAgXG4gICAgbGV0IHZvaWNlcz0gc3ludGguZ2V0Vm9pY2VzKCk7ICAgIFxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2b2ljZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICBpZiAodm9pY2VzW2ldLmxhbmcgPT09ICdmci1GUicpe1xuICAgICAgICAgICAgdm9pY2VGUiA9IHZvaWNlc1tpXTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiJXMsICVPIFwiLHZvaWNlc1tpXS5sYW5nLCB2b2ljZXNbaV0pO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVZvaWNlUmVzdWx0cyhldmVudCl7XG4gIC8vIFRoZSBTcGVlY2hSZWNvZ25pdGlvbkV2ZW50IHJlc3VsdHMgcHJvcGVydHkgcmV0dXJucyBhIFNwZWVjaFJlY29nbml0aW9uUmVzdWx0TGlzdCBvYmplY3RcbiAgLy8gVGhlIFNwZWVjaFJlY29nbml0aW9uUmVzdWx0TGlzdCBvYmplY3QgY29udGFpbnMgU3BlZWNoUmVjb2duaXRpb25SZXN1bHQgb2JqZWN0cy5cbiAgLy8gSXQgaGFzIGEgZ2V0dGVyIHNvIGl0IGNhbiBiZSBhY2Nlc3NlZCBsaWtlIGFuIGFycmF5XG4gIC8vIFRoZSBmaXJzdCBbMF0gcmV0dXJucyB0aGUgU3BlZWNoUmVjb2duaXRpb25SZXN1bHQgYXQgcG9zaXRpb24gMC5cbiAgLy8gRWFjaCBTcGVlY2hSZWNvZ25pdGlvblJlc3VsdCBvYmplY3QgY29udGFpbnMgU3BlZWNoUmVjb2duaXRpb25BbHRlcm5hdGl2ZSBvYmplY3RzIHRoYXQgY29udGFpbiBpbmRpdmlkdWFsIHJlc3VsdHMuXG4gIC8vIFRoZXNlIGFsc28gaGF2ZSBnZXR0ZXJzIHNvIHRoZXkgY2FuIGJlIGFjY2Vzc2VkIGxpa2UgYXJyYXlzLlxuICAvLyBUaGUgc2Vjb25kIFswXSByZXR1cm5zIHRoZSBTcGVlY2hSZWNvZ25pdGlvbkFsdGVybmF0aXZlIGF0IHBvc2l0aW9uIDAuXG4gIC8vIFdlIHRoZW4gcmV0dXJuIHRoZSB0cmFuc2NyaXB0IHByb3BlcnR5IG9mIHRoZSBTcGVlY2hSZWNvZ25pdGlvbkFsdGVybmF0aXZlIG9iamVjdCBcbiAgdmFyIGZpbmFsU3RyID0gZXZlbnQucmVzdWx0c1swXVswXS50cmFuc2NyaXB0O1xuICAvL2RpYWdub3N0aWMudGV4dENvbnRlbnQgPSAnUmVzdWx0IHJlY2VpdmVkOiAnICsgY29sb3IgKyAnLic7XG4gIC8vYmcuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3I7XG4gIGNvbnNvbGUubG9nKCdDb25maWRlbmNlOiAnICsgZmluYWxTdHIpO1xuICBpZiAoZmluYWxTdHIuaW5kZXhPZignc3VpdmFudCcpICE9IC0xKXtcbiAgXHRzcGVhayhcIkJvbmpvdXIgSkYsIGonYWkgY29tcHJpcyBxdWUgdHUgdm91bGFpcyBwYXNzZXIgYXUgc2xpZGUgc3VpdmFudCwgZXN0IGNlIHF1ZSBjJ2VzdCBiaWVuIMOnYSA/XCIpXG4gICAgLnRoZW4oKCk9PntcbiAgICAgICAgcmVjb2duaXRpb24uc3RhcnQoKTtcbiAgICB9KVxuICAgIC5jYXRjaCgoKT0+e1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiTm8gdm9pY2VGUlwiKTsgXG4gICAgfSk7XG4gIH1lbHNlIGlmIChmaW5hbFN0ci5pbmRleE9mKCdvdWknKSAhPSAtMSl7XG4gIFx0UmV2ZWFsLm5leHQoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVWb2ljZUVuZCgpe1xuICAgIC8vIFdlIGRldGVjdCB0aGUgZW5kIG9mIHNwZWVjaFJlY29nbml0aW9uIHByb2Nlc3NcbiAgICBjb25zb2xlLmxvZygnRW5kIG9mIHJlY29nbml0aW9uJylcbiAgICByZWNvZ25pdGlvbi5zdG9wKCk7XG59O1xuXG4vLyBXZSBkZXRlY3QgZXJyb3JzXG5mdW5jdGlvbiBoYW5kbGVWb2ljZUVycm9yKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmVycm9yID09ICduby1zcGVlY2gnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdObyBTcGVlY2gnKTtcbiAgICB9XG4gICAgaWYgKGV2ZW50LmVycm9yID09ICdhdWRpby1jYXB0dXJlJykge1xuICAgICAgICBjb25zb2xlLmxvZygnTm8gbWljcm9waG9uZScpXG4gICAgfVxuICAgIGlmIChldmVudC5lcnJvciA9PSAnbm90LWFsbG93ZWQnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdOb3QgQWxsb3dlZCcpO1xuICAgIH1cbn07ICAgICBcblxuZnVuY3Rpb24gc3BlYWsodmFsdWUsIGNhbGxiYWNrRW5kKXtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgICAgXG4gICAgICAgIGlmICghdm9pY2VGUil7XG4gICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdXR0ZXJUaGlzID0gbmV3IFNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSh2YWx1ZSk7XG4gICAgICAgIHV0dGVyVGhpcy52b2ljZSA9IHZvaWNlRlI7XG4gICAgICAgIHV0dGVyVGhpcy5waXRjaCA9IDE7XG4gICAgICAgIHV0dGVyVGhpcy5yYXRlID0gMTtcbiAgICAgICAgdXR0ZXJUaGlzLm9uZW5kID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBzeW50aC5zcGVhayh1dHRlclRoaXMpO1xuICAgIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGluaXQoc29ja2V0KXtcblxuICAgIC8vIEluaXRpYWxpc2F0aW9uIGRlIGxhIHBhcnRpZSByZWNvbm5haXNzYW5jZSB2b2NhbGVcbiAgICB2YXIgU3BlZWNoUmVjb2duaXRpb24gPSBTcGVlY2hSZWNvZ25pdGlvbiB8fCB3ZWJraXRTcGVlY2hSZWNvZ25pdGlvblxuICAgIHZhciBTcGVlY2hHcmFtbWFyTGlzdCA9IFNwZWVjaEdyYW1tYXJMaXN0IHx8IHdlYmtpdFNwZWVjaEdyYW1tYXJMaXN0XG4gICAgdmFyIFNwZWVjaFJlY29nbml0aW9uRXZlbnQgPSBTcGVlY2hSZWNvZ25pdGlvbkV2ZW50IHx8IHdlYmtpdFNwZWVjaFJlY29nbml0aW9uRXZlbnRcbiAgICByZWNvZ25pdGlvbiA9IG5ldyBTcGVlY2hSZWNvZ25pdGlvbigpO1xuICAgIHZhciBncmFtbWFyID0gJyNKU0dGIFYxLjA7IGdyYW1tYXIgYmlub21lZDsgcHVibGljIDxiaW5vbWVkPiA9IHN1aXZhbnQgfCBwcsOpY8OpZGVudCB8IHByZWNlZGVudCB8IHNsaWRlIHwgZGlhcG9zaXRpdmUgfCBzdWl2YW50ZSB8IG91aSA7JztcbiAgICB2YXIgc3BlZWNoUmVjb2duaXRpb25MaXN0ID0gbmV3IFNwZWVjaEdyYW1tYXJMaXN0KCk7XG4gICAgc3BlZWNoUmVjb2duaXRpb25MaXN0LmFkZEZyb21TdHJpbmcoZ3JhbW1hciwgMSk7XG4gICAgcmVjb2duaXRpb24uZ3JhbW1hcnMgPSBzcGVlY2hSZWNvZ25pdGlvbkxpc3Q7XG4gICAgcmVjb2duaXRpb24uY29udGludW91cyA9IHRydWU7XG4gICAgcmVjb2duaXRpb24ubGFuZyA9ICdmci1GUic7XG4gICAgcmVjb2duaXRpb24uaW50ZXJpbVJlc3VsdHMgPSB0cnVlO1xuICAgIHJlY29nbml0aW9uLm9ucmVzdWx0ID0gaGFuZGxlVm9pY2VSZXN1bHRzO1xuICAgIHJlY29nbml0aW9uLm9uZW5kID0gaGFuZGxlVm9pY2VFbmQ7XG4gICAgcmVjb2duaXRpb24ub25lcnJvciA9IGhhbmRsZVZvaWNlRXJyb3I7XG5cbiAgICAvLyBJbml0aWFsaXNhdGlvbiBkZSBsYSBwYXJ0aWUgc3ludGjDqHNlIHZvY2FsZVxuICAgIHN5bnRoID0gd2luZG93LnNwZWVjaFN5bnRoZXNpcztcbiAgICBwb3B1bGF0ZVZvaWNlTGlzdCgpO1xuICAgIGlmIChzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3BlZWNoU3ludGhlc2lzLm9udm9pY2VzY2hhbmdlZCA9IHBvcHVsYXRlVm9pY2VMaXN0O1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvLyBJbml0aWFsaXNhdGlvbiBkZSBsYSBwYXJ0aWUgY29tbXVudWljYXRpb25cblx0c29ja2V0Lm9uKCdzZW5zb3InLCBmdW5jdGlvbihtc2cpe1xuXHRcdGlmICh2b2ljZUVuYWJsZSAmJiBtc2cudHlwZSA9PT0gJ3ZvaWNlJyl7XG4gICAgICAgICAgICBpZiAobXNnLnZhbHVlID09PSAnc3RhcnQnKXtcbiAgICAgICAgICAgICAgICByZWNvZ25pdGlvbi5zdGFydCgpO1xuICAgICAgICAgICAgfWVsc2UgaWYgKG1zZy52YWx1ZSA9PT0gJ3N0b3AnKXtcbiAgICAgICAgICAgICAgICByZWNvZ25pdGlvbi5zdG9wKCk7XG4gICAgICAgICAgICB9XG5cdFx0fVxuXHR9KTtcblx0XG5cdFJldmVhbC5hZGRFdmVudExpc3RlbmVyKCAnc3RhcnQtd2Vic3BlZWNoJywgZnVuY3Rpb24oKXtcbiAgICAgICAgdm9pY2VFbmFibGUgPSB0cnVlO1xuICAgICAgICBcblx0fSk7XG5cblx0UmV2ZWFsLmFkZEV2ZW50TGlzdGVuZXIoICdzdG9wLXdlYnNwZWVjaCcsIGZ1bmN0aW9uKCl7XG5cdFx0dm9pY2VFbmFibGUgPSBmYWxzZTtcblx0fSk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGluaXQgOiBpbml0XG59Il19

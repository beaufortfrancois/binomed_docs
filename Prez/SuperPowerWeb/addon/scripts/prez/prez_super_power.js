'use strict'

var config = require('./config/config');

Reveal.addEventListener( 'ready', function( event ) {
    // event.currentSlide, event.indexh, event.indexv
	


	if (io && config.address){
		let socketGame = io.connect(config.address);
		require('./game/prez_game').init(socketGame);
		let socketPrez = io.connect(config.address);
	}	

	
} );
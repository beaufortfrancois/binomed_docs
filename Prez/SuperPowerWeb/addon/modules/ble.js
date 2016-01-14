'use strict'

var eddystoneBeacon = require('eddystone-beacon'),
	server = require('./server'),
	networks = require('./ips');

const port = 9000;

var ip = networks.find(function(networkConf){
	return networkConf.name === 'wlan0';
});
if (!ip){
	ip = networks.find(function(networkConf){
		return networkConf.name === 'lo';
	})
}

var url = `http://${ip.ip}:${port}`;

url = 'http://goo.gl/KsQhXJ'; // DevFest Nantes

eddystoneBeacon.advertiseUrl(url);

server.init(port);
server.registerEvent('ble', 'changeAdvert', function(msg){
	eddystoneBeacon.advertiseUrl(msg.url);
});


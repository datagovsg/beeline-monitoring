
var hapi = require('hapi');
var server = new hapi.Server();
var beeline = require('./beeline');
var mssql = require('mssql');

server.connection({ port: 8080 });

// static files
server.register(require('inert'), (err) => {
    if (err)
        throw err;
    server.route({
        method: 'GET',
        path: '/static/{fn*}',
        handler: {
            file: function (request) {
                return 'static/' + request.params.fn;
            },
        }
    });
});

server.route({
	method: 'GET',
	path: '/',
	handler: function (request, reply) {
		reply('Hello world!');
	},
});

function defaultErrorHandler(reply) {
    return (s, err) => {
        console.log(s);
        reply(500);
    };
}

server.route({
	method: 'GET',
	path: '/current_status',
	handler: function (request, reply) {
        reply(beeline.getBusStatusByCompany());
	},
});

server.start( () => {
});
beeline.startPolling(60000);



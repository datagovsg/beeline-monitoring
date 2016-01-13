
var hapi = require('hapi');
var server = new hapi.Server();
var beeline = require('./beeline');
var mssql = require('mssql');
var boom = require('boom');

server.connection({ port: 8080 });


function defaultErrorHandler(reply) {
    return (s, err) => {
        console.log(s);
        reply(500);
    };
}

// static files
server.register(require('inert'), (err) => {
    if (err)
        throw err;
    server.route({
        method: 'GET',
        path: '/static/{fn*}',
        config: {
            auth: false,
        },
        handler: {
            file: function (request) {
                return 'static/' + request.params.fn;
            },
        }
    });
});

server.register(require('./auth'), (err) => {
    if (err) console.log(err);
});

server.route({
	method: 'GET',
	path: '/',
    config: {
        auth: false,
    },
	handler: function (request, reply) {
        reply.redirect('/static/index.html');
	},
});
server.route({
	method: 'GET',
	path: '/get_stops/{svc}',
	handler: function (request, reply) {
        if (!beeline.isServiceAuthorized(request.auth.credentials.busCompanies, request.params.svc)) {
            return reply(boom.unauthorized(''));
        }
        beeline.get_stops(request.params.svc).then( (s) => {
    		reply(s);
            }, defaultErrorHandler(reply));
	},
});
server.route({
	method: 'GET',
	path: '/get_pings/{svc}',
	handler: function (request, reply) {
        if (!beeline.isServiceAuthorized(request.auth.credentials.busCompanies, request.params.svc)) {
            return reply(boom.unauthorized(''));
        }
        beeline.get_pings(request.params.svc).then( (s) => {
    		reply(s);
            }, defaultErrorHandler(reply));
	},
});

server.route({
	method: 'GET',
	path: '/get_passengers/{svc}',
	handler: function (request, reply) {
        if (!beeline.isServiceAuthorized(request.auth.credentials.busCompanies, request.params.svc)) {
            return reply(boom.unauthorized(''));
        }
        beeline.get_passengers(request.params.svc).then( (s) => {
    		reply(s);
            }, defaultErrorHandler(reply));
	},
});


server.route({
	method: 'GET',
	path: '/current_status',
//    config: {
//        auth: false,
//    },
	handler: function (request, reply) {
        reply(beeline.getBusStatusByCompany(request.auth.credentials.busCompanies));
	},
});

server.start( () => {
});
beeline.startPolling(60000);



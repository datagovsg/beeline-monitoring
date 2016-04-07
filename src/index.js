
var hapi = require('hapi');
var server = new hapi.Server();
var beeline = require('./beeline');
var mssql = require('mssql');
var boom = require('boom');
var Joi = require('joi');
var sms = require('./sms')
var leftPad = require('left-pad')

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

server.route({
	method: 'POST',
	path: '/send_message',
    config: {
        validate: {
            payload: Joi.object({
                service: Joi.number().integer(),
                message: Joi.string().required(),
            }).unknown(),
        },
        auth: {
            strategy: 'payload-check',
            mode: 'required',
            payload: 'required',
        },
    },
	handler: async function (request, reply) {
        try {
            if (!beeline.isServiceAuthorized(request.auth.credentials.busCompanies, request.payload.service)) {
                return reply(boom.unauthorized(''));
            }

            var passengers = await beeline.get_passengers(request.payload.service);
            var phone_numbers = passengers.map(p => p.contact_no)
                .filter(x => x != null)
                .map(x => x.replace(/ /g, ''))
                .filter(pn => /\+65\d{8}/.test(pn));

            console.log(phone_numbers);

            for (let pn of phone_numbers) {
                sms.sendMessage({
                    from: 'Beeline',
                    to: pn,
                    body: request.payload.message
                });
            }


            var dt = new Date();

            sms.processNotifications(
                request.payload.service,
                `${request.auth.credentials.email}`,
                3,
                request.payload.message
                    + ' (' + leftPad(dt.getDate(), 2, 0)
                    + '-' + leftPad(dt.getMonth() + 1, 2, 0)
                    + '-' + leftPad(dt.getFullYear(), 4, 0)
                    + ')',
                undefined
                );

            reply(request.payload.message);
        }catch (err) {
            console.log(err);
            reply(500);
        }
	},
});


server.start( () => {
});
beeline.startPolling(60000);



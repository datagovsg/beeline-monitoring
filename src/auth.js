const Boom = require('boom');
var http = require('https');
var jwt = require('jsonwebtoken');
var beeline = require('./beeline');

var secret_key = 'this is the beeline operator tool secret key';

// TODO: put this into a proper database 
var authorizedUsers = {
    'amar190588@gmail.com': [2],
    'gizochan@gmail.com': [2],
    'kennyteo328@gmail.com': [1],
    'k3lv1ns1dhu@gmail.com': [2],
    'roy.busplus@gmail.com': [2],

    'angyixin@gmail.com': [0],
    'shenxj08@gmail.com': [0],
    'dreamweaver3d@gmail.com': [0], // Adrian Liew
    'daniel.ssq89@gmail.com': [0],

    'liwei@data.gov.sg': [0],
    'shangqian@data.gov.sg': [0],
    'shen_xujing@data.gov.sg': [0],
    'yixin@data.gov.sg': [0],
    'daniel_sim@data.gov.sg': [1],
    'chua_swee_chin@data.gov.sg': [1,2],

    'fengyuan.liu@gmail.com': [0],
    'vincenttbk87@gmail.com': [0],
    'juzyun@gmail.com': [0], // Ziyun
};

function verifyToken(s) {
    return jwt.verify(s, secret_key);
}

module.exports = {
    register(server, options, next) {
        server.auth.scheme('google-signin', function(server, options) {
            return {
                api: {
                    busCompanies: [],
                },
                payload(request, reply) {
                    var sessionToken = request.payload.session_token;
                    var result = {
                        credentials: {
                            name: 'Verified',
                        },
                    };

                    try {
                        var decoded = verifyToken(sessionToken);
                        var timestamp = (new Date()).getTime();

                        console.log("PAYLOAD AUTH");

                        return beeline.getUserCompanies(decoded.email)
                        .then( (companies) => {
                            result.credentials.email = decoded.email;
                            result.credentials.busCompanies = companies;
                            return reply.continue(result);
                        }, (err) => {
                            console.log(err);
                            reply(Boom.unauthorized('hello?'));
                        });
                    }
                    catch (err) {
                        console.log('Error while decoding');
                        console.log(err);
                    }
                    console.log('Not authenticated');
                    return reply(Boom.unauthorized(null, 'Custom'));
                },
                authenticate(request, reply) {
                    var result = {
                        credentials: {
                            name: 'Verified',
                        },
                    };
                    var auth_header = request.headers.authorization;
                    var parts = auth_header ? auth_header.split(' ') : [];

                    var token;

                    if (auth_header && parts.length == 2 && parts[0] == "Bearer") {
                        token = parts[1];
                    }
                    try {
                        var decoded = verifyToken(token);
                        var timestamp = (new Date()).getTime();

                        console.log("COOKIE/AUTH AUTH");
                        return beeline.getUserCompanies(decoded.email)
                        .then( (companies) => {
                            result.credentials.email = decoded.email;
                            result.credentials.busCompanies = companies;
                            return reply.continue(result);
                        }, (err) => {console.log(err); reply(Boom.unauthorized(''));});
                    }
                    catch (err) {
                        console.log('Error while decoding');
                        console.log(err);
                    }
                    return reply(Boom.unauthorized(null, 'Custom'));
                },
            };
        });
        server.auth.scheme('payload-check', function(server, options) {
            return {
                api: {
                    busCompanies: [],
                },
                payload(request, reply) {
                    console.log(request.payload);

                    var sessionToken = request.payload.session_token;
                    var result = {
                        credentials: {
                            name: 'Verified',
                        },
                    };

                    try {
                        var decoded = verifyToken(sessionToken);
                        var timestamp = (new Date()).getTime();

                        return beeline.getUserCompanies(decoded.email)
                        .then( (companies) => {
                            request.auth.credentials.email = decoded.email;
                            request.auth.credentials.busCompanies = companies;

                            console.log(result);

                            return reply.continue();
                        }, (err) => {
                            console.log(err);
                            console.log('Why?');
                            reply(Boom.unauthorized('hello?'));
                        });
                    }
                    catch (err) {
                        console.log('Error while decoding');
                        console.log(err);
                    }
                    console.log('Not authenticated');
                    return reply(Boom.unauthorized(null, 'Custom'));
                },
                authenticate(request, reply) {
                    return reply.continue({credentials: {}});
                },
            };
        });

        server.route({
            method: 'GET',
            path: '/verify_token',
            config: {
                auth: false,
            },
            handler: function (request, reply) {
                var req = http.get(
                    'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + encodeURIComponent(request.query.id_token),
                    function (res) {
                        var chk = '';
                        res.on('data', (chunk) => {
                            chk += chunk;
                        });
                        res.on('end', () => {
                            var obj = JSON.parse(chk);

                            if (obj.error_description) {
                                reply(Boom.unauthorized("Invalid token"));
                            }
                            else {
                                var sessionToken = jwt.sign({
                                        email: obj.email.toLowerCase(),
                                        timestamp: (new Date()).getTime(),
                                    }, secret_key, {
                                        expiresIn: '24h',   
                                    });

                                reply({
                                    session_token: sessionToken
                                })
                                .state('sessionToken', sessionToken);
                                ;
                            }
                        });
                    }
                );
            },
        });

        server.auth.strategy('google-signin', 'google-signin', true);
        server.auth.strategy('payload-check', 'payload-check', false);

        server.route({
            method: 'GET',
            path: '/checkLoggedIn',
            config: {
                auth: {
                    mode: 'required',
                }
            },
            handler: function (req, rep) {
                rep('this is a handler');
            },
        });


        next();
    },
};

module.exports.register.attributes = {
    name: 'BeelineAuthentication',
    version: '1.0.0',
};

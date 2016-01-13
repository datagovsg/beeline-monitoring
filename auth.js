const Boom = require('boom');
var http = require('https');
var jwt = require('jsonwebtoken');

var secret_key = 'this is the beeline operator tool secret key';

// TODO: put this into a proper database 
var authorizedUsers = {
    'amar190588@gmail.com': [2],
    'gizochan@gmail.com': [2],
    'kennyteo328@gmail.com': [1],

    'angyixin@gmail.com': [0],
    'shenxj08@gmail.com': [0],
    'dreamweaver3d@gmail.com': [0], // Adrian Liew
    'daniel.ssq89@gmail.com': [0],

    'liwei@data.gov.sg': [0],
    'shangqian@data.gov.sg': [0],
    'shen_xujing@data.gov.sg': [0],
    'yixin@data.gov.sg': [0],
    'daniel_sim@data.gov.sg': [0],

    'fengyuan.liu@gmail.com': [0],
    'vincenttbk87@gmail.com': [0],
    'juzyun@gmail.com': [0], // Ziyun
};


module.exports = {
    register(server, options, next) {
        server.auth.scheme('google-signin', function(server, options) {
            return {
                api: {
                    busCompanies: [],
                },
                authenticate(request, reply) {
                    var result = {
                        credentials: {
                            name: 'Verified',
                        },
                    };
                    var auth_header = request.headers.authorization;
                    var parts = auth_header ? auth_header.split(' ') : [];

                    if (auth_header && parts.length == 2 && parts[0] == "Bearer") {
                        try {
                            var decoded = jwt.verify(parts[1], secret_key);
                            var timestamp = (new Date()).getTime();

                            result.credentials.email = decoded.email;
                            result.credentials.busCompanies = authorizedUsers[decoded.email] || [];

                            if (timestamp - decoded.timestamp <= 24 * 60 * 60 * 1000) {
                                /* expires after one day */
                                return reply.continue(result);
                            }
                        }
                        catch (err) {
                            console.log('Error while decoding');
                            console.log(err);
                        }
                    }
                    return reply(Boom.unauthorized(null, 'Custom'));
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
                                reply({
                                    session_token: jwt.sign({
                                        email: obj.email,
                                        timestamp: (new Date()).getTime(),
                                    }, secret_key)
                                });
                            }
                        });
                    }
                );
            },
        });

        server.auth.strategy('google-signin', 'google-signin', true);

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

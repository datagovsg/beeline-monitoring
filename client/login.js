
module.exports.authAjax = function (path, opts) {
    opts.headers = opts.headers || {};

    opts.headers.Authorization = 'Bearer ' + localStorage['session_token'];

    return $.ajax(path, opts);
};

module.exports.checkLoggedIn = function () {
        console.log("WHATEVER");
    exports.authAjax('/checkLoggedIn', {})
    .then( /* success */ function (what) {
        console.log(what);
    }, function (data, status) { /* failure */
        console.log(data);
        if (data.status == 401) {
            window.location.href = '/static/login.html';
        }
    })
};



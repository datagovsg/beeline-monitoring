
var env = require('./env.json')

export function authAjax(path, opts) {
    opts = opts || {}
    opts.headers = opts.headers || {};

    if (localStorage.session_token) {
      opts.headers.Authorization = 'Bearer ' + localStorage['session_token'];
    }
    return $.ajax(env.BACKEND_URL + path, opts);
};

export function checkLoggedIn() {
    authAjax('/admins', {})
    .then(function (what) {
    }, function (data, status) { /* failure */
        if (data.status == 403) {
            delete localStorage.session_token
            login()
        }
    })
};

export function logOut() {
    delete localStorage.profile
    delete localStorage.id_token
    delete localStorage.session_token

    login();
}

function login() {
  var lock = new Auth0Lock(env.AUTH0_CID, env.AUTH0_DOMAIN);

  lock.show((err, profile, token) => {
    if (err) {
        console.log(err);
    }

    // Set the token and user profile in local storage
    LocalStorage.setItem('profile', profile);
    LocalStorage.setItem('id_token', token);
    LocalStorage.setItem('session_token', token)
  });
}


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
}

function login() {
  var lock = new Auth0Lock(env.AUTH0_CID, env.AUTH0_DOMAIN);

  lock.show((err, profile, token) => {

    authAjax('/admins/auth/login', {
      data: {
        token: token,
      },
      method: 'POST',
    })
    .then((data) => {
      // Set the token and user profile in local storage
      localStorage.setItem('profile', profile);
      localStorage.setItem('id_token', token);
      localStorage.setItem('session_token', data.sessionToken)
    })
    .then(null, (err) => {
        console.error(err);
    });
  });
}

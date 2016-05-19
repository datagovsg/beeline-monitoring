
export function authAjax(path, opts) {
    opts = opts || {}
    opts.headers = opts.headers || {};

    if (localStorage.session_token) {
      opts.headers.Authorization = 'Bearer ' + localStorage['session_token'];
    }
    return $.ajax('http://localhost:8080' + path, opts);
};

export function checkLoggedIn() {
    authAjax('/admins', {})
    .then(function (what) {
    }, function (data, status) { /* failure */
        console.log(data);
        if (data.status == 403) {
            delete localStorage.session_token
            login()
        }
    })
};

function login() {
  var lock = new Auth0Lock('TzhwfQaMFaeo350IL2NqygkNHb450fVp', 'daniel-sim.auth0.com');

  lock.show((err, profile, token) => {

    authAjax('/admins/auth/login', {
      data: {
        token: token,
      },
      method: 'POST',
    })
    .then((data) => {
        if(err) {
          console.log(err)
        } else {
          // Set the token and user profile in local storage
          localStorage.setItem('profile', JSON.stringify(profile));
          localStorage.setItem('id_token', token);
          localStorage.setItem('session_token', data.sessionToken)
        }
    })
  });
}

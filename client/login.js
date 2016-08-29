var env = require('./env.json')
var jwt_decode = require('jwt-decode');

export function authAjax(path, opts) {
    opts = opts || {}
    opts.headers = opts.headers || {};

    if (localStorage.session_token) {
      opts.headers.Authorization = 'Bearer ' + localStorage['session_token'];
    }
    return $.ajax(env.BACKEND_URL + path, opts);
};

export async function checkLoggedIn() {
  try {
    var roleData = jwt_decode(localStorage.session_token).app_metadata;

    if (roleData.roles.indexOf('superadmin') !== -1) {
      return;
    }
    else if (roleData.roles.indexOf('admin') !== -1) {
      var adminId = roleData.adminId;

      try {
        await new Promise((resolve, reject) => {
          authAjax(`/admins/${adminId}`, {})
        });
      } catch (err) {
        console.log(err)
        if (err.status === 403) throw err;
        // otherwise we cannot be sure why the check failed.
        // e.g. poor connection
      }
    }
    else {
      throw new Error("Problem with your token")
    }
  }
  catch (err) {
    console.log(err)
    login();
  }
};

export function logOut() {
    delete localStorage.profile
    delete localStorage.id_token
    delete localStorage.session_token

    login();
}

function login() {
  authAjax('/auth/credentials')
  .then((response) => {
    var lock = new Auth0Lock(response.cid, response.domain);

    lock.show({
      authParams: {
        scope: 'openid name email app_metadata user_id'
      }
    }, (err, profile, token) => {
      if (err) {
        console.error(err);
        return;
      }

      localStorage.setItem('profile', profile);
      localStorage.setItem('id_token', token);
      localStorage.setItem('session_token', token)

      window.location.reload();
    });
  });
}

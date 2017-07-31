const axios = require('axios')
const env = require('./env.json')
const jwt_decode = require('jwt-decode');
const _ = require('lodash')

/////////// Functions

export function authAjax(path, opts) {
    opts = opts || {}
    opts.headers = opts.headers || {};

    if (localStorage.session_token) {
      opts.headers.Authorization = 'Bearer ' + localStorage.session_token;
    }
    opts.url = env.BACKEND_URL + path;
    return axios(opts);
};

export function refreshTokenIfNecessary() {
  try {
    if (!localStorage.refresh_token) throw new Error();

    var currentToken = jwt_decode(localStorage.id_token);

    // Check expiry
    // Set a timeout to get a new token when it's closer to expiry
    if (currentToken.exp * 1000 - Date.now() > 3600*1000) {
      console.log("Will request token in future")
      setTimeout(refreshTokenIfNecessary, 3500*1000);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!localStorage.refresh_token) reject(new Error())
      auth0.refreshToken(localStorage.refresh_token, (err, result) => {
        if (err) return reject(err);

        localStorage.id_token = localStorage.session_token = result.id_token;

        resolve();
      })
    })
  } catch (err) {
  }
}

export async function checkLoggedIn() {
  refreshTokenIfNecessary();
  try {
    await authAjax(`/monitoring`)
    return;
  } catch (err) {
    console.log(err);
    if (_.get(err, 'response.status') !== 403) {
      throw err;
    }
    login();
  }
}

export var lock;
export var auth0;

export function initAuth0() {
  auth0 = new Auth0({
    clientID: env.AUTH0_CID,
    domain: env.AUTH0_DOMAIN
  });
  lock = new Auth0Lock(env.AUTH0_CID, env.AUTH0_DOMAIN, {
    auth: {
      params: {
        scope: 'openid name email app_metadata user_id offline_access'
      }
    }
  });

  function authenticated(what) {
    localStorage.setItem('id_token', what.idToken);
    localStorage.setItem('session_token', what.idToken)
    localStorage.setItem('refresh_token', what.refreshToken)

    lock.getProfile(what.idToken, (err, profile) => {
      if (!err) {
        localStorage.setItem('profile', JSON.stringify(profile))
      }
    });
  }

  lock.on('authenticated', authenticated);

  lock.on('hash_parsed', (result) => {
    console.log(result, 'hash_parsed');
    if (result === null) {
      checkLoggedIn();
    }
  })
}

export function logOut() {
    delete localStorage.profile
    delete localStorage.id_token
    delete localStorage.session_token
    delete localStorage.refresh_token
    window.location.reload();
}

export function login() {
  // Else
  lock.show();
}

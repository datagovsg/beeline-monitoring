const axios = require('axios')
const env = require('./env.json')
const jwt_decode = require('jwt-decode')
const { Auth0Lock } = require('auth0-lock')
const _ = require('lodash')

import Vue from 'vue'

const AUTH0_SCOPE = 'openid name email app_metadata user_id offline_access'

export let lock

/////////// Functions

export function authAjax(path, opts) {
    opts = opts || {}
    opts.headers = opts.headers || {};
    opts.baseURL = opts.baseURL || env.BACKEND_URL;

    if (localStorage.session_token) {
      opts.headers.Authorization = 'Bearer ' + localStorage.session_token;
    }
    opts.url = path;
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
      lock.checkSession({
        scope: AUTH0_SCOPE,
      }, (err, result) => {
        if (err) return reject(err)

        localStorage.id_token = localStorage.session_token = result.idToken
        resolve(result)
      })
    })
  } catch (err) {
  }
}

export async function checkLoggedIn() {
  refreshTokenIfNecessary();
  try {
    await authAjax(`/admins/whoami`)
    return;
  } catch (err) {
    console.log(err);
    if (_.get(err, 'response.status') !== 403) {
      throw err;
    }
    login();
  }
}

/* Use the reactivity features of Vue to detect when we need to reload data,
e.g. vehicles */
export let sharedData = new Vue({
  data: {
    vehicles: null,
    authData: {
      idToken: localStorage.id_token,
      refreshToken: localStorage.refresh_token,
    },
  },
  methods: {
    fetchVehicles () {
      if (!this.vehiclesById && !this.$vehiclesPromise) {
        this.$vehiclesPromise = authAjax(`/vehicles`)
          .then((result) => {
            this.vehiclesById = _.keyBy(result.data, 'id')
          })
          .catch(() => {
          })
          .then((result) => {
            this.$vehiclesPromise = null
          })
      }
    }
  }
})

// Use the following promise to signal that user just logged in
let postLoginPromiseResolver
export const postLoginPromise = new Promise((resolve) => postLoginPromiseResolver = resolve)

export function initAuth0() {
  lock = new Auth0Lock(env.AUTH0_CID, env.AUTH0_DOMAIN, {
    auth: {
      responseType: 'token id_token',
      params: {
        scope: AUTH0_SCOPE,
      }
    }
  });

  function authenticated(what) {
    localStorage.setItem('id_token', what.idToken);
    localStorage.setItem('session_token', what.idToken)

    lock.getUserInfo(what.accessToken, (err, profile) => {
      if (!err) {
        localStorage.setItem('profile', JSON.stringify(profile))
      }
    });

    sharedData.authData = what
    lock.hide()
  }

  lock.on('authenticated', authenticated);

  lock.on('hash_parsed', (result) => {
    console.log(result, 'hash_parsed');
    postLoginPromiseResolver()
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

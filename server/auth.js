/*
 * DevGuide auth
 */

// jshint node: true

'use strict';

var OAuth2 = require('./oauth2').OAuth2;
var config = require('./config');
var Q = require('q');

// Config data from config.js file
var clientId = config.clientId;
var clientSecret = config.clientSecret;
var idmURL = config.idmUrl;
var responseType = config.responseType;
var callbackURL = config.callbackUrl;

var oauth = new OAuth2(clientId,
  clientSecret,
  idmURL,
  '/oauth2/authorize',
  '/oauth2/token',
  callbackURL);

// This is the callback url for the application.  The IdM will
// redirect the user here after a successful authentication
exports.login = function(req, res) {
  // Using the access code goes again to the IDM to obtain the accessToken
  oauth.getOAuthAccessToken(req.query.code, function(e, results) {

    if (results === undefined) {
      res.status(404);
      res.send('Auth token not received in results.');
      console.log('Auth token not received in results.');
    } else {
      // jshint camelcase: false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      // Stores the access_token in a session cookie
      req.session.access_token = results.access_token;
      // jshint camelcase: true
      // jscs:enable
      res.redirect('/');
    }
  });
};

// Redirect the user to the IdM for authentication
exports.auth = function(req, res) {
  var path = oauth.getAuthorizeUrl(responseType);
  res.redirect(path);
};

// Logout from the application
exports.logout = function(req, res) {
  // jshint camelcase: false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  req.session.access_token = undefined;
  // jshint camelcase: true
  // jscs:enable
  res.redirect('/');
};

exports.getUserData = function(req, res) {
  var url = idmURL + '/user/';
  var user = null;
  // jshint camelcase: false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  oauth.get(url, req.session.access_token,
  // jshint camelcase: true
  // jscs:enable
    function(e, response) {
      if (e) {
        res.statusCode = e.statusCode;
        res.json(JSON.parse(e.data));
      } else {
        user = JSON.parse(response);
        res.json(user);
      }
    }
  );
};

exports.validateRequest = function(req, res, next) {
  var url = idmURL + '/user/';
  var user = null;
  // jshint camelcase: false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  var token = req.session.access_token ||
  (req.params.access_token) ||
  req.headers['X-Auth-Token'] ||
  req.headers['x-auth-token'];
  oauth.get(url, token,
  // jshint camelcase: true
  // jscs:enable
    function(e, response) {
      if (e) {
        console.log(e);
        res.statusCode = e.statusCode;
        res.json(JSON.parse(e.data));
      } else {
        console.log(JSON.parse(response));
        next();
      }
    }
  );
};

exports.getUserDataPromise = function(req) {
  var url = idmURL + '/user/';
  var user = null;
  // jshint camelcase: false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  var token = req.session.access_token ||
  (req.params.access_token) ||
  req.headers['X-Auth-Token'] ||
  req.headers['x-auth-token'];
  var deferred = Q.defer();
  oauth.get(url, token,
  // jshint camelcase: true
  // jscs:enable
    function(e, response) {
      if (e) {
        deferred.reject(JSON.parse(e.data));
      } else {
        user = JSON.parse(response);
        deferred.resolve(user);
      }
    }
  );
  return deferred.promise;
};

// jshint node: true

var config = {};

// URL to the FI-WARE Identity Management GE
// default: https://account.lab.fi-ware.org
config.idmUrl = 'https://IDM_HOSTNAME';

// Oauth2 configuration
// Found on the application profile page after registering
// the application on the FI-WARE Identity Management GE

// Client ID for the application
config.clientId = 'CLIENT_ID';

// Client Secret for the application
config.clientSecret = 'CLIENT_SECRET';

// Callback URL for the application
// TODO: make callback URL configurable as the others
config.callbackUrl = 'http://compose_devguide_1/login';

config.responseType = 'code';

// Fiware service for the app
config.fiwareService = 'FIWARE_SERVICE';

// Orion
config.orionPort = 'ORION_PORT';
config.orionHostname = 'ORION_HOSTNAME';
config.orionPepEnabled = 'ORION_PEP_ENABLED';

// IDAS
config.idasHostname = 'IDAS_HOSTNAME';
config.idasPort = 'IDAS_PORT';
config.idasFiwareService = 'IDAS_FIWARE_SERVICE';
config.idasFiwareServicePath = 'IDAS_FIWARE_SERVICE_PATH';
config.idasApiKey = 'IDAS_API_KEY';
// Do not use the pep proxy (yet) for IDAS.
config.idasContextBrokerHostname = 'ORION_NO_PROXY_HOSTNAME';

module.exports = config;

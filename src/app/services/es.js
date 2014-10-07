define([
  'angular',
  'config',
], function (angular, config) {
  'use strict';

  var module = angular.module('kibana.services');

  /* 
  	Init elasticsearch.js client
  	http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/api-reference.html
  */
  module.service('es', function (esFactory) {
    return esFactory({ 
      host: config.elasticsearch,
      log: 'info'
    });
  });

});

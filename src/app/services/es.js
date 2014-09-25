define([
  'angular'
], function (angular) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('es', function (esFactory) {
    return esFactory({ 
      host: 'localhost:9200',
      log: 'trace'
    });
  });

});

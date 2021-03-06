define([
  'angular',
  'lodash'
],
function (angular, _) {
  'use strict';

  var module = angular.module('kibana.controllers');

  module.controller('dashLoader', function($scope, $rootScope, $http, timer, dashboard, alertSrv, $location) {
    $scope.init = function() {
      $scope.gist_pattern = /(^\d{5,}$)|(^[a-z0-9]{10,}$)|(gist.github.com(\/*.*)\/[a-z0-9]{5,}\/*$)/;
      $scope.gist = $scope.gist || {};
      $scope.elasticsearch = $scope.elasticsearch || {};
    };

    $scope.showDropdown = function(type) {
      if(_.isUndefined(dashboard.current.loader)) {
        return true;
      }

      var _l = dashboard.current.loader;
      if(type === 'load') {
        return (_l.load_elasticsearch || _l.load_gist || _l.load_local);
      }
      if(type === 'save') {
        return (_l.save_elasticsearch || _l.save_gist || _l.save_local || _l.save_default);
      }
      if(type === 'share') {
        return (_l.save_temp);
      }
      return false;
    };

    $scope.set_default = function() {
      if(dashboard.set_default($location.path())) {
        alertSrv.set('Home Set','This page has been set as your default Kibana dashboard','success',5000);
      } else {
        alertSrv.set('Incompatible Browser','Sorry, your browser is too old for this feature','error',5000);
      }
    };

    $scope.purge_default = function() {
      if(dashboard.purge_default()) {
        alertSrv.set('Local Default Clear','Your Kibana default dashboard has been reset to the default',
          'success',5000);
      } else {
        alertSrv.set('Incompatible Browser','Sorry, your browser is too old for this feature','error',5000);
      }
    };

    $scope.elasticsearch_save = function(type,ttl) {
      dashboard.elasticsearch_save(
        type,
        ($scope.elasticsearch.title || dashboard.current.title),
        (dashboard.current.loader.save_temp_ttl_enable ? ttl : false)
      ).then(
        function(result) {
        if(!_.isUndefined(result._id)) {
          alertSrv.set('Dashboard Saved','This dashboard has been saved to Elasticsearch as "' +
            result._id + '"','success',5000);
          if(type === 'temp') {
            $scope.share = dashboard.share_link(dashboard.current.title,'temp',result._id);
          }
        } else {
          alertSrv.set('Save failed','Dashboard could not be saved to Elasticsearch','error',5000);
        }
      });
    };

    $scope.toggleDashboardLoaderMenu = function ($event) {
      $event.preventDefault();
      $rootScope.$broadcast('toggleDashboardLoaderMenu');
    };

  });

});

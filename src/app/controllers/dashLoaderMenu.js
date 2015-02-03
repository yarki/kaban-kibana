/**
 * Created by Vitali_Kuzmich on 03.02.2015.
 */
define(
  [
    'angular',
    'lodash'
  ],
  function (angular, _) {
    "use strict";

    angular
      .module('kibana.controllers')
      .controller('dashLoaderMenu', function ($scope, dashboard, alertSrv) {
        $scope.visible = false;

        $scope.$on('toggleDashboardLoaderMenu', function (event, loader) {
          $scope.visible = !$scope.visible;
          $scope.elasticsearch = {};
          $scope.loader = loader;

          $scope.elasticsearch_dblist('title:*');
        });

        $scope.hideDashboardLoaderMenu = function() {
          $scope.visible = false;
        };

        $scope.elasticsearch_delete = function (id) {
          dashboard.elasticsearch_delete(id).then(
            function (result) {
              if (!_.isUndefined(result)) {
                if (result.found) {
                  alertSrv.set('Dashboard Deleted', id + ' has been deleted', 'success', 5000);
                  // Find the deleted dashboard in the cached list and remove it
                  var toDelete = _.where($scope.elasticsearch.dashboards, {_id: id})[0];
                  $scope.elasticsearch.dashboards = _.without($scope.elasticsearch.dashboards, toDelete);
                } else {
                  alertSrv.set('Dashboard Not Found', 'Could not find ' + id + ' in Elasticsearch', 'warning', 5000);
                }
              } else {
                alertSrv.set('Dashboard Not Deleted', 'An error occurred deleting the dashboard', 'error', 5000);
              }
            }
          );
        };

        $scope.elasticsearch_dblist = function (query) {
          dashboard
            .elasticsearch_list(query, $scope.loader.load_elasticsearch_size)
            .then(function (result) {
              if (!_.isUndefined(result.hits)) {
                $scope.hits = result.hits.total;
                $scope.elasticsearch.dashboards = result.hits.hits;
              }
            });
        };

        $scope.save_gist = function () {
          dashboard.save_gist($scope.gist.title).then(
            function (link) {
              if (!_.isUndefined(link)) {
                $scope.gist.last = link;
                alertSrv.set('Gist saved', 'You will be able to access your exported dashboard file at ' +
                '<a href="' + link + '">' + link + '</a> in a moment', 'success');
              } else {
                alertSrv.set('Save failed', 'Gist could not be saved', 'error', 5000);
              }
            });
        };

        $scope.gist_dblist = function (id) {
          dashboard.gist_list(id).then(
            function (files) {
              if (files && files.length > 0) {
                $scope.gist.files = files;
              } else {
                alertSrv.set('Gist Failed', 'Could not retrieve dashboard list from gist', 'error', 5000);
              }
            });
        };
      });
  }
);
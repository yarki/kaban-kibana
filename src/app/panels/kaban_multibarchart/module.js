/** @scratch /panels/5
 *
 * include::panels/terms.asciidoc[]
 */

/** @scratch /panels/terms/0
 *
 * == terms
 * Status: *Stable*
 *
 * A table, bar chart or pie chart based on the results of an Elasticsearch terms facet.
 *
 */
define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'kbn',
  'jquery.flot.stack',
  'jquery.flot.stackpercent'
],
function (angular, app, _, $, kbn) {
  'use strict';

  var module = angular.module('kibana.panels.kaban_multibarchart', []);
  app.useModule(module);

  module.controller('kaban_multibarchart', function($scope, querySrv, dashboard, filterSrv, fields, es) {
    $scope.panelMeta = {
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      status  : "Experimental",
      description : "Multiple measures bar chart"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/terms/5
       * === Parameters
       *
       * field:: The field on which to computer the facet
       */
      field   : '_type',
      /** @scratch /panels/terms/5
       * exclude:: terms to exclude from the results
       */
      exclude : [],
      /** @scratch /panels/terms/5
       * missing:: Set to false to disable the display of a counter showing how much results are
       * missing the field
       */
      missing : true,
      /** @scratch /panels/terms/5
       * other:: Set to false to disable the display of a counter representing the aggregate of all
       * values outside of the scope of your +size+ property
       */
      other   : true,
      /** @scratch /panels/terms/5
       * size:: Show this many terms
       */
      size    : 10,
      /** @scratch /panels/terms/5
       * order:: In terms mode: count, term, reverse_count or reverse_term,
       * in terms_stats mode: term, reverse_term, count, reverse_count,
       * total, reverse_total, min, reverse_min, max, reverse_max, mean or reverse_mean
       */
      order   : 'count',
      style   : { "font-size": '10pt'},
      /** @scratch /panels/terms/5
       * lables:: In pie chart mode, draw labels in the pie slices
       */
      labels  : true,
      /** @scratch /panels/terms/5
       * arrangement:: In bar or pie mode, arrangement of the legend. horizontal or vertical
       */
      arrangement : 'vertical',
      /** @scratch /panels/terms/5
       * chart:: table, bar or pie
       */
      chart       : 'bar',
      /** @scratch /panels/terms/5
       * counter_pos:: The location of the legend in respect to the chart, above, below, or none.
       */
      counter_pos : 'below',
      /** @scratch /panels/terms/5
       * spyable:: Set spyable to false to disable the inspect button
       */
      spyable     : true,
      /** @scratch /panels/terms/5
       *
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      },
      valueField  : '',
      aggFunction : 'sum'
    };

    _.defaults($scope.panel,_d);

    $scope.init = function() {
      $scope.$on('refresh', function() {
        $scope.get_data();
      });
      $scope.get_data();

      $scope.collapsed = true;
    };

    $scope.get_data = function() {
      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;
      
      $scope.field = $scope.panel.primaryDimensionField;

      // Prepare filter
      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      var queries = querySrv.getQueryObjs($scope.panel.queries.ids);
      var boolQuery = $scope.ejs.BoolQuery();
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });
      var filteredQuery = $scope.ejs.FilteredQuery(
        boolQuery,
        filterSrv.getBoolFilter(filterSrv.ids())
      );

      var body = {
        "query": {
          "filtered": {
            "query": JSON.parse(filteredQuery.toString())
          }
        },
        "aggs": {
          "level_one": {
            "terms": {
              "field": $scope.panel.primaryDimensionField,
              "size": 0
            },
            "aggs": {
              "primary_agg": {
                "sum": {"field": $scope.panel.primaryMeasureField }
              },
              "secondary_agg": {
                "sum": {"field": $scope.panel.secondaryMeasureField }
              }          
            }
          }
        },
        "size": 0
      };

      // Populate the inspector panel
      $scope.inspector = angular.toJson(body, true);

      // Start search query
      es.search({
        index: dashboard.indices,
        body: body
      }).then(function (resp) {
          $scope.response = resp.aggregations;
          //console.debug($scope.response);
          $scope.panelMeta.loading = false;
          $scope.$emit('render');
        }, function (err) {
          console.error(err.message);
        });

    };

    $scope.drill_down = function(field, term, mandate) {
      filterSrv.set({
        type: 'terms', 
        field: field, 
        value: term.label,
        mandate: mandate
      });
    };

    $scope.set_refresh = function(state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh = false;
      $scope.$emit('render');
    };

    $scope.show_all = function () {
      $scope.collapsed = !$scope.collapsed;
    }
  });

  module.directive('multiBarChart', function(querySrv) {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        var plot;

        // Receive render events
        scope.$on('render', function(){
          render_panel();
          scope.collapsible = scope.dimensionValues.length > scope.panel.size;
        });

        // Function for rendering panel
        function render_panel() {

          // IE doesn't work without this
          elem.css({height:scope.panel.height||scope.row.height});

          scope.allSeries = [];
          scope.dimensionValues = [];
          
          var primarySeries = [];
          var secondarySeries = [];
          var i = 0;
          _.each(scope.response.level_one.buckets, function(bucket) {
            scope.dimensionValues.push(bucket.key);
            primarySeries.push([i, bucket.primary_agg.value]);
            secondarySeries.push([i, bucket.secondary_agg.value]);
            i = i + 1;
          });

          scope.allSeries.push({ 
            label: scope.panel.primaryMeasureLabel || scope.panel.primaryMeasureField,
            color: '#E24D42', 
            data: primarySeries
          });
          scope.allSeries.push({ 
            label: scope.panel.secondaryMeasureLabel || scope.panel.secondaryMeasureField,
            color: '#705DA0', 
            data: secondarySeries
          });
           
          // Populate element
          try {
            // Add plot to scope so we can build out own legend          
            plot = $.plot(elem, scope.allSeries, {
              legend: { show: false },
              series: {
                //stack: true,
                stackpercent: true,
                lines:  { show: false, fill: true, steps: true },
                bars:   { show: true,  fill: 1, barWidth: 0.8, horizontal: false },
                shadowSize: 1
              },
              yaxis: { show: true, min: 0, max: 100, color: "#c8c8c8" },
              //yaxis: { show: true, min: 0, color: "#c8c8c8" },
              xaxis: { show: false },
              grid: {
                borderWidth: 0,
                borderColor: '#c8c8c8',
                color: "#c8c8c8",
                hoverable: true,
                clickable: true
              },
              colors: querySrv.colors
            });
            
            // Populate legend
            if(elem.is(":visible")){
              setTimeout(function(){
                scope.legend = plot.getData();
                console.debug('legend', scope.legend);
                if(!scope.$$phase) {
                  scope.$apply();
                }
              });
            }
          } catch(e) {
            elem.text(e);
          }

        }

        // Mouse click handler
        elem.bind("plotclick", function (event, pos, item) {
          if (item) {
            // Drill-down to?
            if (scope.dimensionValues.length === 1) {
              // aggregate drill-down
              console.debug('item', item);
              scope.drill_down(
                [scope.panel.secondaryMeasureField, scope.panel.primaryMeasureField][item.seriesIndex],
                {label: '0'},
                'must'
              );
            } else {
              // dimension drill-down
              scope.drill_down(
                scope.panel.primaryDimensionField,
                {label: scope.dimensionValues[item.dataIndex]},
                'must'
              );  
            }
          }
        });

        // Tooltip handler
        var $tooltip = $('<div>');
        elem.bind("plothover", function (event, pos, item) {
          if (item) {
            //console.debug(item);
            var value = item.series.data[item.dataIndex][1].toFixed(1);
            var ratio = item.series.percents[item.dataIndex].toFixed(0);
            var dimensionValue = scope.dimensionValues[item.dataIndex];
            $tooltip.html(
              kbn.query_color_dot(item.series.color, 20) + ' ' + 
              ratio + '%' + ' ' +
              item.series.label + " (" + value + ' ' + scope.panel.units + ")" + 
              '<br>' +
              '<strong>' + dimensionValue + '</strong>'
            ).place_tt(pos.pageX, pos.pageY);
          } else {
            $tooltip.remove();
          }
        });

      }
    };
  });

});

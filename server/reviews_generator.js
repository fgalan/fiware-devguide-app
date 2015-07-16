/*
 * reviews_generator.js
 * Copyright(c) 2015 Bitergia
 * Author: Alvaro del Castillo <acs@bitergia.com>
 * MIT Licensed

  Generates random reviews for restaurants in orion

  First it gets all restaurant information
  Then a random automatic review is generated 
  Then the review is added to Orion CB

  TODO:
  - Create more real reviews using templates for comments and random ratings
*/


var utils = require('./utils');
var fs = require('fs');
var async = require('async');
var shortid = require('shortid'); // unique ids generator

var api_rest_host = "compose_devguide_1";
var api_rest_port = 80;
var api_rest_simtasks = 5 // number of simultaneous calls to API REST
var reviews_added = 0;
var restaurants_data; // All data for the restaurants to be reviewed


var feed_orion_reviews = function() {
    return_post = function(res, buffer, headers) {
        reviews_added++;
        // console.log(buffer);
        console.log(reviews_added+"/"+restaurants_data.length);
    };

    // restaurants_data = restaurants_data.slice(0,5); // debug with few items

    console.log("Feeding reviews info in orion.");
    console.log("Total tried: " + restaurants_data.length);

    var api_rest_path = "/api/orion/entities/";
    var org_name = "devguide";

    // Limit the number of calls to be done in parallel to orion
    var q = async.queue(function (task, callback) {
        var rname = task.rname;
        var attributes = task.attributes;
        api_rest_path += org_name;
        console.log(rname);

        // Time to build the Context Element in Orion language
        var post_data = {
            "contextElements": [
                    {
                        "type": "review",
                        "isPattern": "false",
                        "id": rname,
                        "attributes": attributes
                    }
            ],
            "updateAction": "APPEND"
        };

        // POST to create a new entity
        post_data = JSON.stringify(post_data);

        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        };

        var options = {
                host: api_rest_host,
                port: api_rest_port,
                path: api_rest_path,
                method: 'POST',
                headers: headers
            };
        utils.do_post(options, post_data, callback);
    }, api_rest_simtasks);


    q.drain = function() {
        console.log("Total reviews added: " + reviews_added);
    }

    Object.keys(restaurants_data).forEach(function(element, pos, _array) {
        // Call orion to append the entity
        var rname = restaurants_data[pos].contextElement.id;
        rname += "-"+shortid.generate();
        // Time to add first attribute to orion as first approach
        var attributes = [];
        var attr = {"name":"ratingValue",
                    "type":"text",
                    "value":"0"};
        attributes.push(attr)
        attr = {"name":"reviewBody",
                "type":"text",
                "value":"Rating review body"};
        attributes.push(attr)
        q.push({"rname":rname, "attributes":attributes}, return_post);
    });
};

// Load restaurant data from Orion
var load_restaurant_data = function() {

    var process_restaurants = function (res, data) {
        restaurants_data = JSON.parse(data).contextResponses;
        // Once we have all data for restaurants generate reviews for them
        feed_orion_reviews();
    };

    // http://compose_devguide_1/api/orion/restaurants/
    var url_path = "/api/orion/restaurants/";

    var headers = {
            'Accept': 'application/json',
    };

    var options = {
        host: api_rest_host,
        path: url_path,
        method: 'GET',
        headers: headers
    };

    utils.do_get(options, process_restaurants);
};

console.log("Generating random reviews for restaurants ...");

load_restaurant_data();
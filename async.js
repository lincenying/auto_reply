var async = require('async');

var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
var configs = {};

async.forEachOf(obj, function (value, key, callback) {
    setTimeout(() => {
        console.log(key, value);
        configs[key] = "http://www.baidu.com"+value;
        callback();
    }, 1000);
}, function (err) {
    if (err) console.error(err.message);
    console.log(configs);
});

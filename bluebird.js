var Promise = require('bluebird');
var p1 = new Promise((resolve, reject) => {
    setTimeout(()=>{
        resolve(1000)
    }, 1000);
});
var p2 = new Promise((resolve, reject) => {
    setTimeout(()=>{
        resolve(2000)
    }, 2000);
});
var p3 = new Promise((resolve, reject) => {
    setTimeout(()=>{
        resolve(3000)
    }, 3000);
});

new Promise((resolve, reject) => {
    setTimeout(()=>{
        resolve(2000)
    }, 1000);
}).then((value) => {
    console.log(value); // 2000
    return new Promise((resolve, reject) => {
        setTimeout(()=>{
            resolve(3000)
        }, value);
    })
}).then((value) => {
    console.log(value) // 3000
})

Promise.all([p1, p2]).then(function(value) {
    console.log(value); // [ 1000, 2000 ]
});

Promise.props({
    pictures: p1,
    comments: p2
}).then(function(result) {
    console.log(result); // { pictures: 1000, comments: 2000 }
});

Promise.some([
    p1, p2, p3
], 2).spread(function(first, second) {
    console.log(first, second);
});

function makePromise(name, delay) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(name);
        }, delay);
    });
}
var data = [2000, 1, 1000];
Promise.reduce(data, (total, item, index) => {
    return makePromise(index, item).then(res => {
        return total + res;
    });
}, 0).then(res => {
    console.log(res);
});

Promise.mapSeries(data, (item, index) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(index);
        }, item);
    });
}, 0).get(1).then(res => {
    console.log(res);
});

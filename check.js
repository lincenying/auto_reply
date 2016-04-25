var colors = require('colors');
var node = {
    async: require('async'),
    cheerio: require('cheerio'),
    fs: require('fs'),
    request: require('request'),
    url: require('url'),
    iconv: require('iconv-lite')
};
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'red',
    info: 'green',
    data: 'blue',
    help: 'cyan',
    warn: 'yellow',
    debug: 'magenta',
    error: 'red'
});
var dzAutoReply = {
    /**
     * 配置选项
     */
    options: {
        baseuri: 'D:/Soft/应用软件/ShadowsocksR/gui-config.json',
    },
    /**
     * 开始下载（程序入口函数）
     */
    start: function() {
        var self = this;
        var async = node.async;
        async.waterfall([
            self.wrapTask(self.getJson),
            self.wrapTask(self.checkAllIp)
        ], function(err, result) {
            if (err) {
                console.log('error: %s', err.message);
            } else {
                //console.log(self.posts)
                console.log('success: 测试完毕');
            }
        });
    },
    /**
     * 包裹任务，确保原任务的上下文指向某个特定对象
     * @param  {Function} task 符合async.js调用方式的任务函数
     * @param  {Any} context 上下文
     * @param  {Array} exArgs 额外的参数，会插入到原task参数的前面
     * @return {Function} 符合async.js调用方式的任务函数
     */
    wrapTask: function(task, context, exArgs) {
        var self = this;
        return function() {
            var args = [].slice.call(arguments);
            args = exArgs ? exArgs.concat(args) : args;
            task.apply(context || self, args);
        };
    },
    getJson: function(callback) {
        var self = this;
        var data = node.fs.readFileSync(self.options.baseuri, "utf-8");
        var json = JSON.parse(data);
        callback(null, json.configs);
    },
    checkAllIp: function(ips, callback) {
        var self = this;
        var async = node.async;
        async.eachSeries(ips, self.wrapTask(self.checkIp), callback);
    },
    checkIp: function(ip, callback) {
        var self = this;
        var async = node.async;
        async.waterfall([
            self.wrapTask(self.checkOneIp, self, [ip]),
            self.wrapTask(self.getIpStatus)
        ], callback);
    },
    checkOneIp: function(ip, callback) {
        var self = this;
        var replyUri = 'http://www.shadowsu.com/sstest/?host=' + ip.server;
        var self = this;
        console.log('开始测试服务器：%s', ip.server);
        node.request(replyUri, function(err, res, body) {
            var page = {
                remarks: ip.remarks,
                ip: ip.server,
                html: body
            };
            callback(err, page);
        });
    },
    getIpStatus: function(page, callback) {
        var self = this;
        var $ = node.cheerio.load(page.html);
        var $result = $('.resultstable > tbody > tr > td');
        var text = $result.eq(1).text();
        if (text == "正常") {
          console.log("%s (%s) 状态: %s".info, page.remarks, page.ip, text);
        } else {
          console.log("%s (%s) 状态: %s".error, page.remarks, page.ip, text);
        }
        callback(null, page);
    }
};
dzAutoReply.start();

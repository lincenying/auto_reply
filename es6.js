var colors = require('colors')
var Agent = require('socks5-http-client/lib/Agent')
var node = {
    async: require('async'),
    cheerio: require('cheerio'),
    fs: require('fs'),
    request: require('request'),
    url: require('url'),
    iconv: require('iconv-lite')
}
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
})
var dzAutoReply = {
    /**
     * 配置选项
     */
    options: {
        //baseuri: './list.json',
        baseuri: '/Users/lincenying/Library/Preferences/clowwindy.ShadowsocksX.plist',
    },
    start() {
        var async = node.async
        async.waterfall([
            this.getJson.bind(this),
            this.checkAllIp.bind(this)
        ], err => {
            if (err) {
                console.log('error: %s', err.message)
            } else {
                console.log('success: 测试完毕')
            }
        })
    },
    getJson(callback) {
        var url = this.options.baseuri
        var data = node.fs.readFileSync(url, "utf-8")
        var re = new RegExp(/\{"current".*?\}\]\}/)
        var config = re.exec(data)
        var json = JSON.parse(config[0])
        callback(null, json.profiles)
    },
    checkAllIp(ips, callback) {
        var async = node.async
        async.eachSeries(ips, this.checkIp.bind(this), callback)
    },
    checkIp(ip, callback) {
        var async = node.async
        async.waterfall([
            this.checkOneIp.bind(this, ip),
            this.getIpStatus.bind(this)
        ], callback)
    },
    checkOneIp(ip, callback) {
        var replyUri = 'http://www.shadowsu.com/sstest/?host=' + ip.server
        console.log('开始测试服务器：%s', ip.server)
        var request_option = {
            url: replyUri,
            agentClass: Agent,
            agentOptions: {
                socksHost: '127.0.0.1',
                socksPort: 1080
            }
        }
        node.request(request_option, (err, res, body) => {
            var page = {
                remarks: ip.remarks,
                ip: ip.server,
                html: body
            }
            callback(err, page)
        })
    },
    getIpStatus(page, callback) {
        var $ = node.cheerio.load(page.html)
        var $result = $('.resultstable > tbody > tr > td')
        var text = $result.eq(1).text()
        if (text === "正常") {
            console.log("%s (%s) 状态: %s".info, page.remarks, page.ip, text)
        } else {
            console.log("%s (%s) 状态: %s".error, page.remarks, page.ip, text)
        }
        callback(null, page)
    }
}
dzAutoReply.start()

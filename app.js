var node = {
    async: require('async'),
    cheerio: require('cheerio'),
    fs: require('fs'),
    request: require('request'),
    url: require('url'),
    iconv: require('iconv-lite')
};
var dzAutoReply = {
    /**
     * 配置选项
     */
    options: {
        baseuri: 'http://www.xxx.com/',
        uri: 'sitemap.php?page=',
        startPage: 1,
        downLimit: 1,
        totalPage: 1,
        endID: 69086,
        block: [],
        header: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            "Referer": "http://www.xxx.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36",
            "Cookie": ""
        }
    },
    posts: [],
    /**
     * 开始下载（程序入口函数）
     */
    start: function() {
        var self = this;
        var async = node.async;
        async.waterfall([
            self.wrapTask(self.getPages),
            self.wrapTask(self.replyAllPost),
        ], function(err, result) {
            if (err) {
                console.log('error: %s', err.message);
            } else {
                //console.log(self.posts)
                console.log('success: 下载成功');
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
    /**
     * 爬取所有列表页
     */
    getPages: function(callback) {
        var self = this;
        var async = node.async;
        var i = self.options.startPage || 1;
        async.doWhilst(function(callback) {
            var uri = self.options.baseuri + self.options.uri + '' + i;
            i++;
            async.waterfall([
                self.wrapTask(self.downPage, self, [uri, i]),
                self.wrapTask(self.parsePage)
            ], callback);
        }, function(p) {
            return p <= self.options.totalPage;
        }, callback);
    },
    /**
     * 下载单个页面
     */
    downPage: function(uri, i, callback) {
        var self = this;
        console.log('开始下载页面：%s', uri);
        var options = {
            url: encodeURI(uri),
            encoding: "binary",
            gzip: true,
            headers: self.options.header
        };
        node.request(options, function(err, res, body) {
            if (!err) console.log('下载页面成功：%s', uri);
            body = node.iconv.decode(new Buffer(body, 'binary'), 'gbk');
            var page = {
                page: i,
                uri: uri,
                html: body
            };
            callback(err, page);
        });
    },
    /**
     * 检查标题关键字
     */
    checkBlock: function(str) {
        var blockWord = this.options.block;
        for (var val of blockWord) {
            if (str.indexOf(val) > -1) {
                return true;
                break
            }
        }
        return false;
    },
    /**
     * 解析单个页面并获取数据
     */
    parsePage: function(page, callback) {
        console.log('开始分析页面数据：%s', page.uri);
        var self = this;
        var $ = node.cheerio.load(page.html);
        var $posts = $('.newtid>li');
        $posts.each(function() {
            var href = $(this).children('a').attr('href');
            var url = node.url.parse(href);
            var id = href.replace("thread-", "").replace("-1-1.html", "");
            var title = $(this).children('a').text();
            if (!self.checkBlock(title) && id >= self.options.endID) {
                self.posts.push({
                    id: id,
                    loc: self.options.baseuri + href,
                    title: title
                });
            }
        });
        console.log('分析页面数据成功，共%d篇', $posts.length);
        callback(null, page.page);
    },
    /**
     * 回复全部帖子
     */
    replyAllPost: function(callback) {
        var self = this;
        var async = node.async;
        console.log('开始全力回复全部帖子，共%d篇', self.posts.length);
        async.eachSeries(self.posts, self.wrapTask(self.replyPostAndRead), callback);
    },
    /**
     * 回复并抓取隐藏内容
     * @param  {Object} post 微博
     */
    replyPostAndRead: function(post, callback) {
        var self = this;
        var async = node.async;
        console.log('等待回复中...');
        setTimeout(function() {
            console.log('开始回复...');
            async.waterfall([
                self.wrapTask(self.replyPost, self, [post]),
                self.wrapTask(self.downPage),
                self.wrapTask(self.getDownUrl)
            ], callback);
        }, 32000);
    },
    /**
     * 回复帖子
     */
    replyPost: function(post, callback) {
        var self = this;
        var replyUri = 'http://www.xxx.com/forum.php?mod=post&action=reply&fid=116&tid=' + post.id + '&extra=page%3D1&replysubmit=yes&infloat=yes&handlekey=fastpost&inajax=1';
        var data = {
            message: "Thanks for sharing...",
            formhash: "f6229b9e",
            usesig: 1,
            subject: ""
        };
        node.request.post({
            url: encodeURI(replyUri),
            formData: data,
            encoding: "binary",
            headers: self.options.header,
            gzip: true
        }, function(err, res, body) {
            if (!err) console.log('回复成功：%s', post.loc);
            body = node.iconv.decode(new Buffer(body, 'binary'), 'gbk');
            callback(null, post.loc, 0);
        });
    },
    /**
     * 获取隐藏内容,写到文件里
     */
    getDownUrl: function(page, callback) {
        console.log('开始分析页面数据：%s', page.uri);
        var self = this;
        var $ = node.cheerio.load(page.html);
        var $posts = $('.blockcode');
        var $title = $('#thread_subject').text();
        var $content = $posts.text();
        $content = $content.replace("复制代码", "");
        var text = $title + "<br>" + $content + "<br>===========<br>\r\n";
        console.log(text);
        node.fs.writeFile('url.html', text, {
            encoding: 'utf-8',
            flag: 'a'
        }, function(err) {
            if (err) throw err;
            console.log('链接保存成功!');
        });
        callback(null, page);
    }
};
dzAutoReply.start();

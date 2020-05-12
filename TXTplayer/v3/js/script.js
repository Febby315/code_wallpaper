// 获取图片对象本地链接
function getImageBlob(url, callback) {
    var _xhr = new XMLHttpRequest();
    _xhr.open('get', url, true);
    _xhr.responseType = 'blob';
    _xhr.onload = function() {
        var _response = this.response;
        var _localUrl = URL.createObjectURL(_response);
        var _mime = _response ? _response.type : null;
        if(this.status === 200 && callback instanceof Function) callback(_localUrl, _mime);
    };
    _xhr.send();
}

// DOM加载完成
function onload() {
    // var I$CE = Inferno.createElement;
    // var R$CE = React.createElement;
    var UA = navigator.userAgent;
    var isAndroid = UA.indexOf('Android') > -1 || UA.indexOf('Adr') > -1; //android终端
    var space = isAndroid? '&nbsp;' : '&ensp;';
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v$app = window.v$app = new Vue({
        el: "#app",
        data: {
            src: "",
            flvsrc: "//aliyun-flv.yy.com/live/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-96597708953498332-96597708953498333-2-2748477-33.flv?codec=orig&secret=bec0e1c80fad166895855545ff4efc89&t=1562310185&appid=15013",
            m3u8src: "http://ivi.bupt.edu.cn/hls/cctv10.m3u8",
            content: null, // 视图html内容
            timer: null, // 定时器索引
            stats: new Stats(), // 性能监视器:含fps、耗时ms、内存分配
            showStats: !!url("?showStats"), // 显示统计信息
            enableColor: !!url("?enableColor"), // 启用输出色彩
            enableReverse: !!url("?enableReverse"), // 启用色彩反转
            // 拉伸/自适应
            fps: 60, // fps(流畅度)
            fontSize: 12, // 视图容器字体大小
            chars: [space, '.', ':', ';', '!', 'i', 'c', 'e', 'm', '@'], // 映射字符集;
            sw: document.body.offsetWidth, sh: document.body.offsetHeight, // 存储屏幕宽高(含初始化)
            sourceScale: 1, // 默认素材宽高比
            currRowTempFn: null, // 行模板
            currFrameTempFn: null, // 帧模板
        },
        // 动态计算
        computed: {
            // 配置灰度字符映射表
            charMap: function() {
                var _chars = !this.enableReverse ? this.chars : _.reverse(_.concat([], this.chars));
                var _len = 256, _step = ~~(_len / (_chars.length - 1)); // 映射步长=最大字符长度/映射字符长度
                return _.map(Array.apply(!0, Array(_len)), function(v, i, c){
                    return _chars[~~(i / _step)];
                });
            },
            // 屏幕宽高比
            screenScale: function() {
                return this.sw / this.sh;
            },
            // 屏幕允许最大行数
            maxRow: function() {
                return ~~(this.sh / this.fontSize);
            },
            // 屏幕允许最大列数
            maxCol: function() {
                var _fontWidth = this.fontSize / 2;
                return ~~(this.sw / _fontWidth);
            },
            // 画面帧间隔时间ms
            fpsStep: function() {
                return 1000 / this.fps;
            },
            // 彩色字符style模板
            styleTemplate: function() {
                return doT.template('color: rgb({{=it.R}},{{=it.G}},{{=it.B}});');
            },
            // 彩色字符模板
            spanTemplate: function() {
                return doT.template('<span style="color:rgb({{=it.R}},{{=it.G}},{{=it.B}});">{{=it.T}}</span>');
            },
            // 自定义class
            viewClass: function() {
                var _className = url("?className");
                if(!Array.isArray(_className)) _className = [_className];
                _className.push({
                    reverse: url("?enableReverse") // 反转色彩
                });
                return _className;
            },
            // 自定义style
            viewStyle: function() {
                var _style = url("?style");
                return _style ? JSON.parse(_style) : undefined;
            },
        },
        mounted: function() {
            this.$nextTick(function() {
                this.src = url("?src") || "video/v.mp4";
                this.initStats(); // 初始化统计工具
                window.onresize = this.resetToCharsConfig; // 窗口大小改变
            });
        },
        // 数据监听
        watch: {
            src: function(nv, ov) {
                var _video = this.$refs.video, _canvas = this.$refs.canvas;
                this.timer ? clearInterval(this.timer) : null; // 移除定时器
                var _ctx = _canvas.getContext('2d');
                _ctx.clearRect(0, 0, _canvas.width, _canvas.height); // 清除画布
                var _ext = url("fileext", nv);
                switch(String(_ext).toLowerCase()) {
                    case "flv": this.loadFlv(nv, _ext); break;
                    case "m3u8": this.loadHls(nv, _ext); break;
                    case "jpg": this.loadImage(nv, _ext); break;
                    case "png": this.loadImage(nv, _ext); break;
                    case "gif": this.loadImage(nv, _ext); break;
                    default: _video.src = nv; break;
                }
                this.$nextTick(function() {
                    _video.load();
                });
            },
            content: function(nv, ov) {
                var _stats = this.stats;
                this.$nextTick(function() {
                    _stats.update(); // 触发性能统计
                });
            },
            enableColor: function(nv, ov) {
                this.resetToCharsConfig();
            }
        },
        methods: {
            // 加载Flv链接地址
            loadFlv: function(src, callback) {
                var _video = this.$refs.video;
                if(flvjs.isSupported()) {
                    var _flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    _flvPlayer.attachMediaElement(_video);
                    _flvPlayer.load();
                    _video.load();
                    if(callback instanceof Function) callback(_flvPlayer);
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls: function(src, callback) {
                var _video = this.$refs.video;
                if(Hls.isSupported()) {
                    var _hls = new Hls();
                    _hls.loadSource(src);
                    _hls.attachMedia(_video);
                    _video.load();
                    if(callback instanceof Function) callback(_hls);
                }
            },
            // 加载静态图片链接地址
            loadImage: function(src, ext, callback) {
                var _image = this.$refs.image;
                getImageBlob(src, function(url, _mime) {
                    _image.src = url;
                    _image.setAttribute("data-mime", _mime);
                });
            },
            // 渲染帧数据
            renderFrame: function(frameData) {
                var _enableColor = this.enableColor, _spanTemplate = this.spanTemplate;
                return _.map(frameData, function(rowData) {
                    return _.map(rowData, function(v) {
                        return _enableColor ? _spanTemplate(v) : v.T;
                    }).join('');
                }).join('<br/>\n');
            },
            // 实时生成行模板
            rowTempFn: function() {
                var _canvas = this.$refs.canvas, _templates = [];
                if(this.enableColor) {
                    for(var i = 0; i < _canvas.width; i += 1) {
                        _templates.push('<span style="color:rgb({{=it['+i+'].R}},{{=it['+i+'].G}},{{=it['+i+'].B}});">{{=it['+i+'].T}}</span>');
                    }
                } else {
                    for(var i = 0; i < _canvas.width; i += 1) {
                        _templates.push('{{=it['+i+'].T}}');
                    }
                }
                return doT.template(_templates.join(''));
            },
            // 实时生成帧模板
            frameTempFn: function() {
                var _canvas = this.$refs.canvas, _templates = [];
                if(this.enableColor) {
                    for(var i = 0; i < _canvas.height; i += 1) {
                        for(var j = 0; j < _canvas.width; j += 1) {
                            _templates.push('<span style="color:rgb({{=it['+i+']['+j+'].R}},{{=it['+i+']['+j+'].G}},{{=it['+i+']['+j+'].B}});">{{=it['+i+']['+j+'].T}}</span>');
                        }
                        _templates.push('<br/>\n');
                    }
                } else {
                    for(var i = 0; i < _canvas.height; i += 1) {
                        for(var j = 0; j < _canvas.width; j += 1) {
                            _templates.push('{{=it['+i+']['+j+'].T}}');
                        }
                        _templates.push('<br/>\n');
                    }
                }
                return doT.template(_templates.join(''));
            },
            // 重置采集参数
            resetToCharsConfig: function() {
                var _canvas = this.$refs.canvas, _view = this.$refs.app;
                // 采集屏幕宽高
                this.sw = _view.offsetWidth;
                this.sh = _view.offsetHeight;
                // console.log("最大允许 宽:%s 高:%s ", this.maxCol, this.maxRow);
                // console.log("素材比屏幕宽?(%s) 素材宽高比:%s 屏幕宽高比:%s", this.sourceScale>this.screenScale, this.sourceScale, this.screenScale);
                // 拉伸模式
                // _canvas.width = this.maxCol;
                // _canvas.height = this.maxRow;

                // 自适应模式
                if(this.sourceScale > this.screenScale) {
                    _canvas.width = this.maxCol;// 宽度自适应
                    // 在宽度自适应情况下高度/2与宽度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    _canvas.height = this.maxCol / this.sourceScale / 2;
                }else{
                    _canvas.height = this.maxRow;// 高度自适应
                    // 在高度自适应情况下宽度*2与高度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    _canvas.width = this.maxRow * this.sourceScale * 2;
                }
                // console.log("最终canvas宽高", _canvas.width, _canvas.height);
                this.currRowTempFn = this.rowTempFn(); // 生成行模版
                this.currFrameTempFn = this.frameTempFn(); // 生成帧模版
            },
            // 绘制canvas
            drawCanvas: function(ctx, ele) {
                var _canvas = this.$refs.canvas;
                ctx.drawImage(ele, 0, 0, _canvas.width, _canvas.height); // 绘制图像
                this.toFrameData(ctx, this.update); // 将画布图像数据转换为字符画
            },
            // 灰度字符滤镜
            filterChar: function(data, callback) {
                var _charMap = this.charMap, _styleTemplate = this.styleTemplate;
                var _filter = function(v){
                    // 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                    // https://www.cnblogs.com/zhangjiansheng/p/6925722.html
                    var _Gray = (v[0]*38 + v[1]*75 + v[2]*15) >> 7; // 计算像素灰度
                    var _p = { R: v[0], G: v[1], B: v[2], Gray: _Gray, T: _charMap[_Gray] }; // T: 映射灰度字符
                    // _p.vnode = I$CE('span', { style: _styleTemplate(_p) }, Inferno.createTextVNode(_p.T));
                    // _p.vnode = R$CE('span', { style: _styleTemplate(_p) }, _p.T);
                    return _p;
                }
                return _.map(_.chunk(data, 4), _filter);
            },
            // 图像转字符画数据
            toFrameData: function(ctx, callback) {
                var _canvas = this.$refs.canvas;
                var _image = ctx.getImageData(0, 0, _canvas.width, _canvas.height);
                var _frameData = this.filterChar(_image.data); // 像素数据数组
                var _filter = function(v) {
                    // return I$CE('div', null, _.map(v, 'vnode'));
                    // return R$CE('div', null, _.map(v, 'vnode'));
                    return v;
                }
                var _rowData = _.chunk(_frameData, _image.width);
                var _rowVNodes = [] || _.map(_rowData, _filter); // 行数据数组
                if (callback instanceof Function) callback(_rowData, _rowVNodes);
            },
            // 更新画面
            update: function(frameData, rowVNodes) {
                var _view = this.$refs.view;
                // 方法一 行模板渲染(相较方法二兼容更多浏览器,不易发生栈溢出)
                var _frame = _.map(frameData, this.currRowTempFn).join("<br/>\n");
                // 方法二 帧模板渲染(效率高但兼容差易超出堆栈上限: Maximum call stack size exceeded)
                // var _frame = this.currFrameTempFn(frameData);
                // 方法三 字符模板渲染(效率仅次于方法一,兼容性好);
                // var _frame = this.renderFrame(frameData);
                this.content = _frame; // 渲染画面
                // 方法五 Inferno差异化渲染(当前场景效率低)
                // Inferno.render(I$CE('div', null, rowVNodes), _view);
                // 方法六 anujs渲染(TODO)
                // React.render(R$CE('div', null, rowVNodes), _view);
            },
            // 初始化统计工具
            initStats: function() {
                var _tool = this.$refs.tool, _statsEle = this.stats.domElement;
                if(this.showStats && _tool && _statsEle) {
                    _statsEle.className = "stats";
                    _tool.appendChild(_statsEle);
                }
            },

            // vue事件
            // 
            handelResize: function(e) {
                console.log(e)
            },
            // fileChange 文件更改时修改视频源
            fileChange: function(e) {
                var _file = this.$refs.file, _video = this.$refs.video, _image = this.$refs.image;
                if(_file.files[0]) {
                    var _src = URL.createObjectURL(_file.files[0]);
                    var _mime = _file.files[0].type;
                    switch(_mime.split("/")[0]) {
                        case "image": _image.src = _src; _image.setAttribute("data-mime", _mime); break; // 图片文件
                        case "video": _video.src = _src; _video.setAttribute("data-mime", _mime); break; // 视频文件
                        default: alert("不支持该文件格式"); break;
                    }
                }
            },
            // imgLoaded 图片加载成功
            imgLoaded: function(e) {
                var _image = this.$refs.image;
                this.sourceScale = _image.width/_image.height;
                this.resetToCharsConfig();
                // 开始渲染
                var _this = this, canvas = this.$refs.canvas;
                var _ctx = canvas.getContext('2d');
                this.drawCanvas(_ctx, _image);
                // gif支持
                if(["image/gif"].indexOf(_image.getAttribute("data-mime")) !== -1) {
                    var rub = new SuperGif({ gif: _image, progressbar_height: 0 });
                    rub.load(function() {
                        var _gifCanvas = rub.get_canvas();
                        _this.timer = setInterval(function() {
                            _this.drawCanvas(_ctx, _gifCanvas);
                        }, _this.fpsStep);
                    });
                }
            },
            // canplay 媒体可播放
            // loadedmetadata 媒体元数据加载
            loadedmetadata: function(e) {
                var _video = this.$refs.video;
                this.sourceScale = _video.videoWidth/_video.videoHeight || this.screenScale;
                this.resetToCharsConfig();
            },
            // play 视频播放事件
            play: function(e) {
                var _this = this, _video = this.$refs.video, _canvas = this.$refs.canvas;
                var _ctx = _canvas.getContext('2d');
                this.timer = setInterval(function() {
                    if(!_video.paused) _this.drawCanvas(_ctx, _video);
                }, _this.fpsStep);
            },
            // pause 视频暂停/停止事件
            pause: function(e) {
                clearInterval(this.timer); // 视频暂停或结束停止定时器
                if(e.type === "ended") this.content = null; // 结束播放清除视图
            },
            // videoPlay 播放按钮点击事件
            videoPlay: function(e) {
                var _video = this.$refs.video;
                _video.paused ? _video.play() : _video.pause();
            },
        }
    });
}

// 函数入口
onload();

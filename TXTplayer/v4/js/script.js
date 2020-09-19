// 获取图片对象本地链接
function getImageBlob(url, callback) {
    var _xhr = new XMLHttpRequest();
    _xhr.open('get', url, true);
    _xhr.responseType = 'blob';
    _xhr.onload = function () {
        var _response = this.response;
        var _localUrl = URL.createObjectURL(_response);
        var _mime = _response ? _response.type : null;
        if (this.status === 200 && callback instanceof Function) callback(_localUrl, _mime);
    };
    _xhr.send();
}

// DOM加载完成
function onload() {
    // var V$CN = Vue.createVNode;
    // var I$CN = Inferno.createVNode;
    // var R$CN = React.createElement;
    var UA = navigator.userAgent;
    var isAndroid = UA.indexOf('Android') > -1 || UA.indexOf('Adr') > -1; //android终端
    var space = isAndroid ? '&nbsp;' : ' '; // '&nbsp;' : '&ensp;';
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v$app = window.v$app = Vue.createApp({
        el: "#app",
        data() {
            return {
                src: "",
                flvsrc: "//aliyun-flv.yy.com/live/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-96597708953498332-96597708953498333-2-2748477-33.flv?codec=orig&secret=bec0e1c80fad166895855545ff4efc89&t=1562310185&appid=15013",
                m3u8src: "http://ivi.bupt.edu.cn/hls/cctv10.m3u8",
                content: '请通过右下角选择视频或图片<br/>支持mp4/ogg/avi格式视频(浏览器默认支持格式)<br/>支持jpg/png/gif格式图片(gif支持动画)', // 视图html内容
                timer: null, // 定时器索引
                stats: new Stats(), // 性能统计
                enableColor: !!url("?enableColor"), // 启用输出色彩
                enableReverse: !!url("?enableReverse"), // 启用色彩反转
                // 拉伸/自适应
                fps: 30, // fps(流畅度)
                fontSize: 12, // 视图容器字体大小
                styleTemplate: doT.template('color: rgb({{=it[0]}},{{=it[1]}},{{=it[2]}});'), // 彩色字符style模板
                spanTemplate: doT.template('<span style="color:rgb({{=it._v[0]}},{{=it._v[1]}},{{=it._v[2]}});">{{=it.T}}</span>'), // 彩色字符模板
                chars: [space, '.', ':', ';', '!', 'i', 'c', 'e', 'm', '@'], // 映射字符集;
                sw: document.body.offsetWidth, sh: document.body.offsetHeight, // 存储屏幕宽高(含初始化)
                sourceScale: 1, // 默认素材宽高比
                currRowTempFn: null, // 行模板
                currFrameTempFn: null, // 帧模板
            }
        },
        // 动态计算
        computed: {
            // 配置灰度字符映射表
            charMap() {
                var _chars = !this.enableReverse ? this.chars : _.reverse(_.concat([], this.chars));
                var _len = 256, _step = ~~(_len / (_chars.length - 1)); // 映射步长=最大字符长度/映射字符长度
                return _.map(Array.apply(!0, Array(_len)), function (v, i, c) {
                    return _chars[~~(i / _step)];
                });
            },
            // 屏幕宽高比
            screenScale() {
                return this.sw / this.sh;
            },
            // 屏幕允许最大行数
            maxRow() {
                return ~~(this.sh / this.fontSize);
            },
            // 屏幕允许最大列数
            maxCol() {
                var _fontWidth = this.fontSize / 2;
                return ~~(this.sw / _fontWidth);
            },
            // 画面帧间隔时间ms
            fpsStep() {
                return 1000 / this.fps;
            },
            // 自定义class
            className() {
                return url("?className");
            },
            // 自定义style
            viewStyle() {
                var _style = url("?style");
                return _style ? JSON.parse(_style) : undefined;
            },
        },
        created() {
            var _stats = this.stats;
            _stats.showPanel(0);
            _stats.begin(); // 开始性能统计
            document.body.appendChild(_stats.dom);
        },
        mounted() {
            var _this = this;
            _this.src = url("?src") || "../v1/video/v.mp4";
            window.onresize = this.resetToCharsConfig; // 窗口大小改变
        },
        // 数据监听
        watch: {
            src(nv, ov) {
                var _this = this, _video = this.$refs.video, _canvas = this.$refs.canvas;
                _this.timer ? clearInterval(_this.timer) : null; // 移除定时器
                var _ctx = _canvas.getContext('2d');
                _ctx.clearRect(0, 0, _canvas.width, _canvas.height); // 清除画布
                var _ext = url("fileext", nv);
                switch (String(_ext).toLowerCase()) {
                    case "flv": _this.loadFlv(nv, _ext); break;
                    case "m3u8": _this.loadHls(nv, _ext); break;
                    case "jpg": _this.loadImage(nv, _ext); break;
                    case "png": _this.loadImage(nv, _ext); break;
                    case "gif": _this.loadImage(nv, _ext); break;
                    default: _video.src = nv; break;
                }
                _this.$nextTick(function () {
                    _video.load();
                });
            },
            enableColor(nv, ov) {
                this.resetToCharsConfig();
            }
        },
        methods: {
            // 加载Flv链接地址
            loadFlv(src, callback) {
                var _video = this.$refs.video;
                if (flvjs.isSupported()) {
                    var _flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    _flvPlayer.attachMediaElement(_video);
                    _flvPlayer.load();
                    _video.load();
                    if (callback instanceof Function) callback(_flvPlayer);
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls(src, callback) {
                var _video = this.$refs.video;
                if (Hls.isSupported()) {
                    var _hls = new Hls();
                    _hls.loadSource(src);
                    _hls.attachMedia(_video);
                    _video.load();
                    if (callback instanceof Function) callback(_hls);
                }
            },
            // 加载静态图片链接地址
            loadImage(src, ext, callback) {
                var _image = this.$refs.image;
                var callback = function (url, _mime) {
                    _image.src = url;
                    _image.setAttribute("data-mime", _mime);
                }
                getImageBlob(src, callback);
            },
            // 渲染帧数据
            renderFrame(frameData) {
                var _enableColor = this.enableColor, _spanTemplate = this.spanTemplate;
                var _filter = _enableColor ? _spanTemplate : doT.template("{{=it.T}}");
                return _.map(frameData, function (rowData) {
                    return _.map(rowData, _filter).join('');
                }).join('<br/>\n');
            },
            // 实时生成行模板
            rowTempFn() {
                var _this = this, _canvas = this.$refs.canvas, _templates = [];
                if (_this.enableColor) {
                    for (var i = 0; i < _canvas.width; i += 1) {
                        _templates.push('<span style="color:rgb({{=it[' + i + ']._v[0]}},{{=it[' + i + ']._v[1]}},{{=it[' + i + ']._v[2]}});">{{=it[' + i + '].T}}</span>');
                    }
                } else {
                    for (var i = 0; i < _canvas.width; i += 1) {
                        _templates.push('{{=it[' + i + '].T}}');
                    }
                }
                return doT.template(_templates.join(''));
            },
            // 实时生成帧模板
            frameTempFn() {
                var _this = this, _canvas = this.$refs.canvas, _templates = [];
                if (_this.enableColor) {
                    for (var i = 0; i < _canvas.height; i += 1) {
                        for (var j = 0; j < _canvas.width; j += 1) {
                            var index = '[' + i + '][' + j + ']';
                            _templates.push('<span style="color:rgb({{=it' + index + '._v[0]}},{{=it' + index + '._v[1]}},{{=it' + index + '._v[2]}});">{{=it' + index + '.T}}</span>');
                        }
                        _templates.push('<br/>\n');
                    }
                } else {
                    for (var i = 0; i < _canvas.height; i += 1) {
                        for (var j = 0; j < _canvas.width; j += 1) {
                            _templates.push('{{=it[' + i + '][' + j + '].T}}');
                        }
                        _templates.push('<br/>\n');
                    }
                }
                return doT.template(_templates.join(''));
            },
            // 重置采集参数
            resetToCharsConfig() {
                var _this = this, _canvas = this.$refs.canvas, _view = this.$refs.view;
                // 采集屏幕宽高
                _this.sw = _view.offsetWidth;
                _this.sh = _view.offsetHeight;
                // console.log("最大允许 宽:%s 高:%s ", _this.maxCol, _this.maxRow);
                // console.log("素材比屏幕宽?(%s) 素材宽高比:%s 屏幕宽高比:%s", _this.sourceScale>_this.screenScale, _this.sourceScale, _this.screenScale);
                // 拉伸模式
                // _canvas.width = _this.maxCol;
                // _canvas.height = _this.maxRow;

                // 自适应模式
                if (_this.sourceScale > _this.screenScale) {
                    _canvas.width = _this.maxCol;// 宽度自适应
                    // 在宽度自适应情况下高度/2与宽度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    _canvas.height = _this.maxCol / _this.sourceScale / 2;
                } else {
                    _canvas.height = _this.maxRow;// 高度自适应
                    // 在高度自适应情况下宽度*2与高度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    _canvas.width = _this.maxRow * _this.sourceScale * 2;
                }

                // console.log("最终canvas宽高", _canvas.width, _canvas.height);
                _this.currRowTempFn = _this.rowTempFn(); // 生成行模版
                _this.currFrameTempFn = _this.frameTempFn(); // 生成帧模版
            },
            // 绘制canvas
            drawCanvas(ele) {
                var _canvas = this.$refs.canvas, _ctx = _canvas.getContext('2d');
                _ctx.drawImage(ele, 0, 0, _canvas.width, _canvas.height); // 绘制图像
                var _image = _ctx.getImageData(0, 0, _canvas.width, _canvas.height); // 获取图像数据
                this.toFrameData(_image, this.update); // 将画布图像数据转换为字符画
            },
            // 灰度字符滤镜
            filterChar(data, callback) {
                var _charMap = this.charMap, _styleTemplate = this.styleTemplate;
                var _calculateGray = function (v) {
                    // 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                    // https://www.cnblogs.com/zhangjiansheng/p/6925722.html
                    return (v[0] * 38 + v[1] * 75 + v[2] * 15) >> 7; // 计算像素灰度
                }
                var _filter = function (v) {
                    var _Gray = _calculateGray(v)
                    var _p = { T: _charMap[_Gray], Gray: _Gray, _v: v }; // T: 映射灰度字符
                    // _p.vnode = V$CN('span', { style: _styleTemplate(_p._v) }, _p.T);
                    // _p.vnode = I$CN('span', { style: _styleTemplate(_p._v) }, Inferno.createTextVNode(_p.T));
                    // _p.vnode = R$CN('span', { style: _styleTemplate(_p._v) }, _p.T);
                    return _p;
                }
                return _.map(_.chunk(data, 4), _filter);
            },
            // 图像转字符画数据
            toFrameData(_image, callback) {
                var _frameData = this.filterChar(_image.data); // _.map(_.chunk(_image.data, 4), ); // 帧数据数组
                var _filter = function (v) {
                    // return V$CN('div', null, _.map(v, 'vnode'));
                    // return I$CN('div', null, _.map(v, 'vnode'));
                    // return R$CN('div', null, _.map(v, 'vnode'));
                    return v;
                }
                var _rowData = _.chunk(_frameData, _image.width);
                var _rowVNodes = _.map(_rowData, _filter); // 行数据数组
                if (callback instanceof Function) callback(_rowData, _rowVNodes);
            },
            // 更新画面
            update(frameData, rowVNodes) {
                var _this = this, _view = this.$refs.view, _stats = this.stats;
                // 方法一 行模板渲染(相较方法二兼容更多浏览器,不易发生栈溢出)
                var _frame = _.map(frameData, _this.currRowTempFn).join("<br/>\n");
                // 方法二 帧模板渲染(效率高但兼容差易超出堆栈上限: Maximum call stack size exceeded)
                // var _frame = _this.currFrameTempFn(frameData);
                // 方法三 字符模板渲染(效率仅次于方法一,兼容性好);
                // var _frame = _this.renderFrame(frameData);
                // 方法四 Vue差异化渲染(当前场景效率低)
                // Vue.render(V$CN('div', null, rowVNodes), _view);
                // 方法五 Inferno差异化渲染(当前场景效率低)
                // Inferno.render(I$CN('div', null, rowVNodes), _view);
                // 方法六 anujs渲染(TODO)
                // React.render(R$CN('div', null, rowVNodes), _view);
                _this.content = _frame; // 渲染画面
                _this.$nextTick(_stats.end); // 性能统计
            },

            // vue事件
            // fileChange 文件更改时修改视频源
            fileChange(e) {
                var _this = this, _file = this.$refs.file, _video = this.$refs.video, _image = this.$refs.image;
                if (_file.files[0]) {
                    var _mime = _file.files[0].type;
                    var type = _mime.split("/")[0];
                    if (['image', 'video'].includes(type)) {
                        var _src = URL.createObjectURL(_file.files[0]);
                        clearInterval(_this.timer);
                        switch (type) {
                            case "image": _image.src = _src; _image.setAttribute("data-mime", _mime); break; // 图片文件
                            case "video": _video.src = _src; _video.setAttribute("data-mime", _mime); break; // 视频文件
                            default: alert("暂未支持该类型文件"); break;
                        }
                    } else {
                        alert("请选择视频/图片资源!");
                    }
                }
            },
            // load 图片加载成功
            load(e) {
                var _this = this, _image = this.$refs.image;
                _this.sourceScale = _image.width / _image.height;
                _this.resetToCharsConfig();
                // gif支持
                if (["image/gif"].indexOf(_image.getAttribute("data-mime")) !== -1) {
                    var rub = new SuperGif({ gif: _image, progressbar_height: 0 });
                    rub.load(function () {
                        var _gifCanvas = rub.get_canvas();
                        var handler = function () {
                            _this.drawCanvas(_gifCanvas);
                        }
                        _this.timer = setInterval(handler, _this.fpsStep);
                    });
                } else {
                    this.drawCanvas(_image);
                }
            },
            // canplay&loadedmetadata  媒体可播放&媒体元数据加载
            loadedmetadata(e) {
                var _this = this, _video = this.$refs.video;
                _this.sourceScale = _video.videoWidth / _video.videoHeight || _this.screenScale;
                _this.resetToCharsConfig();
            },
            // play 视频播放事件
            play(e) {
                var _this = this, _video = this.$refs.video;
                var handler = function () {
                    if (!_video.paused) _this.drawCanvas(_video);
                }
                _this.timer = setInterval(handler, _this.fpsStep);
            },
            // pause 视频暂停/停止事件
            pause(e) {
                clearInterval(this.timer); // 视频暂停或结束停止定时器
                if (e.type === "ended") this.content = null; // 结束播放清除视图
            },
            // videoPlay 播放按钮点击事件
            videoPlay(e) {
                var _video = this.$refs.video;
                _video.paused ? _video.play() : _video.pause();
            },
        }
    }).mount('#app');
}

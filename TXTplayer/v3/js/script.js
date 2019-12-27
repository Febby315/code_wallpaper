const getImageBlob = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function() {
        if(this.status === 200 && callback instanceof Function) callback(URL.createObjectURL(this.response));
    };
    xhr.send();
}

// 页面body加载完成
function onload(){
    // const I$CE = Inferno.createElement;
    // const R$CE = React.createElement;
    const UA = navigator.userAgent;
    const isAndroid = UA.indexOf('Android') > -1 || UA.indexOf('Adr') > -1; //android终端
    const space = isAndroid? '&nbsp;' : '&ensp;';
    // 利用vue虚拟DOM技术加速DOM节点数据渲染
    var v$app = window.v$app = new Vue({
        el: "#app",
        data: {
            src: "",
            flvsrc: "//aliyun-flv.yy.com/live/15013_xv_22490906_22490906_0_0_0-15013_xa_22490906_22490906_0_0_0-96597708953498332-96597708953498333-2-2748477-33.flv?codec=orig&secret=bec0e1c80fad166895855545ff4efc89&t=1562310185&appid=15013",
            m3u8src: "//ivi.bupt.edu.cn/hls/cctv10.m3u8",
            content: null, // 视图html内容
            timer: null, // 定时器索引
            range: document.createRange(), // 用于通过TagString创建虚拟dom(DocumentFragment)节点
            stats: new Stats(), // 性能监视器:含fps、耗时ms、内存分配
            showStats: !!url("?showStats"), // 显示统计信息
            enableColor: !!url("?enableColor"), // 启用输出色彩
            enableReverse: !!url("?enableReverse"), // 启用色彩反转
            // 拉伸/自适应
            fps: 300, // fps(流畅度)
            fontSize: 12, // 视图容器字体大小
            chars: [space, '.', ':', ';', '!', 'i', 'c', 'e', 'm', '@'], // 映射字符集;
            styleTemplate: doT.template('color: rgb({{=it.R}},{{=it.G}},{{=it.B}});'), // 彩色字符style模板
            spanTemplate: doT.template('<span style="color:rgb({{=it.R}},{{=it.G}},{{=it.B}});">{{=it.T}}</span>'), // 彩色字符模板
            sw: document.body.offsetWidth, sh: document.body.offsetHeight, // 存储屏幕宽高(含初始化)
            sourceScale: 1, // 默认素材宽高比
            currRowTempFn: null, // 行模板
            currFrameTempFn: null, // 帧模板
        },
        // 动态计算
        computed:{
            // 配置灰度字符映射表
            charMap: function() {
                var chars = !this.enableReverse ? this.chars : this.chars.reverse();
                var len = 256, step = ~~(len/(chars.length-1)); // 映射步长=最大字符长度/映射字符长度
                return Array.apply(!0, Array(len)).map(function(v,i,c){
                    return chars[~~(i / step)];
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
                var fontWidth = this.fontSize / 2;
                return ~~(this.sw / fontWidth);
            },
            // 画面帧间隔时间ms
            fpsStep: function() {
                return 1000 / this.fps;
            },
            viewClass: function() {
                var className = url("?className");
                if(!Array.isArray(className)) className = [className];
                className.push({
                    reverse: url("?enableReverse") // 反转色彩
                });
                return className;
            },
            viewStyle: function() {
                var style = url("?style");
                return style ? JSON.parse(style) : undefined;
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
                var video = this.$refs.video, canvas = this.$refs.canvas;
                this.timer ? clearInterval(this.timer) : null; // 移除定时器
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布
                var ext = url("fileext", nv);
                switch(String(ext).toLowerCase()) {
                    case "flv": this.loadFlv(nv, ext); break;
                    case "m3u8": this.loadHls(nv, ext); break;
                    case "jpg": this.loadImage(nv, ext); break;
                    case "png": this.loadImage(nv, ext); break;
                    case "gif": this.loadImage(nv, ext); break;
                    default: video.src = nv; break;
                }
                this.$nextTick(function() {
                    video.load();
                });
            },
            enableColor: function(nv, ov) {
                this.resetToCharsConfig();
            }
        },
        methods: {
            // 加载Flv链接地址
            loadFlv: function(src, callback) {
                var video = this.$refs.video;
                if(flvjs.isSupported()) {
                    var flvPlayer = flvjs.createPlayer({ type: 'flv', url: src });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                    video.load();
                    // flvPlayer.play();
                    if(callback instanceof Function) callback(flvPlayer);
                }
            },
            // 加载Hls链接地址(m3u8)
            loadHls: function(src, callback) {
                var video = this.$refs.video;
                if(Hls.isSupported()) {
                    var hls = new Hls();
                    hls.loadSource(src);
                    hls.attachMedia(video);
                    video.load();
                    if(callback instanceof Function) callback(hls);
                }
            },
            // 加载静态图片链接地址
            loadImage: function(src, callback) {
                var image = this.$refs.image;
                getImageBlob(src, function(url) {
                    image.src = url;
                });
            },
            // 渲染帧数据
            renderFrame: function(frameData) {
                var enableColor = this.enableColor, spanTemplate = this.spanTemplate;
                return frameData.map(function(rowData) {
                    return rowData.map(function(v) {
                        return enableColor ? spanTemplate(v) : v.T;
                    }).join('');
                }).join('<br/>\n');
            },
            // 实时生成行模板
            rowTempFn: function(rowData) {
                var canvas = this.$refs.canvas, templates = [];
                if(this.enableColor) {
                    for(var i = 0; i < canvas.width; i += 1) {
                        templates.push('<span style="color:rgb({{=it['+i+'].R}},{{=it['+i+'].G}},{{=it['+i+'].B}});">{{=it['+i+'].T}}</span>');
                    }
                } else {
                    for(var i = 0; i < canvas.width; i += 1) {
                        templates.push('{{=it['+i+'].T}}');
                    }
                }
                return doT.template(templates.join(''));
            },
            // 实时生成帧模板
            frameTempFn: function() {
                var canvas = this.$refs.canvas, templates = [];
                if(this.enableColor) {
                    for(var i = 0; i < canvas.height; i += 1) {
                        for(var j = 0; j < canvas.width; j += 1) {
                            templates.push('<span style="color:rgb({{=it['+i+']['+j+'].R}},{{=it['+i+']['+j+'].G}},{{=it['+i+']['+j+'].B}});">{{=it['+i+']['+j+'].T}}</span>');
                        }
                        templates.push('<br/>\n');
                    }
                } else {
                    for(var i = 0; i < canvas.height; i += 1) {
                        for(var j = 0; j < canvas.width; j += 1) {
                            templates.push('{{=it['+i+']['+j+'].T}}');
                        }
                        templates.push('<br/>\n');
                    }
                }
                return doT.template(templates.join(''));
            },
            // 重置采集参数
            resetToCharsConfig: function() {
                var canvas = this.$refs.canvas, app = this.$refs.app;
                // 采集屏幕宽高
                this.sw = app.offsetWidth;
                this.sh = app.offsetHeight;
                // console.log("最大允许 宽:%s 高:%s ", this.maxCol, this.maxRow);
                // console.log("素材比屏幕宽?(%s) 素材宽高比:%s 屏幕宽高比:%s", this.sourceScale>this.screenScale, this.sourceScale, this.screenScale);
                // 拉伸模式
                // canvas.width = this.maxCol;
                // canvas.height = this.maxRow;

                // 自适应模式
                if(this.sourceScale > this.screenScale) {
                    canvas.width = this.maxCol;// 宽度自适应
                    // 在宽度自适应情况下高度/2与宽度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    canvas.height = this.maxCol / this.sourceScale / 2;
                }else{
                    canvas.height = this.maxRow;// 高度自适应
                    // 在高度自适应情况下宽度*2与高度保持比例(因字体高度是宽度的2倍, 为保证画面与素材保持正确比例)
                    canvas.width = this.maxRow * this.sourceScale * 2;
                }

                // console.log("最终canvas宽高", canvas.width, canvas.height);
                this.currRowTempFn = this.rowTempFn(); // 生成行模版
                this.currFrameTempFn = this.frameTempFn(); // 生成帧模版
            },
            // 绘制canvas
            drawCanvas: function(ctx, ele) {
                const canvas = this.$refs.canvas;
                ctx.drawImage(ele, 0, 0, canvas.width, canvas.height); // 绘制图像
                this.toFrameData(ctx, canvas.width, canvas.height, this.update); // 将画布图像数据转换为字符画
            },
            // 图像转字符画数据
            toFrameData: function(ctx, cw, ch, callback) {
                const _this = this, canvas = this.$refs.canvas;
                const styleTemplate = this.styleTemplate;
                var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixelDataArray = _.chunk(image.data, 4).map(function(v){
                    // 获取区域平均灰度及平均RGB色彩值 为提高效率将单像素灰度计算中的除以100提出
                    // https://www.cnblogs.com/zhangjiansheng/p/6925722.html
                    var Gray = (v[0]*38 + v[1]*75 + v[2]*15) >> 7; // 计算像素灰度
                    var p = { Gray, T: _this.charMap[Gray], R: v[0], G: v[1], B:v[2] }; // T: 映射灰度字符
                    // p.vnode = I$CE('span', { style: styleTemplate(p) }, Inferno.createTextVNode(p.T));
                    // p.vnode = R$CE('span', { style: styleTemplate(p) }, p.T);
                    return p;
                }); // 像素数据数组
                const rowDataArray = _.chunk(pixelDataArray, image.width).map(function(v) {
                    // rowVNodes.push(I$CE('div', null, colVNodes));
                    // rowVNodes.push(R$CE('div', {}, colVNodes));
                    return v;
                }); // 行数据数组
                if(callback instanceof Function) {
                    callback(rowDataArray);
                    // callback(rowDataArray, I$CE('div', null, rowVNodes));
                    // callback(rowDataArray, R$CE('div', null, rowVNodes));
                }
            },
            // 更新画面
            update: function(frameData, frameVNode) {
                var _this = this, view = this.$refs.view;
                // 方法一 行模板渲染(相较方法二兼容更多浏览器,不易发生栈溢出)
                var frame = frameData.map(function(v) {
                    return _this.currRowTempFn(v);
                }).join("<br/>\n");
                // 方法二 帧模板渲染(效率高但兼容差易超出堆栈上限: Maximum call stack size exceeded)
                // var frame = this.currFrameTempFn(frameData);
                // 方法三 字符模板渲染(效率仅次于方法一,兼容性好);
                // var frame = this.renderFrame(frameData);
                // 方法四 fragment预加载渲染(无法清除旧的innerHtml)
                // view.innerHtml = null;
                // view.appendChild(this.range.createContextualFragment(frame));
                // 方法五 Inferno差异化渲染(当前场景效率低)
                // Inferno.render(frameVNode, view);
                // 方法六 anujs渲染(TODO)
                // React.render(frameVNode, view);
                this.content = frame; // 渲染画面
                this.$nextTick(function() {
                    this.stats.update(); // 触发性能统计
                });
            },
            // 初始化统计工具
            initStats: function() {
                var tool = this.$refs.tool, statsEle = this.stats.domElement;
                if(this.showStats && tool && statsEle) {
                    statsEle.className = "stats";
                    tool.appendChild(statsEle);
                }
            },

            // vue事件
            // fileChange 文件更改时修改视频源
            fileChange: function(e) {
                var file = this.$refs.file, image = this.$refs.image;
                if(file.files[0]) {
                    this.src = URL.createObjectURL(file.files[0]);
                    // 兼容图片
                    var type = file.files[0].type;
                    if(type.split("/")[0] === "image") {
                        image.src = this.src;
                        image.setAttribute("data-type", type);
                    }
                }
            },
            // imgLoaded 图片加载成功
            imgLoaded: function(e) {
                var image = this.$refs.image;
                this.sourceScale = image.width/image.height;
                this.resetToCharsConfig();
                // 开始渲染
                var _this = this, canvas = this.$refs.canvas;
                var ctx = canvas.getContext('2d');
                this.drawCanvas(ctx, image);
                // gif支持
                if(["image/gif"].indexOf(image.getAttribute("data-type")) !== -1) {
                    var rub = new SuperGif({ gif: image, progressbar_height: 0 });
                    rub.load(function() {
                        var gifCanvas = rub.get_canvas();
                        _this.timer = setInterval(function() {
                            _this.drawCanvas(ctx, gifCanvas);
                        }, _this.fpsStep);
                    });
                }
            },
            // canplay 媒体可播放
            // loadedmetadata 媒体元数据加载
            loadedmetadata: function(e) {
                var video = this.$refs.video;
                this.sourceScale = video.videoWidth/video.videoHeight || this.screenScale;
                this.resetToCharsConfig();
            },
            // play 视频播放事件
            play: function(e) {
                var _this = this, video = this.$refs.video, canvas = this.$refs.canvas;
                var ctx = canvas.getContext('2d');
                this.timer = setInterval(function() {
                    if(!video.paused) {
                        _this.drawCanvas(ctx, video);
                    }
                }, _this.fpsStep);
            },
            // pause 视频暂停/停止事件
            pause: function(e) {
                clearInterval(this.timer); // 视频暂停或结束停止定时器
                e.type === "ended" ? this.content=null : null; // 结束播放清除视图
            },
            // videoPlay 播放按钮点击事件
            videoPlay: function(e) {
                var video = this.$refs.video;
                video.paused ? video.play() : video.pause();
            },
        }
    });
}
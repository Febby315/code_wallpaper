// 首次获取DOM快照
const content = document.documentElement.outerHTML;


// 虚拟DOM
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XML_NAMESPACE = ['xmlns', 'xmlns:svg', 'xmlns:xlink'];
// 创建虚拟DOM
function createVirtualDom(element, isSVG = false) {
    switch (element.nodeType) {
        case Node.TEXT_NODE:
            return createVirtualText(element);
        case Node.ELEMENT_NODE:
            return createVirtualElement(element, isSVG || element.tagName.toLowerCase() === 'svg');
        default:
            return null;
    }
}
// 创建虚拟文本
function createVirtualText(element) {
    const vText = { type: 'VirtualText', text: element.nodeValue };
    if (typeof element.__flow !== 'undefined') {
        vText.__flow = element.__flow;
    }
    return vText;
}
// 创建虚拟节点
function createVirtualElement(element, isSVG = false) {
    const tagName = element.tagName.toLowerCase();
    const children = getNodeChildren(element, isSVG);
    const { attr, namespace } = getNodeAttributes(element, isSVG);
    const vElement = {
        type: 'VirtualElement',
        tagName,
        children,
        attributes: attr,
        namespace,
    };
    if (typeof element.__flow !== 'undefined') {
        vElement.__flow = element.__flow;
    }
    return vElement;
}
// 获取子节点
function getNodeChildren(element, isSVG = false) {
    const childNodes = element.childNodes ? [...element.childNodes] : [];
    const children = [];
    childNodes.forEach(function(cnode){
        // 不记录type属性为空或text/javascript的script标签
        cnode.nodeName.toLocaleUpperCase() != "SCRIPT" || ["", "text/javascript"].indexOf(cnode.type.trim()) == -1 ? children.push(createVirtualDom(cnode, isSVG)) : null;//console.log("已忽略",$(cnode), cnode.type);
    });
    return children.filter(c => !!c);
}
// 获取节点属性
function getNodeAttributes(element, isSVG = false) {
    const attributes = element.attributes ? [...element.attributes] : [];
    const attr = {};
    let namespace;
    attributes.forEach(function(e,i){
        attr[e.name] = e.value;
        if (XML_NAMESPACE.includes(e.name)) {
            namespace = e.value;
        } else if (isSVG) {
            namespace = SVG_NAMESPACE;
        }
    });
    // 代码有误
    // attributes.forEach(function(nodeName, nodeValue){
    //     console.log(nodeName, nodeValue);
    //     attr[nodeName] = nodeValue;
    //     if (XML_NAMESPACE.includes(nodeName)) {
    //         namespace = nodeValue;
    //     } else if (isSVG) {
    //         namespace = SVG_NAMESPACE;
    //     }
    // });
    return { attr, namespace };
}
// 还原dom
function createElement(vdom, nodeFilter = () => true) {
    let node;
    if (vdom.type === 'VirtualText') {
        node = document.createTextNode(vdom.text);
    } else {
        node = typeof vdom.namespace === 'undefined' ?
            document.createElement(vdom.tagName) :
            document.createElementNS(vdom.namespace, vdom.tagName);
        for (let name in vdom.attributes) {
            node.setAttribute(name, vdom.attributes[name]);
        }
        vdom.children.forEach((cnode) => {
            const childNode = createElement(cnode, nodeFilter);
            if (childNode && nodeFilter(childNode)) {
                node.appendChild(childNode);
            }
        });
    }
    if (vdom.__flow) {
        node.__flow = vdom.__flow;
    }
    return node;
}

var tempSnapshot = createVirtualDom(document.documentElement, false);
console.log(tempSnapshot);
console.log(createElement(tempSnapshot));
// DOM观察
const observer = new MutationObserver(function(mutations, observer){
    console.log(createVirtualDom(document.documentElement, false));
    // mutationList: array of mutation
});
const options = {
    childList: true, // 是否观察子节点的变动
    subtree: true, // 是否观察所有后代节点的变动
    attributes: true, // 是否观察属性的变动
    attributeOldValue: true, // 是否观察属性的变动的旧值
    characterData: true, // 是否节点内容或节点文本的变动
    characterDataOldValue: true, // 是否节点内容或节点文本的变动的旧值
    // attributeFilter: ['class', 'src'] 不在此数组中的属性变化时将被忽略
};
// observer.observe(document.documentElement, options); // 开始观察指定节点
// observer.disconnect(); // 停止观察
// var changes = observer.takeRecords(); // 清除变动记录


// 闭包
(function(){
    // 初始化
    var init = function(){
        
    }
    var WebRecord = window.WebRecord = function(option){
        // 事件
        this.eventList = []; //事件列表
        this.formEventList = []; //Form事件
        this.mouseEventList = []; //Mouse事件
        this.mediaEventList = []; //Media事件
        this.windowEventList = []; //Window事件
        this.keyboardEventList = []; //Keyboard事件

        this.domSnapshotList = []; //DOM快照
        this.majorSnapshotList = []; //关键快照(最终录像资源)
        this.isPlay = false;
        // 所有事件
        this.eventCallback = function(e){
            var currTimestamp = new Date().getTime();
            var domSnapshot = createVirtualDom(document.documentElement, false);
            this.eventList.push(e);
            this.domSnapshotList.push(domSnapshot);
            this.majorSnapshotList.push({ timestampOffset: currTimestamp - this.startTimestamp, event: e, snapshot: domSnapshot });
        }.bind(this);
        // 鼠标事件MouseEvent回调函数
        this.mouseEventCallback = function(e){
            this.eventCallback(e);
            var currTimestamp = new Date().getTime();
            var { clientX, clientY, offsetX, offsetY, pageX, pageY, screenX, screenY, timeStamp, type } = e;
            this.mouseEventList.push({ clientX, clientY, offsetX, offsetY, pageX, pageY, screenX, screenY, timeStamp: currTimestamp - this.startTimestamp, type });
        }.bind(this);
    }
    WebRecord.fn = WebRecord.prototype;
    // 函数
    WebRecord.prototype.start = function(){
        var _this = this;
        _this.startTimestamp = new Date().getTime();
        $(document).on("click dblclick drag dragend dragenter dragleave dragover dragstart drop mousedown mousemove mouseout mouseover mouseup mousewheel scroll", _this.mouseEventCallback);
        $("#virtualMouse").hide();
    }
    WebRecord.prototype.stop = function(){
        var _this = this;
        $(document).off("click dblclick drag dragend dragenter dragleave dragover dragstart drop mousedown mousemove mouseout mouseover mouseup mousewheel scroll", _this.mouseEventCallback);
        $("#virtualMouse").hide();
    }
    WebRecord.prototype.play = function(){
        var _this = this;
        if (_this.mouseEventList.length&&_this.isPlay) { return _this; };
        $("#virtualMouse").show();
        _this.isPlay = true;
        _this.mouseEventList.forEach(function(e,i){
            setTimeout(function(i){
                $("#virtualMouse").css({ top: this.clientY, left:this.clientX });
                if(i>=_this.mouseEventList.length-1){
                    _this.isPlay = false;
                    $("#virtualMouse").hide();
                }
                this.type=="mousedown"?$("#virtualMouse i.mousedown").show():null;
                this.type=="mouseup"?$("#virtualMouse i.mousedown").hide():null;
            }.bind(e,i),e.timeStamp);
        });
    }
    WebRecord.prototype.save = function(){
        var _this = this;
        _this.majorSnapshotList.forEach(function(e,i){
            setTimeout(function(){
                var dom = createElement(this.snapshot,function(childNode){
                    return $(childNode).attr("id")!="recordTool";
                });
                $("#player").attr("srcdoc",$(dom).html());
                // // 鼠标
                // $("#virtualMouse").show();
                // $("#virtualMouse").css({ top: this.event.clientY, left:this.event.clientX });
                // this.event.type=="mousedown"?$("#virtualMouse i.mousedown").show():null;
                // this.event.type=="mouseup"?$("#virtualMouse i.mousedown").hide():null;
            }.bind(e), e.timestampOffset);
        });
        // console.log(JSON.stringify(_this.majorSnapshotList));
    }
    init(); // 初始化
})();

VerletJS.prototype.spider = function(origin) {
    let i
    let legSeg1Stiffness = 0.99
    let legSeg2Stiffness = 0.99
    let legSeg3Stiffness = 0.99
    let legSeg4Stiffness = 0.99
    let joint1Stiffness = 1
    let joint2Stiffness = 0.4
    let joint3Stiffness = 0.9
    let bodyStiffness = 1
    let bodyJointStiffness = 1
    let composite = new this.Composite()
    composite.legs = []
    composite.thorax = new Particle(origin)
    composite.head = new Particle(origin.add(new Vec2(0, -5)))
    composite.abdomen = new Particle(origin.add(new Vec2(0, 10)))
    composite.particles.push(composite.thorax)
    composite.particles.push(composite.head)
    composite.particles.push(composite.abdomen)
    composite.constraints.push(new DistanceConstraint(composite.head, composite.thorax, bodyStiffness))
    composite.constraints.push(new DistanceConstraint(composite.abdomen, composite.thorax, bodyStiffness))
    composite.constraints.push(new AngleConstraint(composite.abdomen, composite.thorax, composite.head, 0.4))
    // 腿
    for (i = 0; i < 4; ++i) {
        composite.particles.push(new Particle(composite.particles[0].pos.add(new Vec2(3, (i - 1.5) * 3))))
        composite.particles.push(new Particle(composite.particles[0].pos.add(new Vec2(-3, (i - 1.5) * 3))))
        let len = composite.particles.length
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 2], composite.thorax, legSeg1Stiffness))
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 1], composite.thorax, legSeg1Stiffness))
        let lenCoef = 1
        if (i == 1 || i == 2) lenCoef = 0.7
        else if (i == 3) lenCoef = 0.9
        composite.particles.push(new Particle(composite.particles[len - 2].pos.add((new Vec2(20, (i - 1.5) * 30)).normal().mutableScale(20 * lenCoef))))
        composite.particles.push(new Particle(composite.particles[len - 1].pos.add((new Vec2(-20, (i - 1.5) * 30)).normal().mutableScale(20 * lenCoef))))
        len = composite.particles.length
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], legSeg2Stiffness))
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], legSeg2Stiffness))
        composite.particles.push(new Particle(composite.particles[len - 2].pos.add((new Vec2(20, (i - 1.5) * 50)).normal().mutableScale(20 * lenCoef))))
        composite.particles.push(new Particle(composite.particles[len - 1].pos.add((new Vec2(-20, (i - 1.5) * 50)).normal().mutableScale(20 * lenCoef))))
        len = composite.particles.length
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], legSeg3Stiffness))
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], legSeg3Stiffness))
        let rightFoot = new Particle(composite.particles[len - 2].pos.add((new Vec2(20, (i - 1.5) * 100)).normal().mutableScale(12 * lenCoef)))
        let leftFoot = new Particle(composite.particles[len - 1].pos.add((new Vec2(-20, (i - 1.5) * 100)).normal().mutableScale(12 * lenCoef)))
        composite.particles.push(rightFoot)
        composite.particles.push(leftFoot)
        composite.legs.push(rightFoot)
        composite.legs.push(leftFoot)
        len = composite.particles.length
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], legSeg4Stiffness))
        composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], legSeg4Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[len - 6], composite.particles[len - 4], composite.particles[len - 2], joint3Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[len - 6 + 1], composite.particles[len - 4 + 1], composite.particles[len - 2 + 1], joint3Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[len - 8], composite.particles[len - 6], composite.particles[len - 4], joint2Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[len - 8 + 1], composite.particles[len - 6 + 1], composite.particles[len - 4 + 1], joint2Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[0], composite.particles[len - 8], composite.particles[len - 6], joint1Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[0], composite.particles[len - 8 + 1], composite.particles[len - 6 + 1], joint1Stiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[1], composite.particles[0], composite.particles[len - 8], bodyJointStiffness))
        composite.constraints.push(new AngleConstraint(composite.particles[1], composite.particles[0], composite.particles[len - 8 + 1], bodyJointStiffness))
    }
    this.composites.push(composite)
    return composite
}
VerletJS.prototype.spiderweb = function(origin, radius, segments, depth) {
    let stiffness = 0.6
    let tensor = 0.3
    let stride = (2 * Math.PI) / segments
    let n = segments * depth
    let radiusStride = radius / n
    let i, c
    let composite = new this.Composite()
    // 粒子
    for (i = 0; i < n; ++i) {
        let theta = i * stride + Math.cos(i * 0.4) * 0.05 + Math.cos(i * 0.05) * 0.2
        let shrinkingRadius = radius - radiusStride * i + Math.cos(i * 0.1) * 20
        let offy = Math.cos(theta * 2.1) * (radius / depth) * 0.2
        composite.particles.push(new Particle(new Vec2(origin.x + Math.cos(theta) * shrinkingRadius, origin.y + Math.sin(theta) * shrinkingRadius + offy)))
    }
    for (i = 0; i < segments; i += 4) composite.pin(i)
    // 约束
    for (i = 0; i < n - 1; ++i) {
        // 邻居
        composite.constraints.push(new DistanceConstraint(composite.particles[i], composite.particles[i + 1], stiffness))
        // 跨度环
        let off = i + segments
        if (off < n - 1) composite.constraints.push(new DistanceConstraint(composite.particles[i], composite.particles[off], stiffness))
        else composite.constraints.push(new DistanceConstraint(composite.particles[i], composite.particles[n - 1], stiffness))
    }
    composite.constraints.push(new DistanceConstraint(composite.particles[0], composite.particles[segments - 1], stiffness))
    for (c in composite.constraints) composite.constraints[c].distance *= tensor
    this.composites.push(composite)
    return composite
}
// + 乔纳斯 劳尼 苏亚雷斯席尔瓦
// @ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o) { // v1.0
    for (let j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x) return o
}
VerletJS.prototype.crawl = function(leg) {
    let stepRadius = 100
    let minStepRadius = 35
    let spiderweb = this.composites[0]
    let spider = this.composites[1]
    let theta = spider.particles[0].pos.angle2(spider.particles[0].pos.add(new Vec2(1, 0)), spider.particles[1].pos)
    let boundry1 = (new Vec2(Math.cos(theta), Math.sin(theta)))
    let boundry2 = (new Vec2(Math.cos(theta + Math.PI / 2), Math.sin(theta + Math.PI / 2)))
    let flag1 = leg < 4 ? 1 : -1
    let flag2 = leg % 2 == 0 ? 1 : 0
    let paths = []
    let i
    for (i in spiderweb.particles) {
        if (spiderweb.particles[i].pos.sub(spider.particles[0].pos).dot(boundry1) * flag1 >= 0 && spiderweb.particles[i].pos.sub(spider.particles[0].pos).dot(boundry2) * flag2 >= 0) {
            let d2 = spiderweb.particles[i].pos.dist2(spider.particles[0].pos)
            if (!(d2 >= minStepRadius * minStepRadius && d2 <= stepRadius * stepRadius)) continue
            let leftFoot = false
            let j
            for (j in spider.constraints) {
                let k
                for (k = 0; k < 8; ++k) {
                    if (spider.constraints[j] instanceof DistanceConstraint && spider.constraints[j].a == spider.legs[k] && spider.constraints[j].b == spiderweb.particles[i]) {
                        leftFoot = true
                    }
                }
            }
            if (!leftFoot) paths.push(spiderweb.particles[i])
        }
    }
    for (i in spider.constraints) {
        if (spider.constraints[i] instanceof DistanceConstraint && spider.constraints[i].a == spider.legs[leg]) {
            spider.constraints.splice(i, 1)
            break
        }
    }
    if (paths.length > 0) {
        shuffle(paths)
        spider.constraints.push(new DistanceConstraint(spider.legs[leg], paths[0], 1, 0))
    }
}

function colorlist() {
    $('#colorlist').empty()
    let color = {
        "浅粉红": "lightpink",
        "粉红": "pink",
        "猩红": "crimson",
        "脸红的淡紫色": "lavenderblush",
        "苍白的紫罗兰红色": "palevioletred",
        "热情的粉红": "hotpink",
        "深粉色": "deeppink",
        "适中的紫罗兰红色": "mediumvioletred",
        "兰花的紫色": "orchid",
        "蓟": "thistle",
        "李子": "plum",
        "紫罗兰": "violet",
        "洋红": "magenta",
        "灯笼海棠(紫红色)": "fuchsia",
        "深洋红色": "darkmagenta",
        "紫色": "purple",
        "适中的兰花紫": "mediumorchid",
        "深紫罗兰色": "darkvoilet",
        "深兰花紫": "darkorchid",
        "靛青": "indigo",
        "深紫罗兰的蓝色": "blueviolet",
        "适中的紫色": "mediumpurple",
        "适中的板岩暗蓝灰色": "mediumslateblue",
        "板岩暗蓝灰色": "slateblue",
        "深岩暗蓝灰色": "darkslateblue",
        "熏衣草花的淡紫色": "lavender",
        "幽灵的白色": "ghostwhite",
        "纯蓝": "blue",
        "适中的蓝色": "mediumblue",
        "午夜的蓝色": "midnightblue",
        "深蓝色": "darkblue",
        "海军蓝": "navy",
        "皇家蓝": "royalblue",
        "矢车菊的蓝色": "cornflowerblue",
        "淡钢蓝": "lightsteelblue",
        "浅石板灰": "lightslategray",
        "石板灰": "slategray",
        "道奇蓝": "doderblue",
        "爱丽丝蓝": "aliceblue",
        "钢蓝": "steelblue",
        "淡蓝色": "lightskyblue",
        "天蓝色": "skyblue",
        "深天蓝": "deepskyblue",
        "淡蓝": "lightblue",
        "火药蓝": "powderblue",
        "军校蓝": "cadetblue",
        "蔚蓝色": "azure",
        "淡青色": "lightcyan",
        "苍白的绿宝石": "paleturquoise",
        "青色": "cyan",
        "水绿色": "aqua",
        "深绿宝石": "darkturquoise",
        "深石板灰": "darkslategray",
        "深青色": "darkcyan",
        "水鸭色": "teal",
        "适中的绿宝石": "mediumturquoise",
        "浅海洋绿": "lightseagreen",
        "绿宝石": "turquoise",
        "绿玉\\碧绿色": "auqamarin",
        "适中的碧绿色": "mediumaquamarine",
        "适中的春天的绿色": "mediumspringgreen",
        "薄荷奶油": "mintcream",
        "春天的绿色": "springgreen",
        "海洋绿": "seagreen",
        "蜂蜜": "honeydew",
        "淡绿色": "lightgreen",
        "苍白的绿色": "palegreen",
        "深海洋绿": "darkseagreen",
        "酸橙绿": "limegreen",
        "酸橙色": "lime",
        "森林绿": "forestgreen",
        "纯绿": "green",
        "深绿色": "darkgreen",
        "查特酒绿": "chartreuse",
        "草坪绿": "lawngreen",
        "绿黄色": "greenyellow",
        "橄榄土褐色": "olivedrab",
        "米色(浅褐色)": "beige",
        "浅秋麒麟黄": "lightgoldenrodyellow",
        "象牙": "ivory",
        "浅黄色": "lightyellow",
        "纯黄": "yellow",
        "橄榄": "olive",
        "深卡其布": "darkkhaki",
        "柠檬薄纱": "lemonchiffon",
        "灰秋麒麟": "palegodenrod",
        "卡其布": "khaki",
        "金": "gold",
        "玉米色": "cornislk",
        "秋麒麟": "goldenrod",
        "花的白色": "floralwhite",
        "老饰带": "oldlace",
        "小麦色": "wheat",
        "鹿皮鞋": "moccasin",
        "橙色": "orange",
        "番木瓜": "papayawhip",
        "漂白的杏仁": "blanchedalmond",
        "纳瓦霍白": "navajowhite",
        "古代的白色": "antiquewhite",
        "晒黑": "tan",
        "结实的树": "brulywood",
        "(浓汤)乳脂,番茄等": "bisque",
        "深橙色": "darkorange",
        "亚麻布": "linen",
        "秘鲁": "peru",
        "桃色": "peachpuff",
        "沙棕色": "sandybrown",
        "巧克力": "chocolate",
        "马鞍棕色": "saddlebrown",
        "海贝壳": "seashell",
        "黄土赭色": "sienna",
        "浅鲜肉 (鲑鱼) 色": "lightsalmon",
        "珊瑚": "coral",
        "橙红色": "orangered",
        "深鲜肉 (鲑鱼) 色": "darksalmon",
        "番茄": "tomato",
        "薄雾玫瑰": "mistyrose",
        "鲜肉 (鲑鱼) 色": "salmon",
        "雪": "snow",
        "淡珊瑚色": "lightcoral",
        "玫瑰棕色": "rosybrown",
        "印度红": "indianred",
        "纯红": "red",
        "棕色": "brown",
        "耐火砖": "firebrick",
        "深红色": "darkred",
        "栗色": "maroon",
        "纯白": "white",
        "白烟": "whitesmoke",
        "亮灰色": "gainsboro",
        "浅灰色": "lightgrey",
        "银白色": "silver",
        "深灰色": "darkgray",
        "灰色": "gray",
        "暗淡的灰色": "dimgray",
        "纯黑": "black"
    }
    for (i in color) {
        if (color[i] == $('#name').val()) {
            $('#colorlist').append('<option value="' + color[i] + '" selected>' + i + '</option>')
        } else {
            $('#colorlist').append('<option value="' + color[i] + '">' + i + '</option>')
        }
    }
}
$(document).ready(function() {
    let data = {
        "背景": "skyblue",
        "网节点": "white",
        "身体": "black",
        "腿": "black"
    }
    for (i in data) {
        $('#name').append('<option value="' + data[i] + '">' + i + '</option>')
    }
    colorlist()
    $('#name').change(function() {
        colorlist()
    })
    $('div').mouseenter(function() {
        $('select').show()
    }).mouseleave(function() {
        $('select').hide()
    })
    $('#colorlist').change(function() {
        let i = $('#name')[0].selectedIndex
        let v = $('#colorlist').val()
        $($('#name *')[i]).val(v)
        switch (i) {
            case 0:
                $('body').attr('bgcolor', v)
                break
            case 1:
                data.网节点 = v
                break
            case 2:
                data.身体 = v
                break
            case 3:
                data.腿 = v
        }
    })
    $('body').attr('bgcolor', data.背景)
    let canvas = $('canvas')[0]
    // 画布尺寸
    let width = parseInt(canvas.style.width)
    let height = parseInt(canvas.style.height)
    // 视网膜
    let dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.getContext("2d").scale(dpr, dpr)
    // 仿真
    let sim = new VerletJS(width, height, canvas)
    // 实体
    let spiderweb = sim.spiderweb(new Vec2(width / 2, height / 2), Math.min(width, height) / 2, 20, 7)
    let spider = sim.spider(new Vec2(width / 2, -300))
    spiderweb.drawParticles = function(ctx, composite) {
        let i
        for (i in composite.particles) {
            let point = composite.particles[i]
            ctx.beginPath()
            ctx.arc(point.pos.x, point.pos.y, 1.3, 0, 2 * Math.PI)
            ctx.fillStyle = data.网节点
            ctx.fill()
        }
    }
    spider.drawConstraints = function(ctx, composite) {
        let i
        ctx.beginPath()
        ctx.arc(spider.head.pos.x, spider.head.pos.y, 4, 0, 2 * Math.PI)
        ctx.fillStyle = data.身体
        ctx.fill()
        ctx.beginPath()
        ctx.arc(spider.thorax.pos.x, spider.thorax.pos.y, 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(spider.abdomen.pos.x, spider.abdomen.pos.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        for (i = 3; i < composite.constraints.length; ++i) {
            let constraint = composite.constraints[i]
            if (constraint instanceof DistanceConstraint) {
                ctx.beginPath()
                ctx.moveTo(constraint.a.pos.x, constraint.a.pos.y)
                ctx.lineTo(constraint.b.pos.x, constraint.b.pos.y)
                // 画腿
                if (
                    (i >= 2 && i <= 4) || (i >= (2 * 9) + 1 && i <= (2 * 9) + 2) || (i >= (2 * 17) + 1 && i <= (2 * 17) + 2) || (i >= (2 * 25) + 1 && i <= (2 * 25) + 2)) {
                    ctx.save()
                    constraint.draw(ctx)
                    ctx.strokeStyle = data.腿
                    ctx.lineWidth = 3
                    ctx.stroke()
                    ctx.restore()
                } else if (
                    (i >= 4 && i <= 6) || (i >= (2 * 9) + 3 && i <= (2 * 9) + 4) || (i >= (2 * 17) + 3 && i <= (2 * 17) + 4) || (i >= (2 * 25) + 3 && i <= (2 * 25) + 4)) {
                    ctx.save()
                    constraint.draw(ctx)
                    ctx.strokeStyle = data.腿
                    ctx.lineWidth = 2
                    ctx.stroke()
                    ctx.restore()
                } else if (
                    (i >= 6 && i <= 8) || (i >= (2 * 9) + 5 && i <= (2 * 9) + 6) || (i >= (2 * 17) + 5 && i <= (2 * 17) + 6) || (i >= (2 * 25) + 5 && i <= (2 * 25) + 6)) {
                    ctx.save()
                    ctx.strokeStyle = data.腿
                    ctx.lineWidth = 1.5
                    ctx.stroke()
                    ctx.restore()
                } else {
                    ctx.strokeStyle = data.腿
                    ctx.stroke()
                }
            }
        }
    }
    spider.drawParticles = function(ctx, composite) {}
    // 动画循环
    let legIndex = 0
    let loop = function() {
        if (Math.floor(Math.random() * 4) == 0) {
            sim.crawl(((legIndex++) * 3) % 8)
        }
        sim.frame(16)
        sim.draw()
        requestAnimFrame(loop)
    }
    loop()
})

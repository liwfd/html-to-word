const http = require('http');
const express = require("express");
const superagent = require("superagent");
const cheerio = require("cheerio");
const compression = require('compression');
const bodyParser = require("body-parser");
const fs = require("fs");
const JSZip = require('jszip');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const ImageModule = require('open-docxtemplater-image-module');

const app = express();
app.use(express.static(__dirname));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

function saveImage(url, path) {
    return new Promise((resolve, reject) => {
        http.get(url, function (req, res) {
            let imgData = '';
            req.on('data', function (chunk) {
                imgData += chunk;
            });
            req.setEncoding('binary');
            req.on('end', function () {
                fs.writeFile(path, imgData, 'binary', function (err) {
                    if (err) {
                        reject(err);
                    }
                    resolve();
                })
            })
        })
    });
}

function generateFile(body) {
    let content = fs.readFileSync(path.resolve(__dirname, 'template/template.docx'), 'binary');

    let zip = new JSZip(content);

    let doc = new Docxtemplater();
    let opts = {
        centered: false,
        getImage: function (tagValue, tagName) {
            return fs.readFileSync(path.join(__dirname, 'image/' + tagValue));
        },
        getSize: function (img, tagValue, tagName) {
            return [500, 300];
        }
    };
    doc.attachModule(new ImageModule(opts));
    doc.loadZip(zip);

    //set the templateVariables
    doc.setData({
        ip: body.ip,
        operate: body.operate,
        time: body.start,
        isp: body.isp,
        image1: 'PING-MultiHost-org.png',
        image2: 'TCPPING-MultiHost-ORG.png',
        image3: 'PING-MultiHost-CT.png',
        image4: 'TCPPING-MultiHost-CT.png',
        image5: 'PING-MultiHost-CNC.png',
        image6: 'TCPPING-MultiHost-CNC.png',
        image7: 'PING-MultiHost-CM.png',
        image8: 'TCPPING-MultiHost-CM.png'
    });

    try {
        doc.render();
    } catch (error) {
        let e = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            properties: error.properties,
        };
        console.log(JSON.stringify({error: e}));
        // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
        return false;
    }

    let buf = doc.getZip().generate({type: 'nodebuffer'});

    // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
    fs.writeFileSync(path.resolve(__dirname, 'template/output.docx'), buf);
    return true;
}

// 路径映射
app.get('/index.html', (req, res) => {
    res.sendFile('index.html');
});

// 路径映射
app.use('/api/generate', (req, res) => {
    let {ip, start} = req.body;
    let targets = ['PING-MultiHost-org', 'TCPPING-MultiHost-ORG', 'PING-MultiHost-CT', 'TCPPING-MultiHost-CT', 'PING-MultiHost-CNC', 'TCPPING-MultiHost-CNC', 'PING-MultiHost-CM', 'TCPPING-MultiHost-CM'];
    let pageUrl = '';
    let promises = [];
    for (let i = 0; i < targets.length; i++) {
        pageUrl = `http://${ip}:18888/smokeping.fcgi?displaymode=n;start=${encodeURI(start)};end=now;target=${targets[i]}`;
        superagent.get(pageUrl).end(function (err, pres) {
                // 常规的错误处理
                if (err) {
                    throw err;
                }
                // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
                // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
                // 剩下就都是 jquery 的内容了
                let $ = cheerio.load(pres.text);
                let p = saveImage(`http://${ip}:18888/` + $('#zoom').attr('src'), `image/${targets[i]}.png`);
                promises.push(p);
            }
        );
    }

    Promise.all(promises).then(_ => {
        let status = generateFile(req.body);
        if (status) {
            res.json({status: 'success'})
        }
    }).catch(err => {
        throw err;
    });
});

http.createServer(app).listen(8888);

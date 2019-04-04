const regionMargin = 5;

var inputImg = new Image();
var inputImgName = "unknown";

var imgCanvas, imgCtx;

var scaledWidth, scaledHeight;

var regionMat;
var regionNum;

const way = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
const connectedWay = 4;

$(document).ready(function () {


});

function randNormDist(mean, stdDev) {
    return mean + (randStdNormDist() * stdDev);
}

function randStdNormDist() {

    var u, v, w;

    do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        w = u * u + v * v;
    } while (w == 0 || w >= 1)
    
    // Box-Muller
    var c = Math.sqrt( (-2 * Math.log(w)) / w);

    return u * c;

}

function createArray(n, val=0) {
    
    var arr = new Array(n);
    arr.fill(val);

    return arr;

}

function createMat(row, col, val=0) {

    var mat = new Array(row);
    for (var i = 0; i < row; i++) {
        mat[i] = new Array(col);
        mat[i].fill(val);
    }
    return mat;

}

function checkOutside(p, w, h) {
    if (p[0] < 0 || p[0] >= w || p[1] < 0 || p[1] >= h) return true;
    return false;
}

function seamChopping(w, h, n, stepHori, stepVert) {

    var choppingMat = createMat(h, w, 0); // choppingMat = (height x width)
    var stepHoriHalf = stepHori / 2;

    for (var i = 0; i < n; i++) {
        
        var p = [Math.floor(Math.random() * w), 0]; // p = (x,y)

        choppingMat[p[1]][p[0]] = 2; 

        while (p[1] < h - 1) {
            
            var way;
            var nextP;
            while (true) {
                way = Math.floor(Math.random() * stepHori - stepHoriHalf);
                nextP = [p[0] + way, p[1] + stepVert];
                nextP[1] = Math.min(nextP[1], h - 1);
                if (!checkOutside(nextP, w, h)) break;
            }

            var k = (nextP[0] - p[0]) / (nextP[1] - p[1]);
            var tx = p[0];
            for (var y = p[1] + 1; y <= nextP[1]; y++) {
                var x_st = Math.min(Math.round(tx), Math.round(tx + k));
                var x_ed = Math.max(Math.round(tx), Math.round(tx + k));
                for (var x = x_st; x <= x_ed; x++) {
                    choppingMat[y][x] = 2;
                }
                tx += k;
            }
            
            p = nextP;

        }
        
    }

    return choppingMat;

}

function rotateMat(mat) {

    var row = mat.length;
    var col = mat[0].length;
    var newMat = createMat(col, row);

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {
            newMat[j][i] = mat[i][j];
        }
    }

    return newMat;
    
}

function maxMat(mat0, mat1) {

    var row = mat0.length;
    var col = mat0[0].length;
    var newMat = createMat(row, col);

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {
            newMat[i][j] = Math.max(mat0[i][j], mat1[i][j]);
        }
    }

    return newMat;

}

function fineTuningRegion(choppingMat, smallThres) {

    var row = choppingMat.length;
    var col = choppingMat[0].length;
    var regionMat = createMat(row, col, -1);
    var regionNum = 0;
    var regionEleCnt = new Array();

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {

            if (choppingMat[i][j] == 2) {
                regionMat[i][j] = -2;
                continue;
            }

            if (regionMat[i][j] != -1) continue;

            var que = new Array();
            var front = 0;

            que.push([j,i]);
            regionMat[i][j] = regionNum;

            while (front < que.length) {
                
                var curP = que[front++];

                for (var k = 0; k < connectedWay; k++) {

                    var nextP = [curP[0] + way[k][0], curP[1] + way[k][1]];

                    if (checkOutside(nextP, col, row)) continue;

                    if (regionMat[nextP[1]][nextP[0]] != -1) continue;
                    if (choppingMat[nextP[1]][nextP[0]] == 2) {
                        regionMat[nextP[1]][nextP[0]] = -2;
                        continue;
                    }

                    regionMat[nextP[1]][nextP[0]] = regionNum;
                    que.push(nextP);

                }

            }

            // console.log([i,j], que);

            regionEleCnt[regionNum++] = que.length;

        }

    }

    var tmp = removeSmallRegion(regionMat, regionEleCnt, regionNum, smallThres);
    choppingMat = getChoppingMatFromRegion(regionMat);

    return [tmp[0], choppingMat, tmp[1]];

}

function removeSmallRegion(regionMat, regionEleCnt, regionNum, smallThres) {

    // Detect small region
    var smallRegionArr = new Array();
    var regionReplace = new Array();
    var newRegionNum = 0;

    for (var i = 0; i < regionNum; i++) {
        if (regionEleCnt[i] < smallThres) {
            regionReplace[i] = -2;
        } else {
            regionReplace[i] = newRegionNum++;
        }
    }

    // Update region mat
    var row = regionMat.length;
    var col = regionMat[0].length;

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {
            if (regionMat[i][j] == -2) continue;
            regionMat[i][j] = regionReplace[regionMat[i][j]];
        }
    }

    // Expansion
    var que = new Array();
    var front = 0;

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {
            if (regionMat[i][j] != -2) que.push([j,i]);
        }
    }

    while (front < que.length) {
                
        var curP = que[front++];

        for (var k = 0; k < connectedWay; k++) {

            var nextP = [curP[0] + way[k][0], curP[1] + way[k][1]];

            if (checkOutside(nextP, col, row)) continue;
            if (regionMat[nextP[1]][nextP[0]] != -2) continue;

            regionMat[nextP[1]][nextP[0]] = regionMat[curP[1]][curP[0]];
            que.push(nextP);

        }

    }

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {
            if (regionMat[i][j] < 0) console.log(i, j, regionMat[i][j]);
        }
    }

    return [regionMat, newRegionNum];

}

function getChoppingMatFromRegion(regionMat) {

    var row = regionMat.length;
    var col = regionMat[0].length;
    var choppingMat = createMat(row, col, 0);

    for (var i = 1; i < row; i++) {
        for (var j = 1; j < col; j++) {
            if (regionMat[i][j] != regionMat[i][j-1] ||
                regionMat[i][j] != regionMat[i-1][j] ||
                regionMat[i][j] != regionMat[i-1][j-1]) {
                    choppingMat[i][j] = 2;
                }
            
        }
    }

    return choppingMat;

}

function getRegions(regionMat, regionNum) {

    var row = regionMat.length;
    var col = regionMat[0].length;

    var boundLeft = createArray(regionNum, col);
    var boundRight = createArray(regionNum, 0);
    var boundTop = createArray(regionNum, row);
    var boundBottom = createArray(regionNum, 0);

    for (var i = 0; i < row; i++) {
        for (var j = 0; j < col; j++) {

            var regionId = regionMat[i][j];

            boundLeft[regionId] = Math.min(boundLeft[regionId], j);
            boundRight[regionId] = Math.max(boundRight[regionId], j + 1);
            boundTop[regionId] = Math.min(boundTop[regionId], i);
            boundBottom[regionId] = Math.max(boundBottom[regionId], i + 1);
            
        }
    }

    var boundWidth = createArray(regionNum, 0);
    var boundHeight = createArray(regionNum, 0);
    var maxWidth = 0;
    var maxHeight = 0;

    for (var i = 0; i < regionNum; i++) {

        boundWidth[i] = boundRight[i] - boundLeft[i];
        boundHeight[i] = boundBottom[i] - boundTop[i];
        maxWidth = Math.max(maxWidth, boundWidth[i]);
        maxHeight = Math.max(maxHeight, boundHeight[i]);

    }

    var maxRange = Math.max(maxWidth, maxHeight);
    maxRange = Math.ceil(Math.sqrt(2) * maxRange);

    var pieceSize = [maxRange + regionMargin * 2, maxRange + regionMargin * 2];
    var bound = {
        left: boundLeft,
        top: boundTop,
        width: boundWidth,
        height: boundHeight
    };

    return [pieceSize, bound];
    
}

function applyRegionMask(pieceData, imgData, regionMat, regionId, bound, gapWidth, gapHeight) {

    for (var dh = 0; dh < bound.height[regionId]; dh++) {

        var imgY = bound.top[regionId] + dh;
        var pieceY = gapHeight + dh;
        
        for (var dw = 0; dw < bound.width[regionId]; dw++) {

            var imgX = bound.left[regionId] + dw;
            var pieceX = gapWidth + dw;

            if (regionMat[imgY][imgX] == regionId) {

                var imgIdx = imgY * 4 * imgData.width + imgX * 4;
                var pieceIdx = pieceY * 4 * pieceData.width + pieceX * 4;

                pieceData.data[pieceIdx + 0] = imgData.data[imgIdx + 0];
                pieceData.data[pieceIdx + 1] = imgData.data[imgIdx + 1];
                pieceData.data[pieceIdx + 2] = imgData.data[imgIdx + 2];
                pieceData.data[pieceIdx + 3] = imgData.data[imgIdx + 3];

            }

        }
    }

    return pieceData;

}

function updateChoppingBound(choppingBound, pieceData) {

    var boundFlag = false;
    for (var y = 0; y < pieceData.height; y++) {
        for (var x = 0; x < pieceData.width; x++) {
            
            var id = (y * pieceData.width + x) * 4;
            if (pieceData.data[id + 3] == 255) {
                choppingBound.top = Math.min(choppingBound.top, y);
                boundFlag = true;
                break;
            }

        }

        if (boundFlag) break;

    }

    boundFlag = false;
    for (var x = 0; x < pieceData.width; x++) {
        for (var y = 0; y < pieceData.height; y++) {
            
            var id = (y * pieceData.width + x) * 4;
            if (pieceData.data[id + 3] == 255) {
                choppingBound.left = Math.min(choppingBound.left, x);
                boundFlag = true;
                break;
            }

        }

        if (boundFlag) break;

    }

    boundFlag = false;
    for (var y = pieceData.height - 1; y >= 0; y--) {
        for (var x = 0; x < pieceData.width; x++) {
            
            var id = (y * pieceData.width + x) * 4;
            if (pieceData.data[id + 3] == 255) {
                choppingBound.bottom = Math.max(choppingBound.bottom, y);
                boundFlag = true;
                break;
            }

        }

        if (boundFlag) break;

    }

    boundFlag = false;
    for (var x = pieceData.width; x >= 0; x--) {
        for (var y = 0; y < pieceData.height; y++) {
            
            var id = (y * pieceData.width + x) * 4;
            if (pieceData.data[id + 3] == 255) {
                choppingBound.right = Math.max(choppingBound.right, x);
                boundFlag = true;
                break;
            }

        }

        if (boundFlag) break;

    }

}

function uploadImg() {

    var imgFile = $("#img-file")[0].files[0];
    inputImgName = imgFile.name.substr(0, imgFile.name.indexOf("."));

    console.log("Uploaded image:", inputImgName);
    $("#status").html("Uploaded image. Done");

    var url = URL.createObjectURL(imgFile);
    inputImg.onload = function() {
        
        $("#img-size").html(inputImg.width + " x " + inputImg.height);
        $("#save-pieces-btn")[0].disabled = true;
        $("#start-chopping-btn")[0].disabled = false;

        getImgSceneAspect();
        initImgCanvas();
        showImg(inputImg);

    }
    inputImg.src = url; 

}

function initImgCanvas() {

    imgCanvas = document.createElement("canvas");
    imgCanvas.width = inputImg.width;
    imgCanvas.height = inputImg.height;

    imgCtx = imgCanvas.getContext("2d");
    imgCtx.drawImage(inputImg, 0, 0);

}

function getImgSceneAspect() {

    var scene = $("#scene")[0];
    var sceneAspect = scene.width / scene.height;
    var imgAspect = inputImg.width / inputImg.height;
    
    if (imgAspect >= sceneAspect) {
        scaledWidth = scene.width;
        scaledHeight = scene.width / inputImg.width * inputImg.height;
    } else {
        scaledWidth = scene.height / inputImg.height * inputImg.width;
        scaledHeight = scene.height;
    }

}

function showImg(img) {

    console.log("Show image.");

    var scene = $("#scene")[0];
    var ctx = scene.getContext("2d");
    
    ctx.clearRect(0, 0, scene.width, scene.height);
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

}

function savePieces() {

    var tmp = getRegions(regionMat, regionNum);
    var pieceSize = tmp[0];
    var bound = tmp[1];

    console.log("Original Piece Size:", pieceSize);

    var zip = new JSZip();

    // var str = "width " + pieceSize[0] + "\n\r" + "height " + pieceSize[1];
    // zip.file("info.txt", str);

    var pieceCanvas = document.createElement("canvas");
    pieceCanvas.width = pieceSize[0];
    pieceCanvas.height = pieceSize[1];
    var pieceCtx = pieceCanvas.getContext("2d");
    var imgData = imgCtx.getImageData(0, 0, inputImg.width, inputImg.height);
    
    var pieceInfo = [];

    // ctx.putImageData is not affected by transforms (translate, rotate).
    // So we need a temporary canvas to store the rotate transformations.
    var inMemoryCanvas = document.createElement("canvas");
    inMemoryCanvas.width = pieceSize[0];
    inMemoryCanvas.height = pieceSize[1];
    var inMemoryCtx = inMemoryCanvas.getContext("2d");

    var choppingBound = {
        left: pieceSize[0],
        right: 0,
        top: pieceSize[1],
        bottom: 0
    };

    var pieceDataArr = [];

    for (var i = 0; i < regionNum; i++) {

        pieceCtx.save();
        
        var rotation = Math.random() * 2 * Math.PI;
        pieceCtx.translate(pieceSize[0] / 2, pieceSize[1] / 2);
        pieceCtx.rotate(rotation);
        pieceCtx.translate(-pieceSize[0] / 2, -pieceSize[1] / 2);

        var gapWidth = Math.round((pieceSize[0] - bound.width[i]) / 2);
        var gapHeight = Math.round((pieceSize[1] - bound.height[i]) / 2);
        var dx = bound.left[i] - gapWidth;
        var dy = bound.top[i] - gapHeight;

        pieceInfo.push({
            "id": i,
            "dx": dx,
            "dy": dy,
            "rotation": 2 * Math.PI - rotation
        });

        var pieceData = imgCtx.createImageData(pieceSize[0], pieceSize[1]);
        pieceData = applyRegionMask(pieceData, imgData, regionMat, i, bound, gapWidth, gapHeight);
        inMemoryCtx.putImageData(pieceData, 0, 0);
        pieceCtx.drawImage(inMemoryCanvas, 0, 0);

        pieceData = pieceCtx.getImageData(0, 0, pieceCanvas.width, pieceCanvas.height);
        updateChoppingBound(choppingBound, pieceData);
        pieceDataArr.push(pieceData);

        pieceCtx.restore();
        pieceCtx.clearRect(0, 0, pieceSize[0], pieceSize[1]);

    }

    // Add regionMargin to the chopping bound
    choppingBound.left = Math.max(0, choppingBound.left - regionMargin);
    choppingBound.right = choppingBound.right + regionMargin;
    choppingBound.top = Math.max(0, choppingBound.top - regionMargin);
    choppingBound.bottom = choppingBound.bottom + regionMargin;

    console.log("Piece Chopping Bound:", choppingBound);

    // Maintain the symmetric
    var widthBlank = Math.min(choppingBound.left, pieceSize[0] - choppingBound.right - 1);
    var heightBlank = Math.min(choppingBound.top, pieceSize[1] - choppingBound.bottom - 1);

    // widthBlank = 100;
    // heightBlank = 100;

    console.log("Width Blank:", widthBlank, "Height Blank:", heightBlank);

    var pieceWidth = pieceSize[0] - widthBlank * 2;
    var pieceHeight = pieceSize[1] - heightBlank * 2;

    $("#piece-size").html(pieceWidth + " x " + pieceHeight);

    pieceCanvas = document.createElement("canvas");
    pieceCanvas.width = pieceWidth;
    pieceCanvas.height = pieceHeight;
    pieceCtx = pieceCanvas.getContext("2d");

    for (var i = 0; i < regionNum; i++) {
        
        pieceInfo[i].dx += widthBlank;
        pieceInfo[i].dy += heightBlank;

        pieceCtx.putImageData(pieceDataArr[i], -widthBlank, -heightBlank, 
            widthBlank, heightBlank, pieceWidth, pieceHeight);
        
        var pieceName = "piece-" + i + ".png"; // jpg / png
        var pieceBase64 = pieceCanvas.toDataURL().split("base64,"); // "image/jpeg", 1
        zip.file(pieceName, pieceBase64[1], {base64: true});

    }

    // Save groundtruth
    // zip.file("groundtruth.json", JSON.stringify(pieceInfo));

    // Note: save json by blob. Dont miss stringify, dont miss [];
    var blob = new Blob([JSON.stringify(pieceInfo)], {type: "application/json"});
    saveAs(blob, inputImgName + "-groundtruth.json");

    // Save chopping result
    var scene = $("#scene")[0];
    var choppingResult = scene.toDataURL("image/jpeg", 1).split("base64,");
    zip.file("chopping-result.jpg", choppingResult[1], {base64: true});

    $("#status").html("Generate pieces. Done.");

    var zipName = inputImgName + "-pieces.zip";
    zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, zipName);
    });

}

function rectangleChopping() {
    var w = 100;
    var n = 5; 
    for (var i = 1; i < 5; i++) {
        var mean = 1 / (n - i + 1);
        var stdDev = mean / 3;
        var x = randNormDist(mean, stdDev);
        console.log(x);
    }
}

function applyChoppingMat(choppingMat) {

    showImg(inputImg);

    var scene = $("#scene")[0];
    var ctx = scene.getContext("2d");

    var choppingMark = ctx.createImageData(1, 1);
    choppingMark.data[0] = 255;
    choppingMark.data[3] = 255;

    var heightScale = scaledHeight / inputImg.height;
    var widthScale = scaledWidth / inputImg.width;

    for (var i = 0; i < inputImg.height; i++) {
        for (var j = 0; j < inputImg.width; j++) {
            
            if (choppingMat[i][j] == 2) {
                var dx = Math.floor(j * widthScale);
                var dy = Math.floor(i * heightScale);
                ctx.putImageData(choppingMark, dx, dy);
            }

        }
    }

}

function randomChopping() {
    
    var rowSeams = parseInt($("#row-seams").val());
    var colSeams = parseInt($("#col-seams").val());
    var smallRegion = parseInt($("#small-region").val());
    var carvingStepHori = parseInt($("#carving-step-hori").val());
    var carvingStepVert = parseInt($("#carving-step-vert").val());

    var timeSt = new Date().getTime();

    var choppingMatVer = seamChopping(inputImg.width, inputImg.height, colSeams, carvingStepHori, carvingStepVert);

    var choppingMatHor = seamChopping(inputImg.height, inputImg.width, rowSeams, carvingStepHori, carvingStepVert);
    choppingMatHor = rotateMat(choppingMatHor);

    var choppingMat = maxMat(choppingMatVer, choppingMatHor);

    var tmp = fineTuningRegion(choppingMat, smallRegion);
    regionMat = tmp[0];
    choppingMat = tmp[1];
    regionNum = tmp[2];

    var timeEd = new Date().getTime();
    var timePass = (timeEd - timeSt) / 1000.0;
    console.log("Time used", timePass + "s.");

    $("#region-num").html(regionNum);
    
    applyChoppingMat(choppingMat);

    $("#save-pieces-btn")[0].disabled = false;

    $("#status").html("Seam chopping. Done.");
    
}

function startChopping() {

    var method = $("input[name='method']:checked").val();

    console.log(method.toUpperCase(), "chopping.");

    switch (method) {
        case "rectangle": 
            rectangleChopping();
            break;
        case "random":
            randomChopping();
            break;
        case "seam":
            seamChopping();
            break;
    }

}
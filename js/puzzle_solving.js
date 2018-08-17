var pieceImgArr = [];
var piecesNum;
var pieceWidth, pieceHeight;
var pieceDisplayWidth = 200;

var transformsFile;

$(document).ready(function () {


});


function uploadPieces() {

    var file = $("#upload-file")[0].files[0];
    pkgName = file.name.substr(0, file.name.indexOf("."));

    console.log("Uploaded pieces package:", pkgName);
    $("#status").html("Uploaded pieces package. Done");

    JSZip.loadAsync(file).then(function(zip) {

        piecesNum = getPiecesNum(zip);

        $("#pieces-num").html(piecesNum);

        zip.forEach(function(relativePath, zipEntry) {

            if (testPieceName(relativePath)) {
                zipEntry.async("base64").then(function (data64) {

                    var pieceImg = new Image();

                    pieceImg.onload = function() {
                        pieceImgArr.push(pieceImg);
                        if (pieceImgArr.length == piecesNum) {
                            showPieces();
                            $("btn-load-transforms")[0].disabled = false;
                        }
                    }

                    pieceImg.src = "data:image/jpeg;base64," + data64;
                    
                });
            }

        });
        
        pieceWidth = pieceImgArr[0].width;
        pieceHeight = pieceImgArr[0].height;

        $("#piece-size").html(pieceWidth + " x " + pieceHeight);

        console.log("Load pieces done.");

    });

}

function showPieces() {

    var rowNumLimited = 4;
    var rowNum = 0;
    var rowPiecesObj, rowIndexObj;

    for (var i = 0; i < pieceImgArr.length; i++) {
        
        if (rowNum % rowNumLimited == 0) {
            rowPiecesObj = document.createElement("div");
            rowPiecesObj.className = "row justify-content-between";

            rowIndexObj = document.createElement("div");
            rowIndexObj.className = "row justify-content-between";
        }

        rowNum++;

        var pieceDisplayHeight = pieceDisplayWidth / pieceImgArr[i].width * pieceImgArr[i].height;

        var pieceCanvas = document.createElement("canvas");
        pieceCanvas.className = "col-3";
        pieceCanvas.width = pieceDisplayWidth;
        pieceCanvas.height = pieceDisplayHeight;

        var pieceCtx = pieceCanvas.getContext("2d");
        pieceCtx.drawImage(pieceImgArr[i], 0, 0, pieceDisplayWidth, pieceDisplayHeight);

        rowPiecesObj.append(pieceCanvas);

        var index = document.createElement("p");
        index.className = "col-3 text-center";
        index.innerHTML = i;
        rowIndexObj.append(index);

        if (rowNum % rowNumLimited == 0) {
            $("#pieces").append(rowPiecesObj);
            $("#pieces").append(rowIndexObj);
        }

    }

    console.log("Show pieces.");

}

function loadTransforms() {

    var file = $("#upload-file")[0].files[0];
    var transformsName = file.name.substr(0, file.name.indexOf("."));

    console.log("Uploaded transforms:", transformsName);

    var fileReader = new FileReader();

    fileReader.onload = function() {
        transformsFile = fileReader.result;
        composeImage();
    }

    fileReader.readAsText(file);

}

function composeImage() {
    console.log(transformsFile);
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

    $("#piece-size").html(pieceSize[0] + " x " + pieceSize[1]);

    var zip = new JSZip();

    // var str = "width " + pieceSize[0] + "\n\r" + "height " + pieceSize[1];
    // zip.file("info.txt", str);

    var pieceCanvas = document.createElement("canvas");
    pieceCanvas.width = pieceSize[0];
    pieceCanvas.height = pieceSize[1];
    var pieceCtx = pieceCanvas.getContext("2d");
    var imgData = imgCtx.getImageData(0, 0, inputImg.width, inputImg.height);

    var pieceInfo = [];

    for (var i = 0; i < regionNum; i++) {
        
        var pieceLeft = Math.round((pieceSize[0] - bound.width[i]) / 2);
        var pieceTop = Math.round((pieceSize[1] - bound.height[i]) / 2);

        var pieceName = "piece-" + i + ".jpg";
        var pieceData = imgCtx.createImageData(pieceSize[0], pieceSize[1]);

        var dx = bound.left[i] - pieceLeft;
        var dy = bound.top[i] - pieceTop;

        pieceInfo.push({
            "id": i,
            "dx": dx,
            "dy": dy
        });

        pieceData = applyRegionMask(pieceData, imgData, regionMat, i, bound, pieceLeft, pieceTop);
        pieceCtx.putImageData(pieceData, 0, 0);
        var pieceBase64 = pieceCanvas.toDataURL("image/jpeg", 1).split("base64,");
        
        zip.file(pieceName, pieceBase64[1], {base64: true});

    }

    // Save groundtruth
    zip.file("groundtruth.json", JSON.stringify(pieceInfo));

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
    
    var rowSeams = $("#row-seams").val();
    var colSeams = $("#col-seams").val();
    var smallRegion = $("#small-region").val();

    var choppingMatVer = seamChopping(inputImg.width, inputImg.height, colSeams, 0);

    var choppingMatHor = seamChopping(inputImg.height, inputImg.width, rowSeams, 0);
    choppingMatHor = rotateMat(choppingMatHor);

    var choppingMat = maxMat(choppingMatVer, choppingMatHor);

    var tmp = fineTuningRegion(choppingMat, smallRegion);
    regionMat = tmp[0];
    choppingMat = tmp[1];
    regionNum = tmp[2];

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
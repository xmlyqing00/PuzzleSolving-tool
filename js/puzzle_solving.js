var pieceImgArr = [];
var piecesNum;
var pieceWidth, pieceHeight;
var pieceDisplayWidth = 230;

var transformsFile, globalTransforms;

var emptyThres = 20;

var showBoundaryStatus = false;
var secondPieceTransform;
var pieceId0, pieceId1;

$(document).ready(function () {

    var mousePointSt;
    
    $("#pairwise-interaction").mousedown(function() {

    });

});

// Upload pieces

function uploadPieces() {

    var file = $("#upload-file")[0].files[0];
    if (file == undefined) {
        $("#status").html("Nothing to upload.");    
        return;
    }

    pkgName = file.name.substr(0, file.name.indexOf("."));

    console.log("Uploaded pieces package:", pkgName);
    $("#status").html("Uploaded pieces package.");

    JSZip.loadAsync(file).then(function(zip) {

        piecesNum = getPiecesNum(zip);

        $("#pieces-num").html(piecesNum);

        zip.forEach(function(relativePath, zipEntry) {

            if (testPieceName(relativePath)) {
                zipEntry.async("base64").then(function (data64) {

                    var pieceImg = new Image();

                    pieceImg.onload = function() {
                        
                        var pieceId = getPieceID(relativePath);
                        pieceImgArr.push({
                            id: pieceId,
                            img: pieceImg
                        });

                        if (pieceImgArr.length == piecesNum) {
                            
                            var reSortArr = [];
                            for (var i = 0; i < piecesNum; i++) {
                                reSortArr[pieceImgArr[i].id] = pieceImgArr[i].img;
                            }
                            pieceImgArr = reSortArr;

                            pieceWidth = pieceImgArr[0].width;
                            pieceHeight = pieceImgArr[0].height;

                            $("#piece-size").html(pieceWidth + " x " + pieceHeight);
                            console.log("Load pieces done.");

                            showPieces();
                            $("#btn-load-transforms")[0].disabled = false;
                            $("#btn-select-pieces")[0].disabled = false;
                            $("#upload-file")[0].value = "";

                        }

                    }

                    pieceImg.src = "data:image/jpeg;base64," + data64;
                    
                });
            }

        });
        
        

    });

}

function showPieces() {

    $("#pieces").empty();

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

        if (rowNum % rowNumLimited == 0 || i == pieceImgArr.length - 1) {
            $("#pieces").append(rowPiecesObj);
            $("#pieces").append(rowIndexObj);
        }

    }

    console.log("Show pieces.");

}

// Upload global transform

function uploadGlobalTransform() {

    var file = $("#upload-file")[0].files[0];
    if (file == undefined) {
        $("#status").html("Nothing to upload.");    
        return;
    }

    var transformsName = file.name.substr(0, file.name.indexOf("."));

    $("#status").html("Uploaded global transform.");
    console.log("Uploaded transforms:", transformsName);

    var fileReader = new FileReader();

    fileReader.onload = function() {
        transformsFile = fileReader.result;
        composeImage();

        $("#upload-file")[0].value = "";
    }

    fileReader.readAsText(file);

}

function composeImage() {
    
    if (pieceWidth == 0 || pieceHeight == 0) {
        $("#status").html("Pieces need to be uploaded.");
        return;
    }

    $("#global-image").empty();

    // Get global transforms.
    transformsJSON = JSON.parse(transformsFile);
    globalTransforms = [];
    for (var i = 0; i < transformsJSON.length; i++) {
        globalTransforms[transformsJSON[i].id] = {
            dx: transformsJSON[i].dx,
            dy: transformsJSON[i].dy,
            rotation: transformsJSON[i].rotation
        };
    }

    // Get global image size
    var imageWidth = 0;
    var imageHeight = 0;

    for (var i = 0; i < globalTransforms.length; i++) {
        imageWidth = Math.max(imageWidth, pieceWidth + globalTransforms[i].dx);
        imageHeight = Math.max(imageHeight, pieceHeight + globalTransforms[i].dy);
    }

    $("#composition-size").html(imageWidth + " x " + imageHeight);

    // Create global hidden canvas
    var globalHiddenCanvas = document.createElement("canvas");
    globalHiddenCanvas.width = imageWidth;
    globalHiddenCanvas.height = imageHeight;
    var globalHiddenCtx = globalHiddenCanvas.getContext("2d");

    // Create piece hidden canvas
    var pieceHiddenCanvas = document.createElement("canvas");
    pieceHiddenCanvas.width = pieceWidth;
    pieceHiddenCanvas.height = pieceHeight;
    var pieceHiddenCtx = pieceHiddenCanvas.getContext("2d");

    // Align each piece
    for (var i = 0; i < piecesNum; i++) {

        console.log("piece", i);

        pieceHiddenCtx.save();        
        pieceHiddenCtx.fillRect(0, 0, pieceWidth, pieceHeight);

        // Rotation
        pieceHiddenCtx.translate(pieceWidth/2, pieceHeight/2);
        pieceHiddenCtx.rotate(globalTransforms[i].rotation);
        pieceHiddenCtx.translate(-pieceWidth/2, -pieceHeight/2);

        // Draw piece img to piece ctx
        pieceHiddenCtx.drawImage(pieceImgArr[i], 0, 0);

        // Translate
        globalHiddenCtx = drawPieceToImage(pieceHiddenCtx, globalHiddenCtx, globalTransforms[i]);

        pieceHiddenCtx.restore();

    }

    // Chop global bound
    var globalHiddenData = globalHiddenCtx.getImageData(0, 0, imageWidth, imageHeight);

    var foundLastEmptyLine = false;
    for (var y = imageHeight - 1; y >= 0; y--) {
        for (var x = 0; x < imageWidth; x++) {

            var id = (y * imageWidth + x) * 4;
            if (globalHiddenData.data[id] + globalHiddenData.data[id+1] + globalHiddenData.data[id+2] > emptyThres) {
                imageHeight = y + 1;
                foundLastEmptyLine = true;
                break;
            }
    
        }

        if (foundLastEmptyLine) break;

    }

    foundLastEmptyLine = false;
    for (var x = imageWidth - 1; x >= 0; x--) {
        for (var y = 0; y < imageHeight; y++) {

            var id = (y * imageWidth + x) * 4;
            if (globalHiddenData.data[id] + globalHiddenData.data[id+1] + globalHiddenData.data[id+2] > emptyThres) {
                imageWidth = x + 1;
                foundLastEmptyLine = true;
                break;
            }
    
        }

        if (foundLastEmptyLine) break;

    }

    // Create global Display canvas
    var globalDisplayCanvas = document.createElement("canvas");
    globalDisplayCanvas.width = 960;
    globalDisplayCanvas.height = 960 / imageWidth * imageHeight;
    $("#global-image").append(globalDisplayCanvas);

    var globalDisplayCtx = globalDisplayCanvas.getContext("2d");
    globalDisplayCtx.drawImage(globalHiddenCanvas, 
        0, 0, imageWidth, imageHeight,
        0, 0, globalDisplayCanvas.width, globalDisplayCanvas.height);

}

// Pairwise Interaction

function selectPieces() {

    pieceId0 = parseInt($("#piece-id0").val());
    pieceId1 = parseInt($("#piece-id1").val());

    if (pieceId0 < 0 || pieceId0 >= piecesNum ||
        pieceId1 < 0 || pieceId1 >= piecesNum) {
            console.log("Invalided piece id.");
            return;
        }
    
    var pairwiseCanvas = document.createElement("canvas");
    pairwiseCanvas.width = 960;
    pairwiseCanvas.height = 960 / (pieceWidth * 3) * (pieceHeight * 3);
    pairwiseCanvas.id = "pairwise-canvas";
    $("#pairwise-interaction").empty();
    $("#pairwise-interaction").append(pairwiseCanvas);
    
    if (globalTransforms == undefined) {
        
        secondPieceTransform = {
            dx: 0,
            dy: 0,
            rotation: 0
        };
        
        showPairwisePieces();

    } else {

    }
    

}

function showPairwisePieces() {

    var pairwiseCanvas = $("#pairwise-canvas")[0];
    var pairwiseCtx = pairwiseCanvas.getContext("2d");

    pairwiseCtx.drawImage(pieceImgArr[pieceId0], 
        pairwiseCanvas.width / 3, pairwiseCanvas.height / 3, 
        pairwiseCanvas.width / 3, pairwiseCanvas.height / 3);

    pairwiseCtx.drawImage(pieceImgArr[pieceId1], 
        pairwiseCanvas.width * 2 / 3, pairwiseCanvas.height / 3, 
        pairwiseCanvas.width / 3, pairwiseCanvas.height / 3);


}

function toggleBoundary() {

    showBoundaryStatus = !showBoundaryStatus;

    

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
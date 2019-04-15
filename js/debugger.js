// Show pieces
var pieceImgArr = [];
var piecesNum;
var pieceWidth, pieceHeight;
const pieceDisplayWidth = 230;

var transformsFile, globalTransforms;

var emptyThres = 20;

// Pairwise interaction
var pieceTransform0, pieceTransform1;
var pairwiseScale = 1;
var pieceId0, pieceId1;

// Show contour
var showContourStatus = false;

// Translate
var mousePointPrev;
var mouseStatus = false;
var selectPairwisePieces = false;

// Rotate
const PI_2 = 2 * Math.PI;
const rotate_step = 0.08727;

// Uitls
const way = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
const connectedWay = 8;
const pieceReg = /^piece-\d+(\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$)/;
const pieceNameReg = /^piece-(\d+)(\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$)/;

var bg_color = [0, 0, 0]; // In RGB format

$(document).ready(function () {
    
    $("#pairwise-interaction").mousedown(function(event) {

        if (!selectPairwisePieces) return;

        mousePointPrev = {
            x: event.pageX - $("#pairwise-interaction").offset().left,
            y: event.pageY - $("#pairwise-interaction").offset().top,
        };

        mouseStatus = true;

    });

    $("#pairwise-interaction").mousemove(function(event) {
        
        if (!mouseStatus) return;

        var mousePoint = {
            x: event.pageX - $("#pairwise-interaction").offset().left,
            y: event.pageY - $("#pairwise-interaction").offset().top,
        };

        pieceTransform1.dx += pairwiseScale * (mousePoint.x - mousePointPrev.x);
        pieceTransform1.dy += pairwiseScale * (mousePoint.y - mousePointPrev.y);

        mousePointPrev = mousePoint;

        updatePieceTransformsInfo();
        showPairwisePieces();

    });

    $("#pairwise-interaction").mouseup(function(event) {
        mouseStatus = false;
    });

});

function testPieceName(str) {

    if (pieceReg.test(str)) {
        return true;
    } else {
        return false;
    }

}

function getPieceID(str) {

    var res = pieceNameReg.exec(str);
    return res[1];

}

function getPiecesNum(zip) {

    var num = 0;

    zip.forEach(function(relativePath, zipEntry) {
        console.log(relativePath);
        if (testPieceName(relativePath)) {
            num++;
        }
    });

    return num;

}

function drawPieceToImage(pieceHiddenCtx, globalHiddenCtx, pieceTransform) {
    
    var pieceData = pieceHiddenCtx.getImageData(0, 0, pieceWidth, pieceHeight);
    var globalData = globalHiddenCtx.getImageData(pieceTransform.dx, pieceTransform.dy, pieceWidth, pieceHeight);
    
    // Notes:
    // Math.floor for the variable loop is very important.
    // Because when either dx or dy is a float number, the pieceData can not be read correctly.
    // The result will be empty.
    
    for (var y = Math.floor(Math.max(0, 0-pieceTransform.dy)); y < pieceHeight; y++) {
        for (var x = Math.floor(Math.max(0, 0-pieceTransform.dx)); x < pieceWidth; x++) {

            var id = (y * pieceWidth + x) * 4;
            if ((globalData.data[id + 3] == 0 && pieceData.data[id + 3] == 255) && 
                !(pieceData.data[id] == bg_color[0] && pieceData.data[id+1] == bg_color[1] && pieceData.data[id+2] == bg_color[2])) {
                globalData.data[id] = pieceData.data[id];
                globalData.data[id + 1] = pieceData.data[id + 1];
                globalData.data[id + 2] = pieceData.data[id + 2];
                globalData.data[id + 3] = pieceData.data[id + 3];
            }
            
        }
    }

    globalHiddenCtx.putImageData(globalData, pieceTransform.dx, pieceTransform.dy);

    return globalHiddenCtx;

}

function drawContour(pieceHiddenCtx) {

    var pieceData = pieceHiddenCtx.getImageData(0, 0, pieceWidth, pieceHeight);

    for (var y = 1; y < pieceHeight; y++) {
        for (var x = 1; x < pieceWidth; x++) {

            var curId = (y * pieceWidth + x) * 4;

            if (pieceData.data[curId + 3] == 0) continue;

            for (var k = 0; k < connectedWay; k++) {

                var neighId = ((y + way[k][1]) * pieceWidth + x + way[k][0]) * 4;
                if (pieceData.data[neighId + 3] == 0) {
                    
                    pieceData.data[curId] = 255;
                    pieceData.data[curId + 1] = 0;
                    pieceData.data[curId + 2] = 0;

                    continue;

                }

            }

        }
    }

    pieceHiddenCtx.putImageData(pieceData, 0, 0);

    return pieceHiddenCtx;

}

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
    pieceImgArr = [];

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
            } else if (relativePath == "config.txt") {

                zipEntry.async("text").then(function (text) {
                    config_arr = text.split("\n");
                    colors = config_arr[2].split(" ");
                    bg_color = [parseInt(colors[2]), parseInt(colors[1]), parseInt(colors[0])];
                    console.log("Background color:", bg_color);
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

    $("#global-image").empty();
    $("#pairwise-interaction").empty();
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

        pieceHiddenCtx.save();        
        pieceHiddenCtx.clearRect(0, 0, pieceWidth, pieceHeight);

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
            if (globalHiddenData.data[id + 3] == 255) {
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
            if (globalHiddenData.data[id + 3] == 255) {
                imageWidth = x + 1;
                foundLastEmptyLine = true;
                break;
            }
    
        }

        if (foundLastEmptyLine) break;

    }

    $("#composition-size").html(imageWidth + " x " + imageHeight);

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
    
    selectPairwisePieces = true;
    pairwiseScale = pieceWidth * 3 / 960;

    $("#btn-rotate-first-left")[0].disabled = false;
    $("#btn-rotate-first-right")[0].disabled = false;
    $("#btn-rotate-second-left")[0].disabled = false;
    $("#btn-rotate-second-right")[0].disabled = false;
    $("#btn-toggle-contour")[0].disabled = false;

    var pairwiseCanvas = document.createElement("canvas");
    pairwiseCanvas.width = 960;
    pairwiseCanvas.height = 960 / (pieceWidth / pieceHeight);
    pairwiseCanvas.id = "pairwise-canvas";
    pairwiseCanvas.className = "solid-border";
    $("#pairwise-interaction").empty();
    $("#pairwise-interaction").append(pairwiseCanvas);

    if (globalTransforms == undefined) {
        
        pieceTransform0 = {
            dx: 0,
            dy: 0,
            rotation: 0
        };

        pieceTransform1 = {
            dx: 0,
            dy: 0,
            rotation: 0
        };
        
        showPairwisePieces();

    } else {
        
        pieceTransform0 = {
            dx: 0,
            dy: 0,
            rotation: globalTransforms[pieceId0].rotation
        };

        pieceTransform1 = {
            dx: pieceWidth + globalTransforms[pieceId1].dx - globalTransforms[pieceId0].dx,
            dy: pieceHeight + globalTransforms[pieceId1].dy - globalTransforms[pieceId0].dy,
            rotation: globalTransforms[pieceId1].rotation
        };

        showPairwisePieces();

    }

    updatePieceTransformsInfo();
    
}

function updatePieceTransformsInfo() {

    $("#piece0-dx").html(pieceTransform0.dx.toFixed(2));
    $("#piece1-dx").html((pieceTransform1.dx - pieceWidth).toFixed(2));
    $("#piece0-dy").html(pieceTransform0.dy.toFixed(2));
    $("#piece1-dy").html((pieceTransform1.dy - pieceHeight).toFixed(2));
    $("#piece0-rotation").html(pieceTransform0.rotation.toFixed(2));
    $("#piece1-rotation").html(pieceTransform1.rotation.toFixed(2));

}

function showPairwisePieces() {

    // Create hidden global canvas
    var pairwiseHiddenCanvas = document.createElement("canvas");
    pairwiseHiddenCanvas.width = pieceWidth * 3;
    pairwiseHiddenCanvas.height = pieceHeight * 3;
    var pairwiseHiddenCtx = pairwiseHiddenCanvas.getContext("2d");

    // Create single piece hidden canvas
    var pieceHiddenCanvas = document.createElement("canvas");
    pieceHiddenCanvas.width = pieceWidth;
    pieceHiddenCanvas.height = pieceHeight;

    var pieceHiddenCtx = pieceHiddenCanvas.getContext("2d");

    // Draw piece 0 to hidden global canvas
    pieceHiddenCtx.save();
    pieceHiddenCtx.translate(pieceWidth / 2, pieceHeight / 2);
    pieceHiddenCtx.rotate(pieceTransform0.rotation);
    pieceHiddenCtx.translate(-pieceWidth / 2, -pieceHeight / 2);
    pieceHiddenCtx.drawImage(pieceImgArr[pieceId0], 0, 0);
    pieceHiddenCtx.restore();

    // Add contour
    if (showContourStatus) {
        pieceHiddenCtx = drawContour(pieceHiddenCtx);
    }

    pieceTransformCtr = {
        "dx": pieceWidth,
        "dy": pieceHeight
    };
    pairwiseHiddenCtx = drawPieceToImage(pieceHiddenCtx, pairwiseHiddenCtx, pieceTransformCtr);
    
    // Draw piece 1 to hidden global canvas
    pieceHiddenCtx.save();
    pieceHiddenCtx.clearRect(0, 0, pieceWidth, pieceHeight);
    pieceHiddenCtx.translate(pieceWidth / 2, pieceHeight / 2);
    pieceHiddenCtx.rotate(pieceTransform1.rotation);
    pieceHiddenCtx.translate(-pieceWidth / 2, -pieceHeight / 2);
    pieceHiddenCtx.drawImage(pieceImgArr[pieceId1], 0, 0);
    pieceHiddenCtx.restore();

    // Add contour
    if (showContourStatus) {
        pieceHiddenCtx = drawContour(pieceHiddenCtx);
    }
    
    pairwiseHiddenCtx = drawPieceToImage(pieceHiddenCtx, pairwiseHiddenCtx, pieceTransform1);

    // Get global canvas;
    var pairwiseCanvas = $("#pairwise-canvas")[0];
    var pairwiseCtx = pairwiseCanvas.getContext("2d");
    
    // Draw hidden canvas to global canvas
    pairwiseCtx.clearRect(0, 0, pairwiseCanvas.width, pairwiseCanvas.height);
    pairwiseCtx.drawImage(pairwiseHiddenCanvas, 
        0, 0, pairwiseCanvas.width, pairwiseCanvas.height);

}

function rotateFirstLeft() {

    pieceTransform0.rotation -= rotate_step;
    if (pieceTransform0.rotation > PI_2) {
        pieceTransform0.rotation -= PI_2;
    }

    updatePieceTransformsInfo();
    showPairwisePieces();

}

function rotateFirstRight() {

    pieceTransform0.rotation += rotate_step;
    if (pieceTransform0.rotation > PI_2) {
        pieceTransform0.rotation -= PI_2;
    }

    updatePieceTransformsInfo();
    showPairwisePieces();

}

function rotateSecondLeft() {

    pieceTransform1.rotation -= rotate_step;
    if (pieceTransform1.rotation > PI_2) {
        pieceTransform1.rotation -= PI_2;
    }

    updatePieceTransformsInfo();
    showPairwisePieces();

}

function rotateSecondRight() {

    pieceTransform1.rotation += rotate_step;
    if (pieceTransform1.rotation > PI_2) {
        pieceTransform1.rotation -= PI_2;
    }

    updatePieceTransformsInfo();
    showPairwisePieces();

}

function toggleContour() {

    showContourStatus = !showContourStatus;

    showPairwisePieces();

}


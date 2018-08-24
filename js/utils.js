const way = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
const connectedWay = 8;
const pieceReg = /piece-\d+(\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$)/;
const pieceNameReg = /piece-(\d+)(\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$)/;

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
            if (globalData.data[id + 3] == 0 && pieceData.data[id + 3] == 255) {
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

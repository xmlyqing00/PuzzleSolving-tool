const way = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
const connectedWay = 4;
const pieceReg = /piece-\d+(\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$)/;

function testPieceName(str) {

    if (pieceReg.test(str)) {
        return true;
    } else {
        return false;
    }

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

function seamChopping(w, h, n, margin) {

    var choppingMat = createMat(h, w, 0); // choppingMat = (height x width)

    for (var i = 0; i < n; i++) {
        
        var p = [Math.floor(Math.random() * w), 0]; // p = (x,y)

        choppingMat[p[1]][p[0]] = 2; 

        while (p[1] < h - 1) {
            
            var way;
            var nextP;
            while (true) {
                way = Math.floor(Math.random() * 3) - 1;
                nextP = [p[0] + way, p[1] + 1];
                if (!checkOutside(nextP, w, h)) break;
            }
            
            p = nextP;
            choppingMat[p[1]][p[0]] = 2;

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

    var pieceSize = [maxWidth + regionMargin * 2, maxHeight + regionMargin * 2];
    var bound = {
        left: boundLeft,
        top: boundTop,
        width: boundWidth,
        height: boundHeight
    };

    return [pieceSize, bound];
    
}

function applyRegionMask(pieceData, imgData, regionMat, regionId, bound, pieceLeft, pieceTop) {

    for (var dh = 0; dh < bound.height[regionId]; dh++) {

        var imgY = bound.top[regionId] + dh;
        var pieceY = pieceTop + dh;
        
        for (var dw = 0; dw < bound.width[regionId]; dw++) {

            var imgX = bound.left[regionId] + dw;
            var pieceX = pieceLeft + dw;

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
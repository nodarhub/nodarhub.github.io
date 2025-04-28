const WIDTH = 1200;
const HEIGHT = 1200;

const NODAR_BLUE = [36, 107, 253];

const CAMERA_WIDTH = 10;
const CAMERA_HEIGHT = 10;
const CAMERA_CENTER = WIDTH/2;
const FOV_SIZE = HEIGHT-CAMERA_HEIGHT;
const DISPLAY_SCALE_TO_FIRST_OVERLAP = 75;
const MAX_DISPARITY = 1024;

let pixelPerMeter = 100;

class StereoCamera {
    constructor(baseline, fov, imageSize) {
        this.baseline = baseline;
        this.fov = fov;
        this.imageSize = imageSize;
    }

    draw() {
        const leftCamCenterX = CAMERA_CENTER - this.baseline*pixelPerMeter/2;
        const rightCamCenterX = CAMERA_CENTER + this.baseline*pixelPerMeter/2;

        stroke(...NODAR_BLUE);
        rectMode(CENTER);

        fill(0);

        rect(leftCamCenterX, CAMERA_HEIGHT/2, CAMERA_WIDTH, CAMERA_HEIGHT);
        rect(rightCamCenterX, CAMERA_HEIGHT/2, CAMERA_WIDTH, CAMERA_HEIGHT);
        
        fill(...NODAR_BLUE,100);
        // The triangle opens at the fov in degrees and extends to FOX size in the y direction
        const fovWidth = Math.tan(radians(this.fov/2)) * FOV_SIZE;
        triangle(leftCamCenterX, CAMERA_HEIGHT, leftCamCenterX-fovWidth, FOV_SIZE+CAMERA_HEIGHT, leftCamCenterX+fovWidth, FOV_SIZE+CAMERA_HEIGHT);
        triangle(rightCamCenterX, CAMERA_HEIGHT, rightCamCenterX-fovWidth, FOV_SIZE+CAMERA_HEIGHT, rightCamCenterX+fovWidth, FOV_SIZE+CAMERA_HEIGHT);

        let firstOverlap = this.calculateFirstOverlap();
        line(0, firstOverlap*pixelPerMeter + CAMERA_HEIGHT, WIDTH, firstOverlap*pixelPerMeter + CAMERA_HEIGHT);
        fill(0);
        stroke(0);
        text(`First detection at ${firstOverlap.toPrecision(2)}m`, 10, firstOverlap*pixelPerMeter+25);
    }

    calculateImagePixelDimension() {
        // Base dimensions 2880 x 1860 => 5.4e6 pixels
        let scaleFactor = this.imageSize/5.4e6;
        return [
            Math.floor(2880 * scaleFactor),
            Math.floor(1860 * scaleFactor)
        ];
    }

    calculateFocalLengthPixels() {
        let imagePixelDimensions = this.calculateImagePixelDimension();
        return (imagePixelDimensions[0] / 2) / Math.tan(radians(this.fov/2));
    }

    calculateFirstOverlap() {
        return this.calculateFocalLengthPixels() * this.baseline / MAX_DISPARITY;
    }
}

class Sprite {
    constructor(image, range, xOffset, height, area, name) {
        this.image = image;
        this.range = range;
        this.xOffset = xOffset;
        this.height = height;
        this.area = area;
        this.name = name;
    }

    draw() {
        let hits = this.calculateHits();
        let lidarHits = this.calculateLidarHits();
        image(this.image, WIDTH/2-((this.height/2-this.xOffset)*pixelPerMeter), (this.range*pixelPerMeter)+CAMERA_HEIGHT, this.height*pixelPerMeter, this.height*pixelPerMeter);
        fill(0);
        stroke(0);
        let textX = WIDTH/2-(this.xOffset*pixelPerMeter)+30;
        if (this.xOffset <= 0) {
            textX = WIDTH/2+(this.xOffset*pixelPerMeter)-205;
        }
        text(
            `${this.name}\n` +
                `Range: ${this.range.toFixed(2)}m\n` +
                `Cross-sectional Area: ${this.area.toPrecision(2)}m²\n` +
                `NODAR Hammerhead returns: ${hits.toFixed(0)}\n` +
                `Velodyne HDL-64E returns: ${lidarHits.toFixed(0)}`,
            textX,
            ((this.range+this.height/2))*pixelPerMeter
        );
    }
    
    calculateHits() {
        let cylinderHeight = (1-Math.cos(radians(camera.fov/2)));
        let circleCircumference = 2*Math.PI;
        let sphericalCircleAreaApproximation = cylinderHeight*circleCircumference;
        return camera.imageSize*this.area/(this.range*this.range*sphericalCircleAreaApproximation);
    }

    calculateLidarHits() {
        // Velodyne HDL-64E produces 1.3 million points per second. Lets assume Hammerhead only runs ar 5hz
        const five_hz_points_per_frame = 1.3e6/5;
        const returns_for_1m2_at_1m = five_hz_points_per_frame/6;
        return returns_for_1m2_at_1m*this.area/(this.range*this.range);
    }
}

let fovLabel;
let fovSlider;
let baselineLabel;
let baselineSlider;
let imageSizeLabel;
let imageSizeSlider;
let rangeErrorBoundLabel;
let camera = new StereoCamera(1, 65, 5.4e6, 3e-6);
let boxSprite;
let personSprite;
let sedanSprite;
let boxRangeSlider;
let boxRangeLabel;
let personRangeSlider;
let personRangeLabel;
let sedanRangeSlider;
let sedanRangeLabel;

function createFOVSelector(baseY) {
    fovSlider = createSlider(15, 135, camera.fov, 1);
    fovLabel = createP("FOV: " + camera.fov + "°");
    fovSlider.position(10, baseY);
    fovLabel.position(150, baseY-15);

    fovSlider.input(function() {
        camera.fov = fovSlider.value();
        fovLabel.html("FOV: " + fovSlider.value());
    });
}

function createBaselineSelector(baseY) {
    baselineSlider = createSlider(0.1, 3, camera.baseline, 0.1);
    baselineLabel = createP("Baseline: " + camera.baseline + "m");
    baselineSlider.position(10, baseY);
    baselineLabel.position(150, baseY-15);

    baselineSlider.input(function() {
        camera.baseline = baselineSlider.value();
        baselineLabel.html("Baseline: " + baselineSlider.value());
    });
}

function createImageSizeSelector(baseY) {
    imageSizeSlider = createSlider(1e6, 25e6, camera.imageSize, 0.1e6);
    imageSizeLabel = createP("Image Size: " + camera.imageSize/1e6 + " MP");
    imageSizeSlider.position(10, baseY);
    imageSizeLabel.position(150, baseY-15);

    imageSizeSlider.input(function() {
        camera.imageSize = imageSizeSlider.value();
        imageSizeLabel.html("Image Size: " + imageSizeSlider.value()/1e6 + "MP");
    });
}

function createBoxSizeSelector(baseX, baseY) {
    boxSizeSlider = createSlider(.1, 5, boxSprite.height, .1);
    boxSizeLabel = createP("Box Height: " + boxSprite.height + "m");
    boxSizeSlider.position(baseX, baseY);
    boxSizeLabel.position(baseX + 140, baseY-15);

    boxSizeSlider.input(function() {
        boxSprite.height = boxSizeSlider.value();
        boxSprite.area = Math.pow(boxSizeSlider.value(), 2);
        boxSizeLabel.html("Box Height: " + boxSprite.height.toFixed(2) + "m");
    });
}

function createBoxRangeSelector(baseX, baseY) {
    boxRangeSlider = createSlider(.1, 25, Math.sqrt(boxSprite.range), .1);
    boxRangeLabel = createP("Box Range: " + boxSprite.range + "m");
    boxRangeSlider.position(baseX, baseY);
    boxRangeLabel.position(baseX + 140, baseY-15);

    boxRangeSlider.input(function() {
        boxSprite.range = Math.pow(boxRangeSlider.value() ,2);
        boxRangeLabel.html("Box Range: " + boxSprite.range.toFixed(2) + "m");
    });
}

function createPersonRangeSelector(baseX, baseY) {
    personRangeSlider = createSlider(.1, 25, Math.sqrt(personSprite.range), .1);
    personRangeLabel = createP("Person Range: " + personSprite.range + "m");
    personRangeSlider.position(baseX, baseY);
    personRangeLabel.position(baseX + 140, baseY-15);

    personRangeSlider.input(function() {
        personSprite.range = Math.pow(personRangeSlider.value() ,2);
        personRangeLabel.html("Person Range: " + personSprite.range.toFixed(2) + "m");
    });
}

function createSedanRangeSelector(baseX, baseY) {
    sedanRangeSlider = createSlider(.1, 25, Math.sqrt(sedanSprite.range), .1);
    sedanRangeLabel = createP("Sedan Range: " + sedanSprite.range + "m");
    sedanRangeSlider.position(baseX, baseY);
    sedanRangeLabel.position(baseX + 140, baseY-15);

    sedanRangeSlider.input(function() {
        sedanSprite.range = Math.pow(sedanRangeSlider.value() ,2);
        sedanRangeLabel.html("Sedan Range: " + sedanSprite.range.toFixed(2) + "m");
    });
}


function createRangeErrorBoundLabel(baseX, baseY) {
    rangeErrorBoundLabel = createP("");
    rangeErrorBoundLabel.position(baseX, baseY);
    updateRangeBounds();
}

function updateRangeBounds() {
    rangeErrorBoundLabel.html("Depth Precision:<br>" +
        "5m:   ±" + calculateRangeErrorBound(5).toPrecision(2) + " m<br>" +
        "10m:  ±" + calculateRangeErrorBound(10).toPrecision(2) + " m<br>" +
        "20m:  ±" + calculateRangeErrorBound(20).toFixed(2) + " m<br>" +
        "50m:  ±" + calculateRangeErrorBound(50).toFixed(2) + " m<br>" +
        "100m: ±" + calculateRangeErrorBound(100).toFixed(2) + " m<br>" +
        "200m: ±" + calculateRangeErrorBound(200).toFixed(2) + " m<br>" +
        "500m: ±" + calculateRangeErrorBound(500).toFixed(2) + " m<br>");
}


function calculateRangeErrorBound(range) {
    // resolution = 0.1 if disparity <128 , 0.2 if disparity < 512 and 0.4 if disparity < 1024
    let disparity = camera.calculateFocalLengthPixels() * camera.baseline / range;
    let disparityResolution = 0.1;
    if (disparity > 128) {
        disparityResolution = 0.2;
    }
    if (disparity > 512) {
        disparityResolution = 0.4;
    }

    let a = camera.fov/2;
    let A = sqrt(camera.imageSize)/2;
    let focalLengthPixels = A/tan(radians(a));
    return range*range*disparityResolution/(focalLengthPixels* camera.baseline);
}

// Places the first overlap line at 1/$(DISPLAY_SCALE_TO_FIRST_OVERLAP)th of the full image
function updateScale() {
    let firstOverlap = camera.calculateFirstOverlap();
    pixelPerMeter = (HEIGHT - CAMERA_HEIGHT) / firstOverlap/ DISPLAY_SCALE_TO_FIRST_OVERLAP;
}

function setup() {
    createCanvas(WIDTH, HEIGHT);

    boxSprite = new Sprite(loadImage('box.png'), 5, 0, .5, .25, "Box");
    personSprite =  new Sprite(loadImage('person.png'), 15, 1, 2, .75, "Person");
    sedanSprite = new Sprite(loadImage('sedan-rear.png'), 30,-1, 1.75, 2.5, "Sedan");

    createFOVSelector(140);
    createBaselineSelector(170);
    createImageSizeSelector(200);
    createBoxSizeSelector(400, 140);
    createBoxRangeSelector(400, 170);
    createPersonRangeSelector(400, 200);
    createSedanRangeSelector(400, 230);
    createRangeErrorBoundLabel(700, 95);

}

function draw() {
    background(240);
    updateScale();
    camera.draw();
    updateRangeBounds();
    boxSprite.draw();
    personSprite.draw();
    sedanSprite.draw();
}
const WIDTH = 1200;
const HEIGHT = 1200;

const NODAR_BLUE = [36, 107, 253];

const CAMERA_WIDTH = 10;
const CAMERA_HEIGHT = 10;
const CAMERA_CENTER = WIDTH/2;
const FOV_SIZE = HEIGHT-CAMERA_HEIGHT;
const DISPARITY_RESOLUTION = .1;
const DISPLAY_SCALE_TO_FIRST_OVERLAP = 100;

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

        stroke(0);
        line(leftCamCenterX, CAMERA_HEIGHT, rightCamCenterX, CAMERA_HEIGHT);
        text(this.baseline + " m", WIDTH/2-10, CAMERA_HEIGHT-1);
    
        let firstOverlap = this.calculateFirstOverlap();
        line(0, firstOverlap*pixelPerMeter + CAMERA_HEIGHT, WIDTH, firstOverlap*pixelPerMeter + CAMERA_HEIGHT);
        text(`First detection at ${firstOverlap.toPrecision(2)}m`, 10, firstOverlap*pixelPerMeter+25);
    }

    calculateFirstOverlap() {
        return (this.baseline/2)/Math.tan(radians(this.fov/2));
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
        text(`${this.name}\n` +
            `Range: ${this.range.toFixed(2)}m\n` +
            `Cross-sectional Area: ${this.area.toPrecision(2)}m^2\n` +
            `NODAR Hammerhead returns: ${hits.toFixed(0)}\n` +
            `Velodyne HDL-64E returns: ${lidarHits.toFixed(0)}`
            , WIDTH/2-((-this.height/2-this.xOffset)*pixelPerMeter)+30,((this.range+this.height/2))*pixelPerMeter);
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
let rangeErrorBoundLabel;
let camera = new StereoCamera(1, 65, 5.4e6);
let boxSprite;
let personSprite;
let sharkSprite;
let boxRangeSlider;
let boxRangeLabel;
let personRangeSlider;
let personRangeLabel;
let sharkRangeSlider;
let sharkRangeLabel;

function createFOVSelector(baseY) {
    fovSlider = createSlider(15, 135, camera.fov, 1);
    fovLabel = createP("FOV: " + camera.fov);
    fovSlider.position(10, baseY);
    fovLabel.position(150, baseY-15);

    fovSlider.input(function() {
        camera.fov = fovSlider.value();
        fovLabel.html("FOV: " + fovSlider.value());
    });
}

function createBaselineSelector(baseY) {
    baselineSlider = createSlider(0.1, 3, camera.baseline, 0.1);
    baselineLabel = createP("Baseline: " + camera.baseline);
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

function createBoxRangeSelector(baseX, baseY) {
    boxRangeSlider = createSlider(.1, 25, boxSprite.range, .1);
    boxRangeLabel = createP("Box Range: " + boxSprite.range + "m");
    boxRangeSlider.position(baseX, baseY);
    boxRangeLabel.position(baseX + 140, baseY-15);

    boxRangeSlider.input(function() {
        boxSprite.range = Math.pow(boxRangeSlider.value() ,2);
        boxRangeLabel.html("Box Range: " + boxSprite.range.toFixed(2) + "m");
    });
}

function createPersonRangeSelector(baseX, baseY) {
    personRangeSlider = createSlider(.1, 25, personSprite.range, .1);
    personRangeLabel = createP("Person Range: " + personSprite.range + "m");
    personRangeSlider.position(baseX, baseY);
    personRangeLabel.position(baseX + 140, baseY-15);

    personRangeSlider.input(function() {
        personSprite.range = Math.pow(personRangeSlider.value() ,2);
        personRangeLabel.html("Person Range: " + personSprite.range.toFixed(2) + "m");
    });
}

function createSharkRangeSelector(baseX, baseY) {
    sharkRangeSlider = createSlider(.1, 25, sharkSprite.range, .1);
    sharkRangeLabel = createP("Shark Range: " + sharkSprite.range + "m");
    sharkRangeSlider.position(baseX, baseY);
    sharkRangeLabel.position(baseX + 140, baseY-15);

    sharkRangeSlider.input(function() {
        sharkSprite.range = Math.pow(sharkRangeSlider.value() ,2);
        sharkRangeLabel.html("Shark Range: " + sharkSprite.range.toFixed(2) + "m");
    });
}


function createRangeErrorBoundLabel(baseX, baseY) {
    rangeErrorBoundLabel = createP("");
    rangeErrorBoundLabel.position(baseX, baseY);
    updateRangeBounds();
}

function updateRangeBounds() {
    rangeErrorBoundLabel.html("Error Bounds:<br>" +
        "5m: " + calculateRangeErrorBound(5).toPrecision(2) + " m<br>" +
        "10m: " + calculateRangeErrorBound(10).toPrecision(2) + " m<br>" +
        "20m: " + calculateRangeErrorBound(20).toFixed(2) + " m<br>" +
        "50m: " + calculateRangeErrorBound(50).toFixed(2) + " m<br>" +
        "100m: " + calculateRangeErrorBound(100).toFixed(2) + " m<br>" +
        "200m: " + calculateRangeErrorBound(200).toFixed(2) + " m<br>" +
        "500m: " + calculateRangeErrorBound(500).toFixed(2) + " m<br>");
}


function calculateRangeErrorBound(range) {
    let a = camera.fov/2;
    let A = sqrt(camera.imageSize)/2;
    let focalLengthPixels = A/tan(radians(a));
    return range*range*DISPARITY_RESOLUTION/(focalLengthPixels* camera.baseline);
}

// Places the first overlap line at 1/$(DISPLAY_SCALE_TO_FIRST_OVERLAP)th of the full image
function updateScale() {
    let firstOverlap = camera.calculateFirstOverlap();
    pixelPerMeter = (HEIGHT - CAMERA_HEIGHT) / firstOverlap/ DISPLAY_SCALE_TO_FIRST_OVERLAP;
}

function setup() {
    createCanvas(WIDTH, HEIGHT);

    boxSprite = new Sprite(loadImage('box.png'), 1, 0, .5, .01, "10cm Box");
    personSprite =  new Sprite(loadImage('person.png'), 5, 1, 2, .75, "Person");
    sharkSprite = new Sprite(loadImage('shark.png'), 15,-1, 5, 1.5, "Hammerhead Shark");

    createFOVSelector(40);
    createBaselineSelector(70);
    createImageSizeSelector(100);
    createBoxRangeSelector(400, 40);
    createPersonRangeSelector(400, 70);
    createSharkRangeSelector(400, 100);
    createRangeErrorBoundLabel(700, -5);

}

function draw() {
    background(240);
    updateScale();
    camera.draw();
    updateRangeBounds();
    boxSprite.draw();
    personSprite.draw();
    sharkSprite.draw();
}
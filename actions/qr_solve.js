"use strict";

/**
 * Converts a 32bit RGBA array into a 8bit greyscale array
 * @param rgba Source buffer
 * @param rect Size of the incoming buffer
 * @param grey Destination buffer
 * @returns {Array}
 */
function rgba_to_grey(rgba, rect, grey) {
	var i      = rect.height * rect.width - 1;
	var offset = i * 4;

	do {
		var r = rgba[offset];
		var g = rgba[offset+1];
		var b = rgba[offset+2];

		grey[i] = r * 0.3 + g * 0.59 + b * 0.11;
		offset-=4;

	} while (i--);

	return grey;
}

function grey_to_rgba(grey, rect, rgba) {
	var i      = rect.height * rect.width - 1;
	var offset = i * 4;

	do {
		rgba[offset]   = grey[i];
		rgba[offset+1] = grey[i];
		rgba[offset+2] = grey[i];

		offset-=4;

	} while (i--);

	return rgba;
}

/**
 * Sets sections of a array to the value
 * @param value to set
 * @param offset start offset
 * @param length 
 */
Array.prototype.memset = function(offset, length, value) {
	for (var i = 0; i < length; i++) {
		this[offset++] = value;
	}
};


/**
 * Adaptive Threshold (using a 5x5 box)
 * @param src Source greyscale array
 * @param rect Source size
 * @param dest Destination greyscale array, must be large enough
 * @param c Amount to take away from the average
 * @param min Value to assign lower threshold
 * @param max Value to assign higher threshold
 * @return dest
 */
function adaptiveThreshold(src, rect, dest, c, min, max) {
	var w = rect.width;
	var h = rect.height;
	var x,y;

	// Set the outer 2 rows/cols to min
	dest.memset(0, w, max);// top 1
	dest.memset(w, w, max);// top 2
	dest.memset(w * (h-2), w, max);// bottom 1
	dest.memset(w * (h-1), w, max);// bottom 2

	for (y = 2; y < h-2; y++) {
		var offset = y * w;
		dest[offset    ] = max;
		dest[offset + 1] = max;
		dest[offset + w - 1] = max;
		dest[offset + w - 2] = max;
	}

	/*  0  1  2  3  4
	 *  5  6  7  8  9
	 * 10 11 12 13 14
	 * 15 16 17 18 19
	 * 20 21 22 23 24
	 */
	y = h - 3; // Don't touch bottom two rows
	do {
		x = w - 3;
		do {
			var sum = 0;

			// Unrolled loops
			var offset = (y-2) * w + x; //ofset of top left corner
			sum += src[offset];
			sum += src[offset + 1];
			sum += src[offset + 2];
			sum += src[offset + 3];
			sum += src[offset + 4];

			offset += w;
			sum += src[offset];
			sum += src[offset + 1];
			sum += src[offset + 2];
			sum += src[offset + 3];
			sum += src[offset + 4];

			offset += w;
			sum += src[offset];
			sum += src[offset + 1];
			sum += src[offset + 2];
			sum += src[offset + 3];
			sum += src[offset + 4];

			offset += w;
			sum += src[offset];
			sum += src[offset + 1];
			sum += src[offset + 2];
			sum += src[offset + 3];
			sum += src[offset + 4];

			offset += w;
			sum += src[offset];
			sum += src[offset + 1];
			sum += src[offset + 2];
			sum += src[offset + 3];
			sum += src[offset + 4];

			var val = src[y * w + x];

			dest[ y * w + x ] = val > (sum / 25 - c) ? max : min;

		} while (x-- > 2);
	} while (y-- > 2);

	return dest;
}

Pixastic.Actions.grey_scale = {
		process : function(params) {
			if (Pixastic.Client.hasCanvasImageData()) {
				var data = Pixastic.prepareData(params);
				var rect = params.options.rect;

				// Turn this image into a simple 1 byte array
				var grey = rgba_to_grey(data, rect, new Array());

				// Now convert this one byte array into RGBA
				grey_to_rgba(grey, rect, data);

				return true;
			}
		},
		checkSupport : function() {
			return Pixastic.Client.hasCanvasImageData();
		}
};


console.log2D = function(data, w, h) {
	var offset = 0;
	for (var y = 0; y < h; y++) {
		var line = '';
		for (var x = 0; x < w; x++) {
			var d = data[offset].toFixed();
			if (d.length < 2)
				d = ' ' + d;

			line += d + ",";
			offset++;
		}
		console.log(line);
	}
};

/**
 * Finds the corners of the blob (the points nearest the bounds)
 * @param data
 * @param blob
 */
function findCorners(data, rect, blob) {

	var w = rect.width;

	var corner = [
		{x:0, y:0, distance:Number.MAX_VALUE},
		{x:0, y:0, distance:Number.MAX_VALUE},
		{x:0, y:0, distance:Number.MAX_VALUE},
		{x:0, y:0, distance:Number.MAX_VALUE},
	];

	for (var y = blob.y1; y < blob.y2; y++) {
		for (var x = blob.x1; x < blob.x2; x++) {
			var offset = y * w + x;

			if (data[offset] != blob.l)
				continue;

			var x1 = (blob.x1 - x);
			var x2 = (blob.x2 - x);
			var y1 = (blob.y1 - y);
			var y2 = (blob.y2 - y);

			// Distance to top left
			var c0 = x1*x1 + y1*y1;
			var c1 = x2*x2 + y1*y1;
			var c2 = x1*x1 + y2*y2;
			var c3 = x2*x2 + y2*y2;

			if (c0 < corner[0].distance) {
				corner[0].x = x;
				corner[0].y = y;
				corner[0].distance = c0;
			}

			if (c1 < corner[1].distance) {
				corner[1].x = x;
				corner[1].y = y;
				corner[1].distance = c1;
			}

			if (c2 < corner[2].distance) {
				corner[2].x = x;
				corner[2].y = y;
				corner[2].distance = c2;
			}

			if (c3 < corner[3].distance) {
				corner[3].x = x;
				corner[3].y = y;
				corner[3].distance = c3;
			}
		}
	}
	
	return corner;
}

function removeOutsideBound(data, rect, bound) {
	var h = rect.height;
	var w = rect.width;

	for (var y = 0; y < h; y++) {
		for (var x = 0; x < w; x++) {
			
			// Inside bound
			if ((bound.x1 <= x && x <= bound.x2) && (bound.y1 <= y && y <= bound.y2))
				continue;

			var offset = y * w + x;
			data[offset] = 0;
		}
	}	
}

Pixastic.Actions.qr_solve = {
	process : function(params) {

		if (Pixastic.Client.hasCanvasImageData()) {
			var data = Pixastic.prepareData(params);
			var rect = params.options.rect;

			// Convert to gray scale
			console.log("rgba_to_grey");
			var grey = rgba_to_grey(data, rect, new Array());

			// Do threasholding
			console.log("adaptiveThreshold");
			grey = adaptiveThreshold(grey, rect, new Array(), 10, 0, 255);

			// Do edge detection
			console.log("blobExtraction");
			grey = BlobExtraction(grey, rect);

			// Find the largest blob
			var bounds = BlobBounds(grey, rect);
			bounds.sort(function(a,b) {return b.area - a.area;} );
			var blob = bounds[0];

			// Remove everything that isn't the puzzle
			grey = grey.map(function(x) {return x == blob.l ? x : 0;});
			//removeOutsideBound(grey, rect, blob);

			//var corners = findCorners(grey, rect, blob);
			//console.log(corners);

			// Now rotate the image
			
			// Turn back into something we can display
			//grey_to_rgba(grey, rect, data);
			BlobColouring(grey, rect, data);

			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
};

Pixastic.Actions.bramp_mono2 = {
	process : function(params) {
		
		if (Pixastic.Client.hasCanvasImageData()) {
			var data     = Pixastic.prepareData(params);
			var dataCopy = Pixastic.prepareData(params, true);

			var rect = params.options.rect;
			var w = rect.width;
			var h = rect.height;

			var w4 = w*4;
			var y = h;
			do {
				var offsetY = (y-1)*w4;

				var x = w;
				do {
					var offset = offsetY + (x*4-4);
					var r = dataCopy[offset];
					var g = dataCopy[offset+1];
					var b = dataCopy[offset+2];

					var brightness = r * 0.3 + g * 0.59 + b * 0.11;

					data[offset]   = brightness;
					data[offset+1] = brightness;
					data[offset+2] = brightness;

				} while (--x);
			} while (--y);

			return true;
		}
	},
	checkSupport : function() {
		return Pixastic.Client.hasCanvasImageData();
	}
};

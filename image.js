// image.js
export default class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.options = {};
    }

    createUI() {
        const container = document.getElementById('processing-options');
        container.innerHTML = `
            <h2>Image Processing Options</h2>
            <div>
                <label for="resize-width">Width:</label>
                <input type="number" id="resize-width" min="1" max="10000">
                <label for="resize-height">Height:</label>
                <input type="number" id="resize-height" min="1" max="10000">
                <label for="maintain-aspect">
                    <input type="checkbox" id="maintain-aspect" checked>
                    Maintain aspect ratio
                </label>
            </div>
            <div>
                <label for="file-size-slider">File Size:</label>
                <input type="range" id="file-size-slider" min="1" max="100" value="100">
                <input type="number" id="file-size-input" min="1" max="100" value="100">%
                <span id="file-size-info"></span>
            </div>
            <div>
                <label for="resolution-slider">Resolution:</label>
                <input type="range" id="resolution-slider" min="1" max="100" value="100">
                <input type="number" id="resolution-input" min="1" max="100" value="100">%
            </div>
            <div>
                <label for="format-select">Convert to:</label>
                <select id="format-select">
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                    <option value="image/webp">WebP</option>
                </select>
            </div>
            <div>
                <label for="keep-transparency">
                    <input type="checkbox" id="keep-transparency" checked>
                    Keep transparency (PNG/WebP only)
                </label>
            </div>
            <div>
                <label for="metadata-option">Metadata:</label>
                <select id="metadata-option">
                    <option value="keep">Keep</option>
                    <option value="remove">Remove</option>
                    <option value="edit">Edit</option>
                </select>
            </div>
            <div id="metadata-edit" style="display:none;">
                <textarea id="metadata-text" rows="4" cols="50"></textarea>
            </div>
            <button id="process-image-button">Process Image</button>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const inputs = [
            'resize-width', 'resize-height', 'maintain-aspect',
            'file-size-slider', 'file-size-input',
            'resolution-slider', 'resolution-input',
            'format-select', 'keep-transparency'
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            element.addEventListener('input', () => this.updateAll(id));
        });

        const metadataOption = document.getElementById('metadata-option');
        const metadataEdit = document.getElementById('metadata-edit');
        metadataOption.addEventListener('change', () => {
            metadataEdit.style.display = metadataOption.value === 'edit' ? 'block' : 'none';
        });

        const processButton = document.getElementById('process-image-button');
        processButton.addEventListener('click', () => this.applyProcessing());

        // Add event listener for format change to toggle transparency option
        const formatSelect = document.getElementById('format-select');
        formatSelect.addEventListener('change', () => this.toggleTransparencyOption());
    }

    toggleTransparencyOption() {
        const format = document.getElementById('format-select').value;
        const keepTransparency = document.getElementById('keep-transparency');
        const keepTransparencyLabel = keepTransparency.parentElement;

        if (format === 'image/png' || format === 'image/webp') {
            keepTransparencyLabel.style.display = 'inline';
        } else {
            keepTransparencyLabel.style.display = 'none';
        }
    }

    updateAll(changedInputId) {
        const width = parseInt(document.getElementById('resize-width').value);
        const height = parseInt(document.getElementById('resize-height').value);
        const maintainAspect = document.getElementById('maintain-aspect').checked;
        const fileSize = parseInt(document.getElementById('file-size-slider').value);
        const resolution = parseInt(document.getElementById('resolution-slider').value);
        const format = document.getElementById('format-select').value;

        let newWidth = width;
        let newHeight = height;

        switch (changedInputId) {
            case 'resize-width':
            case 'resize-height':
                if (maintainAspect) {
                    if (changedInputId === 'resize-width') {
                        newHeight = Math.round(width / this.options.originalAspectRatio);
                    } else {
                        newWidth = Math.round(height * this.options.originalAspectRatio);
                    }
                }
                break;
            case 'file-size-slider':
            case 'file-size-input':
                const scaleFactor = Math.sqrt(fileSize / 100);
                newWidth = Math.round(this.options.originalWidth * scaleFactor);
                newHeight = Math.round(this.options.originalHeight * scaleFactor);
                break;
            case 'resolution-slider':
            case 'resolution-input':
                newWidth = Math.round(this.options.originalWidth * (resolution / 100));
                newHeight = Math.round(this.options.originalHeight * (resolution / 100));
                break;
        }

        // Update width and height
        document.getElementById('resize-width').value = newWidth;
        document.getElementById('resize-height').value = newHeight;

        // Update file size slider and input
        const newFileSize = (newWidth * newHeight) / (this.options.originalWidth * this.options.originalHeight) * 100;
        document.getElementById('file-size-slider').value = newFileSize;
        document.getElementById('file-size-input').value = Math.round(newFileSize);

        // Update resolution slider and input
        const newResolution = (newWidth / this.options.originalWidth) * 100;
        document.getElementById('resolution-slider').value = newResolution;
        document.getElementById('resolution-input').value = Math.round(newResolution);

        // Update file size info
        this.updateFileSizeInfo(newWidth, newHeight, format);

        // Call toggleTransparencyOption to ensure it's properly shown/hidden
        this.toggleTransparencyOption();
    }

    formatFileSize(sizeInBytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const base = 1024;
        
        if (sizeInBytes === 0) return '0 B';
        
        const exponent = Math.floor(Math.log(sizeInBytes) / Math.log(base));
        const unit = units[exponent];
        const size = sizeInBytes / Math.pow(base, exponent);
        
        return `${size.toFixed(2)} ${unit}`;
    }

    updateFileSizeInfo(width, height, format) {
        const fileSizeInfo = document.getElementById('file-size-info');
        
        const resolutionRatio = (width * height) / (this.options.originalWidth * this.options.originalHeight);
        let estimatedSize = this.options.originalFileSize * resolutionRatio;
        
        // Adjust estimated size based on format
        switch (format) {
            case 'image/png':
                estimatedSize *= 1.5;  // PNG is typically larger
                break;
            case 'image/webp':
                estimatedSize *= 0.8;  // WebP is typically smaller
                break;
            // JPEG is our baseline, so no adjustment needed
        }
        
        const formattedSize = this.formatFileSize(estimatedSize);
        fileSizeInfo.textContent = `Estimated: ${formattedSize}`;
    }

    async processImage(file) {
        const img = await this.loadImage(file);
        this.options.originalAspectRatio = img.width / img.height;
        this.options.originalWidth = img.width;
        this.options.originalHeight = img.height;
        this.options.originalFileSize = file.size;
        this.options.image = img;

        this.createUI();

        document.getElementById('resize-width').value = img.width;
        document.getElementById('resize-height').value = img.height;
        this.updateAll('resize-width');

        // Prefill metadata
        this.prefillMetadata(file);

        return img;
    }

    async prefillMetadata(file) {
        // This is a placeholder. In a real implementation, you'd use a library
        // to extract metadata from the image file.
        const metadata = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified).toISOString()
        };

        document.getElementById('metadata-text').value = JSON.stringify(metadata, null, 2);
    }

    async applyProcessing() {
        const width = parseInt(document.getElementById('resize-width').value);
        const height = parseInt(document.getElementById('resize-height').value);
        const format = document.getElementById('format-select').value;
        const keepTransparency = document.getElementById('keep-transparency').checked;
        const metadataOption = document.getElementById('metadata-option').value;

        // Create a new canvas with the desired dimensions
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d');

        // If keeping transparency and format supports it, ensure alpha channel is preserved
        if (keepTransparency && (format === 'image/png' || format === 'image/webp')) {
            outputCtx.clearRect(0, 0, width, height);
        } else {
            outputCtx.fillStyle = 'white';
            outputCtx.fillRect(0, 0, width, height);
        }

        // Draw the image onto the new canvas
        outputCtx.drawImage(this.options.image, 0, 0, width, height);

        // Convert the canvas to a blob
        const blob = await new Promise(resolve => {
            if (format === 'image/jpeg') {
                outputCanvas.toBlob(resolve, format, 0.92);
            } else {
                outputCanvas.toBlob(resolve, format);
            }
        });

        if (metadataOption === 'remove') {
            return blob;
        } else if (metadataOption === 'edit') {
            const metadata = document.getElementById('metadata-text').value;
            // Here you would add logic to embed the edited metadata into the image
            console.log('Edited metadata:', metadata);
        }

        return blob;
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}
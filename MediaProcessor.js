// mediaProcessor.js

export default class MediaProcessor {
    constructor() {
        this.ffmpeg = null;
        this.options = {};
        this.isAudio = false;
    }

    async init() {
        if (this.ffmpeg) return;

        if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error('SharedArrayBuffer is not available. Please ensure you\'re using HTTPS and have the necessary COOP and COEP headers set.');
        }

        try {
            const { createFFmpeg, fetchFile } = FFmpeg;
            this.ffmpeg = createFFmpeg({ log: true });
            this.fetchFile = fetchFile;
            await this.ffmpeg.load();
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            throw error;
        }
    }

    createUI() {
        const container = document.getElementById('processing-options');
        container.innerHTML = `
            <h2>Media Processing Options</h2>
            <div>
                <label for="media-format">Convert to:</label>
                <select id="media-format">
                    ${this.isAudio ? `
                        <option value="mp3">MP3</option>
                        <option value="wav">WAV</option>
                        <option value="ogg">OGG</option>
                    ` : `
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="ogg">OGG</option>
                    `}
                </select>
            </div>
            <div>
                <label for="quality-slider">Quality:</label>
                <input type="range" id="quality-slider" min="1" max="100" value="75">
                <span id="quality-value">75%</span>
            </div>
            ${!this.isAudio ? `
                <div>
                    <label for="resize-width">Width:</label>
                    <input type="number" id="resize-width" min="1" max="7680">
                    <label for="resize-height">Height:</label>
                    <input type="number" id="resize-height" min="1" max="4320">
                    <label for="maintain-aspect">
                        <input type="checkbox" id="maintain-aspect" checked>
                        Maintain aspect ratio
                    </label>
                </div>
                <div>
                    <label for="frame-rate">Frame Rate:</label>
                    <input type="number" id="frame-rate" min="1" max="60" value="30"> fps
                </div>
            ` : ''}
            <div>
                <label for="trim-start">Trim Start:</label>
                <input type="number" id="trim-start" min="0" step="0.1" value="0"> seconds
            </div>
            <div>
                <label for="trim-end">Trim End:</label>
                <input type="number" id="trim-end" min="0" step="0.1" value="0"> seconds
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
            <div id="file-size-info"></div>
            <button id="process-media-button">Process Media</button>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const inputs = [
            'media-format', 'quality-slider', 'trim-start', 'trim-end'
        ];

        if (!this.isAudio) {
            inputs.push('resize-width', 'resize-height', 'maintain-aspect', 'frame-rate');
        }

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateAll(id));
            }
        });

        const metadataOption = document.getElementById('metadata-option');
        const metadataEdit = document.getElementById('metadata-edit');
        metadataOption.addEventListener('change', () => {
            metadataEdit.style.display = metadataOption.value === 'edit' ? 'block' : 'none';
        });

        const processButton = document.getElementById('process-media-button');
        processButton.addEventListener('click', () => this.applyProcessing());

        // Update quality value display
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = `${qualitySlider.value}%`;
        });
    }

    updateAll(changedInputId) {
        const format = document.getElementById('media-format').value;
        const quality = parseInt(document.getElementById('quality-slider').value);
        const trimStart = parseFloat(document.getElementById('trim-start').value);
        const trimEnd = parseFloat(document.getElementById('trim-end').value);

        let width, height, frameRate;
        if (!this.isAudio) {
            width = parseInt(document.getElementById('resize-width').value);
            height = parseInt(document.getElementById('resize-height').value);
            frameRate = parseInt(document.getElementById('frame-rate').value);

            const maintainAspect = document.getElementById('maintain-aspect').checked;
            if (changedInputId === 'resize-width' && maintainAspect) {
                document.getElementById('resize-height').value = Math.round(width / this.options.aspectRatio);
            } else if (changedInputId === 'resize-height' && maintainAspect) {
                document.getElementById('resize-width').value = Math.round(height * this.options.aspectRatio);
            }
        }

        // Ensure trim end is not greater than media duration
        const trimEndInput = document.getElementById('trim-end');
        trimEndInput.max = this.options.duration;
        if (trimEnd > this.options.duration) {
            trimEndInput.value = this.options.duration;
        }

        this.updateFileSizeInfo(format, quality, width, height, trimStart, trimEnd, frameRate);
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

    updateFileSizeInfo(format, quality, width, height, trimStart, trimEnd, frameRate) {
        const fileSizeInfo = document.getElementById('file-size-info');
        
        const duration = this.options.duration - trimStart - (this.options.duration - trimEnd);
        let estimatedSize = this.options.originalFileSize * (duration / this.options.duration);

        if (!this.isAudio) {
            const resolutionFactor = (width * height) / (this.options.originalWidth * this.options.originalHeight);
            const frameRateFactor = frameRate / this.options.originalFrameRate;
            estimatedSize *= resolutionFactor * frameRateFactor;
        }

        const qualityFactor = quality / 75; // Assuming 75% is the baseline quality
        estimatedSize *= qualityFactor;

        // Adjust estimated size based on format
        switch (format) {
            case 'webm':
            case 'ogg':
                estimatedSize *= 0.8;  // These formats are typically smaller
                break;
            // MP4 and MP3 are our baselines, so no adjustment needed
        }
        
        const formattedSize = this.formatFileSize(estimatedSize);
        fileSizeInfo.textContent = `Estimated file size: ${formattedSize}`;
    }

    async processMedia(file) {
        this.isAudio = file.type.startsWith('audio/');
        this.options.file = file;
        
        if (this.isAudio) {
            await this.processAudio(file);
        } else {
            await this.processVideo(file);
        }

        this.createUI();
        this.updateAll();

        // Prefill metadata
        this.prefillMetadata(file);
    }

    async processAudio(file) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        this.options.duration = audioBuffer.duration;
        this.options.originalFileSize = file.size;
    }

    async processVideo(file) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                this.options.duration = video.duration;
                this.options.originalWidth = video.videoWidth;
                this.options.originalHeight = video.videoHeight;
                this.options.aspectRatio = video.videoWidth / video.videoHeight;
                this.options.originalFileSize = file.size;
                this.options.originalFrameRate = 30; // Assuming 30 fps as we can't easily get this info
                resolve();
            };
        });

        document.getElementById('resize-width').value = video.videoWidth;
        document.getElementById('resize-height').value = video.videoHeight;
    }

    async prefillMetadata(file) {
        // This is a placeholder. In a real implementation, you'd use a library
        // to extract metadata from the media file.
        const metadata = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified).toISOString()
        };

        document.getElementById('metadata-text').value = JSON.stringify(metadata, null, 2);
    }

    async applyProcessing() {
        const format = document.getElementById('media-format').value;
        const quality = parseInt(document.getElementById('quality-slider').value);
        const trimStart = parseFloat(document.getElementById('trim-start').value);
        const trimEnd = parseFloat(document.getElementById('trim-end').value);
        const metadataOption = document.getElementById('metadata-option').value;

        let width, height, frameRate;
        if (!this.isAudio) {
            width = parseInt(document.getElementById('resize-width').value);
            height = parseInt(document.getElementById('resize-height').value);
            frameRate = parseInt(document.getElementById('frame-rate').value);
        }

        // Construct FFmpeg command
        let command = ['-i', 'input'];

        // Trimming
        if (trimStart > 0) {
            command.push('-ss', trimStart.toString());
        }
        if (trimEnd < this.options.duration) {
            command.push('-t', (trimEnd - trimStart).toString());
        }

        // Video-specific options
        if (!this.isAudio) {
            command.push('-vf', `scale=${width}:${height}`);
            command.push('-r', frameRate.toString());
        }

        // Quality
        if (this.isAudio) {
            command.push('-q:a', (5 - (quality / 25)).toString()); // Convert 1-100 to 5-1 (lower is better for audio)
        } else {
            command.push('-crf', (51 - (quality / 2)).toString()); // Convert 1-100 to 51-1 (lower is better for video)
        }

        // Output format
        command.push('-f', format);

        // Metadata
        if (metadataOption === 'remove') {
            command.push('-map_metadata', '-1');
        } else if (metadataOption === 'edit') {
            // In a real implementation, you'd parse the metadata and add it to the command
            console.log('Edited metadata:', document.getElementById('metadata-text').value);
        }

        command.push('output.' + format);

        // Process the media
        await this.ffmpeg.FS('writeFile', 'input', await this.fetchFile(this.options.file));
        await this.ffmpeg.run(...command);

        // Get the processed file
        const data = await this.ffmpeg.FS('readFile', 'output.' + format);

        // Create a download link
        const blob = new Blob([data.buffer], { type: this.isAudio ? 'audio/' + format : 'video/' + format });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed_media.' + format;
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
    }
}
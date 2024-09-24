// app.js
import MediaProcessor from './mediaProcessor.js';
import ImageProcessor from './image.js';

class App {
    constructor() {
        this.mediaProcessor = new MediaProcessor();
        this.imageProcessor = new ImageProcessor();
        this.init();
    }

    async init() {
        try {
            await this.mediaProcessor.init();
            console.log('Media Processor initialized successfully');
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize Media Processor:', error);
            this.showError('Failed to initialize the application. ' + error.message);
        }
    }

    setupEventListeners() {
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');

        fileInput.addEventListener('change', (event) => this.handleFileSelect(event.target.files));

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files);
        });
    }

    async handleFileSelect(files) {
        if (files.length === 0) return;

        const file = files[0];
        const fileType = this.getFileType(file);

        if (!fileType) {
            this.showError('Please select an image, audio, or video file.');
            return;
        }

        try {
            if (fileType === 'image') {
                await this.imageProcessor.processImage(file);
            } else {
                await this.mediaProcessor.processMedia(file);
            }
            this.showPreview(file);
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('An error occurred while processing the file.');
        }
    }

    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('video/')) return 'video';
        return null;
    }

    showPreview(file) {
        const previewContainer = document.getElementById('preview-container');
        previewContainer.innerHTML = '';

        const fileType = this.getFileType(file);

        switch (fileType) {
            case 'image':
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.maxWidth = '100%';
                previewContainer.appendChild(img);
                break;
            case 'audio':
                const audio = document.createElement('audio');
                audio.src = URL.createObjectURL(file);
                audio.controls = true;
                previewContainer.appendChild(audio);
                break;
            case 'video':
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.controls = true;
                video.style.maxWidth = '100%';
                previewContainer.appendChild(video);
                break;
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
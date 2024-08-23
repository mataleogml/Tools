console.log('Script started');

const uploadContainer = document.getElementById('uploadContainer');
const uploadCard = document.getElementById('uploadCard');
const uploadContent = document.querySelector('.upload-content');
const progressContent = document.querySelector('.progress-content');
const videoContainer = document.getElementById('videoContainer');
const originalVideo = document.getElementById('originalVideo');
const compressedVideo = document.getElementById('compressedVideo');
const originalSizeSpan = document.getElementById('originalSize');
const compressedSizeSpan = document.getElementById('compressedSize');
const compressionBadge = document.getElementById('compressionBadge');
const downloadBtn = document.getElementById('downloadBtn');

console.log('DOM elements initialized');

uploadCard.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            showProgressIndicator();
            processVideo(file);
        }
    };
    input.click();
});

uploadCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadCard.style.borderColor = '#1976d2';
});

uploadCard.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadCard.style.borderColor = '#666';
});

uploadCard.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadCard.style.borderColor = '#666';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        showProgressIndicator();
        processVideo(file);
    } else {
        mdui.snackbar({
            message: 'Please drop a valid video file.',
            placement: 'top',
        });
    }
});

function showProgressIndicator() {
    uploadContent.style.display = 'none';
    progressContent.style.display = 'flex';
}

function hideUploadCard() {
    uploadContainer.style.display = 'none';
    videoContainer.style.display = 'flex';
}

async function processVideo(file) {
    console.log('Processing video started');
    try {
        const originalSize = file.size;
        originalSizeSpan.textContent = formatBytes(originalSize);

        const originalUrl = URL.createObjectURL(file);
        originalVideo.src = originalUrl;

        const compressedBlob = await compressVideo(file);
        const compressedUrl = URL.createObjectURL(compressedBlob);
        compressedVideo.src = compressedUrl;

        const compressedSize = compressedBlob.size;
        compressedSizeSpan.textContent = formatBytes(compressedSize);

        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
        compressionBadge.textContent = `${ratio}% smaller`;

        hideUploadCard();

        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = compressedUrl;
            a.download = 'compressed_video.webm';
            a.click();
        };
    } catch (error) {
        console.error('Error processing video:', error);
        mdui.snackbar({
            message: 'An error occurred while processing the video.',
            placement: 'top',
            timeout: 10000,
        });
        // Reset the upload card to its initial state
        uploadContent.style.display = 'flex';
        progressContent.style.display = 'none';
    }
}

async function compressVideo(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 1000000 // Adjust this value to change compression level
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));

            video.onended = () => mediaRecorder.stop();
            mediaRecorder.start();

            const processFrame = () => {
                if (video.ended) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(processFrame);
            };

            video.onplay = processFrame;
            video.play();
        };
        video.onerror = reject;
    });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

console.log('Script finished loading');
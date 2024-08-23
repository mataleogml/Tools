let currentFile = null;
let availableFunctions = [];

const uploadContainer = document.getElementById('uploadContainer');
const uploadCard = document.getElementById('uploadCard');
const uploadContent = document.querySelector('.upload-content');
const progressContent = document.querySelector('.progress-content');
const mediaContainer = document.getElementById('mediaContainer');
const originalMediaContainer = document.getElementById('originalMediaContainer');
const processedMediaContainer = document.getElementById('processedMediaContainer');
const originalSizeSpan = document.getElementById('originalSize');
const processedSizeSpan = document.getElementById('processedSize');
const processingBadge = document.getElementById('processingBadge');
const downloadBtn = document.getElementById('downloadBtn');

const actionDialog = document.getElementById('actionDialog');
const actionRadioGroup = document.getElementById('actionRadioGroup');
const cancelActionBtn = document.getElementById('cancelActionBtn');
const confirmActionBtn = document.getElementById('confirmActionBtn');

uploadCard.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,image/*,audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
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
    if (file) {
        handleFile(file);
    } else {
        mdui.snackbar({
            message: 'Please drop a valid media file.',
            placement: 'top',
        });
    }
});

cancelActionBtn.addEventListener('click', () => {
    actionDialog.open = false;
});

confirmActionBtn.addEventListener('click', () => {
    const selectedIndex = actionRadioGroup.value;
    if (selectedIndex !== null) {
        actionDialog.open = false;
        showProgressIndicator();
        processMedia(currentFile, availableFunctions[selectedIndex]);
    } else {
        mdui.snackbar({
            message: 'Please select an action.',
            placement: 'top',
        });
    }
});

async function handleFile(file) {
    currentFile = file;
    const fileType = file.type.split('/')[0]; // 'image', 'video', or 'audio'
    
    try {
        availableFunctions = await loadFunctions(fileType);
        if (availableFunctions.length === 0) {
            throw new Error('No applicable functions found');
        }
        setupActionSelection(availableFunctions);
        actionDialog.open = true;
    } catch (error) {
        console.error('Error loading functions:', error);
        mdui.snackbar({
            message: 'Unsupported file type or no applicable functions found.',
            placement: 'top',
        });
    }
}

async function loadFunctions(fileType) {
    const functions = [];
    try {
        const moduleFiles = await fetch(`/functions/${fileType}/`).then(res => res.json());
        for (const file of moduleFiles) {
            if (file.endsWith('.js')) {
                const module = await import(`/functions/${fileType}/${file}`);
                functions.push(module.default);
            }
        }
    } catch (error) {
        console.error('Error loading function modules:', error);
    }
    return functions;
}

function setupActionSelection(functions) {
    actionRadioGroup.innerHTML = '';
    functions.forEach((func, index) => {
        const radioButton = document.createElement('mdui-radio');
        radioButton.value = index;
        radioButton.textContent = func.name;
        actionRadioGroup.appendChild(radioButton);
    });
}

function showProgressIndicator() {
    uploadContent.style.display = 'none';
    progressContent.style.display = 'flex';
}

function hideUploadCard() {
    uploadContainer.style.display = 'none';
    mediaContainer.style.display = 'flex';
}

async function processMedia(file, func) {
    try {
        const originalSize = file.size;
        originalSizeSpan.textContent = formatBytes(originalSize);

        const originalUrl = URL.createObjectURL(file);
        displayMedia(originalMediaContainer, file.type, originalUrl);

        const processedBlob = await func.apply(file);
        const processedUrl = URL.createObjectURL(processedBlob);
        displayMedia(processedMediaContainer, processedBlob.type, processedUrl);

        const processedSize = processedBlob.size;
        processedSizeSpan.textContent = formatBytes(processedSize);

        const ratio = ((1 - processedSize / originalSize) * 100).toFixed(2);
        processingBadge.textContent = `${ratio}% smaller`;

        hideUploadCard();

        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = processedUrl;
            a.download = `processed_${file.name}`;
            a.click();
        };
    } catch (error) {
        console.error('Error processing media:', error);
        mdui.snackbar({
            message: 'An error occurred while processing the media.',
            placement: 'top',
            timeout: 10000,
        });
        // Reset the upload card to its initial state
        uploadContent.style.display = 'flex';
        progressContent.style.display = 'none';
    }
}

function displayMedia(container, type, url) {
    container.innerHTML = '';
    if (type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        container.appendChild(video);
    } else if (type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = url;
        container.appendChild(img);
    } else if (type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        container.appendChild(audio);
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
// Global variables
let imageCount = 0;
let imagesPerPage = 5;
const maxFileSize = 5 * 1024 * 1024; // 5MB
const incadLogo = 'Incad.jpg'; // LOGO INCAD
let clientLogoSrc = null; // Variable for client logo
let zoomLevel = 100; // Initial zoom level
let isDragging = false; // For drag and drop

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const clientLogoInput = document.getElementById('clientLogo');
const headerTitleInput = document.getElementById('headerTitle');
const errorMessage = document.getElementById('errorMessage');
const pageContainer = document.getElementById('pageContainer');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomLevelDisplay = document.getElementById('zoomLevel');
const themeToggleBtn = document.getElementById('themeToggle');
const importCountDisplay = document.getElementById('importCount');
const imageCountDisplay = document.getElementById('imageCount');
const pageCountDisplay = document.getElementById('pageCount');

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Check for saved theme preference
    checkThemePreference();
    
    // Preload INCAD logo
    preloadIncadLogo();
    
    // Initialize the UI
    updateStats();
}

function setupEventListeners() {
    // File input event listeners
    fileInput.addEventListener('change', handleFileSelect);
    clientLogoInput.addEventListener('change', handleClientLogoSelect);
    
    // Title input event listener
    headerTitleInput.addEventListener('input', updateDocumentTitle);
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => adjustZoom(10));
    zoomOutBtn.addEventListener('click', () => adjustZoom(-10));
    
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Drag and drop functionality
    setupDragAndDrop();
}

function setupDragAndDrop() {
    // Prevent default behavior to allow drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            dropZone.classList.add('active');
        }, false);
    });
    
    // Remove highlight when dragging leaves
    ['dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, () => {
            dropZone.classList.remove('active');
        }, false);
    });
    
    // Handle dropped files
    document.body.addEventListener('drop', handleDrop, false);
    
    // Make the drop zone clickable to open file input
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    processFiles(files);
}

function preloadIncadLogo() {
    const preloadImage = new Image();
    preloadImage.crossOrigin = "anonymous";
    preloadImage.src = incadLogo;
}

function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

function updateDocumentTitle(e) {
    const title = e.target.value || 'Documento sin título';
    document.querySelectorAll('.document-title').forEach(titleElement => {
        titleElement.textContent = title;
    });
}

function handleClientLogoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > maxFileSize) {
            showError(`El logo del cliente excede el tamaño máximo de 5MB`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            clientLogoSrc = e.target.result;
            document.querySelectorAll('.client-logo').forEach(logo => {
                logo.src = clientLogoSrc;
                logo.style.display = 'block';
            });
            
            // Update file name display
            document.getElementById('clientLogoName').textContent = file.name;
            
            // Re-organize pages to update all headers
            reorganizePages();
        };
        reader.onerror = () => showError(`Error al cargar el logo del cliente`);
        reader.readAsDataURL(file);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        importCountDisplay.textContent = `${files.length} archivo(s) seleccionado(s)`;
    }
    processFiles(files);
}

function processFiles(files) {
    clearError();
    
    // Array to hold promises for all file reads
    const fileReadPromises = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError(`${file.name} no es una imagen válida`);
            continue;
        }
        
        // Validate file size
        if (file.size > maxFileSize) {
            showError(`${file.name} excede el tamaño máximo de 5MB`);
            continue;
        }
        
        // Create a promise for each file read
        const filePromise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                resolve({ src: e.target.result, name: fileName });
            };
            
            reader.onerror = function() {
                reject(`Error al cargar ${file.name}`);
            };
            
            reader.readAsDataURL(file);
        });
        
        fileReadPromises.push(filePromise);
    }
    
    // Process all files and add them to the UI
    Promise.all(fileReadPromises)
        .then(results => {
            // Batch add all images
            results.forEach(result => {
                addImageToPage(result.src, result.name);
            });
            updateStats();
        })
        .catch(error => {
            showError(error);
        });
}

function addImageToPage(src, name) {
    let pages = document.getElementsByClassName('page');
    let lastPage = pages[pages.length - 1];
    
    // Create a new page if needed
    if (!lastPage || lastPage.querySelector('.page-content').children.length >= imagesPerPage) {
        lastPage = createNewPage(pages.length + 1);
        pageContainer.appendChild(lastPage);
    }
    
    // Create the image item
    const imageItem = document.createElement('div');
    imageItem.classList.add('imageItem');
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('deleteButton');
    deleteButton.innerHTML = '×';
    deleteButton.onclick = function(e) {
        e.stopPropagation();
        removeImage(imageItem);
    };
    
    // Create the image name element
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.classList.add('image-name');
    nameSpan.onclick = function(e) {
        e.stopPropagation();
        makeEditable(this);
    };
    
    // Add image
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.loading = "lazy";
    
    // Assemble the image item
    imageItem.appendChild(img);
    imageItem.appendChild(nameSpan);
    imageItem.appendChild(deleteButton);
    
    // Add to the page content
    lastPage.querySelector('.page-content').appendChild(imageItem);
    
    // Update stats
    imageCount++;
    updateStats();
    
    // Apply zoom
    applyZoom();
    
    return imageItem;
}

function createNewPage(pageNumber) {
    const page = document.createElement('div');
    page.classList.add('page');
    
    // Create header
    const header = document.createElement('div');
    header.classList.add('page-header');
    
    const incadLogoImg = document.createElement('img');
    incadLogoImg.src = incadLogo;
    incadLogoImg.alt = "INCAD Logo";
    incadLogoImg.classList.add('incad-logo');
    incadLogoImg.crossOrigin = "anonymous";
    
    const title = document.createElement('h1');
    title.classList.add('document-title');
    title.textContent = headerTitleInput.value || 'Documento sin título';
    title.title = headerTitleInput.value || 'Documento sin título'; // Tooltip
    
    const clientLogoImg = document.createElement('img');
    clientLogoImg.src = clientLogoSrc || '';
    clientLogoImg.alt = "Logo Cliente";
    clientLogoImg.classList.add('client-logo');
    clientLogoImg.style.display = clientLogoSrc ? 'block' : 'none';
    
    header.appendChild(incadLogoImg);
    header.appendChild(title);
    header.appendChild(clientLogoImg);
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('page-content');
    
    // Create page number
    const pageNumberElement = document.createElement('div');
    pageNumberElement.classList.add('page-number');
    pageNumberElement.textContent = pageNumber;
    
    // Create footer
    const footer = document.createElement('div');
    footer.classList.add('page-footer');
    
    const copyright = document.createElement('p');
    copyright.textContent = 'INCAD SERVICE 2025 ®';
    
    const contact = document.createElement('p');
    contact.textContent = 'Carlos Rosales B. Contacto: +51 969 991 467 crosales@incad-service.com';
    
    footer.appendChild(copyright);
    footer.appendChild(contact);
    
    // Assemble the page
    page.appendChild(header);
    page.appendChild(contentContainer);
    page.appendChild(footer);
    page.appendChild(pageNumberElement);
    
    return page;
}

function makeEditable(element) {
    if (element.contentEditable === 'true') return;
    
    element.contentEditable = true;
    element.classList.add('editable');
    element.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Save the original text to restore if needed
    element.dataset.originalText = element.textContent;
    
    // Event listeners for editing
    element.addEventListener('blur', finishEditing);
    element.addEventListener('keydown', handleEditingKeydown);
    
    function finishEditing() {
        element.contentEditable = false;
        element.classList.remove('editable');
        element.removeEventListener('blur', finishEditing);
        element.removeEventListener('keydown', handleEditingKeydown);
    }
    
    function handleEditingKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            element.textContent = element.dataset.originalText;
            element.blur();
        }
    }
}

function removeImage(imageItem) {
    // Add a fade-out animation
    imageItem.style.transition = 'opacity 0.3s, transform 0.3s';
    imageItem.style.opacity = '0';
    imageItem.style.transform = 'scale(0.9)';
    
    // Wait for animation to complete
    setTimeout(() => {
        imageItem.remove();
        imageCount--;
        reorganizePages();
    }, 300);
}

function reorganizePages() {
    const allImages = Array.from(document.querySelectorAll('.imageItem'));
    const pages = Array.from(document.querySelectorAll('.page'));
    
    // Remove all pages
    pages.forEach(page => page.remove());
    
    // Reset image count
    imageCount = 0;
    
    // Re-add all images
    allImages.forEach(image => {
        // Get the image source and name
        const src = image.querySelector('img').src;
        const name = image.querySelector('.image-name').textContent;
        
        // Add the image to a page
        addImageToPage(src, name);
    });
    
    // Update stats
    updateStats();
}

function adjustZoom(change) {
    zoomLevel = Math.max(50, Math.min(200, zoomLevel + change));
    zoomLevelDisplay.textContent = `${zoomLevel}%`;
    applyZoom();
}

function applyZoom() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.transform = `scale(${zoomLevel / 100})`;
    });
}

function updateStats() {
    // Update image count
    imageCountDisplay.textContent = imageCount;
    
    // Update page count
    const pageCount = document.querySelectorAll('.page').length;
    pageCountDisplay.textContent = pageCount;
    
    // Update page numbers
    document.querySelectorAll('.page').forEach((page, index) => {
        page.querySelector('.page-number').textContent = index + 1;
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto-clear error after 5 seconds
    setTimeout(clearError, 5000);
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

async function waitForImagesLoaded(page) {
    const images = page.getElementsByTagName('img');
    const promises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });
    await Promise.all(promises);
}

async function exportToPdf() {
    if (!window.jspdf) {
        showError("jsPDF no está cargado");
        return;
    }

    // Deshabilitar el botón mientras exportas
    const exportBtn = document.getElementById('exportBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = `Generando PDF...`;
    exportBtn.disabled = true;

    const quality = parseFloat(document.getElementById('pdfQuality').value);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    let pages = document.getElementsByClassName('page');

    if (pages.length === 0) {
        showError('No hay imágenes para exportar');
        resetExportButton();
        return;
    }

    // Asegúrate de que las imágenes de la primera página se carguen completamente
    await waitForImagesLoaded(pages[0]);

    try {
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // Añadir un retraso para la primera página
            if (i === 0) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500 ms
            }

            await waitForImagesLoaded(page);

            const canvas = await html2canvas(page, {
                scale: quality * 4,
                useCORS: true,
                logging: false,
                imageTimeout: 0,
                allowTaint: true,
                backgroundColor: '#FFFFFF', // Asegurar un fondo blanco
                imageQuality: 1.0, // Máxima calidad de imagen
                pixelRatio: window.devicePixelRatio * 2 // Mejor resolución
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0); // Usar la máxima calidad
            const pageWidth = 210;
            const pageHeight = 297;

            if (i !== 0) pdf.addPage();

            const imgRatio = canvas.height / canvas.width;
            const pageRatio = pageHeight / pageWidth;

            let imgWidth = pageWidth;
            let imgHeight = imgWidth * imgRatio;

            if (imgHeight > pageHeight) {
                imgHeight = pageHeight;
                imgWidth = imgHeight / imgRatio;
            }

            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, null, 'FAST', { alpha: false });
        }

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        const title = headerTitleInput.value || 'Documento';
        const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.pdf`;

        pdf.save(filename);

        exportBtn.innerHTML = `PDF Exportado`;
        exportBtn.style.backgroundColor = 'var(--success)';

        setTimeout(resetExportButton, 2000);

    } catch (error) {
        console.error(error);
        showError('Error al generar el PDF');
        resetExportButton();
    }

    function resetExportButton() {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        exportBtn.style.backgroundColor = '';
    }
}

// Add animation classes for elements that need to be animated
document.addEventListener('DOMContentLoaded', () => {
    // Animate stats on first load
    document.querySelectorAll('.stat-item').forEach((item, index) => {
        item.style.animation = `fadeIn 0.3s ease-out ${index * 0.1}s forwards`;
        item.style.opacity = '0';
    });
});
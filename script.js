document.getElementById('fileInput').addEventListener('change', handleFileSelect);

let imageCount = 0;
const imagesPerPage = 6;
const maxFileSize = 5 * 1024 * 1024; // 5MB
const incadLogo = 'Incad.jpg'; // LOGO INCAD
let clientLogoSrc = '#'; // Variable global para almacenar el logo del cliente

// Precarga el logo de INCAD
const preloadIncadLogo = new Image();
preloadIncadLogo.crossOrigin = "anonymous";
preloadIncadLogo.src = incadLogo;

document.getElementById('headerTitle').addEventListener('input', function(e) {
    document.querySelectorAll('.document-title').forEach(title => {
        title.textContent = e.target.value || 'Documento sin título';
    });
});

document.getElementById('clientLogo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            clientLogoSrc = e.target.result;
            document.querySelectorAll('.client-logo').forEach(logo => {
                logo.src = clientLogoSrc;
            });
            reorganizePages();
        };
        reader.readAsDataURL(file);
    }
});

function handleFileSelect(event) {
    const files = event.target.files;
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
            errorMessage.textContent = `Error: ${file.name} no es una imagen válida`;
            continue;
        }
        
        if (file.size > maxFileSize) {
            errorMessage.textContent = `Error: ${file.name} excede el tamaño máximo de 5MB`;
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            addImageToPage(e.target.result, fileName);
        };
        reader.onerror = function() {
            errorMessage.textContent = `Error al cargar ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}

function makeEditable(element) {
    element.contentEditable = true;
    element.classList.add('editable');
    element.addEventListener('blur', function() {
        element.contentEditable = false;
        element.classList.remove('editable');
    });
    element.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            element.blur();
        }
    });
}

function addImageToPage(src, name) {
    const pageContainer = document.getElementById('pageContainer');
    let pages = document.getElementsByClassName('page');
    let lastPage = pages[pages.length - 1];

    if (!lastPage || lastPage.getElementsByClassName('imageItem').length >= imagesPerPage) {
        lastPage = document.createElement('div');
        lastPage.classList.add('page');
        
        const header = document.createElement('div');
        header.classList.add('page-header');
        header.innerHTML = `
            <img src="${incadLogo}" alt="INCAD Logo" class="incad-logo" crossorigin="anonymous">
            <h1 class="document-title">${document.getElementById('headerTitle').value || 'Documento sin título'}</h1>
            <img src="${clientLogoSrc}" alt="Logo Cliente" class="client-logo">
        `;
        lastPage.appendChild(header);
        
        const pageNumber = document.createElement('div');
        pageNumber.classList.add('page-number');
        pageNumber.textContent = pages.length + 1;
        lastPage.appendChild(pageNumber);

        const footer = document.createElement('div');
        footer.classList.add('page-footer');
        footer.innerHTML = `
            <p>INCAD SERVICE 2025 ®</p>
            <p>Carlos Rosales B. Contacto: +51 969 991 467 crosales@incad-service.com</p>
        `;
        lastPage.appendChild(footer);
        
        pageContainer.appendChild(lastPage);
    }

    const imageItem = document.createElement('div');
    imageItem.classList.add('imageItem');
    
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('deleteButton');
    deleteButton.innerHTML = '×';
    deleteButton.onclick = function() {
        imageItem.remove();
        imageCount--;
        document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
        reorganizePages();
    };

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.classList.add('image-name');
    nameSpan.onclick = function() {
        makeEditable(this);
        this.focus();
    };

    imageItem.innerHTML = `<img src="${src}" alt="${name}"><br>`;
    imageItem.appendChild(nameSpan);
    imageItem.appendChild(deleteButton);
    lastPage.appendChild(imageItem);

    imageCount++;
    document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
}

function reorganizePages() {
    const pageContainer = document.getElementById('pageContainer');
    const allImages = document.querySelectorAll('.imageItem');
    const pages = document.querySelectorAll('.page');
    
    pages.forEach(page => page.remove());
    
    imageCount = 0;
    allImages.forEach(image => {
        const src = image.querySelector('img').src;
        const name = image.querySelector('.image-name').textContent;
        addImageToPage(src, name);
    });
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
        console.error("jsPDF no está cargado");
        return;
    }

    const quality = parseFloat(document.getElementById('pdfQuality').value);
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    let pages = document.getElementsByClassName('page');

    if (pages.length === 0) {
        document.getElementById('errorMessage').textContent = 'No hay imágenes para exportar';
        return;
    }

    const deleteButtons = document.querySelectorAll('.deleteButton');
    deleteButtons.forEach(button => button.style.display = 'none');

    try {
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            await waitForImagesLoaded(page);

            const canvas = await html2canvas(page, {
                scale: quality * 4,
                useCORS: true,
                logging: false,
                imageTimeout: 0,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', Math.max(quality, 0.95));
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
            
            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, null, 'FAST');
        }

        pdf.save('imagenes.pdf');
    } catch (error) {
        console.error(error);
        document.getElementById('errorMessage').textContent = 'Error al generar el PDF';
    } finally {
        deleteButtons.forEach(button => button.style.display = 'flex');
    }
}
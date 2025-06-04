document.getElementById('fileInput').addEventListener('change', handleFileSelect);

let imageCount = 0;
const imagesPerPage = 4;
const maxFileSize = 5 * 1024 * 1024; // 5MB

function handleFileSelect(event) {
    const files = event.target.files;
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validación de tipo de archivo
        if (!file.type.startsWith('image/')) {
            errorMessage.textContent = `Error: ${file.name} no es una imagen válida`;
            continue;
        }
        
        // Validación de tamaño
        if (file.size > maxFileSize) {
            errorMessage.textContent = `Error: ${file.name} excede el tamaño máximo de 5MB`;
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Extraer solo el nombre del archivo sin la extensión
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            addImageToPage(e.target.result, fileName);
        };
        reader.onerror = function() {
            errorMessage.textContent = `Error al cargar ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}

function addImageToPage(src, name) {
    const pageContainer = document.getElementById('pageContainer');

    let pages = document.getElementsByClassName('page');
    let lastPage = pages[pages.length - 1];

    if (!lastPage || lastPage.getElementsByClassName('imageItem').length >= imagesPerPage) {
        lastPage = document.createElement('div');
        lastPage.classList.add('page');
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
        
        // Reorganizar páginas si es necesario
        reorganizePages();
    };

    imageItem.innerHTML = `<img src="${src}" alt="${name}"><br>${name}`;
    imageItem.appendChild(deleteButton);
    lastPage.appendChild(imageItem);

    imageCount++;
    document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
}

function reorganizePages() {
    const pageContainer = document.getElementById('pageContainer');
    const allImages = document.querySelectorAll('.imageItem');
    const pages = document.querySelectorAll('.page');
    
    // Eliminar todas las páginas
    pages.forEach(page => page.remove());
    
    // Volver a añadir todas las imágenes
    imageCount = 0;
    allImages.forEach(image => {
        const src = image.querySelector('img').src;
        const name = image.querySelector('img').alt;
        addImageToPage(src, name);
    });
}

function exportToPdf() {
    if (!window.jspdf) {
        console.error("jsPDF no está cargado");
        return;
    }

    const orientation = document.getElementById('pdfOrientation').value;
    const quality = parseFloat(document.getElementById('pdfQuality').value);
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    let pages = document.getElementsByClassName('page');

    if (pages.length === 0) {
        document.getElementById('errorMessage').textContent = 'No hay imágenes para exportar';
        return;
    }

    const promises = Array.from(pages).map((page, index) => {
        return html2canvas(page, {
            scale: quality * 2 // Aumentar la escala para mejor calidad
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', quality);
            const pageWidth = orientation === 'p' ? 210 : 297;
            const pageHeight = orientation === 'p' ? 297 : 210;
            
            if (index !== 0) pdf.addPage();
            
            // Calcular dimensiones manteniendo la proporción
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
            
            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        });
    });

    Promise.all(promises).then(() => {
        pdf.save('imagenes.pdf');
    }).catch(error => {
        document.getElementById('errorMessage').textContent = 'Error al generar el PDF';
        console.error(error);
    });
}
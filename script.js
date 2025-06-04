document.getElementById('fileInput').addEventListener('change', handleFileSelect);

let imageCount = 0;
const imagesPerPage = 4;

function handleFileSelect(event) {
    const files = event.target.files;
    const pageContainer = document.getElementById('pageContainer');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = function(e) {
            addImageToPage(e.target.result, file.name);
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
    imageItem.innerHTML = `<img src="${src}" alt="${name}"><br>${name}`;
    lastPage.appendChild(imageItem);

    imageCount++;
    document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
}

function exportToPdf() {
    if (!window.jspdf) {
        console.error("jsPDF no está cargado");
        return;
    }

    const { jsPDF } = window.jspdf; // Asegura acceso a jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let pages = document.getElementsByClassName('page');

    const promises = Array.from(pages).map((page, index) => {
        return html2canvas(page).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // Ancho en mm (A4)
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (index !== 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        });
    });

    Promise.all(promises).then(() => {
        pdf.save('imagenes.pdf');
    });
}
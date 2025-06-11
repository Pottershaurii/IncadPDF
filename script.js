// — Variables y configuración inicial —
const fileInput = document.getElementById('fileInput');
const dividedFileInput = document.getElementById('dividedFileInput');
fileInput.addEventListener('change', handleFileSelect);
dividedFileInput.addEventListener('change', handleDividedFileSelect);

let imageCount = 0;
const imagesPerPage = 5;
const maxFileSize = 5 * 1024 * 1024;
const incadLogo = 'Incad.jpg';
let clientLogoSrc = '';

// Variables para modo dividido
let isDividedMode = false;
let currentImageType = 'odd'; // 'odd' o 'even'
let oddImages = []; // Array para imágenes impares
let evenImages = []; // Array para imágenes pares
let interlacedImages = []; // Array final intercalado

// Precarga logo INCAD
const preloadIncadLogo = new Image();
preloadIncadLogo.crossOrigin = 'anonymous';
preloadIncadLogo.src = incadLogo;

// — Inicialización y eventos —
window.addEventListener('DOMContentLoaded', () => {
  setupModeControls();
  setupClearButton();
  setupTitleUpdates();
  setupLogoUpload();
});

function setupModeControls() {
  const normalModeBtn = document.getElementById('normalModeBtn');
  const dividedModeBtn = document.getElementById('dividedModeBtn');
  const oddTypeBtn = document.getElementById('oddTypeBtn');
  const evenTypeBtn = document.getElementById('evenTypeBtn');

  normalModeBtn.addEventListener('click', () => switchMode('normal'));
  dividedModeBtn.addEventListener('click', () => switchMode('divided'));
  oddTypeBtn.addEventListener('click', () => switchImageType('odd'));
  evenTypeBtn.addEventListener('click', () => switchImageType('even'));
}

function setupClearButton() {
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.addEventListener('click', () => {
    document.getElementById('pageContainer').innerHTML = '';
    imageCount = 0;
    oddImages = [];
    evenImages = [];
    interlacedImages = [];
    updateCounters();
    clearBtn.style.display = 'none';
  });
}

function setupTitleUpdates() {
  document.getElementById('headerTitle').addEventListener('input', e => {
    document.querySelectorAll('.document-title')
            .forEach(t => t.textContent = e.target.value || 'Documento sin título');
  });
}

function setupLogoUpload() {
  // Logo para modo normal
  document.getElementById('clientLogo').addEventListener('change', e => {
    handleLogoUpload(e.target.files[0]);
  });
  
  // Logo para modo dividido
  document.getElementById('clientLogoDivided').addEventListener('change', e => {
    handleLogoUpload(e.target.files[0]);
  });
}

function handleLogoUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    clientLogoSrc = ev.target.result;
    document.querySelectorAll('.client-logo')
            .forEach(img => {
              img.src = clientLogoSrc;
              img.style.display = 'block';
            });
    if (isDividedMode) {
      regenerateInterlacedView();
    } else {
      reorganizePages();
    }
  };
  reader.readAsDataURL(file);
}

// — Control de modos —
function switchMode(mode) {
  const normalBtn = document.getElementById('normalModeBtn');
  const dividedBtn = document.getElementById('dividedModeBtn');
  const normalControls = document.getElementById('normalControls');
  const dividedControls = document.getElementById('dividedControls');

  if (mode === 'normal') {
    isDividedMode = false;
    normalBtn.classList.add('active');
    dividedBtn.classList.remove('active');
    normalControls.style.display = 'block';
    dividedControls.style.display = 'none';
    
    // Limpiar datos del modo dividido si hay
    if (oddImages.length || evenImages.length) {
      clearAll();
    }
  } else {
    isDividedMode = true;
    dividedBtn.classList.add('active');
    normalBtn.classList.remove('active');
    dividedControls.style.display = 'block';
    normalControls.style.display = 'none';
    
    // Limpiar datos del modo normal si hay
    if (imageCount > 0) {
      clearAll();
    }
  }
}

function switchImageType(type) {
  const oddBtn = document.getElementById('oddTypeBtn');
  const evenBtn = document.getElementById('evenTypeBtn');
  const label = document.getElementById('dividedInputLabel');

  currentImageType = type;

  if (type === 'odd') {
    oddBtn.classList.add('active');
    evenBtn.classList.remove('active');
    label.textContent = 'Importar Imágenes Impares';
  } else {
    evenBtn.classList.add('active');
    oddBtn.classList.remove('active');
    label.textContent = 'Importar Imágenes Pares';
  }
}

// — Manejo de archivos modo normal —
function handleFileSelect(event) {
  if (isDividedMode) return;
  
  const files = event.target.files;
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = '';

  let errors = [];
  for (let file of files) {
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name} no es una imagen válida`);
      continue;
    }
    if (file.size > maxFileSize) {
      errors.push(`${file.name} excede 5MB`);
      continue;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const name = file.name.replace(/\.[^/.]+$/, '');
      addImageToPage(ev.target.result, name);
    };
    reader.onerror = () => {
      errors.push(`Error al cargar ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  if (errors.length) {
    errorDiv.innerHTML = errors.join('<br>');
  }
  if (files.length) {
    event.target.value = '';
  }
}

// — Manejo de archivos modo dividido —
function handleDividedFileSelect(event) {
  if (!isDividedMode) return;
  
  const files = event.target.files;
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = '';

  let errors = [];
  let processedFiles = 0;
  const totalFiles = files.length;

  for (let file of files) {
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name} no es una imagen válida`);
      processedFiles++;
      continue;
    }
    if (file.size > maxFileSize) {
      errors.push(`${file.name} excede 5MB`);
      processedFiles++;
      continue;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      addImageToDividedMode(ev.target.result, originalName);
      
      processedFiles++;
      if (processedFiles === totalFiles) {
        // Todas las imágenes han sido procesadas
        generateInterlacedView();
      }
    };
    reader.onerror = () => {
      errors.push(`Error al cargar ${file.name}`);
      processedFiles++;
      if (processedFiles === totalFiles) {
        generateInterlacedView();
      }
    };
    reader.readAsDataURL(file);
  }

  if (errors.length) {
    errorDiv.innerHTML = errors.join('<br>');
  }
  if (files.length) {
    event.target.value = '';
  }
}

// — Agregar imagen en modo dividido —
function addImageToDividedMode(src, originalName) {
  const imageObj = {
    src: src,
    originalName: originalName,
    finalName: ''
  };

  if (currentImageType === 'odd') {
    oddImages.push(imageObj);
    // Renombrar con números impares
    renameOddImages();
  } else {
    evenImages.push(imageObj);
    // Renombrar con números pares
    renameEvenImages();
  }

  updateCounters();
}

// — Renombrado de imágenes —
function renameOddImages() {
  oddImages.forEach((img, index) => {
    const oddNumber = (index * 2) + 1; // 1, 3, 5, 7, 9...
    img.finalName = img.originalName.replace(/\d+$/, oddNumber.toString());
  });
}

function renameEvenImages() {
  evenImages.forEach((img, index) => {
    const evenNumber = (index + 1) * 2; // 2, 4, 6, 8, 10...
    img.finalName = img.originalName.replace(/\d+$/, evenNumber.toString());
  });
}

// — Generar vista intercalada —
function generateInterlacedView() {
  // Crear array intercalado
  interlacedImages = [];
  const maxLength = Math.max(oddImages.length, evenImages.length);
  
  for (let i = 0; i < maxLength; i++) {
    // Agregar imagen impar si existe
    if (i < oddImages.length) {
      interlacedImages.push({...oddImages[i], type: 'odd'});
    }
    // Agregar imagen par si existe
    if (i < evenImages.length) {
      interlacedImages.push({...evenImages[i], type: 'even'});
    }
  }

  // Limpiar contenedor y regenerar páginas
  document.getElementById('pageContainer').innerHTML = '';
  imageCount = 0;

  // Agregar todas las imágenes intercaladas
  interlacedImages.forEach(img => {
    addImageToPage(img.src, img.finalName);
  });

  updateCounters();
}

function regenerateInterlacedView() {
  if (!isDividedMode || interlacedImages.length === 0) return;
  generateInterlacedView();
}

// — Actualizar contadores —
function updateCounters() {
  if (isDividedMode) {
    document.getElementById('oddCount').textContent = oddImages.length;
    document.getElementById('evenCount').textContent = evenImages.length;
    document.getElementById('interlacedCount').textContent = interlacedImages.length;
    
    const totalImages = interlacedImages.length;
    document.getElementById('imageCount').textContent = `Imágenes cargadas: ${totalImages}`;
    
    if (totalImages > 0) {
      document.getElementById('clearAllBtn').style.display = 'flex';
    }
  } else {
    document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
    if (imageCount > 0) {
      document.getElementById('clearAllBtn').style.display = 'flex';
    }
  }
}

// — Limpiar todo —
function clearAll() {
  document.getElementById('pageContainer').innerHTML = '';
  imageCount = 0;
  oddImages = [];
  evenImages = [];
  interlacedImages = [];
  updateCounters();
  document.getElementById('clearAllBtn').style.display = 'none';
}

// — Edición de nombres —
function makeEditable(span) {
  span.contentEditable = true;
  span.classList.add('editable');
  span.focus();
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  span.addEventListener('blur', () => {
    span.contentEditable = false;
    span.classList.remove('editable');
    
    // Si estamos en modo dividido, actualizar el nombre en el array correspondiente
    if (isDividedMode) {
      updateImageNameInArrays(span);
    }
  }, { once: true });

  span.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      span.blur();
    }
  }, { once: true });
}

function updateImageNameInArrays(span) {
  const newName = span.textContent;
  const imageItem = span.closest('.imageItem');
  const imgSrc = imageItem.querySelector('img').src;
  
  // Buscar y actualizar en los arrays
  let found = false;
  
  // Buscar en imágenes impares
  for (let img of oddImages) {
    if (img.src === imgSrc) {
      img.finalName = newName;
      found = true;
      break;
    }
  }
  
  // Si no se encontró en impares, buscar en pares
  if (!found) {
    for (let img of evenImages) {
      if (img.src === imgSrc) {
        img.finalName = newName;
        break;
      }
    }
  }
  
  // Actualizar array intercalado
  for (let img of interlacedImages) {
    if (img.src === imgSrc) {
      img.finalName = newName;
      break;
    }
  }
}

// — Eliminar imagen —
function deleteImage(btn) {
  const snapshots = [];
  document.querySelectorAll('.imageItem').forEach(item => {
    if (item.querySelector('.deleteButton') !== btn) {
      snapshots.push({
        src: item.querySelector('img').src,
        name: item.querySelector('.image-name').textContent
      });
    }
  });

  const container = document.getElementById('pageContainer');
  container.innerHTML = '';
  
  if (isDividedMode) {
    // En modo dividido, reconstruir arrays y regenerar
    const deletedImgSrc = btn.closest('.imageItem').querySelector('img').src;
    
    // Eliminar de arrays
    oddImages = oddImages.filter(img => img.src !== deletedImgSrc);
    evenImages = evenImages.filter(img => img.src !== deletedImgSrc);
    
    // Renombrar y regenerar
    renameOddImages();
    renameEvenImages();
    generateInterlacedView();
  } else {
    // Modo normal
    imageCount = 0;
    snapshots.forEach(o => addImageToPage(o.src, o.name));
  }

  if (snapshots.length === 0) {
    document.getElementById('clearAllBtn').style.display = 'none';
  }
}

// — Añadir imagen a página (modo normal y vista final) —
function addImageToPage(src, name) {
  const container = document.getElementById('pageContainer');
  let pages = container.getElementsByClassName('page');
  let lastPage = pages[pages.length - 1];

  if (!lastPage || lastPage.getElementsByClassName('imageItem').length >= imagesPerPage) {
    lastPage = document.createElement('div');
    lastPage.classList.add('page');

    // Header
    const header = document.createElement('div');
    header.classList.add('page-header');
    const clientHtml = clientLogoSrc
      ? `<img src="${clientLogoSrc}" class="client-logo" style="display:block;">`
      : '<div style="width:40px;"></div>';
    header.innerHTML = `
      <img src="${incadLogo}" class="incad-logo" crossorigin="anonymous">
      <h1 class="document-title">${document.getElementById('headerTitle').value || 'Documento sin título'}</h1>
      ${clientHtml}
    `;
    lastPage.appendChild(header);

    // Número de página
    const pageNum = document.createElement('div');
    pageNum.classList.add('page-number');
    pageNum.textContent = pages.length + 1;
    lastPage.appendChild(pageNum);

    // Footer
    const footer = document.createElement('div');
    footer.classList.add('page-footer');
    footer.innerHTML = `
      <p>INCAD SERVICE 2025 ®</p>
      <p>Carlos Rosales B. | Contacto: +51 969 991 467 | crosales@incad-service.com</p>
    `;
    lastPage.appendChild(footer);

    container.appendChild(lastPage);
  }

  // Item de imagen
  const item = document.createElement('div');
  item.classList.add('imageItem');
  item.innerHTML = `
    <button class="deleteButton" onclick="deleteImage(this)">×</button>
    <img src="${src}" alt="${name}">
    <span class="image-name" onclick="makeEditable(this)">${name}</span>
  `;
  lastPage.appendChild(item);

  imageCount++;
  updateCounters();
}

// — Reorganizar páginas —
function reorganizePages() {
  const snaps = [];
  document.querySelectorAll('.imageItem').forEach(item => {
    snaps.push({
      src: item.querySelector('img').src,
      name: item.querySelector('.image-name').textContent
    });
  });
  document.getElementById('pageContainer').innerHTML = '';
  imageCount = 0;
  snaps.forEach(o => addImageToPage(o.src, o.name));
}

// — Exportar a PDF —
async function exportToPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ format: 'a4', unit: 'px' });
  const pages = document.querySelectorAll('.page');
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: window.devicePixelRatio * 2,
      useCORS: true,
    });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight()
    );
    if (i < pages.length - 1) pdf.addPage();
  }
  pdf.save(`${document.getElementById('headerTitle').value || 'Reporte'}.pdf`);
}
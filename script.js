// — Variables y configuración inicial —
const fileInput = document.getElementById('fileInput');
const dividedFileInput = document.getElementById('dividedFileInput');
fileInput.addEventListener('change', handleFileSelect);
dividedFileInput.addEventListener('change', handleDividedFileSelect);

let imageCount = 0;
const imagesPerPage = 5;
const maxFileSize = 1 * 1024 * 1024;
const incadLogo = 'Incad.jpg';
let clientLogoSrc = '';

// Variables para modo dividido
let isDividedMode = false;
let currentImageType = 'odd'; // 'odd' o 'even'
let oddImages = []; // Array para imágenes impares
let evenImages = []; // Array para imágenes pares
let interlacedImages = []; // Array final intercalado

// Variables para el contador - estas controlan desde qué número empezar
let nextOddNumber = 1;     // Próximo número impar a usar
let nextEvenNumber = 2;    // Próximo número par a usar
let counterReset = false;  // Flag para saber si se reinició el contador

// Variables para Dashboard
let dashboardOddImages = [];
let dashboardEvenImages = [];
let dashboardClientLogo = '';
let currentInterface = 'organizador';

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
  setupResetCounterButton();  // Agregado para el botón de reiniciar contador
  setupDashboardControls();  // Configurar controles del dashboard
});

// — Cambio de interfaz —
function switchInterface(interfaceName) {
  currentInterface = interfaceName;
  
  // Ocultar todas las interfaces
  document.getElementById('organizadorInterface').style.display = 'none';
  document.getElementById('dashboardInterface').style.display = 'none';
  
  // Mostrar la interfaz seleccionada
  document.getElementById(interfaceName + 'Interface').style.display = 'block';
  
  // Actualizar botones del menú
  document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(interfaceName + 'Btn').classList.add('active');
}

// — Configuración Dashboard —
function setupDashboardControls() {
  // Configurar inputs de archivo para Dashboard
  document.getElementById('dashboardOddInput').addEventListener('change', handleDashboardOddInput);
  document.getElementById('dashboardEvenInput').addEventListener('change', handleDashboardEvenInput);
  document.getElementById('dashboardClientLogo').addEventListener('change', handleDashboardClientLogo);
  
  // Configurar selectores de imágenes
  document.getElementById('oddImageSelector').addEventListener('change', updateDashboardPreview);
  document.getElementById('evenImageSelector').addEventListener('change', updateDashboardPreview);
  
  // Configurar título
  document.getElementById('dashboardTitle').addEventListener('input', updateDashboardPreview);
  
  // Configurar botón limpiar
  document.getElementById('clearDashboardBtn').addEventListener('click', clearDashboard);
}

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
    nextOddNumber = 1;
    nextEvenNumber = 2;
    counterReset = false;
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

function setupResetCounterButton() {
  // Configurar el botón de reiniciar contador
  document.getElementById('resetCounterBtn').addEventListener('click', resetImageCounter);
}

function resetImageCounter() {
  if (isDividedMode) {
    // Reiniciar los contadores para que las próximas imágenes empiecen desde 1 y 2
    nextOddNumber = 1;
    nextEvenNumber = 2;
    counterReset = true; // Marcar que se reinició el contador
    
    // Mostrar feedback visual al usuario
    const btn = document.getElementById('resetCounterBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Contador Reiniciado ✓';
    btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'linear-gradient(135deg, #d82222 0%, #d70909 100%)';
    }, 2000);
  }
}

// Cargar Logo del Cliente
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
  } else {
    isDividedMode = true;
    dividedBtn.classList.add('active');
    normalBtn.classList.remove('active');
    dividedControls.style.display = 'block';
    normalControls.style.display = 'none';
  }

  // Mantener las imágenes ya cargadas (no eliminarlas al cambiar de modo)
  updateCounters();
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
  if (isDividedMode) return;  // Si estamos en el modo dividido, no reiniciar

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
      errors.push(`${file.name} excede el tamaño máximo de 1MB`);
      continue;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      // Eliminar la extensión del archivo (como .svg, .png, .jpg)
      const name = file.name.replace(/\.[^/.]+$/, '');  // Elimina la extensión
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
    event.target.value = ''; // Limpiar el input
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

  const baseNameWithoutNumber = originalName.replace(/\d+$/, '');

  if (currentImageType === 'odd') {
    oddImages.push(imageObj);
    
    if (counterReset) {
      // Si se reinició el contador, usar nextOddNumber directamente
      imageObj.finalName = baseNameWithoutNumber + nextOddNumber;
      nextOddNumber += 2;
    } else {
      // Si no se reinició, calcular basándose en las imágenes existentes
      const currentOddNumber = (oddImages.length - 1) * 2 + 1; // -1 porque ya se agregó al array
      imageObj.finalName = baseNameWithoutNumber + (currentOddNumber);
    }
  } else {
    evenImages.push(imageObj);
    
    if (counterReset) {
      // Si se reinició el contador, usar nextEvenNumber directamente
      imageObj.finalName = baseNameWithoutNumber + nextEvenNumber;
      nextEvenNumber += 2;
    } else {
      // Si no se reinició, calcular basándose en las imágenes existentes
      // CORREGIDO: Usar (evenImages.length - 1) porque ya se agregó la imagen al array
      const currentEvenNumber = (evenImages.length - 1) * 2 + 2; // Esto da: 2, 4, 6, 8...
      imageObj.finalName = baseNameWithoutNumber + currentEvenNumber;
    }
  }

  updateCounters();
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
  
  // Resetear el flag después de generar la vista
  counterReset = false;
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
  if (!isDividedMode) {
    // Solo limpiar si estamos en modo normal
    document.getElementById('pageContainer').innerHTML = '';
    imageCount = 0;
  }

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
  if (isDividedMode) {
    const deletedSrc = btn.closest('.imageItem').querySelector('img').src;

    // 1) Buscar índice en oddImages
    const oddIdx = oddImages.findIndex(img => img.src === deletedSrc);
    if (oddIdx > -1) {
      oddImages.splice(oddIdx, 1);
    } else {
      // 2) Si no estaba en impares, buscar en evenImages
      const evenIdx = evenImages.findIndex(img => img.src === deletedSrc);
      if (evenIdx > -1) {
        evenImages.splice(evenIdx, 1);
      }
    }

    // 3) Regenerar la vista sin renombrar (mantener los nombres actuales)
    generateInterlacedView();

  } else {
    // tu código actual para modo normal
    const snapshots = [];
    document.querySelectorAll('.imageItem').forEach(item => {
      if (item.querySelector('.deleteButton') !== btn) {
        snapshots.push({
          src: item.querySelector('img').src,
          name: item.querySelector('.image-name').textContent
        });
      }
    });
    document.getElementById('pageContainer').innerHTML = '';
    imageCount = 0;
    snapshots.forEach(o => addImageToPage(o.src, o.name));
    if (snapshots.length === 0) {
      document.getElementById('clearAllBtn').style.display = 'none';
    }
  }

  updateCounters();
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
  // Usar escala 2.5 y calidad JPEG 0.98 para mejor calidad visual y peso contenido
  const exportScale = 2.5;
  const jpegQuality = 0.98;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Rasterizar toda la página, incluyendo SVGs
    const canvas = await html2canvas(page, {
      scale: exportScale,
      useCORS: true,
      backgroundColor: '#fff',
    });
    const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    if (i < pages.length - 1) pdf.addPage();
  }
  pdf.save(`${document.getElementById('headerTitle').value || 'Reporte'}.pdf`);
}

// — Imprimir Vista Previa con Modal y Configuración —
function printPreview() {
  // Copiar el contenido de la vista previa al modal
  const previewArea = document.getElementById('printPreviewArea');
  previewArea.innerHTML = document.getElementById('pageContainer').innerHTML;
  document.getElementById('printModal').style.display = 'flex';
  // Reset opciones
  document.getElementById('printOrientation').value = 'portrait';
  document.getElementById('printMargin').value = 'normal';
  applyPrintStyles();
}

function closePrintModal() {
  document.getElementById('printModal').style.display = 'none';
  removePrintStyles();
}

function applyPrintStyles() {
  // Aplica los estilos de orientación y márgenes a la vista previa
  const orientation = document.getElementById('printOrientation').value;
  const margin = document.getElementById('printMargin').value;
  const previewArea = document.getElementById('printPreviewArea');
  previewArea.style.width = orientation === 'landscape' ? '842px' : '595px';
  previewArea.style.height = orientation === 'landscape' ? '595px' : '842px';
  if (margin === 'normal') {
    previewArea.style.padding = '32px';
  } else if (margin === 'narrow') {
    previewArea.style.padding = '8px';
  } else {
    previewArea.style.padding = '0';
  }
}

document.getElementById('printOrientation').addEventListener('change', applyPrintStyles);
document.getElementById('printMargin').addEventListener('change', applyPrintStyles);

function confirmPrint() {
  // Crea un iframe oculto para imprimir con los estilos seleccionados
  const orientation = document.getElementById('printOrientation').value;
  const margin = document.getElementById('printMargin').value;
  const printContents = document.getElementById('printPreviewArea').innerHTML;
  const styleHref = document.querySelector('link[href*="style.css"]').href;
  let printStyles = `<link rel="stylesheet" href="${styleHref}">`;
  printStyles += `<style>@page { size: ${orientation} A4; }`;
  if (margin === 'normal') {
    printStyles += '@page { margin: 2.5cm 2cm 2.5cm 2cm; }';
  } else if (margin === 'narrow') {
    printStyles += '@page { margin: 0.7cm 0.7cm 0.7cm 0.7cm; }';
  } else {
    printStyles += '@page { margin: 0; }';
  }
  printStyles += '</style>';

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  printFrame.contentDocument.open();
  printFrame.contentDocument.write('<html><head><title>Imprimir</title>' + printStyles + '</head><body>');
  printFrame.contentDocument.write('<div class="main-container">' + printContents + '</div>');
  printFrame.contentDocument.write('</body></html>');
  printFrame.contentDocument.close();

  printFrame.onload = function() {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(printFrame);
      closePrintModal();
    }, 500);
  };
}

function removePrintStyles() {
  // Limpia cualquier estilo temporal si es necesario (placeholder)
}

// — Funciones Dashboard —
function handleDashboardOddInput(event) {
  const files = event.target.files;
  dashboardOddImages = [];
  
  for (let file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const name = file.name.replace(/\.[^/.]+$/, '');
        dashboardOddImages.push({
          name: name,
          src: e.target.result
        });
        updateOddSelector();
      };
      reader.readAsDataURL(file);
    }
  }
}

function handleDashboardEvenInput(event) {
  const files = event.target.files;
  dashboardEvenImages = [];
  
  for (let file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const name = file.name.replace(/\.[^/.]+$/, '');
        dashboardEvenImages.push({
          name: name,
          src: e.target.result
        });
        updateEvenSelector();
      };
      reader.readAsDataURL(file);
    }
  }
}

function handleDashboardClientLogo(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      dashboardClientLogo = e.target.result;
      updateDashboardPreview();
    };
    reader.readAsDataURL(file);
  }
}

function updateOddSelector() {
  const selector = document.getElementById('oddImageSelector');
  selector.innerHTML = '<option value="">Seleccione una imagen...</option>';
  
  dashboardOddImages.forEach((img, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = img.name;
    selector.appendChild(option);
  });
  
  updateDashboardPreview();
}

function updateEvenSelector() {
  const selector = document.getElementById('evenImageSelector');
  selector.innerHTML = '<option value="">Seleccione una imagen...</option>';
  
  dashboardEvenImages.forEach((img, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = img.name;
    selector.appendChild(option);
  });
  
  updateDashboardPreview();
}

function updateDashboardPreview() {
  const preview = document.getElementById('dashboardPreview');
  const title = document.getElementById('dashboardTitle').value || 'Documento sin título';
  const oddIndex = document.getElementById('oddImageSelector').value;
  const evenIndex = document.getElementById('evenImageSelector').value;
  
  if (oddIndex === '' && evenIndex === '') {
    preview.innerHTML = '<p>Seleccione imágenes para ver la vista previa</p>';
    return;
  }
  
  // Crear página de vista previa
  const page = document.createElement('div');
  page.classList.add('page');
  
  // Header
  const header = document.createElement('div');
  header.classList.add('page-header');
  const clientHtml = dashboardClientLogo
    ? `<img src="${dashboardClientLogo}" class="client-logo" style="display:block;">`
    : '<div style="width:40px;"></div>';
  header.innerHTML = `
    <img src="${incadLogo}" class="incad-logo" crossorigin="anonymous">
    <h1 class="document-title">${title}</h1>
    ${clientHtml}
  `;
  page.appendChild(header);
  
  // Agregar imagen impar si está seleccionada
  if (oddIndex !== '' && dashboardOddImages[oddIndex]) {
    const oddImg = dashboardOddImages[oddIndex];
    const item = document.createElement('div');
    item.classList.add('imageItem');
    item.innerHTML = `
      <img src="${oddImg.src}" alt="${oddImg.name}">
      <span class="image-name">${oddImg.name}</span>
    `;
    page.appendChild(item);
  }
  
  // Agregar imagen par si está seleccionada
  if (evenIndex !== '' && dashboardEvenImages[evenIndex]) {
    const evenImg = dashboardEvenImages[evenIndex];
    const item = document.createElement('div');
    item.classList.add('imageItem');
    item.innerHTML = `
      <img src="${evenImg.src}" alt="${evenImg.name}">
      <span class="image-name">${evenImg.name}</span>
    `;
    page.appendChild(item);
  }
  
  // Footer
  const footer = document.createElement('div');
  footer.classList.add('page-footer');
  footer.innerHTML = `
    <p>INCAD SERVICE 2025 ®</p>
    <p>Carlos Rosales B. | Contacto: +51 969 991 467 | crosales@incad-service.com</p>
  `;
  page.appendChild(footer);
  
  preview.innerHTML = '';
  preview.appendChild(page);
}

function clearDashboard() {
  dashboardOddImages = [];
  dashboardEvenImages = [];
  dashboardClientLogo = '';
  document.getElementById('dashboardTitle').value = '';
  document.getElementById('oddImageSelector').innerHTML = '<option value="">Seleccione una imagen...</option>';
  document.getElementById('evenImageSelector').innerHTML = '<option value="">Seleccione una imagen...</option>';
  document.getElementById('dashboardPreview').innerHTML = '';
  document.getElementById('dashboardOddInput').value = '';
  document.getElementById('dashboardEvenInput').value = '';
  document.getElementById('dashboardClientLogo').value = '';
}

async function exportDashboardToPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ format: 'a4', unit: 'px' });
  const page = document.querySelector('#dashboardPreview .page');
  
  if (!page) {
    alert('No hay contenido para exportar');
    return;
  }
  
  const exportScale = 2.5;
  const jpegQuality = 0.98;
  
  const canvas = await html2canvas(page, {
    scale: exportScale,
    useCORS: true,
    backgroundColor: '#fff',
  });
  
  const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
  pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  
  const title = document.getElementById('dashboardTitle').value || 'Dashboard';
  pdf.save(`${title}.pdf`);
}
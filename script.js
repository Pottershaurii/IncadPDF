// — Variables y configuración inicial —
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', handleFileSelect);

let imageCount = 0;
const imagesPerPage = 5;                // ahora 5 imágenes por página
const maxFileSize = 5 * 1024 * 1024;    // 5MB
const incadLogo = 'Incad.jpg';          // logo INCAD
let clientLogoSrc = '';                 // logo Cliente

// Precarga logo INCAD (para evitar CORS)
const preloadIncadLogo = new Image();
preloadIncadLogo.crossOrigin = 'anonymous';
preloadIncadLogo.src = incadLogo;

// — Mostrar botón “Limpiar Todo” y su acción —
window.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.addEventListener('click', () => {
    document.getElementById('pageContainer').innerHTML = '';
    imageCount = 0;
    document.getElementById('imageCount').textContent = 'Imágenes cargadas: 0';
    clearBtn.style.display = 'none';
  });
});

// — Título dinámico en cada página —
document.getElementById('headerTitle').addEventListener('input', e => {
  document.querySelectorAll('.document-title')
          .forEach(t => t.textContent = e.target.value || 'Documento sin título');
});

// — Carga de logo del cliente —
document.getElementById('clientLogo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    clientLogoSrc = ev.target.result;
    document.querySelectorAll('.client-logo')
            .forEach(img => {
              img.src = clientLogoSrc;
              img.style.display = 'block';
            });
    reorganizePages();
  };
  reader.readAsDataURL(file);
});

// — Manejo de archivos seleccionados —
function handleFileSelect(event) {
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
    event.target.value = '';  // permite recargar mismos archivos
  }
}

// — Activar edición inline del nombre —
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
  }, { once: true });

  span.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      span.blur();
    }
  }, { once: true });
}

function deleteImage(btn) {
  const snapshots = [];
  document.querySelectorAll('.imageItem').forEach(item => {
    if (item.querySelector('.deleteButton') !== btn) {
      snapshots.push({
        src:  item.querySelector('img').src,
        name: item.querySelector('.image-name').textContent
      });
    }
  });

const container = document.getElementById('pageContainer');
  container.innerHTML = '';
  imageCount = 0;

if (snapshots.length === 0) {
    document.getElementById('clearAllBtn').style.display = 'none';
  }

snapshots.forEach(o => addImageToPage(o.src, o.name));
}

// — Añade cada imagen y su nombre a la página correspondiente —
function addImageToPage(src, name) {
  const container = document.getElementById('pageContainer');
  let pages = container.getElementsByClassName('page');
  let lastPage = pages[pages.length - 1];

  // Si no existe página o ya llegó al tope, creo una nueva
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

  // Bloque de imagen + nombre + botón eliminar
  const item = document.createElement('div');
  item.classList.add('imageItem');
  item.innerHTML = `
    <button class="deleteButton" onclick="deleteImage(this)">×</button>
    <img src="${src}" alt="${name}">
    <span class="image-name" onclick="makeEditable(this)">${name}</span>
  `;
  lastPage.appendChild(item);

  // Actualizar contador y mostrar botón Limpiar
  imageCount++;
  document.getElementById('imageCount').textContent = `Imágenes cargadas: ${imageCount}`;
  if (imageCount > 0) {
    document.getElementById('clearAllBtn').style.display = 'flex';
  }
}

// — Reordena todas las páginas (para cuando cambias el logo cliente) —
function reorganizePages() {
  const snaps = [];
  document.querySelectorAll('.imageItem').forEach(item => {
    snaps.push({
      src:  item.querySelector('img').src,
      name: item.querySelector('.image-name').textContent
    });
  });
  document.getElementById('pageContainer').innerHTML = '';
  imageCount = 0;
  snaps.forEach(o => addImageToPage(o.src, o.name));
}

// — Exportar todo a PDF —
async function exportToPdf() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ format: 'a4', unit: 'px' });
  const pages = document.querySelectorAll('.page');
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i]);
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight()
    );
    if (i < pages.length - 1) pdf.addPage();
  }
  pdf.save(`${document.getElementById('headerTitle').value || 'Reporte'}.pdf`);
}
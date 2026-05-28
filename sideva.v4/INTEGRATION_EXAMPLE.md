# Contoh Integrasi Multi-OPD ke Dashboard

## 📝 Contoh 1: Menampilkan OPD di Dashboard

### Sebelum (Single OPD)
```javascript
// dashboard.js - original
function renderDashboard() {
  const paketCount = state.paket.data.length;
  const rincianCount = state.rincian.data.length;
  // ... render UI
}
```

### Sesudah (Multi-OPD)
```javascript
// dashboard.js - dengan multi-OPD
function renderDashboard() {
  const opdName = getCurrentOpdName();
  const paketCount = state.paket.data.length;
  const rincianCount = state.rincian.data.length;
  
  // Tampilkan OPD info
  const opdInfo = document.getElementById('dashboard-opd-info');
  if (opdInfo) {
    opdInfo.textContent = `📍 ${opdName}`;
  }
  
  // ... render UI
}
```

---

## 📝 Contoh 2: Filter Data per OPD di Laporan

### Sebelum (All Data)
```javascript
function generateLaporan() {
  const allPaket = state.paket.data;
  const allRincian = state.rincian.data;
  
  // Generate laporan untuk semua data
  let total = 0;
  allPaket.forEach(p => {
    total += p.paguAnggaran || 0;
  });
  
  return { total, count: allPaket.length };
}
```

### Sesudah (Per OPD)
```javascript
function generateLaporan() {
  const opdId = getCurrentOpdId();
  
  // Filter data per OPD (sudah otomatis via dbGetAll)
  const paketPerOpd = state.paket.data.filter(p => p.opd_id === opdId);
  const rincianPerOpd = state.rincian.data.filter(r => r.opd_id === opdId);
  
  // Generate laporan untuk OPD saat ini
  let total = 0;
  paketPerOpd.forEach(p => {
    total += p.paguAnggaran || 0;
  });
  
  return { 
    opd: getCurrentOpdName(),
    total, 
    count: paketPerOpd.length 
  };
}
```

---

## 📝 Contoh 3: Export Data per OPD

### Sebelum (Export All)
```javascript
function exportToExcel() {
  const data = state.paket.data;
  // Export semua paket
  exportAsExcel(data, 'paket.xlsx');
}
```

### Sesudah (Export per OPD)
```javascript
function exportToExcel() {
  const opdId = getCurrentOpdId();
  const opdName = getCurrentOpdName();
  
  // Filter data per OPD
  const data = state.paket.data.filter(p => p.opd_id === opdId);
  
  // Export dengan nama file yang include OPD
  const filename = `paket_${opdName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  exportAsExcel(data, filename);
}
```

---

## 📝 Contoh 4: Update Form Input untuk Include OPD

### Sebelum (No OPD field)
```html
<!-- form untuk tambah paket -->
<form id="form-paket">
  <input type="text" id="no-paket" placeholder="No Paket">
  <input type="text" id="nama-paket" placeholder="Nama Paket">
  <button onclick="savePaket()">Simpan</button>
</form>
```

### Sesudah (Include OPD)
```html
<!-- form untuk tambah paket dengan OPD -->
<form id="form-paket">
  <div class="form-group">
    <label>OPD</label>
    <input type="text" id="paket-opd" readonly value="[akan di-set otomatis]">
    <small>OPD dipilih dari dropdown di topbar</small>
  </div>
  
  <div class="form-group">
    <label>No Paket</label>
    <input type="text" id="no-paket" placeholder="No Paket">
  </div>
  
  <div class="form-group">
    <label>Nama Paket</label>
    <input type="text" id="nama-paket" placeholder="Nama Paket">
  </div>
  
  <button onclick="savePaket()">Simpan</button>
</form>

<script>
// Update OPD field saat form dibuka
function openPaketForm() {
  const opdName = getCurrentOpdName();
  document.getElementById('paket-opd').value = opdName;
}

// Save paket dengan OPD otomatis
async function savePaket() {
  const data = {
    noPaket: document.getElementById('no-paket').value,
    namaPaket: document.getElementById('nama-paket').value,
    // opd_id akan di-inject otomatis oleh multi-opd-db.js
  };
  
  await dbPut('paket', data);
  toast('Paket berhasil disimpan', 'success');
}
</script>
```

---

## 📝 Contoh 5: Menampilkan OPD Info di Dokumen Cetak

### Sebelum (Single Instansi)
```javascript
function kopSurat() {
  const cfg = appConfig;
  return `
    <div class="kop-surat">
      <h2>${cfg.namaInstansi}</h2>
      <p>${cfg.alamat}</p>
    </div>
  `;
}
```

### Sesudah (Per OPD)
```javascript
function kopSurat() {
  const cfg = appConfig;
  const opdName = getCurrentOpdName();
  
  return `
    <div class="kop-surat">
      <h2>${cfg.namaInstansi}</h2>
      <p>${cfg.alamat}</p>
      <p style="font-size:12px;color:#666;">
        📍 ${opdName}
      </p>
    </div>
  `;
}
```

---

## 📝 Contoh 6: Event Listener untuk OPD Change

### Reload Data saat OPD Berubah
```javascript
// Tambahkan di file dashboard.js atau pengajuan.js
window.addEventListener('opd-changed', async (e) => {
  console.log('OPD berubah ke:', e.detail.opdName);
  
  // Reload data
  await loadAllDataFiltered();
  
  // Render ulang UI
  if (typeof renderAll === 'function') renderAll();
  if (typeof updateBadges === 'function') updateBadges();
  
  // Update title
  const title = document.querySelector('h1');
  if (title) {
    title.textContent = `Dashboard - ${e.detail.opdName}`;
  }
});
```

---

## 📝 Contoh 7: Tambah OPD Info ke Sidebar

### Update Sidebar dengan OPD Info
```javascript
function updateSidebarOpdInfo() {
  const opdName = getCurrentOpdName();
  const opdList = getUserOpdList();
  
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (sidebarFooter) {
    const opdInfo = document.createElement('div');
    opdInfo.style.cssText = 'padding:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text3);';
    opdInfo.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px;">OPD Aktif</div>
      <div style="color:var(--gold);">${opdName}</div>
      <div style="margin-top:8px;font-size:10px;opacity:0.6;">
        Akses: ${opdList.length} OPD
      </div>
    `;
    sidebarFooter.appendChild(opdInfo);
  }
}

// Panggil saat UI di-render
window.addEventListener('opd-changed', () => {
  updateSidebarOpdInfo();
});
```

---

## 📝 Contoh 8: Validasi OPD saat Simpan Data

### Validasi User Punya Akses ke OPD
```javascript
async function savePaketWithValidation() {
  const opdId = getCurrentOpdId();
  const userOpdList = getUserOpdList();
  
  // Validasi user punya akses ke OPD
  if (!userOpdList.find(o => o.id === opdId)) {
    toast('Anda tidak punya akses ke OPD ini', 'error');
    return;
  }
  
  // Lanjut simpan
  const data = {
    noPaket: document.getElementById('no-paket').value,
    namaPaket: document.getElementById('nama-paket').value,
  };
  
  await dbPut('paket', data);
  toast('Paket berhasil disimpan', 'success');
}
```

---

## 📝 Contoh 9: Dashboard Statistics per OPD

### Tampilkan Statistik per OPD
```javascript
function renderOpdStatistics() {
  const opdId = getCurrentOpdId();
  const opdName = getCurrentOpdName();
  
  // Filter data per OPD
  const paketPerOpd = state.paket.data.filter(p => p.opd_id === opdId);
  const rincianPerOpd = state.rincian.data.filter(r => r.opd_id === opdId);
  const hargaPerOpd = state.harga.data.filter(h => h.opd_id === opdId);
  
  // Hitung statistik
  const totalPagu = paketPerOpd.reduce((sum, p) => sum + (p.paguAnggaran || 0), 0);
  const totalRincian = rincianPerOpd.length;
  const avgHarga = hargaPerOpd.length > 0
    ? hargaPerOpd.reduce((sum, h) => sum + (h.totalHarga || 0), 0) / hargaPerOpd.length
    : 0;
  
  // Render
  const statsEl = document.getElementById('opd-statistics');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">OPD</div>
        <div class="stat-value">${opdName}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Paket</div>
        <div class="stat-value">${paketPerOpd.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Pagu</div>
        <div class="stat-value">Rp ${totalPagu.toLocaleString('id-ID')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Rincian</div>
        <div class="stat-value">${totalRincian}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rata-rata Harga</div>
        <div class="stat-value">Rp ${avgHarga.toLocaleString('id-ID')}</div>
      </div>
    `;
  }
}

// Panggil saat OPD berubah
window.addEventListener('opd-changed', () => {
  renderOpdStatistics();
});
```

---

## 📝 Contoh 10: Breadcrumb dengan OPD Info

### Tampilkan Breadcrumb
```javascript
function updateBreadcrumb() {
  const opdName = getCurrentOpdName();
  const page = getCurrentPage(); // Fungsi untuk get halaman aktif
  
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <span>Dashboard</span>
      <span>›</span>
      <span>${opdName}</span>
      <span>›</span>
      <span>${page}</span>
    `;
  }
}

// Update saat navigasi
window.addEventListener('opd-changed', () => {
  updateBreadcrumb();
});
```

---

## 🎯 Best Practices

### ✅ DO
- ✅ Filter data menggunakan `getCurrentOpdId()`
- ✅ Tampilkan OPD info di UI
- ✅ Validasi user punya akses ke OPD
- ✅ Update UI saat OPD berubah
- ✅ Include OPD di export/laporan
- ✅ Gunakan event listener `opd-changed`

### ❌ DON'T
- ❌ Hardcode OPD ID
- ❌ Bypass OPD filter
- ❌ Tampilkan data tanpa filter OPD
- ❌ Lupa update form untuk include OPD
- ❌ Export semua data tanpa filter
- ❌ Ignore OPD saat save data

---

## 🔍 Testing Checklist

- [ ] Data ter-filter per OPD
- [ ] Dropdown OPD berfungsi
- [ ] Switch OPD update data
- [ ] Export include OPD
- [ ] Laporan per OPD
- [ ] Form auto-set OPD
- [ ] Admin dapat manage OPD
- [ ] User tidak bisa akses OPD lain

---

**Happy Coding! 🚀**

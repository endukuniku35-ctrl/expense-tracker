/**
 * ocr_scanner.js – Client-side OCR Bill Scanner & Receipt Upload Verification Module
 */

window.triggerOCRScan = function triggerOCRScan() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showLoader();
    showToast('OCR Processing 📸', 'Scanning receipt items, vendor, and total amount...', 'info', 3000);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      const res = await api('/api/ocr/scan', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      });
      hideLoader();

      if (res && res.success && res.ocrResult) {
        const ocr = res.ocrResult;
        showToast('Receipt Scanned! 🧾', `Detected ${ocr.vendor} - Total: ₹${ocr.amount}`, 'success', 4000);

        // Pre-fill Expense form
        if (document.getElementById('expTitle')) document.getElementById('expTitle').value = `${ocr.vendor} Bill`;
        if (document.getElementById('expAmount')) document.getElementById('expAmount').value = ocr.amount;
        if (document.getElementById('expDate')) document.getElementById('expDate').value = ocr.date;
        if (document.getElementById('expDesc')) document.getElementById('expDesc').value = ocr.items.map(i => `${i.name}: ₹${i.price}`).join(', ');
      } else {
        showToast('OCR Error', 'Failed to scan receipt. Please enter details manually.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  input.click();
};

window.uploadPaymentReceiptForApproval = function uploadPaymentReceiptForApproval(amount, relatedId, type) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showLoader();
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await api('/api/ocr/verify-receipt', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: reader.result, amount, relatedId, type })
      });
      hideLoader();

      if (res && res.success) {
        showToast('Receipt Uploaded 📩', 'Submitted for Admin Approval. Status: Pending Verification', 'success', 4000);
      } else {
        showToast('Upload Failed', res?.message || 'Could not upload receipt', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  input.click();
};

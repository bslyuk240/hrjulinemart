import jsPDF from 'jspdf';

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  return 'NGN ' + formatted;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB');
};

export const generatePayslip = async (payrollData, employeeData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'JulineMart';
  const companyLogo = import.meta.env.VITE_COMPANY_LOGO || 'https://res.cloudinary.com/dupgdbwrt/image/upload/v1759971092/icon-512x512.png_ygtda9.png';
  
  // ==================== HEADER SECTION ====================
  // Try to add logo image
  try {
    const logoImg = await fetch(companyLogo)
      .then(res => res.blob())
      .then(blob => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });
    
    // Add logo image
    doc.addImage(logoImg, 'PNG', 15, 12, 30, 30);
  } catch (error) {
    // Fallback: Logo placeholder box if image fails
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, 12, 30, 30, 'S');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('LOGO', 30, 29, { align: 'center' });
  }
  
  // Company Info (top right)
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyName} Online`, pageWidth - 15, 20, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('No. 9 Jesus is Lord Street off Refinery road', pageWidth - 15, 27, { align: 'right' });
  doc.text('Effurun Warri Delta State', pageWidth - 15, 32, { align: 'right' });
  doc.text('www.julinemart.com', pageWidth - 15, 37, { align: 'right' });
  
  // ... rest of the PDF code remains the same ...
  
  // Horizontal line under header
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(15, 48, pageWidth - 15, 48);
  
  // ==================== PAYSLIP TITLE ====================
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', pageWidth / 2, 58, { align: 'center' });
  
  // Blue underline
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(1.5);
  doc.line(pageWidth / 2 - 15, 60, pageWidth / 2 + 15, 60);
  
  // ==================== EMPLOYEE DETAILS BOX ====================
  let yPos = 68;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setFillColor(248, 249, 250);
  doc.rect(15, yPos, pageWidth - 30, 45, 'FD');
  
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  
  // Left column
  doc.text('Employee Name:', 20, yPos + 8);
  doc.text('Employee Code:', 20, yPos + 16);
  doc.text('Designation:', 20, yPos + 24);
  doc.text('Department:', 20, yPos + 32);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(String(employeeData?.name || payrollData.employee_name), 55, yPos + 8);
  doc.text(String(employeeData?.employee_code || payrollData.employee_id || 'N/A'), 55, yPos + 16);
  doc.text(String(employeeData?.position || 'Staff'), 55, yPos + 24);
  doc.text(String(employeeData?.department || 'General'), 55, yPos + 32);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Payslip No:', pageWidth / 2 + 10, yPos + 8);
  doc.text('Pay Period:', pageWidth / 2 + 10, yPos + 16);
  doc.text('Working Days:', pageWidth / 2 + 10, yPos + 24);
  doc.text('Payment Mode:', pageWidth / 2 + 10, yPos + 32);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(String(payrollData.payslip_no), pageWidth / 2 + 40, yPos + 8);
  const payPeriod = formatDate(payrollData.pay_period_start) + ' to ' + formatDate(payrollData.pay_period_end);
  doc.text(payPeriod, pageWidth / 2 + 40, yPos + 16);
  doc.text(String(payrollData.working_days), pageWidth / 2 + 40, yPos + 24);
  doc.text(String(employeeData?.payment_mode || 'Bank'), pageWidth / 2 + 40, yPos + 32);
  
  // ==================== BANK DETAILS BOX ====================
  yPos = 118;
  doc.setFillColor(248, 249, 250);
  doc.rect(15, yPos, pageWidth - 30, 12, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Bank Details:', 20, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const bankDetails = employeeData?.bank_name && employeeData?.bank_account 
    ? `${employeeData.bank_name} - ${employeeData.bank_account}`
    : 'N/A';
  doc.text(bankDetails, 50, yPos + 8);
  
  // ==================== EARNINGS & DEDUCTIONS ====================
  yPos = 138;
  
  // Headers with blue background
  doc.setFillColor(52, 152, 219);
  doc.rect(15, yPos, (pageWidth - 35) / 2, 10, 'F');
  doc.rect(pageWidth / 2 + 2.5, yPos, (pageWidth - 35) / 2, 10, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('EARNINGS', pageWidth / 4, yPos + 6.5, { align: 'center' });
  doc.text('DEDUCTIONS', pageWidth * 3 / 4, yPos + 6.5, { align: 'center' });
  
  yPos += 10;
  
  // Earnings items
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  let earningsY = yPos + 8;
  const earnings = [
    { label: 'Basic Salary', value: payrollData.basic_salary },
    { label: 'Allowances', value: payrollData.allowances },
    { label: 'Overtime Pay', value: payrollData.overtime_pay },
    { label: 'Bonus', value: payrollData.bonus },
    { label: 'Holiday Pay', value: payrollData.holiday_pay },
    { label: 'Other Earnings', value: payrollData.other_earnings },
  ];
  
  const leftColEnd = pageWidth / 2 - 10;
  
  earnings.forEach((item) => {
    if (parseFloat(item.value) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, 20, earningsY);
      doc.setFont('courier', 'normal');
      doc.text(formatCurrency(item.value), leftColEnd, earningsY, { align: 'right' });
      earningsY += 7;
    }
  });
  
  // Deductions items
  let deductionsY = yPos + 8;
  const deductions = [
    { label: 'Tax', value: payrollData.tax },
    { label: 'Pension', value: payrollData.pension },
    { label: 'Loan Repayment', value: payrollData.loan_repayment },
    { label: 'Insurance', value: payrollData.insurance },
    { label: 'NHF', value: payrollData.nhf },
    { label: 'Loan Deduction', value: payrollData.loan_deduction },
    { label: 'Other Deductions', value: payrollData.other_deductions },
    { label: 'General Deductions', value: payrollData.deductions },
  ];
  
  const totalDeductions = deductions.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  
  const rightColEnd = pageWidth - 18;
  
  deductions.forEach((item) => {
    if (parseFloat(item.value) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, pageWidth / 2 + 7.5, deductionsY);
      doc.setFont('courier', 'normal');
      doc.text(formatCurrency(item.value), rightColEnd, deductionsY, { align: 'right' });
      deductionsY += 7;
    }
  });
  
  // Totals with gray background
  const totalsY = Math.max(earningsY, deductionsY) + 5;
  
  doc.setFillColor(230, 230, 230);
  doc.rect(15, totalsY - 3, (pageWidth - 35) / 2, 10, 'F');
  doc.rect(pageWidth / 2 + 2.5, totalsY - 3, (pageWidth - 35) / 2, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Total Earnings', 20, totalsY + 4);
  doc.setFont('courier', 'bold');
  doc.text(formatCurrency(payrollData.gross_salary), leftColEnd, totalsY + 4, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total Deductions', pageWidth / 2 + 7.5, totalsY + 4);
  doc.setFont('courier', 'bold');
  doc.text(formatCurrency(totalDeductions), rightColEnd, totalsY + 4, { align: 'right' });
  
  // ==================== NET PAY ====================
  const netPayY = totalsY + 15;
  
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1.5);
  doc.line(15, netPayY, pageWidth - 15, netPayY);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('NET PAY', 20, netPayY + 8);
  doc.setFont('courier', 'bold');
  doc.text(formatCurrency(payrollData.net_salary), pageWidth - 18, netPayY + 8, { align: 'right' });
  
  // ==================== FOOTER ====================
// Website
doc.setFontSize(8);
doc.setTextColor(100, 100, 100);
doc.setFont('helvetica', 'italic');
doc.text('www.julinemart.com', pageWidth / 2, pageHeight - 25, { align: 'center' });

// Signature section
const digitalSignature = import.meta.env.VITE_DIGITAL_SIGNATURE='https://res.cloudinary.com/dupgdbwrt/image/upload/v1761916694/Untitled_design_wr36a2.png';

// Signature box background
doc.setDrawColor(240, 240, 240);
doc.setFillColor(250, 250, 250);
doc.rect(pageWidth - 60, pageHeight - 35, 45, 20, 'FD');

if (digitalSignature) {
  try {
    // Try to add digital signature image
    const signatureImg = await fetch(digitalSignature)
      .then(res => res.blob())
      .then(blob => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      });
    
    // Add signature image
    doc.addImage(signatureImg, 'PNG', pageWidth - 58, pageHeight - 33, 41, 16);
  } catch (error) {
    console.error('Failed to load signature:', error);
    // Show placeholder text if signature fails
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Signature', pageWidth - 37.5, pageHeight - 24, { align: 'center' });
  }
} else {
  // No signature configured - show placeholder
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('Signature', pageWidth - 37.5, pageHeight - 24, { align: 'center' });
}

// Signature line
doc.setDrawColor(120, 120, 120);
doc.setLineWidth(0.3);
doc.line(pageWidth - 58, pageHeight - 14, pageWidth - 17, pageHeight - 14);

// "Management" text below line
doc.setFontSize(9);
doc.setTextColor(60, 60, 60);
doc.setFont('helvetica', 'bold');
doc.text('Management', pageWidth - 37.5, pageHeight - 9, { align: 'center' });

// Save
const filename = 'Payslip_' + String(payrollData.payslip_no) + '_' + String(employeeData?.name || payrollData.employee_name).replace(/\s+/g, '_') + '.pdf';
doc.save(filename);}
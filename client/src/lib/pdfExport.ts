import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

export function exportTableToPDF(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: data as RowInput[],
    theme: "striped",
    headStyles: { fillColor: [204, 102, 0] }, // TransitOps Brand Orange
    styles: { fontSize: 9 },
  });

  doc.save(filename);
}

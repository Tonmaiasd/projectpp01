// แปลงวันที่เป็น format ไทยสวยๆ: "5 มกราคม 2567"
export const formatDateThai = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDate = (dateString) => {
  if (!dateString) return "ไม่มีวันหมดอายุ";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// แปลงตัวเลขใส่ลูกน้ำ: 1,000
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH').format(amount);
};
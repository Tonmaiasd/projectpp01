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

// แปลงตัวเลขใส่ลูกน้ำ: 1,000
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH').format(amount);
};
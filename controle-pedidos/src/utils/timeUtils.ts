export const generateTimeOptions = (interval: number = 30) => {
  const options = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const value = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

// ====================== Formatação de datas ===================== 
// usado em NovoPedido.tsx e EditarPedido.tsx